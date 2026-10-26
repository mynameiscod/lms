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
