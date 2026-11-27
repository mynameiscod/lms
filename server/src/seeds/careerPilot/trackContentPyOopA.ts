/**
 * Career-track content: object-oriented Python, first half (JT_PY_OOP) — classes and objects,
 * __init__ and self, encapsulation with properties, class attributes with classmethod and
 * staticmethod, and inheritance with super(). Polymorphism, abstract base classes, special methods,
 * composition and the ending units live in a sibling file.
 *
 * OOP in a Python interview is examined on a short class and "what does this print?" or "what does
 * this raise?", so nearly every question here is about one specific snippet. Everything is Python
 * 3.10, because that is what the grader runs; every quoted output was run and checked. Where an
 * error message differs between versions (a read-only property, for one), the question names the
 * exception only.
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

export const TRACK_PY_OOP_A_BUNDLES: PilotBundle[] = [
  /* ══ JT_PY_OOP — Object-Oriented Python (classes → inheritance) ═════════════════════════ */
  {
    unitCode: 'JT_PY_OOP_CLASSES_OBJECTS',
    notes: `So far your programs have kept data in variables, lists and dicts, and kept the rules about
that data in separate functions. A **class** puts the two together: it describes a kind of thing —
what each one *knows* (its **attributes**) and what each one *can do* (its **methods**). An
**object** (an **instance**) is one concrete thing made from that description.

One class, many objects. \`str\` is a class and \`"hello"\` is one of its objects; \`list\` is a class
and every list you have built is one of its instances. Now you write your own.

## A first class

    class Dog:
        def bark(self):
            return "Woof"

    rex = Dog()            # CALL the class to make an object
    print(rex.bark())      # Woof
    print(type(rex))       # <class '__main__.Dog'>
    print(isinstance(rex, Dog))   # True

- \`class Dog:\` starts the class body; everything indented under it belongs to the class.
- A function defined inside a class is a **method**. Its first parameter, by convention called
  \`self\`, receives the object the method was called on. The next unit is all about \`self\`.
- Class names use CapWords (\`BankAccount\`, \`Dog\`); methods and attributes use snake_case.
- An empty class still needs a body: \`class Ticket: pass\`.

There is no \`new\` keyword. Calling the class like a function, \`Dog()\`, builds a fresh object and
returns it.

## Attributes: data that lives on one object

An attribute is a name stored *on an object*, reached with a dot:

    class Ticket:
        pass

    t = Ticket()
    t.seat = 14            # creates the attribute seat on THIS ticket
    t.movie = "Leo"
    print(t.seat, t.movie) # 14 Leo

Each object has its own attributes. Setting \`t.seat\` gives nothing to any other ticket:

    u = Ticket()
    print(u.seat)          # AttributeError: 'Ticket' object has no attribute 'seat'

Methods usually create and change attributes through \`self\`, so the object looks after its own data:

    class Lamp:
        def turn_on(self):
            self.lit = True

        def turn_off(self):
            self.lit = False

    desk = Lamp()
    desk.turn_on()
    print(desk.lit)        # True

Setting attributes from outside, one at a time, is fragile: forget one and the object is half
built. The fix is \`__init__\`, which gives every object its starting state the moment it is made —
the next unit.

## How a method call works

\`desk.turn_on()\` is shorthand. Python finds \`turn_on\` on the class and passes the object in as the
first argument:

    desk.turn_on()         # what you write
    Lamp.turn_on(desk)     # what actually happens

That is why every method needs \`self\` as its first parameter. Leave it out and the call fails,
because Python still passes the object:

    class Greeter:
        def hello():               # no self
            return "hi"

    Greeter().hello()
    # TypeError: ...hello() takes 0 positional arguments but 1 was given

## Variables hold references to objects

A variable does not contain the object; it refers to it. Assigning one variable to another makes two
names for one object, exactly as with lists:

    a = Ticket()
    a.seat = 4
    b = a                  # no new ticket
    b.seat = 7
    print(a.seat)          # 7

Two separately created objects are different objects, even with identical attributes. Without extra
work (special methods, later in this topic), \`==\` on your own objects means "same object", like \`is\`:

    print(Ticket() == Ticket())    # False
    print(a is b)                  # True

## Design reasoning

A class earns its place when some data and the rules about that data belong together. A shopping
cart is a list of items *plus* "add an item", "remove one" and "what is the total"; once those live
in one \`Cart\` class, every part of the program uses the same rules instead of re-writing them.

When not to write a class: a single function that takes input and returns a result needs no class
around it. Python is happy with plain functions, and an interviewer will notice a class that holds
nothing.

## Common mistakes and interview traps

- Forgetting the parentheses: \`t = Ticket\` binds the *class* to \`t\`, it does not make an object.
- Forgetting \`self\` in a method definition — the "takes 0 positional arguments but 1 was given"
  TypeError.
- Reading an attribute no code has set yet — an AttributeError, at the moment that line runs.
- "Is everything in Python an object?" Yes: ints, functions, modules and classes themselves are
  objects, and \`type(Dog)\` is \`<class 'type'>\`.`,
    workedExample: `**Problem.** A parking app keeps each car as a dict: \`{"plate": "KA01", "hours": 0}\`, and
three different files each contain their own code to add an hour and compute the fee. One file
charges ₹40 an hour and another ₹50. Model a car properly.

1. Name the thing and what it knows: a \`ParkedCar\` knows its plate and how long it has stayed.
2. Name what it does: stays another hour, and works out its fee. Those are methods.

        class ParkedCar:
            RATE = 40

            def park(self, plate):
                self.plate = plate
                self.hours = 0

            def add_hour(self):
                self.hours += 1

            def fee(self):
                return self.hours * self.RATE

3. Use it:

        car = ParkedCar()
        car.park("KA01")
        car.add_hour()
        car.add_hour()
        print(car.plate, car.fee())     # KA01 80

4. Check that objects are independent: a second \`ParkedCar\` that parks and stays one hour has a fee
   of 40, and the first car's hours are untouched.

The reasoning: the fee rule now exists in exactly one place, so the ₹40/₹50 disagreement cannot
happen. One weakness remains — \`car.fee()\` before \`car.park(...)\` raises AttributeError, because
\`hours\` does not exist yet. \`__init__\`, in the next unit, removes that gap by giving every car its
plate and zero hours the moment it is created.`,
    mcqs: [
      mcq(`What does this print?

    class Lamp:
        def turn_on(self):
            self.lit = True

    a = Lamp()
    b = Lamp()
    a.turn_on()
    print(hasattr(a, "lit"), hasattr(b, "lit"))`, [
        ['True False', true],
        ['True True', false],
        ['False False', false],
        ['AttributeError raised for b', false],
      ], 'turn_on sets lit on the object it was called on, through self. Only a ran it, so only a has the attribute; b is a separate object and hasattr simply reports False instead of raising.'),
      mcq(`What happens when this runs?

    class Greeter:
        def hello():
            return "hi"

    g = Greeter()
    print(g.hello())`, [
        ['It prints hi, as hello takes no arguments', false],
        ['TypeError: 0 positional arguments but 1 was given', true],
        ['NameError, because self is never defined here', false],
        ['It prints None, as the method has no self', false],
      ], 'g.hello() is run as Greeter.hello(g): Python always passes the object as the first argument. hello was defined with no parameters, so the call gives it one argument too many.'),
      mcq(`What does this print?

    class Ticket:
        pass

    t1 = Ticket()
    t1.seat = 4
    t2 = t1
    t2.seat = 7
    print(t1.seat)`, [
        ['4', false],
        ['7', true],
        ['AttributeError', false],
        ['None', false],
      ], 't2 = t1 creates no new Ticket; it binds a second name to the same object. Setting seat through t2 changes the only Ticket there is, so t1.seat reads 7.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Coin:
        pass

    p = Coin()
    q = Coin()
    print(p == q, p is q)`, [
        ['False False', true],
        ['True False', false],
        ['True True', false],
        ['False True', false],
      ], 'Each Coin() call creates a distinct object. A class that defines no equality method falls back to identity for ==, so both comparisons ask "same object?" and both are False.'),
      ck(OOP, 'A class Cart has the method `def add(self, qty)`. Which call does exactly what `basket.add(5)` does?', [
        ['Cart.add(basket, 5)', true],
        ['Cart.add(5)', false],
        ['basket.add(basket, 5)', false],
        ['Cart(basket).add(5)', false],
      ], 'Calling a method through an object passes that object as the first argument, self. Calling it through the class means you pass the object yourself, so Cart.add(basket, 5) is the same call.'),
      ck(OOP, `What happens when this runs?

    class Badge:
        pass

    one = Badge()
    one.level = 3
    two = Badge()
    print(two.level)`, [
        ['AttributeError: \'Badge\' object has no attribute \'level\'', true],
        ['It prints 3, because Badge objects share their attributes', false],
        ['It prints None, the value of every unset attribute', false],
        ['NameError: name \'level\' is not defined in Badge', false],
      ], 'one.level = 3 creates the attribute on that one object only. two is a separate Badge that was never given level, and reading a missing attribute raises AttributeError; Python has no default value.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_INIT_SELF',
    notes: `An object should be complete the moment it exists. \`__init__\` makes that happen: it is the
method Python runs automatically on every new object, before you get it back.

## __init__

    class Player:
        def __init__(self, name, lives=3):
            self.name = name       # instance attribute
            self.lives = lives
            self.score = 0         # not a parameter, but every player starts with it

        def lose_life(self):
            self.lives -= 1

    ana = Player("Ana")
    ben = Player("Ben", lives=5)
    ana.lose_life()
    print(ana.name, ana.lives, ana.score)   # Ana 2 0
    print(ben.lives)                        # 5

What \`Player("Ana")\` does, step by step:

1. Python creates a new, empty Player object.
2. It calls \`Player.__init__(new_object, "Ana")\` — the new object arrives as \`self\`.
3. \`__init__\` stores attributes on \`self\`.
4. The finished object is returned and bound to \`ana\`.

The arguments you pass to the class go straight to \`__init__\` after \`self\`, with all the usual
function rules: defaults, keywords, and a TypeError when one is missing:

    Player()     # TypeError: ...__init__() missing 1 required positional argument: 'name'

People call \`__init__\` "the constructor". Strictly it is the *initialiser* — the object already
exists when it runs (\`__new__\` creates it, and you almost never write that) — but in an interview
either word is understood.

## What self really is

\`self\` is not a keyword. It is the first parameter of every method, and on every call it is the
object the method was called on:

    class Probe:
        def me(self):
            return self

    p = Probe()
    print(p.me() is p)     # True

\`ana.lose_life()\` runs \`Player.lose_life(ana)\`, so inside that call \`self\` *is* \`ana\`;
\`ben.lose_life()\` runs it with \`self\` as \`ben\`. One method, written once, works on whichever
object called it. The name \`self\` is a convention every Python programmer follows; use it.

## self.x versus x

Inside a method, a bare name is a **local variable** that vanishes when the method returns. Only
\`self.name = ...\` stores something on the object:

    class Account:
        def __init__(self, owner, balance=0):
            self.owner = owner
            balance = balance      # BUG: just reassigns the local parameter

    Account("Ravi", 50).balance
    # AttributeError: 'Account' object has no attribute 'balance'

The same mistake reading: \`return balance\` in another method is a NameError, because \`balance\`
there is not the object's attribute. Always \`self.balance\`.

## Every object has its own state

Instance attributes live in the object's own namespace, which you can inspect:

    class Student:
        def __init__(self, name, age):
            self.name = name
            self.age = age

    s = Student("Asha", 20)
    print(vars(s))         # {'name': 'Asha', 'age': 20}

Changing \`s.age\` changes one dict entry on one object. Two students never share a name or an age
unless you make two names point at one object.

## Rules __init__ must follow

- It must return \`None\`. \`return self\`, or any other value, raises
  \`TypeError: __init__() should return None\`.
- Set **every** attribute the other methods need, even to \`0\`, \`""\` or \`None\`. Then no method
  can meet a missing attribute.
- Keep it to setting up state. Long work (network calls, reading files) in \`__init__\` makes
  objects slow and hard to test.
- The mutable-default trap from functions applies here too: \`def __init__(self, tags=[])\` gives
  every object the *same* list. Use \`tags=None\` and \`self.tags = tags if tags is not None else []\`.

## Interview traps

- "What is self?" — the instance the method was called on, passed in automatically as the first
  argument; not a keyword, and named self by convention.
- "Can a class have two __init__ methods?" — no. A second \`def __init__\` simply replaces the first.
  Use default arguments, or an alternative constructor (a classmethod, two units on).
- Calling \`obj.__init__(...)\` again by hand re-runs it on the same object; it never makes a new one.`,
    workedExample: `**Problem.** Write a \`Timer\` for a quiz: it is created with a number of seconds, it ticks down
one second at a time, it never goes below zero, and it can say whether time is up.

1. Decide the state every Timer needs from the start: the seconds left. Put it in \`__init__\`, and
   reject nonsense early:

        class Timer:
            def __init__(self, seconds):
                if seconds < 0:
                    raise ValueError("seconds must be 0 or more")
                self.left = seconds

2. Write behaviour that works on \`self\`, so it suits every timer:

            def tick(self):
                if self.left > 0:
                    self.left -= 1

            def is_up(self):
                return self.left == 0

3. Check two timers stay independent:

        quick = Timer(2)
        long = Timer(60)
        quick.tick()
        quick.tick()
        quick.tick()                       # already 0: stays 0
        print(quick.left, quick.is_up())   # 0 True
        print(long.left, long.is_up())     # 60 False

4. Trace one call: \`quick.tick()\` is \`Timer.tick(quick)\`, so \`self.left\` is quick's attribute;
   \`long\` is never touched.

The reasoning: because \`__init__\` sets \`left\` on every Timer, no method can meet a timer without
it, and because it validates the argument, no Timer can start in an impossible state. Keeping a
Timer valid *after* creation — when code writes \`quick.left = -10\` directly — is what the next unit,
encapsulation, solves.`,
    mcqs: [
      mcq(`What happens when this runs?

    class Account:
        def __init__(self, owner, balance=0):
            self.owner = owner
            balance = balance

    acc = Account("Ravi", 50)
    print(acc.balance)`, [
        ['It prints 50, the value passed in for balance', false],
        ['It prints 0, the default value of the parameter', false],
        ['AttributeError: the object has no balance attribute', true],
        ['NameError: balance is not defined outside __init__', false],
      ], 'balance = balance only rebinds the local parameter to itself; nothing is stored on self. When __init__ returns the local is gone, so the Account has owner but no balance attribute.'),
      mcq(`What does this print?

    class Probe:
        def me(self):
            return self

    p = Probe()
    print(p.me() is p)`, [
        ['True', true],
        ['False', false],
        ['None', false],
        ['TypeError', false],
      ], 'Calling p.me() passes p in as self, and the method returns that same object. is compares identity, and the returned object is p itself, so the result is True.'),
      mcq(`What happens when this runs?

    class Point:
        def __init__(self, x, y):
            self.x = x
            self.y = y

    pt = Point(3)`, [
        ['pt is made with y set to None, as y was omitted', false],
        ['TypeError: __init__() is missing the argument y', true],
        ['pt is made, and reading pt.y later raises an error', false],
        ['TypeError: Point() takes no arguments at all', false],
      ], 'Arguments to the class are passed to __init__ after self. It declares x and y with no defaults, so Point(3) is missing y and the call raises TypeError before any object is returned.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Player:
        def __init__(self, name):
            self.name = name
            self.lives = 3

        def lose_life(self):
            self.lives -= 1

    ana = Player("Ana")
    ben = Player("Ben")
    ana.lose_life()
    ana.lose_life()
    ben.lose_life()
    print(ana.lives, ben.lives)`, [
        ['1 2', true],
        ['0 0', false],
        ['2 1', false],
        ['3 3', false],
      ], '__init__ gives each Player its own lives attribute starting at 3. lose_life changes self.lives, which is ana on her two calls and ben on his one, so ana ends with 1 and ben with 2.'),
      ck(OOP, `What happens when this runs?

    class Sensor:
        def __init__(self, port):
            self.port = port
            return self

    s = Sensor(8)`, [
        ['s is a Sensor, because returning self is optional', false],
        ['TypeError, because __init__ must return None', true],
        ['s is bound to None, the value __init__ returns', false],
        ['SyntaxError: __init__ may not contain a return', false],
      ], 'Python checks what __init__ returns, and anything other than None raises TypeError: __init__() should return None. The object is built by the class call itself; __init__ only fills it in.'),
      ck(OOP, `What does this print?

    class Student:
        def __init__(self, name, age):
            self.name = name
            self.age = age

    s = Student("Asha", 20)
    s.city = "Pune"
    print(vars(s))`, [
        ["{'name': 'Asha', 'age': 20, 'city': 'Pune'}", true],
        ["{'name': 'Asha', 'age': 20}", false],
        ["{'self': s, 'name': 'Asha', 'age': 20}", false],
        ['AttributeError, as city was not set in __init__', false],
      ], 'vars returns the object\'s own attribute dict. __init__ added name and age, and assigning s.city afterwards adds a third entry; attributes are not limited to the ones __init__ sets.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_ENCAPSULATION',
    notes: `**Encapsulation** means an object guards its own state: outside code works through the
object's methods, and the object makes sure its data always makes sense. A bank account whose
balance any line of code can set to -5000 is not guarded.

Java and C# do this with \`private\`. Python has **no access modifiers**. It relies on naming
conventions, one bit of name rewriting, and properties.

## _name: "internal, please do not touch"

A single leading underscore means "this is an implementation detail":

    class Config:
        def __init__(self):
            self._token = "abc"

    cfg = Config()
    print(cfg._token)      # abc — nothing stops you

Python enforces nothing. The underscore is a promise between programmers: the class may rename or
remove \`_token\` tomorrow, so code outside the class should not rely on it. Linters and IDEs warn
when you reach into one. (A module-level \`_helper\` is also skipped by \`from module import *\`.)

## __name: name mangling

Two leading underscores (and at most one trailing) make Python **rewrite** the name inside the
class body to \`_ClassName__name\`:

    class Vault:
        def __init__(self):
            self.__pin = 1234

    v = Vault()
    print(v._Vault__pin)   # 1234
    print(v.__pin)         # AttributeError: 'Vault' object has no attribute '__pin'

This is not security — the mangled name is right there. Its real purpose is to stop a **subclass**
accidentally overwriting a parent's attribute of the same name, because each class's \`__x\` is
mangled with its own class name. Use \`_name\` for ordinary internals; reach for \`__name\` only when a
class is designed to be subclassed by people who will not read its code.

Names with two underscores on *both* sides, like \`__init__\`, are not mangled; those are special
methods.

## @property: an attribute with rules

The Pythonic way to protect state is to start with a plain public attribute and, when a rule is
needed, turn it into a **property** without changing a single caller:

    class Product:
        def __init__(self, name, price):
            self.name = name
            self.price = price             # goes through the setter below

        @property
        def price(self):                   # the getter: runs on  p.price
            return self._price

        @price.setter
        def price(self, value):            # the setter: runs on  p.price = ...
            if value < 0:
                raise ValueError("price cannot be negative")
            self._price = value

    p = Product("pen", 10)
    p.price = 25
    print(p.price)                         # 25
    p.price = -1                           # ValueError: price cannot be negative
    Product("ink", -5)                     # ValueError too — __init__ used the setter

Points to notice:

- Callers still write \`p.price\` and \`p.price = 25\`. No \`get_price()\`/\`set_price()\` pair —
  Python programmers consider those un-Pythonic.
- The real value is stored under a **different** name, \`_price\`. The property is the public face.
- \`self.price = price\` in \`__init__\` deliberately goes through the setter, so even a brand-new
  object is validated by the same rule.

## Read-only and computed properties

A property with no setter cannot be assigned:

    class Circle:
        def __init__(self, r):
            self._r = r

        @property
        def radius(self):
            return self._r

    c = Circle(2)
    c.radius = 5           # AttributeError (the wording differs between Python versions)

A property can also compute its value every time, so it is never out of date:

    class Rect:
        def __init__(self, w, h):
            self.w = w
            self.h = h

        @property
        def area(self):
            return self.w * self.h

    r = Rect(2, 3)
    r.w = 5
    print(r.area)          # 15 — read like an attribute, no parentheses

## The recursion trap

Inside a property, never use the property's own name for storage:

    @property
    def celsius(self):
        return self.celsius        # calls this getter again... and again

That getter calls itself forever and ends in \`RecursionError\`; a setter that does
\`self.celsius = value\` does the same. Store under \`self._celsius\`.

## Design reasoning

Validate where the state changes, once, in the setter — not in every caller. Expose what callers
need (\`balance\`), hide how it is kept (\`_balance\`), and offer methods for the changes that have
rules (\`deposit\`, \`withdraw\`) instead of a public setter that lets anyone write any number.

## Interview traps

- "Does Python have private members?" — no enforced ones; \`_x\` is a convention and \`__x\` is name
  mangling, which a determined caller can still reach.
- \`r.area()\` on a property is a TypeError: \`r.area\` already *is* the number, and an int is not
  callable.
- Defining the getter and setter as two plain methods with the same name, without
  \`@price.setter\`, leaves only the second definition.`,
    workedExample: `**Problem.** A wallet class has a public \`balance\`, and a bug elsewhere set it to -300. Make
negative balances impossible without breaking code that reads \`wallet.balance\`.

1. Keep the value under an internal name and expose it read-only:

        class Wallet:
            def __init__(self, owner, balance=0):
                if balance < 0:
                    raise ValueError("opening balance cannot be negative")
                self.owner = owner
                self._balance = balance

            @property
            def balance(self):
                return self._balance

2. Give the two legitimate changes their own methods, each with its rule:

            def deposit(self, amount):
                if amount <= 0:
                    raise ValueError("deposit must be positive")
                self._balance += amount

            def withdraw(self, amount):
                if amount > self._balance:
                    raise ValueError("insufficient funds")
                self._balance -= amount

3. Check it:

        w = Wallet("Meera", 500)
        w.deposit(200)
        w.withdraw(100)
        print(w.balance)        # 600
        w.balance = -300        # AttributeError: no setter
        w.withdraw(5000)        # ValueError: insufficient funds

4. Readers of \`w.balance\` are unchanged; only the faulty writer now fails, loudly, at the line that
   was wrong.

The reasoning: there is no setter because "set the balance to any number" is not an operation a
wallet has. Every way the state can change goes through a method that checks its rule, so the object
cannot be put into an invalid state. \`_balance\` is still reachable by someone determined, and that
is accepted in Python: the underscore tells them they are on their own.`,
    mcqs: [
      mcq(`What does this print?

    class Vault:
        def __init__(self):
            self.__pin = 1234

    v = Vault()
    print(v._Vault__pin)`, [
        ['1234', true],
        ['None', false],
        ['AttributeError', false],
        ['_Vault__pin', false],
      ], 'Inside the class body, __pin is rewritten (mangled) to _Vault__pin, so that is the name actually stored on the object. Reading it by the mangled name works; name mangling is not access control.'),
      mcq(`What happens on the last line?

    class Product:
        def __init__(self, name, price):
            self.name = name
            self.price = price

        @property
        def price(self):
            return self._price

        @price.setter
        def price(self, value):
            if value < 0:
                raise ValueError("price cannot be negative")
            self._price = value

    item = Product("ink", -5)`, [
        ['item is made, since __init__ skips the setter', false],
        ['ValueError, as __init__ goes through the setter', true],
        ['item is made with price clamped to zero instead', false],
        ['AttributeError, since _price is not yet defined', false],
      ], 'self.price = price inside __init__ is an ordinary assignment to the property, so it runs the setter. The setter rejects -5 with ValueError, which is exactly why validation belongs in the setter.'),
      mcq(`What does this print?

    class Rect:
        def __init__(self, w, h):
            self.w = w
            self.h = h

        @property
        def area(self):
            return self.w * self.h

    r = Rect(2, 3)
    r.w = 5
    print(r.area)`, [
        ['6', false],
        ['15', true],
        ['<bound method Rect.area>', false],
        ['TypeError', false],
      ], 'A property computes its value each time it is read. By the time r.area is read, w is 5, so the getter returns 5 * 3. No parentheses are used, because a property is read like an attribute.'),
    ],
    checkpoint: [
      ck(OOP, `What happens when this runs?

    class Config:
        def __init__(self):
            self._token = "abc"

    cfg = Config()
    print(cfg._token)`, [
        ['It prints abc; the underscore is only a convention', true],
        ['AttributeError, as _token is private to Config', false],
        ['It prints None, as _token is hidden from callers', false],
        ['It prints abc, but only after a warning is raised', false],
      ], 'A single leading underscore is a naming convention meaning "internal". Python enforces nothing and raises no warning, so the attribute reads normally; the underscore only tells other programmers not to rely on it.'),
      ck(OOP, `What happens when this runs?

    class Temp:
        def __init__(self, c):
            self.celsius = c

        @property
        def celsius(self):
            return self.celsius

        @celsius.setter
        def celsius(self, value):
            self.celsius = value

    t = Temp(30)`, [
        ['t is created, and t.celsius later reads as 30', false],
        ['RecursionError, from the setter calling itself', true],
        ['AttributeError, because celsius has no storage', false],
        ['t is created, but reading t.celsius gives None', false],
      ], 'Inside the setter, self.celsius = value is another assignment to the same property, so it calls the setter again, endlessly, until RecursionError. The value must be stored under a different name such as _celsius.'),
      ck(OOP, `What happens on the last line?

    class Circle:
        def __init__(self, r):
            self._r = r

        @property
        def radius(self):
            return self._r

    c = Circle(2)
    c.radius = 5`, [
        ['AttributeError, since radius has no setter', true],
        ['radius becomes 5 and _r keeps the value 2', false],
        ['_r becomes 5 through the property quietly', false],
        ['TypeError, since a property is not callable', false],
      ], 'A property defined with only a getter is read-only. Assigning to it raises AttributeError (the message wording varies by Python version); it neither replaces the property nor writes to _r.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_CLASS_MEMBERS',
    notes: `Everything so far lived on one object. Some things belong to the **class** as a whole: a tax
rate every shop uses, a count of how many objects were made, a way to build an object from a string.

## Class attributes

A name assigned directly in the class body, outside any method, is a **class attribute**. There is
one copy, stored on the class, shared by every instance:

    class Shop:
        tax = 5                    # class attribute

        def __init__(self, name):
            self.name = name       # instance attribute

    a = Shop("A1")
    b = Shop("B2")
    print(a.tax, b.tax, Shop.tax)  # 5 5 5

## How lookup works: instance first, then class

\`a.tax\` looks in \`a\`'s own attributes first; only if the name is not there does it look on the
class. That rule explains every class-attribute puzzle:

    Shop.tax = 8                   # change the shared value
    print(a.tax, b.tax)            # 8 8 — both read it from the class

    a.tax = 12                     # ASSIGNING through an instance...
    print(Shop.tax, a.tax, b.tax)  # 8 12 8 — ...creates a new instance attribute on a only

Assignment through an instance never changes the class attribute; it creates (or replaces) an
instance attribute that **shadows** the class one for that object alone.

## The counter trap

That same rule breaks the classic instance counter:

    class Widget:
        made = 0

        def __init__(self):
            self.made += 1         # reads 0 from the class, then stores 1 on THIS object

    for _ in range(3):
        Widget()
    print(Widget.made)             # 0

\`self.made += 1\` is \`self.made = self.made + 1\`: the read finds the class's 0, the write creates an
instance attribute. Update shared state through the class: \`Widget.made += 1\` (or \`type(self).made\`).

## The shared-mutable trap

A mutable class attribute is shared too, and *mutating* it (not assigning) goes straight to the one
shared object:

    class Team:
        members = []               # ONE list for every Team

        def add(self, name):
            self.members.append(name)

    x = Team()
    y = Team()
    x.add("Ira")
    y.add("Dev")
    print(x.members)               # ['Ira', 'Dev']

It is the mutable-default trap again in a new place. Per-object lists and dicts belong in
\`__init__\`: \`self.members = []\`. Class attributes are for constants and genuinely shared values.

## @classmethod: methods that receive the class

A classmethod gets the **class** as its first argument, named \`cls\` by convention. Its everyday use
is an **alternative constructor** — another way to build an object:

    class Temperature:
        def __init__(self, celsius):
            self.celsius = celsius

        @classmethod
        def from_fahrenheit(cls, f):
            return cls((f - 32) * 5 / 9)

    t = Temperature.from_fahrenheit(212)
    print(t.celsius)               # 100.0

Python has one \`__init__\` per class, so "build from a string", "build from a dict" or "build from
Fahrenheit" become named classmethods: \`Date.from_string("2024-03-15")\`. The standard library does
the same (\`dict.fromkeys\`, \`datetime.fromtimestamp\`). Calling \`cls(...)\` rather than naming the
class means a subclass calling the method gets an object of the subclass.

## @staticmethod: a plain function kept in the class

A staticmethod receives neither \`self\` nor \`cls\`. It is an ordinary function placed in the class
because it belongs with it:

    class MathKit:
        @staticmethod
        def clamp(v, lo, hi):
            return max(lo, min(v, hi))

    print(MathKit.clamp(15, 0, 10))     # 10
    print(MathKit().clamp(-3, 0, 10))   # 0 — callable through an instance too

## Choosing

    needs this object's data?          → instance method (self)
    needs the class, or builds one?    → @classmethod (cls)
    needs neither, but belongs here?   → @staticmethod
    one value shared by all objects?   → class attribute (constants: UPPER_CASE)
    a value per object?                → instance attribute, set in __init__

A staticmethod that grows to need the class should become a classmethod; a helper used by many
unrelated classes is better as a module-level function.

## Interview traps

- "Difference between classmethod and staticmethod?" — a classmethod receives the class (and so
  works correctly for subclasses and can build objects); a staticmethod receives nothing implicit.
- Changing \`Shop.tax\` affects every instance *except* those that shadowed it with their own \`tax\`.
- A class attribute is reached as \`Shop.tax\` from anywhere, with no object at all.`,
    workedExample: `**Problem.** An event app reads attendees from lines like \`"Kiran,24"\`, needs every attendee
to have a unique badge number, and must report how many attendees exist.

1. Shared state goes on the class: the next badge number.

        class Attendee:
            next_badge = 1

            def __init__(self, name, age):
                self.name = name
                self.age = age
                self.badge = Attendee.next_badge     # read the shared counter
                Attendee.next_badge += 1             # update it ON THE CLASS

2. Building from a line is another way to construct, so it is a classmethod:

            @classmethod
            def from_line(cls, line):
                name, age = line.split(",")
                return cls(name.strip(), int(age))

3. Checking a line needs no attendee and no class data — a staticmethod:

            @staticmethod
            def is_valid(line):
                parts = line.split(",")
                return len(parts) == 2 and parts[1].strip().isdigit()

4. Use them together:

        lines = ["Kiran,24", "bad line", "Leela, 31"]
        people = [Attendee.from_line(s) for s in lines if Attendee.is_valid(s)]
        for p in people:
            print(p.badge, p.name, p.age)   # 1 Kiran 24, then 2 Leela 31
        print(Attendee.next_badge - 1)      # 2

The reasoning: writing \`self.next_badge += 1\` would have given every attendee badge 1 (the counter
trap), so the counter is updated through the class. \`from_line\` returns \`cls(...)\`, so a future
\`VipAttendee\` subclass gets VIP objects from the same method.`,
    mcqs: [
      mcq(`What does this print?

    class Shop:
        tax = 5

    a = Shop()
    b = Shop()
    a.tax = 12
    print(Shop.tax, a.tax, b.tax)`, [
        ['5 12 5', true],
        ['12 12 12', false],
        ['5 12 12', false],
        ['12 12 5', false],
      ], 'Assigning a.tax creates an instance attribute on a that shadows the class attribute for a alone. Shop.tax is untouched, and b has no tax of its own, so it still reads the class value 5.'),
      mcq(`What does this print?

    class Team:
        members = []

        def add(self, name):
            self.members.append(name)

    x = Team()
    y = Team()
    x.add("Ira")
    y.add("Dev")
    print(x.members)`, [
        ["['Ira']", false],
        ["['Ira', 'Dev']", true],
        ["['Dev']", false],
        ['[]', false],
      ], 'members is one list stored on the class. append mutates that shared list rather than assigning a new attribute, so both Team objects add to the same list and x sees both names.'),
      mcq('An `Order` class needs a helper `is_valid_code(code)` that checks a string format and uses no order data and no class data. Which is the most fitting way to define it?', [
        ['As a @staticmethod, as it needs neither self nor cls', true],
        ['As a @classmethod, so it can read the class through cls', false],
        ['As an instance method, so every order owns its own copy', false],
        ['As a class attribute holding a lambda for the format', false],
      ], 'A staticmethod is a plain function grouped with the class it belongs to; it receives nothing implicitly. A classmethod is for code that needs the class, and an instance method for code that needs one object.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Widget:
        made = 0

        def __init__(self):
            self.made += 1

    for _ in range(3):
        w = Widget()
    print(Widget.made, w.made)`, [
        ['0 1', true],
        ['3 3', false],
        ['3 1', false],
        ['1 1', false],
      ], 'self.made += 1 reads the class value 0, then assigns 1 to a new instance attribute on that one object. The class attribute is never changed, so Widget.made stays 0 and each widget holds its own 1.'),
      ck(OOP, `What does this print?

    class Temperature:
        def __init__(self, celsius):
            self.celsius = celsius

        @classmethod
        def from_fahrenheit(cls, f):
            return cls((f - 32) * 5 / 9)

    t = Temperature.from_fahrenheit(212)
    print(t.celsius, type(t).__name__)`, [
        ['100.0 Temperature', true],
        ['100 Temperature', false],
        ['212 Temperature', false],
        ['100.0 classmethod', false],
      ], 'cls is the Temperature class, so cls(...) builds a Temperature through __init__. (212 - 32) * 5 / 9 uses true division, which always gives a float, so celsius is 100.0.'),
      ck(OOP, `What does this print?

    class Fee:
        rate = 10

    p = Fee()
    q = Fee()
    p.rate = 30
    Fee.rate = 20
    print(p.rate, q.rate)`, [
        ['30 20', true],
        ['20 20', false],
        ['30 10', false],
        ['20 10', false],
      ], 'p.rate = 30 gave p its own instance attribute, which lookup finds first. q has none, so it reads the class attribute, which was changed to 20. Instance first, then class, explains both.'),
    ],
  },

  {
    unitCode: 'JT_PY_OOP_INHERITANCE',
    notes: `**Inheritance** builds a new class on an existing one. The new class (the **subclass**, or
child) gets everything the existing one (the **base class**, superclass or parent) has, and then
adds to it or changes parts of it. It models an **is-a** relationship: a savings account *is an*
account; a manager *is an* employee.

## Subclassing

    class Animal:
        def __init__(self, name):
            self.name = name

        def describe(self):
            return f"{self.name} is an animal"

    class Cat(Animal):             # Cat inherits from Animal
        def purr(self):
            return "purr"

    milo = Cat("Milo")             # Animal's __init__ runs: Cat has none of its own
    print(milo.describe())         # Milo is an animal
    print(milo.purr())             # purr

The parentheses after the class name list the base class. A class with no base, like \`Animal\`,
inherits from \`object\`, the root of every class in Python; that is where defaults such as
\`__str__\` and identity-based \`==\` come from.

## What a subclass inherits

Every method and class attribute of the base, including \`__init__\`. There is no "private is not
inherited" rule as in Java; a \`_name\` attribute is inherited like any other. (A \`__name\`
attribute is inherited too, but mangled with the *base* class's name, which is the point of
mangling.)

When Python looks up \`milo.describe\`, it searches the object, then \`Cat\`, then \`Animal\`, then
\`object\`, and uses the first match. That search order is why a subclass can **override** a method:
define one with the same name and it is found first.

## Overriding __init__ and calling super()

A subclass usually needs extra state, so it writes its own \`__init__\`. The moment it does, the
base's \`__init__\` **no longer runs by itself** — you must call it with \`super()\`:

    class Employee:
        def __init__(self, name, salary):
            self.name = name
            self.salary = salary

    class Manager(Employee):
        def __init__(self, name, salary, team_size):
            super().__init__(name, salary)     # let Employee set up its part
            self.team_size = team_size         # then add Manager's part

    m = Manager("Zoya", 90000, 6)
    print(m.name, m.salary, m.team_size)       # Zoya 90000 6

\`super()\` returns a proxy that looks methods up starting *after* the current class, so
\`super().__init__(...)\` runs \`Employee.__init__\` on the same object. Forget it, and the
attributes the base sets never exist:

    class Vehicle:
        def __init__(self, wheels):
            self.wheels = wheels

    class Bike(Vehicle):
        def __init__(self, brand):
            self.brand = brand                 # no super().__init__ call

    Bike("Hero").wheels    # AttributeError: 'Bike' object has no attribute 'wheels'

Write \`super().__init__(...)\` without \`self\` — the proxy already supplies it. Calling it first
is the usual habit, so the subclass builds on a complete base.

## Extending a method, not just replacing it

\`super()\` works for any method. Call it when the child should do the parent's work *plus* more:

    class Animal:
        def describe(self):
            print("I am an animal")

    class Dog(Animal):
        def describe(self):
            print("I am a dog")
            super().describe()

    Dog().describe()       # I am a dog
                           # I am an animal

Where the \`super()\` call sits decides the order. Leave it out and the parent's version does not run
at all. (Choosing which override runs at runtime is polymorphism, the next unit.)

## isinstance, issubclass and type

    b = Bike("Hero")
    isinstance(b, Bike)        # True
    isinstance(b, Vehicle)     # True  — a Bike IS a Vehicle
    type(b) == Vehicle         # False — type() is the exact class only
    issubclass(Bike, Vehicle)  # True
    issubclass(Bike, object)   # True  — everything is

Prefer \`isinstance\`: it respects inheritance, so a check written for \`Vehicle\` keeps working for
every future subclass. \`isinstance(x, (int, float))\` accepts a tuple of classes.

## Design reasoning

Inherit when the child genuinely *is a* specialised parent and can be used wherever the parent is
expected. Do not inherit just to reuse a few methods — a \`Car\` is not an \`Engine\`. That is
composition's job, later in this topic. Keep hierarchies shallow: one or two levels are easy to
follow; five are not.

## Interview traps

- A subclass with **no** \`__init__\` uses the parent's, with the parent's parameters:
  \`Square("sq")\` works and \`Square()\` raises TypeError if \`Shape.__init__\` needs a label.
- A subclass with its own \`__init__\` that forgets \`super().__init__(...)\` — the
  "object has no attribute" error far from where the bug is.
- \`isinstance(child, Parent)\` is True; \`type(child) == Parent\` is False.
- Calling \`Parent.__init__(self, ...)\` by name also works, but \`super()\` is the norm and is what
  makes multiple inheritance behave.`,
    workedExample: `**Problem.** A library system has \`Item(title, year)\` with a \`loan_days()\` method returning 21
and an \`info()\` method. Add DVDs: they have a running time and are lent for 7 days only, and their
info must show the running time after the usual details.

1. A DVD *is an* item, so subclass it:

        class Item:
            def __init__(self, title, year):
                self.title = title
                self.year = year

            def loan_days(self):
                return 21

            def info(self):
                return f"{self.title} ({self.year})"

        class Dvd(Item):
            def __init__(self, title, year, minutes):
                super().__init__(title, year)      # Item sets title and year
                self.minutes = minutes

2. The loan rule differs, so override it outright:

            def loan_days(self):
                return 7

3. The info is the parent's *plus* more, so extend it with super():

            def info(self):
                return f"{super().info()}, {self.minutes} min"

4. Check:

        d = Dvd("Lagaan", 2001, 224)
        print(d.info())                    # Lagaan (2001), 224 min
        print(d.loan_days())               # 7
        print(isinstance(d, Item))         # True
        print(Item("Godaan", 1936).loan_days())   # 21

The reasoning: \`super().__init__\` means the title-and-year logic lives only in \`Item\`; if Item
later validates the year, DVDs get it for free. \`info\` reuses the parent's text instead of copying
it, and \`loan_days\` is replaced because the DVD rule is entirely different. Every function written
for Items still accepts a Dvd.`,
    mcqs: [
      mcq(`What happens on the last line?

    class Vehicle:
        def __init__(self, wheels):
            self.wheels = wheels

    class Bike(Vehicle):
        def __init__(self, brand):
            self.brand = brand

    b = Bike("Hero")
    print(b.wheels)`, [
        ['It prints 2, the default wheel count for a Bike', false],
        ['AttributeError, as Vehicle.__init__ never ran', true],
        ['TypeError, as Bike() was not given wheels too', false],
        ['It prints None, since wheels is inherited unset', false],
      ], 'Bike defines its own __init__, which replaces Vehicle\'s, and it never calls super().__init__. So the line that sets wheels never runs, and reading b.wheels raises AttributeError.'),
      mcq(`What does this print?

    class Vehicle:
        pass

    class Bike(Vehicle):
        pass

    b = Bike()
    print(isinstance(b, Vehicle), type(b) == Vehicle)`, [
        ['True False', true],
        ['True True', false],
        ['False False', false],
        ['False True', false],
      ], 'isinstance respects inheritance, so a Bike counts as a Vehicle. type returns the exact class of the object, which is Bike, so comparing it with Vehicle gives False.'),
      mcq(`What does this print?

    class Animal:
        def __init__(self, name):
            self.name = name

        def describe(self):
            return f"{self.name} is an animal"

    class Cat(Animal):
        pass

    print(Cat("Milo").describe())`, [
        ['Milo is an animal', true],
        ['Cat is an animal', false],
        ['TypeError: Cat() takes no arguments', false],
        ['AttributeError: Cat has no describe', false],
      ], 'Cat defines nothing, so it inherits Animal\'s __init__ and describe. Cat("Milo") runs the inherited __init__, which sets name, and describe reads self.name from that Cat object.'),
    ],
    checkpoint: [
      ck(OOP, `What does this print?

    class Animal:
        def describe(self):
            print("I am an animal")

    class Dog(Animal):
        def describe(self):
            print("I am a dog")
            super().describe()

    Dog().describe()`, [
        ['I am a dog, then I am an animal, on two lines', true],
        ['I am an animal, then I am a dog, on two lines', false],
        ['Only I am a dog, as the override replaces it', false],
        ['Only I am an animal, as super() runs instead', false],
      ], 'Dog.describe overrides the parent, so it runs first and prints its line. It then calls super().describe(), which runs Animal\'s version on the same object, so the animal line comes second.'),
      ck(OOP, `What does this print?

    class Employee:
        def __init__(self, name, salary):
            self.name = name
            self.salary = salary

    class Manager(Employee):
        def __init__(self, name, salary):
            super().__init__(name, salary * 2)
            self.reports = []

    m = Manager("Zoya", 400)
    print(m.name, m.salary, m.reports)`, [
        ['Zoya 800 []', true],
        ['Zoya 400 []', false],
        ['Zoya 800 None', false],
        ['AttributeError', false],
      ], 'Manager passes salary * 2, which is 800, up to Employee.__init__, which stores name and that salary on the object. Manager then adds reports as an empty list, so all three attributes exist.'),
      ck(OOP, `Which line raises an error?

    class Shape:
        def __init__(self, label):
            self.label = label

    class Square(Shape):
        pass

    s = Square("sq")     # line A
    print(s.label)       # line B
    t = Square()         # line C`, [
        ['Line C, as the inherited __init__ needs label', true],
        ['Line A, as Square defines no __init__ of its own', false],
        ['Line B, as label belongs to Shape, not to Square', false],
        ['None of them; Square() leaves label set to None', false],
      ], 'A subclass with no __init__ inherits its parent\'s, parameters and all. Square("sq") works and sets label, so line B prints sq, but Square() is missing the required label and raises TypeError.'),
    ],
  },
];
