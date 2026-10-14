/**
 * Career-track content: object-oriented Java (JT_JAVA_OOP) and exceptions and files
 * (JT_JAVA_EXCEPTIONS), for Java Full Stack + AI and Java Backend Engineer.
 *
 * The questions are about specific Java code and what the compiler or the JVM does with it, because
 * that is how OOP is examined in a Java interview: a short class hierarchy and "what does this
 * print?" or "does this compile?". The years teach OOP with Python examples; nothing here repeats
 * them, and every snippet is Java.
 *
 * Both topics are single-skill (JAVA_OOP, JAVA_EXCEPTIONS), so no question names a skillKey.
 * The two auto-graded exercises compile on Java 15 (the runner): no records or sealed classes.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/* ══ JT_JAVA_OOP — Object-Oriented Java ══════════════════════════════════════════════════ */

const OOP_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_JAVA_OOP_CLASSES_OBJECTS',
    notes: `A **class** is a description of a kind of thing: what it knows (its **fields**) and what
it can do (its **methods**). An **object** is one concrete instance made from that description with
\`new\`. One class, many objects, each holding its own copy of the fields.

## A first class

    public class Counter {
        int count;                  // a field: every Counter gets its own

        void increment() {          // a method: works on THIS counter's field
            count++;
        }
    }

    Counter a = new Counter();
    Counter b = new Counter();
    a.increment();
    a.increment();
    b.increment();
    System.out.println(a.count + " " + b.count);   // 2 1

\`a\` and \`b\` are separate objects, so incrementing one never touches the other.

## Variables hold references, not objects

\`Counter a\` does not contain a counter; it contains a **reference** that points at one living on
the heap. Copying the variable copies the reference:

    Counter c = a;       // no new object — c and a point at the same counter
    c.increment();
    System.out.println(a.count);   // 3

This is also why \`==\` on two objects asks "same object?", not "same contents?":
\`new Counter() == new Counter()\` is \`false\`.

## Default values

Fields are given defaults when the object is created: \`0\` for numbers, \`false\` for boolean,
\`'\\u0000'\` for char and \`null\` for every reference type. **Local variables get no default** — reading
one before assigning it is a compile error ("variable might not have been initialized").

## Java passes everything by value

A method receives a copy of the reference. It can change the object the reference points at, but
reassigning the parameter changes only its own copy:

    static void fill(Counter k) { k.count = 10; }          // caller sees 10
    static void replace(Counter k) { k = new Counter(); }  // caller sees nothing change

## Design reasoning

A class earns its place when data and the rules about that data belong together. A \`Counter\`
whose \`increment\` is the only way to change \`count\` is easier to trust than an \`int\` that any
code anywhere may modify — which is where encapsulation, two units from now, picks up.

## Common mistakes and interview traps

- Calling a method on a reference that is still \`null\` — a \`NullPointerException\` at runtime.
  An array of objects, \`new Counter[3]\`, holds three nulls, not three counters.
- Saying "Java passes objects by reference". It passes **references by value**; the \`replace\`
  example above is the follow-up an interviewer uses to check you know the difference.
- Putting two public classes in one file: a public top-level class must live in a file of the same
  name.`,
    mcqs: [
      mcq(`What does this print?

    class Box { int size; }

    Box p = new Box();
    p.size = 4;
    Box q = p;
    q.size = 9;
    System.out.println(p.size);`, [
        ['4, because q received its own copy of the Box', false],
        ['9, because p and q refer to one and the same Box', true],
        ['0, because the assignment q = p resets the fields', false],
        ['It does not compile, since q was never created with new', false],
      ], '`Box q = p` copies the reference, not the object, so both variables point at a single Box. Setting q.size changes the only Box there is, and p.size reads 9.'),
      mcq('A class declares the field `int hits;` and one of its methods declares the local variable `int misses;`. The method prints both without assigning either. What happens?', [
        ['Both print 0, because Java zeroes every int variable', false],
        ['hits prints 0; printing misses fails to compile', true],
        ['Both fail to compile until each one is assigned', false],
        ['hits prints null and misses prints 0 at runtime', false],
      ], 'Fields receive default values (0 for int) when the object is created; local variables receive none, and the compiler rejects reading one that is not definitely assigned.'),
      mcq(`What does this print?

    static void reset(Box b) {
        b = new Box();
        b.size = 0;
    }

    Box x = new Box();
    x.size = 5;
    reset(x);
    System.out.println(x.size);`, [
        ['0, since reset received the Box by reference', false],
        ['5, since reset only re-pointed its own parameter', true],
        ['It throws a NullPointerException inside reset', false],
      ], 'Java passes a copy of the reference. Reassigning b inside reset points that copy at a new Box and changes nothing the caller holds, so x still refers to the Box with size 5.'),
    ],
    checkpoint: [
      mcq(`What happens when this runs?

    Box[] boxes = new Box[3];
    System.out.println(boxes[0].size);`, [
        ['It prints 0, the default size of a new Box', false],
        ['It throws a NullPointerException at runtime', true],
        ['It fails to compile: the array is uninitialised', false],
        ['It throws ArrayIndexOutOfBoundsException', false],
      ], 'Creating an array of a reference type creates slots, not objects: every element starts as null. Reading .size through a null reference throws NullPointerException; the code compiles fine.'),
      mcq('Two Box objects are created with identical field values. What does `new Box() == new Box()` evaluate to, and why?', [
        ['true, because both objects hold the same field values', false],
        ['false, because == compares references and these differ', true],
        ['true, because == calls equals() on the two objects', false],
        ['It does not compile, since == only works on primitives', false],
      ], 'For object operands, == asks whether two references point at the same object. Each new creates a distinct object, so the comparison is false whatever the fields contain.'),
      mcq(`What does this print?

    static void grow(Box b) { b.size += 1; }

    Box x = new Box();
    x.size = 5;
    grow(x);
    grow(x);
    System.out.println(x.size);`, [
        ['5', false],
        ['6', false],
        ['7', true],
        ['It does not compile', false],
      ], 'grow receives a copy of the reference, but that copy points at the caller\'s Box, so changing b.size changes the shared object. Two calls add 2, giving 7.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_CONSTRUCTORS',
    notes: `A **constructor** runs once, when \`new\` creates an object, and its job is to leave that
object in a valid state. It has the class's name and **no return type** — not even \`void\`.

## Writing constructors

    public class Account {
        private final String owner;
        private long balance;

        public Account(String owner) {
            this(owner, 0);                 // delegate to the fuller constructor
        }

        public Account(String owner, long opening) {
            this.owner = owner;
            this.balance = opening;
            System.out.println("Opened for " + owner + " with " + opening);
        }
    }

    new Account("Asha");          // Opened for Asha with 0
    new Account("Ravi", 500);     // Opened for Ravi with 500

Two constructors with different parameter lists is **constructor overloading**. Rather than repeat
the assignments, the short one calls the long one with \`this(...)\` — **constructor chaining**.
\`this(...)\` must be the **first statement**, so the real work happens in exactly one place.

## What \`this\` means

Inside a constructor or method, \`this\` is the object being worked on. \`this.owner = owner\`
reads "set this object's field to the parameter". Without \`this.\`, the parameter **shadows** the
field and \`owner = owner;\` assigns the parameter to itself — it compiles, and the field stays
\`null\`.

## The default constructor

If you write **no** constructor, the compiler adds a public no-argument one. The moment you write
any constructor, that gift is gone: with only \`Account(String)\` declared, \`new Account()\` is a
compile error. Frameworks that create objects reflectively (JPA entities, some JSON libraries) need a
no-argument constructor, so this bites in Spring work.

## Order of initialisation

When \`new Account("Asha")\` runs: memory is allocated with default values, the superclass
constructor runs, field initialisers (\`int x = 5;\`) run in source order, and finally the constructor
body. A field initialised at its declaration is already set when the constructor body starts.

## Design reasoning

A constructor that demands everything an object needs makes an invalid object impossible to create.
\`new Account("Asha")\` cannot exist without an owner; a no-argument constructor followed by setters
can — briefly or permanently.

## Common mistakes and interview traps

- \`public void Account() {...}\` is a **method** that happens to share the class name. It never runs
  on \`new\`, and the compiler accepts it silently.
- Calling an overridable method from a constructor: a subclass override runs before the subclass's
  own fields are initialised (the Debugging unit shows the crash).
- "Can a constructor be private?" Yes — singletons and factory methods use exactly that.`,
    mcqs: [
      mcq(`What does this print?

    class Student {
        String name;
        Student(String name) { name = name; }
    }

    System.out.println(new Student("Ravi").name);`, [
        ['Ravi', false],
        ['null', true],
        ['An empty line', false],
        ['It does not compile', false],
      ], 'Inside the constructor the parameter name shadows the field, so name = name assigns the parameter to itself. The field keeps its default, null. this.name = name is the fix.'),
      mcq('A class `Point` declares exactly one constructor, `Point(int x, int y)`. What does `new Point()` do elsewhere in the code?', [
        ['Creates a Point with x and y both set to 0', false],
        ['Fails to compile: no matching constructor exists', true],
        ['Compiles, then throws InstantiationException', false],
        ['Creates a Point whose x and y fields are null', false],
      ], 'The compiler supplies a no-argument constructor only when a class declares none at all. Point declares one, so no no-argument version exists and the call cannot be resolved.'),
      mcq('Where may a `this(...)` call appear in a Java constructor?', [
        ['Anywhere in the constructor body, as often as needed', false],
        ['Only as the first statement of the constructor', true],
        ['Only as the last statement, after fields are assigned', false],
        ['Only in a constructor that has no parameters', false],
      ], 'A this(...) or super(...) call must be the first statement, so an object is fully initialised by the delegated constructor before anything else touches it. Only one such call is allowed.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    class Lamp {
        boolean on;
        void Lamp() { on = true; }
    }

    System.out.println(new Lamp().on);`, [
        ['true', false],
        ['false', true],
        ['null', false],
        ['It does not compile', false],
      ], 'With a return type, void Lamp() is an ordinary method that shares the class name, not a constructor. new Lamp() uses the compiler-supplied constructor, so on keeps its default, false.'),
      mcq(`What does new Order() print?

    class Order {
        Order() {
            this(1);
            System.out.println("A");
        }
        Order(int qty) {
            System.out.println("B" + qty);
        }
    }`, [
        ['A, then B1', false],
        ['B1, then A', true],
        ['A only', false],
        ['B1 only', false],
      ], 'The no-argument constructor first delegates to Order(int), which prints B1 and returns; then the rest of the no-argument body runs and prints A.'),
      mcq(`What is the value of new T().v?

    class T {
        int v = 5;
        T() { v = v * 2; }
    }`, [
        ['0', false],
        ['5', false],
        ['10', true],
        ['It does not compile', false],
      ], 'Field initialisers run before the constructor body, so v is already 5 when the body doubles it to 10.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_ENCAPSULATION',
    notes: `**Encapsulation** means an object owns its state: the fields are hidden, and the only way
to change them is through methods that keep the object valid. The point is not "add getters and
setters" — it is that a rule like "a balance never goes negative" is enforced in one place.

## The four access levels

| Modifier | Visible to |
|---|---|
| \`private\` | the declaring class only |
| *(none)* — package-private | classes in the same package |
| \`protected\` | the same package **and** subclasses anywhere |
| \`public\` | everyone |

Fields are almost always \`private\`. Methods are as narrow as their callers allow.

## An object that protects itself

    public class Wallet {
        private long balancePaise;

        public long getBalancePaise() { return balancePaise; }

        public void deposit(long paise) {
            if (paise <= 0) throw new IllegalArgumentException("Deposit must be positive");
            balancePaise += paise;
        }

        public void withdraw(long paise) {
            if (paise <= 0 || paise > balancePaise)
                throw new IllegalArgumentException("Invalid withdrawal: " + paise);
            balancePaise -= paise;
        }
    }

    Wallet w = new Wallet();
    w.deposit(5000);
    w.withdraw(1200);
    System.out.println(w.getBalancePaise());   // 3800

There is deliberately **no** \`setBalancePaise\`. A public setter would let any caller write
\`-1_000_000\` and the rule would be gone. Methods named after what the business does
(\`deposit\`, \`withdraw\`) say more and allow less than a setter.

## Leaking a mutable field

    public class Cart {
        private final List<String> items = new ArrayList<>();
        public List<String> getItems() { return items; }   // leaks the real list
    }

    cart.getItems().clear();   // empties the cart from outside

Return a copy (\`new ArrayList<>(items)\`) or a read-only view (\`Collections.unmodifiableList(items)\`
or \`List.copyOf(items)\`). The same applies to arrays and \`Date\` objects passed **into** a
constructor: copy them, or the caller still holds a handle to your state.

## Common mistakes and interview traps

- Generating a getter and setter for every field and calling it encapsulation. It is a public field
  with extra typing.
- \`private\` is per **class**, not per object: a \`Wallet\` method may read another wallet's private
  \`balancePaise\`. That is why \`equals(Object o)\` can compare private fields.
- \`protected\` is wider than people think — every class in the same package can see it, not only
  subclasses.
- A validating setter that silently ignores bad input hides bugs; throwing
  \`IllegalArgumentException\` tells the caller at once.`,
    mcqs: [
      mcq('A field in `com.shop.Item` is declared with no access modifier. Which code can read it directly?', [
        ['Any class in any package, the same as public', false],
        ['Only classes in the com.shop package', true],
        ['Only Item itself and subclasses of Item', false],
        ['Only Item itself, the same as private', false],
      ], 'No modifier means package-private: visible throughout the declaring package and nowhere else. Unlike protected, it gives nothing extra to a subclass in another package.'),
      mcq(`A Cart class keeps "private final List<String> items" and exposes this getter:

    public List<String> getItems() { return items; }

What does a caller's cart.getItems().clear() do?`, [
        ['Nothing — final stops the list from being changed', false],
        ['It empties the cart\'s own internal list', true],
        ['It fails to compile because items is private', false],
        ['It clears a copy and leaves the cart untouched', false],
      ], 'The getter returns the reference to the internal list itself, so the caller mutates the cart\'s state. final only stops the field being reassigned. Return a copy or an unmodifiable view instead.'),
      mcq('A `Wallet` must never hold a negative balance. Which public API protects that rule best?', [
        ['A public balance field documented as "never negative"', false],
        ['deposit and withdraw methods that validate the amount', true],
        ['getBalance plus setBalance(long), both public', false],
        ['A protected balance field so only subclasses change it', false],
      ], 'Methods that validate every change are the only option that enforces the rule in code. A public setter or field lets any caller write a negative value, and protected still opens it to subclasses and the package.'),
    ],
    checkpoint: [
      mcq(`Does this compile?

    public class Money {
        private long paise;
        public boolean sameAs(Money other) {
            return this.paise == other.paise;
        }
    }`, [
        ['No: other.paise is private to the other object', false],
        ['Yes: private access is granted per class', true],
        ['Only if other is declared as final', false],
        ['Only if paise is changed to protected', false],
      ], 'Access control in Java is checked per class, not per instance. Code inside Money may read the private fields of any Money object, which is exactly how equals() implementations work.'),
      mcq('Which code can access a `protected` field declared in `com.shop.Item`?', [
        ['Subclasses of Item in any package, and nothing else', false],
        ['All classes in com.shop, plus subclasses anywhere', true],
        ['Only Item and its direct subclasses in com.shop', false],
        ['Any class in any package, like a public field', false],
      ], 'protected includes package access: every class in com.shop can use it, and a subclass in another package can also reach it through inheritance. It is wider than "subclasses only".'),
      mcq(`What does this print?

    // in Person:
    public void setAge(int age) {
        if (age < 0) throw new IllegalArgumentException("age");
        this.age = age;
    }

    p.setAge(30);
    try { p.setAge(-1); } catch (IllegalArgumentException e) { }
    System.out.println(p.getAge());`, [
        ['-1', false],
        ['0', false],
        ['30', true],
        ['It prints a stack trace', false],
      ], 'The validation throws before the assignment, so the invalid call leaves the object as it was. The exception is caught, and getAge still returns 30.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_STATIC_FINAL',
    notes: `## static: belongs to the class

An ordinary field has one copy **per object**. A \`static\` field has **one copy for the whole
class**, shared by every object. A \`static\` method runs without any object, so it has no \`this\`.

    public class Ticket {
        private static int issued = 0;      // one counter, shared
        private final int number;           // one per ticket

        public Ticket() {
            issued++;
            number = issued;
        }
        public int getNumber() { return number; }
        public static int issued() { return issued; }
    }

    new Ticket();
    new Ticket();
    Ticket t = new Ticket();
    System.out.println(t.getNumber() + " of " + Ticket.issued());   // 3 of 3

Call static members through the class name (\`Ticket.issued()\`, \`Math.max\`). A static method
cannot read an instance field directly — "non-static variable cannot be referenced from a static
context" is the error everybody meets in \`main\`.

## final: cannot change

- A **final variable** is assigned once. \`static final\` gives a constant: \`static final int
  MAX_SEATS = 120;\` (named in UPPER_SNAKE_CASE).
- A **final method** cannot be overridden.
- A **final class** cannot be extended — \`String\`, \`Integer\` and \`LocalDate\` are final.

\`final\` on a reference freezes the **reference**, not the object:

    final List<String> names = new ArrayList<>();
    names.add("Asha");          // fine — the list changes
    names = new ArrayList<>();  // compile error — the variable cannot be reassigned

## Designing an immutable class

An immutable object never changes after construction, so it is safe to share between threads and
to use as a map key. The recipe:

    public final class Money {                  // 1. final class: no mutable subclass
        private final long paise;               // 2. private final fields
        private final String currency;

        public Money(long paise, String currency) {
            this.paise = paise;
            this.currency = currency;
        }
        public Money plus(Money other) {        // 3. "changes" return a new object
            return new Money(paise + other.paise, currency);
        }
        public long getPaise() { return paise; } // 4. getters only, no setters
    }

If a field is mutable (a list, an array, a \`Date\`), copy it on the way in and on the way out.
\`String\` works exactly this way: \`toUpperCase()\` returns a new string.

## Common mistakes and interview traps

- Making a field static to "fix" the static-context error — every object then shares one value.
- Believing \`final List\` is immutable; use \`List.copyOf\` or \`Collections.unmodifiableList\`.
- "Can a static method be overridden?" No: a subclass static method with the same signature
  **hides** the parent's, and the call is chosen by the declared type at compile time.`,
    mcqs: [
      mcq(`What happens here?

    final List<String> names = new ArrayList<>();
    names.add("Asha");
    System.out.println(names.size());`, [
        ['It fails to compile, because a final list cannot change', false],
        ['It prints 1, because final only stops reassignment', true],
        ['It throws UnsupportedOperationException on add', false],
      ], 'final applies to the variable: names must always refer to this same ArrayList. The ArrayList itself is still mutable, so add succeeds and size is 1.'),
      mcq(`What does this print?

    class Visitor {
        static int count = 0;
        Visitor() { count++; }
    }

    Visitor a = new Visitor();
    new Visitor();
    new Visitor();
    System.out.println(a.count);`, [
        ['1, because a was the first Visitor created', false],
        ['3, because every Visitor shares a single count', true],
        ['0, because static fields are reset per object', false],
        ['It does not compile: static field via an instance', false],
      ], 'A static field has one copy for the class. Each constructor call increments that same copy, so it is 3. Reading it through a is legal (if poor style) and reads the shared value.'),
      mcq(`Why does this fail to compile?

    public class Main {
        int total = 0;
        public static void main(String[] args) {
            total = 5;
        }
    }`, [
        ['main may not assign to any field of its class', false],
        ['A static method has no this, so no total to use', true],
        ['total must be declared final before main uses it', false],
        ['Fields must be initialised in a constructor first', false],
      ], 'total is an instance field: it exists only inside a Main object. main is static and runs with no object, so there is no total to refer to. Create an object, or make the field static if one shared value is really intended.'),
    ],
    checkpoint: [
      mcq('Why can no class be written as `class SafeString extends String`?', [
        ['String is final, so it cannot be extended', true],
        ['String has only private constructors in Java', false],
        ['Classes in java.lang are always package-private', false],
        ['String is an interface and must be implemented', false],
      ], 'String is declared final. That guarantees no subclass can add mutable state or change its behaviour, which is part of why strings can be shared and cached safely.'),
      mcq('Which of these breaks the immutability of an otherwise final class with private final fields?', [
        ['A constructor that validates its arguments first', false],
        ['A getter that returns its internal int[] array', true],
        ['A method that returns a new object with a change', false],
        ['A static factory method used instead of new', false],
      ], 'Returning the internal array hands the caller a reference to the object\'s own state, which the caller can now modify. Return a copy (array.clone() or Arrays.copyOf) instead.'),
      mcq(`What does the compiler say about this?

    static final int MAX = 10;
    void raise() { MAX = 20; }`, [
        ['Nothing; MAX becomes 20 when raise runs', false],
        ['Error: cannot assign a value to final variable MAX', true],
        ['Nothing; it fails only at runtime when raise is called', false],
        ['Error: static fields cannot be used in instance methods', false],
      ], 'A final variable can be assigned exactly once, here at its declaration. Any later assignment is rejected at compile time. Instance methods may read static fields freely.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_INHERITANCE',
    notes: `**Inheritance** lets one class build on another: \`class Truck extends Vehicle\` gives
\`Truck\` every accessible field and method of \`Vehicle\`, and \`Truck\` adds or changes what it
needs. Java allows **one** superclass per class; every class without an \`extends\` extends
\`Object\`.

## super in constructors and methods

    class Vehicle {
        protected final String plate;
        Vehicle(String plate) {
            this.plate = plate;
            System.out.println("Vehicle " + plate);
        }
        String describe() { return "Vehicle " + plate; }
    }

    class Truck extends Vehicle {
        private final int loadKg;
        Truck(String plate, int loadKg) {
            super(plate);                    // must be first
            this.loadKg = loadKg;
            System.out.println("Truck " + loadKg);
        }
        @Override
        String describe() { return super.describe() + " carrying " + loadKg + "kg"; }
    }

    Truck t = new Truck("KA01", 900);
    System.out.println(t.describe());

Output:

    Vehicle KA01
    Truck 900
    Vehicle KA01 carrying 900kg

The parent part of an object is always built first. \`super(plate)\` picks the parent constructor;
\`super.describe()\` calls the parent's version of a method the child overrides.

## The implicit super()

If a constructor does not start with \`super(...)\` or \`this(...)\`, the compiler inserts
\`super()\` — a call to the parent's **no-argument** constructor. When the parent has only
\`Vehicle(String)\`, that inserted call matches nothing, and the child fails to compile with
"constructor Vehicle in class Vehicle cannot be applied to given types".

## What is and is not inherited

Public and protected members are inherited (package-private ones too, within the package).
**Private fields exist inside the child object but cannot be named from the child's code.**
**Constructors are never inherited** — \`Truck\` has only the constructors it declares.

## When inheritance is the wrong tool

Inheritance says "a Truck **is a** Vehicle, everywhere a Vehicle is expected". If that is not
true in every case, prefer **composition** — hold the other object in a field. The classic mistake
is in the JDK itself: \`Stack extends Vector\`, so a "stack" exposes \`insertElementAt\` and lets
callers break LIFO order. A class reusing a few methods of another should **have** one, not **be**
one.

## Common mistakes and interview traps

- \`class C extends A, B\` does not compile; multiple inheritance is only for interfaces.
- Expecting \`super.super.method()\` to work — it does not exist.
- Deep hierarchies where a change to a parent silently changes ten children (the "fragile base
  class" problem).`,
    mcqs: [
      mcq(`What does new C() print?

    class A { A() { System.out.print("A"); } }
    class B extends A { B() { System.out.print("B"); } }
    class C extends B { C() { System.out.print("C"); } }`, [
        ['C', false],
        ['CBA', false],
        ['ABC', true],
        ['CAB', false],
      ], 'Each constructor begins with an implicit super(), so A\'s body finishes first, then B\'s, then C\'s. Parent parts are always built before child parts.'),
      mcq(`Why does Dog fail to compile?

    class Animal {
        Animal(String name) { }
    }
    class Dog extends Animal {
        Dog() { }
    }`, [
        ['Dog must also declare a constructor taking a String', false],
        ['The implicit super() finds no no-arg Animal constructor', true],
        ['A subclass may not declare its own constructor at all', false],
        ['Animal must be abstract to be extended in this way', false],
      ], 'Dog() starts with an implicit super(), which needs Animal(). Animal declares only Animal(String), so nothing matches. The fix is an explicit super("...") as Dog\'s first statement.'),
      mcq('A `Stack` class extends `ArrayList` to reuse its storage. What is the real design problem?', [
        ['ArrayList is final, so it cannot be extended', false],
        ['Callers inherit add(index, x) and can break LIFO', true],
        ['Stack runs slower because inheritance adds overhead', false],
        ['A class that extends ArrayList cannot be generic', false],
      ], 'Inheritance publishes every parent method. Stack would expose insertion and removal at any index, so its own rule (last in, first out) cannot be enforced. Holding a list in a private field — composition — exposes only push, pop and peek.'),
    ],
    checkpoint: [
      mcq('What does the compiler do with `class Amphibian extends Car, Boat { }` when Car and Boat are classes?', [
        ['Accepts it and merges the members of both parents', false],
        ['Rejects it: a class may extend only one class', true],
        ['Accepts it if Car and Boat share no method names', false],
        ['Accepts it and uses Car\'s version of any clashes', false],
      ], 'Java allows a single superclass. A class can implement many interfaces, which is how Java offers multiple inheritance of type without inheriting state from two parents.'),
      mcq(`Parent declares "private int secret = 7;" and Child extends Parent. What happens with this method in Child?

    int reveal() { return secret; }`, [
        ['It compiles and returns 7', false],
        ['Compile error: secret has private access in Parent', true],
        ['It compiles and returns 0, Child\'s own copy', false],
        ['It compiles but throws IllegalAccessError', false],
      ], 'The field exists inside every Child object, but private members cannot be named outside the class that declares them. Child needs a protected or public accessor in Parent.'),
      mcq(`What does this print?

    class Shape { String name() { return "shape"; } }
    class Square extends Shape {
        @Override String name() { return "square of " + super.name(); }
    }

    System.out.println(new Square().name());`, [
        ['shape', false],
        ['square of shape', true],
        ['square of square', false],
        ['It recurses until StackOverflowError', false],
      ], 'super.name() calls Shape\'s implementation directly, bypassing dynamic dispatch, so it returns "shape" and no recursion happens.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_POLYMORPHISM',
    notes: `**Polymorphism** means one call can do different things depending on the object. Java has
two forms, and interviews test whether you can say which one decides each call.

## Overriding — decided at runtime

A subclass **overrides** a method by declaring the same name and parameter list:

    class Animal { String sound() { return "..."; } }
    class Dog extends Animal { @Override String sound() { return "Woof"; } }
    class Cat extends Animal { @Override String sound() { return "Meow"; } }

    Animal[] zoo = { new Dog(), new Cat(), new Animal() };
    for (Animal a : zoo) System.out.print(a.sound() + " ");   // Woof Meow ...

The variable's type is \`Animal\`, but the JVM looks at the **actual object** each time — **dynamic
dispatch**. That is what lets code written against \`Animal\` work with animals invented later.

Overriding rules: same signature; return type the same or a subtype (**covariant return**); access
the same or **wider** (a public method cannot become package-private); no new checked exceptions.
Always write \`@Override\` — it turns a typo into a compile error instead of a silent new method.

## Overloading — decided at compile time

**Overloading** is several methods with one name and **different parameter lists** in the same
class. The compiler chooses using the **declared types** of the arguments:

    static String kind(Animal a) { return "animal"; }
    static String kind(Dog d)    { return "dog"; }

    Animal a = new Dog();
    System.out.println(kind(a));          // animal — declared type is Animal
    System.out.println(kind(new Dog()));  // dog

Return type alone does not distinguish overloads: \`int size()\` and \`long size()\` in one class is
a compile error.

## What is not polymorphic

- **Fields**: \`Parent p = new Child(); p.name\` reads the field declared in \`Parent\`, even if
  \`Child\` declares its own \`name\`.
- **Static methods**: a child static method with the same signature **hides** the parent's; the
  call is fixed by the declared type.
- **Private methods** are not inherited, so they cannot be overridden.

## Design reasoning

Overriding replaces \`if (type == ...)\` chains: each class carries its own behaviour, and adding a
new kind means adding a class, not editing every switch. That is the "open for extension" idea behind
most frameworks you will use, Spring included.

## Common mistakes and interview traps

- Writing \`public boolean equals(Point p)\` — an **overload**, not an override; collections keep
  calling \`equals(Object)\`. \`@Override\` would have caught it.
- Expecting overload choice to follow the runtime type (the \`kind(a)\` trap above).
- Narrowing access in an override — compile error "attempting to assign weaker access privileges".`,
    mcqs: [
      mcq(`What does this print?

    static String kind(Animal a) { return "animal"; }
    static String kind(Dog d)    { return "dog"; }

    Animal pet = new Dog();
    System.out.println(kind(pet));`, [
        ['dog, because pet refers to a Dog object at runtime', false],
        ['animal, because overloads use the declared type', true],
        ['It does not compile: the call is ambiguous', false],
      ], 'Overload resolution happens at compile time from the static (declared) type of the argument. pet is declared Animal, so kind(Animal) is chosen, whatever object it holds at runtime.'),
      mcq('A class declares both `int size()` and `long size()`. What happens?', [
        ['The caller\'s assignment target picks the overload', false],
        ['Compile error: the two differ only in return type', true],
        ['The long version silently hides the int version', false],
        ['It compiles; the first declared method is used', false],
      ], 'Overloads must differ in their parameter lists. Two methods with the same name and parameters are the same signature, so the class fails to compile regardless of return type.'),
      mcq(`Does this compile?

    class Task { public void run() { } }
    class Job extends Task { void run() { } }`, [
        ['Yes, Job.run overrides Task.run as usual', false],
        ['No: an override cannot narrow public access', true],
        ['Yes, but Job.run is an overload, not an override', false],
        ['No: Job.run must be annotated with @Override', false],
      ], 'An overriding method may keep or widen access, never narrow it. Narrowing would let a Job, used as a Task, hide a method the Task contract promises is public. @Override is recommended but optional.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    class Parent { String label = "parent"; }
    class Child extends Parent { String label = "child"; }

    Parent p = new Child();
    System.out.println(p.label);`, [
        ['child', false],
        ['parent', true],
        ['null', false],
        ['It does not compile', false],
      ], 'Fields are not overridden; Child\'s label hides Parent\'s. Field access is resolved from the declared type, Parent, so p.label reads "parent". Only instance methods are dispatched dynamically.'),
      mcq(`What does this print?

    class P { static String greet() { return "P"; } }
    class C extends P { static String greet() { return "C"; } }

    P ref = new C();
    System.out.println(ref.greet());`, [
        ['C', false],
        ['P', true],
        ['PC', false],
        ['It does not compile', false],
      ], 'Static methods are hidden, not overridden. A call through ref is compiled as P.greet() because ref is declared P; the object it points at plays no part.'),
      mcq(`What does this print?

    class Animal { String sound() { return "..."; } }
    class Dog extends Animal { String sound() { return "Woof"; } }
    class Puppy extends Dog { }

    Animal a = new Puppy();
    System.out.println(a.sound());`, [
        ['...', false],
        ['Woof', true],
        ['An empty line', false],
        ['It does not compile', false],
      ], 'Dynamic dispatch starts at the runtime class, Puppy, and walks up. Puppy does not override sound(), so the nearest override, Dog\'s, runs.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_ABSTRACTION',
    notes: `Abstraction is writing code against **what something does** rather than how. Java gives you
two tools for it.

## Abstract classes

An \`abstract\` class cannot be instantiated. It can hold fields, constructors and finished
methods, plus \`abstract\` methods with no body that every concrete subclass must implement:

    abstract class Shape {
        private final String name;
        protected Shape(String name) { this.name = name; }

        abstract double area();                 // each shape must supply this

        String describe() {                     // shared logic, written once
            return name + " with area " + String.format("%.1f", area());
        }
    }

    class Circle extends Shape {
        private final double r;
        Circle(double r) { super("Circle"); this.r = r; }
        @Override double area() { return Math.PI * r * r; }
    }

    System.out.println(new Circle(2).describe());   // Circle with area 12.6

\`describe\` is a small **template method**: the parent fixes the steps, the child fills in one.

## Interfaces

An interface is a **contract** with no instance state:

    interface Payable {
        long amountDue();                          // implicitly public abstract

        default String receipt() {                 // Java 8: a method with a body
            return "Paid " + amountDue();
        }
        static Payable free() { return () -> 0; }  // static helper
    }

    class Invoice implements Payable {
        public long amountDue() { return 4500; }
    }

Interface fields are implicitly \`public static final\` — constants only. A class can
\`implement\` **many** interfaces but \`extend\` only one class.

## Choosing between them

- **Interface** when unrelated classes share a capability: \`Invoice\`, \`Salary\` and \`Refund\` are
  all \`Payable\` but share no state. Most JDK and Spring types you depend on are interfaces
  (\`List\`, \`Comparable\`, \`Runnable\`, \`JpaRepository\`).
- **Abstract class** when closely related classes share state or a fixed algorithm, and you want a
  constructor to enforce it.

Rule of thumb: **declare variables and parameters as interfaces**, and use an abstract class as an
optional helper that implements one.

## The default-method diamond

If a class implements two interfaces that both provide \`default String hello()\`, it must override
\`hello\` itself, and may pick one with \`A.super.hello()\`. Otherwise it does not compile.

## Common mistakes and interview traps

- Forgetting \`public\` when implementing an interface method — the interface method is public, so
  a package-private implementation narrows access and fails to compile.
- "Can an abstract class have a constructor?" Yes; subclasses call it with \`super(...)\`.
- "Can an interface have state?" Constants yes, instance fields no.`,
    mcqs: [
      mcq('`Shape` is declared `abstract class Shape`. What happens at `Shape s = new Shape();`?', [
        ['A Shape is created with every abstract method returning null', false],
        ['Compile error: Shape is abstract and cannot be instantiated', true],
        ['It compiles, and calling an abstract method throws later', false],
      ], 'An abstract class can never be instantiated directly, even if it happens to have no abstract methods. You create a concrete subclass, and may still declare the variable as Shape.'),
      mcq('An interface declares `int LIMIT = 5;`. What is LIMIT, implicitly?', [
        ['A private field, separate in each implementing object', false],
        ['A public static final constant shared by all', true],
        ['A protected field that each implementation can change', false],
        ['A default value each implementing class may override', false],
      ], 'Interfaces cannot hold instance state. Every field declared in one is implicitly public, static and final, so LIMIT is a single constant.'),
      mcq(`What happens with Robot?

    interface Walker  { default String move() { return "walk"; } }
    interface Swimmer { default String move() { return "swim"; } }
    class Robot implements Walker, Swimmer { }`, [
        ['It compiles, and move() returns "walk", the first listed', false],
        ['Compile error: Robot must override move() itself', true],
        ['It compiles, and move() throws at runtime when called', false],
        ['It compiles, and move() returns "walkswim"', false],
      ], 'Two inherited defaults with the same signature conflict, and Java refuses to guess. Robot must override move(), and can delegate with Walker.super.move() or Swimmer.super.move().'),
    ],
    checkpoint: [
      mcq(`What happens here?

    abstract class Shape { abstract double area(); }
    class Square extends Shape { double side; }`, [
        ['It compiles; Square.area() returns 0.0 by default', false],
        ['Compile error: Square must implement area() or be abstract', true],
        ['It compiles; calling area() on a Square throws an error', false],
        ['It compiles because the side field implies the area', false],
      ], 'A concrete class must implement every inherited abstract method. Square does not implement area() and is not itself abstract, so the compiler rejects it.'),
      mcq('Can an abstract class declare a constructor, and if so, when does it run?', [
        ['No; abstract classes are not instantiated, so none is allowed', false],
        ['Yes; it runs through super(...) when a subclass is created', true],
        ['Yes; but only when the abstract class is called through reflection', false],
        ['No; only interfaces may declare initialisation code of that kind', false],
      ], 'An abstract class can have constructors to initialise its own fields. They run as part of building a concrete subclass object, invoked by that subclass\'s super(...) call.'),
      mcq('Invoice, Salary and Refund are unrelated classes that must each report an amountDue(). Which design fits?', [
        ['An abstract class Payment that all three extend', false],
        ['An interface Payable that all three implement', true],
        ['A static amountDue(Object) using instanceof checks', false],
        ['A shared Amount base class with a public field', false],
      ], 'The classes share a capability, not state, and may already extend other classes. An interface expresses that contract without forcing them into one hierarchy.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_OBJECT_METHODS',
    notes: `Every class inherits three methods from \`Object\` that you will override in almost every
domain class: \`toString\`, \`equals\` and \`hashCode\`.

## toString

The default prints the class name and a hex hash — \`Point@1b6d3586\` — which tells you nothing in
a log. Override it:

    @Override
    public String toString() { return "Point(" + x + ", " + y + ")"; }

## equals

The default \`equals\` is \`==\`: same object or not. For a value-like class, two objects with equal
fields should be equal:

    public final class Point {
        private final int x, y;
        public Point(int x, int y) { this.x = x; this.y = y; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Point)) return false;
            Point other = (Point) o;
            return x == other.x && y == other.y;
        }

        @Override
        public int hashCode() { return Objects.hash(x, y); }
    }

The parameter **must be \`Object\`**. \`equals(Point other)\` is an overload that collections never
call. The contract: reflexive, symmetric, transitive, consistent, and \`x.equals(null)\` is false.

## hashCode, and why the two go together

The rule: **objects that are equal must have equal hash codes**. Unequal objects may share one (a
collision — legal, just slower).

\`HashSet\` and \`HashMap\` use \`hashCode\` to pick a bucket and \`equals\` only within it. Override
\`equals\` without \`hashCode\` and two equal points get different identity hashes:

    Set<Point> seen = new HashSet<>();
    seen.add(new Point(1, 2));
    System.out.println(seen.contains(new Point(1, 2)));   // false without hashCode

The lookup searches the wrong bucket and never calls your \`equals\`. With both overridden it
prints \`true\`.

## Strings

    String a = "hi";
    String b = new String("hi");
    System.out.println(a == b);        // false — different objects
    System.out.println(a.equals(b));   // true  — same characters

Compare strings with \`equals\`, always.

## Common mistakes and interview traps

- Using **mutable** fields in \`hashCode\`, then changing an object after putting it in a set — it
  is now in the wrong bucket and \`contains\` cannot find it.
- \`getClass() != o.getClass()\` versus \`instanceof\`: the first refuses subclasses (safer for
  symmetry), the second accepts them. Know which you chose and why.
- Forgetting \`@Override\`, which would have flagged \`equals(Point)\`.
- IDEs generate both methods; Java 17's \`record Point(int x, int y)\` generates all three.`,
    workedExample: `**Problem.** A \`Student\` has an \`id\` (unique) and a \`name\` that can change. Two
Student objects for the same id should count as one in a \`HashSet\`. Write \`equals\` and
\`hashCode\`.

**Decide what equality means.** Identity in this domain is the id — a renamed student is the same
student. So equality uses \`id\` only, and \`name\` stays out of both methods. That also keeps
\`hashCode\` stable when the name changes, so a Student never strands itself in the wrong bucket.

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        return id == ((Student) o).id;
    }

    @Override
    public int hashCode() { return Long.hashCode(id); }

**Check the contract.** Equal ids give equal hashes, so equal objects share a bucket. \`null\`
returns false. \`getClass()\` keeps the relation symmetric if someone subclasses Student later.

**Test it.**

    Set<Student> roster = new HashSet<>();
    roster.add(new Student(7, "Asha"));
    roster.add(new Student(7, "Asha K"));
    System.out.println(roster.size());   // 1`,
    mcqs: [
      mcq(`Point overrides equals(Object) to compare x and y but does not override hashCode. What does this most likely print?

    Set<Point> set = new HashSet<>();
    set.add(new Point(1, 2));
    System.out.println(set.contains(new Point(1, 2)));`, [
        ['true, since equals reports the two points as equal', false],
        ['false, since the identity hash codes almost always differ', true],
        ['It throws an exception: hashCode was never implemented', false],
      ], 'HashSet first locates a bucket by hashCode. The inherited identity hashCode differs for two distinct objects, so contains looks in the wrong bucket and never calls equals.'),
      mcq('A class `Ticket` does not override `toString`. What does `System.out.println(new Ticket())` print?', [
        ['The values of all of Ticket\'s fields', false],
        ['Something like Ticket@7a81197d', true],
        ['An empty line, since nothing was defined', false],
        ['The word null', false],
      ], 'Object.toString returns the class name, an @ sign and the hash code in hexadecimal. It identifies the object, not its contents, which is why domain classes override it.'),
      mcq(`What does this print?

    String a = "hi";
    String b = new String("hi");
    System.out.println((a == b) + " " + a.equals(b));`, [
        ['true true', false],
        ['false true', true],
        ['false false', false],
        ['true false', false],
      ], 'new String always creates a distinct object, so == (a reference comparison) is false. String.equals compares characters, so it is true.'),
    ],
    checkpoint: [
      mcq(`Point declares "public boolean equals(Point other)" comparing x and y, and nothing else. What does this print?

    Object o = new Point(1, 2);
    System.out.println(new Point(1, 2).equals(o));`, [
        ['true', false],
        ['false', true],
        ['It does not compile', false],
        ['It throws ClassCastException', false],
      ], 'equals(Point) is an overload. With an argument of declared type Object, the compiler picks the inherited equals(Object), which compares identity, so the result is false.'),
      mcq('Under the hashCode contract, which of these situations is allowed?', [
        ['Two equal objects returning different hash codes', false],
        ['Two unequal objects returning the same hash code', true],
        ['hashCode changing on every call for one unchanged object', false],
        ['equals returning true for an argument that is null', false],
      ], 'Equal objects must share a hash code, and an unchanged object must keep its hash code. Unequal objects sharing a hash code is a collision: legal, just slower for hash collections.'),
      mcq(`Point has a mutable field x used by both equals and hashCode. What does this most likely print?

    Set<Point> set = new HashSet<>();
    Point p = new Point(1, 2);
    set.add(p);
    p.x = 5;
    System.out.println(set.contains(p));`, [
        ['true, since p is the very object that was added', false],
        ['false, since p now hashes to a different bucket', true],
        ['It throws ConcurrentModificationException', false],
      ], 'The set filed p under the bucket for its old hash. After the change, contains computes a new hash and searches a different bucket. Keep fields used in hashCode immutable.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_DEBUGGING',
    notes: `Four OOP bugs that reach code review again and again. In each: read the symptom, find the
cause, change only that.

## 1. An overridable method called from a constructor

    class Base {
        Base() { init(); }
        void init() { }
    }
    class Greeter extends Base {
        private String greeting = "Hello";
        @Override void init() { System.out.println(greeting.length()); }
    }

    new Greeter();   // NullPointerException

**Diagnosis.** \`new Greeter()\` runs \`Base()\` first. \`init()\` dispatches dynamically to
\`Greeter.init\`, but Greeter's field initialisers have **not run yet**, so \`greeting\` is still
\`null\`. **Fix:** never call an overridable method from a constructor — make \`init\` private or
final, or move the work into the subclass constructor.

## 2. Forgetting super(...)

    class Account {
        protected final String owner;
        Account(String owner) { this.owner = owner; }
    }
    class Savings extends Account {
        Savings(String owner) { System.out.println("savings"); }
    }

The compiler reports *constructor Account in class Account cannot be applied to given types*.
**Diagnosis:** the compiler inserted \`super()\`, and Account has no no-argument constructor.
**Fix:** \`super(owner);\` as the first statement. Do not "fix" it by adding an empty \`Account()\`
— that lets an account exist with no owner.

## 3. equals overridden without hashCode

    Map<Email, String> owners = new HashMap<>();
    owners.put(new Email("a@x.com"), "Asha");
    System.out.println(owners.get(new Email("a@x.com")));   // null

\`Email.equals\` compares the address, but \`hashCode\` is still Object's identity hash. **Diagnosis:**
the key was stored in one bucket and looked up in another. **Fix:** override \`hashCode\` from the
same fields \`equals\` uses — \`Objects.hash(address)\`.

## 4. A mutable field leaking through a getter

    public final class Schedule {
        private final List<String> slots;
        public Schedule(List<String> slots) { this.slots = slots; }
        public List<String> getSlots() { return slots; }
    }

Somebody calls \`schedule.getSlots().add("02:00")\`, and a schedule that was supposed to be fixed
changes. Worse, the caller's original list is the **same** list, so changing it later changes the
schedule too. **Diagnosis:** \`final\` froze the reference, not the list. **Fix:**
\`this.slots = List.copyOf(slots);\` in the constructor — the copy is also unmodifiable.

## How to approach any of these

1. Read the exact message and the line it names. 2. Ask what ran **before** that line — constructor
order and dispatch explain most OOP surprises. 3. Change one thing, re-run, confirm.`,
    mcqs: [
      mcq('In bug 1, `new Greeter()` throws NullPointerException inside `init()`. Why is `greeting` null at that moment?', [
        ['The field was declared private, so init cannot see it', false],
        ['Base() ran before Greeter\'s field initialisers', true],
        ['String fields are always null until a setter runs', false],
        ['@Override makes init run on a fresh, empty object', false],
      ], 'Construction runs the superclass constructor first. Base() calls init(), which dispatches to Greeter.init before Greeter\'s initialiser has assigned "Hello", so greeting is still null.'),
      mcq(`What is the right fix for this compile error?

    class Savings extends Account {          // Account has only Account(String)
        Savings(String owner) { System.out.println("savings"); }
    }`, [
        ['Add an empty Account() constructor to the parent', false],
        ['Make super(owner) the first statement of Savings', true],
        ['Call super(owner) after the println statement', false],
        ['Declare Savings as abstract so no super call is needed', false],
      ], 'The implicit super() has no match. Passing owner to the existing constructor keeps the parent\'s rule that every account has an owner; super(...) must come first.'),
      mcq('An `Email` key class overrides equals but not hashCode. `map.get(new Email("a@x.com"))` returns null after a put with an equal key. What should change?', [
        ['Use a TreeMap so that only equals is ever consulted', false],
        ['Override hashCode using the same field equals uses', true],
        ['Call map.containsKey before calling map.get', false],
        ['Make the Email class final so its hash is stable', false],
      ], 'HashMap finds the bucket by hashCode before calling equals. Equal keys must produce equal hashes, so hashCode must be derived from the same fields equals compares.'),
      mcq('Schedule stores the caller\'s list and returns it from `getSlots()`. Which constructor line fixes both leaks at once?', [
        ['this.slots = slots; with the field still final', false],
        ['this.slots = List.copyOf(slots);', true],
        ['this.slots = Collections.synchronizedList(slots);', false],
        ['this.slots = (List<String>) slots;', false],
      ], 'List.copyOf makes an independent, unmodifiable copy. The caller\'s later changes no longer reach it, and a caller of getSlots cannot add to it.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_PRACTICE',
    notes: `No new ideas — this is repetition until classes, inheritance and dispatch stop needing
thought. Work each exercise in an editor, compile it, and predict the output **before** you run it.

**Exercise 1 — A class that guards itself.** Write \`Thermostat\` with a private \`int target\`,
a constructor taking the initial target, and \`raise()\` / \`lower()\` that move it by one but never
outside 16–30. Print the target after five raises from 28. (Expected: 30.)

**Exercise 2 — Chained constructors.** Give \`Pizza\` three constructors: \`Pizza()\` (medium,
cheese), \`Pizza(String size)\` and \`Pizza(String size, String topping)\`. Only the last may assign
fields; the other two call it with \`this(...)\`. Print \`toString()\` for each.

**Exercise 3 — An immutable value.** Write a final \`Distance\` class holding metres, with
\`plus(Distance)\` returning a new object and \`equals\` / \`hashCode\` / \`toString\` overridden.
Show that two \`new Distance(5)\` are equal and that a \`HashSet\` holds only one of them.

**Exercise 4 — Predict the dispatch.** Without running it, write down what this prints, then check:

    Animal a = new Dog();
    Dog d = new Dog();
    System.out.println(kind(a) + " " + kind(d) + " " + a.sound());

with \`kind(Animal)\`, \`kind(Dog)\` overloads and \`Dog\` overriding \`sound()\`.

**Exercise 5 — Interface or abstract class?** For each, decide and justify in one sentence:
\`Exportable\` (CSV and PDF reports), \`Vehicle\` with a shared \`plate\` field, \`Comparable\`
ordering for money.

## The graded exercise — Payroll

Build an \`Employee\` hierarchy and print a payroll from standard input. Your program is run against
test cases, so the output format must match exactly. The full specification is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, `raise()` is called five times on a Thermostat whose target starts at 28 and is capped at 30. What should getTarget() return?', [
        ['33, since raise moves the target five times in total', false],
        ['30, since raise never moves past the maximum', true],
        ['28, since a raise past the cap undoes all of them', false],
        ['It throws IllegalStateException on the third call', false],
      ], 'The rule lives inside raise(): the target moves only while it is below 30. The first two calls take it to 30 and the remaining three leave it there.'),
      mcq('In Exercise 2, why should only the three-argument Pizza constructor assign the fields?', [
        ['Java forbids assigning fields in more than one constructor', false],
        ['Defaults and validation then live in exactly one place', true],
        ['A this(...) call makes the object noticeably faster to build', false],
        ['The two shorter constructors cannot access private fields', false],
      ], 'Chaining sends every path through one constructor, so a change to defaults or validation is made once. Assigning fields in all three invites one of them to drift.'),
      mcq('In Exercise 3, what must be true for a HashSet to keep only one of two `new Distance(5)` objects?', [
        ['Distance must implement the Comparable interface', false],
        ['equals and hashCode must both be based on metres', true],
        ['The Distance class must be declared final', false],
        ['toString must return the same text for both', false],
      ], 'A HashSet treats two objects as duplicates when their hash codes match and equals returns true. Both methods must use metres. final helps immutability but does not decide set membership.'),
      mcq('In Exercise 4, what does the line print?', [
        ['dog dog Woof', false],
        ['animal dog Woof', true],
        ['animal dog ...', false],
        ['animal animal Woof', false],
      ], 'kind(a) picks kind(Animal) from a\'s declared type; kind(d) picks kind(Dog). a.sound() is overridden and dispatches on the actual object, a Dog, so it returns Woof.'),
      mcq('In Exercise 5, Vehicle has a plate field shared by Car and Truck and a constructor that requires it. What fits?', [
        ['An interface, because Vehicle names a capability', false],
        ['An abstract class, because of the shared state', true],
        ['A final class, so that nothing else can extend it', false],
        ['A static utility class that holds plate numbers', false],
      ], 'Shared state and a constructor that enforces it are what an abstract class provides and an interface cannot. Exportable and Comparable, which carry no state, are the interface cases.'),
    ],
    assignment: {
      title: 'Payroll with an Employee Hierarchy',
      description: 'Model three kinds of employee with an abstract class and overriding, read them from standard input, and print a payroll.',
      instructions: `Write a Java program that reads employees and prints what each is paid.

**Input**

The first line is a number N. Each of the next N lines describes one employee:

    MANAGER <name> <base> <bonus>
    ENGINEER <name> <base> <overtimeHours>
    INTERN <name> <stipend>

All numbers are whole rupees (or hours) and fit in an \`int\`. Names have no spaces.

**Pay rules**

- Manager: base + bonus
- Engineer: base + 500 for every overtime hour
- Intern: the stipend

**Design (this is what the exercise is for)**

- An \`abstract class Employee\` with a private name, an abstract \`int pay()\` and an abstract
  \`String role()\`.
- \`Manager\`, \`Engineer\` and \`Intern\` extend it and override both methods.
- \`Employee\` overrides \`toString()\` to return \`<name> (<role>): <pay>\`.
- The main loop must not check the type of an employee when printing — it calls \`toString()\` and
  \`pay()\` and lets dispatch do the work.

**Output**

If a line starts with a role not listed above, print \`Unknown role: <ROLE>\` at once (while
reading) and skip that line. After reading everything, print each employee in input order using
\`toString()\`, then three lines:

    Employees: <count of valid employees>
    Total payroll: <sum of pay>
    Highest paid: <name>

If two employees tie for highest pay, name the one that appears first. If there are no valid
employees, print \`Highest paid: none\`.

**Example**

Input:

    3
    MANAGER Asha 50000 10000
    ENGINEER Ravi 40000 6
    INTERN Meena 15000

Output:

    Asha (Manager): 60000
    Ravi (Engineer): 43000
    Meena (Intern): 15000
    Employees: 3
    Total payroll: 118000
    Highest paid: Asha

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including unknown roles, ties and an empty list.', maxPoints: 60 },
        { criterion: 'Hierarchy and overriding', description: 'An abstract Employee with abstract pay() and role(); three subclasses override them; printing relies on dispatch, not instanceof or a switch.', maxPoints: 25 },
        { criterion: 'Encapsulation', description: 'Fields are private (and final where they never change); no subclass reaches into another class\'s state.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        int n = Integer.parseInt(in.nextLine().trim());

        // TODO: declare abstract class Employee and Manager, Engineer, Intern (outside Main)
        // TODO: read n lines, build the employees, print "Unknown role: X" for bad roles
        // TODO: print each employee, then Employees, Total payroll and Highest paid
    }
}
`,
        tests: [
          { input: '3\nMANAGER Asha 50000 10000\nENGINEER Ravi 40000 6\nINTERN Meena 15000\n', expectedOutput: 'Asha (Manager): 60000\nRavi (Engineer): 43000\nMeena (Intern): 15000\nEmployees: 3\nTotal payroll: 118000\nHighest paid: Asha' },
          { input: '2\nENGINEER Kiran 45000 30\nMANAGER Divya 52000 5000\n', expectedOutput: 'Kiran (Engineer): 60000\nDivya (Manager): 57000\nEmployees: 2\nTotal payroll: 117000\nHighest paid: Kiran' },
          { input: '1\nINTERN Sam 12000\n', expectedOutput: 'Sam (Intern): 12000\nEmployees: 1\nTotal payroll: 12000\nHighest paid: Sam', isHidden: true },
          { input: '2\nINTERN Anu 20000\nINTERN Bala 20000\n', expectedOutput: 'Anu (Intern): 20000\nBala (Intern): 20000\nEmployees: 2\nTotal payroll: 40000\nHighest paid: Anu', isHidden: true },
          { input: '3\nMANAGER Lata 60000 0\nCONTRACTOR Joe 30000\nENGINEER Raj 50000 0\n', expectedOutput: 'Unknown role: CONTRACTOR\nLata (Manager): 60000\nRaj (Engineer): 50000\nEmployees: 2\nTotal payroll: 110000\nHighest paid: Lata', isHidden: true },
          { input: '0\n', expectedOutput: 'Employees: 0\nTotal payroll: 0\nHighest paid: none', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_JAVA_OOP_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every Java fresher interview. For each: the answer that
gets you through, and the follow-up a good answer earns.

## 1. "What are the four pillars of OOP? Give a Java example of each."

**Model answer.** *Encapsulation*: state is private and changed only through methods that keep it
valid — a \`BankAccount\` with \`deposit\` and \`withdraw\` but no \`setBalance\`. *Abstraction*: callers
depend on what something does, not how — code takes a \`List\`, not an \`ArrayList\`, or a
\`PaymentGateway\` interface. *Inheritance*: a class reuses and specialises another with
\`extends\` — \`SavingsAccount extends Account\`. *Polymorphism*: one call, behaviour chosen by the
object — \`account.monthlyCharge()\` differs for savings and current accounts through overriding;
overloading is the compile-time form.

**Follow-up:** "Encapsulation and abstraction sound the same — what is the difference?"
Encapsulation hides **state** and protects invariants inside one class; abstraction hides
**implementation** behind a contract so callers can swap it. A class can be well encapsulated and
still expose a concrete type everywhere (poor abstraction).

## 2. "Abstract class or interface — how do you choose?"

**Model answer.** An interface is a contract with no instance state; a class can implement many,
so it suits capabilities shared by unrelated classes (\`Comparable\`, \`Runnable\`). An abstract
class can hold fields and constructors and finished methods, but a class can extend only one, so
it suits a family of closely related classes sharing state or an algorithm (a template method).
Since Java 8 interfaces have default and static methods, so "interfaces have no code" is no longer
the distinction — **state and single inheritance** are.

**Follow-up:** "Two interfaces give the same default method — what happens?" The class must
override it, and can call \`A.super.method()\` to pick one; otherwise it does not compile.

## 3. "Why must equals and hashCode be overridden together?"

**Model answer.** The contract says equal objects must have equal hash codes. Hash-based
collections look up the bucket by \`hashCode\` first and only then compare with \`equals\`. If
\`equals\` says two keys are equal but \`hashCode\` is still the identity hash, the second key is
searched for in a different bucket: \`map.get\` returns null and a \`HashSet\` stores duplicates.

**Follow-up:** "Can two unequal objects have the same hash code?" Yes — a collision is legal; it
only costs performance. And "what goes wrong if a field in hashCode changes after insertion?" The
object sits in a bucket for its old hash and can no longer be found.

## Answering aloud

Say the definition, give the Java example, then name the trade-off. That third step is what
separates a learned answer from an understood one.`,
    mcqs: [
      mcq('An interviewer asks how encapsulation differs from abstraction. Which answer is most accurate?', [
        ['They are the same idea under two different names', false],
        ['Encapsulation protects state; abstraction hides the implementation', true],
        ['Encapsulation needs interfaces; abstraction needs private fields', false],
        ['Abstraction is compile-time; encapsulation happens at runtime', false],
      ], 'Encapsulation keeps a class\'s state private and valid; abstraction lets callers depend on a contract instead of a concrete implementation. They support each other but answer different questions.'),
      mcq('Since Java 8 interfaces can have default methods. What still separates an interface from an abstract class?', [
        ['Interfaces may not contain any method bodies at all', false],
        ['Only an abstract class has instance state and constructors', true],
        ['Only an interface may declare abstract methods', false],
        ['An abstract class may be implemented by many classes', false],
      ], 'Interfaces can now carry behaviour, but not instance fields or constructors, and a class may implement many of them while extending only one class. State and single inheritance are the real difference.'),
      mcq('Follow-up: two unequal objects return the same hashCode. What is the consequence?', [
        ['The contract is broken, and HashMap will lose one of them', false],
        ['Nothing breaks; lookups may just be a little slower', true],
        ['equals is skipped for them, so both count as equal', false],
        ['The JVM throws an IllegalStateException on insertion', false],
      ], 'Collisions are allowed. Both objects land in the same bucket and equals tells them apart; the only cost is a longer search within that bucket.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_OOP_MINI_PROJECT',
    notes: `# Mini Project — A Bank Account System

Build a console bank in plain Java (no frameworks). The point is not the banking — it is designing
classes that cannot be put into an invalid state, and using inheritance and interfaces where each
genuinely fits.

## What it does

The program keeps a set of accounts in memory and reads commands from the console:

    OPEN SAVINGS asha 5000
    OPEN CURRENT ravi 0
    DEPOSIT S1 2500
    WITHDRAW C1 300
    TRANSFER S1 C1 1000
    STATEMENT S1
    EXIT

## Requirements

1. **Account types.** An abstract \`Account\` with an id, an owner and a balance held in **paise as
   a long** (never \`double\` for money). Two concrete types:
   - \`SavingsAccount\`: no overdraft; a minimum balance of ₹1,000 must remain after a withdrawal;
     an \`addInterest(rate)\` method.
   - \`CurrentAccount\`: an overdraft limit set at opening (default ₹5,000); the balance may go
     negative down to that limit.
   The withdrawal rule differs by type, so \`canWithdraw(amount)\` is overridden, not decided with
   \`instanceof\`.
2. **Encapsulation.** Balance is private and changes only through \`deposit\` and \`withdraw\`.
   There is no \`setBalance\`. The transaction history is returned as an unmodifiable list.
3. **An interface.** \`InterestBearing\` with \`addInterest(double ratePercent)\`, implemented by
   \`SavingsAccount\` only. A "MONTH END" command applies interest to every account that is
   \`InterestBearing\`.
4. **Transfers.** \`Bank.transfer(from, to, amount)\` withdraws then deposits. If the withdrawal
   is refused, nothing changes on either account.
5. **Input validation.** Non-numeric amounts, zero or negative amounts, unknown account ids and
   unknown commands each print a clear message and leave every balance unchanged. The program never
   crashes on bad input.
6. **Statements.** \`STATEMENT <id>\` prints each transaction (type, amount, balance after) and the
   current balance, formatted as rupees with two decimals.
7. **equals and hashCode** on \`Account\` by id, and a useful \`toString\`.

## Acceptance criteria

- Withdrawing 4,500 from a savings account holding 5,000 is refused (it would leave less than
  1,000); the balance is still 5,000.
- A current account with a 5,000 overdraft can go to −5,000 and no further.
- A refused transfer leaves both balances exactly as they were.
- \`DEPOSIT S1 abc\` and \`DEPOSIT S1 -50\` each print an error and change nothing.
- After MONTH END at 1%, a savings balance of 10,000.00 becomes 10,100.00 and current accounts are
  untouched.
- No field of any account is public, and no \`instanceof\` decides withdrawal rules.

## Stretch goals

Persist accounts to a text file on EXIT and load them on start (after the Exceptions topic); add a
\`FixedDeposit\` type that refuses withdrawals before maturity.

## What to submit

The source files, a README with three sample sessions (including a refused transfer and bad input),
and five sentences explaining why \`Account\` is abstract and \`InterestBearing\` is an interface.`,
    mcqs: [
      mcq('The brief stores balances as a long count of paise rather than a double of rupees. Why?', [
        ['A long uses less memory than a double does', false],
        ['A double cannot hold amounts like 0.10 exactly', true],
        ['Arithmetic on a double is not allowed in Java', false],
        ['A double cannot hold any negative balances', false],
      ], 'Binary floating point cannot represent most decimal fractions exactly, so repeated arithmetic drifts (0.1 + 0.2 is not 0.3). Whole paise in a long are exact; BigDecimal is the other correct choice.'),
      mcq('Savings and current accounts allow different withdrawals. Where should that rule live?', [
        ['In Bank, as an if/else chain using instanceof', false],
        ['In an overridden canWithdraw on each account type', true],
        ['In a public field that callers check before withdrawing', false],
        ['In the main loop, where each command is parsed', false],
      ], 'The rule belongs to the account type, so each subclass overrides canWithdraw and the bank calls it polymorphically. Adding a FixedDeposit then means a new class, not edits to every if/else.'),
    ],
    assignment: {
      title: 'A Bank Account System',
      description: 'A console bank with savings and current accounts, deposits, withdrawals, transfers and statements, designed with encapsulation, inheritance and an interface.',
      instructions: `Build the bank described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The Java source: an abstract \`Account\`, \`SavingsAccount\`, \`CurrentAccount\`, an
   \`InterestBearing\` interface, a \`Bank\` that holds accounts and performs transfers, and a
   \`Main\` that runs the command loop.
2. A README with three sample sessions copied from your console — one normal, one with a refused
   withdrawal or transfer, one with invalid input (a non-numeric amount, a negative amount, an
   unknown account id).
3. Five sentences explaining why \`Account\` is abstract, why \`InterestBearing\` is an interface,
   and how your design stops a balance from being set directly.

**Before you submit, check every acceptance criterion in the brief** by running it, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct banking behaviour', description: 'Deposits, withdrawals, transfers, minimum balance, overdraft limit and month-end interest all behave as the acceptance criteria state; a refused transfer changes nothing.', maxPoints: 30 },
        { criterion: 'Encapsulation', description: 'All fields private; balance changes only through deposit and withdraw; no setBalance; history exposed read-only; money held as paise in a long.', maxPoints: 20 },
        { criterion: 'Inheritance and interface used where they fit', description: 'Abstract Account with overridden canWithdraw; InterestBearing implemented only by savings; no instanceof decides withdrawal rules.', maxPoints: 20 },
        { criterion: 'Input validation', description: 'Non-numeric, zero and negative amounts, unknown ids and unknown commands each give a clear message; the program never crashes on bad input.', maxPoints: 15 },
        { criterion: 'Object methods and explanation', description: 'equals and hashCode by id, a useful toString, and a README whose sample sessions and five sentences justify the design.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'JT_JAVA_OOP_CHECKPOINT',
    notes: `Ten questions across the whole topic: classes and references, constructors, encapsulation,
static and final, inheritance, polymorphism, abstraction and the Object methods. Most show a few
lines of Java and ask what happens. Trace the code by hand — what runs first, which method is
chosen, and whether the compiler would even accept it — before you look at the options.`,
    checkpoint: [
      mcq(`What does this print?

    class Cup { int ml; }

    Cup a = new Cup();
    Cup b = a;
    b = new Cup();
    b.ml = 250;
    System.out.println(a.ml);`, [
        ['250', false],
        ['0', true],
        ['null', false],
        ['It does not compile', false],
      ], 'b briefly shares a\'s Cup, but b = new Cup() re-points b at a second object. Setting b.ml changes only that second Cup; a\'s Cup keeps its default 0.'),
      mcq(`What does new Sedan() print?

    class Car {
        Car() { System.out.print("car "); }
    }
    class Sedan extends Car {
        int doors = 4;
        Sedan() { System.out.print("sedan " + doors); }
    }`, [
        ['sedan 4 car', false],
        ['car sedan 4', true],
        ['car sedan 0', false],
        ['sedan 0 car', false],
      ], 'Car() runs first through the implicit super(), then Sedan\'s field initialiser sets doors to 4, then Sedan\'s body prints. By the time the body runs, doors is 4.'),
      mcq('A `Temperature` class must reject readings below absolute zero. Where does that check belong?', [
        ['In every caller, before it constructs a Temperature', false],
        ['In the constructor and any method that changes the value', true],
        ['In toString, so invalid readings are shown as errors', false],
        ['In a static validate method that callers may choose to use', false],
      ], 'An invariant is protected by the class itself, at every point where state is set. Relying on callers or an optional helper means one forgotten check creates an invalid object.'),
      mcq(`What does this print?

    class Id {
        static int next = 1;
        final int value;
        Id() { value = next++; }
    }

    Id x = new Id();
    Id y = new Id();
    System.out.println(x.value + " " + y.value + " " + Id.next);`, [
        ['1 1 2', false],
        ['1 2 3', true],
        ['1 2 2', false],
        ['2 3 3', false],
      ], 'next is shared. The first constructor takes 1 and bumps next to 2; the second takes 2 and bumps next to 3. Each object keeps its own final value.'),
      mcq(`What does this print?

    class Base { String who() { return "base"; } }
    class Derived extends Base { String who() { return "derived"; } }

    static void show(Base b)    { System.out.print("B:" + b.who() + " "); }
    static void show(Derived d) { System.out.print("D:" + d.who() + " "); }

    Base obj = new Derived();
    show(obj);`, [
        ['D:derived', false],
        ['B:derived', true],
        ['B:base', false],
        ['D:base', false],
      ], 'Two decisions: the overload is chosen at compile time from the declared type Base, so show(Base) runs; inside it, b.who() is overridden and dispatches on the real object, a Derived.'),
      mcq('Which method declaration in a subclass is a valid override of `protected Number value()`?', [
        ['private Number value()', false],
        ['public Integer value()', true],
        ['protected Number value(int scale)', false],
        ['protected String value()', false],
      ], 'An override may widen access (protected to public) and narrow the return type to a subtype (Integer is a Number). private narrows access, a new parameter makes an overload, and String is not a Number.'),
      mcq(`What does this print?

    interface Greeter { default String greet() { return "hello"; } }
    class Polite implements Greeter {
        public String greet() { return Greeter.super.greet() + ", please"; }
    }

    Greeter g = new Polite();
    System.out.println(g.greet());`, [
        ['hello', false],
        ['hello, please', true],
        [', please', false],
        ['It does not compile', false],
      ], 'Polite overrides the default, and dynamic dispatch runs Polite.greet. Greeter.super.greet() explicitly calls the interface\'s default body, giving "hello" before the suffix is added.'),
      mcq('Which class can be instantiated with new?', [
        ['abstract class Report { void print() { } }', false],
        ['class Csv extends Report { }  (Report as above)', true],
        ['interface Exporter { void export(); }', false],
      ], 'Report is abstract, so it cannot be instantiated even though it has no abstract methods, and an interface cannot be instantiated. Csv is concrete and inherits nothing left unimplemented.'),
      mcq('A `Book` class overrides equals to compare ISBNs but leaves hashCode alone. What do you expect from a `HashSet<Book>` given two books with the same ISBN?', [
        ['One element, because equals reports them as the same', false],
        ['Usually two elements, since the hashes differ', true],
        ['A compile error, because hashCode is missing', false],
        ['An exception thrown on the second call to add', false],
      ], 'Without a matching hashCode the two books almost certainly land in different buckets, so the set never compares them with equals and stores both. Nothing in the compiler or runtime warns you.'),
      mcq(`What does this print?

    final class Range {
        private final int[] bounds;
        Range(int[] b) { bounds = b; }
        int low() { return bounds[0]; }
    }

    int[] data = {1, 9};
    Range r = new Range(data);
    data[0] = 5;
    System.out.println(r.low());`, [
        ['1', false],
        ['5', true],
        ['It does not compile: bounds is final', false],
        ['It throws an exception', false],
      ], 'The constructor stored the caller\'s array, not a copy, so changing data changes the Range. final froze the reference only. bounds = b.clone() would make Range truly immutable.'),
    ],
  },
];

/* ══ JT_JAVA_EXCEPTIONS — Exceptions and Files ═══════════════════════════════════════════ */

const EXCEPTION_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_JAVA_EXCEPTIONS_HIERARCHY',
    notes: `An **exception** is an object that describes something going wrong, thrown out of the
normal flow until some code catches it. If nothing catches it, the thread dies and the JVM prints a
stack trace. Every exception type sits in one hierarchy:

    Throwable
    ├── Error                      serious JVM problems — do not catch
    │     OutOfMemoryError, StackOverflowError
    └── Exception
          ├── RuntimeException     UNCHECKED
          │     NullPointerException, IllegalArgumentException,
          │     NumberFormatException, ArithmeticException,
          │     ArrayIndexOutOfBoundsException, IllegalStateException
          └── (everything else)    CHECKED
                IOException, FileNotFoundException, SQLException,
                InterruptedException

## Checked: the compiler makes you deal with it

A **checked** exception is any \`Exception\` that is not a \`RuntimeException\`. The compiler
enforces **handle or declare**: a method that can throw one must either catch it or say
\`throws\` in its signature.

    static String load(Path p) {
        return Files.readString(p);     // compile error:
    }                                   // unreported exception IOException

    static String load(Path p) throws IOException {   // declare it — now it compiles
        return Files.readString(p);
    }

Checked exceptions model failures **outside your program's control** that a caller can reasonably
plan for: a missing file, a dropped connection.

## Unchecked: bugs and broken preconditions

\`RuntimeException\` and its subclasses are **unchecked** — no catch or \`throws\` required. They
usually mean a programming error (a null dereference, a bad index) or a caller breaking a rule
(\`IllegalArgumentException\`). The fix is normally in the code, not a catch block.

    int x = 10 / 0;                       // ArithmeticException: / by zero
    double y = 10.0 / 0;                  // no exception — y is Infinity
    Integer.parseInt("12a");              // NumberFormatException

## Reading a stack trace

    Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3
        at Report.average(Report.java:14)
        at Main.main(Main.java:6)

Read it top down: **the type** and **message** say what; the **first \`at\` line** says where it was
thrown (Report.java line 14); the lines below are who called it. With wrapped exceptions, a
\`Caused by:\` section follows — the deepest "Caused by" is usually the real origin.

## Common mistakes and interview traps

- Catching \`Error\` or \`Throwable\`: you cannot sensibly recover from \`OutOfMemoryError\`.
- Thinking \`NumberFormatException\` is checked — it extends \`IllegalArgumentException\`, a
  \`RuntimeException\`.
- Reading the bottom of a stack trace first. The top frame is where it broke.`,
    mcqs: [
      mcq('Which of these is a checked exception?', [
        ['NullPointerException', false],
        ['IOException', true],
        ['ArithmeticException', false],
        ['IllegalStateException', false],
      ], 'IOException extends Exception but not RuntimeException, so the compiler forces callers to catch or declare it. The other three are RuntimeException subclasses and therefore unchecked.'),
      mcq('`Integer.parseInt("12a")` throws NumberFormatException. Does the calling method have to catch or declare it?', [
        ['Yes, since every exception thrown must be caught or declared', false],
        ['No, since it extends IllegalArgumentException, a RuntimeException', true],
        ['Yes, because parseInt declares it with a throws clause', false],
        ['No, because parseInt returns 0 rather than throwing', false],
      ], 'NumberFormatException sits under IllegalArgumentException under RuntimeException, so it is unchecked. Even though parseInt documents it in throws, the compiler does not enforce handling unchecked types.'),
      mcq(`Which line of this trace names where the exception was thrown?

    Exception in thread "main" java.lang.NullPointerException
        at Invoice.total(Invoice.java:22)
        at Billing.run(Billing.java:9)
        at Main.main(Main.java:4)`, [
        ['Main.java:4, the bottom frame of the trace', false],
        ['Invoice.java:22, the first "at" line', true],
        ['Billing.java:9, the middle of the trace', false],
        ['None of them; the message line gives it', false],
      ], 'Frames are listed from the point of the throw outward. The first at line is where the exception happened; the frames below it are the callers that led there.'),
    ],
    checkpoint: [
      mcq(`What does the compiler say about this method?

    static List<String> read(Path p) {
        return Files.readAllLines(p);
    }`, [
        ['Nothing; any problem appears only at runtime', false],
        ['Error: unreported exception IOException', true],
        ['Warning only: the result might be an empty list', false],
        ['Error: Path cannot be passed to readAllLines', false],
      ], 'Files.readAllLines declares IOException, a checked exception. read neither catches it nor declares throws IOException, so compilation fails.'),
      mcq(`What happens when these two lines run?

    double d = 10.0 / 0;
    int i = 10 / 0;`, [
        ['Both throw ArithmeticException at runtime', false],
        ['d is Infinity; the int line throws ArithmeticException', true],
        ['Both fail to compile as division by a constant zero', false],
        ['d is NaN; the int line sets i to 0', false],
      ], 'Floating-point division follows IEEE 754 and yields Infinity. Integer division by zero has no representable result, so it throws ArithmeticException: / by zero. Neither is a compile error.'),
      mcq('A service occasionally hits `OutOfMemoryError`. Should it wrap each request in `catch (Throwable t)` and carry on?', [
        ['Yes; catching Throwable is the safest way to stay up', false],
        ['No; an Error signals a JVM state code cannot repair', true],
        ['Yes, as long as the catch block logs the stack trace', false],
        ['No; Error cannot be caught at all, so it has no effect', false],
      ], 'Errors such as OutOfMemoryError can be caught syntactically, but the JVM may be in no state to continue. Let them propagate, fix the cause (a leak, a heap setting), and let the process restart.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_TRY_CATCH',
    notes: `## try, catch, finally

    static int parse(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            System.out.println("bad: " + s);
            return -1;
        } finally {
            System.out.println("done " + s);
        }
    }

    parse("42");   // prints: done 42          returns 42
    parse("x");    // prints: bad: x, done x   returns -1

\`try\` holds code that might fail; a \`catch\` runs if a matching exception is thrown; \`finally\`
runs **whether or not** anything was thrown — even when the try or catch returns. It is where
cleanup used to go before try-with-resources.

## Catch the specific thing, in the right order

Catch blocks are tried top to bottom, and the first match wins. A subclass must come **before** its
superclass:

    try { ... }
    catch (FileNotFoundException e) { ... }   // specific first
    catch (IOException e) { ... }             // then the general case

Reversing them is a compile error — \`FileNotFoundException\` "has already been caught", so its block
would be unreachable.

**Multi-catch** handles unrelated types the same way: \`catch (NumberFormatException |
DateTimeParseException e)\`. The alternatives may **not** be subclasses of each other.

## throw and throws

\`throw\` raises an exception now; \`throws\` in a signature declares what a method may raise.

    void setQuantity(int q) {
        if (q < 0) throw new IllegalArgumentException("quantity must be >= 0, was " + q);
        this.quantity = q;
    }

## Rethrowing without losing the cause

    try {
        return Files.readString(path);
    } catch (IOException e) {
        throw new ConfigException("Cannot read " + path, e);   // keep e as the cause
    }

Passing \`e\` keeps the original stack trace under "Caused by:". Dropping it destroys the evidence.

## Never swallow

    catch (Exception e) { }    // the bug is now invisible

At minimum log it; better, handle it or let it propagate.

## Common mistakes and interview traps

- \`return\` inside \`finally\` **replaces** any return value or exception from try/catch — the
  exception vanishes. Never return from finally.
- Changing a local variable in \`finally\` after \`return x;\` does not change what is returned —
  the value was already evaluated.
- \`finally\` does not run if the JVM halts: \`System.exit()\` inside try, or the process is killed.
- Catching a checked exception the try block cannot throw is a compile error.`,
    mcqs: [
      mcq(`What does parse("x") print, and what does it return?

    static int parse(String s) {
        try { return Integer.parseInt(s); }
        catch (NumberFormatException e) { System.out.println("bad"); return -1; }
        finally { System.out.println("done"); }
    }`, [
        ['Prints "bad" only, and returns -1', false],
        ['Prints "bad" then "done", and returns -1', true],
        ['Prints "done" then "bad", and returns -1', false],
        ['Prints "bad" then "done", and returns 0', false],
      ], 'parseInt throws, the catch prints bad and evaluates return -1, and before the method actually returns, finally runs and prints done. The pending return value -1 is then returned.'),
      mcq('What does the compiler do with `catch (FileNotFoundException | IOException e)`?', [
        ['Accepts it and catches both types in one block', false],
        ['Rejects it: the two types are related by subclassing', true],
        ['Accepts it but only ever catches the IOException', false],
        ['Rejects it: multi-catch works only for unchecked types', false],
      ], 'FileNotFoundException is a subclass of IOException, so listing both is redundant, and Java makes it an error. catch (IOException e) alone already covers both.'),
      mcq(`What does f() return?

    static int f() {
        try { throw new RuntimeException("boom"); }
        finally { return 7; }
    }`, [
        ['It throws RuntimeException("boom")', false],
        ['7, and the exception is silently discarded', true],
        ['It does not compile: try needs a catch', false],
        ['0, the default value for an int return', false],
      ], 'A return in finally completes the method normally and overrides the pending exception, which is lost without a trace. This is why returning from finally is treated as a bug.'),
    ],
    checkpoint: [
      mcq(`What does the compiler do with this?

    try {
        Files.readString(path);
    } catch (Exception e) {
        System.out.println("failed");
    } catch (IOException e) {
        System.out.println("io");
    }`, [
        ['Accepts it; IOException goes to the second block', false],
        ['Rejects it: IOException has already been caught', true],
        ['Accepts it; whichever block is more specific wins', false],
        ['Accepts it with a warning about the catch order', false],
      ], 'Catch blocks are matched in order, and catch (Exception) already matches every IOException, so the second block could never run. Java reports unreachable catch blocks as errors.'),
      mcq(`What does g() return?

    static int g() {
        int x = 1;
        try { return x; }
        finally { x = 99; }
    }`, [
        ['99', false],
        ['1', true],
        ['0', false],
        ['It does not compile', false],
      ], 'return x evaluates x (1) and saves that value before finally runs. Reassigning the local in finally does not change the saved return value.'),
      mcq(`What happens with this method?

    void check(int age) {
        if (age < 0) throw new Exception("negative age");
    }`, [
        ['It compiles, and throws when age is negative', false],
        ['Compile error: unreported exception Exception', true],
        ['It compiles, but the throw statement is ignored', false],
        ['Compile error: throw needs to be inside a try', false],
      ], 'Exception itself is checked. A method that throws it must declare throws Exception (or catch it). For a bad argument, IllegalArgumentException is the unchecked type that fits.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_RESOURCES_FILES',
    notes: `Files, sockets and database connections hold operating-system resources. Open too many
without closing them and the program eventually fails with "Too many open files". The job is to
**always close what you open**, even when an exception is thrown.

## try-with-resources

    Path path = Path.of("scores.txt");
    try (BufferedReader reader = Files.newBufferedReader(path)) {
        String line;
        while ((line = reader.readLine()) != null) {
            System.out.println(line.toUpperCase());
        }
    }   // reader.close() runs here — success or exception

Anything declared in the parentheses must implement \`AutoCloseable\`. It is closed automatically
when the block ends, however it ends. Several resources are separated by semicolons and closed in
**reverse** order:

    class Res implements AutoCloseable {
        private final String name;
        Res(String name) { this.name = name; System.out.println("open " + name); }
        public void close() { System.out.println("close " + name); }
    }

    try (Res a = new Res("A"); Res b = new Res("B")) {
        System.out.println("body");
    }

Output:

    open A
    open B
    body
    close B
    close A

If the body throws **and** \`close()\` throws, the body's exception propagates and the close
exception is attached to it as **suppressed** (\`e.getSuppressed()\`) — the original failure is
never hidden. The old \`finally { reader.close(); }\` style got that wrong.

## Reading and writing files

    // small files: whole thing in one call
    List<String> lines = Files.readAllLines(path);          // UTF-8 by default
    String text = Files.readString(path);                   // Java 11+
    Files.write(path, List.of("asha 82", "ravi 74"));       // creates or overwrites
    Files.writeString(path, "done\\n", StandardOpenOption.APPEND);

    // large files: a line at a time, never the whole file in memory
    try (Stream<String> stream = Files.lines(path)) {
        long passed = stream.filter(l -> Integer.parseInt(l.split(" ")[1]) >= 40).count();
    }

\`readLine()\` returns \`null\` at end of file — that is the loop's stop condition. \`Files.lines\`
holds the file open, so it too belongs in try-with-resources.

All of these throw \`IOException\` (checked): \`NoSuchFileException\` when the file is missing,
\`AccessDeniedException\` without permission.

## Common mistakes and interview traps

- \`Files.write\` with default options **truncates** an existing file. Pass \`APPEND\` to add.
- Using \`FileReader\` without a charset on older JDKs picks the platform default encoding and
  mangles non-ASCII text; \`Files\` methods default to UTF-8.
- Reading a huge log with \`readAllLines\` and running out of memory.
- Opening a stream in a loop and closing it only after the loop.`,
    mcqs: [
      mcq(`Res prints "open X" when created and "close X" when closed. What does this print?

    try (Res a = new Res("A"); Res b = new Res("B")) {
        System.out.println("body");
    }`, [
        ['open A, open B, body, close A, close B', false],
        ['open A, open B, body, close B, close A', true],
        ['open A, body, close A, open B, close B', false],
        ['open B, open A, body, close A, close B', false],
      ], 'Resources open in declaration order and close in reverse, like a stack, so a resource that depends on an earlier one is closed before the thing it depends on.'),
      mcq('What does `BufferedReader.readLine()` return once the end of the file is reached?', [
        ['An empty string', false],
        ['null', true],
        ['It throws EOFException', false],
        ['The last line again', false],
      ], 'readLine returns null at end of stream, which is why the loop condition is (line = reader.readLine()) != null. An empty string means a genuinely blank line in the file.'),
      mcq('Which object may be declared inside the parentheses of a try-with-resources statement?', [
        ['Any object at all, since close() is found by reflection', false],
        ['One whose class implements AutoCloseable', true],
        ['Only java.io classes that extend InputStream', false],
        ['Only objects that already have a finalize() method', false],
      ], 'The language requires AutoCloseable (Closeable extends it), because the compiler generates a call to close(). Your own classes can implement it and be used the same way.'),
    ],
    checkpoint: [
      mcq('In try-with-resources, the body throws IllegalStateException and then `close()` throws IOException. What reaches the caller?', [
        ['The IOException, since close() ran last', false],
        ['The IllegalStateException, carrying the IOException as suppressed', true],
        ['Both of them, as two separate exceptions in turn', false],
        ['Neither, because try-with-resources swallows close errors', false],
      ], 'The primary failure is preserved. The exception from close is attached via addSuppressed and is visible through getSuppressed(), so no evidence is lost.'),
      mcq(`What is wrong with this code?

    long count = Files.lines(path).filter(l -> l.contains("ERROR")).count();`, [
        ['Files.lines reads the whole file into memory first', false],
        ['The stream is never closed, so the file handle leaks', true],
        ['count() cannot be called on a Stream of lines', false],
        ['filter cannot be used with a lambda on a Stream', false],
      ], 'Files.lines keeps the file open until the stream is closed, and terminal operations do not close it. Declaring the stream in try-with-resources releases the handle.'),
      mcq('`report.txt` already holds 50 lines. What does `Files.write(path, List.of("total 9"))` leave in it?', [
        ['The 50 lines followed by "total 9"', false],
        ['Only the line "total 9"', true],
        ['It throws FileAlreadyExistsException', false],
        ['"total 9" followed by the 50 old lines', false],
      ], 'With no options, Files.write uses CREATE, TRUNCATE_EXISTING and WRITE, so the old content is discarded. Pass StandardOpenOption.APPEND to add to the end instead.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_CUSTOM',
    notes: `The JDK's exceptions describe technical failures. Your code also has **domain** failures —
an overdrawn account, a seat already booked — and a custom exception lets you name them, carry the
relevant data, and let callers catch exactly that case.

## Writing one

    public class InsufficientFundsException extends Exception {
        private final long shortByPaise;

        public InsufficientFundsException(long shortByPaise) {
            super("Insufficient funds: short by " + shortByPaise + " paise");
            this.shortByPaise = shortByPaise;
        }
        public long getShortByPaise() { return shortByPaise; }
    }

    public void withdraw(long paise) throws InsufficientFundsException {
        if (paise > balance) throw new InsufficientFundsException(paise - balance);
        balance -= paise;
    }

    try {
        account.withdraw(9000);
    } catch (InsufficientFundsException e) {
        System.out.println(e.getMessage());          // Insufficient funds: short by 4000 paise
        System.out.println(e.getShortByPaise());     // 4000
    }

Pass the message to \`super(...)\` so \`getMessage()\` and the stack trace show it. Provide a
\`(String message, Throwable cause)\` constructor too whenever you wrap a lower-level exception.

## Checked or unchecked?

- **Extend \`Exception\` (checked)** when the caller can reasonably recover and should be forced to
  think about it: insufficient funds, a payment declined.
- **Extend \`RuntimeException\` (unchecked)** for programming errors and for failures the caller
  cannot do anything about at that level. Modern frameworks lean this way — Spring translates
  \`SQLException\` into the unchecked \`DataAccessException\` — because checked exceptions on every
  layer clutter signatures without adding handling.

## Throw, or return something?

- An exception is for the **exceptional**: the method could not do what its name promised.
- A missing result that is a **normal outcome** is not exceptional: \`findUser(email)\` that often
  finds nobody should return \`Optional<User>\`, not throw.
- Never use exceptions for ordinary control flow (looping until an exception). They are slow to
  create and hide the logic.
- Do not return error codes like \`-1\` from methods that compute values; a caller forgets to check,
  and \`-1\` flows on as data.

## Wrap at layer boundaries

    try {
        return repository.load(id);
    } catch (SQLException e) {
        throw new OrderLoadException("Could not load order " + id, e);   // keep the cause
    }

The caller sees an error in its own vocabulary, and the stack trace still shows the SQL cause.

## Common mistakes and interview traps

- A custom exception with no message, so the log says only \`OrderLoadException\`.
- Wrapping without the cause — the real error disappears.
- One generic \`AppException\` for everything, which nobody can catch selectively.`,
    mcqs: [
      mcq('`SeatTakenException extends RuntimeException`. What does that mean for a method that throws it?', [
        ['It must declare throws SeatTakenException in its signature', false],
        ['Callers may catch it, but the compiler does not force them', true],
        ['It can never be caught, because it is a runtime error', false],
        ['It must be thrown from inside a try block to compile', false],
      ], 'Extending RuntimeException makes the exception unchecked. It can be caught like any other, but neither a throws clause nor a catch is required by the compiler.'),
      mcq(`Why pass e as the second argument here?

    catch (SQLException e) {
        throw new OrderLoadException("Could not load order " + id, e);
    }`, [
        ['It makes OrderLoadException a checked exception', false],
        ['It keeps the SQL failure as the cause in the trace', true],
        ['It stops the SQLException from being thrown twice', false],
        ['Java requires every rethrow to pass the original', false],
      ], 'The cause is chained, so the stack trace shows "Caused by: java.sql.SQLException ..." under the new exception. Without it, the real reason for the failure is lost.'),
      mcq('`findUserByEmail` often finds no user, and that is a normal outcome. What should it do when nobody matches?', [
        ['Throw a checked UserNotFoundException every time', false],
        ['Return Optional.empty() so callers handle absence', true],
        ['Return a User object whose fields are all null', false],
        ['Return null and document it in a code comment', false],
      ], 'Absence here is expected, not exceptional. Optional makes it part of the return type so the caller must deal with it, without the cost and noise of an exception or the trap of a null.'),
    ],
    checkpoint: [
      mcq(`What happens with this code?

    class AppException extends Exception { }

    void run() {
        throw new AppException();
    }`, [
        ['It compiles, and run throws AppException when called', false],
        ['Compile error: unreported exception AppException', true],
        ['Compile error: AppException needs a constructor', false],
        ['It compiles, because custom exceptions are unchecked', false],
      ], 'AppException extends Exception, not RuntimeException, so it is checked. run must declare throws AppException or catch it. The default constructor is supplied automatically.'),
      mcq(`What does this print?

    class ValidationException extends RuntimeException {
        ValidationException(String msg) { super(msg); }
    }

    try { throw new ValidationException("Age must be positive"); }
    catch (ValidationException e) { System.out.println(e.getMessage()); }`, [
        ['null', false],
        ['Age must be positive', true],
        ['ValidationException', false],
        ['ValidationException: Age must be positive', false],
      ], 'super(msg) stores the message in Throwable, and getMessage() returns it as given. The class-name prefix appears in toString() and stack traces, not in getMessage().'),
      mcq('An `OrderLoadException` was thrown with `new OrderLoadException("load failed", sqlEx)`. What does `e.getCause()` return?', [
        ['null, since causes are only shown in the stack trace', false],
        ['The SQLException that was passed in as the cause', true],
        ['The string "load failed" that was passed first', false],
        ['A new copy of the OrderLoadException itself', false],
      ], 'The (message, cause) constructor stores the wrapped exception, and getCause() returns that same object, so handlers and logs can inspect the original failure.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_DEBUGGING',
    notes: `Four exception bugs that compile, pass a quick test, and fail in production. In each: the
symptom, the cause, and the one change that fixes it.

## 1. The swallowed exception

    try {
        price = Integer.parseInt(field);
    } catch (NumberFormatException e) {
    }
    order.setPrice(price);   // price is still 0

**Symptom:** orders appear with a price of zero and no error anywhere. **Cause:** the empty catch
discarded the only evidence. **Fix:** decide what bad input means — reject it
(\`throw new IllegalArgumentException("Bad price: " + field, e)\`) or report it to the user. An
empty catch is never the answer; if ignoring really is right, write a comment saying why.

## 2. The resource that is never closed

    BufferedReader reader = new BufferedReader(new FileReader(file));
    String header = reader.readLine();
    if (header == null) return;      // early return — reader never closed
    process(reader);
    reader.close();                  // skipped too if process throws

**Symptom:** after hours of uptime, "Too many open files". **Cause:** every early return or
exception leaks a file handle. **Fix:**

    try (BufferedReader reader = Files.newBufferedReader(file)) {
        ...
    }

## 3. Catching Exception too broadly

    try {
        Customer c = repo.find(id);
        send(c.getEmail());
    } catch (Exception e) {
        log.warn("Email service is down");
    }

**Symptom:** the log says the email service is down, but it is fine. **Cause:** \`repo.find\`
returned \`null\` and \`c.getEmail()\` threw \`NullPointerException\`, which \`catch (Exception e)\`
also caught — and the message lied about it. **Fix:** catch only what the block expects
(\`catch (MailException e)\`) and let programming errors surface.

## 4. Catch blocks in the wrong order

    try {
        config = Files.readString(path);
    } catch (IOException e) {
        System.out.println("Could not read config");
    } catch (NoSuchFileException e) {
        System.out.println("Config missing, using defaults");
    }

**Symptom:** compile error — exception NoSuchFileException has already been caught. **Cause:**
\`NoSuchFileException\` extends \`IOException\`, so the first block already catches it and the second
is unreachable. **Fix:** put the specific catch first.

## How to approach any exception bug

1. Find the **first** exception in the log and its **first** \`at\` line. 2. Read every
"Caused by". 3. Ask: is this catch block hiding something it never meant to catch?`,
    mcqs: [
      mcq('In bug 1, orders are saved with price 0 and nothing is logged. What is the root cause?', [
        ['parseInt returns 0 when the text is not a number', false],
        ['The empty catch block discards NumberFormatException', true],
        ['NumberFormatException is checked and was not declared', false],
        ['The price field was never initialised by a constructor', false],
      ], 'parseInt throws for bad input; the empty catch swallows it, and the code carries on with price at its old value of 0. The symptom appears far from the cause because no one is told.'),
      mcq('In bug 2, the reader is closed on the last line. Why does the program still run out of file handles?', [
        ['close() on a BufferedReader leaves the FileReader open', false],
        ['The early return and any exception skip that close()', true],
        ['File handles are only released when the JVM exits', false],
        ['readLine opens a new file handle on every call', false],
      ], 'A close on the happy path is skipped by every other path out of the method. try-with-resources closes the reader on every exit, normal or exceptional.'),
      mcq('In bug 3, why did the log blame the email service for a NullPointerException?', [
        ['The email service throws NullPointerException on failure', false],
        ['catch (Exception) also catches NPE, and the log guessed', true],
        ['log.warn turns every exception into the same message', false],
        ['NullPointerException is an Error, so it skips the catch', false],
      ], 'NullPointerException is a RuntimeException, which is an Exception, so the broad catch took it and printed a message written for a different failure. Catch only the types the block expects.'),
      mcq('In bug 4, the compiler rejects the second catch block. What is the fix?', [
        ['Change the second catch to catch (Exception e)', false],
        ['Move the NoSuchFileException catch above the IOException one', true],
        ['Combine both into catch (IOException | NoSuchFileException e)', false],
        ['Add throws IOException to the method signature', false],
      ], 'The subclass must be caught first so it gets its own handling; the IOException block then handles every other I/O failure. A multi-catch of related types is itself a compile error.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_PRACTICE',
    notes: `No new ideas — repetition until handling an exception is a decision, not a reflex. Write
each one, run it with good and bad input, and read the output.

**Exercise 1 — Safe division.** Read two integers and print their quotient. Handle a zero divisor
and non-numeric input with two separate catch blocks that print different messages. Then try
\`10.0 / 0\` and explain why no exception appears.

**Exercise 2 — Trace finally.** Predict, then run:

    static String step() {
        try { System.out.print("try "); return "R"; }
        finally { System.out.print("finally "); }
    }
    System.out.println(step());

**Exercise 3 — Count lines safely.** Write \`countLines(Path)\` using try-with-resources and
\`BufferedReader\`. Call it on a file that exists and one that does not, and print the exception's
class name for the missing one.

**Exercise 4 — A custom exception.** Write \`InvalidMarksException\` (checked) carrying the
offending value. \`Grade.of(int marks)\` throws it outside 0–100. Catch it in \`main\` and print
the value from the exception.

**Exercise 5 — Wrap with a cause.** Make a method read a config file and rethrow its
\`IOException\` as an unchecked \`ConfigException\` with the cause attached. Print
\`e.getCause().getClass().getSimpleName()\` to prove the cause survived.

## The graded exercise — Quantity totals

Read lines of input, total the valid quantities, and report the invalid ones without crashing.
The catch order matters: \`NumberFormatException\` is itself an \`IllegalArgumentException\`.`,
    mcqs: [
      mcq('In Exercise 1, the divisor is 0 and both values are int. Which exception do you catch?', [
        ['NumberFormatException', false],
        ['ArithmeticException', true],
        ['IllegalArgumentException', false],
        ['No exception is thrown', false],
      ], 'Integer division by zero throws ArithmeticException (/ by zero). NumberFormatException comes from parsing non-numeric text, the other case the exercise asks you to handle.'),
      mcq('What does Exercise 2 print?', [
        ['try R finally', false],
        ['try finally R', true],
        ['finally try R', false],
        ['try R', false],
      ], 'step prints "try ", evaluates return "R", then runs finally and prints "finally " before control returns. Only then does println print the returned R.'),
      mcq('In Exercise 3, `Files.newBufferedReader` is called on a path that does not exist. What is thrown?', [
        ['FileNotFoundException, an unchecked exception', false],
        ['NoSuchFileException, a subclass of IOException', true],
        ['NullPointerException from the reader variable', false],
        ['Nothing; the reader is created with no lines', false],
      ], 'The NIO Files methods throw java.nio.file.NoSuchFileException, which extends IOException (checked). The older FileReader throws FileNotFoundException, also an IOException.'),
      mcq('In Exercise 4, `InvalidMarksException` extends Exception. What must `Grade.of` have?', [
        ['A catch block inside it for InvalidMarksException', false],
        ['A throws InvalidMarksException clause', true],
        ['A return of null wherever marks are invalid', false],
        ['Nothing extra; custom exceptions are unchecked', false],
      ], 'The exception is checked, so the method that throws it must declare it, and every caller must then catch or declare it in turn — that is the point of making it checked.'),
      mcq('In the graded exercise, why must `catch (NumberFormatException e)` appear before `catch (IllegalArgumentException e)`?', [
        ['Checked exceptions must always be caught first', false],
        ['It is a subclass, so after the parent it is unreachable', true],
        ['The order of catch blocks makes no difference', false],
        ['IllegalArgumentException cannot be caught at all', false],
      ], 'NumberFormatException extends IllegalArgumentException. The first matching catch wins, so the parent placed first would take every parse error, and the compiler rejects the unreachable child block.'),
    ],
    assignment: {
      title: 'Quantity Totals with Error Handling',
      description: 'Read quantities line by line, total the valid ones, and report invalid numbers and negative values without crashing.',
      instructions: `Write a Java program that reads quantities from standard input until the input ends.

**Input**

Any number of lines. Each line holds one quantity as text, possibly with spaces around it. Blank
lines are ignored.

**Rules**

- Write a method \`static int parseQuantity(String text)\` that uses \`Integer.parseInt\` and, if the
  number is negative, throws \`new IllegalArgumentException(...)\`.
- In the reading loop, call it inside \`try\`, and handle the two failures in **separate** catch
  blocks:
  - text that is not a whole number that fits in an \`int\` (for example \`abc\`, \`2.5\`,
    \`99999999999\`): print \`Invalid number: <text>\`
  - a negative number: print \`Negative value: <text>\`
  where \`<text>\` is the line with surrounding spaces removed. Each is counted as an error.
- Every other line is a valid quantity: add it to the total.

Remember that \`NumberFormatException\` is a subclass of \`IllegalArgumentException\` — the order of
your catch blocks decides which message is printed.

**Output**

The error messages in input order as they happen, then:

    Total: <sum of valid quantities>
    Valid: <count of valid lines>
    Errors: <count of invalid lines>

**Example**

Input:

    12
    7
    abc
    -3
    5

Output:

    Invalid number: abc
    Negative value: -3
    Total: 24
    Valid: 3
    Errors: 2

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
handling marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Messages, total and counts are right for every test case, including blank lines, out-of-range numbers, decimals and zero.', maxPoints: 60 },
        { criterion: 'Exception handling', description: 'parseQuantity throws IllegalArgumentException for negatives; two separate catch blocks in the right order; nothing is swallowed and nothing crashes the program.', maxPoints: 30 },
        { criterion: 'Reading until end of input', description: 'Input is read line by line until it ends (readLine returning null, or hasNextLine false), with no fixed line count assumed.', maxPoints: 10 },
      ],
      totalPoints: 100,
      coding: {
        language: 'java',
        starter: `import java.io.*;

public class Main {
    // TODO: static int parseQuantity(String text) — parse, and throw IllegalArgumentException if negative

    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));

        // TODO: read lines until readLine() returns null; skip blank lines
        // TODO: try parseQuantity; catch NumberFormatException and IllegalArgumentException separately
        // TODO: print Total, Valid and Errors
    }
}
`,
        tests: [
          { input: '12\n7\nabc\n-3\n5\n', expectedOutput: 'Invalid number: abc\nNegative value: -3\nTotal: 24\nValid: 3\nErrors: 2' },
          { input: '10\n20\n30\n', expectedOutput: 'Total: 60\nValid: 3\nErrors: 0' },
          { input: 'x\ny\n', expectedOutput: 'Invalid number: x\nInvalid number: y\nTotal: 0\nValid: 0\nErrors: 2', isHidden: true },
          { input: '99999999999\n4\n\n2.5\n', expectedOutput: 'Invalid number: 99999999999\nInvalid number: 2.5\nTotal: 4\nValid: 1\nErrors: 2', isHidden: true },
          { input: '-1\n0\n  8  \n', expectedOutput: 'Negative value: -1\nTotal: 8\nValid: 2\nErrors: 1', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_INTERVIEW_QUESTION',
    notes: `Three exception questions from real Java interviews, each with an answer that works and
the follow-up it invites.

## 1. "What is the difference between checked and unchecked exceptions?"

**Model answer.** Checked exceptions extend \`Exception\` but not \`RuntimeException\`; the
compiler enforces handle-or-declare, so a method must catch them or list them in \`throws\`. They
model recoverable conditions outside the program's control — \`IOException\`, \`SQLException\`.
Unchecked exceptions extend \`RuntimeException\` (and \`Error\` is unchecked too); the compiler
does not enforce handling. They usually indicate programming errors or violated preconditions —
\`NullPointerException\`, \`IllegalArgumentException\`. The fix for those is in the code, not a
catch block.

**Follow-up:** "Which would you use for your own exception?" Checked when the caller can and
should recover (a payment declined); unchecked otherwise. Mention that Spring wraps checked
\`SQLException\` in unchecked \`DataAccessException\` because forcing every layer to declare it
adds noise without adding handling.

## 2. "Does finally always run?"

**Model answer.** It runs whether the try completes normally, returns, or throws — including when
the catch rethrows. It does **not** run if the JVM stops first: \`System.exit()\` in the try, the
process being killed, or a crash of the JVM itself. An infinite loop in the try also means it never
gets there.

**Follow-up:** "What if both try and finally return?" The finally's return wins and replaces the
try's value — or silently discards an exception that was propagating. That is why returning from
finally is a bug pattern. And "if finally changes the variable that try returned?" — for a
primitive, the returned value was already evaluated and does not change.

## 3. "What is try-with-resources and why use it?"

**Model answer.** A try statement that declares resources implementing \`AutoCloseable\`; each is
closed automatically when the block exits, in reverse order of declaration, on every path. It
replaces hand-written \`finally { if (r != null) r.close(); }\` blocks, which were verbose and
could hide the original exception if \`close()\` also threw.

**Follow-up:** "What happens if the body and close() both throw?" The body's exception propagates,
and the close exception is attached to it as suppressed, retrievable with \`getSuppressed()\`.
Since Java 9 an existing effectively-final variable can be listed: \`try (reader) { ... }\`.

## Answering aloud

Define, give one Java type as an example, then the trap. Interviewers listen for the trap.`,
    mcqs: [
      mcq('Which statement about Error and the checked/unchecked split is correct?', [
        ['Error is checked, because it does not extend RuntimeException', false],
        ['Error is unchecked, alongside RuntimeException', true],
        ['Error is checked only when a method declares it in throws', false],
        ['Error is neither; it sits outside the Throwable hierarchy', false],
      ], 'The compiler only enforces handling for Throwable subclasses that are neither RuntimeException nor Error. Error and its subclasses are unchecked by definition.'),
      mcq('In which situation does a finally block NOT run?', [
        ['The catch block rethrows a new exception', false],
        ['The try block calls System.exit(0)', true],
        ['The try block executes a return statement', false],
        ['No catch matches the thrown exception', false],
      ], 'System.exit halts the JVM, so control never reaches finally. In every other listed case finally runs before the method returns or the exception continues outward.'),
      mcq('Before try-with-resources, a `finally` block closed the reader by hand. What could go wrong when `close()` also threw?', [
        ['The original exception from the body was replaced and lost', true],
        ['The JVM threw an error, as two exceptions cannot coexist', false],
        ['The reader was closed twice, corrupting the open file', false],
        ['Nothing at all; finally always kept the first exception', false],
      ], 'An exception thrown from finally replaces the one already propagating, so the real failure disappeared. try-with-resources keeps the primary exception and records the close failure as suppressed.'),
    ],
  },

  {
    unitCode: 'JT_JAVA_EXCEPTIONS_CHECKPOINT',
    notes: `Ten questions across the topic: the hierarchy, try/catch/finally, try-with-resources and
files, and custom exceptions. Most are short pieces of code. For each, decide first whether it
compiles, then what runs and in what order.`,
    checkpoint: [
      mcq(`What does this print?

    try {
        int[] marks = new int[2];
        marks[2] = 90;
        System.out.print("stored ");
    } catch (ArrayIndexOutOfBoundsException e) {
        System.out.print("index ");
    } finally {
        System.out.print("end");
    }`, [
        ['stored end', false],
        ['index end', true],
        ['stored index end', false],
        ['index', false],
      ], 'Valid indexes are 0 and 1, so marks[2] throws before "stored" is printed. The catch prints "index " and finally always prints "end".'),
      mcq(`Does this compile?

    try {
        int n = Integer.parseInt(text);
    } catch (IOException e) {
        System.out.println("io");
    }`, [
        ['Yes; the catch block simply never runs', false],
        ['No: IOException is never thrown in the try', true],
        ['Yes, but only if the method declares throws', false],
        ['No: parseInt must be caught as Exception', false],
      ], 'Catching a checked exception that the try block cannot throw is a compile error. The rule does not apply to unchecked types or to Exception itself, which may always be caught.'),
      mcq('A method reads a settings file whose absence the caller can sensibly handle by using defaults. Which exception design fits best?', [
        ['Throw NullPointerException when the file is missing', false],
        ['Let a checked IOException propagate to the caller', true],
        ['Catch it inside, print a message, and return null', false],
        ['Throw an Error so the program stops immediately', false],
      ], 'A missing file is an external, recoverable condition, which is what checked exceptions are for: the caller is made to decide (fall back to defaults). Printing and returning null hides it; Error is for JVM failures.'),
      mcq(`What does this print?

    static int count() {
        int n = 0;
        try {
            n = 1;
            throw new IllegalStateException();
        } catch (IllegalStateException e) {
            n = 2;
            return n;
        } finally {
            n = 3;
        }
    }

    System.out.println(count());`, [
        ['1', false],
        ['2', true],
        ['3', false],
        ['It throws IllegalStateException', false],
      ], 'The catch evaluates return n with n equal to 2 and saves that value. finally then sets the local to 3, which does not affect the value already being returned.'),
      mcq(`What happens with this method?

    static void save(String text) {
        try (BufferedWriter w = Files.newBufferedWriter(Path.of("out.txt"))) {
            w.write(text);
        }
    }`, [
        ['It compiles; try-with-resources handles the IOException', false],
        ['Compile error: IOException is neither caught nor declared', true],
        ['Compile error: a try statement needs a finally block', false],
        ['It compiles; write never throws a checked exception', false],
      ], 'try-with-resources closes the writer but does not catch anything. newBufferedWriter, write and the implicit close all throw IOException, so save must catch it or declare throws IOException.'),
      mcq('A try-with-resources body throws, and closing the resource throws too. How can the caller see the close failure?', [
        ['Through e.getCause() on the exception it caught', false],
        ['Through e.getSuppressed() on the exception it caught', true],
        ['It cannot; the close exception is discarded entirely', false],
        ['It is the exception the caller catches, not the body\'s', false],
      ], 'The body\'s exception is the one thrown to the caller, and the close exception is attached with addSuppressed. getCause is for deliberate wrapping, not for this.'),
      mcq(`What does this print?

    class QuotaException extends RuntimeException {
        QuotaException(String m) { super(m); }
    }

    try {
        throw new QuotaException("limit 5");
    } catch (IllegalStateException e) {
        System.out.println("state");
    } catch (RuntimeException e) {
        System.out.println("runtime " + e.getMessage());
    }`, [
        ['state', false],
        ['runtime limit 5', true],
        ['runtime null', false],
        ['It does not compile', false],
      ], 'QuotaException is a RuntimeException but not an IllegalStateException, so the first catch does not match and the second does. The message was passed to super, so getMessage returns "limit 5".'),
      mcq(`Why is this catch block a problem in production code?

    try {
        invoice.send();
    } catch (Exception e) {
        // ignore
    }`, [
        ['Exception cannot be caught without a throws clause', false],
        ['Every failure, including bugs, vanishes without a trace', true],
        ['It slows down send() because catching is expensive', false],
        ['It catches Errors as well, which crashes the JVM', false],
      ], 'Catching Exception and doing nothing hides every failure — network errors and NullPointerExceptions alike — so nobody learns the invoice was never sent. Catch what you expect and handle or log it.'),
      mcq('A loop calls `Files.readAllLines` on a 6 GB log file and the program dies. What is the better approach?', [
        ['Call readAllLines on a background thread instead', false],
        ['Stream lines with BufferedReader or Files.lines', true],
        ['Catch OutOfMemoryError and then retry the call', false],
        ['Use Files.readString, which handles large files', false],
      ], 'readAllLines and readString both load the whole file into memory. Reading one line at a time (in try-with-resources) keeps memory use constant regardless of file size.'),
      mcq(`Which throw statement here is a compile error?

    class Unchecked extends RuntimeException { }
    class Checked extends Exception { }

    void a() { throw new Unchecked(); }
    void b() { throw new Checked(); }
    void c() throws Checked { throw new Checked(); }`, [
        ['The one in a()', false],
        ['The one in b()', true],
        ['The one in c()', false],
        ['None of the three', false],
      ], 'Checked extends Exception, so b must declare or catch it, and it does neither. a throws an unchecked type, and c declares what it throws.'),
    ],
  },
];

export const TRACK_JAVA_OOP_BUNDLES: PilotBundle[] = [...OOP_BUNDLES, ...EXCEPTION_BUNDLES];
