/**
 * T3_ADV_OOP — seven units. Year 3.
 *
 * ── THE LINE THIS TOPIC TAKES ─────────────────────────────────────────────────────────────
 *
 * That a third-year already knows the mechanics of classes and has never been told what they
 * COST. Year 1 taught the syntax, Year 2 taught objects and inheritance, and the result is a
 * student who reaches for a class hierarchy because that is what they were taught to do.
 *
 * So every unit here is about a price. Inheritance buys reuse and charges you a permanent
 * coupling. An interface buys substitution and charges a layer. A principle applied without a
 * problem charges comprehension and buys nothing at all.
 *
 * The topic deliberately uses code that already exists rather than toy shapes. `Animal` with a
 * `speak()` method has taught nobody anything about when inheritance is wrong, because nobody
 * has ever had to maintain it.
 *
 * It attributes to OOP_CONCEPTS. The topic also declares DESIGN_PATTERNS, but the patterns are
 * taught in T3_PATTERNS and this topic only touches them where a principle leads naturally to
 * one.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const OOP_ADVANCED_BUNDLES: PilotBundle[] = [
  /* ── Composition over inheritance ───────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_COMPOSITION_OVER_INHERITANCE',
    notes: `Inheritance is the strongest coupling a language offers. A subclass depends on its
parent's fields, its methods, the order they are called in, and decisions the parent's author has
not written down. That dependency cannot be loosened later.

**The example everybody starts with:**

    class Bird:
        def fly(self): ...

    class Penguin(Bird):     # a penguin is a bird
        def fly(self):
            raise NotImplementedError    # ...and cannot fly

The subclass has inherited something it must refuse. Once one subclass refuses a method, every
caller has to know which subclass it has — and the whole point of the hierarchy was that it
should not have to.

**The real-world version is less obvious:**

    class Report:
        def fetch(self): ...
        def format(self): ...
        def email(self): ...

    class ScheduledReport(Report): ...
    class OnDemandReport(Report): ...

Eighteen months later somebody needs a report that is fetched and formatted but written to a file
instead of emailed. There is no place for it: \`email\` is in the base class, so every report has
it, and the new one must inherit something it does not want.

**Composition holds the pieces separately:**

    class Report:
        def __init__(self, source, formatter, delivery):
            self.source, self.formatter, self.delivery = source, formatter, delivery

        def run(self):
            self.delivery.send(self.formatter.format(self.source.fetch()))

A file-delivered report is now a different third argument. Nothing existing changes.

**The honest comparison:**

| | Inheritance | Composition |
|---|---|---|
| Reuse | Automatic | Explicit — you wire it |
| Changing one part | Affects every subclass | Affects the one part |
| Reading it | Look in two or three files | The pieces are named here |
| Set at | Compile time, forever | Run time, per object |

**The test worth applying:** is this a permanent IS-A, true for every member forever, with no
subclass ever wanting to refuse part of it? Then inheritance. Anything else — a role, a
behaviour, a capability — is a HAS-A, and composition says so.

**Where inheritance genuinely wins:** a framework base class you must extend, a small closed
hierarchy that will not grow, and sharing an interface rather than an implementation. Those are
real, and they are narrower than most codebases assume.`,
    mcqs: [
      mcq('A subclass that raises NotImplementedError for an inherited method tells you:',
        [['It inherited something it should not have', true],
          ['The base class needs an abstract method', false],
          ['The subclass is not finished being written', false],
          ['The hierarchy needs one more level in it', false]],
        'Once a subclass refuses a method, every caller must know which subclass it has.'),
      mcq('What is the strongest argument against inheritance as a default?',
        [['It couples two things permanently', true],
          ['It makes the program run more slowly', false],
          ['It requires more code to be written', false],
          ['It is not supported in every language', false]],
        'Fields, methods, call order, and unwritten assumptions — none of it loosens later.'),
      mcq('`Report` with fetch, format and email in the base class becomes a problem when:',
        [['A report needs two of the three but not the third', true],
          ['A report needs to be run on a schedule', false],
          ['The number of report types grows large', false],
          ['The email step becomes slow to execute', false]],
        'There is nowhere to put it: every subclass has email whether it wants it or not.'),
      mcq('The test for whether inheritance fits is:',
        [['A permanent IS-A no subclass will want to refuse', true],
          ['Whether the two classes share several methods', false],
          ['Whether the base class is abstract already', false],
          ['Whether the hierarchy is fewer than three deep', false]],
        'A role, a behaviour or a capability is a HAS-A, and composition says so.'),
    ],
    checkpoint: [
      mcq('Composition costs you something inheritance does not. What?',
        [['The wiring is explicit and you must write it', true],
          ['The objects take up more memory at runtime', false],
          ['The behaviour cannot be changed after construction', false],
          ['The types can no longer be checked by a compiler', false]],
        'Reuse is automatic with inheritance and deliberate with composition. That is the trade.'),
      mcq('Which of these is a case where inheritance is still the right tool?',
        [['A framework base class you are required to extend', true],
          ['Two classes that happen to share four methods', false],
          ['A class that will have many future variations', false],
          ['A type that needs to be swapped at run time', false]],
        'Real cases exist and are narrower than most codebases assume.'),
      mcq('With composition, changing how a report is delivered means:',
        [['Passing a different object in', true],
          ['Editing the base class method', false],
          ['Adding a subclass for the new case', false],
          ['Overriding the delivery in each report', false]],
        'Nothing existing changes, which is the property the hierarchy could not give you.'),
    ],
  },

  /* ── Programming to an interface ────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_INTERFACES',
    notes: `Programming to an interface means depending on **what a thing does** rather than
**what it is**.

    # depends on what it IS
    def send_report(report, mailer: SmtpMailer):
        mailer.send(...)

    # depends on what it DOES
    def send_report(report, mailer: Mailer):      # anything with .send()
        mailer.send(...)

The second version works with SMTP in production, a recording fake in tests, and a queue-backed
sender next year. None of those required editing \`send_report\`.

**What the interface actually buys:**

1. **Substitution.** Any implementation can be passed in, including one that does not exist yet.
2. **Testing.** The fake is not a hack around the design; it is the design working as intended.
3. **A stated contract.** \`Mailer\` says what a mailer must do, in one place a reader can find.

**Who should define it matters more than students expect.** The interface belongs to the code
that NEEDS the work, not the code that performs it:

    # in your application
    class Mailer(Protocol):
        def send(self, to: str, subject: str, body: str) -> None: ...

    # in the infrastructure layer
    class SmtpMailer:      # satisfies Mailer without importing it
        def send(self, to, subject, body): ...

Defined by the consumer, the dependency points inward at your own abstraction rather than
outward at a library. That is the same inversion the architecture topic is built on, and it is
the whole reason the technique is worth the layer.

**The failure that looks like success:**

    class Mailer(Protocol):
        def send_via_smtp_with_tls(self, host, port, envelope): ...

That is an interface shaped like its one implementation. Swapping in a queue-backed sender means
either implementing SMTP-shaped methods that mean nothing, or changing the interface and every
caller. An interface that leaks its implementation has bought a layer and no substitution.

**When NOT to.** One implementation, no second in sight, no test needs a substitute — the
interface is indirection you pay to read and never use. Write the class. Extract the interface
the day the second implementation arrives; it takes ten minutes and your editor does most of it.`,
    mcqs: [
      mcq('Who should define the interface, and why?',
        [['The code that needs the work, so the dependency points inward', true],
          ['The code that performs the work, since it knows the detail', false],
          ['A shared module, so both sides can import it', false],
          ['Whichever side was written first in the project', false]],
        'Defined by the consumer, you depend on your own abstraction rather than on a library.'),
      mcq('A test fake for a Mailer interface is best understood as:',
        [['The design working as intended', true],
          ['A workaround for slow infrastructure', false],
          ['A temporary stand-in until the real one exists', false],
          ['An extra class the tests are forced to carry', false]],
        'Substitutability was the property; the fake is that property being used.'),
      mcq('`send_via_smtp_with_tls(host, port, envelope)` as an interface method is wrong because:',
        [['The interface is shaped like one implementation', true],
          ['The method takes too many parameters to mock', false],
          ['The name is longer than a method name should be', false],
          ['The transport should be configured, not passed', false]],
        'A queue-backed sender would implement SMTP-shaped methods that mean nothing to it.'),
      mcq('One implementation, none in sight, and no test needs a substitute. You should:',
        [['Write the class and extract an interface later', true],
          ['Define the interface now, while the shape is clear', false],
          ['Define it but leave it undocumented for now', false],
          ['Use an abstract base class rather than a protocol', false]],
        'Extraction takes ten minutes when the second implementation arrives, and your editor helps.'),
    ],
    checkpoint: [
      mcq('"Depends on what it does rather than what it is" describes:',
        [['Programming to an interface', true],
          ['Composition over inheritance', false],
          ['The single responsibility principle', false],
          ['The factory pattern applied to construction', false]],
        'Substitution, testability and a stated contract all follow from that one move.'),
      mcq('What does defining the interface on the consumer side achieve?',
        [['The dependency points at your abstraction, not a library', true],
          ['Fewer files need to be opened when reading', false],
          ['The implementation can be written more quickly', false],
          ['The compiler can check the contract more strictly', false]],
        'The same inversion the architecture topic rests on.'),
      mcq('An interface with one implementation and no second in sight is:',
        [['Indirection paid for and never used', true],
          ['Good preparation for an inevitable change', false],
          ['Required before the class can be tested', false],
          ['The standard way to begin any design', false]],
        'The layer costs comprehension now against a variation that may never arrive.'),
    ],
  },

  /* ── Abstraction has a price ────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_ABSTRACTION_COST',
    notes: `Every abstraction is a thing the next reader must hold in their head. That is the
price, it is paid by everybody who reads the code afterwards, and it is almost never written
down next to the benefit.

**What "holding it" means in practice.** To change one line of behaviour, a reader must:

1. Find where the operation starts.
2. Follow it through each layer.
3. Work out which implementation is actually running.
4. Keep all of that in mind while making the change.

Four layers is manageable. Eleven is an afternoon, and the change itself was two lines.

**The shape this takes:**

    OrderController -> OrderService -> OrderManager -> OrderProcessor
      -> OrderValidator -> OrderRepository -> OrderDataMapper

Each name is defensible. Each class is small. Nobody can tell you what happens when an order is
placed, because the answer is spread across seven files and none of them contains it.

**A layer earns its keep when it does one of these:**

- **Names something.** A well-named extraction makes a comment unnecessary.
- **Allows substitution you actually use.** A real second implementation, or a test that needs it.
- **Holds a boundary.** Something on one side can change without the other side knowing.

**It does not earn its keep by:**

- Existing because the architecture diagram has that box.
- Anticipating a variation nobody has asked for.
- Being "cleaner" in a way nobody can state in a sentence.

**The forwarding layer is the clearest case of waste:**

    class OrderService:
        def place(self, order):
            return self.manager.place(order)      # and nothing else

A layer that only forwards has no responsibility. It is a file to open on the way to the file
that matters.

**The judgement, stated plainly:** you cannot avoid abstraction — a program with none is
unreadable too. What you can do is make each layer pay for itself, and notice when one has
stopped. The right number is not zero and it is not as many as your diagram has boxes.

**A useful habit:** when you add a layer, write one sentence saying what it buys. If the sentence
is hard to write, that is the answer.`,
    mcqs: [
      mcq('What does an abstraction cost?',
        [['Something more for every future reader to hold', true],
          ['Execution time at each call boundary', false],
          ['Memory for the additional objects', false],
          ['Compilation time as the project grows', false]],
        'Paid by everybody who reads it afterwards, and rarely written down beside the benefit.'),
      mcq('A class whose only method forwards to another class is:',
        [['A layer with no responsibility', true],
          ['A correct application of delegation', false],
          ['A useful place for future logic', false],
          ['An adapter between two interfaces', false]],
        'A file to open on the way to the file that matters.'),
      mcq('Which of these means a layer has earned its keep?',
        [['Something on one side can change unnoticed by the other', true],
          ['It matches a box on the architecture diagram', false],
          ['It anticipates a variation that may be needed', false],
          ['It makes the design cleaner and more uniform', false]],
        'Naming, real substitution, or a boundary. Those three, and not the others.'),
      mcq('The habit this unit suggests when adding a layer is:',
        [['Write one sentence saying what it buys', true],
          ['Check it against the design principles', false],
          ['Add a test that covers it in isolation', false],
          ['Make sure the name reflects the pattern', false]],
        'If the sentence is hard to write, you have your answer.'),
    ],
    checkpoint: [
      mcq('Seven classes each forwarding to the next means:',
        [['Nobody can say what happens in one place', true],
          ['The design follows separation of concerns', false],
          ['The classes are too small to be useful', false],
          ['The naming convention is inconsistent', false]],
        'Each name is defensible and the total is unreadable. That is the failure mode.'),
      mcq('Is the right number of abstractions zero?',
        [['No — a program with none is unreadable too', true],
          ['Yes, for anything under a thousand lines', false],
          ['Yes, until a second implementation exists', false],
          ['No, it should match the layers in the diagram', false]],
        'The judgement is making each one pay, and noticing when one has stopped.'),
    ],
  },

  /* ── SOLID in practice ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_SOLID_IN_PRACTICE',
    notes: `Two of the five principles do most of the work in real code. This unit takes those
two and applies them to code that already exists, because that is where you will meet them.

## Single responsibility — one reason to change

The usual statement, "a class should do one thing", is too vague to apply. The useful version is
**one reason to change**:

    class Invoice:
        def total(self): ...             # changes when tax rules change
        def to_pdf(self): ...            # changes when the layout changes
        def email_to(self, address): ... # changes when the mail provider changes
        def save(self): ...              # changes when the schema changes

Four reasons, four teams, one file. Every one of them edits it, and a mistake in the PDF layout
can break the total.

Split by the reason, not by the noun:

    Invoice          # what it is and what it totals
    InvoiceRenderer  # how it looks
    InvoiceMailer    # how it is sent
    InvoiceStore     # how it is kept

**Applying it to existing code:** list the reasons the file has changed in its history. Git will
tell you. If the commits fall into distinct groups touching distinct methods, you have found the
split without guessing.

## Dependency inversion — depend on the abstraction

The rule is that high-level code should not depend on low-level detail. In practice:

    # the rule depends on the detail
    class PricingRules:
        def __init__(self):
            self.db = PostgresConnection(...)     # now needs a database to exist

    # the detail is supplied to the rule
    class PricingRules:
        def __init__(self, rates: RateSource):
            self.rates = rates

The second can be tested without a database, works against a cache or a file, and survives the
database being replaced. And note where the interface lives: \`RateSource\` is defined by
\`PricingRules\`, which is what makes the dependency point inward.

## The other three, briefly

- **Open-closed** — open to extension, closed to modification. Largely a consequence of the two
  above rather than a separate act.
- **Liskov substitution** — a subclass must be usable wherever its parent is. The penguin
  problem, stated formally.
- **Interface segregation** — a caller should not depend on methods it does not use. Real, and
  the least often the actual problem.

**A warning worth more than the principles.** Applied without a problem, every one of these adds
machinery. "This violates single responsibility" is not by itself a reason to change working
code — the reason is that two teams keep colliding in it, or a change keeps breaking something
unrelated. Name the pain, then apply the principle that relieves it.`,
    mcqs: [
      mcq('The useful form of single responsibility is:',
        [['One reason to change', true],
          ['One public method per class', false],
          ['One class per file in the project', false],
          ['One layer of the architecture per class', false]],
        '"Does one thing" is too vague to apply; reasons to change can be listed and counted.'),
      mcq('How can existing code tell you where the responsibilities split?',
        [['The history shows which commits touch which methods', true],
          ['The longest methods indicate the main concern', false],
          ['The imports show which layers it belongs to', false],
          ['The test file structure mirrors the split', false]],
        'Distinct commit groups touching distinct methods is the split, found rather than guessed.'),
      mcq('`PricingRules` constructing its own database connection is a problem because:',
        [['The rule now needs a database to exist at all', true],
          ['The connection is created more often than needed', false],
          ['The constructor becomes harder to read', false],
          ['The database type is hard-coded into the name', false]],
        'It cannot be tested, cached, or survive the database being replaced.'),
      mcq('"This violates single responsibility" is not by itself a reason to change code because:',
        [['The principle relieves a pain that must exist first', true],
          ['The principle is only advisory in most codebases', false],
          ['Refactoring always carries more risk than value', false],
          ['The principle applies to new code rather than old', false]],
        'Name the collision or the breakage, then apply the principle that relieves exactly it.'),
    ],
    checkpoint: [
      mcq('An Invoice class totals, renders, emails and saves. How many reasons to change?',
        [['Four', true], ['One', false], ['Two', false], ['It depends on the team size', false]],
        'Tax rules, layout, mail provider, schema. Four teams editing one file.'),
      mcq('Where should the `RateSource` interface be defined?',
        [['With PricingRules, which needs the rates', true],
          ['With the database code that provides them', false],
          ['In a shared types module both can import', false],
          ['In whichever package is loaded first', false]],
        'Consumer-defined is what makes the dependency point inward rather than outward.'),
      mcq('Liskov substitution restated informally is:',
        [['The penguin problem', true],
          ['One reason to change', false],
          ['Depend on abstractions, not details', false],
          ['Open to extension, closed to modification', false]],
        'A subclass must be usable wherever its parent is — which a penguin refusing fly() is not.'),
    ],
  },

  /* ── Debugging ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_DEBUGGING',
    notes: `Object-oriented code fails in ways procedural code cannot, and the symptoms rarely
name the cause.

## 1. The override that breaks the parent's promise

    class Account:
        def withdraw(self, amount):
            if amount > self.balance: raise InsufficientFunds
            self.balance -= amount

    class OverdraftAccount(Account):
        def withdraw(self, amount):
            self.balance -= amount          # no check at all

Every caller written against \`Account\` believes withdrawal is checked. **Symptom:** balances go
negative somewhere far from this class, and the traceback points at whoever spent the money. A
subclass may loosen what it requires; it may not loosen what it guarantees.

## 2. Shared mutable state on the class

    class Basket:
        items = []                    # on the CLASS, not the instance

        def add(self, item):
            self.items.append(item)

**Symptom:** a customer sees another customer's items, and it gets worse the longer the process
runs. Every \`Basket\` shares one list. Assign in \`__init__\` instead.

## 3. The constructor that does work

    class ReportBuilder:
        def __init__(self, source):
            self.data = source.fetch_everything()     # a network call, on construction

**Symptom:** tests are slow and need a network; creating the object for a config check performs a
transfer. Construction should assemble, not act.

## 4. Equality and identity

    class Money:
        def __init__(self, pence): self.pence = pence

    Money(500) == Money(500)      # False

**Symptom:** a value appears twice in a set, a lookup misses, a test comparing two identical
objects fails for no visible reason. Value objects need \`__eq__\` — and if they go in a set or a
dict key, \`__hash__\` as well.

## 5. The deep hierarchy where the method is not where you think

Four levels, each overriding some methods. \`report.render()\` runs an implementation two levels
up that calls a helper overridden one level down. **Symptom:** changing the method you found
changes nothing, because that is not the one being run.

**How to find it:** print the method resolution order, or set a breakpoint and read the actual
frame. Do not reason about which override wins — ask the runtime.

## The habit

Every one of these is answered by the same move: **stop reasoning about what the code should do
and observe what it did.** Print the type. Print the resolution order. Print the id of the list.
OOP bugs hide behind an assumption about which object you have, and an assumption is exactly what
a print statement settles.`,
    mcqs: [
      mcq('`items = []` declared on the class rather than in `__init__` causes:',
        [['Every instance to share one list', true],
          ['The list to be recreated on each access', false],
          ['A type error when the first item is added', false],
          ['The attribute to be read-only afterwards', false]],
        'Symptom: one customer sees another’s items, and it worsens the longer the process runs.'),
      mcq('A subclass that removes its parent’s validation has broken:',
        [['What the parent guaranteed to callers', true],
          ['The encapsulation of the parent’s fields', false],
          ['The single responsibility of the subclass', false],
          ['The constructor contract of the hierarchy', false]],
        'A subclass may loosen what it requires. It may not loosen what it promises.'),
      mcq('`Money(500) == Money(500)` returning False means:',
        [['The class compares identity rather than value', true],
          ['The constructor stored the value incorrectly', false],
          ['Integers are not comparable across instances', false],
          ['The class needs to be declared as a dataclass', false]],
        'Value objects need __eq__, and __hash__ too if they go in a set or a dict key.'),
      mcq('A constructor that performs a network call causes:',
        [['Tests that are slow and need the network', true],
          ['Objects that cannot be garbage collected', false],
          ['A circular dependency between the layers', false],
          ['An exception if the object is never used', false]],
        'Construction should assemble, not act.'),
    ],
    checkpoint: [
      mcq('You change a method and the behaviour does not change. In a deep hierarchy this suggests:',
        [['A different override is the one being run', true],
          ['The change was not saved or deployed', false],
          ['The method is being cached somewhere', false],
          ['The subclass needs to be recompiled', false]],
        'Ask the runtime which one wins rather than reasoning about it.'),
      mcq('The habit this unit recommends for OOP bugs is:',
        [['Observe what it did, rather than reasoning about what it should', true],
          ['Read the class hierarchy from the top downward', false],
          ['Add type annotations until the error appears', false],
          ['Rewrite the hierarchy using composition instead', false]],
        'These bugs hide behind an assumption about which object you have.'),
    ],
  },

  /* ── Practice ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_PRACTICE',
    notes: `Three exercises, each on the same theme: the design is not wrong because a principle
says so, it is wrong because something specific is hard.

**Before the code, answer these in a sentence each:**

1. A \`User\` class authenticates, sends its own emails, and renders its profile page. How many
   reasons to change, and what are they?
2. A \`PdfReport\` inherits from \`Report\` and overrides \`email()\` to raise. What does that tell
   you about the base class?
3. A service constructs its own HTTP client. Name one thing that becomes impossible.
4. A team extracts an interface for a class with one implementation and no test that needs a
   substitute. What did they buy?

Answers: 1 three (credentials, mail, presentation); 2 the base class has a method not every
report wants; 3 testing it without the network; 4 nothing — a layer to read.

**Then the code below.** The first is about shared class state, which is the bug in this topic
most likely to reach production. The second is about making a class testable by supplying what
it needs rather than building it.`,
    coding: [
      {
        title: 'Give each basket its own items',
        description: `A \`Basket\` shares one list across every instance. Fix it so each basket has
its own.

Read two lines. The first is a comma-separated list for basket A, the second for basket B. Print
the count in A, then the count in B, on separate lines.`,
        starter: `import sys

class Basket:
    items = []                      # <-- shared by every instance

    def add(self, item):
        self.items.append(item)

    def count(self):
        return len(self.items)

a, b = Basket(), Basket()
for item in sys.stdin.readline().strip().split(','):
    if item: a.add(item)
for item in sys.stdin.readline().strip().split(','):
    if item: b.add(item)
print(a.count())
print(b.count())
`,
        language: 'python',
        tests: [
          { input: 'apple,pear\nbread\n', expectedOutput: '2\n1' },
          { input: 'a,b,c\nd,e\n', expectedOutput: '3\n2' },
          { input: '\nmilk\n', expectedOutput: '0\n1' },
          { input: 'one\n\n', expectedOutput: '1\n0', isHidden: true },
          { input: 'a,b,c,d,e\nf\n', expectedOutput: '5\n1', isHidden: true },
        ],
      },
      {
        title: 'Supply the dependency instead of building it',
        description: `\`Pricing\` builds its own rate source, so it cannot be tested without one.
Change it to accept a rate source, then use the supplied \`FixedRates\` to make the tests pass.

Read a quantity and a product code. Print the total to two decimal places.`,
        starter: `import sys

class FixedRates:
    RATES = {'A': 2.5, 'B': 4.0, 'C': 10.0}
    def rate_for(self, code):
        return self.RATES.get(code, 0.0)

class Pricing:
    def __init__(self):
        self.rates = None           # TODO: accept a rate source instead

    def total(self, qty, code):
        return qty * self.rates.rate_for(code)

qty, code = sys.stdin.readline().split()
pricing = Pricing()                 # TODO: pass FixedRates() in
print(f'{pricing.total(int(qty), code):.2f}')
`,
        language: 'python',
        tests: [
          { input: '3 A\n', expectedOutput: '7.50' },
          { input: '2 B\n', expectedOutput: '8.00' },
          { input: '1 C\n', expectedOutput: '10.00' },
          { input: '4 Z\n', expectedOutput: '0.00', isHidden: true },
          { input: '0 A\n', expectedOutput: '0.00', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Advanced OOP Practice',
      description: 'Fix shared class state and an unsupplied dependency, and justify four design judgements.',
      instructions: `Complete both coding exercises above, then answer in a short file:

1. The four questions in the notes, one sentence each. The reasoning is what is assessed.
2. For question 2, write what the base class should have looked like instead.
3. For the basket bug: explain why it gets *worse* the longer the process runs, rather than
   failing immediately. This is the part that makes it dangerous in production.`,
      rubric: [
        { criterion: 'Per-instance state', description: 'Each basket holds its own items; both counts are correct.', maxPoints: 25 },
        { criterion: 'Supplied dependency', description: 'Pricing accepts a rate source rather than constructing one.', maxPoints: 25 },
        { criterion: 'Four judgements', description: 'Each answered with a reason that holds, not a principle quoted.', maxPoints: 25 },
        { criterion: 'A better base class', description: 'The Report hierarchy reshaped so no subclass must refuse a method.', maxPoints: 15 },
        { criterion: 'Why it worsens over time', description: 'Explains the accumulation, not just the sharing.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

class Basket:
    items = []

    def add(self, item):
        self.items.append(item)

    def count(self):
        return len(self.items)

a, b = Basket(), Basket()
for item in sys.stdin.readline().strip().split(','):
    if item: a.add(item)
for item in sys.stdin.readline().strip().split(','):
    if item: b.add(item)
print(a.count())
print(b.count())
`,
        tests: [
          { input: 'apple,pear\nbread\n', expectedOutput: '2\n1' },
          { input: 'a,b,c\nd,e\n', expectedOutput: '3\n2' },
          { input: 'one\n\n', expectedOutput: '1\n0', isHidden: true },
          { input: '\nmilk\n', expectedOutput: '0\n1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('A User class authenticates, mails and renders. The reasons to change are:',
        [['Credentials, mail provider and presentation', true],
          ['Only one — it is all about the user', false],
          ['Two — data handling and presentation', false],
          ['It cannot be determined without the history', false]],
        'Three reasons, three teams, one file that all of them edit.'),
      mcq('Extracting an interface for one implementation with no substitute needed buys:',
        [['Nothing, beyond a layer to read', true],
          ['Future flexibility at no present cost', false],
          ['Compliance with dependency inversion', false],
          ['A clearer statement of the contract', false]],
        'Extraction takes ten minutes later, when there is something to substitute.'),
      mcq('Why is shared class state especially dangerous in a long-running process?',
        [['It accumulates across requests rather than failing at once', true],
          ['It cannot be detected by any automated test', false],
          ['It causes the process to run out of memory', false],
          ['It only appears when two threads run together', false]],
        'A bug that fails immediately is found. One that grows quietly reaches production.'),
    ],
  },

  /* ── Mini project ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_ADV_OOP_MINI_PROJECT',
    notes: `Take a class hierarchy that is genuinely awkward and reshape it — then write down what
the reshaping cost as well as what it bought.

The brief asks for an existing hierarchy rather than a fresh design on purpose. Designing well
from nothing is a different and easier skill; recognising that an existing shape has stopped
fitting, and changing it without breaking anything, is what this topic is for.

Budget around two hours. The code is modest; the written justification is where the marks are.`,
    assignment: {
      title: 'Mini Project — Reshaping a Hierarchy',
      description: 'Take an inheritance hierarchy that no longer fits, move it to composition, and account for the trade.',
      instructions: `**The brief**

Find or write an **inheritance hierarchy of at least three classes** that has stopped fitting —
one where a subclass refuses an inherited method, or where two subclasses duplicate something the
base cannot hold, or where adding a fourth variant has nowhere to go.

Good sources: an earlier project of your own, a classmate's with permission, or write one
deliberately badly and say that you did.

**Part one — show the problem**

1. Describe the hierarchy as it stands, and name the specific thing that does not fit.
2. Write a **failing or awkward case**: a variant that cannot be added cleanly. Show the code you
   would have to write, and why it is unpleasant.

**Part two — reshape it**

3. Move it to composition, or to a shallower hierarchy with an interface — whichever genuinely
   fits. Say which you chose and why the other was worse here.
4. Add the variant from part one. Show in a diff that no existing class was edited.
5. Keep behaviour unchanged for the existing cases, proved by tests that pass before and after.

**Part three — the honest accounting**

6. Name **what the reshaping cost**. Composition is not free: the wiring is explicit, there are
   more objects, and construction got longer. Say specifically what a reader now has to do that
   they did not before.
7. Name one thing the original hierarchy did **better**. If you cannot find one, look harder —
   inheritance was chosen for a reason, even if the reason expired.

**What to submit**

1. The repository, with the original tagged and the reshaping in reviewable commits.
2. Tests passing against both shapes.
3. A README with the three written parts.

**How this is judged**

Part three carries real weight. A student who can only list the benefits has learned a slogan;
one who can state the cost and still defend the change has made an engineering decision.`,
      rubric: [
        { criterion: 'A real problem shown', description: 'The misfit is specific and demonstrated with a variant that will not go in.', maxPoints: 20 },
        { criterion: 'The reshaping', description: 'Composition or a shallower hierarchy, chosen deliberately and applied cleanly.', maxPoints: 20 },
        { criterion: 'The variant added', description: 'A diff showing the new case required no edit to an existing class.', maxPoints: 15 },
        { criterion: 'Behaviour preserved', description: 'Tests pass against the original and the reshaped version.', maxPoints: 15 },
        { criterion: 'What it cost', description: 'Specific — what a reader must now do that they did not before.', maxPoints: 20 },
        { criterion: 'What the original did better', description: 'One genuine advantage of the hierarchy, honestly stated.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does this brief use an existing hierarchy rather than a fresh design?',
        [['Recognising a shape has stopped fitting is the harder skill', true],
          ['Existing code is quicker to work with', false],
          ['Fresh designs cannot be assessed fairly at this level', false],
          ['It guarantees the tests already exist', false]],
        'Designing well from nothing is a different and easier problem than changing what exists.'),
      mcq('The strongest evidence that the reshaping worked is:',
        [['A new variant added with no existing class edited', true],
          ['A reduction in the total number of classes', false],
          ['The hierarchy being no more than two deep', false],
          ['Every class having a single public method', false]],
        'That was the thing that could not be done before, shown in a diff rather than claimed.'),
      mcq('Being asked to name what the original hierarchy did better is there because:',
        [['Inheritance was chosen for a reason, even an expired one', true],
          ['The reshaping may need to be reverted', false],
          ['Marks are awarded for balanced writing', false],
          ['Composition is not always going to be the better choice', false]],
        'A student who can only list benefits has learned a slogan rather than made a decision.'),
    ],
  },
];
