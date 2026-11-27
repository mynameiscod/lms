/**
 * Career-track content: object-oriented Python, second half (JT_PY_OOP) — polymorphism and duck
 * typing, abstract base classes and the MRO, the special methods (__str__, __repr__, __eq__,
 * __hash__), composition over inheritance, and the topic's ending units (debugging, the graded
 * exercise, the interview question, the mini project and the checkpoint). The first five units of
 * the topic (classes and objects, __init__ and self, encapsulation and properties, class members,
 * inheritance and super()) live in their own file; the ending units here cover the whole topic.
 *
 * OOP in Python is examined the way it is written: a short class or two and "what does this print,
 * or which error does it raise?". So nearly every question here is about one specific snippet,
 * and every quoted output was run. The notes teach Python 3.10+, and the graded exercise is plain
 * 3.10 code, because the runner is Python 3.10. Dataclasses, enums, decorators of your own and
 * context managers belong to JT_PY_MODERN and are only mentioned here.
 *
 * Attribution: the topic is single-skill (PYTHON_OOP), so every checkpoint question names it.
 * Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

const OOP = 'PYTHON_OOP';

export const TRACK_PY_OOP_B_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_OOP — Object-Oriented Python (polymorphism to the checkpoint) ══════════════════ */
  {
    unitCode: 'JT_PY_OOP_POLYMORPHISM',
    notes: `**Polymorphism** means one call can run different code depending on the object it is made
on. You write \`shape.area()\` once, and a square, a circle and a triangle each answer in their
own way. Python gets there by two routes: **overriding** inside a class hierarchy, and **duck
typing**, which needs no hierarchy at all.

## Overriding and dynamic dispatch

A subclass overrides a method by defining one with the same name:

    class Notification:
        def __init__(self, to):
            self.to = to

        def send(self):
            return f"(nothing sent to {self.to})"

    class Email(Notification):
        def send(self):
            return f"email to {self.to}"

    class Sms(Notification):
        def send(self):
            return f"sms to {self.to}"

    for n in [Email("asha@x.in"), Sms("98450"), Notification("ravi")]:
        print(n.send())
    # email to asha@x.in
    # sms to 98450
    # (nothing sent to ravi)

On every call Python looks the method up on the **object's own class first**, then on its
parents, in order. This is **dynamic dispatch**: the decision is made at runtime, from the object,
never from where the variable came from (Python variables have no declared type anyway).

## self dispatches too

The lookup happens even inside the base class. A base-class method that calls \`self.area()\`
gets the subclass's \`area\` when \`self\` is a subclass object:

    class Shape:
        def area(self):
            return 0

        def describe(self):
            return f"{type(self).__name__} with area {self.area()}"

    class Square(Shape):
        def __init__(self, side):
            self.side = side

        def area(self):
            return self.side * self.side

    print(Square(3).describe())    # Square with area 9

\`describe\` is written once, in \`Shape\`, and works for every shape invented later. This is the
**template method** idea: the base class fixes the steps, the subclasses fill one in.

## Extending rather than replacing: super()

An override can still use the parent's version:

    class LoudEmail(Email):
        def send(self):
            return super().send().upper() + "!"

    print(LoudEmail("dev@x.in").send())    # EMAIL TO DEV@X.IN!

## Python has no overloading

In Java you may write two methods with one name and different parameters. In Python a class body
is a sequence of assignments, so a second \`def\` with the same name simply **replaces** the
first:

    class Printer:
        def show(self, a):
            return "one"

        def show(self, a, b):      # this one wins; the first is gone
            return "two"

    Printer().show(1)
    # TypeError: ... show() missing 1 required positional argument: 'b'

Python's answer to "one name, several call shapes" is default arguments, \`*args\` and keyword
arguments, which you already know from functions.

## Duck typing: "if it quacks like a duck"

Python does not check a type before calling a method. It just tries the call. Any object with a
matching method works, related by inheritance or not:

    class Duck:
        def speak(self):
            return "Quack"

    class Robot:
        def speak(self):
            return "Beep"

    for thing in [Duck(), Robot()]:
        print(thing.speak())       # Quack, then Beep — no common base class

The built-ins work the same way. \`len(x)\` calls \`x.__len__()\`, \`for\` calls \`__iter__\`, and
\`+\` calls \`__add__\`. That is why \`len\` works on a str, a list, a dict, and your own class once
it defines \`__len__\`:

    class Playlist:
        def __init__(self, songs):
            self.songs = songs

        def __len__(self):
            return len(self.songs)

    print(len(Playlist(["a", "b"])))   # 2

When the method is missing, the failure comes at the call: \`AttributeError: 'Stone' object has
no attribute 'speak'\`, raised on the line that called it.

## isinstance versus type() ==

When you genuinely need to check, use \`isinstance(obj, Base)\`. It is true for subclasses too.
\`type(obj) == Base\` is true only for exactly \`Base\`, so it breaks the moment someone
subclasses. But a long \`if isinstance(...) elif isinstance(...)\` chain is usually a sign that the
behaviour belongs in an overridden method instead.

## Design reasoning

Overriding replaces type checks: each class carries its own behaviour, and adding a new kind
means adding a class, not editing every \`if\`. Duck typing goes further: code depends on what an
object **can do**, not on what it **is**. That is how a function written for files also works on
\`io.StringIO\`, and how test doubles slot in without inheriting anything.

## Common mistakes and interview traps

- Writing two methods with one name and expecting Python to choose by arguments.
- Misspelling an override (\`are\` for \`area\`): no error, the parent's method silently runs.
- Checking \`type(x) == Dog\` and then wondering why a \`Puppy\` is refused.
- Assuming duck typing means "no errors": a missing method still fails, only later, at the call.`,
    workedExample: `**Problem.** A billing script prints receipts like this, and every new payment kind means
editing the function:

    def receipt(p):
        if p["kind"] == "card":
            return f"Card ending {p['last4']}: {p['amount']}"
        elif p["kind"] == "upi":
            return f"UPI {p['vpa']}: {p['amount']}"
        else:
            return f"Cash: {p['amount']}"

Redesign it so a new payment kind needs no edit to existing code.

**1. Find what varies.** The amount line is shared; only the description differs by kind. So
each kind should own its description.

**2. Give each kind a class and override one method.**

    class Payment:
        def __init__(self, amount):
            self.amount = amount

        def describe(self):
            return "Cash"

        def receipt(self):
            return f"{self.describe()}: {self.amount}"

    class Card(Payment):
        def __init__(self, amount, last4):
            super().__init__(amount)
            self.last4 = last4

        def describe(self):
            return f"Card ending {self.last4}"

    class Upi(Payment):
        def __init__(self, amount, vpa):
            super().__init__(amount)
            self.vpa = vpa

        def describe(self):
            return f"UPI {self.vpa}"

**3. Let dispatch do the choosing.**

    for p in [Card(500, "4242"), Upi(120, "asha@okbank"), Payment(80)]:
        print(p.receipt())
    # Card ending 4242: 500
    # UPI asha@okbank: 120
    # Cash: 80

**4. Check the goal.** A \`Wallet\` kind is now one new class with its own \`describe\`; \`receipt\`
and the loop are untouched. And because Python duck-types, an object that is not a \`Payment\` at
all but has a \`receipt()\` method would also work in that loop.`,
    mcqs: [
      mcq(`What does this print?

    class Shape:
        def area(self):
            return 0

        def describe(self):
            return f"{type(self).__name__} with area {self.area()}"

    class Square(Shape):
        def __init__(self, side):
            self.side = side

        def area(self):
            return self.side * self.side

    print(Square(3).describe())`, [
        ['Shape with area 0', false],
        ['Square with area 0', false],
        ['Square with area 9', true],
        ['AttributeError: no describe', false],
      ], 'describe is inherited from Shape, but self is the Square object, so type(self) is Square and self.area() is looked up on Square first. The override runs: 3 * 3 = 9.'),
      mcq(`What happens when this runs?

    class Printer:
        def show(self, a):
            return "one"

        def show(self, a, b):
            return "two"

    print(Printer().show(1))`, [
        ['It prints one, the version taking a', false],
        ['TypeError: show() is missing argument b', true],
        ['It prints two, the last version defined', false],
        ['SyntaxError: show is defined twice', false],
      ], 'Python has no overloading. The second def rebinds the name show in the class body, so only show(self, a, b) exists, and calling it with one argument leaves b missing.'),
      mcq(`What happens when this runs?

    class Duck:
        def speak(self):
            return "Quack"

    class Robot:
        def speak(self):
            return "Beep"

    class Stone:
        pass

    for thing in [Duck(), Robot(), Stone()]:
        print(thing.speak())`, [
        ['TypeError before anything prints: no shared base', false],
        ['Quack and Beep print, then AttributeError on Stone', true],
        ['Quack and Beep print, then None for the Stone', false],
        ['Quack, Beep and an empty line are all printed', false],
      ], 'Duck typing needs no common base class: Duck and Robot both have speak, so their calls work. Stone has none, and the failure happens only when that call is reached, as AttributeError.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Playlist:
        def __init__(self, songs):
            self.songs = songs

        def __len__(self):
            return len(self.songs)

    print(len("abc"), len([1, 2]), len(Playlist(["x", "y", "z", "w"])))`, [
        ['3 2 1', false],
        ['3 2 4', true],
        ['TypeError on the Playlist', false],
        ['3 2 None', false],
      ], 'len(obj) calls obj.__len__(). Playlist defines it and returns the length of its four-song list, so len works on it exactly as on a str or a list. That is duck typing through a special method.'),
      ck(OOP, `What does this print?

    class Base:
        def greet(self):
            return "base"

    class Mid(Base):
        def greet(self):
            return "mid+" + super().greet()

    class Leaf(Mid):
        pass

    print(Leaf().greet())`, [
        ['base', false],
        ['mid+', false],
        ['mid+base', true],
        ['mid+mid+base', false],
      ], 'Leaf defines no greet, so lookup finds Mid.greet. That calls super().greet(), which continues the search after Mid and finds Base.greet, giving "mid+base".'),
      ck(OOP, `What does this print?

    class A:
        def who(self):
            return "A"

        def call(self):
            return self.who()

    class B(A):
        def who(self):
            return "B"

    b = B()
    print(b.call(), A.who(b))`, [
        ['A A', false],
        ['B B', false],
        ['A B', false],
        ['B A', true],
      ], 'b.call() runs A.call with self = b, and self.who() dispatches on b\'s class, B. A.who(b) names the function on A directly, so no dispatch happens and it returns "A".'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_ABSTRACTION',
    notes: `**Abstraction** means callers depend on *what* an object promises to do, not *how* it does
it. In Python the promise is usually informal (duck typing). When you want it enforced, you write
an **abstract base class**: a class that names the methods every subclass must provide, and that
cannot itself be instantiated.

## abc.ABC and @abstractmethod

    from abc import ABC, abstractmethod

    class Exporter(ABC):
        @abstractmethod
        def export(self, rows):
            """Turn rows into text."""

        def save_message(self, rows):          # a normal, finished method
            return f"exported {len(self.export(rows))} characters"

    class CsvExporter(Exporter):
        def export(self, rows):
            return "\\n".join(",".join(r) for r in rows)

    print(CsvExporter().save_message([["a", "b"], ["c", "d"]]))   # exported 7 characters
    Exporter()     # TypeError: Can't instantiate abstract class Exporter ...

Three rules:

1. A class that inherits from \`ABC\` and has at least one \`@abstractmethod\` **cannot be
   instantiated**. Calling it raises \`TypeError\`.
2. A subclass becomes concrete only when it overrides **every** abstract method. Miss one and the
   subclass is still abstract: the \`TypeError\` comes when you create it, not when you call.
3. An ABC can also hold ordinary methods and \`__init__\`, which subclasses inherit. So it is a
   contract and a shared implementation at once.

The body of an abstract method is often just a docstring or \`...\`. It can also hold code that a
subclass reaches with \`super().export(rows)\`.

## The older way: raise NotImplementedError

    class Notifier:
        def send(self, msg):
            raise NotImplementedError("subclass must implement send")

This also documents the contract, but it fails **late**: a subclass that forgets \`send\` (or
misspells it) can be created without complaint and only crashes when \`send\` is finally called,
perhaps in production. \`@abstractmethod\` fails **early**, at object creation. Prefer it when the
contract matters. (\`NotImplementedError\` is an exception. \`NotImplemented\` is a different
thing: a value that \`__eq__\` returns, covered in the next unit.)

## Multiple inheritance

A class may list several bases: \`class Both(Left, Right)\`. Python then needs one order in which
to search for attributes. That order is the **method resolution order** (MRO), and you can read it:

    class A: pass
    class B(A): pass
    class C(A): pass
    class D(B, C): pass

    for k in D.__mro__:
        print(k.__name__, end=" ")    # D B C A object

The rule (called C3 linearisation) guarantees: a class comes before its bases, bases keep the
order you listed them in, and each class appears once. So in the "diamond" above, \`A\` is
searched once, after both \`B\` and \`C\`.

## super() follows the MRO, not "the parent"

This is the part that surprises people. \`super()\` means "the next class in the MRO of the
object", which is not always the class you inherited from:

    class Base:
        def hello(self):
            return "Base"

    class Left(Base):
        def hello(self):
            return "Left>" + super().hello()

    class Right(Base):
        def hello(self):
            return "Right>" + super().hello()

    class Both(Left, Right):
        pass

    print(Both().hello())     # Left>Right>Base

Inside \`Left\`, \`super()\` went to \`Right\`, a class \`Left\` knows nothing about, because the
object is a \`Both\` and \`Both\`'s MRO is Both, Left, Right, Base. That is what lets every class in
a diamond run exactly once, provided every one of them calls \`super()\`.

## Mixins

The everyday use of multiple inheritance is a **mixin**: a small class that adds one capability
and is not meant to stand alone. \`class Report(JsonMixin, BaseReport)\` gets a \`to_json\` method
from the mixin. Keep mixins small and free of \`__init__\` state, and list them before the main
base.

## Design reasoning

Use an ABC when several classes must be interchangeable and you want a forgotten method caught at
once: payment gateways, storage backends, exporters. Do not create one for a single class "just in
case"; in Python, duck typing is the default and an ABC is the exception that earns its place.

## Common mistakes and interview traps

- Forgetting to inherit from \`ABC\`: \`@abstractmethod\` on a plain class enforces nothing.
- Implementing only some abstract methods and expecting the call to fail; creation fails.
- Thinking \`super()\` always means the direct parent. It means the next class in the MRO.
- Confusing \`NotImplementedError\` (an exception to raise) with \`NotImplemented\` (a value).`,
    workedExample: `**Problem.** An app stores uploads on local disk today and on cloud storage next month.
Code all over the project calls \`storage.save(name, data)\` and \`storage.url(name)\`. Make sure
any new backend provides both, and that a half-finished one is caught before it runs.

**1. Write the contract as an ABC.**

    from abc import ABC, abstractmethod

    class Storage(ABC):
        @abstractmethod
        def save(self, name, data):
            """Store data under name."""

        @abstractmethod
        def url(self, name):
            """Return where name can be fetched from."""

        def save_and_link(self, name, data):     # shared, finished behaviour
            self.save(name, data)
            return self.url(name)

**2. Write a concrete backend.** It must override both abstract methods.

    class MemoryStorage(Storage):
        def __init__(self):
            self.files = {}

        def save(self, name, data):
            self.files[name] = data

        def url(self, name):
            return f"mem://{name}"

    print(MemoryStorage().save_and_link("cv.pdf", b"..."))   # mem://cv.pdf

**3. See the safety net work.** A colleague starts a cloud backend and forgets \`url\`:

    class CloudStorage(Storage):
        def save(self, name, data):
            ...

    CloudStorage()    # TypeError: Can't instantiate abstract class CloudStorage ...

The mistake is caught the moment the object is created (in a test, at start-up) instead of when
the first user asks for a link.

**4. Note what callers depend on.** Every caller uses only \`save\`, \`url\` and
\`save_and_link\`. Swapping \`MemoryStorage\` for \`CloudStorage\` changes one line where the
object is built, and nothing else.`,
    mcqs: [
      mcq(`What happens when this runs?

    from abc import ABC, abstractmethod

    class Exporter(ABC):
        @abstractmethod
        def export(self, rows):
            ...

    class CsvExporter(Exporter):
        def header(self):
            return "id,name"

    e = CsvExporter()
    print("made")`, [
        ['TypeError at CsvExporter(), and nothing is printed', true],
        ['It prints made, and e.export() later returns None', false],
        ['It prints made; a NotImplementedError comes later', false],
        ['TypeError at the class statement for CsvExporter', false],
      ], 'CsvExporter does not override export, so it is still abstract. Defining the class is allowed; creating an instance raises TypeError, so print is never reached.'),
      mcq(`What happens when this runs?

    class Notifier:
        def send(self, msg):
            raise NotImplementedError("subclass must implement send")

    class Sms(Notifier):
        def sned(self, msg):
            return "sms: " + msg

    n = Sms()
    print("created")
    n.send("hi")`, [
        ['TypeError at Sms(), because send is not implemented', false],
        ['It prints created, then sms: hi from the subclass', false],
        ['It prints created, then raises NotImplementedError', true],
        ['It prints created, then AttributeError for send', false],
      ], 'Raising NotImplementedError is a convention, not enforcement, so Sms() is created. The misspelt sned does not override send, so n.send runs the base version and raises when called: it fails late.'),
      mcq(`What does this print?

    class A: pass
    class B(A): pass
    class C(A): pass
    class D(B, C): pass

    for k in D.__mro__:
        print(k.__name__, end=" ")`, [
        ['D B A C object', false],
        ['D B C A object', true],
        ['D C B A object', false],
        ['D A B C object', false],
      ], 'The MRO keeps each class before its bases and keeps the bases in the order listed. B and C both come before their shared base A, which is searched once, then object.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Base:
        def hello(self):
            return "Base"

    class Left(Base):
        def hello(self):
            return "Left>" + super().hello()

    class Right(Base):
        def hello(self):
            return "Right>" + super().hello()

    class Both(Left, Right):
        pass

    print(Both().hello())`, [
        ['Left>Base', false],
        ['Left>Right>Base', true],
        ['Left>Base>Right>Base', false],
        ['Right>Left>Base', false],
      ], 'The MRO of Both is Both, Left, Right, Base. super() inside Left moves to the next class in that order, which is Right, not Base, and Right\'s super() then reaches Base.'),
      ck(OOP, `What does this print?

    from abc import ABC, abstractmethod

    class Report(ABC):
        @abstractmethod
        def body(self):
            ...

        def render(self):
            return "[" + self.body() + "]"

    class Sales(Report):
        def body(self):
            return "sales"

    print(Sales().render())`, [
        ['TypeError: Report is abstract', false],
        ['[None]', false],
        ['sales', false],
        ['[sales]', true],
      ], 'Sales overrides the only abstract method, so it is concrete and can be created. render is an ordinary method inherited from the ABC, and self.body() dispatches to Sales.'),
      ck(OOP, `What happens when this runs?

    from abc import ABC, abstractmethod

    class Shape(ABC):
        @abstractmethod
        def area(self):
            ...

        @abstractmethod
        def perimeter(self):
            ...

    class Square(Shape):
        def __init__(self, s):
            self.s = s

        def area(self):
            return self.s ** 2

    print(Square(2).area())`, [
        ['It prints 4, since area is the only method called', false],
        ['TypeError at Square(2): perimeter is still abstract', true],
        ['It prints 4, then raises when the program exits', false],
        ['NotImplementedError when perimeter is looked up', false],
      ], 'A subclass is concrete only when every abstract method is overridden. Square leaves perimeter abstract, so creating Square(2) raises TypeError before area is ever called.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_DUNDER',
    notes: `Methods whose names start and end with two underscores (\`__str__\`, \`__eq__\`) are
**special methods**, or "dunder" methods. You rarely call them yourself; Python calls them when you
use the matching syntax: \`print(x)\` calls \`__str__\`, \`x == y\` calls \`__eq__\`, \`{x}\` calls
\`__hash__\`. Defining them makes your objects behave like built-in values.

## __str__ and __repr__

Without either, an object prints as \`<__main__.Tag object at 0x...>\`, which helps nobody.

- \`__str__\` is the **readable** form for users: what \`print(x)\`, \`str(x)\` and \`f"{x}"\` use.
- \`__repr__\` is the **unambiguous** form for developers: what the REPL shows, what \`repr(x)\`
  and \`f"{x!r}"\` give, and what is used **inside containers**. A good repr looks like the code
  that would rebuild the object.

    class Tag:
        def __init__(self, name):
            self.name = name

        def __str__(self):
            return f"#{self.name}"

        def __repr__(self):
            return f"Tag({self.name!r})"

    t = Tag("py")
    print(t)          # #py
    print([t])        # [Tag('py')]   — a list shows its items' repr

If a class defines only \`__repr__\`, \`str()\` falls back to it. The reverse is not true. So when
you write one, write \`__repr__\`. Both must **return** a str; returning anything else raises
\`TypeError: __str__ returned non-string\`.

## __eq__: what "equal" means

By default \`==\` between your objects means "same object" (identity). Two \`Coin(5)\` objects are
not equal until you say what equality is:

    class Money:
        def __init__(self, paise):
            self.paise = paise

        def __eq__(self, other):
            if not isinstance(other, Money):
                return NotImplemented
            return self.paise == other.paise

    print(Money(500) == Money(500))   # True
    print(Money(500) == 500)          # False

Returning \`NotImplemented\` (a value, not an exception) for a type you do not understand tells
Python to try the other side, and finally fall back to identity, which gives \`False\`. That beats
crashing with \`AttributeError: 'int' object has no attribute 'paise'\`. \`!=\` is worked out from
\`__eq__\` for you.

## __hash__ goes with __eq__

Sets and dict keys find an object by its **hash** first, then confirm with \`==\`. So the rule is:
**objects that are equal must have equal hashes.** Python enforces half of it for you: a class that
defines \`__eq__\` and not \`__hash__\` gets \`__hash__ = None\`, and its objects become unhashable:

    class Point:
        def __init__(self, x, y):
            self.x, self.y = x, y

        def __eq__(self, other):
            return (self.x, self.y) == (other.x, other.y)

    {Point(1, 2)}     # TypeError: unhashable type: 'Point'

The fix is to hash the **same fields** that \`__eq__\` compares, usually as a tuple:

        def __hash__(self):
            return hash((self.x, self.y))

and then to **not change those fields** while the object sits in a set or is a dict key. If they
change, the object is now in the wrong bucket, and \`p in points\` gives \`False\` for an object
that is plainly there. Objects used as keys should be treated as immutable. (\`@dataclass(frozen=True)\`
writes all of this for you; you meet it in Modern Python.)

## A few more you will see

| Method | Called by | Example use |
|---|---|---|
| \`__len__\` | \`len(x)\` | number of items in a cart |
| \`__lt__\` | \`x < y\`, and so \`sorted\`, \`min\`, \`max\` | order tasks by priority |
| \`__add__\` | \`x + y\` | add two amounts of money |
| \`__contains__\` | \`item in x\` | is a SKU in the inventory |
| \`__bool__\` | \`if x:\` | an empty cart is falsy |

    class Task:
        def __init__(self, name, priority):
            self.name, self.priority = name, priority

        def __lt__(self, other):
            return self.priority < other.priority

        def __repr__(self):
            return self.name

    print(sorted([Task("deploy", 3), Task("fix", 1), Task("test", 2)]))   # [fix, test, deploy]

\`sorted\` needs only \`<\`, so \`__lt__\` alone is enough to sort.

## Design reasoning

Special methods are how your class joins the language: printing, comparing, sorting, counting and
being looked up all work through them. Define the ones whose meaning is obvious for the thing you
are modelling (two amounts of money add up; two customers do not), and keep \`__eq__\` and
\`__hash__\` built from the same fields.

## Common mistakes and interview traps

- Writing only \`__str__\`, then seeing \`[<__main__.Tag object at 0x...>]\` when a list is printed.
- Defining \`__eq__\` and being surprised that the objects can no longer go in a set.
- Hashing a field that changes, so the object gets lost inside its own set.
- Returning \`False\` (or crashing) instead of \`NotImplemented\` for an unknown type.
- Returning a number from \`__str__\`; it must return a str.`,
    workedExample: `**Problem.** An inventory keeps products in a set to avoid duplicates. Two products with the
same SKU should count as one, a product should print nicely for users, and a list of products in
the debugger should be readable.

**1. Decide what identity means.** A product is identified by its SKU. Its name and stock can
change, so they stay out of equality and hashing.

**2. Write the methods.**

    class Product:
        def __init__(self, sku, name, stock):
            self.sku = sku.upper()
            self.name = name
            self.stock = stock

        def __eq__(self, other):
            if not isinstance(other, Product):
                return NotImplemented
            return self.sku == other.sku

        def __hash__(self):
            return hash(self.sku)

        def __str__(self):
            return f"{self.name} ({self.stock} in stock)"

        def __repr__(self):
            return f"Product({self.sku!r}, {self.name!r}, {self.stock})"

**3. Check each requirement.**

    items = {Product("pen1", "Pen", 40), Product("PEN1", "Blue pen", 12)}
    print(len(items))                       # 1 — same SKU, so one product
    p = Product("nb2", "Notebook", 5)
    print(p)                                # Notebook (5 in stock)
    print([p])                              # [Product('NB2', 'Notebook', 5)]
    p.stock -= 1
    print(p in {p})                         # True — stock is not in the hash

**4. Check the contract.** Equal products have equal SKUs, so equal hashes. Changing the stock does
not move the product to another bucket, because the hash does not use stock. If the SKU could be
edited, it would have to be read-only (a property with no setter) for the set to stay correct.`,
    mcqs: [
      mcq(`What does this print?

    class Tag:
        def __init__(self, name):
            self.name = name

        def __str__(self):
            return f"#{self.name}"

        def __repr__(self):
            return f"Tag({self.name!r})"

    t = Tag("py")
    print(t)
    print([t])`, [
        ['#py, then [#py]', false],
        ['Tag(\'py\'), then [Tag(\'py\')]', false],
        ['#py, then [\'#py\']', false],
        ['#py, then [Tag(\'py\')]', true],
      ], 'print(t) uses __str__. Printing a list calls str on the list, and a list shows each item with repr, so the element appears as Tag(\'py\').'),
      mcq(`What happens when this runs?

    class Point:
        def __init__(self, x, y):
            self.x, self.y = x, y

        def __eq__(self, other):
            return (self.x, self.y) == (other.x, other.y)

    print(Point(1, 2) == Point(1, 2))
    seen = {Point(1, 2)}
    print("stored")`, [
        ['True, then TypeError: unhashable type', true],
        ['True, then stored, since equal points hash alike', false],
        ['False, then stored, using the default identity', false],
        ['True, then stored, with the default hash kept', false],
      ], 'Defining __eq__ without __hash__ sets __hash__ to None, so Point objects cannot go in a set. The comparison works, then building the set raises TypeError.'),
      mcq(`What does this print?

    class Coin:
        def __init__(self, value):
            self.value = value

    a = Coin(5)
    b = Coin(5)
    print(a == b, a == a)`, [
        ['True True', false],
        ['False True', true],
        ['False False', false],
        ['TypeError: no __eq__', false],
      ], 'With no __eq__, == falls back to identity. a and b are two separate objects, so a == b is False even though their values match; a is itself, so a == a is True.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Money:
        def __init__(self, paise):
            self.paise = paise

        def __repr__(self):
            return f"Money({self.paise})"

    print(Money(250), str(Money(5)))`, [
        ['Money(250) Money(5)', true],
        ['<Money object> Money(5)', false],
        ['Money(250) 5', false],
        ['TypeError: no __str__', false],
      ], 'Money has no __str__, so print and str() fall back to __repr__. The reverse fallback does not exist, which is why __repr__ is the one to write first.'),
      ck(OOP, `What does this print?

    class Sku:
        def __init__(self, code):
            self.code = code.upper()

        def __eq__(self, other):
            return isinstance(other, Sku) and self.code == other.code

        def __hash__(self):
            return hash(self.code)

    items = {Sku("ab1"), Sku("AB1"), Sku("cd2")}
    print(len(items))`, [
        ['3', false],
        ['1', false],
        ['2', true],
        ['TypeError', false],
      ], 'Both "ab1" and "AB1" become code "AB1", so they hash alike and compare equal, and the set keeps one of them. "CD2" is different, so the set holds 2 objects.'),
      ck(OOP, `What does this print?

    class Task:
        def __init__(self, name, priority):
            self.name, self.priority = name, priority

        def __lt__(self, other):
            return self.priority < other.priority

        def __repr__(self):
            return self.name

    print(sorted([Task("deploy", 3), Task("fix", 1), Task("test", 2)]))`, [
        ['[deploy, fix, test]', false],
        ['[fix, test, deploy]', true],
        ['[deploy, test, fix]', false],
        ['TypeError: not comparable', false],
      ], 'sorted only needs the < operator, which calls __lt__ and compares priorities: 1, 2, 3. The list shows each Task by its __repr__, which is its name.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_COMPOSITION',
    notes: `Inheritance says a class **is a** kind of another. **Composition** says an object **has a**
part, kept in an attribute, and does some of its work by asking that part. "Favour composition over
inheritance" is one of the most quoted design rules, and this unit is about when it is right.

## has-a versus is-a

- A \`SavingsAccount\` **is an** \`Account\`: everything true of an account is true of it.
  Inheritance fits.
- A \`Car\` **has an** \`Engine\`. A car is not a kind of engine, so \`class Car(Engine)\` is wrong
  even though it would "work".

    class Engine:
        def __init__(self, power):
            self.power = power
            self.running = False

        def start(self):
            self.running = True
            return f"{self.power} hp engine running"

    class Car:
        def __init__(self, model, engine):
            self.model = model
            self.engine = engine          # the part

        def start(self):
            return f"{self.model}: " + self.engine.start()   # delegation

    car = Car("Nexon", Engine(120))
    print(car.start())     # Nexon: 120 hp engine running

\`Car.start\` **delegates** to its engine. The car exposes only what a car should, and the engine
can be tested on its own.

## The classic misuse: inheriting from a built-in

    class Stack(list):
        def push(self, item):
            self.append(item)

    s = Stack()
    s.push(1)
    s.push(2)
    s.insert(0, 99)       # allowed: every list method came along
    print(s.pop(0))       # 99 — taken from the bottom of a "stack"

By inheriting from \`list\` the stack also inherited \`insert\`, \`sort\`, indexing and \`pop(0)\`,
so nothing stops code from breaking the last-in-first-out rule. With composition the stack decides
exactly what it offers:

    class Stack:
        def __init__(self):
            self._items = []

        def push(self, item):
            self._items.append(item)

        def pop(self):
            return self._items.pop()

        def __len__(self):
            return len(self._items)

## Swapping behaviour at runtime

A part is just an attribute, so it can be replaced while the program runs. Inheritance is fixed
when the class is written. This is the **strategy** pattern:

    class FlatOff:
        def __init__(self, amount):
            self.amount = amount

        def apply(self, total):
            return max(0, total - self.amount)

    class PercentOff:
        def __init__(self, percent):
            self.percent = percent

        def apply(self, total):
            return total * (100 - self.percent) // 100

    class Checkout:
        def __init__(self, discount):
            self.discount = discount

        def pay(self, total):
            return self.discount.apply(total)

    c = Checkout(FlatOff(100))
    print(c.pay(1000))          # 900
    c.discount = PercentOff(20)
    print(c.pay(1000))          # 800

Try the inheritance version: \`FlatOffCheckout\`, \`PercentOffCheckout\`, and then
\`FlatOffGiftWrapCheckout\`... every combination of features becomes a new class. That **class
explosion** is the sign composition was the right tool.

## Shared parts and copies

When a part is passed in, the object holds a **reference**, not a copy. Two objects built from one
list share it:

    names = ["asha"]
    t1 = Team(names)
    t2 = Team(names)
    t1.members.append("ravi")   # t2.members now has 2 names too

Sometimes that sharing is the point (two cars on one shared fleet tracker). When it is not, copy in
\`__init__\`: \`self.members = list(members)\`. Parts created inside \`__init__\` (\`self.wheels =
[Wheel(), Wheel()]\`) are new for every object.

## When inheritance is still right

- The subclass truly is a kind of the base, and **every** base method makes sense on it.
- You are filling in a framework's hook: a Django view, a \`unittest.TestCase\`, an ABC you were
  given.
- The hierarchy is shallow (one or two levels) and stable.

## Design reasoning

Ask "is every method of the base meaningful on the child?" If the honest answer is "most of them",
use composition. Composition keeps classes small, testable alone, and changeable at runtime; it
costs a few one-line delegating methods. Inheritance saves those lines but ties the child to every
current and future detail of the parent.

## Common mistakes and interview traps

- Inheriting to reuse one method (\`class Report(EmailSender)\`) instead of holding a sender.
- Subclassing \`list\` or \`dict\` and leaking methods that break your rules.
- Sharing a mutable part by accident because it was passed in, not copied.
- Saying "composition is always better": it is the default, not a law.`,
    workedExample: `**Problem.** A team has this hierarchy, and now needs a report that is emailed **and** saved
as a PDF:

    class Report: ...
    class EmailedReport(Report): ...      # adds send()
    class PdfReport(Report): ...          # adds save_pdf()

Adding \`EmailedPdfReport\` would need multiple inheritance, and a Slack version would double the
classes again. Redesign it.

**1. Name what varies.** What changes is where a finished report goes. That is a part, not a kind
of report.

**2. Make each destination a small class with one method.**

    class EmailOut:
        def __init__(self, to):
            self.to = to

        def deliver(self, text):
            return f"emailed to {self.to}"

    class PdfOut:
        def __init__(self, path):
            self.path = path

        def deliver(self, text):
            return f"saved {len(text)} chars to {self.path}"

**3. Let the report hold a list of destinations.**

    class Report:
        def __init__(self, title, outputs):
            self.title = title
            self.outputs = list(outputs)          # our own copy

        def body(self):
            return f"== {self.title} =="

        def publish(self):
            text = self.body()
            return [out.deliver(text) for out in self.outputs]

    r = Report("Sales", [EmailOut("lead@x.in"), PdfOut("sales.pdf")])
    print(r.publish())
    # ['emailed to lead@x.in', 'saved 11 chars to sales.pdf']

**4. Check the gain.** Any combination of destinations is now a list, not a class. A
\`SlackOut\` is one new class with a \`deliver\` method, found by duck typing. \`Report\` still may
have real subclasses (\`SalesReport\` overriding \`body\`), because a sales report *is* a report.
Inheritance for what it is, composition for what it has.`,
    mcqs: [
      mcq('A Car needs an Engine that can start() and stop(). Which design fits best?', [
        ['class Car(Engine), so the car gets start() and stop() for free', false],
        ['class Engine(Car), because every engine belongs inside a car', false],
        ['A Car with a self.engine attribute it delegates start() to', true],
        ['One class CarEngine that merges the attributes of both of them', false],
      ], 'A car has an engine; it is not a kind of engine. Holding the engine as an attribute and delegating keeps Car\'s interface about cars, lets the engine be tested alone and be swapped for another.'),
      mcq(`What does this print?

    class Stack(list):
        def push(self, item):
            self.append(item)

    s = Stack()
    s.push(1)
    s.push(2)
    s.push(3)
    s.insert(0, 99)
    print(s.pop(0))`, [
        ['3, the item pushed last', false],
        ['1, the first item pushed', false],
        ['AttributeError on insert', false],
        ['99, from the bottom', true],
      ], 'Stack inherits every list method, so insert(0, 99) puts 99 at the bottom and pop(0) removes it from there. Inheriting from list leaks methods that break stack rules; composition would hide them.'),
      mcq(`What does this print?

    class Engine:
        def __init__(self):
            self.running = False

        def start(self):
            self.running = True
            return "vroom"

    class Car:
        def __init__(self, engine):
            self.engine = engine

        def start(self):
            return "Car: " + self.engine.start()

    e = Engine()
    car = Car(e)
    print(car.start(), e.running)`, [
        ['Car: vroom False', false],
        ['Car: vroom True', true],
        ['vroom True', false],
        ['AttributeError: start', false],
      ], 'car.engine and e are the same Engine object, because Car stores the reference it was given. Delegating start() sets running on that one engine, so e.running is True.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Flat:
        def apply(self, total):
            return total - 50

    class Percent:
        def __init__(self, p):
            self.p = p

        def apply(self, total):
            return total * (100 - self.p) // 100

    class Cart:
        def __init__(self, discount):
            self.discount = discount

        def pay(self, total):
            return self.discount.apply(total)

    cart = Cart(Flat())
    first = cart.pay(400)
    cart.discount = Percent(10)
    print(first, cart.pay(400))`, [
        ['350 350', false],
        ['360 360', false],
        ['350 360', true],
        ['350 40', false],
      ], 'The discount is a part held in an attribute, so replacing it changes behaviour at runtime. The first payment uses Flat (400 - 50); the second uses Percent(10), 400 * 90 // 100 = 360.'),
      ck(OOP, 'Which pair is modelled correctly with inheritance rather than composition?', [
        ['OrderLine inheriting from Order, since lines are in orders', false],
        ['SavingsAccount inheriting from Account, as it is an account', true],
        ['Car inheriting from Engine, so that it can call start()', false],
        ['Library inheriting from Book, so it can reach every title', false],
      ], 'Inheritance means is-a: everything true of an Account is true of a SavingsAccount. An order has lines, a car has an engine and a library has books; those are has-a relationships and call for composition.'),
      ck(OOP, `What does this print?

    class Team:
        def __init__(self, members):
            self.members = members

    names = ["asha"]
    t1 = Team(names)
    t2 = Team(names)
    t1.members.append("ravi")
    print(len(t2.members))`, [
        ['1', false],
        ['0', false],
        ['AttributeError', false],
        ['2', true],
      ], 'Both teams store a reference to the same list, so appending through t1 changes what t2 sees. Copying in __init__ with list(members) would give each team its own list.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_DEBUGGING',
    notes: `Object-oriented bugs in Python fall into two groups. Some raise at once with a clear
traceback, if you read it. The worse ones run without error and quietly use the wrong method or
share the wrong data. Each one below is a real program, the symptom, and how to find the cause.

## How to read an OOP traceback

    Traceback (most recent call last):
      File "shop.py", line 14, in <module>
        print(s.balance)
    AttributeError: 'Savings' object has no attribute 'balance'

Read the last line first. **'Savings' object has no attribute** means the attribute was never
set on *this* object. Ask: which \`__init__\` was supposed to set it, and did it run? Then look
at the class, not at line 14.

## 1. A method without self

    class Counter:
        def __init__(self):
            self.n = 0

        def bump():
            self.n += 1

    Counter().bump()
    # TypeError: Counter.bump() takes 0 positional arguments but 1 was given

"1 was given" and you passed nothing: the one argument is the object itself, which Python always
passes first. Every instance method needs \`self\` as its first parameter.

## 2. An __init__ override that forgot super().__init__()

    class Account:
        def __init__(self, owner):
            self.owner = owner
            self.balance = 0

    class Savings(Account):
        def __init__(self, owner, rate):
            self.rate = rate               # Account.__init__ never runs

    print(Savings("asha", 4).balance)
    # AttributeError: 'Savings' object has no attribute 'balance'

Overriding \`__init__\` replaces the parent's completely. Call \`super().__init__(owner)\` first,
then set the subclass's own attributes.

## 3. A misspelt override (no error at all)

    class Shape:
        def area(self):
            return 0

    class Circle(Shape):
        def __init__(self, r):
            self.r = r

        def are(self):                # typo
            return 3 * self.r * self.r

    print(Circle(2).area())          # 0

\`are\` is a new method, so \`area\` is inherited and returns 0. When a subclass seems to be
ignored, print \`type(obj).__mro__\` and check the method name on each class. An abstract base
class would have caught this when the object was created.

## 4. A class attribute shared by every object

    class Basket:
        items = []                    # one list for the whole class

        def add(self, x):
            self.items.append(x)

    a = Basket()
    b = Basket()
    a.add("pen")
    print(b.items)                    # ['pen']

\`self.items.append\` does not create an instance attribute; it finds the class's single list and
mutates it. Mutable state belongs in \`__init__\`: \`self.items = []\`.

## 5. A property setter that calls itself

    class User:
        def __init__(self, name):
            self.name = name

        @property
        def name(self):
            return self._name

        @name.setter
        def name(self, value):
            self.name = value.strip()      # assigns to the property again

    User(" asha ")
    # RecursionError: maximum recursion depth exceeded

Inside the setter, \`self.name = ...\` calls the setter again, forever. Store the value under the
private name: \`self._name = value.strip()\`. The traceback shows the same line repeated hundreds
of times; that repetition is the clue.

## 6. A method used without calling it

    class Order:
        def __init__(self, prices):
            self.prices = prices

        def total(self):
            return sum(self.prices)

    o = Order([100, 250])
    print(o.total)        # <bound method Order.total of <__main__.Order object at 0x...>>

The text "bound method" means you printed the method, not its result. Add the parentheses:
\`o.total()\`. The same slip in a condition (\`if o.is_empty:\`) is worse, because a method is
always truthy, so the condition is always true.

## 7. Name mangling across a subclass

    class Vault:
        def __init__(self):
            self.__pin = 4321

    class MyVault(Vault):
        def reveal(self):
            return self.__pin

    MyVault().reveal()
    # AttributeError: 'MyVault' object has no attribute '_MyVault__pin'

\`__pin\` is renamed by the class it is written in: \`_Vault__pin\` inside \`Vault\`,
\`_MyVault__pin\` inside \`MyVault\`. A subclass cannot reach the parent's \`__name\`. Use a single
underscore (\`_pin\`) for "internal, but subclasses may use it".

## 8. Special methods with the wrong contract

    class Label:
        def __init__(self, text):
            self.text = text

        def __str__(self):
            return len(self.text)

    print(Label("hi"))
    # TypeError: __str__ returned non-string (type int)

\`__str__\` and \`__repr__\` must return a str. And a class with \`__eq__\` but no \`__hash__\`
raises \`TypeError: unhashable type\` the first time an object goes into a set or becomes a key.

## A method for every OOP bug

1. Read the exception type and the object type named in the last line.
2. Find **which class** should have provided the attribute or method, using the MRO.
3. Check whether the method that sets it ran (\`__init__\`, \`super().__init__\`).
4. For silent bugs, print \`type(obj)\`, \`vars(obj)\` (the instance's own attributes) and
   \`type(obj).__mro__\`. Most "wrong method ran" bugs are explained by one of those three.`,
    mcqs: [
      mcq(`This raises an error. What is the cause?

    class Counter:
        def __init__(self):
            self.n = 0

        def bump():
            self.n += 1

    Counter().bump()`, [
        ['bump has no self, but Python passes the object anyway', true],
        ['self.n must be declared as a class attribute first', false],
        ['bump must be called as Counter.bump() on the class', false],
        ['+= is not allowed on an attribute inside a method', false],
      ], 'Calling a method on an object always passes the object as the first argument. bump accepts none, so Python reports it takes 0 positional arguments but 1 was given. Add self.'),
      mcq(`A student writes this and gets AttributeError: 'Savings' object has no attribute 'balance'. What is the right fix?

    class Account:
        def __init__(self, owner):
            self.owner = owner
            self.balance = 0

    class Savings(Account):
        def __init__(self, owner, rate):
            self.rate = rate`, [
        ['Add balance = 0 as a class attribute on the Savings class', false],
        ['Call super().__init__(owner) at the start of Savings.__init__', true],
        ['Remove __init__ from Account, so that Savings is used alone', false],
        ['Rename Savings.__init__, so it stops hiding the base version', false],
      ], 'Overriding __init__ replaces the parent\'s, so Account.__init__ never ran and balance was never set. Calling super().__init__(owner) runs the parent\'s setup and keeps Savings\' own.'),
      mcq(`What does this print?

    class Shape:
        def area(self):
            return 0

    class Circle(Shape):
        def __init__(self, r):
            self.r = r

        def are(self):
            return 3 * self.r * self.r

    print(Circle(2).area())`, [
        ['12', false],
        ['0', true],
        ['AttributeError: area', false],
        ['TypeError: missing r', false],
      ], 'The typo are defines a new method instead of overriding area, so the inherited Shape.area runs and returns 0. No error is raised, which is what makes this bug dangerous.'),
      mcq(`What does this print?

    class Basket:
        items = []

        def add(self, x):
            self.items.append(x)

    a = Basket()
    b = Basket()
    a.add("pen")
    print(b.items)`, [
        ['[]', false],
        ['AttributeError', false],
        ["['pen']", true],
        ['None', false],
      ], 'items is a class attribute: one list shared by every Basket. append mutates that list through self, so b sees the pen too. Create the list in __init__ with self.items = [].'),
      mcq('A property setter for name contains the line self.name = value.strip(). What happens when an object is created?', [
        ['The value is stored and read back correctly every time', false],
        ['A RecursionError, because the setter keeps calling itself', true],
        ['An AttributeError, as the property has no getter defined', false],
        ['The value is stored without the strip() being applied', false],
      ], 'Assigning to self.name inside the name setter calls that setter again, without end, until Python raises RecursionError. The setter must store the value under another name, such as self._name.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_PRACTICE',
    notes: `Write each of these from an empty file before looking anything up, and predict the output
of every test line **before** you run it. They use the whole topic: classes, \`__init__\`,
properties, class members, inheritance, polymorphism, abstract classes, special methods and
composition.

## Exercise 1 — An account that guards itself

Write \`Wallet\` with an owner and a balance stored as \`_balance\`. Expose \`balance\` as a
**read-only property**, and add \`add(amount)\` and \`spend(amount)\` methods that raise
\`ValueError\` for an amount of 0 or less, and refuse (return \`False\`) a spend that would take the
balance below 0. Show that \`w.balance = 100\` raises \`AttributeError\`.

## Exercise 2 — Alternative constructors

Write \`Temperature\` storing Celsius, with a classmethod \`from_fahrenheit(f)\` and a
staticmethod \`is_freezing(celsius)\`. Add a class attribute \`created\` that counts every
temperature made, whichever constructor made it. Check that
\`Temperature.from_fahrenheit(212).celsius\` is \`100.0\`.

## Exercise 3 — Shapes with an abstract base

Write an ABC \`Shape\` with abstract \`area()\` and a finished \`__str__\` returning
\`"<ClassName> area=<area>"\`. Add \`Rect\` and \`Circle\` (use \`math.pi\`), give \`Shape\` a
\`__lt__\` comparing areas, and print a list of shapes **sorted by area**. Then try to create a
\`Shape\` and read the error.

## Exercise 4 — A value object

Write \`Fraction(num, den)\` that stores the fraction in lowest terms (use \`math.gcd\`), with
\`__eq__\`, \`__hash__\`, \`__add__\` and \`__repr__\`. Check that \`Fraction(1, 2) ==
Fraction(2, 4)\`, that a set of both has one element, and that \`Fraction(1, 3) + Fraction(1, 6)\`
shows \`Fraction(1, 2)\`.

## Exercise 5 — Refactor to composition

\`class Logger(list)\` stores messages by inheriting from list. Rewrite it so a \`Logger\` *has*
a list and offers only \`log(msg)\`, \`__len__\` and \`last(n)\`. List which list methods the old
version leaked.

## The graded exercise — Parking fees

Build a \`Vehicle\` hierarchy with an overridden \`fee()\` and a \`__str__\`, read vehicles from
standard input, and print a report. Your program is run against test cases, so the output format
must match exactly. The full specification is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, balance is a property with a getter and no setter. What does w.balance = 100 do?', [
        ['It sets _balance to 100 through the property', false],
        ['It makes a new instance attribute named balance', false],
        ['It raises AttributeError: the property has no setter', true],
        ['It is ignored, and the old balance stays in place', false],
      ], 'A property without a setter is read-only. Assigning to it raises AttributeError, which is exactly how the class forces every change to go through add and spend.'),
      mcq('In Exercise 2, from_fahrenheit is written as a classmethod returning cls((f - 32) * 5 / 9). What does Temperature.from_fahrenheit(212).celsius give?', [
        ['212, because the classmethod skips __init__', false],
        ['100.0, the value worked out by the formula', true],
        ['100, as an int, because 212 is an int value', false],
        ['TypeError: a classmethod has no self to use', false],
      ], 'The classmethod receives the class as cls and calls cls(...), which runs __init__ as usual. (212 - 32) * 5 / 9 is 100.0, a float, because / always gives a float.'),
      mcq('In Exercise 4, Fraction stores each value in lowest terms and builds __eq__ and __hash__ from (num, den). What is len({Fraction(1, 2), Fraction(2, 4)})?', [
        ['1', true],
        ['2', false],
        ['0', false],
        ['TypeError', false],
      ], 'Fraction(2, 4) is reduced to 1/2 on creation, so both objects have num 1 and den 2. They compare equal and hash alike, so the set keeps only one.'),
      mcq('In the graded exercise a car pays 20 per hour with a minimum charge of 40. What is the fee for a car parked for 1 hour?', [
        ['20', false],
        ['60', false],
        ['0', false],
        ['40', true],
      ], 'One hour at 20 is 20, which is below the minimum, so the minimum of 40 applies. In code that is max(40, 20 * hours), written once inside Car.fee().'),
    ],
    assignment: {
      title: 'Parking Fees with a Vehicle Hierarchy',
      description: 'Model bikes, cars and trucks as subclasses that override one fee method, read them from standard input, and print a parking report.',
      instructions: `Write a Python program that reads parked vehicles and prints what each one pays.

**Input**

The first line is a number N. Each of the next N lines describes one vehicle:

    <TYPE> <plate> <hours>

TYPE is the kind of vehicle, in **any case** (\`CAR\`, \`car\` and \`Car\` all mean a car). plate
has no spaces. hours is a whole number, 0 or more.

**Fees**

- Bike: 10 for every hour
- Car: 20 for every hour, but never less than 40
- Truck: an entry charge of 100, plus 50 for every hour

**Design (this is what the exercise is for)**

- A base class \`Vehicle\` holding the plate and the hours, with a \`fee()\` method that every
  subclass overrides. (An abstract base class with \`@abstractmethod\` is welcome.)
- \`Bike\`, \`Car\` and \`Truck\` subclass it and override \`fee()\`.
- \`Vehicle\` defines \`__str__\` returning \`<plate> (<Kind>, <hours>h): <fee>\`, where Kind is
  \`Bike\`, \`Car\` or \`Truck\` (capitalised like that, whatever case the input used).
- The code that prints the report must not check the type of a vehicle; it relies on \`fee()\`
  and \`__str__\`.

**Output**

If a line's TYPE is not one of the three kinds, print \`Unknown vehicle: <TYPE>\` (exactly as
typed) **at once, while reading**, and skip that line. After reading everything, print each
vehicle in input order using \`__str__\`, then four lines:

    Vehicles: <count of valid vehicles>
    Total fees: <sum of all fees>
    Average fee: <total / count, with two decimals>
    Top payer: <plate of the vehicle with the highest fee>

Format the average with \`f"{average:.2f}"\`. If several vehicles share the highest fee, name the
one that appears first. If there are no valid vehicles, print \`Average fee: 0.00\` and
\`Top payer: none\`.

**Example**

Input:

    3
    CAR KA01AB1234 3
    BIKE TN09X7 5
    TRUCK MH12TR9 2

Output:

    KA01AB1234 (Car, 3h): 60
    TN09X7 (Bike, 5h): 50
    MH12TR9 (Truck, 2h): 200
    Vehicles: 3
    Total fees: 310
    Average fee: 103.33
    Top payer: MH12TR9

**How it is graded**

Your program is run against every test case — the example you can see and several you cannot,
including unknown kinds, mixed case, zero hours, ties and an empty list — and scored on how many it
passes. Output is compared line by line. A reviewer uses the rubric for the design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including unknown kinds, mixed-case kinds, zero hours, the car minimum, ties for top payer and no valid vehicles.', maxPoints: 60 },
        { criterion: 'Hierarchy and overriding', description: 'A Vehicle base class with fee() overridden by Bike, Car and Truck; __str__ written once in the base; the report relies on dispatch, not isinstance or an if/elif on the kind.', maxPoints: 25 },
        { criterion: 'Encapsulation and readability', description: 'Plate and hours are set once in the base __init__ (subclasses do not repeat it), names are clear, and choosing the class from the TYPE is done in one place, such as a dict.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'python',
        starter: `class Vehicle:
    """Base class: every vehicle has a plate and a number of hours parked."""

    def __init__(self, plate, hours):
        self._plate = plate
        self._hours = hours

    def fee(self):
        raise NotImplementedError("each kind of vehicle works out its own fee")

    # TODO: a __str__ that returns "<plate> (<Kind>, <hours>h): <fee>"


# TODO: Bike, Car and Truck, each a subclass of Vehicle that overrides fee()


def main():
    n = int(input())
    vehicles = []
    for _ in range(n):
        kind, plate, hours = input().split()
        # TODO: build the right object, or print "Unknown vehicle: <kind>" and skip the line
        pass
    # TODO: print every vehicle, then Vehicles, Total fees, Average fee and Top payer


main()
`,
        tests: [
          { input: '3\nCAR KA01AB1234 3\nBIKE TN09X7 5\nTRUCK MH12TR9 2\n', expectedOutput: 'KA01AB1234 (Car, 3h): 60\nTN09X7 (Bike, 5h): 50\nMH12TR9 (Truck, 2h): 200\nVehicles: 3\nTotal fees: 310\nAverage fee: 103.33\nTop payer: MH12TR9' },
          { input: '4\ncar AP05C1 1\nBUS KA02B9 4\nbike AP05B2 0\nTruck TS07T3 0\n', expectedOutput: 'Unknown vehicle: BUS\nAP05C1 (Car, 1h): 40\nAP05B2 (Bike, 0h): 0\nTS07T3 (Truck, 0h): 100\nVehicles: 3\nTotal fees: 140\nAverage fee: 46.67\nTop payer: TS07T3' },
          { input: '0\n', expectedOutput: 'Vehicles: 0\nTotal fees: 0\nAverage fee: 0.00\nTop payer: none', isHidden: true },
          { input: '3\nCAR DL1 5\nTRUCK DL2 0\nCAR DL3 5\n', expectedOutput: 'DL1 (Car, 5h): 100\nDL2 (Truck, 0h): 100\nDL3 (Car, 5h): 100\nVehicles: 3\nTotal fees: 300\nAverage fee: 100.00\nTop payer: DL1', isHidden: true },
          { input: '2\nVAN X1 2\nscooter X2 1\n', expectedOutput: 'Unknown vehicle: VAN\nUnknown vehicle: scooter\nVehicles: 0\nTotal fees: 0\nAverage fee: 0.00\nTop payer: none', isHidden: true },
          { input: '3\nCAR K1 2\nBIKE K2 12\nTRUCK HR55 24\n', expectedOutput: 'K1 (Car, 2h): 40\nK2 (Bike, 12h): 120\nHR55 (Truck, 24h): 1300\nVehicles: 3\nTotal fees: 1460\nAverage fee: 486.67\nTop payer: HR55', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_PY_OOP_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every Python OOP round. For each: the answer that gets you
through, and the follow-up a good answer earns.

## Q1. "What are the four pillars of OOP, and how does Python do each one?"

**Model answer.** "*Encapsulation*: an object keeps its state and the rules about it together.
Python has no \`private\` keyword; a leading underscore says 'internal', a double underscore
mangles the name, and a \`@property\` lets me validate on assignment, so a \`Wallet\` balance can
never go negative. *Inheritance*: a class extends another with \`class Savings(Account)\` and
calls the parent's setup with \`super().__init__()\`. *Polymorphism*: one call, behaviour chosen
by the object, through overriding, and also through **duck typing**, where any object with the
right method works, related or not. *Abstraction*: callers depend on a contract, not an
implementation; I write it as an \`abc.ABC\` with \`@abstractmethod\` when I want a missing method
caught when the object is created."

**Follow-up:** "So Python has no real privacy?" — "Right. It is a convention for adults:
\`_balance\` is still reachable, and \`__balance\` becomes \`_Wallet__balance\`, which is also
reachable. The point is to make the intended interface obvious and the misuse deliberate. The
protection that matters is the property that validates every change."

## Q2. "What happens if you define __eq__ but not __hash__?"

**Model answer.** "Python sets \`__hash__\` to \`None\`, so the objects become unhashable and
cannot go in a set or be dict keys. That is deliberate. Sets look an object up by hash and then
check \`==\`, so equal objects must have equal hashes. If the default identity hash were kept,
two equal objects would land in different buckets and a set would hold both. The fix is a
\`__hash__\` over exactly the fields \`__eq__\` compares, usually \`hash((self.a, self.b))\`."

    class Point:
        def __init__(self, x, y):
            self.x, self.y = x, y
        def __eq__(self, other):
            return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)
        def __hash__(self):
            return hash((self.x, self.y))

**Follow-up:** "What if x changes after the point is in a set?" — "Then its hash changes, but
it stays in the bucket for the old hash, so \`p in points\` can be \`False\` for an object that
is there. Fields used in the hash must not change while the object is stored. In practice I make
such objects immutable, for example with a frozen dataclass."

## Q3. "Explain the MRO. What does super() call in a diamond?"

**Model answer.** "With multiple inheritance Python needs one search order for attributes: the
method resolution order, in \`Class.__mro__\`. It puts every class before its bases, keeps the
bases in the order they were listed, and includes each class once. \`super()\` does not mean 'my
parent'; it means the **next class in the MRO of the object**. So in \`class D(B, C)\` where both
\`B\` and \`C\` extend \`A\`, the MRO is D, B, C, A, and \`super()\` inside \`B\` calls \`C\`. If
every class calls \`super()\`, each one runs exactly once, and \`A\` is not run twice."

**Follow-up:** "When would you avoid multiple inheritance?" — "Almost always, except for small
mixins that add one capability without state. For combining behaviours I prefer composition:
hold the part as an attribute and delegate. It is easier to read and can change at runtime."

## Delivering it

Say the rule in one sentence, show a three-line example, then name the trap: privacy by
convention, the hash contract, \`super()\` following the MRO. The follow-up is where an
interviewer separates a memorised answer from an understood one.`,
    mcqs: [
      mcq('An interviewer asks how Python makes an attribute private. Which answer is most accurate?', [
        ['A double underscore makes it impossible to reach from outside the class', false],
        ['Python has a private keyword, much like Java\'s, that is rarely used', false],
        ['Only by convention: _name says internal, __name is mangled to _Class__name', true],
        ['Only attributes created inside __init__ are hidden from other modules', false],
      ], 'Python has no access modifiers. A single underscore is a convention; a double underscore triggers name mangling, which renames it to _ClassName__name but leaves it reachable. Real protection comes from properties that validate.'),
      mcq('Follow-up: a Point is put in a set, and then its x is changed. Its __hash__ uses x. What can go wrong?', [
        ['The set notices the change and moves the point to its new bucket', false],
        ['Python raises TypeError the moment x is assigned a new value', false],
        ['The set now holds two copies of the point, the old one and the new', false],
        ['p in points may be False, as the point sits under its old hash', true],
      ], 'A set files each object under the hash it had when added. After x changes, a lookup computes the new hash, searches the wrong bucket and misses the point. Hashed fields must not change while the object is stored.'),
      mcq('In class D(B, C), with B and C both extending A, every hello() method calls super().hello(). Which runs when B\'s hello calls super().hello() on a D object?', [
        ['A.hello, because A is the class that B extends', false],
        ['C.hello, the next class in D\'s method order', true],
        ['D.hello again, since the object is a D', false],
        ['Nothing at all, since B has only one parent', false],
      ], 'super() follows the MRO of the object, here D, B, C, A. After B comes C, so B\'s super().hello() calls C.hello, and C\'s then calls A.hello, which runs once.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_MINI_PROJECT',
    notes: `# Mini Project — An Inventory and Orders System

Build a console shop in plain Python (standard library only, no frameworks). The point is not the
shop. It is designing classes that cannot be put into an invalid state, and using inheritance, an
abstract base class and composition each where it genuinely fits.

## What it does

The program keeps products, customers and orders in memory and reads commands from the console:

    ADD PHYSICAL P1 "Steel bottle" 499.00 20 0.6
    ADD DIGITAL D1 "Python e-book" 299.00
    ADD PERISHABLE F1 "Mango box" 650.00 8 2026-11-20
    CUSTOMER C1 asha
    ORDER C1
    LINE P1 2
    LINE D1 1
    DISCOUNT PERCENT 10
    CONFIRM
    STOCK
    ORDERS C1
    EXIT

## The classes to design

1. **\`Product\` (abstract).** An abstract base class with a SKU, a name and a price held in
   **paise as an int** (never a float for money). Price and name are validated through
   properties: a price of 0 or less, or an empty name, raises \`ValueError\`. Abstract methods
   \`shipping_cost(quantity)\` and \`can_supply(quantity)\`; a finished \`line_total(quantity)\`.
2. **Three kinds of product.**
   - \`PhysicalProduct\`: has stock and a weight in kg; shipping is ₹40 per kg of the line,
     rounded up to whole kg; it can supply a quantity only if that much is in stock.
   - \`DigitalProduct\`: no stock and no shipping; it can always supply.
   - \`PerishableProduct\`: a physical product with an expiry date (\`datetime.date\`); it cannot
     supply once the expiry date has passed.
3. **\`Inventory\`.** Holds products by SKU (composition: an inventory *has* products). Adds,
   finds and lists them; \`reserve(sku, qty)\` and \`release(sku, qty)\` are the only way stock
   changes. A product's stock has no public setter.
4. **\`Customer\`.** An id and a name, with \`__eq__\` and \`__hash__\` by id so customers work as
   dict keys.
5. **\`Order\` and \`OrderLine\`.** An order *has* lines, a customer and a discount. An
   \`OrderLine\` is a product and a quantity. \`Order.total()\` is the subtotal of the lines after the
   discount (never below 0), plus shipping.
6. **Discounts (composition, not inheritance of Order).** \`NoDiscount\`, \`PercentOff(p)\` and
   \`FlatOff(amount)\`, each with \`apply(subtotal)\`. The order holds one and calls it; changing
   the discount never needs a new kind of order.
7. **Special methods.** \`__str__\` on products and orders for the console, \`__repr__\` for
   debugging, \`__len__\` on an order (its number of lines), and \`__eq__\`/\`__hash__\` on
   \`Product\` by SKU.

## Milestones

1. **Products.** The ABC and its three subclasses, with validation. Creating a \`Product\`
   directly raises \`TypeError\`.
2. **Inventory.** Add and list products; reserve and release stock with checks.
3. **Orders.** Customers, orders, lines and totals with shipping; \`CONFIRM\` reserves the stock
   of every line, or none of it.
4. **Discounts.** The three discount classes, swappable on an open order.
5. **The command loop.** Parse each command, print clear messages, and never crash on bad input.

## Acceptance criteria (what "done" looks like)

- \`ADD PHYSICAL X1 "Mug" -5 10 0.3\` prints an error, and no product is added.
- Ordering 25 of a product with 20 in stock is refused at \`CONFIRM\`; stock is still 20.
- An order with a line that cannot be supplied changes **no** stock at all (all or nothing).
- A perishable product past its expiry date cannot be ordered.
- A digital product adds no shipping, and its stock never changes.
- 2 × ₹499.00 at 0.6 kg each is 1.2 kg, which is shipped as 2 kg: ₹80.00 shipping.
- \`PERCENT 10\` on a ₹1,297.00 subtotal takes off ₹129.70; \`FLAT 2000\` on it gives a total of
  ₹0.00 plus shipping, never a negative amount.
- \`Product("P1", ...)\` raises \`TypeError\`; no field is changed from outside except through a
  method or a validating property; no \`isinstance\` chain decides shipping or supply rules.
- Every amount is printed as rupees with two decimals, from integer paise.

## Stretch goals

Save the inventory to a text file on \`EXIT\` and load it on start (after the Errors topic); a
\`BuyXGetY\` discount; a \`RETURN\` command that releases stock for a confirmed order.

## What to submit

The source (one module per class group is welcome), a README with three sample sessions, and a
short design note: why \`Product\` is abstract, why discounts are composed rather than inherited,
and how stock is protected.`,
    mcqs: [
      mcq('Orders need three kinds of discount, and an open order may switch from one to another. Which design fits the brief?', [
        ['PercentOrder and FlatOrder subclasses of Order, one per kind', false],
        ['A discount object held by the order, each kind with apply()', true],
        ['A discount_type string on Order, checked in an if/elif chain', false],
        ['A global function that takes the order and a discount name', false],
      ], 'The discount is a part of the order that varies and can change at runtime, so it is composed: the order holds one object and calls apply. Subclassing Order would fix the discount at creation and multiply classes.'),
      mcq('Why does the brief make Product an abstract base class with abstract shipping_cost and can_supply?', [
        ['So that every kind of product is forced to define both rules', true],
        ['So that products load faster, because abstract classes are cached', false],
        ['So that Product objects can be used as dictionary keys at all', false],
        ['So that the subclasses do not need to call super().__init__()', false],
      ], 'Each kind supplies and ships differently, so each must define both rules. An ABC refuses to create a subclass that forgot one, and Product itself cannot be created, since a product with no rules makes no sense.'),
      mcq('PhysicalProduct stock must change only when an order is confirmed or returned. Which design protects it?', [
        ['A public stock attribute that any of the code may set directly', false],
        ['A class attribute named stock, which is shared by every product', false],
        ['A read-only stock property, changed only by Inventory.reserve and release', true],
        ['A global dictionary of stock counts that is kept outside the classes', false],
      ], 'Encapsulation: the stock is stored privately, exposed read-only, and changed only through methods that check it. A class attribute would also be shared by every product, which is a separate bug.'),
    ],
    assignment: {
      title: 'An Inventory and Orders System',
      description: 'A console shop with physical, digital and perishable products, stock, customers and orders with totals, shipping and discounts, designed with encapsulation, inheritance, an abstract base class and composition.',
      instructions: `Build the shop described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The Python source: an abstract \`Product\` with \`PhysicalProduct\`, \`DigitalProduct\` and
   \`PerishableProduct\`; an \`Inventory\`; a \`Customer\`; an \`Order\` with \`OrderLine\`s; the
   discount classes; and a \`main\` that runs the command loop.
2. A README with three sample sessions copied from your console: one normal order with a
   discount, one refused order (not enough stock, or an expired product), and one with invalid
   input (a negative price, an unknown SKU, an unknown command).
3. A design note of five to eight sentences: why \`Product\` is abstract, why discounts are
   composed rather than subclasses of \`Order\`, how stock is protected, and one place you chose
   composition over inheritance.

**Before you submit, check every acceptance criterion in the brief** by running it, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct shop behaviour', description: 'Stock checks, all-or-nothing confirmation, expiry, shipping rounding, discounts and totals behave exactly as the acceptance criteria state; money is integer paise printed with two decimals.', maxPoints: 30 },
        { criterion: 'Encapsulation and validation', description: 'Price and name validated through properties; stock read-only and changed only through Inventory; no public field is set from outside; bad input never crashes the program.', maxPoints: 20 },
        { criterion: 'Inheritance and the abstract base class', description: 'Product is an ABC that cannot be created; each subclass overrides shipping_cost and can_supply; PerishableProduct extends PhysicalProduct with super(); no isinstance chain decides the rules.', maxPoints: 20 },
        { criterion: 'Composition', description: 'Inventory has products, Order has lines and a discount object; discounts are swappable on an open order without a new class of order.', maxPoints: 15 },
        { criterion: 'Special methods and the design note', description: 'Useful __str__ and __repr__, __len__ on Order, __eq__/__hash__ by SKU and by customer id; a README and design note that justify the choices.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'JT_PY_OOP_CHECKPOINT',
    notes: `Twelve questions across the whole topic: classes and instance state, self, encapsulation
and properties, class attributes and classmethods, inheritance and super(), polymorphism, abstract
base classes, special methods and composition. Each one is a short snippet to trace by hand.
Before you look at the options, write down which class each method is found on, and which object
each attribute belongs to.`,
    checkpoint: [
      ck(OOP, `What does this print?

    class Lamp:
        on = False

    a = Lamp()
    b = Lamp()
    a.on = True
    print(a.on, b.on, Lamp.on)`, [
        ['True True True', false],
        ['True False True', false],
        ['True False False', true],
        ['True True False', false],
      ], 'a.on = True creates an instance attribute on a only, which shadows the class attribute. b has none of its own, so it reads Lamp.on, which is still False.'),
      ck(OOP, `What does this print?

    class Switch:
        def __init__(self):
            self.state = "off"

        def flip(self):
            self.state = "on" if self.state == "off" else "off"

    s = Switch()
    Switch.flip(s)
    s.flip()
    Switch.flip(s)
    print(s.state)`, [
        ['on', true],
        ['off', false],
        ['TypeError: flip needs no argument', false],
        ['TypeError: self is missing', false],
      ], 'Switch.flip(s) is the same call as s.flip(): self is simply the object passed first. Three flips from "off" go on, off, on.'),
      ck(OOP, `What does this print?

    class Vault:
        def __init__(self):
            self.__code = 1234

    v = Vault()
    print(hasattr(v, "__code"), hasattr(v, "_Vault__code"))`, [
        ['True True', false],
        ['True False', false],
        ['False False', false],
        ['False True', true],
      ], 'A double-underscore name written inside a class is mangled to _ClassName__name. The attribute really is stored as _Vault__code, and no attribute called __code exists.'),
      ck(OOP, `What does this print?

    class Rating:
        def __init__(self, stars):
            self.stars = stars

        @property
        def stars(self):
            return self._stars

        @stars.setter
        def stars(self, value):
            self._stars = max(1, min(5, value))

    r = Rating(9)
    print(r.stars)
    r.stars = 0
    print(r.stars)`, [
        ['9, then 0', false],
        ['5, then 1', true],
        ['9, then 1', false],
        ['AttributeError', false],
      ], 'self.stars = stars in __init__ goes through the property setter too, so 9 is clamped to 5. Assigning 0 later is clamped to 1. Validation in a setter covers every assignment, including the first.'),
      ck(OOP, `What does this print?

    class Item:
        def __init__(self, name):
            self.name = name

        @classmethod
        def from_text(cls, text):
            return cls(text.strip().title())

    class Gift(Item):
        pass

    g = Gift.from_text("  red box ")
    print(type(g).__name__, g.name)`, [
        ['Item Red Box', false],
        ['Gift   red box ', false],
        ['Gift Red Box', true],
        ['Gift None', false],
      ], 'A classmethod receives the class it was called on as cls. Called on Gift, cls is Gift, so cls(...) builds a Gift. The text is stripped and title-cased first.'),
      ck(OOP, `What does this print?

    class Ticket:
        issued = 0

        def __init__(self):
            Ticket.issued += 1
            self.number = Ticket.issued

    t1 = Ticket()
    t2 = Ticket()
    t3 = Ticket()
    print(t1.number, t3.number, Ticket.issued)`, [
        ['3 3 3', false],
        ['1 3 3', true],
        ['1 1 1', false],
        ['0 2 3', false],
      ], 'issued is one counter on the class, shared by all tickets, and each __init__ raises it. number is an instance attribute copied at that moment, so t1 keeps 1 while the class reaches 3.'),
      ck(OOP, `What does this print?

    class Vehicle:
        def __init__(self, wheels):
            self.wheels = wheels
            print("Vehicle", wheels)

    class Bike(Vehicle):
        def __init__(self):
            print("Bike")
            super().__init__(2)

    Bike()`, [
        ['Vehicle 2, then Bike', false],
        ['Bike only', false],
        ['Bike, then Vehicle 2', true],
        ['Vehicle 2 only', false],
      ], 'Python does not run the parent\'s __init__ automatically or first. Bike.__init__ runs, prints Bike, and only then calls super().__init__(2), which prints Vehicle 2.'),
      ck(OOP, `What does this print?

    class Animal: pass
    class Dog(Animal): pass

    d = Dog()
    print(isinstance(d, Animal), type(d) == Animal, issubclass(Dog, object))`, [
        ['True True True', false],
        ['False False True', false],
        ['True False False', false],
        ['True False True', true],
      ], 'isinstance accepts subclasses, so a Dog is an Animal. type(d) is exactly Dog, so comparing it to Animal is False. Every class ultimately inherits from object.'),
      ck(OOP, `What happens when this runs?

    from abc import ABC, abstractmethod

    class Payment(ABC):
        @abstractmethod
        def pay(self, amount):
            ...

    class Upi(Payment):
        def pay(self, amount):
            return f"UPI {amount}"

    methods = [Upi()]
    methods.append(Payment())
    print(len(methods))`, [
        ['It prints 2: both objects are created', false],
        ['It prints 1: Payment() is quietly skipped', false],
        ['TypeError at Upi(), as Payment is abstract', false],
        ['TypeError at Payment(), and nothing prints', true],
      ], 'Upi overrides pay, so it is concrete and Upi() works. Payment still has an abstract method, so calling Payment() raises TypeError, and the print is never reached.'),
      ck(OOP, `What does this print?

    class City:
        def __init__(self, name):
            self.name = name

        def __str__(self):
            return self.name

        def __repr__(self):
            return f"City<{self.name}>"

    c = City("Pune")
    print(f"{c} {c!r}")`, [
        ['City<Pune> City<Pune>', false],
        ['Pune Pune', false],
        ['Pune City<Pune>', true],
        ['City<Pune> Pune', false],
      ], 'A plain {c} in an f-string uses str(c), which is __str__. The !r conversion asks for repr(c) instead, which is __repr__.'),
      ck(OOP, `What does this print?

    class Celsius:
        def __init__(self, degrees):
            self.degrees = degrees

        def __add__(self, other):
            return Celsius(self.degrees + other.degrees)

        def __repr__(self):
            return f"{self.degrees}C"

    print(Celsius(20) + Celsius(5), Celsius(1) == Celsius(1))`, [
        ['25C True', false],
        ['25C False', true],
        ['TypeError on +', false],
        ['25 True', false],
      ], '+ calls __add__, which returns a new Celsius shown by __repr__ as 25C. The class defines no __eq__, so == compares identity, and two separate objects are not equal.'),
      ck(OOP, `What does this print?

    class Wheel:
        def __init__(self):
            self.pressure = 30

    class Car:
        def __init__(self):
            self.wheels = [Wheel(), Wheel(), Wheel(), Wheel()]

    a = Car()
    b = Car()
    a.wheels[0].pressure = 10
    print(b.wheels[0].pressure, len(a.wheels))`, [
        ['10 4', false],
        ['30 1', false],
        ['10 1', false],
        ['30 4', true],
      ], 'Each Car builds its own list of new Wheel objects in __init__, so the parts are not shared. Changing a\'s first wheel leaves b\'s wheel at 30, and each car has 4 wheels.'),
    ],
  },
];
