/**
 * T3_PATTERNS — seven units. Year 3.
 *
 * ── THE LINE THIS TOPIC TAKES ─────────────────────────────────────────────────────────────
 *
 * That patterns are VOCABULARY, not a toolkit to apply. A third-year who has just learned the
 * names is in the most dangerous window there is: they can now see a factory in every
 * constructor and an observer in every callback, and the code they write for the next month
 * will be worse than what they wrote before.
 *
 * So the topic teaches recognition before application, and spends a whole unit on when a
 * pattern is more machinery than the problem deserves. The mini project asks for a pattern
 * REMOVED as well as one added, because being able to say "this did not need it" is the part
 * that separates understanding from enthusiasm.
 *
 * Four patterns only — strategy, factory, observer, adapter. They are the four a student will
 * actually meet in a codebase in their first year of work, and four understood properly beats
 * twenty-three recognised by their diagram.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const PATTERNS_BUNDLES: PilotBundle[] = [
  /* ── What a pattern is ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_WHAT_A_PATTERN_IS',
    notes: `A design pattern is a **name for a shape that kept appearing**. Somebody noticed that
the same arrangement of objects solved the same kind of problem in unrelated programs, wrote it
down, and gave it a name. That is the whole of it.

It is not a rule, not a requirement, and not a thing to go looking for.

**What the name buys you** is a conversation. Without it:

    "We could have a class that holds the different ways of calculating postage, and the
     order asks it to do the calculation without knowing which one it got, so we can add
     another next month without touching the order code."

With it:

    "Strategy."

Four people in a meeting now have the same picture. That is the entire value, and it is a real
one — but notice it is a value to the *team*, not to the program. The code is identical either
way.

**Patterns are discovered, not invented.** The original catalogue was written by looking at
programs that already worked and asking what kept recurring. That history matters: it means the
right way to meet a pattern is to notice you have already half-built one, not to decide in
advance to use it.

**The honest summary of most patterns** is "put the thing that varies behind an interface".
Strategy varies an algorithm. Factory varies which class gets made. Observer varies who cares
that something happened. Adapter varies what shape something arrives in. Once you see that, the
catalogue stops being twenty-three things to memorise and becomes a handful of variations on one
idea.

**Language matters.** Several classic patterns exist because older languages could not pass a
function around. In a language with first-class functions, strategy is frequently just a
parameter:

    # The pattern, formally
    class PostageStrategy:  ...
    class Standard(PostageStrategy): ...
    class Express(PostageStrategy): ...
    order.calculate(Express())

    # The same idea, in a language that has functions
    order.calculate(express_postage)

Neither is wrong. The second is usually better, and a student who has just learned patterns will
write the first because it looks more professional.

**What to take from this topic:** recognise these four in code you did not write, so you can read
a codebase faster. Apply one only when you already have the problem it solves.`,
    mcqs: [
      mcq('A design pattern is best described as:',
        [['A name for an arrangement that kept recurring', true],
          ['A rule about how code should be structured', false],
          ['A reusable component you can import', false],
          ['A technique for improving performance', false]],
        'Named, not prescribed. The name is for the conversation, not for the compiler.'),
      mcq('The main thing a pattern name gives a team is:',
        [['A shared picture in one word', true],
          ['A guarantee the design is correct', false],
          ['Faster code at runtime', false],
          ['Fewer classes in the codebase', false]],
        'The code is identical with or without the name. The conversation is not.'),
      mcq('What do strategy, factory, observer and adapter have in common?',
        [['Each puts something that varies behind an interface', true],
          ['Each reduces the number of objects created', false],
          ['Each was designed for a specific language', false],
          ['Each removes a conditional from the code', false]],
        'Which algorithm, which class, who cares, what shape. One idea, four variations.'),
      mcq('In a language with first-class functions, the strategy pattern often becomes:',
        [['A function passed as an argument', true],
          ['A subclass of a base strategy', false],
          ['A lookup table of class names', false],
          ['An interface with one method', false]],
        'Several classic patterns exist to work around languages that could not pass behaviour around.'),
    ],
    checkpoint: [
      mcq('You notice your code already has the shape of a known pattern. What does that suggest?',
        [['You arrived at it from the problem, which is the normal way', true],
          ['You should refactor it to match the catalogue exactly', false],
          ['You have over-engineered the solution', false],
          ['You should give it the pattern name in the class name', false]],
        'Patterns were discovered by looking at code that already worked.'),
      mcq('Why is "learn the names" a fair goal for this topic, when the code works without them?',
        [['You will read code others wrote using them', true],
          ['Interviews require the full catalogue', false],
          ['Named designs perform better', false],
          ['Reviewers reject unnamed designs', false]],
        'Reading a codebase faster is the concrete return on knowing the vocabulary.'),
    ],
  },

  /* ── Strategy and factory ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_STRATEGY_AND_FACTORY',
    notes: `Two patterns that answer two different questions: **how** should this be done, and
**which thing** should be made.

## Strategy — the algorithm varies

The problem it solves is a growing conditional that keeps being edited:

    def postage(order):
        if order.service == 'standard':
            return order.weight * 2.0
        elif order.service == 'express':
            return order.weight * 4.5 + 3
        elif order.service == 'courier':
            ...

Every new service edits this function, and the function belongs to whoever owns orders — so two
teams now collide in one file. Strategy moves each calculation to its own place and lets the
caller be handed one:

    def standard(weight): return weight * 2.0
    def express(weight):  return weight * 4.5 + 3

    def postage(order, rule):
        return rule(order.weight)

Adding \`courier\` now adds a function and touches nothing existing. **That is the test of whether
strategy helped**: can a new case be added without editing the old ones?

## Factory — which class varies

The problem it solves is the *decision* about what to construct being scattered:

    # in three different files
    if source.endswith('.csv'):  reader = CsvReader(source)
    elif source.endswith('.json'): reader = JsonReader(source)

Three copies of the same decision, and the fourth format has to find all of them. Factory puts the
decision in one place:

    def reader_for(source):
        if source.endswith('.csv'):  return CsvReader(source)
        if source.endswith('.json'): return JsonReader(source)
        raise ValueError(f'no reader for {source}')

    reader = reader_for(source)

Note what it did NOT do: the conditional still exists. It has not been removed, it has been
**collected**. That is the honest description of factory, and it is enough — one place to change
beats three.

## How to tell which you need

| Question | Pattern |
|---|---|
| "How should this step be done?" | Strategy |
| "Which class should I make?" | Factory |

They combine naturally — a factory that returns a strategy is extremely common — but they answer
different questions and it is worth keeping them apart in your head.

**Both have the same failure mode:** used where there is exactly one case and no second one in
sight, they add a layer and buy nothing. Strategy with one strategy is a function call with
extra steps.`,
    mcqs: [
      mcq('The test of whether strategy helped is:',
        [['A new case can be added without editing the old ones', true],
          ['The number of classes has gone down', false],
          ['The conditional has now been removed entirely', false],
          ['The code runs measurably faster', false]],
        'That is the problem it was reaching for; if it did not achieve it, it added a layer for nothing.'),
      mcq('What does the factory pattern do to the conditional?',
        [['Collects it into one place, rather than removing it', true],
          ['Removes it altogether by using polymorphism instead', false],
          ['Replaces it with a lookup table', false],
          ['Moves it into each of the classes', false]],
        'Honest description: one place to change beats three. The branch is still there.'),
      mcq('Three files each contain `if source.endswith(...)` to choose a reader. What is the problem?',
        [['The fourth format must find all three', true],
          ['The condition is evaluated three times', false],
          ['The readers are constructed too early', false],
          ['The file extension is unreliable', false]],
        'A decision in three places is a decision somebody will update in two.'),
      mcq('Strategy with exactly one strategy and no second in sight is:',
        [['A function call with extra machinery', true],
          ['Good preparation for future variation', false],
          ['The correct way to start the pattern', false],
          ['Required for the interface to be testable', false]],
        'The layer is paid for now; the variation it anticipates may never arrive.'),
    ],
    checkpoint: [
      mcq('A postage function grows a new branch every sprint, edited by two teams. Which pattern fits?',
        [['Strategy', true], ['Factory', false], ['Observer', false], ['Adapter', false]],
        'The algorithm varies and the callers collide in one function.'),
      mcq('The decision about which parser class to construct appears in four places. Which fits?',
        [['Factory', true], ['Strategy', false], ['Adapter', false], ['Observer', false]],
        'Which thing to make, scattered — collect it.'),
      mcq('A factory that returns a strategy is:',
        [['Common, and still two separate ideas', true],
          ['A sign one of them is unnecessary', false],
          ['A different pattern with its own name', false],
          ['An anti-pattern to be avoided', false]],
        'They answer different questions and combine naturally.'),
    ],
  },

  /* ── Observer and adapter ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_OBSERVER_AND_ADAPTER',
    notes: `Two more, answering two more questions: **who needs to know** this happened, and
**how do I fit** these two things together.

## Observer — the interested parties vary

The problem is a function that keeps growing because more things care:

    def place_order(order):
        save(order)
        send_confirmation_email(order)
        update_inventory(order)
        notify_warehouse(order)
        record_analytics(order)
        award_loyalty_points(order)

\`place_order\` now knows about email, inventory, warehousing, analytics and loyalty. None of those
are its business, and every new interested party edits it.

Observer inverts it. The order announces what happened; whoever cares subscribes:

    def place_order(order):
        save(order)
        events.publish('order_placed', order)

    events.subscribe('order_placed', send_confirmation_email)
    events.subscribe('order_placed', update_inventory)

Adding loyalty points now touches the loyalty code and nothing else.

**What you gave up** is worth naming, because it is real:

- **The flow is no longer readable in one place.** "What happens when an order is placed" is no
  longer answerable by reading \`place_order\`; you have to search for subscribers.
- **Ordering becomes implicit.** If inventory must be updated before the warehouse is told,
  nothing in the code says so.
- **Failures are further away.** A subscriber that throws is a long way from the publisher.

Use it when the list of interested parties genuinely varies. Do not use it for two things that
always happen in a fixed order.

## Adapter — the shape varies

The problem is two things that should work together and do not fit:

    # Your code expects this
    class PaymentProvider:
        def charge(self, amount_pence, reference): ...

    # The library you must use offers this
    stripe.PaymentIntent.create(amount=..., currency=..., metadata=...)

Adapter is a thin class that speaks your language on the outside and theirs on the inside:

    class StripeAdapter:
        def charge(self, amount_pence, reference):
            return stripe.PaymentIntent.create(
                amount=amount_pence, currency='gbp', metadata={'ref': reference})

**Why this is worth a class rather than scattered calls:** the whole rest of your program now
depends on *your* interface. Replacing Stripe means writing one more adapter, not editing ninety
files. It is the same argument as keeping a framework at the edge.

Adapter is the pattern most likely to be worth it in real code, because integrating something you
did not write is the commonest situation in which two shapes must meet.`,
    mcqs: [
      mcq('What does observer cost you?',
        [['The flow is no longer readable in one place', true],
          ['Performance, from the extra indirection', false],
          ['The ability to add new subscribers later', false],
          ['Type safety across the publisher boundary', false]],
        'Genuine and often worth paying — but "what happens when X" now needs a search.'),
      mcq('Observer is a poor fit when:',
        [['Two things always happen, in a fixed order', true],
          ['There are more than five interested parties', false],
          ['The publisher and subscriber are in one file', false],
          ['The event carries a large object', false]],
        'Implicit ordering is one of the things you gave up; do not adopt it where order matters.'),
      mcq('The main value of an adapter class is that:',
        [['Your code depends on your interface, not theirs', true],
          ['It makes the third-party calls faster', false],
          ['It removes the need to read their documentation', false],
          ['It validates the data before sending it', false]],
        'Replacing the provider then means one more adapter rather than ninety edited files.'),
      mcq('`place_order` calls email, inventory, warehouse and analytics directly. The problem is:',
        [['It knows about concerns that are not its own', true],
          ['It performs too many operations to be fast', false],
          ['It cannot be tested without a database', false],
          ['It should be split into four functions', false]],
        'Every new interested party edits a function that should only be about placing an order.'),
    ],
    checkpoint: [
      mcq('Five unrelated things must happen after a user registers, and the list keeps growing. Which pattern?',
        [['Observer', true], ['Adapter', false], ['Strategy', false], ['Factory', false]],
        'The interested parties vary, which is exactly what observer is for.'),
      mcq('A payment library exposes a shape your code does not use. Which pattern?',
        [['Adapter', true], ['Factory', false], ['Observer', false], ['Strategy', false]],
        'Speak your language outside, theirs inside.'),
      mcq('Which is the strongest reason adapter is often worth it in real code?',
        [['Integrating code you did not write is the common case', true],
          ['It is by some way the simplest pattern to implement', false],
          ['It is required by most payment providers', false],
          ['It improves the performance of the call', false]],
        'Two shapes that must meet is the situation you are in most often.'),
    ],
  },

  /* ── Over-engineering ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_OVERENGINEERING',
    notes: `**The commonest mistake with patterns is using one.**

That is not a joke. The month after a developer learns the catalogue is reliably the worst month
of code they will write, because they can now see patterns everywhere and each one they apply
feels like an improvement.

## What over-application looks like

A configuration value, read once, at startup:

    class ConfigurationSourceFactory:
        def create(self, kind): ...
    class EnvironmentConfigurationSource(ConfigurationSource): ...
    class FileConfigurationSource(ConfigurationSource): ...
    class ConfigurationSourceStrategySelector: ...

    # what it replaced
    TIMEOUT = int(os.environ.get('TIMEOUT', '30'))

Every class is defensible on its own. Together they are two hundred lines to read a number, and
the next person must understand all of it before changing a default.

## The tells

- **One implementation.** A strategy interface with one strategy, a factory that makes one class.
  The variation it anticipates has not arrived and may not.
- **The pattern name is in the class name.** \`OrderProcessingStrategyFactoryImpl\` tells you what
  machinery it is, not what it does.
- **You cannot follow one operation.** Six files, each forwarding to the next. See the
  architecture topic: a layer that only forwards is a layer with no responsibility.
- **It was applied before the problem existed.** "We will need to swap this out later" is a
  prediction, and most such predictions are wrong.

## The rule worth remembering

**Write the simple thing. When it hurts, and you can say where, apply the pattern that relieves
exactly that.**

This is the same reasoning as everywhere else in Year 3: a layer costs comprehension, so it has
to buy something. "It might be useful" is not a purchase, it is a hope.

## Removing one

Deleting an unnecessary pattern is a real and satisfying refactoring, and it is the one nobody
does because the code "looks professional". A strategy with one implementation inlines back to a
function in about ten minutes, and the file gets shorter and clearer.

If you can explain why a pattern was not needed, you understand it better than somebody who can
only explain how to build it.`,
    mcqs: [
      mcq('A strategy interface with exactly one implementation suggests:',
        [['The anticipated variation has not arrived', true],
          ['The design is correctly prepared for change', false],
          ['A second implementation should be written', false],
          ['The interface should be removed from the base class', false]],
        'The layer is paid for now against a variation that may never come.'),
      mcq('`OrderProcessingStrategyFactoryImpl` is a poor name because it says:',
        [['What machinery it is, not what it does', true],
          ['Too little about the implementation', false],
          ['Nothing about which order it processes', false],
          ['That it is an implementation rather than an interface', false]],
        'The pattern name in the class name is one of the reliable tells.'),
      mcq('The rule this unit offers is:',
        [['Write the simple thing; apply a pattern when it hurts and you can say where', true],
          ['Choose the pattern that fits before writing any of the code', false],
          ['Prefer the pattern that needs fewest classes', false],
          ['Use a pattern whenever more than one case exists', false]],
        'A layer costs comprehension, so it must buy something specific.'),
      mcq('Why is removing an unnecessary pattern rarely done?',
        [['The code looks professional as it is', true],
          ['The removal risks changing behaviour', false],
          ['Tooling cannot perform the refactoring', false],
          ['Reviewers require a justification', false]],
        'And a strategy with one implementation inlines back to a function in about ten minutes.'),
    ],
    checkpoint: [
      mcq('Two hundred lines of factories and strategies replace `int(os.environ.get(...))`. What is wrong?',
        [['The machinery costs more than the problem was worth', true],
          ['The classes have been named inconsistently', false],
          ['The configuration should be in a file', false],
          ['The default value is not validated', false]],
        'Each class is defensible alone; together they are a wall in front of reading a number.'),
      mcq('"We will need to swap this out later" as a reason to add a pattern now is:',
        [['A prediction, and most such predictions are wrong', true],
          ['Sound design, since change is entirely certain', false],
          ['Acceptable if written in a comment', false],
          ['Required by the open-closed principle', false]],
        'Flexibility built along the wrong axis has to be removed before you can move.'),
      mcq('Being able to say why a pattern was NOT needed shows:',
        [['A better understanding than being able to build it', true],
          ['A reluctance to use well-established designs', false],
          ['That the problem was too simple to judge', false],
          ['That the catalogue has not been learned', false]],
        'Knowing when not to is the half that separates understanding from enthusiasm.'),
    ],
  },

  /* ── Debugging ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_DEBUGGING',
    notes: `Patterns fail in recognisable ways. All four of these are real, and none of them
produces an error message that says what is wrong.

## 1. The strategy that is not interchangeable

    def standard(weight):        return weight * 2.0
    def express(weight, urgent): return weight * 4.5 + (10 if urgent else 3)

    postage(order, express)   # TypeError, eventually

Two strategies with different signatures are not strategies. The whole point is that the caller
does not know which one it got — so they must be callable identically. **Symptom:** it works for
some services and throws for others, and the traceback points at the call site rather than the
mistake.

## 2. The factory that leaks its decision

    reader = reader_for(source)
    if isinstance(reader, CsvReader):     # <-- here
        reader.set_delimiter(',')

The factory collected the decision and the caller has now un-collected it. **Symptom:** adding a
format requires editing the factory *and* every place that type-checks. If you find \`isinstance\`
after a factory call, the factory is not doing its job — whatever the caller needs should be part
of the interface.

## 3. The observer whose subscriber throws

    events.subscribe('order_placed', award_loyalty_points)   # raises on a null tier

Depending on the publisher, that either kills the order or silently swallows. **Symptom:** orders
occasionally fail with an error about loyalty, or — worse — loyalty silently stops working and
nobody notices for a month. A publisher must decide, deliberately, whether a failing subscriber
fails the operation. Both answers are defensible; not choosing is not.

## 4. The adapter that leaks the thing it adapts

    class StripeAdapter:
        def charge(self, amount_pence, reference):
            return stripe.PaymentIntent.create(...)   # returns a Stripe object

The signature is yours and the return value is theirs, so every caller now handles a Stripe
object and the adapter has bought nothing. **Symptom:** you try to replace the provider and find
\`stripe\` referenced in forty files that never import it.

## How to find these

Ask of any pattern you are reading: **what varies here, and can it actually vary?** Every failure
above is the same answer — it cannot. A strategy that cannot be swapped, a factory whose output
must be type-checked, an adapter whose type escapes. The pattern is present in shape and absent
in effect.`,
    mcqs: [
      mcq('Two strategies have different signatures. Why is that fatal to the pattern?',
        [['The caller is supposed not to know which one it got', true],
          ['The shared interface cannot be type-checked', false],
          ['One of them will be slower to call', false],
          ['The factory cannot construct them', false]],
        'Interchangeability is the whole property. Without it they are two unrelated functions.'),
      mcq('`isinstance` appearing just after a factory call means:',
        [['The caller has un-collected the decision', true],
          ['The factory returned the wrong type', false],
          ['The interface needs a type parameter', false],
          ['The factory should be a strategy instead', false]],
        'Whatever the caller needs should be part of the interface the factory returns.'),
      mcq('An adapter returns the third-party library’s own object. What has it achieved?',
        [['Almost nothing — the dependency still spreads', true],
          ['A clean boundary, since the input is adapted', false],
          ['Better performance by avoiding a conversion', false],
          ['Type safety at the call site', false]],
        'You discover it when replacing the provider and finding it referenced in forty files.'),
      mcq('A subscriber throws. What must the publisher have decided?',
        [['Whether that fails the whole operation', true],
          ['Which subscriber to call first', false],
          ['How many times to retry it', false],
          ['Whether to log the exception', false]],
        'Both answers are defensible. Not having chosen is what produces the bad outcome.'),
    ],
    checkpoint: [
      mcq('One question catches all four failures in this unit. It is:',
        [['What varies here, and can it actually vary?', true],
          ['Which pattern is this, and is it the right one?', false],
          ['Is this interface tested for every implementation?', false],
          ['Does this follow the catalogue’s structure?', false]],
        'Every failure is the same answer: it cannot. Present in shape, absent in effect.'),
      mcq('Loyalty points silently stop working for a month. Which failure is that?',
        [['A publisher swallowing a subscriber’s exception', true],
          ['A strategy with a mismatched signature', false],
          ['A factory leaking its decision', false],
          ['An adapter returning a foreign type', false]],
        'Silence is the worse of the two outcomes, and the one nobody detects.'),
    ],
  },

  /* ── Practice ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_PRACTICE',
    notes: `Recognition first, application second, and refusal third. Work these until naming the
shape is immediate — in an interview and in a codebase, the bottleneck is seeing it, not writing
it.

**For each of these, say which of the four fits, or say that none does:**

1. A report can be exported as CSV, PDF or HTML, and marketing keep asking for one more format.
2. Three services each need to know when a user is deleted, and the list will grow.
3. A weather library returns Fahrenheit; everything in your system is Celsius.
4. A function chooses between two implementations based on a flag that has never been false.
5. The decision of which database driver to construct appears in the app, the tests and a script.
6. An order total must be calculated, and there is exactly one way to calculate it.

Answers: 1 strategy, 2 observer, 3 adapter, 4 **none — remove it**, 5 factory, 6 **none — write the
function**. If you reached for a pattern on 4 or 6, reread the over-engineering unit; those two are
the point of this exercise.

**Then the harder version.** For 1, 2, 3 and 5, name one thing the pattern costs you. A candidate
who can do that is doing design; one who only names the pattern is doing recall.`,
    coding: [
      {
        title: 'Make the strategies interchangeable',
        description: `Two postage rules have drifted apart: one takes a weight, the other takes a
weight and a flag. Fix the interface so a caller can use either without knowing which it has, then
make \`postage\` work for both.

Read a service name and a weight from input, and print the postage to two decimal places.

    standard: weight * 2.0
    express:  weight * 4.5 + 3.0`,
        starter: `import sys

def standard(weight):
    return weight * 2.0

def express(weight, urgent):          # <-- this signature breaks the pattern
    return weight * 4.5 + (10 if urgent else 3)

RULES = {'standard': standard, 'express': express}

def postage(weight, rule):
    return rule(weight)

line = sys.stdin.readline().split()
service, weight = line[0], float(line[1])
print(f'{postage(weight, RULES[service]):.2f}')
`,
        language: 'python',
        tests: [
          { input: 'standard 4\n', expectedOutput: '8.00' },
          { input: 'express 4\n', expectedOutput: '21.00' },
          { input: 'standard 0\n', expectedOutput: '0.00' },
          { input: 'express 10\n', expectedOutput: '48.00', isHidden: true },
          { input: 'standard 2.5\n', expectedOutput: '5.00', isHidden: true },
        ],
      },
      {
        title: 'Collect the scattered decision',
        description: `The choice of reader is made in three places. Collect it into one factory so
that adding a format touches one function.

Read a filename from input and print the name of the reader that should handle it. Unknown
extensions print \`none\`.

    .csv  -> CsvReader
    .json -> JsonReader
    .xml  -> XmlReader`,
        starter: `import sys

class CsvReader:  name = 'CsvReader'
class JsonReader: name = 'JsonReader'
class XmlReader:  name = 'XmlReader'

def reader_for(source):
    # TODO: one place that decides, returning an instance or None
    return None

source = sys.stdin.readline().strip()
r = reader_for(source)
print(r.name if r else 'none')
`,
        language: 'python',
        tests: [
          { input: 'report.csv\n', expectedOutput: 'CsvReader' },
          { input: 'data.json\n', expectedOutput: 'JsonReader' },
          { input: 'feed.xml\n', expectedOutput: 'XmlReader' },
          { input: 'notes.txt\n', expectedOutput: 'none', isHidden: true },
          { input: 'archive.tar.json\n', expectedOutput: 'JsonReader', isHidden: true },
        ],
      },
    ],
    assignment: {
      title: 'Design Patterns Practice',
      description: 'Recognise four patterns in unfamiliar code, and refuse two where they do not belong.',
      instructions: `Complete both coding exercises above, then answer in a short file:

1. For each of the six scenarios in the notes, name the pattern or say none, **with one sentence
   of reasoning**. The reasoning is what is being assessed, not the name.
2. For scenarios 4 and 6, write the code you would ship instead.
3. Pick any one of the four patterns and name one thing it costs. Not a generic "added
   complexity" — say what specifically becomes harder.`,
      rubric: [
        { criterion: 'Interchangeable strategies', description: 'Both rules are callable identically and postage works for either.', maxPoints: 25 },
        { criterion: 'Collected decision', description: 'One factory decides; adding a format would touch one function.', maxPoints: 25 },
        { criterion: 'Recognition with reasoning', description: 'Six scenarios named correctly, each with a defensible sentence.', maxPoints: 25 },
        { criterion: 'Refusal', description: 'Scenarios 4 and 6 are refused, with the simpler code shown.', maxPoints: 15 },
        { criterion: 'A named cost', description: 'One specific thing a pattern makes harder, not a generic complaint.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `import sys

def standard(weight):
    return weight * 2.0

def express(weight, urgent):
    return weight * 4.5 + (10 if urgent else 3)

RULES = {'standard': standard, 'express': express}

def postage(weight, rule):
    return rule(weight)

line = sys.stdin.readline().split()
service, weight = line[0], float(line[1])
print(f'{postage(weight, RULES[service]):.2f}')
`,
        tests: [
          { input: 'standard 4\n', expectedOutput: '8.00' },
          { input: 'express 4\n', expectedOutput: '21.00' },
          { input: 'express 10\n', expectedOutput: '48.00', isHidden: true },
          { input: 'standard 2.5\n', expectedOutput: '5.00', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 25,
      },
    },
    checkpoint: [
      mcq('A report can be exported as CSV, PDF or HTML, and formats keep being requested. Which pattern?',
        [['Strategy', true], ['Observer', false], ['Adapter', false], ['Factory', false]],
        'The algorithm varies and new cases should not edit the old ones.'),
      mcq('A function picks between two implementations on a flag that has never been false. What should you do?',
        [['Remove the branch and the unused implementation', true],
          ['Convert it to a strategy for clarity', false],
          ['Introduce a factory to choose between them', false],
          ['Leave it, in case the flag is used later', false]],
        'One of the two refusals in this exercise, and the point of it.'),
      mcq('In the practice exercise, why did `express` break the strategy pattern?',
        [['Its signature differed, so it was not interchangeable', true],
          ['It returned a different type from the standard one', false],
          ['It was not registered in the rules table', false],
          ['It calculated using a different unit', false]],
        'Interchangeability is the property; differing signatures destroy it.'),
    ],
  },

  /* ── Mini project ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T3_PATTERNS_MINI_PROJECT',
    notes: `Build something small where a pattern genuinely earns its place, and — the part that
matters — **remove one that does not**.

Most pattern exercises only ask you to add. That teaches half the skill and reinforces the
instinct this topic exists to correct, so this brief asks for both and marks the removal as
heavily as the addition.

Read the brief in the assignment. Budget roughly two hours: the code is small, and the written
justification is where the marks are.`,
    assignment: {
      title: 'Mini Project — A Pattern Added, and a Pattern Removed',
      description: 'Build a small tool where one pattern earns its place, then find and remove one that does not.',
      instructions: `**The brief**

Build a small **file-processing tool** — it reads files of two or more formats, transforms the
contents in one of several ways, and reports what it did. Around 200–300 lines. The domain is
yours: log summarising, CSV cleaning, receipt totalling, anything with real input.

**Part one — a pattern that earns its place**

1. Apply **two** of the four patterns from this topic, where the problem actually calls for them.
2. For each, write a short paragraph naming:
   - the problem it solved,
   - **what it cost** — be specific, not "added complexity",
   - what the code looked like before.
3. Demonstrate the benefit concretely: add a third format, or a third transformation, and show in
   the diff that no existing case was edited.

**Part two — a pattern that does not**

4. Somewhere in your tool, **deliberately over-apply a pattern first** — a strategy with one
   strategy, a factory for a single class, an observer for two things that always happen in
   order.
5. Then remove it, and commit the removal separately.
6. Write a paragraph on what the removal improved: line count, files to open, and what a new
   reader now has to understand.

**Part three — the judgement**

7. Name one place in your tool where you *considered* a pattern and chose not to, and say why the
   simple version is better there.

**What to submit**

1. The repository, with the over-application and its removal as separate commits.
2. A README with the three written parts.
3. The diff showing that adding a third case touched no existing case.

**How this is judged**

Part two is worth as much as part one. Anybody can add a factory; being able to say "this did not
need one, and here is the code that proves it" is the thing being assessed.`,
      rubric: [
        { criterion: 'A working tool', description: 'Reads real input in two or more formats and does something useful with it.', maxPoints: 20 },
        { criterion: 'Two patterns that earn their place', description: 'Correctly applied where the problem calls for them, not decoratively.', maxPoints: 20 },
        { criterion: 'The benefit demonstrated', description: 'A third case added, with a diff showing no existing case was edited.', maxPoints: 15 },
        { criterion: 'The over-application and its removal', description: 'Both committed separately, with the removal clearly isolated.', maxPoints: 20 },
        { criterion: 'What each pattern cost', description: 'Specific costs named for both kept patterns — not generic complexity.', maxPoints: 15 },
        { criterion: 'A considered refusal', description: 'One place a pattern was rejected, with a reason that holds.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
    checkpoint: [
      mcq('Why does this brief ask for a pattern to be removed as well as added?',
        [['Knowing when not to is half the skill', true],
          ['To demonstrate version control ability', false],
          ['To reduce the final line count', false],
          ['Because two patterns is the maximum advisable', false]],
        'Most exercises only ask you to add, which reinforces exactly the instinct this topic corrects.'),
      mcq('The strongest evidence that a pattern earned its place is:',
        [['A new case added with no existing case edited', true],
          ['A reduction in the total number of lines', false],
          ['The pattern matching the catalogue diagram', false],
          ['Fewer conditionals in the codebase', false]],
        'That was the problem it was reaching for, shown in a diff rather than asserted.'),
      mcq('"Added complexity" as a statement of what a pattern cost is:',
        [['Too generic to show understanding', true],
          ['An accurate and sufficient summary', false],
          ['Only true for observer and adapter', false],
          ['The expected answer for every pattern', false]],
        'Say what specifically became harder — following a flow, ordering, or replacing a dependency.'),
    ],
  },
];
