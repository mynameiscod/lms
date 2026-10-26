import { TopicSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';
import { ending } from './trackUnitsWeb';

/**
 * Career-track content for Cybersecurity Analyst — a DEFENSIVE track for SOC and blue-team roles, taught
 * on free, open-source tools a student can run at home (Wireshark, Suricata, Zeek, Wazuh / Elastic, Sigma,
 * Python). The track stands on the years' networking, operating systems, Linux and shell lessons and on
 * their security fundamentals, threat modelling, web security and authentication (packs
 * SEC_SYSTEMS_BASICS, SEC_FOUNDATIONS_CY, WEB_APPSEC_CY); these topics add what an analyst does at work.
 *
 * Everything is taught from the defender's side, on systems the student owns or is authorised to work
 * on. Skills are the SECURITY domain of the role catalogue (aiDataSecuritySkills.ts).
 */

/** Batch CY1: networks, endpoints and identity, and cryptography — seen by a defender. */
export const TRACK_CY_FOUNDATIONS: Record<string, TopicSeed> = {
  /* ── Network security ── */
  CY_NETWORK_SECURITY: { category: 'UNIVERSAL', units: [
    u('PACKET_ANALYSIS', 'Reading Network Traffic: Captures and Wireshark', 'Capturing on your own machine, display filters, following a TCP stream, and spotting what is normal and what is not in a capture.',
      ['Read a packet capture and explain what each conversation in it was doing'], 45),
    u('PROTOCOLS_FOR_DEFENDERS', 'DNS, HTTP and TLS Through a Defender\'s Eyes', 'What normal DNS, HTTP and TLS look like on the wire and in logs, and the patterns that make an analyst look closer.',
      ['Tell normal DNS, HTTP and TLS traffic from suspicious traffic in captures and logs'], 40, { after: ['PACKET_ANALYSIS'] }),
    u('FIREWALLS_SEGMENTATION', 'Firewalls, Segmentation and Least-Privilege Networks', 'Stateful firewalls, rules and their order, network zones and segmentation, and reading firewall logs.',
      ['Design firewall rules and segmentation for a small network and read the logs they produce'], 40, { after: ['PROTOCOLS_FOR_DEFENDERS'] }),
    u('IDS_SURICATA_ZEEK', 'Network Detection with Suricata and Zeek', 'Signature-based detection with Suricata, Zeek\'s connection and protocol logs, and what each sees and misses.',
      ['Run Suricata and Zeek over traffic and act on what they report'], 45, { after: ['FIREWALLS_SEGMENTATION'] }),
    u('ZERO_TRUST_REMOTE', 'VPNs, Remote Access and Zero Trust', 'VPNs and their limits, remote-access risks, and zero-trust principles: verify every request, least privilege, assume breach.',
      ['Explain how zero-trust access differs from a VPN and where each fits'], 35, { after: ['IDS_SURICATA_ZEEK'] }),
    ...ending('Network Security', 'ZERO_TRUST_REMOTE', { project: ['MINI_PROJECT', 'Mini Project — Investigating a Capture from a Suspected Incident',
      'Given packet captures and Zeek logs from a small office network, reconstruct what happened, separate noise from evidence, and write a short findings note with the indicators a SOC should watch for.'] }),
  ] },

  /* ── Endpoints and identity ── */
  CY_ENDPOINT_IDENTITY: { category: 'UNIVERSAL', units: [
    u('WINDOWS_FOR_DEFENDERS', 'Windows for Defenders: Event Logs and Sysmon', 'The Windows logs an analyst reads (security, system, PowerShell), the event IDs that matter, and what Sysmon adds.',
      ['Read Windows event and Sysmon logs to reconstruct what happened on a machine'], 45),
    u('ACTIVE_DIRECTORY', 'Active Directory Basics for Analysts', 'Domains, users, groups and Group Policy, how Kerberos and NTLM authentication look in logs, and the misconfigurations defenders fix first.',
      ['Explain how Active Directory authentication works and spot risky configuration in it'], 45, { after: ['WINDOWS_FOR_DEFENDERS'] }),
    u('LINUX_HARDENING_LOGS', 'Hardening and Monitoring Linux Servers', 'SSH hardening, users and sudo, auditd and journald, and the log lines that show a server being misused.',
      ['Harden a Linux server and monitor its logs for misuse'], 40, { after: ['ACTIVE_DIRECTORY'] }),
    u('IAM_MFA', 'Identity and Access Management', 'Identity lifecycle (joiners, movers, leavers), MFA and its weaker forms, privileged access, and least privilege in practice.',
      ['Design identity controls for an organisation and review access for least privilege'], 40, { after: ['LINUX_HARDENING_LOGS'] }),
    u('ENDPOINT_PROTECTION', 'Endpoint Protection and EDR', 'Antivirus versus EDR, what an endpoint agent records, isolating a machine, and the alerts an analyst gets from it.',
      ['Explain what EDR records and how an analyst uses it during an alert'], 35, { after: ['IAM_MFA'] }),
    ...ending('Endpoint and Identity Security', 'ENDPOINT_PROTECTION', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Cryptography for defenders ── */
  CY_CRYPTO_PKI: { category: 'UNIVERSAL', units: [
    u('CRYPTO_PRIMITIVES', 'The Building Blocks: Hashing, Symmetric and Asymmetric Encryption', 'What each primitive guarantees and does not, where each is used, and the names an analyst meets in configurations.',
      ['Choose the right cryptographic primitive for a need and explain what it guarantees'], 40),
    u('PASSWORDS_HASHING', 'Storing Passwords Properly', 'Why fast hashes are wrong for passwords, salts, bcrypt, scrypt and Argon2, and checking a system\'s password storage.',
      ['Assess and fix how a system stores passwords'], 35, { after: ['CRYPTO_PRIMITIVES'] }),
    u('TLS_PKI', 'TLS, Certificates and PKI', 'How a TLS handshake establishes trust, certificate chains and authorities, expiry and revocation, and reading a certificate.',
      ['Inspect a site\'s TLS setup and certificate chain and find what is wrong with it'], 45, { after: ['PASSWORDS_HASHING'] }),
    u('KEY_MANAGEMENT', 'Keys and Secrets Management', 'Where keys and secrets live, rotation, key management services and vaults, and finding secrets leaked into code or logs.',
      ['Manage keys and secrets safely and detect ones that have leaked'], 35, { after: ['TLS_PKI'] }),
    u('CRYPTO_MISTAKES', 'Common Cryptography Mistakes', 'Home-made crypto, weak or outdated algorithms, reused nonces, missing integrity checks, and how to spot them in a review.',
      ['Spot common cryptographic mistakes in configurations and code'], 35, { after: ['KEY_MANAGEMENT'] }),
    ...ending('Cryptography', 'CRYPTO_MISTAKES', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch CY2: security operations — monitoring and detection, incident response, threat intelligence and hunting. */
export const TRACK_CY_SOC: Record<string, TopicSeed> = {
  /* ── SIEM and detection engineering ── */
  CY_SIEM_DETECTION: { category: 'UNIVERSAL', units: [
    u('LOG_PIPELINE', 'Logs: Sources, Collection and Normalisation', 'Which logs matter (endpoint, identity, network, cloud, application), shipping them, parsing, a common schema, time zones and retention.',
      ['Plan which logs a SOC collects and normalise them so they can be searched together'], 40),
    u('SIEM_PLATFORM', 'A SIEM with Wazuh and Elastic', 'How a SIEM is built, Wazuh agents and rules, searching in Elastic (KQL), and the same searches in Splunk\'s SPL for comparison.',
      ['Search and correlate events in an open-source SIEM and translate the searches to SPL'], 45, { after: ['LOG_PIPELINE'] }),
    u('DETECTION_ENGINEERING', 'Detection Engineering with Sigma', 'Writing detections as Sigma rules, mapping them to MITRE ATT&CK, testing them against sample logs, and keeping them in Git.',
      ['Write, test and version a detection rule mapped to an ATT&CK technique'], 45, { after: ['SIEM_PLATFORM'] }),
    u('TUNING', 'Tuning Detections and Fighting Alert Fatigue', 'True and false positives, baselining normal, allow-lists done safely, and measuring a rule\'s precision before and after tuning.',
      ['Tune a noisy detection and prove with numbers that it got better without going blind'], 40, { after: ['DETECTION_ENGINEERING'] }),
    u('ALERT_TRIAGE', 'Alert Triage: the SOC L1 Workflow', 'Reading an alert, enrichment (IP, user, asset, reputation), deciding true or false positive, escalating with a clear note, and SLAs.',
      ['Triage an alert end to end and escalate it with a note an L2 analyst can act on'], 40, { after: ['TUNING'] }),
    u('SOC_METRICS', 'SOC Dashboards and Metrics', 'MTTD and MTTR, alert volumes and dispositions, detection coverage against ATT&CK, and dashboards that drive decisions.',
      ['Build SOC dashboards and metrics that show where detection and response are weak'], 35, { after: ['ALERT_TRIAGE'] }),
    ...ending('SIEM and Detection', 'SOC_METRICS', { project: ['MINI_PROJECT', 'Mini Project — Detections for a Small Bank\'s SOC',
      'Over a provided week of endpoint, identity and network logs from a small cooperative bank: normalise them, write and test five Sigma detections mapped to ATT&CK, tune them, triage what they find and build the SOC dashboard.'] }),
  ] },

  /* ── Incident response ── */
  CY_INCIDENT_RESPONSE: { category: 'UNIVERSAL', units: [
    u('IR_LIFECYCLE', 'The Incident Response Lifecycle', 'Preparation, detection and analysis, containment, eradication and recovery, and lessons learned — roles, severity levels and the IR plan.',
      ['Explain the incident response lifecycle and an analyst\'s part in each phase'], 40),
    u('TRIAGE_SCOPING', 'Triage and Scoping an Incident', 'Confirming an incident, building a timeline, finding every affected user, host and account, and deciding severity.',
      ['Scope an incident from the first alert to a timeline of every affected asset'], 45, { after: ['IR_LIFECYCLE'] }),
    u('EVIDENCE_FORENSICS', 'Evidence and Forensics Basics', 'Order of volatility, collecting evidence without destroying it, chain of custody, hashing evidence, and building a forensic timeline.',
      ['Collect and preserve evidence correctly and build a timeline from it'], 45, { after: ['TRIAGE_SCOPING'] }),
    u('CONTAINMENT_RECOVERY', 'Containment, Eradication and Recovery', 'Isolating hosts and accounts, resetting credentials, removing persistence, restoring from backups, and watching for a return.',
      ['Contain and recover from an incident without tipping off the attacker or losing evidence'], 40, { after: ['EVIDENCE_FORENSICS'] }),
    u('PLAYBOOKS', 'Playbooks: Phishing, Ransomware and Account Takeover', 'Step-by-step response playbooks for the incidents an Indian SOC sees most, and automating the repeatable steps.',
      ['Follow and improve response playbooks for common incident types'], 45, { after: ['CONTAINMENT_RECOVERY'] }),
    u('REPORTING_REVIEW', 'Reporting Incidents and Learning from Them', 'Writing the incident report, CERT-In reporting duties and data-breach duties under the DPDP Act in outline, and a blameless post-incident review.',
      ['Write an incident report and a post-incident review, and know the reporting duties that apply in India'], 40, { after: ['PLAYBOOKS'] }),
    ...ending('Incident Response', 'REPORTING_REVIEW', { project: ['MINI_PROJECT', 'Mini Project — A Tabletop Exercise and Incident Report',
      'Run a tabletop exercise on a provided phishing-to-account-takeover scenario for a fintech company: triage, scope with the logs given, decide containment, collect evidence, and write the incident report and the post-incident review.'] }),
  ] },

  /* ── Threat intelligence and hunting ── */
  CY_THREAT_INTEL: { category: 'UNIVERSAL', units: [
    u('CTI_BASICS', 'Threat Intelligence for Analysts', 'Indicators versus behaviours, the pyramid of pain, intelligence sources and feeds, and turning intelligence into a detection or a block.',
      ['Use threat intelligence to improve detections rather than only to block indicators'], 40),
    u('ATTACK_FRAMEWORK', 'MITRE ATT&CK in Daily SOC Work', 'Tactics, techniques and sub-techniques, mapping alerts and detections to ATT&CK, and finding gaps in coverage.',
      ['Map alerts and detections to ATT&CK and identify the gaps in a SOC\'s coverage'], 40, { after: ['CTI_BASICS'] }),
    u('THREAT_HUNTING', 'Hypothesis-Driven Threat Hunting', 'Forming a hunting hypothesis from intelligence, searching the logs for it, recording what you found or did not, and turning a hunt into a detection.',
      ['Run a hypothesis-driven hunt over logs and turn what it finds into a detection'], 45, { after: ['ATTACK_FRAMEWORK'] }),
    ...ending('Threat Intelligence and Hunting', 'THREAT_HUNTING', { minutes: [40, 50, 35, 40] }),
  ] },
};

/** Batch CY3: vulnerability management, cloud security, governance and compliance, and the SOC capstone. */
export const TRACK_CY_DEFEND: Record<string, TopicSeed> = {
  /* ── Vulnerability management ── */
  CY_VULN_MGMT: { category: 'UNIVERSAL', units: [
    u('VULN_LIFECYCLE', 'The Vulnerability Management Lifecycle', 'Asset inventory, discovery, assessment, prioritisation, remediation and verification — and why an unknown asset is the biggest risk.',
      ['Run the vulnerability management cycle for an organisation\'s assets'], 40),
    u('SCANNING', 'Vulnerability Scanning, Done Properly', 'Authenticated versus unauthenticated scans, scanners such as OpenVAS in outline, scanning only what you own and are allowed to, and reading a scan report.',
      ['Plan authorised scans and read a scan report without drowning in it'], 40, { after: ['VULN_LIFECYCLE'] }),
    u('PRIORITISATION', 'Prioritising with CVSS, EPSS and Known-Exploited Lists', 'What a CVSS score does and does not tell you, exploit likelihood, known-exploited vulnerability catalogues, and asset importance.',
      ['Prioritise vulnerabilities by real risk rather than by score alone'], 45, { after: ['SCANNING'] }),
    u('REMEDIATION', 'Patching, Compensating Controls and Verification', 'Patch windows and SLAs, when a patch cannot be applied, compensating controls, exceptions with an end date, and re-scanning to verify.',
      ['Drive remediation to closure and verify it, including when patching is not possible'], 40, { after: ['PRIORITISATION'] }),
    u('SOFTWARE_SUPPLY_CHAIN', 'Dependencies, SBOMs and Container Images', 'Vulnerable libraries, software bills of materials, scanning container images, and keeping dependencies current.',
      ['Find and manage vulnerable dependencies with SBOMs and image scanning'], 35, { after: ['REMEDIATION'] }),
    ...ending('Vulnerability Management', 'SOFTWARE_SUPPLY_CHAIN', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Cloud security ── */
  CY_CLOUD_SECURITY: { category: 'UNIVERSAL', units: [
    u('SHARED_RESPONSIBILITY', 'The Shared Responsibility Model', 'What the cloud provider secures and what you must, across IaaS, PaaS and SaaS, and where breaches really come from.',
      ['Say who is responsible for each control in a cloud deployment'], 35),
    u('CLOUD_IAM', 'Cloud Identity and Access', 'Users, roles and policies, least privilege, access keys versus roles, and reviewing who can do what.',
      ['Write and review least-privilege cloud access policies'], 45, { after: ['SHARED_RESPONSIBILITY'] }),
    u('CLOUD_NETWORK_STORAGE', 'Securing Cloud Networks and Storage', 'Virtual networks and security groups, private endpoints, public buckets and how they leak, and encryption at rest.',
      ['Lock down cloud networks and storage and find exposed resources'], 40, { after: ['CLOUD_IAM'] }),
    u('CLOUD_LOGGING', 'Cloud Logging and Detection', 'Audit logs (such as AWS CloudTrail), flow logs, sending them to the SIEM, and the cloud events worth an alert.',
      ['Collect cloud audit logs and detect risky cloud activity'], 40, { after: ['CLOUD_NETWORK_STORAGE'] }),
    u('POSTURE_CONTAINERS', 'Cloud Posture and Container Security', 'Misconfiguration scanning (CSPM) and benchmarks, and the basics of securing containers and Kubernetes clusters.',
      ['Assess a cloud account\'s posture and the basic security of its containers'], 40, { after: ['CLOUD_LOGGING'] }),
    ...ending('Cloud Security', 'POSTURE_CONTAINERS', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── Governance, risk and compliance ── */
  CY_GRC: { category: 'UNIVERSAL', units: [
    u('FRAMEWORKS', 'Security Frameworks: ISO 27001, NIST CSF and CIS Controls', 'What each framework is for, how they relate, and how an analyst\'s daily work maps to them.',
      ['Map an organisation\'s security work to the main frameworks'], 40),
    u('RISK_ASSESSMENT', 'Risk Assessment and the Risk Register', 'Assets, threats, likelihood and impact, treating risk, and keeping a register leaders actually use.',
      ['Assess and record security risks so leaders can decide on them'], 40, { after: ['FRAMEWORKS'] }),
    u('INDIA_COMPLIANCE', 'Security Obligations in India', 'CERT-In directions, the DPDP Act, and sector expectations such as RBI\'s for banks — in outline, and how to find the current text.',
      ['Know which Indian security and data-protection obligations apply and where to check them'], 40, { after: ['RISK_ASSESSMENT'] }),
    u('AUDITS_POLICIES', 'Policies, Audits and Evidence', 'Writing usable policies, preparing evidence for an audit, and security awareness that changes behaviour.',
      ['Prepare policies and audit evidence that show controls really work'], 35, { after: ['INDIA_COMPLIANCE'] }),
    ...ending('Governance, Risk and Compliance', 'AUDITS_POLICIES', { minutes: [40, 50, 35, 40] }),
  ] },

  /* ── The Cybersecurity Analyst capstone ── */
  CY_CAPSTONE: { category: 'UNIVERSAL', units: [
    u('BRIEF', 'The Capstone: A SOC for a Real Organisation', 'Monitoring and response for a hospital, a cooperative bank or an e-commerce company: assets, risks, log sources, detection goals and a plan.',
      ['Scope a SOC for an organisation — what to monitor, detect and respond to — and plan its delivery'], 45),
    u('BUILD_MONITORING', 'Capstone Build — Monitoring and Detection', 'A home lab with an open-source SIEM, log sources onboarded, detections mapped to ATT&CK and tested, tuning, and the SOC dashboard.',
      ['Build the monitoring and detection side of the SOC and prove the detections work'], 300, { unitType: 'PROJECT', after: ['BRIEF'], skillKeys: ['SIEM_MONITORING', 'NETWORK_SECURITY'] }),
    u('BUILD_RESPONSE', 'Capstone Build — Response, Vulnerabilities and Reporting', 'An incident simulated on your own lab and handled end to end, a vulnerability programme for the assets, and the reports for leaders.',
      ['Run an incident and a vulnerability programme on the lab and report both to leaders'], 240, { unitType: 'PROJECT', after: ['BUILD_MONITORING'], skillKeys: ['INCIDENT_RESPONSE', 'VULNERABILITY_MANAGEMENT'] }),
    u('DEFENCE', 'Demo Day: Presenting and Defending the Capstone', 'A live walk through an alert to resolution, the dashboards and reports, and the questions a SOC hiring panel asks.',
      ['Demo the SOC and defend its design and decisions under questioning'], 45, { unitType: 'PRACTICE', after: ['BUILD_RESPONSE'] }),
    u('CHECKPOINT', 'Capstone — Checkpoint', 'Where you actually are across the whole track, measured rather than felt.',
      ['Show SOC-analyst judgement at the standard a hiring panel expects'], 40, { unitType: 'CHECKPOINT', after: ['DEFENCE'] }),
  ] },
};
