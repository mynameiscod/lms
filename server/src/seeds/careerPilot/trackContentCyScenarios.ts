/**
 * Career-track placement content: SOC Scenario Rounds (CY_SCENARIO_ROUNDS), Cybersecurity Analyst, batch CY4.
 *
 * The rounds after the question-and-answer interview: an alert talked through aloud, a log-analysis take-home,
 * an incident tabletop played inject by inject, and a vulnerability-and-risk round, then a timed set. Each
 * round unit walks one full round — the interviewer's prompts, a model answer, the follow-ups and how it is
 * scored — and refers back to the track's SIEM, incident response and vulnerability topics rather than
 * re-teaching them. Strictly defensive: attack techniques are named only as categories a detection or a
 * decision needs. Organisations, hosts, people, IP addresses (documentation ranges) and CVE-like ids
 * (CVE-XXXX-21xx) are fictional.
 *
 * The take-home's log bundle (auth.log, access.log, egress.csv for the fictional Varuna Freight) was generated
 * by a seeded Python script and analysed with pandas 3; every count, time and byte figure shown is that
 * script's real output. The vulnerability round's ranking was produced by running the track's tiering rule
 * over the eight findings shown. Windows event fields are written from Microsoft's documentation, not
 * captured. Default skill SIEM_MONITORING; TABLETOP_ROUND measures INCIDENT_RESPONSE and VULN_RISK_ROUND
 * VULNERABILITY_MANAGEMENT; elsewhere ck() names those skills where a question measures them.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_SCENARIO_ROUNDS_BUNDLES: PilotBundle[] = [
  /* ── ALERT_WALKTHROUGH ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SCENARIO_ROUNDS_ALERT_WALKTHROUGH',
    notes: `Almost every SOC loop — an MSSP in Hyderabad hiring L1 analysts for night shifts, a bank's in-house SOC in
Mumbai, a GCC's security operations team in Bengaluru — has a round where the interviewer reads out an alert, or
shares a screenshot of one, and says "Walk me through it." It lasts 15–25 minutes. The interviewer feeds you facts
only when you ask for them, and twists the story halfway through. **The panel scores your method, not whether you
guessed the verdict.** A candidate who reaches "true positive" by luck scores lower than one who reaches "cannot
tell yet — escalating, and here is why" by a clear route.

You learnt the routine in *Alert Triage: the SOC L1 Workflow*. This unit is that routine **spoken aloud, under
questioning**.

## The six moves to say aloud

1. **Read the rule.** What behaviour does it detect, and what is it known to get wrong?
2. **Open the raw event.** Fields, not the alert title. Convert the time to one zone before comparing anything.
3. **Enrich.** Who (account, role, privileged?), what (asset, owner, criticality), where (source and destination),
   history (has this fired here before, and how was it closed?).
4. **Look around.** Both ends of the connection, an hour either side.
5. **Decide.** True positive, benign true positive, false positive, or "cannot tell — escalate".
6. **Write the note,** and say **what would change your mind.**

Say the move before you do it: "Next I'd enrich the account." Silence while you think costs marks; narration earns them.

## A full round

You are interviewing for L1 at Godavari SOC Services, a fictional MSSP in Hyderabad that monitors the fictional
Mahanadi Valley Co-operative Bank.

**Interviewer:** "An alert: *Privileged account — RDP logon from a first-seen workstation*. It fired at 02:16 IST on
Wednesday, host FIN-SRV-02. Go."

**Model answer:** "First the rule. From the name, it fires on a successful Windows logon of type 10 — Remote Desktop —
by an account in a privileged group, from a source that account has not used in, say, 30 days. So it detects
*novelty*, not malice; its known false positives will be admins on new machines. I'd open the raw event."

**Interviewer** shows it:

    EventID 4624   Computer FIN-SRV-02   TimeCreated 2026-10-20T20:43:51Z
    TargetUserName adm.suresh   TargetDomainName MAHANADI   LogonType 10
    IpAddress 10.41.7.31   WorkstationName BR-PC-31   TargetLogonId 0x5A3F21

**Model answer:** "The event is in UTC: 20:43:51 is 02:13:51 IST on the 21st, three minutes before the alert — fine.
Logon type 10 confirms RDP. The source is 10.41.7.31, BR-PC-31 — by the naming, a branch PC. Now enrichment. I want
to know who adm.suresh is and whether he is on call; what FIN-SRV-02 runs and its criticality; whose PC BR-PC-31 is;
and whether this rule has fired on this account before."

**Interviewer:** "FIN-SRV-02 runs the general ledger, criticality 5 of 5. BR-PC-31 is a teller PC at the Sambalpur
branch. Suresh is an infrastructure admin at head office in Bhubaneswar. No earlier alerts."

**Model answer:** "That combination worries me: a head-office admin account, used at 2 a.m., from a branch teller's
PC. An admin working late would normally come in through the VPN pool or the admin jump host. Before deciding I'd
look around. On BR-PC-31: who was logged on interactively, any failed logons (4625) for adm.suresh, any logon with
explicit credentials (4648), and the processes started (4688 or Sysmon event 1). On FIN-SRV-02: what the session
0x5A3F21 did — special privileges assigned (4672), the processes, and when it logged off."

**Interviewer:** "On BR-PC-31, the cashier kiran.p logged on at 19:10 and never logged off. At 02:11 there is a 4648
using adm.suresh, targeting FIN-SRV-02. On FIN-SRV-02 in that session, cmd.exe ran *net group "Domain Admins"
/domain* at 02:15."

**Model answer:** "Then I'd call it a **likely true positive**: a privileged credential used from a machine and a
session that are not Suresh's, followed by a command that lists the domain's most powerful group. In ATT&CK terms,
possible *Valid Accounts* and *Remote Desktop Protocol* with *Permission Groups Discovery*. Priority is P1 — a
critical server and a privileged account. I would escalate now, by the playbook's P1 route, and I would **not**
contact Suresh or kiran.p myself: either could be involved, and containment is for L2 and incident response.
What would change my mind: Suresh confirming, through a channel L2 controls, that he was at Sambalpur on a
recorded visit — and even then, using a teller's logged-in session is a policy breach to report."

## The twist

**Interviewer:** "Rewind. Suppose instead the source is ADM-JMP-01, the admin jump host, and there is an approved
change, CHG-4471: patch FIN-SRV-02 between 01:00 and 04:00, owner Suresh."

**Model answer:** "A ticket is a claim I check, not a verdict. I'd confirm the window covers 02:13, the host list
includes FIN-SRV-02, the owner is adm.suresh, and the session's processes look like patching — the update installer,
a reboot — not discovery commands. If all four match, it's a **benign true positive**: the rule fired correctly on
real, authorised activity. I close it with CHG-4471 as the reason. Then a tuning suggestion: the jump host is where
admins *should* log on from, so exclude source ADM-JMP-01 from this rule — never exclude the account, or the next
misuse of adm.suresh goes silent."

## The note you would write

    P1 | Privileged RDP from first-seen workstation | FIN-SRV-02 (general ledger, crit 5)
    When: 2026-10-21 02:13:51 IST (20:43:51 UTC on the 20th)
    Who: adm.suresh (HQ infra admin)  From: BR-PC-31 (Sambalpur teller PC, user kiran.p logged on since 19:10)
    Found: 4648 explicit-credential logon on BR-PC-31 at 02:11; on FIN-SRV-02, net group "Domain Admins" /domain at 02:15
    Searches: BR-PC-31 and FIN-SRV-02, 01:00-03:30 IST; adm.suresh logons, last 30 days (none from branches)
    Assessment: likely misuse of adm.suresh; possible T1078, T1021.001, T1069
    Not done: no contact with Suresh or kiran.p; no containment (awaiting L2 per playbook)

## The follow-ups

- **"Why not isolate BR-PC-31 yourself?"** — "If the playbook gives L1 that authority for P1, I would. Otherwise it is
  L2's call: isolating too early can tip off whoever holds the credential before every foothold is known."
- **"BR-PC-31 doesn't forward Sysmon. Now what?"** — "I say so in the note as a gap, check whether EDR telemetry
  covers it, and raise branch logging coverage as a finding afterwards."
- **"How long would you spend?"** — "Inside the P1 time-to-escalate. If I can't decide in time, I escalate as
  'cannot tell' with what I have, rather than overrun."
- **"Severity or priority?"** — "The rule's severity might be medium; this alert's priority is P1 because of the
  asset and the account."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Method | 30% | the six moves, in order, each named before it is done |
| Evidence | 25% | raw fields read correctly, time converted, both ends of the connection examined |
| Decision | 20% | a disposition tied to named evidence, with a priority |
| Communication | 15% | a note L2 can act on; facts kept apart from assessment |
| Judgement and limits | 10% | stays within L1 authority; says what would change the decision |

**Ways to lose:** a verdict in the first minute; comparing a UTC event with an IST alert unconverted; reciting event
IDs without saying what they mean; isolating or calling users beyond your authority; "I'd investigate further"
without saying what you would look at.`,
    workedExample: `**Interviewer: "A Suricata alert from a branch PC, BR-PC-12: *possible DNS tunnelling — long random subdomains*.
Forty queries in ten minutes like k3f9q0x2v7....a1b2.example-av-cloud.net. Walk me through it."**

**Answered badly.** "DNS tunnelling is a data-theft technique, so this is serious. I'd isolate the PC straight away and
escalate it as a true positive, then block the domain at the firewall."

Why it fails: a verdict from the alert title. No rule logic, no raw event, no enrichment, no look around; containment
beyond an L1's authority; and a block that, if the domain is legitimate, breaks something across every branch.

**Answered well.** "The rule flags DNS names with long, high-randomness labels, because tunnelling packs data into
subdomains — but so do some legitimate services that encode hashes into lookups, so that's its known false positive.
I'd open the raw DNS events: query names, answers, the resolver, and which process made them, from Sysmon event 22
if the PC sends it, or EDR. Enrichment: who owns example-av-cloud.net — is it in our software inventory? How old is
the domain? Has this rule fired on other branch PCs, and how were they closed?

Say the interviewer answers: the process is the endpoint protection agent, the domain belongs to its vendor, and the
rule fired on 30 branch PCs this week, all with the same agent. Then it's a **benign true positive**: real behaviour,
correctly matched, authorised. I'd close it with that evidence and propose a tuning change scoped to that process
*and* that domain, with an owner and a review date — not an allow-list for BR-PC-12 or for all DNS from branches.

What would change my mind: the same pattern from a process that isn't the agent, a domain registered last week, or
answers carrying unusual record types — then it's escalated."

Why it works: the same six moves, a decision tied to named evidence, and a tuning change narrow enough that a real
tunnel from another process would still fire.`,
    mcqs: [
      mcq('In an alert walkthrough, the interviewer reads out "Privileged RDP logon to FIN-SRV-02 at 02:13 with adm.suresh from BR-PC-31". What is the best first sentence?', [
        ['"I\'d read what the rule detects, then open the raw logon event"', true],
        ['"I\'d isolate BR-PC-31 at once, since a 2 a.m. admin RDP is malicious"', false],
        ['"I\'d call Suresh and ask whether he logged on to the finance server"', false],
        ['"I\'d close it as normal admin work, since adm accounts are for servers"', false],
      ], 'The round scores method: rule, then raw event, then enrichment. Isolating or closing at the first sentence is a verdict from the title, and contacting the account owner can tip off someone misusing the credential.'),
      mcq('Midway through, the interviewer adds: "There is an approved change ticket to patch FIN-SRV-02 tonight, owned by Suresh." What does a strong candidate do with it?', [
        ['Check its window, host list and owner against the event before closing', true],
        ['Close the alert at once, because an approved change ticket proves the activity is legitimate', false],
        ['Ignore the ticket, since attackers like to time activity to changes', false],
        ['Escalate anyway, because change tickets are outside an L1\'s remit', false],
      ], 'A ticket is a claim to verify, not a verdict: the window, hosts, owner and the session\'s processes must all match. Ignoring it wastes L2\'s time, and accepting it unchecked lets misuse hide inside a change window.'),
      mcq('The rule fired correctly on a real RDP logon, and the change ticket, the jump-host source and the patching processes all match. Which disposition fits?', [
        ['Benign true positive, closed with the change number as the reason', true],
        ['False positive, and the rule should be disabled for finance servers', false],
        ['True positive, escalated because a privileged account was involved', false],
        ['Unresolved, left open until Suresh confirms by email in the morning', false],
      ], 'The rule matched exactly what it was written to detect, and the activity was authorised, which makes it a benign true positive. Calling it false would imply the rule is broken, and disabling the rule would blind the SOC to real misuse.'),
    ],
    checkpoint: [
      mcq('An interviewer asks why you searched BR-PC-31\'s own events and not only those on FIN-SRV-02. Which reason is strongest?', [
        ['If adm.suresh was misused, BR-PC-31 shows who was there to use it', true],
        ['Workstations keep logs for longer than servers, so evidence lasts', false],
        ['BR-PC-31 is the RDP destination, so the session\'s processes run there', false],
        ['Policy says every alert needs searches on at least two separate hosts', false],
      ], 'The source host shows who was logged on, any explicit-credential logon and what ran before the connection. BR-PC-31 is the source, not the destination, and log retention has nothing to do with why it matters.'),
      mcq('You find the cashier kiran.p logged on to BR-PC-31, a 4648 using adm.suresh at 02:11, and no change ticket. What should your escalation note contain?', [
        ['Timed facts with sources, "likely misuse of adm.suresh", and what you did not do', true],
        ['A statement that kiran.p is the attacker and that her account must be suspended right now', false],
        ['"Probably a false positive" until Suresh can be called in the morning', false],
        ['Only the alert name and its severity, since L2 will redo the searches', false],
      ], 'A usable note keeps facts, searches and an assessment separate and says what was not done, so L2 can act at once. Naming kiran.p as the attacker goes beyond the evidence, which shows only that her session was the source.'),
      mcq('After your disposition, the interviewer asks "What would make you change your mind?" What is that question scoring?', [
        ['Whether your conclusion rests on evidence you can name and test', true],
        ['Whether you can recite the logon type of every Windows event ID', false],
        ['Whether you will stick to your first answer under panel pressure', false],
        ['Whether you know the ATT&CK identifier for every remote service', false],
      ], 'Naming the facts that would flip the decision shows that it came from evidence and that you know where it is weak. Memorised IDs and holding a position for its own sake are not what this question is checking.'),
    ],
  },

  /* ── LOG_ANALYSIS_TAKEHOME ─────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SCENARIO_ROUNDS_LOG_ANALYSIS_TAKEHOME',
    notes: `Many SOC and incident-response processes in India include a **take-home**: a zip of logs, five or six questions,
and 24–72 hours. A 20-minute debrief follows. Reviewers reject far more submissions for **wrong time handling,
claims the logs do not support, and no clear answer** than for missing a detail. This unit works one take-home end to
end. The bundle is small and synthetic, and every number below came from running the analysis on it.

## The brief

> Varuna Freight (fictional, Chennai) runs a customer tracking portal on vf-portal-01 (Ubuntu, nginx, private address
> 10.20.0.11). On 14 October 2026 at 10:05 IST an engineer found a cron job nobody had created; at 10:20 the firewall
> team blocked the address it was calling. Attached: auth.log (server clock IST), access.log (nginx, UTC) and
> egress.csv (firewall, UTC), covering 13–14 October.
> 1. Was the server accessed without authorisation? How and when? 2. Which accounts were involved?
> 3. What was done on the server? 4. Did data leave? 5. What should Varuna do now?
> Submit a report of at most two pages within 48 hours.

## What the bundle looks like

    auth.log      105 lines    Oct 13 22:47:12 vf-portal-01 sshd[42199]: Accepted password for deploy from 203.0.113.45 port 51544 ssh2
    access.log    183 lines    203.0.113.45 - - [13/Oct/2026:17:20:41 +0000] "GET /static/b.tgz HTTP/1.1" 200 4823117 "-" "curl/8.5.0"
    egress.csv     72 rows     2026-10-13T17:30:02Z,10.20.0.11,203.0.113.77,443,allow,467

Note three traps before writing a line of code: syslog lines carry **no year and no zone**; the web log is **UTC**;
the egress log is **UTC**. Write the zone of each source at the top of your notes.

## The analysis (abridged; pandas)

    IST = 'Asia/Kolkata'
    rx = re.compile(r'^(\\w{3} \\d{2} \\d{2}:\\d{2}:\\d{2}) (\\S+) (\\S+?)(?:\\[\\d+\\])?: (.*)$')
    for line in open(f'{d}/auth.log', encoding='utf-8'):
        ts, host, prog, msg = rx.match(line.rstrip('\\n')).groups()      # syslog: no year, no zone
        rows.append({'ts': pd.to_datetime('2026 ' + ts, format='%Y %b %d %H:%M:%S').tz_localize(IST),
                     'prog': prog, 'msg': msg})
    acc['ts'] = pd.to_datetime(acc.ts, format='%d/%b/%Y:%H:%M:%S %z').dt.tz_convert(IST)   # nginx: +0000
    eg['ts'] = eg.ts_utc.dt.tz_convert(IST)            # read_csv(parse_dates=['ts_utc']) gives UTC
    by_ip = fails.groupby('fail_ip').agg(attempts=('ts', 'size'), users=('fail_user', 'nunique'),
                                         first=('ts', 'min'), last=('ts', 'max'))

Real output:

    Failed SSH passwords by source (top 2):
           fail_ip  attempts  users    first     last
      203.0.113.45        84      6 13 22:10 13 22:45
    198.51.100.103         1      1 13 21:20 13 21:20
    scanner IPs (198.51.100.x): 13 attempts from 13 addresses, all for root
    spray usernames: ['admin', 'deploy', 'git', 'oracle', 'test', 'ubuntu']

    Successful logins:
      13 Oct 09:31:04 IST Accepted publickey for ravi from 192.0.2.10
      13 Oct 22:47:12 IST Accepted password for deploy from 203.0.113.45
      14 Oct 09:42:50 IST Accepted publickey for ravi from 192.0.2.10

    Timeline (IST):
      13 Oct 22:10:03  auth   84 failed SSH passwords from 203.0.113.45 begin (6 usernames)
      13 Oct 22:45:30  auth   last failed password from 203.0.113.45
      13 Oct 22:47:12  auth   Accepted password for deploy from 203.0.113.45 port 51544 ssh2
      13 Oct 22:47:13  auth   New session 431 of user deploy.
      13 Oct 22:47:30  web    203.0.113.45 GET /static/b.tgz -> 404, 162 bytes, UA curl/8.5.0
      13 Oct 22:48:40  auth   sudo: deploy -> root: tar czf /var/www/portal/static/b.tgz /var/www/portal/config /home/ravi/.ssh
      13 Oct 22:50:41  web    203.0.113.45 GET /static/b.tgz -> 200, 4,823,117 bytes, UA curl/8.5.0
      13 Oct 22:53:02  auth   sudo: deploy -> root: crontab -e
      13 Oct 22:53:30  auth   sudo: deploy -> root: rm /var/www/portal/static/b.tgz
      13 Oct 22:54:05  auth   Disconnected from user deploy 203.0.113.45 port 51544
      13 Oct 22:54:10  web    203.0.113.45 GET /static/b.tgz -> 404, 162 bytes, UA curl/8.5.0
      13 Oct 23:00:00  egress first allowed connection 10.20.0.11 -> 203.0.113.77:443
      14 Oct 10:00:00  egress last allowed connection (67 in all)
      14 Oct 10:20:01  egress first denied connection (3 denied by end of log)

    beacon: 67 allowed, median gap 600 s, min 598 s, max 602 s, bytes out 29,296
    naive mistake: reading access.log as IST puts the 200 download at 17:20:41 - five and a half hours BEFORE the login

Of the 84 failures, 14 were for deploy, the only one of the six names that exists on the server (the others are
logged as "invalid user"). The 13 root failures from 13 different 198.51.100.x addresses are ordinary internet
noise and belong in one sentence, not a section.

## The model report

    VARUNA FREIGHT - vf-portal-01 - log review, 13-14 Oct 2026 (all times IST)

    Answer. Yes. An outside party logged in over SSH as "deploy" with a password at 22:47:12 on 13 Oct, after
    about 35 minutes of password guessing; used sudo to archive the portal's configuration and ravi's SSH directory,
    downloaded the archive (4.8 MB) through the website, set up a cron job, and removed the archive. The server
    then contacted 203.0.113.77 every 10 minutes until the firewall block at 10:20 on 14 Oct.

    Evidence. auth.log lines for 203.0.113.45 (84 failures 22:10-22:45 across 6 usernames; accepted password
    22:47:12; sudo tar 22:48:40, crontab -e 22:53:02, rm 22:53:30). access.log: 200 for /static/b.tgz,
    4,823,117 bytes, 17:20:41 UTC = 22:50:41 IST. egress.csv: 67 allowed connections to 203.0.113.77:443 at
    600-second intervals from 23:00, 29,296 bytes out in all; denied from 10:20.

    Accounts. deploy (password login, sudo to root). ravi's account was not used, but his SSH keys were in
    the archive. Root and the other five names failed.

    Data. Left: the archive - /var/www/portal/config (likely holds application secrets) and /home/ravi/.ssh.
    Not evidenced: database or customer-data theft. The beacon's content is unknown (TLS); its small volume
    fits a check-in, not bulk transfer.

    Do now. 1 Rotate every secret in /var/www/portal/config and revoke ravi's keys wherever they are trusted.
    2 Disable password authentication for SSH; review why deploy had a guessable password and sudo to tar.
    3 Preserve the server (disk and memory) before cleaning; then rebuild rather than repair.
    4 Search all servers and firewalls for 203.0.113.45, 203.0.113.77 and deploy password logins.
    5 Detections: an accepted SSH password after many failures from one address; new crontab via sudo.

    Limits. The cron entry's content is not in these logs; archive contents are inferred from the tar
    command; no logs before 13 Oct were supplied, so earlier access cannot be ruled out.

## The debrief round

**"How do you know the download came after the login?"** — "The web log is UTC; 17:20:41 UTC is 22:50:41 IST,
two minutes after the tar command. Read as IST, it would sit before the login and make no sense."
**"Why rotate ravi's keys when his account wasn't used?"** — "The tar command included /home/ravi/.ssh, and a
4.8 MB archive left. If a private key was in it, anyone can now log on as ravi wherever that key is trusted."
**"What single fix matters most?"** — "Rotating the leaked secrets, because the attacker already holds them; closing
password SSH stops the next guess but does nothing about what was taken."
**"What would you ask for next?"** — "The crontab itself, the server's other logs from before 13 Oct, and the
same searches on Varuna's other servers."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Answer first | 15% | the first paragraph answers the brief's questions |
| Time handling | 20% | every source's zone stated, one zone throughout, the trap caught |
| Evidence | 25% | each claim cites a log, line and time; noise separated from signal |
| Accuracy of claims | 20% | nothing beyond the logs; "not evidenced" where the data is silent |
| Recommendations | 15% | ordered by urgency, tied to findings, evidence preserved first |
| Limits | 5% | gaps named |

If the brief allows AI assistants, say in the report what you used one for and that you checked every line it
gave you against the logs. Never upload a real employer's logs to a public tool; this bundle is synthetic, so
practising with it is fine.`,
    workedExample: `**The brief's question 4: "Did data leave the server?"**

**Answered badly.** "Yes. The attacker exfiltrated the customer database and has been sending data out every ten
minutes over HTTPS since 23:00 (67 connections). Customer data should be considered breached."

Why it fails: two claims the logs do not support. No log line shows a database being read or copied; the tar command
names the configuration directory and one home directory. And the beacon sent 29,296 bytes in 67 connections —
about 437 bytes each — which is the size of a check-in, not a database. A reviewer who knows the bundle stops trusting
the rest of the report, and in a real incident this sentence could trigger a customer-breach notification on no
evidence.

**Answered well.** "Yes, at least one archive. At 22:48:40 IST deploy ran, as root, tar of /var/www/portal/config and
/home/ravi/.ssh into the web root; at 22:50:41 IST (17:20:41 UTC in access.log) 203.0.113.45 downloaded
/static/b.tgz, 4,823,117 bytes, with HTTP 200; at 22:53:30 the file was deleted. So the portal's configuration —
which on such servers usually holds database and API credentials — and ravi's SSH files left the server.

Separately, from 23:00 the server connected to 203.0.113.77:443 every 600 seconds, 67 times, 29,296 bytes out in all.
The content is not visible; the regular interval and the small size fit a scheduled check-in, probably from the cron
job created at 22:53, rather than bulk transfer. Database or customer-record theft is **not evidenced** in these logs —
but the leaked credentials make it possible later, which is why rotating them is the first recommendation."

Why it works: each claim has a source, a time and a size; inference is labelled as inference; and the gap between
what happened and what could happen is turned into an action rather than a scare.`,
    mcqs: [
      mcq('In the Varuna bundle, access.log shows the 200 download of b.tgz at 17:20:41 +0000 and auth.log shows the deploy login at 22:47:12. Which reading is right?', [
        ['The download was at 22:50:41 IST, about three and a half minutes after the login', true],
        ['The download came five and a half hours before the login, so the web server was hit first', false],
        ['The two logs cannot be compared at all, because syslog lines carry no year', false],
        ['The download was at 17:20 IST, as nginx always writes times in local time', false],
      ], 'The +0000 offset says UTC, and 17:20:41 UTC is 22:50:41 IST, two minutes after the tar command. The missing year in syslog is solved by the brief, and nginx writes whatever zone the server is set to, shown in the offset.'),
      mcq('Why does the model report say ravi\'s SSH keys must be revoked, although ravi\'s account was never used by the intruder?', [
        ['The archive that was downloaded included /home/ravi/.ssh', true],
        ['ravi logged on from the office on both days of the window', false],
        ['Every key on a breached host is rotated whatever the evidence', false],
        ['The password guessing tried ravi as one of its six usernames', false],
      ], 'The sudo tar line names /home/ravi/.ssh, and the archive left in a 4.8 MB download. ravi\'s office logons used his key normally, and ravi was not one of the six guessed names.'),
      mcq('The egress log shows 67 allowed connections to 203.0.113.77:443 at 600-second intervals, 29,296 bytes out in all. What should the report claim?', [
        ['A scheduled check-in, likely from the new cron job; content unknown', true],
        ['Bulk theft of the portal\'s database over HTTPS throughout the night', false],
        ['Routine update traffic, since package mirrors also use port 443', false],
        ['Nothing at all, since so few bytes cannot matter to the inquiry', false],
      ], 'About 437 bytes per connection at a fixed ten-minute interval, starting minutes after a crontab edit, fits a check-in. It is far too small for a database. It still matters, because it shows the intruder kept a way back in until the block.'),
    ],
    checkpoint: [
      mcq('The brief asks "When was the server first accessed without authorisation?" Which answer do the Varuna logs best support?', [
        ['13 Oct 22:47:12 IST, the accepted password for deploy from 203.0.113.45', true],
        ['13 Oct 22:10:03 IST, when the failed SSH passwords from 203.0.113.45 first began', false],
        ['13 Oct 17:17:30 IST, the first request for b.tgz in the web server log', false],
        ['13 Oct 23:00:00 IST, when the first check-in left through the firewall', false],
      ], 'Failed passwords are attempts, not access. The web request time is UTC (22:47:30 IST), and the check-in came later. The first successful logon is the first access the logs show, with the limit that earlier logs were not supplied.'),
      ck('INCIDENT_RESPONSE', 'Which recommendation belongs first in the Varuna report\'s "do now" list?', [
        ['Rotate the leaked secrets and keys, and turn off SSH password logins', true],
        ['Delete the cron job and the deploy account, then reboot the server to clear it', false],
        ['Write to the hosting provider of 203.0.113.45 asking who rented it', false],
        ['Publish the indicators on a public forum so others can block them', false],
      ], 'The intruder already holds the archived credentials, so rotating them closes the most dangerous door. Deleting and rebooting first destroys evidence, and the other two do nothing for Varuna in the next hour.'),
      mcq('A candidate\'s timeline says "22:50 — the attacker stole the customer database." What is wrong with it?', [
        ['The logs show configuration and SSH files archived, not a database', true],
        ['Nothing, since anyone who reaches root will copy every database', false],
        ['It should say "exfiltrated" rather than "stole" to sound precise', false],
        ['Timelines must hold only raw log lines and never any conclusion', false],
      ], 'The tar command names /var/www/portal/config and /home/ravi/.ssh. Claiming database theft goes beyond the evidence and can trigger needless breach notifications; the right wording is "not evidenced", with the risk the leaked credentials create.'),
    ],
  },

  /* ── TABLETOP_ROUND ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SCENARIO_ROUNDS_TABLETOP_ROUND',
    notes: `In the tabletop round the interviewer plays an incident forward in **injects** — short updates, each followed
by "What do you do now?" It runs 25–40 minutes and is common for L2, incident-response and bank SOC roles; MSSPs
use a shorter version for L1. There is no single correct path. The panel scores **decisions with reasons, evidence
kept intact, scope widened when the facts demand it, clear communication, and knowing whose decision it is.** You
learnt the lifecycle and the playbooks in *Incident Response*; here you use them at the speed of a conversation.

## A method for every inject

For each inject, answer in the same four parts, aloud:

1. **What I now know** — one sentence; what changed.
2. **What I do** — the action, in order, and who does it.
3. **Why** — the risk it reduces, and what it costs.
4. **Who I tell** — and what decision I need from them.

## The full round

The scenario: Sahyadri Care Hospitals (fictional), three hospitals in Pune with an in-house IT team and an MSSP for
night monitoring. You are the on-shift L2 analyst.

**Inject 1 — Monday 07:40.** "The helpdesk says radiology staff cannot open files on the shared drive on FS-02.
Files have a new extension, and a text note sits in each folder."

**Model answer.** "What I know: files on FS-02 are being made unreadable and a note is left — the pattern of
ransomware, *Data Encrypted for Impact*. What I do: find *where it is coming from* before touching FS-02. EDR and the
file server's SMB session logs show which machine and account are writing the renamed files. Why: if I shut down FS-02
blind, the source keeps running and reaches other shares. Who I tell: I open a major incident by the playbook and page
the IR lead and the IT head now — this touches clinical systems."

**Inject 2 — 07:55.** "EDR shows the renames come over SMB from RAD-WS-14, a radiology workstation, logged in as the
user r.patil."

**Model answer.** "I network-isolate RAD-WS-14 through EDR, **leaving it powered on** — memory may hold what we need,
and isolation stops the writes. I disable r.patil's account and end its sessions. I ask IT to make the radiology share
read-only. Why: each stops the damage at a different layer, and none destroys evidence. I tell the IR lead: 'Source
found and isolated; scope not yet known.'"

**Inject 3 — 08:30.** "The SIEM shows r.patil logged on to nine other workstations overnight, and at 02:14 the account
bkp_admin signed in to the backup server's console from RAD-WS-14."

**Model answer.** "Scope has widened: this is not one infected PC but an intruder with a privileged backup
credential. Two priorities. **Protect the backups** — recovery depends on them — so we check whether offline or
immutable copies exist and are untouched, and we disconnect the backup server's management access. **Contain the
identity side**: the nine workstations go into isolation by EDR, and privileged credentials — bkp_admin first, then
domain admin accounts — are reset in one planned sweep, *from a clean admin device*, not from anything that may be
compromised. Why one sweep: resetting accounts one at a time warns the intruder and lets them use the next one. I tell
the IR lead the incident is now severity 1, and I ask the IT head to start the hospitals' downtime procedures for
radiology — paper requests and the vendor's standalone viewing — because patient care must not wait on us."

**Inject 4 — 09:15.** "The hospital director joins the call. 'Should we pay? And should we just switch off the whole
network?'"

**Model answer.** "Payment is a leadership decision with legal counsel and law enforcement, not mine. What I give them
is facts: what is affected, whether clean backups exist, and how long a restore takes. On switching everything off: in
a hospital that stops admissions, pharmacy and lab systems for every patient. Isolation of the affected segment and
the accounts is already done; I'd recommend keeping clinical systems that show no signs running, under watch, and
switching off more only if the evidence shows spread."

**Inject 5 — 10:30.** "An email arrives claiming the group took patient records, with a sample of five attached."

**Model answer.** "I treat it as a possible personal-data breach, not a bluff and not yet a fact. I check the sample
against our own records — are these real patients, from which system? — and search egress and firewall logs from FS-02
and the nine workstations for large outbound transfers in the last week. No one replies to the sender; any contact is
leadership's decision with legal and police. I tell the IR lead and legal at once, because the reporting clocks may now
be running: CERT-In's 2022 directions require listed incident types to be reported within **six hours of noticing**,
and the DPDP Act requires a personal-data breach to be reported to the Data Protection Board and the affected people.
I'd say that in outline and ask legal to confirm the current rules."

**Inject 6 — Day 3.** "Backups are clean. What does recovery look like, and how does this end?"

**Model answer.** "Rebuild FS-02 and the ten workstations from known-good images, restore data from the backups taken
before the first malicious logon — not just before the encryption — and scan restored files. Bring systems back in
order of clinical priority. Watch closely for two to four weeks for the intruder's indicators and the reset accounts.
Close with a blameless post-incident review: how the credential was obtained, why bkp_admin could log on from a
radiology PC, and new detections — for example, a privileged account logging on from a clinical workstation."

## The follow-ups

- **"Why not power off RAD-WS-14?"** — "Isolation stops the harm and keeps memory; power-off loses it."
- **"The IT head wants RAD-WS-14 reimaged now."** — "Agreed once memory and a disk image are captured and hashed —
  minutes, not days. Then rebuild."
- **"Who leads?"** — "The IR lead runs the incident; I run the analysis and give status at agreed times."
- **"How often do you update leadership?"** — "At fixed intervals — every 30–60 minutes in the first hours: what we
  know, what we don't, what we're doing, what we need decided."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Decisions | 30% | an action at every inject, in a sensible order, with the risk it reduces |
| Evidence | 20% | isolate rather than power off; capture before rebuild; nothing destroyed |
| Scope | 20% | widens scope when an inject demands it; protects backups and identities |
| Communication | 20% | who is told, what decision is needed, regular updates, legal and reporting raised |
| Role and limits | 10% | does not decide payment, contact the attacker or speak to the press |`,
    workedExample: `**Inject 3: "r.patil logged on to nine other workstations overnight, and at 02:14 bkp_admin signed in to the
backup console from RAD-WS-14."**

**Answered badly.** "OK, so I'd isolate the nine workstations too, and reset r.patil's password. Then we restore
FS-02 from last night's backup and get radiology working again."

Why it fails: it treats a new fact as more of the same. The backup console login means the intruder held a privileged
credential and touched the very system recovery depends on — restoring "last night's backup" may restore files the
intruder already touched, or the backups may be gone. Resetting only r.patil leaves bkp_admin and any domain admin
credential in their hands. And nobody is told the incident has grown.

**Answered well.** "What I now know: this is a hands-on intruder with a privileged backup credential, not one infected
PC. What I do, in order: one, protect recovery — confirm with the backup team whether offline or immutable copies
exist and are untouched, and cut the backup server's management access to a clean admin network only. Two, isolate the
nine workstations through EDR. Three, plan one sweep of credential resets — bkp_admin, the domain admin accounts and
service accounts that backup server uses — done from a clean device, with the timing agreed with the IR lead so the
intruder cannot simply switch accounts. Why: backups are our way out; one sweep denies the intruder a fallback
credential. Who I tell: the IR lead — I'd raise severity to 1 — and the IT head, with a request to start radiology's
downtime procedures now, since restoring will take hours, not minutes. I'd also note for later: why can a backup
admin account sign in from a radiology PC at all?"

Why it works: the new fact changes the priorities, the order is justified, the backups and identities — the two
things a ransomware recovery depends on — are protected first, and the clinical impact is handled as part of the
response, not after it.`,
    mcqs: [
      mcq('Inject 2 at Sahyadri Care: EDR shows RAD-WS-14 renaming files on FS-02 over SMB. Which first containment step fits best?', [
        ['Isolate RAD-WS-14 from the network through EDR, leaving it powered on', true],
        ['Power off RAD-WS-14 and FS-02 so that the encryption stops straight away', false],
        ['Reimage RAD-WS-14 from the golden image before it does more damage', false],
        ['Shut down the whole hospital network until the scope is understood', false],
      ], 'Isolation stops the writes and keeps memory and disk for analysis. Power-off and reimaging destroy evidence, and switching off the whole network halts clinical systems for every patient when the source is already known.'),
      mcq('At inject 4 the hospital director asks whether to pay the ransom. What is the analyst\'s part in that answer?', [
        ['Give the facts on scope, backups and restore time; leadership decides', true],
        ['Recommend paying, since patient care must resume as fast as possible', false],
        ['Refuse to discuss it, since payment questions are not security work', false],
        ['Contact the group to learn the price before leadership has to decide', false],
      ], 'Payment is a leadership decision with legal counsel and law enforcement; the analyst\'s facts on what is affected and whether clean backups exist are what that decision needs. Contacting the group is never the analyst\'s call.'),
      mcq('The extortion email at inject 5 attaches a sample of five patient records. What is the correct next step?', [
        ['Check the sample against your records and the egress logs; tell legal', true],
        ['Treat it as a bluff, since encrypting files was the intruder\'s only goal', false],
        ['Reply asking the sender to prove how much data they really hold', false],
        ['Announce publicly that no data was taken, to reassure the patients', false],
      ], 'The claim is neither fact nor bluff until checked. Verifying the sample and searching for large outbound transfers tests it, and legal must know because reporting clocks may be running. Replying or announcing are leadership decisions and premature.'),
    ],
    checkpoint: [
      mcq('Inject 3 shows bkp_admin signed in to the backup console at 02:14 from RAD-WS-14. Why does this move backups to the top of the list?', [
        ['Recovery depends on the backups, so their integrity must be confirmed first', true],
        ['It proves the intruder got in through a flaw in the backup software itself', false],
        ['It means FS-02 can now be safely restored from the most recent backup', false],
        ['Backup consoles keep no logs, so the scope can no longer be measured', false],
      ], 'An intruder with backup-admin access can delete or tamper with the copies a ransomware recovery needs. It says nothing about how they got in, and it makes the latest backup less trustworthy, not more.'),
      mcq('In the tabletop, how should the privileged credentials be reset?', [
        ['In one planned sweep, from a clean admin device, timed with the IR lead', true],
        ['One at a time from RAD-WS-14, starting with the account seen first', false],
        ['Only after the incident is closed, to avoid disturbing the hospital', false],
        ['Not at all, since disabling r.patil alone removes the intruder\'s access', false],
      ], 'Resetting accounts one by one warns the intruder and leaves them another credential to use, and typing new passwords on a compromised machine hands them over. Waiting or resetting only r.patil leaves bkp_admin in their hands.'),
      mcq('Which statement about reporting the Sahyadri incident in India is accurate in outline?', [
        ['CERT-In expects listed incidents reported within six hours of noticing', true],
        ['Reporting is optional for hospitals, as they are not regulated by RBI', false],
        ['Only the police need to be told, and only once recovery is finished', false],
        ['CERT-In must be told within thirty days, and only once the root cause is known', false],
      ], 'CERT-In\'s 2022 directions set a six-hour window from noticing for listed incident types, across sectors; the DPDP Act adds breach reporting to the Data Protection Board. RBI rules apply to banks, not to whether a hospital must report.'),
    ],
  },

  /* ── VULN_RISK_ROUND ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SCENARIO_ROUNDS_VULN_RISK_ROUND',
    notes: `The vulnerability and risk round gives you a short list of findings and three tasks: **rank them, explain the
ranking to a manager who is not technical, and handle the one that cannot be patched.** It appears in SOC loops at
banks, NBFCs and GCCs, and in vulnerability-management and GRC-leaning analyst roles; 20–30 minutes. You learnt the
tools in *Prioritising with CVSS, EPSS and Known-Exploited Lists* and *Patching, Compensating Controls and
Verification*. The round tests whether you can **use** them under questioning — and whether you can stop talking in
scores when a manager is listening.

## The prompt

**Interviewer:** "You're the analyst at Palar Housing Finance (fictional), a Chennai lender. This week's scan has
eight findings. The EPSS and KEV values are as of today. Rank them, and tell me why."

    fid  host         vuln            cvss  epss   kev    criticality  internet
    F1   pf-vpn-01    CVE-XXXX-2101   9.8   0.710  True   critical     True
    F2   pf-web-01    CVE-XXXX-2102   9.8   0.030  False  high         True
    F3   pf-hr-01     CVE-XXXX-2103   7.5   0.420  True   medium       False
    F4   pf-db-01     CVE-XXXX-2104   8.8   0.010  False  critical     False
    F5   pf-uat-01    CVE-XXXX-2102   9.8   0.030  False  low          False
    F6   pf-chq-scan  CVE-XXXX-2105   8.1   0.550  False  medium       False
    F7   pf-dev-07    CVE-XXXX-2106   6.5   0.002  False  low          False
    F8   pf-mail-01   TLS1.0          5.3   0.000  False  high         True

## The model answer, part 1: rank

"I won't sort by CVSS alone — it measures how bad the flaw is in general, not the risk to us. I'd combine three
things: **is it being exploited** (a KEV listing is evidence; EPSS is a forecast), **is the asset exposed or
critical**, and **how severe** it is. Using the transparent rule from the course:"

    exploited = kev or epss >= 0.5;   exposed = internet or criticality == 'critical'
    P1: exploited and exposed
    P2: exploited, or (cvss >= 9 and exposed), or (epss >= 0.1 and criticality in critical/high)
    P3: cvss >= 7, or (cvss >= 4 and internet)        P4: the rest

Run over the eight findings (real output, condensed to two lines):

    By CVSS alone:  F1 9.8, F2 9.8, F5 9.8, F4 8.8, F6 8.1, F3 7.5, F7 6.5, F8 5.3
    By risk tier:   P1: F1   P2: F2, F6, F3   P3: F5, F4, F8   P4: F7

"Three moves matter. **F1 is first by any method** — exploited, internet-facing, the VPN everyone uses. **F5, the UAT
server, falls** from joint first to P3: same 9.8 flaw as the portal, but internal, low criticality, no known use.
**F3 and F6 rise**: the HR intranet's flaw is on the KEV list and the cheque-scanner's has an EPSS of 0.55. Inside P2 I'd
order F3 first, because KEV is evidence of exploitation and EPSS is a prediction; then F2, internet-facing; then F6.
And I'd say aloud that F4, the core loan database, is P3 *only* because nothing exploits its flaw today — I'd re-check
its EPSS and KEV status each week."

**Follow-up:** "Your rule says F2 is P2. The portal is our main customer channel. Shouldn't it be P1?"
**Model answer:** "The rule gives a starting point; I can raise a finding with a reason. If the flaw is reachable
without login on the portal, I'd push it to P1 and write down why. What I would not do is quietly lower anything."

## The model answer, part 2: explain it to a manager

**Interviewer, now playing the head of IT:** "I have budget for one emergency change this week. Why the VPN and not the
portal? Both say 9.8."

**Model answer:** "Because attackers are using the VPN flaw right now, and our VPN faces the internet — it is the front
door for every employee working remotely. The portal's flaw is just as severe on paper, but there is no sign anyone is
using it yet, so it gets a fixed date in the next window. If we leave the VPN and it is used, the likely outcome is an
intruder inside the network with an employee's access — the start of most ransomware incidents. The fix is a vendor
update and one reboot tonight, about 20 minutes of VPN downtime at 23:00."

Notice what is missing: no vectors, no decimals. **Likelihood, impact in business terms, cost of the fix, and the
date.** Then: "May I schedule it for tonight?" — always end on the decision you need.

## The model answer, part 3: the one you cannot patch

**Interviewer:** "F6 — the cheque scanners in our 40 branches. The vendor says the operating system is end-of-life and
there will be no patch. Now what?"

**Model answer:** "Reduce the risk another way, and write it down. One, **restrict reach**: the scanners need to talk
only to the cheque-clearing server, so a branch firewall rule blocks everything else to and from them. Two, **remove
what isn't needed**: disable the service the flaw is in if the scanning software doesn't use it. Three, **detect**: a
rule for any new outbound connection or new process on those devices, since we can't fix the flaw itself. Four, an
**exception** with the compensating controls named, a risk owner with authority to accept it — the head of operations,
not me — and an expiry date tied to replacing the scanners, with the replacement in next year's budget. Then I verify:
re-scan to confirm the rule really blocks the port, and track the exception like a finding."

**Follow-up:** "Why not just take them off the scan list? They'll never be fixed." — "Then the risk disappears from the
report but not from the branches. Coverage of every asset is the point of the programme."

**Follow-up:** "The portal fix needs a framework upgrade that takes three weeks to test. The SLA for P2 is 15 days." —
"A virtual patch now — a WAF rule matching the flaw — plus extra monitoring, an exception to cover the gap until the
tested upgrade, then a re-scan to close. Not a rushed upgrade straight to production."

## How it is scored

| Area | Weight | Full marks when |
|---|---|---|
| Ranking | 30% | exploitation, exposure and criticality combined; KEV above EPSS; changes justified |
| Business explanation | 25% | likelihood, business impact, cost of the fix and a decision asked for — no jargon |
| Unpatchable finding | 25% | reach restricted, feature removed, detection, an exception with owner and expiry |
| Verification | 10% | re-scan closes a finding; exceptions tracked |
| Judgement | 10% | knows the rule is a starting point; never hides a finding |`,
    workedExample: `**Interviewer, as the head of IT: "Just tell me how many criticals we have."**

**Answered badly.** "We have three criticals — F1, F2 and F5 are all 9.8 — and two highs. The scanner rates them
critical, so policy says they all need fixing within seven days."

Why it fails: it reports the scanner's view, which ranks a UAT box with test data alongside the internet-facing VPN.
It sets three emergency changes where one is urgent, hides the HR intranet flaw that is actually being exploited, and
gives the manager a number with no decision attached.

**Answered well.** "By scanner score we have three 'criticals', but that count misleads, so let me give you the one
that matters. One finding needs action this week: the VPN, which attackers are using right now and which faces the
internet — I'm asking for an emergency change tonight. Three more are due within 15 days: the HR intranet, which is on
the known-exploited list; the customer portal; and the branch cheque scanners, which can't be patched, so I'm
proposing firewall rules and an exception for your sign-off. The remaining four are routine, including the UAT server
— same flaw as the portal, but internal and holding test data only. The number I'd like you to track is how many P1
and P2 items are open past their due date: today that's zero, and I want to keep it there."

Why it works: it answers the question, corrects the misleading metric without lecturing, puts every finding in
business terms with a date, and ends with the two decisions the manager must make and the one number worth watching.`,
    mcqs: [
      mcq('Sorted by CVSS alone, Palar\'s UAT server (9.8, low criticality, internal, EPSS 0.03) ranks above the cheque scanners (8.1, EPSS 0.55). What does the risk rule do instead?', [
        ['It places the scanners in P2 and the UAT server in P3', true],
        ['It keeps the UAT server first, as 9.8 is critical anywhere', false],
        ['It places both in P1, as each scores above 8.0 on CVSS', false],
        ['It drops the UAT server, as test systems are out of scope', false],
      ], 'An EPSS of 0.55 counts as likely exploitation, which lifts the scanners to P2; the UAT server is internal, low criticality and not exploited, so it falls to P3. Test systems stay in scope, since they are still assets an intruder can use.'),
      mcq('The head of IT asks: "Why the VPN and not the portal? Both say 9.8." Which answer speaks the manager\'s language?', [
        ['"Attackers are using the VPN flaw now, and the VPN faces the internet"', true],
        ['"The VPN\'s CVSS vector has a lower attack complexity than the portal\'s"', false],
        ['"The VPN\'s EPSS percentile is higher, which lifts its base score"', false],
        ['"Network devices always come before applications in a patch queue"', false],
      ], 'Likelihood and exposure in plain words explain the choice. Vector details are jargon to a manager, EPSS does not change a CVSS base score, and no rule puts network devices first by type.'),
      mcq('Palar\'s cheque scanners run an end-of-life OS and no patch is coming. What does a strong answer offer?', [
        ['Restricted reach, detection, and an exception with an owner and expiry', true],
        ['Accepting the risk for good, since nothing can be done without a patch', false],
        ['Removing the scanners from scan scope so they stop raising findings', false],
        ['An unofficial fix from a community forum, applied to every branch', false],
      ], 'Compensating controls reduce the risk the patch cannot, and an exception with a named owner and an expiry keeps it visible until replacement. Dropping scan coverage hides the risk; an unofficial fix adds an untrusted change to forty branches.'),
    ],
    checkpoint: [
      mcq('Inside P2 are F2 (portal, 9.8, EPSS 0.03), F6 (scanners, EPSS 0.55) and F3 (HR intranet, on the KEV list). Which goes first, and why?', [
        ['F3, because a KEV listing is evidence and EPSS is only a forecast', true],
        ['F2, because its CVSS score is the highest of the three in the tier', false],
        ['F6, because its EPSS value is the highest of the three in the tier', false],
        ['Any order, since findings in one tier share the same due date anyway', false],
      ], 'KEV records observed exploitation in the wild, which outranks a probability forecast and a severity score. A shared due date does not make order irrelevant: work is done in sequence, and the riskiest should be done first.'),
      mcq('The head of IT says "Just give me the number of criticals." What should you report instead?', [
        ['P1 and P2 findings open past their due date, and what each exposes', true],
        ['The count of findings at CVSS 9.0 or above, as the scanner shows it', false],
        ['The total number of findings, since each one is a possible breach', false],
        ['The average CVSS across all hosts, to show the overall trend line', false],
      ], 'A count of high scores mixes a UAT box with an exploited VPN. Overdue high-risk findings measure whether the programme is keeping up and lead to decisions; totals and averages hide the few that matter.'),
      mcq('The portal fix (F2) needs a framework upgrade that will take three weeks to test, beyond the 15-day P2 SLA. Which plan fits the model answer?', [
        ['A WAF rule for the flaw now, an exception, the tested upgrade, a re-scan', true],
        ['Push the upgrade to production tonight and test it in UAT afterwards', false],
        ['Mark the finding a false positive until the upgrade is ready to deploy', false],
        ['Take the customer portal offline for three weeks until the upgrade', false],
      ], 'A virtual patch reduces risk during testing, the exception records the gap honestly, and the re-scan closes it. An untested upgrade risks an outage that is rolled back; a false-positive label is dishonest; three weeks offline costs the business far more.'),
    ],
  },

  /* ── TIMED_SCENARIOS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SCENARIO_ROUNDS_TIMED_SCENARIOS',
    notes: `Three scenario questions, **15 minutes each**, run like the real round. Use a timer and ask a friend to read the
prompt and answer your questions with the facts given here, and nothing more. Speak your method first, then your
actions, then your decision and who you tell. Compare with the model answer and score yourself on the rubric at the
end. All organisations, hosts and addresses are fictional.

## Scenario A — "A new local administrator on a branch server" (alert walkthrough)

**Prompt.** "At 01:50 IST, BR-SRV-03 (a branch server at a fictional co-operative bank) logged event 4720, a user
account created — *helpdesk1* — then 4732, *helpdesk1* added to the local Administrators group. Walk me through it."

**Facts to give when asked.** Both events name the subject account svc_deploy (a service account). The process was
a provisioning script run by the configuration-management agent. A change ticket, CHG-5120, covers "create break-glass
local admin on branch servers, 01:00–03:00", and the same pair of events appears on 22 other branch servers within
ten minutes.

**Model answer.**
1. **Rule:** account creation plus admin-group membership — a common persistence pattern (*Create Account*), with
   provisioning as its known false positive.
2. **Raw event:** who did it — the subject account, the process and its parent. A new admin created by a person at a
   console reads very differently from one created by the management agent.
3. **Enrich:** svc_deploy is the config-management service account; BR-SRV-03 is a branch server; CHG-5120 matches the
   window, the action and the scope.
4. **Look around:** the same events on 22 other servers in ten minutes, all from the agent — consistent with a rollout,
   not a hands-on intruder, who works host by host.
5. **Decide:** benign true positive, closed with CHG-5120. **But** raise two points: a shared local admin on every
   branch server is itself a risk — is its password unique per server (a local admin password solution) and vaulted?
   And the rule should be tuned for svc_deploy *and* that script within change windows, with a review date — not for
   svc_deploy everywhere.
6. **What would change my mind:** a creator other than the agent, a server outside the ticket's scope, or a later
   logon by helpdesk1 from somewhere unexpected.

## Scenario B — "An actively exploited flaw in our VPN" (vulnerability)

**Prompt.** "A CERT-In advisory reports active exploitation of CVE-XXXX-2190 in the VPN gateways you run. You have three
appliances; two run an affected version. The vendor fix needs a reboot. Your manager wants a plan in 30 minutes."

**Model answer.**
1. **Confirm exposure:** versions on all three appliances from the asset inventory *and* the appliance itself; are
   they internet-facing (yes, they are VPNs).
2. **Fix:** an emergency change tonight for the two affected — or the vendor's interim mitigation right now if the
   advisory gives one — one appliance at a time so remote access stays up.
3. **Hunt, because patching closes the hole but not what came through it:** search the appliance and authentication
   logs for the advisory's indicators, unexpected admin logins, new local accounts and configuration changes, and
   unusual outbound connections from the appliances, going back to when the flaw was first exploited.
4. **If anything is found:** this becomes an incident — preserve appliance logs, reset credentials that pass through
   the VPN, and report as required.
5. **Communicate:** the plan, the downtime, and the decision needed (approve tonight's change), in three lines.

## Scenario C — "A leaver's upload" (incident and insider)

**Prompt.** "A DLP alert: an employee who resigned last week uploaded 2.1 GB to a personal cloud-storage account from a
company laptop, two days before their last working day. What do you do?"

**Model answer.**
1. **Confirm the facts:** which files (names, sources, classification), which account and device, when, and whether the
   upload completed — from DLP, proxy and endpoint logs.
2. **Do not contact the employee.** Insider cases go through the manager, HR and legal by policy; a call from the SOC
   can lead to deleted evidence or a dispute about how it was gathered.
3. **Preserve:** export the relevant logs, hash them, record who handled them — this may become a legal matter.
4. **Escalate** to the IR lead with a factual note; recommend, for the business to decide, steps such as suspending the
   laptop's external upload access and requesting deletion with written confirmation.
5. **Assess impact:** if the files hold customer personal data, legal must consider DPDP Act breach duties.
6. **Avoid conclusions:** 2.1 GB could be personal photos. The file list, not the size, decides the severity.

## Rubric (each scenario, out of 20)

| Area | Points | Full marks when |
|---|---|---|
| Method and structure | 5 | the steps named and in a sensible order |
| Evidence and pivots | 5 | specific fields, logs and searches, not "I'd investigate" |
| Decision and communication | 5 | a disposition or plan, who is told, the decision needed |
| Judgement and limits | 5 | stays in role, preserves evidence, says what would change the decision |

40 or more across the three is a pass for most L1 rounds; 50 or more is L2 standard. Below 3 in any area shows what to
practise next — usually *Evidence and pivots*, which is where vague answers lose most.`,
    mcqs: [
      mcq('In Scenario A, what should be examined first after reading the 4720 and 4732 events for helpdesk1?', [
        ['Who created it: the subject account and the process behind it', true],
        ['Whether helpdesk1\'s password meets the domain complexity rules', false],
        ['Whether helpdesk1 appears in HR\'s list of this month\'s joiners', false],
        ['Whether the server\'s antivirus signatures are up to date today', false],
      ], 'The creator decides almost everything: an account made by the management agent during a ticketed rollout reads very differently from one made by a person at a console. Password rules and antivirus status do not answer who did it, and a local admin account is not a joiner.'),
      mcq('In Scenario B, why does the model answer hunt the VPN logs even after the emergency patch?', [
        ['Patching closes the hole but not any access gained through it before', true],
        ['Patching clears the appliance\'s logs, so they must all be read once again', false],
        ['CERT-In requires a hunt report before any patch may be applied', false],
        ['A hunt is the only way to confirm the patch was really installed', false],
      ], 'The flaw was being exploited before the fix, so an intruder may already hold accounts or footholds the patch does not remove. Patch verification is done by checking versions and re-scanning, not by hunting.'),
      mcq('In Scenario C, why should the analyst not message the departing employee about the upload?', [
        ['Insider cases go through HR and legal; contact can cost evidence', true],
        ['The DPDP Act forbids contacting employees serving their notice', false],
        ['An upload of 2.1 GB is too small to be worth any analyst\'s time', false],
        ['Messaging would be fine; it is the quickest way to learn the truth', false],
      ], 'Contact from the SOC can lead to deleted files or a dispute about how evidence was gathered, so policy routes it through the manager, HR and legal. The DPDP Act sets no such rule, and size alone does not decide severity.'),
      mcq('Practising Scenario A, Divya gives a sharp technical analysis but never says who she would tell or what she needs decided. Which rubric area loses most?', [
        ['Decision and communication', true],
        ['Evidence and pivots', false],
        ['Method and structure', false],
        ['Judgement and limits', false],
      ], 'Her method and evidence may be full marks; what is missing is the disposition being communicated and the decision asked for. Scoring areas separately is the point of the rubric: it shows exactly what to practise.'),
      mcq('Scenario A turns out to be a ticketed provisioning script run by svc_deploy. What should change afterwards?', [
        ['Tune the rule for that account and script in change windows, with a review date', true],
        ['Disable the rule, since it has now produced an alert that was not malicious', false],
        ['Nothing, since the alert was closed correctly and the rule needs no change', false],
        ['Delete helpdesk1 from every server, as no local admin account should exist', false],
      ], 'A narrow, reviewed exception stops repeat alerts for the rollout while a person creating an admin account still fires. Disabling the rule blinds the SOC, and a break-glass account may be a deliberate control that needs a unique, vaulted password rather than deletion.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_SCENARIO_ROUNDS_CHECKPOINT',
    notes: `Ten scenario questions across the topic: the alert walkthrough, the log take-home, the incident tabletop and the
vulnerability-and-risk round. Answer each as you would aloud in the room: method first, evidence before verdict,
stay in your role, and end on the decision someone must make.`,
    checkpoint: [
      mcq('An interviewer hands you an alert and asks for your plan. Which order makes a defensible walkthrough?', [
        ['Raw event, enrichment, surrounding activity, decision, written note', true],
        ['Decision, raw event, written note, enrichment, surrounding activity', false],
        ['Enrichment, decision, raw event, written note, isolation of the host', false],
        ['Isolation, raw event, decision, enrichment, a message to the user', false],
      ], 'Evidence comes before the decision and the note records it. Deciding or isolating first means the verdict came from the alert title, and messaging the user can tip off someone misusing the account.'),
      mcq('A Suricata alert for long random DNS subdomains from a branch PC traces to the endpoint agent\'s lookups to its vendor\'s domain. How should it be closed and tuned?', [
        ['Benign true positive; except that process and domain, with a review date', true],
        ['False positive; disable the DNS rule for every branch of the bank', false],
        ['True positive; isolate the PC, since the rule has now proven DNS tunnelling', false],
        ['Benign; except the PC\'s IP address from every DNS rule for good', false],
      ], 'The rule matched real, authorised behaviour, so it is a benign true positive. A narrow exception scoped to the process and domain keeps a real tunnel from another process visible; disabling the rule or excepting the whole PC blinds the SOC.'),
      mcq('In a log take-home, the syslog lines carry no year or zone and the web log is in UTC. What should the report do with times?', [
        ['State each source\'s zone and convert all to one zone, named in the report', true],
        ['Assume every log shares the server\'s zone, since one host wrote them all', false],
        ['Leave each time as written so the reviewer can match it to the raw lines', false],
        ['Convert everything to UTC but leave the zone off to keep the table short', false],
      ], 'One host can write logs in different zones, as nginx did here in UTC while syslog used IST. Mixing them reorders events; converting without naming the zone leaves the reader guessing.'),
      mcq('With 90 minutes left on a take-home, you have answered four of five questions. What is the best use of the time?', [
        ['Write the report with the answer first, listing the open question as a limit', true],
        ['Keep digging on the fifth question and just send whatever exists at the deadline', false],
        ['Ask the recruiter for two more days so the analysis can be fully finished', false],
        ['Add more charts to the report, since reviewers reward visual effort most', false],
      ], 'A clear, honest report on time beats a complete analysis no one can read. Naming the open question as a limit shows judgement; missing the deadline or padding with charts does not.'),
      ck('INCIDENT_RESPONSE', 'In a tabletop, the IT head wants the isolated ransomware source PC reimaged now to get radiology running. Which reply is strongest?', [
        ['Agree, once memory and a disk image are captured and hashed', true],
        ['Agree and reimage now, as getting radiology back comes first', false],
        ['Refuse and keep it isolated for weeks until forensics finish', false],
        ['Reimage it, keeping only a photo of the ransom note as evidence', false],
      ], 'Capture takes minutes and preserves what the investigation needs; then rebuilding is right. Reimaging first destroys evidence, and holding the machine for weeks is unnecessary once it is imaged and downtime procedures cover radiology.'),
      ck('INCIDENT_RESPONSE', 'Which behaviour in a tabletop scores highest for communication?', [
        ['Updates at set times: known, unknown, next steps, decisions needed', true],
        ['Briefing leadership only once the root cause is fully established', false],
        ['Sending raw EDR exports to the director so nothing is filtered out', false],
        ['Updating only the technical team, so leaders hear just the outcome', false],
      ], 'Leaders must make decisions during the incident, so they need regular, structured updates. Waiting for root cause leaves them blind, and raw exports transfer analysis work to people who cannot do it.'),
      ck('INCIDENT_RESPONSE', 'In a tabletop about a quiet intruder on a web server, with no damage yet, why might you watch for a short while before blocking the address it calls?', [
        ['Blocking early can tip them off before every foothold is known', true],
        ['Blocking an address in India needs a court order in advance', false],
        ['Watching for longer always yields a stronger CERT-In report', false],
        ['A firewall cannot block outbound connections on port 443', false],
      ], 'If the intruder notices the block they may switch to another foothold you have not found yet. The wait is short and agreed with the IR lead, and it is abandoned the moment damage starts; no court order is needed to block traffic on your own network.'),
      ck('VULNERABILITY_MANAGEMENT', 'An internet-facing VPN has a KEV-listed flaw at CVSS 7.2; an internal UAT server has a flaw at CVSS 9.8 with EPSS 0.02. Which comes first?', [
        ['The VPN, since exploited and exposed outweighs a high base score', true],
        ['The UAT server, since a 9.8 is critical and critical findings always go first', false],
        ['Both together, since tiers are set by the CVSS base score alone', false],
        ['Neither, until an authenticated scan of every asset is complete', false],
      ], 'KEV is evidence of exploitation and the VPN faces the internet; the UAT flaw is severe on paper but internal and unlikely to be used. Waiting for a full scan delays a fix for a flaw being exploited now.'),
      ck('VULNERABILITY_MANAGEMENT', 'Explaining a P1 finding to a business manager, which sentence works best?', [
        ['"Attackers are using this flaw now; our VPN is exposed; the fix is one reboot tonight"', true],
        ['"The finding has a vector of AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H and a 9.8 base score"', false],
        ['"The scanner rated it critical, and policy says criticals are fixed fast"', false],
        ['"There is some chance of compromise, though we cannot say how likely it is"', false],
      ], 'Likelihood, exposure and the cost of the fix in plain words give the manager what the decision needs. A vector is jargon, "policy says" gives no reason, and vagueness invites delay.'),
      ck('VULNERABILITY_MANAGEMENT', 'An exception for the end-of-life cheque scanners is filed as "compensating control: monitoring". What does it still need to pass review?', [
        ['A specific control, a named risk owner and an expiry date', true],
        ['A higher CVSS score to justify why an exception is needed', false],
        ['Sign-off from the L1 analyst who first found the problem', false],
        ['A note that the scanners are removed from future scans', false],
      ], '"Monitoring" names no control anyone can verify; an owner with authority must accept the risk, and an expiry date forces the replacement. An analyst cannot accept business risk, and dropping scan coverage hides it.'),
    ],
  },
];
