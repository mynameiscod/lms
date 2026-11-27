/**
 * Career-track content: Threat Intelligence and Hunting (CY_THREAT_INTEL), Cybersecurity Analyst, batch CY2.
 *
 * The defender's use of intelligence: indicators versus behaviours and the pyramid of pain, reading a
 * STIX-style feed and matching it against logs, MITRE ATT&CK as the SOC's shared map of coverage, and
 * hypothesis-driven hunting that ends in a Sigma detection. It builds on Year 3's threat modelling, on CY1's
 * Windows/Sysmon and network units and on CY2's "Detection Engineering with Sigma"; none of that is re-taught.
 *
 * Every number in the notes comes from Python/pandas run over small synthetic datasets (no SIEM is installed);
 * the Sigma rule was converted with pySigma's Elasticsearch backend and its real output is shown. SPL and
 * ES|QL hunting searches are written from the documentation and are marked as not run. ATT&CK IDs are given
 * only where certain. Defensive scope only: techniques are named so they can be detected, never taught.
 *
 * Skills: THREAT_MODELLING by default; THREAT_HUNTING is SIEM_MONITORING. Checkpoint questions plainly about
 * the other skill name it with ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_THREAT_INTEL_BUNDLES: PilotBundle[] = [
  /* ── CTI_BASICS ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_CTI_BASICS',
    notes: `Threat intelligence is information about adversaries that changes a decision you make. A list of
ten thousand IP addresses that nobody acts on is not intelligence; it is data. In Year 3's threat
modelling ("What an Attacker Actually Wants") you reasoned about attackers in general. Here you use what
is known about **specific** attackers — the crews phishing Indian bank customers this month, the ransomware
group hitting Indian manufacturers — to decide what to block, what to detect and where to hunt.

## Three levels, three audiences

- **Strategic** — for the CISO and the board: who targets our sector, why, and how often. "Ransomware
  crews are targeting Indian co-operative banks through exposed remote access." Changes budgets and priorities.
- **Operational** — for the SOC lead: how a particular campaign works end to end. "This crew sends a
  KYC-update SMS, the link leads to a credential page, then they log in with the stolen account."
- **Tactical / technical** — for the analyst and the tools: indicators (IPs, domains, hashes) and the
  behaviours (techniques) to detect.

The intelligence lifecycle keeps it honest: **requirements** (what do we need to know?), collection,
processing, analysis, dissemination, and **feedback** (did it help?). Most weak CTI programmes skip the
first and the last step: they subscribe to every free feed and never ask whether any of it caught anything.

## Indicators versus behaviours: the pyramid of pain

David Bianco's pyramid of pain ranks what you can detect by how much it hurts the attacker when you do:

    TTPs (tactics, techniques, procedures)   tough        <- how they operate
    Tools                                     challenging
    Network / host artefacts                  annoying     (a user-agent, a named pipe, a registry key)
    Domain names                              simple
    IP addresses                              easy
    Hash values                               trivial      <- change one byte, new hash

A hash match is precise and useful **today**, but the attacker defeats it by rebuilding the file. Blocking
an IP costs them a new rented server. Detecting the **behaviour** — "Word starts PowerShell with an
encoded command" — forces them to change how they work, which is slow and expensive. So: consume indicators
for quick blocks and retro-searches, but spend your engineering time on behaviour detections.

## Where intelligence comes from

- **Open feeds**: abuse.ch (URLhaus, MalwareBazaar, ThreatFox), AlienVault OTX, vendor blogs.
- **Government**: CERT-In advisories and vulnerability notes; sector bodies (banks share through their
  sector CSIRT and ISAC arrangements). Read them — they are the closest thing to Indian-specific tactical intel.
- **Your own incidents**: the best intelligence you will ever have, because it is about attackers who
  already chose you. Every closed incident should leave indicators and behaviours behind.
- **Sharing platforms**: MISP and OpenCTI (both open source) store, correlate and share intelligence.

Shared intelligence carries a **TLP** label (Traffic Light Protocol 2.0): TLP:RED (named recipients only),
TLP:AMBER (your organisation, need-to-know; AMBER+STRICT means your organisation only), TLP:GREEN
(your community), TLP:CLEAR (public). Forwarding TLP:AMBER to a WhatsApp group is a real breach of trust.

## Reading a STIX-style feed

STIX 2.1 is the JSON format most platforms speak (TAXII is the protocol that transports it). An
indicator object carries a **pattern**, a validity window and a confidence score:

    {"type": "indicator", "id": "indicator--02", "name": "C2 server",
     "pattern": "[ipv4-addr:value = '203.0.113.45']", "pattern_type": "stix",
     "valid_from": "2026-09-01T00:00:00Z", "valid_until": "2026-09-15T00:00:00Z",
     "confidence": 70, "labels": ["c2"]}

A loader that respects the metadata, rather than grabbing every value it can find:

    PAT = re.compile(r"\\[(?P<obj>[\\w-]+):(?P<prop>[\\w.'-]+) = '(?P<val>[^']+)'\\]")

    def load_indicators(bundle, now, min_conf=50):
        out, skipped = [], []
        for o in bundle["objects"]:
            if o.get("type") != "indicator" or o.get("pattern_type") != "stix":
                continue
            m = PAT.fullmatch(o["pattern"])
            if not m:
                skipped.append((o["id"], "unparsed pattern")); continue
            until = o.get("valid_until")
            if until and datetime.fromisoformat(until.replace("Z", "+00:00")) < now:
                skipped.append((o["id"], "expired")); continue
            if o.get("confidence", 0) < min_conf:
                skipped.append((o["id"], f"confidence {o.get('confidence')}")); continue
            kind = {"domain-name": "domain", "ipv4-addr": "ip", "file": "sha256"}[m["obj"]]
            out.append({"id": o["id"], "kind": kind, "value": m["val"].lower(), "name": o["name"]})
        return out, skipped

This regex handles only simple single-comparison patterns; real STIX patterns can combine conditions with
AND/OR, so a production loader uses a STIX pattern library or lets MISP/OpenCTI do the parsing.

Run on 10 September against a four-indicator feed, it printed:

    loaded: [('indicator--01', 'domain', 'upi-kyc-update.examp'), ('indicator--02', 'ip', '203.0.113.45'), ('indicator--03', 'sha256', 'a3f1c9e2b7d4c6e8f0a1')]
    skipped: [('indicator--04', 'confidence 20')]

Run on 20 September, indicator--02 is also skipped as **expired**. That matters: IPs get reassigned. A C2
address from last month may be a cloud customer's harmless web server today, and blocking it forever
creates false positives and angry users.

## Why indicator matching ages fast

The same synthetic actor was simulated for six weeks. Each week it ran five intrusions; it rotated its
domains (cheap) but kept its behaviour (Word starting encoded PowerShell). Two rules were run over each week:
an **IOC rule** (domain in the week-0 list) and a **behaviour rule**:

    week intrusions ioc_rule behaviour_rule
       0          5        5              5
       1          5        5              5
       2          5        2              5
       3          5        0              5
       4          5        0              5
       5          5        0              5

The numbers are simulated, but the shape is what SOCs report: the IOC list is worth a lot in week one and
nothing by week three. The behaviour rule keeps working. That is the pyramid of pain in one table.

## Turning intelligence into action

For each piece of intelligence, ask four questions:
1. **Block?** High-confidence, short-lived indicators go to the firewall, proxy or EDR block list, **with an
   expiry date**.
2. **Retro-search?** Search the last 30–90 days of logs for the indicators: were we already hit?
3. **Detect?** What behaviour does the report describe, and do we have a tested detection for it?
4. **Hunt?** If we have no detection and the behaviour is hard to alert on, it becomes a hunting hypothesis.

Then record the outcome. "Feed X produced 0 true positives in six months" is a finding that saves money.`,
    workedExample: `**Scenario.** A CERT-In advisory and a sector-ISAC note (TLP:AMBER) describe a campaign against
Indian bank customers: an SMS says the customer's KYC is expiring, links to a fake update page, and the
stolen credentials are used on internet banking within hours. The note lists one domain, one IP and the
SHA-256 of an Android app, plus the behaviour: logins from new devices immediately followed by beneficiary
additions.

**1. Load the indicators with their metadata.** The feed loader above loads the domain and IP (confidence
80 and 70) and the hash (60). Each gets an expiry: 30 days for the domain, 14 days for the IP — the
IP is on a hosting provider, so it will be reused.

**2. Retro-search.** Matching the indicators over the proxy and DNS logs gave five hits:

    hits: 5
      ('2026-09-09T10:02:11Z', 'FIN-LT-014', 'dns.question.name', 'indicator--01')
      ('2026-09-09T10:02:11Z', 'FIN-LT-014', 'destination.ip', 'indicator--02')
      ('2026-09-09T10:02:13Z', 'FIN-LT-014', 'url.domain', 'indicator--01')
      ('2026-09-09T10:02:13Z', 'FIN-LT-014', 'destination.ip', 'indicator--02')
      ('2026-09-09T12:15:27Z', 'OPS-SRV-03', 'process.hash.sha256', 'indicator--03')

Five hits, but only **three events** on **two hosts**: one laptop resolved and then visited the domain,
and a server ran a file with the listed hash. Count incidents by host and time, not by indicator hits.

**3. Triage.** FIN-LT-014 belongs to an employee in finance — the bank's own staff are being phished, not
only customers. That is an alert to triage now (who is priya.n, did she enter credentials?). OPS-SRV-03
running the listed file goes to incident response immediately.

**4. Detect the behaviour, not just the indicators.** The domain will be gone next week. The behaviour —
"new device login, then a beneficiary added within ten minutes" — is a detection request for the
internet-banking fraud team's logs, mapped to T1078 Valid Accounts.

**5. Block and record.** The domain and IP go on the proxy block list with their expiry dates. The
outcome is written back to the threat-intel platform: two hosts hit, one detection request raised.`,
    mcqs: [
      mcq('A feed gives you a SHA-256 hash, a C2 domain and a description of how the malware persists through a scheduled task. Which item will stay useful the longest?', [
        ['The scheduled-task persistence behaviour, because changing it costs the attacker real effort', true],
        ['The SHA-256 hash, because it matches the exact file and so it never gives false positives', false],
        ['The C2 domain, because registering domains takes weeks and attackers rarely bother to do it', false],
        ['All three age at the same rate, since a feed publishes them together at the same moment', false],
      ], 'Behaviours sit at the top of the pyramid of pain; changing them means retooling. A hash is precise but defeated by changing one byte, and new domains are cheap and quick to register, so both age within days or weeks.'),
      mcq('Your loader skips an IP indicator whose valid_until date passed last week. A colleague says "keep it, it was malicious once". What is the strongest reason to let it expire from the block list?', [
        ['Hosting IPs get reassigned, so blocking a stale one later hits harmless users', true],
        ['Expired IPs cannot be written into a firewall rule, because firewalls check the STIX metadata', false],
        ['STIX forbids storing an indicator after valid_until, so keeping it invalidates the whole bundle', false],
        ['Block lists longer than a few hundred entries stop being cached, so the proxy slows down for all', false],
      ], 'The validity window is about current use: rented addresses change hands, so blocking old IPs creates false positives (searching past logs for when it WAS malicious is still fine). Firewalls do not read STIX, STIX does not forbid keeping old objects, and block-list size is not the reason.'),
      mcq('A partner sends an incident summary marked TLP:AMBER. Who may you share it with?', [
        ['People in your organisation who need it to act on it', true],
        ['Anyone in the national security community WhatsApp group', false],
        ['Only the named person it was sent to, nobody else', false],
        ['Anyone at all, once the indicators have been blocked', false],
      ], 'TLP:AMBER allows sharing on a need-to-know basis within your organisation (and its clients where stated); AMBER+STRICT narrows it to your organisation only. Only-named-recipients is TLP:RED, community-wide is TLP:GREEN, and public is TLP:CLEAR.'),
    ],
    checkpoint: [
      mcq('An analyst retro-searches 90 days of DNS logs for 4,000 indicators from a free feed and finds 0 hits for the third quarter running. What is the most useful conclusion?', [
        ['Record it as feedback: the feed may not fit our threat profile, so review whether to keep it', true],
        ['The network is clean, so the SOC can lower its monitoring level for the next quarter', false],
        ['The search must be broken, because a feed of 4,000 entries always matches something', false],
        ['Add more free feeds so that the next quarter has a better chance of finding a match', false],
      ], 'The feedback step of the intelligence lifecycle asks whether a source helps. Zero hits does not prove the network is clean (behaviours may still be present), is not proof of a bug, and piling on more unreviewed feeds adds noise rather than value.'),
      mcq('Which task belongs to strategic rather than tactical threat intelligence?', [
        ['Telling the board which groups target Indian banks and why', true],
        ['Pushing a list of phishing domains to the proxy block list', false],
        ['Writing a detection for encoded PowerShell started by Word', false],
        ['Matching file hashes from a feed against EDR process events', false],
      ], 'Strategic intelligence informs leadership decisions about risk and investment. Block lists, hash matching and detections are tactical/technical work for analysts and tools.'),
      mcq('In the six-week simulation, the IOC rule caught 5, 5, 2, 0, 0, 0 intrusions per week while the behaviour rule caught 5 every week. What does this show?', [
        ['Rotating infrastructure is cheap for the attacker; changing behaviour is not', true],
        ['The IOC rule had a bug that appeared in week two and grew worse later', false],
        ['Behaviour rules always give more true positives than IOC rules do', false],
        ['The attacker stopped attacking, but the behaviour rule kept alerting', false],
      ], 'The actor kept running five intrusions a week; only its domains changed. Indicators low on the pyramid of pain decay fast. It is not a bug, and "always" is too strong: behaviour rules can be noisier and need tuning.'),
    ],
  },

  /* ── ATTACK_FRAMEWORK ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_ATTACK_FRAMEWORK',
    notes: `MITRE ATT&CK is a public knowledge base of how real attackers behave, built from reported
intrusions. In a SOC it is the shared vocabulary: an alert, a detection rule, a threat report and a
red-team finding can all point at the same technique, so you can ask "do we detect what this group does?"
and get a numerical answer. You met it briefly when tagging Sigma rules in "Detection Engineering with
Sigma"; here you use it to run the SOC.

## The structure

- **Tactics** are the attacker's goals — the *why*. The Enterprise matrix has columns such as
  Reconnaissance, Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion,
  Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration and Impact.
- **Techniques** are *how* a goal is reached: T1566 Phishing, T1078 Valid Accounts, T1059 Command and
  Scripting Interpreter, T1110 Brute Force, T1486 Data Encrypted for Impact.
- **Sub-techniques** are a more specific how: T1059.001 PowerShell, T1566.001 Spearphishing Attachment,
  T1110.003 Password Spraying, T1053.005 Scheduled Task.
- **Procedures** are what a particular group actually did, e.g. "the group used a scheduled task named
  like a Windows updater to relaunch its loader".

ATT&CK also lists **groups** and **software**, with the techniques each was reported using, and for each
technique the **data sources** that can see it and suggested **detections and mitigations**. A technique
can sit under more than one tactic: T1078 Valid Accounts appears under Initial Access, Persistence,
Privilege Escalation and Defense Evasion, because a stolen account serves all four goals.

## Mapping alerts and detections

Map a detection to the **most specific** technique or sub-technique the logic really proves.
"Office app spawns PowerShell" proves T1059.001 (execution through PowerShell) and suggests T1566.001
(it probably arrived as a phishing attachment), so it carries both tags. Do not tag a rule with every
technique that *might* be involved — that inflates coverage on paper and hides real gaps.

Each alert in the queue then carries its technique, which gives you:
- **Context for triage**: an Execution alert followed by a Credential Access alert on the same host
  is a story, not two tickets.
- **Metrics**: alerts and true positives per tactic, which shows where attackers actually get to.
- **Reporting** that management understands: "we would see initial access and execution; we would
  not see lateral movement".

## Coverage: the question that matters

Coverage is not "how many techniques have a rule". It is: **for the techniques our threat profile says
matter, do we have a detection that we have tested and that has the data it needs?** Three honest grades:

- **none** — no detection;
- **untested** — a rule exists but was never run against sample logs, or its data source is not collected;
- **tested** — the rule fired on a sample or purple-team test and the data source is healthy.

## A coverage matrix with pandas

A SOC's detection list (name, techniques it is tagged with, data source, tested yes/no) and a technique
table were combined with a pivot. Sub-techniques are rolled up to their parent technique first, and a
**threat profile** — the ten techniques reported for ransomware crews hitting Indian finance — marks
priorities:

    d = detections.assign(technique=detections.techniques.str.split(";")).explode("technique")
    d["parent"] = d.technique.str.split(".").str[0]          # T1059.001 -> T1059
    m = d.merge(attack, left_on="parent", right_on="technique", how="right", suffixes=("_sub", ""))
    m["state"] = m.tested.map({True: "tested", False: "untested"}).fillna("none")
    matrix = m.pivot_table(index=["tactic", "technique", "name"], columns="state",
                           values="detection", aggfunc="count", fill_value=0)

The \`how="right"\` merge keeps techniques with **no** detection, which is the whole point. Output:

    state                                                            tested  untested  priority
    tactic              technique name
    Initial Access      T1078     Valid Accounts                          0         1      True
                        T1133     External Remote Services                0         1     False
                        T1566     Phishing                                2         0      True
    Execution           T1059     Command and Scripting Interpreter       2         0      True
    Persistence         T1053     Scheduled Task/Job                      1         0      True
                        T1547     Boot or Logon Autostart Execution       0         1     False
    Defense Evasion     T1027     Obfuscated Files or Information         1         0     False
    Credential Access   T1003     OS Credential Dumping                   0         0      True
                        T1110     Brute Force                             2         0     False
    Lateral Movement    T1021     Remote Services                         0         0      True
    Command and Control T1071     Application Layer Protocol              0         0      True
    Exfiltration        T1567     Exfiltration Over Web Service           0         0      True
    Impact              T1486     Data Encrypted for Impact               0         1      True
                        T1490     Inhibit System Recovery                 1         0      True

    priority techniques with a tested detection: 4/10 = 40%

Read it like an analyst. Brute Force has two tested rules but is **not** a priority for this profile —
effort went where it was easy, not where it was needed. Lateral Movement, Command and Control and
Exfiltration have nothing. Data Encrypted for Impact has a rule nobody tested — for a ransomware threat
profile that is the most dangerous line in the table.

## Tools and limits

**ATT&CK Navigator** (free, web-based) colours the matrix from a JSON "layer"; teams keep one layer for
detection coverage and one per threat group, and overlay them. Keep the layer generated from your
detection repository, not edited by hand. Limits to say out loud in an interview: one rule rarely covers a
whole technique (T1059 has many interpreters and many ways to run each), a green square is not "safe",
and ATT&CK describes behaviour seen so far, not everything possible.`,
    workedExample: `**Scenario.** You are L2 in a Hyderabad MSSP. The client, a payments company, asks: "a
ransomware crew is in the news — would we catch them?" The intel team has extracted the crew's techniques
from public reports: T1566 Phishing, T1078 Valid Accounts, T1059 Command and Scripting Interpreter, T1053
Scheduled Task/Job, T1003 OS Credential Dumping, T1021 Remote Services, T1071 Application Layer Protocol,
T1567 Exfiltration Over Web Service, T1486 Data Encrypted for Impact and T1490 Inhibit System Recovery.

**1. Build the matrix** from the detection repository (above). Result: 4 of 10 priority techniques have a
tested detection.

**2. List the gaps with what exists:**

    PRIORITY GAPS (no tested detection):
      T1078  Valid Accounts                   Initial Access       1 untested
      T1003  OS Credential Dumping            Credential Access    nothing at all
      T1021  Remote Services                  Lateral Movement     nothing at all
      T1071  Application Layer Protocol       Command and Control  nothing at all
      T1567  Exfiltration Over Web Service    Exfiltration         nothing at all
      T1486  Data Encrypted for Impact        Impact               1 untested

**3. Prioritise.** Two untested rules come first: they are cheap to fix — replay sample logs through them,
as in "Detection Engineering with Sigma". Then ask, for each "nothing at all", whether the **data source**
exists. Credential dumping from LSASS memory needs Sysmon process-access events; if Sysmon is not
deployed with that event enabled, the work item is a logging change, not a rule. Remote Services needs
logon events from servers (type 3 and type 10 logons), which the client already collects — so a rule
is quick to write.

**4. Report to the client** in their terms: "Today we would see the phishing and the first commands. We
would not see the crew moving between servers or taking data out, and our encryption detection is
untested. Over four weeks we will test the two existing rules, add lateral-movement and LSASS-access
detections, and enable the Sysmon events they need." Measurable, honest, and tied to a threat they care about.`,
    mcqs: [
      mcq('A rule fires when EXCEL.EXE starts rundll32.exe. A teammate tags it with twelve techniques "to be safe". What is wrong with that?', [
        ['It inflates coverage on paper, so the ATT&CK layer hides gaps the SOC really has', true],
        ['Sigma rejects a rule with more than three technique tags when it is converted', false],
        ['Analysts can only filter alerts by tactic, so the extra technique tags do nothing', false],
      ], 'Tags should say what the logic proves. Over-tagging makes the coverage matrix look greener than reality. Sigma has no tag limit, and alerts can be filtered by technique as well as by tactic.'),
      mcq('Why does T1078 Valid Accounts appear under several tactics in the Enterprise matrix?', [
        ['A stolen account can get the attacker in, keep them in, raise their privileges and hide them', true],
        ['MITRE files every technique under four tactics so the matrix columns stay roughly balanced', false],
        ['Each tactic column holds a different sub-technique of T1078, all sharing one parent ID', false],
        ['It is a historical mistake that MITRE keeps only for compatibility with old ATT&CK layers', false],
      ], 'Tactics are goals; the same technique can serve several. Logging in with a real account achieves initial access, persistence, privilege escalation and defence evasion. It is deliberate, not balancing, an accident or a sub-technique split.'),
      mcq('In the coverage pivot, why does the merge use how="right" against the technique table?', [
        ['So techniques with no detection at all still appear as rows with zero counts', true],
        ['So that detections tagged with unknown technique IDs are kept for the report', false],
        ['So that pandas rolls sub-techniques up into their parent technique for us', false],
        ['So that each detection is counted once even when it carries several tags', false],
      ], 'A right merge keeps every row of the technique table, so gaps show as zeros instead of vanishing. Unknown tags would be dropped by it, rolling up was done by splitting on "." before the merge, and multi-tag detections were exploded on purpose.'),
    ],
    checkpoint: [
      mcq('A SOC reports "we cover 85% of ATT&CK techniques". Which follow-up question best tests whether that number means anything?', [
        ['How many of the techniques in our threat profile have a tested rule with its data source collected?', true],
        ['How many Sigma rules were downloaded from the public repository to reach that eighty-five per cent?', false],
        ['Is the 85% figure based on the newest ATT&CK release or one of the earlier releases of the matrix?', false],
        ['Which colour scheme does the Navigator layer use to show the techniques that are fully covered?', false],
      ], 'Coverage only matters for relevant techniques, and only when the rule is tested and its data exists. The count of downloaded rules, the ATT&CK version and the colour scheme say nothing about whether an attack would be seen.'),
      mcq('An alert on a finance laptop is tagged T1059.001. Twenty minutes later another alert on the same host is tagged T1003. How should the L1 analyst treat them?', [
        ['As one likely intrusion progressing from execution to credential access, escalated together', true],
        ['As two unrelated tickets, because they map to different tactics in the ATT&CK matrix', false],
        ['Close the second one, because a host can only be at one ATT&CK tactic at a time', false],
        ['Wait for a third alert, since two techniques are not enough evidence to escalate', false],
      ], 'ATT&CK tags let you read alerts as a sequence: PowerShell execution followed by credential dumping on one host is a classic progression and should be escalated as one incident. Different tactics on one host are expected in an intrusion, and waiting loses time.'),
      mcq('The coverage matrix shows "nothing at all" for OS Credential Dumping and the required Sysmon process-access events are not collected. What is the first work item?', [
        ['Enable and ship the data source, then write and test the rule against it', true],
        ['Write the rule now and mark the technique as covered in the Navigator layer', false],
        ['Accept the gap, since credential dumping cannot be detected by a SOC at all', false],
        ['Buy a new threat-intel feed that lists credential dumping tool hashes', false],
      ], 'A rule without its data never fires, so marking it covered would be false. The gap is detectable with the right telemetry; a hash feed would catch only known tool builds, low on the pyramid of pain.'),
    ],
  },

  /* ── THREAT_HUNTING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_THREAT_HUNTING',
    notes: `Detections wait for something to match. **Hunting** goes looking for what the detections miss,
on the assumption that something already got past them. It is not scrolling through logs hoping to notice
something: a hunt starts with a **hypothesis**, searches specific data for it, and ends with a recorded
result — and, when it finds something real, a new detection so the same thing never needs hunting again.

## Where hypotheses come from

- **Intelligence**: "the crew in last week's advisory uses web shells on IIS servers; if they are on our
  web servers, w3wp.exe will have started cmd.exe or powershell.exe."
- **Coverage gaps** (from the ATT&CK matrix): "we have no detection for Remote Services; if someone is
  moving laterally, service accounts will log on interactively to hosts they never touch."
- **Situational awareness**: a new VPN, a merger, a critical patch — "the gateway was exposed for two days
  before patching; look for new accounts and logons during those two days".

A good hypothesis is **testable**: it names the behaviour, the data that would show it and the hosts or
period to search. "Find APTs" is not a hypothesis.

## Core techniques

- **Stacking (least frequency of occurrence)**: count a field across the estate and read the bottom of the
  list. What runs on 36 hosts is your build; what runs on one host deserves a look.
- **Baselining**: learn what is normal for each user or host over a period, then look for departures.
- **Long-tail analysis**: the general name for reading the rare end of any distribution — parent-child
  pairs, user-agents, outbound ports, scheduled-task names.

## Hunt 1: rare parent-child process pairs

Data: 14 days of synthetic Sysmon-style process-creation events in ECS shape (\`process.parent.name\`,
\`process.name\`, \`host.name\`) — 17,813 events on 36 hosts. Count each pair by events **and** by distinct hosts:

    p = proc.assign(parent=proc["process.parent.name"].str.lower(), child=proc["process.name"].str.lower())
    stack = (p.groupby(["parent", "child"])
               .agg(events=("host.name", "size"), hosts=("host.name", "nunique"))
               .sort_values(["hosts", "events"]))
    print(stack.head(6).to_string())

Real output:

                                 events  hosts
    parent       child
    excel.exe    rundll32.exe         1      1
    explorer.exe procmon64.exe        1      1
    w3wp.exe     powershell.exe       1      1
                 cmd.exe              2      1
                 csc.exe             18      2
    cmd.exe      ipconfig.exe       106     30
    ... 15 distinct pairs; the most common is ('services.exe', 'svchost.exe') on 36 hosts

Sorting by **hosts** first matters: a pair seen thousands of times on one host is still rare across the
estate. Now triage the tail, which is the analyst's real work:
- **excel.exe → rundll32.exe** on WS-017 — Excel loading a DLL from \`C:\\Users\\Public\` is a classic
  macro-delivery pattern. Escalate.
- **explorer.exe → procmon64.exe** on WS-004 — the IT admin running Sysinternals Process Monitor. Confirm
  with the admin; record it as benign.
- **w3wp.exe → cmd.exe / powershell.exe** on WEB-02 — the IIS worker running \`whoami\`, \`ipconfig /all\`
  and \`Get-LocalUser\` at 03:11 IST. That is web-shell behaviour (T1505.003 Web Shell). Escalate as an incident.
- **w3wp.exe → csc.exe** on both web servers — ASP.NET compiling pages; normal for this application.

The same stack in SIEM query languages (written from the documentation, **not run** here):

    Splunk SPL:  index=sysmon EventCode=1 | stats count dc(host) as hosts by ParentImage, Image | sort 0 hosts count
    Elastic ES|QL:
      FROM logs-* | WHERE event.code == "1"
      | STATS events = COUNT(*), hosts = COUNT_DISTINCT(host.name) BY process.parent.name, process.name
      | SORT hosts ASC, events ASC | LIMIT 20

## Hunt 2: logons at unusual hours

Hypothesis: "if an attacker is using a stolen or service account, it will log on at hours, from logon types
or to hosts that account does not normally use." Baseline: the first ten days (509 logons); hunt window:
the next four days (207). Two lessons came out of building it.

First, **convert to local time**. \`@timestamp\` is UTC; Indian office hours are 03:30–13:30 UTC. A naive
"outside 09–19" check on UTC hours flagged 432 of 716 logons — useless.

Second, **a baseline too narrow is noise**. "Flag any hour this user has never logged on at" flagged 33 of
207 recent logons, because 20 logons per user do not cover every hour of a working day. A per-user window
(earliest to latest hour seen, plus one hour of slack), checked together with logon type and host, gave:

                   @timestamp  hour_ist  user.name host.name  winlog.logon.type                                             why
    2026-10-14 21:17:00+00:00         2 svc_backup    WEB-02                 10 logon type 10 never seen; first logon to WEB-02
    2026-10-16 21:40:00+00:00         3     user07    WS-007                  2                          03h IST outside 08-19h

Look at svc_backup: its 02:47 IST logon is **inside** its normal window — its backup job runs at 01:00
every night — so the hour alone would never have caught it. The logon type (10, RemoteInteractive, i.e.
RDP) and the never-before-seen host did. user07 at 03:10 turned out to be on the on-call rota: benign,
recorded. svc_backup on WEB-02, 24 minutes before the web-shell commands, joins the incident.

## Recording the hunt

Every hunt, successful or not, leaves a record: ID, hypothesis, ATT&CK technique, data and period
searched, queries, findings, and outcome (incident raised, detection created, data gap found, nothing
found). A hunt that finds nothing still proves you **can** see that behaviour — or reveals you cannot.

## From hunt to detection

A finding that is precise and cheap to evaluate becomes a rule. The web-shell finding as Sigma:

    title: Web Server Worker Spawns a Shell
    status: experimental
    tags:
        - attack.persistence
        - attack.t1505.003
        - attack.execution
        - attack.t1059
    logsource:
        category: process_creation
        product: windows
    detection:
        selection_parent:
            ParentImage|endswith: '\\w3wp.exe'
        selection_child:
            Image|endswith:
                - '\\cmd.exe'
                - '\\powershell.exe'
                - '\\pwsh.exe'
        condition: selection_parent and selection_child
    falsepositives:
        - Admin scripts deliberately launched by a web application (should be rare; document each one)
    level: high

Converted with pySigma (\`LuceneBackend(ecs_windows())\`), real output:

    process.parent.executable.caseless:*\\\\w3wp.exe AND (process.executable.caseless:(*\\\\cmd.exe OR *\\\\powershell.exe OR *\\\\pwsh.exe))

Replayed over all 14 days in pandas: **3 hits on 1 host**, and it ignores w3wp.exe → csc.exe. A rule that
fires only on the finding, over two weeks of normal activity, is ready for the detection repository.
The unusual-logon finding is different: a per-user baseline is better as a scheduled analytic or a
recurring hunt than as a single static rule.`,
    workedExample: `**Scenario.** An advisory says a crew is exploiting a vulnerable plugin on IIS sites and then
runs reconnaissance commands through a web shell. Your client runs two IIS servers. Your detections have
no rule for web-server child processes.

**1. Hypothesis.** "If a web shell is on WEB-01 or WEB-02, w3wp.exe will have started a shell or a
reconnaissance tool in the last 14 days." Technique: T1505.003 Web Shell. Data: Sysmon event 1 (process
creation) from both web servers.

**2. Search.** Stack w3wp.exe's children across both servers:

    w3wp.exe  powershell.exe   1 event   1 host
    w3wp.exe  cmd.exe          2 events  1 host
    w3wp.exe  csc.exe         18 events  2 hosts

**3. Investigate.** csc.exe on both servers every few days — the C# compiler that ASP.NET uses to build
pages — matches the application's deployment pattern: benign. The cmd.exe and powershell.exe events are
all on WEB-02 within two minutes on the night of 14 October (03:11–03:13 IST): \`whoami\`, \`ipconfig /all\`,
\`Get-LocalUser\`. Nobody deploys at 3 a.m. with reconnaissance commands.

**4. Pivot.** Around the same time, logons to WEB-02: svc_backup made an RDP logon (type 10) at 02:47 IST
— its first logon ever to WEB-02. The hunt now has two linked findings.

**5. Act.** Raise an incident (the incident-response process takes over: isolate WEB-02, preserve
evidence, reset svc_backup). Write the Sigma rule above, replay it over 14 days (3 hits, all true), and
commit it. Add an ATT&CK coverage entry for T1505.003. Record the hunt: hypothesis confirmed, incident
raised, one detection created, one data observation (svc_backup has an interactive logon right it does
not need — a hardening ticket).`,
    mcqs: [
      mcq('Which of these is a testable hunting hypothesis?', [
        ['If stolen accounts use our VPN, their logons will come from countries those users never use', true],
        ['Find any advanced persistent threat that might currently be hiding somewhere inside our corporate network', false],
        ['Look through all of last month\'s firewall logs to see whether anything in them looks unusual to the team', false],
        ['Check whether the latest ransomware group mentioned in the news has targeted our organisation in some way', false],
      ], 'A hypothesis names the behaviour, the data and the expected sign. The others name no data or signal, so there is nothing specific to search and no way to say the hunt is finished.'),
      mcq('When stacking parent-child pairs, why sort by number of distinct hosts before number of events?', [
        ['A pair repeated on one host is still rare estate-wide, and sorting by events would bury it', true],
        ['Distinct host counts are cheaper for the SIEM to compute than event counts, so sorting by them is faster', false],
        ['Event counts are unreliable in Sysmon logs, because the same process creation is often logged twice', false],
        ['Sorting by hosts removes benign pairs automatically, because benign software always runs on every host', false],
      ], 'Rarity across the estate is what makes a pair interesting; a malicious tool run in a loop on one machine can have many events. Cost is not the reason, Sysmon does not routinely duplicate events, and benign software (like an admin tool) can be rare too.'),
      mcq('A hunt for logons by service accounts to new hosts finds nothing in 30 days. What should the hunt record say?', [
        ['Not confirmed; all servers searched for 30 days; the query is saved for re-use', true],
        ['Nothing, because a hunt that finds nothing does not need to be written down or remembered', false],
        ['That service accounts are safe, so their logons can be excluded from all future detections', false],
        ['That the data source must be broken, since a 30-day hunt should always find at least one thing', false],
      ], 'A negative result is evidence about visibility and about the hypothesis, and the saved query lets the hunt be repeated. It does not prove safety for ever, and a quiet result is not proof of a broken source — though checking that the data is present is part of the hunt.'),
    ],
    checkpoint: [
      mcq('Your unusual-hours hunt compares the hour of @timestamp to 09:00–19:00 and flags 432 of 716 logons. What is the most likely cause?', [
        ['The timestamps are in UTC and were never converted to Indian time', true],
        ['The baseline period is too short to learn each user\'s working hours', false],
        ['Most users genuinely work night shifts in this particular office', false],
        ['The logon type field is missing, so all logons are counted twice', false],
      ], 'ECS @timestamp is UTC; IST office hours are 03:30–13:30 UTC, so most normal logons fall "outside" 09–19. A short baseline causes noise in per-user models, not in a fixed-window check; night shifts or double counting would not produce this pattern.'),
      mcq('svc_backup logs on to WEB-02 at 02:47 IST. Its nightly job runs at 01:00, so a per-user hour window does not flag it. Which other signal in the hunt makes it suspicious?', [
        ['It is an RDP (type 10) logon to a host the account has never logged on to', true],
        ['It happened on a weekday, when backup jobs are normally scheduled to be paused', false],
        ['Service account names never appear in Windows logon events unless compromised', false],
        ['The logon was at night, and every logon outside office hours is malicious', false],
      ], 'A service account doing an interactive remote logon to a new host departs from its baseline on two dimensions even though the hour is normal. The weekday claim is invented, service accounts log on constantly, and night logons are normal for this account.'),
      ck('THREAT_MODELLING', 'A hunt confirms web-shell activity on an IIS server. Which follow-up best uses the finding for the future?', [
        ['Write a tested Sigma rule for w3wp.exe spawning shells and record T1505.003 coverage', true],
        ['Add the web shell file\'s hash to the block list and close the hunt as complete', false],
        ['Schedule the same manual hunt every week instead of writing a detection for it', false],
        ['Share the hunt queries publicly so other companies can run them on their servers', false],
      ], 'A precise, cheap finding should become a detection so it no longer depends on someone hunting, and the coverage map should show it. A hash is trivial to change, repeating manual hunts wastes analysts, and publishing client details breaks confidentiality.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_DEBUGGING',
    notes: `Six broken pieces of threat-intel and hunting work. Every number below is real output from the
synthetic datasets used in this topic. For each: the symptom you see, the cause, and the one change that
fixes it.

## 1. The hash that never matches

**Symptom.** A retro-search over the sample logs returns 4 hits instead of 5; the server that
ran the known-bad loader is missing.

**Cause.** The feed gives SHA-256 in lowercase; the EDR writes \`process.hash.sha256\` in uppercase. A
dictionary lookup with the raw log value is case-sensitive:

    if v and (kind, v) in index:            # 'A3F1C9...' != 'a3f1c9...'

**Fix.** Normalise both sides — the loader already lowercases indicator values; lowercase the log value too:

    if v and (kind, v.lower()) in index:

With that change the hit count is 5 and OPS-SRV-03 appears. The same applies to domains (\`Upi-KYC-Update.example\`).

## 2. Blocking yesterday's attacker, today's customer

**Symptom.** Users at a client complain a legitimate SaaS site is blocked. The block was added from a feed
four months ago.

**Cause.** The loader ignored \`valid_until\`; the hosting IP was reassigned to a new customer. Run on 20
September, a loader that respects the window prints:

    on 20 Sep loaded ['indicator--01', 'indicator--03'] skipped [('indicator--02', 'expired'), ('indicator--04', 'confidence 20')]

**Fix.** Every block-list entry carries an expiry (feed's \`valid_until\`, or a default such as 14 days for
IPs) and a source. Expired indicators stay searchable for history but leave the block list.

## 3. A coverage matrix that says you see nothing

**Symptom.** The pivot reports 1 of 10 priority techniques covered, though the team knows it has tested
PowerShell and phishing rules.

**Cause.** Detections are tagged with sub-techniques (T1059.001, T1566.001, T1053.005) and the merge
matched them to a technique table that only has parent IDs. Only T1490, tagged without a sub-technique,
matched.

**Fix.** Roll sub-techniques up before merging:

    d["parent"] = d.technique.str.split(".").str[0]

and merge on \`parent\`. The figure becomes 4 of 10 — the real one.

## 4. The rule that alerts on every cmd.exe

**Symptom.** The new web-shell rule fires 239 times in 14 days instead of 3.

**Cause.** The condition was written \`selection_parent or selection_child\`, so every cmd.exe started by
anyone (220 events) and everything w3wp.exe ever started matched.

**Fix.** \`condition: selection_parent and selection_child\`. Replay before committing: 3 hits, 1 host.
Always replay a new rule over a period of normal data and read the hit count before you merge it.

## 5. UTC hours in an Indian SOC

**Symptom.** "Logon outside 09:00–19:00" flags 432 of 716 logons.

**Cause.** \`@timestamp\` is UTC; 09:00 IST is 03:30 UTC. The check was done on UTC hours.

**Fix.** \`lg["@timestamp"].dt.tz_convert("Asia/Kolkata").dt.hour\`, or set the time zone in the SIEM's
query. Store in UTC; compare against working hours in the user's local time.

## 6. The baseline that flags everyone

**Symptom.** "Flag any hour this user has never logged on at" flags 33 of 207 recent logons, nearly all
within normal office hours.

**Cause.** Twenty logons per user over ten days do not cover every hour; the exact-hour set is too
narrow, so ordinary variation looks anomalous.

**Fix.** Use a window (earliest to latest hour seen, plus slack) and combine it with other dimensions
(logon type, host). Result: 2 logons flagged, one benign (on-call) and one the real finding.

## How to debug this kind of work

Check the **data** before the logic: field names, case, time zone, and whether the field exists at all.
Then check the **count**: every query, rule and hunt should produce a number you can sanity-check
against what you expect from a normal fortnight.`,
    mcqs: [
      mcq('A domain indicator is stored as "upi-kyc-update.example" and the proxy logs it as "UPI-KYC-Update.example". The match returns nothing. What is the right fix?', [
        ['Lowercase both the indicator value and the log field before comparing', true],
        ['Add the uppercase spelling to the feed as a second indicator for safety', false],
        ['Switch to substring matching so that partial domain names also match', false],
        ['Ask the proxy vendor to log domains in lowercase from now on instead', false],
      ], 'Domain names and hex hashes are case-insensitive, so normalise both sides. Adding variants does not scale, substring matching creates false positives, and waiting for a vendor change leaves the gap open.'),
      mcq('A Sigma rule with "condition: selection_parent or selection_child" fires 239 times in 14 days where 3 were expected. What does the 239 most directly tell you?', [
        ['Each selection alone matches broadly; only both together describe the behaviour', true],
        ['The Sigma converter produced a wrong query that the SIEM could not run properly', false],
        ['The web server is badly compromised and is spawning hundreds of shell processes', false],
        ['The rule needs a lower level so that the alerts stop appearing in the main queue', false],
      ], 'With OR, every cmd.exe from any parent and every w3wp.exe child matches. The converter faithfully produced what was written, the host is not the source of 239 shells, and lowering the level hides noise instead of fixing the logic.'),
      mcq('A coverage report says only 1 of 10 priority techniques is covered, but tested PowerShell detections exist. Which bug explains it?', [
        ['Sub-technique tags such as T1059.001 were never rolled up to T1059 before the merge', true],
        ['The detections were stored as Sigma YAML, which pandas cannot read into a DataFrame', false],
        ['ATT&CK changed the PowerShell technique ID in a recent release of the matrix', false],
        ['The pivot used count instead of sum, so the tested flags were all lost in the table', false],
      ], 'Matching "T1059.001" against a table of parent IDs finds nothing; splitting on "." first fixes it. The detection list here is a DataFrame, T1059.001 is stable, and count over the detection column is correct for counting rules.'),
      mcq('An unusual-hours hunt built on "hours this user has never logged on at" flags 33 of 207 logons, almost all at 10:00–17:00 IST. What is the best change?', [
        ['Use a per-user window with slack and combine it with logon type and host', true],
        ['Shorten the baseline to the last two days so the model is more up to date', false],
        ['Raise the threshold so a user is flagged only after five unusual logons', false],
        ['Drop the hunt, since logon time is never a useful signal for a SOC to use', false],
      ], 'The exact-hour set is too sparse; a window absorbs normal variation and extra dimensions add precision. A shorter baseline makes sparsity worse, a five-event threshold delays real findings, and logon timing combined with other signals is useful.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_PRACTICE',
    notes: `Eight exercises, easiest first. Try each before reading the answer.

## 1. Place on the pyramid (easy)

Place each on the pyramid of pain, from bottom to top: (a) a SHA-256 of a loader; (b) the domain
\`kyc-renew-portal.example\`; (c) a named pipe the malware always creates; (d) the attacker's habit of
creating a scheduled task named like a Windows updater; (e) the C2 IP.

**Answer.** Hash (a) → IP (e) → domain (b) → host artefact (c) → behaviour/TTP (d). Detection effort is
best spent on (c) and (d).

## 2. TLP decisions (easy)

A TLP:GREEN advisory and a TLP:RED call summary arrive. Your MSSP's other clients would benefit from both.

**Answer.** TLP:GREEN may be shared within your community (other clients in the sector). TLP:RED stays with
the named recipients: ask the source for permission or a re-labelled version before sharing anything.

## 3. Feed metadata (easy)

An indicator has confidence 25 and no \`valid_until\`. Your loader's threshold is 50. What happens, and
what should happen to indicators with no expiry?

**Answer.** It is skipped for blocking (below threshold). It can still be used for retro-search or
enrichment. Indicators without an expiry get a default one by type — short for IPs, longer for domains,
longer still for hashes.

## 4. Map the detection (medium)

Map: (a) "many failed logons for many users from one IP, then a success"; (b) "vssadmin delete shadows";
(c) "Word spawns powershell.exe -enc".

**Answer.** (a) T1110.003 Password Spraying (under T1110 Brute Force); (b) T1490 Inhibit System Recovery;
(c) T1059.001 PowerShell, and T1566.001 Spearphishing Attachment as the likely delivery, plus the
obfuscation of the encoded command.

## 5. Read the coverage matrix (medium)

Using the matrix in the ATT&CK lesson: which tactic has the most tested detections, and why is that not
reassuring for a ransomware threat profile?

**Answer.** Initial Access and Execution (Phishing and Command and Scripting Interpreter have two tested
rules each) and Credential Access via Brute Force. But Brute Force is not in the profile, Lateral
Movement, C2 and Exfiltration have nothing, and the encryption rule is untested — the late stages where
damage happens are blind.

## 6. Write the stack (medium)

Write pandas that stacks \`process.name\` by distinct hosts for processes started from \`C:\\Users\\Public\\\`
(field \`process.executable\`), rarest first.

**Answer.**

    pub = proc[proc["process.executable"].str.lower().str.startswith("c:\\\\users\\\\public\\\\")]
    (pub.groupby(pub["process.name"].str.lower())["host.name"].nunique()
        .sort_values().head(20))

## 7. From hypothesis to data (medium-hard)

Hypothesis: "someone is moving laterally with RDP from workstations to servers." What data do you need, and
what will you look for?

**Answer.** Windows Security logon events 4624 with logon type 10 on servers (plus 4625 failures), with
source address resolved to a host. Look for workstation-to-server RDP by accounts that do not normally
administer servers, first-ever source→destination pairs, and chains (A→B then B→C within an hour). Maps to
T1021.001 Remote Desktop Protocol.

## 8. Hunt to rule (hard)

The hunt found Excel starting rundll32.exe loading a DLL from \`C:\\Users\\Public\\\`. Write the Sigma
\`detection\` block, then name one false positive to check before enabling it.

**Answer.**

    detection:
        selection:
            ParentImage|endswith:
                - '\\excel.exe'
                - '\\winword.exe'
            Image|endswith: '\\rundll32.exe'
        condition: selection

False positive to check: Office add-ins that legitimately call rundll32 (some printing or document-management
plugins). Replay over 14–30 days of process events; if any legitimate parent-child sequence appears,
narrow on the DLL path (\`CommandLine|contains: '\\Users\\Public\\'\`) rather than allow-listing the host.`,
    mcqs: [
      mcq('Which of these indicators sits highest on the pyramid of pain?', [
        ['A mutex name the malware family always creates', true],
        ['A SHA-256 hash of the malware family\'s dropper', false],
        ['A domain registered for the latest C2 campaign', false],
        ['An IP address of a rented virtual private server', false],
      ], 'Host artefacts such as a mutex or named pipe are above domains, IPs and hashes, because changing them means altering the malware itself. Hashes, IPs and domains are the cheap bottom layers.'),
      mcq('An L1 analyst maps "password spraying against Microsoft 365 from one cloud IP" to ATT&CK. Which mapping is most precise?', [
        ['T1110.003 Password Spraying, a sub-technique of T1110 Brute Force', true],
        ['T1078 Valid Accounts, because the attacker is after real accounts', false],
        ['T1566 Phishing, since stolen passwords usually come from phishing', false],
      ], 'The behaviour observed is many logons with one common password across many accounts: T1110.003. T1078 applies once a stolen account is used successfully, and phishing is a different initial-access technique.'),
      mcq('Your MSSP received a TLP:RED summary of an intrusion at a bank. A second bank client would clearly benefit. What do you do?', [
        ['Ask the source for permission or a version with a lower TLP label', true],
        ['Share it with the second bank, since both are clients of your MSSP', false],
        ['Remove the bank\'s name and then forward the summary unchanged', false],
        ['Post the indicators only, as indicators carry no TLP restrictions', false],
      ], 'TLP:RED is for named recipients only; re-sharing needs the originator\'s agreement. Being clients of one MSSP, redacting a name or extracting indicators does not change the label on the information.'),
      mcq('A hunting stack shows "excel.exe → rundll32.exe" on one host, once. What is the right next step?', [
        ['Pull that event\'s command line and the host\'s surrounding activity before deciding', true],
        ['Escalate immediately as a confirmed incident without looking at any context', false],
        ['Ignore it, since something that happened only once cannot be an attack', false],
        ['Add the pair to an allow-list so future hunts are not distracted by it', false],
      ], 'Rare is a reason to look, not a verdict. The DLL path and what happened around it decide. Escalating without context wastes L2 time, single events can be the whole attack, and allow-listing an unexamined event is how attacks get missed.'),
      mcq('A hunt for RDP lateral movement needs which data first?', [
        ['Server logon events 4624 with logon type 10 and the source address', true],
        ['Proxy logs of outbound web traffic from the workstations to the internet', false],
        ['DNS query logs from the domain controller for external domain lookups', false],
        ['Firewall logs from the internet edge showing inbound connection attempts', false],
      ], 'RDP logons to servers are recorded as event 4624 with logon type 10 on the destination. Proxy, external DNS and edge firewall logs show traffic to and from the internet, not internal RDP sessions.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_INTERVIEW_QUESTION',
    notes: `Questions asked for SOC L1/L2 and junior threat-hunting roles at MSSPs, banks and GCCs in
Bengaluru, Hyderabad and Pune. Answer aloud in under two minutes, then take the follow-up.

## Q1. "What is the pyramid of pain, and how does it change what you do with a threat feed?"

**Model answer.** "It ranks what defenders can detect by how much it costs the attacker to change it:
hashes, IPs and domains at the bottom are cheap to change; host and network artefacts, tools and TTPs at
the top are expensive. So I use feed indicators for quick, time-limited blocks and for retro-searching our
logs, but the real value is the behaviour described in the report. For each report I ask: do we have a
tested detection for that behaviour? If not, I write one or turn it into a hunt. In a small simulation I
ran, an IOC list caught every intrusion in week one and none from week three, while the behaviour rule
caught all of them every week."

**Follow-up.** "So should we stop paying for an IOC feed?" — "Not automatically. Measure it: how many true
positives did its indicators produce in the last six months, and did they come before or after our other
detections? If it never matched anything relevant, drop it; if it gave early warning, keep it, with expiry
dates on everything it pushes."

## Q2. "Your manager says we cover 80% of MITRE ATT&CK. Is that good?"

**Model answer.** "It depends on what was counted. I would ask three things. Which techniques — are they
the ones our threat profile says matter, or the easy ones? Is each rule tested against sample data or a
purple-team exercise? And is the data source the rule needs actually collected? I once built a matrix
where four of ten priority techniques had a tested detection, while Brute Force — not even on the
profile — had two. I would report coverage of the priority techniques, tested and with data, rather than a
single percentage of the whole matrix."

**Follow-up.** "How would you keep that matrix up to date?" — "Generate it from the detection repository:
each Sigma rule carries its ATT&CK tags and a tested flag in CI, a script builds the Navigator layer on
every merge, and the threat profile is reviewed whenever intel changes."

## Q3. "Walk me through a threat hunt you would run."

**Model answer.** Use the structure: *hypothesis → data → method → findings → outcome.* "From an advisory
about web shells on IIS: if one is on our web servers, w3wp.exe will have started cmd.exe or PowerShell.
Data: 14 days of Sysmon process creation from the web servers. Method: stack w3wp.exe's child processes by
host. I found csc.exe on both servers, which is ASP.NET compiling pages, and cmd.exe and PowerShell on one
server at 3 a.m. running whoami and ipconfig. I pivoted to logons and found a service account RDPing to
that server 24 minutes before. I raised an incident, then wrote a Sigma rule for w3wp.exe spawning
shells, replayed it over the 14 days — 3 hits, all true — and committed it."

**Follow-up.** "What if the hunt had found nothing?" — "I would still write it up: the hypothesis, the data
and period covered, the query. A negative hunt tells us the behaviour was not present in that window and
proves we have the visibility. If I had found the data missing — no Sysmon on the web servers — that is a
finding too, and probably the most important one."

## Q4 (quick). "IOC versus IOA?"

"An indicator of compromise is evidence something happened — a hash, an IP. An indicator of attack is a
behaviour that shows an attack in progress, regardless of the tool — like an Office application spawning
an encoded PowerShell command. IOAs map to ATT&CK techniques and last longer."`,
    mcqs: [
      mcq('An interviewer asks how you would judge whether a paid IOC feed is worth renewing. Which answer is strongest?', [
        ['Count its true positives over six months and check whether they arrived before our other detections did', true],
        ['Count how many indicators it delivers each day, because a larger feed means much better protection', false],
        ['Renew it if the vendor\'s indicators map to ATT&CK, because mapped indicators are always more accurate', false],
        ['Compare its price with other feeds and choose whichever one offers the most indicators per rupee spent', false],
      ], 'Value is measured by outcomes: relevant true positives and early warning. Volume, ATT&CK labels on indicators and indicators-per-rupee say nothing about whether the feed ever helped your SOC.'),
      mcq('In a threat-hunting interview answer, which structure makes the answer easiest to follow and assess?', [
        ['Hypothesis, data, method, findings, outcome', true],
        ['Tools used, then the dashboards that were built', false],
        ['Every query typed, in the order it was typed', false],
        ['A list of the ATT&CK tactics in matrix order', false],
      ], 'The hypothesis-to-outcome structure shows reasoning and impact. A list of tools or every query typed shows activity, not judgement, and the matrix order of tactics is unrelated to the story of a hunt.'),
      mcq('The interviewer follows up: "the hunt found nothing — was it wasted?" What is the best reply?', [
        ['No: it is a recorded negative result that also confirms whether we can see that behaviour at all', true],
        ['Yes: hunts are only useful when they find an attacker, so the time should go to alert triage instead', false],
        ['No: an empty result proves the network is clean, so that technique can be removed from monitoring', false],
        ['Yes: a hunt with no findings means the hypothesis was badly written and the analyst needs retraining', false],
      ], 'A negative hunt documents absence in a window and tests visibility; a missing data source discovered on the way is a valuable finding. It does not prove the network is clean forever, and a good hypothesis can rightly come back negative.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_THREAT_INTEL_CHECKPOINT',
    notes: `Ten questions across the topic: using intelligence and the pyramid of pain, feed hygiene, ATT&CK mapping
and coverage, and hypothesis-driven hunting that ends in a detection. Answer without notes; the result
shows where to go back.`,
    checkpoint: [
      mcq('A report on a phishing campaign against UPI users lists 40 domains and says the actors always send SMS links that open a fake KYC page asking for an MPIN. What gives your client the most lasting protection?', [
        ['A detection or user-reporting process for the KYC-lure behaviour, plus time-limited domain blocks', true],
        ['Permanently blocking all 40 domains on the proxy, then closing the intelligence ticket as completed', false],
        ['Adding the 40 domains to a watch-list and alerting the SOC each time one of them is resolved by DNS', false],
        ['Forwarding the report to every employee, so they can memorise the 40 domains used in the campaign', false],
      ], 'Domains rotate, so lasting value comes from the behaviour (the lure pattern) while blocks are short-term and expire. Permanent blocks age into false positives, a watch-list goes quiet as domains change, and memorising domains is not a control.'),
      mcq('Which STIX indicator field tells your loader that an IP should no longer be used for blocking?', [
        ['valid_until', true],
        ['valid_from', false],
        ['confidence', false],
        ['pattern_type', false],
      ], 'valid_until ends the period in which the indicator is considered valid. valid_from starts it, confidence expresses the producer\'s certainty, and pattern_type names the pattern language (for example "stix").'),
      mcq('In ATT&CK, what is the relationship between T1059 and T1059.001?', [
        ['T1059.001 PowerShell is a sub-technique of T1059 Command and Scripting Interpreter', true],
        ['T1059.001 is the first procedure ever reported for T1059 in a published intrusion report', false],
        ['T1059.001 is the Execution tactic, and T1059 is the technique listed beneath it', false],
        ['T1059.001 is the newer version of T1059 that replaced it in the latest release', false],
      ], 'Dotted IDs are sub-techniques: a more specific way to perform the parent technique. Procedures describe what a named group did, tactics have TA-prefixed IDs, and sub-techniques do not replace their parent.'),
      mcq('Which detection tag set is the most accurate for a rule that fires when vssadmin.exe deletes shadow copies?', [
        ['T1490 Inhibit System Recovery under the Impact tactic', true],
        ['T1486 Data Encrypted for Impact, because ransomware does it', false],
        ['Every Impact technique, so the rule shows up in all reports', false],
        ['T1059 Command and Scripting Interpreter, as vssadmin is a command', false],
      ], 'Deleting shadow copies stops recovery: T1490. It often comes before encryption but does not prove it, tagging every Impact technique inflates coverage, and vssadmin is a utility rather than a scripting interpreter.'),
      mcq('A threat profile lists ten techniques. Four have tested detections, two have untested rules and four have nothing. What is the honest coverage figure to report?', [
        ['4 of 10 priority techniques have a tested detection', true],
        ['6 of 10 priority techniques have some detection rule', false],
        ['10 of 10, because every technique is now being tracked', false],
        ['The share of the whole ATT&CK matrix that has any rule', false],
      ], 'Untested rules may not fire, so only tested ones count as coverage; the two untested ones are the cheapest next step. "Being tracked" is not detection, and whole-matrix figures hide whether the relevant techniques are covered.'),
      ck('SIEM_MONITORING', 'You stack parent→child pairs over 14 days and the rarest is "explorer.exe → procmon64.exe" on one host. What is the right disposition after checking it?', [
        ['If the IT admin confirms using Process Monitor, record it as benign in the hunt notes', true],
        ['Escalate it as an incident, because it is the rarest pair found in the whole estate', false],
        ['Delete the event from the SIEM so it does not appear again in any future hunt', false],
        ['Write a high-severity Sigma rule for procmon64.exe before asking anyone about it', false],
      ], 'Rarity triggers a check, and a confirmed admin tool is benign; recording it saves the next hunter time. Rare does not mean malicious, deleting evidence is never acceptable, and a rule written before triage creates noise.'),
      ck('SIEM_MONITORING', 'A per-user logon-hour baseline built from 10 days of data flags 33 of 207 new logons, almost all during office hours. What does this most likely show?', [
        ['The exact-hour baseline is too sparse and needs a window with slack', true],
        ['A credential-stuffing campaign is under way against most staff accounts', false],
        ['The SIEM has duplicated the logon events during the last four days', false],
        ['Users have changed their working hours since the baseline was learnt', false],
      ], 'Twenty logons per user do not cover every hour, so normal variation gets flagged; a window fixes it. Attacks or duplication would not cluster in ordinary office hours across most users, and a sudden change in everyone\'s working hours is unlikely.'),
      ck('SIEM_MONITORING', 'Which hunting hypothesis is best suited to a gap in Lateral Movement coverage?', [
        ['Non-admin accounts will make first-ever RDP logons from workstations to servers', true],
        ['Users will receive more phishing emails than normal on the days after a public holiday in India', false],
        ['The organisation will be targeted by a ransomware group at some point during the coming year', false],
        ['Outbound traffic to cloud storage will grow steadily over the next quarter as the business grows', false],
      ], 'It names the behaviour (RDP between hosts), the data (server logons) and the signal (first-ever pairs, unusual accounts) for lateral movement. Phishing volume is initial access, a vague prediction is not testable, and storage growth is a capacity trend.'),
      ck('SIEM_MONITORING', 'A new Sigma rule for w3wp.exe spawning shells is replayed over 14 days and returns 3 hits on one host, all from the confirmed incident. What is the next step?', [
        ['Commit it to the detection repository with its ATT&CK tags and the replay result', true],
        ['Discard it, because a rule that fires only three times in two weeks has no value', false],
        ['Lower its level to informational until it has produced at least a hundred alerts', false],
        ['Keep it as a manual hunt query instead, since rules from hunts are never reliable', false],
      ], 'Few, true hits over normal data is exactly what a good high-fidelity rule looks like. Rare alerts are valuable, alert volume is not a quality measure, and turning repeatable findings into rules is the point of hunting.'),
      ck('SIEM_MONITORING', 'Your hunt queries return timestamps in UTC. A logon shows 21:17 UTC. What time was it in India?', [
        ['02:47 IST the next day', true],
        ['15:47 IST the same day', false],
        ['21:17 IST the same day', false],
        ['03:17 IST the next day', false],
      ], 'IST is UTC+05:30, so 21:17 UTC is 02:47 the next day. Subtracting the offset gives 15:47, ignoring it gives 21:17, and adding six hours gives 03:17 — all common mistakes when reading UTC logs.'),
    ],
  },
];
