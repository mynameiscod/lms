/**
 * T3_ARCHITECTURE and T3_REFACTORING — fourteen units. Year 3.
 *
 * ── ARCHITECTURE WITHOUT THE SLIDES ───────────────────────────────────────────────────────
 *
 * Architecture is the topic most often taught as vocabulary: name the layers, recite the
 * patterns, draw the boxes. A student can pass that and still write a route handler containing
 * a SQL query, a currency conversion and an email.
 *
 * So every unit here is written against a file rather than a diagram. "What may this layer
 * know about" is a question you can answer by reading an import list. "Where does the boundary
 * go" is answered by what changed together in the last six months of git history, which is
 * evidence a student can actually go and collect.
 *
 * EXPENSIVE_TO_REVERSE is the unit that stops the topic producing over-engineers. Most
 * architectural advice is written as though every decision deserves a week, and the result is
 * students who spend three days choosing a folder structure. The distinction between a
 * one-way and a two-way door is the single most useful thing in the module.
 *
 * ── REFACTORING'S ONE IDEA ────────────────────────────────────────────────────────────────
 *
 * That it is not a rewrite. The definition is load-bearing: a sequence of behaviour-preserving
 * changes, each of which leaves the tests green. A student who believes "refactor" means "make
 * it nicer over three days on a branch" will produce exactly the disaster the debugging unit
 * describes, and no amount of technique will help them.
 *
 * WHEN_NOT_TO exists for the same reason EXPENSIVE_TO_REVERSE does. Working code nobody touches
 * is not a problem, and a student who cannot say that will refactor for its own sake forever.
 *
 * Attribution: T3_ARCHITECTURE is single-skill and derived. T3_REFACTORING defaults to
 * REFACTORING with TECHNICAL_DEBT overridden onto its own unit.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const ARCHITECTURE_BUNDLES: PilotBundle[] = [
  /* ══ T3_ARCHITECTURE ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_ARCHITECTURE_LAYERS',
    notes: `Layering is one rule: **each layer may depend on the one below it, and never on the
one above.** Everything else in this unit is a consequence.

## The four you will meet

- **Presentation** — HTTP handlers, CLI commands, screens. Turns a request into a call, and a
  result into a response. Knows about the web; knows nothing about the database.
- **Application** — use cases. "Place an order" as a sequence: validate, charge, save, notify.
  Knows *what* happens and in what order; not *how* any of it is done.
- **Domain** — the rules. What a valid order is, how a discount is calculated, when a refund is
  allowed. **Knows nothing about anything else**, which is the point.
- **Data** — how things are stored and fetched. SQL, files, other services.

## The dependency rule, and why it is worth obeying

**Everything can know about the domain. The domain knows about nothing.**

That is not tidiness, it is the property that makes each of these possible:

- **Test the rules without a database.** Domain logic with no imports has no setup. This is the
  biggest practical payoff and it is immediate.
- **Change the database without touching the rules.** Postgres to DynamoDB is a data-layer
  change, if nothing above leaked into the rules.
- **Add a second entry point.** A CLI alongside the web API is a new presentation layer over the
  same application layer. If your business logic lives in route handlers, you copy it or you
  call HTTP from your CLI, and both are bad.

## How to see a violation, in one look

Read the imports at the top of the file:

    # domain/order.py
    from django.http import HttpRequest       # <-- the domain knows about the web
    from psycopg2 import connect              # <-- and about Postgres

The domain importing a framework is the violation to look for first, and it is visible in three
seconds without reading a line of logic.

## Layers are not folders

You can have four perfect directories and a route handler that runs SQL. **The folder tells you
nothing; the import list tells you everything.** A codebase with two well-separated modules and
no folder structure is better layered than one with a beautiful tree and imports going
everywhere.

## When not to do this

**A three-file script does not need four layers.** Layering costs indirection, and indirection
costs reading time. The rule of thumb: add a layer when you have a *reason you can name* —
"I need to test this without a database", "there will be a second caller" — not because the
diagram has four boxes in it.

Premature layering is as real a problem as no layering, and it is more common in graduates.`,
    mcqs: [
      mcq('The dependency rule says:',
        [['A layer may depend downwards and never upwards', true],
          ['Each layer may depend only on the one directly below', false],
          ['Layers may not share types between them', false],
          ['The data layer sits beneath everything else', false]],
        'Everything can know about the domain; the domain knows about nothing.'),
      mcq('The immediate practical payoff of an isolated domain layer is:',
        [['The rules can be tested with no setup at all', true],
          ['The database can be swapped more easily', false],
          ['A second entry point becomes possible', false],
          ['The code becomes easier for a new reader', false]],
        'The other two are real and later; this one you get on day one.'),
      mcq('The fastest way to spot a layering violation is:',
        [['Read the import list at the top of the file', true],
          ['Check whether the folder structure matches', false],
          ['Trace a request through the application', false],
          ['Look for SQL inside the domain classes', false]],
        'The domain importing a framework is visible in three seconds.'),
      mcq('Four correct folders and SQL in a route handler means:',
        [['The code is not layered, whatever the tree says', true],
          ['The layering is correct but poorly enforced', false],
          ['The route handler belongs in the data layer', false],
          ['The folders need renaming to match the code', false]],
        'The folder tells you nothing; the import list tells you everything.'),
    ],
    checkpoint: [
      mcq('Business logic living in route handlers makes a CLI:',
        [['A copy of the logic, or a caller of your own HTTP', true],
          ['Impossible to add without a rewrite', false],
          ['Dependent on the data layer directly', false],
          ['Slower than the web entry point', false]],
        'Both options are bad, which is the argument for the application layer.'),
      mcq('You should add a layer when:',
        [['You can name the reason you need it', true],
          ['The project passes a certain size', false],
          ['The standard diagram includes it', false],
          ['More than one developer is involved', false]],
        'Premature layering is as real a problem as none, and commoner in graduates.'),
      mcq('The application layer knows:',
        [['What happens and in what order, not how', true],
          ['How each step is carried out', false],
          ['Which database technology is in use', false],
          ['How the response is formatted', false]],
        'Validate, charge, save, notify — the sequence, not the mechanics.'),
    ],
  },

  {
    unitCode: 'T3_ARCHITECTURE_BOUNDARIES',
    notes: `A boundary is **a promise about what can change independently**. That is the whole
definition, and it is more useful than any diagram.

If two things are on opposite sides of a boundary, changing one should not force a change to the
other. If it does, the boundary is in the wrong place — or it is not really there.

## Where to put one

**Between things that change for different reasons, at different rates, or on different
people's say-so.**

- Tax rules change when the government says so. Your checkout flow changes when product says so.
  **Different authority, different rate — that is a boundary.**
- The payment provider changes when a contract changes, perhaps once in three years. Your order
  logic changes weekly. Boundary.
- Two features that always change together, because they encode the same rule? **No boundary.**
  Putting one there means every change touches both sides and pays the cost of the seam for
  nothing.

## The evidence is in your git history

This is the part that turns architecture from opinion into measurement.

    git log --name-only --since="6 months ago" | ...

Files that consistently change in the same commit belong together. Files that never change
together are candidates to separate. **You do not have to predict what will change — you can
look at what has.**

That is also the honest test of an existing boundary: if every feature touches both sides of it,
the boundary is wrong, and the git history says so in a way that an argument cannot.

## What a boundary costs

Boundaries are not free, and the cost is why "more boundaries" is not automatically better:

- **Indirection.** One more hop to read through when following a change.
- **Translation.** Data has to be converted at the seam, and that is code to write and keep
  correct.
- **A chance to be wrong.** A boundary in the wrong place is worse than none: it splits things
  that belong together, so every change is now two changes across a seam, plus the translation.

## The kinds, in increasing cost

1. **A function.** Cheapest, weakest. Enforced by nothing.
2. **A module or package.** Enforced by imports, and a linter can check it.
3. **An interface with two implementations.** Now the seam is explicit and swappable.
4. **A separate service.** Enforced by the network — and you have bought serialisation,
   versioning, partial failure, latency and deployment coordination.

**Start at the cheapest that works.** Almost every boundary that should be a module gets made a
service, usually because a service sounds more like architecture. Going from a module to a
service later is straightforward; coming back is not.

## The test

**Can you state what the boundary lets you change independently?**

"We could swap the payment provider without touching order logic." Good — specific, and
checkable.

"It separates concerns." That is not a boundary, it is a slogan, and it survives any
arrangement of code you like.`,
    mcqs: [
      mcq('A boundary is best defined as:',
        [['A promise about what can change independently', true],
          ['A separation between two areas of responsibility', false],
          ['An interface between two parts of a system', false],
          ['A limit on what each module may access', false]],
        'More useful than any diagram, and it tells you where to put one.'),
      mcq('Git history helps place boundaries because:',
        [['Files that change together belong together', true],
          ['It shows which files are most complex', false],
          ['It reveals who owns each part of the code', false],
          ['Frequently changed files need isolating', false]],
        'You do not have to predict what will change; you can look at what has.'),
      mcq('A boundary in the wrong place is worse than none because:',
        [['Every change becomes two changes plus translation', true],
          ['It is harder to remove than to add', false],
          ['It hides the real structure from readers', false],
          ['It prevents the code being tested in isolation', false]],
        'It splits things that belong together and charges you for the seam.'),
      mcq('Most boundaries that get made services should have been:',
        [['Modules', true], ['Functions', false], ['Interfaces', false], ['Left absent', false]],
        'A service sounds more like architecture, and buys serialisation and partial failure.'),
    ],
    checkpoint: [
      mcq('Two features that always change together should be:',
        [['On the same side of any boundary', true],
          ['Separated, so each can be understood alone', false],
          ['Joined by an explicit interface', false],
          ['Extracted into a shared module', false]],
        'A boundary there means every change touches both sides for nothing.'),
      mcq('"It separates concerns" fails as a justification because:',
        [['It survives any arrangement of the code', true],
          ['It describes a benefit rather than a boundary', false],
          ['It is too vague for a design document', false],
          ['It does not name the concerns involved', false]],
        'A real one names what you could change independently, and is checkable.'),
      mcq('A separate service, compared with a module, additionally costs:',
        [['Serialisation, versioning and partial failure', true],
          ['Indirection and translation at the seam', false],
          ['A linter rule to enforce the import', false],
          ['A second implementation of the interface', false]],
        'Module to service later is straightforward; coming back is not.'),
    ],
  },

  {
    unitCode: 'T3_ARCHITECTURE_SEPARATION_OF_CONCERNS',
    notes: `On a slide this is a platitude. In a file it is concrete, and you can do it this
afternoon.

## What it looks like when it is absent

    def process_order(request):
        data = json.loads(request.body)              # parsing
        if not data.get('items'):                    # validation
            return HttpResponse('bad', status=400)   # HTTP
        total = sum(i['price'] * i['qty'] for i in data['items'])
        if data.get('code') == 'SAVE10':             # business rule
            total *= 0.9
        cur = connection.cursor()                    # persistence
        cur.execute('INSERT INTO orders ...', [total])
        send_mail('Order received', ...)             # notification
        return HttpResponse(json.dumps({'total': total}))

Six concerns in twelve lines. It works, and here is what it costs:

- **You cannot test the discount rule** without an HTTP request, a database and a mail server.
- **Changing the discount** means editing a function that also knows about SQL.
- **The rule is invisible.** \`SAVE10\` is buried in a web handler, and the next person adding a
  discount will not find it and will add a second place.
- **Reusing it from a CLI or a job** is impossible without copying.

## Finding the seams

**Describe the function out loud. Every "and" is a seam.**

*"It parses the request, **and** validates it, **and** calculates the total, **and** applies
discounts, **and** saves it, **and** sends an email, **and** formats a response."*

Seven jobs, and you found them by talking rather than by analysis.

## After

    # domain/pricing.py  — no imports from the framework or the database
    def order_total(items, discount_code=None):
        total = sum(i.price * i.qty for i in items)
        return total * 0.9 if discount_code == 'SAVE10' else total

    # application/orders.py
    def place_order(items, discount_code, repo, notifier):
        total = order_total(items, discount_code)
        order = repo.save(items, total)
        notifier.order_received(order)
        return order

    # presentation/views.py
    def process_order(request):
        data = parse_order(request.body)     # raises on invalid
        order = place_order(data.items, data.code, order_repo, mailer)
        return JsonResponse({'total': order.total})

**\`order_total\` is now testable with no setup whatsoever.** That single fact is most of the
argument, and it is worth more than the diagram it came from.

## What it costs

Three files instead of one, and three hops to follow a request. **That is a real cost** and it
is why the answer is not always to split.

## When to leave it alone

- **The function is ten lines and does one job with a name that says so.** Splitting it makes
  two things to find instead of one.
- **The concerns genuinely always change together.** A validation that exists only for one
  endpoint may belong in that endpoint.
- **You are guessing.** Splitting on a predicted future need frequently splits along the wrong
  line, and then you have paid the cost and got a seam in the wrong place.

**Split when you feel the cost**, not before: when you want to test one part alone, when you
want to reuse one part, when two people keep colliding in the same file. Those are signals, and
they are better than a rule.`,
    mcqs: [
      mcq('The strongest argument for extracting a pure pricing function is:',
        [['It becomes testable with no setup at all', true],
          ['The handler becomes shorter to read', false],
          ['The rule can be reused in other places', false],
          ['It matches the standard layering', false]],
        'One fact, worth more than the diagram it came from.'),
      mcq('The quickest way to find the seams in a function is:',
        [['Describe it out loud and listen for "and"', true],
          ['Count the imports it depends on', false],
          ['Measure how many lines each part takes', false],
          ['Look for the branches in its logic', false]],
        'Seven jobs, found by talking rather than by analysis.'),
      mcq('A discount rule buried in a web handler mainly risks:',
        [['The next person adding a second place for discounts', true],
          ['The handler becoming too long to read', false],
          ['The rule being applied twice per request', false],
          ['The discount being visible to the client', false]],
        'It is invisible where somebody would look, so it gets duplicated.'),
      mcq('Splitting on a predicted future need is risky because:',
        [['The split often lands along the wrong line', true],
          ['The prediction delays delivering the feature', false],
          ['Future needs rarely arrive as expected', false],
          ['It creates more files than are justified', false]],
        'You pay the cost and get a seam in the wrong place.'),
    ],
    checkpoint: [
      mcq('The real cost of separating concerns is:',
        [['More files and more hops when following a change', true],
          ['Slower execution from the extra calls', false],
          ['Duplicated validation across the layers', false],
          ['More tests needed to cover the same code', false]],
        'Which is why the answer is not always to split.'),
      mcq('Which is a signal that it is time to split?',
        [['You want to test one part on its own', true],
          ['The function has grown past thirty lines', false],
          ['The file has more than one import', false],
          ['A new developer joined the project', false]],
        'Split when you feel the cost, not on a rule about length.'),
      mcq('A ten-line function doing one job with an accurate name should be:',
        [['Left alone', true],
          ['Split into helper functions', false],
          ['Moved into the domain layer', false],
          ['Given a test before anything else', false]],
        'Splitting it makes two things to find instead of one.'),
    ],
  },

  {
    unitCode: 'T3_ARCHITECTURE_EXPENSIVE_TO_REVERSE',
    notes: `Most architectural advice is written as though every decision deserves a week of
thought. The result is engineers who spend three days choosing a folder structure and ten
minutes choosing a database.

**Sort decisions by what it costs to change your mind.**

## Two kinds of door

**A two-way door.** Walk through, and if it is wrong, walk back. Cheap to reverse, so **decide
quickly, in minutes, and move on.** Getting it wrong costs an afternoon.

- Folder layout, file naming
- Most library choices in one module
- Code style, formatting
- Which test framework
- The internal shape of a function

**A one-way door.** Reversing it costs weeks or months, or is effectively impossible. **These
deserve real thought, and writing down.**

- **Your data model.** Once a million rows exist, changing the shape is a migration, a backfill
  and a window of two code paths.
- **Your public API.** Once someone integrates, you cannot change it without versioning and a
  deprecation period you do not control.
- **Splitting into services.** Easy to do, very hard to undo. Now you have a network between
  two things that used to be a function call.
- **The programming language,** and often the framework.
- **Anything that lands in a customer's URL, export file or integration.**

## The failure in both directions

**Over-thinking a two-way door.** Three days on a folder structure. The cost is the three days
and the reputational damage of being slow, and the structure will be reorganised anyway once
the code exists.

**Under-thinking a one-way door.** Choosing a data model in an afternoon because "we can change
it later". You cannot, cheaply, and the shape of your data will still be visible in three years.

**The second one is much more common in graduates**, because they have never lived with a
decision long enough to pay for it.

## Widening the door

Often you can turn a one-way door into a two-way one for very little:

- **Put an interface in front of it.** If all payment code goes through one module, swapping
  providers is a module rewrite rather than a project.
- **Version it from day one.** \`/v1/orders\` costs nothing now and is the difference between a
  new version and a breaking change later.
- **Do not expose it.** An internal id that never appears in a URL can be changed freely. The
  moment it is in a customer's bookmark it is permanent.
- **Keep it a module until you need a service.** The boundary is the valuable part; the network
  is the cost.

## What to write down

For one-way doors only: the context, the options considered, the choice, and the consequences
you accept. Half a page.

**Not for the two-way ones.** A decision record for a folder structure is a document that will
be wrong in a month and that nobody will delete, and writing them for everything is how teams
learn to ignore the whole practice.`,
    mcqs: [
      mcq('A two-way door decision should be:',
        [['Made quickly, because reversing it is cheap', true],
          ['Documented, so the reasoning is preserved', false],
          ['Deferred until more information arrives', false],
          ['Decided by the team rather than one person', false]],
        'Getting it wrong costs an afternoon. Spending three days on it costs three days.'),
      mcq('Which is a one-way door?',
        [['The shape of your data model', true],
          ['The folder layout of the project', false],
          ['The test framework in use', false],
          ['The formatting style of the code', false]],
        'Once a million rows exist, changing it is a migration, a backfill and two code paths.'),
      mcq('The more common failure among graduates is:',
        [['Under-thinking a one-way door', true],
          ['Over-thinking a two-way door', false],
          ['Documenting too many decisions', false],
          ['Deferring decisions for too long', false]],
        'They have never lived with a decision long enough to pay for it.'),
      mcq('`/v1/orders` from day one is valuable because:',
        [['It turns a breaking change into a new version', true],
          ['It documents the API for consumers', false],
          ['It allows two implementations to coexist', false],
          ['It signals the API is still evolving', false]],
        'It costs nothing now and widens a one-way door.'),
    ],
    checkpoint: [
      mcq('Writing a decision record for a folder structure is a problem because:',
        [['It will be wrong soon and nobody will delete it', true],
          ['Folder structures do not warrant documentation', false],
          ['It takes time better spent on the code', false],
          ['The reasoning is obvious to any reader', false]],
        'Writing them for everything is how a team learns to ignore the practice.'),
      mcq('An internal id becomes permanent the moment it:',
        [['Appears somewhere a customer can keep', true],
          ['Is written into the database schema', false],
          ['Is referenced by another module', false],
          ['Is included in the API response', false]],
        'A bookmark, an export or an integration — then it can never change.'),
      mcq('Putting an interface in front of a payment provider:',
        [['Turns a project into a module rewrite', true],
          ['Removes the need to choose carefully', false],
          ['Makes the provider swappable at runtime', false],
          ['Guarantees the two providers behave alike', false]],
        'Widening the door, which is the cheapest thing you can do about a one-way one.'),
    ],
  },

  {
    unitCode: 'T3_ARCHITECTURE_DEBUGGING',
    notes: `Five architectural problems. None of them is a bug; each is a shape that makes bugs
likely, and each has a symptom you can observe rather than an opinion you can hold.

## 1. The circular dependency

\`orders\` imports \`users\`, \`users\` imports \`orders\`. **Symptom:** an import error that
depends on which module loads first, or a lazy import buried mid-function to break the cycle.
**Cause:** the boundary is wrong — there is a third thing both need, or they are one thing
pretending to be two. **Fix:** extract the shared piece, or merge them. The lazy import is the
tell that somebody already knew and worked around it.

## 2. The change that touches eleven files

**Symptom:** adding one field means editing a model, a schema, a serialiser, a form, a
validator, a mapper, a test fixture... **Cause:** one concept smeared across many layers, each
with its own copy of its shape. **This is the cost of layering done badly**, and it is the
honest argument against over-layering. **Fix:** fewer layers, or one shared definition the
layers derive from.

## 3. The god object

\`UserService\` with forty methods, imported by everything. **Symptom:** every merge conflicts
in that file; nobody can describe what it does in one sentence. **Cause:** it became the place
things go when there is no obvious home. **Fix:** split by *reason to change* — authentication,
profile, billing — not by noun.

## 4. Business logic in the wrong layer

**Symptom:** you need the same rule in a background job and the only copy is inside an HTTP
handler. **Cause:** it was written where it was first needed. **Fix:** move it down to the
domain. **The tell to watch for is the second caller** — the first time a rule needs to run from
somewhere else is the moment its location becomes a problem, and copying it is the decision that
makes it permanent.

## 5. The leaky abstraction

    users = repo.find_all()
    users = users.filter(active=True).order_by('-created')   # <-- ORM, outside the repository

**Symptom:** the repository was supposed to hide the database, and callers are chaining ORM
methods on what it returns. Swapping the store is now impossible even though the interface
looks clean. **Cause:** the abstraction returns something that exposes what it was hiding.
**Fix:** return a plain list, or move the query into the repository. **The tell:** you cannot
write a second implementation of the interface without reimplementing the ORM.

## How to see these without opinions

**Draw the actual import graph.** Not the intended one — the real one, generated from the code.
It is the same tool as the graph mini project, and the cycles and the most-depended-on module
are visible immediately.

**Count files per change.** Take the last twenty commits and count the files each touched. A
consistently high number is problem 2, measured rather than felt.

**Ask where a rule lives, and check whether there are two.** Grep for the constant. If the same
number appears in three files, the rule is in three places whatever the diagram says.`,
    mcqs: [
      mcq('A lazy import buried mid-function usually means:',
        [['Somebody already hit a circular dependency', true],
          ['The module is expensive to load at start-up', false],
          ['The dependency is optional at runtime', false],
          ['The import order is being controlled deliberately', false]],
        'The workaround is the tell; the boundary is the problem.'),
      mcq('One field requiring edits in eleven files is:',
        [['The cost of layering done badly, measurable per commit', true],
          ['Normal for a well-separated codebase', false],
          ['A sign the model is too large', false],
          ['Caused by missing code generation', false]],
        'One concept smeared across layers, each holding its own copy of its shape.'),
      mcq('A god object should be split by:',
        [['Reason to change', true],
          ['The noun each method operates on', false],
          ['How often each method is called', false],
          ['Which team owns each method', false]],
        'Authentication, profile and billing change for different reasons and on different say-so.'),
      mcq('The tell for a leaky abstraction is:',
        [['You could not write a second implementation without the ORM', true],
          ['Callers need to know which database is behind it', false],
          ['The interface has more methods than expected', false],
          ['Queries are slower than writing SQL directly', false]],
        'The abstraction returns something that exposes what it was hiding.'),
    ],
    checkpoint: [
      mcq('The moment a rule’s location becomes a problem is:',
        [['When a second caller needs it', true],
          ['When the handler grows too long', false],
          ['When the rule changes for the first time', false],
          ['When it is reviewed by another engineer', false]],
        'And copying it at that moment is what makes the problem permanent.'),
      mcq('Grepping for a constant across the codebase tests:',
        [['Whether the rule lives in more than one place', true],
          ['Whether the constant is named well', false],
          ['How many layers the value passes through', false],
          ['Whether the value should be configurable', false]],
        'Three files, three copies of the rule, whatever the diagram says.'),
      mcq('The generated import graph is preferred over the intended one because:',
        [['It shows the cycles that actually exist', true],
          ['It is faster to produce than a diagram', false],
          ['It includes third-party dependencies too', false],
          ['It can be checked into version control', false]],
        'The same tool as the graphs mini project, applied to your own code.'),
    ],
  },

  {
    unitCode: 'T3_ARCHITECTURE_PRACTICE',
    notes: `Two exercises. The first is the separation you can do this afternoon; the second is
a boundary argued from evidence rather than taste.

The coding exercise deliberately has **no framework and no database** — it makes a pure rule
out of something tangled, and the test is simply that the rule can now be called with nothing
set up.`,
    coding: [
      {
        title: 'Extract the rule',
        description: `A shipping cost is currently computed inside a function that also parses
input and formats output. Pull the **rule** out so it can be called on its own.

Read one line: \`weight country express\` — a number, a two-letter code, and \`yes\` or \`no\`.
Print the cost as an integer.

The rule: base cost is 50 for \`IN\`, 300 otherwise. Add 20 per whole kilogram above the first.
Express doubles the total. A weight of 0 or less costs 0, whatever else is given.

**Your \`shipping_cost\` function must take plain values and return a number** — no parsing, no
printing. The hidden cases call it with values that never came from a line of text.`,
        starter: `import sys


def shipping_cost(weight_kg, country, express):
    # TODO: the rule, and only the rule. No input, no output.
    return 0


line = sys.stdin.readline().split()
if line:
    w, c, e = float(line[0]), line[1], line[2] == 'yes'
    print(int(shipping_cost(w, c, e)))
`,
        language: 'python',
        tests: [
          { input: '1 IN no\n', expectedOutput: '50' },
          { input: '3 IN no\n', expectedOutput: '90' },
          { input: '1 US no\n', expectedOutput: '300' },
          { input: '2 IN yes\n', expectedOutput: '140' },
          { input: '0 IN no\n', expectedOutput: '0', isHidden: true },
          { input: '-4 US yes\n', expectedOutput: '0', isHidden: true },
          { input: '2.5 US no\n', expectedOutput: '320', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Architecture Practice',
      description: 'Extract a rule from a tangled function, and argue a boundary from git history.',
      instructions: `**Part one — the extraction**

Complete the coding exercise. Then:

1. List the concerns the original function mixed, using the "and" test. Write the sentence out
   and mark each "and".
2. Say what your extracted function can now be tested with. Be literal: what setup does a test
   of \`shipping_cost\` need?
3. The 2.5 kg case: say what "per whole kilogram above the first" means for it, and where in
   your function that decision lives. If you had to guess, say so — an ambiguous rule is a real
   finding and it is the kind a reviewer should catch.

**Part two — a boundary from evidence**

Take a real repository — yours or an open-source one with at least six months of history.

4. Run something equivalent to \`git log --name-only --since="6 months ago"\` and find the five
   pairs of files that most often change in the same commit. Show your method.
5. For the top pair: are they in the same module? If not, say what that suggests.
6. Find two files that have **never** changed in the same commit but that sit in the same
   module. Say whether that is a candidate boundary or a coincidence, and why.
7. Name one boundary in that codebase and state what it lets you change independently. Then
   check it against the history: does every feature touch both sides? Report what you found,
   including if it contradicts the claim.

**Part three**

8. Pick one decision in a project you have worked on. Was it a one-way or a two-way door? Say
   how long you spent on it and whether that was proportionate. Be honest — "I spent two days on
   something reversible" is the answer this question is looking for.`,
      rubric: [
        { criterion: 'The rule extracted', description: 'A pure function, correct including zero, negative and fractional weights.', maxPoints: 20 },
        { criterion: 'The "and" test applied', description: 'The sentence written out with each concern marked.', maxPoints: 10 },
        { criterion: 'The ambiguity found', description: 'Notices the fractional-weight rule is under-specified and says where it is decided.', maxPoints: 15 },
        { criterion: 'Real history examined', description: 'A method shown, and five co-changing pairs from a real repository.', maxPoints: 20 },
        { criterion: 'A boundary checked', description: 'A claim, tested against the history, with a contradiction reported if found.', maxPoints: 20 },
        { criterion: 'One honest door', description: 'A real decision classified, with the time spent judged proportionate or not.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def shipping_cost(weight_kg, country, express):
    return 0


line = sys.stdin.readline().split()
if line:
    w, c, e = float(line[0]), line[1], line[2] == 'yes'
    print(int(shipping_cost(w, c, e)))
`,
        tests: [
          { input: '1 IN no\n', expectedOutput: '50' },
          { input: '3 IN no\n', expectedOutput: '90' },
          { input: '2 IN yes\n', expectedOutput: '140' },
          { input: '0 IN no\n', expectedOutput: '0', isHidden: true },
          { input: '2.5 US no\n', expectedOutput: '320', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 20,
      },
    },
    checkpoint: [
      mcq('A test of a properly extracted pricing rule needs:',
        [['No setup at all', true],
          ['A test database with sample rows', false],
          ['A request object to pass in', false],
          ['A mock of the notification service', false]],
        'Which is the single best argument for having extracted it.'),
      mcq('Two files that never change together but sit in one module are:',
        [['A candidate boundary, worth checking', true],
          ['Proof that the module is wrongly grouped', false],
          ['Evidence that one of them is dead code', false],
          ['Correctly placed, since they share a concern', false]],
        'Candidate, not conclusion — the brief asks which and why.'),
      mcq('Finding that every feature touches both sides of a boundary means:',
        [['The boundary is in the wrong place', true],
          ['The features are too large in scope', false],
          ['The boundary needs stronger enforcement', false],
          ['The two sides should share an interface', false]],
        'And the git history says so in a way an argument cannot.'),
    ],
  },

  {
    unitCode: 'T3_ARCHITECTURE_MINI_PROJECT',
    notes: `Take something you have already built, and restructure it — with a measurement
before and after rather than a feeling.

The brief insists on **your own existing code** because architecture on a greenfield project is
guesswork. On code you have lived with, you know what you have had to change and what fought
you, and that knowledge is exactly what the boundaries should be drawn from.

Budget around two hours. The "leave it alone" answer is available and defensible.`,
    assignment: {
      title: 'Mini Project — Restructure Something You Built',
      description: 'Re-architect an existing project of your own, measured before and after, with one decision recorded.',
      instructions: `**Choose** a project **you** wrote, at least 500 lines, that you have
changed more than once. Not a tutorial, not something new.

**Part one — what is there now**

1. Draw the real dependency graph, generated from the imports rather than from memory. Note any
   cycles.
2. Name the layers that exist, if any. If the answer is "there are none", say that — it is a
   common and honest answer.
3. Find one file doing more than one job. Apply the "and" test and write the sentence.
4. **Measure:** how many files does a typical change touch? Use your last ten commits and give
   the average.

**Part two — the change**

5. Make **one** structural change. One, not a rewrite. Extract a domain module, break a cycle,
   or pull business logic out of a handler.
6. Do it in small steps. Commit after each. **The test suite must pass at every commit** — if
   you have no tests, write enough to cover the thing you are moving before you move it, and say
   so.
7. Show the commit list.

**Part three — did it help**

8. Regenerate the dependency graph. What changed?
9. Write a test for something that was previously hard to test. Show the test and say what
   setup it needs now against what it would have needed before.
10. Take one plausible future change and count the files it would touch, before and after. Be
    honest if the number is the same.

**Part four — the record**

11. Write a decision record for the change: context, the options you considered, what you chose,
    and the consequences you accept. Half a page.
12. Say whether the change was a one-way or a two-way door.
13. Name one thing you deliberately did **not** restructure, and why leaving it was right.

**Submit** the two graphs, the commit list, the new test, the decision record, and answers to
8–13.`,
      rubric: [
        { criterion: 'Real code, honestly assessed', description: 'The student’s own project, with the actual graph and a measured change size.', maxPoints: 20 },
        { criterion: 'One change, in steps', description: 'Small commits, tests green at each, or tests written first and said so.', maxPoints: 20 },
        { criterion: 'A test that was hard before', description: 'Shown, with the setup compared before and after.', maxPoints: 20 },
        { criterion: 'Measured, not felt', description: 'File counts before and after, reported honestly including no change.', maxPoints: 15 },
        { criterion: 'The decision record', description: 'Context, options, choice, consequences — half a page, actionable later.', maxPoints: 15 },
        { criterion: 'What was left alone', description: 'One thing deliberately not touched, with a real reason.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('The brief requires your own existing code because:',
        [['You know what has actually had to change', true],
          ['It is faster than starting something new', false],
          ['Existing code is more likely to be badly structured', false],
          ['It demonstrates progress since you wrote it', false]],
        'Architecture on greenfield is guesswork; lived-with code has evidence in it.'),
      mcq('Requiring the tests to pass at every commit enforces:',
        [['That this is a refactor and not a rewrite', true],
          ['That the change is small enough to review', false],
          ['That the coverage does not fall', false],
          ['That each commit can be deployed', false]],
        'Which is the definition the refactoring topic is built on.'),
      mcq('Reporting that the file count did not change is:',
        [['A valid finding the brief asks for', true],
          ['A sign the restructure failed', false],
          ['A reason to make a second change', false],
          ['Evidence the measurement was wrong', false]],
        'Honest measurement includes measuring no improvement.'),
    ],
  },

  /* ══ T3_REFACTORING ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_REFACTORING_SMALL_STEPS_STAY_GREEN',
    notes: `**Refactoring is changing the shape of code without changing what it does.** The
definition is load-bearing and most people get it wrong.

> A sequence of small, behaviour-preserving changes, **each of which leaves the tests passing**.

If the tests are red for two days, you are not refactoring. You are rewriting, and you have
taken on a risk nobody agreed to.

## Why small steps rather than one good change

**You always know it still works.** Green after every step means the last step is the only
suspect. Nine hours into a rewrite, any of a thousand edits could be the problem, and finding it
costs more than the rewrite saved.

**You can stop anywhere.** A production incident, a priority change, a meeting — with small
steps, you commit and leave. With a half-finished rewrite you either abandon days of work or
carry a branch that rots.

**Review is possible.** Nobody meaningfully reviews a 2,000-line diff. They skim it and approve
it, and that is worse than no review because everyone believes it happened.

## The prerequisite

**You need tests first.** Without them you cannot tell a refactor from a break — that is not
advice, it is the definition, since "behaviour-preserving" is unverifiable otherwise.

If there are no tests for the code you are about to change:

1. **Write characterisation tests.** Not tests of what it *should* do — tests of what it
   *currently* does, including the parts that look wrong. Run the code, capture the output,
   assert it.
2. Refactor.
3. **Then** fix the behaviour that looked wrong, as a separate change, with its own test.

**Never change behaviour and structure in the same commit.** When something breaks, you will
not know which one did it, and reviewers cannot see the behaviour change hiding in a large
structural diff.

## A worked sequence

Turning a 200-line function into something readable:

1. Extract the innermost block into a function. Run tests. Commit.
2. Extract the next one. Run tests. Commit.
3. Rename a variable that lied about its contents. Run tests. Commit.
4. Notice two extracted functions take the same four arguments. Group them into an object. Run
   tests. Commit.
5. Notice the object and its functions belong together. Make it a class. Run tests. Commit.

**Five commits, each reviewable in a minute, tests green throughout.** Step 5 might never
happen, and that is fine — you can stop at 3 and the code is better than it was.

## The safety net your editor provides

Automated rename and extract-method are safe in a way manual editing is not: the tool
understands the syntax tree. **Use them.** A manual rename via find-and-replace hits a string
literal, a comment, or an unrelated variable of the same name — and that one does not fail
loudly.

## What it is not

- **Not a rewrite.** A rewrite throws away working code and every bug fix baked into it.
- **Not optimisation.** That changes behaviour along a dimension you measure — do it separately,
  with numbers.
- **Not a bug fix.** Do those separately too, and in the other order: fix the bug, then
  refactor.`,
    mcqs: [
      mcq('Tests red for two days means you are:',
        [['Rewriting, with a risk nobody agreed to', true],
          ['Refactoring a large component correctly', false],
          ['Taking steps that are slightly too big', false],
          ['Working without adequate test coverage', false]],
        'The definition requires green after each step; that is what makes it verifiable.'),
      mcq('Small steps matter most because:',
        [['The last step is the only suspect when it breaks', true],
          ['Each step is faster to complete', false],
          ['They produce a cleaner commit history', false],
          ['They make the change easier to plan', false]],
        'Nine hours in, a thousand edits are all suspects.'),
      mcq('Characterisation tests capture:',
        [['What the code currently does, including the odd parts', true],
          ['What the code is specified to do', false],
          ['The behaviour after the refactor is complete', false],
          ['Only the paths the refactor will touch', false]],
        'Run it, capture the output, assert it. Fix the odd parts separately, afterwards.'),
      mcq('Changing behaviour and structure in one commit is dangerous because:',
        [['You cannot tell which one broke it', true],
          ['The commit becomes too large to revert', false],
          ['The tests will fail for two reasons at once', false],
          ['It violates the refactoring definition', false]],
        'And a reviewer cannot see the behaviour change hiding in a structural diff.'),
    ],
    checkpoint: [
      mcq('A 2,000-line refactoring diff is worse than no review because:',
        [['It is skimmed and approved, and everyone believes it happened', true],
          ['It takes reviewer time without finding bugs', false],
          ['It cannot be reverted cleanly if wrong', false],
          ['It discourages reviewers from future reviews', false]],
        'The belief that review occurred is the harmful part.'),
      mcq('Automated rename is safer than find-and-replace because:',
        [['The tool understands the syntax tree', true],
          ['It is faster across a large codebase', false],
          ['It updates the tests at the same time', false],
          ['It can be undone in a single step', false]],
        'Find-and-replace hits a string literal or a comment, and does so silently.'),
      mcq('Stopping a refactoring sequence after step three is:',
        [['Fine — the code is better than it was', true],
          ['A partial change that should be reverted', false],
          ['Acceptable only if the tests still pass', false],
          ['A sign the sequence was planned badly', false]],
        'Being able to stop anywhere is one of the main reasons for small steps.'),
    ],
  },

  {
    unitCode: 'T3_REFACTORING_COMMON_REFACTORINGS',
    notes: `Knowing these by name matters for a reason that is not obvious: **a named refactoring
is a reviewable change.** "I extracted a function" tells a reviewer exactly what to check.
"I cleaned it up" tells them nothing, and they have to read everything.

## Extract function

The one you will use most. A block of code that does one identifiable thing becomes a function
with a name that says what.

**The trigger:** you are about to write a comment explaining what the next ten lines do. The
comment is the function name.

    # apply the loyalty discount        →      total = apply_loyalty_discount(total, customer)
    if customer.years > 2: ...

**The trap:** extracting something that takes seven parameters. That is not a separate thing, it
is a piece of this thing, and the parameter count is telling you the seam is in the wrong place.

## Rename

The highest value-to-risk ratio in this list, and the most neglected.

    d = get_data()            →       active_subscriptions = fetch_active_subscriptions()

**The trigger:** a name that lies, a name that abbreviates, or a name you had to look up the
meaning of. **A name that lies is worse than no name** — \`users\` holding a dict of ids costs
the next reader more than \`x\` would.

Always use the tool. Never find-and-replace.

## Introduce parameter object

Four parameters that always travel together become one thing.

    def book(start, end, room, attendees)   →   def book(booking: Booking)

**The trigger:** the same group of parameters appearing in three or more signatures. **The
payoff is not shorter signatures** — it is that the group now has a name and a place to put
validation, so "an end before a start" can be rejected once instead of at every call site.

## Replace conditional with polymorphism

A branch on a type or a mode, repeated in several places, becomes different objects.

    if kind == 'email': ...          class EmailNotifier:  send(self): ...
    elif kind == 'sms': ...     →    class SmsNotifier:    send(self): ...

**The trigger:** the *same* condition in more than one place. One switch statement is fine and
usually clearer. Three switches on the same field, all of which must be updated to add a case,
is the smell.

**The trap:** doing it for a two-branch condition that appears once. You have turned two
readable lines into two classes and a lookup, and made it harder.

## Inline

Sometimes the right move is to **remove** an abstraction. A function called once, whose body is
clearer than its name, should go back where it came from.

**Refactoring goes both ways.** A codebase can be too abstracted as easily as too tangled, and
graduates almost only ever extract.

## Guard clauses

    if user:                          if not user:
        if user.active:      →            return None
            if ...                    if not user.active:
                                          return None

**The trigger:** more than two levels of nesting. Handle the exits first and let the main path
sit unindented at the bottom.

## Choosing

**Do the one the code is asking for, not the one you know best.** The triggers above are what to
listen for. And do one at a time — an extract *and* a rename in one commit is two changes, and
a reviewer now has to separate them in their head.`,
    mcqs: [
      mcq('Naming a refactoring matters because:',
        [['A named change tells a reviewer exactly what to check', true],
          ['It documents the intent for future readers', false],
          ['Tools can verify the named refactorings', false],
          ['It shows familiarity with the vocabulary', false]],
        '"I cleaned it up" means they have to read everything.'),
      mcq('An extracted function needing seven parameters means:',
        [['The seam is in the wrong place', true],
          ['A parameter object should be introduced', false],
          ['The original function was too long', false],
          ['The extraction should use a class instead', false]],
        'It is a piece of this thing, not a separate thing.'),
      mcq('The payoff of a parameter object is mainly:',
        [['One place for the group’s validation to live', true],
          ['Shorter function signatures', false],
          ['Fewer arguments to pass around', false],
          ['Better type checking at call sites', false]],
        '"End before start" gets rejected once instead of at every call site.'),
      mcq('Replacing a conditional with polymorphism is justified by:',
        [['The same condition appearing in several places', true],
          ['A conditional with more than three branches', false],
          ['A switch statement that is hard to read', false],
          ['A type field stored on the object', false]],
        'One switch is fine and usually clearer. Three that must all be updated is the smell.'),
    ],
    checkpoint: [
      mcq('A name that lies is worse than no name because:',
        [['`users` holding ids misleads where `x` would not', true],
          ['It cannot be found by searching the code', false],
          ['It suggests the code was never reviewed', false],
          ['It is harder to rename safely later', false]],
        'The reader trusts it, and pays for trusting it.'),
      mcq('Inlining a function is the right move when:',
        [['It is called once and its body is clearer than its name', true],
          ['It is only used inside one module', false],
          ['It has become shorter than three lines', false],
          ['Its name no longer matches what it does', false]],
        'Refactoring goes both ways, and graduates almost only ever extract.'),
      mcq('Guard clauses are triggered by:',
        [['More than two levels of nesting', true],
          ['Any condition that returns early', false],
          ['A function with multiple exit points', false],
          ['Validation mixed with business logic', false]],
        'Handle the exits first; let the main path sit unindented.'),
    ],
  },

  {
    unitCode: 'T3_REFACTORING_TECHNICAL_DEBT',
    notes: `The metaphor is precise and it is worth taking literally. **You borrow time now and
pay interest later**, and like financial debt it is sometimes the right decision and sometimes
ruinous.

## Deliberate and accidental

**Deliberate debt** is a decision. *"We are hard-coding the tax rate to ship for the demo on
Friday. It will need to be configurable before any second country. Ticket ENG-412."*

That is a legitimate engineering choice. Shipping on Friday may be worth far more than a
configurable tax rate.

**Accidental debt** is not a decision. Nobody knew there was a better way, or nobody noticed the
shortcut being taken. It is the majority of debt in most codebases, and the difference is that
**nobody knows it is there.**

**The whole practice is making debt deliberate.** Not avoiding it — making it visible and
chosen. A codebase with twenty known shortcuts and tickets is in better shape than one with
five nobody has noticed.

## What the interest actually is

Debt does not cost you at the moment you take it. It costs on every subsequent change:

- The feature that took two days now takes five, because of what has to be worked around.
- Two bugs a month that would not exist with the proper structure.
- The new joiner who takes three weeks to be productive instead of one.

**If you never touch that code again, the debt costs nothing.** This is the part people miss,
and it is why "pay down all the debt" is not a strategy. Ugly code in a module nobody has opened
in two years is not costing you anything, and refactoring it is spending time to buy nothing.

**Interest is paid on code you are changing.** That is the whole heuristic for what to repay.

## When to repay

**Repay when you are about to change that code anyway.** The cost of understanding it is already
being paid, and the repayment is marginal.

**Do not repay** code that is stable, rarely touched, and works. However much you dislike it.

**Repay urgently** when the debt is *blocking* — when a feature genuinely cannot be built
without it, or when the same bug keeps coming back because the structure invites it.

## Recording it

A code comment is nearly worthless. Nobody greps for \`TODO\` before planning a quarter, and an
undated one from 2019 is noise.

Write a ticket: **what the shortcut is, what it will cost, what triggers repayment**.

> Hard-coded tax rate in \`checkout.py\`. Blocks any non-India launch. Repay when a second
> country is scheduled, or when checkout is next substantially changed. Est. 2 days.

"What triggers repayment" is the field people leave out and the one that makes it actionable.

## Talking about it with people who do not write code

Do not say "the code is messy" — that sounds like taste, and it loses every argument against a
feature request.

**Say it in time and risk.** *"Features in the checkout area take about twice as long as
elsewhere because of a shortcut from last year. Two days of work now would remove that. There
are four checkout items on the roadmap this quarter."*

That is a business case, it is checkable, and it is the version that gets scheduled.`,
    mcqs: [
      mcq('The difference between deliberate and accidental debt is:',
        [['Whether anybody knows it is there', true],
          ['Whether it was avoidable at the time', false],
          ['How much it will eventually cost', false],
          ['Whether it was reviewed before merging', false]],
        'The practice is making debt visible and chosen, not avoiding it.'),
      mcq('Debt in a module nobody has opened for two years:',
        [['Costs nothing, and repaying it buys nothing', true],
          ['Accrues interest silently over time', false],
          ['Should be repaid before it is forgotten', false],
          ['Is the cheapest debt to repay', false]],
        'Interest is paid on code you are changing. That is the whole heuristic.'),
      mcq('The best moment to repay debt is:',
        [['When you are about to change that code anyway', true],
          ['When a quarter has capacity for cleanup', false],
          ['As soon as the shortcut is identified', false],
          ['Before the next new joiner arrives', false]],
        'The cost of understanding it is already being paid; repayment is marginal.'),
      mcq('The field most often missing from a debt ticket is:',
        [['What triggers repayment', true],
          ['What the shortcut actually is', false],
          ['An estimate of the work', false],
          ['Which files are affected', false]],
        'And it is the one that makes the ticket actionable rather than a note.'),
    ],
    checkpoint: [
      mcq('A TODO comment is a poor record of debt because:',
        [['Nobody greps for them when planning', true],
          ['They are removed by automated tooling', false],
          ['They cannot describe the cost involved', false],
          ['They are invisible outside the file', false]],
        'And an undated one from 2019 is noise rather than information.'),
      mcq('Explaining debt to a non-engineer works best as:',
        [['Time and risk, with numbers from the roadmap', true],
          ['A description of what the code looks like', false],
          ['An estimate of the cleanup work required', false],
          ['A comparison with well-written code elsewhere', false]],
        '"The code is messy" sounds like taste and loses to every feature request.'),
      mcq('Twenty known shortcuts with tickets against five unnoticed ones is:',
        [['The better position, because the twenty are chosen', true],
          ['Worse, since there is four times the debt', false],
          ['Equivalent, since the code is the same', false],
          ['Worse, because the tickets will not be done', false]],
        'Visible and chosen is the goal; the count is not the measure.'),
    ],
  },

  {
    unitCode: 'T3_REFACTORING_WHEN_NOT_TO',
    notes: `Having learned to refactor, the next failure is refactoring everything. This unit is
the brake, and it is as important as the technique.

## Code that should be left alone

**Working code nobody touches.** A payroll module written in 2019, stable, no bugs, untouched
for a year. It is ugly. It is also **finished**, and the risk of touching it exceeds any benefit
you can name.

**Code you do not understand.** If you cannot say what it does, you cannot preserve behaviour.
The order is: understand it, write characterisation tests, then refactor. Skipping the first two
is how a "tidy-up" takes down production.

**Code that is about to be deleted.** A module being replaced next month does not need cleaning.

**Somebody else's in-flight work.** Refactoring a file another person has open creates a merge
conflict you have chosen to inflict on them. Ask, or wait.

**During an incident.** Fix it. Refactor later. An incident is not the moment for structural
improvement, however obvious the improvement.

## The question that decides it

> **What does this refactoring let us do that we cannot do now?**

Good answers, all concrete:

- "We can test the pricing rules without a database."
- "We can add the second payment provider without touching order code."
- "The bug that keeps recurring here becomes impossible."

Bad answers:

- "It'll be cleaner." *Cleaner for whom, and what does that get us?*
- "It's not best practice." *Best practice is context-dependent; name the cost you are paying.*
- "I don't like it." *Honest, and not a reason.*

**If the best answer you have is aesthetic, do not do it.** Not because taste is worthless, but
because you are spending real time and real risk on it, and the trade should be stated.

## The graduate failure mode

Arriving at a codebase and wanting to restructure it in the first month. It feels like
initiative and it usually is not, for three reasons:

1. **You do not yet know why it is like that.** Some of what looks wrong is a scar from a real
   incident, and removing it reintroduces the incident.
2. **You have no credit yet.** Restructuring somebody's code before you have shipped anything
   reads as criticism rather than contribution.
3. **You cannot yet tell load-bearing from accidental.** That takes a few months of changing it.

**The right move for the first few months:** change the code you have to change, leave it
slightly better than you found it, and keep a list. In three months your list will be much
better informed than it is today, and you will have the standing to act on it.

## The boy scout rule, honestly

"Leave it better than you found it" is good advice with a limit: **better, not perfect, and only
where you were already working.** Tidying the function you are editing is free. Tidying the
whole file is a separate change that belongs in a separate commit, and tidying the whole module
is a project that needs agreement.`,
    mcqs: [
      mcq('Code you do not understand should not be refactored because:',
        [['You cannot preserve behaviour you cannot describe', true],
          ['It is likely to be more complex than it looks', false],
          ['Someone else probably owns that area', false],
          ['The tests may not cover it adequately', false]],
        'Understand, characterise, then refactor. Skipping is how a tidy-up takes down production.'),
      mcq('The question that decides whether to refactor is:',
        [['What does this let us do that we cannot do now', true],
          ['How long will the refactoring take', false],
          ['How often is this code changed', false],
          ['Is the current structure best practice', false]],
        'And if the best answer is aesthetic, do not do it.'),
      mcq('Wanting to restructure a new codebase in month one is usually wrong because:',
        [['Some of what looks wrong is a scar from a real incident', true],
          ['New joiners are not given that responsibility', false],
          ['The codebase is probably fine as it is', false],
          ['It takes time away from learning the domain', false]],
        'Removing the scar reintroduces the incident.'),
      mcq('The boy scout rule’s limit is:',
        [['Better, not perfect, and only where you were working', true],
          ['Only in code you personally wrote', false],
          ['Only when the tests already cover it', false],
          ['Only changes that take under an hour', false]],
        'The whole file is a separate commit; the whole module needs agreement.'),
    ],
    checkpoint: [
      mcq('Restructuring a file somebody else is mid-way through changing:',
        [['Inflicts a merge conflict you chose to create', true],
          ['Is fine if your change is small', false],
          ['Should be done before they commit', false],
          ['Requires coordinating the two branches', false]],
        'The conflict is not bad luck, it is a cost you decided to impose. Ask them, or wait.'),
      mcq('"It is not best practice" is a weak justification because:',
        [['Best practice is context-dependent; name the cost', true],
          ['Practices change faster than codebases', false],
          ['It appeals to authority rather than evidence', false],
          ['Most codebases deviate in some way', false]],
        'The concrete version names what the deviation is costing you.'),
      mcq('The recommended approach for a new joiner is:',
        [['Improve what you touch, and keep a list', true],
          ['Propose a restructuring plan early', false],
          ['Refactor the worst module first', false],
          ['Wait until asked before changing anything', false]],
        'In three months the list is better informed and you have standing to act on it.'),
    ],
  },

  {
    unitCode: 'T3_REFACTORING_DEBUGGING',
    notes: `Five ways a refactoring goes wrong. The first two are the ones that reach
production.

## 1. Behaviour changed without anyone noticing

    if user and user.active:       →       if user.active:      # <-- None now raises

**Symptom:** a crash or a wrong answer on a path the tests did not cover. **Cause:** a
"simplification" that dropped a case. **Why it survives:** the tests pass, because the missing
case is exactly the one nobody tested — that is *why* it looked redundant. **Fix:** before
simplifying a condition, ask what input makes each clause matter. If you cannot produce one,
write a test that does before you remove it.

## 2. The rewrite disguised as a refactor

**Symptom:** a branch that is two weeks old, cannot be merged, and has diverged from main.
**Cause:** "refactor" was used to mean "rewrite". **The tell is the branch age.** A refactoring
branch should live hours, not weeks. **Fix:** you usually cannot, at that point. Take the
smallest useful piece, land it, and start again — which is what you should have done in the
first place.

## 3. Extract-function with a hidden dependency

    def process():
        total = 0
        for i in items: total += i.price   →   def compute(): ...  # \`total\` is gone

**Symptom:** a variable is unbound, or the value is right the first time and wrong afterwards.
**Cause:** the extracted block read or wrote something from the enclosing scope. **Fix:** use
the tool's extract-method, which finds these. Manual extraction misses one perhaps a quarter of
the time, and the ones it misses are the mutations.

## 4. Renamed in code, not in strings

**Symptom:** a config key stops matching, a serialised field disappears, a log-based alert goes
quiet. **Cause:** the rename tool changed the identifier and not the string literal that shares
its name — which is correct behaviour, and exactly what you needed it not to do here. **Fix:**
after any rename, grep for the **old** name across the whole repository, including
configuration, templates and migrations.

## 5. Refactored the tests along with the code

**Symptom:** everything passes and nothing is verified. **Cause:** the tests were adjusted to
match the new behaviour, which removes the only thing that could have told you the behaviour
changed. **Rule:** **the tests do not change during a refactor.** If a test must change, you are
changing behaviour — stop, and do that as its own commit with its own justification.

## Finding these

**Commit before every step**, so \`git diff\` shows exactly one change and \`git bisect\` works
if something surfaces later.

**Run the tests after every step, not at the end.** A green suite five steps ago and a red one
now localises the fault to one step.

**Review your own diff before pushing.** A structural diff should contain no changed literals,
no changed conditions and no changed test expectations. Anything in those three categories is
either a mistake or a behaviour change that belongs in another commit.`,
    mcqs: [
      mcq('Simplifying `if user and user.active` to `if user.active` survives the tests because:',
        [['The untested case is exactly the one that looked redundant', true],
          ['The tests mock the user object entirely', false],
          ['The change is equivalent for valid inputs', false],
          ['Truthiness checks behave the same way', false]],
        'Ask what input makes each clause matter; if you cannot say, test it before removing it.'),
      mcq('The tell for a rewrite disguised as a refactor is:',
        [['The age of the branch', true],
          ['The number of files changed', false],
          ['The test coverage falling', false],
          ['The number of review comments', false]],
        'Hours, not weeks. By week two you usually cannot recover it.'),
      mcq('After any rename you should grep for:',
        [['The old name, across configuration and templates too', true],
          ['The new name, to check for collisions', false],
          ['Both names, in the test files', false],
          ['The old name, in the source files only', false]],
        'The tool correctly left string literals alone, which is exactly the problem here.'),
      mcq('Tests changing during a refactor means:',
        [['Behaviour is changing, and it needs its own commit', true],
          ['The tests were coupled to the implementation', false],
          ['The refactoring steps were too large', false],
          ['The test suite needs restructuring too', false]],
        'Adjusting them removes the only thing that could have caught it.'),
    ],
    checkpoint: [
      mcq('Manual extract-function most often misses:',
        [['A variable the block mutates in the enclosing scope', true],
          ['A parameter that is never used', false],
          ['An early return inside the block', false],
          ['A name that shadows an outer one', false]],
        'Which is why the tool is worth using: it finds them.'),
      mcq('A structural diff should contain no:',
        [['Changed literals, conditions or test expectations', true],
          ['Deleted lines of any kind', false],
          ['New function definitions', false],
          ['Changes to more than one file', false]],
        'Anything in those three categories is a mistake or belongs in another commit.'),
      mcq('Running the tests after every step rather than at the end:',
        [['Localises a failure to a single step', true],
          ['Catches failures sooner in wall-clock time', false],
          ['Keeps the coverage figure from dropping', false],
          ['Ensures each commit is deployable', false]],
        'Green five steps ago and red now is a one-step search.'),
    ],
  },

  {
    unitCode: 'T3_REFACTORING_PRACTICE',
    notes: `One function that does too much, and one condition that is hiding a bug.

The first exercise is extract-function with the behaviour genuinely preserved — including the
edge cases in the original that look like mistakes and are not yours to fix.

The second is the trap from the debugging unit, made concrete: a condition that can be
"simplified" into a crash.`,
    coding: [
      {
        title: 'Preserve the behaviour, including the odd parts',
        description: `The function below grades a submission. It works. It is also doing four
things, and two of its behaviours look like bugs.

**Restructure it so \`score_of\` is a pure function of the marks list**, and keep every
behaviour exactly as it is — including the odd ones. Characterisation, not correction.

Read a line of integer marks. Print the grade letter.

Current behaviour, which you must preserve: marks above 100 are clamped to 100; a **negative**
mark is treated as 0; an empty list scores 0; the average is truncated, not rounded; the
boundaries are 70 for A, 50 for B, and anything below for C.`,
        starter: `import sys


def score_of(marks):
    # TODO: pure. Takes a list of ints, returns the integer average after clamping.
    return 0


def grade_of(score):
    # TODO: pure. Takes the score, returns 'A', 'B' or 'C'.
    return 'C'


marks = [int(x) for x in sys.stdin.readline().split()]
print(grade_of(score_of(marks)))
`,
        language: 'python',
        tests: [
          { input: '80 90\n', expectedOutput: 'A' },
          { input: '60 60\n', expectedOutput: 'B' },
          { input: '10 20\n', expectedOutput: 'C' },
          { input: '\n', expectedOutput: 'C' },
          { input: '150 50\n', expectedOutput: 'A', isHidden: true },
          { input: '-40 100\n', expectedOutput: 'B', isHidden: true },
          { input: '70 70\n', expectedOutput: 'A', isHidden: true },
          { input: '69 70\n', expectedOutput: 'B', isHidden: true },
        ],
      },
      {
        title: 'The condition that is not redundant',
        description: `Read lines of \`name status\`, where status may be missing. Print the
names of the active users, one per line.

A line with a name and no status means the record is incomplete — such a user is **not**
active. A status of \`active\` means active; anything else does not.

The obvious simplification of the check crashes on the incomplete line. Write the version that
does not, and make sure you know which input would have broken the simpler one.`,
        starter: `import sys

rows = [l.split() for l in sys.stdin if l.split()]

# Each row is [name] or [name, status]. Which check is safe, and why is the short one not?
`,
        language: 'python',
        tests: [
          { input: 'asha active\nravi inactive\n', expectedOutput: 'asha' },
          { input: 'mina\n', expectedOutput: '' },
          { input: 'asha active\nmina\nravi active\n', expectedOutput: 'asha\nravi' },
          { input: '', expectedOutput: '' },
          { input: 'solo Active\n', expectedOutput: '', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Refactoring Practice',
      description: 'Preserve behaviour through an extraction, and find the condition that is not redundant.',
      instructions: `Complete both exercises, then answer:

1. For the first: list the two behaviours that look like bugs. For each, say why you preserved
   it and what you would do about it instead.
2. For the first: the \`69 70\` case averages to 69.5. Say what the code does with it and why
   that is a characterisation test rather than a specification.
3. For the first: describe the commit sequence you would use to do this on a real codebase.
   Number them, and say what runs between each.
4. For the second: give the exact input that breaks the simplified check, and say what error it
   produces.
5. For the second: the debugging unit says "before simplifying a condition, ask what input makes
   each clause matter". Apply that here, clause by clause.
6. Take a function from your own code that is over forty lines. Apply the "and" test, list what
   you would extract, and say which single extraction you would do first and why that one.`,
      rubric: [
        { criterion: 'Behaviour preserved exactly', description: 'All eight cases, including clamping, negatives and truncation.', maxPoints: 25 },
        { criterion: 'The odd behaviours named', description: 'Both identified, preserved, and a separate plan given for each.', maxPoints: 15 },
        { criterion: 'Characterisation understood', description: 'Explains the 69.5 case as observed behaviour, not intended behaviour.', maxPoints: 15 },
        { criterion: 'A commit sequence', description: 'Numbered steps with what runs between them.', maxPoints: 15 },
        { criterion: 'The breaking input', description: 'Exact input and exact error for the simplified check.', maxPoints: 15 },
        { criterion: 'Your own function', description: 'A real one over forty lines, with a first extraction chosen and justified.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys


def score_of(marks):
    return 0


def grade_of(score):
    return 'C'


marks = [int(x) for x in sys.stdin.readline().split()]
print(grade_of(score_of(marks)))
`,
        tests: [
          { input: '80 90\n', expectedOutput: 'A' },
          { input: '60 60\n', expectedOutput: 'B' },
          { input: '\n', expectedOutput: 'C' },
          { input: '150 50\n', expectedOutput: 'A', isHidden: true },
          { input: '-40 100\n', expectedOutput: 'B', isHidden: true },
          { input: '69 70\n', expectedOutput: 'B', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('Preserving a behaviour that looks like a bug during a refactor is:',
        [['Correct — fix it separately, with its own test', true],
          ['Wrong, since the refactor is the chance to fix it', false],
          ['Acceptable only if it is documented', false],
          ['A sign the characterisation tests are wrong', false]],
        'Never change behaviour and structure in the same commit.'),
      mcq('A characterisation test asserts:',
        [['What the code does, not what it should do', true],
          ['The specification the code was written against', false],
          ['The behaviour expected after the refactor', false],
          ['Only the paths the refactor will touch', false]],
        'Which is why the 69.5 case is captured rather than corrected.'),
      mcq('The simplified status check fails on:',
        [['A row with a name and no status', true],
          ['A row with a status in the wrong case', false],
          ['An empty line in the input', false],
          ['A row with an unexpected extra field', false]],
        'Exactly the case that made the longer condition look redundant.'),
    ],
  },

  {
    unitCode: 'T3_REFACTORING_MINI_PROJECT',
    notes: `Take the worst function you can find in real code, and improve it in steps that
never go red.

The brief requires **real code with real tests** — or tests you write first — because the
central claim of this topic is unverifiable otherwise. "It still works" without a suite is a
belief.

Budget around two hours. The commit history is the deliverable, more than the final state.`,
    assignment: {
      title: 'Mini Project — A Refactoring, One Commit at a Time',
      description: 'Improve a genuinely bad function in small green steps, with the history as the evidence.',
      instructions: `**Find** a function of at least 60 lines, in real code — yours or
open-source — that does more than one job. Not a constructed example.

**Part one — before you touch it**

1. Paste it, or link it. Say how long it is and what it does.
2. Apply the "and" test. Write the sentence and mark every "and".
3. **Do the tests cover it?** Measure — do not assume. If coverage is inadequate, write
   characterisation tests until it is, and **commit those first**. Say how many you wrote.
4. State what you want to be true at the end, concretely. "Cleaner" is not an answer; "the
   pricing rule can be tested without a database" is.

**Part two — the sequence**

5. Refactor in steps. After **each** step: run the tests, commit. Nothing else in the commit.
6. Submit the commit list, with a one-line message each. **At least five commits.**
7. For each commit, name the refactoring you applied — extract function, rename, guard clause,
   introduce parameter object, inline.
8. If any step went red, say which, why, and what you did. **A step going red and being backed
   out is worth more marks than a clean run**, because it is what the discipline is for.

**Part three — did it work**

9. Show the function now.
10. Write a test that was impractical before. Show it, and say what setup it needed before
    against now.
11. Was the thing from question 4 achieved? Answer honestly, including if it was not.

**Part four — the judgement**

12. Name one thing in that function you deliberately left. Say why.
13. Was this refactoring worth doing? Use the "what does this let us do" test. **"No" is a
    legitimate and well-marked answer** if you can argue it.
14. Did you change any behaviour? If yes, which commit, and why was it separate?

**Submit** the before, the commit list with named refactorings, the after, the new test, and
answers to 11–14.`,
      rubric: [
        { criterion: 'Real code, honestly measured', description: 'A genuine function over 60 lines, with coverage measured not assumed.', maxPoints: 15 },
        { criterion: 'Tests first where needed', description: 'Characterisation tests written and committed before any restructuring.', maxPoints: 15 },
        { criterion: 'Five or more green commits', description: 'Each one step, each with the tests run, each named as a refactoring.', maxPoints: 25 },
        { criterion: 'A red step, reported', description: 'Any failure described and backed out, rather than hidden.', maxPoints: 10 },
        { criterion: 'A test that was impractical before', description: 'Shown, with the setup compared honestly.', maxPoints: 15 },
        { criterion: 'The judgement', description: 'What was left and why, and whether it was worth it — "no" argued counts.', maxPoints: 20 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('A step going red and being backed out earns marks because:',
        [['It is exactly what the small-step discipline is for', true],
          ['It shows the refactoring was ambitious', false],
          ['It proves the tests are adequate', false],
          ['It demonstrates the commits were small', false]],
        'The value of green-after-every-step is that red tells you something, immediately.'),
      mcq('The brief requires tests before restructuring because:',
        [['"Behaviour-preserving" is unverifiable without them', true],
          ['Coverage should not fall during a refactor', false],
          ['Reviewers expect tests with every change', false],
          ['The refactoring tools rely on them', false]],
        '"It still works" without a suite is a belief, not a claim.'),
      mcq('Concluding the refactoring was not worth doing is:',
        [['A legitimate, well-marked answer if argued', true],
          ['A sign the wrong function was chosen', false],
          ['Only acceptable if no changes were made', false],
          ['Contradicted by having done the work', false]],
        'The "when not to" unit is half the topic, and this question is where it is assessed.'),
    ],
  },
];
