/**
 * T2_CLEAN_CODE and T2_AI_ASSISTED — nineteen units. Year 2.
 *
 * ── WHY THESE TWO SIT TOGETHER ────────────────────────────────────────────────────────────
 *
 * Both are about the same thing from opposite directions: keeping control of code you did not write
 * line by line. Clean code is about leaving something a stranger can change; AI-assisted work is
 * about accepting code from a machine without losing the ability to judge it.
 *
 * The AI topic is deliberately neither enthusiastic nor disapproving. Students will use assistants
 * whatever this course says, and the useful contribution is teaching them to review the output, spot
 * the invented function, and know which lines must never be pasted into a chat window.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const CRAFT_BUNDLES: PilotBundle[] = [
  /* ── T2_CLEAN_CODE ──────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_CLEAN_CODE_NAMING',
    notes: `Code is read far more often than it is written, and a name is the smallest unit of
explanation available.

    d = 30                      # what is d
    days_until_expiry = 30      # oh

**What a name has to carry:** what the thing is, and enough about it to use correctly.

    def calc(a, b):             # calculate what, from what
    def total_with_tax(subtotal, tax_rate):

**Length should match scope.** A loop index used on the next line can be \`i\`. A module-level
constant read by six files cannot be \`MAX\`. The further a name travels, the more it must say.

**Conventions carry meaning**, and breaking them costs the reader:

    customers          a collection — plural
    customer           one of them
    is_active          a boolean, answering a question
    get_customer()     returns something
    save_customer()    does something
    MAX_RETRIES        a constant
    _internal          not part of the interface

**Avoid names that are technically true and useless:** \`data\`, \`info\`, \`temp\`, \`result\`,
\`manager\`, \`handler\`, \`process\`, \`do_it\`. Each describes the category, not the thing.

**Most comments are an apology for a name:**

    # check if the user can edit this document
    if u.r == 2 or u.id == d.o:

    if user.can_edit(document):

The second needs no comment, and cannot drift out of date with the code.

**Keep one word per concept.** \`fetch\`, \`get\`, \`retrieve\` and \`load\` scattered across one
codebase make a reader wonder what the difference is. There usually is not one, and they wasted the
thought.

**Say what it is, not what type it is.** \`customer_list\` tells you the type, which the code already
shows; \`active_customers\` tells you the meaning, which it does not.

**Renaming is the cheapest improvement available.** Your editor does it safely in seconds, and it is
the highest return per minute of any change in this topic.`,
    mcqs: [
      mcq('Name length should be proportional to:',
        [['How far the name travels from where it is defined', true],
          ['How important the value is', false],
          ['How many times it is used', false],
          ['The complexity of its type', false]],
        'A loop index can be i; a module constant read by six files cannot be MAX.'),
      mcq('`# check if the user can edit this document` above a condition suggests:',
        [['The condition should be a named function instead', true],
          ['The comment should be more detailed', false],
          ['The condition should be simplified', false],
          ['A docstring belongs there instead', false]],
        'Most comments are an apology for a name.'),
      mcq('Using `fetch`, `get`, `retrieve` and `load` across one codebase:',
        [['Makes readers wonder about a difference that does not exist', true],
          ['Is good practice, as it adds variety', false],
          ['Helps distinguish layers of the system', false],
          ['Is required by most style guides', false]],
        'One word per concept, chosen once and used throughout.'),
      mcq('`customer_list` is worse than `active_customers` because it:',
        [['States the type, which the code already shows', true],
          ['Is longer to type', false],
          ['Suggests the wrong data structure', false],
          ['Breaks the plural convention', false]],
        'Say what it is, not what type it is.'),
    ],
    checkpoint: [
      mcq('`is_active` as a name signals:',
        [['A boolean that answers a question', true],
          ['A function that changes state', false],
          ['A constant value', false],
          ['A private attribute', false]],
        'Conventions carry meaning, and breaking them costs the reader.'),
      mcq('Renaming is described as the cheapest improvement because:',
        [['An editor does it safely in seconds', true],
          ['It never breaks the tests', false],
          ['It requires no review', false],
          ['It reduces the amount of code', false]],
        'Highest return per minute of anything in this topic.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_SMALL_FUNCTIONS',
    notes: `A function should do one thing. The practical test is whether you can name it without
using "and".

    def process_order(order):       # 80 lines: validates, prices, charges, emails, logs

Five things. Which means it cannot be tested without a payment provider and a mail server, cannot be
reused in part, and cannot be read without holding all five in your head.

    def process_order(order):
        validate(order)
        total = price(order)
        payment = charge(order.customer, total)
        send_confirmation(order, payment)
        log_completed(order, payment)

Now each piece is testable alone, the top level reads as a description of what happens, and a change
to pricing touches one function.

**Signs a function is doing too much:**

- You cannot name it without "and"
- It is longer than a screen
- It has sections separated by blank lines with comments above them — those comments are the function
  names you have not extracted yet
- It has more than three levels of indentation
- Its tests need extensive setup

**Extracting is mechanical and safe.** Take a block, move it into a function, name it for what it
does, pass what it needs, return what it produces. Your editor does most of it.

**One level of abstraction per function.** A function that both orchestrates high-level steps *and*
manipulates string indices is switching altitude mid-sentence, and it reads that way.

**Parameters: three is comfortable, five is a smell.** Many parameters usually mean the function does
too much, or that several of them belong together as an object.

**Return early** rather than nesting:

    def grade(score):
        if score < 0: return None
        if score >= 90: return "A"
        if score >= 80: return "B"
        return "F"

**Do not extract for the sake of it.** A one-line function called once, with a name no clearer than
its body, adds a hop for no gain. The point is understanding, not a line count.`,
    mcqs: [
      mcq('The practical test for "one thing" is whether:',
        [['You can name the function without using "and"', true],
          ['It fits within twenty lines', false],
          ['It has fewer than three parameters', false],
          ['It returns exactly one value', false]],
        'The name is where the problem shows first.'),
      mcq('Comments above sections inside a long function are:',
        [['The function names you have not extracted yet', true],
          ['Good practice for readability', false],
          ['A sign the function needs a docstring', false],
          ['Required by most style guides', false]],
        'Each section is a function waiting to be named.'),
      mcq('A function with five or more parameters usually means:',
        [['It does too much, or some parameters belong together', true],
          ['The caller needs refactoring instead', false],
          ['Default values should be added', false],
          ['The parameters should be keyword-only', false]],
        'Three is comfortable; beyond that, look again at the design.'),
      mcq('"One level of abstraction per function" means avoiding:',
        [['Orchestrating steps and manipulating string indices together', true],
          ['Calling other functions from within a function', false],
          ['More than one return statement', false],
          ['Nested function definitions', false]],
        'Switching altitude mid-sentence reads exactly like that.'),
    ],
    checkpoint: [
      mcq('Splitting an 80-line function into five makes it possible to:',
        [['Test each part without a payment provider', true],
          ['Run the parts concurrently', false],
          ['Reduce the total lines of code', false],
          ['Avoid error handling in each of the parts', false]],
        'Testability is usually the first thing the split buys.'),
      mcq('A one-line function called once, named no better than its body, is:',
        [['A hop for no gain', true],
          ['Always preferable to inline code', false],
          ['Required for consistent style', false],
          ['Easier to test than the inline version', false]],
        'The point is understanding, not a line count.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_DRY',
    notes: `"Don't repeat yourself" is the most over-applied rule in programming. The full version is
what makes it useful: **every piece of knowledge should have one authoritative representation.**
Knowledge, not text.

**Worth removing** — the same knowledge in several places:

    # in three files
    if user.role == "admin" or user.role == "owner":

One rule about who may administer, written three times. Change the policy and you must find all
three.

    def can_administer(user):
        return user.role in {"admin", "owner"}

**Not worth removing** — text that looks alike and means different things:

    def format_invoice_date(d): return d.strftime("%d %b %Y")
    def format_report_date(d):  return d.strftime("%d %b %Y")

Identical today, and they will diverge the moment the invoice format has to follow a tax rule.
Merging them creates a function two unrelated callers must agree about forever.

**The test: if this changes, must the other change too?** Yes means one piece of knowledge. No means
a coincidence.

**The wrong abstraction costs more than duplication.** You merge two similar things; a difference
appears; you add a flag; another difference, another flag. Soon you have a function with four
booleans that nobody can follow, and every caller is coupled to every other. Duplication is cheap to
fix later; the wrong abstraction is expensive to unwind.

**Which is why "wait for three" is good advice.** Two similar pieces may be a coincidence. By the
third you can see which parts vary and which are genuinely the same.

**Copying code you do not understand** is the version of duplication that always hurts: two copies of
a bug, and you cannot fix either with confidence.

**Configuration counts.** The same timeout in five files is duplicated knowledge, and the day it
changes you will find four of the five.

**A little duplication is preferable to a little coupling.** Two straightforward similar functions
beat one clever shared one with flags — and that is a judgement, which is why this unit exists.`,
    mcqs: [
      mcq('The test for whether duplication should be removed is:',
        [['If one changes, must the other change too?', true],
          ['Are the two pieces textually identical?', false],
          ['Do they appear in the same module?', false],
          ['Is the duplicated block longer than five lines?', false]],
        'Knowledge, not text, is what DRY is about.'),
      mcq('Two date formatters that are identical today but serve unrelated callers:',
        [['Should stay separate, since they will diverge', true],
          ['Must be merged, as they are identical', false],
          ['Should be merged with a format parameter', false],
          ['Indicate a missing utility module', false]],
        'Merging creates a function two unrelated callers must agree about forever.'),
      mcq('The wrong abstraction typically appears as:',
        [['A shared function accumulating boolean flags', true],
          ['Code duplicated across three modules', false],
          ['A class with too many methods', false],
          ['A function with a long name', false]],
        'And every caller becomes coupled to every other.'),
      mcq('"Wait for three" advises that:',
        [['Two similar pieces may be a coincidence', true],
          ['Three copies is the maximum acceptable', false],
          ['Abstractions need three test cases', false],
          ['Three callers are needed to justify a function', false]],
        'By the third you can see what genuinely varies.'),
    ],
    checkpoint: [
      mcq('Copying code you do not understand is the worst form of duplication because:',
        [['You now have two bugs you cannot confidently fix', true],
          ['It is harder to find later', false],
          ['It usually violates a licence', false],
          ['It cannot be refactored automatically later', false]],
        'Understanding is what makes any later fix possible.'),
      mcq('"A little duplication is preferable to a little coupling" means:',
        [['Two clear functions beat one shared one with flags', true],
          ['Duplication should never be removed at all', false],
          ['Coupling is always avoidable', false],
          ['Shared code belongs in a library', false]],
        'It is a judgement, which is why the unit exists.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_ERROR_HANDLING',
    notes: `When something fails, somebody has to work out what happened — often at speed, often
without the code in front of them. What you write now decides how long that takes.

**An error message should say what failed, with what, and what to do:**

    "Error"
    "Invalid input"
    "Something went wrong"

    "Order 4821 rejected: quantity 0 is not allowed (must be 1-100)"

The second names the thing, the value, and the rule. Nobody has to reproduce anything.

**Three audiences, three messages:**

| Audience | Needs |
|---|---|
| The user | What happened and what to do, in their language, no jargon |
| The developer | Values, stack trace, context, correlation id |
| The operator | Whether it is happening a lot, and to whom |

Showing a stack trace to a user serves none of the three and leaks your internals.

**Fail fast at the boundary.** Validate on the way in and raise immediately, rather than letting a
bad value travel three layers and fail somewhere unrelated. The distance between the cause and the
symptom is what makes debugging expensive.

**Logs somebody can search:**

    logger.info("order created", extra={"order_id": o.id, "customer_id": c.id, "total": t})

Structured fields can be filtered; a sentence of prose cannot. Include an identifier that ties the
lines of one request together, and never log passwords, tokens or personal data.

**The levels, used as intended:** DEBUG for development detail, INFO for normal events worth
recording, WARNING for something recoverable that may matter, ERROR for a failed operation, CRITICAL
for a system that cannot continue. Everything at INFO means nothing can be filtered; everything at
ERROR means nobody reads them.

**Never swallow an exception silently.** If you catch and continue, log it with enough detail to
investigate. An empty handler is a decision never to find out.

**Include context as you go up.** "Failed to charge card" is less useful than "failed to charge card
for order 4821, customer 92, amount 1200: provider timeout after 10s".`,
    mcqs: [
      mcq('A good error message contains:',
        [['What failed, with what value, and the rule it broke', true],
          ['The stack trace and the module name', false],
          ['An apology and a support address', false],
          ['A unique error code only', false]],
        'Nobody should have to reproduce it to understand it.'),
      mcq('Showing a stack trace to an end user:',
        [['Serves nobody and leaks your internals', true],
          ['Helps support diagnose the problem', false],
          ['Is acceptable in development only', false],
          ['Is required for bug reports', false]],
        'Three audiences, three messages.'),
      mcq('Failing fast at the boundary matters because:',
        [['Distance between cause and symptom is what costs time', true],
          ['It reduces the number of exceptions raised', false],
          ['Later layers cannot raise exceptions', false],
          ['It avoids the need for logging', false]],
        'A bad value travelling three layers fails somewhere unrelated.'),
      mcq('Structured log fields are preferred to prose because:',
        [['They can be filtered and searched', true],
          ['They take less storage', false],
          ['They are human-readable by default', false],
          ['They avoid logging sensitive data', false]],
        'A sentence cannot be queried; fields can.'),
    ],
    checkpoint: [
      mcq('Logging everything at INFO means:',
        [['Nothing can be filtered when it matters', true],
          ['Logs are easier to read', false],
          ['Errors are never missed', false],
          ['Storage is used rather more efficiently', false]],
        'And everything at ERROR means nobody reads them.'),
      mcq('Adding context as an exception travels up gives you:',
        [['Order, customer, amount and cause, not a bare failure', true],
          ['A shorter stack trace', false],
          ['Automatic retry information', false],
          ['A guarantee the error is logged exactly once', false]],
        '"Failed to charge card" alone starts an investigation from nothing.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_DOCUMENTATION',
    notes: `Document what the code cannot say for itself. Everything else is maintenance cost with no
return.

**The README is the front door**, and it answers, in this order:

1. **What is this?** One paragraph, no assumed context.
2. **How do I run it?** Every step, from a clean machine.
3. **How do I test it?**
4. **How is it arranged?** Enough to know where to look.
5. **What decisions were made?** The things a reader would otherwise wonder about.

**Write the setup section by following it yourself** on a machine that has none of your tools. The
step you forgot is the one you have had installed since last year.

**Docstrings explain intent and contract:**

    def apply_discount(price, percentage):
        """Return the price with the discount applied.

        Raises ValueError if percentage is outside 0-100.
        Rounds to two decimal places, half up, to match the invoice system.
        """

The rounding note is the valuable line. The signature already says what goes in; the *why* lives
nowhere else.

**Comments explain why, never what:**

    i += 1                      # increment i          — useless
    # the API is 1-indexed      # explains a decision  — useful

**A comment that repeats the code is worse than none**, because it will drift. The code changes, the
comment does not, and now the file contains a confident lie.

**Delete commented-out code.** Git remembers it. A block commented out six months ago tells every
future reader nothing except that somebody was unsure.

**Document the surprising, not the obvious.** Why this library rather than the obvious one, why this
strange-looking condition (a real bug it prevents), why this is slower than it could be (a
correctness requirement).

**An architecture decision record** — a short note per significant decision: the context, the choice,
the alternatives, the consequence — is the single highest-value document a project can have, and it
costs ten minutes at the moment the decision is fresh.

**Documentation rots.** Keep it minimal and near the code, and delete anything you would not
maintain.`,
    mcqs: [
      mcq('A comment that restates what the code does is worse than no comment because:',
        [['The code changes and the comment becomes a confident lie', true],
          ['It makes files longer', false],
          ['Reviewers must check both', false],
          ['It slows down parsing', false]],
        'Drift is what makes repetition dangerous rather than merely useless.'),
      mcq('The most valuable line in a docstring is usually:',
        [['The one explaining a decision the signature cannot show', true],
          ['The description of each parameter', false],
          ['The return type', false],
          ['The example usage', false]],
        '"Rounds half up to match the invoice system" lives nowhere else.'),
      mcq('Commented-out code should be:',
        [['Deleted, since Git remembers it', true],
          ['Kept with a dated note', false],
          ['Moved to the bottom of the file', false],
          ['Retained until the feature ships', false]],
        'It tells a reader only that somebody was unsure.'),
      mcq('The README setup section should be written by:',
        [['Following it yourself on a machine without your tools', true],
          ['Listing the commands from your shell history', false],
          ['Copying it from a similar project', false],
          ['Describing what the code imports', false]],
        'The forgotten step is the thing you installed last year.'),
    ],
    checkpoint: [
      mcq('An architecture decision record captures:',
        [['Context, choice, alternatives and consequence', true],
          ['The full design of the system', false],
          ['The tasks completed in a sprint', false],
          ['The public interface of every single module', false]],
        'Ten minutes while the decision is fresh, and the highest-value document a project has.'),
      mcq('Documentation should be kept minimal because:',
        [['Anything you will not maintain becomes wrong', true],
          ['Readers do not read very long documents', false],
          ['It takes time away from coding', false],
          ['Tools generate most of it anyway', false]],
        'Delete what you would not keep true.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_LAYERS',
    notes: `Every application has the same four concerns, and mixing them is the most consequential
structural mistake available.

| Layer | Holds | Must not |
|---|---|---|
| **Interface** | HTTP handlers, CLI, screens | Contain business rules |
| **Logic** | The rules of the domain | Know about HTTP or SQL |
| **Data** | Queries, persistence | Contain business rules |
| **Services** | Calls to the outside world | Be called directly from the interface |

**Mixed, as it usually starts:**

    @app.post("/orders")
    def create_order():
        data = request.json
        if data["quantity"] < 1:                      # a rule
            return {"error": "bad quantity"}, 400
        if data["quantity"] > get_stock(data["id"]):  # another rule
            return {"error": "out of stock"}, 400
        db.execute("INSERT INTO orders ...")          # data access
        requests.post(MAIL_API, ...)                  # an external service
        return {"ok": True}

**Separated:**

    @app.post("/orders")
    def create_order():
        try:
            order = order_service.place(OrderRequest.from_json(request.json))
            return order.to_json(), 201
        except InvalidOrder as e:
            return {"error": str(e)}, 400

The rules now live in \`order_service.place\`, which can be tested with no web server, reused by a
background job or an admin script, and read without HTTP in the way.

**The dependency rule: dependencies point inward.** The interface knows about the logic; the logic
knows nothing about the interface. A business rule importing \`request\` is the smell that says the
line has been crossed.

**The test that proves it:** can you call your core logic from a plain script, with no server and no
framework? If not, the layers are mixed, whatever the directory names say.

**Why it matters in practice.** The interface changes most often — a new endpoint, a mobile client,
a command line. The rules change least. Coupling the stable thing to the volatile one means rewriting
what did not need to change.

**Directories are not layers.** A folder called \`services\` full of functions that return HTTP
responses is the same mixed code with a better filing system.

**Do not over-layer a small program.** A 100-line script does not need four directories. The rule is
about keeping rules separate from their delivery, not about ceremony.`,
    mcqs: [
      mcq('The dependency rule says that:',
        [['The interface knows the logic; the logic knows nothing of it', true],
          ['Each layer may call the one below and above', false],
          ['Data access should call business logic', false],
          ['Services must be called from the interface', false]],
        'A business rule importing `request` is the smell that says otherwise.'),
      mcq('The test that layers are genuinely separated is:',
        [['Calling the core logic from a plain script with no framework', true],
          ['Having a directory per layer', false],
          ['Each file importing only from one layer', false],
          ['The handler being under twenty lines', false]],
        'Directory names prove nothing on their own.'),
      mcq('Coupling business rules to the interface is costly because:',
        [['The interface changes often and the rules rarely do', true],
          ['Interfaces are harder to test', false],
          ['HTTP frameworks change their APIs', false],
          ['It prevents the use of a database', false]],
        'You end up rewriting what did not need to change.'),
      mcq('A `services` folder of functions returning HTTP responses is:',
        [['Mixed code with a better filing system', true],
          ['Correctly layered', false],
          ['Acceptable for small applications', false],
          ['A sign the interface layer is missing', false]],
        'Directories are not layers.'),
    ],
    checkpoint: [
      mcq('Business logic extracted from a handler can then be:',
        [['Tested with no server, reused by a job', true],
          ['Deployed independently', false],
          ['Written in an entirely different language', false],
          ['Cached automatically', false]],
        'Those two consequences are the whole argument.'),
      mcq('A 100-line script with four layer directories is:',
        [['Ceremony the rule was never asking for', true],
          ['Correctly structured for growth', false],
          ['The minimum acceptable structure', false],
          ['Easier to navigate than one file', false]],
        'The rule is about separating rules from delivery, not about folders.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_CODE_REVIEW',
    notes: `The team topic covered how to conduct a review conversation. This unit is about the
reading itself: how to get through a change properly without spending an hour on it.

**Read in this order**, because each pass answers a different question:

1. **The description.** What is this meant to do?
2. **The tests.** What does the author believe the behaviour is? Tests are often the fastest
   specification available.
3. **The interfaces.** New or changed function signatures, endpoints, schemas — these are the parts
   that are expensive to change later.
4. **The implementation**, now that you know what it is trying to do.
5. **The gaps.** What is missing: an untested path, an unhandled error, a case the description
   promised.

**Reading the tests before the code** is the habit most worth taking from this unit. It tells you
what the author intended, so you review the code against its purpose rather than reconstructing the
purpose from the code.

**What to check, concretely:**

- Does each function do what its name says?
- What happens on empty, missing, zero, enormous, concurrent?
- Is anything here duplicated knowledge from elsewhere?
- Would a newcomer understand this in six months?
- Is any of it dangerous: a secret, a missing permission check, an unparameterised query, data
  deleted without recovery?

**Size governs quality.** Under 200 lines gets a real review; beyond 400 attention collapses and
approval becomes a formality. If you are handed something enormous, say so and ask for it in pieces —
that is a legitimate review outcome, not an evasion.

**Run it when it matters.** For anything risky, check out the branch and try it. Reading catches
logic; running catches the setup step nobody documented.

**Separate levels of concern** so the author knows what blocks: a correctness problem blocks, a
design question is a conversation, a preference is a nit and should be labelled one.

**You are accountable for what you approve.** An approval says you believe this is safe to merge —
which is the whole reason the second pair of eyes has value.`,
    mcqs: [
      mcq('Reading the tests before the implementation tells you:',
        [['What the author believes the behaviour should be', true],
          ['Whether the tests pass', false],
          ['How long the change took', false],
          ['Which files are most risky', false]],
        'Often the fastest specification available.'),
      mcq('Interfaces are reviewed before implementation because:',
        [['They are the expensive part to change later', true],
          ['They are shorter to read', false],
          ['Implementation details rarely matter', false],
          ['Tools check implementations automatically', false]],
        'Signatures, endpoints and schemas outlive the code behind them.'),
      mcq('A change beyond roughly 400 lines tends to receive:',
        [['A formality rather than a review', true],
          ['A more thorough review from more people', false],
          ['Automatic rejection by most tools', false],
          ['A faster approval, correctly', false]],
        'Asking for it in pieces is a legitimate outcome.'),
      mcq('Running the branch, rather than only reading it, catches:',
        [['Setup steps nobody documented', true],
          ['Logic errors reading would miss', false],
          ['Style inconsistencies', false],
          ['Duplicated knowledge', false]],
        'Reading catches logic; running catches the environment.'),
    ],
    checkpoint: [
      mcq('Separating blocking issues from questions and nits helps because:',
        [['The author knows what must change before merging', true],
          ['It reduces the total number of comments', false],
          ['Tools can act on the labels', false],
          ['It shortens the review time', false]],
        'Everything unlabelled is read as required.'),
      mcq('Approving a change means you:',
        [['Believe it is safe to merge, and are accountable', true],
          ['Have read every line carefully', false],
          ['Agree with all of the author\'s style choices', false],
          ['Have verified it against the tests', false]],
        'Which is the whole reason a second pair of eyes has value.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_REFACTORING',
    notes: `No new ideas. Change the shape of working code, repeatedly, without changing what it does.

**The safety rule, and it is not optional: tests first.** Refactoring without tests is rewriting and
hoping. If the code has none, your first task is characterisation tests — tests that capture what it
currently does, correct or not, so you can tell whether you changed it.

**Do these, each on real code of yours or provided:**

1. **Rename everything badly named** in one file. Nothing else. Notice how much becomes clear.
2. **Extract a long function** into named pieces, running tests after each extraction.
3. **Remove a real duplication** — one that fails the "must both change" test — and leave a
   coincidental one alone, with a note saying why.
4. **Flatten nesting** to at most two levels, using early returns and guard clauses.
5. **Separate a layer.** Take a handler with business rules in it and pull them out so they can be
   called from a script.
6. **Improve the errors** in a module: messages with values, appropriate levels, nothing swallowed.
7. **Delete something.** Unused functions, commented-out blocks, a feature flag that has been on for
   a year. Deletion is refactoring.
8. **Refactor one thing you decide not to change**, and write down why — the cost is not worth it,
   it is being replaced, the risk is too high. That decision is technical debt taken deliberately,
   which is entirely different from debt taken by accident.

**Work in small steps, running tests after each.** A refactor that breaks tests five changes in is a
puzzle; one that breaks after a single change is obvious.

**Never mix a refactor with a behaviour change.** Separate commits, ideally separate branches — so a
reviewer can see that nothing changed, and so a bisect can tell them apart.

**Record for each:** what it looked like before, what you changed, and how you knew it still worked.
That last column is the discipline; the rest is typing.`,
    mcqs: [
      mcq('Refactoring without tests is:',
        [['Rewriting and hoping', true],
          ['Acceptable for small changes', false],
          ['Faster, and equally safe', false],
          ['Standard practice for legacy code', false]],
        'Characterisation tests capture current behaviour so you can tell what changed.'),
      mcq('A characterisation test captures:',
        [['What the code currently does, correct or not', true],
          ['What the code should do', false],
          ['The performance of the current version', false],
          ['The public interface only', false]],
        'Correctness comes after; first you need to detect change.'),
      mcq('Small steps with tests between them help because:',
        [['A break after one change is obvious rather than a puzzle', true],
          ['Tests run faster on smaller changes', false],
          ['Git requires small commits', false],
          ['Reviewers prefer many commits', false]],
        'Five changes in, you no longer know which one did it.'),
      mcq('Deciding not to refactor something, with the reason recorded, is:',
        [['Technical debt taken deliberately', true],
          ['Avoiding the exercise', false],
          ['The same as debt taken by accident', false],
          ['Only valid if the code is being replaced', false]],
        'Deliberate and accidental debt are entirely different things.'),
      mcq('Mixing a refactor with a behaviour change in one commit:',
        [['Stops a reviewer seeing that nothing else changed', true],
          ['Saves review time overall', false],
          ['Is acceptable if the tests pass', false],
          ['Makes the history shorter', false]],
        'It also defeats a bisect trying to tell them apart.'),
    ],
    checkpoint: [
      mcq('Deleting unused code counts as refactoring because:',
        [['It changes shape without changing behaviour', true],
          ['It improves performance', false],
          ['It reduces the repository size', false],
          ['Git preserves the old history anyway', false]],
        'And it is among the most valuable changes available.'),
      mcq('The most important column in the refactoring record is:',
        [['How you knew it still worked', true],
          ['What the code looked like before', false],
          ['How long the change took', false],
          ['Which technique was applied', false]],
        'The rest is typing; that column is the discipline.'),
    ],
  },

  {
    unitCode: 'T2_CLEAN_CODE_MINI_PROJECT',
    notes: `Take a program that works and is unpleasant, and make it maintainable without breaking
it.

**Why rescue rather than rewrite.** Rewriting is what everybody wants to do and almost nobody should:
it discards years of accumulated fixes for cases you have not thought of, and it takes three times as
long as estimated. The employable skill is improving code that is running, incrementally, without an
outage.

**What is being assessed:** that behaviour is provably unchanged, that each change is justified
rather than stylistic, that the improvements are the ones that matter, and that you can say what you
deliberately left alone.

**Build it in this order:**

1. **Understand it first.** Run it, trace one path, and write down what it does. Do not change
   anything yet.
2. **Get it under test** — characterisation tests over the main behaviours, including the ones that
   look wrong.
3. **List what is wrong**, ranked by what it costs a future maintainer.
4. **Fix from the top**, in small steps, tests after each.
5. **Stop deliberately**, and record what you left and why.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Rescue a Messy Program',
      description: 'Take working but unpleasant code, put it under test, and improve it incrementally with behaviour provably unchanged.',
      instructions: `**The brief**

Take a working but poor-quality program of **at least 300 lines** — an early project of your own, a
classmate's with permission, or one provided — and make it maintainable.

Good candidates: long functions, unclear names, mixed layers, duplicated logic, no tests, error
handling that swallows everything.

**Requirements**

1. **An assessment written before any change**: what the program does, how it is structured, and a
   ranked list of at least eight problems with what each costs a maintainer.
2. **Characterisation tests** covering the main behaviours, passing against the original, including
   any behaviour you believe is wrong (note it; do not fix it yet).
3. **At least six substantial improvements**, one per commit, each with the tests passing before and
   after:
   - Renaming for clarity
   - Extracting functions
   - Removing genuine duplication
   - Separating a layer
   - Improving error handling and messages
   - Deleting dead code
4. **Behaviour unchanged**, proved by the same tests passing throughout.
5. **A deliberate stopping point**: at least three things you chose not to change, each with a
   reason.
6. **Any bug found but not fixed** recorded separately, with its impact.

**What to submit**

1. The repository with the full commit history, and the original tagged.
2. The **assessment document** with the ranked problem list.
3. A **change log**: each improvement, why it mattered, and the evidence behaviour held.
4. The **not-doing list** with reasons.
5. A **before-and-after comparison** of one function or module, with commentary.
6. A **short write-up** (300–400 words): the change that made the biggest difference and why; the
   one you nearly made and reversed; what you would need before you would rewrite rather than rescue
   this.

**Constraints**

- No behaviour change. Fixes go in separate, labelled commits at the end if at all.
- No rewrite. Incremental improvement only.
- Tests must pass after every commit.

**Where the marks are.** The ranked assessment and the not-doing list. Improving code is common;
knowing which improvements are worth their risk, and stopping deliberately, is what makes somebody
useful on an existing system.`,
      rubric: [
        {
          criterion: 'Assessment',
          description: 'Eight or more problems identified and ranked by cost to a maintainer, written before any change was made.',
          maxPoints: 25,
        },
        {
          criterion: 'Safety',
          description: 'Characterisation tests written first and passing throughout; one improvement per commit; behaviour provably unchanged.',
          maxPoints: 25,
        },
        {
          criterion: 'Improvements',
          description: 'Six or more substantial changes addressing the ranked problems rather than surface style.',
          maxPoints: 25,
        },
        {
          criterion: 'Judgement',
          description: 'Three or more deliberate omissions with reasons; bugs found recorded rather than silently fixed.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Identifies the highest-value change, a reversed decision, and the conditions under which a rewrite would be justified.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_AI_ASSISTED ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_AI_ASSISTED_ASSISTANTS',
    notes: `An AI assistant is a tool with a specific shape: extremely good at some things, unreliable
at others, and confident throughout. Knowing which is which is the whole skill.

**Where it genuinely saves time:**

- Boilerplate you could write but would rather not
- Syntax in a language you know conceptually but use rarely
- Explaining unfamiliar code
- A first draft of tests, for you to correct and extend
- Regular expressions, shell incantations, configuration files
- A second opinion when you are stuck
- Turning a description into a rough starting point

**Where it costs more than it gives:**

- Anything depending on your specific codebase that it cannot see
- Architecture and design decisions, which need context it does not have
- Anything where being subtly wrong is expensive — security, money, data deletion
- Debugging something you do not understand, where you cannot evaluate the answer
- Learning a fundamental for the first time

**That last one matters most at second year.** Generated code you cannot evaluate produces the
feeling of progress without the capability. In an interview, in a production incident, and in the
next project, the gap shows.

**What it actually is:** a model predicting plausible continuations from patterns in text. That
explains both its fluency and its failure mode — plausible and wrong looks exactly like plausible and
right, because the mechanism is the same either way.

**The judgement to apply before asking:** could I verify this answer? If yes, an assistant is a
time-saver. If no, you are accepting something you cannot check, and the risk is proportional to what
it touches.

**Use it, and stay in charge.** The people getting the most from these tools are not the ones who
accept the most output; they are the ones who know enough to reject the wrong parts quickly.`,
    mcqs: [
      mcq('An assistant is least reliable for:',
        [['Decisions requiring context about your specific codebase', true],
          ['Generating boilerplate code', false],
          ['Explaining unfamiliar syntax', false],
          ['Drafting a regular expression', false]],
        'It cannot see what it was not given.'),
      mcq('"Plausible and wrong" looks like "plausible and right" because:',
        [['Both come from the same prediction mechanism', true],
          ['The model hides its uncertainty deliberately', false],
          ['Wrong answers are rarer than right ones', false],
          ['The training data contained both equally', false]],
        'Fluency and the failure mode have the same source.'),
      mcq('The judgement to apply before asking is:',
        [['Could I verify this answer if I got one?', true],
          ['Is this task large enough to be worth it?', false],
          ['Has the model seen this framework?', false],
          ['Would a search engine be faster?', false]],
        'If not, you are accepting something you cannot check.'),
      mcq('Using an assistant to learn a fundamental for the first time:',
        [['Produces the feeling of progress without the capability', true],
          ['Is the fastest way to learn it', false],
          ['Works if you read the explanation carefully', false],
          ['Is equivalent to reading documentation', false]],
        'The gap shows in the interview and the next project.'),
    ],
    checkpoint: [
      mcq('The people getting most from assistants are those who:',
        [['Know enough to reject the wrong parts quickly', true],
          ['Accept the most generated output uncritically', false],
          ['Write the longest prompts', false],
          ['Use them for every task', false]],
        'Staying in charge is the difference.'),
      mcq('A task where being subtly wrong is expensive — money, security, deletion — should be:',
        [['Written and checked by you, whatever it suggests', true],
          ['Generated first and then reviewed afterwards', false],
          ['Given more context in the prompt', false],
          ['Verified by asking a second time', false]],
        'The cost of the error, not the difficulty, decides.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_PROMPTING',
    notes: `The difference between a useful answer and a plausible one is usually what you put in the
question.

**A question that gets a generic answer:**

    How do I handle errors in Python?

**One that gets a usable answer:**

    I have a Flask endpoint that calls a payment API. I need to distinguish
    "their service is down" (retry) from "the card was declined" (do not retry,
    tell the user). Here is my current code: [code]. I am using requests.
    What should the error handling look like?

**Four things the second one has:**

1. **Context** — Flask, requests, a payment API
2. **The actual problem**, not the category
3. **The code you have**
4. **The constraint that matters** — the retry distinction

**Say what you have tried.** "I tried X and got Y, which surprised me because Z" gets a targeted
answer and prevents being told to do the thing that already failed.

**Ask for what you actually want.** An explanation, a review, alternatives, or code. Asking "should I
use a queue here?" gets a discussion; "write this with a queue" gets code you may not need.

**Give it the constraints it cannot guess:** the Python version, the framework, "no new dependencies",
"this runs on a machine with 512MB", "the team does not use type hints".

**Ask for the trade-off, not the answer.** "What are the trade-offs between these two approaches for
my case?" is more useful than "which is better", because the reasoning is checkable and the verdict
is not.

**Iterate rather than restarting.** "That does not handle an empty list" is a better second message
than a new, longer prompt.

**Be suspicious of confident specifics.** A named function with exact parameters, for a library you
have not verified, is the highest-risk kind of answer — it is the most checkable and the least often
checked.

**And the constraint from the security unit governs everything here:** never paste anything you would
not put in a public message.`,
    mcqs: [
      mcq('The most important thing a good prompt adds is:',
        [['The specific problem and the code you have', true],
          ['Politeness and clear formatting', false],
          ['A longer description of the goal', false],
          ['A request for a detailed explanation', false]],
        'The category gets you a category-shaped answer.'),
      mcq('Saying what you already tried prevents:',
        [['Being told to do the thing that already failed', true],
          ['The model repeating your code back', false],
          ['A longer response than needed', false],
          ['An answer in the wrong language', false]],
        '"I tried X and got Y, which surprised me because Z" is the shape.'),
      mcq('Asking for trade-offs rather than a verdict is better because:',
        [['The reasoning is checkable and the verdict is not', true],
          ['It produces a shorter answer', false],
          ['Models are trained to compare options', false],
          ['It avoids receiving code you did not want', false]],
        'You can evaluate an argument; you cannot evaluate a preference.'),
      mcq('A named function with exact parameters, from an unverified library, is:',
        [['The highest-risk answer, and the least often checked', true],
          ['The most reliable kind of answer', false],
          ['Safe if the code runs', false],
          ['Evidence the model knows the library', false]],
        'Confident specifics are exactly where verification matters most.'),
    ],
    checkpoint: [
      mcq('When an answer is nearly right, the better next step is:',
        [['A short correction, continuing the conversation', true],
          ['A new, longer prompt from scratch', false],
          ['Asking the same question differently', false],
          ['Accepting it and fixing the code yourself', false]],
        '"That does not handle an empty list" is enough.'),
      mcq('Constraints worth stating explicitly include:',
        [['Version, framework, dependencies, conventions', true],
          ['The deadline for the work', false],
          ['Your level of experience', false],
          ['How long you have been stuck on it', false]],
        'Anything it cannot guess and would get wrong.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_EXPLAIN_CODE',
    notes: `The most reliable use of an assistant is reading code rather than writing it — and it is
the use students reach for least.

**Why it is the safer direction.** When it explains code you can see, you have the source in front of
you to check the explanation against. When it writes code, you have only its word.

**What it is genuinely good at:**

    What does this function do? [paste]
    What is this regular expression matching? [paste]
    Walk me through this stack trace: [paste]
    Why might this SQL be slow? [paste]
    What is the difference between these two functions? [paste]

**Landing in an unfamiliar codebase** is where this pays most. A file of three hundred lines in a
framework you have never used, explained in a paragraph, saves a genuine hour — and you then verify
by reading the code with a map in your head.

**Verify what it tells you, every time.** The failure here is subtle: the explanation is right about
nine lines and wrong about the tenth, and the wrong one is the line that mattered. Check the claim
against the code, especially anything that surprised you.

**Ask it to explain your own code back to you.** If the explanation does not match what you intended,
your code is unclear — which is a genuinely useful signal about readability, from a reader that is
always available.

**Ask follow-up questions in your own words:** "so the lock is released even if that raises?" That
forces you to state your understanding, which is where you discover it is wrong.

**Use it to find things**, not only to explain them: "which of these files most likely handles
authentication?" is a reasonable question about a listing.

**What it cannot tell you:** why the code is like that. The history, the incident that caused the odd
condition, the deadline behind the shortcut — those live in Git history, in the issue tracker and in
people, and it will invent a plausible reason if asked.`,
    mcqs: [
      mcq('Explaining code is safer than generating it because:',
        [['You have the source in front of you to check against', true],
          ['Models are trained more on explanations', false],
          ['Explanations cannot be wrong', false],
          ['Reading takes less context', false]],
        'When it writes code, you have only its word.'),
      mcq('The subtle failure when an explanation is wrong is that:',
        [['Nine lines are right and the tenth is the one that mattered', true],
          ['The whole explanation is obviously incorrect', false],
          ['It refuses to explain unfamiliar syntax', false],
          ['It explains a different function', false]],
        'Check anything that surprised you against the code.'),
      mcq('Asking it to explain your own code back is useful because:',
        [['A mismatch with your intent signals unclear code', true],
          ['It generates documentation for you', false],
          ['It finds bugs in the logic', false],
          ['It suggests better variable names', false]],
        'A reader that is always available is worth having.'),
      mcq('What an assistant cannot tell you about existing code is:',
        [['Why it is that way historically', true],
          ['What a regular expression matches', false],
          ['What a stack trace points to', false],
          ['What a function returns', false]],
        'It will invent a plausible reason if asked, and Git history holds the real one.'),
    ],
    checkpoint: [
      mcq('Asking "so the lock is released even if that raises?" is valuable because:',
        [['Stating your understanding is where it breaks', true],
          ['It produces a shorter answer', false],
          ['It confirms the model has read all the code', false],
          ['Questions get more accurate answers', false]],
        'Putting it in your own words is the check.'),
      mcq('The highest-value moment to use an assistant for explanation is:',
        [['Landing in an unfamiliar codebase or framework', true],
          ['Reviewing code you wrote yesterday', false],
          ['Reading a language you know well', false],
          ['Writing the first draft of a function', false]],
        'A three-hundred-line file explained in a paragraph saves a real hour.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_REVIEWING_AI_CODE',
    notes: `Generated code arrives looking finished. Reviewing it as a reviewer — rather than
receiving it as a gift — is the single most important habit in this topic.

**Read it as though a stranger submitted it**, because one did. Everything from the code review unit
applies, and these specifically:

**1. Does it do what you asked?** Not something adjacent that looks similar.

**2. Do the functions exist?** Especially library calls with exact parameters. Invented ones are
common and completely plausible.

**3. What about the edge cases?** Generated code is overwhelmingly happy-path: empty input, missing
keys, zero, negative, concurrent access.

**4. Is the error handling real?** A bare \`except: pass\` is a frequent shape, and it hides
everything.

**5. Is it secure?** String-built SQL, unescaped output, hardcoded credentials, missing permission
checks. Generated code reflects patterns in its training data, including the bad ones.

**6. Does it fit this codebase?** Conventions, structure, the libraries you already use. Generated
code arrives in a house style that is not yours.

**7. Is it more than you needed?** A caching layer and a retry decorator on a function called once is
complexity to maintain forever.

**Then run it**, including with bad input. Code that looks right and fails on an empty list is the
commonest outcome of all.

**Never commit code you cannot explain line by line.** That is not a moral position; it is practical.
When it breaks at two in the morning, or when an interviewer asks why you did it that way, the code
is yours regardless of who typed it.

**When it is nearly right, fix it yourself.** Regenerating loses the parts that were correct and
usually introduces a new problem somewhere else.

**The test:** could you have written this, given time? If not, you cannot review it — and you should
not ship it.`,
    mcqs: [
      mcq('The most common weakness in generated code is:',
        [['It handles the happy path and not the edges', true],
          ['It uses outdated syntax', false],
          ['It is too long for the task', false],
          ['It omits comments', false]],
        'Empty, missing, zero, negative, concurrent.'),
      mcq('An invented library function in generated code is:',
        [['Common, and completely plausible-looking', true],
          ['Rare, since models are trained on real libraries', false],
          ['Always caught by the editor', false],
          ['Only a risk in obscure libraries', false]],
        'Exact parameters on an unverified call is the shape to check.'),
      mcq('Generated code sometimes contains insecure patterns because:',
        [['Its training data contained them too', true],
          ['Security is disabled for speed', false],
          ['It cannot access security libraries', false],
          ['Secure code is longer to generate', false]],
        'String-built SQL and missing permission checks appear regularly.'),
      mcq('When generated code is nearly right, you should:',
        [['Fix it yourself rather than regenerating', true],
          ['Regenerate with a more detailed prompt', false],
          ['Ask for an explanation first', false],
          ['Accept it and add tests around it', false]],
        'Regenerating loses the correct parts and usually breaks something else.'),
    ],
    checkpoint: [
      mcq('"Could you have written this, given time?" matters because:',
        [['If not, you cannot review it and should not ship it', true],
          ['It measures the difficulty of the task', false],
          ['It decides whether you must cite the assistant', false],
          ['It indicates how long review will take', false]],
        'Review requires the capability the code assumes.'),
      mcq('A caching layer and retry decorator on a function called once is:',
        [['Complexity you will maintain forever for no gain', true],
          ['Good defensive practice', false],
          ['Evidence of a particularly well-trained model', false],
          ['Worth keeping for future scale', false]],
        'More than you asked for is a review finding, not a bonus.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_HALLUCINATIONS',
    notes: `A hallucination is output that is confident, fluent, plausible and wrong. There is no
change of tone to warn you, because the mechanism producing it is the same one producing correct
answers.

**The forms you will meet:**

**Invented functions and parameters.** \`pandas.read_json_lines()\`, a \`timeout\` argument on a
function that has none. The most common and the easiest to check.

**Invented libraries.** A package name that does not exist — and worse, one that someone malicious
has since registered, which is a documented supply chain attack.

**Invented citations.** A specification section, a documentation page, an RFC number, a paper. The
format is always right; the content sometimes does not exist.

**Confidently wrong facts.** A version number, a default value, a limit, a behaviour that changed
three versions ago.

**Plausible but incorrect explanations.** The dangerous one, because it teaches you something wrong
that you then carry into your own work.

**Why it happens:** the model predicts what text plausibly follows. A function name that *looks* like
it belongs in that library is a high-probability continuation whether or not it exists.

**Where the risk is highest:** niche libraries, recent changes, exact numbers, anything from after
the model's training, and anything where you have no independent way to check.

**How to catch them, in order of speed:**

1. **Run it.** An invented function fails immediately.
2. **Check the documentation** for any named function, parameter or option.
3. **Search for the library** before installing anything you have not heard of.
4. **Verify facts** against a primary source, especially versions and limits.
5. **Ask for a source** — but then check the source exists, because that is the thing being invented.

**Do not "ask if it is sure".** A model can produce an equally confident correction, or agree with a
wrong challenge. Confidence is not information here.

**The habit to build:** treat every specific claim as unverified until checked. Not scepticism about
everything — scepticism about the exact, named, checkable details, which is precisely where this
fails.`,
    mcqs: [
      mcq('A hallucination is hard to spot because:',
        [['Nothing in the tone distinguishes it from a correct answer', true],
          ['It usually appears in long responses only', false],
          ['It is grammatically unusual', false],
          ['It occurs mainly in code, not prose', false]],
        'The same mechanism produces both.'),
      mcq('An invented package name is dangerous beyond wasting time because:',
        [['Someone may have registered it maliciously', true],
          ['It slows down dependency resolution', false],
          ['It cannot be removed once installed', false],
          ['It breaks the lock file', false]],
        'A documented supply chain attack.'),
      mcq('Asking the model whether it is sure:',
        [['Produces equally confident agreement or correction', true],
          ['Reliably identifies its own errors', false],
          ['Reduces hallucination rates substantially', false],
          ['Returns a confidence score', false]],
        'Confidence is not information here.'),
      mcq('The fastest way to catch an invented function is to:',
        [['Run the code', true],
          ['Read the explanation carefully', false],
          ['Ask for a citation', false],
          ['Compare two generated versions', false]],
        'It fails immediately, which is why running comes first.'),
    ],
    checkpoint: [
      mcq('Hallucination risk is highest for:',
        [['Niche libraries, recent changes and exact numbers', true],
          ['Long explanations of general concepts', false],
          ['Widely used functions from the standard library', false],
          ['Code in popular frameworks', false]],
        'Anything specific, recent, or beyond the training data.'),
      mcq('The habit worth building is scepticism about:',
        [['Exact, named, checkable details', true],
          ['Every statement the model makes', false],
          ['Explanations of unfamiliar concepts', false],
          ['Any answer longer than a paragraph', false]],
        'That is precisely where this failure lives.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_AI_SECURITY',
    notes: `Pasting the wrong thing into a chat window has cost people their jobs. The lines are not
subtle, and knowing them before you start a job is considerably better than after.

**Never paste:**

- **Credentials** — API keys, passwords, tokens, connection strings, certificates
- **Customer or user data** — names, emails, phone numbers, addresses, medical or financial records
- **Proprietary code**, where your employer's policy forbids it
- **Unreleased plans**, internal documents, anything under an agreement
- **Anything about a named individual** who did not consent

**Why, concretely.** Depending on the service and its settings, what you send may be stored, reviewed
by people, or used for training. Even where it is not, you have sent your employer's confidential
information to a third party, which is usually a policy breach on its own — and in some jurisdictions
sending personal data abroad without a legal basis is a regulatory matter.

**This has happened repeatedly**, at large companies, with real consequences, which is why many
employers now have explicit rules about it.

**What is fine:** your own code in your own projects, public code, generic questions, and anything
with the sensitive parts replaced by placeholders.

**Redacting properly:**

    # before
    conn = psycopg2.connect("postgres://admin:hunter2@prod-db.acme.internal/customers")

    # after
    conn = psycopg2.connect(DATABASE_URL)   # a Postgres connection string from the environment

Replace the values, keep the shape. You lose nothing that helps the answer.

**Know the policy before you paste.** Most companies now have one. "I did not know" is a weak
position afterwards and an easily avoided one beforehand.

**Licensing is the other half.** Generated code may closely reproduce training data, and who owns it
is legally unsettled and varies by jurisdiction. Many employers require disclosure of AI-assisted
code; some forbid it in certain products. Ask rather than assume.

**And in interviews and assessments:** using an assistant where it is not permitted is straightforward
dishonesty. Where it is permitted, you will be expected to explain every line — which is the standard
that should apply anyway.`,
    mcqs: [
      mcq('Pasting a production connection string into a chat window is a problem because:',
        [['It may be stored or reviewed, and it leaves your organisation', true],
          ['The model might use the credentials directly', false],
          ['It slows the response', false],
          ['Connection strings cannot be interpreted usefully', false]],
        'A policy breach on its own, before any other consequence.'),
      mcq('Redacting a code sample properly means:',
        [['Replacing the values while keeping the shape', true],
          ['Removing the entire function', false],
          ['Rewriting it in a different language', false],
          ['Changing the variable names only', false]],
        'You lose nothing that helps the answer.'),
      mcq('Ownership of generated code is:',
        [['Legally unsettled and varies by jurisdiction', true],
          ['Always held by the person who prompted it', false],
          ['Always public domain', false],
          ['Determined by the service terms alone', false]],
        'Which is why many employers require disclosure.'),
      mcq('Customer data pasted into an assistant is a concern because:',
        [['Sending personal data to a third party can be a regulatory matter', true],
          ['The model may misinterpret it', false],
          ['It exceeds the context window', false],
          ['It reduces answer quality', false]],
        'Beyond the policy breach, there is often a legal dimension.'),
    ],
    checkpoint: [
      mcq('Before using an assistant at work, you should:',
        [['Find out what the policy says', true],
          ['Disable the conversation history', false],
          ['Use a personal account rather than a work one', false],
          ['Limit yourself to short questions', false]],
        '"I did not know" is a weak position afterwards.'),
      mcq('Where an assistant is permitted in an assessment, the expectation is:',
        [['You can explain every line you submit', true],
          ['You cite each generated section', false],
          ['You use it only for boilerplate', false],
          ['You disclose the prompts used', false]],
        'Which is the standard that should apply anyway.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_KEEPING_FUNDAMENTALS',
    notes: `The real risk at second year is not that an assistant writes bad code. It is that you stop
being able to tell.

**The mechanism.** Every time you accept generated code without working through the problem, you skip
the difficulty — and the difficulty is where the learning was. It feels efficient, and the cost is
invisible for months. Then an interview, an incident, or a problem the assistant cannot help with
arrives, and the gap is exactly the size of everything you skipped.

**The test that keeps you honest:** could I have written this myself, given time? If the answer is no
and the topic is one you should know, you have found a gap rather than saved an hour.

**Use it in a way that leaves you stronger:**

- **Attempt first, then compare.** Write your version, then ask. The comparison teaches; the
  replacement does not.
- **Ask why, not what.** "Why is this approach better than mine?" builds judgement. "Write this for
  me" builds nothing.
- **Type it out** rather than pasting, when you are learning. Slower, and it goes in.
- **Explain it back** to yourself, or to it. If you cannot, you do not have it.
- **Keep some work assistant-free.** One project, or the first hour of each problem.

**Where to be strictest with yourself:** anything you are learning for the first time, anything you
will be interviewed on, and anything you will maintain.

**Where to use it freely:** boilerplate, a language you know well, exploration, explanation, and work
where the outcome matters more than the practice.

**The employer's view is simple.** They can already generate code. What they are hiring is judgement:
knowing what to build, recognising when the output is wrong, and being able to fix what breaks. Those
are exactly the abilities that atrophy if you never solve anything yourself.

**The people who will do best with these tools** are the ones with the strongest fundamentals,
because they can use them at full speed without losing the ability to check. Building those
fundamentals is what this year is for.`,
    mcqs: [
      mcq('The real risk of assistant use at second year is:',
        [['Losing the ability to tell good output from bad', true],
          ['Writing code that runs slowly', false],
          ['Becoming dependent on one tool', false],
          ['Breaching a licence unknowingly', false]],
        'The cost is invisible for months and then arrives all at once.'),
      mcq('"Attempt first, then compare" works because:',
        [['The comparison teaches where the replacement does not', true],
          ['Your version is usually better', false],
          ['It produces a more accurate prompt', false],
          ['It reduces the number of questions asked', false]],
        'The difficulty you skip is where the learning was.'),
      mcq('Employers value judgement over code generation because:',
        [['They can already generate code', true],
          ['Judgement is easier to assess', false],
          ['Generated code is usually rejected', false],
          ['Most work is design rather than implementation', false]],
        'Knowing what to build and recognising wrong output is the hire.'),
      mcq('You should be strictest with yourself when the topic is:',
        [['Something you are learning for the first time', true],
          ['A language you already know well', false],
          ['Boilerplate configuration', false],
          ['Exploratory work you will discard', false]],
        'Also anything you will be interviewed on or will maintain.'),
    ],
    checkpoint: [
      mcq('The honest self-test is:',
        [['Could I have written this myself, given time?', true],
          ['Did the code run correctly the first time?', false],
          ['Was the prompt specific enough?', false],
          ['Did I read the whole output?', false]],
        'A no on something you should know is a gap, not a saved hour.'),
      mcq('Those who do best with these tools tend to be:',
        [['People with the strongest fundamentals', true],
          ['People who adopted them earliest', false],
          ['People who write the most detailed prompts', false],
          ['People who use several tools together', false]],
        'They can work at full speed without losing the ability to check.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_DEBUGGING',
    notes: `Debugging with an assistant, and debugging the problems an assistant caused. Both are
specific skills.

**Using one to debug well.** Give it everything: the error, the code, what you expected, what you
tried. An error message alone gets a generic list of causes.

    This raises KeyError: 'total' on line 14, but I print the dict on line 12
    and 'total' is there. Here is the function: [code]. Python 3.11.

**What it is good at:** decoding an unfamiliar error, suggesting what to check, spotting a typo you
have read past twenty times, and explaining a stack trace from a framework you do not know.

**What it is bad at:** anything depending on state, data or configuration it cannot see. Most real
bugs are exactly that, which is why it so often suggests something reasonable and irrelevant.

**Do not paste logs blindly.** They contain tokens, customer data and internal hostnames. Redact
first, every time.

**Debugging code it generated** has its own shapes:

**It calls something that does not exist.** An immediate \`AttributeError\` or \`ImportError\`.
Check the real documentation rather than asking again.

**It works on the example and fails on real data.** Generated code is happy-path by default.

**It is subtly wrong.** Off-by-one, the wrong comparison, an edge case inverted. The code looks
right, which is what makes it expensive. Tests find these; reading often does not.

**It does not fit.** Uses a library you do not have, a version you are not on, or a pattern your
codebase does not use.

**It swallows errors.** \`except: pass\` appears regularly, and hides the bug you are chasing.

**The trap to avoid: generating a fix for a bug you do not understand.** You get code that makes the
symptom disappear and the cause remain, and the next failure is further from its source. Understand
first, then fix — with help if you like, but in that order.

**And if three attempts have not worked**, stop and debug it yourself. Round four of a conversation
that is not converging is the most reliably wasted time in this topic.`,
    mcqs: [
      mcq('An assistant is least useful for bugs that depend on:',
        [['State, data or configuration it cannot see', true],
          ['Unfamiliar framework stack traces', false],
          ['Syntax errors in a new language', false],
          ['Typos in long expressions', false]],
        'Which describes most real bugs, and explains the reasonable-but-irrelevant suggestions.'),
      mcq('Before pasting logs, you must:',
        [['Redact tokens, customer data and internal hostnames', true],
          ['Trim them to under fifty lines', false],
          ['Convert them to a structured format', false],
          ['Remove the timestamps', false]],
        'Logs are one of the easiest ways to leak something sensitive.'),
      mcq('The subtly wrong generated bug is expensive because:',
        [['The code looks right, so reading does not find it', true],
          ['It only appears in production', false],
          ['It cannot be reproduced locally', false],
          ['It corrupts data silently by design', false]],
        'Tests find these; reading often does not.'),
      mcq('Generating a fix for a bug you do not understand produces:',
        [['A symptom that disappears while the cause remains', true],
          ['A correct fix that is hard to explain', false],
          ['A fix that fails immediately', false],
          ['A larger change than necessary', false]],
        'The next failure is then further from its source.'),
    ],
    checkpoint: [
      mcq('After three unsuccessful attempts with an assistant, you should:',
        [['Stop and debug it yourself', true],
          ['Rewrite the prompt with more context', false],
          ['Ask it to try a different approach', false],
          ['Start a fresh conversation', false]],
        'Round four of a conversation that is not converging is reliably wasted.'),
      mcq('A generated `except: pass` block is dangerous during debugging because:',
        [['It hides the very bug you are chasing', true],
          ['It slows down the program', false],
          ['It prevents the code from running', false],
          ['It causes a different exception later', false]],
        'It appears regularly in generated code.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_PRACTICE',
    notes: `No new ideas. Build the reflexes: review what it gives you, catch what it invents, and
notice what it costs you.

**Do these:**

1. **Attempt then compare.** Solve five problems yourself, then ask for a solution to each. Record
   what each version does better, and what the comparison taught you.
2. **Find a hallucination.** Ask about a niche library until you get an invented function or
   parameter. Note what it looked like — that shape is what you are learning to recognise.
3. **Review generated code properly.** Ask for something non-trivial — a file upload handler, a
   password reset — and review it against the checklist. Record every finding.
4. **Break it with edges.** Take generated code that works and feed it empty, zero, negative,
   enormous and malformed input. Record what fails.
5. **Redaction drill.** Take a real code sample with credentials, a connection string and customer
   data. Redact it so it is safe and still answerable, then compare answers with and without.
6. **Prompt comparison.** Ask one question badly and once well. Put the two answers side by side and
   say exactly what the difference in the question bought.
7. **Explain it back.** Take a generated function and explain every line in writing. Anything you
   cannot explain is a gap — go and learn it.
8. **Work without it.** Spend one full session on a real problem with no assistant. Note what was
   slower, and what you understood better afterwards.

**Record for each:** what you expected, what happened, and what it changed about how you will use it.

**The point of this set** is not to conclude that assistants are good or bad. It is that you should
know, from your own evidence rather than from anybody's opinion, where the tool helps you and where
it costs you.`,
    mcqs: [
      mcq('The purpose of the attempt-then-compare exercise is:',
        [['To learn from the difference between the two solutions', true],
          ['To check whether your solution was correct', false],
          ['To produce a better final answer', false],
          ['To measure how much time it saves', false]],
        'The comparison teaches; the replacement does not.'),
      mcq('Deliberately hunting for a hallucination teaches you:',
        [['What one looks like, so you recognise the shape', true],
          ['Which libraries to avoid', false],
          ['How often they occur', false],
          ['Which prompts cause them', false]],
        'Recognition is the skill; the specific example does not matter.'),
      mcq('The redaction drill compares answers with and without sensitive data to show:',
        [['That redaction costs nothing useful', true],
          ['That the model needs real data to help', false],
          ['How the model handles credentials', false],
          ['Which fields are safe to include', false]],
        'Replace the values, keep the shape.'),
      mcq('Explaining every line of a generated function in writing reveals:',
        [['Gaps that are worth going and learning', true],
          ['Bugs in the generated code', false],
          ['Whether the prompt was specific enough', false],
          ['How the model structured the solution', false]],
        'Anything you cannot explain, you do not have.'),
      mcq('The aim of this practice set is for you to know:',
        [['From your own evidence where the tool helps and costs', true],
          ['That assistants should be used sparingly', false],
          ['That assistants are safe for most tasks', false],
          ['Which assistant is most accurate', false]],
        'Your evidence, rather than anybody\'s opinion.'),
    ],
    checkpoint: [
      mcq('Feeding generated code empty, zero and malformed input usually reveals:',
        [['That only the happy path was handled', true],
          ['That the code is too slow', false],
          ['That a library was invented', false],
          ['That the prompt was ambiguous', false]],
        'Which is the default shape of generated code.'),
      mcq('Working one full session without an assistant is included to show:',
        [['What was slower, and what you understood better', true],
          ['That assistants are unnecessary', false],
          ['How much time they save you on average', false],
          ['Which tasks cannot be generated', false]],
        'Both halves of that answer matter.'),
    ],
  },

  {
    unitCode: 'T2_AI_ASSISTED_MINI_PROJECT',
    notes: `A piece of work built with an assistant, documented honestly — what you asked, what it
gave you, what was wrong with it, and what you changed.

**Why document the process.** Employers are not asking whether you use these tools; they assume you
do. They are asking whether you are in charge of the result. A record of what you caught and
corrected is evidence of exactly that, and almost nobody has it.

**What is being assessed:** that you reviewed rather than received, that you found real problems in
what was generated, that you can explain every line you shipped, and that you can say honestly where
it helped and where it did not.

**Build it in this order:**

1. **Choose something real** and scope it as any project.
2. **Decide your policy first** — what you will generate, what you will write, and why.
3. **Keep a log as you go**, not afterwards. Reconstructed logs are vague and obviously so.
4. **Review everything generated** against the checklist, before running it.
5. **Record every finding**: invented calls, missing edges, security issues, poor fit.
6. **Finish it yourself** — tests, edge cases, documentation.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — Built With an Assistant, and Documented',
      description: 'Build a real application with AI assistance, keeping an honest log of what was generated, what was wrong with it, and what you corrected.',
      instructions: `**The brief**

Build a working application of reasonable size using an AI assistant deliberately, and document the
collaboration precisely.

**Requirements**

1. **A usage policy written before you start**: what you will generate, what you will write
   yourself, and why each.
2. **A working application** — your choice, comparable in size to the guided build.
3. **An interaction log**, kept as you work, covering at least fifteen significant interactions:
   - What you asked (the prompt, or a faithful summary)
   - What you got, in outline
   - Your review findings
   - What you changed, and why
4. **At least five real problems found in generated code**, each documented: an invented function, a
   missing edge case, a security issue, a poor fit with your codebase, or an over-complication.
5. **Everything shipped is explainable.** You must be able to walk through any line.
6. **Tests you wrote**, not generated, for the core logic.
7. **A verification record** for every specific claim you relied on — function, parameter, library,
   version — and how you checked it.
8. **No sensitive data** in any interaction, with your redaction approach described.

**What to submit**

1. The application and its README.
2. The **usage policy**, and a note on where you departed from it.
3. The **interaction log**.
4. The **findings list**: five or more real problems, with evidence.
5. A **time and value assessment**: where it genuinely helped, where it cost you time, and your
   honest estimate of the net effect.
6. A **short write-up** (400–500 words): the most dangerous thing you nearly shipped; something you
   learned better by doing it yourself after a generated version confused you; how you will use these
   tools in your next project, and what you will not use them for.

**Constraints**

- Every line explainable, with no exceptions.
- No sensitive data in any prompt.
- Tests for core logic written by you.

**Where the marks are.** The findings list and the honesty of the assessment. A log saying everything
worked perfectly is a log of a review that did not happen — and a submission claiming an assistant
never got anything wrong will be read as exactly that.`,
      rubric: [
        {
          criterion: 'The application',
          description: 'Works end to end, structured sensibly, with edge cases and errors handled; tests for core logic written by the student.',
          maxPoints: 25,
        },
        {
          criterion: 'Review discipline',
          description: 'Five or more real problems found in generated code, each documented with evidence and a correction.',
          maxPoints: 30,
        },
        {
          criterion: 'Interaction log',
          description: 'Fifteen or more interactions recorded as work happened, with findings and changes; verification record for specific claims.',
          maxPoints: 20,
        },
        {
          criterion: 'Judgement and safety',
          description: 'Usage policy written first and mostly followed; no sensitive data in prompts; redaction approach described.',
          maxPoints: 15,
        },
        {
          criterion: 'Honest assessment',
          description: 'A real account of where the tool helped and cost, the most dangerous near-miss, and a specific plan for future use.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
