/**
 * T_SECURITY_THINKING — nine units. DIRECTION: CYBERSECURITY.
 *
 * ── WHY THIS TOPIC EXISTS ─────────────────────────────────────────────────────────────────
 *
 * Cybersecurity and Cloud & DevOps shared exactly one direction topic — networking — so the two
 * plans were identical. This is the first thing that is a security student's own.
 *
 * ── THE LINE THIS TOPIC HOLDS ─────────────────────────────────────────────────────────────
 *
 * Security for beginners is often taught as tools and tricks. This topic teaches the thinking
 * instead — what is being protected, how attackers actually get in (mostly people, weak passwords,
 * untrusted input and unpatched software), and the simple defences that stop most of it — and it
 * draws the legal and ethical line early and plainly: testing anything without written permission
 * is a crime, however good the intention. Every hands-on exercise is on the student's own code
 * and machine.
 *
 * Seeded as DRAFT. Nothing here reaches a student until an admin reviews and publishes it.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SECURITY_THINKING_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T_SECURITY_THINKING_WHAT_SECURITY_PROTECTS',
    notes: `"Is it secure?" is not a question anyone can answer. "Secure against what, protecting
what?" is. Security starts by naming what is being protected.

**The three properties — the CIA triad:**

| Property | Means | Broken when |
|---|---|---|
| **Confidentiality** | Only the right people can read it | Marks leaked, passwords exposed, chats read |
| **Integrity** | Nobody can change it without permission | A grade altered, a payment amount edited |
| **Availability** | It works when it is needed | The exam portal is down on results day |

Every incident damages at least one of them. Naming which one tells you what kind of defence
was missing.

**Examples:**

- A database of student phone numbers is posted online → **confidentiality**.
- Someone changes their attendance from 60% to 90% → **integrity**.
- The college site is flooded with traffic and nobody can reach it → **availability**.
- Ransomware encrypts files and demands payment → **availability** (and often confidentiality,
  if the data is also stolen).

**Assets, threats and vulnerabilities** — the vocabulary every security discussion uses:

- **Asset** — something worth protecting: data, accounts, money, a service.
- **Threat** — someone or something that could cause harm: a thief, a disgruntled insider, a
  careless admin, a flood.
- **Vulnerability** — a weakness that lets the threat succeed: a weak password, an unpatched
  server, a form that trusts its input.
- **Risk** — how likely the harm is, and how bad it would be.

**Thinking like an attacker** is simply asking, for anything you build or use: *what is valuable
here, who would want it, and what is the easiest way in?* Attackers rarely break strong locks.
They look for the unlocked window — the reused password, the admin page with no login, the
employee who clicks a link. Most of this topic is about those windows.

**Security is a trade-off, not a maximum.** A system nobody can use is perfectly confidential
and completely useless. The job is to reduce the risks that matter most, at a cost people will
actually accept.`,
    mcqs: [
      mcq('A student changes their own marks in the college system. Which property was broken?',
        [['Integrity', true], ['Confidentiality', false], ['Availability', false], ['Authentication', false]],
        'Data was altered without permission. Nothing had to be leaked or taken offline.'),
      mcq('The results website is overwhelmed by traffic and nobody can open it. Which property is affected?',
        [['Availability', true], ['Integrity', false], ['Confidentiality', false], ['Encryption', false]],
        'The data may be intact and private; the service simply is not usable when needed.'),
      mcq('A weak password on an admin account is best described as a:',
        [['Vulnerability', true], ['Threat', false], ['Asset', false], ['Risk score', false]],
        'The weakness is the vulnerability; the person who might exploit it is the threat.'),
      mcq('Why do attackers usually go after people and passwords rather than encryption?',
        [['They are far easier ways in than breaking strong locks', true],
          ['Encryption is illegal to attack under any law', false],
          ['Passwords are stored in the same place as encryption', false],
          ['People are always online, unlike servers', false]],
        'The easiest route wins. Strong cryptography is rarely the weak point; humans and configuration are.'),
    ],
    checkpoint: [
      mcq('A leaked spreadsheet of student phone numbers is a failure of:',
        [['Confidentiality', true], ['Availability', false], ['Integrity', false], ['Redundancy', false]],
        'The data was read by people who should not have seen it.'),
      mcq('Why is "make it as secure as possible" a poor goal?',
        [['Security trades off against usability and cost', true],
          ['Maximum security is always cheap to achieve', false],
          ['Attackers ignore systems with too much security', false],
          ['Security can only be measured after an attack', false]],
        'A system nobody can use protects nothing useful. The aim is to reduce the risks that matter.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_PASSWORDS',
    notes: `Passwords are the most attacked part of almost every system — on both sides: how people
choose them, and how systems store them.

**How systems must store passwords: hashed, never in plain text, never encrypted.**

A **hash function** turns input into a fixed-size fingerprint, and it is **one-way**: you cannot
turn the hash back into the password.

    import hashlib
    hashlib.sha256(b"hello").hexdigest()
    # '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

At login, the system hashes what you typed and compares hashes. It never needs to know your
password.

**Hashing is not encryption.** Encryption is two-way — anything encrypted can be decrypted with
the key. If passwords are encrypted and the key leaks with the database, every password is
exposed. A hash has no key to steal.

**Plain SHA-256 is still not enough for passwords.** It is designed to be *fast*, and attackers
can try billions of guesses per second. Real systems use **slow, salted** password hashes —
**bcrypt**, **scrypt** or **Argon2**:

- **Slow** — each guess costs time, so guessing billions becomes impossible.
- **Salted** — a random value is added per user, so two people with the same password get
  different hashes, and precomputed tables of common hashes are useless.

**What makes a password hard to guess: length, and not being a known password.**

| Password | Why |
|---|---|
| \`P@ssw0rd1\` | Weak — a common pattern every guessing list tries early |
| \`Asha2006\` | Weak — a name and a year, both guessable |
| \`river-lamp-tiger-cloud\` | Strong — long, and not a known phrase |

Each extra character multiplies the work. Swapping \`a\` for \`@\` barely helps, because guessing
tools try those substitutions automatically.

**The three habits that matter most:**

1. **Never reuse a password.** When one site is breached, attackers try the same email and
   password everywhere — *credential stuffing*. Reuse turns one leak into many.
2. **Use a password manager** so unique, long passwords are practical.
3. **Turn on two-factor authentication**, so a stolen password alone is not enough.`,
    mcqs: [
      mcq('How should a website store its users\' passwords?',
        [['As slow, salted hashes such as bcrypt', true],
          ['In plain text, in a well-protected table', false],
          ['Encrypted with a key kept on the same server', false],
          ['As a plain SHA-256 hash without any salt', false]],
        'One-way, slow and salted — so even a stolen database gives attackers almost nothing usable.'),
      mcq('What is the key difference between hashing and encryption?',
        [['Hashing is one-way; encryption can be reversed with a key', true],
          ['Hashing is only used for images and other large files', false],
          ['Encryption produces shorter output than hashing does', false],
          ['There is no difference; the two words mean the same', false]],
        'A hash cannot be turned back; encrypted data can be decrypted by anyone holding the key.'),
      mcq('What does a salt do?',
        [['Makes identical passwords produce different hashes', true],
          ['Makes the password itself longer for the user', false],
          ['Encrypts the hash so that it cannot be read', false],
          ['Stops the password from being typed incorrectly', false]],
        'A random per-user value defeats precomputed tables and hides which users share a password.'),
      mcq('Which is the strongest password?',
        [['river-lamp-tiger-cloud', true], ['P@ssw0rd1', false], ['Asha2006', false], ['Qwerty!23', false]],
        'Length and unpredictability beat symbol substitutions, which guessing tools try automatically.'),
    ],
    checkpoint: [
      mcq('Why is reusing one password across several sites dangerous?',
        [['A breach of one site exposes all the others', true],
          ['Sites share passwords with each other by default', false],
          ['Reused passwords expire sooner than unique ones', false],
          ['Browsers refuse to save a password used twice', false]],
        'Attackers take leaked email and password pairs and try them everywhere: credential stuffing.'),
      mcq('Why is a fast hash like plain SHA-256 a poor choice for passwords?',
        [['Attackers can try billions of guesses per second', true],
          ['It produces a different hash each time it runs', false],
          ['It can only hash passwords up to eight characters', false],
          ['It can be reversed to recover the original password', false]],
        'Password hashes are deliberately slow so that guessing at scale becomes impractical.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_PHISHING',
    notes: `Most successful attacks do not start with code. They start with a message that gets a
person to do something: click a link, type a password, open a file, pay an invoice.

**Phishing** is a message pretending to be from someone you trust. It works by creating
**urgency** or **fear** so that you act before you think.

**The warning signs:**

| Sign | Example |
|---|---|
| Urgency or threat | "Your account will be closed in 24 hours" |
| A lookalike sender or link | \`support@sbi-secure-login.com\`, \`paypa1.com\` |
| A request for secrets | "Confirm your password / OTP / card number" |
| Something you did not expect | An "invoice" from a company you never used |
| A link whose real address differs from its text | Text says your bank; hovering shows another site |
| Too good to be true | "You have won a laptop — pay Rs 99 shipping" |

**Check the real link address, not the text.** On a laptop, hover over the link; on a phone,
press and hold. \`sbi.co.in.account-verify.xyz\` is a site at \`account-verify.xyz\` — the part
just before the first single slash, read from the right, is what matters.

**No real bank, college or company will ever ask for your OTP or password.** An OTP is how you
prove it is you; anyone asking for it is trying to become you.

**Variations:**

- **Spear phishing** — personalised, using your name, college or recent activity to seem real.
- **Smishing / vishing** — the same trick by SMS or phone call ("This is your bank's fraud
  team...").
- **Business email compromise** — a message "from the principal" asking the accounts office to
  pay urgently.

**What to do with a suspicious message:** do not click, do not reply. Contact the organisation
through a channel you already trust — their official app, the number on your card, the website
you type yourself — and ask. Report it to your college IT or the platform.

**Why this matters for engineers, not only users:** systems you build can make phishing easier or
harder. Clear sender domains, never asking users for secrets in email, and two-factor
authentication all reduce how often one careless click becomes a breach.`,
    mcqs: [
      mcq('A link\'s text says "sbi.co.in" but hovering shows "sbi.co.in.verify-acct.xyz". The link goes to:',
        [['A site at verify-acct.xyz, not the bank', true],
          ['The bank, since sbi.co.in appears in it', false],
          ['A secure subdomain that the bank itself owns', false],
          ['Nowhere, until the page is refreshed', false]],
        'The real domain is read from the right. Everything before it can be anything the attacker likes.'),
      mcq('Someone calling from "your bank\'s fraud team" asks for the OTP just sent to you. You should:',
        [['Refuse and hang up, since no bank asks for an OTP', true],
          ['Share it, since they already know your account', false],
          ['Share only the first half of it to be careful', false],
          ['Ask them to send another OTP and read it back', false]],
        'An OTP proves you are you. Anyone asking for it is trying to act as you.'),
      mcq('What makes a phishing message effective?',
        [['Urgency or fear that makes people act without thinking', true],
          ['Very long messages with detailed technical terms', false],
          ['Being sent only on weekends and public holidays', false],
          ['Coming from an address with no letters in it', false]],
        'Pressure is the technique. Slowing down to check is the defence.'),
      mcq('A message "from the principal" asks the accounts office to pay a supplier urgently. This is:',
        [['Business email compromise, to verify by another channel', true],
          ['A normal request that should be paid immediately', false],
          ['Spam, which the email filter always removes', false],
          ['Safe, because it came from inside the college', false]],
        'Verify through a channel you already trust — a call to a known number, not a reply to the email.'),
    ],
    checkpoint: [
      mcq('What is the safest way to check a suspicious message from your bank?',
        [['Contact the bank through its app or known number', true],
          ['Reply to the message and ask if it is genuine', false],
          ['Click the link, but do not type anything on it', false],
          ['Forward it to friends to ask what they think', false]],
        'Use a channel you already trust, never one supplied by the suspicious message itself.'),
      mcq('How can an engineer building a system reduce phishing risk?',
        [['Add two-factor authentication and never ask for secrets by email', true],
          ['Make every email look as urgent as possible to be noticed', false],
          ['Use longer email subjects that describe the whole issue', false],
          ['Send all messages from a different domain each time', false]],
        'Design choices decide whether one careless click becomes a breach.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_UNTRUSTED_INPUT',
    notes: `Almost every serious web vulnerability comes from one mistake: **treating input from a
user as if it were part of your own code.**

**SQL injection, from one line.** A login check built with string formatting:

    query = f"SELECT * FROM users WHERE name = '{name}' AND pw_hash = '{pw_hash}'"

A normal user types \`asha\`. The query reads as intended. But suppose the name typed is:

    ' OR '1'='1' --

The query becomes:

    SELECT * FROM users WHERE name = '' OR '1'='1' --' AND pw_hash = '...'

\`'1'='1'\` is always true, and \`--\` turns the rest of the line into a comment — the password
check is gone. The user's text has become **part of the SQL**.

**The fix is not filtering quotes. It is keeping data separate from code:**

    conn.execute(
        "SELECT * FROM users WHERE name = ? AND pw_hash = ?",
        (name, pw_hash),
    )

With a **parameterised query**, the database receives the SQL and the values separately. Whatever
the user types is only ever a value. \`' OR '1'='1' --\` is looked up as a very strange name,
and nothing matches.

**Why not just remove quotes?** Because blocklists always miss something — other encodings,
other characters, other databases' syntax. Separation removes the whole category of problem
instead of chasing examples of it.

**The same idea, elsewhere:**

| Where the input lands | Vulnerability | The separation that fixes it |
|---|---|---|
| A SQL query | SQL injection | Parameterised queries |
| An HTML page | Cross-site scripting (XSS) | Escape output; use the framework's templates |
| A shell command | Command injection | Pass arguments as a list, never build a command string |
| A file path | Path traversal (\`../../etc\`) | Allow only known names; never join raw input into paths |

**Validate on the server, always.** Client-side checks help honest users; attackers send requests
directly and skip them.

**Practise this only on your own code.** Build a tiny login with SQLite, break it with the input
above, then fix it with parameters. Trying injection strings against a website you do not own is
illegal, whatever the reason.`,
    mcqs: [
      mcq('What is the root cause of SQL injection?',
        [['User input being treated as part of the SQL code', true],
          ['Databases that do not have a password set on them', false],
          ['Using SELECT queries instead of stored procedures', false],
          ['Allowing users to choose very long usernames', false]],
        'Once input can change the structure of a query, the attacker writes part of your code.'),
      mcq('Why does the input `\' OR \'1\'=\'1\' --` bypass a formatted login query?',
        [["It makes the condition always true and comments out the rest", true],
          ['It is the default password for every database', false],
          ['It crashes the database, which then lets anyone in', false],
          ['It encrypts the query so the check cannot be read', false]],
        'The OR makes the WHERE true for every row; the -- removes the password condition.'),
      mcq('What is the correct defence against SQL injection?',
        [['Parameterised queries that pass values separately', true],
          ['Removing every quote character from user input', false],
          ['Hiding error messages from users of the site', false],
          ['Limiting usernames to twenty characters or fewer', false]],
        'Separation removes the whole class of problem; blocklists only remove the examples someone thought of.'),
      mcq('User input is shown on a web page without escaping. The risk is:',
        [['Cross-site scripting, where the input runs as script', true],
          ['SQL injection into the page\'s own database', false],
          ['The page loading more slowly for other users', false],
          ['The input being stored twice in the database', false]],
        'The same mistake in a different place: data allowed to become code, this time in the browser.'),
    ],
    checkpoint: [
      mcq('Which query is safe from SQL injection?',
        [['conn.execute("SELECT * FROM users WHERE name = ?", (name,))', true],
          ['conn.execute(f"SELECT * FROM users WHERE name = \'{name}\'")', false],
          ['conn.execute("SELECT * FROM users WHERE name = \'" + name + "\'")', false],
          ['conn.execute("SELECT * FROM users WHERE name = \'%s\'" % name)', false]],
        'Only the parameterised version keeps the value out of the SQL text.'),
      mcq('You want to see SQL injection working. The legal way is:',
        [['On a small app you built yourself, on your own machine', true],
          ['On your college portal, since you are a student there', false],
          ['On any site, as long as you do not steal any data', false],
          ['On a big company site, since they can afford to fix it', false]],
        'Intent does not make unauthorised testing legal. Your own code is the right target.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_LEAST_PRIVILEGE',
    notes: `**Least privilege: every user, program and account gets only the access it needs to do
its job — and nothing more.**

The reason is simple: when something goes wrong — a stolen password, a buggy program, a careless
click — the damage is limited to what that account could do.

**Where it applies:**

| Thing | Least privilege looks like |
|---|---|
| People | A teacher can edit their own class's marks, not every class's |
| Your own computer | Daily work as a normal user, not an administrator |
| Files | A config file with passwords readable only by the program that needs it |
| Databases | The web app's database user can read and write its tables, not drop them or create users |
| Programs and API keys | A key that can only read, if reading is all the program does |
| Cloud accounts | Separate roles, not one shared root login for everyone |

**File permissions on Linux** (you met these in the Files topic):

    -rw-------  1 asha  asha  secrets.env     # only the owner can read or write
    -rwxr-xr-x  1 asha  asha  script.sh       # everyone can read and run it

\`chmod 600 secrets.env\` makes a file private to its owner. A file of passwords that is readable
by every user on a shared server is an open door.

**Why admin-by-default is dangerous.** Running daily work as an administrator means anything you
run — including malware you did not notice — runs with full power over the machine. As a normal
user, the same malware is contained.

**Access should be removed, too.** A student who graduates, an intern who leaves, a project that
ends: their accounts and keys should go. Old accounts that nobody watches are a favourite way in.

**Separation of duties** is least privilege for processes: the person who requests a payment
should not also be the one who approves it. One compromised account then cannot complete the
harm alone.

**The trade-off** is convenience. Giving everyone admin rights is faster today and very expensive
the day something goes wrong. Good systems make the right amount of access easy to grant — and
easy to take away.`,
    mcqs: [
      mcq('What is the principle of least privilege?',
        [['Give each user or program only the access it needs', true],
          ['Give every user the same access to keep things fair', false],
          ['Give administrators access to all passwords', false],
          ['Give new users full access until they are trusted', false]],
        'Limiting access limits the damage when any single account is misused or stolen.'),
      mcq('Which file mode keeps a secrets file private to its owner on Linux?',
        [['600', true], ['777', false], ['755', false], ['644', false]],
        'rw------- — the owner may read and write; nobody else may do anything.'),
      mcq('Why should a web app\'s database user not be allowed to drop tables?',
        [['A bug or attack through the app then cannot destroy data', true],
          ['Dropping tables is slower when the app is running', false],
          ['Databases do not allow apps to drop tables anyway', false],
          ['It makes the app use less memory while running', false]],
        'If the app is ever compromised, the attacker only gets what the app\'s account could do.'),
      mcq('An intern leaves, but their account stays active. The main risk is:',
        [['An unwatched account that could be used to get in', true],
          ['The account using up licences that cost money', false],
          ['Their old files making the server run slower', false],
          ['Nothing, since the intern no longer works there', false]],
        'Accounts nobody watches are a common way in. Access should be removed when the need ends.'),
    ],
    checkpoint: [
      mcq('Why is doing daily work as an administrator risky?',
        [['Anything you run, including malware, runs with full power', true],
          ['Administrators are not allowed to browse the internet', false],
          ['It makes the computer run noticeably more slowly', false],
          ['Administrator accounts cannot use password managers', false]],
        'As a normal user, the same malicious program would be contained.'),
      mcq('The person who requests a payment also approves it. What principle is missing?',
        [['Separation of duties', true], ['Encryption at rest', false],
          ['Two-factor login', false], ['Password rotation', false]],
        'Splitting the steps means one compromised account cannot complete the harm alone.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_PATCHING_AND_ETHICS',
    notes: `Two things every security student must understand early: most damage comes from
**known** problems, and testing without **permission** is a crime.

**Known vulnerabilities cause most breaches.** When a flaw is found in popular software, it is
published with an identifier — a **CVE** (for example, CVE-2021-44228, "Log4Shell") — and the
vendor releases a fix. From that moment, attackers scan the internet for anyone who has *not*
applied it. Many serious breaches used a flaw that had been fixed months earlier.

**So patching is one of the most effective defences there is:**

- Keep your operating system, browser and apps updated — turn on automatic updates.
- Keep the libraries in your projects updated; tools like \`pip list --outdated\`, \`npm audit\` and
  GitHub's Dependabot warn you.
- Remove software you no longer use: it still needs patching, and nobody remembers to.

**Why organisations patch slowly** — and why it is still worth it: an update might break
something, so it needs testing. The answer is a routine, not avoidance: test quickly, patch
promptly, and prioritise flaws that are being actively exploited.

**Ethics and the law.** In India, accessing a computer system without authorisation is an
offence under the **Information Technology Act, 2000** (Sections 43 and 66), and most countries
have equivalent laws. **"I was only testing"**, **"I did not steal anything"** and **"I was going to
tell them"** are not defences.

**What makes security testing legal:**

1. **Written permission** from the owner of the system.
2. A clear **scope** — exactly which systems and which kinds of tests.
3. **Staying inside the scope**, and stopping if you find something outside it.
4. **Reporting** what you find to the owner, and nobody else.

**Legal ways to practise:**

- Your own machines and your own code.
- Deliberately vulnerable practice apps you run yourself (OWASP Juice Shop, DVWA).
- Capture-the-flag (CTF) competitions and training platforms built for this.
- **Bug bounty** programmes, which publish rules and scope, and pay for reported flaws.

**If you find a flaw by accident** in a real site, do not explore further. Report it through the
organisation's security contact or its responsible-disclosure page, and share it with nobody else.`,
    mcqs: [
      mcq('What is a CVE?',
        [['A public identifier for a known vulnerability', true],
          ['A type of encryption used for passwords', false],
          ['A law about computer crime in India', false],
          ['A tool for scanning networks for devices', false]],
        'CVE identifiers let everyone refer to the same flaw — and let attackers know what to look for.'),
      mcq('Why do attackers target known, already-fixed vulnerabilities?',
        [['Many systems have not yet applied the fix', true],
          ['Fixed flaws are always easier to use than new ones', false],
          ['Vendors publish the passwords with each fix', false],
          ['Fixes stop working a few weeks after release', false]],
        'Between a fix being published and being applied, a system is exposed to anyone who read the notice.'),
      mcq('Which is a legal way to practise attacking web applications?',
        [['Running a deliberately vulnerable app like Juice Shop yourself', true],
          ['Testing your college website during the holidays', false],
          ['Testing a shopping site if you tell them afterwards', false],
          ['Testing any site as long as you take no data', false]],
        'Your own systems, practice apps, CTFs and scoped bug bounties are the legal routes.'),
      mcq('Which command warns about vulnerable packages in a Node project?',
        [['npm audit', true], ['npm start', false], ['npm init', false], ['npm run build', false]],
        'Dependency checks turn "keep libraries patched" from a good intention into a routine.'),
    ],
    checkpoint: [
      mcq('What makes a security test legal?',
        [["Written permission and a defined scope from the owner", true],
          ['Good intentions and not taking any data away', false],
          ['Telling the owner about the flaws afterwards', false],
          ['Using only free tools that anyone can download', false]],
        'Intent and disclosure afterwards do not replace authorisation before.'),
      mcq('You notice by accident that a site shows other users\' data. You should:',
        [['Stop, and report it through its security contact', true],
          ['Explore further to understand how bad the flaw is', false],
          ['Post it publicly so the company is forced to act', false],
          ['Download some records as proof before reporting', false]],
        'Going further, or sharing it, turns an accidental discovery into unauthorised access.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_DEBUGGING',
    notes: `Finding security flaws is mostly careful reading. Before anything can be exploited, it
has to be *noticed* — and most flaws in beginner code follow a handful of patterns.

**Read code asking three questions:**

1. **Where does input come from?** Forms, URLs, files, other programs — anything the program did
   not create itself.
2. **Where does that input go?** Into SQL, HTML, a shell command, a file path, a decision about
   access?
3. **Is it checked or separated on the way?**

**The patterns to recognise:**

| Pattern in code | Flaw |
|---|---|
| \`f"SELECT ... '{user_input}'"\` | SQL injection |
| \`os.system("ping " + host)\` | Command injection |
| \`open("uploads/" + filename)\` | Path traversal (\`../../\`) |
| \`if request.args.get("admin") == "true":\` | Trusting the client for access decisions |
| \`API_KEY = "sk-live-..."\` in the source | Secret committed to code (and to Git history) |
| \`hashlib.md5(password)\` | Weak, fast, unsalted password hashing |
| \`except: pass\` around a login check | Errors silently treated as success |
| \`debug=True\` on a public server | Code and internals shown to anyone |

**Example.** This handler has two flaws:

    @app.get("/download")
    def download():
        name = request.args.get("file")
        return open("reports/" + name).read()

1. \`file=../../app.py\` walks out of \`reports/\` and reads the source code — **path traversal**.
2. Anyone can call it — there is **no check** that the caller may see that report.

The fix: allow only known report names, and check who is asking.

**Secrets in Git** deserve special mention. Deleting a committed key in a later commit does not
remove it — it stays in the history. The only fix is to **revoke the key** and issue a new one.
Keep secrets in environment variables or a \`.env\` file listed in \`.gitignore\`.

**Name the flaw before fixing it.** "This is path traversal because user input is joined into a
file path" is a finding someone can act on. "This looks unsafe" is not.`,
    mcqs: [
      mcq('`open("uploads/" + filename)` with a user-supplied filename allows:',
        [['Path traversal, reading files outside uploads', true],
          ['SQL injection into the uploads database', false],
          ['Cross-site scripting in the uploaded file', false],
          ['Nothing, because open only reads files', false]],
        'A name like ../../app.py walks out of the folder. Allow known names instead.'),
      mcq('An API key was committed to Git and deleted in the next commit. What must happen?',
        [['Revoke the key and issue a new one', true],
          ['Nothing, since the key was deleted in time', false],
          ['Rename the file that contained the key', false],
          ['Make the repository private from now on', false]],
        'The key is still in the history. Only revoking it makes the leaked copy useless.'),
      mcq('`if request.args.get("admin") == "true":` grants admin access. The flaw is:',
        [['Trusting a value the client can set to anything', true],
          ['Using a string where a boolean should be used', false],
          ['Reading the query string instead of the body', false],
          ['Comparing with == instead of using is', false]],
        'Anyone can add ?admin=true to the URL. Access decisions come from the server\'s own records.'),
      mcq('`os.system("ping " + host)` with user input for host is vulnerable to:',
        [['Command injection', true], ['Path traversal', false], ['Phishing', false], ['Session fixation', false]],
        'Input like "8.8.8.8; rm -rf ~" runs a second command. Pass arguments as a list instead.'),
    ],
    checkpoint: [
      mcq('What are the three questions to ask when reading code for flaws?',
        [['Where input comes from, where it goes, and whether it is checked', true],
          ['Who wrote it, when it was written, and how long it is', false],
          ['Which language it uses, and which framework and version', false],
          ['How fast it runs, how much memory, and how it is tested', false]],
        'Following untrusted input from source to destination finds most beginner flaws.'),
      mcq('Where should a secret like an API key be kept in a project?',
        [['In an environment variable, with .env listed in .gitignore', true],
          ['In the source code, inside a clearly named constant', false],
          ['In the README, so that other developers can find it', false],
          ['In a comment next to the code that happens to use it', false]],
        'Anything committed to the repository should be assumed public, including its history.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_PRACTICE',
    notes: `No new ideas. Work through scenarios, messages and code until naming the property, the
flaw and the fix is quick.

**Scenarios — name the property broken (C, I or A) and one defence:**

1. A former employee's account is used to download customer data.
2. A student edits the price field in a request and buys a course for Rs 1.
3. The college website goes down when results are published.
4. A laptop with unencrypted student records is left on a train.

**Messages — phishing or genuine, and which sign decides it?**

5. "Your college email will be deleted today. Log in here to keep it."
6. An SMS with an OTP you requested a minute ago, from your bank's usual sender.
7. "Hi, it's the HOD. I'm in a meeting — can you buy gift cards and send me the codes?"

**Code — name the flaw and write the fix** (on your own machine only):

8. A login that builds its SQL with an f-string.
9. A download route that joins a filename from the URL onto a folder.
10. A config file committed to Git containing a database password.

**For each, write one line:**

| Item | Property / flaw | Evidence | Fix |
|---|---|---|---|
| 1 | | | |

**The habit this practises:** evidence first. "Phishing, because the link's real domain is
not the college's" is a finding. "It looks suspicious" is a feeling.`,
    mcqs: [
      mcq('A student edits the price in a request and buys a course for Rs 1. Which property is broken, and the fix?',
        [['Integrity; the server must look up the real price', true],
          ['Availability; the server should add more capacity', false],
          ['Confidentiality; the price should be encrypted', false],
          ['None; the student paid what the request said', false]],
        'The server trusted a value the client controls. Prices come from the server\'s own records.'),
      mcq('"Hi, it\'s the HOD, I\'m in a meeting — please buy gift cards and send the codes." This is most likely:',
        [['A scam relying on authority and urgency', true],
          ['A genuine request that should be done quickly', false],
          ['A test email that the college IT sent out', false],
          ['Safe, because it mentions the HOD by title', false]],
        'Gift cards, urgency and an unusual request from "a senior" are a classic pattern. Verify by phone.'),
      mcq('A laptop with unencrypted student records is left on a train. The defence that limits the harm is:',
        [['Full-disk encryption on the laptop', true],
          ['A longer password on the college website', false],
          ['A faster internet connection for the laptop', false],
          ['Keeping the records in a separate folder', false]],
        'With the disk encrypted, a lost laptop is a lost device, not a data breach.'),
      mcq('A former employee\'s account is used to take customer data. Which practice was missing?',
        [['Removing access when the person left', true],
          ['Encrypting the network connection', false],
          ['Using a stronger hashing algorithm', false],
          ['Running the server in debug mode', false]],
        'Least privilege includes taking access away once it is no longer needed.'),
      mcq('Which is a proper security finding?',
        [['Path traversal: the filename from the URL is joined into a path', true],
          ['This code looks unsafe and should be looked at by someone', false],
          ['There might be something wrong somewhere in this route', false],
          ['The route is old, so it probably has security problems', false]],
        'A finding names the flaw and the evidence, so someone else can confirm and fix it.'),
    ],
    checkpoint: [
      mcq('An SMS contains an OTP you requested a minute ago from the usual sender. It is most likely:',
        [['Genuine, since you expected it and nobody is asking for it', true],
          ['Phishing, because every OTP message is suspicious', false],
          ['A scam, because it arrived within one minute', false],
          ['A test message sent by your mobile provider', false]],
        'Expected, from the usual sender, and not asking you to share anything — the opposite of the warning signs.'),
      mcq('A database password is found in a config file in the Git history. The first action is:',
        [['Change the database password immediately', true],
          ['Delete the config file in a new commit', false],
          ['Rename the repository to hide the history', false],
          ['Add a comment warning people not to use it', false]],
        'The old password is exposed for good; only changing it removes the risk.'),
    ],
  },
  {
    unitCode: 'T_SECURITY_THINKING_MINI_PROJECT',
    notes: `A written security review of a small app — the kind of document a security engineer
produces before a system goes live.

**Why a review rather than an attack.** Finding flaws is only useful if they are explained,
prioritised and fixed. A review practises the whole job: understanding what the system protects,
finding where it is weak, judging which weaknesses matter most, and recommending fixes someone can
act on. It is also entirely legal: the target is an app you build or run yourself.

**What the review covers:**

- **Assets** — what the app holds that is worth protecting
- **Entry points** — every place input arrives: forms, URLs, files, logins
- **Findings** — each flaw, with evidence
- **Risk** — how likely, how bad, and so how urgent
- **Fixes** — specific, and in priority order

**Build it in this order:**

1. **Choose the target**: your own Flask app from the Backend topic, a small app you write for
   this, or a practice app like OWASP Juice Shop running on your own machine.
2. **List assets and entry points** before looking for anything.
3. **Walk each entry point** with the three questions: where input comes from, where it goes,
   whether it is checked.
4. **Rate and order the findings.**
5. **Fix the top two** and show the before and after.

**Resist the long list.** Five findings, each with evidence, a risk rating and a working fix,
are worth more than thirty unexplained ones copied from a scanner.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Security Review',
      description: 'Review a small app you own or run yourself: list its assets and entry points, find and evidence its flaws, rate their risk, and fix the two most serious. Assessed on reasoning and evidence, not on the number of findings.',
      instructions: `**The brief**

Review ONE of these — **only systems you own or run yourself**:

- Your own **Flask API** from the Backend topic, or a small app you write for this project
- **OWASP Juice Shop** or **DVWA**, running locally on your own machine
- A small intentionally flawed app your instructor provides

Testing any other system, including your college's, is not allowed and will not be marked.

**Requirements**

1. **Scope statement**: exactly what you reviewed, on which machine, and confirmation that you
   own or were given it for this purpose.
2. **Assets**: what the app holds that is worth protecting, each with the property that matters
   most (C, I or A).
3. **Entry points**: every place input arrives.
4. **At least five findings**, each with: the flaw's name, the evidence (code or request and
   response), and which property it threatens.
5. **A risk rating** for each finding (likelihood × impact, High / Medium / Low), with one line
   of reasoning.
6. **Fixes** for every finding, in priority order.
7. **Two fixes implemented**, with before-and-after evidence that each worked.

**What to submit**

1. The review document (roughly 1,000–1,500 words), with a findings table:

   | # | Finding | Evidence | Threatens | Likelihood | Impact | Risk | Fix |
   |---|---|---|---|---|---|---|---|

2. Before-and-after code or screenshots for the two fixes you implemented.
3. A **reflection** (200–300 words): which finding surprised you, which fix was harder than
   expected, and one thing you would now build differently from the start.

**Constraints**

- Only systems within your written scope.
- No finding without evidence.
- No scanner output pasted as a finding; if a tool helped, say so and show your own check.

**Where the marks are.** Evidence and prioritisation. Five well-evidenced findings in the right
order, with two working fixes, score well above a long list without reasoning.`,
      rubric: [
        {
          criterion: 'Scope, assets and entry points',
          description: 'Clear, lawful scope; assets named with the property that matters; every input entry point listed.',
          maxPoints: 15,
        },
        {
          criterion: 'Findings and evidence',
          description: 'At least five genuine flaws, each correctly named, evidenced with code or request/response, and tied to a property.',
          maxPoints: 30,
        },
        {
          criterion: 'Risk and prioritisation',
          description: 'Sensible likelihood and impact for each finding with reasoning; fixes ordered by risk.',
          maxPoints: 20,
        },
        {
          criterion: 'Implemented fixes',
          description: 'Two fixes that address the root cause (for example parameters, not quote-stripping), with before-and-after evidence.',
          maxPoints: 20,
        },
        {
          criterion: 'Reflection and ethics',
          description: 'Honest reflection on surprises and design lessons; scope respected throughout; tools acknowledged.',
          maxPoints: 15,
        },
      ],
      totalPoints: 100,
    },
  },
];
