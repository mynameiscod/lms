/**
 * T3_BACKEND_ARCH and T3_BACKEND_DATA — twelve units. Year 3, backend track.
 *
 * ── THE CONSTRAINT THAT SHAPES EVERY TRACK FILE ───────────────────────────────────────────
 *
 * The direction tracks overlap the universal core by name. There is a T3_ARCHITECTURE and a
 * T3_BACKEND_ARCH; a T3_TRANSACTIONS_INTEGRITY and a T3_BACKEND_DATA; a T3_AUTH and a
 * T3_BACKEND_AUTH. A student on this track has already done the first of each pair.
 *
 * So a track unit that restates the core unit is worse than no unit: it burns a day of the
 * programme and teaches nothing, and the student notices, which costs the year its credibility.
 *
 * The rule these files follow: **the core unit taught the idea; the track unit is the idea
 * inside a running service, at the level of detail that only matters once you are building
 * one.** T3_ARCHITECTURE said a layer may depend downwards. T3_BACKEND_ARCH says what a
 * controller, a service and a repository each contain, what happens to your tests when they
 * are merged, and which of the three the framework will fight you about.
 *
 * Where a track unit cannot be made additive, it says so and points at the core unit rather
 * than padding. That is a better use of the student's time than a second pass.
 *
 * The duplicate-stem test catches a repeated question. It cannot catch a repeated idea, so
 * that one is on the author.
 *
 * Attribution: T3_BACKEND_ARCH is all SOFTWARE_ARCHITECTURE (API_DESIGN is evidenced by the
 * core API topic). T3_BACKEND_DATA defaults to DB_TRANSACTIONS with the two performance units
 * on QUERY_OPTIMIZATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BACKEND_BUNDLES: PilotBundle[] = [
  /* ══ T3_BACKEND_ARCH ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BACKEND_ARCH_CONTROLLERS_SERVICES_DATA',
    notes: `The core architecture topic gave you the dependency rule. This one is about the
three files it produces in a backend service, and what specifically goes in each.

## The three jobs

**The controller** — translates between HTTP and your application, and does nothing else.

    @app.post('/orders')
    def create_order(request):
        data = OrderRequest.parse(request.body)          # parse
        order = order_service.place(data, current_user)  # delegate
        return JsonResponse(order_response(order), 201)  # format

Three lines. Parse, delegate, format. **If a controller is longer than about ten lines,
something that is not HTTP has got into it.**

**The service** — the use case. What happens, in what order, and what the rules are.

    def place(self, data, user):
        items = self.catalogue.find_all(data.item_ids)
        if any(i.stock < 1 for i in items):
            raise OutOfStock(...)
        total = order_total(items, data.discount_code)
        order = self.orders.create(user, items, total)
        self.notifier.order_placed(order)
        return order

**No HTTP, no SQL.** It does not know a web request exists, and it does not know which database
is underneath.

**The repository** — how data is fetched and stored. SQL, the ORM, the mapping. **The only
layer allowed to know your schema.**

## What separating them actually buys

Not tidiness. Four concrete things:

**You can test the rules without a web server or a database.** \`place()\` with a fake
catalogue and a fake repository runs in a millisecond. In a merged design, testing "out of
stock raises an error" needs an HTTP client, a database, a fixture and a transaction rollback,
so people write one test instead of nine.

**A second caller becomes possible.** A CLI, a scheduled job, an admin action, a message
consumer — all call \`place()\`. In a merged design, the second caller either duplicates the
logic or makes an HTTP request to its own process, and both are things teams actually do.

**The framework becomes replaceable.** Not because you will replace it, but because a service
that does not import the framework is a service you can reason about without knowing it.

**The blast radius of a change shrinks.** Change the response format and only the controller
moves. Change the schema and only the repository moves.

## What actually goes wrong

**The fat controller.** Parsing, rules, queries and formatting in one function. The default
outcome of every framework tutorial, because tutorials optimise for showing one file.

**The anaemic service** that just forwards to the repository. If every service method is a
one-line pass-through, the layer is costing you indirection and buying nothing — **and the
honest response is to remove it**, not to defend it.

**The repository that returns ORM objects.** The query then continues in the service, and the
abstraction leaks. Return plain objects, or accept that your repository is a thin naming layer
over the ORM and stop calling it a boundary.

**The service that imports the request object.** The single commonest violation, and it
happens because the controller needed one more field and passing the whole request was quicker.

## The framework will fight you

**Most backend frameworks are built around the fat controller.** The scaffolding generates
one, the documentation examples use one, and the ORM's active-record pattern deliberately
merges the repository into the model.

**That is a real trade, not a mistake.** Active record is genuinely faster to write for small
applications, and a three-layer structure over a two-endpoint service is over-engineering.

**Add the layers when you can name what you get.** "I want to test the pricing rules without a
database" is a reason. "The diagram has three boxes" is not.`,
    mcqs: [
      mcq('A controller longer than about ten lines suggests:',
        [['Something that is not HTTP has got into it', true],
          ['The endpoint is handling too many routes', false],
          ['The request parsing needs extracting', false],
          ['The response format is too complex', false]],
        'Parse, delegate, format. That is the whole job.'),
      mcq('The service layer must not know about:',
        [['HTTP or SQL', true],
          ['The domain rules it enforces', false],
          ['The order the steps happen in', false],
          ['Which other services it calls', false]],
        'It does not know a web request exists or which database is underneath.'),
      mcq('The strongest practical gain from separating the three is:',
        [['Testing the rules with no web server and no database', true],
          ['A cleaner directory structure', false],
          ['Faster response times per request', false],
          ['Easier onboarding for new developers', false]],
        'Merged, testing one rule needs a client, a database and a fixture, so people write one test instead of nine.'),
      mcq('A service whose every method is a one-line pass-through should be:',
        [['Removed, because it costs indirection and buys nothing', true],
          ['Kept, because the layering may be needed later', false],
          ['Merged into the repository', false],
          ['Given more responsibility to justify it', false]],
        'The honest response, rather than defending the diagram.'),
    ],
    checkpoint: [
      mcq('The commonest layering violation in a backend service is:',
        [['The service importing the request object', true],
          ['The controller running a query directly', false],
          ['The repository containing business rules', false],
          ['The domain importing the framework', false]],
        'Because the controller needed one more field and passing the whole request was quicker.'),
      mcq('Active record merging the repository into the model is:',
        [['A real trade, and faster to write for small applications', true],
          ['A design mistake most frameworks have corrected', false],
          ['Acceptable only for read-only models', false],
          ['The reason ORMs are avoided in large systems', false]],
        'Three layers over a two-endpoint service is over-engineering.'),
      mcq('A repository returning ORM objects means:',
        [['The query continues in the service and the abstraction leaks', true],
          ['The service can optimise its own queries', false],
          ['The mapping layer is redundant', false],
          ['The repository is correctly thin', false]],
        'Return plain objects, or stop calling it a boundary.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_ARCH_WHERE_THE_RULES_LIVE',
    notes: `A business rule is a statement about your domain that is true regardless of how the
system is built. *An order under £20 pays delivery. A subscription cannot be cancelled twice. A
refund is allowed within thirty days.*

**Those rules outlive your framework, your database and usually your codebase.** Where you put
them decides whether they survive.

## The three wrong homes

**In the controller.** The rule now only applies to requests arriving through that endpoint. A
scheduled job, an admin script, a bulk import or a second endpoint all bypass it, and the
bypass is silent.

**In the query.**

    SELECT * FROM orders WHERE status = 'active' AND created_at > now() - interval '30 days'

"A refund is allowed within thirty days" is now a fragment of SQL. **You cannot test it without
a database, you cannot find it by searching for "refund", and the next person writing a similar
query will invent their own thirty days** — and one day the two will disagree.

**In the ORM model, mixed with persistence.** Better than the first two, and it ties the rule
to the storage layer: changing how orders are stored means editing the file that holds the
refund rule.

## The right home

**A function in the domain layer, taking plain values and returning a decision.**

    def refund_window_open(order, now):
        return (now - order.completed_at).days <= REFUND_WINDOW_DAYS

**Testable with two dates.** Findable by name. Callable from an endpoint, a job, a script or a
report, and identical in all four.

## Why this is the durable part

Your framework will change. Your database might. Your API shape certainly will. **The rules
change too — but they change because the business changed, which is a different kind of change
and it comes from a different direction.**

A codebase where the rules are separable is one where a framework migration is mechanical. One
where they are spread through controllers and queries is one where a framework migration is a
rewrite, and that is why so many rewrites are proposed and so few finish.

## The test that finds them

**Search for a magic number.** \`30\`, \`20\`, \`0.9\`, \`'active'\`. Every one is probably a
rule wearing a literal.

**Then ask: how many places is it?** If \`30\` appears in a controller, a query and a report,
the rule is in three places and two of them will be wrong eventually.

**The fix is not a constant.** \`REFUND_WINDOW_DAYS = 30\` in a shared file is better and it is
not the answer — the *decision* should be one function, because the rule is not the number, it
is what the number means and what happens at the boundary.

## What is not a business rule

**Validation of shape.** "Email must contain @" is input validation, and it belongs at the
boundary.

**Authorization.** "Only the owner may cancel" is a permission, and the auth topic put it in
its own place for its own reasons.

**Persistence concerns.** "Orders are soft-deleted" is a storage decision.

**Keep the domain layer for the rules that a person in the business would recognise.** If you
described a function to someone in operations and they said "yes, that is how it works", it
belongs there. If they would say "I don't know what that means", it does not.`,
    mcqs: [
      mcq('A business rule placed in the controller:',
        [['Is bypassed silently by jobs, scripts and other endpoints', true],
          ['Is harder to change when the rule changes', false],
          ['Cannot be unit tested at all', false],
          ['Slows the request by a measurable amount', false]],
        'And the bypass produces no error anywhere.'),
      mcq('A rule expressed as a fragment of SQL:',
        [['Cannot be found by searching for what it is about', true],
          ['Is faster than checking it in code', false],
          ['Applies consistently across every query', false],
          ['Is validated by the database itself', false]],
        'And the next person writing a similar query will invent their own version of it.'),
      mcq('The right home for a business rule is:',
        [['A domain function taking plain values and returning a decision', true],
          ['A constant in a shared configuration file', false],
          ['A method on the ORM model', false],
          ['A check in the service that uses it', false]],
        'Testable with two values, findable by name, identical from every caller.'),
      mcq('A shared constant is not the full answer because:',
        [['The rule is what the number means, not the number', true],
          ['Constants can still be overridden locally', false],
          ['The value may differ between environments', false],
          ['It does not prevent duplication of the check', false]],
        'The decision should be one function, including what happens at the boundary.'),
    ],
    checkpoint: [
      mcq('The search that finds scattered rules is:',
        [['A magic number, and then a count of where it appears', true],
          ['Every method on the domain models', false],
          ['All the conditionals in the service layer', false],
          ['The queries containing a WHERE clause', false]],
        '30, 20, 0.9, active — each is probably a rule wearing a literal.'),
      mcq('"Email must contain @" belongs:',
        [['At the boundary, as input validation', true],
          ['In the domain layer with the other rules', false],
          ['In the repository, before storage', false],
          ['In the controller and the domain both', false]],
        'Shape validation is not a rule a person in the business would recognise.'),
      mcq('The test for whether something belongs in the domain layer is:',
        [['Whether somebody in operations would recognise it', true],
          ['Whether it can be tested without a database', false],
          ['Whether more than one caller needs it', false],
          ['Whether it changes independently of the code', false]],
        '"Yes, that is how it works" against "I don’t know what that means".'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_ARCH_DEPENDENCY_DIRECTION',
    notes: `The core topic stated the rule: depend downwards, never upwards. This unit is about
the one case where you genuinely need to depend upwards, and the standard move that resolves it.

## The problem

Your service needs to save an order. Saving is the repository's job, which is *below* it — fine.

But now your service needs to send an email, and the email sender lives in an infrastructure
layer that imports your domain types. **If the service imports the sender and the sender
imports the domain, you have a cycle**, and cycles are the thing the rule exists to prevent.

The same shape appears whenever a lower layer needs to call back upwards: a repository that
needs to raise a domain event, a payment adapter that needs to construct a domain object.

## Dependency inversion, concretely

**Define the interface where it is used, not where it is implemented.**

    # domain/notifications.py  — owned by the domain
    class Notifier(Protocol):
        def order_placed(self, order: Order) -> None: ...

    # infrastructure/email.py  — imports the domain, implements its interface
    class EmailNotifier:
        def order_placed(self, order: Order) -> None:
            send_mail(...)

The service depends on \`Notifier\`, which is in its own layer. The email sender depends on the
domain. **Both arrows now point the same way**, and the cycle is gone.

**The name is misleading.** Nothing is inverted at runtime — the service still calls the email
sender. What is inverted is *who owns the interface*, and that is the whole trick.

## Wiring it up

Something has to decide that \`Notifier\` means \`EmailNotifier\`. That decision belongs at the
outermost edge — the application's entry point, where the framework is already known:

    service = OrderService(
        orders=SqlOrderRepository(db),
        notifier=EmailNotifier(mail_client),
    )

**This is what a dependency injection container automates**, and for a service of moderate size
you do not need one. Constructing the objects in one function at startup is clearer and has no
magic in it.

## What this buys, honestly

**Testing.** A fake notifier in a test is three lines, and no mail is sent. This is the real,
immediate payoff and it is most of the value.

**Swapping the implementation.** Email to SMS, SQL to in-memory. Genuinely useful and much
rarer than the argument implies.

**Independent reasoning.** You can read the service and know exactly what it depends on,
because its dependencies are named in its constructor.

## What it costs

**Indirection.** Following a call now means finding which implementation was wired in, and in a
large application that is a real cost to a reader.

**Interfaces with one implementation forever.** If nothing else will ever implement
\`Notifier\`, the interface is a testing seam — which is a fine reason, and you should say so
rather than pretending it is about flexibility.

**So: invert where you need the seam, and not everywhere.** A service that constructs its own
\`datetime.now()\` is fine until you need to test time, at which point you inject a clock. Do
it then, not in anticipation.

## Reading the direction

**Check the import list.** If \`domain/\` imports from \`infrastructure/\`, the rule is broken,
and one grep tells you:

    grep -rn "from infrastructure" domain/

**A linter can enforce it**, and that is worth setting up once. A rule that is checked is a rule
that holds; a rule in a document is a rule that decays at the first deadline.`,
    mcqs: [
      mcq('Dependency inversion means:',
        [['The interface is owned by the layer that uses it', true],
          ['The call order is reversed at runtime', false],
          ['Lower layers call upwards through callbacks', false],
          ['Dependencies are resolved at startup rather than compile time', false]],
        'Nothing is inverted at runtime; what is inverted is who owns the interface.'),
      mcq('Deciding that Notifier means EmailNotifier belongs:',
        [['At the application’s entry point', true],
          ['In the service that uses it', false],
          ['In the domain layer beside the interface', false],
          ['In a configuration file read at runtime', false]],
        'The outermost edge, where the framework is already known.'),
      mcq('The real, immediate payoff of injecting a dependency is:',
        [['A fake in a test, in three lines', true],
          ['The ability to swap implementations later', false],
          ['A cleaner dependency graph', false],
          ['Faster startup through lazy construction', false]],
        'Swapping is genuinely useful and much rarer than the argument implies.'),
      mcq('An interface with one implementation forever is:',
        [['A testing seam, and worth saying so', true],
          ['A sign the abstraction is wrong', false],
          ['Justified by future flexibility', false],
          ['Better replaced with a concrete class', false]],
        'A fine reason, as long as you do not pretend it is about flexibility.'),
    ],
    checkpoint: [
      mcq('A cycle appears when:',
        [['A lower layer needs to call back upwards', true],
          ['Two services depend on the same repository', false],
          ['The controller imports the domain types', false],
          ['A module is imported by more than one layer', false]],
        'A notifier, a domain event, an adapter constructing a domain object.'),
      mcq('The cost of inversion that matters to a reader is:',
        [['Following a call means finding what was wired in', true],
          ['The extra file for each interface', false],
          ['Slower method dispatch at runtime', false],
          ['More constructor parameters to pass', false]],
        'A real cost in a large application, and a reason not to do it everywhere.'),
      mcq('A rule in a document rather than a linter:',
        [['Decays at the first deadline', true],
          ['Is easier to make exceptions to deliberately', false],
          ['Cannot be applied to third-party imports', false],
          ['Works as long as reviews are thorough', false]],
        'A rule that is checked is a rule that holds.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_ARCH_DEBUGGING',
    notes: `Five architectural failures specific to a backend service. Each has a symptom you
can see from outside the code.

## 1. The test that needs the whole world

**Symptom:** testing one pricing rule requires a running database, a web client, a fixture and
a transaction rollback, and takes four seconds.

**Cause:** the rule is in a controller or a query.

**Why it matters more than it looks:** the cost is not the four seconds. It is that **nobody
writes the other eight tests**, so the rule with nine branches has one of them covered, and the
uncovered ones are where the bugs are.

**Diagnosis:** pick your most important business rule and try to write a test for it in
isolation. How much do you have to set up? That number is your architecture score.

## 2. The second caller that duplicated the logic

**Symptom:** the same rule, slightly different, in an endpoint and a scheduled job. They
disagree at the boundary — the job says thirty days and the endpoint says thirty-one, because
one of them counts inclusively.

**Cause:** the rule was in the first caller, so the second could not reuse it.

**The tell:** grep for a domain word — \`refund\`, \`discount\`, \`eligible\` — and count the
files. More than two is worth reading.

## 3. The service that imports the framework

    from flask import request      # in the service layer

**Symptom:** the service cannot be called from a job, and its tests need a request context.

**Cause:** one field was needed and passing the request was quicker than adding a parameter.

**Fix:** pass the value. **It is always a smaller change than it looks**, and it is the change
that keeps the layer honest.

## 4. The circular import

**Symptom:** an \`ImportError\` that depends on which module loads first, or a deferred import
buried inside a function.

**Cause:** two layers depending on each other, usually because a lower layer needed a type from
an upper one.

**Fix:** invert the dependency with an interface owned by the upper layer, or extract the
shared type into a module both can depend on. **The deferred import is the tell that somebody
already met this and worked around it** rather than fixing it.

## 5. The layer that does nothing

**Symptom:** every service method is \`return self.repo.find(id)\`.

**Cause:** the structure was copied from a template rather than grown from a need.

**Fix:** delete the layer. **This is a real and correct answer**, and it is unusual advice in
an architecture unit: a boundary with nothing on either side of it is pure cost to every reader
and every change.

## Seeing it from outside

**Time your fastest test.** If the fastest test in the suite takes a second, nothing is
isolated.

**Count the files in a typical change.** From the last ten commits. A consistently high number
means a concept is smeared across layers.

**Read one controller.** If you can tell what the business does by reading a controller, the
rules are in the wrong place — a controller should be boring.`,
    mcqs: [
      mcq('A test needing a database for one pricing rule costs you:',
        [['The eight tests nobody then writes', true],
          ['Four seconds per test run', false],
          ['A more complex CI configuration', false],
          ['Slower feedback during development', false]],
        'The rule with nine branches ends up with one covered, and the bugs are in the others.'),
      mcq('The same rule in an endpoint and a job, disagreeing at the boundary, means:',
        [['The rule lived in the first caller, so the second copied it', true],
          ['The two callers have different requirements', false],
          ['The rule changed and only one was updated', false],
          ['The job was written against an older version', false]],
        'Thirty days and thirty-one, because one counts inclusively.'),
      mcq('A deferred import inside a function is a tell that:',
        [['Somebody already met a circular dependency and worked around it', true],
          ['The module is expensive to load', false],
          ['The dependency is genuinely optional', false],
          ['Import order is being controlled deliberately', false]],
        'The workaround is visible; the boundary problem is not.'),
      mcq('A service layer of pure pass-throughs should be:',
        [['Deleted', true],
          ['Given the business rules from the controller', false],
          ['Kept as a seam for future testing', false],
          ['Merged with the repository layer', false]],
        'A boundary with nothing on either side is pure cost to every reader.'),
    ],
    checkpoint: [
      mcq('Your architecture score is measurable by:',
        [['How much setup one important rule needs to be tested', true],
          ['How many layers the project has', false],
          ['Whether the import graph has cycles', false],
          ['The number of files per change', false]],
        'Pick the rule, try to test it in isolation, and count.'),
      mcq('A controller should be:',
        [['Boring', true],
          ['The clearest description of what the endpoint does', false],
          ['Where validation and formatting both live', false],
          ['Short but expressive of the business logic', false]],
        'If you can tell what the business does from it, the rules are in the wrong place.'),
      mcq('The fix for a service importing the request object is:',
        [['Pass the value it needed as a parameter', true],
          ['Wrap the request in a domain type', false],
          ['Move the service call into the controller', false],
          ['Inject the request through the constructor', false]],
        'Always a smaller change than it looks.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_ARCH_PRACTICE',
    notes: `Two exercises on the boundary rather than the framework. Neither needs a web server,
which is itself the point being made.`,
    coding: [
      {
        title: 'The rule, extracted and callable',
        description: `A refund eligibility rule, currently tangled with request handling. Pull
it out so it takes plain values.

Read one line: \`completed_days_ago status amount refunded_already\` — an integer, a word
(\`completed\`, \`cancelled\` or \`pending\`), an integer amount in pence, and \`yes\` or
\`no\`.

Print \`allowed\` or a reason: \`not_completed\`, \`window_closed\`, \`already_refunded\`, or
\`zero_amount\`.

The rules, checked in this order:

- status is not \`completed\` → \`not_completed\`
- already refunded → \`already_refunded\`
- amount is 0 or less → \`zero_amount\`
- completed more than 30 days ago → \`window_closed\`
- otherwise → \`allowed\`

Exactly 30 days ago is **inside** the window. Your \`refund_decision\` must take four plain
values and return a string — no parsing, no printing.`,
        starter: `import sys


def refund_decision(days_ago, status, amount, refunded):
    # TODO: the rule, and only the rule. Plain values in, a decision out.
    return 'allowed'


parts = sys.stdin.readline().split()
print(refund_decision(int(parts[0]), parts[1], int(parts[2]), parts[3] == 'yes'))
`,
        language: 'python',
        tests: [
          { input: '5 completed 1000 no\n', expectedOutput: 'allowed' },
          { input: '40 completed 1000 no\n', expectedOutput: 'window_closed' },
          { input: '5 pending 1000 no\n', expectedOutput: 'not_completed' },
          { input: '5 completed 1000 yes\n', expectedOutput: 'already_refunded' },
          { input: '30 completed 1000 no\n', expectedOutput: 'allowed', isHidden: true },
          { input: '31 completed 1000 no\n', expectedOutput: 'window_closed', isHidden: true },
          { input: '5 completed 0 no\n', expectedOutput: 'zero_amount', isHidden: true },
          { input: '40 cancelled 0 yes\n', expectedOutput: 'not_completed', isHidden: true },
        ],
      },
      {
        title: 'Which layer may import which',
        description: `Read one import per line as \`<from_layer> <to_layer>\`, where a layer is
\`controller\`, \`service\`, \`domain\`, \`repository\` or \`framework\`.

The permitted direction is: controller may import service, domain and framework. Service may
import domain and repository. Repository may import domain and framework. Domain may import
**nothing**.

Print \`ok\` or \`violation\` for each, then a final line \`violations=<n>\`.

An import from a layer to itself is \`ok\`.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# The domain knows about nothing. Everything else is allowed to know about the domain.
`,
        language: 'python',
        tests: [
          { input: 'controller service\nservice domain\n', expectedOutput: 'ok\nok\nviolations=0' },
          { input: 'domain framework\n', expectedOutput: 'violation\nviolations=1' },
          { input: 'service framework\n', expectedOutput: 'violation\nviolations=1' },
          { input: 'repository domain\ncontroller framework\n', expectedOutput: 'ok\nok\nviolations=0' },
          { input: '', expectedOutput: 'violations=0' },
          { input: 'domain domain\n', expectedOutput: 'ok\nviolations=1', isHidden: true },
          { input: 'service controller\nrepository service\n', expectedOutput: 'violation\nviolation\nviolations=2', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Backend Architecture Practice',
      description: 'Extract a rule to plain values, encode the dependency direction, then apply both to a real service.',
      instructions: `Complete both exercises, then:

1. For the first: say exactly what a test of \`refund_decision\` needs to set up. Then say what
   it would have needed if the rule had stayed in the controller.
2. For the first: the order of the checks is part of the specification. Give an input where two
   reasons apply, say which the specification requires, and say who should decide that in a
   real system.
3. For the second: one test case is \`domain domain\` and it is \`ok\` but counts as a
   violation. Say why that is inconsistent, and what the sensible behaviour would be. **This
   is a defect in the specification, and finding it is the exercise.**

**Then, on a real backend.** Yours, or an open-source service you can read.

4. Take one endpoint. List what the handler does, using the "and" test from the core
   architecture topic.
5. Classify each part: HTTP, rule, or data access.
6. Find one business rule in it. Say where it lives now and where it should live.
7. Extract it. Show the before and after, and write a test for it that needs no database.
8. Time that test. Then time an existing test that covers the same rule through the endpoint,
   if one exists. Report both, or say that none existed — **which is itself the finding.**
9. Run the import check from the second exercise against the real layer names in that project.
   Report any violations.`,
      rubric: [
        { criterion: 'The rule extracted', description: 'Plain values in, a decision out, with the ordering and boundary cases right.', maxPoints: 20 },
        { criterion: 'Direction encoded', description: 'All permitted and forbidden pairs correct.', maxPoints: 15 },
        { criterion: 'The specification defect found', description: 'Notices the self-import inconsistency and says what it should be.', maxPoints: 15 },
        { criterion: 'A real endpoint classified', description: 'Parts listed and labelled HTTP, rule or data access.', maxPoints: 15 },
        { criterion: 'A rule actually moved', description: 'Before and after shown, with a test that needs no database.', maxPoints: 20 },
        { criterion: 'Timed, or the absence reported', description: 'Both timings, or an honest note that no test existed.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def refund_decision(days_ago, status, amount, refunded):
    return 'allowed'


parts = sys.stdin.readline().split()
print(refund_decision(int(parts[0]), parts[1], int(parts[2]), parts[3] == 'yes'))
`,
        tests: [
          { input: '5 completed 1000 no\n', expectedOutput: 'allowed' },
          { input: '40 completed 1000 no\n', expectedOutput: 'window_closed' },
          { input: '5 pending 1000 no\n', expectedOutput: 'not_completed' },
          { input: '30 completed 1000 no\n', expectedOutput: 'allowed', isHidden: true },
          { input: '5 completed 0 no\n', expectedOutput: 'zero_amount', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A test of a properly extracted refund rule needs:',
        [['Four values', true],
          ['A database transaction', false],
          ['A request context', false],
          ['A fixture for the order', false]],
        'Which is the whole argument for having extracted it.'),
      mcq('Who should decide which reason wins when two apply?',
        [['The business, since it is a rule and not an implementation detail', true],
          ['The developer, as it is an ordering choice', false],
          ['The API design, since it affects the response', false],
          ['Whoever wrote the first version of the check', false]],
        'It changes what a user is told, which makes it a decision somebody owns.'),
      mcq('`domain domain` being both ok and a violation is:',
        [['A defect in the specification, and finding it is the exercise', true],
          ['Correct, since self-imports are a special case', false],
          ['An edge case the rules deliberately leave open', false],
          ['A consequence of the domain importing nothing', false]],
        'A specification that contradicts itself is a real finding, and students should say so.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_ARCH_MINI_PROJECT',
    notes: `Take a service with everything in the controllers and give it a spine — measuring
what changes rather than asserting that it is better.

The brief's measurement is **the fastest test in the suite**. It is a single number, it is hard
to argue with, and it tracks almost exactly what this topic is about: if nothing can be tested
without the world, nothing is isolated.

Budget around two hours, and use real code rather than a fresh project.`,
    assignment: {
      title: 'Mini Project — Give a Service a Spine',
      description: 'Restructure a real backend into controller, service and repository, measured by what becomes testable.',
      instructions: `**Choose** a backend service with at least six endpoints, where the logic
lives in the handlers. Your own is ideal; an open-source one you can run is fine.

**Part one — measure what is there**

1. Time the whole suite, and time the **fastest single test**. Report both.
2. Pick your three most important business rules. For each, say where it lives and what a test
   of it currently requires.
3. Count the concerns in your largest handler, using the "and" test.
4. Draw the real import graph. Note any cycles.

**Part two — the change**

5. Pick **one** endpoint. Split it into controller, service and repository.
6. The service must not import the framework. **Check with a grep, not by inspection.**
7. Inject the repository rather than constructing it. Say where the wiring happens.
8. Do it in small commits with the tests green at each — the refactoring topic's discipline
   applies here.

**Part three — measure what changed**

9. Write a test for the business rule that needs no database and no web client. Time it.
10. Report the fastest test in the suite now, against before.
11. Write a **second caller** for the same service method — a CLI command, a management script
    or a test that calls it directly. Show it working. **This is the proof that the extraction
    was real**, and it is the part that cannot be faked.

**Part four — the honest assessment**

12. How many files did the change touch? Was that more or less than you expected?
13. Is the service layer doing anything, or is it a pass-through? **If it is a pass-through,
    say so** — and either give it the rule it should own or argue that this endpoint did not
    need the layer.
14. Would you do this to the other five endpoints? Say why or why not, in terms of what each
    would buy.
15. Name one thing that got **worse**. There is always one — more files, more indirection, a
    longer path to read.

**Submit** the before and after timings, the commit sequence, the second caller working, and
answers to 12–15.`,
      rubric: [
        { criterion: 'Measured before', description: 'Suite time, fastest test, and what each rule currently needs.', maxPoints: 15 },
        { criterion: 'One endpoint split properly', description: 'Three layers, no framework import in the service, checked by grep.', maxPoints: 20 },
        { criterion: 'Small green commits', description: 'The refactoring discipline applied, with the history to show it.', maxPoints: 15 },
        { criterion: 'A test with no world', description: 'The rule tested in isolation, and timed.', maxPoints: 15 },
        { criterion: 'A second caller', description: 'The same service method invoked from somewhere that is not HTTP.', maxPoints: 20 },
        { criterion: 'Honest about the cost', description: 'Names what got worse, and whether the layer earns its keep.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The single measurement that tracks this topic best is:',
        [['The time of the fastest test in the suite', true],
          ['The total suite runtime', false],
          ['The number of files per change', false],
          ['The count of layering violations', false]],
        'If nothing can be tested without the world, nothing is isolated.'),
      mcq('The second caller is required because:',
        [['It is the proof the extraction was real and cannot be faked', true],
          ['Most services eventually need one', false],
          ['It exercises the injected dependencies', false],
          ['It demonstrates the service is reusable', false]],
        'A service that only HTTP can call has not actually been separated.'),
      mcq('The brief asks what got worse because:',
        [['There is always something — files, indirection, path length', true],
          ['Restructuring usually introduces bugs', false],
          ['It checks the student measured honestly', false],
          ['Some endpoints do not benefit from layering', false]],
        'A report with no cost has not been written honestly.'),
    ],
  },

  /* ══ T3_BACKEND_DATA ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_BACKEND_DATA_TRANSACTIONS_IN_A_SERVICE',
    notes: `The core topic taught what a transaction is and why read-modify-write loses updates.
This one is about **where the transaction boundary goes when a service call spans three
writes** — which is a design question, not a database one.

## The question

    def place_order(self, data, user):
        order = self.orders.create(...)        # write 1
        self.stock.decrement(data.items)       # write 2
        self.payments.charge(order)            # write 3 — a network call
        self.notifier.order_placed(order)      # write 4 — an email

Where does \`BEGIN\` go, and where does \`COMMIT\`?

## The layer that owns the boundary

**Not the repository.** Each repository method wrapping itself in a transaction means four
transactions and no atomicity between them — and worse, it looks safe.

**Not the controller**, usually. It would work, and it puts a database concept in the layer
that is supposed to know only HTTP.

**The service**, because the service is the use case, and **the use case is exactly the unit of
work that should succeed or fail together.** That is not a coincidence; it is what a use case
means.

    def place_order(self, data, user):
        with self.uow:                     # the service owns the boundary
            order = self.orders.create(...)
            self.stock.decrement(data.items)
        self.payments.charge(order)        # deliberately outside
        self.notifier.order_placed(order)  # deliberately outside

## Why the external calls are outside

**A transaction is a lock held.** Three seconds waiting for a payment provider is three seconds
of held locks, and under load the connection pool fills with transactions waiting on somebody
else's server.

**And the rollback does not work anyway.** If the charge succeeds and the transaction then
rolls back, you have taken money for an order that does not exist. **Rolling back your database
does not roll back their charge**, so including it bought you nothing and cost you the locks.

## What that leaves you with

**An inconsistency you have to design for**, and this is the part that is genuinely hard.

Between the commit and the charge, the process can die. Now there is an order with no payment.
The options:

**An outbox.** Write the intent to a table **inside** the transaction, and have a separate
worker read it and perform the call. The intent is atomic with the order; the call is retried
until it succeeds. **This is the standard answer** and it is worth knowing by name.

**Reconciliation.** A periodic job finding orders with no payment and resolving them. Cruder,
and often enough.

**Idempotent retry.** The caller retries with the same key, and the charge is safe to repeat.
The transactions topic covered the mechanism.

**Accept it, and say so.** For a low-value flow, an occasional orphaned order fixed by hand may
genuinely be cheaper than the machinery. **Writing that decision down is what makes it
engineering rather than neglect.**

## Practical rules

**One transaction per request, usually.** Nested ones are rarely what you want, and the
savepoint semantics surprise people.

**Keep it short.** Everything slow, external or unnecessary goes outside.

**Do not hold one across a user interaction.** "Begin a transaction, show a form, commit on
submit" holds locks for as long as somebody takes to type.

**Know your framework's default.** Many wrap each request automatically; many do not. **Check
rather than assume**, because the failure mode of assuming wrongly is a partial write that
nothing reports.`,
    mcqs: [
      mcq('The transaction boundary belongs in the service because:',
        [['The use case is the unit of work that should succeed or fail together', true],
          ['The service is where the framework middleware runs', false],
          ['Repositories should not know about transactions', false],
          ['The controller cannot access the connection', false]],
        'Not a coincidence — that is what a use case means.'),
      mcq('Each repository method opening its own transaction:',
        [['Gives four transactions and no atomicity, while looking safe', true],
          ['Is correct if they share one connection', false],
          ['Reduces lock contention overall', false],
          ['Is the standard pattern in most frameworks', false]],
        'The looking-safe part is what makes it dangerous.'),
      mcq('Including a payment call inside the transaction is wrong partly because:',
        [['Rolling back your database does not roll back their charge', true],
          ['The provider may reject transactional requests', false],
          ['The call cannot be retried afterwards', false],
          ['The transaction will time out', false]],
        'So it bought you nothing and cost you three seconds of held locks.'),
      mcq('The standard answer to the gap between commit and external call is:',
        [['An outbox table written inside the transaction', true],
          ['A longer transaction covering both', false],
          ['A distributed transaction across both systems', false],
          ['Retrying the whole request on failure', false]],
        'The intent is atomic with the order; the call is retried until it succeeds.'),
    ],
    checkpoint: [
      mcq('Accepting an occasional orphaned order is:',
        [['Engineering, if the decision is written down', true],
          ['Always unacceptable for anything involving money', false],
          ['A sign the outbox pattern was too complex', false],
          ['Only valid where volumes are very low', false]],
        'Writing it down is what separates it from neglect.'),
      mcq('Holding a transaction across a user filling in a form:',
        [['Holds locks for as long as somebody takes to type', true],
          ['Guarantees the data cannot change underneath them', false],
          ['Is acceptable with optimistic locking', false],
          ['Times out safely in most databases', false]],
        'Which is the clearest case of a transaction held too long.'),
      mcq('You should check your framework’s transaction default because:',
        [['Assuming wrongly produces a partial write nothing reports', true],
          ['Defaults differ between database engines', false],
          ['It affects the isolation level in use', false],
          ['Middleware ordering can change the behaviour', false]],
        'Many frameworks wrap each request; many do not.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_DATA_N_PLUS_ONE',
    notes: `The core database topic named the N+1. This unit is about finding it in a real
service, where it is generated by an ORM, hidden behind a property access, and invisible in
every plan.

## What it looks like in code

    orders = Order.objects.filter(status='shipped')   # 1 query
    for order in orders:
        print(order.customer.name)                    # 1 query each

**Nothing here looks like a query.** \`order.customer\` is an attribute access, and that is the
whole problem: the ORM makes the expensive thing look free, deliberately, because that is what
makes ORMs pleasant.

**It gets worse with nesting.** Orders, then each order's customer, then each customer's
address: 1 + N + N queries. At 200 orders that is 401.

**And worse in a serialiser.** A field that calls a method that touches a relation produces a
query per row, and the code responsible is in a different file from the loop.

## Seeing it

**Count the queries per request.** Every mature framework can log this, and almost nobody turns
it on. **A number next to each endpoint is the single most valuable observability addition a
backend can have**, because it turns an invisible problem into an obvious one.

**Set a threshold in tests.**

    with assert_max_queries(5):
        client.get('/orders')

**This is the highest-value test in a backend suite** and it is rare. It fails the moment
somebody adds a field that touches a relation, which is exactly when you want to know — at the
pull request rather than at the incident.

**Log the query count in development.** A middleware that prints it on every response makes the
problem visible while you are writing the code.

## Fixing it

**Eager loading.** Tell the ORM to fetch the relation up front — \`select_related\`,
\`joinedload\`, \`includes\`, depending on your framework. One join, one query.

**Batch loading.** Fetch the ids, then fetch all the related rows in one query, then map them.
Two queries regardless of N. Useful when a join would multiply rows awkwardly.

**Denormalise the count.** If you only need "how many items", store it on the order rather than
counting per row. A real trade — it must be kept correct — and often the right one.

**Do not fetch it.** The most underrated fix. If the list does not need the customer name, do
not include it.

## The trap on the other side

**Eager loading everything.** Fetching every relation on every query produces enormous joins
that return duplicated rows and a response nobody needed.

    Order.objects.select_related('customer', 'address', 'items', 'payments')   # for a list of ids

**N+1 and over-fetching are the two failure modes, and the fix for one causes the other.** The
answer is per-endpoint: fetch what this response needs, and nothing else.

## Where it hides

**In a template or serialiser.** The loop is in one file and the relation access is in another.

**Behind a property.** \`order.total\` that sums \`self.items\` looks like a field.

**In a permission check.** A per-object authorization check that loads the owner is an N+1 in
the security layer, and it is the one people never think to look for.

**In logging.** A log line including \`order.customer.name\` runs a query per log line, which
is a query per row in a loop that was otherwise fine.`,
    mcqs: [
      mcq('The N+1 hides in an ORM because:',
        [['An attribute access does not look like a query', true],
          ['The queries are batched by the driver', false],
          ['The ORM caches the first result', false],
          ['Each query is too fast to notice', false]],
        'Deliberately so — it is what makes ORMs pleasant.'),
      mcq('The single most valuable observability addition for this is:',
        [['A query count next to each endpoint', true],
          ['A slow query log threshold', false],
          ['Tracing spans per database call', false],
          ['A dashboard of total query volume', false]],
        'It turns an invisible problem into an obvious one.'),
      mcq('`assert_max_queries` in a test is valuable because:',
        [['It fails when somebody adds a field that touches a relation', true],
          ['It measures the endpoint’s response time', false],
          ['It prevents queries running in tests at all', false],
          ['It documents the expected query plan', false]],
        'At the pull request rather than at the incident.'),
      mcq('Eager loading every relation produces:',
        [['Enormous joins returning duplicated rows nobody needed', true],
          ['The same cost as the N+1 it replaced', false],
          ['Correct behaviour with a small memory cost', false],
          ['A query plan the database cannot optimise', false]],
        'N+1 and over-fetching are two failure modes, and each fix causes the other.'),
    ],
    checkpoint: [
      mcq('The most underrated fix for an N+1 is:',
        [['Not fetching the data at all', true],
          ['Denormalising the value onto the parent', false],
          ['Batch loading in two queries', false],
          ['Caching the related rows', false]],
        'If the list does not need the customer name, do not include it.'),
      mcq('An N+1 in a per-object permission check is notable because:',
        [['Nobody thinks to look for one in the security layer', true],
          ['It cannot be fixed by eager loading', false],
          ['It only appears for authorised users', false],
          ['It is generated by the framework rather than your code', false]],
        'A check that loads the owner, once per row.'),
      mcq('A log line containing `order.customer.name` inside a loop:',
        [['Runs a query per log line', true],
          ['Is resolved once and cached', false],
          ['Is evaluated lazily and usually skipped', false],
          ['Adds negligible cost compared with the write', false]],
        'Turning a fine loop into an N+1 through the logging.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_DATA_MEASURING_THE_ENDPOINT',
    notes: `An endpoint takes 2.1 seconds. **Where does the time go?** Most people guess, change
something, and check whether it feels faster.

## Break the request into parts

A backend request is roughly: framework overhead, authentication, deserialisation, database
queries, business logic, external calls, serialisation, and response.

**Measure each.** The simplest useful version is a middleware that records the total and a
timer around the database layer:

    total: 2100ms
      db:         180ms  (across 340 queries)
      external:  1750ms  (one call to the pricing service)
      other:      170ms

**That table ends the conversation.** Nobody argues about which index to add once they can see
that 83% of the time is one HTTP call to another service — and the instinct, every time, is to
look at the database first.

## What to instrument

**Query count and total query time.** Both, separately. 340 queries totalling 180ms is an N+1
that is not yet your problem; 3 queries totalling 1,800ms is one slow query. **The same total
with different counts means completely different work.**

**Every external call**, with its duration. These are almost always the largest single
contributor and the least visible, because nothing in your code looks slow.

**The serialisation step**, if responses are large. Rendering ten thousand objects to JSON is
real time and it surprises people.

## The percentiles, again

**Measure p50, p95 and p99, not the mean.** An endpoint averaging 200ms with a p99 of 8 seconds
has a real problem affecting one request in a hundred, and the mean hides it completely.

**And measure per endpoint.** An application-wide average is almost meaningless: it mixes a
health check at 2ms with a report at 4 seconds.

## The order of work

1. **Find the slowest endpoint by total time consumed** — p95 multiplied by call volume, not
   p95 alone. **An endpoint at 3 seconds called twice a day matters less than one at 300ms
   called ten thousand times an hour**, and optimising by latency alone gets this backwards
   constantly.
2. **Break that endpoint into parts.**
3. **Attack the largest part.**
4. **Re-measure.** The core topic's rule: the plan changing is not the same as being faster.

## What people optimise instead

**The code they find interesting.** A clever algorithmic improvement to something taking 4ms.

**The thing they just learned about.** Having read about indexes, everything looks like a
missing index.

**The thing that is easy to change.** Frequently not the thing that is slow.

**Measurement is what stops all three**, and it costs an afternoon to set up once.

## Reporting it

> "\`GET /orders\`, p95 1,840ms, 12,000 calls/hour. Breakdown: 340 queries at 210ms total
> (N+1 on customer), one pricing-service call at 1,400ms, serialisation 180ms. Fixing the N+1
> saves ~180ms. **The pricing call is 76% of it and is not ours.**"

**The last sentence is the finding.** Two days of database work would have saved a tenth of
what one conversation with the pricing team could.`,
    mcqs: [
      mcq('340 queries totalling 180ms against 3 queries totalling 1,800ms:',
        [['Are completely different problems with a similar total', true],
          ['Are equivalent in impact on the endpoint', false],
          ['Both indicate a missing index', false],
          ['Differ only in how they should be logged', false]],
        'One is an N+1 that is not yet costing you; the other is one slow query.'),
      mcq('Endpoints should be prioritised by:',
        [['p95 multiplied by call volume', true],
          ['p95 alone', false],
          ['Mean response time', false],
          ['Total queries executed', false]],
        '300ms ten thousand times an hour beats 3 seconds twice a day.'),
      mcq('External calls are the least visible contributor because:',
        [['Nothing in your own code looks slow', true],
          ['They are excluded from most middleware timers', false],
          ['They usually run asynchronously', false],
          ['Their duration varies too much to measure', false]],
        'And they are almost always the largest single one.'),
      mcq('The three things people optimise instead of the slow thing are:',
        [['What is interesting, what they just learned, what is easy', true],
          ['The database, the cache and the network', false],
          ['The newest code, the oldest code and the biggest file', false],
          ['What the profiler shows first, last and loudest', false]],
        'Measurement is what stops all three.'),
    ],
    checkpoint: [
      mcq('An application-wide average response time is:',
        [['Almost meaningless, since it mixes a health check with a report', true],
          ['A useful indicator of overall health', false],
          ['Valid if weighted by call volume', false],
          ['The right metric for capacity planning', false]],
        'Measure per endpoint, and in percentiles.'),
      mcq('"The pricing call is 76% of it and is not ours" is the finding because:',
        [['Two days of database work would save a tenth of one conversation', true],
          ['External dependencies should always be removed', false],
          ['It shifts responsibility to another team', false],
          ['It shows the endpoint cannot be optimised', false]],
        'Which is the point of breaking the request into parts before choosing.'),
      mcq('Rendering ten thousand objects to JSON:',
        [['Is real time and surprises people', true],
          ['Is negligible compared with the queries', false],
          ['Is handled off the request thread', false],
          ['Scales sub-linearly with the object count', false]],
        'Worth instrumenting when responses are large.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_DATA_DEBUGGING',
    notes: `Five data problems that appear in a service rather than in a database. Each is
diagnosed from the application side.

## 1. The write that half happened

**Symptom:** an order exists with no line items. A payment with no order. Data that violates an
invariant nobody wrote down.

**Causes:** no transaction at all; a transaction that committed before the second write; an
exception caught inside the transaction and not re-raised.

**Diagnosis:** **write the invariant as a query and run it.** \`SELECT o.id FROM orders o LEFT
JOIN items i ON ... WHERE i.id IS NULL\`. If it returns rows, you have the bug and the affected
records at once — and this class of bug shows in the data long before anybody reports it.

## 2. The endpoint that is slow only for one customer

**Symptom:** p50 is fine, p99 is terrible, and the slow requests all belong to one account.

**Cause:** that account has 400,000 orders where everybody else has forty. A query with no
limit, or a plan chosen for the typical case.

**Diagnosis:** group your slow requests by account. **One account dominating is a data-shape
problem, not a query problem**, and the fix is usually pagination or a limit rather than an
index.

## 3. The deadlock under load

**Symptom:** intermittent errors at peak, none at other times.

**Cause:** two code paths taking the same locks in a different order — and in a service, the
paths are often two different endpoints that nobody compared.

**Diagnosis:** the database logs the deadlock with both statements. **Read them and find the
two orderings**, then sort.

## 4. The connection pool exhausted

**Symptom:** everything is slow at once; individual queries are fast; errors about acquiring a
connection.

**Causes:** a long transaction holding a connection; an external call inside a transaction; a
pool sized for last year; a leak where connections are not returned.

**Diagnosis:** look at **wait time for a connection**, which most pools report and almost
nobody monitors. If it is non-zero, the pool is your bottleneck and nothing about your queries
matters yet.

## 5. The migration that locked the table

**Symptom:** a deploy takes the site down for four minutes.

**Cause:** adding a column with a default, adding an index without \`CONCURRENTLY\`, or a
constraint that scans the whole table — all of which are instant on a development database with
a thousand rows and take minutes on ten million.

**Diagnosis and prevention:** **test migrations against production-sized data.** A migration
that is instant in development is not evidence of anything, and this is the single most common
self-inflicted outage in a backend team.

## The habits

**Write your invariants as queries** and run them on a schedule. Orphaned rows, negative
balances, sums that do not match. They find corruption before users do.

**Log the query count and the transaction boundaries** in development. Half these problems are
obvious the moment you can see where the transaction began.

**Test with production-shaped data.** Not production data — the *shape*: the skew, the volume,
the customer with four hundred thousand orders.`,
    mcqs: [
      mcq('The diagnosis for a half-completed write is:',
        [['Write the invariant as a query and run it', true],
          ['Search the logs for the failed request', false],
          ['Replay the request in a test environment', false],
          ['Check the transaction isolation level', false]],
        'It gives you the bug and the affected records at once.'),
      mcq('Slow requests all belonging to one account indicates:',
        [['A data-shape problem rather than a query problem', true],
          ['A caching issue specific to that tenant', false],
          ['A permission check running per row', false],
          ['A connection routed to a slower replica', false]],
        'The fix is usually pagination or a limit rather than an index.'),
      mcq('The signal that a connection pool is the bottleneck is:',
        [['Non-zero wait time for a connection', true],
          ['Queries taking longer than usual', false],
          ['Errors appearing at peak load only', false],
          ['High CPU on the database server', false]],
        'Most pools report it and almost nobody monitors it.'),
      mcq('A migration instant in development and four minutes in production:',
        [['Is the most common self-inflicted outage in a backend team', true],
          ['Indicates a difference in database versions', false],
          ['Means the migration should run outside a transaction', false],
          ['Suggests the index was built incorrectly', false]],
        'Test migrations against production-sized data.'),
    ],
    checkpoint: [
      mcq('Invariants written as queries and run on a schedule:',
        [['Find corruption before users report it', true],
          ['Replace the need for database constraints', false],
          ['Are only practical on small tables', false],
          ['Detect performance regressions early', false]],
        'Orphaned rows, negative balances, sums that do not match.'),
      mcq('In a service, deadlocking code paths are often:',
        [['Two different endpoints nobody compared', true],
          ['Two instances of the same handler', false],
          ['A handler and a background job', false],
          ['A migration and a live query', false]],
        'The database logs both statements; read them and find the orderings.'),
      mcq('"Production-shaped data" means:',
        [['The skew and volume, not the actual records', true],
          ['A recent copy of the production database', false],
          ['Anonymised production data in staging', false],
          ['Synthetic data matching the schema', false]],
        'The customer with four hundred thousand orders is the shape that matters.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_DATA_PRACTICE',
    notes: `Two exercises on the two things that go wrong in a service's data layer: where the
transaction boundary belongs, and counting the queries an endpoint will run.`,
    coding: [
      {
        title: 'Where does the boundary go?',
        description: `Read one step per line, each \`<kind> <name>\`, where kind is \`db_write\`,
\`db_read\`, \`external\` or \`compute\`.

Print the steps back, each prefixed with \`in\` or \`out\`, deciding which belong inside the
transaction:

- \`db_write\` → in
- \`db_read\` → in **only if** a \`db_write\` appears before it in the list; otherwise out
- \`external\` → out, always
- \`compute\` → out, always

Then a final line \`span=<first>..<last>\` naming the first and last step marked \`in\`, or
\`span=none\` if none are.

The rule for reads is the interesting one: a read before any write does not need the
transaction's guarantees, and a read after a write usually does.`,
        starter: `import sys

steps = [l.split() for l in sys.stdin if l.split()]

# Everything slow or external goes outside. A read only needs the transaction
# once something in it has already been written.
`,
        language: 'python',
        tests: [
          { input: 'db_read fetch_items\ndb_write create_order\nexternal charge\n', expectedOutput: 'out fetch_items\nin create_order\nout charge\nspan=create_order..create_order' },
          { input: 'db_write a\ndb_read b\ndb_write c\n', expectedOutput: 'in a\nin b\nin c\nspan=a..c' },
          { input: 'external x\ncompute y\n', expectedOutput: 'out x\nout y\nspan=none' },
          { input: 'db_read only\n', expectedOutput: 'out only\nspan=none' },
          { input: '', expectedOutput: 'span=none', isHidden: true },
          { input: 'db_write w\nexternal e\ndb_read r\n', expectedOutput: 'in w\nout e\nin r\nspan=w..r', isHidden: true },
        ],
      },
      {
        title: 'Count the queries',
        description: `Work out how many queries an endpoint runs, given how it fetches.

Read \`<rows> <strategy>\` then one relation per line as \`<name> <per_row>\`, where per_row is
\`yes\` if accessing it triggers a query per row.

Strategies:

- \`naive\` — one query for the rows, plus one per row for each per-row relation
- \`eager\` — one query total, whatever the relations
- \`batch\` — one query for the rows, plus one per per-row relation

Print the total query count.

A relation with per_row \`no\` costs nothing under any strategy — it was already loaded.`,
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
rows, strategy = int(lines[0][0]), lines[0][1]
relations = lines[1:]

# The strategy decides whether N multiplies, disappears, or becomes a constant.
`,
        language: 'python',
        tests: [
          { input: '100 naive\ncustomer yes\naddress yes\n', expectedOutput: '201' },
          { input: '100 eager\ncustomer yes\naddress yes\n', expectedOutput: '1' },
          { input: '100 batch\ncustomer yes\naddress yes\n', expectedOutput: '3' },
          { input: '100 naive\ncustomer no\n', expectedOutput: '1' },
          { input: '0 naive\ncustomer yes\n', expectedOutput: '1', isHidden: true },
          { input: '50 batch\n', expectedOutput: '1', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Backend Data Practice',
      description: 'Place a transaction boundary, count queries by strategy, then find a real N+1.',
      instructions: `Complete both exercises, then:

1. For the first: explain the read rule in your own words. Give a concrete case where a read
   before a write genuinely does need to be inside the transaction anyway, and say what makes
   it different.
2. For the first: the external step is always outside. Say what inconsistency that creates and
   name the standard pattern that resolves it.
3. For the second: at 100 rows, naive costs 201 and batch costs 3. Say at what row count you
   would stop caring, and why the answer depends on more than the count.
4. For the second: eager loading is 1 query and is not always best. Give a case where batch
   beats eager, and say what property of the data makes it so.

**Then, on a real service.** Yours, or an open-source one you can run.

5. Turn on query logging. Hit your three heaviest endpoints and record the query count for
   each.
6. Find an N+1. Show the code, the query count, and the relation causing it.
7. Fix it. Report the query count before and after, and the response time before and after.
8. Write a test that asserts a maximum query count for that endpoint. Show it passing, then
   reintroduce the N+1 and show it failing.
9. Break the endpoint's time into parts: database, external, other. Report the table.
10. Say what you would optimise next, and why — using the breakdown rather than instinct.`,
      rubric: [
        { criterion: 'Boundary placed correctly', description: 'All kinds handled, including the read rule and the empty case.', maxPoints: 20 },
        { criterion: 'Query counts by strategy', description: 'All three strategies, including zero rows and no relations.', maxPoints: 15 },
        { criterion: 'When batch beats eager', description: 'A real case, with the property of the data that causes it.', maxPoints: 15 },
        { criterion: 'A real N+1 found and fixed', description: 'Code, counts and times, before and after.', maxPoints: 25 },
        { criterion: 'A query-count test', description: 'Passing, then failing when the N+1 is reintroduced.', maxPoints: 15 },
        { criterion: 'A breakdown-driven next step', description: 'Chosen from the table rather than from instinct.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

lines = [l.split() for l in sys.stdin if l.split()]
rows, strategy = int(lines[0][0]), lines[0][1]
relations = lines[1:]
`,
        tests: [
          { input: '100 naive\ncustomer yes\naddress yes\n', expectedOutput: '201' },
          { input: '100 eager\ncustomer yes\naddress yes\n', expectedOutput: '1' },
          { input: '100 batch\ncustomer yes\naddress yes\n', expectedOutput: '3' },
          { input: '100 naive\ncustomer no\n', expectedOutput: '1' },
          { input: '50 batch\n', expectedOutput: '1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
    checkpoint: [
      mcq('A read before any write is outside the transaction because:',
        [['It does not yet need the transaction’s guarantees', true],
          ['Reads never require a transaction', false],
          ['It would hold a lock unnecessarily long', false],
          ['The data cannot have changed yet', false]],
        'A read after a write usually does need them, which is the interesting half of the rule.'),
      mcq('Batch loading beats eager loading when:',
        [['The join would multiply rows awkwardly', true],
          ['The relation is accessed rarely', false],
          ['The related table is very large', false],
          ['The ORM does not support eager loading', false]],
        'Two queries regardless of N, without a join that duplicates the parent rows.'),
      mcq('A maximum-query-count test should be verified by:',
        [['Reintroducing the N+1 and watching it fail', true],
          ['Checking the count matches the current value', false],
          ['Running it against production data', false],
          ['Comparing it with the query log', false]],
        'A test you have never seen fail may be testing nothing.'),
    ],
  },

  {
    unitCode: 'T3_BACKEND_DATA_MINI_PROJECT',
    notes: `Take a slow endpoint on a realistically sized dataset and make it fast — with the
breakdown driving every decision.

The brief is built so that **the biggest win is not the database**. That is deliberate and it
is the most common real situation: teams spend days on indexes while three quarters of the time
is in a call to another service or in serialising a response nobody needed.

Budget around two hours, most of it measuring.`,
    assignment: {
      title: 'Mini Project — Make One Endpoint Fast',
      description: 'Instrument, break down and optimise a real endpoint on realistic data, with the breakdown choosing the work.',
      instructions: `**Choose** a real backend endpoint that returns a list of something with
related data.

**Part one — make it realistic**

1. Generate enough data that the problem is real: at least 100,000 parent rows, with related
   rows. **Skewed** — most parents with few children, a handful with thousands.
2. Say how you generated it and how long it took.

**Part two — instrument**

3. Add query counting and query timing per request. Show the middleware or equivalent.
4. Add timing around any external calls and around serialisation.
5. Report the breakdown for the endpoint: total, database (count and time), external, other.
6. Report p50, p95 and p99 over at least 100 requests, including one for the largest parent.

**Part three — fix, in the order the breakdown says**

7. Name the largest contributor **before** changing anything, and predict what fixing it saves.
8. Fix it. Re-measure. Report predicted against actual, and explain any gap.
9. Repeat for the second largest.
10. **At least one of your fixes must not be a database change.** Removing a field, moving work
    off the request, caching a response, or a conversation with whoever owns the slow
    dependency. If everything really was the database, say so and show the breakdown that
    proves it.

**Part four — protect it**

11. Add a maximum-query-count test. Show it failing when you reintroduce the N+1.
12. Add a test for the largest-parent case, so the skew is covered.
13. Measure the write path: did any index you added slow inserts? Report both.

**Part five — report**

14. The full before-and-after table: total, p95, query count, and each part.
15. What you expected to be slow and what actually was.
16. What you did **not** fix, and why it was not worth it.
17. What would break first if the data grew another ten times.

**Submit** the generation script, the instrumentation, the breakdown tables before and after,
the tests, and answers to 15–17.`,
      rubric: [
        { criterion: 'Realistic, skewed data', description: '100,000+ rows with a realistic distribution, generated reproducibly.', maxPoints: 15 },
        { criterion: 'A real breakdown', description: 'Database, external and other, with counts and percentiles.', maxPoints: 20 },
        { criterion: 'Predicted before measured', description: 'The largest contributor named and a saving predicted before the change.', maxPoints: 15 },
        { criterion: 'A non-database fix', description: 'At least one, or a breakdown proving none was warranted.', maxPoints: 15 },
        { criterion: 'Protected by tests', description: 'Query count and skew both covered, the first shown failing.', maxPoints: 15 },
        { criterion: 'The write path checked', description: 'Insert timing before and after any index.', maxPoints: 10 },
        { criterion: 'What was not fixed', description: 'Named, with why it was not worth it.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The brief requires at least one non-database fix because:',
        [['Teams spend days on indexes while the time is elsewhere', true],
          ['Database changes are riskier to deploy', false],
          ['Index changes are usually reversible', false],
          ['It demonstrates a broader range of techniques', false]],
        'Three quarters of the time is often an external call or a response nobody needed.'),
      mcq('Predicting the saving before making the change tests:',
        [['Whether you understood the breakdown', true],
          ['Whether the measurement was accurate', false],
          ['Whether the fix was the cheapest available', false],
          ['Whether the endpoint was worth optimising', false]],
        'And the gap between predicted and actual is the interesting part.'),
      mcq('A test for the largest-parent case exists because:',
        [['The skew is where the plan and the pagination break', true],
          ['Large parents are the most common in production', false],
          ['It exercises the eager loading path', false],
          ['It measures the worst-case response time', false]],
        'A uniform test dataset hides the outlier problem entirely.'),
    ],
  },
];
