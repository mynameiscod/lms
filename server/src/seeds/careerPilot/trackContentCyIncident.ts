/**
 * Career-track content: Incident Response (CY_INCIDENT_RESPONSE), Cybersecurity Analyst, batch CY2.
 *
 * The analyst's side of an incident, from the first alert to the report: the lifecycle (after NIST SP
 * 800-61), triage and scoping, evidence and chain of custody, containment and recovery, response playbooks
 * and reporting in India. It builds on Year 3's "When Something Actually Happens" (contain, preserve,
 * assess, communicate) and on the SOC lessons — "Logs: Sources, Collection and Normalisation" and "Alert
 * Triage: the SOC L1 Workflow" — and refers back rather than re-teaching them.
 *
 * Defensive only. One synthetic incident runs through the topic: a phishing email at Kosha Pay, a fictional
 * Bengaluru fintech, leading to an account takeover and a changed vendor bank account. Every pandas, hashlib
 * and playbook-runner output in the notes was produced by running the code on that sample data. Ransomware
 * appears only as a response playbook (contain, preserve, recover, communicate), never as malware detail.
 * Regulations (CERT-In directions, the DPDP Act) are given in outline; students are told to read the
 * current text. The topic has one skill, INCIDENT_RESPONSE.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CY_INCIDENT_RESPONSE_BUNDLES: PilotBundle[] = [
  /* ── IR_LIFECYCLE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_IR_LIFECYCLE',
    notes: `In Year 3, "When Something Actually Happens" gave you the instinct: contain, preserve, assess,
communicate, recover, write it up. A SOC turns that instinct into a **process** that the same twenty
people follow at 3 a.m. on a Sunday, whoever is on shift. This lesson is that process and your part in it.

## Event, alert, incident

- An **event** is anything observable: a sign-in, a DNS query, a file write. Millions a day.
- An **alert** is an event (or a pattern of them) that a detection flagged. Hundreds a day.
- An **incident** is a confirmed or strongly suspected violation of security policy that needs a
  coordinated response: an account taken over, data leaving, systems encrypted. A few a month.

The L1 analyst's main job is the step from alert to incident: deciding, with evidence, that this one is
real and needs more than a ticket closed with "benign". Declaring an incident is a decision with a name
and a time on it, because the clocks (internal SLAs, regulatory reporting) start from there.

## The lifecycle

The model most SOCs use comes from **NIST SP 800-61**, the US guide to computer security incident
handling. Its long-standing form has four phases:

1. **Preparation** — the IR plan, the people and their contacts, tooling, log sources and retention,
   playbooks, backups you have actually restored from, and practice (tabletop exercises).
2. **Detection and Analysis** — alerts, user reports and outside notifications come in; you confirm,
   scope, set severity and keep a timeline.
3. **Containment, Eradication and Recovery** — stop the spread, remove the attacker's access and
   anything they left behind, restore service, and watch for a return.
4. **Post-Incident Activity** — the report, the lessons-learned review, and the changes that follow.

It is drawn as a cycle, with an arrow from phase 3 back to phase 2: while containing you find a second
compromised account, and you are back to analysis. NIST's newer revision of the guide maps the same work
onto the six functions of its Cybersecurity Framework 2.0 (Govern, Identify, Protect, Detect, Respond,
Recover). You will meet both pictures in interviews; the work an analyst does does not change.

Some organisations use the SANS six-step version — Preparation, Identification, Containment,
Eradication, Recovery, Lessons Learned. Same work, phase 3 split into three. Use whichever your SOC's
plan uses, and say so.

## Roles

An incident with no named owner drifts. The IR plan names roles, not heroes:

- **Incident commander / IR lead** — owns decisions and priorities; does not do the hands-on work.
- **Analysts (L1, L2, L3)** — triage, investigate, collect evidence, run containment steps.
- **Scribe** — keeps the timeline and the decision log. Often given to a junior analyst, and one of the
  best ways to learn: you hear every decision and why it was made.
- **Communications** — internal updates, customers, media; nobody else talks outside.
- **Legal / compliance / DPO** — reporting duties, privilege, law enforcement.
- **System owners** — the people who can actually isolate the payments server or roll back a change.

In an MSSP SOC in Hyderabad serving a client bank, the split is sharper: the MSSP detects, analyses and
recommends; the client's own team approves and executes containment on their systems. Your note must
make that decision easy for them.

## Severity

Severity decides who is woken up and how fast. A typical four-level matrix:

| Level | Meaning | Example | Response |
|---|---|---|---|
| SEV-1 | Critical business impact or regulated data confirmed exposed | Ransomware on payment servers; money moved by an attacker | IR lead now, 24×7 bridge, leadership informed |
| SEV-2 | Confirmed compromise, contained scope | One account taken over, no data loss seen yet | IR lead within the hour |
| SEV-3 | Suspicious, limited, not confirmed | Phish clicked, credentials not entered | Same-day handling by the SOC |
| SEV-4 | Policy violation, negligible impact | Unapproved software on one laptop | Normal ticket queue |

Two rules that matter more than the table: severity is set from **impact and scope**, not from how
alarming the alert sounded; and severity is **re-assessed** as you learn more — upgrading a SEV-3 to
SEV-1 when you find money moved is normal and expected, not a failure.

## Preparation is where incidents are won

Nearly every painful incident review finds the gap in preparation, not in the heroics:

- logs that were never collected (no mailbox audit, proxy logs kept seven days);
- nobody knew who could approve isolating a production server;
- the backups had never been restored, and the restore took four days, not four hours;
- the out-of-band contact list (phone numbers, a channel outside corporate email) did not exist, and the
  attacker was reading the response team's email.

The IR plan is short and owned: scope, roles with names and deputies, severity matrix, escalation paths,
communication rules, reporting duties, and an appendix of playbooks. It is tested by **tabletop
exercises**: the team talks through a scenario round by round and finds the gaps on a Tuesday afternoon
instead of during the incident.

## Your part in each phase, as an L1 analyst

- **Preparation** — know where every log source is and how far back it goes; know the playbooks;
  report broken detections.
- **Detection and Analysis** — triage the alert, confirm it, start the ticket and the timeline, escalate
  with evidence. This is most of your incident work.
- **Containment** — run the steps the playbook allows you (disable an account, isolate a laptop through
  EDR) once approved; record exactly what you did and when.
- **Post-incident** — supply timeline facts; suggest the detection that would have caught it sooner.

## The single record

Everything goes into **one** case record: the ticket, a timeline with UTC timestamps, a decision log
("06:05Z — IR lead approved disabling vikram.t; reason: sign-in from known-bad IP"), the evidence list
with hashes, and the people involved. Chats and calls are where decisions get made; the record is where
they survive. Write it as if a regulator will read it in six months — sometimes one will.`,
    workedExample: `**Task: map a real alert at Kosha Pay to the lifecycle and set its severity.**

Kosha Pay is a fictional Bengaluru fintech of 400 people. At 05:24Z on 9 March a detection fires: "vendor
beneficiary bank account changed outside the vendor-onboarding workflow", user ananya.r, vendor V-2291.

**Detection and Analysis.** The L1 analyst opens the alert. Ananya is in finance operations, so changing a
vendor's bank details is part of her job — on its own, the alert could be benign. Enrichment changes that:
the session that made the change signed in from 198.51.100.23 (Singapore) at 05:18Z, and Ananya's laptop
BLR-LT-0412 is in Bengaluru with a sign-in from the office range at 03:50Z. Two places in ninety minutes.
The analyst calls Ananya on her desk phone (not by email, which may be read). She did not change any vendor.
It is an incident.

**Declare and set severity.** Impact: a payment instruction to a vendor has been redirected — money could
move at the next payout run at 08:30Z. Scope so far: one account, but unknown. Money at risk puts it at
**SEV-1**, even with one account, because the business impact is direct and the clock is three hours.
The analyst opens case IR-2026-031 and pages the IR lead.

**Containment (approved by the IR lead at 06:05Z).** Revoke Ananya's sessions, reset her password and
MFA registration, freeze vendor V-2291's payout, and ask the bank to hold any transfer to the new account.
Each action goes in the decision log with who approved it.

**Back to analysis.** Scoping (next lesson) finds a phishing email at 04:12Z sent to four people, and the
same attacker IP signing in as a second user, vikram.t. The arrow goes from phase 3 back to phase 2, as the
model says it will.

**Eradication and recovery.** Remove the forwarding inbox rule the attacker created, restore the correct
bank details from the onboarding record, and watch both accounts closely for 30 days.

**Post-incident.** The report and the review find two preparation gaps: vikram.t was in a legacy group
excluded from MFA, and the beneficiary-change detection fired 48 minutes after the first malicious
sign-in. Two actions follow: enforce MFA on the group, and alert on sign-ins from new countries for
finance users.

What the analyst did well was not technical brilliance: calling the user out of band, writing every
action down in UTC, and setting severity from the money at risk rather than from the number of accounts.`,
    mcqs: [
      mcq('A SOC sees 2.1 million events, 340 alerts and no confirmed incidents in a day. What does an L1 analyst decide when turning one of those alerts into an incident?', [
        ['That there is evidence of a policy violation needing a coordinated response', true],
        ['That the detection rule which fired is rated as high severity in the SIEM console', false],
        ['That the event came from a production server rather than a laptop', false],
        ['That more than one alert has fired for the same user in the hour', false],
      ], 'An incident is a confirmed or strongly suspected policy violation that needs coordinated response, and the analyst declares it from evidence. A rule\'s severity label, the asset type or a repeat alert can all be true of benign activity, so none of them is the decision itself.'),
      mcq('While containing a taken-over mailbox, the team finds that the same attacker IP signed in as a second user. Where are they in NIST SP 800-61\'s lifecycle?', [
        ['Back in detection and analysis, scoping the new account', true],
        ['In post-incident activity, since containment has started', false],
        ['Still in containment only, because phases never go backwards', false],
      ], 'The lifecycle has an arrow from containment back to detection and analysis exactly for this: new findings during containment re-open scoping. Phases do go backwards, and post-incident work waits until the incident is closed.'),
      mcq('During a tabletop exercise at a Pune NBFC, the team discovers nobody knows who may approve taking the loan-origination server offline. Which phase has the gap?', [
        ['Preparation, since approvals belong in the IR plan before any incident', true],
        ['Containment, because the server is only taken offline during that phase', false],
        ['Detection and analysis, because the server owner should have been alerted', false],
        ['Recovery, because restoring the server needs the same person\'s sign-off', false],
      ], 'Who decides is a preparation question: the IR plan names roles and approvers so the decision is quick when it is needed. The action happens in containment, but the gap — nobody named — was left in preparation, which is exactly what tabletops are for finding.'),
    ],
    checkpoint: [
      mcq('An alert is opened as SEV-3 ("phish clicked, no credentials entered"). Two hours later the analyst finds the user\'s account approved a payment to a new beneficiary. What should happen to the severity?', [
        ['Raise it to SEV-1 now, since severity follows impact as it becomes known', true],
        ['Keep it at SEV-3, because severity is fixed when the case is first opened', false],
        ['Open a separate SEV-1 case and close the SEV-3 one as a false positive', false],
      ], 'Severity is re-assessed as facts arrive, and money moved by an attacker is critical impact. Severity is not frozen at opening, and splitting the case loses the link between the phish and the payment — the first finding was not false.'),
      mcq('Which item belongs in an IR plan rather than in a single playbook?', [
        ['The severity matrix and who is paged at each level', true],
        ['The order of steps for resetting a user\'s MFA methods', false],
        ['The query that lists recipients of a phishing message', false],
        ['The inbox-rule checks to run on a taken-over mailbox', false],
      ], 'The plan holds what applies to every incident: roles, severity, escalation and communication. MFA reset steps, recipient queries and inbox-rule checks are specific to particular incident types, so they live in playbooks referenced from the plan.'),
      mcq('An MSSP analyst in Hyderabad confirms ransomware notes on two servers at a client bank. What is the analyst\'s part in containment?', [
        ['Recommend isolation with evidence and act once the client approves', true],
        ['Shut the servers down at once from the console to stop the spread', false],
        ['Wait for the post-incident review before saying anything to the client', false],
      ], 'In an MSSP model the client owns its systems and approves containment; the analyst\'s job is a clear, evidenced recommendation and fast execution once approved. Powering servers off without approval destroys volatile evidence and oversteps the contract, and waiting until the review lets the damage spread.'),
    ],
  },

  /* ── TRIAGE_SCOPING ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_TRIAGE_SCOPING',
    notes: `"Alert Triage: the SOC L1 Workflow" taught you to decide whether one alert is real. Once it is, the
question changes from "is this bad?" to **"how far does it go?"**. Scoping is answering that: every user,
host, account and system the attacker touched, on one timeline. Contain too narrowly and the attacker
keeps a foothold you did not know about; contain too widely and you shut down the business for nothing.

## Confirm first

Before you declare, confirm with at least one source **independent of the alert**. The beneficiary-change
detection at Kosha Pay said "ananya.r changed V-2291". Confirmation was the sign-in log (a Singapore IP
an hour after an office sign-in) and a phone call to Ananya. One source can be wrong; two agreeing
sources, from different systems, rarely are.

## Indicators and pivots

Scoping is a loop:

1. Take what you know is bad — an **indicator**: a sender domain, an IP, a file hash, a user agent, an
   inbox-rule name.
2. Search every log source for it.
3. Each hit gives you new entities (a user, a host) and sometimes **new indicators** (a second IP the
   compromised account used).
4. Search again with the new ones. Stop when a round finds nothing new.

Moving from one indicator to the entities around it, and from them to new indicators, is called
**pivoting**. Indicators alone are brittle — the attacker changes IPs — which is why you pivot through
the compromised accounts' behaviour too ("every non-office IP that signed in successfully as a user we
know is compromised").

## A unified timeline with pandas

The logs never agree on time. At Kosha Pay, four sources were exported for the case:

- mail gateway — ISO 8601 in UTC: \`2026-03-09T04:12:05Z\`
- web proxy — local Indian time, day first, no zone: \`09/03/2026 10:01:44\`
- identity provider — ISO with an offset: \`2026-03-09T10:05:21+05:30\`
- payouts and mailbox audit — Unix epoch seconds

The normalisation lesson told you why everything goes to UTC; here is the incident version, with each
source's quirk handled explicitly:

    import pandas as pd

    mail = pd.read_json('data/mail_gateway.jsonl', lines=True, dtype={'ts': str})
    mail['ts_utc'] = pd.to_datetime(mail['ts'], utc=True)
    mail = mail.assign(source='mail', who=mail['recipient'].str.split('@').str[0],
                       what=mail['event'] + ' from ' + mail['sender'])

    proxy = pd.read_json('data/proxy.jsonl', lines=True, dtype={'time': str})
    local = pd.to_datetime(proxy['time'], format='%d/%m/%Y %H:%M:%S')
    proxy['ts_utc'] = local.dt.tz_localize('Asia/Kolkata').dt.tz_convert('UTC')
    proxy = proxy.assign(source='proxy', who=proxy['user'],
                         what=proxy['host'] + ' -> ' + proxy['domain'])

    idp = pd.read_json('data/idp_signins.jsonl', lines=True, dtype={'timestamp': str})
    idp['ts_utc'] = pd.to_datetime(idp['timestamp'], utc=True)
    idp = idp.assign(source='idp', who=idp['user'],
                     what='sign-in ' + idp['result'] + ' from ' + idp['src_ip'])

    audit = pd.read_json('data/app_audit.jsonl', lines=True)
    audit['ts_utc'] = pd.to_datetime(audit['epoch'], unit='s', utc=True)
    audit = audit.assign(source=audit['app'], who=audit['actor'],
                         what=audit['op'] + ': ' + audit['detail'])

    cols = ['ts_utc', 'source', 'who', 'what']
    tl = (pd.concat([d[cols] for d in (mail, proxy, idp, audit)], ignore_index=True)
            .sort_values(['ts_utc', 'source'], kind='stable').reset_index(drop=True))

Three details carry the whole thing. \`dtype={...: str}\` stops \`read_json\` guessing at timestamp columns
itself. The proxy's naive local time is **localised** to Asia/Kolkata and then **converted** to UTC —
localising it straight as UTC would put every click five and a half hours late. And \`utc=True\` lets the
mail and identity columns parse even though their offsets differ. Adding an IST column for the people
you will talk to and printing gives (nine of the 20 rows, columns left-aligned):

    ts_utc               ts_ist   source  who      what
    2026-03-09 04:12:05Z 09:42:05 mail    ananya.r delivered from kyc@kosha-pay-support.co
    2026-03-09 04:31:44Z 10:01:44 proxy   ananya.r BLR-LT-0412 -> kosha-pay-support.co
    2026-03-09 04:33:58Z 10:03:58 idp     ananya.r sign-in mfa_denied from 203.0.113.45
    2026-03-09 04:34:40Z 10:04:40 idp     ananya.r sign-in mfa_denied from 203.0.113.45
    2026-03-09 04:35:21Z 10:05:21 idp     ananya.r sign-in success from 203.0.113.45
    2026-03-09 04:38:40Z 10:08:40 mail    ananya.r new_inbox_rule: forward *invoice* to ext address; mark read
    2026-03-09 05:01:15Z 10:31:15 idp     vikram.t sign-in success from 203.0.113.45
    2026-03-09 05:18:30Z 10:48:30 idp     ananya.r sign-in success from 198.51.100.23
    2026-03-09 05:21:10Z 10:51:10 payouts ananya.r change_beneficiary: vendor=V-2291 acct ending 4417 -> 9032

The full timeline has 20 rows. Read it like a story: delivery, click, two MFA pushes refused and a third
accepted (repeated pushes until a tired user approves — MFA fatigue), an inbox rule to hide replies, a
second account, a new IP, the fraud. Each step suggests where to look next.

## The scoping query

The pivot loop, written down so the next analyst can rerun it:

    CORP_NETS = ('192.0.2.',)              # the office egress range (sample)
    iocs = {'domain': {'kosha-pay-support.co'}, 'ip': {'203.0.113.45'}}
    users, hosts = set(), set()
    for _ in range(3):                      # pivot until nothing new turns up
        before = (len(users), len(hosts), len(iocs['ip']))
        users |= set(mail.loc[mail['url_domain'].isin(iocs['domain']), 'recipient'].str.split('@').str[0])
        hit = proxy[proxy['domain'].isin(iocs['domain'])]
        users |= set(hit['user']); hosts |= set(hit['host'])
        ok = idp[idp['src_ip'].isin(iocs['ip']) & (idp['result'] == 'success')]
        users |= set(ok['user'])
        new_ips = idp[idp['user'].isin(ok['user']) & (idp['result'] == 'success')
                      & ~idp['src_ip'].str.startswith(CORP_NETS)]['src_ip']
        iocs['ip'] |= set(new_ips)
        if (len(users), len(hosts), len(iocs['ip'])) == before:
            break

Classifying each user by the strongest evidence against them gives:

    IP indicators : ['198.51.100.23', '203.0.113.45']
    hosts         : ['BLR-LT-0412', 'HYD-LT-0177']
    ananya.r  COMPROMISED                    actions=['new_inbox_rule', 'search', 'change_beneficiary']
    arjun.p   received only                  actions=[]
    meera.s   received only                  actions=[]
    ravi.k    credentials entered, MFA held  actions=[]
    vikram.t  COMPROMISED                    actions=['view_vendor']

Look at **vikram.t**: he never received the email and never clicked. He appears only because the
attacker's IP signed in as him — he reused a password exposed elsewhere, and his account was in a group
excluded from MFA. Scoping from the email alone would have missed him. And **ravi.k** entered his password
on the fake page (his MFA push was refused): he is not compromised, but his password is burned and must
be reset.

## Deciding scope and severity

Write the scope as a table: entity, status, evidence, action. Then severity follows from impact (money
redirected → SEV-1), not from the count of rows. State what you have **not** checked yet ("endpoint
telemetry from BLR-LT-0412 not yet reviewed") — an honest gap is worth more than a confident wrong scope.`,
    workedExample: `**Task: turn the Kosha Pay pivot results into a scope statement the IR lead can act on.**

The analyst has the 20-row timeline and the scoping output. The IR lead needs one screen, not a
spreadsheet.

**Step 1 — classify each entity by its strongest evidence.**

| Entity | Status | Evidence | Action |
|---|---|---|---|
| ananya.r | Compromised | Success from 203.0.113.45 at 04:35:21Z after two refused pushes; inbox rule 04:38:40Z; beneficiary change 05:21:10Z from 198.51.100.23 | Revoke sessions, reset password and MFA, remove rule |
| vikram.t | Compromised | Success from 203.0.113.45 at 05:01:15Z; viewed V-2291 at 05:02:44Z | Same as above; enforce MFA on his group |
| ravi.k | Credentials exposed | Click 04:37:10Z; MFA refused 04:39:02Z | Reset password; no session revocation needed |
| meera.s, arjun.p | Received only | Delivered 04:12Z; no click in proxy | Purge message; awareness note |
| BLR-LT-0412, HYD-LT-0177 | Visited phishing page | Proxy | Check EDR for downloads; no isolation unless found |
| Vendor V-2291 | Fraud target | Account 4417 → 9032 | Freeze payout, call the bank |

**Step 2 — check for gaps.** The mail search ran on sender domain only. The analyst reruns it on the
subject line and the URL, since attackers vary senders: no new recipients. Endpoint telemetry for the two
laptops is still pending — written down as an open item, not left out.

**Step 3 — the scope statement:**

> IR-2026-031, SEV-1. Phishing (sender domain kosha-pay-support.co) delivered to 4 users at 04:12Z.
> Two accounts compromised: ananya.r (via MFA push fatigue) and vikram.t (password reuse, no MFA — found
> by IP pivot only). One password exposed (ravi.k). Attacker IPs 203.0.113.45 and 198.51.100.23. Business
> impact: vendor V-2291 bank account changed at 05:21Z; next payout 08:30Z. Open: EDR review of
> BLR-LT-0412 and HYD-LT-0177; any other user signing in from either IP after 05:18Z.

**Why this works.** Every claim has a time and a source. The status words are graded ("compromised" is
reserved for a successful attacker sign-in), so the IR lead knows exactly which accounts get the heavy
containment. And the open items tell the next shift where to continue, which is the difference between
a scope and a guess.`,
    mcqs: [
      mcq('A proxy log stores "09/03/2026 10:01:44" in Indian local time with no zone. Which pandas steps give the right UTC time?', [
        ['Parse with an explicit day-first format, tz_localize to Asia/Kolkata, tz_convert to UTC', true],
        ['Parse with an explicit day-first format and tz_localize the result straight to UTC', false],
        ['Parse with pd.to_datetime and no format, then tz_convert the result to UTC', false],
        ['Parse with an explicit day-first format and add 5.5 hours to the parsed result', false],
      ], 'A naive local time must first be told which zone it was in (localise) and then converted. Localising straight to UTC puts every click 5.5 hours late; parsing with no format reads 09/03 month-first as 3 September; and tz_convert refuses naive times. Adding 5.5 hours goes the wrong way — IST is ahead of UTC.'),
      mcq('Scoping a phish by sender domain finds three recipients. An IP pivot then finds a fourth user who never received the email. Why does the fourth user belong in scope?', [
        ['The attacker IP signed in to that account successfully', true],
        ['The user works on the same floor as two of the recipients', false],
        ['Every account in the same department is assumed to be at risk', false],
      ], 'Scope is decided by evidence of the attacker touching the entity, and a successful sign-in from the attacker IP is that evidence — here from password reuse, not the email. Location and department are not evidence of compromise, and including them inflates containment without reason.'),
      mcq('In the Kosha Pay timeline, ananya.r shows two "mfa_denied" sign-ins and then a "success" from the same foreign IP within 90 seconds. What does that pattern most likely show?', [
        ['Repeated MFA pushes until the user approved one', true],
        ['A misconfigured MFA server rejecting valid codes', false],
        ['The user travelling and signing in from abroad', false],
        ['Two different attackers trying the same password', false],
      ], 'Refused pushes followed by an approval, from an IP the user has never used and minutes after she clicked a phish, is the MFA-fatigue pattern. A faulty MFA server would affect many users, Ananya signed in from the Bengaluru office that morning, and one IP points to one actor.'),
    ],
    checkpoint: [
      mcq('An analyst\'s scoping query finds 2 new IPs in round one, 1 new user in round two and nothing new in round three. What should happen next?', [
        ['Stop pivoting and write the scope, listing the checks not yet done', true],
        ['Run three more pivot rounds to be safe before writing anything at all', false],
        ['Restart from the original indicator using a longer time window', false],
      ], 'A round that finds nothing new is the stopping rule for a pivot loop; more rounds on the same data return the same result. Widening the time window is a deliberate separate check and belongs in the open-items list rather than replacing the scope statement.'),
      mcq('ravi.k typed his password into the phishing page, but his MFA push was refused and no successful sign-in exists. How should the scope classify him?', [
        ['Credentials exposed: reset his password, no session revocation', true],
        ['Compromised: revoke all sessions and isolate his laptop at once', false],
        ['Not affected: MFA worked, so no action is needed for this user', false],
        ['Received only: purge the email and send him an awareness note', false],
      ], 'The password is known to the attacker, so it must change, but with no successful sign-in there is no attacker session to revoke and no reason to isolate his machine. Calling him unaffected leaves a known password live, and "received only" ignores that he clicked and typed it.'),
      mcq('Before declaring an incident from a "beneficiary changed" alert, what is the best way to confirm it?', [
        ['A second, independent source such as sign-ins plus asking the user out of band', true],
        ['Rerunning the same detection rule to see whether it fires a second time', false],
        ['Checking that the rule\'s ATT&CK mapping matches the alert description', false],
      ], 'Independent sources (identity logs, the user on the phone) catch the alert being wrong; rerunning the same rule only repeats the same evidence. An ATT&CK mapping describes the rule, not whether this event was malicious.'),
    ],
  },

  /* ── EVIDENCE_FORENSICS ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_EVIDENCE_FORENSICS',
    notes: `Evidence answers two questions later: **what happened** (for the review and the fix) and **can you prove
it** (for the bank, the insurer, the regulator, sometimes a court). A SOC analyst is not a forensic
examiner, but you are usually the first person to touch the evidence — and the first person is the one
who can destroy it.

## Order of volatility

Collect the evidence that disappears fastest first. RFC 3227 ("Guidelines for Evidence Collection and
Archiving") gives the classic order, most volatile first:

1. CPU registers and cache
2. Routing table, ARP cache, process table, kernel statistics, **memory**
3. Temporary file systems
4. **Disk**
5. Remote logging and monitoring data
6. Physical configuration and network topology
7. Archival media (backups)

For an analyst the practical version is: **memory and live state before disk; disk before rebooting;
and cloud and SaaS logs before their retention runs out.** A process list, network connections and
memory are lost when a machine is powered off — which is why "pull the plug" is usually wrong. Isolate
the host from the network through EDR ("Endpoint Protection and EDR" covered network isolation); it stays
powered on, the attacker loses contact, and the forensic team can still capture memory.

Item 5 has a modern twist: in a SaaS-heavy company like Kosha Pay, most evidence is in identity-provider,
mailbox and application logs held by a vendor for a fixed period. A default retention of 30 or 90 days
can run out during a slow investigation. Export them early.

## Collecting without destroying

- **Work on copies.** Export logs from the SIEM or the source; image disks with a write-blocker; never
  investigate on the original.
- **Do not browse the compromised machine.** Every file you open changes access times and adds your own
  activity to the timeline you are trying to read.
- **Use the tools your team has approved** — EDR live response, an agent such as Velociraptor, the cloud
  provider's snapshot feature — rather than whatever you remember. They record what they collected.
- **Write down what you did**, when (UTC) and on which host. Your own actions will appear in the logs;
  you need to be able to subtract them.

## Hashing evidence

A cryptographic hash is a fingerprint of a file's exact bytes ("The Building Blocks: Hashing, Symmetric
and Asymmetric Encryption" covered why SHA-256 and not MD5 for this). Hash every evidence file when you
collect it, and again whenever it changes hands: if the hashes match, the file has not changed by a
single bit. Read in chunks, so a 40 GB disk image does not need 40 GB of RAM:

    import hashlib

    def sha256_of(path, chunk=1024 * 1024):
        h = hashlib.sha256()
        with open(path, 'rb') as f:                 # binary mode, always
            for block in iter(lambda: f.read(chunk), b''):
                h.update(block)
        return h.hexdigest()

The same digests come from the command line, so anyone can check your work without your script:
\`sha256sum file\` on Linux, \`Get-FileHash -Algorithm SHA256 file\` in PowerShell.

## Chain of custody

A **chain of custody** is the record of who had each item, when, and what they did with it, from
collection until it is no longer needed. Without it, "the log shows the attacker changed the account" is
met with "how do we know nobody edited the log?". A minimal record, appended to as a JSON-lines file:

    import json, os, datetime as dt

    def log_custody(record_file, item, action, person, note=''):
        entry = {'item': item, 'sha256': sha256_of(item), 'bytes': os.path.getsize(item),
                 'action': action, 'by': person, 'note': note,
                 'at_utc': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}
        with open(record_file, 'a') as f:
            f.write(json.dumps(entry) + '\\n')
        return entry

Logging the four Kosha Pay exports printed:

    app_audit.jsonl        488 bytes  ac0aa5cecd6a5bae3263b1e46a90b97dafba9a81794737e152a8713384c2c78c
    idp_signins.jsonl      895 bytes  7abc04e0dbf9713f2480aaa64f9ef15f70651b427e253ef69c720f4c950ce8b4
    mail_gateway.jsonl    1025 bytes  adf181c27aae3e50f4bba19122bf0936c732830b6d4d48dbb176b0e1e04a35b9
    proxy.jsonl            513 bytes  b909beed690fd1ea6e6feeb319733eac9d393449e9fa8bb7ca39ffe022d7b69c

and a verify step that rehashes every item and compares it with the first recorded hash printed \`OK\`
for all four. Then the proxy export was opened and saved by an editor that changed the line endings to
Windows CRLF. Nothing visible changed, yet the file grew from 513 to 517 bytes and its hash became
\`265dbc6a8eb7ca39...\` — a \`MISMATCH\`. That is the point: the hash cannot tell an innocent save from
tampering, so evidence is never opened in an editor that may save it. Keep the original read-only and
analyse a copy.

A real chain-of-custody form also records the case number, a description of the item (make, model, serial
for hardware), where it is stored, and a signature for each transfer. Your organisation's form wins over
any template; the hash and the timestamps are what make it checkable.

## The forensic timeline

The unified timeline from the scoping lesson **is** a forensic timeline once every row can be traced to
an evidence file with a recorded hash. Keep that link: add a \`source_file\` column, and keep the script
that built the timeline in the case folder with the evidence. Anyone can then rebuild the same timeline
from the same hashed files — reproducibility is what turns your analysis into evidence.

Two habits that keep a timeline honest: record times in **UTC** with the original value alongside, and
mark **inferences** differently from **observations** ("04:35Z sign-in success — observed;
user approved an MFA push — inferred from two refusals then success").

## When to call the specialists

Bring in the forensic team (or an empanelled external firm) when the incident may go to court or to law
enforcement, when memory analysis or full disk forensics is needed, or when executives' devices are
involved. Your job is to have preserved things well enough that they can.`,
    workedExample: `**Task: preserve the Kosha Pay evidence before the IdP's log retention runs out, and prove later that
nothing changed.**

The identity provider keeps sign-in logs for 30 days on Kosha Pay's plan. The incident was on 9 March;
the review is scheduled for April. If nobody exports the logs, the most important evidence disappears.

**Step 1 — decide what to collect, most volatile first.** Live sessions for ananya.r and vikram.t (listed
before revoking them — revocation ends them); the IdP sign-in log for 1–10 March; the mailbox audit log
including the inbox-rule creation; the payouts application audit; the proxy and mail-gateway logs; an EDR
triage package from BLR-LT-0412 (process list, network connections, recent files), with the laptop
isolated, not shut down.

**Step 2 — collect copies, hash on collection.** Each export lands in the case folder IR-2026-031/evidence.
The analyst runs log_custody() on each one: action "collected", by "S. Iyer (L2)", note "exported from
SIEM, case IR-2026-031". The record holds the SHA-256 and size of each file.

**Step 3 — make it read-only and share copies.** The evidence folder is set read-only; analysts work on
copies in IR-2026-031/work. When the forensic firm receives the files, a second custody entry is
written: action "transferred", by the IR lead, note "to external firm by encrypted share". The firm
hashes on receipt and the hashes match.

**Step 4 — verify before the review.** On 2 April the analyst reruns verify(): every item OK. During the
investigation, a colleague had opened proxy.jsonl in an editor on the evidence share before it was made
read-only; had he saved it, the line endings would have changed and verify() would have printed MISMATCH
for it. The team would then have had to explain the change, and could only do so because the custody
record shows who had access when.

**Step 5 — link the timeline to the evidence.** The 20-row timeline is regenerated from the hashed files
by the script kept in the case folder, and each row carries source_file. The report states: "Timeline
built from 4 evidence files; SHA-256 values in Appendix B; script timeline.py in the case folder."

The result is not complicated forensics. It is the discipline that lets someone who doubts you check your
work — which is all a chain of custody is for.`,
    mcqs: [
      mcq('An EDR alert shows a laptop running an unknown process with an outbound connection. The user offers to shut it down. What should the analyst do instead?', [
        ['Isolate it from the network through EDR and keep it powered on', true],
        ['Let the user shut it down, then collect the disk image tomorrow', false],
        ['Reboot it into safe mode to stop the process from starting again', false],
        ['Unplug the network cable and then shut down the laptop as well', false],
      ], 'Network isolation stops the attacker while keeping memory, the process list and live connections for collection — the most volatile evidence. Shutting down or rebooting destroys all of that; unplugging the cable is fine on its own, but the shutdown after it throws away what isolation preserved.'),
      mcq('A colleague hashes evidence with hashlib.sha256(open(path).read().encode()). Why is that wrong for a chain of custody?', [
        ['Text mode changes line endings, so different files can hash the same', true],
        ['SHA-256 cannot hash files read as text, so it raises an exception', false],
        ['The encode() call adds a byte-order mark that alters every hash', false],
      ], 'Opening in text mode translates CRLF to LF, so a CRLF-modified copy hashes identically to the LF original — the very change the hash should reveal. Hashing works on the encoded bytes without error, and encode() to UTF-8 adds no byte-order mark. Evidence is always hashed in binary mode.'),
      mcq('Which is the right order of collection for a suspected compromise of a cloud-hosted Linux server?', [
        ['Live process and network state, then a disk snapshot, then config and backups', true],
        ['A disk snapshot, then live process and network state, then config and backups', false],
        ['Config and backups, then a disk snapshot, then live process and network state', false],
        ['Live process and network state, then config and backups, then a disk snapshot', false],
      ], 'Order of volatility puts memory and live state first, because they vanish on reboot, then disk, then the slow-changing configuration and archival media. A snapshot first risks losing live state; configuration and backups barely change, so they come last.'),
    ],
    checkpoint: [
      mcq('An evidence file\'s hash on transfer to the forensic firm differs from the hash recorded at collection. What is the correct conclusion?', [
        ['The file changed; find out how from the custody record before relying on it', true],
        ['SHA-256 is unreliable for very large files, so recompute every hash with MD5', false],
        ['The firm used a different tool, and different tools give different hashes', false],
      ], 'SHA-256 of the same bytes is the same in every correct tool, at any size; a mismatch means the bytes changed. The custody record shows who had the file and when, which is how you find out whether it was an innocent save or tampering. Switching to MD5 hides the problem with a weaker hash.'),
      mcq('Kosha Pay\'s identity provider keeps sign-in logs for 30 days. The incident was on day 0 and the review is on day 35. When should the logs be exported?', [
        ['As soon as the incident is declared, into the hashed evidence folder', true],
        ['On day 34, just before retention ends, so they are the most complete', false],
        ['At the review, since the review decides which logs are relevant', false],
        ['Only if legal asks for them, as SaaS logs are the vendor\'s records', false],
      ], 'Logs held by a vendor for a fixed period are remote logging data that can disappear during a slow investigation, so they are exported at once. Waiting until day 34 risks missing the window, the review is after retention ends, and the logs are the company\'s evidence however they are hosted.'),
      mcq('A timeline row reads "04:35Z ananya.r approved an MFA push". The logs show two refusals then a success. How should the row be written?', [
        ['As an observed success, with the approval marked as an inference', true],
        ['As written, because the conclusion is obvious to any analyst reading it', false],
        ['Removed, because inferences have no place in a forensic timeline', false],
      ], 'Keeping observation and inference apart lets a reviewer see what the logs show (a success after two refusals) and what you concluded from it. Stating the inference as fact overstates the evidence; deleting it loses useful analysis that only needs labelling.'),
    ],
  },

  /* ── CONTAINMENT_RECOVERY ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_CONTAINMENT_RECOVERY',
    notes: `Containment stops the damage growing; eradication removes the attacker's access and anything they left;
recovery returns the business to normal and checks that it stays that way. They overlap in practice,
but keeping them apart in your head stops the classic mistake: restoring a system before you have
removed the way in, and being compromised again the same night.

## Short-term and long-term containment

- **Short-term** — fast, reversible actions to stop the bleeding: isolate a laptop through EDR, disable
  or block sign-in for an account, revoke its sessions, block an IP or domain at the proxy and mail
  gateway, freeze a payout.
- **Long-term** — holding measures while eradication is prepared: moving a server to a quarantine
  network segment, tighter firewall rules ("Firewalls, Segmentation and Least-Privilege Networks"),
  temporary extra monitoring, a manual approval step on vendor bank changes.

Year 3 told you to contain before you understand. The refinement is: **contain in proportion to what
you know, and record each step.** Disabling one account takes a minute and is easily undone. Taking the
payments platform offline costs real money and needs the IR lead (and often the business owner) to decide.

## Timing: do not tip the attacker off too early — or too late

If you block one IP while the attacker still holds three other footholds, they notice, change tactics,
and you lose sight of them. For a careful, well-resourced intruder, teams sometimes **scope fully and
then contain everything at once** — all accounts, hosts and indicators in the same short window. For a
fast incident where money or data is leaving right now (Kosha Pay's beneficiary change), you contain
immediately and keep scoping. The judgement is the IR lead's; your job is to say clearly what is still
unscoped when you recommend an action.

## Accounts: the order matters

For a taken-over cloud account, a password reset alone is not containment. Existing sessions and
refresh tokens may stay valid, and the attacker may have registered their own MFA method. The sequence:

1. **Revoke all sessions and refresh tokens** for the user (the identity provider has an admin action
   for this).
2. **Reset the password** — to something the user sets through a verified channel, not one sent by email.
3. **Review and reset MFA methods**: remove any device or phone number the user does not recognise.
4. **Remove persistence in the account**: inbox rules, mail forwarding, delegated mailbox access, OAuth
   applications the user "consented" to, API keys and app passwords.
5. **Check what the account did** while it was taken over, and undo it (the changed beneficiary).

At Kosha Pay, step 4 found the rule "forward *invoice* to ext address; mark read" created at 04:38:40Z.
Had the team stopped at a password reset, the rule would have kept forwarding invoices to the attacker.

## Hosts: isolate, collect, then rebuild

For an endpoint with confirmed attacker activity: isolate through EDR, collect what the forensic plan
needs (previous lesson), and then **reimage from a known-good build** rather than trying to clean it by
hand. Hand-cleaning misses things; a rebuild is cheaper than a second incident. For servers the same
logic applies with more planning: rebuild from your infrastructure code and golden images, then restore
data — not the whole machine — from backup.

## Eradication: remove every way back in

Make a list from the timeline and the scope: every compromised account, every persistence mechanism
found, every exposed credential (passwords typed into the phishing page, keys found on a host, service
account secrets the attacker could have read), every indicator to block. Eradication is done when every
row on that list has an owner and a "done" time. Rotate **secrets the attacker could have seen**, not only
ones you know they used — "Keys and Secrets Management" covered how.

## Recovery

- **Restore from known-good backups**, checked to be from before the compromise and free of whatever the
  attacker left. A backup taken after persistence was planted brings it back.
- **Restore in priority order** agreed in preparation — the payment switch before the intranet.
- **Validate** with the system owner that the service works and the data is right (Kosha Pay's vendor
  bank details checked against the onboarding record and the vendor's own confirmation by phone).
- **Return to normal gradually**, with the temporary controls in place until you are confident.

## Watch for a return

Attackers who lose access often try to come back — through the same phished users, another reused
password, or a foothold you missed. After recovery, put a **watch list** in place for 30 days or longer:
alerts on the attacker IPs and domain, on any sign-in from a new country for the affected users, on
inbox-rule creation for finance staff, and on changes to vendor bank details. A return within that
window means scoping missed something; reopen the incident, do not open a new one.

## Measuring the response

Three intervals from the Kosha Pay timeline go into the report and the SOC's metrics ("SOC Dashboards
and Metrics" covered MTTD and MTTR across many incidents; here is one):

- first attacker sign-in 04:35:21Z → detection 05:24:00Z: **48 min 39 s** to detect;
- detection 05:24:00Z → containment approved and done 06:05:00Z: **41 min** to contain;
- first attacker sign-in → containment: **1 h 29 min 39 s** of attacker access.

The question for the review is which of those could shrink, and what it would take.

## What not to do

- Do not reimage or delete before evidence is collected.
- Do not email the affected user about the incident from a mailbox the attacker may be reading; use
  the phone or a channel outside the compromised system.
- Do not announce the incident on a company-wide channel before containment is done.
- Do not restore and declare victory on the same day without a watch period.`,
    mcqs: [
      mcq('A taken-over cloud mailbox has its password reset, but the attacker keeps reading mail for another two hours. Which step was most likely skipped?', [
        ['Revoking the user\'s existing sessions and refresh tokens', true],
        ['Blocking the phishing domain at the company\'s web proxy', false],
        ['Enabling audit logging on the mailbox to record access', false],
        ['Checking the mail gateway for other recipients of the phish', false],
      ], 'Sessions and refresh tokens issued before the reset can stay valid, so the attacker keeps access until they are revoked. Blocking the domain stops new victims, audit logging only records the access, and finding other recipients widens scope — none of them ends the existing session.'),
      mcq('A careful intruder holds four accounts and two servers. Why might the IR lead wait to contain until scoping is complete?', [
        ['Blocking one foothold first warns the attacker to dig in elsewhere', true],
        ['Containment can only start once the full incident report is written', false],
        ['The evidence cannot be collected from any host after it is contained', false],
      ], 'Partial containment tells a careful attacker they have been seen, and they may add footholds you have not found. Coordinated containment of everything at once avoids that. The report comes after the incident, and evidence is often collected from isolated hosts.'),
      mcq('A Kosha Pay finance server is to be restored from backup after an intrusion. Which backup should be used?', [
        ['The latest one taken before the first attacker activity in the timeline', true],
        ['The latest one available, since it has the least business data missing', false],
        ['The oldest one kept, since it is the most certain to be fully clean', false],
        ['Whichever one restores fastest, so that payouts resume the soonest', false],
      ], 'A backup from just before the first malicious activity balances clean state and data loss; the timeline tells you that point. The latest backup may contain what the attacker planted, the oldest throws away far more data than needed, and restore speed says nothing about cleanliness.'),
    ],
    checkpoint: [
      mcq('After revoking sessions and resetting the password for a compromised mailbox, which check finds persistence that would survive both?', [
        ['Inbox rules, forwarding and consented OAuth applications', true],
        ['The user\'s browser history on their company laptop', false],
        ['The mail gateway\'s list of messages blocked that day', false],
      ], 'Rules, forwarding and OAuth grants live in the account itself and keep working after a password reset — the Kosha Pay forwarding rule is an example. Browser history and gateway blocks may help the investigation but are not mechanisms that keep the attacker\'s access.'),
      mcq('Two weeks after recovery, the watch list alerts on a sign-in as vikram.t from a new country. What should the team do?', [
        ['Reopen the incident, since a return suggests scoping missed something', true],
        ['Open a fresh, unrelated incident and assign it a brand-new case number', false],
        ['Ignore it, because the incident was closed and the account was reset', false],
      ], 'A return during the watch period is the same incident continuing: a foothold or credential was missed, and its evidence belongs in the same record. Treating it as unrelated splits the timeline, and ignoring it repeats the original miss.'),
      mcq('An attacker first signed in at 09:10Z, the detection fired at 10:02Z and containment finished at 10:47Z. How long did the attacker have access?', [
        ['1 h 37 min', true],
        ['52 min', false],
        ['45 min', false],
        ['1 h 47 min', false],
      ], 'Attacker access runs from the first malicious sign-in to containment: 09:10Z to 10:47Z is 1 h 37 min. 52 min is only the time to detect, 45 min only the time to contain, and 1 h 47 min is a subtraction slip.'),
    ],
  },

  /* ── PLAYBOOKS ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_PLAYBOOKS',
    notes: `A **playbook** is the agreed sequence of steps for one type of incident, with its decision points and
who may approve what. It exists so that the 2 a.m. response is the same as the 2 p.m. one, and so a new
L1 analyst can do the first hour well without guessing. The three an Indian SOC sees most are phishing,
account takeover and ransomware.

## What makes a playbook usable

- **A trigger** — which alerts or reports start it.
- **Steps with owners** — "L1: …", "IR lead approves: …", "Finance: …".
- **Decision points** with the question and what each answer leads to.
- **Stop conditions** — when to escalate out of the playbook (unknown situation, executive involved,
  money moved).
- **Evidence to keep** at each step.
- **Communication** — who is told what, and when.

Keep it to a page or two. A forty-page playbook is not read during an incident.

## Phishing (MITRE ATT&CK T1566)

Trigger: a user report (the "report phish" button), a mail-gateway detection, or a click alert.

1. **Collect the message** with full headers; note sender, subject, URLs, attachment hashes.
2. **Find every recipient** — search the mail gateway on sender, subject and URL, not only one of them.
3. **Did anyone click?** Proxy and DNS logs for the URL domain. *No* → step 6.
4. **Did a risky sign-in follow?** Identity-provider logs for sign-ins by the clickers from unusual IPs.
   *Yes* → switch to the account-takeover playbook for those users.
5. **Did an attachment run?** EDR on the clickers' hosts. *Yes* → isolate the host and escalate.
6. **Block and purge**: block the sender and domain at the gateway and proxy; pull the message from all
   mailboxes.
7. **Reset passwords** for anyone who entered them, even if MFA held.
8. **Tell users** briefly what to look out for, and thank the reporter — reporting is what you want more of.

## Account takeover (T1078 Valid Accounts)

Trigger: an impossible-travel or new-country sign-in, an MFA-fatigue pattern, an inbox-rule alert, or a
user saying "I didn't do that".

1. **Confirm out of band** with the user (phone or in person).
2. **Contain** (approval needed for privileged or executive accounts): revoke sessions and tokens, reset
   the password, review MFA methods — the order from the containment lesson.
3. **Remove persistence**: inbox rules, forwarding, delegates, OAuth apps, app passwords.
4. **Review what the account did** during the takeover window: mail sent, files accessed, **payments or
   bank-detail changes**. *Money moved or redirected* → SEV-1, call the bank, involve finance and legal.
5. **Scope**: pivot on the attacker IPs to other accounts (the vikram.t lesson).
6. **Fix the cause**: MFA gaps, password reuse, legacy authentication still allowed.

## Ransomware (T1486 Data Encrypted for Impact) — a response playbook

You do not need to know how ransomware works inside to respond to it. You need to stop the spread, keep
the evidence, restore safely and communicate.

1. **Contain fast**: isolate affected hosts through EDR; if it is spreading, segment the network (block
   file-sharing and remote-administration traffic between zones); disable accounts seen doing the
   encryption, especially privileged ones.
2. **Preserve**: keep affected machines powered on and isolated; keep a copy of the ransom note and of
   encrypted samples; export logs. Do not wipe anything yet.
3. **Protect the backups**: confirm the offline or immutable copies are untouched, and disconnect any
   backup system still reachable from the affected network.
4. **Scope**: find the earliest activity in the timeline. Encryption is the end of an intrusion, not the
   start; there is usually an initial access and days of activity before it.
5. **Recover** from known-good backups onto rebuilt systems, in the business priority order; reset
   credentials broadly, because privileged credentials are usually exposed.
6. **Communicate**: IR lead, leadership, legal, the insurer, CERT-In, and the sector regulator where one
   applies. Any contact with the attacker, and any decision about a demand, belongs to leadership with
   legal advice and law enforcement — never to the SOC. If data was taken too, data-breach duties apply.

## A playbook runner with decision points

Repeatable steps can be partly automated (SOAR platforms do this at scale). A small runner shows the
shape: steps are actions or questions, and every step is logged.

    PHISHING = {'start': 'scope_recipients', 'steps': {
        'scope_recipients': {'do': 'Find every recipient of the message (sender, subject, URL)', 'next': 'any_clicked'},
        'any_clicked':      {'ask': 'clicked', 'yes': 'any_signin', 'no': 'purge_mail'},
        'any_signin':       {'ask': 'risky_signin', 'yes': 'contain_account', 'no': 'reset_password'},
        'contain_account':  {'do': 'Revoke sessions, reset password, re-register MFA, remove inbox rules',
                             'approval': 'IR lead', 'next': 'check_fraud'},
        'check_fraud':      {'ask': 'payment_change', 'yes': 'escalate_fraud', 'no': 'reset_password'},
        'escalate_fraud':   {'do': 'Freeze the changed beneficiary, call the bank, open a SEV-1', 'next': 'reset_password'},
        'reset_password':   {'do': 'Force password reset for users who entered credentials', 'next': 'purge_mail'},
        'purge_mail':       {'do': 'Block sender and domain, pull the message from all mailboxes', 'next': 'notify'},
        'notify':           {'do': 'Update the ticket and tell users what to look out for', 'next': None},
    }}

    def run(playbook, facts, approve=lambda step, who: True):
        log, name = [], playbook['start']
        while name:
            step = playbook['steps'][name]
            if 'ask' in step:
                answer = facts.get(step['ask'])
                if answer is None:
                    log.append((name, f"STOP: no answer for '{step['ask']}', hand to an analyst"))
                    break
                log.append((name, f"{step['ask']} = {answer}"))
                name = step['yes'] if answer else step['no']
                continue
            if 'approval' in step and not approve(name, step['approval']):
                log.append((name, f"WAITING for approval from {step['approval']}"))
                break
            log.append((name, step['do']))
            name = step['next']
        return log

Run for three Kosha Pay users (printing each step as \`n. name  message\`):

    == meera.s        facts: {'clicked': False}
    1. scope_recipients  Find every recipient of the message (sender, subject, URL)
    2. any_clicked       clicked = False
    3. purge_mail        Block sender and domain, pull the message from all mailboxes
    4. notify            Update the ticket and tell users what to look out for
    == ravi.k         facts: {'clicked': True}
    1. scope_recipients  Find every recipient of the message (sender, subject, URL)
    2. any_clicked       clicked = True
    3. any_signin        STOP: no answer for 'risky_signin', hand to an analyst
    == ananya.r       facts: {'clicked': True, 'risky_signin': True, 'payment_change': True}
    ...
    4. contain_account   Revoke sessions, reset password, re-register MFA, remove inbox rules
    5. check_fraud       payment_change = True
    6. escalate_fraud    Freeze the changed beneficiary, call the bank, open a SEV-1
    ...
    9. notify            Update the ticket and tell users what to look out for

With \`approve\` returning False, Ananya's run stops at step 4 with "WAITING for approval from IR lead".

The two design choices worth copying: an **unknown answer stops** the runner and hands over to a human
instead of guessing "no", and **consequential steps wait for approval**. Automate enrichment and evidence
gathering freely; automate containment only where a mistake is cheap and reversible.`,
    workedExample: `**Task: improve Kosha Pay's phishing playbook after the incident review.**

The old playbook had five steps: get the message, block the sender, purge it, reset the reporter's
password, close. The review walked the incident through it and found where it broke.

**Gap 1 — recipients by sender only.** The attacker sent from one address, so it worked this time; the
next campaign may rotate senders. *Change:* search on sender, subject and URL domain, and record which
search found each recipient.

**Gap 2 — no click or sign-in check.** The playbook went from "purge" to "close", so Ananya's takeover was
found only because the beneficiary-change detection fired 48 minutes after her account was taken.
*Change:* add the decision points "any clicked?" and "risky sign-in after the click?", the second handing
over to the account-takeover playbook.

**Gap 3 — password reset as containment.** Resetting a password left sessions and the forwarding rule
alive. *Change:* reference the account-takeover containment order (revoke, reset, MFA, persistence)
instead of repeating a weaker version of it.

**Gap 4 — no money check.** For a fintech the worst outcome of a taken-over finance account is a
redirected payment. *Change:* a decision point "payment or bank-detail change during the takeover
window?" — yes means SEV-1, freeze, call the bank.

**Gap 5 — no stop rule.** A night-shift analyst followed the old playbook to "close" when the user could
not be reached. *Change:* unknown answers stop the playbook and page L2.

**Automation.** Steps 2 (recipient search), 3 (proxy lookup) and 4 (sign-in lookup) are queries; the team
automates them so the analyst starts with the answers already in the ticket. Containment stays manual
with IR-lead approval, because a wrongly disabled finance account during month-end close is a real cost.

**Test.** The revised playbook is run through the runner with the facts of all five Kosha Pay users:
ananya.r reaches escalate_fraud, ravi.k stops for an analyst until his sign-ins are checked, meera.s and
arjun.p go straight to purge. vikram.t is not reached by the phishing playbook at all — he is found by the
account-takeover playbook's IP-pivot step, which is why the two playbooks link to each other.`,
    mcqs: [
      mcq('A playbook runner reaches "Did a risky sign-in follow the click?" and the identity logs are unavailable. What should a well-designed runner do?', [
        ['Stop and hand the case to an analyst with what is known so far', true],
        ['Treat the missing answer as "no" and carry on to the purge step', false],
        ['Treat the missing answer as "yes" and disable the account at once', false],
      ], 'An unknown is neither yes nor no; guessing "no" can close a live takeover, and guessing "yes" disables accounts on no evidence. Stopping with the facts gathered so far lets a human decide quickly.'),
      mcq('During a ransomware incident at a Chennai hospital chain, which action belongs in the response playbook\'s first hour?', [
        ['Check the offline backups are untouched and cut reachable backup links', true],
        ['Restore every encrypted server from last night\'s backup straight away', false],
        ['Power off every affected server so that the encryption stops at once', false],
        ['Reply to the ransom note so the team can learn the size of the demand', false],
      ], 'Protecting the backups is early and urgent, because they are the recovery path and are often targeted. Restoring before scoping can bring back what the attacker left, powering off destroys volatile evidence when isolation would stop the spread, and any contact with the attacker is a leadership and legal decision, never the SOC\'s.'),
      mcq('Which playbook step is the safest to automate fully, without an analyst approving each run?', [
        ['Searching the mail gateway for every recipient of a reported phish', true],
        ['Disabling any account that signs in from a new country for the first time', false],
        ['Isolating any server on which the EDR agent reports a suspicious process', false],
      ], 'A search changes nothing and its mistakes are cheap, so it can run on every report. Automatic disabling and server isolation have real business cost when wrong — new-country sign-ins include genuine travel — so they need approval or tight conditions.'),
      mcq('In the account-takeover playbook, why does "review what the account did during the takeover window" come before closing the case?', [
        ['The attacker may have changed payments or data that must be undone', true],
        ['The review is needed to decide the user\'s new password complexity', false],
        ['The account cannot be re-enabled until every email has been re-read', false],
      ], 'Containment stops future misuse, but past actions — a changed beneficiary, forwarded mail, shared files — stay until someone finds and reverses them. Password rules are a separate fix, and re-enabling needs a review of the takeover window, not of every email.'),
    ],
    checkpoint: [
      mcq('The phishing playbook finds that a clicker then had a successful sign-in from an unfamiliar IP. What should happen next?', [
        ['Hand over to the account-takeover playbook for that user', true],
        ['Purge the message and close the case as fully contained', false],
        ['Reset the password and keep following the phishing steps', false],
        ['Block the IP at the firewall and wait for further alerts', false],
      ], 'A successful risky sign-in means the account is taken over, which has its own containment order (sessions, password, MFA, persistence, review of actions). Purging closes too early, a password reset alone leaves sessions and rules alive, and blocking one IP does not remove the access already gained.'),
      mcq('In a ransomware response, who should decide whether to engage with the attacker\'s demand at all?', [
        ['Leadership, advised by legal and law enforcement', true],
        ['The on-shift SOC analyst who first found the note', false],
        ['The IT team that manages the company\'s backups', false],
      ], 'Engaging with a demand has legal, financial and reputational consequences, so it sits with leadership on legal and law-enforcement advice. The SOC and IT teams contain, preserve and restore; they do not make that call.'),
      mcq('Which element turns a list of response steps into a usable playbook?', [
        ['Decision points, owners, approvals and when to escalate', true],
        ['A long description of each attack technique and its variants', false],
        ['Screenshots of every console the analyst might need to open', false],
      ], 'A playbook has to work under pressure: who does each step, what decides each branch, who approves the risky actions and when to hand over to a human. Long attack descriptions and screenshots make it slower to read without making the decisions clearer.'),
    ],
  },

  /* ── REPORTING_REVIEW ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_REPORTING_REVIEW',
    notes: `An incident is not finished when the attacker is out. It is finished when the right people have been
told, the record is complete, and something has changed so that the next one is caught sooner or does
less harm. This lesson covers the report, India's reporting duties in outline, and the review.

## Two audiences, two documents

- **The executive summary** (half a page): what happened, business impact, whether customer or personal
  data was affected, current status, what it cost or might, and the decisions needed from leadership.
  No jargon, no IP addresses.
- **The technical report**: the full timeline in UTC, scope table, root cause, evidence list with
  hashes, containment and recovery actions with times and approvers, indicators, and the
  recommendations with owners.

Write facts, not adjectives. "The attacker gained access at 04:35:21Z via an approved MFA push after two
refusals" is a fact. "A sophisticated attacker bypassed our MFA" is an excuse in the making.

## A report outline that works

1. Summary (the executive half page)
2. Timeline (observations and inferences marked; every row traceable to evidence)
3. Scope: accounts, hosts, data and systems affected, and what was checked and found clean
4. Root cause and contributing factors
5. Response actions: containment, eradication, recovery, with times and who approved
6. Impact: business, financial, data, customers
7. Notifications made: to whom, when, reference numbers
8. Recommendations: each with an owner and a due date
9. Appendices: indicators, evidence hashes, queries used

## Reporting duties in India — in outline

Regulations change and the exact text matters, so treat this as a map, not as legal advice, and always
read the **current** directions and rules (or ask your compliance team) before an incident, not during it.

- **CERT-In.** Under the IT Act, CERT-In (the national CERT) has issued directions requiring service
  providers, intermediaries, data centres, body corporates and government organisations to report
  specified types of cyber incidents to it within a short, fixed time of noticing them, and to keep logs
  for a set period. The list of reportable incidents is broad — targeted scanning, compromise of systems
  or accounts, ransomware, data breaches and leaks, attacks on applications and others are covered. The
  report goes through CERT-In's published channels and formats. Your organisation's IR plan should name
  who files it, and the decision log should show when the incident was noticed, because the clock is
  measured from then.
- **The Digital Personal Data Protection Act, 2023 (DPDP Act).** If personal data is involved, the Data
  Fiduciary (the company that decides why and how the data is processed) must inform the Data Protection
  Board of India and each affected person about a personal data breach, in the form and manner the
  Rules set out. "Breach" in the Act is wide — unauthorised processing, accidental disclosure, loss of
  access — not only theft. Read the current Rules for the content and timing of each notice.
- **Sector regulators.** Banks and other RBI-regulated entities, SEBI-regulated entities and insurers
  have their own incident-reporting requirements to their regulator, often on short timelines. At a bank
  or a fintech partnered with banks, your compliance team will know which apply.

The analyst's practical part: record **when the incident was noticed** and **when it was declared**,
keep the evidence that answers the regulator's likely questions (what data, how many people, what was
done), and never send anything outside the company yourself — notifications go through legal and the
named owner.

At Kosha Pay: a compromised account and a redirected payment are reportable to CERT-In under its broad
categories; the mailbox the attacker read contained vendor contact details and invoices — personal data
of the vendors' staff — so the DPDP breach duty had to be assessed by the DPO; and Kosha Pay's partner bank
required notice under its contract. Three notices, three owners, all in the report's "Notifications"
section with times.

## The blameless post-incident review

Year 3 explained why blame makes the next incident worse. Here is how the meeting is run:

- **When**: within one to two weeks, while memories are fresh.
- **Who**: responders, system owners, and someone from the affected business team; a facilitator who
  was not in the incident.
- **Inputs**: the timeline and the decision log, shared before the meeting.
- **Questions**, in this order: What happened? What went well? Where were we slow or surprised, and
  why? What would have detected it sooner? What would have limited the damage?
- **Language**: "the finance group was excluded from MFA" — a condition of the system — not "Vikram did
  not set up MFA".
- **Outputs**: a short list of actions, each with one owner and a date, tracked like any other work.
  Five done actions beat twenty aspirational ones.

Ask "why?" more than once. At Kosha Pay: why did the takeover succeed? MFA fatigue. Why could a push be
approved without context? The push showed no location or number match. Why? The MFA policy predates
number matching and was never revisited. The action is a policy change, not a training slide.

## Turning lessons into detections

The most valuable output is usually a new or better detection, because detection improvements are
cheaper than prevention and help with attacks you have not seen yet. From Kosha Pay: alert on repeated
MFA refusals followed by an approval within minutes; alert on inbox rules that forward externally; alert
on sign-ins from a new country for finance users; and require a second approval for vendor bank-detail
changes. Each goes to the detection engineering backlog ("Detection Engineering with Sigma") with the
incident number, so its value can be shown later.`,
    mcqs: [
      mcq('Which sentence belongs in an incident report\'s timeline rather than being rewritten?', [
        ['04:35:21Z: successful sign-in as ananya.r from 203.0.113.45 after two refused MFA pushes', true],
        ['04:35Z: a highly sophisticated attacker bypassed MFA using advanced techniques', false],
        ['Around 10 a.m.: the user carelessly approved a push and let the attacker in', false],
        ['Morning of 9 March: the attacker obtained access, details still being confirmed', false],
      ], 'A timeline row states an exact time, the actor, the source and what the evidence shows. "Sophisticated" is an adjective that excuses, "carelessly" assigns blame, and a vague morning time with no source cannot be checked against the logs.'),
      mcq('An analyst at a Bengaluru fintech confirms that an attacker read a mailbox holding customer KYC documents. What is the analyst\'s part in the reporting duties?', [
        ['Record when it was noticed and preserve evidence for legal and the DPO', true],
        ['File the CERT-In report personally, since the analyst noticed it first', false],
        ['Email the affected customers at once so that they can protect themselves', false],
        ['Wait for the post-incident review to decide whether anything is reportable', false],
      ], 'Notifications go through legal and the named owner, and the clocks run from when the incident was noticed, so the analyst\'s job is that timestamp and the evidence. Filing or emailing customers personally bypasses the people accountable, and waiting for the review may miss the deadlines.'),
      mcq('In a blameless review, which action item is the best written?', [
        ['Enforce MFA on the legacy finance group — owner: IAM lead, by 30 April', true],
        ['Vikram to be more careful with passwords from now on, starting today', false],
        ['Everyone should be more vigilant about phishing emails in the future', false],
      ], 'A good action changes a condition of the system and has one owner and a date. Telling a person to be careful blames and changes nothing, and "everyone be vigilant" has no owner and no way to tell when it is done.'),
    ],
    checkpoint: [
      mcq('The executive summary of an incident report should contain which of the following?', [
        ['Business impact, data affected, status and the decisions needed', true],
        ['The full indicator list and the queries used to scope the incident', false],
        ['The complete timeline in UTC with every row\'s source evidence file', false],
      ], 'Executives need impact, status and the decisions only they can take, in half a page without jargon. Indicators, queries and the full timeline belong in the technical report and its appendices.'),
      mcq('Under the DPDP Act, who must give notice of a personal data breach to the Data Protection Board and affected people?', [
        ['The Data Fiduciary that decides why and how the data is processed', true],
        ['The SOC analyst who first noticed the breach during an investigation', false],
        ['The cloud provider whose servers happened to store the personal data', false],
      ], 'The Act places breach duties on the Data Fiduciary. Analysts supply facts to the people who file, and a cloud provider acting as a processor is not the one that owes the notice to the Board and the affected people.'),
      mcq('A review finds the incident was detected 48 minutes after compromise, by a payments rule. Which recommendation follows best from that finding?', [
        ['Add an alert on repeated MFA refusals followed by an approval', true],
        ['Buy a second SIEM so that alerts are checked by two platforms', false],
        ['Shorten the payments rule\'s name so analysts read it faster', false],
        ['Run the payments rule once an hour instead of in real time', false],
      ], 'The MFA-fatigue pattern happened at the moment of compromise, so alerting on it would have cut detection time from 48 minutes to about one. A second SIEM does not add the missing signal, renaming a rule changes nothing, and running hourly makes detection slower.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_DEBUGGING',
    notes: `Incident-response mistakes rarely crash. They produce a timeline that looks fine and tells the wrong
story, a scope that looks complete and misses an account, or a hash that says "unchanged" when it is not.
Each case below was run on the Kosha Pay sample data. Read the symptom, find the cause, and fix only that.

## 1. The click that happened after the fraud

**Symptom.** The unified timeline shows Ananya's click on the phishing page at 10:01:44Z — four hours
and forty minutes *after* the beneficiary change at 05:21:10Z. The analyst starts writing "the click was
not the way in".

    local = pd.to_datetime(proxy['time'], format='%d/%m/%Y %H:%M:%S')
    proxy['ts_utc'] = local.dt.tz_localize('UTC')

**Cause.** The proxy writes local Indian time with no zone. \`tz_localize('UTC')\` declares that 10:01:44 was
already UTC, so every proxy event lands 5 h 30 min late.

**Fix.** Say what zone the clock was in, then convert: \`local.dt.tz_localize('Asia/Kolkata').dt.tz_convert('UTC')\`
gives 04:31:44Z — between delivery (04:12:05Z) and the first MFA push (04:33:58Z), where the story says it
belongs. Check every source's clock against one event you know the true time of.

## 2. The incident in September

**Symptom.** The proxy rows land in September, nowhere near the other events.

    proxy['ts'] = pd.to_datetime(proxy['time'])

**Cause.** With no format, "09/03/2026 10:01:44" was read month first: it printed \`2026-09-03 10:01:44\`.
Day-first dates are normal in India; parsers assume month-first unless told otherwise.

**Fix.** Give the exact format, \`format='%d/%m/%Y %H:%M:%S'\`. An explicit format also fails loudly on a
row that does not match, rather than guessing differently row by row.

## 3. "Mixed timezones detected"

**Symptom.** Combining the mail gateway (\`...04:12:05Z\`) and identity-provider (\`...10:05:21+05:30\`)
strings into one column and parsing fails:

    ValueError: Mixed timezones detected. Pass utc=True in to_datetime or tz='UTC' in DatetimeIndex to convert to a common timezone.

**Cause.** The strings carry different offsets, and pandas will not silently pick one.

**Fix.** \`pd.to_datetime(col, utc=True)\` converts each value from its own offset to UTC: the two become
04:12:05Z and 04:35:21Z. The error is pandas protecting you; do not "fix" it by stripping the offsets.

## 4. The hash that missed a change

**Symptom.** A colleague's verification script says the proxy export is unchanged, but the file is 517
bytes and the custody record says 513.

    h = hashlib.sha256(open(path).read().encode()).hexdigest()

**Cause.** \`open(path)\` is text mode, which turns Windows CRLF line endings into LF while reading. The file
had been saved with CRLF endings; read in text mode, it hashes to the original \`b909beed690fd1ea...\`. Read
as bytes, it hashes to \`265dbc6a8eb7ca39...\`.

**Fix.** Hash in binary mode, in chunks (\`open(path, 'rb')\` and the \`sha256_of\` function from the evidence
lesson). Then record the change in the custody log, find out who saved the file, and analyse a copy from
the original export.

## 5. The scope that missed an account

**Symptom.** The scope lists three recipients and one compromised account. Two days later, vikram.t's
account is used to view vendor V-2291 again.

    users = set(mail.loc[mail['sender'] == 'kyc@kosha-pay-support.co', 'recipient'])

**Cause.** Scoping started and ended with the email. Vikram never received it; the attacker signed in as
him from 203.0.113.45 with a reused password. Only a pivot on the attacker's IPs finds him.

**Fix.** Scope from every indicator across every source, and pivot until a round finds nothing new: users
who received or clicked, users with a successful sign-in from an attacker IP, and other non-office IPs used
by those accounts. The pivot loop in the scoping lesson finds both compromised accounts.

## 6. The playbook that closed a live takeover

**Symptom.** For ravi.k, who clicked, the runner reset his password, purged the mail and closed the case
— but nobody had checked his sign-ins.

    answer = facts.get(step['ask'], False)

**Cause.** A missing fact defaults to False, so "risky sign-in?" was answered "no" without any evidence.
The run printed \`3. any_signin  risky_signin = False\` and went on to reset_password, purge_mail and notify.

**Fix.** \`facts.get(step['ask'])\` and stop on \`None\`: the run then ends at step 3 with "STOP: no answer
for 'risky_signin', hand to an analyst". Any automation that turns "unknown" into "no" will one day close
a real incident.`,
    mcqs: [
      mcq('An analyst\'s timeline shows a VPN log-in from a laptop 5 h 30 min after every related event, and the VPN writes local Indian time without a zone. What is the most likely cause?', [
        ['The naive local time was localised as UTC instead of Asia/Kolkata', true],
        ['The VPN server\'s clock had drifted by several hours that day', false],
        ['The events were sorted as text strings rather than as datetimes', false],
        ['The user really did connect hours later, from a different place', false],
      ], 'An offset of exactly 5 h 30 min is IST\'s offset from UTC: the local time was declared to be UTC. Clock drift is rarely exactly the zone offset, a string sort jumbles order rather than shifting one source, and a real later connection would not shift every event by the same amount.'),
      mcq('A verification step hashes an evidence file in text mode and reports "OK", while its size has changed by 4 bytes. What should the analyst conclude?', [
        ['The check is flawed; rehash in binary mode before trusting the file', true],
        ['The file is unchanged, since a matching hash outweighs a size change', false],
        ['Different file systems report sizes differently, so ignore the bytes', false],
      ], 'Text mode can hide line-ending changes, so a matching text-mode hash proves nothing about the bytes. A size change means the bytes changed; file systems report the same byte count for the same content.'),
      mcq('pd.to_datetime("09/03/2026 10:01:44") with no other arguments returned 3 September. Which fix is best for an incident timeline?', [
        ['Pass the exact format string, day first, for that source', true],
        ['Replace every slash with a dash before parsing the column', false],
        ['Subtract six months from any timestamp after the incident', false],
        ['Sort the timeline by source first so the dates group up', false],
      ], 'An explicit format reads the day first and fails loudly on a non-matching row. Swapping separators leaves the order ambiguous, subtracting months is a hack that breaks real dates, and sorting by source hides the error rather than fixing it.'),
      mcq('A playbook runner uses facts.get(question, False). What failure does that default lead to?', [
        ['Unknown facts are treated as "no" and the case can close too early', true],
        ['Unknown facts raise a KeyError and the runner crashes mid-incident', false],
        ['Every question is answered "yes", which disables too many accounts', false],
      ], 'With a default of False, a question nobody answered takes the "no" branch, which in a phishing playbook skips containment. get() with a default never raises KeyError, and it never turns answers into "yes".'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_PRACTICE',
    notes: `Ten exercises from easy to hard, all on the Kosha Pay incident or ones like it. Work each before
reading the answer. The timeline file is the 20-row output of the scoping lesson's script.

## 1. Lifecycle phase (easy)

Name the NIST SP 800-61 phase for each: (a) restoring the vendor's correct bank details; (b) a tabletop
exercise in January; (c) deciding the beneficiary-change alert is real; (d) the blameless review.

**Answer.** (a) Containment, eradication and recovery. (b) Preparation. (c) Detection and analysis.
(d) Post-incident activity.

## 2. Convert the clocks (easy)

Give UTC for: (a) proxy \`09/03/2026 23:40:00\` (IST, naive); (b) audit epoch \`1773033670\`;
(c) \`2026-03-09T02:15:00-04:00\` from a US vendor's portal.

**Answer.** (a) 2026-03-09 18:10:00Z. (b) 2026-03-09 05:21:10Z — the beneficiary change (10:51:10 IST).
(c) 2026-03-09 06:15:00Z. Checked with pandas: \`tz_localize('Asia/Kolkata').tz_convert('UTC')\`,
\`unit='s', utc=True\`, and \`tz_convert('UTC')\`.

## 3. Count by user (easy)

With the timeline in a DataFrame \`tl\`, how many rows does each user have?

**Answer.** \`tl.groupby('who').size()\` gives ananya.r 12, ravi.k 3, meera.s 2, vikram.t 2, arjun.p 1.
By source: idp 7, mail 7, proxy 4, payouts 2. One user having 12 of 20 rows is itself a hint about where
the incident is centred.

## 4. Severity (medium)

Set a severity (SEV-1 to SEV-4) and give one reason: (a) a phish clicked by one user, no credentials
entered; (b) one HR account taken over, mailbox read, no payments possible; (c) ransomware notes on two
file servers at a hospital; (d) a laptop with an unapproved game installed.

**Answer.** (a) SEV-3: suspicious, limited, nothing confirmed lost. (b) SEV-2: confirmed compromise of one
account; it may rise if personal data in the mailbox proves extensive. (c) SEV-1: critical business impact
to patient services. (d) SEV-4: policy violation, negligible impact.

## 5. Order of volatility (medium)

Put in collection order: disk image of a server; firewall configuration export; the server's running
processes and network connections; last month's backup tape; the cloud identity provider's sign-in log.

**Answer.** Running processes and connections → disk image → identity-provider log (remote logging, but
export it early because retention runs out) → firewall configuration → backup tape. If the IdP's retention
is about to expire, move its export earlier: order of volatility is about what disappears first.

## 6. Classify the scope (medium)

For each, choose compromised / credentials exposed / clicked / received only, and the action:
(a) delivered, no click; (b) clicked, typed password, MFA refused; (c) never received the mail, success
sign-in from 203.0.113.45.

**Answer.** (a) Received only — purge, awareness note. (b) Credentials exposed — reset password, no
session revocation. (c) Compromised — full account-takeover containment and a check of what the account did.

## 7. Write the pivot (medium)

Write a pandas expression for every **other** non-office IP that signed in successfully as a user already
known to be compromised. Office egress starts \`192.0.2.\`.

**Answer.**

    owned = {'ananya.r', 'vikram.t'}
    idp[idp['user'].isin(owned) & (idp['result'] == 'success')
        & ~idp['src_ip'].str.startswith('192.0.2.')]['src_ip'].unique()

On the sample data it returns 203.0.113.45 and 198.51.100.23 — the second is a new indicator.

## 8. Account containment order (medium)

Put in order and say why the first must be first: reset MFA methods; revoke sessions and refresh tokens;
remove inbox rules and OAuth grants; reset the password; review what the account did.

**Answer.** Revoke sessions → reset password → reset MFA methods → remove rules and OAuth grants → review
actions. Revoking first ends the attacker's live access; a password reset alone may leave existing
sessions working.

## 9. Fix the report sentence (hard)

Rewrite for the technical report: "Around 10:30 a sophisticated hacker got into Vikram's account because
he was careless with passwords."

**Answer.** "05:01:15Z (10:31:15 IST): successful sign-in as vikram.t from 203.0.113.45 (identity-provider
log). Contributing factors: the account was in a group excluded from MFA; the password had been reused
(inferred — matching exposure under investigation)." Exact UTC time, the source, observation and
inference separated, a system condition instead of blame.

## 10. Design a decision point (hard)

Add a step to the phishing playbook for a fintech: after containing a takeover, what question and which
branches?

**Answer.** Question: "Did the account change any payment, beneficiary or bank detail, or approve a
transfer, during the takeover window?" Yes → freeze the affected payouts, call the partner bank, raise to
SEV-1, involve finance and legal. No → continue to password resets and purge. Unknown (the payouts
audit is not available) → stop and page L2, because "unknown" must never become "no" for money.`,
    mcqs: [
      mcq('A payouts audit row has epoch 1773033670. In IST, when did the action happen?', [
        ['10:51:10 on 9 March 2026', true],
        ['05:21:10 on 9 March 2026', false],
        ['16:21:10 on 9 March 2026', false],
        ['23:51:10 on 8 March 2026', false],
      ], 'The epoch converts to 05:21:10Z, and IST is UTC plus 5 h 30 min, giving 10:51:10. 05:21:10 is the UTC value itself, 16:21:10 adds eleven hours, and 23:51:10 on 8 March subtracts the offset instead of adding it.'),
      mcq('Which is collected first from a running server that is under investigation?', [
        ['Its running processes and network connections', true],
        ['Its full disk image taken with a write-blocker', false],
        ['Its firewall rules exported from the console', false],
      ], 'Processes and connections are lost the moment the machine reboots or the attacker exits, so they are the most volatile. The disk survives a reboot and the firewall configuration changes slowly, so both come later.'),
      mcq('Kosha Pay\'s finance user receives the phish, clicks and enters a password, but no sign-in from an attacker IP follows. Which scope label and action fit?', [
        ['Credentials exposed; reset the password', true],
        ['Compromised; run the full takeover containment', false],
        ['Received only; purge the email and move on', false],
      ], 'The password is known to the attacker, so it must be reset, but with no attacker sign-in there is no session to revoke or activity to review. "Compromised" overstates the evidence and "received only" ignores the typed password.'),
      mcq('In a report, which wording best records a likely cause that is not yet proven?', [
        ['"Password reuse (inferred; exposure under investigation)"', true],
        ['"Password reuse was definitely the cause of the access"', false],
        ['"Cause unknown" with the reuse theory left out entirely', false],
        ['"The user was careless and reused passwords elsewhere"', false],
      ], 'Labelling it as an inference keeps the useful hypothesis while being honest about the evidence. "Definitely" overstates it, leaving it out loses useful analysis, and "careless" turns a system condition into blame.'),
      mcq('An analyst finds 12 of 20 timeline rows belong to ananya.r. What does that suggest first?', [
        ['Her account is where most attacker activity sits, so review it first', true],
        ['Her account is noisy by nature, so its rows can be filtered out', false],
        ['The timeline is broken, since one user cannot own most of the rows in it', false],
      ], 'A concentration of events around one identity after a phish points to the centre of the incident and the place to start. Filtering it as noise hides the attack, and one user dominating an incident timeline is normal, not a sign of a bug.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_INTERVIEW_QUESTION',
    notes: `SOC L1/L2 interviews at MSSPs, banks and GCCs in Hyderabad, Bengaluru and Pune ask about incident
response in scenarios, not definitions. They want to hear a method, the order, and what you would **not**
do. Four questions that come up, with a model answer and the follow-up a good answer earns.

## 1. "Walk me through the incident response lifecycle."

**Model answer.** "I use NIST SP 800-61's phases. Preparation: the plan, roles, logging, playbooks,
tested backups, tabletop exercises. Detection and analysis: confirm the alert from an independent
source, declare, set severity from impact, scope and keep a UTC timeline. Containment, eradication and
recovery: stop the spread with reversible steps first, remove every way back in, restore from
known-good backups, and watch for a return. Post-incident: the report, a blameless review, and actions
with owners — usually including a new detection. It is a cycle: findings during containment send you
back to analysis."

**Follow-up:** "Which phase do most organisations underinvest in?" — Preparation. Give a concrete gap:
logs not retained long enough, backups never test-restored, nobody named to approve isolating a
production server.

## 2. "A user reports they clicked a link in a suspicious email. What do you do?"

**Model answer.** "First, get the email with headers and find every recipient — on sender, subject and
URL. Then three checks for each: did they click (proxy, DNS), did they enter credentials or did a risky
sign-in follow (identity logs — refused MFA pushes followed by an approval is a pattern I look for), did
anything run on the endpoint (EDR). If a risky sign-in succeeded, it becomes an account takeover:
revoke sessions, reset password and MFA, remove inbox rules and OAuth grants, and review what the account
did. If not, block and purge, reset passwords for anyone who typed one, and thank the reporter. I'd
also pivot on any attacker IP to find accounts the email didn't reach."

**Follow-up:** "Why not just reset the password?" — Existing sessions and refresh tokens may stay valid,
and rules or OAuth grants keep working after a reset. Revoke first, then reset, then remove persistence.

## 3. "You find ransomware on a server at 2 a.m. What are your first steps?"

**Model answer.** "Isolate the host through EDR — not power it off, so memory and live state remain for
the investigation. Page the IR lead; this is SEV-1. Check for spread: other hosts showing the same
activity, accounts doing the encryption — disable those with approval. Make sure the offline or immutable
backups are untouched and cut any backup system still reachable. Preserve the note, samples and logs.
Then scope back to the earliest activity, because encryption is the end of the intrusion, not the start.
Communication and any decisions about the attacker's demand go to leadership and legal, not the SOC."

**Follow-up:** "When can you start restoring?" — Once the way in is found and closed and the backups are
confirmed clean; otherwise you restore into a network the attacker can still reach. Restore onto rebuilt
systems in business priority order, and reset privileged credentials.

## 4. "How do you preserve evidence, and why does chain of custody matter?"

**Model answer.** "Collect in order of volatility — memory and live state first, then disk, and export
cloud and SaaS logs early before retention ends. Work on copies, never browse the original system, and
use the team's approved tools. Hash every item with SHA-256 when collected and record it in a chain of
custody: who, what, when, the hash, and every transfer. If anyone later asks whether the log was edited,
a matching hash plus the custody record answers it."

**Follow-up:** "What would make a hash check lie?" — Hashing in text mode: line-ending changes disappear
on read, so a modified file can hash the same as the original. Hash bytes, in binary mode, in chunks.

## How to sound like an analyst

- Say **the order**, and why.
- Say **what you would not do** (power off, reset password only, email the user on a compromised mailbox).
- Mention **UTC timestamps and the case record** without being asked.
- Name the **decision owners**: you recommend, the IR lead or client approves.`,
    mcqs: [
      mcq('An interviewer asks why you would not simply power off a server showing ransomware notes. Which answer is strongest?', [
        ['Isolating it keeps memory and live state for analysis while still cutting it off', true],
        ['Powering off would void the server\'s warranty under most hardware contracts', false],
        ['Powering off is fine; it is the restart afterwards that destroys the evidence', false],
      ], 'Isolation stops spread and the attacker\'s contact while preserving volatile evidence, which a power-off destroys. Warranties are irrelevant, and the evidence in memory is lost at power-off, not only at restart.'),
      mcq('In a phishing interview question, which detail shows the interviewer you understand scoping beyond the email itself?', [
        ['Pivoting on the attacker IP to find accounts the email never reached', true],
        ['Checking whether the phishing email\'s subject line contained a typo', false],
        ['Counting how many recipients opened the email on a mobile phone', false],
        ['Reading the phishing page\'s source code to learn how it was built', false],
      ], 'Attackers reuse infrastructure and credentials, so an IP pivot finds compromised accounts outside the recipient list — as with vikram.t. Typos and device counts do not widen scope, and analysing the phishing page is not how affected accounts are found.'),
      mcq('Asked "which lifecycle phase is most often underfunded?", which answer and example are strongest?', [
        ['Preparation, e.g. backups that were never test-restored', true],
        ['Recovery, e.g. restoring the servers too quickly afterwards', false],
        ['Detection, e.g. too many analysts on each shift of the SOC', false],
      ], 'Preparation is where reviews keep finding the gaps — retention, approvals, untested backups. Restoring quickly is not underfunding, and too many analysts is not a common shortfall.'),
    ],
  },

  /* ── MINI_PROJECT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_MINI_PROJECT',
    notes: `## The scenario

**Rupaya Wallet** (fictional) is a Hyderabad fintech of 600 people offering a prepaid wallet and merchant
payouts through a partner bank. Its SOC is three analysts per shift plus an MSSP overnight. On a Monday
in July, at 11:47 IST, a merchant-operations executive reports an email "from the partner bank" asking
her to re-verify her payout-portal login. She did not click — but she thinks colleagues might have.

You will run this as a **tabletop exercise** with two to four classmates (alone is allowed: play each
role in turn) and then do the analysis and writing yourself. Roles: IR lead, L1 analyst, L2 analyst,
scribe; a facilitator (a classmate or your mentor) releases the injects.

All data is synthetic and must be labelled as such in everything you hand in.

## The data you build

Write a small generator (like the Kosha Pay one in this topic) that produces four JSON-lines files for
one day, with a deliberately different time format in each:

- **mail_gateway.jsonl** — ISO 8601 UTC. About 40 messages: normal mail plus the phishing campaign — one
  lookalike sender domain, sent to **7** recipients in merchant operations and finance, and a second
  wave 90 minutes later from a **different sender address** with the same URL domain to 3 more people.
- **proxy.jsonl** — local IST, day-first, no zone. Normal browsing plus clicks on the phishing domain by
  **4** of the recipients from named laptops.
- **idp_signins.jsonl** — ISO with +05:30 offsets. Normal office sign-ins plus: one user with three
  refused MFA pushes then an approval from attacker IP A; one user whose credentials were typed but MFA
  held; one user **outside the recipient list** signing in from IP A with no MFA (a legacy service
  group); later, a compromised user signing in from a second attacker IP B.
- **app_audit.jsonl** — epoch seconds. Payout-portal and mailbox events: an external forwarding inbox rule,
  a search for "settlement", a change to one merchant's settlement bank account, and a download of a
  merchant list containing contact names and phone numbers (personal data).

Use only reserved documentation addresses for attacker IPs (192.0.2.0/24, 198.51.100.0/24,
203.0.113.0/24) and a made-up lookalike domain. Keep a short README listing what you planted, so your
mentor can check your scoping against it — and do your scoping **without looking at it**: ask a classmate
to generate your data, and you theirs, if you can.

## The tabletop: injects

The facilitator releases these in order. At each one, the team decides and the scribe records decision,
owner and time.

1. **11:47 IST** — the user report. Is this an incident yet? What do you check first?
2. **12:20 IST** — the mail search shows the first wave. Who is in scope? What is the severity now?
3. **12:45 IST** — sign-in logs show the MFA-fatigue pattern for one user. Contain now or keep scoping?
   Who approves?
4. **13:30 IST** — finance reports a merchant's settlement account changed this morning. Next payout
   batch at 16:00 IST. What changes?
5. **14:10 IST** — the IdP shows a success from IP A for a user nobody emailed. What does that tell you
   about your scope?
6. **15:00 IST** — legal asks: "Is this reportable, and to whom?" What facts do you give them?
7. **Next day** — the second wave is discovered. Did your playbook miss it? Why?

## Deliverables

1. **Timeline** — \`timeline.py\` building a unified UTC timeline from the four files (with IST alongside),
   and the CSV it produced. Each row has a \`source_file\` column.
2. **Scope** — \`scope.py\` with a pivot loop over domain and IPs until nothing new is found, and a scope
   table: entity, status (compromised / credentials exposed / clicked / received only), evidence, action.
3. **Evidence and custody** — SHA-256 of every data file at collection, a JSON-lines chain-of-custody
   record with at least one transfer entry, and a verify step that prints OK or MISMATCH (demonstrate one
   MISMATCH on a copy you deliberately changed, and explain it).
4. **Containment plan** — ordered steps for each compromised account and host, with approver, what you
   would not do and why, and the watch list for the following 30 days.
5. **Playbook** — your improved phishing → account-takeover playbook as a runner with at least four
   decision points, a stop on unknown answers, an approval gate, and runs printed for three users.
6. **Incident report** — executive summary (half a page), technical report on the outline from the
   reporting lesson, and a "Notifications" section saying which duties you believe apply (CERT-In, DPDP
   Act, the partner bank) and what facts each owner needs — in outline, citing that the current text must
   be checked.
7. **Post-incident review** — the blameless review notes: what went well, where you were slow, at least
   one "five whys", and three to five actions with one owner and a date each, including at least one new
   detection described precisely enough to write as a rule.

## Milestones

- **Day 1** — generator and README; timeline script working with all four clock formats.
- **Day 2** — tabletop session (60–90 minutes) with the scribe's decision log.
- **Day 3** — scope, custody and containment plan.
- **Day 4** — playbook runner, report and review.

## What good looks like

The scope finds the user outside the recipient list and the second wave. Every claim in the report has
a UTC time and a source. Containment is ordered, approved and proportionate, with the 16:00 payout
treated as the deadline it is. Inferences are marked as inferences. The review produces changes to the
system, not advice to people.`,
    assignment: {
      title: 'A Tabletop Exercise and Incident Report: Phishing to Account Takeover at a Fintech',
      description: 'Run a tabletop on a phishing-to-account-takeover incident at a fictional Hyderabad fintech, then build the unified timeline, scope it by pivoting, preserve the evidence with a chain of custody, plan containment, encode the playbook, and write the incident report and the blameless post-incident review.',
      instructions: `1. Write a generator for four synthetic log files (mail gateway in UTC, proxy in naive IST, identity provider with +05:30 offsets, app audit in epoch seconds) with the planted events in the brief; label all data as synthetic and use only documentation IP ranges.
2. Run the tabletop with the seven injects and submit the scribe's decision log (decision, owner, time).
3. Build the unified UTC timeline with pandas, with IST alongside and a source_file column; submit the script and the CSV.
4. Scope by pivoting on the domain and attacker IPs until nothing new appears; submit the script and a scope table with status, evidence and action for every entity.
5. Hash every evidence file with SHA-256 in binary mode, keep a JSON-lines chain-of-custody record with a transfer entry, and show a verify run including one explained MISMATCH.
6. Write the containment, eradication and recovery plan in order, with approvers, what you would not do, and a 30-day watch list.
7. Encode the improved playbook in a runner with at least four decision points, a stop on unknown answers and an approval gate; print runs for three users.
8. Write the incident report (executive summary and technical report, including notifications in outline) and the blameless review with three to five owned, dated actions.`,
      rubric: [
        { criterion: 'Timeline and time handling', description: 'All four clock formats converted correctly to UTC, IST shown alongside, rows traceable to source files, and the story reads in the right order.', maxPoints: 20 },
        { criterion: 'Scoping', description: 'A pivot loop that stops when nothing new appears; finds the out-of-list account and the second wave; statuses graded by evidence, with open items stated.', maxPoints: 20 },
        { criterion: 'Evidence and chain of custody', description: 'Binary-mode SHA-256 on collection, a custody record with a transfer, a working verify step and a correctly explained mismatch.', maxPoints: 15 },
        { criterion: 'Containment and playbook', description: 'Correct account containment order, proportionate and approved actions, the payout deadline handled, a watch list, and a runner that stops on unknowns and gates on approval.', maxPoints: 20 },
        { criterion: 'Report and notifications', description: 'Executive summary for leaders, a technical report on the outline, facts not adjectives, inferences marked, and reporting duties described accurately in outline.', maxPoints: 15 },
        { criterion: 'Tabletop and review', description: 'A decision log from the exercise and a blameless review with five whys and three to five system changes, each with one owner and a date, including a precise new detection.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    mcqs: [
      mcq('In the Rupaya Wallet tabletop, inject 4 reports a changed settlement account with a payout batch due at 16:00 IST. What should change in the team\'s plan?', [
        ['Freeze that payout and call the partner bank now, raising severity to SEV-1', true],
        ['Finish scoping every account first, then decide what to do about the payout', false],
        ['Note it for the post-incident review, since the account change is already done', false],
      ], 'Money about to move to an attacker sets a hard deadline, so the payout is frozen and the bank called while scoping continues, and the impact makes it SEV-1. Waiting for full scope risks the transfer, and deferring it to the review lets the fraud complete.'),
      mcq('Your scope for the project lists only the seven first-wave recipients. Which check most likely finds what is missing?', [
        ['Searching on the URL domain and pivoting on the attacker IPs', true],
        ['Searching again on the first sender address for a longer period', false],
        ['Asking the seven recipients whether they forwarded the email on', false],
      ], 'The second wave used a different sender with the same URL domain, and the out-of-list user is visible only through the attacker IP; searching on URL and pivoting on IPs finds both. A longer search on the same sender misses the new address, and forwarding questions do not find IP-based access.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_INCIDENT_RESPONSE_CHECKPOINT',
    notes: `Ten scenario questions across the topic: the lifecycle and severity, scoping and timelines, evidence and
custody, containment and recovery, playbooks, and reporting. Where a time or a duration is involved,
work it out before reading the options.`,
    checkpoint: [
      mcq('A SOC confirms an incident and then, while disabling the first account, finds a second one used by the attacker. According to NIST SP 800-61\'s model, what happens?', [
        ['The team returns to detection and analysis to scope the new account', true],
        ['The team finishes containment first and opens a new incident later', false],
        ['The team moves straight to post-incident activity for the first account', false],
      ], 'The lifecycle loops from containment back to analysis when new scope appears, inside the same incident. Opening a separate incident splits the timeline, and post-incident work waits until the whole incident is closed.'),
      mcq('An identity log has "2026-03-09T10:05:21+05:30" and a mail log has "2026-03-09T04:12:05Z". How many minutes apart are the two events?', [
        ['23 minutes', true],
        ['353 minutes', false],
        ['53 minutes', false],
      ], 'Converting the first to UTC gives 04:35:21Z, which is 23 minutes and 16 seconds after 04:12:05Z. 353 minutes comes from ignoring the +05:30 offset and subtracting the clock times as written, and 53 minutes from subtracting five hours but forgetting the extra thirty minutes of the offset.'),
      mcq('A user outside the phishing email\'s recipient list shows a successful sign-in from the attacker IP. What is the right scope status?', [
        ['Compromised; contain the account and review its actions', true],
        ['Not in scope, because the user never received the email', false],
        ['Credentials exposed; a password reset alone is enough', false],
        ['Received only; send an awareness note to the user', false],
      ], 'A successful sign-in by the attacker is compromise however the password was obtained, so full containment and a review of actions follow. The email list is not the scope, and a password reset alone leaves sessions and any persistence in place.'),
      mcq('A colleague asks why the incident\'s SaaS sign-in logs were exported on day one rather than at the review. Which reason is right?', [
        ['The vendor keeps them for a fixed period that can end mid-investigation', true],
        ['Logs exported later carry different SHA-256 hashes from the originals', false],
        ['CERT-In only accepts reports that attach logs exported on the first day', false],
      ], 'SaaS logs live under the vendor\'s retention and can disappear before a slow investigation ends, so they are exported early and hashed. Hashes belong to the exported file, not the export date, and the CERT-In point is invented.'),
      mcq('Which record lets an outside party check that an evidence file has not changed since it was collected?', [
        ['A chain of custody listing each holder, time and the SHA-256 at each step', true],
        ['The analyst\'s written statement that nobody else had access to the file', false],
        ['A screenshot of the file\'s properties taken on the day it was collected', false],
      ], 'Rehashing the file and comparing with the recorded SHA-256 at each transfer is checkable by anyone; the custody entries show who held it. A statement is not checkable, and file properties such as size and dates can stay the same or be changed without detection.'),
      mcq('After a takeover, the team resets the user\'s password only. Which access may the attacker still have?', [
        ['Existing sessions and an inbox rule forwarding mail out', true],
        ['None, since every token is tied to the old password', false],
        ['Only the attacker\'s old IP address, which is blocked', false],
      ], 'Sessions and refresh tokens can outlive a password change, and rules in the mailbox keep forwarding regardless. Tokens are not always tied to the password, and blocking an IP does not remove access from a new one.'),
      mcq('Which backup should a team restore a compromised file server from?', [
        ['The latest one taken before the first attacker activity', true],
        ['The most recent one, so as little data is lost as possible', false],
        ['The one stored nearest the server, so restoring is fastest', false],
      ], 'The timeline gives the first attacker activity, and the last backup before it is clean with the least loss. The most recent backup may contain the attacker\'s changes, and location says nothing about whether a backup is clean.'),
      mcq('In a ransomware response playbook, what should the SOC do with the ransom note found on an isolated server?', [
        ['Preserve a copy as evidence and pass it to the IR lead', true],
        ['Reply to the address in it to ask for a decryption test', false],
        ['Delete it so the staff on site do not see it and panic', false],
        ['Post it on the company chat so that others can spot it', false],
      ], 'The note is evidence and goes into the case record for the IR lead and leadership. Any contact with the attacker is a leadership and legal decision, deleting it destroys evidence, and posting it widely spreads alarm before containment.'),
      mcq('A personal-data breach is confirmed at a lending app in Pune. Under the DPDP Act, who must be informed?', [
        ['The Data Protection Board of India and each affected person', true],
        ['Only the CERT-In helpdesk, which then informs everyone else', false],
        ['Only the affected people, and only if they ask the company', false],
      ], 'The Act requires the Data Fiduciary to inform both the Board and each affected Data Principal, in the manner the Rules set. CERT-In reporting is a separate duty under the IT Act, not a substitute, and the duty does not wait for anyone to ask.'),
      mcq('Which is the best action item from a blameless review of an MFA-fatigue takeover?', [
        ['Turn on number matching for MFA pushes — owner: IAM lead, due 15 May', true],
        ['The affected user to complete phishing awareness training again by Friday', false],
        ['All staff to take more care before approving MFA prompts in future', false],
      ], 'A good action changes a condition of the system and has one owner and a date; number matching stops blind approvals. Retraining one person blames them and leaves the system unchanged, and an instruction to all staff has no owner and no way to tell when it is done.'),
    ],
  },
];
