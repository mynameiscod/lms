/**
 * Career-track placement content: SOC Analyst Interview Questions (CY_IV_SOC), Cybersecurity Analyst,
 * batch CY4.
 *
 * Year-4 interview versions of what the track taught: security fundamentals (from the years' security
 * topics), network security (CY_NETWORK_SECURITY), Windows, Linux and identity (CY_ENDPOINT_IDENTITY),
 * SIEM and detection (CY_SIEM_DETECTION, CY_THREAT_INTEL) and incident response (CY_INCIDENT_RESPONSE).
 * Each interview set gives the question, what the interviewer is testing, a spoken model answer, the
 * follow-up a good answer earns and the weak answer that loses the round; nothing is re-taught.
 *
 * Context: SOC analyst L1/L2 roles at MSSPs, banks, GCCs and product companies in Bengaluru, Hyderabad,
 * Pune and Chennai, with shift work and on-call. Defensive scope throughout: answers describe detection,
 * triage, response and hardening; attack techniques are named only as categories a defence needs.
 *
 * Attribution: the topic is multi-skill. Each IV_* unit declares one skill and its checkpoint questions
 * name it with ck(); the CHECKPOINT unit spreads its ten over the five skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CY_IV_SOC_BUNDLES: PilotBundle[] = [
  /* ── IV_FUNDAMENTALS ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_IV_FUNDAMENTALS',
    notes: `Almost every SOC analyst interview — at an MSSP in Hyderabad, a bank's in-house SOC in Mumbai or
Chennai, or a GCC security team in Bengaluru or Pune — opens with fundamentals. The panel is not
checking that you memorised definitions; it is checking whether you can **apply** them to the
organisation in front of you. A fresher who answers "CIA stands for confidentiality, integrity and
availability" and stops has told the panel nothing. Each question below has what is being tested, a
model answer to say aloud, the follow-up a good answer earns, and the weak answer that ends the topic.

## Q1. "Explain the CIA triad using an incident at a bank."

**Testing:** whether you can map an abstract model to real harm.

**Model answer.** "Confidentiality is about who can read data: a leaked customer list with PAN and
mobile numbers is a confidentiality failure. Integrity is about whether data can be trusted: if an
attacker changes a vendor's bank account in the payments system, nothing leaked, but the bank now pays
the wrong person — that is integrity. Availability is whether people can use the service: ransomware
on the core banking servers or a flood that takes net banking down on salary day. Real incidents hit
more than one. Ransomware with data theft is availability and confidentiality together. When I triage,
asking which of the three is at risk tells me who to involve and how severe it is."

**Follow-up:** "What is missing from CIA?" Authenticity (is this really from who it claims) and
non-repudiation (they cannot later deny it) — digital signatures give both, and payment systems care
about them a great deal.

**Weak answer:** reciting the three words with no example.

## Q2. "What is the difference between a threat, a vulnerability and a risk?"

**Testing:** precise vocabulary, because reports and risk registers depend on it.

**Model answer.** "A vulnerability is a weakness — an unpatched VPN appliance, a shared admin
password. A threat is something that could exploit it — a criminal group scanning for that VPN flaw,
or even a careless insider. Risk is the combination for a specific asset: how likely it is that this
threat uses this weakness, times the impact if it does. An unpatched internal test server and the same
flaw on an internet-facing VPN have the same vulnerability but very different risk. I reduce risk by
fixing the weakness, by making exploitation harder, or by limiting impact."

**Follow-up:** "The patch cannot go on for a month. What do you do?" A compensating control — restrict
access to the VPN portal by source, add MFA, watch its logs closely — recorded as an exception with an
end date.

**Weak answer:** using the three words interchangeably.

## Q3. "What is defence in depth? Give me an example, not a diagram."

**Testing:** whether you think in layers that each catch what the previous one missed.

**Model answer.** "Defence in depth means no single control is trusted to stop an attack. Take a
phishing email. The mail gateway filters most of them. The ones that get through meet a trained user
with a Report button. If someone still enters their password, MFA stops the sign-in. If a document
runs code, the EDR agent blocks or records it. If something calls home, the proxy and DNS filtering
block known-bad destinations, and the SIEM alerts on the unusual connection. Each layer fails
sometimes; the attacker has to beat all of them, and every layer they touch leaves evidence for the
SOC."

**Follow-up:** "A 50-person company can afford one more layer this year. Which?" MFA on email and
remote access, because stolen passwords are the most common way in and MFA is cheap.

**Weak answer:** "Firewall plus antivirus."

## Q4. "Explain least privilege and separation of duties with an example."

**Testing:** whether you see access as something that drifts and must be reviewed.

**Model answer.** "Least privilege means each person, service and machine has only the access its
job needs, for only as long as it needs it. A teller needs to view accounts, not export the whole
customer table. Separation of duties means one person cannot complete a sensitive action alone — the
person who adds a new payee is not the one who approves the payment. In a SOC the classic failure is
privilege creep: someone moves from operations to finance and keeps both sets of rights. Quarterly
access reviews and removing access when people move are how you keep it real."

**Follow-up:** "How would you spot privilege creep from the SIEM?" Group-membership changes (4728,
4732) with no matching ticket, and accounts whose groups do not match their department in HR data.

**Weak answer:** "Give users fewer permissions."

## Q5. "What is the difference between authentication and authorisation?"

**Testing:** a basic distinction that shows up in every access incident.

**Model answer.** "Authentication proves who you are — a password, a passkey, an OTP. Authorisation
decides what you may do once you are known — this user may read these records but not those. Logging
of both is accounting. A web app that checks login but lets a signed-in customer fetch another
customer's statement by changing an ID in the URL authenticated correctly and authorised badly; that is
the most common web flaw there is."

**Follow-up:** "Which HTTP status codes go with each?" 401 when you are not authenticated, 403 when you
are known but not allowed.

**Weak answer:** "They are the same; both are about login."

## Q6. "Where do symmetric and asymmetric encryption both appear when you open your bank's website?"

**Testing:** whether you know how the two are combined in practice.

**Model answer.** "In the TLS handshake. The server proves its identity with a certificate whose key
pair is asymmetric, and the two sides use an asymmetric key exchange to agree a shared secret. From
then on, the actual page and every request are encrypted with fast symmetric encryption such as AES
using keys derived from that secret. Asymmetric is slow but solves the 'how do we agree a key over an
open network' problem; symmetric is fast enough for bulk data."

**Follow-up:** "Where does hashing come in?" Integrity of each record, and the signature on the
certificate is over a hash.

**Weak answer:** "HTTPS uses RSA to encrypt the whole page."

## Q7. "Name five attack categories a SOC sees every week, and the control and the log for each."

**Testing:** breadth, from the defender's side.

**Model answer.** "Phishing — controls are the mail gateway, user reporting and MFA; evidence is in mail
gateway logs and sign-in logs. Password guessing and spraying — lockout policy, MFA, blocking legacy
authentication; I see it as failed logons across many accounts. Malware and ransomware — EDR,
application control and tested offline backups; EDR alerts and process trees. Denial of service —
upstream scrubbing and rate limits; firewall and load-balancer metrics. Web application attacks such
as injection — secure coding and a WAF; WAF and web server logs. For each I can say which log would
show it, which is what a SOC needs."

**Follow-up:** "Which of those would you expect most at an Indian bank?" Phishing and account
takeover, often aimed at customers as well as staff, and web attacks on internet banking.

**Weak answer:** a list of attack names with no control or log.

## Q8. "Take three items from the OWASP Top 10 and tell me how each shows up in logs."

**Testing:** whether the Top 10 is more than a list you recited in college.

**Model answer.** "Broken access control is first on the list most interviewers quote. In logs it looks
like one session requesting many sequential record IDs and getting 200s — a customer walking through
other customers' statements. Injection shows as quotes and SQL keywords in parameters, WAF blocks, and
a spike of 500 errors from one source while someone probes. Vulnerable and outdated components show up
in scan reports and in the server banner, and the urgent ones appear on known-exploited lists. I would
check the current edition of the list, because OWASP revises it."

**Follow-up:** "Which of those can a WAF not fix?" Broken access control — the request is perfectly
valid HTTP; only the application's authorisation check can stop it.

**Weak answer:** reciting ten names in order.

## Q9. "What is the difference between a vulnerability assessment and a penetration test?"

**Testing:** whether you know what each is for, and the role of authorisation.

**Model answer.** "A vulnerability assessment finds and lists known weaknesses across many assets,
usually with scanners, and prioritises them. A penetration test is an authorised, scoped exercise by
specialists who try to show how far weaknesses can actually be chained, on agreed systems with written
permission. As a SOC analyst I care about both: assessment findings feed patching, and a pen test is a
chance to check whether our detections fired — if the testers were never noticed, that is a finding
for us."

**Follow-up:** "What is a purple team?" Testers and defenders working together, technique by
technique, so each test ends with a detection that is checked to work.

**Weak answer:** "Pen testing is hacking."

## How you are judged

Strong answers turn a definition into an example from the employer's world and end with a log or a
control. Weak answers are definitions only. If you do not know, say how you would find out — that is
an answer; a confident guess is not.`,
    workedExample: `**Question: "Our UPI app's customers are getting SMS messages that pretend to be from us and
link to a fake login page. Which part of the CIA triad is at risk, and what would you do as a SOC
analyst?"**

**A weak answer (heard often):**

"It is confidentiality, because the attacker steals passwords. I would block the website and tell
customers not to click on links."

What the panel hears: one word of theory, two actions with no owner, and nothing about what the SOC
can see or measure. "Block the website" — block it where? The customers are not on the bank's network.

**A strong answer:**

"First confidentiality — customers' credentials and maybe OTPs are being collected. But if the
attacker uses them, it becomes integrity: payments or beneficiaries changed in real accounts. So I
treat it as a fraud and account-takeover risk, not just a phishing nuisance.

What I would do: get the fake domain and the sender details from customer complaints or the fraud
team, and pass them to whoever handles takedown — brand protection or a vendor — and report the
phishing to CERT-In through the organisation's process. On our side I would search sign-in logs for
logins to customer accounts from the IP addresses or device fingerprints seen with the fake site, and
for unusual patterns — a new device followed quickly by a new beneficiary and a large transfer. I
would ask whether those accounts can be put under extra checks.

Then defence in depth: the app should use device binding and push confirmation rather than only an
OTP that can be phished, and a customer message explaining what we will never ask for. I would also
add a detection for newly registered domains that look like ours, so we hear about the next one before
customers do."

**Why it scores:** it names how the harm moves from confidentiality to integrity, uses data the SOC
actually has, routes actions to the people who own them, and ends with a detection — not a slogan.`,
    mcqs: [
      mcq('An attacker changes a supplier’s bank account number in a company’s payment system, and no data leaves the company. Which property has failed?', [
        ['Integrity, because the stored record can no longer be trusted', true],
        ['Confidentiality, because the attacker could read the record', false],
        ['Availability, because the supplier will not be paid on time', false],
        ['Non-repudiation, because nobody can prove who changed it', false],
      ], 'The harm is that data was altered without authorisation, so the payment goes to the wrong account — an integrity failure. Reading it alone would be confidentiality; a late payment is a consequence, not the property that failed; non-repudiation is about proving an action, which logs may still do.'),
      mcq('A signed-in customer changes the account number in a statement URL and downloads someone else’s statement. What does an interviewer expect you to call this?', [
        ['A failed authentication check, since the customer was not who they said', false],
        ['Broken access control: the login worked, the authorisation did not', true],
        ['An injection flaw, since the customer typed into the URL parameter', false],
        ['A misconfigured TLS setup that exposed the other customer’s data', false],
      ], 'The customer was correctly authenticated; the application failed to check whether that customer may read that record. That is authorisation, the top item in the OWASP list most panels quote. Changing an ID is not injection, and TLS protects transport, not authorisation.'),
      mcq('A VPN appliance has a known flaw and the vendor patch cannot be installed for a month. Which response shows an interviewer you understand risk?', [
        ['Accept the risk silently, since the patch will arrive soon enough', false],
        ['Shut the VPN down for the month so the flaw cannot be used at all', false],
        ['Run a vulnerability scan every day so the flaw stays on the report', false],
        ['Compensate: limit access, add MFA, watch its logs, end-dated exception', true],
      ], 'When the weakness cannot be removed yet, you lower likelihood and impact with compensating controls and record the exception with an end date. Silent acceptance hides the risk; shutting remote access stops the business; daily scanning only re-reports a known flaw.'),
    ],
    checkpoint: [
      ck('SECURITY_FUNDAMENTALS', 'The same unpatched flaw exists on an internal test server and on the internet-facing VPN gateway. How should an analyst describe the two?', [
        ['Same vulnerability, different risk, because exposure and impact differ', true],
        ['Same risk, because a CVE carries one score wherever it appears', false],
        ['Different vulnerabilities, because the two systems run different roles', false],
        ['No risk on the test server, because test systems are out of scope', false],
      ], 'A vulnerability is the weakness; risk depends on how likely it is to be exploited on that asset and the harm if it is. Internet exposure raises likelihood. A score describes the flaw, not the asset, and test servers are still a way in.'),
      ck('SECURITY_FUNDAMENTALS', 'Which arrangement in a payments team best shows separation of duties?', [
        ['Each finance user keeps a separate password for the payments system', false],
        ['Payments are logged in full so any change can be traced afterwards', false],
        ['One person adds a new payee and a different person approves payment', true],
        ['Only senior staff may log in to the payments system after 6 p.m.', false],
      ], 'Separation of duties means no single person can complete a sensitive action alone, so fraud needs collusion. Separate passwords are authentication, logging is accounting, and a time restriction is an access rule — all useful, none of them separation of duties.'),
      ck('SECURITY_FUNDAMENTALS', 'During a planned, authorised penetration test of the bank’s internet banking, the SOC raised no alerts at all. What should the SOC take from that?', [
        ['Nothing, since the testers were authorised and so are not a threat', false],
        ['A detection gap to close, checking which of their steps went unseen', true],
        ['That the test failed, since a real attacker would have been noticed', false],
        ['That alerting should be paused during tests to avoid false positives', false],
      ], 'Authorised testing is a free check of the SOC’s detections. If nothing fired, the SOC should map what the testers did against its rules and close the gaps. Authorisation changes the response, not whether the activity should have been seen.'),
    ],
  },

  /* ── IV_NETWORK ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_IV_NETWORK',
    notes: `Network questions are where a SOC panel finds out whether you have looked at traffic or only read
about it. You read captures, wrote display filters, measured DNS label entropy and beacon intervals,
evaluated firewall rule order and compared Suricata with Zeek in Network Security; the panel wants to
hear you **reason from what a log line shows**. Expect a log line or a short scenario, not a textbook
definition.

## Q1. "Zeek's conn.log shows hundreds of connections in state S0 from one internal laptop, to many internal addresses. What is happening?"

**Testing:** whether you know what a connection state means and can turn it into a hypothesis.

**Model answer.** "S0 means Zeek saw a SYN and no reply — the connection was attempted and never
answered. Hundreds of those from one host to many internal addresses, usually on the same few ports, is
the shape of a host discovering what is on the network — internal scanning, ATT&CK's Network Service
Discovery. It could be an IT inventory tool, so I check the host against the CMDB and the IT team's
scanners first. If it is a sales laptop, it is suspicious: I look at which ports it tried, what ran on
the laptop at that time in the EDR, and whether any attempt succeeded — an S1 or SF to the same
destinations afterwards."

**Follow-up:** "What would REJ mean instead?" The target answered with a reset — the host is up but the
port is closed. Lots of REJ still means someone is probing.

**Weak answer:** "It is a DDoS attack."

## Q2. "Which ports should you know by heart, and which one, seen in the wrong place, worries you most?"

**Testing:** whether port numbers mean behaviour to you.

**Model answer.** "22 SSH, 53 DNS, 80 and 443 web, 25 and 587 mail, 88 Kerberos, 123 NTP, 389 and 636
LDAP, 445 SMB, 3389 RDP, and database ports such as 1433, 3306 and 5432. What worries me is context,
not the number: 445 or 3389 from one workstation to dozens of other workstations, because desktops
rarely talk to each other and that is how malware and intruders move sideways. Or 3389 open to the
internet on a server — remote desktop exposed directly is a common way into Indian SMEs."

**Follow-up:** "A database port reachable from the user subnet?" A segmentation failure; only the app
servers should reach it.

**Weak answer:** listing ports with no idea of what is normal.

## Q3. "DNS uses UDP. When does it use TCP, and when should TCP 53 worry you?"

**Testing:** protocol detail tied to a defender's question.

**Model answer.** "Ordinary queries use UDP 53. TCP 53 is used when a response is too large for UDP —
large DNSSEC answers, for example — and for zone transfers between name servers. A zone transfer
request from an outside address, or from a laptop, is either a misconfiguration or someone mapping
every name in our domain; our servers should allow transfers only to our own secondary servers."

**Follow-up:** "A laptop sends UDP 53 directly to a public resolver." It is bypassing the internal
resolver, so its lookups escape our DNS logs and filtering — block outbound 53 except from the
resolvers.

**Weak answer:** "DNS is always UDP."

## Q4. "Why do SOCs say DNS logs are worth more than their size?"

**Testing:** whether you know what DNS reveals even when traffic is encrypted.

**Model answer.** "Every connection to a name starts with a lookup, so DNS logs are a map of what every
machine tried to reach — including HTTPS traffic I cannot read. They are small compared with full
traffic. I look for long random-looking labels under one domain, which can mean data being encoded
into lookups; bursts of NXDOMAIN from one host trying many generated names; unusual record types in
volume, such as TXT from a desktop; newly registered domains; and clients using DNS over HTTPS to a
public resolver, which makes them disappear from my logs."

**Follow-up:** "Is high entropy alone enough to alert?" No — CDNs and cloud services use long random
names too. Entropy plus length plus one host plus one parent domain plus NXDOMAIN is a strong signal.

**Weak answer:** "DNS logs show which websites people visit."

## Q5. "Everything is HTTPS now. What can a network defender still see?"

**Testing:** whether "encrypted" stops your thinking.

**Model answer.** "Quite a lot. The SNI in the ClientHello shows the name the client asked for. In TLS
1.2 the certificate is visible: self-signed, issued yesterday, or a name that does not match. The
client fingerprint — JA3 or JA4 — tells a browser from a script or a malware family. And the flow
itself: who talked to whom, how often, how many bytes, for how long. A desktop sending small,
regular, same-sized TLS sessions to a rare destination every few minutes is suspicious even though I
cannot read a byte of it."

**Follow-up:** "Should we decrypt everything at the proxy?" Only with policy and legal approval, and
with categories such as banking and health exempted; decryption creates a sensitive system of its own.

**Weak answer:** "You cannot see anything in encrypted traffic."

## Q6. "Stateful versus stateless firewall — and why does rule order matter?"

**Testing:** whether you can read a rule base and find the mistake.

**Model answer.** "A stateless filter judges each packet alone, so to allow replies you write a rule
that lets in anything that looks like a reply. A stateful firewall keeps a connection table and allows
replies only for connections it saw start. Rule order matters because most firewalls act on the first
match: a deny for users-to-database placed below a broad 'users to anywhere' allow is never reached.
It still looks right in a review. So I check for shadowed rules, make the default action deny, and make
sure the 'internet' rule does not also mean every internal zone."

**Follow-up:** "And egress?" Most networks allow everything out, which is how beacons and uploads leave.
Servers that only answer requests rarely need to start internet connections at all.

**Weak answer:** "A firewall blocks bad traffic."

## Q7. "Signature-based versus anomaly-based detection: give me a case where each wins."

**Testing:** whether you know what Suricata and Zeek-style analytics are each good for.

**Model answer.** "Signatures win when the pattern is known and specific — a Suricata rule for a
known exploit's request, or traffic to a known-bad domain. They are precise once tuned and give a clear
reason for the alert. Anomaly or behaviour detection wins when the attacker is new or uses ordinary
tools: a host that has never used SMB suddenly connecting to forty peers, or a beacon to a domain no
other machine visits. Zeek gives me the logs to build those analytics. A SOC needs both, and neither
sees traffic that never passes the sensor."

**Follow-up:** "IDS or IPS?" An IPS sits inline and can drop traffic; an IDS watches a copy and only
alerts. Inline blocking needs well-tuned rules or you break the business.

**Weak answer:** "Anomaly detection is better because it uses AI."

## Q8. "How would you find a machine that checks in with an outside server every few minutes?"

**Testing:** a concrete hunting method on flow data.

**Model answer.** "Group connections per source, destination and port, and look at the gaps between
session starts. Software on a timer produces gaps with low variation, even with some random jitter;
people browsing do not. I add the byte counts — check-ins are small and similar — and rarity: how many
other machines in the fleet talk to that destination. One or two hosts, regular intervals, small
sessions and a rare destination is worth an investigation. Then I pivot to the endpoint to find which
process makes the connection."

**Follow-up:** "Windows Update is periodic too." Which is why rarity and an allow-list of known
services matter; a destination half the fleet talks to is rarely a beacon.

**Weak answer:** "Look for traffic to bad IP addresses."

## Q9. "You join a company whose 300-machine office network is flat. What do you change first?"

**Testing:** segmentation as a plan, not a word.

**Model answer.** "I would split it into zones by trust: users, servers, data, management, and
guest/IoT. Default deny between zones, and every allow names source, destination, port and reason.
First priorities: put printers, CCTV and guest Wi-Fi where they can reach only the internet; make sure
only the management zone can use RDP and SSH into servers; and let only the application servers reach
the databases. Then log the denies, because an inside host hitting a deny is often the first sign of
trouble."

**Follow-up:** "Where does zero trust fit?" It goes further: each request is checked on identity and
device health, so being on the network is not trust by itself.

**Weak answer:** "Buy a better firewall."

## How you are judged

Strong answers read the field (S0, SNI, a port in context), state a hypothesis, give the benign
explanation and say what you would check next. Weak answers jump to "it is an attack" or "nothing can be
seen".`,
    workedExample: `**Question: "A web server in our DMZ starts making outbound connections to an unfamiliar
address at 2 a.m. What do you do?"**

**A weak answer (heard often):**

"I would block the IP on the firewall and run an antivirus scan on the server."

What the panel hears: an action before any understanding. Blocking one IP may tip off an intruder who
has other ways out; an antivirus scan says little about a server; and nobody has asked whether this is
normal.

**A strong answer:**

"First, is it normal? A DMZ web server should answer requests, not start connections, so outbound from
it is already unusual — but I check whether it is a patch download, a certificate check or a monitoring
agent, by looking at the destination's name in DNS logs and the port.

Then I characterise the traffic from the firewall and Zeek logs: which ports, how many sessions, how
regular, how many bytes out against bytes in. Large outbound volume from a web server is very different
from a few small, regular connections.

Then the host. I check web server logs for the hours before — unusual requests, error spikes, uploads —
and the EDR or process data for which process opened the connection. A web server process starting a
shell, or a new process nobody recognises, makes this an incident.

If it looks malicious, I escalate with the evidence and recommend containment to the IR lead rather than
acting alone: isolating a production server is the system owner's decision with the IR lead, and the
plan may be to scope fully before blocking. Either way I note that our egress rules allowed a DMZ server
to reach the internet freely — that is a fix for later."

**Why it scores:** it starts from "what is normal for this asset", uses the logs a SOC has, pivots from
network to host, respects who decides containment, and finds a control gap.`,
    mcqs: [
      mcq('In Zeek’s conn.log a laptop shows hundreds of connections in state REJ to many internal addresses on port 445. What does REJ mean here?', [
        ['The firewall dropped each SYN silently before it reached the target', false],
        ['The connection succeeded and was closed normally by both sides', false],
        ['The targets answered the SYN with a reset: host up, port closed', true],
        ['The laptop sent data but the targets never acknowledged any of it', false],
      ], 'REJ is a connection attempt rejected with a RST, which means the target was reachable and the port closed. A silent drop shows as S0 (no reply), a normal close as SF. Many REJ across many hosts is still the shape of discovery.'),
      mcq('A finance laptop sends UDP port 53 queries straight to a public resolver on the internet. Why does a SOC care?', [
        ['Public resolvers are slower, so users will report slow browsing', false],
        ['Those lookups skip the internal resolver’s logs and filtering', true],
        ['UDP 53 to the internet is always a sign of data being tunnelled out', false],
        ['Public resolvers cannot resolve the company’s internal host names', false],
      ], 'The internal resolver is where DNS is logged and filtered. A client going direct is invisible to both, by misconfiguration or on purpose. It is not proof of tunnelling, and the speed and internal-name issues are side effects, not the security concern.'),
      mcq('A firewall’s rule 5 denies user subnets to the database zone, but rule 3 allows user subnets to 0.0.0.0/0. What happens to user traffic to the database?', [
        ['It is denied, because a deny rule always beats an allow rule', false],
        ['It is denied, because the default action at the end is deny', false],
        ['It depends on whether the firewall is stateful or stateless', false],
        ['It is allowed, because rule 3 matches first and rule 5 is shadowed', true],
      ], 'Most firewalls act on the first matching rule. 0.0.0.0/0 includes internal ranges, so rule 3 allows the traffic and rule 5 is never reached. Deny does not automatically beat allow, the default only applies when nothing matches, and statefulness does not change order.'),
    ],
    checkpoint: [
      ck('NETWORK_SECURITY', 'Two hosts out of 4,000 open small TLS sessions to the same rare domain every 300 seconds, plus or minus 20. Why is this worth investigating?', [
        ['Regular, small sessions to a destination almost nobody uses fit a beacon', true],
        ['TLS to any rare domain is malicious, because legitimate sites are common', false],
        ['A 300-second interval is the fixed default of most malware families', false],
        ['Small TLS sessions mean the certificate check failed on both hosts', false],
      ], 'Low-variance timing, small similar sessions and rarity across the fleet together fit software checking in on a timer. Rarity alone is not malice, there is no universal malware interval, and session size says nothing about certificate validation.'),
      ck('NETWORK_SECURITY', 'Which observation, seen in a firewall log, most strongly suggests a segmentation failure rather than an attack?', [
        ['Inbound SYNs from the internet dropped at the edge on port 3389', false],
        ['A guest Wi-Fi client denied when it tried to reach an internal printer', false],
        ['Outbound HTTPS from user laptops to a software update service', false],
        ['Allowed connections from the user subnet to a database on port 5432', true],
      ], 'Users reaching the data zone directly means a rule permits a flow the design should forbid. Dropped inbound RDP and a denied guest client show controls working, and laptop updates over HTTPS are normal traffic.'),
      ck('NETWORK_SECURITY', 'All web traffic leaving the office is TLS 1.3. Which item can the SOC still read from the network without decrypting anything?', [
        ['The server certificate, which TLS 1.3 sends in clear text', false],
        ['The SNI name the client requested in its ClientHello message', true],
        ['The URL path and query string of every HTTPS request made', false],
        ['The HTTP User-Agent header sent inside each encrypted request', false],
      ], 'The SNI travels in the ClientHello, which is readable unless Encrypted Client Hello is in use. TLS 1.3 encrypts the certificate, and the URL path and headers are inside the encrypted session.'),
    ],
  },

  /* ── IV_SYSTEMS_IDENTITY ────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_IV_SYSTEMS_IDENTITY',
    notes: `Most alerts an L1 analyst touches involve an account and a machine, so panels spend a long time
here. You read Windows Security and Sysmon events, followed Kerberos and NTLM on a domain controller,
hardened SSH and read auth logs, and designed identity controls in Endpoint and Identity Security. The
panel wants event IDs **with meaning**, not a recited list, and identity controls with their weak spots.

## Q1. "You open a 4624 event. Which fields do you read, and why does the logon type matter?"

**Testing:** whether you can read one event properly.

**Model answer.** "4624 is a successful logon. I read the account name and domain, the logon type, the
source workstation and IP, the authentication package — Kerberos or NTLM — and the logon ID, which lets
me tie later events from that session together. The logon type tells me how they came in: 2 is at the
keyboard, 3 is over the network, such as a file share, 10 is remote desktop, 4 and 5 are scheduled
tasks and services. A type 10 logon to a domain controller from a normal user's laptop is a very
different event from a type 3 file-share logon, even with the same account."

**Follow-up:** "What is 4672 next to it?" Special privileges assigned — the session is an
administrative one, so it deserves a closer look.

**Weak answer:** "4624 means login successful."

## Q2. "Which Windows events would you alert on with almost no tuning?"

**Testing:** judgement about high-signal events.

**Model answer.** "1102, the Security log being cleared — legitimate admins rarely do it and an
intruder often does. Members added to privileged groups — 4728, 4732 and 4756 on Domain Admins or local
Administrators — outside a change ticket. 7045, a new service installed on a server, because services
are a common way to persist and run code. And with Sysmon, event 10 where a non-system process opens
lsass.exe, since that is how credentials are read from memory. Each still needs context, but they are
rare enough that every one deserves a look."

**Follow-up:** "Why is 4688 not on your list?" It is very common and the command line is empty unless
the policy setting is on; it is a rich source for detections, not an alert by itself.

**Weak answer:** "4625, failed logons." They happen all day.

## Q3. "What is the difference between 4768, 4769 and 4771 on a domain controller?"

**Testing:** Kerberos as it appears in logs.

**Model answer.** "4768 is a ticket-granting ticket being requested — the start of a Kerberos logon,
after the user proves knowledge of their password in pre-authentication. 4769 is a service ticket
being requested for a particular service, such as a file server. 4771 is pre-authentication failing,
typically a wrong password, with failure code 0x18. A wave of 4771s across many accounts from one
source is spraying; a burst of 4769s for many service accounts from one user, with RC4 encryption, is
the pattern defenders watch for Kerberoasting."

**Follow-up:** "Why is krbtgt's password reset twice after a domain compromise?" Tickets are signed
with its key and the domain keeps the current and previous key, so one reset leaves forged tickets
valid; the second reset, after replication, invalidates them.

**Weak answer:** "They are all Kerberos errors."

## Q4. "Why does NTLM still appear in a Kerberos domain, and why do defenders want less of it?"

**Testing:** knowing the fallback and its risk.

**Model answer.** "NTLM appears when a resource is reached by IP address instead of name, with old
applications and devices, and with local accounts. It is weaker than Kerberos: the response is derived
from the password hash, which is why the technique called Pass the Hash works against it. Defenders
audit NTLM use, find the applications that need it, fix them, and restrict it over time. In the logs I
watch for NTLM network logons from one workstation to many others."

**Follow-up:** "Which event shows NTLM validation on a DC?" 4776.

**Weak answer:** "NTLM is an old protocol nobody uses."

## Q5. "How do brute force and password spraying look different in the logs?"

**Testing:** pattern reading and the right response for each.

**Model answer.** "Brute force is many guesses against one account — a burst of 4625s or 4771s for one
user, usually ending in lockout, 4740. Spraying is one or two common passwords tried against many
accounts, kept under the lockout threshold — a few failures per account but hundreds of accounts from
one source. On Windows the status code helps: 0xC000006A is a wrong password for a real account,
0xC0000064 is a user name that does not exist. A success after either pattern is the event that
matters: that account is probably compromised."

**Follow-up:** "The source is our own VPN concentrator." Then the real source is behind it; pivot to
the VPN logs for the client IP.

**Weak answer:** "They are the same thing."

## Q6. "Why install Sysmon when Windows already has process-creation auditing?"

**Testing:** what richer endpoint telemetry gives a SOC.

**Model answer.** "Sysmon process creation, event 1, includes the full command line, hashes of the
image and the parent's command line every time. It adds network connections with the process that made
them (event 3), process access such as something opening lsass (event 10), file creation (11),
registry changes in persistence locations (13) and DNS queries with the process that made them (22).
Nobody writes a config from scratch: we start from a maintained community config and tune out what our
own estate makes, or the SIEM floods."

**Follow-up:** "Where does EDR fit?" EDR records similar telemetry, adds prevention, isolation and a
console; Sysmon is free telemetry you send to your own SIEM.

**Weak answer:** "Sysmon is an antivirus."

## Q7. "How do you harden SSH on a Linux server, and where do you look for attacks on it?"

**Testing:** practical Linux hygiene and its logs.

**Model answer.** "Keys instead of passwords — PasswordAuthentication no — and PermitRootLogin no, so
admins log in as themselves and use sudo. Limit who can log in with AllowGroups, and limit where from
with the firewall or a bastion. Keep the package patched. For evidence, Ubuntu writes to
/var/log/auth.log and RHEL-family systems to /var/log/secure, and journalctl shows the sshd unit.
'Failed password' and 'Invalid user' lines show guessing; an 'Accepted' line after many failures is the
one that matters. sudo usage is logged too, and auditd can record changes to sensitive files."

**Follow-up:** "You set PasswordAuthentication no and passwords still work." Something later in the
configuration — an Include file or a Match block — overrides it; check the effective settings with
sshd -T.

**Weak answer:** "Change the SSH port."

## Q8. "What is joiners, movers and leavers, and where does it usually fail?"

**Testing:** identity lifecycle and privilege creep.

**Model answer.** "Joiners get access based on role, approved by their manager. Movers change role and
should lose the old access when they gain the new — this is where it fails, because nobody removes
anything and people collect access over years. Leavers must be disabled on their last day, including
cloud apps, VPN, shared mailboxes and any personal tokens. HR data should drive it, access reviews
catch the drift, and service accounts need an owner like any human account."

**Follow-up:** "How would the SOC help?" Alert on sign-ins by accounts of people marked as left, and
on group changes with no ticket.

**Weak answer:** "HR tells IT to create accounts."

## Q9. "Rank the forms of MFA from weakest to strongest and tell me why."

**Testing:** knowing that MFA is not one thing.

**Model answer.** "SMS OTP is weakest: it can be phished, and SIM swaps move the number. App-based TOTP
codes cannot be SIM-swapped but can still be phished on a fake page. Push approval is convenient but
users approve prompts they did not start — MFA fatigue — unless number matching and location are
shown. FIDO2 security keys and passkeys are strongest because they are bound to the real site's
domain, so a fake site gets nothing usable. Admins and finance should get phishing-resistant methods
first."

**Follow-up:** "What does the SOC watch for?" A new MFA method registered right after a risky sign-in,
and a run of denied pushes followed by an approval.

**Weak answer:** "MFA stops all account takeovers."

## How you are judged

Strong answers turn an event ID into a story ("type 10 to a DC from a laptop"), name the benign case,
and know the weak spot of each control. Weak answers recite numbers or treat MFA, Kerberos and SSH as
solved problems.`,
    workedExample: `**Question: "A user's account signs in from Pune at 10:02 and from another country at 10:14.
What do you check?"**

**A weak answer (heard often):**

"That is impossible travel, so the account is hacked. I would disable it and tell the user to change
the password."

What the panel hears: an alert title repeated as a conclusion. Impossible-travel rules are noisy, and
disabling a senior manager's account on a guess has a real cost.

**A strong answer:**

"Impossible travel is a lead, not a verdict, so I look at both sign-ins.

First, the benign explanations. Is the foreign IP a VPN, a cloud proxy or the company's own internet
breakout in another region? Many 'foreign' sign-ins are the corporate VPN or a mobile carrier routing
through another country. I check the IP against our known egress ranges and the VPN logs.

Then the details of the second sign-in: which application, which device — known and managed, or new?
Which MFA method was used, and was MFA satisfied or skipped through a legacy protocol? What user agent?
A known managed laptop through the corporate VPN is almost certainly fine. A new device, a browser
never seen for this user, and MFA approved by push after several denied prompts is very different.

Then what happened after: new inbox rules or forwarding, a new MFA method registered, mass file
downloads, password changes.

If it looks like a takeover, I escalate with that evidence and the account containment steps from the
playbook: revoke sessions and refresh tokens first, then reset the password through a verified channel,
review MFA methods, and remove anything the attacker added. A password reset alone leaves existing
sessions alive."

**Why it scores:** it treats the alert as a hypothesis, rules out the common benign cause, uses the
fields that separate the two, checks for persistence, and knows that containment of an account is a
sequence, not a reset.`,
    mcqs: [
      mcq('A 4624 event on a domain controller shows Logon Type 10 from a sales laptop. What does the logon type tell you?', [
        ['The account logged on over a file share, which is routine on a DC', false],
        ['Someone used remote desktop to reach the DC from that laptop', true],
        ['A scheduled task started on the DC under that account’s name', false],
        ['The laptop used cached credentials because the DC was offline', false],
      ], 'Logon type 10 is remote interactive — RDP. A sales laptop opening a remote desktop session on a domain controller is unusual and worth a look. Type 3 is network (file shares), 4 is batch (scheduled tasks) and 11 is cached interactive.'),
      mcq('Across one hour, 400 different accounts each show two 4771 events with code 0x18, all from one internal IP. What pattern is this?', [
        ['Brute force against a single account, ending in lockout', false],
        ['Clock drift on the DC, breaking Kerberos for everyone at once', false],
        ['Password spraying: a few guesses per account, many accounts', true],
        ['A service account with an expired password retrying its logon', false],
      ], 'Few failures per account across hundreds of accounts from one source, kept under the lockout threshold, is spraying. Brute force concentrates on one account; clock problems produce different errors; one service account would show as one account.'),
      mcq('An admin sets PasswordAuthentication no in sshd_config, restarts sshd, and password logins still work. What should be checked first?', [
        ['Whether the server needs a reboot before sshd reads its config', false],
        ['Whether every user’s public key was copied to authorized_keys', false],
        ['Whether fail2ban is running and overriding the sshd settings', false],
        ['The effective config from sshd -T, as a later block may override it', true],
      ], 'An Include file or a Match block later in the configuration can set the option back. sshd -T prints the settings actually in force. A restart is enough to reload; keys and fail2ban do not re-enable password logins.'),
    ],
    checkpoint: [
      ck('IAM_FUNDAMENTALS', 'An employee moved from the operations team to finance six months ago and still has write access to the operations file share. What has failed?', [
        ['The leavers process, because the old role was never closed', false],
        ['The movers process, which added new access and removed none', true],
        ['The joiners process, because finance access was granted too fast', false],
        ['The MFA policy, because finance users need stronger sign-in', false],
      ], 'A change of role should remove the old access as the new is granted. Keeping both is privilege creep, the classic movers failure. The person has not left, joined access is not the issue, and MFA does not limit what an account may reach.'),
      ck('IAM_FUNDAMENTALS', 'Finance users approve push prompts they did not start after being flooded with them. Which change most directly addresses this?', [
        ['Number matching with location shown, or phishing-resistant keys', true],
        ['A shorter password expiry period for every finance user account', false],
        ['Replacing push prompts with SMS one-time codes for finance users', false],
        ['Training finance staff once a year on how push notifications work', false],
      ], 'Number matching makes a blind approval fail, and FIDO2 keys or passkeys remove the prompt being abused. Password expiry does not touch MFA; SMS codes are weaker (phishable, SIM swap); annual training alone does not stop fatigue.'),
      ck('IAM_FUNDAMENTALS', 'After a confirmed domain compromise, the team resets the krbtgt password once and sees forged-ticket activity continue. Why?', [
        ['Kerberos tickets are encrypted with each user’s own password hash', false],
        ['The DC caches every ticket until it is restarted after the reset', false],
        ['The domain keeps the previous key too, so a second reset is needed', true],
        ['krbtgt resets only take effect for accounts created after the reset', false],
      ], 'Ticket-granting tickets are signed with krbtgt’s key and the domain accepts the current and previous keys. Only a second reset, after replication, retires the compromised key. TGTs are not encrypted with users’ hashes, and there is no restart or new-account rule.'),
    ],
  },

  /* ── IV_SIEM ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_IV_SIEM',
    notes: `SIEM and detection questions are the heart of an L1/L2 SOC interview, because this is the work you
will do on shift from week one. You built a log pipeline into a common schema, searched in KQL and SPL,
wrote and tested Sigma rules mapped to ATT&CK, tuned a noisy rule with precision and recall, triaged
alerts with enrichment and built SOC metrics. The panel wants to see that you can **write, test and
judge** a detection, not just name the console.

## Q1. "What does a SIEM do that a central log server does not?"

**Testing:** whether you know the parts of a SIEM.

**Model answer.** "A log server stores logs. A SIEM collects them from many sources, parses and
normalises them into one schema so the same field means the same thing everywhere, correlates events
across sources, runs detection rules and raises alerts, and gives analysts search, cases and dashboards
on top, with retention to match policy. Wazuh, Elastic, Splunk and Microsoft Sentinel are all SIEMs. A
SOAR is the next layer: it automates the repeatable response steps, such as enrichment or blocking a
sender, from those alerts."

**Follow-up:** "What is the most common reason a SIEM rule silently never fires?" The field name or
format in the rule does not match what the parser produces — the logs are there, the rule is looking in
the wrong place.

**Weak answer:** "A SIEM is a dashboard for logs."

## Q2. "Why normalise logs, and what goes wrong with time?"

**Testing:** whether you have had correlation fail on you.

**Model answer.** "A firewall says src, Windows says IpAddress, the proxy says client_ip — normalising
to one schema, such as ECS, lets one search and one rule cover all of them. Time is where correlation
breaks most. Sources log in different zones — IST is UTC plus 5:30 — and some log local time with no
zone at all. If one source is stored as if it were UTC, its events land five and a half hours off and
a phishing click appears after the fraud it caused. So the pipeline converts everything to UTC at
ingestion, and dashboards display in IST for people."

**Follow-up:** "How would you notice the problem?" Events that should be seconds apart, like a proxy
request and the DNS lookup before it, appear hours apart.

**Weak answer:** "Normalisation makes logs look nicer."

## Q3. "Write me a detection for someone being added to Domain Admins."

**Testing:** whether you can write a rule, not describe one.

**Model answer.** "On a domain controller that is event 4728 for a global group, with the group name
Domain Admins — and 4732 or 4756 for local and universal groups. In KQL over ECS-mapped data:

    event.code:("4728" or "4732" or "4756") and group.name:("Domain Admins" or "Administrators" or "Enterprise Admins")

In Sigma I would write the same as a selection on EventID and TargetUserName in the Windows
security log source, tag it attack.persistence with the ATT&CK technique for account manipulation, and
add a test log sample in Git. The interesting part is the false positives: approved admin changes. I
would rather the change process put a ticket number somewhere the rule can check than exclude the IT
team's accounts."

**Follow-up:** "The rule fires on an approved change. True or false positive?" A benign true positive:
the rule worked and the activity was authorised. It is a process question, not a rule defect.

**Weak answer:** "I would use the SIEM's built-in rule."

## Q4. "What is the difference between a false positive and a benign true positive?"

**Testing:** precise vocabulary for tuning and reporting.

**Model answer.** "A false positive means the rule fired on something that does not match what it is
meant to detect — the logic is wrong or too broad, so I fix the rule. A benign true positive means the
rule correctly detected the behaviour, and the behaviour was authorised — an admin really did run
encoded PowerShell for a backup job. The fix there is usually a narrow exclusion with an owner and a
review date, or changing the process. Lumping both together makes the rule look worse than it is and
leads to bad tuning."

**Follow-up:** "How do you write that exclusion safely?" Combine fields the attacker does not control —
the full parent process path and the account — never just a word in the command line.

**Weak answer:** "Both mean the alert was not real."

## Q5. "You tuned a rule and its precision went from 0.06 to 1.0. Is it better?"

**Testing:** whether you know precision hides misses.

**Model answer.** "Not necessarily. Precision tells me how many alerts were real; it says nothing about
what the rule stopped seeing. A broad exclusion — every alert for the backup account or for SYSTEM —
gives perfect precision and quietly hides a stolen service account. I report recall next to it,
measured on labelled samples including known-bad ones, and I compare before and after on the same
data. A tuning change is good when precision rises and recall holds."

**Follow-up:** "Where do known-bad samples come from?" Past incidents, attack simulations run in a lab,
and public test data sets — never by running anything against production.

**Weak answer:** "Yes, there are no false positives now."

## Q6. "Give me a correlation that is stronger than either event alone."

**Testing:** thinking in sequences.

**Model answer.** "Failed sign-ins for one account, then a success from the same source, then a new MFA
method registered within minutes. Each alone is common; together they look like a guessed password
and an attacker settling in. Another: a document opened from email, then that Office process starting
PowerShell, then a connection to a domain seen for the first time in our environment. Correlation
rules need a shared key — user, host, source IP — and a time window that fits how the behaviour
really unfolds."

**Follow-up:** "What breaks such a rule?" Inconsistent user names across sources — UPN in one, DOMAIN\\user
in another — and clock skew.

**Weak answer:** "Correlate everything with everything."

## Q7. "Tactic, technique, sub-technique — explain with an alert you might triage."

**Testing:** ATT&CK as a working tool.

**Model answer.** "A tactic is the attacker's goal at that step — Execution, Persistence, Credential
Access. A technique is how they achieve it — Command and Scripting Interpreter. A sub-technique narrows
it — PowerShell, T1059.001. So an alert for Word spawning encoded PowerShell is Execution through
T1059.001, likely after Initial Access by phishing, T1566. Mapping alerts and rules this way lets the
SOC see which techniques it covers, which rules are tested, and where the gaps are — rather than
claiming a percentage."

**Follow-up:** "Is covering more techniques always better?" No — coverage of the techniques that
matter to us, with tested rules, beats a large untested number.

**Weak answer:** "MITRE ATT&CK is a list of hacker groups."

## Q8. "Walk me through triaging an alert you have never seen before."

**Testing:** method under uncertainty.

**Model answer.** "I acknowledge it so the clock is honest. I read the rule — what behaviour it detects,
its known false positives — and open the raw event, not just the title. I enrich: who is the user and
are they privileged, what is the asset and how critical, what is the source or destination and its
reputation, and how has this rule closed before on this host. I look around an hour either side for
other events on the same host and user. Then I decide: true positive, benign true positive, false
positive, or cannot tell — and cannot tell means escalate. I write the note so L2 can act without
asking me anything."

**Follow-up:** "Severity versus priority?" Severity belongs to the rule; priority belongs to this alert
in this context. A medium rule on the core banking server with a privileged account is P1.

**Weak answer:** "I check if the IP is malicious on a website."

## Q9. "Why are hash-based detections easy to evade, and what would you write instead?"

**Testing:** the pyramid of pain.

**Model answer.** "A file hash changes if one byte changes, so an attacker can produce a new hash in
seconds. IP addresses and domains are a little harder to change, but still cheap. Tools are harder, and
behaviours — the techniques — are hardest, because changing how they work costs the attacker real
effort. So I still block known hashes and IPs from intelligence, but my detections aim at behaviour:
Office spawning a script interpreter, a process opening lsass, a new service on a server."

**Follow-up:** "Then why keep indicator feeds?" They are cheap, catch commodity threats, and help scope
an incident fast — just do not mistake them for coverage.

**Weak answer:** "Hashes are the most reliable indicator."

## How you are judged

Strong answers write a real rule, measure tuning with both precision and recall, and triage with a
method. Weak answers name tools and trust an alert's title.`,
    workedExample: `**Question: "Our impossible-travel rule fires 200 times a day and analysts close almost all of
them. Fix it."**

**A weak answer (heard often):**

"I would disable the rule, since it is all false positives, or raise the distance threshold so it
fires less."

What the panel hears: making the queue quieter without knowing why it is noisy. Disabling it removes a
real control over account takeover; raising a threshold blindly hides exactly the cases it exists for.

**A strong answer:**

"First I find out why it is noisy. I export a few weeks of its alerts with their dispositions and group
the closed-as-benign ones by the fields that explain them: source IP ranges, ASN, device, application.

Usually two or three causes explain most of it. Say 70% come from our own VPN concentrators and cloud
proxy, whose egress is in another city or country; 20% from mobile carriers whose IP geolocation is
wrong; and the rest are spread out.

Then I tune narrowly. Our own egress ranges are not 'travel', so the rule should know them — a
maintained list of company egress IPs, owned by the network team. For mobile networks, I would raise
the bar rather than exclude: require a second signal, such as a new device or a sign-in without MFA.

Before shipping, I test on the same labelled weeks: alerts per day, how many real incidents it still
catches — recall on our past takeover cases — and what it now misses. If recall holds and alerts drop
from 200 to, say, 15, it goes to Git with the change reason, an owner and a review date.

Finally, I keep severity separate from noise: a sign-in from a new country to a finance user's account
with a new device can still be P1, while the rest feed a risk score."

**Why it scores:** it measures before changing, finds causes rather than guessing, tunes with fields the
attacker does not control, and proves the change kept recall.`,
    mcqs: [
      mcq('A rule for event 4728 never fires, although the domain controller logs are in the SIEM and groups were changed this week. What is the most likely cause?', [
        ['The domain controller has stopped writing 4728 events to its log', false],
        ['Kerberos tickets hide group changes until the next replication', false],
        ['The SIEM needs a restart before any newly written rule can run', false],
        ['The field name or type the rule uses differs from the parser’s output', true],
      ], 'When data is present but a rule never matches, the rule is usually looking at a field name, value case or type (a string "4728" versus a number) that the parser does not produce. Logging still works, replication does not hide events, and rules do not need restarts.'),
      mcq('An encoded-PowerShell rule fires when the IT team’s approved backup job runs, exactly as the rule intends. How should the analyst close it?', [
        ['False positive, and the rule logic should be rewritten', false],
        ['True positive, escalated to L2 as a possible compromise', false],
        ['Benign true positive, with a narrow exclusion and owner', true],
        ['Duplicate, since the same job ran the night before too', false],
      ], 'The rule detected the behaviour it was written for, and the behaviour was authorised: a benign true positive. The fix is a narrow exclusion on fields such as parent path and account, with an owner and review date. It is not a logic error and not malicious.'),
      mcq('After tuning, a rule raises 4 alerts, all real, but labelled test data shows it now misses 2 of 6 known-bad cases. How should the result be reported?', [
        ['Precision 1.0, recall 0.67: tuning lost a third of real cases', true],
        ['Precision 0.67, recall 1.0: one in three alerts is still noise', false],
        ['Precision 1.0, recall 1.0: every alert raised was a real case', false],
        ['Precision 0.5, recall 0.5: half the cases were handled wrongly', false],
      ], 'Precision is TP ÷ alerts = 4 ÷ 4 = 1.0. Recall is TP ÷ real cases = 4 ÷ 6 ≈ 0.67. Reporting precision alone would hide that the tuning made the rule blind to a third of the bad activity.'),
    ],
    checkpoint: [
      ck('SIEM_MONITORING', 'A proxy request appears five and a half hours before the DNS lookup that must have come just before it. What is the likely cause?', [
        ['The DNS server is caching answers for five and a half hours', false],
        ['The proxy logs were stored as UTC although they were in IST', true],
        ['The user’s laptop clock had drifted by several hours that day', false],
        ['The SIEM reorders events by size before it indexes them', false],
      ], 'IST is UTC+5:30. A source logging local time without a zone, ingested as UTC, shifts every event by exactly that amount. DNS caching changes whether a lookup happens, not its timestamp; laptop drift would be rarer and irregular.'),
      ck('SIEM_MONITORING', 'To reduce alerts from the backup agent, which exclusion is the safest to add to an encoded-PowerShell rule?', [
        ['Any command line that contains the word “backup” anywhere in it', false],
        ['Every event where the user is the backup service account at all', false],
        ['The backup agent’s full parent path combined with its account', true],
        ['Every event from the backup server, regardless of the process', false],
      ], 'A narrow exclusion combines fields an attacker cannot easily choose. Anyone can add a word to a command line; excluding the whole account or server hides a stolen credential or a compromise of that host.'),
      ck('SIEM_MONITORING', 'A manager says: “We match every hash in three threat feeds, so we are well covered.” What is the best reply?', [
        ['Agree, since hashes are exact and so produce no false positives', false],
        ['Agree, provided the feeds are updated at least once every hour', false],
        ['Disagree, because threat feeds are illegal to use in India', false],
        ['Hashes change with one byte; add behaviour-based detections', true],
      ], 'Hashes sit at the bottom of the pyramid of pain: trivially changed, so they catch only known, unchanged files. Feeds are useful but are not coverage; detections should target behaviours. Update frequency does not fix the problem, and feeds are legal.'),
    ],
  },

  /* ── IV_INCIDENT ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_IV_INCIDENT',
    notes: `Incident response questions show the panel how you will behave at 2 a.m. on a night shift, when
something real is happening and the decisions have a cost. You worked the lifecycle, scoped Kosha Pay's
account takeover with a timeline, preserved evidence, contained accounts in the right order, ran
playbooks and wrote the report in Incident Response. The panel listens for **order, evidence and
communication**, and for knowing which decisions are not yours.

## Q1. "When does an alert become an incident, and who decides?"

**Testing:** vocabulary and the weight of the decision.

**Model answer.** "An event is anything observable; an alert is an event a detection flagged; an
incident is a confirmed or strongly suspected breach of security policy that needs a coordinated
response — an account taken over, data leaving, systems encrypted. Declaring one is a decision with a
name and a time on it, because internal SLAs and regulatory reporting clocks start from when we noticed
and declared. As L1 I gather the evidence and recommend; the IR lead or the on-call L2 declares,
according to our plan."

**Follow-up:** "Why does the time matter so much?" Because reporting duties such as CERT-In's are
measured from when the incident was noticed, and the decision log must show it.

**Weak answer:** "When the alert is high severity."

## Q2. "Which phase of the incident response lifecycle decides most incidents?"

**Testing:** whether you know where incidents are really won.

**Model answer.** "Preparation. NIST's lifecycle has preparation, detection and analysis, containment
with eradication and recovery, and post-incident activity — SANS splits the middle into more steps,
same work. Almost every painful incident review finds the gap in preparation: logs never collected,
nobody knowing who may isolate a production server, backups never test-restored, no contact channel
outside corporate email. The IR plan, playbooks, tested backups and tabletop exercises are where the
response is won before it starts."

**Follow-up:** "What is a tabletop exercise?" The team talks through a scenario step by step to find
gaps in the plan on a quiet afternoon rather than during the incident.

**Weak answer:** "Containment, because that stops the attack."

## Q3. "A user entered their password on a phishing page an hour ago. What severity, and what next?"

**Testing:** severity from impact and scope, and re-assessment.

**Model answer.** "With credentials entered but no misuse seen yet, it is a medium — suspicious and
limited. I would not wait to act: I check the user's sign-ins since the click for new devices,
locations and MFA prompts, check the mailbox for new rules and forwarding, and recommend revoking
sessions and resetting the password as the playbook allows. I also search the mail logs for everyone
else who got the same email and who clicked. Severity is re-assessed as we learn — if the account was
used to change a payment or read sensitive mail, it becomes high and the IR lead is paged."

**Follow-up:** "The user is the CFO." Same method, higher impact: priority rises, and communication
goes through a channel the attacker cannot read.

**Weak answer:** "Low, because nothing has happened yet."

## Q4. "How do you scope an incident starting from one phishing email?"

**Testing:** pivoting from indicators to every affected asset.

**Model answer.** "I pull the indicators from the email: sender, subject, URLs and their domains,
attachment hashes. I pivot on each: mail logs for every recipient, proxy and DNS logs for everyone who
visited the domain, EDR for every host that ran the attachment, sign-in logs for accounts used from the
attacker's IPs. Every hit becomes a row in a timeline in UTC — who, what, when, which source — and each
new indicator found goes back into the search. Scoping is done when new searches stop finding new
users, hosts or accounts."

**Follow-up:** "What is the most common miss?" The second account — another user who entered their
password and has not been reported.

**Weak answer:** "Block the sender and delete the email."

## Q5. "The system owner wants to reimage the infected laptop right now. What do you say?"

**Testing:** evidence before destruction, and diplomacy.

**Model answer.** "I agree it should be rebuilt — not cleaned by hand — but first we isolate it through
the EDR, which stops the harm without losing anything, and collect evidence in order of volatility:
memory and running state first if the plan calls for it, then disk artefacts and logs. Each item is
hashed and logged with who collected it, when and how — that is chain of custody, so the evidence holds
up if there is legal action or an insurance claim. Collecting takes an hour or two; once it is done
we reimage from a known-good build. Reimaging first would destroy the only record of what happened on
that machine."

**Follow-up:** "Why hash evidence?" To prove later that what you analysed is exactly what you
collected.

**Weak answer:** "Fine, reimage it; that removes the malware."

## Q6. "How do you contain a taken-over cloud email account, step by step?"

**Testing:** knowing that a password reset is not containment.

**Model answer.** "Order matters. First revoke all sessions and refresh tokens, because existing
sessions survive a password change. Then reset the password through a verified channel. Then review
MFA methods and remove any the user does not recognise. Then remove what the attacker left in the
account: inbox rules, forwarding, delegated access, consented OAuth apps, app passwords. Then check what
the account did while taken over and undo it — a changed beneficiary, sent emails. And I contact the
user by phone, not by the mailbox the attacker may be reading."

**Follow-up:** "Do you contain immediately or watch the attacker?" If money or data is leaving now,
contain immediately and keep scoping. For a careful intruder with many footholds, the IR lead may choose
to scope fully and contain everything together; my job is to say what is still unscoped.

**Weak answer:** "Reset the password."

## Q7. "What must be true of a backup before you restore from it after ransomware?"

**Testing:** recovery that does not bring the attacker back.

**Model answer.** "It must be from before the compromise, not just before the encryption — intruders
often sit in a network for days first. It must be free of whatever they left, so I restore data, not
whole machines, onto systems rebuilt from known-good images. It must be intact: backups kept offline or
immutable survive when the attacker tries to delete them. And the restore must have been tested before,
so we know it takes hours, not days. Restoring goes in the priority order agreed in preparation, and the
system owner validates the data before users return."

**Follow-up:** "How do you know when the compromise began?" From the timeline: the earliest attacker
activity found during scoping, not the time of the ransom note.

**Weak answer:** "The latest backup."

## Q8. "What are an Indian organisation's reporting duties after a cyber incident?"

**Testing:** awareness at the level an analyst needs, without pretending to be a lawyer.

**Model answer.** "In outline: CERT-In's 2022 directions require organisations to report specified
incidents — a broad list including compromise of systems and accounts, ransomware and data breaches —
within six hours of noticing them, and to keep ICT system logs for 180 days. If personal data is
involved, the DPDP Act requires the data fiduciary to notify the Data Protection Board and affected
people in the manner its Rules set out. Banks have their own reporting to RBI. As an analyst I record
when the incident was noticed and declared, keep the evidence that answers those questions, and never
send notices myself — legal and the named owner do. I would always check the current text."

**Follow-up:** "Why does the analyst's timestamp matter here?" The reporting clock runs from when it was
noticed; a vague ticket makes the organisation's compliance unprovable.

**Weak answer:** "We report it to the police."

## Q9. "What happens after the incident is closed?"

**Testing:** learning, not blame.

**Model answer.** "The incident report — facts, timeline, impact, actions, notifications — and a
blameless post-incident review within a week or two. We ask what happened, what went well, where we
were slow or surprised, and what would have detected it sooner. The language is about conditions —
'the finance group was excluded from MFA' — not names. Each action gets one owner and a date. And at
least one action is usually a new or improved detection, tested against the incident's own logs, plus a
watch list for the attacker's indicators for a month or more."

**Follow-up:** "The attacker comes back two weeks later." Reopen the same incident — scoping missed
something.

**Weak answer:** "We close the ticket and move on."

## How you are judged

Strong answers follow an order (confirm, scope, contain, eradicate, recover, learn), protect evidence,
know who decides, and communicate on safe channels. Weak answers jump to one action — reset, reimage,
block — and stop.`,
    workedExample: `**Question: "At 11 p.m. on your shift, EDR flags a process on a file server reading the
memory of lsass.exe. Walk me through the next hour."**

**A weak answer (heard often):**

"I would kill the process, delete the file and run a full scan. Then I would close the alert if the
scan is clean."

What the panel hears: evidence destroyed, a server changed without authority, and an incident closed on
the word of a scan. Reading lsass memory is how credentials are taken; the real question is whose.

**A strong answer:**

"Minute 0–10: confirm. I open the raw EDR event: which process, its parent, its command line, its hash,
the user it ran as and how it started. Some legitimate tools touch lsass, so I check whether it is a
known security or backup product. If it is an unsigned tool started from a temp folder by an admin
account over a remote session, I treat it as credential theft.

Minute 10–20: escalate early. I call the on-call L2 or IR lead per the playbook and open the incident
record with the time I noticed it. File servers are shared, so isolating one is not my call alone.

Minute 20–40: scope. Credentials in that server's memory belong to everyone who logged on to it, so I
list recent logons — 4624 types 3 and 10 — especially privileged accounts. I check where the admin
account that started the tool logged on from, and whether those credentials are now being used
elsewhere: new logons from the file server to other servers, especially domain controllers.

Minute 40–60: contain on the IR lead's decision. Likely steps: isolate the server through EDR, keeping
it powered on so memory can be collected; reset or disable the exposed privileged accounts in the right
order; and add a watch on those accounts. I write down every action and its time.

Throughout, I keep a timeline in UTC, and I do not delete the tool — it is evidence."

**Why it scores:** it confirms before acting, escalates quickly, understands why lsass matters (every
logged-on credential is exposed), scopes by where those credentials could be used, and respects who
decides containment.`,
    mcqs: [
      mcq('A phished user entered credentials; the team reset the password, but the attacker still reads her mail an hour later. What was most likely skipped?', [
        ['A full antivirus scan of the user’s laptop before the reset', false],
        ['Blocking the phishing domain at the proxy and mail gateway', false],
        ['Revoking sessions and refresh tokens before the reset', true],
        ['Sending the user an email to explain what had happened', false],
      ], 'Existing sessions and refresh tokens can survive a password change, so they are revoked first. The laptop scan and domain block do not end a session the attacker already holds, and email to a compromised mailbox warns the attacker.'),
      mcq('A system owner asks to reimage a laptop with confirmed malicious activity immediately. What is the right first response?', [
        ['Isolate it via EDR and collect evidence, then reimage it', true],
        ['Reimage at once, since a clean build ends the incident', false],
        ['Clean it by hand so the user loses no data or settings', false],
        ['Power it off at once so the malware cannot spread further', false],
      ], 'Isolation stops the harm while keeping the machine’s state; evidence is collected in order of volatility, then the laptop is rebuilt. Reimaging first destroys evidence, hand-cleaning misses things, and powering off loses memory.'),
      mcq('During ransomware recovery, scoping shows the first attacker activity nine days before encryption. Which backup is the safe starting point?', [
        ['The newest backup, taken the night before encryption began', false],
        ['Any backup taken in the week before the ransom note arrived', false],
        ['The backup the vendor recommends, whatever its date may be', false],
        ['One from before day nine, restored as data onto rebuilt systems', true],
      ], 'Backups taken after the intruder arrived may contain their persistence. Recovery starts from before the earliest attacker activity and restores data onto systems rebuilt from known-good images. "Newest" and "last week" both fall inside the compromise.'),
    ],
    checkpoint: [
      ck('INCIDENT_RESPONSE', 'Scoping a phishing incident, the analyst has searched mail logs for recipients. Which search most often finds the account that is still missed?', [
        ['Proxy and DNS logs for everyone who visited the phishing domain', true],
        ['The firewall’s inbound denies for the sender’s mail server IP', false],
        ['Antivirus logs from the mail server during the delivery window', false],
        ['The HR system for staff who joined during the past month', false],
      ], 'Recipients are not the same as victims. Users who visited the phishing page — found in proxy and DNS logs — may have entered credentials without reporting it. Inbound denies, mail-server antivirus and HR data do not show who visited.'),
      ck('INCIDENT_RESPONSE', 'Why does an analyst record the exact time an incident was noticed in the record?', [
        ['Because the ticketing system cannot close an incident without one', false],
        ['Because SOC staff are paid by the hour for incident handling', false],
        ['Because reporting duties such as CERT-In’s run from that time', true],
        ['Because the attacker’s activity always starts at that moment', false],
      ], 'Regulatory reporting deadlines are measured from when the incident was noticed, so the record must prove that time. It is not a ticketing technicality, and the attacker’s activity usually began well before it was noticed.'),
      ck('INCIDENT_RESPONSE', 'An attacker the team removed returns two weeks later through another phished user. How should the SOC record it?', [
        ['As a new, unrelated incident with its own separate ticket', false],
        ['Reopen the incident: scoping or eradication missed something', true],
        ['As a false positive, because the earlier incident was closed', false],
        ['As a low-severity event, because the attacker is already known', false],
      ], 'A return within the watch period means the first response left a way back in, so the original incident is reopened and its scope revisited. Treating it as new hides the failure; it is neither a false positive nor low severity.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_RAPID_FIRE',
    notes: `A screening call for an L1 SOC analyst role at an MSSP or a bank: thirty questions in about twelve
minutes, one correct line each. Recruiters and first-round engineers use calls like this to filter a
long list of freshers. Cover the answer, say yours aloud, then check.

## Fundamentals

1. **CIA?** — Confidentiality, integrity, availability; ransomware hits availability.
2. **Threat vs vulnerability?** — A vulnerability is a weakness; a threat is who or what could exploit it.
3. **Risk?** — Likelihood × impact, for a specific asset.
4. **Authentication vs authorisation?** — Who you are vs what you may do.
5. **401 vs 403?** — Not authenticated vs authenticated but not allowed.
6. **Hashing vs encryption?** — One-way integrity check vs reversible with a key.

## Network

7. **Port 445?** — SMB.
8. **Port 3389?** — RDP.
9. **Port 88?** — Kerberos.
10. **When does DNS use TCP?** — Large responses and zone transfers.
11. **Zeek conn state S0?** — SYN seen, no reply.
12. **What can you see in TLS without decrypting?** — SNI, flow sizes and timing, client fingerprint.
13. **IDS vs IPS?** — Watches a copy and alerts vs sits inline and can block.
14. **Firewall default action?** — Deny.

## Windows, Linux and identity

15. **4625?** — Failed logon.
16. **Logon type 10?** — Remote desktop.
17. **1102?** — Security log cleared.
18. **4769?** — Kerberos service ticket requested.
19. **Sysmon event 10?** — One process opened another (watch lsass).
20. **SSH auth log on Ubuntu?** — /var/log/auth.log (RHEL: /var/log/secure).
21. **Strongest MFA?** — FIDO2 keys or passkeys; phishing-resistant.

## SIEM and detection

22. **Precision?** — TP ÷ (TP + FP): how many alerts were real.
23. **Recall?** — TP ÷ (TP + FN): how many real events were caught.
24. **Benign true positive?** — The rule worked; the activity was authorised.
25. **T1059.001?** — Command and Scripting Interpreter: PowerShell.
26. **Top of the pyramid of pain?** — TTPs, behaviour.

## Incident response

27. **NIST IR phases?** — Preparation; detection and analysis; containment, eradication and recovery; post-incident.
28. **First step for a taken-over account?** — Revoke sessions and tokens.
29. **Chain of custody?** — Who held the evidence, when, and what they did with it.
30. **CERT-In reporting window?** — Six hours from noticing (check the current directions).

## Two questions you may also get

- **"What does CompTIA Security+ prove?"** — A vendor-neutral baseline of security concepts; many MSSPs
  and service companies list it. **SC-200** proves Microsoft security-operations skills (Sentinel and
  Defender) and is asked for by SOCs built on Microsoft's stack. A certification gets you past a filter;
  the lab you can explain gets you the job.
- **"Are you comfortable with rotational shifts?"** — Answer honestly. Most L1 roles run 24×7 rotations
  with night shifts and on-call; say what you can commit to.

## Scoring

26+ correct and quick: strong. 20–25: revisit the sets your misses came from. Below 20, or "reset the
password" as account containment, or "encrypted traffic shows nothing": go back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: “Which Windows event ID means the Security log was cleared?”', [
        ['4624', false],
        ['1102', true],
        ['4740', false],
        ['7045', false],
      ], '1102 records the Security audit log being cleared, a common step to hide activity. 4624 is a successful logon, 4740 an account lockout, and 7045 a new service installed (in the System log).'),
      mcq('Rapid fire: “Which port does Kerberos use?”', [
        ['445', false],
        ['389', false],
        ['636', false],
        ['88', true],
      ], 'Kerberos uses port 88. 445 is SMB, 389 is LDAP and 636 is LDAP over TLS; all of them appear on a domain controller, which is why candidates mix them up.'),
      mcq('Rapid fire: “The rule caught 8 of 10 real attacks. What is that number?”', [
        ['Recall of 0.8', true],
        ['Precision of 0.8', false],
        ['Accuracy of 0.8', false],
        ['F1 score of 0.8', false],
      ], 'Caught real events ÷ all real events is recall (TP ÷ (TP + FN)) = 8 ÷ 10. Precision would need the number of alerts raised, including false ones.'),
      mcq('Rapid fire: “What does Zeek’s connection state S0 mean?”', [
        ['A normal connection, closed cleanly', false],
        ['A reset sent back by the target', false],
        ['A SYN seen, with no reply at all', true],
        ['A connection still open at the end', false],
      ], 'S0 is a connection attempt with no reply. A clean close is SF, a rejected attempt answered with RST is REJ. Many S0 to many hosts suggests scanning or a dead destination.'),
      mcq('Rapid fire: “Which MFA method resists phishing best?”', [
        ['SMS one-time codes', false],
        ['Authenticator app codes', false],
        ['Push approval prompts', false],
        ['FIDO2 keys or passkeys', true],
      ], 'FIDO2 keys and passkeys are bound to the real site’s domain, so a fake page gets nothing usable. SMS and app codes can be typed into a fake page, and push prompts can be approved by a tired user.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_MOCK',
    notes: `The interviewer's script for a 40-minute technical round for an L1 SOC analyst role at an MSSP in
Hyderabad or a bank's SOC in Chennai or Mumbai. Have a friend read the interviewer's lines, or record
yourself and score it against the notes below. The panel writes down the words in bold.

## Opening (3 min)

"Tell me about your home lab, in two minutes."

- **Strong:** what it runs (a SIEM such as Wazuh or Elastic, two or three log sources, Sysmon on a
  Windows VM), **one detection you wrote, how you tested it**, one thing that went wrong and what you
  changed. Everything on systems you own.
- **Weak:** a list of tools and certifications with no decisions.

"This role is 24×7 with rotating night shifts. How does that work for you?" — **Strong:** an honest,
specific answer. Saying yes and resigning in three months is worse for both sides than a clear "I can do
nights but not on-call during exams until May".

## Q1 — Fundamentals (5 min)

"Our net-banking customers get SMS messages linking to a fake login page. Which part of CIA is at risk,
and what can the SOC do?"

- **Strong:** confidentiality first, **integrity when stolen credentials are used** to change
  beneficiaries; takedown through the owner; **sign-in logs** for new devices and quick
  beneficiary-then-transfer patterns; stronger customer authentication; a **lookalike-domain** detection.
- **Weak:** "Tell customers not to click links."

Follow-up: "Is a WAF a fix here?" — No. The fake site is not ours; the WAF never sees it.

## Q2 — Network log (7 min)

The interviewer reads: "Firewall allows, last hour: 10.20.4.33 to 10.20.4.0/24 on tcp/445, 61
destinations; 10.20.4.33 to 10.20.3.5 tcp/5432, allowed."

- **Strong:** a **user laptop talking SMB to 61 peers** is unusual — discovery or lateral movement;
  check the EDR for the process. The second line is a **segmentation failure**: users should not reach
  the database zone. **Two findings: one possible incident, one control gap.**
- **OK:** spots the SMB fan-out only.
- **Weak:** "Block 10.20.4.33."

Follow-up: "It turns out to be the IT asset-inventory agent." — Benign for the first line; ask for its
hosts to be documented so the next analyst does not repeat this. The database rule is still wrong.

## Q3 — Windows and identity (8 min)

"On a domain controller: 380 accounts each have two 4771 events with code 0x18 from 10.20.4.33 in an
hour, then one 4768 — a ticket-granting ticket issued — for the account priya.s from the same IP."

- **Strong:** **password spraying**, kept under lockout; the **4768 after it is the event that matters**
  — the password was guessed and priya.s is probably compromised; check what the account did next
  (4769 service tickets, 4624 logons on member servers, group changes); recommend containing the account in order — **revoke sessions, reset,
  review MFA**; and look at what is running on 10.20.4.33, now twice suspicious.
- **Weak:** "Lock all 380 accounts."

Follow-up: "Why was there no lockout?" — Two attempts per account is below the threshold; that is why
spraying works and why **MFA and banned-password lists** matter more than lockout.

## Q4 — SIEM and triage (10 min)

"An alert: 'Office application spawned PowerShell with an encoded command', on a branch cashier's PC,
medium severity. Triage it aloud, then tell me the detection behind it."

- **Strong:** acknowledge; **read the rule and the raw event** (parent, command line, user); **decode
  the command as text, never run it**; enrich (user role, asset criticality, destination reputation);
  look an hour either side on the host; decide; **escalation note with facts, searches and time
  ranges, assessment kept apart, and what was not done**. Maps it to **T1566 then T1059.001**. Can
  sketch the rule: parent image in the Office set, child powershell.exe, command line with the encoded
  flag.
- **OK:** good triage, cannot sketch the rule.
- **Weak:** "Check the IP on a reputation site and close it if clean."

Follow-up: "The rule fires 300 times a day from a finance macro." — Find the cause, **narrow exclusion
on parent path and account with an owner**, measure **recall as well as precision** before and after.

## Q5 — Incident (5 min)

"L2 confirms the cashier PC is compromised. The branch manager wants it reimaged now so the branch can
open at 10."

- **Strong:** **isolate through EDR first**, collect evidence in order of volatility with **hashes and
  chain of custody**, give the branch a spare machine, then **reimage from a known-good build**; scope
  for other branch PCs that got the same document; record times for the report.
- **Weak:** "Reimage it, the branch must open."

## Close (2 min)

"What would you improve in your lab?" — **Strong:** one specific gap and how they would measure the fix.

## Scoring rubric

| Area | Strong (3) | OK (2) | Weak (1) |
|---|---|---|---|
| Fundamentals | Harm mapped, SOC-side actions | Theory only | Slogans |
| Network | Possible incident and control gap | One finding | Block the IP |
| Identity | Spraying, the success, ordered containment | Spots spraying | Mass lockout |
| SIEM and triage | Method, safe decoding, note, rule | Method only | Reputation check |
| Incident | Isolate, evidence, then rebuild | Rebuild with hesitation | Reimage now |

Hire bar for L1: 11 or more out of 15, with no 1 in SIEM and triage or incident. One unsafe instinct —
running a suspicious command "to see what it does", or uploading a company file to a public sandbox —
costs more than an honest "I have not done that, but I would ask L2".`,
    mcqs: [
      mcq('In the mock’s Q2, the SMB fan-out turns out to be the IT inventory agent. What remains a finding?', [
        ['Nothing, since the traffic that triggered the question was benign', false],
        ['The user subnet’s allowed access to the database on port 5432', true],
        ['The inventory agent itself, which must be removed from the network', false],
        ['The firewall’s logging, which should stop recording allowed traffic', false],
      ], 'The second line shows users reaching the data zone, a segmentation failure regardless of the first line’s explanation. The agent is legitimate, and allowed-traffic logs are what revealed the gap.'),
      mcq('In the mock’s Q3, why is the single 4768 for priya.s more important than the 380 failures before it?', [
        ['A ticket issued to the spraying source means a guess worked', true],
        ['4768 events are rarer than 4771 events on every domain controller', false],
        ['The 4771 failures show only that Kerberos clocks were out of sync', false],
        ['Only 4768 events are forwarded to the SIEM by default, so it counts', false],
      ], 'Failures show an attempt; a ticket-granting ticket issued to the same source shows an account the attacker now controls. Logons are not rare, code 0x18 means a wrong password rather than clock skew, and 4771 events are collected too.'),
      mcq('In the mock’s Q4, what does a strong candidate do with the encoded PowerShell command?', [
        ['Run it in a test VM on the office network to observe its effects', false],
        ['Upload it to a public sandbox to see whether others have seen it', false],
        ['Ignore the content, since the parent process is enough to decide', false],
        ['Decode it as text to read it, never executing it anywhere', true],
      ], 'Decoding the base64 UTF-16LE text shows what the command would do with no risk. Running it, even in a test VM on the network, is unsafe; a public upload can leak data and warn the attacker; ignoring the content discards the best evidence.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_IV_SOC_CHECKPOINT',
    notes: `Ten questions across the SOC analyst interview sets: fundamentals, network, Windows, Linux and
identity, SIEM and detection, and incident response. Each is asked the way a panel asks it. Read the
log detail in the question before you choose.`,
    checkpoint: [
      ck('SECURITY_FUNDAMENTALS', 'Ransomware encrypts a hospital’s patient system and the attackers also post a sample of records online. Which properties failed?', [
        ['Availability and confidentiality, as data was locked and leaked', true],
        ['Integrity only, because the files were changed by encryption', false],
        ['Confidentiality only, because the records were published online', false],
        ['Availability only, because the published sample is too small', false],
      ], 'Encryption stopped clinicians using the system (availability) and the leak exposed records (confidentiality). Encryption does change files, but the harm is loss of access; the size of the leak does not change which property failed.'),
      ck('SECURITY_FUNDAMENTALS', 'A company can add one new control this year. Stolen passwords caused most of its past incidents. Which is the best choice?', [
        ['A next-generation firewall at the internet edge', false],
        ['Longer password expiry periods for all staff', false],
        ['MFA on email, VPN and other remote access', true],
        ['A quarterly vulnerability scan of all servers', false],
      ], 'MFA directly limits what a stolen password can do, the main cause here. A firewall and scans address other risks, and password expiry does little against stolen credentials that are used at once.'),
      ck('NETWORK_SECURITY', 'Zeek shows a workstation making SMB connections on port 445 to 60 other workstations in ten minutes. What is the best first step?', [
        ['Block port 445 across the whole network straight away', false],
        ['Find the process making the connections on that host', true],
        ['Close it as normal, since Windows machines use SMB', false],
        ['Run a full packet capture of every host for a week', false],
      ], 'Workstations rarely talk to each other over SMB, so the fan-out needs explaining; the endpoint data shows which process did it (an inventory agent or something worse). A network-wide block breaks file shares, and a week of full capture is neither proportionate nor quick.'),
      ck('NETWORK_SECURITY', 'Which change most limits how far an infected user laptop can reach inside a flat office network?', [
        ['Moving the website to HTTPS with a new certificate', false],
        ['A stronger Wi-Fi password for the office network', false],
        ['Logging every DNS query from the user laptops', false],
        ['Zones with default deny and RDP only from management', true],
      ], 'Segmentation with default deny between zones, and admin protocols only from a management zone, limits lateral movement. HTTPS and Wi-Fi passwords do not restrict internal reach; DNS logging helps detection but blocks nothing.'),
      ck('IAM_FUNDAMENTALS', 'On a domain controller, one user requests service tickets for 40 service accounts in two minutes, all with RC4 encryption. What control reduces the risk?', [
        ['Long random or managed service-account passwords, and no RC4', true],
        ['A shorter Kerberos ticket lifetime for all of the user accounts', false],
        ['Moving every service account into the Domain Admins group', false],
        ['Disabling event 4769 auditing, to cut noise on the controller', false],
      ], 'This is the 4769 pattern defenders watch for Kerberoasting, which targets service-account passwords. Long random or group-managed passwords and disabling RC4 make the tickets useless to crack. Ticket lifetime does not help, more privilege makes it worse, and removing auditing makes you blind.'),
      ck('IAM_FUNDAMENTALS', 'A Linux server’s auth log shows hundreds of “Invalid user” lines from one IP, then “Accepted password for deploy” from the same IP. What does this mean?', [
        ['Normal background noise, since every internet server sees it', false],
        ['A broken key setup, since the deploy user should use a key', false],
        ['Probable compromise of deploy; passwords should not be accepted', true],
        ['A monitoring check, because it ends with a success message', false],
      ], 'Guessing followed by a successful password login from the same source means the account is probably compromised, and that SSH still accepts passwords. The guessing alone is common noise; the success is the event that matters.'),
      ck('SIEM_MONITORING', 'An analyst gets an alert from a rule they have never seen. What should come before deciding true or false positive?', [
        ['Checking only whether the source IP has a bad reputation', false],
        ['Reading the rule and raw event, enriching, looking around', true],
        ['Escalating immediately, since unfamiliar rules are risky', false],
        ['Closing it if no other alert fired on the same host today', false],
      ], 'Triage starts with what the rule detects and the raw event behind the alert, then enrichment (user, asset, destination, history) and other activity around it. Reputation alone is one data point; blind escalation and closing on silence both skip the work.'),
      ck('SIEM_MONITORING', 'A detection for Word spawning encoded PowerShell is mapped to ATT&CK. Which mapping is right?', [
        ['Tactic Persistence; technique Valid Accounts (T1078)', false],
        ['Tactic Discovery; technique Network Scanning (T1046)', false],
        ['Tactic Impact; technique Data Encrypted for Impact (T1486)', false],
        ['Tactic Execution; sub-technique PowerShell (T1059.001)', true],
      ], 'Running PowerShell from a document is Execution through Command and Scripting Interpreter: PowerShell, T1059.001, usually after phishing (T1566). The other mappings describe different behaviours.'),
      ck('INCIDENT_RESPONSE', 'Which step order is right for a taken-over cloud mailbox?', [
        ['Reset password, email the user, then remove inbox rules', false],
        ['Revoke sessions, reset password, check MFA, remove rules', true],
        ['Delete the mailbox, restore it from backup, reset password', false],
        ['Remove inbox rules, wait a day, then reset the password', false],
      ], 'Sessions and tokens survive a reset, so they go first; then the password, then MFA methods, then the persistence in the account. Emailing a compromised mailbox warns the attacker, deleting it destroys evidence, and waiting leaves the attacker in.'),
      ck('INCIDENT_RESPONSE', 'Evidence from a server was copied to a drive and hashed. Why is the hash recorded in the chain-of-custody log?', [
        ['To compress the evidence so it fits on the storage drive', false],
        ['To encrypt the evidence so nobody else can read it later', false],
        ['To prove later the analysed copy is identical to the original', true],
        ['To identify which malware family is present in the evidence', false],
      ], 'Matching hashes show the evidence has not changed since collection, which is what makes it trustworthy in a report or in court. Hashing neither compresses nor encrypts, and an evidence-image hash says nothing about malware families.'),
    ],
  },
];
