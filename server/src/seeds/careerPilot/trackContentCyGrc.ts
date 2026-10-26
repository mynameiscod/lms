/**
 * Career-track content: Governance, Risk and Compliance (CY_GRC), Cybersecurity Analyst, batch CY3.
 *
 * The analyst's view of GRC: what ISO/IEC 27001:2022, NIST CSF 2.0 and CIS Controls v8 are for and how SOC
 * work maps to them, a risk register leaders can act on, Indian obligations (CERT-In directions, the DPDP
 * Act, RBI and SEBI expectations) in outline, and policies and audit evidence that prove a control works.
 * It builds on Year 3's "What to Fix First" (likelihood, impact, the four responses) and on CY2's incident
 * reporting lesson, and refers back rather than re-teaching them.
 *
 * Kosha Pay, the fictional Bengaluru fintech from CY2, runs through the topic. The risk register, heat map,
 * control-mapping table and evidence checklist were produced by running pandas/PyYAML on synthetic data,
 * and the outputs shown are the real ones. Framework structure is stated only where certain; Indian rules
 * are given in outline with students told to read the current text. One skill: SECURITY_FUNDAMENTALS.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CY_GRC_BUNDLES: PilotBundle[] = [
  /* ── FRAMEWORKS ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_FRAMEWORKS',
    notes: `Sooner or later someone at work asks you "which control is this?" A customer's security questionnaire
wants your ISO 27001 certificate; an auditor wants to see how the SOC meets "monitoring activities"; the
CISO's board slide shows NIST CSF functions coloured red, amber and green. GRC — governance, risk and
compliance — is the part of security that makes the work visible and accountable to people outside the
SOC. You do not need to become an auditor. You do need to speak the three frameworks you will hear most.

## Three different kinds of thing

The frameworks are often listed together as if they competed. They do different jobs.

| | ISO/IEC 27001 | NIST CSF 2.0 | CIS Controls v8 |
|---|---|---|---|
| What it is | Requirements for a management system | A set of outcomes, organised by function | A prioritised list of technical safeguards |
| Question it answers | "Is security run as a managed, improving process?" | "What outcomes should our programme achieve?" | "What do we do first?" |
| Certifiable? | Yes, by an accredited certification body | No — voluntary, self-assessed | No — self-assessed |
| Who asks for it | Customers, especially for GCC and export work | Boards, US-linked organisations, programme leads | Teams that need a concrete starting list |

## ISO/IEC 27001:2022

ISO/IEC 27001 specifies an **information security management system (ISMS)**: a way of running security
that sets scope, assesses risk, chooses controls, measures them and improves. The body of the standard is
clauses 4 to 10:

4. Context of the organisation (scope, interested parties)
5. Leadership (top management commitment, the information security policy, roles)
6. Planning (risk assessment and risk treatment, objectives)
7. Support (resources, competence, awareness, documented information)
8. Operation (carrying out the risk treatment plan)
9. Performance evaluation (monitoring, internal audit, management review)
10. Improvement (nonconformity, corrective action, continual improvement)

**Annex A** lists reference controls. The 2022 edition has **93 controls in four themes**: Organizational
(37), People (8), Physical (14) and Technological (34). Controls are numbered by theme — 5.x organizational,
6.x people, 7.x physical, 8.x technological — so "8.16" is the technological control *Monitoring
activities*. The companion standard **ISO/IEC 27002** gives guidance on implementing each control.

The organisation does not have to apply all 93. It writes a **Statement of Applicability (SoA)**: every
Annex A control, whether it is included, why (usually a risk from the register), and whether it is in
place. An excluded control needs a justification an auditor will accept.

Certification works in stages: a Stage 1 audit reviews the documents and readiness, a Stage 2 audit checks
the ISMS is actually running, then surveillance audits follow during a three-year certificate cycle. A
certificate covers a **scope** — "the payments platform and its Bengaluru operations" — so always read the
scope before treating a supplier's certificate as covering the service you buy.

## NIST CSF 2.0

The NIST Cybersecurity Framework 2.0 (published in 2024) organises outcomes under **six functions**:

| Function | Code | Categories |
|---|---|---|
| Govern | GV | Organizational Context, Risk Management Strategy, Roles/Responsibilities/Authorities, Policy, Oversight, Cybersecurity Supply Chain Risk Management |
| Identify | ID | Asset Management, Risk Assessment, Improvement |
| Protect | PR | Identity Management/Authentication/Access Control, Awareness and Training, Data Security, Platform Security, Technology Infrastructure Resilience |
| Detect | DE | Continuous Monitoring, Adverse Event Analysis |
| Respond | RS | Incident Management, Incident Analysis, Reporting and Communication, Incident Mitigation |
| Recover | RC | Incident Recovery Plan Execution, Incident Recovery Communication |

**Govern** is new in 2.0, and NIST draws it around the other five: it sets the strategy, roles, policy and
oversight that the rest depends on. Categories have short codes (DE.CM is Continuous Monitoring) and split
into subcategories. An organisation describes where it is and where it wants to be as a **Current Profile**
and a **Target Profile**; the gap between them is the plan. **Tiers** (Partial, Risk Informed, Repeatable,
Adaptive) describe how mature the risk practices are — they are not a score to maximise everywhere.

You met NIST's incident lifecycle (SP 800-61) in "The Incident Response Lifecycle"; its newer revision is
organised around these same six functions.

## CIS Controls v8

The Center for Internet Security's Controls v8 are **18 controls**, each broken into **safeguards**, ordered
roughly by what to do first: (1) inventory of enterprise assets, (2) inventory of software, (3) data
protection, (4) secure configuration, (5) account management, (6) access control management, (7) continuous
vulnerability management, (8) audit log management, (9) email and web browser protections, (10) malware
defences, (11) data recovery, (12) network infrastructure management, (13) network monitoring and defence,
(14) security awareness and skills training, (15) service provider management, (16) application software
security, (17) incident response management, (18) penetration testing.

Safeguards are grouped into **Implementation Groups**: IG1 is the "essential cyber hygiene" every
organisation should do; IG2 and IG3 add safeguards for organisations with more to protect and more staff
to do it. A 60-person cooperative bank branch office starts at IG1. CIS has published a v8.1 update; check
which version an assessment uses.

## How they fit together

A sensible programme uses all three: ISO 27001 to **run** security as a managed system (and to get the
certificate customers want), NIST CSF to **describe** the programme to leadership by function, and CIS to
**choose** concrete technical work in a sensible order. Each control maps to the others, imperfectly; CIS
and NIST publish mappings, and many GRC teams keep their own.

## Where your SOC work lands

Almost everything a SOC analyst does is evidence for some control:

- Triaging alerts — ISO 8.16 Monitoring activities; CSF DE.CM and DE.AE; CIS 8 and 13.
- Onboarding a log source — ISO 8.15 Logging; CSF DE.CM; CIS 8.
- Handling an incident — ISO 5.24–5.28 (planning, assessing events, responding, learning, collecting
  evidence); CSF RS; CIS 17.
- Using threat intelligence — ISO 5.7 Threat intelligence (new in 2022); CSF ID.RA.

That is why your tickets matter: a closed alert with a reason, a timestamp and a name is what an auditor
samples to see that "monitoring activities" happen.

Two more names you will hear: **SOC 2**, an attestation report on a service organisation's controls that US
customers often ask Indian GCCs and SaaS firms for, and **PCI DSS**, the card industry's standard for
anyone storing, processing or transmitting card data. Both are contractual rather than Indian law.`,
    workedExample: `**Task: Kosha Pay's new customer, a UK lender, asks "how does your SOC map to ISO 27001, NIST CSF and CIS?"
Build the table from the SOC's real activities, and find the gaps.**

Start from what the SOC actually does, not from the framework: list the activities, then map each one
(four of the SOC's rows are shown). As a DataFrame the table can be filtered, exported and re-used.

    import pandas as pd

    mapping = [
        ("Triage SIEM alerts every shift", "8.16 Monitoring activities", "DE.CM / DE.AE",
         "8 Audit Log Management; 13 Network Monitoring and Defense"),
        ("Review dormant and privileged accounts monthly", "5.18 Access rights; 8.2 Privileged access rights",
         "PR.AA", "5 Account Management; 6 Access Control Management"),
        ("Handle a confirmed incident with the playbook", "5.26 Response to information security incidents",
         "RS.MA / RS.AN", "17 Incident Response Management"),
        ("Send a threat-intel advisory to IT", "5.7 Threat intelligence", "ID.RA", "(no direct control)"),
    ]
    cm = pd.DataFrame(mapping, columns=["activity", "ISO 27001:2022 Annex A", "NIST CSF 2.0", "CIS Controls v8"])
    gaps = cm[cm["CIS Controls v8"].str.startswith("(")]
    print("rows with no CIS control:", len(gaps), gaps["activity"].tolist())
    long = cm.melt(id_vars="activity", var_name="framework", value_name="reference")
    print(long[long["activity"] == "Triage SIEM alerts every shift"].to_string(index=False))

Output:

    rows with no CIS control: 1 ['Send a threat-intel advisory to IT']
                          activity              framework                                                 reference
    Triage SIEM alerts every shift ISO 27001:2022 Annex A                                8.16 Monitoring activities
    Triage SIEM alerts every shift           NIST CSF 2.0                                             DE.CM / DE.AE
    Triage SIEM alerts every shift        CIS Controls v8 8 Audit Log Management; 13 Network Monitoring and Defense

**Reading it.** One activity maps to several references, and that is normal: frameworks slice the work
differently. The threat-intel row has no CIS control — CIS v8 has no control dedicated to threat
intelligence — which is a real difference between frameworks, not a gap in the SOC. A real gap is the
opposite case: a control the organisation claims in its Statement of Applicability with **no** activity
behind it.

**What goes to the customer.** The table, plus for each row the evidence you could show (the ticket
export, the log-source inventory, last month's access review). A mapping without evidence is a claim.`,
    mcqs: [
      mcq('Kosha Pay\'s sales team says "we follow NIST CSF, so we can send the UK lender our CSF certificate". What is wrong with this?', [
        ['CSF is a voluntary framework with no certification scheme to send', true],
        ['CSF certificates expire after a year and theirs has probably lapsed', false],
        ['CSF certificates are issued only to US federal agencies, not to firms', false],
        ['The lender needs the CSF certificate plus the ISO 27001 one to accept it', false],
      ], 'NIST CSF is self-assessed: an organisation describes Current and Target Profiles, but there is no CSF certificate. ISO/IEC 27001 is the certifiable one. The expiry and "federal only" options invent a certificate that does not exist.'),
      mcq('An auditor reviewing a 2022-edition ISMS asks which document lists every Annex A control with whether it is included and why. What is it?', [
        ['The Statement of Applicability', true],
        ['The information security policy', false],
        ['The risk treatment plan\'s action list', false],
        ['The internal audit programme for the year', false],
      ], 'The Statement of Applicability records each of the 93 Annex A controls, its inclusion or exclusion with justification, and its status. The policy states intent, the treatment plan lists actions for risks, and the audit programme schedules audits — none lists every control.'),
      mcq('A 60-person cooperative bank with two IT staff wants a concrete, ordered starting list of technical safeguards. Which framework fits that need best?', [
        ['CIS Controls v8, starting with Implementation Group 1', true],
        ['NIST CSF 2.0, starting from the Govern function\'s categories', false],
        ['ISO/IEC 27001, starting from clause 4 on the organisation\'s context', false],
      ], 'CIS Controls are prioritised technical safeguards, and IG1 is the essential-hygiene set sized for small teams. CSF describes outcomes rather than an ordered to-do list, and ISO 27001 sets up a management system — both are useful, but neither gives the small team its first concrete steps.'),
    ],
    checkpoint: [
      mcq('In ISO/IEC 27001:2022, how are the Annex A controls organised?', [
        ['93 controls in four themes: organizational, people, physical, technological', true],
        ['114 controls in fourteen domains, from policy through to compliance', false],
        ['18 controls with safeguards grouped into three implementation groups', false],
        ['Six functions split into categories and then into subcategories', false],
      ], 'The 2022 edition has 93 controls in four themes. 114 controls in 14 domains was the 2013 edition; 18 controls with IGs is CIS v8; six functions with categories is NIST CSF 2.0 — all real, but not ISO 27001:2022.'),
      mcq('Which NIST CSF 2.0 function is new compared with version 1.1, and covers strategy, roles, policy and oversight?', [
        ['Govern', true],
        ['Identify', false],
        ['Protect', false],
        ['Recover', false],
      ], 'CSF 2.0 added Govern and draws it around the other five functions. Identify, Protect and Recover existed in 1.1 alongside Detect and Respond; risk strategy and oversight sat partly in Identify before, which is why Identify is the tempting wrong answer.'),
      mcq('An L1 analyst closes an alert in the SIEM with a reason, a timestamp and her name. Which ISO/IEC 27001:2022 Annex A control does that record most directly evidence?', [
        ['8.16 Monitoring activities', true],
        ['5.1 Policies for information security', false],
        ['6.3 Information security awareness, education and training', false],
      ], 'A triaged alert shows that networks and systems are monitored and anomalies acted on, which is 8.16. Policies (5.1) and awareness training (6.3) are real controls, but a closed alert proves neither — it proves the monitoring happened.'),
    ],
  },

  /* ── RISK_ASSESSMENT ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_RISK_ASSESSMENT',
    notes: `Year 3's "What to Fix First" gave you likelihood against impact and the four responses — mitigate, accept,
transfer, eliminate — and the rule that a risk with no owner is a risk nobody is fixing. This lesson turns
that into the organisation's **risk register**: the document ISO 27001 clause 6 expects, the CISO reports
from, and leaders decide on. Analysts feed it constantly — a vulnerability with no patch, a log source that
cannot be collected, an incident that showed a weakness — so you need to write entries that survive.

## Writing a risk, not a worry

"Cyber attack" is not a risk. Neither is "ransomware". A usable risk names the **cause**, the **event** and
the **consequence**, so someone can see what would reduce it:

- Weak: "Phishing."
- Usable: "A finance user is phished and the attacker uses the session to change a vendor's bank details,
  causing a payment to the wrong account."

The usable version tells you where the controls go: phishing defences reduce the cause, a call-back on
beneficiary changes stops the event, a payment hold limits the consequence.

## Scales with anchors

Five-point scales are common. The numbers mean nothing without **anchors** — written definitions everyone
scores against. Kosha Pay's (an example, not a standard):

| Score | Likelihood | Impact |
|---|---|---|
| 1 | Not expected in 5 years | Under ₹1 lakh, no customer effect |
| 2 | Possible in 5 years | ₹1–10 lakh, or a few customers affected |
| 3 | Possible this year | ₹10 lakh–1 crore, or a reportable incident |
| 4 | Likely this year | ₹1–10 crore, regulator attention, a day's outage |
| 5 | Expected, or happening elsewhere now | Over ₹10 crore, licence or partner-bank relationship at risk |

Without anchors, a nervous engineer scores everything 5 and a confident one everything 2, and the register
measures personalities.

## Score, rating and its limits

**Score = likelihood × impact**, from 1 to 25, then a **rating** band (Low, Medium, High, Critical) that
decides who must look at it. Know the limits: these are ordinal numbers. A 4×5 and a 5×4 both score 20 but
are different risks; a 20 is not "twice" a 10. The score is a sorting aid for a conversation, not a
measurement. Quantitative methods (such as FAIR, which estimates loss in money with ranges) exist for when
a decision needs real numbers.

## Inherent, residual, appetite

- **Inherent risk** — the score before the planned treatment.
- **Residual risk** — the score expected once the treatment is in place.
- **Risk appetite** — how much risk leadership is willing to carry, written down as a threshold ("no
  residual risk of 10 or above without CEO sign-off").

Treatments map onto the four responses you know; ISO's risk standard (ISO/IEC 27005) calls them modify,
retain, avoid and share.

## The register in pandas

Kosha Pay keeps its register in a spreadsheet; a pandas version makes the scoring and banding repeatable:

    import pandas as pd

    rows = [
        ("R01", "Phished finance session changes vendor bank details", "Head of Finance Ops", 4, 5, "Mitigate", 2, 4),
        ("R02", "Unpatched internet-facing VPN appliance exploited", "IT Infra Lead", 3, 5, "Mitigate", 2, 5),
        ("R03", "KYC bucket made public by misconfiguration", "Platform Lead", 2, 5, "Mitigate", 1, 5),
        ("R04", "Ransomware encrypts file servers and backups", "IT Infra Lead", 2, 4, "Mitigate", 2, 2),
        ("R05", "Proxy logs kept 7 days, incidents cannot be scoped", "SOC Manager", 4, 3, "Mitigate", 1, 3),
        ("R06", "Payroll SaaS vendor breached, staff PII exposed", "HR Director", 2, 3, "Transfer", 2, 2),
        ("R07", "Legacy reporting server cannot be patched (EOL)", "CTO", 3, 2, "Accept", 3, 2),
        ("R08", "Old ex-customer marketing database kept", "Head of Marketing", 3, 3, "Eliminate", 1, 1),
    ]
    reg = pd.DataFrame(rows, columns=["id", "risk", "owner", "L", "I", "treatment", "res_L", "res_I"])
    reg["score"] = reg["L"] * reg["I"]
    reg["residual"] = reg["res_L"] * reg["res_I"]
    reg["rating"] = pd.cut(reg["score"], bins=[0, 4, 9, 14, 25], labels=["Low", "Medium", "High", "Critical"])
    reg = reg.sort_values(["score", "I"], ascending=False)
    print(reg[["id", "L", "I", "score", "rating", "treatment", "residual", "owner"]].to_string(index=False))

Output:

     id  L  I  score   rating treatment  residual               owner
    R01  4  5     20 Critical  Mitigate         8 Head of Finance Ops
    R02  3  5     15 Critical  Mitigate        10       IT Infra Lead
    R05  4  3     12     High  Mitigate         3         SOC Manager
    R03  2  5     10     High  Mitigate         5       Platform Lead
    R08  3  3      9   Medium Eliminate         1   Head of Marketing
    R04  2  4      8   Medium  Mitigate         4       IT Infra Lead
    R06  2  3      6   Medium  Transfer         4         HR Director
    R07  3  2      6   Medium    Accept         6                 CTO

\`pd.cut\` with bins [0, 4, 9, 14, 25] makes each band include its upper edge, so 9 is Medium and 10 is High
— decide the edges deliberately and write them in the methodology. Sorting on impact as a tie-breaker puts
the higher-impact of two equal scores first.

## What makes leaders use it

- **Owners are business people.** The Head of Finance Ops owns R01, not the SOC: they decide on the
  call-back process and accept the friction.
- **Each treatment is an action with a date**, not "improve security".
- **Accepted risks expire.** R07 is accepted until a stated date, then reviewed — an acceptance with no end
  becomes permanent by default.
- **It is reviewed on a cadence** (quarterly, and after any major incident or change) and the review is
  recorded.
- **It is short at the top.** Leaders see the few risks above appetite and the decisions needed, not 200
  rows.

## Where the analyst comes in

You raise risks from what you see: R05 came from an incident review in which proxy logs had expired. Write
the cause–event–consequence, suggest likelihood and impact against the anchors with a reason, propose a
treatment, and let the risk owner decide.`,
    workedExample: `**Task: turn Kosha Pay's register into the one-page picture the CEO and CISO review each quarter.**

A heat map places each risk in a grid of impact (rows, 5 at the top) against likelihood (columns). Using the
\`reg\` DataFrame from the lesson:

    cell = reg.groupby(["I", "L"])["id"].apply(lambda s: ",".join(sorted(s)))
    heat = cell.unstack("L").reindex(index=[5, 4, 3, 2, 1], columns=[1, 2, 3, 4, 5]).fillna("")
    heat.index.name = "Impact / Likelihood"
    print(heat.to_string())
    print("inherent total", reg["score"].sum(), "residual total", reg["residual"].sum())
    print("still above appetite (residual >= 10):", reg.loc[reg["residual"] >= 10, "id"].tolist())

Output:

    L                   1    2    3    4 5
    Impact / Likelihood
    5                      R03  R02  R01
    4                      R04
    3                      R06  R08  R05
    2                           R07
    1

    inherent total 86 residual total 41
    still above appetite (residual >= 10): ['R02']

(\`pd.crosstab(reg["I"], reg["L"])\` gives the same grid as counts, if you want numbers instead of ids.)

**Reading it.** The top-right corner holds R01 and R02. Treatment plans bring R01 from 20 to 8 — the
call-back cuts likelihood, but impact stays 4 because a fraud that got through would still be costly.
R02 only falls from 15 to 10: patching and MFA reduce likelihood, but an exploited VPN appliance still
reaches the whole network, so impact stays 5. Summing scores ("86 down to 41") is a rough trend only;
ordinal scores do not really add, and a board should not be shown the total as if it were rupees.

**The page for leaders:**

1. **Decision needed:** R02 stays above appetite (residual 10) after treatment. Options: accept with CEO
   sign-off until the appliance is replaced in Q1; fund replacement now; or put the VPN behind a zero-trust
   access broker. Owner: IT Infra Lead. Cost and date for each.
2. **On track:** R01 call-back live from 1 Nov; R05 retention raised and logs in the SIEM.
3. **Accepted:** R07, isolated VLAN, acceptance expires 31 Mar 2027.
4. **Changes since last quarter:** R05 added after the March incident review.

The heat map supports the conversation; the page asks for one decision with options, an owner and dates.
That is what "a register leaders actually use" looks like.`,
    mcqs: [
      mcq('After a SOC incident review, an analyst adds "Ransomware — High — IT" to Kosha Pay\'s risk register. Why will the risk owner struggle to act on it?', [
        ['It names no cause or consequence, so nobody can see where a control goes', true],
        ['It is missing a CVSS score, which every register entry needs for ranking', false],
        ['Ransomware is an impact, so it belongs in the incident log, not the register', false],
        ['The rating should be a number from 1 to 25 rather than a word like High', false],
      ], 'A risk written as cause, event and consequence shows where to reduce it; a one-word threat does not, and "IT" is a department rather than an owner. CVSS scores vulnerabilities, not organisational risks; ransomware is a legitimate risk; a word rating is fine once the scale is anchored.'),
      mcq('Two Kosha Pay risks score 20: one is likelihood 4 × impact 5, the other likelihood 5 × impact 4. What does the equal score tell the CISO?', [
        ['Only that they sort together; they are different risks needing different treatment', true],
        ['That they carry the same expected loss in rupees and can be funded identically', false],
        ['That one of them has been scored wrongly, since equal scores mean a duplicate', false],
      ], 'Likelihood and impact scores are ordinal, so the product is a sorting aid. A frequent, smaller loss and a rarer, larger one need different controls. The scores are not rupees, and equal products are common, not a sign of duplication.'),
      mcq('A risk is accepted because a legacy server cannot be patched. What makes that acceptance sound rather than a quiet way of ignoring it?', [
        ['A named owner signs it, with compensating controls and an expiry date', true],
        ['The SOC is told about the server so that it can monitor it more closely', false],
        ['The risk is moved off the register so that it no longer shows as red', false],
        ['The server\'s score is lowered to Low so it falls inside the risk appetite', false],
      ], 'An acceptance is a recorded decision by someone with authority, with an end date for review and usually compensating controls. Telling the SOC helps but decides nothing; removing the entry or re-scoring it to fit appetite hides the risk instead of deciding on it.'),
    ],
    checkpoint: [
      mcq('Kosha Pay\'s register bands scores with pd.cut(score, bins=[0, 4, 9, 14, 25], labels=["Low", "Medium", "High", "Critical"]). Which band does a score of 10 fall into?', [
        ['High', true],
        ['Medium', false],
        ['Critical', false],
        ['Low', false],
      ], 'pd.cut includes the right edge of each bin by default, so (9, 14] is High and 10 lands there. Medium is (4, 9], so 9 is the highest Medium score. Critical starts above 14.'),
      mcq('A risk is scored likelihood 4, impact 5 before treatment. After an out-of-band call-back is introduced, it is expected to be likelihood 2, impact 4. What are the inherent and residual scores?', [
        ['Inherent 20, residual 8', true],
        ['Inherent 8, residual 20', false],
        ['Inherent 20, residual 12', false],
      ], 'Inherent is before treatment: 4 × 5 = 20. Residual is after: 2 × 4 = 8. Swapping them reverses the definitions, and 12 comes from subtracting instead of re-scoring both factors.'),
      mcq('Who should own the risk "a phished finance user\'s session changes a vendor\'s bank details"?', [
        ['The head of finance operations, who owns the payment process', true],
        ['The SOC manager, whose team detects the phishing that starts it', false],
        ['The CISO, since every security risk belongs to the CISO by default', false],
        ['The vendor whose bank account would be changed by the attacker', false],
      ], 'The owner is the person who can decide on and fund the treatment — here a business process change such as call-backs. The SOC detects and the CISO advises and reports, but neither runs the payment process; the vendor is affected but cannot change Kosha Pay\'s controls.'),
    ],
  },

  /* ── INDIA_COMPLIANCE ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_INDIA_COMPLIANCE',
    notes: `An analyst in India meets regulation in two places: at 3 a.m. when an incident might be reportable, and in
the audit when someone asks how long logs are kept and why. You met the reporting side in CY2's "Reporting,
Notification and the Post-Incident Review". This lesson is the map: which obligations exist, who they
apply to, and where to read the real text. It is an outline written at one point in time — **always check
the current text, the regulator's FAQs and any later amendments before relying on a detail**, and leave the
legal reading to your compliance team and DPO.

## How Indian obligations are layered

1. **Acts of Parliament** — the Information Technology Act, 2000 and the Digital Personal Data Protection
   Act, 2023.
2. **Rules and directions under them** — CERT-In's directions under section 70B of the IT Act; the DPDP
   Rules.
3. **Sector regulators** — RBI for banks, NBFCs and payment entities; SEBI for market entities; IRDAI for
   insurers. They issue master directions and circulars that bind the entities they regulate.
4. **Contracts** — a bank's outsourcing agreement passes its RBI expectations down to the fintech or MSSP;
   card networks require PCI DSS.

Primary sources: cert-in.org.in, meity.gov.in, rbi.org.in, sebi.gov.in. Not blogs, not slides — including
this one.

## CERT-In directions (2022)

CERT-In, the Indian Computer Emergency Response Team, is the national agency for incident response under
section 70B of the IT Act. Its directions of April 2022 apply broadly — service providers, intermediaries,
data centres, body corporates and government organisations. In outline:

- **Report** the incident types listed in the directions to CERT-In within **six hours** of noticing them
  or being told of them. The list is wide (compromise of systems, unauthorised access, data breaches, attacks
  on servers and applications, and more), so check it, not your intuition.
- **Keep logs** of ICT systems for a rolling **180 days**, maintained within India, and provide them to
  CERT-In when asked.
- **Synchronise clocks** to the NTP servers of the National Informatics Centre (NIC) or the National
  Physical Laboratory (NPL), or to sources traceable to them.
- **Name a point of contact** to interface with CERT-In.
- Additional record-keeping duties apply to data centres, cloud and VPN service providers and some others.

For the SOC, those translate into concrete work: SIEM and archive retention set to policy, NTP on every
source (a timeline across mis-set clocks is how incidents get mis-told), and a playbook step that asks
"is this CERT-In-reportable?" early, because the clock starts at noticing, not at certainty.

## The DPDP Act, 2023

The Digital Personal Data Protection Act governs digital personal data. Its vocabulary:

- **Data Principal** — the person the data is about (for a child, including the parent or guardian).
- **Data Fiduciary** — whoever decides why and how the data is processed (Kosha Pay, for its customers).
- **Data Processor** — processes on a fiduciary's behalf (the payroll SaaS vendor).
- **Significant Data Fiduciary** — notified by the government based on volume, sensitivity and risk; has
  extra duties: a Data Protection Officer based in India, an independent data auditor, periodic data
  protection impact assessments and audits.
- **Data Protection Board of India** — the adjudicating body.

Duties that touch security work directly:

- **Reasonable security safeguards** to prevent personal data breaches — the fiduciary stays responsible
  even when a processor does the processing.
- **Breach intimation** to the Board and to **each affected Data Principal**, in the form and manner the
  Rules prescribe.
- **Erasure** once the purpose is served (unless a law requires retention) — so the "keep it just in case"
  marketing database is now a compliance risk, not just a security one.
- **Children's data** needs verifiable parental consent.

The Act sets financial penalties in a Schedule, and they are large enough that boards pay attention; read
the Schedule rather than quoting figures from memory. The DPDP Rules were notified in 2025 with provisions
coming into force in phases — check which are in force on the day you need them.

## RBI expectations for banks

RBI regulates banks, NBFCs and payment system operators, and its cyber expectations are among the most
detailed in India. Names to know:

- The **Cyber Security Framework in Banks** (2016) — a board-approved cyber security policy distinct from
  the IT policy, a cyber crisis management plan, continuous surveillance (in practice, a SOC), and reporting
  of cyber incidents to RBI.
- The **Master Direction on IT Governance, Risk, Controls and Assurance Practices** (2023) — governance of
  IT and information security at regulated entities.
- Separate directions for **outsourcing of IT services**, a **graded framework for urban cooperative banks**,
  and directions for **payment aggregators** and other payment entities.

RBI's own reporting expectations sit alongside CERT-In's; a bank's incident procedure covers both.

## SEBI for market entities

SEBI regulates stock exchanges, depositories, brokers, mutual funds and other market entities. Its
**Cybersecurity and Cyber Resilience Framework (CSCRF)** of 2024 sets graded requirements by category of
regulated entity, including SOC monitoring, incident reporting and audits. A broker's SOC analyst should
know which category the firm falls in and read the framework and later clarifications.

## Others you will meet

IRDAI's information and cyber security guidelines for insurers; PCI DSS from the card networks; and
customer contracts with GDPR clauses when a GCC processes European personal data. A GCC in Hyderabad
working for a US bank may answer to its parent's regulators through contracts as much as to Indian law.

## Keeping it usable: the obligations register

GRC teams keep an **obligations register**: each obligation, its source and clause, who it applies to, the
control that meets it, the evidence, and the owner. The SOC's rows are usually logging, monitoring,
incident reporting and time sync — the ones you touch every day.`,
    workedExample: `**Task: Kosha Pay (a Bengaluru fintech of 400 people, partnered with a scheduled bank for its payment
accounts, processing customers' personal data) asks the SOC lead which obligations land on the SOC. Draft
the SOC's rows of the obligations register.**

**Step 1 — which regimes apply.** Kosha Pay is a body corporate, so CERT-In's directions apply. It decides
how customer and staff personal data is processed, so it is a Data Fiduciary under the DPDP Act. It is not a
bank, so RBI's bank directions do not bind it directly — but the partner bank's outsourcing contract passes
its RBI-driven requirements down, and if Kosha Pay holds an RBI authorisation (for example as a payment
aggregator) the directions for that category apply directly. That last point is a question for compliance,
and the SOC lead writes it down as one rather than guessing.

**Step 2 — the SOC's rows.**

| Obligation (outline) | Source to check | SOC control | Evidence | Owner |
|---|---|---|---|---|
| Report listed incidents to CERT-In promptly | CERT-In directions, 2022 | Playbook step "reportability check" at declaration; CERT-In contact in IR plan | Case records showing the check and its time | IR lead |
| Keep ICT logs for the required period within India | CERT-In directions, 2022 | SIEM hot + archive retention set per log policy; storage region recorded | Retention settings; a search of the oldest required day | SOC Manager |
| Synchronise clocks to NIC/NPL NTP or traceable sources | CERT-In directions, 2022 | NTP config baseline; SIEM alert on clock drift | Config export; drift alert history | IT Infra Lead |
| Reasonable security safeguards for personal data | DPDP Act, 2023 | Monitoring of KYC store access; DLP alerts | Detections list; sample alert tickets | CISO |
| Breach intimation to Board and Data Principals | DPDP Act + Rules | IR plan routes personal-data incidents to the DPO at once | IR plan; case records with DPO notified | DPO |
| Partner bank's incident notification clause | Outsourcing agreement | Bank contact in IR plan; notification template | Sent notifications | IR lead |

**Step 3 — what the SOC lead does not do.** No hour counts or penalty figures go into the SOC's procedure
from memory; the procedure links to the current text, and compliance confirms the reading. The test the
lead applies to each row: if an auditor asks "show me", is there evidence in the right-hand columns?`,
    mcqs: [
      mcq('At 02:10 a SOC analyst at a Chennai NBFC confirms that an attacker used a stolen admin session on a loan server. When does the CERT-In reporting window start?', [
        ['When the incident is noticed, so the reportability check happens now', true],
        ['When the root cause is confirmed, so reporting waits until the analysis ends', false],
        ['When the CISO signs off the incident report at the next business day\'s start', false],
        ['When customer data is proven to have left, as only data loss is reportable', false],
      ], 'CERT-In\'s directions count from noticing or being told of the incident, which is why the reportability question belongs early in the playbook. Waiting for root cause or sign-off burns the window, and the reportable list covers far more than proven data exfiltration.'),
      mcq('Under the DPDP Act, Kosha Pay uses a payroll SaaS vendor that is breached. Who is responsible for intimating the breach of Kosha Pay staff data?', [
        ['Kosha Pay as the Data Fiduciary, even though its processor was breached', true],
        ['The SaaS vendor alone, because the breach happened on the vendor\'s own systems', false],
        ['CERT-In, which forwards breach notices on to the Data Protection Board', false],
      ], 'The Act places security and breach-intimation duties on the Data Fiduciary, including for processing done by its Data Processor; the contract should require the vendor to tell Kosha Pay quickly. CERT-In reporting is a separate duty under the IT Act, not a channel to the Board.'),
      mcq('A broker\'s new SOC analyst wants to know which cyber requirements SEBI applies to her firm. Where should she start?', [
        ['SEBI\'s Cybersecurity and Cyber Resilience Framework and the firm\'s category under it', true],
        ['RBI\'s Cyber Security Framework in Banks, which SEBI adopted unchanged for all its brokers', false],
        ['The DPDP Act\'s Schedule, which lists cyber requirements by type of business', false],
        ['CERT-In\'s directions, which replaced the sector frameworks for market entities', false],
      ], 'SEBI\'s CSCRF sets graded requirements by category of regulated entity, so the firm\'s category comes first. RBI\'s framework is for banks, the DPDP Schedule sets penalties rather than sector controls, and CERT-In\'s directions sit alongside sector rules rather than replacing them.'),
    ],
    checkpoint: [
      mcq('An analyst at a Hyderabad GCC finds the SIEM\'s Windows sources stamping events eleven minutes ahead of the firewall. Which CERT-In expectation does fixing this directly support?', [
        ['Synchronising system clocks to NIC/NPL NTP or traceable time sources', true],
        ['Naming a single point of contact who interfaces with CERT-In', false],
        ['Keeping subscriber records for the customers of VPN and cloud service providers', false],
      ], 'The directions expect clocks synchronised to NIC or NPL NTP servers or sources traceable to them, so that logs line up in an investigation. The point of contact and subscriber-record duties are real but unrelated to clock drift.'),
      mcq('A Data Fiduciary\'s analytics team has kept a marketing database of former customers for six years "in case it is useful". Which DPDP Act duty does this most directly conflict with?', [
        ['Erasing personal data once the purpose is served, unless law requires it', true],
        ['Appointing a Data Protection Officer who is based in India', false],
        ['Obtaining verifiable consent from a parent before processing a child\'s data', false],
        ['Running periodic data protection impact assessments', false],
      ], 'Data kept after its purpose is served should be erased unless a law requires retention, so "just in case" is the conflict. A DPO and DPIAs are duties of Significant Data Fiduciaries, and parental consent concerns children\'s data — none is the problem described.'),
      mcq('Which statement about RBI\'s cyber expectations for banks is accurate?', [
        ['They expect a board-approved cyber security policy distinct from the IT policy', true],
        ['They apply only to private banks, leaving public sector banks to CERT-In', false],
        ['They replace CERT-In reporting, so banks report cyber incidents only to RBI and never to CERT-In', false],
      ], 'RBI\'s 2016 Cyber Security Framework in Banks asks for a board-approved cyber security policy separate from the IT policy. It applies to banks generally, and RBI reporting sits alongside CERT-In\'s directions rather than replacing them.'),
    ],
  },

  /* ── AUDITS_POLICIES ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_AUDITS_POLICIES',
    notes: `Controls exist on paper first and in systems second. An audit asks whether the two match: is there a
sensible rule, and does it actually happen, every time, across the whole period? As an analyst you will
write procedures, follow policies you did not write, and hand evidence to auditors. This lesson is how to do
each well.

## The document hierarchy

| Document | Says | Approved by | Example |
|---|---|---|---|
| Policy | What must be true, and why — short and stable | Board or top management | "Access to systems is granted on least privilege and removed promptly when no longer needed." |
| Standard | The measurable rule | CISO | "Leavers' accounts are disabled within 1 working day of the exit date." |
| Procedure | The steps, for one team | Team lead | "Service desk runs the HR leaver report at 18:00 daily and disables each account in the IdP." |
| Guideline | Advice, not mandatory | Anyone appropriate | "Prefer group-based access over individual grants." |

ISO/IEC 27001:2022 control 5.1 expects policies to be defined, approved, communicated and reviewed. Keeping
the policy short and pushing measurable detail into standards means the policy does not need board approval
every time a tool changes.

## A policy people can follow

Most broken policies fail one of these tests:

- **Measurable.** "Promptly" cannot be audited; "within 1 working day" can.
- **Achievable with the tools and people you have.** "All logs reviewed daily" with two analysts and 40
  million events a day guarantees non-compliance; "all alerts from the approved detection set triaged within
  the SLA" can be met and checked.
- **Owned and dated.** An owner and a review date, so it does not fossilise.
- **Has an exception route.** Real systems need exceptions; a policy with none gets ignored instead. An
  exception is approved, recorded, compensated and expires.
- **Written for the reader.** Staff read a one-page acceptable-use summary; nobody reads forty pages.

## Kinds of audit

- **Internal audit** — the organisation's own independent function (ISO 27001 clause 9 requires internal
  audits of the ISMS).
- **Certification audit** — an accredited body for ISO 27001, or an auditor for a SOC 2 report.
- **Regulatory inspection** — RBI, SEBI or another regulator examining a regulated entity.
- **Customer audit** — usually a questionnaire, sometimes a site visit, before a contract is signed.

Auditors test two things. **Design**: is the control, as written, capable of meeting the risk? **Operating
effectiveness**: did it run as designed throughout the period? A screenshot of a setting can show design. Only
records across the period show operation.

## Evidence that proves something

Good evidence is:

- **Relevant** — it shows the control itself, not something nearby.
- **Complete** — drawn from the **whole population** (every leaver in the period), with the query or report
  that produced it, so the auditor can see nothing was filtered out.
- **Reliable** — system-generated beats a hand-made spreadsheet; an export with the query beats a
  screenshot of a filtered view.
- **Dated within the period** — evidence from the audit day says nothing about the six months before it.
- **Independent of the person being tested** — the auditor picks the sample, not the control owner.

## An evidence checklist generator

Kosha Pay keeps its controls in YAML; a short script turns each into the checklist an auditor will work
through, so the team prepares the right items before the audit instead of during it:

    import yaml

    CONTROLS = yaml.safe_load(open("controls.yaml"))   # id, control, frequency, population, system, owner
    SAMPLE = {"per event": "25 items, or all if fewer", "monthly": "2 months",
              "continuous": "configuration + 1 re-performed test"}   # Kosha Pay internal audit's own table

    def checklist(c, period):
        return [
            "Design - the approved policy/standard stating the rule (version, owner, approval date)",
            f"Population - {c['population']}, {period}, exported with the query or report name shown",
            f"Sample - {SAMPLE[c['frequency']]}, chosen by the auditor from that population",
            f"Operation - for each sampled item, the {c['system']} record showing the control acted, with timestamps",
            "Exceptions - every item that missed the rule, with its approved exception or the fix",
            f"Review - sign-off by the {c['owner']} for the period",
        ]

    for c in CONTROLS:
        print(f"## {c['id']}: {c['control']}  ({c['frequency']})")
        for n, item in enumerate(checklist(c, "1 Apr-30 Sep 2026"), 1):
            print(f"[ ] {n}. {item}")

Output for the first control:

    ## AC-03: Leavers' accounts disabled within 1 working day of exit  (per event)
    [ ] 1. Design - the approved policy/standard stating the rule (version, owner, approval date)
    [ ] 2. Population - every leaver on the HR exit report, 1 Apr-30 Sep 2026, exported with the query or report name shown
    [ ] 3. Sample - 25 items, or all if fewer, chosen by the auditor from that population
    [ ] 4. Operation - for each sampled item, the identity provider audit log record showing the control acted, with timestamps
    [ ] 5. Exceptions - every item that missed the rule, with its approved exception or the fix
    [ ] 6. Review - sign-off by the IT Service Desk lead for the period

With three controls in the file it printed 18 items. Sample sizes are an organisation's own audit
methodology, not a universal rule — the table above is Kosha Pay's example.

## Findings

ISO certification bodies grade findings as a **major nonconformity** (a requirement not met, or a control
systemically failing), a **minor nonconformity** (an isolated lapse), an **observation** or an **opportunity
for improvement**. Every nonconformity gets a root cause and a corrective action — "remind the team" is not a
root cause.

## Awareness that changes behaviour

ISO 6.3 expects security awareness, education and training. What works: short, role-specific sessions
(finance staff on payment fraud, developers on secrets), a one-click "report phishing" button, and measuring
the **reporting rate** and time-to-report — not just the click rate. Phishing simulations are run with
leadership approval, never used to shame individuals, and followed by teaching. The SOC benefits directly:
every early report is an alert a human raised for you.

## The SOC's part

Your tickets, detections list, log-source inventory and incident records are the evidence for monitoring,
logging and incident controls. Close tickets with a reason, keep timestamps, and link changes to approvals,
and the audit becomes an export instead of a scramble.`,
    workedExample: `**Task: test Kosha Pay's control AC-03 ("leavers' accounts disabled within 1 working day of exit") on the
auditor's sample and write up what it shows.**

The auditor picked six leavers from the full HR exit report for April–September. The service desk exported
the identity provider's disable events for those users. The test in pandas:

    import pandas as pd

    leavers = pd.DataFrame({
        "user": ["arjun.k", "meera.s", "farhan.a", "divya.p", "rohit.m", "sana.q"],
        "exit_date": ["2026-04-10", "2026-05-29", "2026-06-15", "2026-07-31", "2026-08-14", "2026-09-30"],
        "disabled_at": ["2026-04-10 18:05", "2026-06-01 10:12", "2026-06-19 09:40",
                        "2026-07-31 19:22", None, "2026-10-01 11:00"],
    })
    leavers["exit_date"] = pd.to_datetime(leavers["exit_date"])
    leavers["disabled_at"] = pd.to_datetime(leavers["disabled_at"])
    deadline = leavers["exit_date"] + pd.offsets.BDay(1) + pd.Timedelta(hours=23, minutes=59)
    leavers["on_time"] = leavers["disabled_at"].le(deadline)
    leavers["deadline"] = deadline.dt.strftime("%Y-%m-%d")
    print(leavers[["user", "exit_date", "deadline", "disabled_at", "on_time"]].to_string(index=False))
    print("exceptions:", leavers.loc[~leavers["on_time"], "user"].tolist())

Output:

        user  exit_date   deadline         disabled_at  on_time
     arjun.k 2026-04-10 2026-04-13 2026-04-10 18:05:00     True
     meera.s 2026-05-29 2026-06-01 2026-06-01 10:12:00     True
    farhan.a 2026-06-15 2026-06-16 2026-06-19 09:40:00    False
     divya.p 2026-07-31 2026-08-03 2026-07-31 19:22:00     True
     rohit.m 2026-08-14 2026-08-17                 NaT    False
      sana.q 2026-09-30 2026-10-01 2026-10-01 11:00:00     True

    exceptions: ['farhan.a', 'rohit.m']

**Reading it.** \`BDay(1)\` moves a Friday exit (10 April) to Monday — "working day" is in the rule, so the
test must honour it (it ignores public holidays; a real test would use the company's holiday calendar).
Meera's account was disabled on the Monday after a Friday exit: on time. Farhan's was three days late.
Rohit's has **no** disable event at all — either the account is still active, or it was disabled by another
route that left no record. The analyst checks the identity provider: still active, last sign-in 2 September.

**The write-up.** "AC-03 tested on a sample of 6 leavers chosen by internal audit from the full HR exit
report (1 Apr–30 Sep 2026). 4 met the rule; 2 did not. rohit.m remained active 49 days after exit, with a
sign-in on 2 Sep (referred to the SOC for review). Root cause: the daily leaver report excludes contractors,
and rohit.m was a contractor. Corrective action: include contractors in the report; the service desk lead
owns it, due 15 Nov." The sign-in is now a possible incident, which is why the SOC cares about audit
findings.`,
    mcqs: [
      mcq('Kosha Pay\'s draft standard says "Security logs must be reviewed daily". The SOC has two analysts and about 40 million events a day. What is the best rewrite?', [
        ['"Alerts from the approved detection set are triaged within the shift SLA"', true],
        ['"Security logs must be reviewed daily by every analyst on every shift"', false],
        ['"Security logs should be reviewed as often as is reasonably possible"', false],
        ['"Security logs must be reviewed daily unless the team is too busy that day"', false],
      ], 'A standard must be measurable and achievable with the people and tools available; triaging alerts from a defined detection set against an SLA is both. Adding analysts to an impossible rule keeps it impossible, "as often as possible" cannot be audited, and a built-in "unless busy" makes it meaningless.'),
      mcq('For a control that disables leavers\' accounts, the service desk offers the auditor a screenshot of the identity provider\'s "disable on HR exit" setting, taken on the audit day. What does it prove?', [
        ['The design is in place today, but not that the control ran across the period', true],
        ['That the control operated effectively for every leaver during the period', false],
        ['Nothing, because screenshots are never accepted as audit evidence at all', false],
      ], 'A setting captured today shows design at one moment. Operating effectiveness needs records for a sample from the whole period\'s leavers. Screenshots can be acceptable for design evidence, so "never accepted" goes too far.'),
      mcq('A phishing simulation at a Pune insurer shows a 12% click rate. Which extra measure best shows whether awareness is changing behaviour?', [
        ['The share of staff who reported the email, and how quickly they did', true],
        ['The number of awareness slides each employee viewed during the year', false],
        ['The click rate broken down by name and circulated to all the managers', false],
        ['Whether the click rate is lower than the insurance sector\'s average', false],
      ], 'Reporting rate and time-to-report show people acting as sensors, which helps the SOC directly. Slides viewed measures attendance, naming clickers shames people and suppresses reporting, and a sector comparison says nothing about whether behaviour here is changing.'),
    ],
    checkpoint: [
      mcq('Which document should hold the rule "privileged accounts require MFA and are reviewed every quarter", in a typical policy hierarchy?', [
        ['A standard, owned by the CISO, under the access control policy', true],
        ['The board-approved information security policy itself', false],
        ['A guideline, so that teams may choose whether to follow it', false],
        ['The service desk\'s step-by-step procedure for new joiners', false],
      ], 'A measurable, mandatory rule belongs in a standard; the policy states the principle and stays stable. Putting the detail in the policy forces board approval for every change, a guideline is optional, and a joiners procedure is the wrong scope for a privileged-access review.'),
      mcq('An auditor asks for evidence that critical external vulnerabilities were fixed within SLA from April to September. Which submission is strongest?', [
        ['A scanner export of all critical external findings for the period, with fix dates', true],
        ['The vulnerability management policy, signed and approved by the CISO in March', false],
        ['A spreadsheet the infra lead compiled of the findings he remembers fixing', false],
      ], 'A system export of the whole population with dates lets the auditor sample and test operation. The policy shows design only, and a hand-compiled list from memory is neither complete nor reliable.'),
      mcq('An internal audit finds that two of six sampled leavers kept access past the deadline, because contractors were missing from the HR report. What should the corrective action address?', [
        ['The report\'s exclusion of contractors, which is the root cause', true],
        ['A reminder email to the service desk to work more carefully', false],
        ['Disabling just the two accounts that the sample happened to find', false],
        ['Changing the standard to allow five working days for contractors', false],
      ], 'Corrective action fixes the root cause so the lapse stops recurring: here, the population feeding the control was incomplete. A reminder treats it as carelessness, fixing two accounts leaves other contractors exposed, and loosening the standard hides the failure.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_DEBUGGING',
    notes: `GRC failures do not raise exceptions. They produce a register that looks complete and drives no decision, a
policy that everyone signs and nobody follows, and evidence that passes a glance and proves nothing. Each case
below is from Kosha Pay; the code cases were run in pandas. Find the cause and fix only that.

## 1. A risk register nobody can act on

**Symptom.** The quarterly review takes two hours and ends with no decisions. The register has 140 rows like:

    R-044  Cyber attack          High   IT
    R-045  Data breach           High   IT
    R-046  Insider threat        Medium Security

**Cause.** No cause–event–consequence, no anchored scores, departments instead of owners, no treatment, no
date. Leaders cannot see what any decision would change, so they make none.

**Fix.** Rewrite each as cause, event and consequence ("an unpatched internet-facing VPN appliance is exploited
for entry to the internal network, allowing ransomware deployment"); score likelihood and impact against the
anchors with a one-line reason; name a person as owner; add a treatment with a due date; merge duplicates. Put
only the risks above appetite, and the decisions they need, at the top.

## 2. The 9 that outranks the 20

**Symptom.** The register loaded from the GRC tool's CSV export sorts with the Medium risks on top:

    reg = pd.read_csv("register.csv", dtype=str)
    print(reg.sort_values("score", ascending=False)["id"].tolist())

    ['R08', 'R04', 'R01', 'R02', 'R05']

**Cause.** \`reg.dtypes["score"]\` printed \`str\`: the scores are text, and text sorts character by character, so
"9" and "8" come after "2" and "1" in descending order.

**Fix.** Convert the column before sorting: \`reg["score"] = pd.to_numeric(reg["score"])\`. The same sort then
prints \`['R01', 'R02', 'R05', 'R08', 'R04']\` — 20, 15, 12, 9, 8. (\`dtype=str\` in \`read_csv\` was the
original mistake; leave numeric columns numeric.)

## 3. Five ratings that are really two

**Symptom.** The summary for the CISO counts five different ratings:

    r = pd.Series(["High", "high", "HIGH ", "Medium", "Med"])
    print(r.value_counts().to_dict())

    {'High': 1, 'high': 1, 'HIGH ': 1, 'Medium': 1, 'Med': 1}

**Cause.** Ratings are typed by hand in a free-text column: different case, a trailing space, an abbreviation.

**Fix.** Normalise, then stop the problem at source with a drop-down: \`r.str.strip().str.title().replace({"Med":
"Medium"})\` gives \`{'High': 3, 'Medium': 2}\`. Better still, compute the rating from the score with fixed bins
so nobody types it at all.

## 4. A policy that cannot be followed

**Symptom.** The access policy says "Passwords must be 16 characters, changed every 30 days, never written
down, and password managers are not permitted." The service desk resets about 60 passwords a week; a desk walk
finds passwords on sticky notes.

**Cause.** The rules work against each other: long passwords changed monthly with no manager are beyond what
people can remember, so they write them down. The policy produces the behaviour it forbids.

**Fix.** Rewrite to what people can follow and what reduces risk: MFA everywhere it is supported, long
passphrases, an approved password manager, and a change on evidence of compromise rather than on a calendar
(the approach current guidance such as NIST SP 800-63B takes). Then check: can a new joiner comply on day one
with the tools provided?

## 5. Evidence that does not prove the control

**Symptom.** For "critical vulnerabilities on internet-facing assets are fixed within 15 days", the infra team
submits the vulnerability management policy, a screenshot of the scanner's schedule, and a slide saying "100%
of criticals closed". The auditor raises a finding.

**Cause.** The policy and schedule show design. The slide is a claim. Nothing shows, for the findings in the
period, when each was found and when it was fixed.

**Fix.** Export from the scanner every critical finding on external assets for the period, with first-seen and
fixed dates and the change ticket; let the auditor sample; show the exceptions with their approvals. That is
operating evidence.

## 6. The population that was quietly filtered

**Symptom.** The leavers' control passes 25 out of 25 in the sample. Three months later, an ex-contractor's
account is used in an incident.

**Cause.** The service desk produced the "population" from its own leaver report, which excludes contractors —
the person running the control chose what was tested. The sample was clean because the failures were never in
the population.

**Fix.** Take the population from an independent source (HR's full exit list including contractors) with the
query shown, and let the auditor choose the sample. Then reconcile the two lists: any leaver in HR's list who is
missing from the service desk's is a gap in the control, not in the evidence.`,
    mcqs: [
      mcq('A risk register exported with read_csv(..., dtype=str) sorts a score of 9 above a score of 20 when sorted in descending order. What is the cause?', [
        ['The scores are strings, which sort character by character', true],
        ['sort_values sorts ascending by default and ignored the flag', false],
        ['The CSV export rounded the scores to a single digit each', false],
        ['Pandas sorts by the index first and by the column second', false],
      ], 'With dtype=str every column is text, and "9" > "2" as text, so 9 sorts above 20. ascending=False was respected, nothing was rounded, and sort_values sorts by the given column, not the index.'),
      mcq('A policy requires 16-character passwords changed every 30 days and bans password managers, and auditors keep finding passwords on sticky notes. What is the root cause?', [
        ['The policy\'s rules together exceed what people can remember, so they write passwords down', true],
        ['Staff have not been told about the policy often enough through the year\'s awareness mailers', false],
        ['The service desk is not resetting forgotten passwords quickly enough for people to cope', false],
      ], 'The rules combine into something people cannot follow, so the policy itself produces the sticky notes. More reminders do not change what memory can hold, and faster resets treat the symptom while people still write passwords down.'),
      mcq('For a 15-day critical-vulnerability SLA, a team submits the policy, the scanner schedule and a slide reading "100% closed". Why does the auditor raise a finding?', [
        ['None of it shows when each finding in the period was found and fixed', true],
        ['The slide should have been signed by the CISO before submission to audit', false],
        ['Scanner schedules are design evidence only for unauthenticated scans', false],
        ['Policies must be submitted as PDFs rather than as the editable originals', false],
      ], 'Operating effectiveness needs records per finding across the period; the policy and schedule show design and the slide is a claim. A signature does not turn a claim into records, and the format and scan-type points are irrelevant.'),
      mcq('A leavers\' control passed 25 of 25 sampled items, yet an ex-contractor\'s account was later misused. The population came from the service desk\'s own report. What went wrong?', [
        ['The population was incomplete, chosen by the people running the control', true],
        ['Twenty-five items is too small a sample for any per-event control', false],
        ['The auditor should have tested every leaver rather than any sample', false],
      ], 'The sample was drawn from a population that left contractors out, so the failures could never be selected. A larger sample or a full test of the same incomplete population would still miss them; the fix is an independent, complete population.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_PRACTICE',
    notes: `Nine exercises, roughly in order of difficulty. Work each before reading the answer. Kosha Pay's anchors and
bands from the lessons apply: score = likelihood × impact; bands Low 1–4, Medium 5–9, High 10–14, Critical 15–25;
appetite: no residual risk of 10 or above without CEO sign-off.

## 1. Score and band

A risk is likelihood 3, impact 4. What is its score and rating?

**Answer.** 12, High (10–14).

## 2. Place it on the heat map

On a heat map with impact as rows (5 at the top) and likelihood as columns (1 on the left), where does a
likelihood 2, impact 5 risk sit?

**Answer.** Top row, second column from the left — high impact, low likelihood. It scores 10 (High), the same
as a likelihood 5, impact 2 risk in the bottom row, which is why you read the position and not only the score.

## 3. Inherent, residual, appetite

"Customer KYC bucket made public by a misconfiguration": inherent L2 × I5. Treatment: block public access at
account level and scan posture daily, expected to bring likelihood to 1. Is the residual within appetite?

**Answer.** Residual 1 × 5 = 5, below 10, so within appetite. Impact stays 5 — the controls make exposure
rarer, not less harmful if it happens.

## 4. Choose the treatment

For each, choose mitigate, accept, transfer or eliminate: (a) a marketing database of ex-customers kept "just in
case"; (b) a vendor-payment fraud risk where a call-back process is feasible; (c) a legacy server the vendor no
longer patches, isolated, to be replaced next year; (d) the financial loss from a major incident beyond what
controls can reduce.

**Answer.** (a) Eliminate — delete it, which also meets the DPDP erasure duty. (b) Mitigate. (c) Accept, signed
by an owner, with compensating controls and an expiry date. (d) Transfer, through cyber insurance, alongside the
controls.

## 5. Rewrite the risk

Rewrite "Insider threat — Medium — HR" as a usable risk.

**Answer (one good version).** "A departing employee keeps access after exit because the leaver process misses
contractors, and uses it to copy customer data, causing a reportable breach." Owner: HR Director (the process);
treatment: include contractors in the leaver report; due date set.

## 6. Map one activity

Map "review privileged accounts monthly and remove what is not needed" to ISO/IEC 27001:2022 Annex A, NIST CSF
2.0 and CIS Controls v8.

**Answer.** ISO 8.2 Privileged access rights (and 5.18 Access rights); CSF PR.AA (Identity Management,
Authentication and Access Control); CIS 5 Account Management and 6 Access Control Management.

## 7. Which Indian obligations?

A Mumbai stockbroker's SOC detects unauthorised access to a server holding client KYC data. Name the obligations
to check, in outline.

**Answer.** CERT-In's directions (the incident is likely on the reportable list; the clock runs from noticing);
SEBI's CSCRF for the broker's category (incident reporting to SEBI and the exchanges as it prescribes); the DPDP
Act (personal data — breach intimation to the Board and affected clients, as the Rules prescribe). Check each
current text and involve compliance and the DPO at once.

## 8. Design or operation?

Classify each as design or operating evidence: (a) the approved access control standard; (b) an export of every
access review in the period with reviewer and date; (c) a screenshot of the SIEM retention setting; (d) a
search, run in front of the auditor, returning events from the oldest day the policy requires.

**Answer.** (a) design; (b) operation; (c) design (it shows the setting today); (d) operation — it re-performs
the control and shows the data really is there.

## 9. Test the deadline

A leaver's exit date is Friday 14 August 2026; the standard is "disabled within 1 working day". The account was
disabled on Tuesday 18 August at 09:00. On time?

**Answer.** No. One working day after Friday is Monday 17 August (ignoring holidays), so the deadline is the end
of Monday. In pandas: \`pd.Timestamp("2026-08-14") + pd.offsets.BDay(1)\` gives 2026-08-17. Note that 15 August
is Independence Day, a Saturday in 2026 — check the holiday calendar whenever "working day" is in the rule.`,
    mcqs: [
      mcq('A Kosha Pay risk is likelihood 3 and impact 4, using bands Low 1–4, Medium 5–9, High 10–14, Critical 15–25. Which rating does it get?', [
        ['High, with a score of 12', true],
        ['Medium, with a score of 7', false],
        ['Critical, with a score of 15', false],
        ['High, with a score of 14', false],
      ], 'Score is the product, 3 × 4 = 12, which falls in High (10–14). Seven is the sum, not the product; 15 and 14 come from mis-multiplying or adding a weight that is not in the method.'),
      mcq('A hospital in Visakhapatnam keeps scanned patient records it no longer needs for any purpose on an old file share. Which treatment is usually best?', [
        ['Eliminate: delete the data once retention law is checked', true],
        ['Transfer: buy cyber insurance to cover a future breach of it', false],
        ['Mitigate: encrypt the share and add an access review each quarter', false],
        ['Accept: record it as low risk because the share is internal only', false],
      ], 'Data held for no purpose can be removed, which ends the risk and meets the erasure duty, once legal retention requirements are checked. Insurance and encryption keep a needless risk alive at ongoing cost, and accepting it ignores both risk and the law.'),
      mcq('Which pair maps the activity "review privileged accounts monthly" to NIST CSF 2.0 and CIS Controls v8?', [
        ['PR.AA in CSF; Controls 5 and 6 in CIS', true],
        ['DE.CM in CSF; Controls 8 and 13 in CIS', false],
        ['GV.PO in CSF; Controls 14 and 15 in CIS', false],
      ], 'Privileged account review is identity and access control: CSF\'s PR.AA, and CIS 5 (Account Management) and 6 (Access Control Management). DE.CM with CIS 8/13 is monitoring; GV.PO is policy, and CIS 14/15 are awareness and service providers.'),
      mcq('An auditor runs a SIEM search, in front of the SOC lead, that returns events from the oldest day the log policy requires. What kind of evidence is that?', [
        ['Operating evidence, since it re-performs the control and shows data present', true],
        ['Design evidence, since it shows what the SIEM retention setting is today', false],
        ['Not evidence at all, since only documents prepared before the audit count', false],
        ['Exception evidence, because the search could have returned nothing found', false],
      ], 'Re-performance shows the control actually worked — the old data really is there. Reading the setting would be design evidence; re-performance by the auditor is a standard and strong test, and "exception evidence" is not a category here.'),
      mcq('An exit date is Friday 14 August 2026 and the rule is "disabled within 1 working day". What does pd.Timestamp("2026-08-14") + pd.offsets.BDay(1) return?', [
        ['2026-08-17, the Monday', true],
        ['2026-08-15, the Saturday', false],
        ['2026-08-18, the Tuesday', false],
      ], 'BDay skips Saturday and Sunday, so one business day after Friday is Monday 17 August. Adding a calendar day would give Saturday 15th; Tuesday would be two business days. BDay ignores public holidays, so a real test uses the company calendar too.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_INTERVIEW_QUESTION',
    notes: `SOC interviews at banks, MSSPs and GCCs include a few GRC questions, usually to check that you understand why
the work is recorded and audited — not to test you as an auditor. Interviewers listen for whether you connect
frameworks to daily work and whether you know the limits of what you know about regulation.

## 1. "What is the difference between ISO 27001 and NIST CSF?"

**Model answer.** "ISO/IEC 27001 is a certifiable standard for an information security management system:
scope, risk assessment, controls chosen through a Statement of Applicability, internal audit, management review
and improvement. The 2022 edition's Annex A has 93 controls in four themes. NIST CSF 2.0 is a voluntary
framework of outcomes under six functions — Govern, Identify, Protect, Detect, Respond, Recover — used to
describe a programme and its gaps through current and target profiles. There is no CSF certificate. Many
organisations use both: ISO to run security and be certified, CSF to report to leadership. My SOC work sits
mostly in ISO 8.15 and 8.16 and the 5.24 to 5.28 incident controls, and in CSF's Detect and Respond."

**Follow-up:** "And CIS Controls?" — "Eighteen prioritised technical controls with safeguards in three
Implementation Groups; IG1 is essential hygiene. It answers 'what do we do first' where ISO and CSF answer
'how do we run it' and 'what outcomes do we need'."

## 2. "How would you explain a security risk to a non-technical manager?"

**Model answer.** "In their terms: what could happen to their process, how likely, how bad, and what they can
decide. For example: 'Our VPN appliance has a known weakness that is being exploited at other companies. If it
happens here, an attacker could reach the payment systems — a day or more of outage and a reportable incident.
Patching this weekend takes the VPN down for two hours. Or we accept the risk until the scheduled window in
three weeks, with extra monitoring — but that needs your sign-off.' I give options with a cost and a date, and
I let the owner decide."

**Follow-up:** "What if they choose to accept it?" — "That is their decision to make. I record it in the
register with their name, the compensating controls and an expiry date, and I set up the extra monitoring we
promised."

## 3. "An auditor asks you for evidence that the SOC reviews its alerts. What do you give them?"

**Model answer.** "The detection and triage standard with the SLA, which shows design. Then, for operation, an
export from the SIEM or case tool of every alert in the audit period with when it was raised, who triaged it,
when, and the disposition — so the auditor can pick their own sample. The exceptions: alerts that breached the
SLA and what we did about them. I would not hand over a screenshot of a dashboard or a hand-made summary,
because those show a moment or a claim, not the control working across the period."

**Follow-up:** "What if the export shows 8% of alerts breached the SLA?" — "I show them anyway, with the
reasons — a shift short-staffed, a noisy rule since tuned. Hiding exceptions turns a minor finding into a
serious one, and the fix is already evidence of the process working."

## 4. "What does CERT-In expect when an incident happens?"

**Model answer.** "In outline, from its 2022 directions: report the listed incident types to CERT-In within six
hours of noticing them, keep ICT logs for 180 days within India, synchronise clocks to NIC or NPL time sources,
and have a point of contact. In the SOC that means a reportability check early in the playbook, retention set to
policy, and NTP everywhere. I would always check the current directions and the FAQs, and reporting itself goes
through the IR lead and compliance, not an individual analyst."

**Follow-up:** "And if personal data is involved?" — "Then the DPDP Act applies too: the Data Fiduciary must
intimate the breach to the Data Protection Board and each affected person, as the Rules prescribe. That is a
separate duty from CERT-In's, and the DPO should be involved at once."`,
    mcqs: [
      mcq('In an interview at a Bengaluru GCC you are asked where your SIEM alert triage fits in NIST CSF 2.0. Which answer is accurate?', [
        ['Detect, mainly Continuous Monitoring and Adverse Event Analysis', true],
        ['Identify, mainly Asset Management and the Improvement category', false],
        ['Govern, mainly Oversight and the Roles and Responsibilities category', false],
        ['Protect, mainly Platform Security and Awareness and Training', false],
      ], 'Watching for and analysing adverse events is the Detect function: DE.CM and DE.AE. Identify covers assets and risk, Govern covers strategy and oversight, and Protect covers safeguards such as access control and training.'),
      mcq('An interviewer asks what you would do if a manager accepts a risk you advised fixing. Which response shows the judgement they want?', [
        ['Record the acceptance with their name, compensating controls and an expiry', true],
        ['Escalate to the CISO straight away to get the manager\'s decision reversed', false],
        ['Fix the issue anyway at the next maintenance window, without telling them', false],
      ], 'Risk owners are entitled to accept risk; the analyst\'s job is to make the decision explicit, bounded and monitored. Escalating every disagreement undermines the owner model, and acting without authority changes systems the analyst does not own.'),
      mcq('An auditor\'s alert-triage export shows 8% of alerts breached the SLA. In an interview, which handling of this do you describe?', [
        ['Present the exceptions with their reasons and the fixes already made', true],
        ['Exclude the breached alerts from the export so the sample stays clean', false],
        ['Re-classify the breached alerts as informational so the SLA stops applying', false],
        ['Ask the auditor to test a different month in which nothing was breached', false],
      ], 'Exceptions shown with causes and corrections are evidence of a working process; the finding stays minor. Filtering, re-classifying or steering the sample hides failures, and when discovered turns a minor finding into a serious integrity problem.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_GRC_CHECKPOINT',
    notes: `Ten questions across the topic: the frameworks and how SOC work maps to them, risk scoring and treatment,
Indian obligations in outline, and policies and audit evidence. Where a score or a date is involved, work it out
before reading the options.`,
    checkpoint: [
      mcq('A supplier sends Kosha Pay its ISO/IEC 27001 certificate. What should the security team check before relying on it for the service it buys?', [
        ['That the certificate\'s scope covers the service and the sites providing it', true],
        ['That the certificate lists all 93 Annex A controls as implemented in full', false],
        ['That NIST has countersigned the certificate for use by Indian customers', false],
      ], 'A certificate covers a defined scope, which may not include the service being bought. Organisations may exclude Annex A controls with justification in the Statement of Applicability, and NIST has no role in ISO certification.'),
      mcq('In NIST CSF 2.0, which function contains Cybersecurity Supply Chain Risk Management as a category?', [
        ['Govern', true],
        ['Identify', false],
        ['Protect', false],
        ['Respond', false],
      ], 'CSF 2.0 placed supply chain risk management under Govern (GV.SC), alongside strategy, roles, policy and oversight. In version 1.1 it sat in Identify, which is why Identify tempts; Protect and Respond cover safeguards and incident handling.'),
      mcq('Kosha Pay\'s SOC adds a new firewall\'s logs to the SIEM. Which CIS Controls v8 control does this activity most directly support?', [
        ['Control 8, Audit Log Management', true],
        ['Control 1, Inventory and Control of Enterprise Assets', false],
        ['Control 16, Application Software Security', false],
        ['Control 18, Penetration Testing', false],
      ], 'Collecting and retaining logs centrally is Audit Log Management. The firewall should also be in the asset inventory, but onboarding its logs is logging work; application security and penetration testing are unrelated.'),
      mcq('A risk is likelihood 5, impact 2. Another is likelihood 2, impact 5. With Low 1–4, Medium 5–9, High 10–14, Critical 15–25, how do they compare?', [
        ['Both score 10 and are High, but sit in opposite corners of the heat map', true],
        ['The first scores 7 and the second 10, so only the second is rated High', false],
        ['Both score 10, so they are the same risk and should be merged into one', false],
      ], 'Both products are 10, so both are High, but one is frequent and minor and the other rare and severe — different positions and different treatments. Seven is a sum, not the method, and equal scores do not make risks duplicates.'),
      mcq('A risk register entry reads "R-017 — accepted — legacy MIS server". Which addition matters most to make the acceptance valid?', [
        ['The accepting owner\'s name, compensating controls and an expiry date', true],
        ['A CVSS base score for every vulnerability the server currently has', false],
        ['A note that the SOC will look at the server if anything goes wrong', false],
        ['The server\'s IP address and the VLAN it is connected to for now', false],
      ], 'An acceptance is a decision by an accountable person, bounded in time and usually compensated. CVSS scores and network details are useful context but decide nothing, and a vague promise to look later is not a control.'),
      mcq('Under CERT-In\'s 2022 directions, which practice does a SOC put in place for log retention?', [
        ['Retain ICT system logs for 180 days, maintained within India', true],
        ['Retain ICT system logs for 30 days, in any region the cloud chooses', false],
        ['Retain only the logs of incidents that were reported to CERT-In', false],
      ], 'The directions require logs of ICT systems to be kept for a rolling 180 days within Indian jurisdiction, so they are available when an incident needs them. Thirty days in any region falls short, and keeping only reported incidents\' logs defeats the purpose — you need the logs before you know.'),
      mcq('Under the DPDP Act, which entity has the extra duties of appointing a Data Protection Officer based in India and an independent data auditor?', [
        ['A Significant Data Fiduciary, as notified by the government', true],
        ['Every Data Processor that handles data on a fiduciary\'s behalf', false],
        ['Every company registered in India with more than 100 employees', false],
        ['The Data Protection Board itself, for each sector it oversees', false],
      ], 'These duties fall on Significant Data Fiduciaries, which the government notifies based on factors such as volume and sensitivity of data. Processors act under the fiduciary, there is no employee-count trigger, and the Board adjudicates rather than appointing DPOs.'),
      mcq('A cooperative bank\'s draft standard says "Systems must be patched promptly." Why will internal audit be unable to test it?', [
        ['"Promptly" has no measurable deadline that a record can be tested against', true],
        ['Patching rules belong only in procedures, never in a standard of any kind', false],
        ['Standards must be approved by the board before any audit can be done', false],
      ], 'A testable control needs a measurable rule, such as "critical patches within 15 days", so each record passes or fails. Measurable patch rules belong exactly in standards, and standards are usually approved by the CISO rather than the board.'),
      mcq('For the control "leavers disabled within 1 working day", which evidence best proves operation over April to September?', [
        ['Identity-provider disable events for an auditor-chosen sample of HR\'s full exit list', true],
        ['A screenshot of the automatic disable setting, taken on the day of the audit', false],
        ['The service desk\'s own list of leavers it processed, as attached to its report', false],
        ['A signed letter from the service desk lead confirming the control ran for every leaver in the period', false],
      ], 'Operation is shown by system records for a sample from a complete, independent population. A screenshot shows design at one moment, the service desk\'s own list may omit the very cases that fail, and a letter is an assertion, not evidence.'),
      mcq('At a Hyderabad bank, 3% of staff report a phishing simulation and 14% click it. Which change to the awareness programme is most likely to help the SOC?', [
        ['Make reporting one click and track reporting rate and time-to-report', true],
        ['Publish the names of everyone who clicked to deter future clicking', false],
        ['Run the same simulation weekly until the click rate falls below 1%', false],
      ], 'Early reports turn staff into sensors and give the SOC alerts sooner; making reporting easy and measuring it targets that. Naming clickers suppresses reporting, and repeating the same simulation trains recognition of one email rather than behaviour.'),
    ],
  },
];
