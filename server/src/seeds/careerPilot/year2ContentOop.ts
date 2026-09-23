/**
 * T2_OOP_OBJECTS and T2_OOP_PRINCIPLES — sixteen units. Year 2, mandatory backbone.
 *
 * ── THE LINE THESE TOPICS HOLD ────────────────────────────────────────────────────────────
 *
 * OOP is usually taught as four words to recite — encapsulation, inheritance, polymorphism,
 * abstraction — and examined by asking for their definitions. That produces students who can name
 * the pillars and cannot model a problem. Here each idea arrives because the previous code became
 * painful: state that anybody could corrupt, behaviour copied into three classes, a caller that had
 * to know which type it held. The definitions come after the need, and the units say plainly where
 * each idea is the WRONG tool, because knowing when not to inherit is most of what separates a
 * second-year from a first-year.
 *
 * Python throughout, because that is what the student already writes.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const OOP_BUNDLES: PilotBundle[] = [
  /* ── T2_OOP_OBJECTS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_OOP_OBJECTS_WHY_OBJECTS',
    notes: `You can write a whole program with functions and dictionaries. Plenty of good programs
are written that way. So the question is not "what is an object" — it is **what goes wrong without
them**, and at what size.

**The same program, twice.** A library that lends books:

    # With dictionaries
    book = {"title": "Dune", "copies": 3, "lent": 0}

    def lend(book):
        book["lent"] += 1

    def is_available(book):
        return book["lent"] < book["copies"]

It works. Now look at what it allows:

    lend(book)            # fine
    book["lent"] = 99     # also fine, and now the library is lying
    book["lentt"] = 1     # a typo that creates a new key, silently
    lend({"title": "x"})  # KeyError, deep inside lend()

**The same thing as an object:**

    class Book:
        def __init__(self, title, copies):
            self.title = title
            self.copies = copies
            self._lent = 0

        def lend(self):
            if not self.is_available():
                raise ValueError(f"No copies of {self.title} left")
            self._lent += 1

        def is_available(self):
            return self._lent < self.copies

Now the rules about lending live **with** the data they protect. There is one place that changes
\`_lent\`, and it refuses to make the count impossible.

**What an object actually is:** some data, and the operations allowed on that data, kept together
and handed out as one thing.

**The three problems objects solve**, in the order you meet them:

1. **Scattered rules.** With dictionaries, the rule "you cannot lend a book you do not have" lives
   in whichever functions remembered to check. With an object it lives in one method.
2. **Invalid states.** A dictionary can hold any keys with any values. An object can refuse.
3. **Naming things.** \`Book\`, \`Member\`, \`Loan\` are the words the problem is described in.
   Code that uses the same words is code you can discuss with the person who asked for it.

**When objects are the wrong tool** — and this matters as much:

- A script that reads a file, sums a column and prints it. A function is the whole program.
- Plain data that has no rules of its own — a point, a date range, a row from a CSV.
- A class with one method and no state. That is a function wearing a costume.

**The rule of thumb for this year:** when data and the rules about that data keep travelling
together, make it an object. When it is just data, leave it as data.`,
    mcqs: [
      mcq('With `book = {"title": "Dune", "copies": 3, "lent": 0}`, what stops `book["lent"] = 99`?',
        [['Nothing — a dictionary accepts any value for any key', true],
          ['Python checks the value against the other keys', false],
          ['The dictionary raises an error for impossible values', false],
          ['The key is read-only once the dictionary is created', false]],
        'Which is the point: nothing owns the rule, so nothing can enforce it.'),
      mcq('What does putting a method on a class change about a rule like "cannot lend what you do not have"?',
        [['It lives in one place instead of in every function that remembered it', true],
          ['It makes the rule run faster than a plain function does', false],
          ['It stops other code in the program from raising errors', false],
          ['It removes the need to test that rule at all', false]],
        'One place to write it, one place to fix it, one place to read it.'),
      mcq('Which of these is the weakest case for writing a class?',
        [['A script that sums one column of a file and prints the total', true],
          ['A bank account where the balance must never go negative', false],
          ['An order that can only be cancelled before it is shipped', false],
          ['A booking that must not overlap another booking', false]],
        'No rules to protect and no state to keep: a function is the whole program.'),
      mcq('`book["lentt"] = 1` on a dictionary does what?',
        [['Creates a new key, silently, and the typo goes unnoticed', true],
          ['Raises a KeyError because the key does not exist', false],
          ['Updates the "lent" key, since the names are similar', false],
          ['Fails, because dictionaries have a fixed set of keys', false]],
        'A class attribute typo fails loudly on read; a dictionary typo quietly creates a second truth.'),
    ],
    checkpoint: [
      mcq('An object is best described as:',
        [['Data, plus the operations allowed on that data', true],
          ['A dictionary with a name attached to it', false],
          ['A function that can remember its arguments', false],
          ['A file that holds several related functions', false]],
        'The pairing is the point: the rules travel with the thing they protect.'),
      mcq('A class has one method and holds no state. This suggests:',
        [['A plain function would do the same job more clearly', true],
          ['The class should inherit from another class', false],
          ['The method should be split into several methods', false],
          ['State should be added so the class is justified', false]],
        'A class earns its place by protecting state. With none, it is a function in a costume.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_CLASSES_AND_INSTANCES',
    notes: `A **class** is a description. An **instance** is a thing made from that description. The
class \`Book\` is not a book; \`Book("Dune", 3)\` is.

    class Book:
        def __init__(self, title, copies):
            self.title = title      # this instance's title
            self.copies = copies

    a = Book("Dune", 3)
    b = Book("Dune", 3)

    a.title           # 'Dune'
    a is b            # False — two separate objects
    a.title = "Emma"  # changes a only
    b.title           # 'Dune'

**\`self\` is the instance, handed to the method.** When you call \`a.lend()\`, Python calls
\`Book.lend(a)\`. That is all \`self\` is: the object the call was made on. Forget it in a
definition and the error tells you so:

    def lend():           # missing self
        ...
    a.lend()              # TypeError: lend() takes 0 positional arguments but 1 was given

**Instance state versus class state**, which is the first real trap:

    class Book:
        shelf = "General"     # class attribute — ONE, shared by every instance
        def __init__(self, title):
            self.title = title  # instance attribute — one per object

    a, b = Book("Dune"), Book("Emma")
    Book.shelf = "Fiction"
    a.shelf, b.shelf          # ('Fiction', 'Fiction') — both changed

**And the trap proper:**

    class Member:
        borrowed = []                  # DANGER: shared by every member
        def borrow(self, book):
            self.borrowed.append(book)

Every member now shares one list. The fix is to create it per instance, in \`__init__\`:

    class Member:
        def __init__(self):
            self.borrowed = []         # one list per member

**Reading an object back.** By default printing an object is useless:

    print(a)      # <__main__.Book object at 0x7f3c...>

\`__repr__\` fixes it, and is worth writing on every class you will debug:

    def __repr__(self):
        return f"Book({self.title!r}, copies={self.copies})"

**Equality is identity until you say otherwise.** Two books with the same title are different
objects, so \`a == b\` is \`False\` unless the class defines \`__eq__\`. That is usually correct —
two copies of Dune really are two things — and occasionally not.`,
    mcqs: [
      mcq('What is `self` inside a method?',
        [['The instance the method was called on', true],
          ['A copy of the class definition itself', false],
          ['The name of the method being executed', false],
          ['A dictionary of every attribute in the class', false]],
        'a.lend() is Book.lend(a), so self is a — nothing more mysterious than that.'),
      mcq('`borrowed = []` written directly in the class body gives you:',
        [['One list shared by every instance of the class', true],
          ['A fresh empty list for each new instance', false],
          ['An error, because lists cannot be class attributes', false],
          ['A list that resets each time it is read', false]],
        'Class-level mutable defaults are shared state; create them in __init__ instead.'),
      mcq('`a = Book("Dune", 3)` and `b = Book("Dune", 3)`. What is `a is b`?',
        [['False — two separate objects with equal contents', true],
          ['True, because the arguments are identical', false],
          ['True, because Python caches small objects', false],
          ['An error, since `is` cannot compare objects', false]],
        'Identity asks whether it is the same object, not whether it looks the same.'),
      mcq('Why write `__repr__` on a class?',
        [['So printing an object shows what it holds when debugging', true],
          ['So the object can be stored in a dictionary key', false],
          ['So instances compare equal by their contents', false],
          ['So the class can be inherited from safely', false]],
        'Without it, an object prints as its memory address, which tells you nothing at 2am.'),
    ],
    checkpoint: [
      mcq('Where should a list that each object needs its own copy of be created?',
        [['Inside __init__, assigned to self', true],
          ['In the class body, above __init__', false],
          ['In the module, outside the class', false],
          ['In whichever method first appends to it', false]],
        'Anything in the class body is created once and shared by every instance.'),
      mcq('Defining a method without `self` and calling it on an instance gives:',
        [['A TypeError about too many arguments', true],
          ['A silent failure with no output at all', false],
          ['A NameError when self is referenced', false],
          ['Normal behaviour, since self is optional', false]],
        'Python passes the instance automatically, so the definition must accept it.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_CONSTRUCTORS',
    notes: `\`__init__\` runs once, when an object is created. Its one job: **leave the object in a
state that is valid**, so no other method has to wonder.

    class Loan:
        def __init__(self, book, member, days):
            if days < 1:
                raise ValueError("A loan must be at least one day")
            self.book = book
            self.member = member
            self.days = days
            self.returned = False

Every other method can now assume \`days\` is sensible. That assumption is what a constructor
buys you.

**Validate in the constructor, not everywhere after it.** The alternative is every method checking
the same thing, and one of them forgetting.

**Defaults, and the classic Python trap:**

    def __init__(self, tags=[]):      # WRONG: one list, shared by every object
        self.tags = tags

    def __init__(self, tags=None):    # right
        self.tags = tags or []

The default is evaluated **once**, when the function is defined — so every object built without
tags shares the same list, and one object's append is visible to all of them.

**Several ways to build the same thing** — a class method that returns an instance:

    class Book:
        def __init__(self, title, copies):
            self.title, self.copies = title, copies

        @classmethod
        def from_row(cls, row):
            return cls(row["title"], int(row["copies"]))

\`Book.from_row({...})\` reads better than a constructor that accepts three different shapes of
argument and tries to work out which it got.

**The life of an object**, in the order it happens:

1. **Created** — \`__init__\` runs, and either succeeds or raises.
2. **Used** — methods called, state changes, rules enforced.
3. **Finished with** — nothing references it, and Python reclaims it.

You rarely write cleanup code in Python; when something must be released — a file, a connection —
use a context manager (\`with\`) rather than trusting \`__del__\`, which runs at a time nobody
controls.

**A constructor that does real work is a smell.** Reading a file, calling an API or opening a
connection inside \`__init__\` makes the object impossible to create in a test. Take the data as an
argument, and let something else fetch it.`,
    mcqs: [
      mcq('What is the main job of `__init__`?',
        [['To leave the object in a valid state', true],
          ['To allocate the memory the object needs', false],
          ['To register the object with its class', false],
          ['To give every attribute a default value', false]],
        'Validate once, at the boundary, so no later method has to wonder.'),
      mcq('`def __init__(self, tags=[])` is a bug because the list is:',
        [['Created once and shared by every instance', true],
          ['Rebuilt on every call, which is slow', false],
          ['Read-only, so appending to it fails', false],
          ['Discarded unless it is assigned to self', false]],
        'Default arguments are evaluated at definition time. Use None and build the list inside.'),
      mcq('Why prefer `Book.from_row(row)` to a constructor that accepts several argument shapes?',
        [['Each way of building is named, so the call says what it means', true],
          ['Class methods run faster than constructors do', false],
          ['A constructor cannot take a dictionary as input', false],
          ['It avoids having to validate the input at all', false]],
        'One constructor guessing what it was handed is where the confusing bugs live.'),
      mcq('Opening a database connection inside `__init__` mainly causes:',
        [['Objects that cannot be created in a test', true],
          ['Connections that are never closed properly', false],
          ['Slower attribute access on the object', false],
          ['Errors when the class is inherited from', false]],
        'Take what you need as an argument; let a caller decide where it comes from.'),
    ],
    checkpoint: [
      mcq('A `Loan` must last at least one day. The check belongs:',
        [['In the constructor, so no invalid loan exists', true],
          ['In every method that reads the days field', false],
          ['In the code that calls the constructor', false],
          ['In a separate validator run nightly', false]],
        'Rejecting at creation means the rest of the class can trust its own state.'),
      mcq('In Python, releasing a file or connection is best handled by:',
        [['A context manager, used with `with`', true],
          ['Writing a `__del__` method on the class', false],
          ['Calling the garbage collector by hand', false],
          ['Setting the attribute to None when done', false]],
        '__del__ runs whenever the object is reclaimed, which is not a time you control.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_METHODS',
    notes: `A method is a function that belongs to a class. The interesting question is **which
functions belong**.

**The test: does it only ever act on this class's data?** If yes, it belongs inside.

    # Before — the rule lives outside the data it is about
    def days_overdue(loan, today):
        due = loan.start + timedelta(days=loan.days)
        return max(0, (today - due).days)

    # After
    class Loan:
        def days_overdue(self, today):
            due = self.start + timedelta(days=self.days)
            return max(0, (today - due).days)

    loan.days_overdue(date.today())

The second reads as a question asked of the loan, which is what it is.

**What does not belong on the class:**

- Anything about **several** classes equally — \`match(member, book)\` is not obviously a method of
  either.
- Anything about the **outside world**: sending email, writing files, calling an API. Keep those at
  the edges, so the class stays testable.
- Anything the class does not have the data for.

**Three kinds of method**, and when each is right:

    class Book:
        def lend(self):                 # instance method: needs this object
            ...

        @classmethod
        def from_row(cls, row):         # class method: builds one, or asks about the class
            return cls(row["title"], int(row["copies"]))

        @staticmethod
        def is_valid_isbn(code):        # static: related, but needs no object at all
            return len(code) == 13 and code.isdigit()

If a "static method" is never about the class at all, it is a module-level function — put it there.

**Methods should leave the object valid.** A method that half-updates state and raises leaves
something nobody can reason about:

    def lend(self):
        self._lent += 1              # changed
        self._notify_member()        # raises — and now the count is wrong

Do the risky part first, or update state only once everything has succeeded.

**Returning \`self\` for chaining** (\`order.add(x).add(y)\`) reads nicely and hides errors when
overused. Use it for builders; avoid it for anything that can fail.

**Asking versus telling.** \`if loan.days_overdue(today) > 0: loan.fine = ...\` reaches in and
decides for the object. \`loan.apply_late_fee(today)\` tells it what to do and lets it decide how.
The second keeps the rule where the data is.`,
    mcqs: [
      mcq('Which function most clearly belongs as a method on `Loan`?',
        [['days_overdue(loan, today)', true],
          ['send_reminder_email(loan)', false],
          ['load_loans_from_csv(path)', false],
          ['match_member_to_book(member, book)', false]],
        'It acts only on the loan\'s own data; the others touch the outside world or several classes.'),
      mcq('A `@staticmethod` that never refers to the class in any way should usually be:',
        [['A plain function in the module', true],
          ['Converted into a class method', false],
          ['Given a self parameter and made an instance method', false],
          ['Left as it is, since it documents the grouping', false]],
        'If nothing about it is about the class, the class is not where a reader will look for it.'),
      mcq('What is wrong with incrementing state before a call that may raise?',
        [['A failure leaves the object with state that is now wrong', true],
          ['The increment is undone automatically on an exception', false],
          ['Python forbids changing state before a call', false],
          ['It makes the method slower than necessary', false]],
        'Update state once everything that can fail has succeeded.'),
      mcq('`loan.apply_late_fee(today)` is preferred to reading `loan.days_overdue` and setting a fine outside because:',
        [['The rule stays with the data it is about', true],
          ['It requires fewer lines in the calling code', false],
          ['Method calls are faster than attribute access', false],
          ['It prevents the object from being modified', false]],
        'Tell the object what you want; let it decide how, and keep the rule in one place.'),
    ],
    checkpoint: [
      mcq('Which is the best test of whether a function belongs on a class?',
        [['It only ever acts on that class\'s own data', true],
          ['It takes an instance of the class as an argument', false],
          ['It is called from more than one place in the program', false],
          ['It is shorter than about ten lines of code', false]],
        'Passing an instance in is what you are replacing; acting only on its data is the real signal.'),
      mcq('Sending an email when a loan is overdue is best placed:',
        [['Outside the class, at the edge of the system', true],
          ['Inside the Loan class, beside the overdue rule', false],
          ['In the Loan constructor, so it cannot be missed', false],
          ['In a static method on the Loan class', false]],
        'A class that reaches the outside world cannot be tested without it.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_ENCAPSULATION',
    notes: `Encapsulation is not "make attributes private". It is: **a caller should not be able to
put the object into a state its own rules forbid.**

    class Account:
        def __init__(self, balance=0):
            self._balance = balance

        def deposit(self, amount):
            if amount <= 0:
                raise ValueError("Deposit must be positive")
            self._balance += amount

        def withdraw(self, amount):
            if amount > self._balance:
                raise ValueError("Insufficient funds")
            self._balance -= amount

        @property
        def balance(self):
            return self._balance

Now \`account.balance\` reads, and nothing writes it except the two methods that understand the
rules.

**Python's convention is a convention.** A leading underscore means "not part of the interface";
it does not stop anybody. That is fine. Encapsulation in Python is about making the right thing
the obvious thing, not about locks:

    account._balance = -500     # possible, and obviously somebody's mistake

**\`@property\` lets you start simple and change your mind.** A plain attribute can become a
computed one later without changing a single caller:

    @property
    def is_overdrawn(self):
        return self._balance < 0

**What to expose:**

| Expose | Keep inside |
|---|---|
| Questions about the object (\`is_available\`) | The fields those answers are computed from |
| Operations that respect the rules (\`lend\`) | Any field that has a rule attached |
| Plain data with no rules (a title) | Caches, counters, internal bookkeeping |

**The leak that hurts most:** returning a mutable internal object.

    @property
    def borrowed(self):
        return self._borrowed          # caller can now append to your list

    @property
    def borrowed(self):
        return tuple(self._borrowed)   # a view they cannot corrupt

**Getters and setters for everything is not encapsulation.** A class with \`get_x\`/\`set_x\` for
every field exposes exactly as much as a public attribute, with more typing. Ask instead: what
should a caller be allowed to *do*?

**The real test:** can a caller, using only public members, put the object into a state its methods
would refuse to create? If yes, it is not encapsulated — whatever the underscores say.`,
    mcqs: [
      mcq('What does a single leading underscore mean in Python?',
        [['A convention saying "not part of the interface"', true],
          ['A keyword that blocks access from outside the class', false],
          ['That the attribute cannot be changed after creation', false],
          ['That the attribute is stored differently in memory', false]],
        'Python makes the right thing obvious rather than impossible.'),
      mcq('Returning `self._borrowed` from a property leaks control because the caller can:',
        [['Modify your internal list directly', true],
          ['Read values they were not meant to see', false],
          ['Make the property slower to access', false],
          ['Replace the property with their own', false]],
        'Return a copy or a tuple when the internal collection has rules attached.'),
      mcq('A class with get_ and set_ methods for every field is:',
        [['As exposed as public attributes, with more typing', true],
          ['Properly encapsulated by definition', false],
          ['Encapsulated only if the fields start with an underscore', false],
          ['Faster, because access goes through methods', false]],
        'Encapsulation is about which operations are allowed, not about how fields are reached.'),
      mcq('What does `@property` let you do later without changing callers?',
        [['Replace a stored value with a computed one', true],
          ['Prevent the attribute from being read', false],
          ['Rename the attribute across the codebase', false],
          ['Make the attribute available on the class itself', false]],
        'Callers keep writing account.balance while the implementation underneath changes.'),
    ],
    checkpoint: [
      mcq('The real test of encapsulation is whether a caller can:',
        [['Reach a state the object\'s own rules forbid', true],
          ['See any attribute that has an underscore', false],
          ['Call a method without reading the documentation', false],
          ['Create the object without using the constructor', false]],
        'If public members allow an impossible state, underscores have not helped.'),
      mcq('`account.balance` should be a read-only property when:',
        [['Deposits and withdrawals enforce rules on it', true],
          ['The value is a number rather than a string of text', false],
          ['The class has more than a handful of attributes on it', false],
          ['The value is needed outside the class it belongs to', false]],
        'Fields with rules attached are exactly the ones that need an interface.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_DEBUGGING',
    notes: `Object-oriented bugs have their own shapes. Most of them are one of these five.

**1. Shared mutable state.**

    class Cart:
        items = []            # every cart shares this list

Symptom: a second user sees the first user's data. Fix: create it in \`__init__\`.

**2. \`self\` confusion.**

    AttributeError: 'Cart' object has no attribute 'total'

Usually a method assigned to a local name (\`total = 0\` instead of \`self.total = 0\`), or state
set in one method that another expects to already exist. Make \`__init__\` create every attribute
the class uses — even as \`None\` — so an attribute either exists or the constructor is wrong.

**3. Two objects that should be one.**

    a = Book("Dune", 3); b = Book("Dune", 3)
    a.lend()
    b.is_available()     # unchanged — different object

Symptom: "I changed it and nothing happened". Check identity with \`is\`, or print \`id(obj)\`.

**4. Equality that was never defined.**

    Book("Dune", 3) in library.books     # False, even though a Dune is there

\`in\` uses \`__eq__\`, which defaults to identity. Either define \`__eq__\` or compare on a field.

**5. A method that changed state and then failed.** The object is left half-updated and every
later error is a consequence, not a cause.

**How to look at an object.** \`print(obj)\` is useless without \`__repr__\`; \`vars(obj)\` is not:

    print(vars(cart))     # {'_items': [...], 'member': Member(...)}

**Reading an OOP traceback:** the last line is the error, the line above it is where it happened,
and the frames above that are the call chain — often \`__init__\` calling a method which calls
another. Start from the bottom and go up until you reach a line you wrote.

**The question that finds most of these quickly:** *which object am I actually looking at, and what
does it hold right now?* \`print(id(obj), vars(obj))\` answers both.`,
    mcqs: [
      mcq('Two carts share their items. The most likely cause is:',
        [['items was defined in the class body, not in __init__', true],
          ['The two carts were created in the same function', false],
          ['The items list was never given a type annotation', false],
          ['Python reuses objects that hold equal values', false]],
        'Class-body mutable attributes are created once and shared by every instance.'),
      mcq('`Book("Dune", 3) in books` is False although a matching book is there. Why?',
        [['`in` uses __eq__, which defaults to identity', true],
          ['`in` only works on lists of strings and numbers', false],
          ['The list must be sorted before `in` will work', false],
          ['The book was added before __eq__ was defined', false]],
        'Define __eq__ or compare on a field such as the title.'),
      mcq('What does `vars(obj)` show you?',
        [['The instance\'s attributes and their current values', true],
          ['Every method the class defines', false],
          ['The class the object was created from', false],
          ['The memory address the object occupies', false]],
        'It is the fastest way to see what an object actually holds mid-bug.'),
      mcq('"I changed it and nothing happened" most often means:',
        [['You are holding a different object from the one you changed', true],
          ['The attribute is read-only on that class', false],
          ['Python cached the old value of the attribute', false],
          ['The change needs the object to be saved first', false]],
        'Check identity with `is` or print id(obj) on both sides.'),
    ],
    checkpoint: [
      mcq('Why should `__init__` create every attribute the class uses, even as None?',
        [['So a missing one means the constructor is at fault', true],
          ['So the attributes are stored in a fixed, predictable order', false],
          ['So the class uses less memory for each instance created', false],
          ['So subclasses are prevented from adding their own fields', false]],
        'It turns "sometimes missing" into a single place to look.'),
      mcq('A method raised half-way through changing state. The immediate risk is:',
        [['The object is left in a state its rules forbid', true],
          ['The exception is swallowed by the class', false],
          ['Other instances of the class are affected', false],
          ['The constructor will run a second time', false]],
        'Every later error is then a symptom of the first one, which is why order matters.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_PRACTICE',
    notes: `No new ideas. Model things until deciding what is an object, what is state and what is a
method stops being a decision you think about.

**Build each of these as a class, with validation in the constructor:**

1. **Temperature** — stores celsius, exposes fahrenheit as a property, refuses anything below
   −273.15.
2. **Playlist** — add, remove, shuffle, total duration. Two playlists must not share songs.
3. **BankAccount** — deposit, withdraw, transfer to another account, never negative, with a
   transaction history that a caller cannot edit.
4. **Rectangle** — width and height, area and perimeter as properties, refuses non-positive sides.
5. **StudentRecord** — marks per subject, average, highest, and a pass rule; marks stay in range.
6. **Timer** — start, stop, elapsed. Stopping a timer that never started must not silently return 0.

**For every class, check:**

| Check | It should |
|---|---|
| Two instances | Have completely separate state |
| Invalid construction | Raise, not store nonsense |
| An invalid operation | Raise with a message that says what was wrong |
| A mutable field returned | Not let the caller change the object from outside |
| \`print(obj)\` | Say what the object holds |
| Every attribute | Exist after \`__init__\` |

**Then do the harder exercise: write it badly on purpose.** Take Playlist, make \`songs\` a class
attribute, and watch two playlists merge. Seeing the bug you have been warned about is worth more
than the warning.

**Watch for the two slips practice exposes:** validation written in the method rather than the
constructor, and returning the internal list instead of a copy.`,
    mcqs: [
      mcq('A Temperature class should refuse values below −273.15 by:',
        [['Raising in the constructor', true],
          ['Clamping the value to the minimum', false],
          ['Storing it and warning on read', false],
          ['Returning None from the constructor', false]],
        'Silently changing somebody\'s value hides their bug inside yours.'),
      mcq('Two playlists accidentally share songs. The fix is to:',
        [['Create the list inside __init__', true],
          ['Copy the list every time it is read', false],
          ['Give each playlist a unique name', false],
          ['Use a tuple instead of a list', false]],
        'The shared list came from the class body; per-instance state belongs in __init__.'),
      mcq('A BankAccount exposes its transaction history. To stop callers editing it, return:',
        [['A tuple or a copy of the list', true],
          ['The list, with a warning in the docstring', false],
          ['The length of the list only', false],
          ['A string of the transactions joined together', false]],
        'Handing out the internal list hands out the ability to rewrite history.'),
      mcq('Stopping a Timer that was never started should:',
        [['Raise, because the call makes no sense', true],
          ['Return zero, which is the elapsed time', false],
          ['Start the timer and then stop it', false],
          ['Return None and log a warning', false]],
        'Returning 0 makes a bug look like a measurement.'),
      mcq('Why write a class badly on purpose during practice?',
        [['Seeing the bug teaches more than being warned about it', true],
          ['It is faster than writing it correctly first', false],
          ['Bad code runs the same as good code', false],
          ['It shows which Python versions differ', false]],
        'Shared-state bugs are unforgettable once you have watched one happen.'),
    ],
    checkpoint: [
      mcq('Validation of a constructor argument belongs:',
        [['In the constructor, before storing it', true],
          ['In each method that reads the value later on', false],
          ['In the code that creates the object itself', false],
          ['In a test, rather than inside the class', false]],
        'One check at the boundary means every method can trust the state.'),
      mcq('A class should expose a property rather than an attribute when:',
        [['The value is computed, or changing it has rules', true],
          ['The value is used outside the class', false],
          ['The class has more than five attributes', false],
          ['The value is a number rather than text', false]],
        'Plain data with no rules is fine as a plain attribute.'),
    ],
  },

  {
    unitCode: 'T2_OOP_OBJECTS_MINI_PROJECT',
    notes: `One small system, modelled as objects, where the rules live with the data.

**Why a system with rules.** A class with no rules is a dictionary with extra steps. The point of
this project is the constraints: a seat that cannot be booked twice, a balance that cannot go
negative, a loan that cannot be returned before it was taken. Objects earn their place when they
refuse to be wrong.

**What "modelled properly" means here:**

- Each class owns its own state, and nothing outside can break it
- Every rule is enforced in one place
- Invalid input raises, with a message saying what was wrong
- Two instances never share anything by accident
- \`print(obj)\` tells you what it holds

**Build it in this order:**

1. **Write the nouns down.** From the brief: the things, and what each one knows.
2. **Write the rules down** as sentences: "a seat cannot be booked twice".
3. **Constructors with validation**, and nothing else.
4. **One method per rule**, each refusing what it must.
5. **Then the script that uses it** — which should read like the brief.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A System Modelled as Objects',
      description: 'Model a small system with real rules as classes: state that cannot be corrupted, rules enforced in one place, and invalid operations refused. Assessed on the rules, not on the number of classes.',
      instructions: `**The brief**

Build ONE of these, or something of comparable scope:

- **Cinema booking** — screenings, seats, bookings. A seat cannot be booked twice; a booking
  cannot be cancelled after the screening starts.
- **Library** — books, members, loans. A member may hold at most three books; a copy cannot be
  lent twice; a loan cannot be returned twice.
- **Hostel mess** — students, meal plans, daily attendance. A student cannot be marked twice for
  the same meal; billing counts only meals taken.

**Requirements**

1. **At least three classes**, each with its own state.
2. **Validation in every constructor.** No object may be created in an invalid state.
3. **At least four rules** enforced by methods, each raising a clear error when broken.
4. **No shared mutable state.** Two instances must be provably independent.
5. **Encapsulation.** Any field with a rule attached is reached through methods or a property, and
   internal collections are not handed out unprotected.
6. **\`__repr__\` on every class.**
7. **A short script** that uses the system and prints what happens, including the refusals.

**What to submit**

1. Your source files.
2. A **rules table**: each rule, the method that enforces it, and the error it raises.

   | Rule | Enforced by | Error |
   |---|---|---|

3. A **test script** that attempts every rule violation and shows it being refused, with the
   output.
4. A **short write-up** (250–350 words): which nouns became classes and which stayed plain data;
   one rule that was harder to place than expected; one thing you would model differently now.

**Constraints**

- No framework, no database — plain Python.
- No rule enforced only in the script that uses the classes.
- No class that holds no state and has one method.

**Where the marks are.** The refusals. A small system where every invalid operation is impossible
scores far above a larger one where the rules live in the calling code.`,
      rubric: [
        {
          criterion: 'Modelling',
          description: 'Sensible classes with clear responsibilities; things that should be plain data are not classes; relationships between objects are explicit.',
          maxPoints: 25,
        },
        {
          criterion: 'Rules and validation',
          description: 'At least four rules, each enforced in one place inside the class, with clear errors; constructors reject invalid state.',
          maxPoints: 30,
        },
        {
          criterion: 'Encapsulation',
          description: 'Fields with rules are not directly writable; internal collections are not exposed; no shared mutable state between instances.',
          maxPoints: 20,
        },
        {
          criterion: 'Evidence',
          description: 'Rules table complete; test script attempts every violation and shows the refusal with real output.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Explains what became a class and why, a rule that was hard to place, and a modelling decision they would change.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },

  /* ── T2_OOP_PRINCIPLES ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_OOP_PRINCIPLES_INHERITANCE',
    notes: `Inheritance says **"is a kind of"**. A \`SavingsAccount\` is a kind of \`Account\`, so it
starts with everything an account has and changes what differs.

    class Account:
        def __init__(self, balance=0):
            self._balance = balance

        def withdraw(self, amount):
            if amount > self._balance:
                raise ValueError("Insufficient funds")
            self._balance -= amount

    class SavingsAccount(Account):
        def __init__(self, balance=0, rate=0.04):
            super().__init__(balance)      # let the parent set itself up
            self.rate = rate

        def add_interest(self):
            self._balance += self._balance * self.rate

\`super().__init__(...)\` is not optional politeness: skip it and the parent's attributes never
exist.

**Overriding** replaces a parent's method:

    class FixedDeposit(Account):
        def withdraw(self, amount):
            raise ValueError("A fixed deposit cannot be withdrawn from before maturity")

**And here is the trap.** Code that works with \`Account\` now breaks when handed a
\`FixedDeposit\`, because the subclass broke a promise the parent made. The rule — **a subclass
must be usable anywhere its parent is** — is the one that decides whether inheritance is the right
tool at all. A penguin is a bird; if \`Bird.fly()\` exists, \`Penguin\` cannot honestly be a
\`Bird\`.

**When inheritance is the wrong tool:**

| Situation | Better |
|---|---|
| "Has a", not "is a" — a car has an engine | Composition: hold the object |
| You only want to reuse one method | A function, or composition |
| The subclass must remove behaviour | Rethink the hierarchy |
| Four levels deep and nobody can find the code | Flatten it |

**Deep hierarchies are where OOP gets its bad name.** Reading a method three classes up to find
what a call does is a real cost. Keep inheritance one or two levels deep, and reach for
composition when you catch yourself adding a third.`,
    mcqs: [
      mcq('What does `super().__init__(balance)` do in a subclass constructor?',
        [['Runs the parent\'s constructor so its attributes exist', true],
          ['Creates a second instance of the parent class', false],
          ['Copies the parent\'s methods onto the subclass', false],
          ['Marks the subclass as complete for Python', false]],
        'Skip it and the parent\'s state is never set up, which surfaces later as a missing attribute.'),
      mcq('A subclass that raises on a method the parent supports breaks:',
        [['The promise that it can be used wherever the parent is', true],
          ['Python\'s rule that methods cannot be overridden', false],
          ['The constructor chain back to the base class', false],
          ['Encapsulation of the parent\'s private fields', false]],
        'Code written against the parent will fail the first time it meets that subclass.'),
      mcq('"A car has an engine" suggests:',
        [['Composition — the car holds an engine object', true],
          ['Inheritance — Car should extend Engine', false],
          ['Inheritance — Engine should extend Car', false],
          ['A static method shared between them', false]],
        '"Is a" is inheritance; "has a" is composition, and mixing them up produces strange hierarchies.'),
      mcq('Why keep inheritance one or two levels deep?',
        [['Deep chains make it hard to find what a call actually does', true],
          ['Python cannot resolve more than two levels', false],
          ['Deeper hierarchies use more memory per object', false],
          ['Subclasses cannot override a grandparent method', false]],
        'Every extra level is another file to open before you know what runs.'),
    ],
    checkpoint: [
      mcq('The test for whether inheritance is the right tool is:',
        [['A subclass can be used anywhere the parent can', true],
          ['The subclass reuses at least one parent method', false],
          ['Both classes share several attribute names', false],
          ['The parent class has no other subclasses', false]],
        'If a subclass must remove or refuse behaviour, the hierarchy is wrong.'),
      mcq('You want one method from another class and nothing else. The better option is:',
        [['Composition, or a plain function', true],
          ['Inheriting from that class', false],
          ['Copying the method into your class', false],
          ['Making the method static and calling it', false]],
        'Inheriting for one method drags a whole interface along with it.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_POLYMORPHISM',
    notes: `Polymorphism means calling the same method on different types and getting the behaviour
each one needs — **without the caller knowing which it has**.

    class Card:
        def pay(self, amount): ...

    class UPI:
        def pay(self, amount): ...

    class Cash:
        def pay(self, amount): ...

    def checkout(order, method):
        method.pay(order.total)      # does not care which it got

**What it replaces**, and this is the whole point:

    # Before
    if method == "card":
        charge_card(total)
    elif method == "upi":
        charge_upi(total)
    elif method == "cash":
        take_cash(total)
    # ... and this block appears in four other files

Adding a wallet means finding every one of those blocks. With polymorphism you add a class, and
the existing code is untouched.

**Python does not need a shared parent.** If it has \`pay\`, it can be passed — duck typing: "if it
walks like a duck". A common base class or protocol is useful for documenting the expectation, not
for making the call work.

**Where it shows up constantly:**

- \`len(x)\` works on strings, lists, dicts — each defines \`__len__\`
- \`for x in thing\` works on anything with \`__iter__\`
- \`print(obj)\` uses whatever \`__str__\` the object has

**The rule that keeps it honest:** every implementation must **mean** the same thing. If
\`Cash.pay()\` returns immediately and \`Card.pay()\` may raise, a caller that cannot handle the
raise is broken by the difference. Same name, same promise — including what it raises and what it
returns.

**When a chain of ifs is fine.** Two cases that will never grow do not need three classes. The
signal to convert is the same \`if\` on type appearing in more than one place, or growing a new
branch every month.`,
    mcqs: [
      mcq('Polymorphism most directly replaces:',
        [['A chain of ifs on a type, repeated across files', true],
          ['A loop that iterates over a list of objects', false],
          ['A constructor that takes several argument shapes', false],
          ['A function that returns different types', false]],
        'Adding a case becomes adding a class, instead of finding every branch.'),
      mcq('In Python, passing an object to `checkout(order, method)` requires it to:',
        [['Have a pay method — no shared parent is needed', true],
          ['Inherit from a common base class', false],
          ['Implement a formal interface declaration', false],
          ['Be registered with the checkout function', false]],
        'Duck typing: the method existing is what matters at the call.'),
      mcq('Why must every implementation of `pay` mean the same thing?',
        [['A caller cannot handle differences it does not know about', true],
          ['Python checks that overrides match the parent exactly', false],
          ['Otherwise the method names have to differ', false],
          ['Because the return type must be identical', false]],
        'Same name, same promise — including what it raises.'),
      mcq('`len(x)` working on strings, lists and dicts is an example of:',
        [['Polymorphism through a shared method name', true],
          ['Inheritance from a common base type', false],
          ['Overloading by argument type', false],
          ['A built-in special case in Python', false]],
        'Each type defines __len__; len() just calls it.'),
    ],
    checkpoint: [
      mcq('The strongest signal to replace ifs with polymorphism is:',
        [['The same type check appearing in several places', true],
          ['The chain having more than two branches', false],
          ['The function being longer than twenty lines', false],
          ['The types being defined in different files', false]],
        'One switch in one place is fine; the same switch repeated is the maintenance problem.'),
      mcq('Adding a new payment method to a polymorphic checkout requires:',
        [['A new class with the same method', true],
          ['A new branch in the checkout function', false],
          ['Changing the base class definition', false],
          ['Updating every existing payment class', false]],
        'Existing code stays untouched, which is the benefit being bought.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_ABSTRACTION',
    notes: `Abstraction is deciding **what a thing does** and refusing to say **how**. The caller
depends on the promise; the implementation can change underneath.

    from abc import ABC, abstractmethod

    class Storage(ABC):
        @abstractmethod
        def save(self, key, data): ...

        @abstractmethod
        def load(self, key): ...

    class FileStorage(Storage):
        def save(self, key, data): ...
        def load(self, key): ...

    class S3Storage(Storage):
        def save(self, key, data): ...
        def load(self, key): ...

Code that takes a \`Storage\` works with either. A test can pass a fake one that keeps everything in
a dictionary — which is how you test code that would otherwise need a real server.

**\`ABC\` and \`@abstractmethod\` do one useful thing:** they refuse to let an incomplete subclass be
created.

    class BrokenStorage(Storage):
        def save(self, key, data): ...

    BrokenStorage()   # TypeError: Can't instantiate ... abstract method load

Without it, the missing method is discovered in production, by a caller.

**Abstraction is not "add a layer".** A wrapper that passes every call straight through to one
implementation, and will only ever have one, is cost with no benefit. The question is whether the
*caller* genuinely does not want to know — not whether a second implementation might exist some
day.

**Where it pays, at this level:**

- Storage: files today, cloud later, a dictionary in tests
- Notification: email, SMS, a printed line while developing
- Payment: a real gateway, a sandbox, a fake that always succeeds

**A good abstraction hides its implementation completely.** If \`Storage.save\` raises
\`FileNotFoundError\`, every caller now knows there are files underneath, and swapping to S3 breaks
them. Leaking a detail through an error is the most common way an abstraction fails.

**Name it for what it does.** \`Storage\`, \`Notifier\`, \`PaymentGateway\` — not \`FileHelper\` or
\`DataManager\`, which describe how rather than what, or nothing at all.`,
    mcqs: [
      mcq('What do `ABC` and `@abstractmethod` give you?',
        [['A subclass missing a method cannot be instantiated', true],
          ['Automatic implementations of the missing methods', false],
          ['Faster method dispatch at runtime', false],
          ['A guarantee that subclasses return the same types', false]],
        'The mistake is caught at creation instead of by a caller in production.'),
      mcq('The strongest reason to put an interface in front of storage is:',
        [['Tests can supply a fake without touching a real server', true],
          ['Interfaces make the code run faster', false],
          ['It reduces the number of classes overall', false],
          ['Python requires one for file operations', false]],
        'Testability is the benefit you get today, not the hypothetical second implementation.'),
      mcq('`Storage.save` raising `FileNotFoundError` is a problem because:',
        [['It leaks that there are files underneath', true],
          ['Callers cannot catch that exception type', false],
          ['Abstract methods may not raise at all', false],
          ['It makes the method slower to call', false]],
        'Callers start handling a file error, and the cloud implementation breaks them.'),
      mcq('A wrapper that forwards every call to one implementation and always will is:',
        [['A layer with cost and no benefit', true],
          ['Good practice, since it allows future change', false],
          ['Required before writing unit tests', false],
          ['An example of encapsulation', false]],
        'Abstraction is for callers who genuinely should not know, not for hypothetical futures.'),
    ],
    checkpoint: [
      mcq('A good abstraction is named after:',
        [['What it does — Storage, Notifier, Gateway', true],
          ['How it works inside — FileHelper, SqlManager', false],
          ['The team that owns and maintains the code', false],
          ['The design pattern it happens to implement', false]],
        'The name is part of the promise; naming the mechanism ties callers to it.'),
      mcq('Testing code that sends email is easiest when the code depends on:',
        [['A Notifier interface it was handed', true],
          ['An email library imported directly', false],
          ['A global configuration flag', false],
          ['A try/except around the send call', false]],
        'Hand in the dependency and a test can pass a fake that records instead of sending.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_COMPOSITION',
    notes: `Composition is building an object from other objects instead of inheriting from them.
It is the default choice, and inheritance is the exception.

    # Inheritance — Car IS an Engine? No.
    class Car(Engine): ...

    # Composition — Car HAS an Engine
    class Car:
        def __init__(self, engine, gearbox):
            self.engine = engine
            self.gearbox = gearbox

        def start(self):
            self.engine.start()

**Why it is usually better:**

| | Inheritance | Composition |
|---|---|---|
| Relationship | is a | has a |
| Decided | At class definition | At runtime, per object |
| You get | Everything the parent has | Only what you hold |
| Changing it | Affects every subclass | Affects one object |
| Testing | Needs the real parent | Pass a fake part in |

**The runtime difference matters.** An \`ElectricCar\` cannot become petrol; a \`Car\` handed a
different engine can. Where behaviour varies, holding the varying part is more flexible than
subclassing for each combination — and combinations are where hierarchies explode: petrol/electric
× manual/automatic × two/four wheel drive is eight subclasses, or three small parts.

**Delegation is composition's everyday form:**

    class Order:
        def __init__(self):
            self._items = []            # a list does the work

        def add(self, item):
            self._items.append(item)

        def __len__(self):
            return len(self._items)

\`Order\` is not a list — you would not want \`order.sort()\` — but it uses one.

**When inheritance still wins:**

- A genuine "is a" with a stable interface (\`ValueError\` extends \`Exception\`)
- Frameworks that require it (\`class MyModel(Model)\`)
- Sharing a real default implementation across close relatives

**The practical rule:** start with composition. Reach for inheritance when the subclass truly is
the parent, everywhere the parent is used, with nothing removed.`,
    mcqs: [
      mcq('Composition is preferred to inheritance mainly because:',
        [['You take only the part you need, and can swap it', true],
          ['It uses less memory per object', false],
          ['Python discourages subclassing in general', false],
          ['It removes the need for interfaces', false]],
        'Inheritance takes the parent\'s whole interface along with the bit you wanted.'),
      mcq('Three varying features, two options each, modelled by subclassing gives you:',
        [['Eight subclasses for the combinations', true],
          ['Three subclasses, one per feature', false],
          ['One subclass with three flags', false],
          ['Two subclasses and a factory', false]],
        'Combinatorial explosion is the classic signal to hold parts instead.'),
      mcq('`Order` holding a list rather than extending one avoids:',
        [['Exposing list methods that make no sense on an order', true],
          ['Having to write an __init__ method', false],
          ['The need to store the items at all', false],
          ['Using composition and delegation together', false]],
        'Extending list would give an Order a sort() and a pop() nobody should call.'),
      mcq('Which is a genuine case for inheritance?',
        [['A custom exception extending Exception', true],
          ['A Car that needs an Engine\'s start method', false],
          ['A Report that needs a PDF writer', false],
          ['A Cart that needs to hold items', false]],
        'A stable "is a" with an interface you honour completely.'),
    ],
    checkpoint: [
      mcq('"Has a" in a description usually points to:',
        [['Composition', true], ['Inheritance', false], ['A static method', false], ['An abstract base class', false]],
        '"Is a" is the inheritance signal; "has a" is composition.'),
      mcq('The advantage of composition when testing is that you can:',
        [['Pass in a fake part instead of the real one', true],
          ['Skip the constructor entirely', false],
          ['Avoid writing tests for the parts', false],
          ['Test the class without importing it', false]],
        'What an object holds can be replaced; what it inherits cannot.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_MODELLING',
    notes: `Modelling is the part nobody teaches and everybody is assessed on: going from a written
description to the classes that represent it.

**A method that works.**

1. **Underline the nouns.** They are candidate classes: *a member borrows a book for fourteen days*
   → Member, Book, Loan.
2. **Underline the verbs.** They are candidate methods: *borrows*, *returns*, *reserves*.
3. **List the rules as sentences.** "A member may hold at most three books." Each will live in
   exactly one class.
4. **Ask of each noun: does it have state and rules?** If not, it is data — a date range, an
   address, a title — and can stay a plain value.
5. **Place each rule on the class that owns the data it is about.** "At most three books" is about
   a member's loans, so it belongs on Member.

**The relationship in the middle.** *A member borrows a book* looks like two classes, but the
borrowing itself has state — when, for how long, returned or not. A relationship with its own
facts is a class: \`Loan\`. Missing these is the most common modelling mistake, and it shows up as
attributes with awkward names like \`book.borrowed_by_member_since\`.

**Where a rule goes when two classes are involved.** "A book cannot be lent twice" involves Book
and Loan. Put it where the data lives: the book knows whether it is out, so Book refuses. If both
genuinely own part of it, a third object — \`Library\` — coordinates them.

**Signals you modelled it wrong:**

| Signal | Usually means |
|---|---|
| A class that only holds other objects and has no rules | It is a container, not a class |
| Reaching two dots deep (\`order.customer.address.city\`) | A missing method, or a missing class |
| The same rule checked in two classes | It belongs to one of them |
| A "Manager" or "Helper" class doing everything | The logic belongs on the things it manages |

**Stop when the script reads like the brief.** \`member.borrow(book, days=14)\` beside "a member
borrows a book for fourteen days" is the sign the model matches the problem.`,
    mcqs: [
      mcq('"A member borrows a book for fourteen days" most likely needs:',
        [['A Loan class, because the borrowing has its own facts', true],
          ['Only Member and Book, with a date on the book', false],
          ['A Borrowing function outside any class', false],
          ['A subclass of Book called BorrowedBook', false]],
        'A relationship with state of its own — when, how long, returned — is a class.'),
      mcq('Where does "a member may hold at most three books" belong?',
        [['On Member, which owns the loans it is about', true],
          ['On Book, which knows whether it is lent', false],
          ['In the script that calls borrow()', false],
          ['On a LibraryRules helper class', false]],
        'Rules live with the data they constrain.'),
      mcq('`order.customer.address.city` in business logic suggests:',
        [['A missing method on Order, or a missing class', true],
          ['That Order should inherit from Customer', false],
          ['That the attributes should be made private', false],
          ['That Customer should hold the order instead', false]],
        'Reaching through several objects means the caller is doing work that belongs elsewhere.'),
      mcq('A noun with no state and no rules should usually be:',
        [['Plain data rather than a class', true],
          ['A class with only getters', false],
          ['A subclass of a nearby class', false],
          ['An abstract base class', false]],
        'Classes earn their place by protecting state.'),
    ],
    checkpoint: [
      mcq('A "LibraryManager" class that holds all the rules while Book and Member hold only data means:',
        [['The logic belongs on the classes it manages', true],
          ['The design is correctly layered', false],
          ['Book and Member should be merged', false],
          ['The manager needs to be split by rule type', false]],
        'Data with the rules elsewhere is the procedural design objects were meant to replace.'),
      mcq('You know the model fits when:',
        [['The script that uses it reads like the brief', true],
          ['Every noun in the brief became a class', false],
          ['No class has more than five methods', false],
          ['Inheritance is used at least once', false]],
        'Matching the language of the problem is the point of modelling it.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_DEBUGGING',
    notes: `Bugs in inheritance and polymorphism are rarely where you are looking. Four shapes cover
most of them.

**1. The parent's constructor never ran.**

    AttributeError: 'SavingsAccount' object has no attribute '_balance'

\`super().__init__()\` was forgotten. The error names the attribute, not the missing call, which is
why this one wastes time.

**2. The method that ran was not the one you read.** With a hierarchy, the version that runs is the
lowest override. Find out which:

    type(obj)                       # which class this actually is
    type(obj).__mro__               # the order Python searches
    SavingsAccount.withdraw         # the function it resolves to

**3. A subclass that broke the promise.** Code that worked for every other type fails for one —
because that one raises where the others return, or returns a different shape. The traceback points
at the caller, which is innocent.

**4. Mutable state shared through a parent.** A list created in the parent's class body is shared by
every instance of every subclass.

**Reading an inheritance traceback:** the frames show which class each method was found on. If a
frame names a class you did not expect, that is your answer — often a method you thought you were
overriding, spelled slightly differently:

    class Account:
        def withdraw(self, amount): ...
    class Savings(Account):
        def withdrawl(self, amount): ...     # never called; the parent's runs

Python cannot warn you: a subclass is allowed to add methods. A test that calls the subclass's
behaviour catches it immediately.

**When polymorphism misbehaves**, print the type at the call site:

    print(type(method).__name__, method.pay)

Nine times in ten it is a different class from the one you assumed, and the behaviour follows.`,
    mcqs: [
      mcq('`AttributeError: object has no attribute \'_balance\'` in a subclass usually means:',
        [['super().__init__() was not called', true],
          ['The attribute was made private by the parent', false],
          ['The subclass overrode the attribute name', false],
          ['The parent class failed to import', false]],
        'The error names the attribute; the cause is the constructor that never ran.'),
      mcq('How do you find which class a method call actually resolves to?',
        [['Inspect type(obj) and its __mro__', true],
          ['Read the parent class definition', false],
          ['Check the order of the imports', false],
          ['Call the method with a debugger attached only', false]],
        'The method resolution order is exactly the search Python performs.'),
      mcq('A subclass defines `withdrawl` instead of `withdraw`. What happens?',
        [['The parent\'s method runs, silently', true],
          ['Python raises a NameError at definition', false],
          ['The subclass cannot be instantiated', false],
          ['Both methods run in sequence', false]],
        'Adding a method is legal, so nothing warns you. A test on the subclass catches it.'),
      mcq('Code works for every payment type except one. The likely cause is:',
        [['That type breaks a promise the others keep', true],
          ['The caller checks types in the wrong order', false],
          ['That class was imported from the wrong module', false],
          ['Polymorphism requires a shared base class', false]],
        'Same method name, different meaning — the difference surfaces in the innocent caller.'),
    ],
    checkpoint: [
      mcq('The fastest first check when a polymorphic call misbehaves is:',
        [['Print the type of the object being called', true],
          ['Re-read the abstract base class definition', false],
          ['Add a try/except around the failing call', false],
          ['Convert the call back into an if chain', false]],
        'It is usually a different class from the one you assumed.'),
      mcq('Which catches a misspelled override before a user does?',
        [['A test that exercises the subclass\'s behaviour', true],
          ['A type annotation on the method', false],
          ['Making the parent method abstract only', false],
          ['Running the linter over the parent class', false]],
        'Python allows a subclass to add methods, so only a test knows what you meant.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_PRACTICE',
    notes: `No new ideas. Practise the judgement: inherit, compose, or neither.

**Decide and implement each of these:**

1. **Shapes** — Circle, Rectangle, Triangle, each with \`area()\`. Write the function that totals a
   mixed list without a single type check.
2. **Notifications** — Email, SMS and a Console one for development, behind one interface. A
   function that sends without knowing which.
3. **Employees** — Permanent and Contract pay differently. Inheritance or composition? Justify it,
   then build it.
4. **Vehicles** — petrol/electric × manual/automatic. Build it with subclasses, feel the explosion,
   then rebuild with composition.
5. **Documents** — PDF and Word export. Add a third format afterwards and count what you changed.
6. **A broken hierarchy** — take \`Bird.fly()\` with a \`Penguin\` subclass. Fix the model.

**For each, write one line:** what relationship you chose, and why.

| Exercise | Inheritance / composition / neither | Why |
|---|---|---|

**The checks that find a bad design:**

- Adding a new type: how many existing files change? (Should be none.)
- Can you test each part without the others?
- Does any subclass refuse something its parent promises?
- Can you explain the hierarchy in one sentence without "and also"?

**Watch for the slip practice exposes most:** inheriting to reuse one convenient method, and
discovering later that the whole parent interface came with it.`,
    mcqs: [
      mcq('Totalling the area of a mixed list of shapes should need:',
        [['No type checks at all', true],
          ['One isinstance check per shape type', false],
          ['A dictionary mapping type names to functions', false],
          ['Each shape converted to a common class first', false]],
        'Each shape defines area(); the loop calls it. That is the exercise.'),
      mcq('Petrol/electric and manual/automatic modelled by subclassing produces:',
        [['A class per combination, which multiplies quickly', true],
          ['Two classes, one per axis of variation', false],
          ['One class with two boolean flags', false],
          ['An abstract class with two abstract methods', false]],
        'Holding the varying parts instead keeps it to three small pieces.'),
      mcq('After adding a third document format, a good design required you to change:',
        [['Nothing but the new class', true],
          ['The exporter and every existing format', false],
          ['The interface and the caller', false],
          ['The caller only', false]],
        'That is the measurable benefit of polymorphism — count the changed files.'),
      mcq('`Penguin` inheriting from a `Bird` with `fly()` is fixed by:',
        [['Moving fly() off Bird, onto the birds that fly', true],
          ['Overriding fly() to raise in Penguin', false],
          ['Adding a can_fly flag to Bird', false],
          ['Making Penguin hold a Bird instead', false]],
        'The parent promised something not all its children can do; the promise was wrong.'),
      mcq('Inheriting from a class to reuse one method usually leads to:',
        [['Carrying an entire interface you did not want', true],
          ['Faster execution of that method', false],
          ['A compile-time error in Python', false],
          ['Duplication of the method body', false]],
        'Composition or a plain function takes the method without the baggage.'),
    ],
    checkpoint: [
      mcq('The best measure of whether a design absorbed a new type well is:',
        [['How many existing files had to change', true],
          ['How many classes the design has in total', false],
          ['Whether the new class is the shortest one', false],
          ['How deep the inheritance hierarchy went', false]],
        'Ideally: none. Existing code that must change is the cost being measured.'),
      mcq('A subclass that must refuse a parent\'s method tells you:',
        [['The hierarchy is wrong and should be reshaped', true],
          ['The parent method needs a default implementation', false],
          ['The subclass should be made abstract', false],
          ['The refusal should be documented and kept', false]],
        'Every caller of the parent is a caller that this subclass will break.'),
    ],
  },

  {
    unitCode: 'T2_OOP_PRINCIPLES_MINI_PROJECT',
    notes: `One design where the relationships are the work: what extends what, what holds what, and
what is deliberately neither.

**Why a design project.** Writing a class is a skill you already have. Choosing between inheritance
and composition, placing a rule on the right class, and keeping a hierarchy shallow are the
decisions second-year work is actually judged on — and the ones that decide whether the code can
absorb a change next month.

**The measurable outcome:** adding a new type at the end should require **a new class and nothing
else**. If you have to edit the existing classes or the caller, the design did not do its job, and
saying so honestly is worth more than hiding it.

**Build it in this order:**

1. **Write the relationships down** before any code: "X is a Y", "A has a B", with a reason each.
2. **Build the smallest version** that works with two types.
3. **Add the third type** — and count every file you changed.
4. **Fix what that exposed**, then add a fourth.
5. **Write the test** that proves a caller works with all of them, with no type checks.

The brief, requirements and deliverables are in the assignment attached to this unit.`,
    assignment: {
      title: 'Mini Project — A Design That Absorbs Change',
      description: 'Design a small system where several types share an interface: inheritance where it is honest, composition where it is not, and a new type added at the end without touching existing code.',
      instructions: `**The brief**

Build ONE of these, or something of comparable scope:

- **Report exporter** — one report, exported as text, CSV and HTML, with a fourth format added at
  the end.
- **Fee calculator** — a college fee made of components (tuition, hostel, transport, late fine)
  with different rules, and a new component added at the end.
- **Media library** — songs, podcasts and audiobooks with different play behaviour and metadata,
  and a fourth kind added at the end.

**Requirements**

1. **At least three types** sharing one interface, used through it.
2. **No type checks in the caller.** No \`isinstance\`, no checking a \`kind\` field.
3. **Composition used at least once**, where "has a" is the honest relationship.
4. **Inheritance used at most two levels deep**, and only where the subclass can stand in for its
   parent everywhere.
5. **An abstract base or documented protocol** that says what the interface promises, including
   what may be raised.
6. **A fourth type added last**, with the files you changed recorded honestly.
7. **Tests** that exercise a caller against every type through the interface.

**What to submit**

1. Your source files and tests.
2. A **relationships table**, written before the code:

   | Pair | is a / has a / neither | Why |
   |---|---|---|

3. A **change record** for the fourth type: every file you touched, and why each was necessary.
4. A **short write-up** (250–350 words): one place you first chose inheritance and changed your
   mind; what the interface promises beyond its method names; what would break if a type broke
   that promise.

**Constraints**

- No framework; plain Python.
- No \`isinstance\` outside a test.
- No hierarchy deeper than two levels.

**Where the marks are.** The change record. A design that absorbed the fourth type in one new file,
with an honest record, scores above one that claims a perfect design without evidence.`,
      rubric: [
        {
          criterion: 'Relationships',
          description: 'Inheritance only where a subclass can stand in for its parent; composition where "has a" is honest; the table gives a real reason for each.',
          maxPoints: 25,
        },
        {
          criterion: 'Interface and polymorphism',
          description: 'One interface used by the caller with no type checks; the promise, including errors, is documented; every type honours it.',
          maxPoints: 25,
        },
        {
          criterion: 'Absorbing change',
          description: 'The fourth type needed a new class and little or nothing else; the change record is honest and specific.',
          maxPoints: 25,
        },
        {
          criterion: 'Tests',
          description: 'A caller tested against every type through the interface, including at least one failure path.',
          maxPoints: 15,
        },
        {
          criterion: 'Write-up',
          description: 'Explains a design decision that changed, what the interface promises beyond names, and the cost of breaking it.',
          maxPoints: 10,
        },
      ],
      totalPoints: 100,
    },
  },
];
