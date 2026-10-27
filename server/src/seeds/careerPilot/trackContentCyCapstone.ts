/**
 * Career-track content: Capstone: A SOC for a Real Organisation (CY_CAPSTONE), Cybersecurity Analyst, batch CY3 —
 * the track's capstone. Nothing is re-taught; every unit points back to the lesson that taught the idea.
 *
 * The student plans, builds, runs, reports and defends monitoring, detection, incident response and vulnerability
 * management for one organisation, on a home lab of free tools on their own machines (Wazuh / Elastic, Sysmon,
 * Suricata / Zeek, a few VMs on a host-only network). Option A (recommended, data provided) is Nallamala District
 * Hospital, a fictional 300-bed hospital — deliberately not the cooperative bank of the SIEM mini project. Options B
 * and C are a cooperative bank and an e-commerce company.
 *
 * Defensive only. The "incident" is a safe exercise staged on the student's own lab: replayed synthetic logs, the
 * EICAR anti-malware test file (named, never reproduced here), a test account, and a documented benign detection
 * test described only at that level. No malware, no attack tooling, no scanning of anything the student does not
 * own. CVE-like ids, EPSS-like and KEV-like values are fictional.
 *
 * Every number shown was produced by running the code in the scratch venv (pandas 3.0, pySigma 1.5 with the
 * Elasticsearch backend): the synthetic hospital week and its detection replay, the incident timeline and the
 * vulnerability SLA report. Wazuh rules and agent configuration, Sysmon, Suricata, Zeek and OpenVAS commands are
 * written from their documentation and were not run; the notes say so where they appear.
 *
 * Attribution: the topic is [SIEM_MONITORING, NETWORK_SECURITY, INCIDENT_RESPONSE, VULNERABILITY_MANAGEMENT],
 * default SIEM_MONITORING; BUILD_MONITORING declares SIEM_MONITORING and NETWORK_SECURITY, BUILD_RESPONSE
 * INCIDENT_RESPONSE and VULNERABILITY_MANAGEMENT. Checkpoint questions on a skill other than SIEM_MONITORING name
 * it with ck(); questions drawn from the identity, cryptography, cloud and governance lessons are tagged with the
 * capstone skill they exercise.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const SIEM = 'SIEM_MONITORING';
const NET = 'NETWORK_SECURITY';
const IR = 'INCIDENT_RESPONSE';
const VULN = 'VULNERABILITY_MANAGEMENT';

export const TRACK_CY_CAPSTONE_BUNDLES: PilotBundle[] = [
  /* ── BRIEF ─────────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CAPSTONE_BRIEF',
    notes: `**A SOC hiring panel does not ask whether you know what Sysmon is. It asks you to open your SIEM, pick an
alert, and walk it to closure — then explains what it would have done differently.** This capstone gives you that
walk. You will stand up the security operations for one organisation on a lab you build yourself: the log sources,
the detections and their tuning, a dashboard, an incident handled end to end, a vulnerability programme and the
reports leaders read. Then you defend it.

You have every piece already: Network Security for Analysts, Endpoint and Identity Security and Cryptography
(CY1); SIEM and Detection, Incident Response, and Threat Intelligence and Hunting (CY2); Vulnerability Management,
Cloud Security for Analysts and Governance, Risk and Compliance (CY3). The capstone joins them into one working SOC.

## Three organisations, one standard

| | **Option A — Nallamala District Hospital (recommended, data provided)** | **Option B — a cooperative bank** | **Option C — an e-commerce company** |
|---|---|---|---|
| Who | A fictional 300-bed government district hospital: OPD, six wards, ICU, lab, radiology, pharmacy | An urban cooperative bank with a head office and a dozen branches | A Bengaluru seller marketplace: web and app, a payments partner, a warehouse team |
| Crown jewels | The hospital information system (HIS) and patient records; PACS imaging; the lab system | Core banking, internet banking, the UPI integration | Customer accounts, the order and payout systems, the cloud account itself |
| What hurts most | Ransomware stopping registration and lab reports; patient records leaking | Fraudulent transfers; a branch PC as the way in | Account takeover at scale; a public storage bucket; stolen cloud keys |
| Hard to monitor | Medical devices and vendor-locked imaging workstations that take no agent | Branch PCs on thin links; a core banking vendor who owns the server | Short-lived cloud resources; logs that are off by default |
| The hard question | "Your pump VLAN talks to the internet. Who decided that was allowed?" | "Which of your alerts would have stopped a ₹2 crore transfer in time?" | "Your access key leaked on GitHub at 3 a.m. Walk me through the next 30 minutes." |

All three are graded on the same rubric. **Option A is recommended**: a hospital has the widest mix — Windows,
Linux, an application with its own audit log, and a device network that only the network sensor can see — and the
synthetic week below gives your detections something real to find. The ransomware attack on AIIMS New Delhi's
systems in late 2022, which pushed the hospital to manual registration for days, is the risk everyone in the room
will remember. Option B must go further than the Krishna Valley bank of the SIEM mini project: add core banking,
the ATM and UPI integrations, and the RBI's expectations for cooperative banks in outline. Option C leans on Cloud
Security for Analysts: CloudTrail-style audit logs, identity policies and storage exposure, with no real cloud
account needed — synthetic events are fine. **No real personal data** in any option: no real patient, customer or
account details, ever.

## The lab: free tools, your own machines

- **SIEM:** a Wazuh server (indexer, server and dashboard all in one VM), or Elastic if you prefer — check the
  hardware the vendor's quickstart asks for before you start; a 16 GB laptop is comfortable, 8 GB is tight.
- **Endpoints:** one Windows VM as a "ward PC" with Sysmon and the Wazuh agent; one Linux VM running a small
  stand-in HIS (a web app you write, logging JSON audit lines) with the agent and Suricata.
- **Network:** a host-only or internal virtual network — never bridged to your home or college network. The
  medical-device VLAN does not exist in your lab: its traffic arrives as replayed Zeek conn logs.
- **Everything else** — a week of hospital activity, the scenarios — is synthetic and replayed.

## Success metrics, fixed before you build

| What | Target | Measured by |
|---|---|---|
| Log sources | Windows (Security + Sysmon), Linux, HIS audit, Suricata, Zeek all searchable in one schema | A source-health panel; an alert when any source is silent for an hour |
| Detections | At least 8, each mapped to ATT&CK, each with a positive and a negative test | The replay harness over the synthetic week |
| Noise | Every rule's precision on the replayed week reported; no rule below 0.5 after tuning without a written reason | The replay table, before and after |
| Response | The staged incident detected, triaged, contained and closed; time to detect and to contain reported | The incident timeline |
| Vulnerabilities | Every asset in the inventory; findings tiered P1–P4 with SLAs; overdue and exceptions reported | The SLA report |
| Reporting | An incident report and a one-page monthly report a Medical Superintendent can act on | Read by someone outside security |

## Risks to write down on day one

1. **Clinical systems cannot simply be switched off.** Containment that stops OPD registration is itself an
   incident. Every playbook says what the hospital does manually while a system is isolated.
2. **Devices you cannot touch.** Pumps and imaging modalities run vendor software; you watch them from the
   network and segment them, you do not install agents.
3. **Legitimate bulk access looks like theft.** Medical-records clerks open hundreds of files a day. Detections
   must know roles and hours or they will drown the SOC.
4. **Patient data is sensitive personal data** under the DPDP Act. A leak brings reporting duties (in outline,
   from Security Obligations in India) as well as a clinical one.
5. **Your own lab is not the hospital.** Say which numbers come from real tools on your lab and which from
   replayed synthetic data — on every slide.

## The reference architecture

    ward PC VM  (Sysmon + Wazuh agent) ───────┐
    HIS VM      (JSON audit log + agent)  ────┼──► Wazuh server: decoders, rules, alerts ──► dashboard
                (Suricata eve.json)        ───┤          │                                   source health
    replayed    Zeek conn.log (device VLAN) ──┘          ▼
                                             Sigma rules in Git ──► pySigma ──► queries / Wazuh rules
    replay harness (Python): synthetic week + answer file ──► precision, recall, coverage per rule
    incident exercise: exercise log + alerts + responder log ──► timeline, TTD, time to contain
    vulnerability programme: inventory + scan results ──► tiers P1–P4, SLA report, exceptions register

## Milestones (about four weeks part-time)

| Milestone | Done when |
|---|---|
| M1 — Plan | SOC.md written: assets, risks, log sources, detection goals, success metrics, what is out of scope |
| M2 — Lab and sources | Every source onboarded and searchable; source-health alert tested by stopping an agent |
| M3 — Detections | Eight or more rules, tested, tuned and replayed; dashboard built |
| M4 — Response and vulnerabilities | Exercise run and written up; inventory, findings, SLA report, exceptions register |
| M5 — Reports and demo | Incident report, monthly report, a rehearsed ten-minute demo |

## What "done" means

A reviewer clones your repository, runs the replay harness and gets your precision table; opens your SIEM (or
your recording of it) and sees an alert you can walk from first look to closure; reads your incident report and
can tell what happened, what was done and what changes next; and reads the vulnerability report and knows which
three things to fund this month.`,
    workedExample: `**A one-page SOC.md for Option A (abridged).**

**The organisation.** Nallamala District Hospital (fictional): 300 beds, six wards plus ICU, 120 HIS users across
nurses, doctors, medical records (MRD) and billing. IT team of four; no SOC today. Our SOC is an MSSP-style
service: L1 by day, alerts paged to an on-call L2 at night.

**Crown jewels.** HIS application and database (registration, records, orders); PACS imaging; the laboratory
system; the domain controller and file server that every one of them depends on.

**Top risks.** (1) Ransomware stopping registration, lab and imaging. (2) Bulk theft of patient records through
a stolen staff login. (3) Medical devices reaching the internet. (4) Leavers' accounts still active.

**Log sources.** Windows Security and Sysmon (ward PCs, DC, file server); HIS audit log (JSON); Linux auth and
journald (HIS server); Suricata alerts and Zeek connection logs at the core switch, including the device VLAN.
Everything normalised to ECS-style field names, stored in UTC, displayed in IST.

**Detection goals (first eight).** Password spraying on the HIS; one user opening far more patient records than
their role does; an account added to Administrators without a change ticket; shadow copies deleted; Office
starting a shell; device VLAN traffic leaving the hospital; a leaver signing in; scheduled-task persistence.
Each mapped to ATT&CK and tested both ways.

**Response.** Severity P1–P4 with acknowledgement targets; playbooks for ransomware, account takeover and data
exposure, each with the manual fallback the wards use while a system is isolated. Evidence hashed and logged.

**Vulnerabilities.** Monthly authenticated scans of servers and PCs we are authorised to scan; tiers P1–P4 with
7/15/30/90-day SLAs; exceptions only with a compensating control, an approver and an end date.

**Reports.** Incident reports within a week; a one-page monthly report for the Medical Superintendent: what was
detected, what is overdue, three decisions needed.

**Not doing:** agents on medical devices, an EDR product, 24×7 human staffing, real patient data.`,
    mcqs: [
      mcq('A student choosing Option A plans to install the Wazuh agent on the infusion pumps "for full coverage". What should the plan say instead?', [
        ['Watch the device VLAN from the network sensor and segment it; vendor devices take no agent', true],
        ['Install the agent only on pumps in the ICU, since those are the ones most likely to be attacked', false],
        ['Ask the vendor for the pumps\' admin passwords so the SOC can log in and collect their logs daily', false],
        ['Leave the pumps out of scope entirely, because a district hospital\'s devices are rarely targeted', false],
      ], 'Medical devices run certified vendor software, so changing them can break the certification or the device. The defender sees them from Zeek and Suricata and limits what they can reach. Leaving them out ignores a stated risk.'),
      mcq('Why does the hospital plan display times in IST but store them in UTC?', [
        ['Sources arrive in mixed zones; one stored zone keeps the timeline in order', true],
        ['Wazuh refuses to index any event whose timestamp is not written in UTC', false],
        ['IST changes with daylight saving, so stored IST times would drift twice a year', false],
        ['UTC timestamps are shorter, which keeps the index small on a laptop lab', false],
      ], 'Logs, Sources, Collection and Normalisation made this point: the HIS writes local time, Windows writes UTC, Zeek writes epoch seconds. Storing one zone keeps ordering correct. India has no daylight saving, and Wazuh accepts other zones.'),
      mcq('Which success metric belongs in the capstone plan for detections?', [
        ['Every rule tested both ways and its precision on the replayed week reported', true],
        ['At least fifty rules enabled, because coverage grows with the number of rules', false],
        ['Zero false positives in the first week, so the SOC is never disturbed at night', false],
        ['Every Wazuh default rule left on, since the vendor has already tuned all of them', false],
      ], 'A rule earns its place by firing on the behaviour and staying quiet on look-alikes, which only tests and measured precision show. Rule counts measure effort, not coverage; zero false positives usually means rules too narrow to catch anything.'),
    ],
    checkpoint: [
      mcq('Nallamala\'s MRD clerks open 50–85 patient records an hour while coding discharge files. How should the bulk-access detection treat them?', [
        ['A higher, documented limit for MRD in office hours, still alerting above it', true],
        ['Exclude MRD users from the rule entirely, since their high volume is expected and documented', false],
        ['Keep one limit of 40 for everyone, so no account is treated differently', false],
        ['Alert on MRD only outside office hours and not at all during the day', false],
      ], 'Role-aware limits keep the rule quiet on normal work without creating a blind spot. A full exclusion means a stolen MRD login is never seen; one limit for all raises an alert every hour of every working day.'),
      ck(NET, 'The capstone plan for Nallamala must decide what the medical-device VLAN may reach. Which rule fits?', [
        ['Only the device-management server, PACS and listed vendor hosts; deny the rest and log it', true],
        ['Anything inside 10.0.0.0/8, since internal traffic between hospital systems is trusted', false],
        ['Anything on port 443, because encrypted traffic from medical devices is assumed to be vendor updates', false],
        ['Everything, with Suricata alerts on known-bad signatures as the only control in place', false],
      ], 'Least-privilege segmentation (Firewalls, Segmentation and Least-Privilege Networks) lists what devices need and denies the rest, which also makes any other connection an alert. Trusting all internal or all 443 traffic gives an intruder the same reach.'),
      ck(IR, 'Isolating the HIS server would stop ransomware spreading but also stop OPD registration. What must the hospital\'s playbook already contain?', [
        ['The manual fallback for registration and who authorises isolating a clinical system', true],
        ['A rule that clinical systems are never isolated, whatever the incident turns out to be', false],
        ['The vendor\'s phone number, since only the vendor may decide on isolating its server', false],
        ['A promise to restore from backup within the hour, so isolation never affects patients', false],
      ], 'Containment of a clinical system is a business decision made in advance: who decides, and how wards keep working on paper meanwhile. Never isolating lets ransomware spread; a restore time is a target, not a guarantee.'),
    ],
  },

  /* ── BUILD_MONITORING ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CAPSTONE_BUILD_MONITORING',
    notes: `**The monitoring half of the SOC: every source searchable, eight or more detections that are tested both
ways, a precision table you can defend, and a dashboard someone would actually open.** The skills come from A SIEM
with Wazuh and Elastic, Detection Engineering with Sigma, Tuning Detections and Fighting Alert Fatigue and SOC
Dashboards and Metrics, on top of Windows for Defenders: Event Logs and Sysmon and Network Detection with Suricata
and Zeek. This unit is the build brief, with Option A's real replay results so you know what "working" looks like.

## The repository

    nallamala-soc/
      SOC.md  README.md  DETECTIONS.md
      lab/        vm-notes.md  wazuh/local_rules.xml  wazuh/ossec-agent.conf  sysmon/config.xml
      data/       gen_hospital.py   (writes the synthetic week; answers.csv kept apart)
      rules/      *.yml             (Sigma, one file per detection)
      converted/  *.txt             (real pySigma output)
      replay/     replay.py  tests/
      dashboard/  export.ndjson  screenshots/

## Step 1 — The lab

Build the VMs on a host-only network (from the Brief). On the Windows VM install Sysmon with a community-maintained
configuration as your base — \`sysmon64.exe -accepteula -i config.xml\` — and the Wazuh agent pointed at your
server. On the Linux VM, the stand-in HIS writes one JSON line per action to \`/var/log/nh-his/audit.jsonl\`, and
the agent reads it and Suricata's eve.json:

    <localfile>
      <log_format>json</log_format>
      <location>/var/log/nh-his/audit.jsonl</location>
    </localfile>
    <localfile>
      <log_format>json</log_format>
      <location>/var/log/suricata/eve.json</location>
    </localfile>

These lines were written from the Wazuh documentation and not run here. **Prove each source arrives** before
writing a single detection: search for one known event from each, and write down the field names you actually see.

## Step 2 — The synthetic week

\`gen_hospital.py\` (seeded) writes a Monday-to-Sunday week for the hospital in three formats, on purpose:

- \`his_audit.csv\` — the HIS audit log: local IST, day-first, no zone (\`16-11-2026 07:00:00\`)
- \`windows.jsonl\` — Security and Sysmon-style events, ECS-like field names, UTC with \`Z\`
- \`conn.log\` — Zeek conn log from the device VLAN, epoch seconds, with Zeek's \`uid\`

Background follows real shifts: nurses on three shifts opening 4–14 records an hour, doctors on rounds, MRD
clerks opening 45–85 an hour, a backup agent that runs \`vssadmin list shadows\` nightly, and an approved vendor
remote-support session to the CT scanner every morning. Seven labelled scenarios sit in it, with the labels in
\`answers.csv\`, never in the data your rules read:

    HIS audit 67,179 | Windows 6,312 | conn 6,780 | labelled malicious 242 in 7 scenarios

The scenarios: password spraying on the HIS from a paediatric ward PC at 01:05 on Wednesday; the sprayed nurse
account then opening 180 records and exporting; an account created and added to Administrators at 02:10 with no
change ticket; shadow copies deleted on the file server; Word starting PowerShell on a billing PC; the infusion-pump
gateway calling an outside address every five minutes for two hours; a doctor who left in October still signing in.

## Step 3 — Detections as Sigma, mapped to ATT&CK

| Rule | Detects | ATT&CK |
|---|---|---|
| D1 | 10+ distinct users failing from one source in 10 minutes (sliding) | T1110.003 Password Spraying |
| D2 | One user opening more than 40 distinct patients in an hour | T1213 Data from Information Repositories |
| D3 | A member added to Administrators | T1098 Account Manipulation |
| D4 | Shadow copies deleted | T1490 Inhibit System Recovery |
| D5 | Device VLAN traffic to an address outside the hospital | T1071.001 Web Protocols |
| D6 | An Office application starting a shell or script host | T1059.001 PowerShell |
| D7 | A leaver's account signing in | T1078 Valid Accounts |
| D8 | A scheduled task created on a ward PC | T1053.005 Scheduled Task |

Where Sigma fits (D3, D4, D6, D8), keep the rule in \`rules/\` and commit the converted query. D4, converted with
pySigma's Elasticsearch backend and the \`ecs_windows\` pipeline, really printed:

    Lucene: (process.executable.caseless:*\\\\vssadmin.exe AND (process.command_line:*delete* AND
             process.command_line:*shadows*)) OR (process.executable.caseless:*\\\\wmic.exe AND
             (process.command_line:*shadowcopy* AND process.command_line:*delete*))

Counting rules (D1, D2) need the SIEM's aggregation. In Wazuh, D1 is a frequency rule on a child of the HIS
failed-login rule (written from the documentation, not run):

    <rule id="100210" level="10" frequency="10" timeframe="600">
      <if_matched_sid>100201</if_matched_sid>
      <same_field>src_ip</same_field>
      <description>HIS: 10 or more failed logins from one source in 10 minutes</description>
      <mitre><id>T1110.003</id></mitre>
    </rule>

Wazuh counts events, not distinct users — say so in DETECTIONS.md, and check the distinct count in the replay.

## Step 4 — Replay, measure, tune

\`replay.py\` runs every detection over the week in pandas and scores each alert against \`answers.csv\`. The
first run, rules D1–D6 as first written:

    FIRST RUN - 80,271 events replayed
                      alerts  tp   fp  precision
    rule
    D1 HIS spray           1   1    0       1.00
    D2 bulk records      163   1  162       0.01
    D3 admin add           2   1    1       0.50
    D4 shadow delete       1   1    0       1.00
    D5 device egress       8   1    7       0.12
    D6 office shell        1   1    0       1.00
      (six "caught" lines)
      MISSED  S7 leaver account used
    D2 false positives by role: {'mrd': 162}
    all alerts: 176 | true positives: 6 | overall precision 0.03

Three tuning decisions, each written in DETECTIONS.md with its reason: D2 gets a **higher limit (120) for MRD in
office hours**, not an exclusion; D3 alerts only when the change has no ticket (the Tuesday change CHG-2611 was
approved); D5 allow-lists the CT vendor's support host by source, destination and port, citing the contract. The
missed scenario becomes a new rule, D7, joining sign-ins to HR's leavers list. Second run:

    TUNED - 80,271 events replayed
                      alerts  tp  fp  precision
    rule
    D1 HIS spray           1   1   0        1.0
    D2 bulk records        1   1   0        1.0
    D3 admin add           1   1   0        1.0
    D4 shadow delete       1   1   0        1.0
    D5 device egress       1   1   0        1.0
    D6 office shell        1   1   0        1.0
    D7 leaver login        2   2   0        1.0
      (seven "caught" lines)
    all alerts: 8 | true positives: 8 | overall precision 1.00

**Do not present 1.00 as a result.** You wrote the data and you know the answers. Say so, then make it honest:
swap weeks with a classmate and run your rules on their week without reading their answer file. That number is
the one the panel will believe.

## Step 5 — The dashboard

One page, four panels, each tied to a decision (SOC Dashboards and Metrics): alerts by rule and disposition this
week (the tuning backlog); **source health** — last event per source, red if silent for an hour; open incidents by
severity and age; ATT&CK coverage — the eight techniques, tested or not. Test the source-health panel by stopping
the Windows agent and watching it turn red.

## Deliverables

1. The repository above; \`gen_hospital.py\` seeded; answers kept apart from the data.
2. Every source onboarded, with one screenshot or saved search per source showing a real event from your lab.
3. At least eight detections: Sigma where it fits, real converted output, the counting rules in your SIEM, each
   with a positive and a negative test in \`replay/tests/\`.
4. The replay table before and after tuning, every tuning decision with its reason, and the blind-swap result.
5. The dashboard (export and screenshots) with the source-health alert demonstrated.

## Acceptance checks

- \`python replay/replay.py\` on a fresh clone prints your table.
- Deleting the answer file breaks scoring, not detection: no rule reads a label.
- Every rule has a test that fires and a look-alike that does not (the nightly \`vssadmin list shadows\` for D4).
- Stopping an agent raises the source-health alert within the hour.

## Common traps

- **\`is_private\` is not "inside the hospital".** Python's \`ipaddress\` marks the documentation ranges
  (198.51.100.0/24, 203.0.113.0/24) as private, so a first D5 using \`is_private\` raised nothing at all. Write
  the hospital's own ranges down and test against them.
- **Hour windows in the wrong zone.** Flooring UTC to the hour gives IST windows from :30 to :30; the MRD
  office-hours limit then applies to the wrong half-hours. Floor in the zone the rule is about.
- **Labels in the data.** A detection that can see \`scenario\` is grading itself.
- **Exclusions that blind.** "Ignore MRD" also ignores a stolen MRD login at 2 a.m.`,
    mcqs: [
      mcq('Nallamala\'s first D5 rule kept device-VLAN connections whose destination was not `is_private`, and it raised no alerts at all on the replayed week. Why?', [
        ['Python treats the documentation ranges used for outside hosts as private, so they were all dropped', true],
        ['Zeek writes epoch seconds, so pandas could not sort the connection rows and silently returned an empty frame', false],
        ['The device VLAN uses 10.30.0.0/24, which `ipaddress` cannot parse without a strict=False flag set', false],
        ['The beaconing used port 443, and `is_private` removes all encrypted connections before matching', false],
      ], 'Python\'s ipaddress flags 198.51.100.0/24 and 203.0.113.0/24 as private because they are reserved, so every "outside" host looked internal. Writing the hospital\'s own ranges fixed it; time format and ports had nothing to do with it.'),
      mcq('After tuning, the replay shows precision 1.00 for every Nallamala rule. What should the capstone report say?', [
        ['That the author knew the answers, and give the result of running the rules on a classmate\'s blind week', true],
        ['That the rules are complete, so the SOC can switch them on in production without further testing', false],
        ['That precision is meaningless for detections written in pandas, so only the number of alerts raised should be reported', false],
        ['That tuning should be undone, since a perfect score proves the rules were overfitted to the week', false],
      ], 'Rules tuned on data you generated will fit it. A blind week someone else wrote is the fair test; precision is a useful number, and tuning with stated reasons is still right.'),
      mcq('The Wazuh frequency rule for HIS password spraying fires when one IP fails 10 times in 10 minutes. What gap should DETECTIONS.md record?', [
        ['It counts failed events, so one user mistyping ten times also fires it', true],
        ['It cannot see IP addresses, because the HIS audit log is JSON', false],
        ['It needs a Sigma rule first, or Wazuh will not load the XML rule', false],
        ['It only runs once per day, so a short spray could be missed', false],
      ], 'Spraying is many users, few attempts each; a frequency rule counts events. The JSON decoder does extract fields, Wazuh rules need no Sigma source, and frequency rules are evaluated as events arrive.'),
    ],
    assignment: {
      title: 'Capstone: Monitoring and Detection',
      description: 'Build the lab, onboard every log source, write and test at least eight ATT&CK-mapped detections, measure and tune them on a replayed week, and build the SOC dashboard.',
      instructions: `Build the monitoring side of the SOC for the option you chose in the Brief, as described in this unit's
notes. Work only on your own machines and a host-only virtual network. Submit a repository link or a zip.

**Submit:**

1. The repository: \`SOC.md\`, lab notes and configuration, the data generator (seeded), \`rules/\`,
   \`converted/\`, \`replay/\` with tests, and \`DETECTIONS.md\`.
2. Evidence that each log source arrives: one saved search or screenshot per source, with the field names used.
3. The replay table before and after tuning, each tuning decision with its reason and the risk it accepts, and
   your rules' result on a classmate's week you did not see.
4. The dashboard export and screenshots, including the source-health alert firing when an agent is stopped.
5. A short note on what is real (lab tools, your events) and what is replayed synthetic data.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Lab and log sources', description: 'Host-only lab; Windows with Sysmon, Linux, application audit, Suricata and Zeek all searchable; normalised field names; UTC stored; source health monitored and tested.', maxPoints: 20 },
        { criterion: 'Detections', description: 'At least eight rules mapped to ATT&CK; Sigma where it fits with real converted output; counting rules in the SIEM; limits of each rule written down.', maxPoints: 25 },
        { criterion: 'Testing and measurement', description: 'A positive and a look-alike test per rule; replay harness with labels kept apart; precision per rule; missed scenarios reported; a blind-week result.', maxPoints: 20 },
        { criterion: 'Tuning', description: 'Each change justified with numbers; role- or contract-based limits instead of blanket exclusions; the accepted risk stated for each.', maxPoints: 15 },
        { criterion: 'Dashboard', description: 'Panels tied to decisions: disposition by rule, source health, open incidents, ATT&CK coverage with tested status.', maxPoints: 10 },
        { criterion: 'Documentation and honesty', description: 'A stranger can rebuild the lab and rerun the replay; real versus synthetic is labelled everywhere.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  /* ── BUILD_RESPONSE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CAPSTONE_BUILD_RESPONSE',
    notes: `**The response half: an incident staged safely on your own lab and handled end to end, a vulnerability
programme for the organisation's assets, and the reports leaders read.** It draws on the whole Incident Response
topic — The Incident Response Lifecycle, Triage and Scoping, Evidence and Forensics Basics, Containment, Eradication
and Recovery, Playbooks, Reporting Incidents and Learning from Them — and on Vulnerability Management (the
lifecycle, authorised scanning, Prioritising with CVSS, EPSS and Known-Exploited Lists, Patching, Compensating
Controls and Verification), with Security Obligations in India for the reporting duties.

## Part 1 — The exercise, staged safely

**Rules of engagement, written first.** Only your own lab VMs, on the host-only network. Take a snapshot of every
VM before you start. No malware, no attack tools, nothing from the internet except the EICAR test file. Keep an
**exercise log** — what you staged and exactly when — in a file the "SOC" (also you) does not read until the
review. Afterwards, run every cleanup step and restore the snapshots.

The staged steps for Option A, exercise EX-01:

| Step | What you do | Stands in for |
|---|---|---|
| X1 | Append 31 synthetic failed-login lines from 10.20.3.14 to the HIS audit log | Password spraying |
| X2 | Append synthetic record-view lines for \`n_paed07\` from the same IP | Bulk patient-record access |
| X3 | Save the EICAR anti-malware test file in the Windows VM's Downloads folder | A malicious attachment |
| X4 | Run a documented, benign detection test for scheduled-task persistence, then its cleanup | Persistence |
| X5 | Create a clearly named test account and add it to local Administrators with the normal admin tools | A rogue admin |

EICAR is a harmless file that every antivirus product agrees to detect, published by EICAR for exactly this:
download it from EICAR's official page, inside the VM only, and expect Defender to quarantine it — that is the
test. For X4, use a test from a detection-testing library you are authorised to use, chosen because it only creates
a harmless artefact and documents its cleanup; record the time you ran it.

## Part 2 — Responding, and the timeline

Work the alerts as L1 then L2, keeping a **responder log** (ISO times with +05:30). Then merge the three sources
— the exercise log (IST, day-first, no zone), Wazuh's \`alerts.json\` (UTC, \`+0000\`) and your responder log —
into one IST timeline. Option A's rehearsal, run through \`timeline.py\` (the responder lines are cut at 70
characters by the script):

    10:00:00 EXERCISE  X1 replay 31 failed HIS logins from 10.20.3.14 (synthetic lines)
    10:01:12    WAZUH  rule 100210 L10 nh-lab-his: HIS: 10+ users failed login from one source in 10 min
    10:03:40 RESPONSE  acknowledged alert 100210; enrichment: 10.20.3.14 is ward PC nh-ward-p
    10:07:00 EXERCISE  X2 replay bulk record views by n_paed07 (synthetic lines)
    10:09:58    WAZUH  rule 100220 L12 nh-lab-his: HIS: one user viewed over 40 patients in an hour
    10:12:05 RESPONSE  acknowledged 100220; same source IP; escalated to L2 as one incident I
    10:15:00 EXERCISE  X3 EICAR test file saved to Downloads on nh-lab-win01
    10:15:41    WAZUH  rule 100230 L12 nh-lab-win01: Defender detection on a ward PC
    10:18:30 RESPONSE  raised to P1: malware alert on nh-lab-win01; HIS account n_paed07 used
    10:19:00 EXERCISE  X4 documented benign scheduled-task detection test on nh-lab-win01
    10:22:00 EXERCISE  X5 test account nh_ex_admin created and added to local Administrators
    10:22:05    WAZUH  rule 100250 L10 nh-lab-win01: Member added to local Administrators
    10:27:10 RESPONSE  contained: nh-lab-win01 network adapter disconnected in the hypervisor
    (evidence, eradication and recovery lines at 10:41, 11:20 and 11:55)
    12:30:00 RESPONSE  closed INC-0001; review booked for 27/11

    Step  expected  detected  delay
    X1    100210    10:01:12   1.2 min
    X2    100220    10:09:58   3.0 min
    X3    100230    10:15:41   0.7 min
    X4    100240    MISSED    -
    X5    100250    10:22:05   0.1 min

    TTD 1.2 min | TTA 2.5 min | time to contain 26.0 min | TTR (detected to closed) 149 min

The alert and responder records shown are a synthetic rehearsal shaped like the lab's output; yours will be your
own. Two things in it are worth more than the fast numbers. **X4 was missed**: Windows records a scheduled task
being created as Security event 4698 only when the "Other Object Access Events" audit subcategory is enabled, and
the lab's policy did not enable it — a gap that becomes a policy change, a rule (D8) and a re-test. And containment
took 26 minutes because the analyst waited to be sure; write down whether that was right for a ward PC.

In the lab, isolation is disconnecting the VM's network adapter — your stand-in for EDR isolation (Endpoint
Protection and EDR). Disabling \`n_paed07\` in the HIS, resetting the password and re-enrolling MFA follows the
account-takeover playbook.

## Part 3 — Evidence

Copy what you collected (alerts export, HIS audit export, the VM's event logs), hash each with SHA-256, and record
who collected what, when, from where, in a custody log (Evidence and Forensics Basics):

    alerts.json       sha256 12ff5aa241056e45...  collected by L2 2026-11-25 10:41 IST
    response_log.csv  sha256 1033cb976a6789ec...  collected by L2 2026-11-25 10:41 IST

Re-hash before you hand anything over; a changed hash is a broken chain.

## Part 4 — The vulnerability programme

**Inventory first.** List every asset with its role, criticality and exposure — the HIS server, its database,
PACS, a vendor-locked radiology workstation, the lab system, DC, file server, the public website with OPD
appointments, ward and billing PCs. A finding on an asset not in the inventory stops the report (the script
asserts it).

**Scanning.** Run an authenticated scan with OpenVAS / Greenbone in outline against **your own lab VMs only**, and
read its report as Vulnerability Scanning, Done Properly taught. The hospital-scale findings are synthetic, with
fictional CVE-like ids and invented EPSS-like and known-exploited flags — real CVEs carry real, changing values you
would look up, never guess.

**Tiers and SLAs.** Use the tiers from Prioritising with CVSS, EPSS and Known-Exploited Lists (exploited and
exposed is P1), with the hospital's own SLAs — 7, 15, 30 and 90 days — written in the plan. \`vuln_sla.py\` on
30 November 2026:

    fid         host           vuln tier        due     state  days_over
    V02 nh-his-app01  CVE-XXXX-0102   P1 2026-11-23   OVERDUE          7
    V09     nh-web01 TLS1.0-ENABLED   P3 2026-09-02   OVERDUE         89
    V08      nh-fs01  CVE-XXXX-0108   P3 2026-11-04   OVERDUE         26
    V03  nh-his-db01  CVE-XXXX-0103   P3 2026-11-11   OVERDUE         19
    V14     nh-lis01  CVE-XXXX-0114   P4 2026-10-04   OVERDUE         57
    V05 nh-pacs-ws03  CVE-XXXX-0105   P2 2026-09-29 exception          0
    V10     nh-web01  CVE-XXXX-0110   P2 2026-12-08  on track          0
    V12 nh-bill-pc02  CVE-XXXX-0111   P2 2026-12-01  on track          0
    V06     nh-lis01  CVE-XXXX-0106   P4 2027-01-24  on track          0

    Closed this period: 5, within SLA 4 of 5
    Open by tier: {'P1': 1, 'P2': 3, 'P3': 3, 'P4': 2} | overdue: {'P1': 1, 'P3': 3, 'P4': 1}
    Exceptions: V05 valid until 2027-03-31; V09 REJECTED (no compensating control)
    Critical assets with an open P1/P2: ['nh-his-app01']

Read it as a leader would. One P1 — a known-exploited flaw on the internet-facing HIS server — is a week overdue:
that is the headline. V05, the radiology workstation whose vendor certifies only its old OS, has a valid exception
because it has a compensating control (imaging VLAN, only PACS and the modality may reach it, USB off, an alert on
anything else), an approver and an end date. V09's exception was rejected — no compensating control — so it is back
in SLA tracking, 89 days late. And V11/V12 show patch coverage: the same flaw was fixed on a ward PC but is still
open on a billing PC. **Closed means gone on the re-scan**, not "ticket closed".

## Part 5 — The reports

1. **Incident report** for INC-0001 (Reporting Incidents and Learning from Them): a five-line summary a Medical
   Superintendent understands; the timeline; scope; impact (records viewed and exported — synthetic here);
   actions; root causes; follow-ups with owners. Add the reporting decision in outline: would CERT-In's directions
   and the DPDP Act's breach duties apply if this were real, and who would decide? Do not quote deadlines from
   memory — cite the current text.
2. **Blameless review** of the exercise: X4's gap, the 26-minute containment, what changes.
3. **One-page monthly report**: what was detected, time to detect and contain, overdue P1/P2s, the exceptions,
   and three decisions needed (for example: "approve a maintenance window to patch V02 this week").

## Deliverables and acceptance checks

1. \`EXERCISE.md\`: rules of engagement, the exercise log, cleanup done and snapshots restored.
2. The responder log, \`timeline.py\` and its output; evidence hashes and a custody log.
3. The inventory, findings, \`vuln_sla.py\` output, the exceptions register and one real lab scan report.
4. The incident report, the blameless review and the monthly report.

A reviewer should find every staged step either detected (with its delay) or listed as a gap with a fix.

## Common traps

- **Staging and responding from the same notes.** If the SOC reads the exercise log, the detection times are
  fiction.
- **Mixed clocks.** Wazuh writes \`+0000\`, the exercise log has no zone, the responder log has \`+05:30\` —
  parse each explicitly.
- **"Patched" without a re-scan.** A closed ticket is not a fixed host.
- **Exceptions without an end.** An exception with no compensating control or expiry is a risk nobody owns.`,
    mcqs: [
      mcq('Nallamala\'s exercise timeline shows X4, the scheduled-task test, as MISSED. What is the right follow-up?', [
        ['Enable the audit subcategory that records event 4698, add the rule, and re-run the test', true],
        ['Remove X4 from the report, since it was only a test and nothing harmful ever ran on the ward PC', false],
        ['Lower every rule\'s level so that more alerts reach the dashboard during exercises', false],
        ['Replace the benign test with real malware next time, so the antivirus will notice it', false],
      ], 'A missed step is the most valuable finding of an exercise: here the event was never logged. Logging, a rule and a re-test close it. Hiding it wastes the exercise, and real malware has no place in a lab exercise.'),
      mcq('The radiology workstation V05 cannot be patched because its vendor certifies only the old OS. Which exception would the capstone accept?', [
        ['Imaging VLAN with only PACS and the modality reachable, USB off, an approver and an end date', true],
        ['An exception approved by the IT head with no end date, since the vendor may never update', false],
        ['An exception noting that the workstation is inside the hospital, so it cannot be reached', false],
        ['A plan to patch it anyway at night, since the vendor will not find out what was installed', false],
      ], 'An exception needs a control that reduces the risk, an owner and an expiry, as Patching, Compensating Controls and Verification taught. "Inside the network" is not a control, and patching against the vendor\'s certification risks a clinical device.'),
      mcq('The SLA report says V02, a known-exploited flaw on the internet-facing HIS server, is 7 days overdue. How should the monthly report present it?', [
        ['As the headline, with the decision needed: a maintenance window this week', true],
        ['As one row among nine, sorted by host name like the others in the table', false],
        ['Only as a count of overdue findings, since leaders do not read finding ids', false],
        ['After the closed findings, so the month\'s progress is read before problems', false],
      ], 'A leader\'s report leads with the risk that matters most and the decision it needs. Burying it in a sorted table or a count hides the one finding most likely to be used against the hospital.'),
    ],
    assignment: {
      title: 'Capstone: Response, Vulnerabilities and Reporting',
      description: 'Stage a safe incident on your own lab and handle it end to end, run a vulnerability programme for the organisation\'s assets, and write the reports leaders read.',
      instructions: `Build the response side of the SOC for your option, as described in this unit's notes. Stage the exercise
only on your own lab VMs; use no malware and no attack tools. Submit a repository link or a zip.

**Submit:**

1. \`EXERCISE.md\` — rules of engagement, the exercise log kept apart from the SOC view, cleanup and snapshot
   restore recorded.
2. The responder log, the merged timeline with detection delay per step, TTD, TTA and time to contain, and every
   missed step written up as a gap with its fix and re-test.
3. Evidence: the collected files' SHA-256 hashes and a custody log.
4. The vulnerability programme: inventory, one real scan report from your lab VMs, the findings, tiers and SLAs,
   the SLA report, and an exceptions register.
5. The incident report (with the reporting decision in outline), a blameless review and a one-page monthly report.

**Before you submit,** go through each acceptance check in the notes and point to where it is met.`,
      rubric: [
        { criterion: 'Safe, controlled exercise', description: 'Written rules of engagement; own lab only; snapshots; EICAR and documented benign tests only; exercise log kept apart; cleanup done.', maxPoints: 15 },
        { criterion: 'Detection and response', description: 'Alerts triaged and escalated with clear notes; severity justified; containment chosen with its clinical or business cost; eradication and recovery verified.', maxPoints: 25 },
        { criterion: 'Timeline and evidence', description: 'All sources merged in one zone; delay per step; TTD, TTA and time to contain; misses turned into fixes; hashes and a custody log.', maxPoints: 15 },
        { criterion: 'Vulnerability programme', description: 'Complete inventory; authorised lab scan read correctly; risk-based tiers and SLAs; overdue tracked; exceptions only with controls, approvers and end dates; closure verified by re-scan.', maxPoints: 25 },
        { criterion: 'Reports for leaders', description: 'Incident report and monthly report a non-specialist can act on; decisions asked for; reporting duties in outline with sources cited.', maxPoints: 15 },
        { criterion: 'Blameless review', description: 'What happened, why, and what changes, without blaming a person; follow-ups with owners and dates.', maxPoints: 5 },
      ],
      totalPoints: 100,
    },
  },

  /* ── DEFENCE ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CAPSTONE_DEFENCE',
    notes: `**A SOC hiring panel — usually a SOC lead, a senior L2 or L3 analyst, sometimes a manager from the client
side — wants to see you work an alert, not describe one.** Ten minutes of demo, twenty of questions. This unit is
the script, the questions and what a strong answer contains.

## The ten-minute demo

| Time | Show | Say |
|---|---|---|
| 0:00–1:00 | The organisation and its risks | Crown jewels, the four risks, what the SOC watches and what it cannot |
| 1:00–2:30 | Source health | Every source arriving; stop an agent and show the panel turn red |
| 2:30–5:30 | One alert, start to finish | D2 fires on \`n_paed07\`: enrichment, the linked spray from the same ward PC, severity, escalation note, containment |
| 5:30–7:00 | Detection quality | The replay table before and after tuning; the MRD limit and why it is not an exclusion; the blind-week result |
| 7:00–8:30 | Vulnerabilities | The SLA report: the overdue P1 on the HIS server, the exception with its control, the rejected one |
| 8:30–10:00 | What you learnt | The missed X4 and its fix; what you would build next |

Record each live step beforehand. If the lab fails on the day, say so, play the recording and continue — a SOC
lead has seen many demos fail and judges how you handle it.

## The questions, and what a strong answer contains

1. **"Walk me through this alert as if it were 2 a.m. and you were alone."** Read the rule and what it means;
   enrich user, host and IP; look for related alerts (the spray from the same PC); decide true or false positive
   with evidence; severity by asset and impact; the escalation note in four lines; who you page.
2. **"Why is D2's limit 40, and why 120 for MRD?"** Nurses' and doctors' hourly maxima from the baseline week;
   MRD's maximum of 85 plus margin; office hours only. Admit the cost: an attacker using an MRD login in the day
   gets more room.
3. **"Your precision is 1.00. Why should I believe it?"** You wrote the data, so it is not evidence; the blind
   week is. Give that number and what it missed.
4. **"Which ATT&CK techniques are you blind to?"** Name them from the coverage panel — for example phishing
   delivery (no mail logs in the lab) and lateral movement between servers — and the log source each would need.
5. **"A log source goes silent at 1 a.m. What happens?"** The source-health alert; first check the agent and
   the pipeline, not the attacker; silence on a critical source is treated as a possible incident until explained.
6. **"How do you watch devices you cannot touch?"** Zeek and Suricata on the device VLAN; an allow-list of
   destinations; D5's alert on anything else; segmentation as the control.
7. **"The vendor's remote-support session to the CT scanner — why is that allowed?"** It is in the contract,
   pinned by source, destination and port, and reviewed; anything else from that host still alerts.
8. **"Why did containment take 26 minutes?"** What you were confirming, what isolating a clinical PC costs, and
   what you would do differently. Do not pretend it was instant.
9. **"How do you know eradication worked?"** Snapshot comparison, the test account and task removed, rules
   re-run, the account's sign-ins watched for a week.
10. **"Would this be reportable?"** In outline: a CERT-In-reportable incident and a personal-data breach under the
    DPDP Act are separate questions; who decides; the current text, not a remembered deadline.
11. **"Why is a 7.5 ahead of a 9.8 in your vulnerability list?"** Known-exploited and internet-facing beats a
    higher score on an internal test server; that is what the tiers encode.
12. **"Your exception for the radiology workstation — what stops it lasting forever?"** The end date, the named
    approver, the review, and the alert that proves the compensating control is working.
13. **"What did the exercise teach you that the lessons did not?"** A specific answer: the audit policy that hid
    X4, or how long it takes to decide to isolate.
14. **"With two more weeks, what would you build?"** One thing tied to evidence — the X4 rule's tests, mail logs
    for phishing coverage — not "AI".
15. **"What would change in a bank?"** Payment systems and fraud teams, RBI expectations, branch PCs on thin
    links; the same loop.

## Rehearse with these

Answer each in under a minute, aloud: your four-line escalation note for D2; the three techniques you cannot see;
the one finding you would fix first and why; what you would say if the panel asked you to delete your exercise log.`,
    mcqs: [
      mcq('During the demo a panellist asks why Nallamala\'s D2 alert should be believed when precision on the replayed week is 1.00. What is the strongest reply?', [
        ['The author knew the answers there; the honest figure is from a classmate\'s blind week', true],
        ['Precision of 1.00 proves the rule is correct, since every single alert was a real attack', false],
        ['The rule follows a published Sigma rule, so its precision was already proven elsewhere', false],
        ['Wazuh scores every rule automatically, and its score matched the harness exactly', false],
      ], 'A rule scored on data its author wrote measures the author\'s memory. The blind week is the evidence. D2 is a counting rule written for this hospital, and Wazuh does not score precision.'),
      mcq('A panellist asks what you do when the HIS audit source goes silent at 1 a.m. Which answer is strongest?', [
        ['Check the agent and pipeline first, and treat it as a possible incident until explained', true],
        ['Wait for the morning shift, since a quiet source at night usually means a quiet hospital', false],
        ['Restart the HIS application at once, because silence always means the application crashed', false],
        ['Ignore it unless another source also goes silent, as one source alone proves nothing', false],
      ], 'Silence is a signal: usually a broken agent or pipeline, sometimes an attacker turning off logging. The source-health alert exists to start that check; restarting a clinical system on a guess is its own risk.'),
      mcq('The panel asks why your vulnerability list ranks a CVSS 7.5 above a CVSS 9.8. Which answer shows the most judgement?', [
        ['The 7.5 is known-exploited on the internet-facing HIS; the 9.8 is on an internal server', true],
        ['CVSS scores are random, so the team sorts findings by the date they were first seen', false],
        ['The 9.8 has an exception, so it no longer counts as a finding in the report at all', false],
        ['Lower scores are faster to patch, so they go first to improve the SLA percentage', false],
      ], 'Exploitation and exposure decide urgency, as the prioritisation lesson taught; CVSS is one input. Sorting to flatter the SLA figure, or treating scores as random, misreads the method.'),
      mcq('Asked "What would you build next with two more weeks?", which answer is strongest for the Nallamala SOC?', [
        ['Mail-gateway logs and a phishing rule, since the coverage panel shows phishing as a gap', true],
        ['An AI model that reads every alert and closes the false ones, so no analyst needs to triage at night', false],
        ['Fifty more Sigma rules from a public repository, enabled together to raise coverage', false],
        ['A second SIEM for redundancy, so the lab keeps working if the first server fails', false],
      ], 'The best next step follows from your own evidence, here the coverage gap. Bulk rules without tuning bury the SOC in noise, and an AI layer or a second SIEM does not fix a missing log source.'),
    ],
  },

  /* ── CHECKPOINT ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CAPSTONE_CHECKPOINT',
    notes: `Ten scenario questions across the whole Cybersecurity Analyst track — networks, endpoints and identity,
cryptography, SIEM and detection, incident response, threat intelligence, vulnerabilities, cloud and governance —
at the level a SOC hiring panel expects. Choose what you would actually do, and be ready to say why.`,
    checkpoint: [
      ck(NET, 'Zeek shows a hospital ward PC sending small, regular HTTPS connections to one outside address every 300 seconds overnight. What is the first conclusion to test?', [
        ['A process on the PC is beaconing; find it with Sysmon network events and the proxy log', true],
        ['The PC is downloading Windows updates, since update traffic always goes out over HTTPS', false],
        ['The firewall is broken, because the PC should not be able to open outside connections at all', false],
        ['The connections are harmless, since encrypted traffic cannot carry anything an attacker needs', false],
      ], 'Regular, small, all-night connections to one destination are the beaconing pattern from Network Detection with Suricata and Zeek. Sysmon\'s network events tie them to a process. Updates are bursty, and encryption hides content, not intent.'),
      ck(NET, 'An e-commerce company lets its whole office VPN reach the production database subnet. What change follows zero-trust principles?', [
        ['Grant per-user, per-service access through an identity-aware gateway, logged each time', true],
        ['Move the database to a new subnet whose address range attackers are unlikely to guess', false],
        ['Keep the VPN as it is but force every user to change their password every thirty days', false],
        ['Allow the database subnet only from office IP addresses, since the office is trusted', false],
      ], 'Zero trust verifies each request against identity and need, as VPNs, Remote Access and Zero Trust taught. A hidden subnet or an office IP still trusts location, and frequent password changes do nothing for network reach.'),
      ck(SIEM, 'A cooperative bank\'s SIEM shows a Linux login at 14:05 and a Windows logon from the same user at 08:35 — the analyst believes they are the same session. What is the likely cause?', [
        ['One source logs IST without a zone and the other UTC; normalise both before comparing', true],
        ['The user has two accounts, one on each system, and logged in at two different times', false],
        ['The SIEM indexes Windows events late, so their times are always hours behind Linux', false],
        ['Clock drift on the Linux server, which has moved its time forward by a few hours since the last reboot', false],
      ], 'Five and a half hours between "the same" moment is the IST/UTC offset, the classic normalisation fault from Logs: Sources, Collection and Normalisation. Indexing delay changes arrival time, not the event\'s own timestamp.'),
      ck(SIEM, 'A rule for "user added to Domain Admins" produced 40 alerts a week, all from the identity team\'s approved changes. Which tuning is right?', [
        ['Suppress only adds that match an approved change ticket, and alert on all the others', true],
        ['Exclude every account in the identity team from the rule, since those administrators are already trusted', false],
        ['Lower the rule\'s severity to informational so it no longer reaches the L1 queue', false],
        ['Disable the rule until the identity team agrees to stop making changes by hand', false],
      ], 'Joining to the change record removes the expected cases and keeps the dangerous one, as Tuning Detections taught. Excluding the team blinds you to a stolen admin account; lowering severity or disabling hides real attacks.'),
      mcq('After a threat report on attacks against Indian hospitals, how should a SOC analyst turn it into work?', [
        ['Map its techniques to ATT&CK, check coverage, and hunt for the uncovered ones', true],
        ['Block every IP address listed in the report and close the ticket once they are in', false],
        ['Forward the report to all staff so everyone knows the attackers\' names and tools', false],
        ['Wait for an alert, since a report describes other hospitals and not this network', false],
      ], 'Behaviours last longer than indicators (the pyramid of pain): ATT&CK mapping shows gaps, and a hunt checks them now. IP blocks expire quickly; staff emails and waiting change nothing about detection.'),
      ck(IR, 'A leaver\'s HIS account signed in twice after her last day. What is the right first containment step?', [
        ['Disable the account and its sessions, then scope what it did and why it stayed active', true],
        ['Reset the password and email it to her personal address so she can confirm the sign-ins', false],
        ['Watch the account for another week to see what the intruder does before acting on it', false],
        ['Delete the account at once, together with its audit history, to stop any further use', false],
      ], 'Disable and revoke sessions to stop use while keeping evidence, then scope it — and fix the leaver process (Identity and Access Management). Deleting destroys the audit trail; watching lets harm continue.'),
      ck(IR, 'An analyst copies a server\'s logs onto a USB drive for the investigation. What makes them usable as evidence later?', [
        ['A SHA-256 hash at collection, a custody record of every hand-over, and a re-hash on use', true],
        ['A screenshot of the logs taken on the server, signed by the analyst who collected them', false],
        ['Opening each file in a text editor to make sure it is readable before the drive is sealed', false],
        ['Compressing the logs into an encrypted ZIP, since encryption proves nobody changed them', false],
      ], 'Hashes prove integrity and the custody record proves who held the evidence, as Evidence and Forensics Basics taught. Editors can change files, screenshots are not the data, and encryption keeps secrets without proving integrity.'),
      ck(IR, 'An e-commerce company finds a cloud access key in a public GitHub commit made at 03:00. What comes first?', [
        ['Deactivate the key, then search the audit logs for every call it made since 03:00', true],
        ['Delete the commit from GitHub, since the key is safe once nobody can see it', false],
        ['Rotate the key next sprint, after checking whether anyone has used it yet', false],
        ['Email the developer to ask whether the key was important before acting', false],
      ], 'A leaked key may already be used, so it is revoked first and its activity scoped from audit logs (Keys and Secrets Management, Cloud Logging and Detection). Deleting the commit leaves copies in clones and forks.'),
      ck(VULN, 'A review of a hospital portal finds passwords stored as unsalted SHA-1 hashes. How should the finding be handled?', [
        ['Rate it high, migrate to a slow salted hash such as Argon2 at each login, and track to closure', true],
        ['Close it as acceptable, since SHA-1 hashes cannot be reversed back into the passwords', false],
        ['Encrypt the SHA-1 values with AES, so the stored passwords are protected by two layers', false],
        ['Add a salt to the existing hashes in place, which makes them as strong as Argon2 at once', false],
      ], 'Fast unsalted hashes are guessed quickly offline (Storing Passwords Properly). The fix is a slow, salted algorithm, applied as users log in. Encrypting hashes moves the risk to a key, and salting old hashes is not possible without the password.'),
      ck(VULN, 'A cloud posture scan finds a storage bucket of patient discharge summaries readable by anyone. What should the SOC do?', [
        ['Block public access now, check access logs for reads, and treat any as a breach', true],
        ['Add the bucket to the next monthly patch cycle, since it is a configuration issue', false],
        ['Rename the bucket to something hard to guess, so it cannot easily be found', false],
        ['Record it in the risk register as accepted, since the data is only summaries', false],
      ], 'A public bucket of health data is exposure now: close it, then use the logs to learn whether anyone read it, which decides breach duties (Securing Cloud Networks and Storage, Security Obligations in India). Renaming is obscurity, not a control.'),
    ],
  },
];
