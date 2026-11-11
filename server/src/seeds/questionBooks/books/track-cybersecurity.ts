import { SeedBook } from '../types';

/**
 * Cybersecurity Analyst interview questions for freshers aiming at SOC and security analyst
 * roles: networks and operating systems, security foundations and cryptography, web security
 * and identity, security operations, vulnerabilities and cloud, then SOC scenario rounds.
 * Everything is defensive and educational. Code is Python 3 and bash.
 */
const book: SeedBook = {
  slug: 'track-cybersecurity',
  title: 'Cybersecurity Analyst Interview Questions',
  kind: 'topic',
  subject: 'Cybersecurity Analyst',
  description: 'The 40 questions SOC and security analyst freshers face: networking, Linux, crypto, web security and identity, SIEM and incident response, CVSS, cloud security and SOC scenarios.',
  color: '#be123c',
  emblem: '🔐',
  audience: 'careerpilot',
  stages: ['specialize', 'placement'],
  tracks: ['CYBERSECURITY'],
  order: 211,
  chapters: [
    {
      title: 'Networks and operating systems',
      questions: [
        {
          q: `Explain the OSI and TCP/IP models. Where do common attacks happen?`,
          a: `| OSI layer | TCP/IP layer | Examples | Attacks / issues |
|---|---|---|---|
| 7 Application | Application | HTTP, DNS, SMTP | SQL injection, phishing, DNS abuse |
| 6 Presentation | Application | TLS encryption, encoding | Weak TLS configuration |
| 5 Session | Application | Sessions | Session hijacking |
| 4 Transport | Transport | TCP, UDP | SYN flood, port scanning |
| 3 Network | Internet | IP, ICMP | IP spoofing, ICMP flood |
| 2 Data link | Link | Ethernet, ARP, MAC | ARP spoofing, MAC flooding |
| 1 Physical | Link | Cables, Wi-Fi radio | Tapping, jamming |

The **TCP/IP model** (4 layers) is what real networks use; OSI (7 layers) is the teaching model and the vocabulary analysts use ("a layer 7 DDoS").

For a SOC analyst, the layer tells you **which logs to check**: firewall and NetFlow logs for layers 3–4, proxy, web server and WAF logs for layer 7, switch logs for layer 2.`,
          d: 'easy',
          at: 'TCS, Wipro, Infosys, Accenture, Deloitte',
          tip: `Learn one attack per layer; interviewers often ask "give an example at layer 2".`,
        },
        {
          q: `Explain the TCP three-way handshake and the difference between TCP and UDP.`,
          a: `**Three-way handshake:**
1. Client → Server: **SYN** (I want to connect, my sequence number is x).
2. Server → Client: **SYN-ACK** (OK, my sequence number is y, I received x).
3. Client → Server: **ACK** (received y). The connection is established.

Connections close with FIN/ACK exchanges, or abruptly with RST.

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented | Connectionless |
| Reliability | Guaranteed, ordered, retransmits | No guarantee |
| Speed | Slower, more overhead | Faster |
| Uses | HTTP/HTTPS, SSH, SMTP | DNS queries, streaming, VoIP, DHCP |

**Security relevance:**
- A **SYN flood** sends many SYNs and never completes the handshake, filling the server's connection table (defence: SYN cookies, rate limiting).
- Many half-open connections to many ports from one IP in firewall logs suggest a **port scan**.
- UDP-based services such as DNS and NTP can be abused for **amplification DDoS**.`,
          d: 'easy',
          at: 'Service companies, SOC teams',
        },
        {
          q: `Which common ports should a security analyst know and why?`,
          a: `| Port | Service | Note |
|---|---|---|
| 20/21 | FTP | Clear text; prefer SFTP |
| 22 | SSH | Brute-force target |
| 23 | Telnet | Clear text; should be disabled |
| 25 | SMTP | Mail; spam and phishing |
| 53 | DNS | UDP/TCP; tunnelling and exfiltration |
| 80 / 443 | HTTP / HTTPS | Most web traffic |
| 88 | Kerberos | Windows domain authentication |
| 110 / 143 | POP3 / IMAP | Mail retrieval |
| 389 / 636 | LDAP / LDAPS | Directory services |
| 445 | SMB | Windows file sharing; abused by WannaCry |
| 1433 / 3306 | MSSQL / MySQL | Should not face the internet |
| 3389 | RDP | Common ransomware entry point |

Why it matters: in alerts and firewall logs you must quickly recognise when something is unusual — e.g. RDP or SMB exposed to the internet, a workstation talking to many hosts on 445 (worm-like spread), or a server suddenly making outbound connections on an unusual high port.`,
          d: 'easy',
          tip: `Memorise 22, 53, 80, 443, 445 and 3389 with one risk each; these come up in almost every SOC interview.`,
        },
        {
          q: `How does DNS work, and how can attackers abuse it?`,
          a: `**Resolution:** when you visit \`example.com\`, your computer asks a **recursive resolver** (ISP or company DNS). If the answer is not cached, the resolver asks a **root server** → the **TLD server** for \`.com\` → the **authoritative server** for \`example.com\`, which returns the IP. Answers are cached for the record's TTL.

Common record types: **A** (IPv4), **AAAA** (IPv6), **CNAME** (alias), **MX** (mail), **TXT** (SPF, DKIM, verification), **NS** (name servers).

**Abuse and what analysts watch for:**
- **DNS tunnelling / exfiltration** – data hidden in long, random-looking subdomains of an attacker domain.
- **Malware command-and-control** using newly registered or algorithm-generated domains (DGA).
- **DNS spoofing / cache poisoning** – forged answers send users to fake sites (DNSSEC helps).
- **Typosquatting / lookalike domains** used in phishing.
- **DNS amplification** DDoS using open resolvers.

DNS logs are one of the most useful sources in a SOC because almost every connection starts with a lookup.`,
          d: 'medium',
          at: 'SOC teams, MSSPs',
        },
        {
          q: `What happens during a TLS handshake, and what does HTTPS protect?`,
          a: `Simplified **TLS 1.3** handshake:
1. **ClientHello** – client sends supported cipher suites and a key share.
2. **ServerHello** – server picks the cipher, sends its key share and its **certificate**, and proves it owns the private key.
3. The client **verifies the certificate**: signed by a trusted certificate authority, valid dates, hostname matches.
4. Both sides derive the same **session keys** (ephemeral Diffie–Hellman), and data is encrypted with fast symmetric encryption such as AES-GCM.

**HTTPS protects:**
- **Confidentiality** – eavesdroppers cannot read the content.
- **Integrity** – tampering is detected.
- **Authentication** of the server – you are talking to the real domain.

**What it does not protect:** the site itself may be malicious (phishing sites have valid certificates too); the domain name is still visible through DNS and SNI; and it does nothing once data reaches the server.

Weak setups to flag: TLS 1.0/1.1 still enabled, expired or self-signed certificates on public sites, weak ciphers.`,
          d: 'medium',
          tip: `"A padlock does not mean the site is safe" — mention phishing sites with valid certificates.`,
        },
        {
          q: `Which Linux commands and log files does a security analyst use most?`,
          a: `**Logs (paths differ by distribution):**
- \`/var/log/auth.log\` (Debian/Ubuntu) or \`/var/log/secure\` (RHEL) – logins, sudo, SSH.
- \`/var/log/syslog\` or \`/var/log/messages\` – general system events.
- \`journalctl\` – systemd journal on modern systems.
- Web server logs, e.g. \`/var/log/nginx/access.log\`.

**Commands:**
\`\`\`bash
# failed SSH logins, counted by source IP
grep "Failed password" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head

last -a | head              # recent successful logins
who                         # who is logged in now
ss -tulpn                   # listening ports and owning processes
ps aux --sort=-%cpu | head  # top processes
crontab -l; ls /etc/cron.*  # scheduled tasks (persistence)
find / -perm -4000 -type f 2>/dev/null   # SUID binaries
sha256sum suspicious.bin    # hash for threat-intel lookup
\`\`\`

These cover the basics of checking for brute force, unknown listeners, odd processes and persistence on a Linux host.`,
          d: 'medium',
          at: 'SOC teams, MSSPs',
        },
        {
          q: `Which Windows event IDs should a SOC analyst know?`,
          a: `From the **Security** log:

| Event ID | Meaning | Why it matters |
|---|---|---|
| 4624 | Successful logon | Check logon type (2 interactive, 3 network, 10 RDP) |
| 4625 | Failed logon | Brute force / password spraying |
| 4634 / 4647 | Logoff | Session duration |
| 4648 | Logon with explicit credentials | Possible lateral movement |
| 4672 | Special privileges assigned | Admin logon |
| 4688 | New process created | Suspicious commands (needs auditing on) |
| 4720 | User account created | Unauthorised accounts |
| 4728 / 4732 | Member added to a security group | Privilege escalation |
| 4740 | Account locked out | Brute force |
| 1102 | Security log cleared | Strong sign of an attacker covering tracks |

Also: **7045** in the System log (new service installed – persistence) and **4104** in PowerShell logs (script block logging). **Sysmon**, if installed, adds rich process, network and file events.

Patterns matter more than single events: many 4625s followed by a 4624 from the same IP is a classic brute-force success.`,
          d: 'medium',
          tip: `Know 4624, 4625, 4688, 4720 and 1102 by heart; they appear in almost every SOC round.`,
        },
        {
          q: `What is network segmentation, and how do firewalls, IDS and IPS differ?`,
          a: `**Network segmentation** divides a network into zones (VLANs, subnets, security groups) with controlled traffic between them — e.g. user workstations, servers, a DMZ for public services, and a separate zone for payment or OT systems. If one machine is compromised, the attacker cannot freely reach everything (limits **lateral movement**). **Zero trust** takes this further: no implicit trust based on network location; every request is authenticated and authorised.

- **Firewall** – allows or blocks traffic based on rules (IP, port, protocol; next-generation firewalls also see applications and users). Default should be **deny all, allow what is needed**.
- **IDS (Intrusion Detection System)** – watches traffic and **alerts** on signatures or anomalies; does not block. Examples: Snort, Suricata, Zeek (network monitoring).
- **IPS (Intrusion Prevention System)** – sits inline and can **block** malicious traffic automatically; false positives can break legitimate traffic.
- **WAF** – a layer-7 filter for web applications (SQL injection, XSS patterns).

Analysts investigate IDS/IPS alerts in the SIEM and recommend firewall rule changes.`,
          d: 'hard',
        },
      ],
    },
    {
      title: 'Security foundations and cryptography',
      questions: [
        {
          q: `What is the CIA triad? Give an example of an attack on each.`,
          a: `- **Confidentiality** – only authorised people can read data. Attack: a data breach where customer records are stolen; sniffing unencrypted traffic.
- **Integrity** – data is accurate and not altered without authorisation. Attack: an attacker changes the bank account number on an invoice (business email compromise); tampering with logs.
- **Availability** – systems and data are accessible when needed. Attack: DDoS takes a website offline; **ransomware** encrypts files (it also often steals data, hitting confidentiality too).

Controls map to each:
- Confidentiality → encryption, access control, MFA.
- Integrity → hashing, digital signatures, change control, file-integrity monitoring.
- Availability → backups, redundancy, DDoS protection, patching.

Many teams also add **authenticity** and **non-repudiation** (someone cannot deny an action they took, proven by signatures and logs). Every security incident you discuss in an interview can be framed by which part of CIA it affected.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Capgemini, Big 4',
        },
        {
          q: `What is the difference between symmetric and asymmetric encryption?`,
          a: `| | Symmetric | Asymmetric |
|---|---|---|
| Keys | One shared secret key | A key pair: public + private |
| Speed | Fast | Slow |
| Examples | AES, ChaCha20 | RSA, elliptic-curve (ECDH, ECDSA, Ed25519) |
| Main problem | How to share the key safely | Slower; key sizes larger |
| Typical use | Encrypting bulk data, disks, files | Key exchange, digital signatures, certificates |

**How they work together (e.g. TLS):** asymmetric cryptography is used to authenticate the server and agree on a shared secret; then fast symmetric encryption (AES-GCM) protects the actual data.

With asymmetric keys:
- Encrypt with the **public key** → only the **private key** holder can decrypt (confidentiality).
- Sign with the **private key** → anyone with the **public key** can verify (authenticity and integrity).

The private key must never be shared; if it leaks, the certificate must be revoked and replaced.`,
          d: 'easy',
          at: 'Service companies, product companies',
          tip: `Explain how TLS combines both; it turns a definition answer into an understanding answer.`,
        },
        {
          q: `What is the difference between hashing, encryption and encoding?`,
          a: `- **Encoding** – changes data format for transport or storage, **no secret involved**, anyone can reverse it. Examples: Base64, URL encoding. Not security. (Seeing "encrypted" Base64 passwords in a config file is a finding.)
- **Encryption** – makes data unreadable without a **key**; reversible by the key holder. Examples: AES, RSA. Used for confidentiality.
- **Hashing** – a **one-way** function producing a fixed-length digest; you cannot get the input back. The same input always gives the same hash; a tiny change gives a completely different hash. Examples: SHA-256, SHA-3. Used for integrity checks, file identification (malware hashes) and password storage (with special algorithms).

\`\`\`python
import base64, hashlib
data = b"hello"
print(base64.b64encode(data))                 # b'aGVsbG8=' (reversible by anyone)
print(hashlib.sha256(data).hexdigest())       # one-way fingerprint
\`\`\`

MD5 and SHA-1 are broken for security purposes (collisions), though they are still seen as file identifiers in threat-intel feeds.`,
          d: 'easy',
        },
        {
          q: `How should passwords be stored? Explain salting.`,
          a: `Never store passwords in plain text or with simple encryption. Store a **slow, salted hash** using an algorithm designed for passwords:

- **Argon2id** (recommended by OWASP), **bcrypt**, **scrypt**, or **PBKDF2** with a high iteration count.
- Plain SHA-256 is **too fast**: attackers can try billions of guesses per second on GPUs.

A **salt** is a random value, unique per user, stored next to the hash. It ensures:
- Two users with the same password have different hashes.
- Precomputed **rainbow tables** are useless.

A **pepper** is an extra secret added to all passwords and stored separately from the database (e.g. in a secrets manager).

\`\`\`python
import bcrypt
hashed = bcrypt.hashpw(b"S3cure!pass", bcrypt.gensalt())   # salt is embedded in the result
print(bcrypt.checkpw(b"S3cure!pass", hashed))   # True
\`\`\`

Combine with MFA, rate limiting on login and checking new passwords against breached-password lists.`,
          d: 'medium',
          tip: `Say "fast hashes are bad for passwords" — it shows you understand why bcrypt/Argon2 exist.`,
        },
        {
          q: `What is a digital certificate and how does PKI work?`,
          a: `A **digital certificate** (X.509) binds a public key to an identity, such as a domain name. It contains the subject (e.g. \`www.example.com\`), the public key, the issuer, validity dates and the issuer's **digital signature**.

**PKI (Public Key Infrastructure)** is the system of trust behind certificates:
1. A website creates a key pair and sends a certificate signing request to a **Certificate Authority (CA)**.
2. The CA verifies control of the domain (or the organisation) and signs the certificate.
3. Browsers and operating systems ship with a list of trusted **root CAs**. Certificates usually chain: root CA → intermediate CA → server certificate.
4. When you connect, your browser verifies the chain, dates, hostname and whether the certificate is revoked (CRL, OCSP).

Analyst relevance:
- Expired or mismatched certificates cause outages and warnings users learn to ignore.
- Self-signed or unexpected certificates on internal traffic can indicate interception or malware.
- Compromised private keys mean the certificate must be **revoked** and replaced.`,
          d: 'medium',
        },
        {
          q: `Explain the common types of malware and social-engineering attacks.`,
          a: `**Malware types:**
- **Virus** – attaches to files; spreads when they run.
- **Worm** – spreads by itself across networks (WannaCry via SMB).
- **Trojan** – disguised as legitimate software.
- **Ransomware** – encrypts data and demands payment; modern groups also steal data first ("double extortion").
- **Spyware / keylogger / infostealer** – steals credentials, cookies and data.
- **Rootkit** – hides deep in the system to avoid detection.
- **Botnet** – infected machines controlled together for DDoS or spam.

**Social engineering:**
- **Phishing** (email), **spear phishing** (targeted), **whaling** (executives).
- **Vishing** (voice calls) and **smishing** (SMS) — common in India as fake bank, KYC or courier messages.
- **Business email compromise** – impersonating a CEO or vendor to redirect payments.
- **Pretexting, baiting, tailgating** – fake stories, infected USB drives, following staff through doors.
- **MFA fatigue** – spamming push requests until the user approves.

Defences: awareness training, email filtering (SPF, DKIM, DMARC), EDR, MFA with number matching or phishing-resistant keys, and least privilege.`,
          d: 'medium',
          at: 'Service companies, banks, SOC teams',
        },
        {
          q: `What are threat actors, and what is the cyber kill chain / MITRE ATT&CK?`,
          a: `**Threat actors:** cybercriminals (money, ransomware), nation-state groups (espionage, APTs), hacktivists (causes), insiders (malicious or careless), and opportunistic attackers using automated scanning.

**Lockheed Martin Cyber Kill Chain** – seven stages of an attack:
1. Reconnaissance 2. Weaponisation 3. Delivery 4. Exploitation 5. Installation 6. Command and control (C2) 7. Actions on objectives.
Defenders aim to break the chain as early as possible.

**MITRE ATT&CK** is a detailed, public knowledge base of real attacker behaviour, organised as **tactics** (the goal, e.g. Initial Access, Persistence, Privilege Escalation, Lateral Movement, Exfiltration) and **techniques** with IDs (e.g. T1566 Phishing, T1059 Command and Scripting Interpreter).

How SOCs use ATT&CK:
- Map detection rules to techniques and find coverage gaps.
- Describe incidents in a common language.
- Plan threat hunts ("do we detect T1053 scheduled tasks?").`,
          d: 'medium',
          tip: `Quote one ATT&CK technique ID (T1566 Phishing) — it shows hands-on familiarity.`,
        },
        {
          q: `What is the difference between endpoint protection (antivirus) and EDR? What does endpoint hardening include?`,
          a: `- **Traditional antivirus** mainly matches files against known malware **signatures** and some heuristics. It struggles with new malware and "living off the land" attacks that use built-in tools like PowerShell.
- **EDR (Endpoint Detection and Response)** continuously records endpoint activity — processes, command lines, network connections, file and registry changes — detects suspicious **behaviour**, and lets analysts **investigate and respond** remotely: isolate the host from the network, kill processes, quarantine files. Examples: Microsoft Defender for Endpoint, CrowdStrike Falcon, SentinelOne. **XDR** extends this across email, identity and cloud.

**Endpoint hardening:**
- Timely OS and application **patching**.
- Remove admin rights from everyday users; use **LAPS**-style unique local admin passwords.
- Disk encryption (BitLocker, FileVault).
- Application allow-listing; block macros from the internet.
- Disable unused services and legacy protocols (SMBv1).
- Host firewall on; secure baselines such as **CIS Benchmarks**.
- Centralised logging (forward to the SIEM).`,
          d: 'hard',
        },
      ],
    },
    {
      title: 'Web security, identity and authentication',
      questions: [
        {
          q: `List the OWASP Top 10 (2021) and explain three of them.`,
          a: `1. **A01 Broken Access Control**
2. **A02 Cryptographic Failures**
3. **A03 Injection** (includes XSS)
4. **A04 Insecure Design**
5. **A05 Security Misconfiguration**
6. **A06 Vulnerable and Outdated Components**
7. **A07 Identification and Authentication Failures**
8. **A08 Software and Data Integrity Failures**
9. **A09 Security Logging and Monitoring Failures**
10. **A10 Server-Side Request Forgery (SSRF)**

Three explained:
- **Broken Access Control** – users can act outside their permissions, e.g. changing \`/orders/1001\` to \`/orders/1002\` shows someone else's order (IDOR). Fix: check authorisation on the server for every request.
- **Security Misconfiguration** – default passwords, public cloud storage buckets, verbose error messages, unnecessary features enabled. Fix: hardened baselines and configuration reviews.
- **Security Logging and Monitoring Failures** – attacks go unnoticed because events are not logged or alerts are ignored. This one is directly a SOC concern.

OWASP releases updated lists periodically, so mention the year you are quoting.`,
          d: 'easy',
          at: 'Service companies, product companies, Big 4',
        },
        {
          q: `What is SQL injection and how is it prevented?`,
          a: `**SQL injection** happens when user input is concatenated into a SQL query, so the input can change the query's logic. Impact: reading or modifying data the user should not access, bypassing login, or worse depending on database permissions.

Vulnerable pattern:
\`\`\`python
# BAD: input becomes part of the SQL text
query = f"SELECT * FROM users WHERE email = '{email}'"
cursor.execute(query)
\`\`\`

Safe pattern — **parameterised queries** (prepared statements), where input is always treated as data:
\`\`\`python
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
\`\`\`

Other defences:
- Use ORM methods correctly (avoid raw string queries).
- **Least privilege** for the database account (the app should not connect as an administrator).
- Input validation (allow-lists for IDs, sort fields).
- Generic error messages, so database errors are not shown to users.
- A WAF as an extra layer, and alerts on SQL error spikes.

**What an analyst sees:** WAF or web-server logs with \`' OR\`, \`UNION SELECT\` or encoded quotes in parameters, often from scanners.`,
          d: 'easy',
          tip: `Always show the fix (parameterised query) right after the problem.`,
        },
        {
          q: `What is cross-site scripting (XSS)? Explain its types and defences.`,
          a: `**XSS** is when an attacker gets their JavaScript to run in another user's browser on a trusted site. It can steal session data, perform actions as the user, or show fake login forms.

**Types:**
- **Stored XSS** – the script is saved on the server (e.g. in a comment) and runs for everyone who views it.
- **Reflected XSS** – the script is in a URL parameter and reflected back in the response; the victim must open a crafted link.
- **DOM-based XSS** – client-side JavaScript writes untrusted data into the page (e.g. using \`innerHTML\`).

**Defences:**
- **Output encoding** for the right context (HTML, attribute, JavaScript, URL). Modern frameworks like React and Angular encode by default; avoid bypasses such as \`dangerouslySetInnerHTML\` and \`innerHTML\` with untrusted data.
- **Sanitise** HTML when rich text is genuinely needed (e.g. DOMPurify).
- **Content Security Policy (CSP)** header to restrict where scripts can load from.
- **HttpOnly** cookies so scripts cannot read session cookies.
- Input validation as an extra layer.`,
          d: 'easy',
        },
        {
          q: `How do sessions and cookies work, and how do you secure them?`,
          a: `HTTP is stateless, so after login the server creates a **session** and gives the browser a **session ID** in a cookie. The browser sends it with each request, and the server looks up who the user is.

**Secure cookie attributes:**
- \`Secure\` – sent only over HTTPS.
- \`HttpOnly\` – JavaScript cannot read it (limits XSS damage).
- \`SameSite=Lax\` or \`Strict\` – not sent on most cross-site requests (helps against CSRF).
- Reasonable \`Max-Age\`/expiry, and a narrow \`Path\`/\`Domain\`.

\`\`\`
Set-Cookie: sid=8f3c...; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
\`\`\`

**Session management good practice:**
- Long, random session IDs from a secure generator.
- **Regenerate the session ID after login** (prevents session fixation).
- Idle and absolute timeouts; invalidate on logout and password change.
- Never put session IDs in URLs.

**Threats:** session hijacking (stolen cookies via XSS or infostealer malware), CSRF, and session fixation. Analysts may see one session ID used from two countries at once — a sign of stolen cookies.`,
          d: 'medium',
          at: 'Product companies',
        },
        {
          q: `What is a JWT? What are its security pitfalls?`,
          a: `A **JSON Web Token** is a compact, signed token used to carry identity claims, common in APIs. It has three Base64URL-encoded parts separated by dots: **header** (algorithm), **payload** (claims such as \`sub\`, \`exp\`, \`role\`) and **signature**.

The server verifies the signature with its secret (HS256) or public key (RS256/ES256) and trusts the claims without a database lookup.

**Pitfalls:**
- **The payload is not encrypted**, only encoded — anyone can read it. Never put secrets or sensitive personal data in it.
- **Not verifying the signature**, or accepting \`alg: none\`. Always pin the expected algorithm.
- **Weak HS256 secrets** that can be brute-forced offline.
- **Long lifetimes** — a stolen JWT works until it expires; revocation is hard. Use short-lived access tokens plus refresh tokens.
- Not checking \`exp\`, \`iss\` and \`aud\`.
- Storing tokens in \`localStorage\` exposes them to XSS; many teams prefer HttpOnly cookies.

\`\`\`python
import jwt   # PyJWT
claims = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"], audience="orders-api")
\`\`\``,
          d: 'medium',
          tip: `"JWT is signed, not encrypted" is the single most important point.`,
        },
        {
          q: `Explain OAuth 2.0 and OpenID Connect at a basic level.`,
          a: `- **OAuth 2.0** is an **authorisation** framework: it lets an app access a user's resources on another service **without getting the user's password**. Example: a photo-printing site gets permission to read your Google Photos.
- **OpenID Connect (OIDC)** is a layer on top of OAuth 2.0 for **authentication**: it adds an **ID token** (a JWT) that says who the user is. "Sign in with Google/Microsoft" uses OIDC.

**Authorization Code flow (with PKCE)** – the recommended flow:
1. The app redirects the user to the authorisation server (e.g. Google).
2. The user logs in and approves the requested **scopes** (e.g. \`read:photos\`).
3. The server redirects back with a short-lived **authorisation code**.
4. The app exchanges the code (plus the PKCE verifier) for an **access token** (and maybe a refresh token and ID token).
5. The app calls the API with the access token.

**Security points:** request minimal scopes, validate redirect URIs exactly, use the \`state\` parameter against CSRF, and watch for **consent phishing** — malicious apps asking users to grant broad mailbox access.`,
          d: 'medium',
        },
        {
          q: `What is MFA, and why are some MFA methods stronger than others?`,
          a: `**Multi-factor authentication** requires two or more different factor types:
- Something you **know** (password, PIN).
- Something you **have** (phone, hardware key).
- Something you **are** (fingerprint, face).

Two passwords are not MFA — they are the same factor.

**Strength, weakest to strongest:**
1. **SMS / voice OTP** – vulnerable to SIM swap and phishing.
2. **Authenticator app codes (TOTP)** – better, but a fake login page can still capture and replay the code in real time.
3. **Push notifications** – convenient, but open to **MFA fatigue** (approve spam); **number matching** reduces it.
4. **Phishing-resistant MFA** – **FIDO2 / WebAuthn / passkeys** and hardware security keys. The key is bound to the real domain, so a fake site gets nothing.

MFA blocks most password-based attacks, but attackers adapt with **adversary-in-the-middle phishing kits** that steal session cookies after login. So also monitor for impossible travel, new devices and token reuse, and use conditional-access policies.`,
          d: 'medium',
          at: 'Banks, product companies, SOC teams',
        },
        {
          q: `What is identity and access management (IAM)? Explain RBAC, privileged access and the joiner-mover-leaver process.`,
          a: `**IAM** makes sure the right identities (people, services, devices) have the right access to the right resources, at the right time, for the right reasons. Identity is often called the new perimeter because attackers increasingly **log in** with stolen credentials rather than break in.

- **RBAC (role-based access control)** – permissions are given to roles (e.g. "HR Executive"), and users get roles, not individual permissions. Easier to manage and audit. ABAC adds attributes (department, location, time).
- **Privileged Access Management (PAM)** – admin accounts are separate from daily accounts, stored in a vault, granted **just-in-time** for a limited period, with sessions recorded.
- **Joiner–mover–leaver (JML)**:
  - *Joiner* – access based on the role from day one.
  - *Mover* – when changing teams, old access is **removed**, not just new access added (prevents "privilege creep").
  - *Leaver* – all access disabled immediately on exit, including SaaS apps and API keys.
- **Access reviews** – managers periodically recertify who has access.

Common findings: orphaned accounts of ex-employees, shared admin accounts, service accounts with passwords that never expire.`,
          d: 'hard',
        },
      ],
    },
    {
      title: 'Security operations, vulnerabilities and cloud',
      questions: [
        {
          q: `What is a SOC, and what are the roles of L1, L2 and L3 analysts?`,
          a: `A **Security Operations Centre (SOC)** is the team (and tools) that monitors an organisation's environment, detects threats, and responds to incidents, often 24×7.

**Tiers:**
- **L1 / Tier 1 – Triage analyst:** watches the alert queue in the SIEM, checks whether alerts are true or false positives using a playbook, enriches them (IP reputation, user, asset), and escalates real incidents with good notes. Most freshers start here.
- **L2 / Tier 2 – Incident responder:** deeper investigation, scoping (which hosts and users are affected), containment actions (isolate host, disable account), coordination with IT.
- **L3 / Tier 3 – Threat hunter / senior analyst:** proactive threat hunting, malware analysis, forensics, writing and tuning detection rules.
- **SOC manager**, plus related teams: threat intelligence, detection engineering, vulnerability management.

**Key metrics:** mean time to detect (MTTD), mean time to respond (MTTR), alert volume and false-positive rate. Many Indian SOCs are run by MSSPs serving global clients, so shift work and clear written handovers are part of the job.`,
          d: 'easy',
          at: 'TCS, Wipro, Infosys, HCLTech, Tech Mahindra, MSSPs',
          tip: `Say what an L1 actually does each shift: triage, enrich, document, escalate.`,
        },
        {
          q: `What is a SIEM, and how does it work?`,
          a: `A **SIEM (Security Information and Event Management)** system collects logs from across the organisation, normalises them, correlates them, raises alerts and supports investigation and reporting. Examples: Splunk, Microsoft Sentinel, IBM QRadar, Elastic Security, Google SecOps.

**How it works:**
1. **Collection** – agents, syslog and APIs send logs from firewalls, servers, endpoints/EDR, identity providers (Active Directory, Entra ID), cloud platforms, email gateways and applications.
2. **Parsing and normalisation** – fields like user, source IP and action are extracted into a common format.
3. **Correlation rules / analytics** – e.g. "10 failed logins followed by a success from the same IP within 5 minutes" raises an alert.
4. **Enrichment** – threat-intelligence reputation, asset criticality, user details.
5. **Alerting and case management** – analysts triage alerts.
6. **Search and dashboards** – for investigation and threat hunting.
7. **Retention** – for compliance and forensics.

**SOAR** tools sit beside the SIEM and automate repetitive steps in playbooks (enrich an IP, disable an account, open a ticket).`,
          d: 'easy',
        },
        {
          q: `Walk through the incident response lifecycle.`,
          a: `The **NIST SP 800-61** model (widely used in interviews):

1. **Preparation** – policies, playbooks, contact lists, tools, logging, backups, training and exercises.
2. **Detection and analysis** – alerts are triaged, the incident is confirmed, its scope and severity are determined, and evidence is collected and preserved.
3. **Containment, eradication and recovery**
   - *Containment* – stop the spread: isolate hosts, disable compromised accounts, block malicious IPs/domains. Short-term first, then long-term.
   - *Eradication* – remove malware, close the vulnerability, reset credentials.
   - *Recovery* – restore systems from clean backups, monitor closely for re-infection.
4. **Post-incident activity** – a lessons-learned review: timeline, root cause, what worked, what to improve, new detections.

NIST revised this guidance in 2025 to align with its Cybersecurity Framework 2.0, but the phases above remain the common interview answer. The SANS model uses six steps: Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned.

Throughout: **document everything** with timestamps, keep **chain of custody** for evidence, and follow legal and regulatory reporting rules — in India, **CERT-In** requires many incidents to be reported within 6 hours.`,
          d: 'easy',
          at: 'SOC teams, Big 4, banks',
          tip: `Mention CERT-In's 6-hour reporting rule; it shows India-specific awareness.`,
        },
        {
          q: `How do you triage an alert? What makes something a false positive?`,
          a: `**Triage steps for an L1:**
1. **Read the alert** – what rule fired, on which host/user, when, and why it matters.
2. **Gather context** – asset criticality (domain controller vs test VM), user role, normal behaviour for this user/host.
3. **Enrich indicators** – check IPs, domains, URLs and file hashes against threat intelligence (VirusTotal, AbuseIPDB, internal intel).
4. **Look at surrounding events** – what happened before and after on the same host or account (process tree in EDR, logins, network connections).
5. **Decide**: **true positive** (malicious), **benign true positive** (rule correct, activity authorised — e.g. an approved vulnerability scan), or **false positive** (rule fired wrongly).
6. **Act** – escalate with clear notes, or close with justification; suggest tuning if the rule is noisy.

**False positive examples:** an admin's legitimate PowerShell script, a backup job causing large outbound transfer, a user travelling and logging in from abroad.

**False negatives** — attacks with no alert — are more dangerous, which is why threat hunting exists. Good documentation matters: another analyst should understand your decision without asking you.`,
          d: 'medium',
          at: 'MSSPs, SOC teams',
        },
        {
          q: `What is a CVE, and how does CVSS scoring work?`,
          a: `- **CVE (Common Vulnerabilities and Exposures)** is a unique ID for a publicly known vulnerability, e.g. **CVE-2021-44228** (Log4Shell in Apache Log4j).
- **CWE** describes the weakness *type* (e.g. CWE-79 XSS, CWE-89 SQL injection).
- **CVSS (Common Vulnerability Scoring System)** gives a severity score from 0.0 to 10.0. Bands: None 0.0, **Low** 0.1–3.9, **Medium** 4.0–6.9, **High** 7.0–8.9, **Critical** 9.0–10.0.

**CVSS base metrics** (v3.1) include:
- **Attack Vector** – network, adjacent, local, physical.
- **Attack Complexity**, **Privileges Required**, **User Interaction**.
- **Scope** – does it affect other components.
- **Impact** on confidentiality, integrity and availability.

CVSS v4.0 (released 2023) refines these and is being adopted gradually.

**Important:** CVSS measures severity, not your actual risk. Prioritise using **exploitability** (is it in CISA's Known Exploited Vulnerabilities catalogue? What is its EPSS probability?), **exposure** (internet-facing?) and **asset criticality**. A 7.5 on an internet-facing server being actively exploited beats a 9.8 on an isolated test machine.`,
          d: 'medium',
          tip: `Say "CVSS is severity, not risk" and mention CISA KEV or EPSS for prioritisation.`,
        },
        {
          q: `Explain the vulnerability management lifecycle.`,
          a: `Vulnerability management is a continuous cycle, not a one-time scan:

1. **Asset inventory** – you cannot protect what you do not know about (servers, laptops, cloud resources, applications, containers).
2. **Discovery / scanning** – authenticated scans with tools such as Nessus, Qualys, Rapid7 or OpenVAS; cloud and container scanners; dependency scanners for code.
3. **Assessment and prioritisation** – combine CVSS with exploitability (CISA KEV, EPSS), exposure and business criticality; remove false positives.
4. **Remediation** – patch, upgrade, change configuration; when not possible immediately, **mitigate** (disable the feature, restrict network access, WAF rule) or formally **accept** the risk with an expiry date.
5. **Verification** – rescan to confirm the fix.
6. **Reporting and metrics** – SLA compliance (e.g. critical within 7–15 days, depending on policy), number of open criticals, mean time to remediate, trends.

Common challenges: outdated inventories, patching that breaks applications, unclear ownership, and legacy systems that cannot be patched (which need compensating controls such as segmentation). Only scan systems you are authorised to scan.`,
          d: 'medium',
        },
        {
          q: `What is the cloud shared responsibility model, and what are the most common cloud security issues?`,
          a: `**Shared responsibility:** the cloud provider secures the **cloud itself** (data centres, hardware, hypervisor, core services); the customer secures what they put **in** the cloud.

| Model | Provider handles | Customer handles |
|---|---|---|
| IaaS (VMs) | Physical, network, hypervisor | OS patching, apps, data, IAM, network rules |
| PaaS | + OS and runtime | Apps, data, IAM, configuration |
| SaaS | Almost everything | Data, user access, configuration |

The customer **always** owns identities, access and data.

**Most common issues (mostly misconfigurations):**
- Publicly readable storage buckets/blobs.
- Over-permissive IAM roles (\`*\` actions), unused access keys, no MFA on root/admin accounts.
- Security groups open to \`0.0.0.0/0\` on SSH (22), RDP (3389) or databases.
- Logging not enabled (CloudTrail, Azure Activity Log) or not sent to the SIEM.
- Secrets in code or VM metadata.
- Unencrypted storage and snapshots shared publicly.

Tools: **CSPM** (cloud security posture management) such as Microsoft Defender for Cloud, AWS Security Hub, or open-source Prowler, measured against CIS Benchmarks.`,
          d: 'medium',
          at: 'Product companies, Big 4, MSSPs',
        },
        {
          q: `What are security governance, risk and compliance (GRC)? Name important frameworks and laws.`,
          a: `**GRC** is the management side of security:
- **Governance** – policies, roles and accountability: who decides, who owns which risk, what the rules are.
- **Risk management** – identifying, assessing and treating risks (mitigate, transfer, avoid, accept), recorded in a risk register.
- **Compliance** – showing that the organisation meets laws, regulations, contracts and standards, through audits and evidence.

**Frameworks and standards:**
- **ISO/IEC 27001** – an information security management system (ISMS) standard; organisations get certified.
- **NIST Cybersecurity Framework 2.0** – functions Govern, Identify, Protect, Detect, Respond, Recover.
- **CIS Controls** – prioritised technical safeguards.
- **SOC 2** – audit reports on a service provider's controls (common for SaaS).
- **PCI DSS** – for anyone handling card data.

**Laws and regulators relevant in India:**
- **Digital Personal Data Protection (DPDP) Act, 2023** – personal data obligations.
- **CERT-In directions (2022)** – incident reporting within 6 hours and log retention for 180 days.
- **RBI and SEBI cybersecurity guidelines** for banks and market entities.
- **GDPR** when handling EU residents' data.`,
          d: 'hard',
        },
      ],
    },
    {
      title: 'SOC scenarios and project questions',
      questions: [
        {
          q: `Explain your cybersecurity capstone or home-lab project.`,
          a: `A good structure for a home SOC lab:

1. **Goal** – "Build a small SOC lab to practise detection and triage."
2. **Setup** – a Windows VM joined to a test domain, a Linux server, and a SIEM (e.g. Wazuh, Splunk Free or Elastic) collecting Windows Security, Sysmon and Linux auth logs; all on an isolated virtual network.
3. **Detections** – rules you wrote: brute-force (many 4625s then 4624), new local admin (4732), security log cleared (1102), suspicious PowerShell (4104), SSH brute force on Linux.
4. **Testing** – how you generated **safe test activity** in your own lab (wrong passwords, creating test users, running benign test scripts such as Atomic Red Team tests in the isolated lab), and mapped each to MITRE ATT&CK.
5. **Results** – alerts fired, false positives you tuned, dashboards built.
6. **Write-up** – a sample incident report or playbook.
7. **Next steps** – SOAR automation, more data sources, cloud logs.

Interviewers value **isolated, authorised labs**, clear documentation and the tuning story.`,
          d: 'easy',
          tip: `Bring one detection rule you wrote and explain how you tuned its false positives.`,
        },
        {
          q: `SOC scenario: the SIEM shows 300 failed logins on one account in 10 minutes, then a successful login. What do you do?`,
          a: `**1. Understand the pattern**
- Source IPs: one IP (brute force) or many (distributed)? Internal or external? Reputation and geolocation?
- Account: a normal user, a service account or an admin? Logon type (network, RDP, VPN, cloud portal)?
- Was the **success from the same source** as the failures? That is the key point.

**2. Check what happened after the successful login**
- New device or location? MFA prompt approved or bypassed?
- Actions: mailbox rule creation, file downloads, new logins to other systems, privilege changes, password reset.

**3. Contact and verify**
- Confirm with the user (via a separate channel) whether it was them, e.g. an old phone with a saved wrong password.

**4. If suspicious — escalate and contain (per playbook)**
- Disable the account or force a password reset and **revoke active sessions/tokens**.
- Block the source IP; isolate any host involved.

**5. Document** – timeline, indicators, actions; recommend MFA, lockout/smart-lockout policies and rule tuning.`,
          d: 'medium',
          at: 'MSSPs, SOC teams',
          tip: `Focus on the success after the failures; that turns a noisy alert into a likely compromise.`,
        },
        {
          q: `SOC scenario: an employee reports a suspicious email asking them to "verify payroll details". How do you analyse it?`,
          a: `**Safely analyse — never click links or open attachments on your normal machine.**

1. **Header analysis** – real sender vs display name, \`Reply-To\` mismatch, \`Received\` path, and **SPF, DKIM and DMARC** results in \`Authentication-Results\`.
2. **Sender domain** – lookalike (\`codebegun-hr.com\`, \`rn\` instead of \`m\`), newly registered domain.
3. **Links** – hover to see the real URL; check it in URL reputation services or a sandbox; look for credential-harvesting pages.
4. **Attachments** – get the hash and look it up; detonate only in an approved sandbox.
5. **Content cues** – urgency, payroll/bank changes, generic greeting, odd grammar.

**Scope and respond:**
- Search the mail gateway for **other recipients** of the same sender, subject or URL.
- Check whether anyone **clicked** (proxy/DNS logs) or **entered credentials** (sign-in logs).
- Remove the emails from all mailboxes, block the sender domain and URL.
- If credentials were entered: reset password, revoke sessions, check MFA and mailbox rules.
- Thank the reporter — reporting should be encouraged.`,
          d: 'medium',
        },
        {
          q: `SOC scenario: EDR alerts that Word spawned PowerShell with an encoded command on a finance laptop. What do you do?`,
          a: `This is high priority: **Office spawning PowerShell** with an encoded command is a classic sign of a malicious macro or document (MITRE T1566 phishing → T1059.001 PowerShell).

**Investigate:**
1. **Process tree** in EDR: \`WINWORD.EXE → powershell.exe -enc ...\`. Which document? Where did it come from (email attachment, download)?
2. **Decode the command** safely to understand intent (in an analysis tool, not by running it) — often it downloads a second stage.
3. **Network activity** from the process: domains/IPs contacted, files downloaded.
4. **Persistence**: new scheduled tasks, services, run keys.
5. **Scope**: search the SIEM/EDR for the same file hash, domain or command line on other hosts, and other recipients of the email.

**Contain (per playbook, escalate to L2):**
- **Isolate the host** with EDR network containment.
- Block the domains/IPs and file hash.
- Reset the user's credentials and revoke sessions (the machine may have an infostealer).

**Recover and improve:** reimage if compromise is confirmed, block macros from internet files, and add a detection rule for Office → script interpreter chains.`,
          d: 'hard',
          tip: `Name the parent–child process pattern; "Office spawning PowerShell" is the key red flag.`,
        },
        {
          q: `SOC scenario: a server is sending large amounts of data to an unknown external IP at 3 a.m. How do you respond?`,
          a: `**Possible data exfiltration — investigate quickly but carefully.**

1. **Validate** – firewall/NetFlow logs: volume, duration, destination IP, port and protocol. Is this a known backup, update or replication job? Check the change calendar and ask the system owner.
2. **Enrich the destination** – reputation, owner (cloud provider? a known vendor?), geolocation, newly seen?
3. **On the host (via EDR)** – which **process** owns the connection? Recently created files (archives like \`.zip\`, \`.7z\`, \`.rar\`)? Logins to this server before the transfer, and from where?
4. **Lateral context** – any related alerts: brute force, new admin accounts, suspicious tools?

**If unexplained — escalate and contain:**
- Block the destination IP/domain at the firewall.
- Isolate the server (coordinate with the owner if it is business-critical).
- Preserve evidence: memory capture and logs before reboot or reimage.
- Identify **what data** may have left — this decides legal and regulatory steps (DPDP Act, CERT-In reporting within 6 hours, customer contracts).

**Afterwards:** egress filtering (servers should not talk to the whole internet), DLP and alerting on unusual outbound volume.`,
          d: 'hard',
        },
        {
          q: `SOC scenario: an alert says a cloud storage bucket was made public. What do you do?`,
          a: `1. **Verify** – which bucket, which account, who changed it and when (CloudTrail or Azure Activity Log: the identity, source IP and API call, e.g. \`PutBucketPolicy\` or \`PutBucketAcl\`).
2. **Assess the data** – what is stored in it? Public website images may be intended; customer documents, backups or logs are an incident.
3. **Contain** – if not intended, **remove public access immediately** (and enable account-level block-public-access settings).
4. **Check exposure** – storage access logs: was anything downloaded by unknown IPs while it was public? For how long?
5. **Check the identity** – was it a mistaken admin, an automation script, or a compromised account? If compromised: revoke keys/sessions, look for other changes made by that identity.
6. **Escalate and notify** – the data owner, and legal/privacy teams if personal data was exposed.
7. **Prevent** – policy guardrails (e.g. organisation policies that deny public buckets), CSPM alerts, least-privilege IAM, and infrastructure-as-code review.

\`\`\`bash
# AWS CLI: block all public access on one bucket
aws s3api put-public-access-block --bucket my-bucket \\
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
\`\`\``,
          d: 'hard',
        },
        {
          q: `Write a simple Python script to find IP addresses with many failed SSH logins from an auth log.`,
          a: `\`\`\`python
import re
from collections import Counter

PATTERN = re.compile(r"Failed password for (?:invalid user )?\\S+ from (\\d{1,3}(?:\\.\\d{1,3}){3})")
THRESHOLD = 20

def failed_logins(path: str) -> Counter:
    counts = Counter()
    with open(path, encoding="utf-8", errors="ignore") as f:
        for line in f:
            match = PATTERN.search(line)
            if match:
                counts[match.group(1)] += 1
    return counts

if __name__ == "__main__":
    for ip, n in failed_logins("/var/log/auth.log").most_common():
        if n < THRESHOLD:
            break
        print(f"{ip}\\t{n} failed logins")
\`\`\`

How to explain it:
- The regex captures the source IP from OpenSSH "Failed password" lines, including invalid usernames.
- \`Counter\` tallies attempts per IP; \`most_common()\` sorts them.
- In a real SOC this logic lives in a SIEM rule with a **time window** (e.g. 20 failures in 5 minutes), and results are enriched with IP reputation before anyone blocks anything.

Run it only on logs from systems you are responsible for.`,
          d: 'medium',
        },
        {
          q: `Write a short incident report for a contained phishing incident. What sections should it have?`,
          a: `A clear incident report helps management, auditors and the next analyst. Typical sections:

1. **Summary** – two or three lines: "On 12 Nov, 14 employees received a payroll-themed phishing email. Two entered credentials. Both accounts were secured within 40 minutes; no data loss was found."
2. **Severity and classification** – e.g. Medium; Phishing / credential compromise; MITRE T1566.002.
3. **Timeline (with timestamps and time zone)** – first email delivered, first report, detection, containment actions, closure.
4. **Scope and impact** – users, hosts, data and systems affected; what was confirmed **not** affected.
5. **Indicators of compromise (IOCs)** – sender addresses, domains, URLs, IPs, hashes.
6. **Actions taken** – emails purged, domain blocked, passwords reset, sessions revoked, mailbox rules checked.
7. **Root cause** – why it succeeded (e.g. lookalike domain not blocked, no phishing-resistant MFA).
8. **Recommendations** – with owners and dates: DMARC enforcement, awareness training, new detection rule.
9. **Notifications** – internal stakeholders; regulators such as CERT-In if required.

Write facts, not guesses; mark anything unconfirmed as such.`,
          d: 'hard',
          tip: `Interviewers often ask you to write a two-line summary; practise writing one for a sample incident.`,
        },
      ],
    },
  ],
};

export default book;
