/**
 * Career-track content: The Security Candidate (CY_PLACE_CANDIDATE), Cybersecurity Analyst, batch CY4 — the last
 * topic of Year-4 placement for the Cybersecurity Analyst track. The shared Year-4 packs teach resume format,
 * aptitude, HR and generic mocks; this is the SOC version: a resume and home-lab portfolio whose every claim can be
 * checked (and that publishes nothing it should not), the entry certifications and the SOC career path, and one
 * complete SOC analyst interview loop. Modelled on AI_PLACE_CANDIDATE and DS_PLACE_FS.
 *
 * The capstone ("A SOC for a Real Organisation": a hospital, a cooperative bank or an e-commerce company, built on an
 * open-source SIEM in a home lab) is described from its unit list; figures quoted for it are illustrative and the
 * notes say so. Certifications are described by what they prove and who asks for them — no prices, no exam versions,
 * no salary bands. The round-0 log problem's output (failure counts and the one flagged pair) was produced by running
 * the Python solution on the sample shown. Defensive only: nothing here shows how to attack anything.
 *
 * Attribution: the topic is multi-skill (PLACEMENT_READINESS default, PORTFOLIO_EVIDENCE, INTERVIEW_PERFORMANCE).
 * Every checkpoint question names its skill with ck(), within what its unit declares; practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const PR = 'PLACEMENT_READINESS';
const PE = 'PORTFOLIO_EVIDENCE';
const IP = 'INTERVIEW_PERFORMANCE';

export const TRACK_CY_PLACE_CANDIDATE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_PLACE_CANDIDATE_RESUME',
    notes: `The shared Year-4 resume pack covers format, length and the basics. This unit is the **security** version: the
resume that gets through the filter for roles titled "SOC Analyst L1", "Security Analyst", "Cyber Security Engineer
— Trainee", "Information Security Analyst" or "Security Operations Associate", and a home-lab portfolio where every
claim can be opened and checked. Security hiring has two problems other hiring does not. First, every applicant
lists the same tools from the same video courses. Second, a security resume is itself a test of judgement — a
candidate who publishes a screenshot with a real IP address or a key in a repository has failed the interview
before it starts.

## Who reads it, and what they filter on

| Employer | Typical first filter | What wins the shortlist |
|---|---|---|
| MSSPs (Hyderabad, Bengaluru, Pune, Chennai) | Networking basics, a SIEM name, willingness for shifts | A home lab with alerts you triaged and wrote up |
| Banks and NBFCs (in-house SOC) | Security fundamentals, Windows and AD, compliance awareness | Careful write-ups; an incident report a manager could read |
| Global capability centres | A SIEM, scripting, an entry certification, communication | Clean, documented repositories; process discipline |
| Product companies and fintechs | Linux, cloud logs, Python, detection as code | Detections with tests; cloud audit-log work |

Almost every one of them runs a **background verification** after the offer: education, previous employment and
often certifications are checked with the issuer. A claim that cannot survive that check is not a risk worth taking.

## The skills line a filter searches

Use the job description's spellings, grouped, and only what you can defend for ten minutes:

    Security operations: alert triage, log analysis, incident response (NIST lifecycle), MITRE ATT&CK mapping
    SIEM and detection:  Wazuh, Elastic (KQL), Sigma rules, detection tuning; Splunk SPL (read and write basics)
    Network:             TCP/IP, DNS, TLS, Wireshark/tshark, Suricata, Zeek
    Endpoint/identity:   Windows event logs, Sysmon, Active Directory basics, Linux auditd/journald, MFA and IAM
    Vulnerability/cloud: authenticated scanning (OpenVAS), CVSS/EPSS prioritisation, AWS CloudTrail, IAM review
    Scripting:           Python (pandas for log analysis), Bash, Git

Leave out what you watched once: "malware reverse engineering", "red teaming", "SOAR", "CrowdStrike", "Palo Alto
firewalls" — unless you have actually used them. Commercial tool names are tempting because JDs list them; if you
used only the open-source equivalent, write the equivalent and be ready to map it ("I wrote KQL in Elastic; I would
expect Sentinel's KQL to take a week"). **Every word on this line is a question in the technical round.**

## Bullets: what you did + the evidence + the measured result

A security bullet is credible when it names the data, the method and a number someone could recount.

- Weak: "Implemented SIEM and monitored threats using Wazuh and ELK."
- Monitoring: "Onboarded 4 log sources (Sysmon, Windows security, Linux auth, Suricata) from 3 lab hosts into Wazuh;
  wrote 12 Sigma detections mapped to ATT&CK, each with a test event that fires it and one benign event that must not."
- Tuning: "Cut a noisy failed-logon detection from 140 to 9 alerts a day on a week of lab logs by excluding a
  scheduled service account (documented, reviewed) — no test case lost."
- Response: "Ran a simulated phishing-to-account-takeover incident on my own lab: timeline of 23 events, containment
  in the playbook's order, and a two-page report for a non-technical reader."
- Vulnerability: "Authenticated OpenVAS scans of 5 lab hosts; 61 findings prioritised to 7 by CVSS, EPSS and asset
  criticality; 6 fixed and verified by re-scan, 1 accepted with a compensating control."

Each number must come from your own lab. The capstone's numbers above are illustrative — replace them with yours,
and keep the spreadsheet or the query that produced each one.

## The home-lab write-up on GitHub

One repository, read in ten minutes by a SOC lead. A layout that works:

    soc-lab/
      README.md            what the lab monitors, a diagram, the results table, how to rebuild it
      architecture.md      hosts, log sources, what each source can and cannot see
      detections/          Sigma rules, each with tests/<rule>/fires.json and tests/<rule>/benign.json
      triage/              three alert write-ups: what fired, what you checked, the disposition and why
      incident/            the simulated incident: timeline, containment decisions, the report
      vulnerability/       scan scope and authorisation note, prioritised list, re-scan proof
      KNOWN_LIMITS.md      blind spots: what an attacker could do that this lab would not see

The README leads with a table: log sources, detections, test pass rate, alert volume before and after tuning, and
mean time to triage in your own exercise. "Known limits" is not a weakness — it is the most senior-sounding page in
the repository.

## What never to publish

A security portfolio that leaks is worse than none. Never publish:

- **Real client, employer or college data** — logs, alerts, tickets, screenshots of a console, even "anonymised".
  Internship work stays internal unless your manager gives written permission, and then only sanitised.
- **Internal IP addresses, hostnames, usernames and domain names** from any real network. Use the documentation
  ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and example.com names in your own lab's samples.
- **Credentials of any kind** — passwords, API keys, Wazuh agent registration keys, cloud access keys, VPN configs.
  If one was ever committed, rotate it: deleting the file does not remove it from git history.
- **Anything from a system you were not authorised to test** — a scan of your college network, a "finding" on a
  company's website, traffic captured on hostel or café Wi-Fi. Publishing it admits to the act.
- **Write-ups of practice-platform challenges** that the platform asks you not to share, and anything that reads as
  an attack tutorial. Your portfolio shows how you defend.

## Copies for different roles — the facts never change, only the order

| Target | Lead with | Push down |
|---|---|---|
| SOC L1 at an MSSP | Triage write-ups, alert volumes, shift readiness | Cloud posture work |
| Bank SOC | Incident report quality, AD and Windows logs, compliance awareness | Container scanning |
| Detection-leaning role | Sigma rules with tests, tuning numbers, ATT&CK coverage | Report writing |
| Cloud security trainee | CloudTrail detections, IAM review, posture findings | On-premise AD |
| Vulnerability analyst | Prioritisation method, re-scan verification, exception handling | Packet analysis |

LinkedIn and Naukri use the same spellings and the same numbers; pin the lab repository in Featured.`,
    workedExample: `**A weak SOC resume section, rewritten.** Karthik, BCA 2026, sends:

    SKILLS: Cyber Security, Ethical Hacking, Kali Linux, Metasploit, Burp Suite, SIEM, Splunk, QRadar, Sentinel,
            CrowdStrike, Firewalls, Malware Analysis, Python, Networking
    PROJECTS
    1. Network Scanner — scanned my college network and found 40 open ports and vulnerabilities.
    2. SIEM Implementation — implemented SIEM for threat detection with 99% detection rate.
    3. Keylogger in Python.

**What a SOC panel sees.** An offensive tool list for a defensive role; three commercial SIEMs he has never logged
into; project 1 is an unauthorised scan of a network he does not own, written up as an achievement; "99% detection
rate" with no denominator; project 3 is malware.

**Step 1 — inventory what is true.** His capstone: a cooperative bank's SOC in a home lab — Wazuh with three hosts,
Sysmon and Linux auth logs, Suricata on the lab segment, 10 Sigma rules mapped to ATT&CK with test events, a tuning
log, a simulated account-takeover incident with a report, and an authenticated scan of his own lab hosts. He has
read Splunk SPL in the course but never run Splunk; he has never used QRadar, Sentinel or CrowdStrike.

**Step 2 — rewrite.**

    SOC for a cooperative bank (home lab)                       github.com/karthik-s/coop-bank-soc
    Wazuh, Elastic (KQL), Sigma, Sysmon, Suricata, Python (pandas)
     - Onboarded Sysmon, Windows security, Linux auth and Suricata logs from 3 lab hosts; wrote 10 Sigma rules
       mapped to ATT&CK, each with a firing and a benign test event — all 20 tests pass in CI.
     - Tuned the failed-logon rule from 140 to 9 alerts a day by scoping out a scheduled service account;
       the change and its review are in the tuning log.
     - Handled a simulated account-takeover incident end to end: 23-event timeline, containment in playbook
       order, a two-page report for the bank's branch manager.
     - Scanned my own lab hosts with OpenVAS (authenticated); prioritised 61 findings to 7, fixed 6 and
       verified by re-scan, accepted 1 with a compensating control.

    SKILLS
    Alert triage, incident response (NIST), ATT&CK mapping | Wazuh, Elastic (KQL), Sigma; Splunk SPL basics
    Wireshark, Suricata, Zeek | Windows event logs, Sysmon, AD basics, Linux auditd | Python, Bash, Git

**Step 3 — remove what must go.** The college scan and the keylogger come off the resume and out of GitHub; he
checks every remaining repository's history for keys. For an MSSP asking for "Splunk/QRadar/Sentinel any", he
keeps the true "Splunk SPL basics" and maps the rest aloud: "the triage method is the same in any SIEM".`,
    mcqs: [
      mcq('Meera\'s lab README shows a Wazuh dashboard screenshot. Which detail must she fix before publishing it?', [
        ['A hostname and a 10.x address from her internship laptop visible in one alert row', true],
        ['The ATT&CK technique names shown next to each alert, because they reveal how her detections work', false],
        ['The alert counts per day, because a reviewer could use them to judge how noisy her rules are', false],
        ['The Sigma rule titles, since publishing detection logic helps attackers avoid being caught', false],
      ], 'An internship machine\'s hostname and internal address are someone else\'s data, published without permission. ATT&CK mapping, alert counts and rule titles from her own lab are exactly the evidence a reviewer wants, and detection logic for a home lab protects nothing.'),
      mcq('An MSSP JD lists "Splunk, QRadar or Sentinel". Rahul has built only in Wazuh and Elastic. How should his resume handle it?', [
        ['List Wazuh and Elastic with what he built, and in the interview map his method to the tools they use', true],
        ['List all three commercial SIEMs as well, because the recruiter filter rejects resumes without one of them', false],
        ['Write "SIEM (all major platforms)", so that he matches every filter without naming a tool he has not used', false],
        ['Leave the SIEM off entirely, because an open-source SIEM signals that he has never seen real enterprise work', false],
      ], 'True tool names with real work behind them hold up in the technical round and in background checks; a panel accepts that triage method transfers between SIEMs. Listing unused products, vague catch-alls or hiding the work all weaken the application.'),
      mcq('Sanjay committed a cloud access key to his lab repository three months ago and deleted the file last week. What is the right fix?', [
        ['Revoke and rotate the key now, then check the provider\'s logs for any use of it since the commit', true],
        ['Nothing more, since the file no longer appears in the repository and nobody can see it any longer', false],
        ['Make the repository private for a month, then make it public again once search engines forget it', false],
        ['Rename the key in a new commit, so anybody scraping repositories for keys sees an unusable value', false],
      ], 'A committed secret lives on in git history and in anyone\'s clone or scrape, so it must be treated as exposed: revoked, rotated, and its use since the commit checked. Deleting, hiding or renaming does not make an exposed key safe.'),
    ],
    checkpoint: [
      ck(PR, 'Anusha\'s bullet says "Monitored threats using SIEM with 98% accuracy". Which rewrite would a SOC lead trust most?', [
        ['The log sources onboarded, the detections with their tests, and alert volume before and after tuning', true],
        ['The same bullet with "98%" changed to "near-perfect", so that there is no figure for the panel to challenge', false],
        ['A longer list of SIEM features she used, such as dashboards, agents, decoders, rules and saved searches', false],
        ['"Passionate SOC enthusiast with hands-on SIEM exposure", which is how many freshers in security write it', false],
      ], 'A number needs a denominator and a method; "accuracy" of monitoring has neither. Sources, tested detections and measured tuning give the panel something real to probe. Vaguer words, feature lists or adjectives avoid the question.'),
      ck(PE, 'Which repository item best backs the bullet "12 Sigma detections, each tested"?', [
        ['A firing and a benign test event per rule, and a CI job whose output shows every test passing', true],
        ['A screenshot of the Wazuh alerts page on the day the lab produced the largest number of alerts', false],
        ['A README paragraph saying that each rule was tested carefully by hand before it was committed', false],
        ['A certificate from an online SIEM course in which detection writing was one of the modules taught', false],
      ], 'Evidence is what produced the claim and can be run again: the test events and the job that checks them. A busy screenshot, a sentence or a course certificate says nothing about these twelve rules.'),
      ck(PE, 'A recruiter asks Farhan to share his best investigation. His strongest one came from his internship at a bank\'s SOC. What should he share?', [
        ['A write-up of a similar alert recreated in his own lab, and an offer to discuss the internship in general terms', true],
        ['The internship ticket with the customer names blurred out, because the method matters far more than the data', false],
        ['The full ticket, because the recruiter is bound by the same confidentiality rules as the bank\'s own staff', false],
        ['A screenshot of the SIEM query he ran there, with the bank\'s logo cropped out of the top of the image', false],
      ], 'Internship work belongs to the employer, and blurring or cropping still leaks their data and breaks trust. Recreating the pattern on his own lab shows the same skill with nothing borrowed, and talking about it in general terms is honest.'),
    ],
  },

  /* ── CERTIFICATIONS ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_PLACE_CANDIDATE_CERTIFICATIONS',
    notes: `Indian security job descriptions name certifications more than most fields do, and freshers spend a lot of money
and months on the wrong ones. This unit covers what each common entry certification actually proves, who asks for
it, how SOC careers progress, and how to choose a first role. Prices, exam versions and renewal rules change —
check each certifying body's own site before you book anything, and do not trust a number from a forum or a
training institute's advertisement.

## What a certification proves — and what it does not

A certification proves you passed an exam on a defined body of knowledge, on a given date. It does **not** prove you
can triage an alert at 3 a.m. That is why a panel asks about your lab regardless. Certifications help in three
ways: they get a resume past a filter that names them, they satisfy a client contract (MSSPs and GCCs sometimes
must show certified staff to a client), and they give you a structured syllabus. Your capstone covers the third
already; the first two are what you are buying.

## The common entry certifications

| Certification | Body | What it proves | Who tends to ask |
|---|---|---|---|
| Security+ | CompTIA | Vendor-neutral breadth: threats, architecture, operations, governance at an entry level | MSSPs and GCCs with US clients; widely recognised baseline |
| CySA+ | CompTIA | Analyst work: monitoring, detection, vulnerability management, incident response | SOC roles one step above entry; often after Security+ or experience |
| Certified in Cybersecurity (CC) | ISC2 | Foundational concepts: principles, access control, network security, operations, incident and continuity concepts | Employers wanting proof of fundamentals from a fresher |
| SC-200 (Security Operations Analyst) | Microsoft | Investigating with Microsoft Sentinel and Defender, writing KQL | Organisations and MSSPs on the Microsoft security stack |
| Splunk entry certifications (e.g. Core Certified User) | Splunk | Searching, reporting and dashboards in Splunk | Teams running Splunk as their SIEM |
| Practical blue-team certifications (e.g. Blue Team Level 1) | Security Blue Team | Hands-on investigation in a timed practical exam | SOC leads who value practical exams over multiple choice |
| CEH | EC-Council | Vocabulary of attack categories and tools, at a theory level | Named often in Indian JDs and some public-sector postings; offensive-leaning |

Notes that matter when choosing:

- **Security+ or ISC2 CC first** if a JD filter is your problem: both are recognised entry baselines. Security+ is
  the more widely named of the two in MSSP and GCC postings; CC is a lighter, fundamentals-only step.
- **SC-200 or a Splunk certification** when you are targeting employers on that stack — they prove a specific
  tool, which an MSSP running that tool for clients can bill for. You learned KQL in Elastic; Sentinel's KQL is close.
- **CySA+ is better as a second certification**, once you have a year of SOC work to anchor it.
- **CEH appears in many Indian JDs**; it teaches attack vocabulary, not defence. If a role you want names it, it
  can open the filter — but your interview will still be about triage and response.
- **Not yet:** CISSP needs several years of paid experience in its domains before full certification; GIAC
  certifications are respected and usually employer-sponsored later; OSCP is an offensive path, not a SOC one.
- Most certifications must be **maintained** — renewal assessments, continuing education credits or fees. Check
  the rule before you book, so a certification does not lapse during your first job.
- Free or low-cost learning paths (vendor training portals, the course material behind ISC2 CC, Google's
  cybersecurity certificate) are good syllabi. A certificate of course completion is not the same as a
  proctored certification, and your resume should name which one you hold.
- A certification on your resume carries its **credential ID or verification link** — background verification
  checks it with the issuer.

## How SOC careers progress

| Role | What the job is | What gets you there |
|---|---|---|
| SOC Analyst L1 | Monitor the queue, triage alerts against runbooks, enrich, escalate with a clear note; shift work | Fundamentals, a SIEM, clear writing — this course |
| SOC Analyst L2 | Investigate escalations, scope incidents, contain with approvals, tune detections | Good L1 judgement, depth in Windows/AD and networks |
| SOC Analyst L3 / lead | Hard cases, threat hunting, mentoring, owning the escalation and detection backlog | Breadth, hunting skill, leadership |
| Detection engineer | Writes, tests and maintains detections as code; owns ATT&CK coverage | Sigma, data knowledge, scripting, testing discipline |
| Incident responder (DFIR) | Leads response to confirmed incidents; forensics; reports | L2 experience, evidence handling, calm under pressure |
| Threat intelligence analyst | Turns reports and feeds into hunts and detections | Reading, ATT&CK, writing for leaders |
| Cloud security analyst / engineer | Cloud audit logs, IAM review, posture, cloud detections | CloudTrail-type logs, IAM, one provider in depth |
| Vulnerability management / GRC | Runs the scan-prioritise-fix cycle, or the risk and audit programme | Prioritisation, communication, frameworks |

A typical path is L1 for one to two years, then L2, then a specialism. The move from L1 is earned by escalation
notes a senior trusts and by tuning ideas that reduce noise — not by the number of certifications.

## Choosing a first role

| Employer | What you get | What it costs you |
|---|---|---|
| MSSP | Breadth: many clients, many tools, high alert volume, fast learning | Rotating 24x7 shifts, runbook-heavy L1 work, client deadlines |
| Bank or NBFC in-house SOC | Depth in one environment, regulatory rigour, incident reports that matter | Slower change, strict process, sometimes older tooling |
| GCC | Global process, documentation, mature tooling, structured training | Shifts aligned to US or European hours, narrower scope at first |
| Product company or fintech | Detection as code, cloud, broad ownership in a small team | Fewer entry openings, less structure, you must learn fast alone |

Ask in every interview: the shift pattern and how often it rotates, the alert volume per analyst, whether L1s may
write or tune detections, how escalation to L2 works, the training and certification support, and any service
agreement or bond. A role where an L1 only closes tickets from a runbook, with no path to tuning or investigation,
teaches less than a smaller team where you touch the whole incident.`,
    workedExample: `**Choosing a certification and a first role — two candidates, the same question.** Both finished the track and
both have the capstone. Both ask: "Which certification should I do first?"

**Divya** wants a SOC L1 role in Hyderabad. Her JD shortlist of fifteen postings (MSSPs and two GCCs) names:
Security+ in nine, CEH in six, SC-200 in four, ISC2 CC in three, Splunk in five. Two of the MSSPs say they
run Microsoft Sentinel for most clients.

A weak plan: "I will do CEH, Security+, CySA+ and SC-200 before I apply, so I am fully qualified." That is months of
study and fees before a single application, and CySA+ before any SOC experience proves little.

A strong plan, written out:

    Goal:          SOC L1 at an MSSP or GCC in Hyderabad, applying from this month
    Evidence now:  capstone repo (Wazuh + Elastic, Sigma with tests, incident report), resume rewritten
    Certification: Security+ first — the most-named entry baseline in my shortlist (9 of 15)
    Second:        SC-200 if I join a Sentinel shop (my KQL from Elastic transfers); employer support asked
    Not now:       CySA+ (after a year of SOC work), CEH (offensive-leaning; only if a target role requires it)
    Apply:         now, in parallel — certification "in progress, exam booked" is honest and acceptable

**Arjun** wants detection engineering at a Bengaluru product company. His shortlist rarely names a certification;
it names Python, Sigma, cloud logs, Git and "detection as code". A certification is not his bottleneck. His plan:
strengthen the detection repository (more rules with tests, a CloudTrail detection, a coverage map against ATT&CK),
apply to product companies, and accept that an L1 role at an MSSP with a path to detection work is a good first step
if no product role comes.

**What the two plans share.** Each starts from real job descriptions, not from a forum list; each counts what the
target employers name; each applies while studying; and each can explain, in one sentence, why this certification
and not the others. That sentence is the answer to the interview question "Why did you choose this certification?"`,
    mcqs: [
      mcq('Nikhil\'s target employers are MSSPs that run Microsoft Sentinel for most of their clients. Which certification adds the most to his application after an entry baseline?', [
        ['SC-200, because it proves investigation with the Sentinel and Defender stack those MSSPs bill for', true],
        ['CISSP, because it is the most respected security certification and outranks every entry certificate', false],
        ['CEH, because MSSP SOC teams mainly need analysts who know how each attack tool is operated', false],
        ['A Splunk certification, because every SIEM shares Splunk\'s query language and its interface', false],
      ], 'SC-200 maps directly to the stack these employers run, which makes him billable sooner. CISSP needs years of experience first, CEH is attack vocabulary rather than investigation, and Splunk\'s SPL is not Sentinel\'s KQL.'),
      mcq('Swathi has six months of SOC L1 experience. Her lead asks what would most help her move to L2. What is the strongest answer?', [
        ['Escalation notes seniors trust, depth in Windows and AD, and tuning ideas that cut noise', true],
        ['Three more certifications, because promotion panels count certifications more than any other evidence', false],
        ['Moving to day shifts, because L2 analysts work only in the day while L1 analysts cover the nights', false],
        ['Closing more tickets per shift than anyone else, regardless of how many of them get reopened later', false],
      ], 'L2 investigates what L1 escalates, so the move is earned by judgement seniors can rely on and by depth in what L2 investigates. Certification counts, shift preference or raw ticket speed do not show that judgement.'),
      mcq('A training institute tells Imran that a "course completion certificate" in SOC is equivalent to a proctored certification. How should he list it?', [
        ['As a course completion under Training, separate from proctored certifications with credential IDs', true],
        ['As a certification, because recruiters never distinguish between the two kinds when they filter resumes', false],
        ['Not at all, because course completions have no value to a SOC hiring panel and only add clutter', false],
        ['As a certification, but leaving out the issuer\'s name so the reviewer cannot check what it was', false],
      ], 'Background verification checks certifications with the issuer, and mislabelling a completion is found there. Listing it honestly still shows the learning; hiding the issuer looks evasive, and dropping it wastes real effort.'),
    ],
    checkpoint: [
      ck(PR, 'Pooja finished the track and wants a SOC L1 role. Which plan is strongest?', [
        ['Count which certifications her target JDs name, book the most-named entry one, and apply in parallel', true],
        ['Complete four certifications before sending any application, so that she is fully qualified for every filter', false],
        ['Skip certifications completely, because a strong lab always replaces them in every recruiter\'s filter', false],
        ['Start with CISSP, since the most senior certification will make the rest of her resume look stronger', false],
      ], 'A plan driven by her own target postings fixes the actual filter problem while the lab carries the interview; applying in parallel loses no time. Waiting for four certificates delays everything, some filters really do name one, and CISSP needs years of experience.'),
      ck(PR, 'Two offers: an MSSP with rotating 24x7 shifts and many clients, and a bank\'s in-house SOC with one environment and strict process. Rakesh wants to become an incident responder. How should he decide?', [
        ['Ask each about investigation depth, escalation and tuning rights; pick what builds IR skill faster', true],
        ['Always take the MSSP, because breadth across many clients is the only route into incident response', false],
        ['Always take the bank, because regulated employers are the only ones that handle real incidents', false],
        ['Take whichever offer has the higher salary, because the type of SOC makes no difference to his career', false],
      ], 'Both can lead to IR; what matters is whether the job lets him investigate, see incidents through and learn from seniors. Either "always" rule ignores the specifics, and pay alone says nothing about the skills he will build.'),
      ck(PR, 'In an interview Sneha is asked, "Why did you choose Security+ and not CEH?" Which answer is strongest?', [
        ['Most of her target postings named it, it covers defensive breadth, and CEH is attack-leaning theory', true],
        ['Because Security+ is the easiest of the entry certifications and she wanted to pass it quickly', false],
        ['Because CEH is worthless and nobody in Indian security hiring respects it any more these days', false],
        ['Because her friends recommended it, and most of them got placed with it within a few months of passing', false],
      ], 'A strong answer gives a reason grounded in her goal and evidence: what employers asked for and what the certification proves. "Easiest", dismissing another credential the panel may hold, or following friends shows no judgement.'),
    ],
  },

  /* ── MOCK_LOOP ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_PLACE_CANDIDATE_MOCK_LOOP',
    notes: `One complete interview day for an **entry SOC analyst** role in India — the shape most MSSPs, bank SOCs and GCCs use.
Pay varies widely by city, employer and shift allowance; check current figures for each company rather than trusting
a forum. Run it with a friend or mentor as interviewer, in one day, with real timers. The question banks are the
other placement topics: SOC Analyst Interview Questions for round 1, SOC Scenario Rounds for round 2.

## Round 0 — Online assessment (75 min, proctored)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 20 min | quant, logical, reading comprehension |
| Networking and security MCQs | 30 min | ports and protocols, the TCP handshake, DNS, TLS, CIA, common attack categories, Windows event IDs |
| Log question | 25 min | a short log extract and a Python or "explain what happened" task |

**Sample log problem.** "Each line is time, result, user, source IP. Print failures per source IP (most first), then
flag any (IP, user) pair with at least five failures followed by a success within ten minutes."

    09:01:05 FAIL priya 203.0.113.7      09:01:31 FAIL priya 203.0.113.7
    09:01:09 FAIL priya 203.0.113.7      09:01:40 OK   priya 203.0.113.7
    09:01:14 FAIL priya 203.0.113.7      09:03:02 FAIL ravi  198.51.100.23
    09:01:20 FAIL admin 203.0.113.7      09:03:30 OK   ravi  198.51.100.23
    09:01:26 FAIL priya 203.0.113.7      09:20:11-13 FAIL deploy 192.0.2.44 (three lines)

A correct solution prints:

    203.0.113.7 6
    192.0.2.44 3
    198.51.100.23 1
    FLAG 203.0.113.7 priya 5 09:01:40

The trap is the grouping: the IP has six failures, but one is for admin, so priya has five — enough to flag. A
solution that counts per IP flags it for the wrong reason; one that requires six per user misses it. **Scored on:**
hidden tests — a success with no prior failures, failures outside the window, several users from one IP. In the
interview, say what the flag means: a possible password-guessing success that needs triage (was it priya, from a
known location, with MFA?), not a confirmed compromise.

## Round 1 — Technical (40 min)

The interviewer picks six or seven from fundamentals, networks, systems and identity, SIEM and IR, for example:
"What happens between typing a URL and the page loading — and where would a defender see each step?", "Which
Windows event shows a successful logon, and which field tells you the logon type?", "A Sigma rule is noisy — how do
you tune it without losing what it should catch?", "Your capstone in three minutes."

**Scored on:** correct, explained plainly, honest at the edge of knowledge, connected to logs a SOC actually has.

## Round 2 — Scenario (40 min)

"An EDR alert: an Office application on a finance user's laptop started PowerShell, which made an outbound
connection to a domain registered last week. Walk me through it." A strong candidate states the first questions
(which host and user, is the alert new or repeated, what else fired), enriches (the domain's age and reputation, the
parent-child chain, other hosts contacting the domain), decides (likely malicious — escalate and isolate per the
runbook, with approval), and writes the escalation note aloud: what, where, when, evidence, action taken, what is
still unknown. Variants: a log bundle with three questions, or a tabletop with injects.

**Scored on:** method and order, evidence before conclusions, a clear disposition, a note an L2 could act on.

## Round 3 — Hiring manager (25 min)

"You are on night shift alone and a critical alert fires on the payment server at 3 a.m. Your L2 does not answer.
What do you do?" → follow the escalation matrix to the next named person, take only the containment the runbook
allows L1 to take, record every step with times, and keep trying — never sit on it until morning. "A client
insists an alert you escalated is a false positive and asks you to stop sending them. What do you do?" → listen,
check the evidence again, propose tuning through the change process with the client's sign-off, never silence it on
your own. "Why SOC and not development?"

**Scored on:** ownership, following process under pressure, client communication, integrity.

## Round 4 — HR (15 min)

"Are you comfortable with rotating night shifts?", "Relocation and the service agreement?", "Higher studies?",
"Expected CTC?" — answers honest and consistent with the resume. Ask your own questions: shift pattern, training,
certification support, the path from L1.

## Scoring sheet (1–4 per row)

| Row | 1 | 4 |
|---|---|---|
| Fundamentals | Errors not noticed | Correct, with the defender's view of each answer |
| Method | Jumps to a conclusion | Questions, enrichment, decision — in order |
| Evidence | "It looks malicious" | Named artefacts: event, field, timestamp, reputation |
| Communication | Rambling or jargon | An escalation note an L2 could act on |
| Integrity | Bluffs, or would bend process | "I don't know — here is how I'd find out"; follows the runbook |
| Composure | Stalls when challenged | Updates the answer and carries on |

## Debrief template (fill within an hour)

    Round / interviewer role:
    Questions asked, verbatim:
    Answered well — why:
    Weak or blank — the question + what a strong answer contains:
    Facts I could not recall (event IDs, ports, fields):
    Fix before the next loop (max 3, each with a date):`,
    mcqs: [
      mcq('Round 0: an IP has six failed logons, five for priya and one for admin, then a success for priya. The rule flags any (IP, user) pair with at least five failures before a success. What should the solution report?', [
        ['A flag for priya from that IP with five failures, because the count is per user', true],
        ['A flag for priya with six failures, because every failure from that IP counts', false],
        ['No flag, because priya has fewer than six failures from that single address', false],
        ['A flag for both priya and admin, because both had failures from the same IP', false],
      ], 'The rule groups by IP and user, so admin\'s failure does not count towards priya: five, which meets the threshold. Counting per IP gives the right flag for the wrong reason, requiring six misses it, and admin never succeeded.'),
      mcq('In round 2 the candidate is told: "Office started PowerShell, which connected to a week-old domain." What should come first in the answer?', [
        ['Which host and user, whether it is new or repeated, and what else fired around the same time', true],
        ['Block the domain at the firewall straight away, then start reading the alert to understand it', false],
        ['Declare a confirmed ransomware incident and ask for the whole finance team to be taken offline', false],
        ['Close it as a false positive, since PowerShell is used every day by administrators for real work', false],
      ], 'Interviewers score the method: establish context first, then enrich and decide. Acting before reading, declaring the worst case without evidence or dismissing a suspicious parent-child chain all skip the triage they are testing.'),
      mcq('Round 3: at 3 a.m. a critical alert fires on a payment server and Kiran\'s L2 does not answer. Which response scores best?', [
        ['Go to the next person on the escalation matrix, take only runbook-allowed steps, and log everything', true],
        ['Wait until the L2 comes online in the morning, since an L1 must never act on a critical alert alone', false],
        ['Shut the payment server down at once, because stopping the server ends any possible damage to it', false],
        ['Post the alert details in a public security forum to get fast advice from experienced analysts', false],
      ], 'Ownership within process: the escalation matrix exists for this, and runbooks say what L1 may do alone. Waiting loses hours, an unapproved shutdown of a payment system causes its own incident, and posting client data publicly is a breach.'),
      mcq('A client tells Lavanya to stop sending them an alert they call a false positive. What is the best response in the hiring-manager round?', [
        ['Re-check the evidence, explain it, and propose tuning through change control with the client\'s sign-off', true],
        ['Disable the rule for that client at once, since the client is paying and their request is final', false],
        ['Keep sending the alert unchanged, because clients cannot judge which of the alerts really matter to them', false],
        ['Forward the complaint to HR, because pressure from a client is a workplace conduct matter', false],
      ], 'The panel wants client care and integrity together: listen, verify, and change detections only through a recorded, approved process. Silencing it alone hides risk; ignoring the client damages trust; HR has nothing to do with tuning.'),
      mcq('After the mock day, Aditya\'s debrief says "Technical round was average". Which rewrite is most useful?', [
        ['"Could not name the logon-type field for event 4624; revise Windows logon events by 20 Nov and retest"', true],
        ['"Technical round was average; I will go through every security topic again over the coming two weeks"', false],
        ['"The technical interviewer asked questions far beyond what a fresher SOC L1 analyst is expected to know"', false],
        ['"I felt tired during the technical round, so I need to sleep earlier on the night before interviews"', false],
      ], 'A useful debrief names the exact gap and a dated fix. Revising everything, blaming the interviewer or noting tiredness gives nothing specific to practise before the next loop.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_PLACE_CANDIDATE_CHECKPOINT',
    notes: `This checkpoint measures the judgement a SOC hiring panel looks for: a resume whose every claim has evidence behind it,
a portfolio that publishes nothing it should not, certifications chosen for a reason, and method and integrity
across the interview day.

Recall the rules of this topic:
- **Every claim is checkable** — a repository, a test, a write-up, a credential ID.
- **Nothing published that is not yours** — no real data, internal addresses, credentials or unauthorised testing.
- **Method before conclusions**, and process followed under pressure.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck(PR, 'Gautam is applying for SOC L1 roles. His skills line lists "Metasploit, Burp Suite, Kali Linux, malware development". What should he do?', [
        ['Replace it with the defensive skills he used — triage, a SIEM, Sigma, Windows logs — that the role asks for', true],
        ['Keep the list, since knowing offensive tools always impresses SOC panels more than defensive skills', false],
        ['Add more offensive tools so the line looks longer than the lines of the other applicants he competes with', false],
        ['Move the list to the top of his resume, so the recruiter sees his most advanced skills before anything else', false],
      ], 'A SOC role filters for defensive work, and "malware development" raises an integrity question on any resume. The line should name what he did that matches the job, each item defensible in the technical round.'),
      ck(PR, 'A GCC JD asks for "SIEM, Windows event logs, incident documentation, Security+ preferred". Leela has the lab and is studying for Security+ with the exam booked. How should her resume show it?', [
        ['"Security+ (exam booked, month)", with her lab work leading the page', true],
        ['"Security+ certified", since she will have passed by the time they check', false],
        ['Nothing about Security+, as an unfinished certification counts against her', false],
        ['"Security+ equivalent", because her lab covered what the exam covers', false],
      ], 'Stating the real status is honest and still meets a "preferred" line; claiming a certification before passing fails background verification. Hiding it wastes a relevant signal, and "equivalent" is a claim no one can check.'),
      ck(PR, 'Vinay has offers from a GCC with US-hours shifts and a fintech with a three-person security team. He wants detection engineering. Which question matters most before deciding?', [
        ['Whether he will write and test detections in his first year, and who will review his work', true],
        ['Which of the two offices is closer to where he lives in the city, since commuting time affects shift work', false],
        ['Which company has more followers on LinkedIn, since a well-known brand helps any later job switch', false],
        ['Which role has the more senior-sounding job title, since titles decide the level of his next job', false],
      ], 'His goal is detection engineering, so the deciding fact is whether either job lets him do it with feedback. Commute, brand and title matter less than the skills the first year actually builds.'),
      ck(PE, 'Which item should NOT appear in Ritu\'s public SOC lab repository?', [
        ['The Wazuh agent registration key from her lab, kept in a config file so the lab rebuilds in one step', true],
        ['Synthetic log samples that use the 192.0.2.0/24 and 203.0.113.0/24 documentation address ranges', false],
        ['A KNOWN_LIMITS.md that lists attacks her lab would fail to see, and the reasons each one is missed', false],
        ['Sigma rules with the test events that make each one fire, and benign test events that must not fire', false],
      ], 'Credentials never go in a repository, even lab ones — they belong in an environment variable or a local file excluded by .gitignore. Documentation ranges, honest limits and tested rules are exactly what the repository should show.'),
      ck(PE, 'Harish\'s README claims "mean time to triage fell from 18 to 7 minutes after I wrote enrichment scripts". What makes this claim checkable?', [
        ['The triage log with start and end times for each exercise, and the script that computes both means', true],
        ['A screenshot of a stopwatch app showing 7 minutes, taken while he was triaging one of his lab alerts', false],
        ['A quote from a friend who watched him triage several of his lab alerts and agreed that he got faster', false],
        ['The enrichment scripts alone, since anyone who reads them can see that they would make triage faster', false],
      ], 'A before-and-after mean needs the raw timings and the calculation, so a reviewer can recount it. One stopwatch reading, a friend\'s opinion or the scripts themselves do not measure the change.'),
      ck(PE, 'Sravani wants to show threat-hunting skill. Which portfolio piece is appropriate?', [
        ['A hypothesis, the searches run on her own lab\'s logs, what she found, and the Sigma rule that came out of it', true],
        ['Logs she collected from her college hostel network, to show the hunt worked against real-world traffic', false],
        ['A list of malicious domains she found by probing a few small company websites from her own laptop', false],
        ['A step-by-step guide to the attack technique she was hunting for, so readers understand what to look for', false],
      ], 'A hunt write-up on data she owns shows the full method and ends in a detection. Hostel traffic and probing companies are unauthorised, and an attack guide is not defensive evidence.'),
      ck(IP, 'In round 1, Mohan is asked about Kerberos and realises he does not remember how a ticket-granting ticket is issued. What should he do?', [
        ['Say what he knows, name the gap honestly, and say where he would check — then give the defender\'s view', true],
        ['Make up a confident explanation, because a pause would make him look badly under-prepared to the panel', false],
        ['Say that Kerberos is no longer used, so the question is not relevant for a modern SOC analyst role', false],
        ['Change the subject to his capstone, where he can speak with confidence about the work that he did', false],
      ], 'Panels score honesty at the edge of knowledge; a confident wrong answer is worse than a named gap. Kerberos is central to Active Directory, and dodging to another topic leaves the gap unaddressed.'),
      ck(IP, 'In the scenario round, the interviewer adds: "The domain is also contacted by four other finance laptops." How should Shreya change her answer?', [
        ['Widen the scope: check each host, treat it as a possible campaign, escalate with the new evidence', true],
        ['Keep her plan for the one laptop, since changing it now would look indecisive to the interviewer', false],
        ['Declare it a false positive, because a domain that many machines contact is likely to be legitimate', false],
        ['Ask the interviewer to tell her whether it is malicious before she decides on what to do next', false],
      ], 'Injects test whether the candidate updates on evidence. More hosts on a new domain widens scope and urgency; sticking to the old plan, assuming popularity means safety, or handing the decision back all fail that test.'),
      ck(IP, 'A hiring manager asks Tarun: "Your capstone tuning cut alerts from 140 to 9 a day. How do you know you did not hide real attacks?" Which answer is strongest?', [
        ['Every rule\'s firing tests still pass, the exclusion is narrow and documented, and he names what it could miss', true],
        ['Real attacks always produce many alerts, so a drop to nine a day cannot possibly hide any of them', false],
        ['He reviewed the remaining nine alerts by hand and none of them were attacks, so nothing was hidden', false],
        ['Tuning is always safe once the alert count is under ten a day, which is the usual SOC target', false],
      ], 'Tuning trades noise for blind spots, so the answer must show the trade was checked: tests that still fire, a scoped exclusion, and an honest residual risk. Volume assumptions or reviewing what remains says nothing about what was removed.'),
      ck(IP, 'In the HR round, Pallavi is asked: "Are you comfortable with rotating night shifts?" She prefers days but will accept shifts for the first year. What is the best answer?', [
        ['Say honestly she can do them, and ask about the pattern and how it changes later', true],
        ['Say she loves night shifts, because any hesitation at this stage will cost her the offer', false],
        ['Say she cannot do night shifts, and hope the team will make an exception once she joins', false],
        ['Avoid the question and talk about her capstone instead, so the topic does not come up again', false],
      ], 'Honest and specific answers build trust, and asking about the pattern shows she has thought about it. Overstating enthusiasm, refusing then hoping for an exception, or dodging creates problems after joining.'),
    ],
  },
];
