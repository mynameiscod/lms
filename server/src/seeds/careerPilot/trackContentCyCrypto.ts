/**
 * Career-track content: Cryptography and PKI for Defenders (CY_CRYPTO_PKI), the Cybersecurity Analyst
 * track, batch CY1.
 *
 * Defensive scope only: what each primitive guarantees, how a defender checks password storage, TLS and
 * certificates, keys and leaked secrets, and how to spot cryptographic mistakes in a review. No cracking
 * walkthroughs and nothing aimed at systems the student does not own.
 *
 * Builds on Year 1's T_SECURITY_THINKING (hashing is not encryption), Year 2's T2_SECURITY_PASSWORDS
 * (salted, slow hashes), Year 3's T3_SEC_NETWORK_TLS_PROPERLY (what TLS protects) and
 * T3_SECURE_CODING_SECRETS (secrets out of the repository); those ideas are referred back to, not
 * re-taught. Every Python snippet was run with cryptography 50, bcrypt 5 and argon2-cffi 25, and every
 * openssl command against certificates generated locally; timings are from one laptop and will differ.
 *
 * The topic has one skill, CRYPTOGRAPHY_BASICS, so no checkpoint question needs ck().
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CY_CRYPTO_PKI_BUNDLES: PilotBundle[] = [
  /* ── CRYPTO_PRIMITIVES ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_CRYPTO_PRIMITIVES',
    notes: `In Year 1 you learnt that hashing is not encryption. A SOC analyst needs one step more: when a
configuration file, an alert or a vendor's security questionnaire names an algorithm, you must know
**what that primitive promises and what it does not**. Most cryptographic failures you will meet at work
are not broken maths — they are the right primitive used for the wrong promise.

## Four promises

- **Confidentiality** — only the holder of a key can read it.
- **Integrity** — any change is detected.
- **Authenticity** — you know who produced it.
- **Non-repudiation** — the producer cannot later deny it, because only they hold the signing key.

No single primitive gives all four. Read every design by asking which promise each piece provides.

## Hash functions: integrity of known data, nothing more

A hash (SHA-256, SHA-3, BLAKE2) turns any input into a fixed-size fingerprint. Change one byte and the
whole fingerprint changes:

    import hashlib
    print(hashlib.sha256(b"Q3 audit report v1").hexdigest()[:16])
    print(hashlib.sha256(b"Q3 audit report v2").hexdigest()[:16])

Run on a lab machine, two unrelated-looking 64-hex-character values come out. A hash has **no key**, so
anyone can recompute it: an attacker who changes a file can also change the hash stored next to it. A
hash proves integrity only when the expected value reaches you by a channel the attacker cannot touch —
a vendor's signed release page, a threat-intel feed, your own evidence log. That is how analysts use
them every day: file hashes as IOCs in an EDR search, and hashing a disk image when it is collected so
later analysis can prove nothing changed.

MD5 and SHA-1 still appear in tools as IOC identifiers, which is fine for **lookup**. They are broken for
**security** — practical collisions exist (two different files, same hash) — so a certificate, a signature
or a software-update check that relies on them is a finding.

## MACs: integrity plus "someone with the key made this"

An HMAC mixes a secret key into the hash. A payment gateway signs each webhook body with a shared secret;
your server recomputes it and compares. In the lab run, changing the amount from 499 to 49900 made the
check fail:

    tag = hmac.new(key, body, hashlib.sha256).hexdigest()
    hmac.compare_digest(tag, expected)      # True for the original, False for the altered body

Use **compare_digest**, not ==, so the comparison time does not leak how many characters matched. A MAC
gives integrity and authenticity between parties who share the key — but not non-repudiation, because
either side could have produced the tag.

## Symmetric encryption: one key, fast, for bulk data

AES is the standard block cipher; what matters in a configuration is the **mode**. Prefer an
**authenticated** mode — AES-GCM or ChaCha20-Poly1305 — which encrypts *and* attaches a tag so tampering
is detected. In the lab, a 29-byte record encrypted with AES-256-GCM came out 45 bytes (the 16-byte tag
added); flipping one bit of the ciphertext, or decrypting with the wrong associated data, raised
InvalidTag instead of returning garbage. Modes without a tag (CBC on its own, CTR) give confidentiality
only, and ECB leaks patterns and should never appear. The hard part of symmetric crypto is not the
algorithm, it is **the key**: who holds it, where it is stored, how it is rotated — the subject of the Keys
and Secrets lesson.

## Asymmetric crypto: a key pair

A private key that never leaves its owner, and a public key anyone may have. Two uses:

- **Key exchange** — (EC)DHE in TLS lets two strangers agree on a symmetric key over an open network.
- **Digital signatures** — RSA-PSS, ECDSA or Ed25519. Sign with the private key, verify with the public
  key. In the lab an Ed25519 signature (64 bytes) and an RSA-3072 signature (384 bytes) over an installer
  both verified, and both raised InvalidSignature when one byte was appended to the file.

Signatures give integrity, authenticity **and** non-repudiation — that is why code signing, signed
software updates and certificates use them. Asymmetric operations are slow, so real systems use them to
agree or protect a symmetric key and then switch to AES or ChaCha20 for the data. That combination is
called **hybrid encryption**, and TLS is the example you will see most.

## Names you will meet in configurations

| You see | It is | Defender's view |
|---|---|---|
| SHA-256, SHA-384, SHA-3 | hash | fine |
| MD5, SHA-1 | hash | broken for signatures and certificates |
| HMAC-SHA256 | MAC | fine |
| AES-128/256-GCM, ChaCha20-Poly1305 | authenticated symmetric | preferred |
| AES-CBC with HMAC | symmetric + MAC | acceptable if done correctly |
| DES, 3DES, RC4, any ECB | old symmetric | finding |
| RSA 2048+, ECDSA P-256, Ed25519 | signatures | fine |
| RSA 1024 | signatures | finding |
| ECDHE, X25519 | key exchange | gives forward secrecy |

Key sizes are not comparable across families: a 256-bit elliptic-curve key is roughly as strong as a
3072-bit RSA key. Quantum-safe algorithms (ML-KEM for key exchange, ML-DSA for signatures) are being
rolled out; for now an analyst only needs to recognise the names in an inventory.

## Encoding is not encryption

Base64, hex and URL-encoding are reversible by anyone without a key. An alert that says a password was
"encrypted" in a script, where the script only Base64-encodes it, is reporting a plaintext password.`,
    workedExample: `**Problem:** a Bengaluru fintech's architecture note says: "Partner webhooks are protected with SHA-256
of the body, sent in an X-Checksum header. Customer KYC documents are encrypted with AES-CBC. Release
binaries are published with an MD5 file on the same download page." The security lead asks you which
promise each control actually gives, and what to recommend.

**Step 1 — webhooks.** A plain SHA-256 of the body has no key. Anyone who can send a request can compute
the hash of their own forged body and put it in the header, so the server learns nothing about who sent
it. Promise given: none against an attacker (it only detects accidental corruption). Fix: an HMAC-SHA256
with a per-partner secret held in a secrets manager, verified with compare_digest, plus a timestamp
inside the signed body so an old request cannot be replayed.

**Step 2 — KYC documents.** AES-CBC gives confidentiality only. Someone with write access to the storage
bucket could alter ciphertext and the application would decrypt it without complaint. Fix: AES-256-GCM
with a fresh 12-byte random nonce per document and the document ID as associated data, so a ciphertext
copied onto another customer's record fails to decrypt. Then ask the real question: where does the key
live?

**Step 3 — release binaries.** A hash published on the same page as the file protects against a broken
download and nothing else: whoever can replace the binary can replace the MD5 too. MD5 is also
collision-prone. Fix: sign releases (Ed25519 or RSA-PSS) and publish the public key separately — in the
installer of the previous version, in documentation, in a package manager's key store.

**Step 4 — write it up as a table the lead can act on:**

| Control | Gives today | Should give | Change |
|---|---|---|---|
| Webhook X-Checksum | accidental-corruption check | integrity + authenticity | HMAC with per-partner key |
| KYC AES-CBC | confidentiality | confidentiality + integrity | AES-GCM, ID as associated data |
| Release MD5 | corruption check | authenticity + non-repudiation | signed releases |

**What the reviewer looks for:** that you named the missing promise, not just "use a stronger algorithm".
SHA-512 instead of SHA-256 would fix none of these three problems.`,
    mcqs: [
      mcq('A vendor sends a malware sample report listing its MD5, SHA-1 and SHA-256. Your EDR console lets you search by any of them. What is the sound way to treat the MD5 value?',
        [['Fine as a lookup key for a known sample, but never as proof that two files are identical', true],
         ['Discard it entirely, because an MD5 value is useless and will always point to the wrong file', false],
         ['Prefer it over SHA-256, because the shorter value is quicker for the EDR to search and match', false],
         ['Treat it as proof of the sample\'s origin, because the vendor computed it on their own systems', false]],
        'MD5 collisions can be crafted, so a match is not proof of identity, but as an index to find a known sample it still works and many feeds use it. It is not useless, speed is not a reason to prefer it, and no hash says anything about origin — hashes have no key.'),
      mcq('Your payment-gateway integration verifies webhooks with hmac.compare_digest(tag, expected). A colleague changes it to tag == expected "because it is simpler". What is lost?',
        [['Constant-time comparison, so response timing can no longer reveal how much of a guessed tag matched', true],
         ['The secret key, because == compares the key itself rather than the computed tag and leaks it', false],
         ['Replay protection, because compare_digest also checks that the timestamp inside the signed body is recent', false],
         ['Nothing, because Python\'s == on strings is already constant-time when both strings are hex', false]],
        'compare_digest takes the same time however many characters match; == stops at the first difference, which can leak progress to someone timing many requests. It does not touch the key, it has no idea about timestamps (replay protection is your job), and == is not constant-time.'),
      mcq('A document encrypted with AES-256-GCM is decrypted with the right key and nonce, but the record ID passed as associated data is different from the one used at encryption. What happens?',
        [['Decryption fails with an authentication error, because the associated data is covered by the tag', true],
         ['Decryption succeeds, because associated data is metadata and is not part of the encryption at all', false],
         ['Decryption returns the plaintext with the first block garbled, since the ID only seeds that block', false],
         ['Decryption succeeds but logs a warning, which the application has to check for and act upon', false]],
        'In GCM the associated data is not encrypted but it is authenticated: the tag covers it, so any change makes decryption fail (InvalidTag in Python\'s cryptography library). That is what stops a ciphertext being moved onto another record. There is no partial or warned success.'),
    ],
    checkpoint: [
      mcq('A bank\'s internal tool signs daily settlement files so that the receiving team can prove later which system produced each file. Which primitive gives that proof?',
        [['A digital signature with a private key held only by the producing system', true],
         ['An HMAC with a key shared between the producing and receiving teams', false],
         ['A SHA-256 hash of each file stored in the same folder as the file itself', false],
         ['AES-256-GCM encryption of each file under a key both teams can access', false]],
        'Only a signature gives non-repudiation, because only the producer holds the private key. With an HMAC or a shared AES key either team could have made the file; a hash stored beside the file has no key at all and can be replaced along with it.'),
      mcq('During an incident a script is found that "encrypts" a service-account password before writing it to a config file. The stored value decodes cleanly with base64 -d. How do you record this in the findings?',
        [['As a plaintext credential: Base64 is an encoding that anyone can reverse without a key', true],
         ['As weak encryption that needs a stronger algorithm such as AES before it can be accepted', false],
         ['As acceptable, since an attacker would need to recognise the format before decoding it', false],
         ['As a hashing failure, because the value should have been hashed with SHA-256 instead', false]],
        'Base64 has no key, so the credential is effectively in plaintext and must be rotated. Calling it weak encryption understates it; obscurity is not a control; and hashing is wrong for a credential the service must actually present to another system.'),
      mcq('An asset-inventory export lists a legacy VPN appliance with "3DES-CBC, SHA-1, RSA-1024" and a new load balancer with "AES-256-GCM, SHA-384, ECDSA P-256". Which items should be raised as findings?',
        [['3DES-CBC, SHA-1 for signatures, and RSA-1024 on the VPN appliance', true],
         ['Only RSA-1024, because 3DES and SHA-1 are still accepted for VPNs', false],
         ['AES-256-GCM, because GCM on a load balancer prevents traffic inspection', false],
         ['ECDSA P-256, because 256 bits is smaller than the 1024 used on the VPN', false]],
        '3DES, SHA-1 signatures and 1024-bit RSA are all retired. Elliptic-curve key sizes are not comparable with RSA sizes — P-256 is far stronger than RSA-1024 — and GCM is the preferred mode, not a finding.'),
    ],
  },

  /* ── PASSWORDS_HASHING ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_PASSWORDS_HASHING',
    notes: `Year 2 taught you to store passwords as salted, slow hashes. This lesson is the analyst's side of the
same idea: **checking** a system's password storage, explaining to a developer why their choice is
wrong, and planning the fix without forcing every user to reset.

## Why fast hashes are wrong for passwords

The threat is a stolen user table. Whoever holds it can guess passwords offline, as fast as their
hardware allows, without ever touching your login page or tripping a lockout. So the defender wants each
guess to be **expensive**. SHA-256 was designed to be fast. On one laptop core in plain Python:

    sha256: 1.34 microseconds per hash -> 743,731 per second on one core
    bcrypt cost 12: 368 ms per hash -> 2.7 per second
    argon2id defaults: 106 ms per hash

bcrypt at cost 12 was about **274,000 times slower** per guess than SHA-256 on the same machine — and
dedicated guessing hardware widens the gap further for SHA-256, because Argon2's memory cost is exactly
what that hardware is bad at. A user who logs in once pays a third of a second; someone trying a
hundred million guesses per account pays for all of them. That asymmetry is the whole point.

## Salts

A salt is a random value stored next to each hash and mixed into it. Without one, identical passwords
give identical hashes:

    unsalted md5 alice: cd84d683cc5612c69efe115c80d0b7dc
    unsalted md5 bob:   cd84d683cc5612c69efe115c80d0b7dc
    bcrypt alice: $2b$12$UINNoHAN1Tqoe4rCHNDalurWtQKC31lEl2uNMoUSG45Hm6nsQkKsC
    bcrypt bob:   $2b$12$Fn.kNctIB2sGib4vXKNZNuDaosZLtTbh.yvKar5/VVlmC9xFDZ1z.

Unsalted, one guess tests every account at once and precomputed tables work. Salted, each account must be
attacked separately. Salts are **not secret** — they sit in the stored string. bcrypt, scrypt and Argon2
generate and store them for you; if you see a developer generating salts by hand, look closely.

A **pepper** is different: a secret key (kept in a secrets manager, not the database) mixed in with an
HMAC before or after hashing, so a database-only leak is not enough to start guessing.

## The algorithms to accept

- **Argon2id** — first choice. Tunable memory, time and parallelism. argon2-cffi's defaults on this
  machine were m=65536 (64 MiB), t=3, p=4.
- **scrypt** — memory-hard too; fine.
- **bcrypt** — fine at cost 10 or more; the cost is in the string ($2b$12$ means 2^12 rounds). It only
  uses the first **72 bytes** of a password; bcrypt 5 in Python now raises ValueError for longer input
  rather than silently truncating.
- **PBKDF2-HMAC-SHA256** — acceptable where FIPS compliance requires it, at a high iteration count
  (OWASP's current guidance is 600,000 for SHA-256).

Not acceptable for passwords: MD5, SHA-1, SHA-256 or SHA-512 (salted or not, single round), and any
**encryption**. If the application can decrypt passwords, so can whoever steals the key.

## Verifying and upgrading in code

    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError

    ph = PasswordHasher()
    stored = ph.hash("Monsoon@2026")       # $argon2id$v=19$m=65536,t=3,p=4$...
    ph.verify(stored, "Monsoon@2026")       # True
    ph.verify(stored, "monsoon@2026")       # raises VerifyMismatchError
    ph.check_needs_rehash(stored)           # False today; True once you raise the parameters

check_needs_rehash is how a system moves to stronger settings over time: when a user logs in
successfully, you have their plaintext for a moment, so you re-hash with the current parameters and
overwrite the row.

## Checking a system's password storage

You will often get a few sample rows (with the client's permission) or a code path rather than a whole
database. The **format** of the stored value tells you most of what you need:

| Stored value looks like | Verdict |
|---|---|
| $argon2id$v=19$m=...,t=...,p=...$salt$hash | good — check the parameters |
| $2b$12$... (bcrypt) | good if the cost is 10+ |
| pbkdf2_sha256$260000$... (Django style) | algorithm fine, iterations low by today's guidance |
| 32 hex characters | probably unsalted MD5 — bad |
| 40 or 64 hex characters | probably SHA-1 or SHA-256 — bad for passwords |
| readable text, or Base64 that decodes to it | plaintext — critical |

Also check: **identical stored values across users** (proof of no salt), passwords written to logs
(search the login handler and the reverse-proxy logs), password-reset tokens stored in plaintext, and
whether the same hashing is used for API keys and PINs — a 4-digit PIN has only 10,000 values, so no hash
protects it; rate-limiting and lockout do.

## Where policy and regulation come in

India's DPDP Act expects reasonable security safeguards for personal data, and a breach that exposes
weakly hashed passwords is very hard to defend as reasonable. Banks regulated by the RBI are expected to
follow strong authentication practice. Do not quote a clause you have not read; quote OWASP's Password
Storage Cheat Sheet, which is the reference engineers and auditors actually use.`,
    workedExample: `**Problem:** an MSSP client — a Hyderabad e-commerce company — shares seven anonymised rows from its users
table during a review and asks whether storage is acceptable.

**Step 1 — classify each format.** A short script that only reads the prefix and shape of each value:

    u1001 -> argon2id (good)
    u1002 -> bcrypt cost 12 (good)
    u1003 -> bcrypt cost 6 (cost too low)
    u1004 -> pbkdf2-sha256 260,000 iterations (raise iterations)
    u1005 -> 32 hex chars - looks like unsalted MD5 (bad)
    u1006 -> 32 hex chars - looks like unsalted MD5 (bad)
    u1007 -> unknown - could be plaintext or reversible encryption (investigate)
    identical stored values: 1 (a salted scheme never produces these)

**Step 2 — read the story.** Four schemes in one table means the system has been migrated several times
and never finished. u1005 and u1006 are identical: no salt, and two users share a password. u1007 is the
most urgent — ask the developers what it is before writing anything else.

**Step 3 — plan the fix without a mass reset.** Upgrade on login:

    def login(username, password):
        u = users.get(username)
        if u["scheme"] == "md5":
            ok = hmac.compare_digest(u["hash"], hashlib.md5(password.encode()).hexdigest())
            if ok:
                u.update(hash=ph.hash(password), scheme="argon2id")
            return ok
        ...                                   # Argon2 path: verify, then check_needs_rehash

Run in the lab, a wrong password left the row as md5; the right one converted it to argon2id, and the
next login used Argon2 only. For accounts that never log in, wrap the old hash instead — store
argon2id(md5_value) and mark the scheme — so no MD5 value stays at rest; force a reset for plaintext rows.

**Step 4 — the finding.** "Password storage uses four schemes. 2 of 7 sampled rows are unsalted MD5 and 1
appears to be plaintext. Recommend Argon2id for all rows: upgrade on login, wrap the remainder now, force
reset for plaintext rows, and confirm passwords are not written to application or proxy logs."`,
    mcqs: [
      mcq('A developer argues that SHA-512 is "stronger than bcrypt because the output is longer", so the user table should use salted SHA-512. What is the best reply?',
        [['Output length is not the issue: SHA-512 is fast, so offline guessing stays cheap', true],
         ['Agree, provided the salt is at least 64 bytes so that it matches the output length', false],
         ['Agree, because a longer hash also makes the database index faster to search', false],
         ['Disagree, because SHA-512 output cannot be stored in a normal VARCHAR column', false]],
        'What protects a stolen password table is the cost of each guess. SHA-512 is designed to be fast, so salted or not it allows huge numbers of guesses per second. Salt length does not slow guessing, index speed is irrelevant, and storage is not the real objection.'),
      mcq('In a Python service using bcrypt 5, signing up with a 90-character passphrase now fails with a ValueError. What is going on?',
        [['bcrypt uses at most 72 bytes of input and the library now refuses longer input', true],
         ['The passphrase contains characters that bcrypt treats as the end of its salt', false],
         ['The cost factor is too high for a passphrase of that length and has overflowed', false],
         ['bcrypt 5 requires the passphrase to be Base64-encoded before it is hashed', false]],
        'bcrypt only processes the first 72 bytes; older libraries silently truncated, bcrypt 5 raises instead so nobody is surprised. The fix is a length limit with a clear message, or Argon2id. Cost does not depend on password length, and no encoding is required.'),
      mcq('A login service stores Argon2id hashes. Security raises the policy from 64 MiB to 128 MiB of memory. How do existing users move to the new parameters?',
        [['On each successful login, check_needs_rehash returns True and the row is re-hashed', true],
         ['All users must reset their passwords, since old hashes cannot be verified any more', false],
         ['A batch job re-hashes every stored hash with the new parameters overnight', false],
         ['Nothing changes for them; the new parameters apply only to accounts made later', false]],
        'The parameters are stored inside each hash, so old hashes still verify; after a successful verify the app has the plaintext and can re-hash. A batch job cannot do it — re-hashing needs the password, not the old hash — and leaving old rows forever defeats the policy change.'),
    ],
    checkpoint: [
      mcq('A review finds that a portal "encrypts" passwords with AES-256-GCM, with the key in a cloud key management service, so support staff can read a user\'s password back to them. What is the finding?',
        [['Passwords must be hashed with a slow algorithm; anything that can decrypt them can leak them', true],
         ['Acceptable, because AES-256-GCM is authenticated and the key is held in a managed service', false],
         ['Acceptable only if the support staff who decrypt passwords are covered by MFA and full audit logging', false],
         ['A minor issue that is fixed by rotating the AES key every ninety days through the service', false]],
        'Reversible storage means one compromise of the key path exposes every password, and no legitimate workflow needs to recover one. Strong encryption, MFA on support or key rotation do not change that a password is recoverable at all.'),
      mcq('Two rows in a sample of a users table hold exactly the same 60-character value starting with $2b$10$. What does that tell you?',
        [['Something is wrong: bcrypt adds a random salt, so even equal passwords should differ', true],
         ['Nothing: two users chose the same password, and bcrypt always gives the same output for it', false],
         ['The cost factor of 10 is too low, so bcrypt has fallen back to an unsalted mode', false],
         ['The two accounts have been merged, which bcrypt records by copying the stored value', false]],
        'bcrypt generates a fresh salt per hash, so identical stored values mean a fixed or reused salt, or a value copied between rows — both worth investigating. Equal passwords alone do not do it, bcrypt has no unsalted fallback, and copying hashes is not an account-merge mechanism.'),
      mcq('An online payments app protects a 4-digit transaction PIN by storing it as an Argon2id hash. What else does the defence depend on most?',
        [['Rate-limiting and lockout on PIN attempts, because only 10,000 PINs exist', true],
         ['A longer salt, so the 10,000 possible PINs produce many more distinct hashes', false],
         ['Raising Argon2 memory to 1 GiB, so even a stolen table cannot be guessed', false],
         ['Hashing the PIN twice, once with Argon2id and once with SHA-256 on top', false]],
        'With only 10,000 values, any hash is exhausted quickly once the table is stolen, so the real controls are online: attempt limits, lockout, and keeping the table out of reach. Salt length does not add PINs, extreme memory just slows logins, and double hashing adds nothing useful.'),
    ],
  },

  /* ── TLS_PKI ──────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_TLS_PKI',
    notes: `Year 3's "Transport Security, Properly" covered what TLS protects and how to configure it. Here you read
it as an analyst: how trust is established, how to inspect a certificate and chain, and the handful of
faults that cause most real incidents — expiry, a missing intermediate, a wrong name.

## The TLS 1.3 handshake in one paragraph

The client sends **ClientHello**: supported versions and cipher suites, a key share, and the hostname in
the **SNI** extension (in plaintext, which is why a firewall can log which site you visited even though
it cannot read the page). The server answers **ServerHello** with its own key share; both sides now derive
the same session keys by ephemeral (EC)DHE, and everything after that is encrypted — including the
server's **Certificate** and **CertificateVerify**, a signature proving it holds the certificate's private
key. **Finished** messages confirm nobody tampered with the handshake. Because the keys are ephemeral,
recording traffic today and stealing the server key next year does not decrypt it: **forward secrecy**.
TLS 1.0 and 1.1 are formally deprecated; accept 1.2 with ECDHE and AEAD suites, and 1.3.

## The chain of trust

A certificate binds a public key to names, signed by an issuer. Browsers and operating systems ship a
**trust store** of root CAs. Roots rarely sign servers directly; they sign **intermediate** CAs, which
sign **leaf** certificates. The server must send the leaf **and the intermediates**; the client supplies
the root from its store. A lab chain built with Python's cryptography library verified like this:

    with intermediate   : ['CN=netbanking.lab.internal', 'CN=Lab Issuing CA 1', 'CN=Lab Root CA']
    without intermediate: validation failed: candidates exhausted ...

and with openssl:

    $ openssl verify -CAfile root3.pem leaf3.pem
    error 20 at 0 depth lookup: unable to get local issuer certificate
    $ openssl verify -CAfile root3.pem -untrusted inter3.pem leaf3.pem
    leaf3.pem: OK

"Unable to get local issuer certificate" is the error you will see most in tickets. It means the chain
did not reach a trusted root — usually a missing intermediate on the server, sometimes a private CA that
the client was never told to trust.

## Reading a certificate

    $ openssl x509 -in portal.pem -noout -subject -issuer -dates -ext subjectAltName,basicConstraints
    subject=CN=portal.lab.internal
    issuer=C=IN, O=CodeBegun Lab, CN=CodeBegun Lab Root CA
    notBefore=Oct 26 14:10:01 2026 GMT
    notAfter=Jan 24 14:10:01 2027 GMT
    X509v3 Subject Alternative Name:
        DNS:portal.lab.internal, DNS:api.lab.internal, IP Address:127.0.0.1
    X509v3 Basic Constraints: critical
        CA:FALSE

What to check, in order:

- **SAN** — clients match the hostname against the Subject Alternative Name list, not the CN. A name
  missing from the SAN fails even if it is in the CN.
- **Validity dates** — openssl x509 -checkend 2592000 exits 1 if the certificate expires within 30 days,
  which is a one-line monitoring check.
- **Issuer** — the expected CA? A certificate for your domain from an unexpected issuer is an incident lead.
- **Basic Constraints** — a leaf must be CA:FALSE.
- **Key and signature** — ECDSA P-256 or RSA 2048+, signed with SHA-256 or better.

## Talking to a live server

    openssl s_client -connect portal.example.in:443 -servername portal.example.in -showcerts </dev/null

Read the chain at the top (depth 0 is the leaf), then the Protocol and Cipher lines, then **Verify return
code** — 0 is good; 10 is expired, 20 and 21 are chain problems, 62 is a hostname mismatch. Use
-servername always; without SNI many servers return a default certificate and you diagnose the wrong one.

A real lab observation worth remembering: run against a local test server on a laptop with an
antivirus "web shield", s_client showed the issuer as the antivirus product's own root, not the lab CA.
The antivirus was intercepting TLS and re-signing it. Corporate **TLS inspection** proxies work the same
way, with their root pushed to every managed device — so when an issuer looks wrong, first ask what sits
in the path.

## Expiry and revocation

Public certificate lifetimes are being cut in steps by the CA/Browser Forum (to 200 days from 2026,
down to 47 days by 2029), which makes automation (ACME clients such as certbot) mandatory and manual
renewal a recurring outage. Revocation — CRLs and OCSP — exists for a key that leaked, but clients check
it unreliably; short lifetimes are partly the industry's answer to that.

## The defender's uses

- **Certificate Transparency** — every public certificate is logged. Search crt.sh for your domains to
  spot certificates you did not request (a phishing look-alike or a mis-issuance).
- **Inventory and expiry monitoring** — a scheduled check across every endpoint, alerting at 30 days.
- **Spotting interception** — an issuer that is not your CA on traffic leaving your network.
- **Client-side failures** — scripts with verify=False or curl -k turn TLS into encryption to anyone.`,
    workedExample: `**Problem:** at an MSSP SOC in Hyderabad, a client's internal "netbanking-uat" portal works in Chrome but
the partner's Java batch job fails with "unable to find valid certification path". Another internal
site started failing on Monday. You are given the certificates; you only run commands against them and
against the client's own test endpoint.

**Step 1 — reproduce in isolation.** Using the lab copies, the same failure modes come out of a full TLS
handshake run in memory with Python's ssl module (no network involved):

    good cert, right name   : OK TLSv1.3 TLS_AES_256_GCM_SHA384 subject={'commonName': 'portal.lab.internal'}
    good cert, wrong name   : FAILED (c): CERTIFICATE_VERIFY_FAILED - Hostname mismatch, certificate is not valid for 'www.lab.internal'.
    expired cert            : FAILED (c): CERTIFICATE_VERIFY_FAILED - certificate has expired
    client lacks our CA     : FAILED (c): CERTIFICATE_VERIFY_FAILED - unable to get local issuer certificate
    server capped at TLS1.2 : OK TLSv1.2 ECDHE-ECDSA-AES256-GCM-SHA384
    client needs 1.3, srv 1.2: FAILED (s): UNSUPPORTED_PROTOCOL

Each production symptom maps to exactly one of these lines.

**Step 2 — the Java job.** Chrome caches intermediates it has seen elsewhere and can fetch them; Java
does not. The server sends only the leaf. Check what the server actually sends:

    openssl s_client -connect netbanking-uat.client.internal:443 \\
        -servername netbanking-uat.client.internal -showcerts </dev/null

One certificate block at depth 0 confirms it. Fix on the server: configure the **full chain** (leaf then
intermediate) — not adding the intermediate to every client.

**Step 3 — Monday's outage.** On the certificate file:

    openssl x509 -in site.pem -noout -enddate
    openssl x509 -in site.pem -noout -checkend 0 ; echo $?

The exit code 1 and a notAfter date of Sunday close the case: it expired over the weekend.

**Step 4 — prevent the next one.** A scheduled job that reads every certificate in the inventory, alerts
when -checkend 2592000 fails (30 days), checks that the chain verifies, and lists SANs so a renamed
service is caught. Report both incidents with the root cause and that check as the corrective action.`,
    mcqs: [
      mcq('A Zeek ssl.log shows the server_name field for many encrypted sessions from a workstation. How can the sensor see a hostname inside TLS?',
        [['The client sends the hostname in the SNI field of ClientHello, before encryption begins', true],
         ['Zeek decrypts each session with the server\'s private key, which the sensor has to be given', false],
         ['The hostname is read from the server certificate, which TLS 1.3 sends in plaintext', false],
         ['Zeek resolves the destination IP address back to a hostname using reverse DNS', false]],
        'SNI travels in ClientHello in the clear so the server can choose a certificate. Zeek does not decrypt anything; in TLS 1.3 the certificate is encrypted, so it is not the source; reverse DNS is a separate, unreliable lookup and not what that field records.'),
      mcq('openssl s_client against an internal site prints "Verify return code: 62 (hostname mismatch)". What is the most likely cause?',
        [['The name you connected to is not in the certificate\'s Subject Alternative Name list', true],
         ['The certificate expired, and openssl reports expiry with the hostname mismatch code', false],
         ['The server did not send its intermediate, so the chain could not reach a trusted root', false],
         ['The server only supports TLS 1.2, which openssl reports as a hostname mismatch', false]],
        'Code 62 means the name check failed: clients match against SANs. Expiry is code 10 and a missing intermediate gives 20 or 21. The protocol version has nothing to do with name matching.'),
      mcq('A threat-intel analyst searching Certificate Transparency logs finds a valid certificate for "netbanking-yourbank.in", a domain your bank does not own. What is this most useful for?',
        [['An early lead on a phishing site, to block and report before the campaign starts', true],
         ['Proof that your bank\'s own CA has been compromised and must be replaced at once', false],
         ['Nothing, because a certificate on a domain you do not own cannot affect customers', false],
         ['Revoking the certificate yourself through the CT log, which accepts owners\' requests', false]],
        'Look-alike domains often get certificates before a phishing campaign launches, so CT monitoring gives early warning to block and send takedown requests. It says nothing about your CA, it absolutely can harm customers, and CT logs are append-only records — they do not revoke.'),
    ],
    checkpoint: [
      mcq('A Java client fails against a server with "unable to find valid certification path", while browsers on the same network work fine. What do you check first?',
        [['Whether the server sends its intermediate certificate along with the leaf', true],
         ['Whether the server\'s leaf certificate uses ECDSA rather than an RSA key', false],
         ['Whether the browsers are pinned to a different TLS version than the client', false],
         ['Whether the Java client has the server\'s private key in its keystore', false]],
        'Browsers often cache or fetch a missing intermediate; most programmatic clients do not, so the classic split is a server that sends only the leaf. Key type and version would fail differently, and a client never holds the server\'s private key.'),
      mcq('In s_client output from a managed office laptop, the issuer of a public site\'s certificate is "Contoso Inspection CA", which is in the laptop\'s trust store. What is happening?',
        [['A TLS inspection proxy is decrypting and re-signing traffic with its own root', true],
         ['The public site has switched to a cheaper CA, which is common and harmless', false],
         ['The site has been compromised and is serving a forged certificate to everyone', false],
         ['The laptop\'s trust store is corrupt and is displaying the wrong issuer name', false]],
        'An issuer that is the organisation\'s own inspection CA, trusted only because it was pushed to managed devices, is the signature of TLS interception. A real CA change would show a public CA; a site-wide forgery would not chain to your company root; trust stores do not rename issuers.'),
      mcq('Why does recording a TLS 1.3 session today, and stealing the server\'s private key next year, still not let someone read that session?',
        [['Session keys came from an ephemeral key exchange that the server key never encrypted', true],
         ['The server\'s private key is rotated every day, so next year\'s key is a different one', false],
         ['TLS 1.3 records are compressed in a way that cannot be reversed without the client', false],
         ['The certificate expires within a year, so the old key is useless after that date', false]],
        'Forward secrecy: the session keys come from ephemeral (EC)DHE shares that are discarded, and the long-term key only signs the handshake. Key rotation and expiry are unrelated to past sessions, and TLS 1.3 removed compression entirely.'),
    ],
  },

  /* ── KEY_MANAGEMENT ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_KEY_MANAGEMENT',
    notes: `Year 3 taught you to keep secrets out of the repository. This lesson is what a security team builds around
that rule — where keys and secrets should live, how they rotate, and how a SOC finds the ones that leak
anyway. Strong algorithms do not save a system whose key sits in a config file on a shared drive.

## Keys and secrets are different things

- **Cryptographic keys** — an AES data key, a TLS private key, a code-signing key, a JWT signing key.
- **Secrets** — database passwords, API tokens, cloud access keys, webhook secrets, SSH keys.

Both need: minimal people and systems with access, an audit log of every use, rotation, and a plan for
the day one leaks.

## Where they live, from worst to best

1. In source code, config files or container images — readable by everyone with repository access, and
   kept forever in history.
2. Environment variables — better, but visible to anything that can read the process environment, and
   often dumped into crash reports and debug pages.
3. A **secrets manager** — HashiCorp Vault or its open-source fork OpenBao, AWS Secrets Manager, Azure Key
   Vault, GCP Secret Manager. Access by identity, every read logged, rotation built in.
4. A **KMS or HSM** for keys — the key never leaves the device; applications ask it to encrypt, decrypt or
   sign. Payment and banking systems use HSMs for PIN and card keys.

## Envelope encryption

A KMS cannot encrypt your whole database byte by byte, so systems use two layers: a **data encryption key
(DEK)** per record or file does the work, and a **key encryption key (KEK)** inside the KMS wraps the DEK.
Only the wrapped DEK is stored next to the data:

    def encrypt_record(plaintext, record_id):
        dek = AESGCM.generate_key(bit_length=256)            # fresh data key per record
        n1, n2 = os.urandom(12), os.urandom(12)
        ct = AESGCM(dek).encrypt(n1, plaintext, record_id)
        wrapped = kek.encrypt(n2, dek, b"dek:" + record_id) # in real life: a KMS Encrypt call
        return {"ct": ct, "n1": n1, "wrapped_dek": wrapped, "n2": n2}

In the lab run the stored fields were ct, n1, n2 and wrapped_dek (48 bytes: a 32-byte key plus the
16-byte tag), and decryption returned the original record. The defender's benefits: a stolen database
holds no usable key; every decryption is a logged KMS call, so bulk reads stand out; and revoking the KEK
makes the data unreadable at once.

## Rotation

Rotation limits how long a leaked key is useful. Design for it before you need it:

- Keys carry an **ID or version**, so old data says which key decrypts it.
- During rotation the system **decrypts with old and new, encrypts with new only**. The cryptography
  library's MultiFernet does exactly that; in the lab, a token made with the old key still decrypted,
  rotate() re-encrypted it under the new key, and the old key then failed with InvalidToken.
- Secrets in a manager rotate on a schedule; **long-lived cloud access keys** are replaced by short-lived
  credentials from an identity (instance roles, workload identity) wherever possible.

## Detecting leaked secrets

Secrets leak into Git history, CI logs, container images, Slack messages, tickets and paste sites. A
scanner combines **named patterns** (AWS key IDs start with AKIA, private keys have a BEGIN header) with an
**entropy** check for random-looking values assigned to names like SECRET or TOKEN. A small one in Python,
run on a sample repository built for this lesson:

    .env:1  high-entropy-secret (JWT_SECRET, H=4.94)  9f8K...8j
    app/payments.py:1  razorpay-secret  rzp_...cd
    app/settings.py:4  aws-access-key-id  AKIA...LE
    app/settings.py:5  high-entropy-secret (AWS_SECRET_ACCESS_KEY, H=4.66)  wJal...EY
    deploy/docker-compose.yml:5  hardcoded-password (POSTGRES_PASSWORD, H=3.28)  Welc...23
    deploy/notify.sh:2  slack-webhook  http...XX
    deploy/old_key.pem:1  private-key  ----...--
    7 findings

It **masks** what it prints — a scanner that writes full secrets into CI logs creates a new leak — and it
skipped the README's "change-me" placeholder and a value read from os.environ. In production use the
maintained tools: gitleaks or TruffleHog in CI and pre-commit hooks, and the platform's push protection
(GitHub secret scanning), which stops many secrets before they land.

## When a secret has leaked

1. **Revoke or rotate first.** Deleting the commit does not help — clones, forks and caches already have it.
2. **Check use.** Search the provider's audit log (CloudTrail for AWS keys, the payment gateway's
   dashboard) for use from unexpected IPs since the commit time.
3. **Then clean up** history if policy needs it, and add the pattern to the scanner.
4. **Record it.** CERT-In's 2022 directions require reporting specified cyber incidents within six hours
   of noticing them; your incident lead decides whether a leak qualifies, so tell them early.`,
    workedExample: `**Problem:** at 10:40 on a Tuesday the SOC at a Bengaluru MSSP receives a GitHub secret-scanning alert for
a client: an AWS access key ID starting AKIA was pushed to a public repository at 09:55 by a contractor.
You are on shift. Write the response.

**Step 1 — contain (minutes).** Ask the client's cloud admin to **deactivate** the key in IAM (not yet
delete it, so its last-used data stays visible). Do not wait for the contractor to remove the commit:
public repositories are scraped by automated bots within minutes of a push, so assume it has been copied.

**Step 2 — scope (the first hour).** In CloudTrail, filter by the access key ID from 09:55 onwards:

- Which API calls, from which source IPs and user agents?
- Any calls the contractor's tooling never makes — creating IAM users or access keys, launching
  instances in unusual regions, listing every S3 bucket?

Also check what the key's IAM policy allowed. A key scoped to one bucket is a smaller incident than one
with administrator access.

**Step 3 — eradicate.** Delete the key once scoping is done. Rotate anything else in the same repository
(the scanner often finds more than one). If CloudTrail shows activity from unknown IPs, treat it as a
cloud compromise: hunt for new users, keys, roles and resources created with it.

**Step 4 — fix the cause.** Why did a contractor have a long-lived key at all? Recommend short-lived
credentials (SSO for people, roles for workloads), a pre-commit hook running gitleaks, push protection on
the organisation's repositories, and a scanner run over the full history of every repository.

**Step 5 — the record.** Times (pushed 09:55, alerted 10:40, deactivated 10:47), what the key could do,
what it did, and actions taken. Pass it to the incident lead early so the CERT-In six-hour decision is
made in time, not discovered later.

**What a reviewer looks for:** revoke before cleanup, scoping from logs rather than assumptions, and a
fix that removes long-lived keys rather than "tell contractors to be careful".`,
    mcqs: [
      mcq('A developer commits a database password, notices within two minutes, and force-pushes a commit that removes it. The repository is private. What should happen next?',
        [['Rotate the password anyway, since clones, CI caches and logs may already hold it', true],
         ['Nothing more, because a force-push rewrites history and the secret no longer exists', false],
         ['Make the repository public briefly to confirm no scraper picked up the commit', false],
         ['Add the file to .gitignore, which removes it from every existing clone of the repo', false]],
        'Once pushed, a secret may be in clones, CI caches, logs and backups; rewriting history does not reach them, so rotation is the only reliable fix. Making it public creates a real leak, and .gitignore only affects untracked files going forward.'),
      mcq('An application uses envelope encryption with a cloud KMS. The application database is stolen in full. Why is the customer data still protected?',
        [['The stored data keys are wrapped by a KMS key that never left the KMS', true],
         ['The database engine encrypts its files with a key held in the operating system', false],
         ['Each record\'s nonce is secret, and without it AES-GCM cannot be decrypted', false],
         ['The data keys are hashed before storage, so they cannot be read back again', false]],
        'Only wrapped DEKs are in the database; unwrapping needs a call to the KMS with the right identity, which the thief does not have. Disk encryption does not help once the database itself is read, nonces are not secret, and hashed keys could not be used for decryption at all.'),
      mcq('Your secret scanner prints every finding with the full secret value into CI logs, which most of engineering can read. What is wrong with that?',
        [['The scanner itself copies every secret it finds into a new, widely readable place', true],
         ['Nothing, because CI logs are internal and are deleted automatically after 30 days', false],
         ['The output is too long, so the CI system truncates it and findings are lost', false],
         ['Only test secrets should be printed; production secrets need a separate scan', false]],
        'Masking matters because the log becomes another copy of the secret, readable by far more people than the original repository. Internal logs and retention do not change that; truncation is not the issue; and splitting by environment does not stop the copying.'),
    ],
    checkpoint: [
      mcq('A payment service rotates its data-encryption key every quarter. After the first rotation, records written in the previous quarter fail to decrypt. Which design step was missed?',
        [['Records were not tagged with a key ID, and old keys were not kept for decryption', true],
         ['The new key was generated with the same length as the key that it replaced', false],
         ['The rotation used AES-GCM, which cannot decrypt data written by another key', false],
         ['The key was rotated in the middle of a quarter instead of on the first day', false]],
        'Rotation means encrypt with new, decrypt with whichever key the data names; that needs a key ID on each record and old keys kept until data is re-encrypted. Key length and mode are fine, and the date of rotation is irrelevant.'),
      mcq('A secret scanner flags SESSION_SECRET=change-me in a project\'s README example. What is the reasonable handling?',
        [['Mark it as a placeholder and allow-list that exact value, not the whole file', true],
         ['Rotate the session secret in production at once, since the scanner flagged it', false],
         ['Allow-list the README file entirely, so documentation never raises findings', false],
         ['Remove the scanner\'s entropy rule, because it caused the false positive here', false]],
        'A known placeholder is a false positive; allow-listing that specific value keeps the scanner sharp. Rotating something that is not a secret wastes effort, allow-listing a whole file hides a real secret pasted there later, and removing a rule throws away true positives elsewhere.'),
      mcq('After a leaked cloud access key is deactivated, what is the most important next step for the SOC analyst?',
        [['Search the provider\'s audit log for the key\'s activity since the leak and scope it', true],
         ['Delete the repository the key was pushed to, so the evidence cannot spread further', false],
         ['Ask the developer how they used the key, and close the case if the use was normal', false],
         ['Wait for the cloud provider to email a compromise report before doing anything', false]],
        'Containment is done; now you need evidence of whether the key was used, from where and for what. Deleting the repository destroys evidence without un-leaking anything, the developer cannot know what others did with it, and waiting for the provider is not a plan.'),
    ],
  },

  /* ── CRYPTO_MISTAKES ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_CRYPTO_MISTAKES',
    notes: `Cryptography rarely fails because AES is broken. It fails because someone used it wrongly. In a code review
or a configuration audit, an analyst does not need to do the maths — they need to recognise a short list
of mistakes that keep coming back.

## 1. Home-made cryptography

XOR with a fixed string, a custom "scrambler", Base64 twice, a hand-rolled protocol. If you see a function
called encrypt that does not call a well-known library (cryptography in Python, the platform's crypto
API in Java or .NET, libsodium), that is the finding. The fix is never "make the algorithm cleverer"; it is
"use the library's high-level recipe" — Fernet or AESGCM in Python.

## 2. Weak or outdated algorithms

- MD5 or SHA-1 used in signatures, certificates or integrity checks that an attacker could target.
- DES, 3DES, RC4; RSA under 2048 bits.
- TLS 1.0/1.1, or cipher suites without forward secrecy, still enabled "for old clients".
- RSA encryption with PKCS#1 v1.5 padding where OAEP should be used.

Search configuration with plain grep: ssl_protocols, SSLCipherSuite, MinProtocol, md5, sha1, DES.

## 3. ECB mode — patterns survive

ECB encrypts each 16-byte block independently, so identical plaintext blocks give identical ciphertext.
Four blocks, three of them "STATUS=APPROVED;", encrypted in the lab:

    ECB blocks: ['0623ec2fea72', '0623ec2fea72', '0623ec2fea72', '2da5e0551dc8']
    distinct ECB blocks: 2 of 4
    distinct GCM blocks: 4 of 4

Anyone watching can tell which records match without the key. A library call with modes.ECB() — or a
Java Cipher.getInstance("AES"), whose default on most providers is ECB — is the pattern to grep for.

## 4. Reused nonces

AES-GCM and ChaCha20-Poly1305 need a **unique nonce for every message under the same key**. Reuse one
and the keystream cancels out: in the lab, with a fixed all-zero nonce, the XOR of two ciphertexts equalled
the XOR of the two plaintexts (True), which leaks the relationship between messages, and nonce reuse in GCM
also lets an attacker forge tags. Red flags in code: a nonce or IV that is a constant, a counter that
resets at restart, or nonce = b"\\x00" * 12. Use os.urandom(12) per message, or a library that handles
it (Fernet does).

## 5. Encryption without integrity

AES-CBC or CTR on its own lets an attacker change ciphertext and have the application decrypt the altered
result. Use an authenticated mode, or encrypt-then-MAC with a separate key. Similarly, a **JWT** accepted
without checking its signature, or with alg set to none, is a token anyone can write; the server must
pin the expected algorithm.

## 6. Wrong randomness

    random.seed(42); random.getrandbits(128)   # bdd640fb06671ad11c80317fa3b1799d
    random.seed(42); random.getrandbits(128)   # bdd640fb06671ad11c80317fa3b1799d — again

Python's random is predictable by design. Tokens, salts, keys and reset links must come from secrets
(secrets.token_hex, secrets.token_urlsafe) or os.urandom.

## 7. Comparing secrets with ==

Comparing an HMAC, API key or reset token with == can leak through timing how many characters matched.
Use hmac.compare_digest.

## 8. Turning verification off

    requests.get(url, verify=False)
    curl -k https://...
    ssl._create_unverified_context()

These keep encryption and drop authentication — the client will talk to anyone who intercepts it. They
creep in to "fix" a certificate error in UAT and ship to production. Fix the certificate or point the
client at the right CA bundle instead.

## 9. Hard-coded keys and secrets

A key in the source is a key for everyone with the repository, the image or the decompiled APK. Mobile
apps are the classic case: Android APKs are routinely unpacked, so an API secret in one is public.

## How to review for these

1. **Inventory** — grep for crypto imports and configuration keywords; list every place crypto is used.
2. **Purpose** — for each, which promise is needed (the first lesson's four)?
3. **Check the list above** — algorithm, mode, nonce, integrity, randomness, comparison, verification,
   key storage.
4. **Recommend the recipe**, not a parameter tweak: "use AESGCM with a random 12-byte nonce and key from
   the KMS", not "use a longer key".
5. **Add a check** — a Semgrep or linter rule (Bandit flags many of these in Python) so the mistake fails CI
   next time.

## Severity, so the report is read

Not every item is equal. Rank by what an attacker gains today: a hard-coded secret in a published app or a
predictable reset token is an account or data compromise now; disabled certificate verification and
missing integrity are exploitable by anyone in the network path; ECB, reused nonces and weak algorithms
leak or weaken data over time; a policy preference such as AES-128 instead of AES-256 is a note, not a
finding. A review that lists twenty items at the same severity gets none of them fixed.`,
    workedExample: `**Problem:** reviewing a pull request for a loan-application service, you find this helper. List the
mistakes in order of severity and give the replacement.

    import random, hashlib
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    KEY = b"LoanSvcKey2024!!LoanSvcKey2024!!"          # 32 bytes
    def protect(pan: str) -> bytes:
        enc = Cipher(algorithms.AES(KEY), modes.ECB()).encryptor()
        data = pan.encode().ljust(16, b" ")
        return enc.update(data) + enc.finalize()

    def reset_token(user_id: int) -> str:
        random.seed(user_id)
        return hashlib.md5(str(random.random()).encode()).hexdigest()

**Mistakes, worst first:**

1. **Reset tokens are predictable.** random.seed(user_id) means the token for a given user is always the
   same and anyone who knows the code can compute it. That is an account-takeover bug. MD5 does not help;
   hashing a predictable value gives a predictable hash.
2. **Hard-coded key** — anyone with the repository or the built image holds the key to every PAN.
3. **ECB** — equal PANs produce equal ciphertexts, so the table reveals which applicants share a PAN.
4. **No integrity** — a stored ciphertext can be altered without detection.

**Replacement:**

    import os, secrets
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    def protect(pan: str, applicant_id: str, key: bytes) -> bytes:   # key fetched from the KMS
        nonce = os.urandom(12)
        return nonce + AESGCM(key).encrypt(nonce, pan.encode(), applicant_id.encode())

    def reset_token() -> str:
        return secrets.token_urlsafe(32)   # store only its hash, with an expiry

**Also say:** if equal-PAN lookups are a business need, add a separate keyed HMAC of the PAN as a search
column rather than going back to ECB. Ask for a Bandit or Semgrep rule in CI for modes.ECB and seeded
random, so the next pull request is caught automatically.`,
    mcqs: [
      mcq('A Java service encrypts card tokens with Cipher.getInstance("AES") and the team says "we use AES-256, so we are fine". What do you check?',
        [['Which mode the provider defaults to, since bare "AES" is commonly ECB with no integrity', true],
         ['Whether the key length is 256 bits, because a 128-bit key would be the real weakness', false],
         ['Whether the JVM is up to date, because older JVMs implement AES-256 with a known key-schedule flaw', false],
         ['Nothing more, because AES-256 is approved and the mode does not affect the security', false]],
        'Without a mode, common providers use ECB with PKCS5 padding: no nonce, no integrity, patterns preserved. AES-128 is not the weakness, a JVM version does not change the mode, and the mode matters as much as the algorithm.'),
      mcq('A message queue encrypts each event with AES-GCM using a nonce that is a counter starting at 0, stored in memory. Why is this a finding?',
        [['After a restart the counter goes back to 0, so nonces repeat under the same key', true],
         ['A counter is too predictable; GCM nonces must be secret as well as being unique', false],
         ['GCM needs a 16-byte nonce, and a small counter value is too short to be valid', false],
         ['Counters are slower than random nonces and will reduce message throughput badly', false]],
        'A GCM nonce must be unique per key, not secret; an in-memory counter that resets on restart reuses values, which leaks plaintext relationships and allows tag forgery. Predictability is fine, 12 bytes is the standard length, and speed is not the issue.'),
      mcq('In a code review you find requests.post(url, json=body, verify=False) in a service that calls a partner bank\'s API. The developer says the traffic is still encrypted. What is the problem?',
        [['Without verification the client accepts any certificate, so an interceptor can pose as the bank', true],
         ['verify=False also turns off encryption, so the request body and API key travel in cleartext', false],
         ['verify=False makes the client fall back to TLS 1.0, which is a deprecated version', false],
         ['Nothing, provided the partner bank\'s API also requires a client-side API key', false]],
        'Encryption remains, but to whoever answers — an interceptor can present its own certificate and read or change everything, including the API key. It does not disable encryption or change the TLS version, and an API key sent to an impostor is simply stolen.'),
    ],
    checkpoint: [
      mcq('A password-reset feature generates tokens with random.choice over letters and digits, after random.seed(int(time.time())). Why is this a security bug?',
        [['Python\'s random is predictable, and a time seed makes tokens computable by anyone', true],
         ['The token alphabet has too few characters to resist a determined guessing attack', false],
         ['random.choice can return the same character twice, which weakens the token badly', false],
         ['Time-seeded tokens expire too quickly, so users cannot complete the password reset', false]],
        'random is a deterministic generator; seeded with the current second, anyone can reproduce the token by trying a few seconds around the request. Use the secrets module. The alphabet and repeated characters are not the problem, and seeding has nothing to do with expiry.'),
      mcq('A review finds a service encrypting records with AES-CBC and no MAC or signature. Records are stored in a bucket that several internal teams can write to. What is the main risk?',
        [['Ciphertext can be altered and the application will decrypt the changed data without noticing', true],
         ['CBC leaks which stored records are identical, in exactly the same way that ECB mode does', false],
         ['The records can be read by anyone with write access, since CBC uses no key', false],
         ['CBC cannot encrypt records longer than a single 16-byte block without errors', false]],
        'CBC gives confidentiality but no integrity, so anyone who can write to the bucket can tamper undetected. With a random IV, CBC does not leak equal records as ECB does; it does use a key; and it handles any length with padding.'),
      mcq('Which finding in a crypto review should be fixed first?',
        [['An API secret hard-coded in the published Android app', true],
         ['A SHA-256 hash used as a cache key for API responses', false],
         ['AES-128-GCM used where policy prefers AES-256-GCM', false],
         ['An HMAC tag compared with hmac.compare_digest', false]],
        'A published APK is effectively public, so the secret is already exposed and must be rotated and moved server-side. SHA-256 is fine as a cache key, AES-128-GCM is strong (a policy preference, not a vulnerability), and compare_digest is the correct way to compare tags.'),
    ],
  },

  /* ── DEBUGGING ────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_DEBUGGING',
    notes: `Cryptographic failures produce a few blunt errors — InvalidTag, CERTIFICATE_VERIFY_FAILED, "unable to get
local issuer certificate" — and the temptation is to make them go away by switching a check off. Each
case below is the symptom, the cause, and the fix that keeps the protection. Every output shown was
produced in the lab.

## 1. InvalidTag on every decrypt after a "harmless refactor"

**Symptom.** A service that encrypts KYC documents with AES-GCM now raises InvalidTag for every stored
document. New documents encrypt and decrypt fine.

**Cause.** The refactor changed the associated data from the record ID to the file name. GCM authenticates
the associated data, so old ciphertexts fail — exactly as the lab showed with "wrong associated data ->
InvalidTag".

**Fix.** Restore the original associated data (record ID), and if it must change, re-encrypt in a
migration. Never "fix" InvalidTag by catching it and returning the data — there is no data to return, and
the error is the integrity check doing its job.

## 2. Some logins fail after moving to bcrypt

**Symptom.** After migrating to bcrypt 5, sign-up fails for a few users with "password cannot be longer
than 72 bytes"; under the old library the same users could log in.

**Cause.** bcrypt only reads 72 bytes. The old library silently truncated; the new one raises ValueError.
Users with long passphrases (or multi-byte characters — a Devanagari character is 3 bytes in UTF-8) hit it.

**Fix.** Short term: apply the old behaviour explicitly for existing hashes so those users can still log
in, then re-hash them with Argon2id at their next login. Long term: Argon2id has no such limit.

## 3. The Java job that cannot build a certification path

**Symptom.** "unable to find valid certification path to requested target" from a partner's Java
client; browsers work.

**Cause.** The server sends the leaf only. Lab equivalent:

    $ openssl verify -CAfile root3.pem leaf3.pem
    error 20 at 0 depth lookup: unable to get local issuer certificate
    $ openssl verify -CAfile root3.pem -untrusted inter3.pem leaf3.pem
    leaf3.pem: OK

**Fix.** Configure the full chain on the server (leaf, then intermediate). The wrong fixes — importing the
leaf into the client's trust store, or disabling validation — each break again at the next renewal or
remove authentication entirely.

## 4. "Hostname mismatch" after adding an alias

**Symptom.** api.lab.internal works; the new alias www.lab.internal fails with "Hostname mismatch,
certificate is not valid for 'www.lab.internal'".

**Cause.** Clients match the name against the SAN list. The lab certificate's SANs were portal.lab.internal,
api.lab.internal and 127.0.0.1 — no www.

**Fix.** Reissue the certificate with the new name in the SAN list. Putting it in the CN does nothing.

## 5. A scanner that finds no secrets in a repository full of them

**Symptom.** The team's secret scanner reports 0 findings on a repository that the lab scanner found 7 in.

**Cause.** Two bugs: the scan skipped dot-files (so .env was never read), and the AWS pattern was written
as "AKIA[0-9a-z]{16}" — lower case — while real key IDs are upper case.

**Fix.** Scan every file except a short, explicit list of directories (.git, node_modules), and test each
rule against a fixture containing a known example (AWS's documented example key AKIAIOSFODNN7EXAMPLE is
safe to use). A detection rule without a test is a rule you hope works.

## 6. A certificate that "is fine" but expired at the weekend

**Symptom.** Monday morning outage; the certificate file "has a valid date" according to the person who
renewed it.

**Cause.** The renewed certificate was saved but the server was never reloaded, so it kept serving the old
one. The file and the live endpoint differ.

**Fix.** Check what the **server** presents (s_client -servername ... | openssl x509 -noout -enddate),
not the file on disk; make reload part of the renewal job, and monitor the live endpoint with
-checkend 2592000.`,
    mcqs: [
      mcq('After a refactor, every stored AES-GCM ciphertext fails with InvalidTag, while newly written ones decrypt. A teammate proposes catching InvalidTag and returning an empty document. What is the right response?',
        [['Find what changed in the key, nonce or associated data; the error is the integrity check working', true],
         ['Accept the change, because empty documents are safer than raising errors to users', false],
         ['Switch to AES-CBC, which does not raise InvalidTag and so will decrypt the old stored documents', false],
         ['Increase the tag length from 16 to 32 bytes so that the old ciphertexts will verify', false]],
        'InvalidTag on all old data and none of the new means an input to decryption changed — usually the associated data or key. Swallowing it loses data silently, CBC cannot decrypt GCM ciphertext and removes integrity, and the GCM tag is at most 16 bytes.'),
      mcq('A lab secret scanner finds nothing in a repository where a .env file holds JWT_SECRET. Which bug is the most likely?',
        [['The directory walk skips files whose names start with a dot', true],
         ['The entropy threshold is too high for a 32-character secret', false],
         ['The scanner reads files as UTF-8 and the .env file is ASCII', false],
         ['JWT secrets are not a type of secret that scanners look for', false]],
        'Skipping dot-files is a common bug and hides exactly the files most likely to hold secrets. A random 32-character value has high entropy (4.94 in the lab), ASCII is valid UTF-8, and JWT signing secrets are standard scanner targets.'),
      mcq('openssl x509 on the renewed certificate file shows notAfter a year away, yet clients still see an expired certificate. What do you check?',
        [['What the live endpoint presents, because the server may not have been reloaded', true],
         ['The client clocks, since a skew of a few minutes can make a valid certificate expire', false],
         ['The certificate\'s key usage, because a renewed cert must have a different key usage', false],
         ['The CA\'s CRL, because a renewed certificate is revoked until its first use', false]],
        'The file and the served certificate are different things; a renewal without a reload is a very common cause. Minute-level skew cannot turn a year-valid certificate into an expired one, key usage is unrelated, and certificates are not revoked pending first use.'),
      mcq('A new alias fails TLS with a hostname mismatch. A colleague suggests changing the certificate\'s Common Name to the alias. Why will that not work?',
        [['Clients check the Subject Alternative Name list and ignore the CN when SANs exist', true],
         ['The CN can only contain an IP address, never a DNS name, in modern certificates', false],
         ['Changing the CN of an issued certificate invalidates its signature, so it is rejected', false],
         ['The CN is only checked by browsers, and the failing clients are command-line tools', false]],
        'Modern clients match hostnames against SANs; if SANs exist the CN is not used. The CN can hold a DNS name; changing any field does break the signature, but the real fix is a reissued certificate with the alias in the SAN list; and browsers also rely on SANs.'),
    ],
  },

  /* ── PRACTICE ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_PRACTICE',
    notes: `Eight exercises, easiest first. Try each before reading the answer. Use the lab venv; run commands only
against files and certificates you generate yourself.

## 1. Which promise? (warm-up)

For each, name the primitive: (a) prove a downloaded ISO matches the one on the vendor's signed release
page; (b) let a partner prove a webhook came from them; (c) let an auditor prove later which system
produced a file; (d) keep a backup unreadable if the disk is stolen.

**Answer.** (a) hash compared with a value from a trusted channel; (b) HMAC with a shared per-partner key;
(c) digital signature; (d) authenticated symmetric encryption (AES-GCM) with the key outside the backup.

## 2. Tamper test

Encrypt "acct=00112233" with AESGCM and a random 12-byte nonce, flip one bit of the ciphertext, decrypt.

**Answer.** decrypt raises cryptography.exceptions.InvalidTag. The ciphertext is 16 bytes longer than the
plaintext (the tag). If your code printed altered plaintext, you are not using an authenticated mode.

## 3. Timing a guess

Time 100,000 SHA-256 hashes and one bcrypt hash at cost 12. Compute the ratio.

**Answer.** The lab laptop gave 1.34 µs and 368 ms, a ratio of about 274,000. Your numbers differ; the
conclusion does not — a fast hash lets an attacker with a stolen table make vastly more guesses.

## 4. Classify stored values

Classify: $2b$09$..., $argon2id$v=19$m=19456,t=2,p=1$..., 5f4dcc3b5aa765d61d8327deb882cf99,
pbkdf2_sha256$1000000$....

**Answer.** bcrypt cost 9 — raise to at least 10; Argon2id at OWASP's minimum settings — acceptable;
32 hex — unsalted MD5, bad; PBKDF2 with a million iterations — acceptable where FIPS requires it.

## 5. Build a lab chain

With cryptography.x509, create a root CA (CA:TRUE), a leaf for portal.lab.internal (CA:FALSE, SAN with
two names), and an expired leaf. Verify each with openssl verify -CAfile.

**Answer.** The good leaf prints OK; the expired one prints "error 10 at 0 depth lookup: certificate has
expired"; verifying without -CAfile gives error 20. Check the SANs with -ext subjectAltName.

## 6. Expiry check as a monitor

Write a shell line that exits non-zero if a certificate expires within 30 days.

**Answer.** openssl x509 -in site.pem -noout -checkend 2592000 — prints "Certificate will expire" and
exits 1 inside the window. Wrap it in a loop over the inventory and alert on any non-zero exit.

## 7. A scanner rule with a test

Add a rule for Slack incoming-webhook URLs to the lesson's scanner and a fixture that proves it fires, and
one that proves a plain https://slack.com link does not.

**Answer.** Pattern https://hooks\\.slack\\.com/services/[A-Za-z0-9/]+ ; the fixture with a placeholder
webhook (T00000000/B00000000/XXXX...) matches, the plain link does not. Mask the value in output.

## 8. Review a snippet

    token = hashlib.sha1(f"{user.email}{datetime.date.today()}".encode()).hexdigest()

What is wrong with this e-mail verification token, and what replaces it?

**Answer.** Anyone who knows the address can compute today's token: there is no secret and no
randomness, and SHA-1 adds nothing. Use secrets.token_urlsafe(32), store its hash with an expiry, and
compare with hmac.compare_digest.`,
    mcqs: [
      mcq('In exercise 2, a student\'s code prints readable but slightly changed plaintext after one ciphertext bit is flipped. What does that tell you about their code?',
        [['It uses an unauthenticated mode such as CTR or CBC rather than AES-GCM', true],
         ['It uses AES-GCM correctly, since GCM only detects changes to the nonce', false],
         ['It uses a 128-bit key, which cannot detect tampering the way 256-bit can', false],
         ['It reused the nonce, which makes GCM skip the tag check on decryption', false]],
        'An authenticated mode refuses to return anything when the ciphertext changes. Readable altered output means no tag is being checked. GCM covers the ciphertext, not only the nonce; key size is unrelated; nonce reuse does not disable the tag check.'),
      mcq('A colleague\'s 30-day expiry monitor runs openssl x509 -checkend 30 on every certificate. Why does it never alert in time?',
        [['-checkend takes seconds, so it only warns 30 seconds before expiry', true],
         ['-checkend takes hours, so it only warns 30 hours before expiry', false],
         ['-checkend only works on CA certificates, not on leaf certificates', false],
         ['-checkend only reports already-expired certificates, never upcoming', false]],
        'The argument is in seconds; 30 days is 2592000. It works on any certificate and does report upcoming expiry within the window. Hours is a common wrong guess.'),
      mcq('Which stored value meets current guidance for password storage without any change?',
        [['$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>', true],
         ['$2b$08$<22-char salt><31-char hash>', false],
         ['sha512$<16-byte salt>$<128 hex chars>', false],
         ['pbkdf2_sha256$10000$<salt>$<hash>', false]],
        'Argon2id with 19 MiB, t=2, p=1 is OWASP\'s minimum recommended setting. bcrypt cost 8 is below 10, a single salted SHA-512 is a fast hash, and 10,000 PBKDF2 iterations is far below today\'s 600,000 guidance.'),
      mcq('A student\'s lab leaf certificate verifies with openssl verify but fails in Python with a hostname mismatch for portal.lab.internal. What did they most likely forget?',
        [['The SubjectAlternativeName extension, having set the name only in the CN', true],
         ['The BasicConstraints extension, which must say CA:TRUE on a leaf', false],
         ['Self-signing the leaf with its own key so that its issuer matches', false],
         ['A notBefore date in the future, which Python requires on new certificates', false]],
        'openssl verify checks the chain, not names; Python also checks the hostname against SANs. A leaf must be CA:FALSE, it must be signed by the CA (not itself), and notBefore must be in the past.'),
      mcq('In exercise 8, why does replacing SHA-1 with SHA-256 not fix the e-mail verification token?',
        [['The input has no secret or randomness, so anyone can compute the token with any hash', true],
         ['SHA-256 output is too long to fit in a URL, so the link would be cut off', false],
         ['SHA-256 is broken for this purpose in the same way that SHA-1 is broken', false],
         ['It does fix it, because SHA-256 output cannot be reversed back to the e-mail address', false]],
        'The weakness is a predictable input — e-mail and date — not the hash. Anyone repeats the calculation. A 64-character hex value fits in a URL, SHA-256 is not broken, and reversing the hash is not needed when the input can be guessed.'),
    ],
  },

  /* ── INTERVIEW_QUESTION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_INTERVIEW_QUESTION',
    notes: `SOC L1/L2 interviews at MSSPs, banks and GCCs ask cryptography as **applied** questions: what would you
check, what does this error mean, what would you recommend. They are listening for clear promises
(confidentiality, integrity, authenticity) and for whether you would switch a check off to make an error
go away.

## Q1. "What is the difference between hashing, encryption and encoding?"

**Model answer.** "Encoding — Base64, hex — changes representation and anyone can reverse it; it is not
security. Encryption is reversible only with a key and gives confidentiality; authenticated modes like
AES-GCM also detect tampering. Hashing is one-way and gives a fingerprint for integrity, but with no key
anyone can recompute it, so it only proves integrity if I get the expected value from a trusted source.
For passwords I would want a slow, salted hash like Argon2id or bcrypt, never encryption."

**Follow-up:** "We find a script storing a password as Base64. What do you do?" — Treat it as plaintext:
rotate the credential, find where else it is used, move it to the secrets manager, and check the
history of the file and the logs that may have captured it.

## Q2. "A user reports a certificate warning on our internet banking site. Walk me through it."

**Model answer.** "First, is it everyone or one user? If one, I suspect their side — a wrong clock, an
antivirus or proxy doing TLS inspection, or a captive portal. I would ask for the certificate details:
the issuer tells me a lot. If it is everyone, I check what the server presents with openssl s_client
-servername — expiry, whether the name is in the SANs, whether the intermediate is sent — and compare
with the certificate we deployed. An issuer that is not our CA on our domain could be interception and is
escalated straight away."

**Follow-up:** "It turns out to be expired. What do you change so it never happens again?" — Automated
renewal, a reload step in the renewal job, and monitoring of the live endpoint with an alert 30 days out,
owned by a named team; check the whole certificate inventory for the same gap.

## Q3. "You get an alert that an AWS access key was committed to a public GitHub repo. What do you do?"

**Model answer.** "Contain first: deactivate the key immediately — bots scrape public repos within minutes,
so removing the commit is not enough. Then scope: CloudTrail for every call made with that key since the
push, source IPs and user agents, and what its policy allowed. If anything unexpected shows up, I treat it
as a cloud compromise and hunt for new users, keys and resources. Then eradicate — delete the key, rotate
anything else in that repo — and fix the cause: short-lived credentials, pre-commit scanning, push
protection. I would inform the incident lead early because of CERT-In's six-hour reporting window."

**Follow-up:** "Why deactivate rather than delete?" — Deactivating stops use but keeps the key's metadata
and last-used information visible during the investigation; delete once scoping is complete.

## Q4. "Why is SHA-256 a bad choice for storing passwords? It is secure."

**Model answer.** "It is a secure hash — for integrity, where speed is a feature. For passwords, speed is
the problem: after a breach an attacker guesses offline, and on my laptop SHA-256 managed around 740,000
hashes a second on one core in Python, against under three a second for bcrypt at cost 12. Argon2id also
costs memory, which slows dedicated hardware. Plus a per-user salt so identical passwords look different."

**Follow-up:** "How would you move an existing MD5 table to Argon2id without forcing a reset?" — Upgrade
at login after verifying the old hash; for dormant accounts, wrap the MD5 value inside Argon2id now so no
plain MD5 remains, and mark the scheme so verification knows to MD5 the input first.`,
    mcqs: [
      mcq('An interviewer asks why a webhook protected by SHA-256 of its body is not authenticated. Which answer is strongest?',
        [['A hash has no key, so whoever forges a body can compute its matching hash too', true],
         ['SHA-256 is too weak for webhooks, which need SHA-512 to resist forgeries', false],
         ['The hash would have to be encrypted with AES before being sent in a header', false],
         ['Webhooks cannot be authenticated, so the endpoint should be allow-listed', false]],
        'Authentication needs a secret only the sender has — an HMAC key or a signing key. A longer hash is still keyless, encrypting a hash is a confused design, and webhooks are routinely authenticated with HMACs (an IP allow-list is extra, not a replacement).'),
      mcq('In a mock interview, a candidate says they would fix a TLS chain error on a partner\'s client by turning off certificate verification "until the vendor fixes it". Why does that answer lose marks?',
        [['It removes server authentication, so the client will trust any interceptor at all', true],
         ['It slows the connection, because unverified TLS falls back to an older version', false],
         ['It is fine in UAT, and the candidate should have said they would do it in UAT only', false],
         ['It breaks the encryption, so the partner would receive the data in cleartext', false]],
        'Disabling verification keeps encryption but drops authentication, and such changes routinely reach production. The fix is the full chain on the server. Version and speed are unaffected, encryption stays on, and UAT-only hacks are exactly how they ship.'),
      mcq('Asked how to move from unsalted MD5 to Argon2id without a forced reset, which answer best handles accounts that never log in?',
        [['Wrap each MD5 value in Argon2id now and mark the scheme, so no bare MD5 stays at rest', true],
         ['Leave dormant accounts as they are, since nobody uses them and they pose no risk', false],
         ['Decrypt each MD5 value and re-hash the recovered password with Argon2id overnight', false],
         ['Add a salt to the existing MD5 values in place, which makes them as strong as Argon2', false]],
        'Wrapping protects dormant rows immediately; at login you compute MD5 of the input then verify with Argon2id, and can re-hash cleanly. Dormant accounts are still a breach liability, MD5 cannot be decrypted, and salting an existing hash after the fact does not slow guessing of MD5.'),
    ],
  },

  /* ── CHECKPOINT ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'CY_CRYPTO_PKI_CHECKPOINT',
    notes: `Ten questions across the whole topic: primitives and their promises, password storage, TLS and
certificates, keys and secrets, and common cryptographic mistakes. Answer from what you would do on shift,
not from memorised definitions.`,
    checkpoint: [
      mcq('A SOC playbook says to "verify the integrity" of a disk image taken from a suspect laptop. Which practice makes the later integrity check meaningful?',
        [['Hash the image at collection and record the value in the evidence log', true],
         ['Encrypt the image with AES-GCM so nobody can read it without the key', false],
         ['Hash the image only when the analysis finishes, before writing the report', false],
         ['Store the image on a RAID array so a disk failure cannot corrupt it', false]],
        'Integrity means comparing against a value recorded when the evidence was collected, kept somewhere separate. Encryption is about confidentiality, a hash taken at the end proves nothing about earlier changes, and RAID protects against hardware failure, not alteration.'),
      mcq('A partner integration signs messages with RSA-PSS. Your team verifies with the partner\'s public key. Which property do you gain that an HMAC would not give?',
        [['Proof the partner produced the message, since your team cannot make such signatures', true],
         ['Confidentiality of the message body, because RSA-PSS also encrypts the content', false],
         ['Faster verification, since RSA public-key operations are cheaper than HMAC computations', false],
         ['Protection from replay, because signatures cannot be reused for a second message', false]],
        'With a shared HMAC key either side could have made the tag; only the partner holds the RSA private key, which gives non-repudiation. Signing does not encrypt, RSA is slower than HMAC, and a signed message can be replayed unless it includes a timestamp or nonce.'),
      mcq('A dump of a users table shows 40 rows with exactly the same 32-hex-character value. What is the most likely storage scheme?',
        [['Unsalted MD5, with those users sharing one common password', true],
         ['bcrypt at a low cost factor, which repeats outputs at random', false],
         ['Argon2id with parallelism set to 1, which disables the salt', false],
         ['AES-GCM encryption, which always encrypts a value the same way', false]],
        '32 hex characters is the shape of MD5, and identical values across users means no salt — they share a password such as a default one. bcrypt and Argon2 strings have recognisable prefixes and random salts; AES-GCM with random nonces never repeats outputs.'),
      mcq('A colleague says bcrypt is safer than Argon2id "because it has been around longer". What is the better summary?',
        [['Both are acceptable; Argon2id is preferred because it also costs memory', true],
         ['bcrypt is preferred because Argon2id has known practical weaknesses', false],
         ['Neither is acceptable now, and SHA-3 has replaced both for passwords', false],
         ['Argon2id is only acceptable when a pepper is added on top of it', false]],
        'OWASP lists Argon2id first and bcrypt as acceptable; Argon2id\'s memory cost resists dedicated guessing hardware. There are no practical weaknesses that rule it out, SHA-3 is a fast hash and wrong for passwords, and a pepper is optional hardening for either.'),
      mcq('An internal site\'s certificate is valid and the chain verifies, but clients connecting to "intranet.corp.in" fail while "portal.corp.in" works on the same server. What do you check?',
        [['Whether intranet.corp.in is listed in the certificate\'s SANs', true],
         ['Whether the server supports TLS 1.3 for the intranet hostname', false],
         ['Whether the intermediate is sent only for the portal hostname', false],
         ['Whether the root CA has expired for one of the two hostnames', false]],
        'Same certificate, same chain, one name failing points at name matching: the SAN list. Protocol support and chain delivery are per server rather than per name in this setup, and a root CA does not expire for one hostname only.'),
      mcq('Which s_client result points most strongly at a missing intermediate on the server?',
        [['Verify return code: 21 (unable to verify the first certificate)', true],
         ['Verify return code: 19 (self-signed certificate in certificate chain)', false],
         ['Verify return code: 10 (certificate has expired)', false],
         ['Verify return code: 62 (hostname mismatch)', false]],
        'Codes 20 and 21 mean the leaf could not be chained up to a trusted root, which is the classic missing-intermediate symptom. 19 means the server sent a whole chain ending in a root the client does not trust (a private CA), 10 is expiry and 62 is a name problem.'),
      mcq('A secrets audit finds a database password in an environment variable, a TLS key in an HSM, and an API token in a Git repository. In what order do you act?',
        [['The token in Git first, then the environment variable; the HSM is fine', true],
         ['The HSM key first, since TLS keys protect every customer connection', false],
         ['The environment variable first, since process memory is easiest to read', false],
         ['All three at once, since they are equally exposed and equally severe', false]],
        'A secret in Git is readable by everyone with the repository and lives in its history, so rotate it first. An environment variable is weaker than a secrets manager and should move next. A key in an HSM is where it should be. They are not equally exposed.'),
      mcq('Why does envelope encryption make a key-management service\'s audit log useful to a SOC?',
        [['Every decryption needs a KMS call, so unusual bulk unwrapping is visible', true],
         ['The KMS logs every plaintext record, so analysts can see what was read', false],
         ['The KMS encrypts the database\'s own logs, so tampering with them shows', false],
         ['The KMS rejects any request from outside India, which the log records', false]],
        'Data keys must be unwrapped by the KMS, so access to data shows up as logged calls with an identity and time — a spike is a lead. The KMS never sees the records, does not encrypt database logs as part of this design, and has no inherent country restriction.'),
      mcq('A service encrypts every message with AES-GCM under one key and the nonce os.urandom(12). A reviewer flags it as nonce reuse. Is the reviewer right?',
        [['No; random 96-bit nonces are fine per key, within very large message limits', true],
         ['Yes; GCM nonces must be counters, and random nonces always collide in time', false],
         ['Yes; os.urandom is not secure randomness, so the nonces are predictable', false],
         ['No; GCM does not use a nonce, so the 12 random bytes are simply ignored', false]],
        'A fresh random 12-byte nonce per message is the standard recipe; collisions only become a concern after an enormous number of messages under one key, which is why keys are rotated. Counters are an alternative, os.urandom is the OS CSPRNG, and GCM certainly uses the nonce.'),
      mcq('During a review you find this line in a payment microservice: hmac_value == request.headers["X-Signature"]. What do you recommend?',
        [['Use hmac.compare_digest so the comparison runs in constant time', true],
         ['Use SHA-512 for the HMAC so the value is harder to guess at all', false],
         ['Base64-encode both values before comparing, so lengths always match', false],
         ['Compare lower-cased values, so differences in hex case do not fail', false]],
        'An == comparison can leak, through timing, how many leading characters matched; compare_digest removes that. A longer hash does not fix the comparison, Base64 does not make it constant-time, and case-folding is a separate (and unnecessary) concern.'),
    ],
  },
];
