/**
 * Career-track content: Vulnerability Management (CY_VULN_MGMT), Cybersecurity Analyst, batch CY3.
 *
 * The defender's vulnerability cycle on assets the organisation owns: an inventory reconciled against scan
 * coverage, authorised scanning and reading a scan report, risk-based prioritisation (CVSS, EPSS, known-
 * exploited catalogues, asset criticality), remediation with SLAs, exceptions and re-scan verification, and
 * dependencies, SBOMs and container images. Builds on Year 2's "The Code You Did Not Write", Year 3's "What an
 * Outdated Dependency Exposes" (pip-audit, npm audit) and on CY1/CY2 (EDR, Active Directory, Suricata, SOC
 * metrics), referred to by title and not re-taught. Strictly defensive: scanning is taught as authorised work,
 * and no found vulnerability is ever exploited.
 *
 * Every number shown was produced by running Python (pandas 3, packaging) over synthetic data for a fictional
 * NBFC, Kaveri Finserv; CVE-like ids (CVE-XXXX-0001), package names and EPSS/KEV values are fictional. The CVSS
 * v3.1 calculator was checked against four published NVD vectors. OpenVAS (gvm-cli), Trivy, Syft and Grype
 * commands were written from their documentation and NOT run; the notes say so. Single skill:
 * VULNERABILITY_MANAGEMENT.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CY_VULN_MGMT_BUNDLES: PilotBundle[] = [
  /* ── VULN_LIFECYCLE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_VULN_LIFECYCLE',
    notes: `Most breaches that reach the news in India do not need a clever attacker. They need one server that
nobody patched, usually because nobody remembered it existed. Vulnerability management is the discipline
that stops that: a loop the organisation runs every week, not a scan somebody runs when an auditor asks.
In a bank, an MSSP or a GCC in Hyderabad, the vulnerability analyst sits next to the SOC and feeds it: the
SOC watches for attacks, vulnerability management shrinks what there is to attack.

## The cycle

| Stage | Question it answers | Typical output |
|---|---|---|
| Asset inventory | What do we own, who owns it, how important is it? | Asset list with owner and criticality |
| Discovery | Is anything running that the inventory does not know about? | Unknown hosts, services, cloud resources |
| Assessment | Which weaknesses does each asset have? | Scan results, SBOMs, configuration checks |
| Prioritisation | Which of them matter first, here? | A ranked, tiered list |
| Remediation | Who fixes what, by when, and how? | Tickets with due dates, exceptions |
| Verification | Is it really fixed? | A re-scan that no longer finds it |
| Reporting | Are we getting better? | Coverage, SLA compliance, overdue items |

Then it starts again, because new vulnerabilities are published every day and new servers are built every
week. A programme that runs the cycle once a quarter is always a quarter behind.

## Why an unknown asset is the biggest risk

A known server with a critical vulnerability is a problem with an owner and a ticket. An unknown server has
no owner, is not scanned, is not patched, has no EDR agent and sends no logs to the SIEM. It is invisible to
every control you learnt in CY1 and CY2. The forgotten UAT box built for a vendor demo, the database replica
the DBA added during a migration, a developer's cloud VM with a public IP: these are the hosts attackers find
first, because internet-wide scanning finds them in hours.

So the first job is a reconciled inventory, built from several sources because each one misses something:

- **CMDB or asset register** — what the organisation thinks it owns; often stale.
- **Active Directory computer objects** (you met these in *Active Directory Basics for Analysts*) — every
  domain-joined Windows machine, but not Linux, network kit or cloud.
- **EDR console** (*Endpoint Protection and EDR*) — hosts with an agent; by definition misses hosts without one.
- **DHCP leases and DNS** — what has asked for an address or a name.
- **Network data** — Zeek \`conn.log\` and firewall logs show internal addresses that talk; an address
  that talks but appears in no inventory is a lead.
- **Cloud provider APIs** — every VM, bucket and database in each account.
- **Scanner discovery** — a discovery pass over the ranges you are authorised to scan.

Each asset needs a few fields that later stages use: **owner** (a team, not "IT"), **environment**
(prod, UAT), **criticality** (what breaks or leaks if it is compromised), **exposure** (internet-facing or
not), and the data it holds (customer data, card data, Aadhaar-linked records).

## Measuring coverage: inventory versus scan data

The single most useful early check is a diff: assets in the inventory that no scan has covered, and scanned
addresses that are not in the inventory. With pandas, joining Kaveri Finserv's 12-asset inventory to the
scanner's coverage export:

    m = inv.merge(cov, on="ip", how="outer", indicator=True)
    never   = m[m._merge == "left_only"]      # in inventory, never scanned
    unknown = m[m._merge == "right_only"]     # scanned, not in inventory
    both = m[m._merge == "both"].copy()
    both["age_days"] = (today - both.last_scanned).dt.days
    stale = both[both.age_days > 30]

Real output:

    Never scanned (in inventory, not in scan data):
    asset_id   hostname         ip criticality
         A05   kf-db-02  10.20.2.6    critical
         A08 kf-jump-01 10.20.3.30        high
         A10  kf-uat-db  10.30.2.5      medium

    Scanned but not in inventory (unknown assets):
            ip last_scanned
    10.20.6.77   2026-10-20
    10.20.6.78   2026-10-20

    Stale (last scan older than 30 days):
      hostname         ip  age_days
    kf-file-01 10.20.3.15        85

    Only unauthenticated coverage:
       hostname         ip criticality
      kf-api-01 10.20.1.20        high
    kf-print-01 10.20.5.40         low

    Coverage: 8 of 12 inventory assets scanned in the last 30 days = 67%
    Critical assets covered: 2 of 3

The headline is not "67%". It is that one of three critical databases and the jump host (the server admins
log in through) have never been scanned, and two addresses nobody can name answer on the network.

## Vocabulary you will use daily

- **Vulnerability** — a flaw that can be used to break a security property; public ones get a **CVE** id.
- **Weakness** — the class of mistake behind it, catalogued as **CWE** (for example CWE-79 for cross-site
  scripting).
- **Misconfiguration** — no code flaw, just an unsafe setting: TLS 1.0 enabled, a default password.
- **Finding** — one vulnerability on one asset. Ten servers with the same flaw are ten findings and one fix.

## Who does what

The analyst does not patch production. The analyst finds, ranks, assigns and verifies; system owners fix;
change management approves the window; leadership accepts risk when a fix is not possible. Write that down
early, or every finding becomes an argument about whose job it is.`,
    workedExample: `**Turning the coverage diff into actions for Kaveri Finserv.** The output above has four groups; each
needs a different action, an owner and a date.

1. **Never scanned: kf-db-02 (critical), kf-jump-01 (high), kf-uat-db (medium).** Ask why first. kf-db-02 was
   added during a migration and never put into the scan target list; the fix is to add it, with credentials,
   and to change the build checklist so a new server is not "done" until it is in the scan scope. The jump
   host matters more than its rating suggests: admins log in through it, so a flaw there is a path to
   everything. Owner: the vulnerability analyst for scope, the DBA and IT teams for credentials. Date: this
   week's scan.

2. **Unknown: 10.20.6.77 and 10.20.6.78.** Do not assume an attacker, and do not assume harmless. Look them up
   in DHCP leases, DNS, the EDR console and the switch's MAC table; in this case they turn out to be two
   video-conferencing units installed by facilities. They get an inventory entry, an owner (facilities), a
   criticality (low) and a network rule keeping them in their own VLAN, as in *Firewalls, Segmentation and
   Least-Privilege Networks*. If no owner can be found within the agreed time, the SOC treats them as an
   incident lead.

3. **Stale: kf-file-01, last scanned 85 days ago.** A scan that used to work and stopped usually means a
   credential expired or a firewall change blocked the scanner. Check the scanner's task log for that host
   before anything else.

4. **Unauthenticated only: kf-api-01 and kf-print-01.** An unauthenticated scan sees only what the network
   shows, so missing patches inside the OS go unseen. Add an SSH credential for kf-api-01. The printer may
   not support one; record that as a known limit.

**What to report.** "Coverage 67% (8/12); 2 of 3 critical assets covered; 2 unknown devices found and
assigned." A leader can act on that. "We ran a scan" tells them nothing.`,
    mcqs: [
      mcq('A scanner export lists 10.20.6.77 as alive, but the CMDB, Active Directory and the EDR console have no record of it. What should the vulnerability analyst do first?', [
        ['Identify it from DHCP, DNS and switch data, then give it an owner or escalate', true],
        ['Block the address at the firewall at once, since an unknown device is an attacker', false],
        ['Ignore it until next quarter, since only assets in the CMDB are in the programme', false],
        ['Run a full set of dangerous checks against it to find out what kind of device it is', false],
      ], 'An unknown asset is a gap to close: find what it is and who owns it, and escalate to the SOC if nobody can. Blocking without knowing may cut off a real business device, ignoring it is exactly how forgotten hosts get breached, and aggressive checks on an unidentified device are not authorised work.'),
      mcq('Why does a reconciled inventory draw on several sources such as AD, EDR, DHCP and cloud APIs?', [
        ['Each source misses a class of asset, so only the union shows the whole estate', true],
        ['Auditors require at least four sources, whatever the size of the organisation', false],
        ['Each source records a different CVE, so combining them finds more vulnerabilities', false],
        ['A single source cannot be exported to CSV, so pandas has to merge several of them', false],
      ], 'AD misses non-Windows hosts, EDR misses hosts without agents, the CMDB goes stale. Combining them is how unknown assets surface. No audit rule fixes the number of sources, inventory sources do not carry CVEs, and CSV export is not the issue.'),
      mcq('Twelve web servers all have the same missing patch. How should the tracker record this?', [
        ['Twelve findings that one change can close', true],
        ['One finding, since it is a single CVE id', false],
        ['Twelve separate CVEs, one for each server', false],
        ['No finding until one of them is attacked', false],
      ], 'A finding is one vulnerability on one asset, so the tracker needs all twelve to verify each closes; the remediation can still be one change. Recording one finding hides which servers remain open, CVE ids identify the flaw rather than the host, and waiting for an attack defeats the purpose.'),
    ],
    checkpoint: [
      mcq('Which stage of the vulnerability management cycle answers "is it really fixed?"', [
        ['Verification, by re-scanning the asset', true],
        ['Prioritisation, by recalculating the score', false],
        ['Discovery, by looking for unknown hosts', false],
        ['Reporting, by counting the closed tickets', false],
      ], 'Verification confirms the fix with evidence, normally a re-scan with the same profile. Prioritisation ranks findings, discovery finds assets, and counting closed tickets trusts the ticket rather than the system.'),
      mcq('The coverage report says 8 of 12 assets were scanned in 30 days, and one of the four gaps is the jump host that admins log in through. What makes that gap especially serious?', [
        ['A flaw on the jump host is a path to every server the admins manage', true],
        ['Jump hosts cannot be scanned, so it will stay a permanent coverage gap', false],
        ['A jump host always has more CVEs than any other server in the estate', false],
        ['Regulators fine the bank for each unscanned host in the inventory list', false],
      ], 'A jump host concentrates privileged access, so its weaknesses reach everything behind it. It can be scanned like any server, the number of CVEs depends on its software rather than its role, and no per-host fine works this way.'),
      mcq('Which inventory field does the prioritisation stage depend on most?', [
        ['Criticality and exposure of the asset', true],
        ['The date the asset was first purchased', false],
        ['The hostname naming convention in use', false],
        ['The colour code on the asset tag label', false],
      ], 'Risk depends on how much damage a compromise would do and whether attackers can reach the asset, so criticality and exposure feed directly into ranking. Purchase dates, naming conventions and tag colours do not change the risk of a vulnerability.'),
    ],
  },

  /* ── SCANNING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_SCANNING',
    notes: `A vulnerability scanner connects to hosts, works out what software and settings they have, and compares
that with a database of known vulnerabilities. It is a tool for assessing systems you are responsible for.
Run against anyone else's systems, the same activity is unauthorised access to a computer system, which
India's IT Act, 2000 treats as an offence. So the first step of every scan is paperwork.

## Authorisation before anything else

A scan plan, signed by the asset owners (or by whoever owns the whole range, such as the CISO), states:

- the **ranges and hosts in scope**, and the **exclusions** (a fragile core-banking appliance, a partner's
  hosted system you connect to but do not own, anything in a cloud account that is not yours);
- the **window** (for example 22:00–05:00 on weekdays) and the scanner's **source IP**;
- the **profile** (discovery only, safe checks, authenticated);
- a **contact** for each team if something misbehaves, and how to stop the scan.

Tell the SOC before the first run. A scan looks a lot like reconnaissance: the Suricata sensor you configured
in *Network Detection with Suricata and Zeek* will fire on it. The right response is a documented, time-boxed
suppression for the scanner's source IP during the window, not a permanent allow-list for "the scanner"
that an attacker who lands on that box would inherit.

## What scanners actually check

- **Version checks** — read a banner or a package version and compare it with the advisory. Fast, but prone to
  false positives on Linux distributions that **backport** fixes: Debian or RHEL may patch a library without
  changing the upstream version number the banner shows.
- **Configuration checks** — TLS versions offered, default credentials on a management page, SMB signing.
- **Authenticated (local) checks** — log in over SSH or SMB/WinRM with a dedicated low-privilege account and
  read installed packages, registry keys and patch levels directly.
- **Active probes** — send a request and see how the service responds. Good scan configurations restrict
  these to safe checks on production; anything that could crash a service belongs in a test window or not
  at all. A scanner confirms a weakness; it does not exploit it, and neither do you.

| | Unauthenticated | Authenticated |
|---|---|---|
| Sees | What the network exposes: open ports, banners, TLS | Installed software, patches, local settings |
| Misses | Missing OS and library patches behind closed ports | Little, if the account can read what it needs |
| False positives | More (banners, backports) | Fewer (real package versions) |
| Use it for | The attacker's outside view, internet-facing hosts | The real patch state of every server |

Run both. The outside view tells you what is reachable; the authenticated view tells you what is unpatched.
Store scan credentials in a vault, give them read-only rights, and rotate them; a scan account with domain
admin rights is a gift to an intruder.

## OpenVAS in outline

OpenVAS is the scanner inside **Greenbone Community Edition**: a scanner engine, a manager (\`gvmd\`)
that stores targets, tasks and results, a web interface, and a feed of vulnerability tests (VTs) updated
from Greenbone. The workflow in the web interface:

1. **Target** — hosts or ranges, a port list, an alive test, and the SSH/SMB credentials for authenticated
   checks.
2. **Task** — the target, a scan configuration (the default "Full and fast" uses safe checks), and a schedule
   inside the agreed window.
3. **Report** — results with severity, a **QoD** (quality of detection, how reliable the test is) and a
   solution type (VendorFix, Workaround, Mitigation).

The same is scriptable through \`gvm-cli\` from python-gvm's gvm-tools, which speaks Greenbone's GMP XML
protocol. Written from the documentation and **not run** here (no scanner is installed):

    gvm-cli --gmp-username vmadmin --gmp-password "$GVM_PASS" socket --xml "<get_version/>"
    gvm-cli --gmp-username vmadmin --gmp-password "$GVM_PASS" socket --xml "<get_tasks/>"

## Reading a report without drowning in it

A raw export is noisy: informational "Log" rows, the same flaw reported once per port, and low-confidence
detections. Kaveri Finserv's export (columns modelled on a Greenbone CSV, simplified) has 17 rows:

    f = df[df.severity != "Log"].copy()          # context, not findings
    low_qod = f[f.qod < 70]                      # the web UI hides QoD below 70 by default
    f = f[f.qod >= 70]
    f["key"] = f.cves.fillna(f.vt_name)
    dedup = f.drop_duplicates(subset=["ip", "key"])

Real output:

    rows: 17
    after dropping Log rows and QoD<70: 13; after de-duplicating by host+vulnerability: 12
    set aside for manual check (QoD<70): ['lotus-sshd weak key exchange (version banner only)',
                                          'printhub web UI outdated (banner only)']

Grouping by vulnerability turns 12 findings into 9 fixes, and puts one fix at the top because it closes three:

                              key  cvss  n                            hosts
                    CVE-XXXX-0001   9.8  3 kf-uat-web, kf-web-01, kf-web-02
                    CVE-XXXX-0003   8.8  1                         kf-db-01
                    CVE-XXXX-0005   8.1  1                         kf-dc-01

The low-QoD rows are not deleted. They are banner-only guesses; confirm them with an authenticated check or
the package changelog, then close or keep them with a note.`,
    workedExample: `**Planning and reading the first authenticated scan of Kaveri Finserv's web tier.**

*Plan.* Scope: 10.20.1.10, 10.20.1.11, 10.20.1.20 and the UAT host 10.30.1.10. Exclusion: the payment gateway
partner's hosted page, which the web servers call but Kaveri does not own. Window: Tuesday 23:00–02:00.
Profile: "Full and fast" with an SSH credential for a \`svc-vmscan\` account that can read the package
database but cannot sudo. The digital team's lead signs the plan; the SOC gets the scanner IP and the window,
and adds a suppression that expires at 02:00.

*Run.* Before the full scan, a discovery-only pass confirms all four hosts answer and that SSH logins
succeed. A credential failure is the commonest reason an "authenticated" scan silently becomes an
unauthenticated one, so check the per-host authentication result in the report, not only the findings.

*Read.* The report has 17 rows. Work through them in this order:

1. Drop the two "Log" rows (OS detection, open-port summary). Keep them for context; they are not findings.
2. Set aside the two rows with QoD 30. Both say "banner only". On kf-api-01, \`dpkg -l\` shows the SSH
   package carries the distribution's security update, so the finding is a backport false positive: close
   it with that evidence.
3. De-duplicate: CVE-XXXX-0001 appears on 443 and 8443 of kf-web-01. One finding, two ports.
4. Group by vulnerability: CVE-XXXX-0001 on three hosts is one change for the digital team.
5. Note the solution type: VendorFix means a patch exists; Workaround (the printer's default credentials)
   means a configuration change; Mitigation (TLS 1.0) means a setting.

*Result.* 17 rows become 12 findings and 9 pieces of work, each with an owner. Prioritising them is the next
unit; sorting by the CVSS column is not the answer.`,
    mcqs: [
      mcq('An unauthenticated scan of a Debian server flags a library flaw from the version banner, but the security team says the distribution already patched it. What is the most likely explanation?', [
        ['The fix was backported without changing the upstream version number', true],
        ['The scanner feed is out of date and must be reinstalled from scratch', false],
        ['Debian servers cannot be scanned accurately by any vulnerability tool', false],
        ['The library is vulnerable, and the security team has misread a changelog', false],
      ], 'Distributions often backport security fixes, so the banner keeps the old version while the package is patched; an authenticated check of the package version settles it. A stale feed would miss flaws rather than invent this one, Debian scans fine with credentials, and assuming the team is wrong skips the evidence.'),
      mcq('The SOC complains that Suricata raised 900 alerts during last night\'s scan window. What is the best fix?', [
        ['A suppression for the scanner IP that applies only during the agreed window', true],
        ['A permanent allow-list entry so the scanner IP never raises any SOC alert', false],
        ['Stop scanning at night and run every scan during office hours instead', false],
        ['Disable the Suricata rules that fired, since the alerts were all benign', false],
      ], 'A time-boxed suppression removes the noise and keeps detection if that host is ever misused outside the window. A permanent allow-list hands an intruder on the scanner a blind spot, daytime scanning risks business impact, and disabling the rules removes real detection for everyone.'),
      mcq('What does a QoD value of 30 on an OpenVAS finding tell you?', [
        ['The test that produced it is unreliable, so confirm before acting', true],
        ['The vulnerability has a CVSS score of 3.0 on the standard scale', false],
        ['The vulnerability was found on 30 hosts across the whole range', false],
        ['The finding is 30 days old and has passed its remediation SLA', false],
      ], 'Quality of detection rates how reliable the detection method is; banner-only guesses score low. It is not a CVSS score, a host count or an age.'),
    ],
    checkpoint: [
      mcq('Which item must a scan plan contain before the first scan of a range runs?', [
        ['Signed scope with exclusions, a window, a source IP and contacts', true],
        ['A list of the exploits that will be used on each host in scope', false],
        ['The CVSS scores that the scan is expected to find in the range', false],
        ['Approval from the vendors of every product running in the range', false],
      ], 'Authorisation, scope, timing and contacts make the scan legitimate and safe to run. Vulnerability scanning does not involve exploits, expected results cannot be known in advance, and product vendors do not authorise scans of your own systems.'),
      mcq('An "authenticated" scan of kf-file-01 returns only open ports and TLS findings. What should you check first?', [
        ['The per-host credential result, since the login probably failed', true],
        ['Whether the server has been fully patched since the last scan', false],
        ['Whether the scanner feed was updated in the last twenty-four hours', false],
        ['The firewall rules for port 443, since TLS was the only finding', false],
      ], 'A result that looks like an outside view usually means the login failed and the scan fell back to unauthenticated checks. A fully patched server would still show local check results, a stale feed would not hide all local data, and port 443 is irrelevant to an SSH or SMB login.'),
      mcq('Why should the scan account be a dedicated read-only account kept in a vault?', [
        ['Its credentials sit on the scanner and could be stolen and reused', true],
        ['Scanners refuse to log in with an account that can run sudo commands', false],
        ['Read-only accounts let the scanner finish its scan much more quickly', false],
        ['A vault is needed so the scanner can apply missing patches by itself', false],
      ], 'A scanner holds credentials for many hosts, so an attacker on it inherits them; least privilege limits the damage. Scanners accept privileged accounts (which is the danger), privilege does not change speed, and scanners assess rather than patch.'),
    ],
  },

  /* ── PRIORITISATION ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_PRIORITISATION',
    notes: `A mid-size organisation's scans return thousands of findings, and more than half of them score "High"
or "Critical". Nobody can fix them all this week, so the real skill is order: which fifty first, and why.
Sorting by CVSS is what beginners do. This unit is about doing better and being able to defend it.

## What CVSS is

The Common Vulnerability Scoring System (from FIRST) describes a vulnerability's **severity** with a vector
of metrics. In v3.1 the base metrics are:

| Metric | Values | Asks |
|---|---|---|
| Attack Vector (AV) | Network, Adjacent, Local, Physical | From where can it be triggered? |
| Attack Complexity (AC) | Low, High | Are special conditions needed? |
| Privileges Required (PR) | None, Low, High | Must the attacker be logged in already? |
| User Interaction (UI) | None, Required | Must a user click something? |
| Scope (S) | Unchanged, Changed | Can it affect components beyond the vulnerable one? |
| Confidentiality, Integrity, Availability (C/I/A) | High, Low, None | What is lost? |

The score is computed from the vector with fixed weights. A short implementation of the v3.1 formula from the
specification (with its Roundup function), checked against vectors published on NVD:

    CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H  -> 9.8  expected 9.8  OK
    CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H  -> 10.0  expected 10.0  OK
    CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N  -> 7.5  expected 7.5  OK
    CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N  -> 6.1  expected 6.1  OK

The second is the vector NVD gives Log4Shell (CVE-2021-44228), the third Heartbleed's (CVE-2014-0160), and the
fourth is a typical reflected cross-site scripting vector.

Changing one metric at a time from the 9.8 vector shows what drives the number: Adjacent network gives 8.8,
needing a low-privilege login gives 8.8, high attack complexity gives 8.1, and local access together with a
low-privilege login gives 7.8. CVSS v4.0 was published in 2023 with different metrics; vendors and NVD show either, so always note
which version a score is.

## What CVSS does not tell you

A base score is the same in every organisation on earth. It says nothing about:

- **whether anyone is exploiting it** — most published vulnerabilities are never exploited in the wild;
- **your asset** — a 9.8 on a UAT box with test data is not the same as a 9.8 on the internet-facing loan portal;
- **your controls** — a flaw in a service blocked by a firewall from everywhere but one subnet.

CVSS is severity, not risk. Risk needs likelihood and impact in *your* environment.

## Exploit likelihood: EPSS

The **Exploit Prediction Scoring System**, also from FIRST, publishes for each CVE a probability (0 to 1)
that exploitation activity will be observed in the next 30 days, with a percentile, updated daily from
observed exploitation data. It is a forecast, not a fact, and it changes: look values up on FIRST's site or
API on the day you rank. Never copy an EPSS value from an old report or a blog.

## Known exploited: KEV catalogues

CISA's **Known Exploited Vulnerabilities** (KEV) catalogue lists CVEs with reliable evidence of exploitation
in the wild; US federal agencies must remediate them by set due dates under Binding Operational Directive
22-01, and organisations everywhere use it as a "fix this first" signal. In India, follow CERT-In's
advisories and vulnerability notes as well. A KEV entry beats a high EPSS: one is evidence, the other is a
prediction.

## Putting it together

A transparent rule, run over Kaveri Finserv's 12 findings (EPSS and KEV values here are fictional):

    def tier(r):
        exploited = r.kev or r.epss >= 0.5
        exposed = r.internet or r.criticality == "critical"
        if exploited and exposed:
            return "P1"
        if exploited or (r.cvss >= 9 and exposed) or (r.epss >= 0.1 and r.criticality in ("critical", "high")):
            return "P2"
        if r.cvss >= 7 or (r.cvss >= 4 and r.internet):
            return "P3"
        return "P4"

Real output, CVSS-only against risk-based:

    Sorted by CVSS alone (top 5):
    fid       host          vuln  cvss  epss   kev criticality  internet tier
    F01  kf-web-01 CVE-XXXX-0001   9.8 0.020 False        high      True   P2
    F02  kf-web-02 CVE-XXXX-0001   9.8 0.020 False        high      True   P2
    F03 kf-uat-web CVE-XXXX-0001   9.8 0.020 False      medium     False   P3
    F04   kf-db-01 CVE-XXXX-0003   8.8 0.004 False    critical     False   P3
    F05   kf-dc-01 CVE-XXXX-0005   8.1 0.620  True    critical     False   P1

    Risk-based (top 5):
    fid        host          vuln  cvss  epss   kev criticality  internet tier
    F09   kf-web-01 CVE-XXXX-0008   6.1  0.71  True        high      True   P1
    F05    kf-dc-01 CVE-XXXX-0005   8.1  0.62  True    critical     False   P1
    F07 kf-print-01 CVE-XXXX-0007   7.5  0.35  True         low     False   P2
    F01   kf-web-01 CVE-XXXX-0001   9.8  0.02 False        high      True   P2
    F02   kf-web-02 CVE-XXXX-0001   9.8  0.02 False        high      True   P2

    KEV findings in CVSS top 5: 1 | in risk top 5: 3

The exploited 6.1 on the internet-facing web server goes from rank 9 to rank 1. CISA's **SSVC** decision
trees (Track, Track*, Attend, Act) are a published, more formal version of the same idea. Whatever rule you
use, write it down, apply it the same way every week, and let anyone reproduce a ranking from it.`,
    workedExample: `**Explaining the ranking to Kaveri Finserv's IT head, who asks: "Why is a 6.1 above three 9.8s?"**

Take the findings one at a time and say what each signal adds.

*F09, CVE-XXXX-0008 on kf-web-01, CVSS 6.1.* It is in the known-exploited catalogue, its EPSS is 0.71, and
kf-web-01 is the internet-facing loan portal. Attackers are using it now, against servers like ours, and ours
is reachable. That is P1: fix within days. The modest base score reflects its impact on paper (user
interaction needed, limited data), not how often it is being used.

*F05, CVE-XXXX-0005 on kf-dc-01, CVSS 8.1.* Known exploited and on the domain controller. The DC is not
internet-facing, but it is critical: whoever controls it controls every Windows account. P1.

*F01 and F02, CVE-XXXX-0001 on the two production web servers, CVSS 9.8.* Severe and internet-facing, but
there is no evidence of exploitation and EPSS is 0.02. P2: fix within the normal short window, not tonight's
emergency change.

*F03, the same CVE on kf-uat-web, CVSS 9.8.* Same flaw, but on an internal UAT server with medium
criticality and no exploitation evidence. P3. It still gets fixed (UAT often holds copies of real data, which
should itself be raised), just after the others.

*F07, CVE-XXXX-0007 on the printer, CVSS 7.5.* Known exploited, but a low-criticality printer that is not
internet-facing: P2. Its fix is a configuration change (default credentials), which is cheap, so do it with
the P2 batch.

**The sentence for the IT head:** "CVSS tells us how bad a flaw could be anywhere; we rank by whether it is
being exploited and how much it matters here. Two of our findings are being exploited right now on systems
that matter, and those come first." Then show the rule, so the ranking is not a matter of opinion.`,
    mcqs: [
      mcq('Two findings have CVSS 9.8. One is on an internal UAT server with no exploitation evidence; the other is in the KEV catalogue on the internet-facing loan portal. Why do they rank differently?', [
        ['Exploitation evidence and exposure make the portal finding far more likely to be used', true],
        ['The UAT server finding has the higher score once rounding to one decimal is applied', false],
        ['KEV entries automatically receive a CVSS score of 10.0, overriding their base vectors', false],
        ['They rank the same, because equal base scores always mean an equal level of risk', false],
      ], 'Base scores describe severity in general; known exploitation and internet exposure raise the likelihood of compromise here. Both scores are 9.8, KEV listing does not change a CVSS score, and equal severity is not equal risk.'),
      mcq('What does an EPSS value of 0.62 for a CVE mean?', [
        ['A 62% estimated chance of exploitation activity in the next 30 days', true],
        ['The CVE scores 6.2 on the CVSS base scale after environment changes', false],
        ['62% of the organisations scanned last month were found to be vulnerable', false],
        ['The CVE has been in the KEV catalogue for 62 days and is overdue', false],
      ], 'EPSS is a probability of observed exploitation activity over the next 30 days. It is not a CVSS score, not a prevalence figure, and unrelated to how long a CVE has been in any catalogue.'),
      mcq('In the CVSS v3.1 vector AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N, what does UI:R mean?', [
        ['A user must take an action, such as clicking a link, for it to succeed', true],
        ['The attacker needs a remote shell on the host before it can be triggered', false],
        ['The vulnerability can only be reached over a remote desktop connection', false],
        ['The vendor rates it as requiring an urgent fix within the next release', false],
      ], 'User Interaction: Required means a victim must do something, typical of cross-site scripting. Needing existing access is Privileges Required, network reach is Attack Vector, and vendor urgency is not a CVSS metric.'),
    ],
    checkpoint: [
      mcq('Your manager wants the patch list sorted by CVSS only, highest first. What is the strongest objection?', [
        ['CVSS measures severity, not exploitation or the asset at risk here', true],
        ['CVSS scores are secret and cannot be shared outside the vendor', false],
        ['CVSS changes every day, so a sorted list goes stale in hours', false],
        ['CVSS only covers web applications, not servers or databases', false],
      ], 'A base score ignores whether a flaw is exploited and how important or exposed your asset is, which is what risk needs. CVSS scores are public, base scores rarely change (EPSS is the daily one), and CVSS covers all software.'),
      mcq('A CVE is in the KEV catalogue, but its current EPSS is only 0.05. How should you treat it?', [
        ['As exploited: KEV is evidence, while EPSS is only a forecast', true],
        ['As low risk, because EPSS is newer and overrides KEV listings', false],
        ['As a data error, since KEV entries always have EPSS above 0.5', false],
        ['As P4, because only the CVSS score should decide the tier here', false],
      ], 'KEV records confirmed exploitation in the wild, which outweighs a prediction. EPSS does not override evidence, the two sources are not required to agree, and ignoring both signals in favour of CVSS throws away the most useful data.'),
      mcq('Which pair of facts about an asset should a risk-based ranking add to the vulnerability data?', [
        ['How critical the asset is, and whether attackers can reach it', true],
        ['The asset\'s purchase price, and the vendor\'s country of origin', false],
        ['The number of users of the asset, and its operating system logo', false],
        ['The age of the asset, and the colour of its rack in the data hall', false],
      ], 'Impact (criticality) and reachability (exposure) turn a generic severity into risk for this organisation. Price, vendor country, logos, age and rack colour do not change how likely or how damaging a compromise is.'),
    ],
  },

  /* ── REMEDIATION ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_REMEDIATION',
    notes: `A ranked list fixes nothing. Remediation is where vulnerability management meets the people who run
the systems, their change windows and their reasons why not, and it is where most programmes stall.

## SLAs: a due date for every finding

An internal policy sets how long each tier may stay open. Kaveri Finserv's example policy (an internal
choice, not a regulation; your organisation's will differ, and regulated sectors must check what their
regulator expects):

| Tier | Meaning | Remediate within |
|---|---|---|
| P1 | Exploited and exposed or critical | 7 days |
| P2 | Exploited, or severe on an exposed asset | 15 days |
| P3 | Severe, or moderate and internet-facing | 30 days |
| P4 | The rest | 90 days |

The clock starts when the finding is first seen, not when somebody gets round to raising a ticket. RBI expects
banks to run documented patch and vulnerability management with timelines; read the current circulars your
employer is bound by rather than relying on a summary.

## The patch path

1. **Ticket** to the owning team, with the finding, the fix (patch version or setting), the tier and the due date.
2. **Test** in UAT, because a patch that breaks the loan portal will be rolled back and never reapplied.
3. **Change approval** and a window, with a rollback plan.
4. **Deploy**, then **verify** with a re-scan using the same profile and credentials as the scan that found it.

For a whole class of hosts, the fix is often upstream: rebuild from an updated golden image, update the
configuration management baseline, so the next server is born patched.

## When you cannot patch

Some things cannot be patched in time: a vendor has no fix, an appliance is end-of-life, a core system's
upgrade needs months of testing. Then you reduce risk another way, with **compensating controls**:

- **Restrict reach** — firewall or VLAN rules so only the hosts that need the service can talk to it
  (*Firewalls, Segmentation and Least-Privilege Networks*).
- **Disable the feature** that contains the flaw, if the business does not use it.
- **Virtual patching** — a WAF or IPS rule that blocks requests matching the flaw.
- **Extra detection** — a Sigma rule for the behaviour exploitation would cause, as in CY2's *Detection
  Engineering with Sigma*.

## Exceptions, always with an end date

When a finding will stay open past its SLA, record an exception: the finding, the reason, the compensating
control, who accepted the risk (someone with the authority to accept it, not the analyst) and an **expiry
date**. An exception without an expiry is a permanent hole with paperwork attached.

Kaveri Finserv's register, checked on 26 October 2026:

    ex["status"] = "valid"
    ex.loc[ex.compensating_control.isna(), "status"] = "REJECT: no compensating control"
    ex.loc[ex.expires < TODAY, "status"] = "EXPIRED: back in SLA tracking"

    Exceptions register:
    fid approver    expires                          status
    F07     CISO 2026-12-31                           valid
    F10  IT head 2026-12-31 REJECT: no compensating control
    F04     CISO 2026-10-15   EXPIRED: back in SLA tracking

## Tracking against the SLA

    Open findings:
    fid        host          vuln tier        due             state  days_over
    F02   kf-web-02 CVE-XXXX-0001   P2 2026-10-21           OVERDUE          5
    F03  kf-uat-web CVE-XXXX-0001   P3 2026-11-05          on track          0
    F04    kf-db-01 CVE-XXXX-0003   P3 2026-10-15           OVERDUE         11
    F07 kf-print-01 CVE-XXXX-0007   P2 2026-09-16 exception (valid)         40
    F09   kf-web-01 CVE-XXXX-0008   P1 2026-10-27          on track          0
    F10   kf-web-02        TLS1.0   P3 2026-07-31           OVERDUE         87
    F12  kf-uat-web        TCP-TS   P4 2026-09-29           OVERDUE         27

    Closed 5, within SLA 4 (80%); median days to close 19

F07 still shows its 40 days past the original date: an exception pauses the escalation, not the record.

## Verification: the re-scan decides, not the ticket

Comparing last week's findings with this week's re-scan, keyed by host and vulnerability:

    Fixed (gone on re-scan): [('kf-db-01', 'CVE-XXXX-0004'), ('kf-dc-01', 'CVE-XXXX-0005'), ('kf-web-01', 'CVE-XXXX-0001')]
    Still open: [('kf-web-01', 'CVE-XXXX-0008'), ('kf-web-02', 'CVE-XXXX-0001')]
    Reopened (was closed, back again): [('kf-hr-app', 'CVE-XXXX-0006')]
    New: [('kf-web-01', 'CVE-XXXX-0009')]

A **reopened** finding usually means the fix was undone: a server rebuilt from an old image, or a library
downgraded by a deployment. Fix the image or the pipeline, not only the host.`,
    workedExample: `**Writing this week's remediation update for Kaveri Finserv's IT head from the output above.**

Keep it to what someone can act on, in order of importance.

**1. Overdue, needs a decision.**
- *F02, CVE-XXXX-0001 on kf-web-02 (P2), 5 days overdue.* Its twin on kf-web-01 was patched on 14 October
  and verified by re-scan. Ask the digital team for a date this week; the patch is already tested.
- *F04, CVE-XXXX-0003 on kf-db-01 (P3), 11 days overdue.* Its exception expired on 15 October. Either the DBA
  team schedules the upgrade or the CISO renews the exception with a new date; the restriction on creating
  extensions stays in place either way.
- *F10, TLS 1.0 on kf-web-02 (P3), 87 days overdue.* The exception request was rejected because it names no
  compensating control. A workable one: allow TLS 1.0 only from the legacy partner's fixed IP range, with
  TLS 1.2 or later for everyone else, and an expiry tied to the partner's upgrade date.
- *F12, TCP timestamps on kf-uat-web (P4), 27 days overdue.* Low risk; batch it into the next UAT build.

**2. Due soon.** F09 (P1, exploited, on the loan portal) is due tomorrow, 27 October. Confirm tonight's
change window is booked.

**3. Verified fixed this week.** Three: the domain controller (F05, closed in 3 days), kf-db-01's
information disclosure (F08) and kf-web-01's CVE-XXXX-0001 (F01).

**4. Watch.** CVE-XXXX-0006 is back on kf-hr-app after being closed on 30 September. The likely cause is a
deployment that reinstalled the old bundled library; ask the HR app team to pin the fixed version in their
build, or it will come back again.

**5. Numbers.** 4 of 5 findings closed this period met their SLA (80%); median time to close 19 days.

Every line has a finding, an owner, a date or a decision. That is what gets read.`,
    mcqs: [
      mcq('A vendor has no fix for a known-exploited flaw on a printer management page. Which response is best?', [
        ['Restrict the page to the print server with an ACL and record a dated exception', true],
        ['Close the finding as "won\'t fix", because no patch exists and none is coming', false],
        ['Keep re-opening the ticket every week until the printer vendor releases a fix', false],
        ['Mark it as a false positive so that it stops appearing in the weekly reports', false],
      ], 'Without a patch, reduce exposure with a compensating control and track it with an expiring exception. "Won\'t fix" leaves an exploited flaw reachable, endless reopening does nothing about risk, and calling a true finding a false positive falsifies the record.'),
      mcq('The DBA team closed a ticket for CVE-XXXX-0003 yesterday. When should the finding be marked fixed?', [
        ['When a re-scan with the same profile no longer finds it', true],
        ['As soon as the ticket moves to Closed in the tracker', false],
        ['After the team lead confirms on email that it is patched', false],
        ['When the SLA due date for the finding has been reached', false],
      ], 'Verification is evidence from the system itself; patches fail, go to the wrong host or need a restart. A closed ticket or an email is a claim, and the due date has nothing to do with whether the fix worked.'),
      mcq('Which exception record is acceptable?', [
        ['Reason, compensating control, CISO approval, expiry 31 Dec', true],
        ['Reason and approver recorded, with expiry left blank for now', false],
        ['Analyst approval, a control, and an expiry two years from now', false],
        ['Approval from the team that owns the server, and no control', false],
      ], 'An exception needs a reason, a control that reduces the risk, approval from someone with authority to accept it, and a near expiry. A blank expiry never ends, an analyst cannot accept business risk, and no control means nothing changed.'),
    ],
    checkpoint: [
      mcq('A finding closed last month is back on the same host after a release. What is the most useful action?', [
        ['Fix the image or build that reintroduced it, not only the host', true],
        ['Patch the host again and close it the same way as last time', false],
        ['Raise a fresh finding with a new date so the SLA clock restarts', false],
        ['Ask the scanner vendor to suppress the check for this host', false],
      ], 'A reopened finding means something upstream undid the fix, so it will keep coming back until the image or pipeline is corrected. Re-patching only the host repeats the cycle, resetting the clock hides the age, and suppressing the check hides a real flaw.'),
      mcq('When does the SLA clock for a finding start?', [
        ['When the finding is first seen by a scan', true],
        ['When the owning team accepts the ticket', false],
        ['When the next change window is approved', false],
        ['When the finding is reported to leadership', false],
      ], 'Exposure starts when the flaw is there, so the clock starts at first detection. Starting at ticket acceptance, change approval or reporting lets delays in the process hide real exposure time.'),
      mcq('Which is a compensating control for a database flaw that cannot be patched for two months?', [
        ['Allow the port only from the app servers and alert on the risky call', true],
        ['Increase the CVSS score so that the finding reaches the top of the list', false],
        ['Move the finding to the next quarter\'s report so this month looks better', false],
        ['Rename the database host so the scanner no longer matches the old name', false],
      ], 'Restricting reach and adding detection reduce the chance and impact of exploitation until the patch. Changing scores, moving findings between reports and renaming hosts change the paperwork, not the risk.'),
    ],
  },

  /* ── SOFTWARE_SUPPLY_CHAIN ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_SOFTWARE_SUPPLY_CHAIN',
    notes: `In Year 2's "The Code You Did Not Write" and Year 3's "What an Outdated Dependency Exposes" you ran
\`pip-audit\` and \`npm audit\` on your own projects. For an analyst the question is bigger: across every
application and container the organisation runs, which ones contain a vulnerable component, and how fast can
we find out when a new advisory lands?

## Direct and transitive dependencies

An application lists its **direct** dependencies; each of those brings its own, the **transitive** ones. Most
vulnerable components found in real applications are transitive, which is why "we don't use that library"
is so often wrong. The fix is usually to upgrade the direct dependency that pulls it in, or to pin the
transitive one to a fixed version if the ecosystem allows it.

## SBOMs

A **software bill of materials** is a machine-readable list of every component in a piece of software:
name, version, a package URL (**purl**, such as \`pkg:pypi/jsonkit@1.9.2\`), and the dependency
relationships. The two common formats are **CycloneDX** (OWASP) and **SPDX** (Linux Foundation). With SBOMs
stored for every release, "are we affected by this new advisory?" becomes a search instead of a week of
emails to development teams.

A small CycloneDX-style SBOM for Kaveri Finserv's loan API (package names and advisories are fictional):

    {"bomFormat": "CycloneDX", "specVersion": "1.5",
     "metadata": {"component": {"type": "application", "name": "kf-loan-api", "version": "3.4.0"}},
     "components": [
       {"type": "library", "name": "jsonkit", "version": "1.9.2",
        "purl": "pkg:pypi/jsonkit@1.9.2", "bom-ref": "jsonkit"}, ...],
     "dependencies": [
       {"ref": "app", "dependsOn": ["fastroute", "httpclientx", "imgtool"]},
       {"ref": "fastroute", "dependsOn": ["jsonkit", "yamlish"]}, ...]}

Matching it against an advisory list, with version ranges checked properly:

    from packaging.version import Version
    from packaging.specifiers import SpecifierSet
    if a["package"] == c["name"] and Version(c["version"]) in SpecifierSet(a["affected"]):
        ...

Real output:

    CycloneDX 1.5: 6 components in kf-loan-api
    MATCH High jsonkit 1.9.2 ADV-XXXX-0101 1.10.0 transitive via fastroute
    MATCH Medium certbundle 2024.2.2 ADV-XXXX-0104 2024.7.4 transitive via httpclientx
    MATCH High imgtool 10.1.0 ADV-XXXX-0103 10.3.0 direct
    3 matches from 5 advisories

Two of three matches are transitive. yamlish 6.0.1 is not affected by an advisory for versions below 5.4,
and fastroute 2.9.1 is outside a range of 3.0 to 3.2, so they correctly do not match.

**Never compare versions as strings.** The same script prints:

    string compare '1.9.2' < '1.10.0': False
    Version compare 1.9.2 < 1.10.0:    True

A string comparison would decide jsonkit 1.9.2 is newer than the fix and miss it.

A **VEX** (Vulnerability Exploitability eXchange) statement complements an SBOM: the supplier states whether a
product is actually affected by a CVE in a component (for example, "not affected: the vulnerable function is
never called"). It is how "present" and "exploitable" are told apart without every customer re-investigating.

## Container images

An image has two layers of software to scan: the **OS packages** of the base image (Debian, Alpine, UBI) and
the **language packages** of the application. A report shaped like Trivy's JSON, summarised:

    total: 7 {'HIGH': 4, 'LOW': 1, 'MEDIUM': 1, 'CRITICAL': 1}
    fixable now: 4 | no fix yet: 3
    by layer: {'os-pkgs': 5, 'lang-pkgs': 2}
      HIGH     libexample1       1.2-3 -> 1.2-3+deb12u1  (os-pkgs)
      CRITICAL libexample3       0.9-1 -> 0.9-1+deb12u2  (os-pkgs)
      HIGH     jsonkit           1.9.2 -> 1.10.0         (lang-pkgs)
      HIGH     imgtool          10.1.0 -> 10.3.0         (lang-pkgs)

You do not patch a running container. You rebuild the image from an updated base and updated dependencies,
redeploy, and the old containers go away. Findings with no fix yet are tracked, and are a reason to prefer a
**smaller base image** that simply does not contain packages the application never uses.

## The commands

Written from each tool's documentation and **not run** here (none is installed):

    # Syft: generate a CycloneDX SBOM for a source directory or an image
    syft scan dir:. -o cyclonedx-json=sbom.cdx.json
    syft scan registry.example.in/kf-loan-api:3.4.0 -o cyclonedx-json=image.cdx.json

    # Trivy: scan an image, only HIGH/CRITICAL with a fix available, fail CI if any
    trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 registry.example.in/kf-loan-api:3.4.0
    trivy image --format json --output trivy_report.json registry.example.in/kf-loan-api:3.4.0
    trivy sbom sbom.cdx.json

    # Grype: scan an existing SBOM
    grype sbom:./sbom.cdx.json --fail-on high

## Keeping current

Pin versions with lock files, let a bot (Dependabot or Renovate) open upgrade pull requests, scan in CI on
every build and on a schedule for images already deployed (a new CVE can make yesterday's clean image
vulnerable today), and keep each release's SBOM. Deeper container and Kubernetes hardening comes in *Cloud
Security for Analysts*.`,
    mcqs: [
      mcq('An advisory lists jsonkit versions below 1.10.0 as affected. The development team says "we never installed jsonkit". The SBOM shows it under fastroute. What is going on?', [
        ['It is a transitive dependency pulled in by fastroute, so the app does contain it', true],
        ['The SBOM is wrong, because only packages in requirements.txt can appear in it', false],
        ['The advisory does not apply, since only direct dependencies can be exploited', false],
        ['fastroute has copied jsonkit\'s code, so the advisory id applies to it instead', false],
      ], 'Transitive dependencies are installed and run with the application even if nobody chose them. SBOM tools record the whole tree, transitive code is just as reachable, and the dependency relation in the SBOM shows a separate package rather than copied code.'),
      mcq('Trivy reports a CRITICAL in an OS package of a running container image. What is the correct fix?', [
        ['Rebuild the image on an updated base, then redeploy', true],
        ['Run apt upgrade inside each running container now', false],
        ['Restart the containers so they pull the fixed package', false],
        ['Add the CVE to an ignore file so the CI build passes', false],
      ], 'Images are immutable: the fix is a new image and a redeploy. Patching inside running containers is lost on the next restart, a restart reuses the same vulnerable image, and ignoring the CVE hides it.'),
      mcq('What does a VEX statement from a supplier add to their SBOM?', [
        ['Whether the product is really affected by a CVE in one of its components', true],
        ['A digital signature proving the SBOM was generated by the supplier itself', false],
        ['A list of the developers who wrote each component listed in the SBOM file', false],
        ['The licence of every component, so legal can check commercial use rights', false],
      ], 'VEX states exploitability status such as "not affected" or "affected", separating present from exploitable. Signatures, authorship and licences are other metadata, not what VEX is for.'),
    ],
    checkpoint: [
      mcq('A matcher compares versions as strings and says jsonkit 1.9.2 is not below the fixed version 1.10.0. What is the bug?', [
        ['String order compares "9" with "1" character by character', true],
        ['The fixed version must be written with a leading "v" prefix', false],
        ['Version 1.9.2 is genuinely newer than 1.10.0 in semver rules', false],
        ['Python cannot compare strings that contain more than one dot', false],
      ], 'Lexical comparison sees "1.9" > "1.1" because "9" > "1", so 1.9.2 looks newer. A "v" prefix changes nothing, semantic versioning puts 1.10.0 after 1.9.2, and Python compares such strings fine, just wrongly for versions.'),
      mcq('Why scan images already running in production on a schedule, not only at build time?', [
        ['New CVEs are published after the build, so a clean image can become vulnerable', true],
        ['Running images change their packages over time as containers update themselves', false],
        ['Build-time scans cannot read OS packages, only the application\'s language packages', false],
        ['Production registries delete scan results after a week, so scans must be repeated', false],
      ], 'The image does not change, but knowledge does: an advisory published today applies to images built last month. Containers do not update themselves, build-time scanners read both layers, and registries do not work that way.'),
      mcq('Which SBOM field lets a tool match a component to an advisory unambiguously across ecosystems?', [
        ['The purl, such as pkg:pypi/jsonkit@1.9.2', true],
        ['The bom-ref, such as jsonkit in this file', false],
        ['The component type, such as library here', false],
        ['The specVersion, such as 1.5 for the file', false],
      ], 'A package URL names the ecosystem, package and version, so pypi jsonkit cannot be confused with an npm package of the same name. bom-ref is a local id within one SBOM, type is a broad category, and specVersion is the format version.'),
    ],
  },

  /* ── DEBUGGING ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_DEBUGGING',
    notes: `Six broken pieces of vulnerability-management work. Every output below is real, from the synthetic
Kaveri Finserv data used in this topic. For each: the symptom, the cause, and the one change that fixes it.

## 1. The coverage report that invents unscanned servers

**Symptom.** The inventory-versus-scan diff says the critical database and the domain controller were never
scanned. The scanner's own log shows both were scanned last night.

**Cause.** The join is on hostname, and the two sources spell names differently: the CMDB has
\`KF-DB-02.kaveri.local\`, the scanner has \`kf-db-02\`; the scanner has \`KF-DC-01\`, the CMDB
\`kf-dc-01\`. Real output:

    1 broken: 'unscanned' = ['KF-DB-02.kaveri.local', 'kf-dc-01']

**Fix.** Normalise before joining — lower-case and strip the domain — or join on a stable key such as IP plus
asset id:

    norm = lambda s: s.str.lower().str.split(".").str[0]
    1 fixed:  'unscanned' = []

## 2. Severity counts that double overnight

**Symptom.** The weekly report says 17 findings; last week's said 9 for the same hosts and nothing changed.

**Cause.** A new export included informational "Log" rows and listed CVE-XXXX-0001 once per port (443 and
8443 on kf-web-01). Counting rows is not counting findings.

**Fix.** Drop Log rows, set aside QoD below 70 for manual checking, de-duplicate on host plus vulnerability:
17 rows become 12 findings. Report findings, and separately the number of distinct fixes (9).

## 3. The SBOM matcher that misses a vulnerable library

**Symptom.** Trivy flags jsonkit 1.9.2 (fixed in 1.10.0), but the in-house matcher says the loan API is clean.

**Cause.** It compares versions as strings:

    def affected_str(installed, fixed):
        return installed < fixed
    string matcher says jsonkit 1.9.2 affected (fixed 1.10.0)? False

**Fix.** Use \`packaging.version.Version\` and \`SpecifierSet\` for Python packages (each ecosystem has its
own rules, and Debian versions such as \`1.2-3+deb12u1\` need Debian's comparison, not semver).

## 4. Every finding is suddenly P1

**Symptom.** After adding a second EPSS source, the tiering puts low-likelihood findings into P1.

**Cause.** The new source gives EPSS as a **percentage** (2.0, 62.0, 1.0); the rule compares with 0.5:

    3 broken: epss>=0.5 -> ['F01', 'F05', 'F06']

**Fix.** Convert on load and assert the range (\`assert df.epss.between(0, 1).all()\`):

    3 fixed:  epss>=0.5 -> ['F05']

## 5. The exception that never expires

**Symptom.** The TLS 1.0 exception for kf-web-02 has been "valid" for a year.

**Cause.** Its expiry is blank, read by pandas as \`NaT\`, and any comparison with \`NaT\` is False, so
\`expires < TODAY\` never flags it:

    2 broken: expired = ['F07'] | NaT < today -> False

**Fix.** Treat a missing expiry as invalid, and reject such records at entry:

    ex[(ex.expires < TODAY) | ex.expires.isna()]
    2 fixed:  expired or missing = ['F07', 'F10']

## 6. A re-scan that "fixed" four findings overnight

**Symptom.** After a patch for one CVE on kf-web-01, the re-scan shows four of six findings gone.

**Cause.** Last week's scan was authenticated; this re-scan ran with a profile that had no credentials.
Three of the vanished findings need a local check, so the scanner simply could not see them:

    4 broken: 4 of 6 'fixed'; really fixed = 1, missing credentials hid 3

**Fix.** Verify with the same profile and credentials as the original scan, and check the per-host
authentication result before closing anything.`,
    mcqs: [
      mcq('A coverage diff joined on hostname says kf-dc-01 was never scanned, yet the scanner log shows it was. What is the likeliest cause?', [
        ['The two sources spell the name differently, for example in upper case', true],
        ['The scanner wrote its log before the scan finished, so it is unreliable', false],
        ['Domain controllers cannot appear in a scan coverage export by design', false],
        ['pandas drops rows whose hostname contains a hyphen when merging', false],
      ], 'Exact-match joins fail on case and domain-suffix differences, so normalise or join on a stable key. Scanner logs are written as hosts complete, DCs export like any host, and pandas handles hyphens fine.'),
      mcq('Your tiering puts nearly every finding into P1 after a new EPSS feed is added. What do you check first?', [
        ['Whether the new feed gives EPSS as a percentage rather than 0 to 1', true],
        ['Whether every finding was added to the KEV catalogue this morning', false],
        ['Whether the CVSS calculator is rounding all scores up to 10.0', false],
        ['Whether the asset inventory has marked every host as critical', false],
      ], 'The change was the new feed, and a unit mismatch (62.0 versus 0.62) breaks a 0.5 threshold everywhere. A mass KEV addition, a CVSS rounding bug or a mass criticality change are possible but would not coincide with the feed change.'),
      mcq('An exception register shows a year-old exception as valid although nobody renewed it. The expiry cell is blank. Why does the expiry check miss it?', [
        ['A blank date becomes NaT, and comparisons with NaT are always False', true],
        ['pandas sorts blank dates to the far future, so it looks valid until 2262', false],
        ['The check compares strings, and an empty string is less than any date', false],
        ['Blank cells are dropped by read_csv, so the row is never loaded at all', false],
      ], 'Missing datetimes are NaT and every comparison with NaT returns False, so "expired" is never true. pandas does not substitute a future date, an empty string would compare as less (and so would look expired), and read_csv keeps the row.'),
      mcq('A re-scan after one patch shows four findings gone. What do you verify before closing them?', [
        ['That the re-scan used the same credentials and profile as the first', true],
        ['That the patch was applied by a member of the senior admin team', false],
        ['That the CVSS scores of the four findings were all above 7.0', false],
        ['That the re-scan ran during the same hours as the original scan', false],
      ], 'Findings that need local checks vanish when credentials fail, so compare like with like and confirm authentication succeeded. Who applied the patch, the score band and the time of day do not explain findings disappearing.'),
    ],
  },

  /* ── PRACTICE ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_PRACTICE',
    notes: `Eight exercises, easiest first. Work each on paper or in Python before reading the answer. Data is the
synthetic Kaveri Finserv set from this topic; ids are fictional.

## 1. Coverage (easy)

The inventory has 40 assets, 5 of them critical. Scans in the last 30 days covered 31 assets, including 3
critical ones. Two scanned addresses are not in the inventory. Write the coverage line for the report.

**Answer.** "Coverage 78% (31/40); critical 3 of 5; 2 unknown devices found." 31/40 = 77.5%, rounded to 78%.
The unknown devices are not part of the percentage; they are a separate action.

## 2. Read the vector (easy)

Without computing, which of these is more severe and why?
A: \`AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H\`  B: \`AV:L/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H\`

**Answer.** Both score high (the calculator gives A 7.5 and B 7.8). A can be triggered over the network with
no login or user action but only affects availability. B needs local access and a user action but loses
confidentiality, integrity and availability. B's score is higher; A is easier to reach, which matters more for
an internet-facing host. The point: read the vector, not only the number.

## 3. Compute one (medium)

Using the v3.1 calculator from the prioritisation lesson, what does \`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N\`
score, and which metric differs from the 7.5 Heartbleed vector?

**Answer.** 6.5. It is the Heartbleed vector with PR:N changed to PR:L: needing a low-privilege login lowers
exploitability. The calculator also gives 6.5 for AV:A or UI:R instead, with everything else as Heartbleed's:
three different weaknesses, one number. That is why an analyst reads the vector, not only the score.

## 4. Tier these (medium)

Apply the topic's rule. (a) CVSS 9.1, EPSS 0.03, not KEV, internal HR app, medium. (b) CVSS 5.4, KEV,
internet-facing customer portal, high. (c) CVSS 7.2, EPSS 0.15, not KEV, core banking DB, critical.

**Answer.** (a) P3: there is no exploitation signal, and a CVSS of 9 or more only reaches P2 on an exposed or
critical asset, which this is not; CVSS ≥ 7 gives P3. (b) P1: exploited and internet-facing. (c) P2: EPSS ≥ 0.1 on a critical asset.

## 5. Due dates (easy)

With SLAs P1 7, P2 15, P3 30 days: a P2 first seen on 20 October 2026, and a P1 first seen on 24 October.
On 26 October, which is closer to breaching?

**Answer.** P2 is due 4 November (9 days left); P1 is due 31 October (5 days left). The P1.

## 6. Review an exception (medium)

"F22: TLS 1.0 on payments gateway. Reason: legacy partner. Control: none. Approved by: VM analyst. Expiry: —."
List what is wrong.

**Answer.** No compensating control (restrict TLS 1.0 to the partner's IP range); the analyst cannot accept
business risk (CISO or the business owner must); no expiry (tie it to the partner's upgrade date, ideally a
few months). Reject and send back.

## 7. Classify a re-scan (medium)

Last week: {web-01: V1, V8; dc-01: V5}. This week: {web-01: V8, V9; hr-app: V6}. V6 on hr-app was closed in
September. Classify each.

**Answer.** Fixed: web-01 V1, dc-01 V5. Still open: web-01 V8. New: web-01 V9. Reopened: hr-app V6 (find what
redeployed the old version).

## 8. SBOM matching (harder)

Advisories: yamlish affected \`<5.4\`; fastroute affected \`>=3.0,<3.2\`; certbundle affected
\`<2024.7.4\`. The SBOM has yamlish 6.0.1, fastroute 2.9.1, certbundle 2024.2.2. Which match? For each match,
what is the fix if certbundle is transitive via httpclientx?

**Answer.** Only certbundle 2024.2.2 matches (6.0.1 is not below 5.4; 2.9.1 is below 3.0). Fix: upgrade
httpclientx to a release that requires certbundle 2024.7.4 or later, or pin certbundle ≥ 2024.7.4 if
httpclientx allows it, then regenerate the SBOM and re-scan the image.`,
    mcqs: [
      mcq('An inventory has 40 assets; 31 were scanned in the last 30 days and two unknown devices also answered. What coverage figure goes in the report?', [
        ['78%, with the two unknown devices reported as a separate action', true],
        ['83%, counting the unknown devices as covered assets in the total', false],
        ['100%, since the scanner reached every address in the range given', false],
        ['76%, because unknown devices are subtracted from the scanned count', false],
      ], 'Coverage is inventory assets scanned over inventory assets: 31/40 = 77.5%. Unknown devices are a discovery finding, not coverage; adding or subtracting them distorts the figure, and reaching addresses is not covering known assets.'),
      mcq('Under the topic\'s tiering rule, where does a CVSS 5.4 finding that is in KEV on an internet-facing portal go?', [
        ['P1, because it is exploited and exposed', true],
        ['P3, because its CVSS is below 7.0', false],
        ['P2, because KEV alone is never P1', false],
        ['P4, because medium scores wait', false],
      ], 'Known exploitation on an exposed asset meets the P1 condition whatever the base score. The score-based conditions only apply when there is no exploitation signal, and KEV plus exposure is exactly what P1 is for.'),
      mcq('A P2 was first seen on 20 October with a 15-day SLA. What is its due date?', [
        ['4 November', true],
        ['3 November', false],
        ['5 November', false],
        ['20 November', false],
      ], 'Twenty October plus fifteen days is 4 November (11 days left in October, then 4 more). 3 and 5 November are off by one, and 20 November adds a month instead of fifteen days.'),
      mcq('Starting from the 7.5 Heartbleed vector, what does changing only AC:L to AC:H give?', [
        ['5.9', true],
        ['6.5', false],
        ['5.3', false],
        ['7.5', false],
      ], 'High attack complexity cuts the exploitability weight from 0.77 to 0.44, giving 5.9. 6.5 is what PR:L, AV:A or UI:R give, 5.3 is C:L (lower impact rather than harder exploitation), and 7.5 ignores the change.'),
      mcq('An advisory says fastroute is affected at >=3.0,<3.2. Is fastroute 2.9.1 affected?', [
        ['No, because 2.9.1 is below the lower bound', true],
        ['Yes, because 2.9.1 is below the upper bound', false],
        ['Yes, because every 2.x release is affected', false],
        ['Only if it is a direct dependency of the app', false],
      ], 'Both conditions must hold, and 2.9.1 fails ">=3.0". Checking only the upper bound gives a false match, nothing says all 2.x is affected, and whether a package is direct or transitive does not change whether its version is in the range.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_INTERVIEW_QUESTION',
    notes: `Four questions asked in SOC and vulnerability-analyst interviews at MSSPs, banks and GCCs, each with a
model answer and the follow-up a good answer earns.

## Q1. "A scan returns 3,000 findings. What do you do?"

**Model answer.** "First I clean it: drop informational rows, de-duplicate by host and vulnerability rather
than counting per port, and set aside low-confidence detections to verify. Then I group by vulnerability,
because one patch often closes hundreds of findings. Then I rank by risk, not by CVSS alone: known exploited
(KEV, CERT-In advisories), EPSS, whether the asset is internet-facing, and how critical it is. I give each
tier an SLA and an owner, and I report the handful of exploited-and-exposed items first, because that is
where an attacker will start."

**Follow-up:** "Your manager says just sort by CVSS. Convince them." Say CVSS is severity in general; a 9.8
on a test box with no exploit activity is less urgent than an exploited 6.1 on the internet-facing portal.
Show the two top-five lists side by side; in the topic's data the KEV count in the top five went from 1 to 3.

## Q2. "What is the difference between an authenticated and an unauthenticated scan, and which do you use?"

**Model answer.** "Unauthenticated sees what the network exposes — ports, banners, TLS — like an outside
attacker. Authenticated logs in with a read-only account and reads installed packages and patch levels, so it
finds missing patches behind closed ports and has fewer false positives from backported fixes. I use both: the
outside view for exposure, the authenticated view for real patch state. The scan account is dedicated,
read-only, vaulted and rotated."

**Follow-up:** "An authenticated scan comes back looking unauthenticated. Why?" The login failed: an expired
password, a changed key, a firewall blocking SSH or WinRM from the scanner. Check the per-host
authentication result before trusting the absence of findings.

## Q3. "The vendor has no patch for a critical flaw on a production system. What now?"

**Model answer.** "Reduce exposure until a patch exists: restrict who can reach the service with firewall or
segmentation rules, disable the vulnerable feature if unused, put a WAF or IPS rule in front if one fits, and
add detection for exploitation behaviour so the SOC sees an attempt. Then record an exception with the
compensating controls, approved by the risk owner, with an expiry date, and track the vendor for a fix."

**Follow-up:** "Who approves it, and what happens on the expiry date?" The business or security risk owner
(a CISO, not the analyst). On expiry it returns to SLA tracking automatically; it is renewed only by a fresh
decision.

## Q4. "How would you find out quickly whether a new library vulnerability affects us?"

**Model answer.** "Search our SBOMs. If every release and image has a CycloneDX or SPDX SBOM stored, I search
for the package by purl and compare versions with the affected range using the ecosystem's version rules, not
string comparison. Hits include transitive dependencies. Then I check whether the vulnerable code is reachable
or whether the supplier has issued a VEX statement, rank by exposure, and open tickets to rebuild affected
images."

**Follow-up:** "We don't have SBOMs." Generate them now from deployed images and repositories (Syft, or Trivy
with CycloneDX output), scan the running images directly in the meantime, and make SBOM generation a CI step
so the next advisory is a search.`,
    mcqs: [
      mcq('In an interview you are asked how to handle 3,000 scan findings. Which first step shows the most experience?', [
        ['Clean and de-duplicate, then group by vulnerability before ranking', true],
        ['Open 3,000 tickets at once so that every owner sees their findings', false],
        ['Export the list sorted by CVSS and send it to all system owners', false],
        ['Re-run the scan with more checks enabled to confirm the results', false],
      ], 'Cleaning and grouping turn thousands of rows into a manageable set of fixes, ready for risk ranking. Mass tickets bury owners, a CVSS-sorted dump ignores risk, and re-running a bigger scan adds noise instead of reducing it.'),
      mcq('The interviewer asks who should approve a risk exception for an unpatched production server. Which answer is right?', [
        ['The risk owner, such as the CISO or business owner', true],
        ['The vulnerability analyst who raised the finding', false],
        ['The system administrator who will apply the patch', false],
        ['The scanner vendor\'s support team for that product', false],
      ], 'Accepting risk is a business decision for someone with authority over it. The analyst identifies and tracks risk, the administrator implements fixes, and a vendor cannot accept risk on your behalf.'),
      mcq('Asked how to check exposure to a new library advisory with no SBOMs, what is the best answer?', [
        ['Scan running images now and add SBOM generation to CI', true],
        ['Email every team and wait for each to confirm by hand', false],
        ['Assume no exposure until a team reports a problem', false],
        ['Wait for the vendor to publish a VEX for every app', false],
      ], 'Direct scanning answers today\'s question and SBOMs in CI make the next one a search. Email surveys are slow and unreliable, assuming no exposure is how breaches happen, and VEX comes from suppliers about their own products.'),
    ],
  },

  /* ── CHECKPOINT ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_VULN_MGMT_CHECKPOINT',
    notes: `Ten questions across the topic: inventory and coverage, authorised scanning and reading reports, risk-based
prioritisation, remediation with SLAs and exceptions, and dependencies, SBOMs and images. Answer without
notes; the result shows where to go back.`,
    checkpoint: [
      mcq('Which kind of asset is the greatest risk to a vulnerability programme?', [
        ['One that no inventory knows about', true],
        ['One with the highest CVSS finding', false],
        ['One that is scanned every single day', false],
        ['One that sits in the UAT environment', false],
      ], 'An unknown asset is unscanned, unpatched and unmonitored, so every control misses it. A high finding on a known asset at least has an owner, daily scanning is good, and UAT is a risk only if it is forgotten or holds real data.'),
      mcq('A security team wants to scan a partner\'s hosted payment page that their own app calls. What is the right position?', [
        ['Exclude it unless the partner gives written authorisation', true],
        ['Scan it, since the app depends on it and that makes it in scope', false],
        ['Scan it slowly at night so the partner does not notice the traffic', false],
        ['Scan it only with safe checks, which never need authorisation', false],
      ], 'You may scan only what you own or are permitted to; the partner owns that system. Dependence does not grant permission, hiding the traffic makes it worse, and safe checks are still scanning someone else\'s systems.'),
      mcq('A report has 17 rows: 2 Log rows, 2 with QoD 30, and one flaw listed on two ports of one host. How many findings remain after cleaning?', [
        ['12', true],
        ['13', false],
        ['15', false],
        ['17', false],
      ], '17 minus 2 Log rows minus 2 low-QoD rows (set aside to verify) is 13, and merging the two-port duplicate gives 12. 13 forgets the de-duplication, 15 removes only Log rows, and 17 counts raw rows.'),
      mcq('Which statement about the CVSS base score is accurate?', [
        ['It rates severity from the vector, the same for every organisation', true],
        ['It is a daily probability that the flaw will be exploited in 30 days', false],
        ['It already reflects how critical the affected asset is to you', false],
        ['It is assigned by the scanner from the results on your hosts', false],
      ], 'Base scores come from the vulnerability\'s vector and do not depend on any environment. The 30-day probability is EPSS, asset criticality is yours to add, and scanners report published scores rather than calculating them from your results.'),
      mcq('Under the topic\'s rule, which finding is P1?', [
        ['CVSS 8.1, in KEV, on the domain controller', true],
        ['CVSS 9.8, EPSS 0.02, on a UAT web server', false],
        ['CVSS 8.8, EPSS 0.004, on the main database', false],
        ['CVSS 7.5, in KEV, on an internal printer', false],
      ], 'P1 needs exploitation evidence (KEV or high EPSS) on an exposed or critical asset; the DC is critical. The UAT 9.8 and the database 8.8 have no exploitation signal, and the KEV printer is neither exposed nor critical, so it is P2.'),
      mcq('An exception has a reason, a compensating control and CISO approval, but its expiry passed last week. What should the tracker do?', [
        ['Return the finding to SLA tracking until a new decision', true],
        ['Keep it valid, since the CISO approved it originally', false],
        ['Close the finding, since the exception has completed', false],
        ['Delete the exception so the register stays up to date', false],
      ], 'An expired exception lapses, so the finding is overdue again until renewed or fixed. The original approval was time-limited, expiry does not fix anything, and deleting the record loses the history.'),
      mcq('Which is the correct way to confirm that a patch fixed a finding?', [
        ['A re-scan with the same profile and credentials', true],
        ['The change ticket being marked as implemented', false],
        ['An unauthenticated re-scan from outside the network', false],
        ['The server being restarted after the change window', false],
      ], 'Only the same check, with the same visibility, shows the flaw is gone. Tickets record intent, an unauthenticated scan may simply not see a local finding, and a restart proves nothing about the patch.'),
      mcq('An SBOM shows jsonkit 1.9.2 listed under fastroute, not under the application itself. What does that mean?', [
        ['jsonkit is a transitive dependency, installed because fastroute needs it', true],
        ['jsonkit is a development-only tool that is never shipped in the image', false],
        ['jsonkit is optional, and is only loaded if fastroute is configured to use it', false],
        ['jsonkit belongs to another application that shares the same container image', false],
      ], 'The dependencies section records that fastroute depends on jsonkit, so it is installed as part of the tree. Nothing marks it as dev-only or optional, and an SBOM describes one application\'s components.'),
      mcq('A container image has a HIGH OS-package finding with no fixed version available. What is a sound response?', [
        ['Track it, check if the package is needed, and move to a smaller base', true],
        ['Suppress it permanently, because findings with no fix can never be fixed', false],
        ['Patch the package by hand inside the running container until a fix arrives', false],
        ['Block the image from production until the upstream vendor releases a fix', false],
      ], 'Unfixed findings stay tracked; a slimmer base often removes the package entirely. Permanent suppression hides it when a fix does arrive, hand-patching running containers is lost on restart, and blocking may stop the business for a flaw that may not be reachable.'),
      mcq('Why should EPSS values be looked up on the day you rank, not copied from last quarter\'s report?', [
        ['EPSS is recalculated daily as exploitation data changes', true],
        ['EPSS values are licensed for one use and then expire', false],
        ['EPSS scores are only published once for each new CVE', false],
        ['EPSS changes only when the CVSS vector is revised', false],
      ], 'EPSS is a daily forecast that moves with observed exploitation, so old values mislead. It is freely available, published continuously rather than once, and independent of CVSS revisions.'),
    ],
  },
];
