/**
 * T2_SECURITY — ten units. Year 2.
 *
 * ── THE STANCE THIS TOPIC TAKES ───────────────────────────────────────────────────────────
 *
 * This is secure coding, not offensive security. That belongs to the security track, where it comes
 * with the law and the ethics attached. Every student takes this topic, whatever direction they
 * choose, because every one of them will write code that handles somebody else's data.
 *
 * The aim is not a checklist. It is the habit of asking "what would go wrong here, and who would
 * want it to" before shipping — and the small number of defences that prevent most of what actually
 * happens to real applications.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const SECURITY_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'T2_SECURITY_THREAT_THINKING',
    notes: `Security begins with three questions, asked before any defence is chosen. Skipping them
produces systems with an expensive lock on one door and another standing open.

**1. What is worth protecting?** Personal data, credentials, money, availability, reputation. Be
specific: "user data" is not an answer; "email addresses, phone numbers and order history for 40,000
customers" is.

**2. Who would want it, and what can they do?**

| Who | Wants | Effort they will spend |
|---|---|---|
| Automated scanners | Anything easy, at scale | None — they scan everybody |
| Opportunists | Whatever a known exploit gives | Minutes |
| A motivated individual | Something specific to you | Days |
| An insider | What their access already allows | Already inside |

**Most attacks are the first row.** Scanners find a known vulnerable dependency, an exposed admin
page, a default password. Nobody chose you; you were simply reachable.

**3. Where are the ways in?** Every input is a way in: forms, URLs, headers, uploaded files, API
calls, third-party libraries, the admin panel, and anybody with a laptop and a password.

**Thinking like an attacker, on your own system:** what happens if I change the id in this URL to
somebody else's? If I submit this form without the page? If I upload a file that is not an image? If
I send a negative quantity? Those four questions find real bugs in most student projects.

**Defence in depth.** Assume each layer will fail: validate in the browser *and* on the server *and*
constrain in the database. A single defence is a single point of failure.

**Least privilege.** Every account, service and token gets the minimum it needs. A leaked read-only
key is an incident; a leaked admin key is a catastrophe.

**Security is a trade-off, not an absolute.** Perfect security is an unusable system. The judgement
is proportionality: what this protects, against what it costs the people using it.`,
    mcqs: [
      mcq('Most real attacks on small applications come from:',
        [['Automated scanners finding something known to be weak', true],
          ['A motivated individual targeting that system', false],
          ['An insider misusing their access', false],
          ['A competitor seeking commercial data', false]],
        'Nobody chose you; you were simply reachable.'),
      mcq('"Defence in depth" means:',
        [['Assuming each layer fails, so several exist', true],
          ['Choosing the strongest available defence', false],
          ['Encrypting data at every stage', false],
          ['Reviewing security at every sprint', false]],
        'A single defence is a single point of failure.'),
      mcq('Least privilege means every account and token gets:',
        [['The minimum access it needs to work', true],
          ['Access reviewed once a year', false],
          ['A separate password per system', false],
          ['Read access by default, write on request', false]],
        'A leaked read-only key is an incident; an admin key is a catastrophe.'),
      mcq('"What is worth protecting?" is answered badly by:',
        [['"User data", without saying which data', true],
          ['A list of the fields stored per customer', false],
          ['The credentials and payment details held', false],
          ['Availability during the ordering window', false]],
        'Specificity is what makes the rest of the analysis possible.'),
    ],
    checkpoint: [
      mcq('Changing the id in a URL to somebody else\'s tests for:',
        [['Missing ownership checks on the server', true],
          ['Injection through the URL path', false],
          ['A weak session cookie', false],
          ['An outdated dependency', false]],
        'One of four questions that find real bugs in most student projects.'),
      mcq('Security is described as a trade-off because:',
        [['Perfect security produces an unusable system', true],
          ['Defences are too expensive to implement', false],
          ['Some risks cannot be identified', false],
          ['Users refuse most security measures', false]],
        'The judgement is proportionality to what is being protected.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_AUTHN_AUTHZ',
    notes: `Two different questions, and confusing them is behind one of the most commonly exploited
categories of web vulnerability.

**Authentication: who are you?** A password, a token, a code from an app.

**Authorisation: what may you do?** Your role, what you own, what your plan includes.

**Broken access control is the failure this unit exists to prevent.** The user is authenticated
perfectly and still allowed to do something they should not:

    GET /api/orders/1043         # my order — fine
    GET /api/orders/1044         # somebody else's — also returns it

That is an **insecure direct object reference**, and it appears in a large share of real breaches
because it is invisible in the interface. The application never shows a link to order 1044, so
nobody notices that typing it works.

**The fix is a check on every request that touches a specific object:**

    order = Order.get(order_id)
    if order is None or order.customer_id != current_user.id:
        return 404                 # not 403 — do not confirm it exists

**Hiding the button is not authorisation.** An interface that hides the delete control from ordinary
users, with no server check behind it, is protected by nothing at all: the request can be sent
directly. Every check that matters happens on the server.

**Roles, and where they go wrong:**

    if user.role == "admin":       # checked in the handler, on the server
        ...

Sending the role from the client — in a request body, or read from a token the client could swap —
means the client decides their own permissions.

**Escalation paths to look for:** a normal user reaching an admin endpoint by guessing the URL; a
parameter like \`?user_id=\` that the server trusts; an API that returns more fields than the
interface shows; and a token that still works after the user was removed.

**Test authorisation with two accounts.** Log in as one, take a working request, and replay it as the
other. Anything that succeeds and should not is a finding — and this ten-minute exercise catches most
access control bugs in a student project.`,
    mcqs: [
      mcq('An insecure direct object reference is:',
        [['Reaching another user\'s record by changing an id', true],
          ['Logging in with a stolen password', false],
          ['Sending SQL through a form field', false],
          ['Reusing a session after logout', false]],
        'Invisible in the interface, which is why it survives so long.'),
      mcq('Returning 404 rather than 403 for somebody else\'s record:',
        [['Avoids confirming that the record exists', true],
          ['Is required by the HTTP specification', false],
          ['Prevents the request being retried', false],
          ['Makes the response cacheable', false]],
        'A 403 tells the attacker they found something real.'),
      mcq('Hiding a delete button from ordinary users provides:',
        [['No protection, since the request can be sent directly', true],
          ['Adequate protection for low-risk actions', false],
          ['Protection unless the user inspects the page', false],
          ['Defence in depth alongside a server check', false]],
        'Every check that matters happens on the server.'),
      mcq('Accepting the user\'s role from the request body means:',
        [['The client decides their own permissions', true],
          ['The server must validate the role name', false],
          ['Roles cannot be changed without a login', false],
          ['The token becomes unnecessary', false]],
        'Roles come from the server\'s own record of the user.'),
    ],
    checkpoint: [
      mcq('The quickest test for broken access control is to:',
        [['Replay one account\'s request as another account', true],
          ['Scan the application with an automated tool', false],
          ['Review every handler for a role check', false],
          ['Check the session timeout settings', false]],
        'Ten minutes that catches most access control bugs in a student project.'),
      mcq('An API returning more fields than the interface displays is:',
        [['A leak, since the response is what is actually sent', true],
          ['Acceptable, as the client filters them', false],
          ['A performance problem rather than a security one', false],
          ['Safe if the extra fields are not sensitive', false]],
        'Whatever is in the response has been given to whoever called it.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_PASSWORDS',
    notes: `The goal is that a stolen database is embarrassing rather than catastrophic. That is
achievable, and the way to achieve it is well settled.

**Never store the password.** Store a hash: a one-way transformation you cannot reverse. At login,
hash what was typed and compare.

**Never encrypt passwords.** Encryption is reversible by design, so whoever takes the database takes
the key eventually. Hashing is the right tool precisely because it does not come back.

**Not any hash.** MD5 and SHA-256 are designed to be *fast*, and fast is the wrong property here: a
graphics card tries billions of guesses a second against them. Use a hash designed to be slow:

    import bcrypt

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    ok = bcrypt.checkpw(attempt.encode(), hashed)

**bcrypt, scrypt or Argon2.** All three are deliberately slow and take a cost factor you can raise as
hardware improves.

**Salt** is a random value stored with each hash, and these libraries handle it for you. Without it,
two users with the same password have the same hash, and a precomputed table cracks both at once.
With it, every hash must be attacked separately.

**Never invent your own scheme.** "Hash it twice with a secret word" has been tried, is weaker than
it sounds, and there is no upside.

**Password rules that help:** a minimum of twelve characters, checked against a list of known-breached
passwords, and nothing else. Forced complexity rules and ninety-day expiry produce \`Password1!\` and
\`Password2!\`, which is why modern guidance dropped both.

**Login endpoints need three more things:** the same error message whether the email exists or not,
rate limiting on attempts, and no timing difference between the two cases.

**Reset tokens are credentials too.** Random, long, single-use, expiring within the hour, and sent
only to the registered address.

**And the best answer to storing passwords** is often not storing them: use an identity provider and
let somebody whose whole job it is carry the risk.`,
    mcqs: [
      mcq('Passwords are hashed rather than encrypted because:',
        [['Encryption is reversible, and the key can be stolen too', true],
          ['Hashing is faster than encryption', false],
          ['Encrypted values cannot be compared', false],
          ['Hashes take less storage space', false]],
        'Not coming back is precisely the property required.'),
      mcq('SHA-256 is a poor choice for password storage because:',
        [['It is fast, so guesses can be tried in billions', true],
          ['It produces collisions too easily', false],
          ['It cannot be salted', false],
          ['Its output length is too short', false]],
        'bcrypt, scrypt and Argon2 are deliberately slow.'),
      mcq('A salt prevents:',
        [['Two identical passwords producing the same hash', true],
          ['The hash being reversed mathematically', false],
          ['Brute force against a single account', false],
          ['Passwords being sent over the network', false]],
        'Without it, one precomputed table cracks many accounts at once.'),
      mcq('Forced complexity rules and ninety-day expiry were dropped from modern guidance because:',
        [['They produce predictable variations like Password1!', true],
          ['They are difficult to implement correctly', false],
          ['They slow down the login process', false],
          ['Users forget passwords and contact support', false]],
        'Length plus a breached-password check does more with less friction.'),
    ],
    checkpoint: [
      mcq('A login endpoint should return the same error whether the email exists or not, and also:',
        [['Avoid a timing difference between the two cases', true],
          ['Log the attempted password for analysis', false],
          ['Lock the account after one failure', false],
          ['Redirect to the registration page', false]],
        'A measurable delay leaks exactly what the message was hiding.'),
      mcq('A password reset token should be:',
        [['Random, single-use, and expiring within the hour', true],
          ['Derived from the user id and a shared secret', false],
          ['Valid until the password is changed', false],
          ['Short enough to type from an email', false]],
        'It is a credential, and it deserves the same care as one.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_INPUT_VALIDATION',
    notes: `Everything arriving from outside is untrusted: form fields, URL parameters, headers,
uploaded files, and responses from other services. "Outside" means anything you did not compute
yourself.

**Client-side validation is a courtesy, not a defence.** It gives a fast, friendly message to an
honest user. Anybody can bypass it entirely — with the developer tools, with curl, with a script —
because the browser is under their control, not yours.

    curl -X POST -d '{"quantity": -5}' https://shop.example.com/api/cart

**Validate on the server, always, for every field:**

    def create_order(data):
        qty = data.get("quantity")
        if not isinstance(qty, int) or qty < 1 or qty > 100:
            raise ValidationError("quantity must be between 1 and 100")

**Allow-list rather than block-list.** Decide what is acceptable and refuse the rest. Listing what to
forbid always misses something, because attackers are looking for exactly what you forgot:

    if status not in {"pending", "paid", "shipped", "cancelled"}:
        raise ValidationError("unknown status")

**Check the type, then the range, then the meaning.** A quantity must be an integer, then positive,
then within stock. A date must parse, then be in the allowed window. Each layer catches something the
next assumes.

**Numbers you did not expect:** zero, negative, enormous, a string that looks like a number, a float
where an integer belongs. A negative quantity that produces a negative total is a refund somebody
just gave themselves.

**Uploaded files are the most dangerous input.** Check the size before reading, verify the actual
content rather than the extension, generate your own filename rather than using theirs, store outside
the web root, and never execute what was uploaded.

**Never trust hidden fields or anything from the client that decides value.** A price in a form field
is a price the customer chooses. Look it up on the server.

**Validate at the boundary, once, and put clean data behind it.** Validation scattered through the
codebase is validation that has gaps, because somebody will always find the path that skipped it.`,
    mcqs: [
      mcq('Client-side validation is:',
        [['A courtesy to honest users, not a defence', true],
          ['Sufficient when the form is the only entry point', false],
          ['A defence in depth layer that can be relied on', false],
          ['Adequate for non-sensitive fields', false]],
        'The browser is under their control, not yours.'),
      mcq('An allow-list is preferred to a block-list because:',
        [['Listing what to forbid always misses something', true],
          ['Allow-lists are shorter to write', false],
          ['Block-lists cannot be tested', false],
          ['Allow-lists are faster to evaluate', false]],
        'Attackers look for exactly what you forgot.'),
      mcq('A negative quantity accepted by an order endpoint can produce:',
        [['A negative total, which is a refund they granted themselves', true],
          ['A database constraint violation only', false],
          ['An empty cart with no other effect', false],
          ['A rounding error in the total', false]],
        'Type, then range, then meaning — each layer catches something.'),
      mcq('A price sent in a hidden form field should be:',
        [['Looked up on the server and the submitted value ignored', true],
          ['Validated against a maximum before use', false],
          ['Signed by the client to prevent tampering', false],
          ['Accepted if the form was served over HTTPS', false]],
        'Anything the client sends is a value the client chose.'),
    ],
    checkpoint: [
      mcq('An uploaded file should be checked by:',
        [['Its actual content, not its extension', true],
          ['Its extension against an allowed list', false],
          ['The content type header the client sent', false],
          ['A virus scanner alone', false]],
        'Also: your own filename, stored outside the web root, never executed.'),
      mcq('Validating at the boundary once, rather than throughout the codebase, means:',
        [['There is no path that skipped a check', true],
          ['Less code has to be written overall', false],
          ['Errors can be reported in one format', false],
          ['The database needs fewer constraints', false]],
        'Scattered validation is validation with gaps.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_INJECTION',
    notes: `Injection is one mistake appearing in several places: **data supplied by somebody else
gets treated as code.** Recognising the single shape is worth more than memorising the variants.

**SQL injection.** The vulnerable line:

    cur.execute("SELECT * FROM users WHERE email = '" + email + "'")

With \`email = "' OR '1'='1"\`, the query returns every user. With \`"'; DROP TABLE users; --"\`, the
table is gone. **The fix is parameters, everywhere, without exception:**

    cur.execute("SELECT * FROM users WHERE email = %s", (email,))

Escaping quotes yourself is not the fix; there is always a case you missed.

**Cross-site scripting (XSS).** The same mistake in the browser: user text rendered as HTML, so a
script in it runs with the privileges of your page.

    <!-- vulnerable -->
    <div>Welcome, <%= user_name %></div>       <!-- if the name is <script>... -->

An injected script can read the DOM, steal a session cookie that lacks \`HttpOnly\`, and send
requests as the logged-in user. **The fix is escaping on output**, which modern template engines do
automatically — and which people disable, with a function named something like \`raw\` or
\`safe\`, to make some markup work.

**Stored XSS is the serious one:** the script is saved in the database and runs for every visitor
who views that record, including administrators.

**Command injection**, the same idea against a shell:

    os.system("convert " + filename + " out.png")       # never

    subprocess.run(["convert", filename, "out.png"])    # arguments, not a string

**The one rule underneath all three: never assemble code out of data.** Use the mechanism that keeps
them separate — parameters for SQL, escaping for HTML, argument lists for commands — and the whole
class disappears.

**Defence in depth behind it:** validate input as well, give the database account only the
permissions it needs, and set a Content Security Policy so an injected script has fewer places to
send what it stole.`,
    mcqs: [
      mcq('The single idea behind every injection flaw is:',
        [['Data supplied by somebody else is treated as code', true],
          ['User input is not validated for length', false],
          ['Output is not encrypted in transit', false],
          ['Permissions are checked too late', false]],
        'One shape, several places: SQL, HTML, the shell.'),
      mcq('Stored XSS is more serious than reflected XSS because:',
        [['The script runs for everyone who views the record', true],
          ['It cannot be removed once saved', false],
          ['It bypasses the Content Security Policy', false],
          ['It executes on the server rather than the client', false]],
        'Including administrators, whose sessions are worth most.'),
      mcq('Escaping quotes in a SQL string yourself is inadequate because:',
        [['There is always a case you missed', true],
          ['It is slower than using parameters', false],
          ['Databases reject escaped input', false],
          ['It only works for text columns', false]],
        'Parameters keep the data out of the query entirely.'),
      mcq('`subprocess.run(["convert", filename, "out.png"])` is safer than the string form because:',
        [['The arguments never pass through a shell', true],
          ['The list is validated automatically', false],
          ['It runs with reduced privileges', false],
          ['Python escapes the filename for you', false]],
        'Argument lists for commands, like parameters for SQL.'),
    ],
    checkpoint: [
      mcq('Template engines escape output automatically, and the usual cause of XSS is:',
        [['Somebody disabled it with a "raw" or "safe" helper', true],
          ['The engine failing on some unusual characters', false],
          ['Escaping applied before storage instead', false],
          ['Content loaded from another origin', false]],
        'Reaching for the escape hatch to make some markup work.'),
      mcq('A Content Security Policy reduces the damage from XSS by:',
        [['Limiting where an injected script may send data', true],
          ['Preventing scripts from being injected at all', false],
          ['Escaping output the template missed', false],
          ['Blocking requests from other origins', false]],
        'Defence in depth behind the escaping, not instead of it.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_SECRETS',
    notes: `A secret in a repository is a secret that has been published. Git history never forgets,
and scanners watch public repositories continuously — a key committed to a public repository is
typically found and used within minutes.

**What counts as a secret:** API keys, database passwords, signing keys, tokens, certificates, and
any connection string containing credentials.

**Where they belong:**

    # .env — never committed
    DATABASE_URL=postgres://user:pass@localhost/app
    STRIPE_SECRET_KEY=sk_live_...

    # .env.example — committed, names only
    DATABASE_URL=postgres://user:password@localhost/dbname
    STRIPE_SECRET_KEY=sk_test_replace_me

\`.env\` goes in \`.gitignore\` on the first commit, not later. In production, use the platform's
environment settings or a secret manager.

**Deleting a secret in the next commit does not remove it.** It remains in the history, reachable by
anybody who clones the repository. The only real remedy is **revoke and rotate**:

1. **Revoke the key immediately** — before anything else, and before deciding how it happened.
2. **Issue a new one** and deploy it.
3. **Check the logs** for use you did not make.
4. **Then** clean the history if you wish, knowing it may already be cloned.

**Rotate in that order.** Cleaning history first leaves the live key valid while you work.

**Prevention that actually works:** a pre-commit hook that scans for key patterns, a secret scanner
in CI, and \`git diff --staged\` read before every commit.

**Other places secrets escape:** log lines printing a whole request, error pages in debug mode,
client-side bundles, screenshots in bug reports, and chat messages to an AI assistant.

**Keys should be scoped and short-lived** wherever the service allows it. A read-only key limited to
one resource turns a leak into an inconvenience — which is least privilege, applied to credentials.`,
    mcqs: [
      mcq('A key committed to a public repository is typically:',
        [['Found by scanners and used within minutes', true],
          ['Safe until somebody searches for it', false],
          ['Protected by the repository being unindexed', false],
          ['Only at risk if the repository is popular', false]],
        'Scanners watch public repositories continuously.'),
      mcq('Deleting a committed secret in the next commit:',
        [['Leaves it in the history, still reachable', true],
          ['Removes it from every clone', false],
          ['Is sufficient for a private repository', false],
          ['Invalidates the key automatically', false]],
        'Revoke and rotate is the only real remedy.'),
      mcq('The first step after discovering a leaked key is to:',
        [['Revoke it, before investigating anything else', true],
          ['Clean the Git history', false],
          ['Work out how it was committed', false],
          ['Check whether the repository is private', false]],
        'Cleaning history first leaves the live key valid while you work.'),
      mcq('A read-only key scoped to one resource means a leak is:',
        [['An inconvenience rather than a catastrophe', true],
          ['Undetectable by the provider', false],
          ['Automatically revoked on misuse', false],
          ['Harmless and not worth rotating', false]],
        'Least privilege, applied to credentials.'),
    ],
    checkpoint: [
      mcq('`.env` should be added to `.gitignore`:',
        [['On the first commit, before it can be added', true],
          ['Once real credentials are put into it', false],
          ['Before the repository is made public', false],
          ['When the project is deployed', false]],
        'The commit that adds it is the one that publishes it.'),
      mcq('Which is a commonly overlooked way secrets escape?',
        [['Log lines printing an entire request', true],
          ['Encrypted database backups', false],
          ['Environment variables on the server', false],
          ['Secrets passed as command arguments in CI', false]],
        'Also debug error pages, client bundles and screenshots in bug reports.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_DEPENDENCIES',
    notes: `Most of the code in your application was written by strangers. A small project pulls in
hundreds of packages, and each one runs with your application's full privileges.

**Known vulnerabilities are the commonest way in**, because they are public: a vulnerability is
published, scanners start looking for anything still running the old version, and unpatched systems
are found automatically. This is not a sophisticated attack. It is a race, and patching is how you
win it.

**Check what you are running:**

    pip-audit                      # Python
    npm audit                      # Node
    npm audit fix                  # apply the safe upgrades

**Read the output rather than obeying it.** Severity is about the vulnerability in general, not about
you. A flaw in a function your code never calls is genuinely lower risk than the label suggests — but
prove that, do not assume it.

**Lock files matter.** \`package-lock.json\` and \`requirements.txt\` with pinned versions mean every
machine installs identical code. Without them, a fresh install can quietly pull a newer, broken or
compromised version.

**Before adding a dependency, spend two minutes:** when was it last updated, how many people use it,
how many dependencies does it drag in, and could you write this yourself in twenty lines? A package
that reverses a string is not worth the supply chain it brings.

**Typosquatting is real.** \`python-dateutil\` and \`python-dateutils\`, \`requests\` and
\`request\` — malicious packages sit on the near-misses of popular names. Copy names from the
official documentation rather than typing them.

**Keep dependencies current, routinely.** Small regular upgrades are manageable; a framework three
major versions behind is a project nobody wants to start, which is how systems end up unpatchable.

**Automate the checking.** A weekly audit in CI, and an alert when something is published, beats
remembering. Most of security in a working job is this: applying other people's fixes promptly,
rather than inventing defences of your own.`,
    mcqs: [
      mcq('Known vulnerabilities are the commonest way in because:',
        [['They are public, and scanners look for them automatically', true],
          ['They are harder to detect than unknown ones', false],
          ['They affect every version of a package', false],
          ['Patches are rarely released for them', false]],
        'It is a race, and patching is how you win it.'),
      mcq('A lock file ensures that:',
        [['Every machine installs identical package versions', true],
          ['Vulnerable packages cannot be installed', false],
          ['Dependencies are checked before installing', false],
          ['Upgrades require explicit approval', false]],
        'Without one, a fresh install can pull something newer and broken.'),
      mcq('A reported vulnerability in a function your code never calls is:',
        [['Lower risk, but only once you have proved that', true],
          ['Safe to ignore, as severity ratings are generic', false],
          ['As dangerous as any other, since it is installed', false],
          ['Automatically excluded by audit tools', false]],
        'Read the output rather than obeying it, and rather than dismissing it.'),
      mcq('Typosquatting refers to:',
        [['Malicious packages named like popular ones', true],
          ['Typing errors in import statements', false],
          ['Domain names similar to a company\'s', false],
          ['Package versions published out of order', false]],
        'Copy names from the official documentation rather than typing them.'),
    ],
    checkpoint: [
      mcq('Small routine upgrades are preferred to occasional large ones because:',
        [['A framework three versions behind becomes unpatchable in practice', true],
          ['Small upgrades never introduce bugs', false],
          ['Audit tools only check recent versions', false],
          ['Major versions are released quite unpredictably', false]],
        'It is how systems end up stuck on vulnerable versions.'),
      mcq('Most security work in a normal job consists of:',
        [['Applying other people\'s fixes promptly', true],
          ['Designing defences against novel attacks', false],
          ['Running penetration tests regularly', false],
          ['Writing custom cryptographic code', false]],
        'Unglamorous, and it prevents more than anything else on the list.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_DEBUGGING',
    notes: `Finding security problems in your own code, before somebody else does it for you. This is
review with a specific set of questions.

**Go through your own application asking:**

**1. Every endpoint: who may call this?** Write the answer next to each route. Any endpoint whose
answer is "anyone who knows the URL" and should not be is a finding.

**2. Every object lookup: is ownership checked?** Any query by id from a request parameter needs a
check that the requester is entitled to it. This is the most productive question in the list.

**3. Every query: is it parameterised?**

    grep -rn "execute(" . | grep -v "%s"      # a crude but useful first pass

**4. Every output of user content: is it escaped?** Search for the "raw" or "safe" helper in your
templates. Every use is a decision that needs justifying.

**5. Every secret: is it outside the repository?**

    git log -p | grep -iE "api[_-]?key|password|secret|token" | head -40

**6. Every dependency: is it current?** Run the audit and read it.

**7. Every error message: what does it reveal?** A stack trace in production tells an attacker your
framework, your versions and your file paths. Log the detail; show the user a reference number.

**8. Every log line: what does it store?** Passwords, tokens and card numbers in logs are a breach
waiting for whoever gets read access to the logs.

**Then test it as two users.** Create two accounts, take every request one can make, and replay it as
the other. Then replay each one with no authentication at all. Record what succeeds.

**Then break the inputs.** Negative numbers, enormous strings, wrong types, empty values, script
tags, quotes. Not to be clever — these are what automated scanners send, which makes them exactly
what your application will actually receive.

**Keep a findings list** with severity and a fix for each, rather than fixing as you go. Fixing in
place means losing track of what you have checked.`,
    mcqs: [
      mcq('The most productive review question for a typical web application is:',
        [['Is ownership checked on every lookup by id?', true],
          ['Are all inputs length-limited?', false],
          ['Is HTTPS enforced on every route?', false],
          ['Are passwords hashed with bcrypt?', false]],
        'Broken access control is both the commonest and the most invisible.'),
      mcq('A stack trace shown in production reveals:',
        [['Framework, versions and file paths to an attacker', true],
          ['Nothing useful, since it is only an error', false],
          ['Only information already public in the response headers', false],
          ['Database contents in most frameworks', false]],
        'Log the detail; show the user a reference number.'),
      mcq('Every use of a template\'s "raw" or "safe" helper is:',
        [['A decision that needs justifying', true],
          ['Safe, since the helper name implies it', false],
          ['Required for any HTML content', false],
          ['Equivalent to escaping the output', false]],
        'It is where automatic escaping was deliberately turned off.'),
      mcq('Sending negative numbers, huge strings and script tags is worthwhile because:',
        [['That is exactly what automated scanners send', true],
          ['It proves the input validation is complete', false],
          ['Real users frequently send such values', false],
          ['It tests the database constraints', false]],
        'What your application will actually receive, not a clever exercise.'),
    ],
    checkpoint: [
      mcq('Testing with two accounts and replaying requests finds:',
        [['Missing ownership and permission checks', true],
          ['Injection flaws in queries', false],
          ['Secrets committed to the repository', false],
          ['Outdated dependencies', false]],
        'Then replay each request with no authentication at all.'),
      mcq('Keeping a findings list rather than fixing as you go means:',
        [['You do not lose track of what has been checked', true],
          ['Fixes can be reviewed by somebody else', false],
          ['Severity can be assessed later', false],
          ['The review takes less time overall', false]],
        'Fixing in place is how half a review gets finished.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_PRACTICE',
    notes: `No new ideas. Enough repetition that these checks become something you do without being
asked.

**On your own projects only, or on a deliberately vulnerable application** built for this purpose —
there are several well-known ones designed to be attacked legally.

**Do these:**

1. **Exploit your own IDOR.** Build a two-user application, leave out the ownership check, and read
   the other user's data. Then fix it and confirm the fix.
2. **Exploit your own SQL injection.** Write the vulnerable query deliberately, extract data with it,
   then fix it with parameters and confirm the same input is now harmless.
3. **Exploit your own XSS.** Store a script in a field, watch it run on another page, then fix it by
   escaping and confirm.
4. **Crack your own weak hashes.** Hash ten common passwords with MD5, find them online in seconds,
   then hash them with bcrypt and see the difference.
5. **Audit a real project.** Run the dependency audit on something you built months ago and act on
   what it says.
6. **Hunt your own secrets.** Search your Git history for keys. Revoke anything you find.
7. **Break your own inputs.** Negative, enormous, empty, wrong type, script tag, quote — against
   every form you have.
8. **Review somebody else's project** with the eight questions, and write them a findings list.

**Record for each:** what you expected, what happened, and the fix — with the evidence that the fix
works.

**The rule that is not negotiable: your own systems, or ones built to be attacked.** Testing anything
else without written permission is a crime in most countries, including a system belonging to your
college. If you want to go further, the security track covers the law, scope and disclosure properly.

**Why exploiting your own bugs matters:** reading that IDOR is dangerous teaches you a sentence.
Fetching another user's record with your own hands teaches you a reflex.`,
    mcqs: [
      mcq('Practising exploitation is restricted to:',
        [['Your own systems, or ones built to be attacked', true],
          ['Any system where no damage is done', false],
          ['Systems belonging to your college', false],
          ['Public sites with a contact address', false]],
        'Testing anything else without written permission is a crime in most countries.'),
      mcq('Cracking MD5 hashes of common passwords demonstrates:',
        [['Why a fast hash is the wrong tool for passwords', true],
          ['That MD5 has mathematical collisions', false],
          ['That salting is unnecessary with strong passwords', false],
          ['That password rules should be stricter', false]],
        'Then hash the same ten with bcrypt and see the difference.'),
      mcq('Exploiting your own bug rather than reading about it:',
        [['Builds a reflex instead of a remembered sentence', true],
          ['Is required to report it properly', false],
          ['Proves the vulnerability is exploitable at scale', false],
          ['Is the only way to verify a fix', false]],
        'Fetching another user\'s record with your own hands changes how you write the next handler.'),
      mcq('Running a dependency audit on an old project usually reveals:',
        [['Vulnerabilities published since you stopped working on it', true],
          ['Packages that were never used', false],
          ['Version conflicts in the lock file', false],
          ['Licence incompatibilities', false]],
        'Which is why the audit belongs in CI rather than in your memory.'),
      mcq('Reviewing somebody else\'s project with the eight questions is valuable because:',
        [['Unfamiliar code makes the questions do the work', true],
          ['Their code is likely to be worse than yours', false],
          ['It fulfils a peer review requirement', false],
          ['Two reviewers find twice as much', false]],
        'In your own code you remember your intentions; in theirs you only have the evidence.'),
    ],
    checkpoint: [
      mcq('After fixing a vulnerability you must:',
        [['Re-run the exploit and confirm it now fails', true],
          ['Document the fix in the README', false],
          ['Add a test for the affected function', false],
          ['Upgrade the related dependencies', false]],
        'A fix you have not tested is a belief, not a fix.'),
      mcq('A deliberately vulnerable practice application exists to:',
        [['Give a legal target for exploitation practice', true],
          ['Demonstrate fixes that cannot be applied elsewhere', false],
          ['Benchmark automated scanning tools', false],
          ['Replace the need for reviewing real code', false]],
        'Several well-known ones are built exactly for this.'),
    ],
  },

  {
    unitCode: 'T2_SECURITY_MINI_PROJECT',
    notes: `A security review of a real application — ideally one of your own from earlier in the
year — with the findings fixed and the fixes proved.

**Why your own code.** Two reasons. You can fix what you find, which is the half that actually
teaches. And you will find things, because everybody does; the discomfort of that is a large part of
the point.

**What is being assessed:** that the review was systematic rather than opportunistic, that each
finding is demonstrated rather than asserted, that the fixes address the root cause, and that you can
tell a serious finding from a cosmetic one.

**Build it in this order:**

1. **Choose the application** and write down what it protects and who would want it.
2. **Review systematically** with the eight questions, recording findings without fixing.
3. **Demonstrate each finding** — the request, the response, the consequence.
4. **Rank by severity**: what it exposes, how easily, and to whom.
5. **Fix from the top**, at the root rather than the symptom.
6. **Re-test every fix**, with the same exploit.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Security Review With Fixes',
      description: 'Review an application you own, demonstrate each finding, fix them at the root, and prove the fixes work.',
      instructions: `**The brief**

Take an application **you built and own** — a Year-1 project, a track project, anything with users,
data and a server. Review it properly, fix what you find, and prove the fixes.

If nothing of yours is substantial enough, build a small application with authentication, at least
two user roles and stored records, then review that.

**Requirements**

1. **A threat summary**: what the application holds, who would want it, and the three most likely
   ways in.
2. **A systematic review** using all eight questions from the debugging unit, with a written answer
   for each — including the ones where you found nothing.
3. **At least five findings**, each with:
   - What it is and where (file and line)
   - A demonstration: the request sent, the response received, the consequence
   - Severity, with a reason
   - The fix, at the root cause
4. **Two-account testing**: every authenticated request replayed as another user and as no user, with
   a table of what succeeded.
5. **A dependency audit**, with the output and what you did about each item.
6. **A secret scan** of the full Git history, with the outcome.
7. **Every fix re-tested**, with before-and-after evidence.

**What to submit**

1. The **review document** with the sections above.
2. The **findings table**: description, severity, evidence, fix, verification.
3. The **code changes**, as a diff or a pull request.
4. **Evidence**: the requests and responses before and after each fix, with data redacted.
5. A **short write-up** (350–450 words): the finding that surprised you most and why you had not seen
   it while writing the code; one finding you decided not to fix and your reasoning; the one habit
   from this topic you will carry into everything you build next.

**Constraints**

- **Your own application only.** No testing anything you do not own.
- Redact personal data and credentials from all evidence.
- Fix the root cause: blocking one input string is not a fix for injection.

**Where the marks are.** The demonstrations and the severity reasoning. "This endpoint may be
insecure" is worth nothing; "any logged-in user can read every other user's orders by changing the id
— here is the request, here is somebody else's data, here is the fix and here is the same request
failing afterwards" is the whole exercise.`,
      rubric: [
        {
          criterion: 'Systematic review',
          description: 'All eight questions answered for the whole application, including where nothing was found; threat summary specific rather than generic.',
          maxPoints: 25,
        },
        {
          criterion: 'Findings and evidence',
          description: 'Five or more real findings, each demonstrated with request, response and consequence rather than asserted.',
          maxPoints: 30,
        },
        {
          criterion: 'Fixes at the root',
          description: 'Each fix addresses the underlying cause; parameters rather than filtering, server checks rather than hidden controls.',
          maxPoints: 20,
        },
        {
          criterion: 'Verification',
          description: 'Every fix re-tested with the original exploit, with before-and-after evidence; two-account test table complete.',
          maxPoints: 15,
        },
        {
          criterion: 'Judgement and write-up',
          description: 'Severity reasoned rather than guessed, a defensible decision not to fix something, and an honest account of what was missed while writing the code.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
