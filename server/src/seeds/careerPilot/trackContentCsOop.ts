/**
 * Career-track content: object-oriented C# (JT_CS_OOP) and exceptions and files (JT_CS_EXCEPTIONS),
 * for .NET Full Stack + AI.
 *
 * A .NET interview examines OOP the way a Java one does — a short class hierarchy and "what does this
 * print?" or "does this compile?" — but the answers differ in the places C# chose differently: methods
 * are not virtual unless you say so, `new` hides rather than overrides, derived field initialisers run
 * before the base constructor, structs and records copy and compare by value, and there are no checked
 * exceptions. The questions lean on exactly those places.
 *
 * Every classic-C# snippet whose output a question states was compiled and run (csc, C# 5). Questions
 * about newer features (records, init, default interface methods, using declarations, exception
 * filters) state only well-documented, specified behaviour.
 *
 * Both topics are single-skill (CSHARP_OOP, CSHARP_EXCEPTIONS), so no question names a skillKey.
 * The two auto-graded exercises are C# 5 (the runner is Mono 6.12, about C# 7): classic Main, no
 * interpolation, no expression-bodied members.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

/* ══ JT_CS_OOP — Object-Oriented Programming in C# ═══════════════════════════════════════ */

const OOP_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_CS_OOP_CLASSES_OBJECTS',
    notes: `A **class** describes a kind of thing: what it knows (its **fields**) and what it can do (its
**methods**). An **object** is one instance made from that description with \`new\`. One class, many
objects, each with its own copy of the fields. If you wrote classes in Python, the idea is the same;
what changes is that C# makes you declare every field and its type up front, and checks every use at
compile time.

## A first class

    public class Counter
    {
        public int Count;            // a field: every Counter gets its own

        public void Increment()      // a method: works on THIS counter's field
        {
            Count++;
        }
    }

    Counter a = new Counter();
    Counter b = new Counter();
    a.Increment();
    a.Increment();
    b.Increment();
    Console.WriteLine(a.Count + " " + b.Count);   // 2 1

Since C# 9 you can also write \`Counter a = new();\` — the type on the left tells the compiler what to
create (a *target-typed* new). \`var a = new Counter();\` is the other common spelling.

## Variables of a class type hold references

\`Counter a\` does not contain a counter; it holds a **reference** to one that lives on the managed
heap. Copying the variable copies the reference, not the object:

    Counter c = a;        // no new object — c and a refer to the same counter
    c.Increment();
    Console.WriteLine(a.Count);   // 3

That is why classes are called **reference types**. (Structs, three units from now, are **value
types** and copy differently — keep this distinction in mind, interviewers love it.)

## Default values and definite assignment

A field is given a default when the object is created: \`0\` for numbers, \`false\` for \`bool\`,
\`'\\0'\` for \`char\` and \`null\` for every reference type. A **local variable gets no default**, and
reading one before assigning it is compile error CS0165, "Use of unassigned local variable".

## Members are private unless you say otherwise

A member declared without an access modifier is **private**. \`class P { int x; }\` compiles, but
\`p.x\` from another class is error CS0122, "inaccessible due to its protection level". A top-level
class without a modifier is **internal** — visible inside its own project (assembly) only.

## Passing an object to a method

C# passes arguments **by value** by default; for a class, the value is the reference. The method can
change the object, but reassigning the parameter changes only its own copy:

    static void Fill(Counter k)    { k.Count = 10; }          // caller sees 10
    static void Replace(Counter k) { k = new Counter(); }     // caller sees no change
    static void ReplaceRef(ref Counter k) { k = new Counter(); }  // caller's variable IS replaced

The \`ref\` keyword passes the variable itself, so \`ReplaceRef(ref a)\` really re-points \`a\`. Java has
no equivalent; it is worth knowing that C# does.

## What an object prints

Every class inherits \`ToString()\` from \`System.Object\`. Unless you override it,
\`Console.WriteLine(new Counter())\` prints the type's full name — \`Counter\`, or
\`MyApp.Models.Counter\` inside a namespace — not its fields.

## Common mistakes and interview traps

- Using a reference that is still \`null\`: a **NullReferenceException** at runtime. \`new Counter[3]\`
  creates three \`null\` slots, not three counters.
- Saying "C# passes objects by reference". It passes **references by value** unless you write \`ref\`.
- Making every field public. It compiles, but any code anywhere can then break the object's rules —
  the problem properties solve, two units from now.`,
    mcqs: [
      mcq(`What does this print?

    class Tally { public int Total; }

    Tally first = new Tally();
    first.Total = 4;
    Tally second = first;
    second.Total = 9;
    Console.WriteLine(first.Total);`, [
        ['9, because both variables refer to the one Tally object', true],
        ['4, because second received its own copy of the object', false],
        ['0, because assigning second resets the shared fields', false],
        ['It does not compile, since second was not created with new', false],
      ], '`Tally second = first` copies the reference, not the object. Both variables point at one Tally, so setting second.Total changes the only object there is and first.Total reads 9.'),
      mcq('A class declares the field `int hits;` and one of its methods declares the local `int misses;` and then calls `Console.WriteLine(hits + misses);` without assigning either. What does the compiler say?', [
        ['Nothing — both are zero, so the line prints 0', false],
        ['Error CS0165 for misses; the field hits defaults to 0', true],
        ['Error CS0165 for hits and for misses, as neither is set', false],
        ['A warning only, and the program prints 0 when it runs', false],
      ], 'Fields get default values when the object is created; locals get none. C# refuses to read a local that is not definitely assigned (CS0165), so only misses is an error.'),
      mcq(`What does this print?

    static void Swap(Tally t)
    {
        t = new Tally();
        t.Total = 0;
    }

    Tally x = new Tally();
    x.Total = 5;
    Swap(x);
    Console.WriteLine(x.Total);`, [
        ['0, because Swap received the Tally by reference', false],
        ['It throws a NullReferenceException inside Swap', false],
        ['5, because Swap only re-pointed its own parameter', true],
      ], 'Without ref, C# passes a copy of the reference. Reassigning t inside Swap points that copy at a new Tally and leaves the caller\'s x untouched, so it still reads 5. With `ref Tally t` the answer would be 0.'),
    ],
    checkpoint: [
      mcq(`What happens when this runs?

    Tally[] tallies = new Tally[3];
    Console.WriteLine(tallies[0].Total);`, [
        ['It prints 0, the default Total of a new Tally', false],
        ['It fails to compile because the array is unfilled', false],
        ['It throws an IndexOutOfRangeException', false],
        ['It throws a NullReferenceException at runtime', true],
      ], 'An array of a class type holds references, and every slot starts as null — no Tally objects exist yet. Reading .Total through null throws NullReferenceException. The code compiles.'),
      mcq('`class Ticket { int seat; }` sits in the same file as Program, and Main runs `var t = new Ticket(); Console.WriteLine(t.seat);`. What happens?', [
        ['It prints 0, the default value of an int field', false],
        ['Compile error: seat is private by default', true],
        ['It prints 0 with a warning that seat is unused', false],
        ['Compile error: Ticket needs an explicit constructor', false],
      ], 'A class member with no access modifier is private, so Program cannot read it (CS0122). Ticket does have a constructor — the compiler supplies a parameterless one when none is written.'),
      mcq('A `Ticket` class overrides nothing. What does `Console.WriteLine(new Ticket());` print when Ticket is declared in the namespace `Cinema`?', [
        ['An empty line, because Ticket has no ToString', false],
        ['Cinema.Ticket — the inherited ToString gives the type name', true],
        ['The values of every one of Ticket\'s fields, in declaration order', false],
        ['A memory address such as Ticket@1b6d3586', false],
      ], 'Every class inherits System.Object.ToString, which returns the full type name including the namespace. A hash-style address is Java\'s default, not .NET\'s; listing fields is what a record does.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_CONSTRUCTORS',
    notes: `A **constructor** runs once, when \`new\` creates an object, and its job is to leave the object in a
valid state. It has the class's name and **no return type** — not even \`void\`.

## Writing and chaining constructors

    public class Account
    {
        private readonly string owner;
        private decimal balance;

        public Account(string owner) : this(owner, 0m)    // delegate to the fuller one
        {
        }

        public Account(string owner, decimal opening)
        {
            this.owner = owner;
            this.balance = opening;
            Console.WriteLine("Opened for " + owner + " with " + opening);
        }
    }

    new Account("Asha");          // Opened for Asha with 0
    new Account("Ravi", 500m);    // Opened for Ravi with 500

Two constructors with different parameter lists is **constructor overloading**. Instead of repeating
the assignments, the short one forwards to the long one with **\`: this(...)\`**, written in the
constructor's *header*, not its body. The target runs **first**, then the forwarding constructor's own
body. So the real initialisation lives in one place.

## What \`this\` means

Inside a constructor or method, \`this\` is the object being worked on. \`this.owner = owner\` reads "set
this object's field to the parameter". Without \`this.\` the parameter **shadows** the field, and
\`owner = owner;\` assigns the parameter to itself: it compiles (with warning CS1717), and the field stays
\`null\`. Many C# teams avoid the problem with a naming rule: private fields start with an underscore,
\`_owner = owner;\`.

## The default constructor

If you write **no** constructor, the compiler supplies a public parameterless one. The moment you write
any constructor, that gift is gone: with only \`Account(string)\` declared, \`new Account()\` does not
compile. Serializers and EF Core materialise objects, and some of them need a parameterless
constructor (it may be private for EF Core) — this bites in Web API work.

## Object initialisers

    public class Pizza
    {
        public string Size { get; set; } = "Medium";
        public bool ExtraCheese { get; set; }
    }

    var p = new Pizza { Size = "Large", ExtraCheese = true };

An **object initialiser** is shorthand: the constructor runs first, **then** each property is assigned
in order. It works with any accessible settable property (and, from C# 9, with \`init\` properties). It
is not a constructor, so it cannot enforce that a value was supplied — C# 11's \`required\` modifier
closes that gap.

## Order of initialisation in one class

1. Fields get their defaults (0, null, false).
2. **Field initialisers** run in textual order (\`int x = 5;\`).
3. The constructor body runs (after any \`: this(...)\` target).
4. An object initialiser, if present, assigns its properties.

## Primary constructors (C# 12)

    public class Greeter(string name)
    {
        public string Greet() => "Hello, " + name;
    }

C# 12 lets a class declare its constructor parameters on the class itself. The parameters are in
scope for the whole class body. You will see this in new .NET 8 code, especially in services that
receive their dependencies; the classic form above is still the one to understand first.

## Common mistakes

- Repeating validation in every overload instead of chaining to one constructor.
- \`owner = owner;\` — shadowing, the field never set.
- Doing heavy work (database calls, file reads) in a constructor: it cannot be awaited and failures
  surface in odd places. Construct cheaply; do work in methods.`,
    mcqs: [
      mcq(`What does this print?

    class Lamp
    {
        public Lamp() : this("white") { Console.Write("A"); }
        public Lamp(string colour) { Console.Write("B"); }
    }

    new Lamp();`, [
        ['AB, because the parameterless body runs before forwarding', false],
        ['A only, because : this(...) is skipped for new Lamp()', false],
        ['BA, because the : this(...) target runs before the body', true],
        ['B only, because the forwarding body is never executed', false],
      ], 'A constructor that forwards with : this(...) runs the target constructor first and then its own body, so B is written before A.'),
      mcq('`class Order` declares only `public Order(int id)`. Elsewhere, `var o = new Order();` is written. What happens?', [
        ['It compiles, and id is given its default value of 0', false],
        ['It compiles, but throws MissingMethodException at runtime', false],
        ['It compiles with a warning that id was not supplied', false],
        ['It does not compile: no parameterless constructor exists', true],
      ], 'The compiler supplies a parameterless constructor only when a class declares none. Declaring Order(int) removes it, so new Order() is a compile error (CS1729 on older compilers, CS7036 on newer).'),
      mcq(`What does this print?

    class Shelf
    {
        private int size;
        public Shelf() { size = 1; Console.Write("ctor "); }
        public int Size
        {
            get { return size; }
            set { Console.Write("set "); size = value; }
        }
    }

    var s = new Shelf { Size = 5 };
    Console.WriteLine(s.Size);`, [
        ['set ctor 1', false],
        ['ctor 1', false],
        ['set ctor 5', false],
        ['ctor set 5', true],
      ], 'An object initialiser is sugar for "construct, then assign": the constructor writes ctor and sets size to 1, then the initialiser calls the setter, which writes set and stores 5.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    class Member
    {
        public string Name;
        public Member(string Name) { Name = Name; }
    }

    Console.WriteLine(new Member("Asha").Name == null);`, [
        ['False, because the constructor stored "Asha"', false],
        ['True, because the parameter was assigned to itself', true],
        ['It does not compile: a parameter cannot share a field\'s name', false],
        ['It throws a NullReferenceException in the constructor', false],
      ], 'Inside the constructor, Name means the parameter, which shadows the field. Name = Name assigns the parameter to itself (warning CS1717) and the field keeps its default, null. this.Name = Name is the fix.'),
      mcq(`What does this print?

    class Gauge
    {
        private int level = 5;
        public Gauge() { level = level * 2; }
        public int Level { get { return level; } }
    }

    Console.WriteLine(new Gauge().Level);`, [
        ['5', false],
        ['0', false],
        ['10', true],
        ['It does not compile', false],
      ], 'Field initialisers run before the constructor body, so level is already 5 when the body doubles it. The result is 10.'),
      mcq('Where does C# put the call that makes one constructor run another constructor of the same class first?', [
        ['In the header, after a colon: `public Order() : this(0)`', true],
        ['As the first statement of the body: `this(0);`', false],
        ['Anywhere in the body, as long as it is called only once', false],
        ['In a static Create method that both constructors call', false],
      ], 'C# chains constructors with a constructor initialiser in the header — `: this(...)` for the same class, `: base(...)` for the base class. Writing `this(0);` in the body is Java syntax and does not compile in C#.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_PROPERTIES',
    notes: `**Encapsulation** means an object guards its own state: the data is private, and the only way to
change it is through members that keep it valid. In C# the tool for that is the **property**.

## Access modifiers

| Modifier | Visible to |
|---|---|
| \`private\` | the declaring class only (the default for members) |
| \`protected\` | the class and classes derived from it |
| \`internal\` | anything in the same assembly (project) — the default for top-level classes |
| \`protected internal\` | same assembly, or derived classes anywhere |
| \`private protected\` (C# 7.2) | derived classes in the same assembly |
| \`public\` | everyone |

## From fields to properties

A property looks like a field to the caller and runs code like a method:

    public class Student
    {
        private int age;                     // the backing field

        public int Age
        {
            get { return age; }
            set
            {
                if (value < 0 || value > 120)
                    throw new ArgumentOutOfRangeException(nameof(value), "Age must be 0-120");
                age = value;                 // 'value' is what the caller assigned
            }
        }
    }

    var s = new Student();
    s.Age = 21;          // calls set with value = 21
    Console.WriteLine(s.Age);   // calls get

The validation runs **before** the assignment, so an invalid call leaves the object unchanged.

## Auto-properties

When there is no logic, the compiler writes the backing field for you:

    public string Name { get; set; }                 // read and write
    public decimal Balance { get; private set; }     // anyone reads, only this class writes
    public DateTime CreatedAt { get; } = DateTime.UtcNow;   // get-only: set in initialiser or constructor
    public string Id { get; init; }                  // C# 9: settable only during construction

\`{ get; private set; }\` is the everyday encapsulation tool: \`Balance\` is visible to all, but only
\`Deposit\` and \`Withdraw\` inside the class may change it. From outside, \`acc.Balance = 0;\` is a compile
error (CS0272). An \`init\` property can be set in an object initialiser, \`new Order { Id = "A1" }\`,
and never afterwards.

## Computed and expression-bodied members

    public decimal Total => Price * Quantity;        // computed on every read, no backing field
    public override string ToString() => Name + " (" + Age + ")";

\`=>\` on a member (C# 6/7) is shorthand for a body that returns one expression.

## Encapsulation is about invariants, not getters

Wrapping every field in \`{ get; set; }\` is not encapsulation; it is a public field with extra steps.
Ask what must always be true of the object (balance never negative, age 0–120) and expose only
operations that preserve it: \`Deposit(amount)\` instead of a public setter on \`Balance\`.

## Exposing collections safely

    private readonly List<string> items = new List<string>();
    public IReadOnlyList<string> Items => items;     // callers can read, not Add

A property \`public List<string> Items { get; private set; }\` stops callers *replacing* the list but
not *changing* it — \`cart.Items.Add("x")\` still works. Expose \`IReadOnlyList<T>\` (or a copy).

## Common mistakes

- A property that returns itself: \`public string Name { get { return Name; } }\` recurses until the
  process dies with a **StackOverflowException**, which cannot be caught. Return the backing field.
- Public setters on everything, then validation scattered across callers.
- Thinking \`private set\` makes a collection read-only.`,
    workedExample: `**Problem.** A \`Wallet\` must never hold a negative balance. Callers need to see the
balance, add money, and spend money; spending more than the balance must fail without changing
anything. Design it.

**Decide the invariant first.** "Balance is never negative." Everything else follows from protecting
that one sentence.

**Choose what to expose.** Callers read the balance, so it is a property with a public getter. No
caller may set it directly, so the setter is private:

    public class Wallet
    {
        public decimal Balance { get; private set; }

        public void Add(decimal amount)
        {
            if (amount <= 0)
                throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be positive");
            Balance += amount;
        }

        public bool TrySpend(decimal amount)
        {
            if (amount <= 0 || amount > Balance)
                return false;          // refuse; nothing has changed
            Balance -= amount;
            return true;
        }
    }

**Why these choices.**
- \`decimal\`, not \`double\`: money needs exact decimal fractions; \`0.1m + 0.2m == 0.3m\` is true.
- \`Add\` throws on a non-positive amount, because that is a programming error by the caller.
- \`TrySpend\` returns \`false\` instead of throwing, because "not enough money" is an expected
  outcome the caller should handle — the Try pattern you will meet again in the Exceptions topic.
- Every check runs **before** the change, so a refused call leaves the wallet exactly as it was.

**Check it.**

    var w = new Wallet();
    w.Add(500m);
    Console.WriteLine(w.TrySpend(800m));   // False
    Console.WriteLine(w.Balance);          // 500
    // w.Balance = 1000m;                  // does not compile: the setter is private

The class now cannot be put into an invalid state by anyone outside it.`,
    mcqs: [
      mcq('`public class Player { public int Score { get; private set; } }` — code in another class writes `p.Score = 50;`. What happens?', [
        ['It compiles; private set only hides the setter from IntelliSense', false],
        ['It compiles, but throws InvalidOperationException at runtime', false],
        ['It compiles, and the assignment is silently ignored', false],
        ['It does not compile: the set accessor is inaccessible here', true],
      ], 'private set makes the setter callable only inside Player. Any other class can read Score but assigning it is compile error CS0272.'),
      mcq(`Student.Age's setter throws ArgumentOutOfRangeException for values outside 0–120 before storing anything. What does this print?

    var s = new Student();
    s.Age = 30;
    try { s.Age = -4; } catch (ArgumentOutOfRangeException) { }
    Console.WriteLine(s.Age);`, [
        ['30, because the throw happened before the assignment', true],
        ['-4, because the setter stored the value before throwing', false],
        ['0, because a failed setter resets the backing field', false],
        ['Nothing — the exception ends the program before printing', false],
      ], 'The setter validates first and throws before age = value runs, so the object is unchanged. The exception is caught and the next line prints 30.'),
      mcq('A `Cart` exposes `public List<string> Items { get; private set; } = new List<string>();`. What can code outside Cart still do?', [
        ['Nothing that changes Items — private set makes it read-only', false],
        ['Replace Items with a new list, but not add to the old one', false],
        ['Call cart.Items.Add("pen") and change the cart\'s contents', true],
        ['Read Items only after casting it to IReadOnlyList<string>', false],
      ], 'private set stops callers assigning a different list to the property; it does nothing to the list object itself. Expose IReadOnlyList<string> or a copy to stop outside changes.'),
    ],
    checkpoint: [
      mcq('A developer writes `public string Name { get { return Name; } }` and reads `person.Name`. What happens?', [
        ['It returns null, the default for a string property', false],
        ['It recurses until the process dies with a StackOverflowException', true],
        ['The compiler rejects a getter that reads the property it belongs to', false],
        ['It returns an empty string, because the getter has no field', false],
      ], 'Inside the getter, Name means the property again, so each read calls the getter recursively. The stack overflows and .NET terminates the process; a StackOverflowException cannot be caught. Return a backing field instead.'),
      mcq('`public string Code { get; init; }` (C# 9) is declared on `Coupon`. Which use compiles?', [
        ['var c = new Coupon(); c.Code = "SAVE10";', false],
        ['var c = new Coupon { Code = "SAVE10" };', true],
        ['Coupon.Code = "SAVE10"; before creating any coupon', false],
        ['var c = new Coupon(); c.Code.Init("SAVE10");', false],
      ], 'An init accessor allows assignment only while the object is being constructed — in a constructor or an object initialiser. Assigning it afterwards is a compile error, which is what makes init properties useful for immutable objects.'),
      mcq('A `Thermostat` must keep its target between 16 and 30. Which design actually protects that rule?', [
        ['A public int Target field and a comment saying 16-30', false],
        ['public int Target { get; set; } checked by the UI before saving', false],
        ['A private field changed only by Raise() and Lower(), which clamp it', true],
        ['A public field plus a Validate() method callers should call', false],
      ], 'An invariant is protected only when the class itself enforces it on every change. A public field or setter lets any caller break the rule; clamping inside Raise and Lower makes an invalid target impossible.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_STATIC_READONLY',
    notes: `Most members belong to an **instance** — each object has its own. A **static** member belongs to the
**class** itself: one copy, shared by every object, reachable without creating any.

## static fields and methods

    public class Ticket
    {
        private static int issued;          // one counter for the whole class
        public int Number { get; }

        public Ticket()
        {
            issued++;
            Number = issued;
        }

        public static int Issued { get { return issued; } }
    }

    new Ticket(); new Ticket(); new Ticket();
    Console.WriteLine(Ticket.Issued);     // 3 — accessed through the class name

A **static method** has no \`this\`, so it cannot touch instance fields directly:
\`static void Reset() { Number = 0; }\` is error CS0120, "An object reference is required". \`Main\`,
\`Math.Max\` and \`int.Parse\` are static. A \`static class\` (like \`Math\` or \`Console\`) can contain only
static members and cannot be instantiated — the natural home for stateless helpers.

## Static constructors

    class Config
    {
        public static readonly string Env;
        static Config() { Env = Environment.GetEnvironmentVariable("APP_ENV") ?? "dev"; }
    }

A **static constructor** takes no parameters and no access modifier. The runtime runs it **once**,
automatically, before the class is first used. If it throws, the type is unusable for the life of
the process (every later use throws \`TypeInitializationException\`), so keep it simple.

## const vs readonly

    public const int MaxSeats = 120;               // compile-time constant
    public static readonly DateTime Started = DateTime.UtcNow;   // runtime value, fixed once
    private readonly string id;                    // per instance, set in initialiser or constructor

| | \`const\` | \`readonly\` |
|---|---|---|
| When the value is known | compile time | runtime (initialiser or constructor) |
| Types allowed | numbers, \`bool\`, \`char\`, \`string\`, enums, \`null\` | any |
| Static? | always, implicitly | instance or \`static readonly\` |

\`public const DateTime Start = DateTime.Now;\` does not compile (CS0283) — \`DateTime\` cannot be const and
\`Now\` is not known at compile time. Use \`static readonly\`.

**A versioning trap:** the compiler *copies* a const's value into every assembly that uses it. If a
library changes \`public const int MaxUsers = 100\` to 200 and your app is not recompiled, your app still
uses 100. For values that may change, expose \`static readonly\`.

## readonly is shallow

    private readonly List<string> tags = new List<string>();
    void AddTag(string t) { tags.Add(t); }        // fine: the list object changes
    void Reset() { tags = new List<string>(); }    // error CS0191: the field cannot be reassigned

\`readonly\` fixes which object the field refers to, not the object's contents.

## An immutable class

    public sealed class Money
    {
        public decimal Amount { get; }
        public string Currency { get; }

        public Money(decimal amount, string currency) { Amount = amount; Currency = currency; }

        public Money Add(Money other)
        {
            if (other.Currency != Currency) throw new InvalidOperationException("Currency mismatch");
            return new Money(Amount + other.Amount, Currency);   // a new object; this one never changes
        }
    }

Get-only properties set once in the constructor, no setters, operations that return new objects, and
\`sealed\` so no subclass adds mutable state. \`string\` and \`DateTime\` work this way. Immutable objects
are safe to share between threads and to use as dictionary keys. (C# 9 records, later in this topic,
generate most of this for you.)

## Common mistakes

- Static mutable state used as a "global" — in a web app every request shares it, across threads.
- \`const\` for a value that can change between releases.
- Believing a \`readonly\` list is a read-only list.`,
    mcqs: [
      mcq(`What does this print?

    class Visitor
    {
        public static int Count;
        public Visitor() { Count++; }
    }

    new Visitor(); new Visitor(); new Visitor();
    Console.WriteLine(Visitor.Count);`, [
        ['1, because each Visitor gets its own Count field', false],
        ['3, because every Visitor shares the one static Count', true],
        ['0, because static fields are reset by each constructor', false],
        ['It does not compile: Count must be read through an instance', false],
      ], 'A static field exists once per class, not once per object. Each constructor increments the same Count, so after three objects it reads 3.'),
      mcq('A C# class needs a launch timestamp fixed once when the app starts. Which field declaration compiles?', [
        ['public const DateTime Launch = DateTime.Now;', false],
        ['public const List<int> Primes = new List<int>();', false],
        ['public static readonly DateTime Launch = DateTime.Now;', true],
        ['public readonly const int Limit = 10;', false],
      ], 'const is limited to compile-time constants of primitive-like types (numbers, bool, char, string, enums), so DateTime and List cannot be const. static readonly takes any value computed once at runtime. readonly and const cannot be combined.'),
      mcq('A class declares `private readonly List<string> tags = new List<string>();`. Which method body fails to compile?', [
        ['tags.Add("new");', false],
        ['tags.Clear();', false],
        ['tags.Remove("old");', false],
        ['tags = new List<string>();', true],
      ], 'readonly forbids reassigning the field outside the initialiser and constructors (CS0191). It does not make the list immutable, so Add, Clear and Remove all compile.'),
    ],
    checkpoint: [
      mcq('`class Shop { int stock; static void Restock() { stock = 100; } }` — what does the compiler report?', [
        ['Nothing; static methods may write any field of the class', false],
        ['Error: an object reference is required for the non-static field stock', true],
        ['A warning that stock is assigned but its value is never used', false],
        ['Error: a static method may only be declared inside a static class type', false],
      ], 'A static method has no this, so it has no object whose stock to set (CS0120). Make stock static, or make Restock an instance method, or pass a Shop in.'),
      mcq(`What does this print?

    class Settings
    {
        static Settings() { Console.Write("S"); }
        public static int Port = 80;
    }

    Console.Write("M");
    int a = Settings.Port;
    int b = Settings.Port;
    Console.Write("E");`, [
        ['SME', false],
        ['MSSE', false],
        ['MSE', true],
        ['ME', false],
      ], 'The static constructor runs once, just before the class is first used — here at the first read of Settings.Port, after M is written. The second read does not run it again.'),
      mcq('A NuGet library you use changes `public const int MaxUsers = 100;` to 200. You update the DLL but do not recompile your app. What value does your app use?', [
        ['200, because the value is read from the new DLL every time the app starts', false],
        ['100, since the const was baked into your app at compile time', true],
        ['The app fails to start with a version mismatch error', false],
        ['200, but only after the runtime clears its JIT cache', false],
      ], 'The compiler bakes a const\'s value into every call site in the consuming assembly. Without recompiling, your app still contains 100. A public static readonly field is read from the library at runtime, so it would show 200.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_INHERITANCE',
    notes: `**Inheritance** lets one class build on another: the **derived** class gets the **base** class's
members and adds or specialises behaviour. In C# it is written with a colon.

    public class Account
    {
        public string Owner { get; }
        public decimal Balance { get; protected set; }

        public Account(string owner) { Owner = owner; }

        public void Deposit(decimal amount) { Balance += amount; }
    }

    public class SavingsAccount : Account
    {
        public decimal Rate { get; }

        public SavingsAccount(string owner, decimal rate) : base(owner)   // run Account's constructor
        {
            Rate = rate;
        }

        public void AddInterest() { Balance += Balance * Rate / 100; }   // protected set allows this
    }

## What is inherited

Every non-private member is usable from the derived class. **private** members exist in the object
but only the base class can touch them; **protected** ones are visible to derived classes. Constructors
are **not** inherited — every derived class declares its own.

## base(...) and construction order

A derived constructor must run a base constructor. \`: base(owner)\` chooses which one; leave it out and
C# calls the base's parameterless constructor — so if the base has none, the derived class does not
compile (CS1729/CS7036). The order when you write \`new SavingsAccount(...)\`:

1. The **derived** class's field initialisers.
2. The **base** class's field initialisers.
3. The **base** constructor body.
4. The **derived** constructor body.

Steps 1–2 surprise Java developers: in C#, derived field initialisers run *before* the base
constructor. Constructor bodies still run base-first.

## One base class, many interfaces

A C# class has **exactly one** base class (\`class C : A, B\` with two classes is error CS1721) but can
implement any number of interfaces. Every class ultimately derives from \`System.Object\`.

## sealed

\`public sealed class Money\` cannot be derived from (CS0509). Seal classes that were not designed for
extension — \`string\` is sealed. A method can also be \`sealed override\` to stop further overriding.

## Calling base members

Inside the derived class, \`base.Method()\` calls the base version — typically from an override, to
add to the base behaviour rather than replace it.

## Composition over inheritance

Inheritance means **is-a**: a \`SavingsAccount\` *is an* \`Account\`, usable anywhere one is expected.
If the honest sentence is **has-a** — an \`Order\` *has a* \`List<OrderLine>\`, a \`Car\` *has an*
\`Engine\` — hold the other object in a field instead. Deriving \`Stack\` from \`List<T>\` to reuse its
storage also inherits \`Insert\` at any index, which breaks the stack. Deep hierarchies are hard to
change; most .NET code uses shallow inheritance plus interfaces and composition.

## Common mistakes

- Forgetting \`: base(...)\` when the base has no parameterless constructor.
- Making fields \`protected\` "for convenience" — derived classes can then break the base's rules.
  Prefer \`protected\` methods or \`protected set\`.
- Inheriting to reuse code when the is-a sentence is false.`,
    mcqs: [
      mcq(`What does this print?

    class Vehicle { public Vehicle() { Console.Write("V"); } }
    class Bus : Vehicle { public Bus() { Console.Write("B"); } }

    new Bus();`, [
        ['B', false],
        ['BV', false],
        ['VB', true],
        ['V', false],
      ], 'A derived constructor always runs a base constructor before its own body — here the implicit : base(). Vehicle writes V, then Bus writes B.'),
      mcq('`class Employee { public Employee(string name) { } }` and `class Manager : Employee { public Manager() { } }`. What happens when this compiles?', [
        ['It compiles; Manager passes null to Employee automatically', false],
        ['Error: Employee has no parameterless constructor for Manager to call', true],
        ['It compiles, but new Manager() throws at runtime', false],
        ['Error: a derived class must redeclare every constructor of its base class', false],
      ], 'Without : base(...), Manager() calls Employee(), which does not exist because Employee declared a constructor of its own. The fix is `public Manager() : base("unknown")` or a constructor that takes the name.'),
      mcq('`public sealed class Invoice { }` and later `class GstInvoice : Invoice { }`. What is the result?', [
        ['GstInvoice compiles but cannot override any methods', false],
        ['It compiles, and sealed only stops new Invoice()', false],
        ['Compile error: cannot derive from the sealed type Invoice', true],
        ['It compiles with a warning that Invoice is sealed', false],
      ], 'sealed on a class forbids deriving from it at all (CS0509). It does not affect creating Invoice objects.'),
    ],
    checkpoint: [
      mcq('`class Base { private int a; protected int b; }` and `class Child : Base { void Set() { b = 1; a = 2; } }`. What does the compiler report?', [
        ['No errors: a derived class can access all base fields', false],
        ['Errors on both a and b, since neither is public', false],
        ['An error on b only, since protected means same assembly', false],
        ['An error on a only: it is private to Base', true],
      ], 'protected members are visible to derived classes; private ones are not, even though the field exists inside every Child object (CS0122 on a).'),
      mcq(`What does this print?

    class Report
    {
        public Report() { Print(); }
        public virtual void Print() { }
    }
    class SalesReport : Report
    {
        private string title = "Sales";
        public SalesReport() { title = "Q4 Sales"; }
        public override void Print() { Console.WriteLine(title ?? "null"); }
    }

    new SalesReport();`, [
        ['Sales, because derived field initialisers run before the base constructor', true],
        ['null, because SalesReport has not been initialised when Report() runs', false],
        ['Q4 Sales, because the SalesReport constructor body has already run by then', false],
        ['Nothing, because Report() calls its own empty Print', false],
      ], 'In C#, SalesReport\'s field initialiser runs before Report\'s constructor, so title is "Sales" when the virtual call dispatches to the override. The derived constructor body, which sets "Q4 Sales", has not run yet. (Java would print null here.)'),
      mcq('`class Logger { }` and `class Auditor { }` exist. A developer writes `class AuditLogger : Logger, Auditor { }`. What happens?', [
        ['It compiles; members of both classes are merged', false],
        ['Error: a class cannot have more than one base class', true],
        ['It compiles if Logger and Auditor share no member names', false],
        ['It compiles, and Auditor is treated as an interface', false],
      ], 'C# allows exactly one base class (CS1721). To combine behaviours, implement interfaces or hold the other object as a field (composition).'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_POLYMORPHISM',
    notes: `**Polymorphism** means one call, different behaviour, depending on the object. C# has two forms:
**overloading** (chosen at compile time) and **overriding** (chosen at runtime). C# differs from Java in
one important way: **methods are not virtual unless you say so**.

## Overriding: virtual and override

    public class Animal
    {
        public virtual string Speak() { return "..."; }
    }
    public class Dog : Animal
    {
        public override string Speak() { return "Woof"; }
    }

    Animal a = new Dog();
    Console.WriteLine(a.Speak());    // Woof

The base marks the method **virtual**; the derived class marks its replacement **override**. The call
is **dynamically dispatched**: the runtime looks at the actual object (a \`Dog\`), not the variable's type
(\`Animal\`). Overriding a method that is not \`virtual\`, \`abstract\` or \`override\` is error CS0506.

Inside an override, \`base.Speak()\` calls the base version: \`return base.Speak() + "!";\`.

## Hiding: new

    public class Animal { public string Kind() { return "Animal"; } }
    public class Dog : Animal { public new string Kind() { return "Dog"; } }

    Animal a = new Dog();
    Console.WriteLine(a.Kind());          // Animal  — chosen by the variable's type
    Console.WriteLine(((Dog)a).Kind());   // Dog

\`new\` declares an unrelated method that happens to have the same name. There is no dispatch: the
**compile-time type** of the variable decides. If you write a same-named method *without* \`override\` or
\`new\`, the compiler warns (CS0108 / CS0114) and treats it as \`new\` — the classic "my override never
runs" bug.

| Base method | Derived writes | \`Animal a = new Dog(); a.M()\` runs |
|---|---|---|
| \`virtual\` | \`override\` | Dog's |
| \`virtual\` | \`new\` (or nothing) | Animal's |
| non-virtual | \`new\` | Animal's |
| non-virtual | \`override\` | does not compile |

## Overloading

Same name, different parameter lists, in one class:

    static void Describe(object o) { Console.WriteLine("object"); }
    static void Describe(string s) { Console.WriteLine("string"); }

    object o = "hi";
    Describe(o);       // object  — overloads are chosen from the COMPILE-TIME type
    Describe("hi");    // string

Overload resolution happens at compile time from the declared types of the arguments. Return type
alone cannot distinguish overloads.

## Why it matters

Polymorphism lets code depend on the base type and still get specialised behaviour:

    List<Shape> shapes = ...;
    foreach (var s in shapes) total += s.Area();   // each shape computes its own area

Adding a \`Triangle\` means a new class, not editing a \`switch\` in every caller. If you find yourself
writing \`if (s is Circle) ... else if (s is Square) ...\`, the behaviour probably belongs in an override.

## Common mistakes

- Forgetting \`virtual\` on the base method, so \`override\` will not compile — and "fixing" it with
  \`new\`, which silently breaks dispatch.
- Expecting overloads to be chosen by the runtime type.
- Calling a virtual method from a base constructor (the override may see partly-initialised state).`,
    mcqs: [
      mcq(`What does this print?

    class Shape { public virtual string Name() { return "shape"; } }
    class Circle : Shape { public override string Name() { return "circle"; } }

    Shape s = new Circle();
    Console.WriteLine(s.Name());`, [
        ['shape, because s is declared as a Shape', false],
        ['circle, because the override runs for the actual object', true],
        ['shape circle, because both versions run in order', false],
        ['It does not compile without a cast to Circle', false],
      ], 'Name is virtual and Circle overrides it, so the call dispatches on the runtime type of the object, a Circle.'),
      mcq(`What does this print?

    class Base { public string Who() { return "Base"; } }
    class Child : Base { public new string Who() { return "Child"; } }

    Base b = new Child();
    Child c = new Child();
    Console.WriteLine(b.Who() + " " + c.Who());`, [
        ['Child Child', false],
        ['Base Base', false],
        ['Child Base', false],
        ['Base Child', true],
      ], 'new hides rather than overrides, so there is no dynamic dispatch: the variable\'s declared type picks the method. b is a Base variable (Base.Who); c is a Child variable (Child.Who).'),
      mcq(`What does this print?

    static void Show(object o) { Console.WriteLine("object"); }
    static void Show(string s) { Console.WriteLine("string"); }

    object item = "hello";
    Show(item);`, [
        ['object, because overloads are chosen from the compile-time type', true],
        ['string, because at runtime the CLR sees that item really holds a string', false],
        ['It does not compile, since the call is ambiguous', false],
        ['Both lines print, because both overloads match the call', false],
      ], 'Overload resolution happens at compile time using the declared type of the argument. item is declared object, so Show(object) is chosen even though it holds a string.'),
    ],
    checkpoint: [
      mcq(`What does this print? (The compiler warns about the second Speak.)

    class Animal { public virtual string Speak() { return "..."; } }
    class Cat : Animal { public string Speak() { return "Meow"; } }

    Animal a = new Cat();
    Console.WriteLine(a.Speak() + " " + new Cat().Speak());`, [
        ['Meow Meow', false],
        ['... ...', false],
        ['... Meow', true],
        ['It does not compile', false],
      ], 'Without override, Cat.Speak hides Animal.Speak (warning CS0114) as if marked new. Through an Animal variable the base version runs; through a Cat expression, Cat\'s does.'),
      mcq('`class A { public void Save() { } }` and `class B : A { public override void Save() { } }`. What happens?', [
        ['It compiles, and B.Save replaces A.Save for every caller', false],
        ['It compiles with a warning that A.Save should be virtual', false],
        ['Error: Save cannot be overridden because it is not virtual', true],
        ['It compiles, but override behaves exactly like new here', false],
      ], 'Only virtual, abstract or override members can be overridden (CS0506). Methods in C# are non-virtual by default, unlike Java.'),
      mcq(`What does this print?

    class Dog { public virtual string Bark() { return "Woof"; } }
    class Puppy : Dog { public override string Bark() { return base.Bark() + "!"; } }

    Dog d = new Puppy();
    Console.WriteLine(d.Bark());`, [
        ['Woof!', true],
        ['Woof', false],
        ['!', false],
        ['Woof!!', false],
      ], 'The call dispatches to Puppy.Bark, which calls the base implementation (Woof) and appends an exclamation mark. base.Bark() does not dispatch again, so there is no recursion.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_ABSTRACTION',
    notes: `**Abstraction** means callers depend on *what* something does, not *how*. C# gives you two tools:
**abstract classes** and **interfaces**.

## Abstract classes

    public abstract class Shape
    {
        public string Name { get; }
        protected Shape(string name) { Name = name; }

        public abstract double Area();                 // no body: every concrete shape must provide one

        public override string ToString()              // shared, finished behaviour
        {
            return Name + " with area " + Area().ToString("F2");
        }
    }

    public class Circle : Shape
    {
        private readonly double r;
        public Circle(double r) : base("Circle") { this.r = r; }
        public override double Area() { return Math.PI * r * r; }
    }

An abstract class **cannot be instantiated** (\`new Shape("x")\` is CS0144), but it can have fields,
constructors, finished methods and \`abstract\` members. A derived class must override every abstract
member or be abstract itself. Its constructor is usually \`protected\`, since only derived classes call it.

## Interfaces

    public interface INotifier
    {
        void Send(string to, string message);
    }

    public class EmailNotifier : INotifier
    {
        public void Send(string to, string message) { /* SMTP */ }
    }
    public class SmsNotifier : INotifier
    {
        public void Send(string to, string message) { /* SMS gateway */ }
    }

An interface is a **contract**: members with no instance state. By convention its name starts with
\`I\`. A class can implement **many** interfaces: \`class Report : IExportable, IPrintable\`. Interfaces
cannot hold instance fields (CS0525). Implementing members must be \`public\`.

ASP.NET Core is built on this: you register \`INotifier\` → \`EmailNotifier\` with dependency injection,
and controllers ask for \`INotifier\`. Swapping in \`SmsNotifier\`, or a fake in a unit test, changes one
line.

## Explicit interface implementation

    public class Document : IPrintable
    {
        void IPrintable.Print() { Console.WriteLine("printing"); }
    }

    var d = new Document();
    // d.Print();                  // does not compile: not visible through Document
    ((IPrintable)d).Print();       // works

Explicit implementation hides the member unless the object is seen through the interface — useful
when two interfaces declare the same member, or to keep a class's public surface small.

## Default interface methods (C# 8)

    public interface ILogger
    {
        void Log(string message);
        void Info(string message) => Log("INFO " + message);   // has a body
    }

An interface may now provide a default body, so adding a member does not break every implementer. The
default is reachable **only through the interface type**: with \`class ConsoleLogger : ILogger\` that
implements only \`Log\`, \`new ConsoleLogger().Info("x")\` does not compile, while
\`ILogger l = new ConsoleLogger(); l.Info("x");\` does. Interfaces still have no instance state.

## Choosing

| Use an interface when… | Use an abstract class when… |
|---|---|
| unrelated classes share a capability (\`IComparable<T>\`, \`IDisposable\`) | closely related classes share state or a constructor |
| you want many implementations swapped by DI or in tests | you want a template method: fixed algorithm, overridable steps |
| a class needs several contracts | one base is enough |

In practice: start with an interface for anything you inject or mock; reach for an abstract base class
when there is genuine shared state or code.

## Common mistakes

- An interface with twenty members — split it (interface segregation).
- An abstract base class used only to share one helper method — a static helper or composition is
  simpler.
- Calling a default interface method through the class type and wondering why it does not compile.`,
    mcqs: [
      mcq('`public abstract class Payment { public abstract void Pay(decimal amount); }` — what does `var p = new Payment();` do?', [
        ['It creates a Payment whose Pay method does nothing', false],
        ['It compiles, but calling p.Pay throws NotImplementedException', false],
        ['It creates a Payment as long as Pay is never called', false],
        ['It does not compile: an abstract class cannot be instantiated', true],
      ], 'Abstract classes exist to be derived from; new on one is compile error CS0144. Create a concrete subclass that overrides Pay.'),
      mcq(`What happens here?

    interface IPrintable { void Print(); }
    class Invoice : IPrintable { void IPrintable.Print() { Console.WriteLine("printed"); } }

    var inv = new Invoice();
    inv.Print();`, [
        ['It prints printed, as for any implemented method', false],
        ['It does not compile: Print is visible only through IPrintable', true],
        ['It compiles, but throws because Print is private', false],
        ['It prints nothing, because an explicit Print is skipped at runtime', false],
      ], 'An explicit interface implementation is not part of Invoice\'s own public surface. inv.Print() is a compile error; ((IPrintable)inv).Print() works.'),
      mcq('`interface IGreeter { string Name(); string Hello() => "Hi " + Name(); }` (C# 8). `class Bot : IGreeter` implements only Name. Which call compiles?', [
        ['new Bot().Hello();', false],
        ['IGreeter g = new Bot(); g.Hello();', true],
        ['Bot.Hello();', false],
        ['Bot b = new Bot(); b.Hello();', false],
      ], 'A default interface method belongs to the interface, not to the implementing class. It is callable through an IGreeter reference but not through a Bot-typed expression.'),
    ],
    checkpoint: [
      mcq('A developer adds `int retries;` to `interface IHttpClientPolicy`. What does the compiler say?', [
        ['Nothing; interface fields are implicitly static', false],
        ['Nothing; each implementing class gets its own copy', false],
        ['Error: interfaces cannot contain instance fields', true],
        ['A warning that the field should be readonly', false],
      ], 'Interfaces describe behaviour, not state, and cannot declare instance fields (CS0525). C# 8 allows static members in interfaces, but not instance fields.'),
      mcq(`What does this print?

    abstract class Job
    {
        protected Job() { Console.Write("J"); }
        public abstract void Run();
    }
    class Backup : Job
    {
        public Backup() { Console.Write("B"); }
        public override void Run() { Console.Write("R"); }
    }

    Job j = new Backup();
    j.Run();`, [
        ['BR', false],
        ['JBR', true],
        ['BJR', false],
        ['It does not compile: abstract classes have no constructors', false],
      ], 'Abstract classes can have constructors; they run when a concrete subclass is created. Job() writes J, Backup() writes B, and Run dispatches to Backup\'s override, which writes R.'),
      mcq('An e-commerce app sends order confirmations by email today and may add SMS and WhatsApp. Controllers should not change, and tests should use a fake. What fits best?', [
        ['An INotifier interface, one class per channel, injected by DI', true],
        ['A static Notifier class with a switch on a channel string', false],
        ['An abstract Notifier with a public Channel field set by callers', false],
        ['One EmailNotifier class that controllers create with new', false],
      ], 'Callers depending on an interface can receive any implementation — email, SMS, or a test fake — without changing. A static switch or direct new couples every controller to the concrete channel.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_STRUCTS_RECORDS',
    notes: `C# has two families of types, and the difference decides how values **copy** and **compare**.

- **Reference types** — \`class\`, \`record\`, \`interface\`, arrays, \`string\`: the variable holds a
  reference; assignment copies the reference.
- **Value types** — \`int\`, \`double\`, \`bool\`, \`decimal\`, \`DateTime\`, enums, \`struct\`,
  \`record struct\`: the variable holds the value itself; assignment copies the whole value.

## struct

    public struct Point
    {
        public int X;
        public int Y;
    }

    Point p1 = new Point();
    p1.X = 1;
    Point p2 = p1;     // a full copy
    p2.X = 5;
    Console.WriteLine(p1.X);   // 1 — p1 was not touched

Passing a struct to a method passes a copy, so a method that sets \`p.X = 10\` changes only its own copy.
(\`ref\` passes the variable itself.)

**The List-of-structs trap.** \`list[0]\` returns a *copy* of the element, so \`list[0].X = 5;\` would change
a temporary — C# refuses it with CS1612, "Cannot modify the return value … because it is not a
variable". Read the element, change it, write it back — or better, make the struct immutable.

Guidelines for structs: small (a few fields), logically a single value (a point, a money amount, a
colour), and **immutable** — \`public readonly struct Point\` (C# 7.2) makes the compiler enforce it.
Structs cannot be \`null\` (use \`Point?\` for "maybe a point") and cannot inherit from other structs or
classes, though they can implement interfaces.

## Records (C# 9)

A **record** is a type whose identity is its data:

    public record Person(string Name, int Age);     // positional record: a class

    var a = new Person("Asha", 30);
    var b = new Person("Asha", 30);
    Console.WriteLine(a == b);          // True  — value equality
    Console.WriteLine(a);               // Person { Name = Asha, Age = 30 }

    var older = a with { Age = 31 };    // a copy with one property changed; a is unchanged

From one line the compiler generates: a constructor, \`init\`-only properties, \`Equals\`/\`GetHashCode\`
over all properties, \`==\` and \`!=\`, a readable \`ToString\`, and \`Deconstruct\`. A \`record\` (or
\`record class\`) is still a **reference type** — it is copied by reference, but **compared by value**.
\`record struct\` (C# 10) is the value-type version.

Two equal records are still two objects: \`ReferenceEquals(a, b)\` is false.

## Choosing

| Need | Choose |
|---|---|
| An entity with identity and changing state (an \`Account\`, an EF Core entity) | \`class\` |
| An immutable data carrier compared by contents (DTOs, API requests/responses, messages) | \`record\` |
| A tiny value used in large numbers, no identity (\`Point\`, \`Rgb\`) | \`readonly struct\` or \`record struct\` |

Records are the natural fit for ASP.NET Core request and response DTOs: \`public record CreateOrderRequest(int ProductId, int Quantity);\`.

## Boxing

Assigning a struct to \`object\` (or to an interface variable) **boxes** it: the value is copied into a
new heap object. Changing the box does not change the original. Boxing in a hot loop costs
allocations — one reason generic collections (\`List<int>\`) replaced \`ArrayList\`.

## Common mistakes

- Large mutable structs: every assignment copies them, and edits land on copies.
- Expecting \`==\` on two class instances to compare contents (it compares references unless the type
  overloads it — records do).
- Using a record for an EF Core entity whose properties change — records are designed around
  immutability and value equality.`,
    mcqs: [
      mcq(`What does this print?

    struct Pixel { public int X; }

    Pixel a = new Pixel();
    a.X = 1;
    Pixel b = a;
    b.X = 5;
    Console.WriteLine(a.X);`, [
        ['5, because a and b refer to the same Pixel', false],
        ['0, because a struct copy resets every field', false],
        ['1, because assigning a struct copies the whole value', true],
        ['It does not compile: a struct needs a constructor', false],
      ], 'Pixel is a value type, so b = a copies the data. Changing b.X leaves a.X at 1. Had Pixel been a class, both variables would share one object and it would print 5.'),
      mcq('`public record Book(string Title, int Year);` — what does `new Book("C#", 2024) == new Book("C#", 2024)` give, and why?', [
        ['False, because the two Books are different objects', false],
        ['True, because records compare their property values', true],
        ['It does not compile: == is not defined for records', false],
        ['True, because both Books are interned into one object', false],
      ], 'A record generates value-based Equals and an == operator that compare every property. They are still two distinct objects (ReferenceEquals is false), but they are equal.'),
      mcq('`var p = new Person("Ravi", 25); var q = p with { Age = 26 };` with `Person` a positional record. What is true afterwards?', [
        ['p.Age is 26, because with changes the original record', false],
        ['p and q are the same object with Age now 26', false],
        ['It does not compile: positional records cannot use with', false],
        ['p.Age is 25 and q is a new record with Age 26', true],
      ], 'A with-expression copies the record and applies the listed changes to the copy. Records are designed to be immutable, so the original is untouched.'),
    ],
    checkpoint: [
      mcq(`What does the compiler do with this?

    struct Cell { public int Value; }

    var cells = new List<Cell> { new Cell() };
    cells[0].Value = 5;`, [
        ['It compiles, and cells[0].Value becomes 5', false],
        ['It compiles, but the change is lost on a temporary copy', false],
        ['Error: the indexer returns a copy, which is not a variable', true],
        ['It throws InvalidOperationException at runtime', false],
      ], 'The List indexer returns a copy of the struct. C# rejects modifying that temporary (CS1612) because the change would be silently lost. Copy it out, change it, and assign it back.'),
      mcq(`What does this print?

    struct Pos { public int X; }
    static void Shift(Pos p) { p.X = 10; }

    Pos start = new Pos();
    start.X = 1;
    Shift(start);
    Console.WriteLine(start.X);`, [
        ['10', false],
        ['1', true],
        ['0', false],
        ['11', false],
      ], 'A struct argument is copied into the parameter. Shift changes its own copy, and the caller\'s start keeps X = 1. Declaring the parameter `ref Pos p` would make it 10.'),
      mcq('What kind of type does `public record Order(int Id, decimal Total);` declare?', [
        ['A value type, copied in full on every assignment', false],
        ['A struct that is stored on the stack', false],
        ['An interface whose properties are generated', false],
        ['A reference type that compares by value', true],
      ], 'A plain record is a record class: a reference type with compiler-generated value equality. Only record struct (C# 10) declares a value type.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_OBJECT_METHODS',
    notes: `Every type in .NET derives from \`System.Object\` and inherits its virtual methods. Three of them
matter in everyday code and in interviews: \`ToString\`, \`Equals\` and \`GetHashCode\`.

## ToString

    public override string ToString() => Name + " (" + Id + ")";

\`Console.WriteLine(obj)\`, string concatenation (\`"x" + obj\`), interpolation and the debugger all call
\`ToString\`. The inherited version returns the type's full name, which is useless in a log. Override it
for anything you will print or debug.

## Equals and ==

For a **class**, the inherited \`Equals\` and the \`==\` operator both mean **reference equality**: same
object? Two \`Money\` objects holding 5 rupees are not equal until you say so:

    public class Money
    {
        public decimal Amount { get; }
        public string Currency { get; }
        public Money(decimal amount, string currency) { Amount = amount; Currency = currency; }

        public override bool Equals(object obj)
        {
            var other = obj as Money;
            return other != null && Amount == other.Amount && Currency == other.Currency;
        }

        public override int GetHashCode() => HashCode.Combine(Amount, Currency);
    }

Overriding \`Equals\` does **not** change \`==\`. \`m1 == m2\` is still a reference comparison unless you
also declare \`public static bool operator ==(Money a, Money b)\` (and \`!=\`). Records and \`string\` do
this for you.

The signature matters. \`public bool Equals(Money other)\` without \`override\` is just a new overload —
\`List<Money>.Contains\` and \`Dictionary\` will not use it unless the class also implements
\`IEquatable<Money>\`. The standard pattern is: implement \`IEquatable<T>.Equals(T)\` with the real
logic, and override \`Equals(object)\` to call it.

## The contract between Equals and GetHashCode

**If two objects are equal, they must return the same hash code.** \`HashSet<T>\` and
\`Dictionary<TKey,TValue>\` first use the hash code to pick a bucket, and only then call \`Equals\` on what
is in that bucket. If you override \`Equals\` but not \`GetHashCode\` (the compiler warns, CS0659), two
equal objects usually have different hash codes, land in different buckets, and the set happily holds
both.

Rules for \`GetHashCode\`:
- Use the **same fields** as \`Equals\` — or a subset of them.
- Use \`HashCode.Combine(a, b, c)\` (.NET Core 2.1+), not a hand-rolled formula.
- Prefer **immutable** fields. If a field used in the hash changes after the object is in a
  \`HashSet\`, the object sits in the bucket for its old hash and \`Contains\` can no longer find it.
- Unequal objects *may* share a hash code (a collision); it only costs speed.

## Do not override what you do not need

Entities with an identity (an EF Core \`Order\` with an \`Id\`) often keep reference equality, or
compare by \`Id\` only. Value-like types (\`Money\`, \`DateRange\`) compare by contents — and are usually
better written as records, which generate all of this correctly:

    public record Money(decimal Amount, string Currency);

## Common mistakes

- \`Equals\` without \`GetHashCode\` — duplicates in sets, missing dictionary keys.
- \`Equals(Money)\` written as an overload instead of an override.
- Expecting \`==\` to follow an overridden \`Equals\`.
- Hashing a mutable field, then mutating the object while it is a key.`,
    workedExample: `**Problem.** Students are identified by a roll number that never changes; their name can be
corrected. Two \`Student\` objects with the same roll number must count as one in a \`HashSet<Student>\`
and as the same key in a \`Dictionary<Student, int>\`.

**Step 1 — decide what equality means.** Identity here is the roll number. A renamed student is still
the same student, so \`Name\` stays out of equality. That also keeps the hash stable when a name is
corrected.

**Step 2 — make the roll number immutable**, because it feeds the hash:

    public class Student : IEquatable<Student>
    {
        public string RollNo { get; }          // get-only: fixed at construction
        public string Name { get; set; }       // may change; not part of equality

        public Student(string rollNo, string name) { RollNo = rollNo; Name = name; }

**Step 3 — implement IEquatable<Student> with the real logic**, so generic collections call it without
boxing or casting:

        public bool Equals(Student other)
        {
            if (other is null) return false;
            if (ReferenceEquals(this, other)) return true;
            return RollNo == other.RollNo;
        }

**Step 4 — override Equals(object) and GetHashCode to agree with it:**

        public override bool Equals(object obj) => Equals(obj as Student);
        public override int GetHashCode() => RollNo.GetHashCode();

**Step 5 — ToString for logs:**

        public override string ToString() => RollNo + " " + Name;
    }

**Check it.**

    var a = new Student("22CS041", "Asha");
    var b = new Student("22CS041", "Asha K");
    var set = new HashSet<Student> { a, b };
    Console.WriteLine(set.Count);       // 1
    Console.WriteLine(a.Equals(b));     // True
    Console.WriteLine(a == b);          // False — == was not overloaded

The last line is deliberate: overriding \`Equals\` does not change \`==\`. If the team expects \`==\` to
work, add \`operator ==\` and \`operator !=\` that call \`Equals\` — or, if the type is pure data, make it a
record and let the compiler generate all of it.`,
    mcqs: [
      mcq(`Fee overrides Equals(object) to compare Amount but does not overload ==. What does this print?

    var f1 = new Fee(5);
    var f2 = new Fee(5);
    Console.WriteLine((f1 == f2) + " " + f1.Equals(f2));`, [
        ['True True', false],
        ['False False', false],
        ['True False', false],
        ['False True', true],
      ], 'Overriding Equals does not change the == operator. For a class without operator ==, == still compares references, which differ; Equals uses the override and compares Amount.'),
      mcq('A class overrides Equals to compare its Code property but leaves GetHashCode alone. Two equal objects are added to a HashSet. What usually happens?', [
        ['The set holds both, as their hash codes put them in different buckets', true],
        ['The set holds one, because HashSet calls Equals on every element', false],
        ['The second Add throws a duplicate-key exception', false],
        ['The compiler refuses the class until GetHashCode is overridden', false],
      ], 'HashSet picks a bucket from GetHashCode before it ever calls Equals. The inherited hash is per-object, so equal objects almost always land apart and both are stored. The compiler only warns (CS0659).'),
      mcq('Why should Equals and GetHashCode use the same fields?', [
        ['Because the compiler compares the two method bodies and warns', false],
        ['So that ToString can print both of the methods\' results', false],
        ['Because equal objects must produce equal hash codes for lookups to work', true],
        ['Because the runtime calls GetHashCode from inside every single Equals call', false],
      ], 'Hash-based collections find the bucket by hash and then confirm with Equals. If equal objects could hash differently, a lookup would search the wrong bucket and miss.'),
    ],
    checkpoint: [
      mcq(`Rate declares \`public bool Equals(Rate other)\` (no override, no IEquatable). What does this print?

    var rates = new List<Rate> { new Rate(5) };
    Console.WriteLine(rates.Contains(new Rate(5)));`, [
        ['True, because Contains calls the Equals(Rate) method', false],
        ['False, because Contains uses the inherited Equals(object)', true],
        ['It does not compile: Equals must take an object parameter', false],
        ['It throws, because Rate does not implement IEquatable', false],
      ], 'Equals(Rate) is only an overload. Without IEquatable<Rate>, List.Contains uses the default comparer, which calls the virtual Equals(object) — still reference equality — so it prints False.'),
      mcq(`Badge overrides Equals and GetHashCode using its mutable Id. What does this print?

    var badge = new Badge { Id = 1 };
    var set = new HashSet<Badge> { badge };
    badge.Id = 2;
    Console.WriteLine(set.Contains(badge) + " " + set.Count);`, [
        ['True 1', false],
        ['False 0', false],
        ['True 2', false],
        ['False 1', true],
      ], 'The badge was stored in the bucket for hash 1. After Id becomes 2, Contains looks in the bucket for hash 2 and does not find it, although the set still holds one element. Hash only immutable fields.'),
      mcq('Which is the best GetHashCode for a class whose Equals compares FirstName and LastName?', [
        ['return HashCode.Combine(FirstName, LastName);', true],
        ['return base.GetHashCode();', false],
        ['return new Random().Next();', false],
        ['return (FirstName + LastName).Length * DateTime.Now.Second;', false],
      ], 'GetHashCode must be deterministic and use the fields Equals uses. HashCode.Combine does that. base.GetHashCode is per-object, and the random or time-based versions return different values for the same object.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_DEBUGGING',
    notes: `Seven OOP faults that reach code review again and again in C#. For each: read the symptom, find the
cause, change only that.

## 1. The override that never runs

    class Notifier { public void Send() { Console.WriteLine("base"); } }
    class SmsNotifier : Notifier { public new void Send() { Console.WriteLine("sms"); } }

    Notifier n = new SmsNotifier();
    n.Send();      // base

**Symptom:** the base behaviour runs although the object is an \`SmsNotifier\`. **Cause:** \`Send\` is not
virtual, so the developer wrote \`new\` (or nothing, ignoring warning CS0108) and the call is bound to
the variable's type. **Fix:** \`public virtual void Send()\` in the base and \`override\` in the derived
class.

## 2. The property that calls itself

    private string name;
    public string Name { get { return Name; } set { Name = value; } }

**Symptom:** the process dies with "Stack overflow" — no catch block helps. **Cause:** the accessors
refer to the property, not the field, and recurse forever. **Fix:** use the backing field \`name\`, or an
auto-property \`{ get; set; }\`.

## 3. The constructor that sets nothing

    public Customer(string email) { email = email; }

**Symptom:** \`customer.Email\` is null right after construction; warning CS1717 in the build output.
**Cause:** the parameter shadows the field and is assigned to itself. **Fix:** \`this.email = email;\`
(or name fields \`_email\`).

## 4. Duplicates in a HashSet

    class Sku { public string Code; public override bool Equals(object o) { ... compares Code ... } }

**Symptom:** \`new HashSet<Sku>\` holds two items with the same code; \`dict[key]\` throws
KeyNotFoundException for a key that "is there". **Cause:** \`Equals\` overridden without \`GetHashCode\`
(warning CS0659). **Fix:** override \`GetHashCode\` over the same fields — or make \`Sku\` a record.

## 5. The edit that disappeared

    struct Seat { public bool Booked; }
    var seats = new Seat[10];
    foreach (var s in seats) { /* s.Booked = true; */ }   // CS1656: cannot assign to foreach variable
    Seat first = seats[0];
    first.Booked = true;          // compiles…
    Console.WriteLine(seats[0].Booked);   // False

**Symptom:** a change to a struct "does not stick". **Cause:** \`Seat\` is a value type; \`first\` is a copy.
**Fix:** write back (\`seats[0] = first;\`), assign through the array element directly
(\`seats[0].Booked = true;\` works for arrays, not for \`List<T>\`), or make \`Seat\` a class if it has
identity and changing state.

## 6. NullReferenceException on a "created" object

    var orders = new Order[3];
    orders[0].Total = 100;     // NullReferenceException

**Cause:** an array of a class type holds three \`null\` references. **Fix:** create each element
(\`orders[i] = new Order();\`), or use a \`List<Order>\` and add objects as they are made.

## 7. == says two equal values differ

    if (paymentA == paymentB) { ... }   // never true

**Cause:** \`Payment\` is a class that overrides \`Equals\` but not \`operator ==\`, so \`==\` compares
references. **Fix:** call \`Equals\`, overload \`==\`/\`!=\`, or make it a record.

## How to work

Read the compiler **warnings** — CS0108, CS0114, CS0659 and CS1717 above each point straight at the
bug. Many teams set \`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>\` in the .csproj for exactly
this reason. Then reproduce with the smallest snippet, and change one thing at a time.`,
    mcqs: [
      mcq('`Notifier n = new SmsNotifier(); n.Send();` runs the base Send. SmsNotifier declares `public void Send()` and the build shows warning CS0108. What is the fix?', [
        ['Cast n to object before calling Send', false],
        ['Mark the base Send virtual and the derived one override', true],
        ['Add the new keyword to the derived Send to silence the warning', false],
        ['Make SmsNotifier sealed so its Send takes priority', false],
      ], 'Without virtual/override, the method is bound to the variable\'s declared type. Adding new only silences the warning and keeps the bug; virtual plus override gives dynamic dispatch.'),
      mcq('An API crashes with "Stack overflow" and no stack trace in the logs whenever a Customer is serialised. Which line is the likely cause?', [
        ['public string City { get; set; }', false],
        ['public string Email { get { return Email; } }', true],
        ['public string Name { get; private set; }', false],
        ['public string Code => code.ToUpper();', false],
      ], 'A getter that returns its own property recurses until the stack overflows, and .NET terminates the process without running catch blocks. The serializer reading Email triggers it.'),
      mcq('`Seat first = seats[0]; first.Booked = true;` leaves `seats[0].Booked` false. Seat is a struct. Which change makes the booking stick?', [
        ['Declare first with var instead of the Seat type', false],
        ['Call first.Booked = true twice so it is copied back', false],
        ['Assign it back afterwards: seats[0] = first;', true],
        ['Wrap the two lines in a lock statement', false],
      ], 'first is a copy of the struct in the array. Writing the modified copy back updates the element. var would still declare a Seat copy.'),
      mcq('A constructor `public Customer(string email) { email = email; }` compiles with warning CS1717, yet Email is always null. What is wrong?', [
        ['The parameter shadows the field, so the parameter is assigned to itself', true],
        ['Strings must be copied with string.Copy inside constructors', false],
        ['Constructors cannot assign fields that have property wrappers', false],
        ['The email field must be marked readonly before any constructor can set it', false],
      ], 'Inside the constructor, email names the parameter. Writing this.email = email (or naming the field _email) assigns the field.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_PRACTICE',
    notes: `No new ideas — repetition until classes, properties, inheritance and dispatch stop needing
thought. Work each exercise in a console project (\`dotnet new console\`), and predict the output
**before** you run it.

**Exercise 1 — A class that guards itself.** Write \`Thermostat\` with a private \`int\` target, a
constructor taking the initial target, a get-only \`Target\` property, and \`Raise()\` / \`Lower()\` that
move it by one but never outside 16–30. Print the target after five raises from 28. (Expected: 30.)

**Exercise 2 — Chained constructors and an initialiser.** Give \`Pizza\` three constructors —
\`Pizza()\`, \`Pizza(string size)\`, \`Pizza(string size, string topping)\` — where only the last assigns
anything and the others use \`: this(...)\`. Then add a settable \`ExtraCheese\` property and create one
with \`new Pizza("Large") { ExtraCheese = true }\`.

**Exercise 3 — static and readonly.** Give \`Ticket\` a \`static int\` counter and a \`readonly int\`
number assigned from it in the constructor. Create three tickets and print each number and the total.

**Exercise 4 — Predict the dispatch.** Without running it, write down what this prints:

    class Animal { public virtual string Sound() { return "..."; } public string Kind() { return "animal"; } }
    class Dog : Animal { public override string Sound() { return "Woof"; } public new string Kind() { return "dog"; } }

    Animal a = new Dog();
    Console.WriteLine(a.Sound() + " " + a.Kind() + " " + ((Dog)a).Kind());

**Exercise 5 — Interface or abstract class?** Decide and justify in one sentence each: \`IExportable\`
(CSV and PDF reports), \`Vehicle\` with a shared \`Plate\` and a constructor that requires it,
\`IComparable<Money>\`.

**Exercise 6 — Value or reference?** Write \`struct Point { public int X; }\` and \`class Marker { public
int X; }\`. Copy each into a second variable, change the copy, and print both originals. Then make
\`Point\` a \`record struct\` and a \`record\` and compare two equal instances with \`==\`.

## The graded exercise — Shapes from commands

Build an abstract \`Shape\` hierarchy with an \`IScalable\` interface, drive it from commands on standard
input, and print a report. Your program is run against test cases, so the output must match exactly.
The full specification is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, `Raise()` is called five times on a Thermostat whose target starts at 28 and is capped at 30. What should Target be?', [
        ['33, since each of the five raises adds one', false],
        ['28, since a raise past the cap undoes the others', false],
        ['30, since Raise stops moving at the maximum', true],
        ['It throws InvalidOperationException on the third call', false],
      ], 'The rule lives inside Raise: the target moves only while it is below 30. Two calls reach 30; the other three leave it there.'),
      mcq('In Exercise 2, `new Pizza("Large") { ExtraCheese = true }` runs. In what order do things happen?', [
        ['ExtraCheese is set first, then Pizza(string) runs', false],
        ['Pizza(string, string) body, then Pizza(string) body, then ExtraCheese is set', true],
        ['Pizza(string) body, then Pizza(string, string) body, then ExtraCheese is set', false],
        ['Only Pizza(string) runs; the initialiser replaces the chain', false],
      ], 'The : this(...) target runs before the forwarding constructor\'s own body, and an object initialiser runs only after construction has finished.'),
      mcq('In Exercise 3, the ticket number is a `readonly int` assigned in the constructor. Which later line fails to compile inside a Ticket method?', [
        ['Console.WriteLine(number);', false],
        ['int copy = number + 1;', false],
        ['issued++;', false],
        ['number = issued;', true],
      ], 'A readonly field may be assigned only in its initialiser or a constructor. Reading it is fine, and issued is an ordinary static field.'),
      mcq('In Exercise 4, what does the Console.WriteLine line print for the Animal a = new Dog() variable?', [
        ['Woof animal dog', true],
        ['Woof dog dog', false],
        ['... animal dog', false],
        ['Woof animal animal', false],
      ], 'Sound is virtual and overridden, so it dispatches to Dog: Woof. Kind is hidden with new, so the variable\'s type decides: an Animal variable gives animal, the cast to Dog gives dog.'),
      mcq('In Exercise 6, Point is a struct and Marker a class. Each is copied into a second variable and the copy\'s X is set to 9. What do the originals show if both started at 1?', [
        ['Point 9 and Marker 9', false],
        ['Point 1 and Marker 1', false],
        ['Point 9 and Marker 1', false],
        ['Point 1 and Marker 9', true],
      ], 'Copying a struct copies the value, so the original Point keeps 1. Copying a class variable copies the reference, so both Marker variables see 9.'),
    ],
    assignment: {
      title: 'Shapes from Commands',
      description: 'Model shapes with an abstract class, inheritance and an interface, drive them from commands on standard input, and print a report.',
      instructions: `Write a C# console program that reads commands, builds shapes, and prints a report.

**The grader runs C# 7 (Mono):** use a classic \`class Program { static void Main() { ... } }\`, and do
not use records, top-level statements, \`init\` or file-scoped namespaces. Read input with
\`Console.ReadLine()\`.

**Input**

The first line is a number N. Each of the next N lines is one command:

    CIRCLE <name> <radius>
    RECT <name> <width> <height>
    SQUARE <name> <side>
    SCALE <name> <factor>
    PRINT

Numbers may have a decimal point (use \`.\`); parse them with \`CultureInfo.InvariantCulture\`. Names have
no spaces.

**Design (this is what the exercise is for)**

- An \`abstract class Shape\` with a get-only \`Name\`, an abstract \`Kind\` property, and abstract
  \`Area()\` and \`Perimeter()\` methods. \`Shape\` overrides \`ToString()\` to return
  \`<name> <Kind> area=<area> perimeter=<perimeter>\`, both numbers with two decimals.
- \`Circle\` and \`Rectangle\` derive from \`Shape\`; \`Square\` derives from \`Rectangle\` and overrides only
  \`Kind\`.
- An \`interface IScalable { void Scale(double factor); }\` implemented by \`Circle\` and \`Rectangle\`
  (a circle scales its radius; a rectangle both sides). \`Square\` inherits it.
- Fields are private. The main loop never checks the concrete type of a shape.

**Rules, in this order for each shape command**

1. An unknown command prints \`Unknown command: <COMMAND>\`.
2. A shape whose name is already used prints \`Duplicate name: <name>\` and is not added.
3. A shape with any size ≤ 0 prints \`Invalid size: <name>\` and is not added.
4. Otherwise the shape is added.

\`SCALE\` on a name that does not exist prints \`No shape: <name>\`; a factor ≤ 0 prints
\`Invalid size: <name>\` and changes nothing. \`PRINT\` prints every shape in the order added, one per
line, using \`ToString()\`.

After all N commands, print three lines:

    Shapes: <count>
    Total area: <sum of areas, two decimals>
    Largest: <name of the shape with the largest area>

If two shapes tie for the largest area, name the one added first. With no shapes, print
\`Largest: none\`. Format every number with
\`ToString("F2", CultureInfo.InvariantCulture)\` and use \`Math.PI\`.

**Example**

Input:

    4
    RECT door 2 3
    CIRCLE coin 1
    SQUARE tile 2
    PRINT

Output:

    door Rectangle area=6.00 perimeter=10.00
    coin Circle area=3.14 perimeter=6.28
    tile Square area=4.00 perimeter=8.00
    Shapes: 3
    Total area: 13.14
    Largest: door

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including unknown commands, duplicates, invalid sizes, scaling, ties and no shapes.', maxPoints: 60 },
        { criterion: 'Hierarchy, interface and overriding', description: 'An abstract Shape with abstract Kind, Area and Perimeter; Square derives from Rectangle; IScalable implemented once per family; printing relies on ToString and dispatch, not type checks.', maxPoints: 25 },
        { criterion: 'Encapsulation', description: 'Fields are private; Name is get-only; no class reaches into another class\'s state.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;
using System.Globalization;

// TODO: interface IScalable { void Scale(double factor); }
// TODO: abstract class Shape with Name, abstract Kind, Area(), Perimeter() and a ToString override
// TODO: class Circle, class Rectangle, class Square : Rectangle

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine().Trim());
        for (int i = 0; i < n; i++)
        {
            string line = Console.ReadLine();
            if (line == null) break;
            string[] parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) continue;

            // TODO: handle CIRCLE, RECT, SQUARE, SCALE and PRINT, and report bad commands
        }

        // TODO: print Shapes, Total area and Largest
    }
}
`,
        tests: [
          { input: '4\nRECT door 2 3\nCIRCLE coin 1\nSQUARE tile 2\nPRINT\n', expectedOutput: 'door Rectangle area=6.00 perimeter=10.00\ncoin Circle area=3.14 perimeter=6.28\ntile Square area=4.00 perimeter=8.00\nShapes: 3\nTotal area: 13.14\nLargest: door' },
          { input: '5\nSQUARE a 3\nRECT b 4 2\nSCALE b 2\nSCALE zz 2\nPRINT\n', expectedOutput: 'No shape: zz\na Square area=9.00 perimeter=12.00\nb Rectangle area=32.00 perimeter=24.00\nShapes: 2\nTotal area: 41.00\nLargest: b' },
          { input: '6\nCIRCLE c 2\nTRIANGLE t 3\nCIRCLE c 5\nRECT r 0 4\nSQUARE s -1\nPRINT\n', expectedOutput: 'Unknown command: TRIANGLE\nDuplicate name: c\nInvalid size: r\nInvalid size: s\nc Circle area=12.57 perimeter=12.57\nShapes: 1\nTotal area: 12.57\nLargest: c', isHidden: true },
          { input: '3\nRECT p 2 8\nSQUARE q 4\nPRINT\n', expectedOutput: 'p Rectangle area=16.00 perimeter=20.00\nq Square area=16.00 perimeter=16.00\nShapes: 2\nTotal area: 32.00\nLargest: p', isHidden: true },
          { input: '1\nPRINT\n', expectedOutput: 'Shapes: 0\nTotal area: 0.00\nLargest: none', isHidden: true },
          { input: '5\nCIRCLE w 1.5\nSCALE w 2\nSQUARE k 2.5\nSCALE k 0\nPRINT\n', expectedOutput: 'Invalid size: k\nw Circle area=28.27 perimeter=18.85\nk Square area=6.25 perimeter=10.00\nShapes: 2\nTotal area: 34.52\nLargest: w', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_CS_OOP_INTERVIEW_QUESTION',
    notes: `Three questions asked in almost every .NET fresher interview. For each: the answer that gets you
through, and the follow-up a good answer earns.

## 1. "Explain the four pillars of OOP with a C# example of each."

**Model answer.** *Encapsulation*: state is private and changes only through members that keep it
valid — a \`BankAccount\` with \`public decimal Balance { get; private set; }\` and \`Deposit\`/\`Withdraw\`
methods. *Abstraction*: callers depend on a contract, not an implementation — a controller takes an
\`IPaymentGateway\` from dependency injection, not a concrete \`RazorpayGateway\`. *Inheritance*: a class
reuses and specialises another — \`SavingsAccount : Account\`, calling \`: base(owner)\`. *Polymorphism*:
one call, behaviour chosen by the object — \`account.MonthlyCharge()\` is \`virtual\` in \`Account\` and
\`override\`n in each account type; overloading is the compile-time form.

**Follow-up:** "In C#, what happens if the base method is not virtual?" You cannot override it
(CS0506). You can only *hide* it with \`new\`, and then the variable's declared type picks the method —
\`Account a = new SavingsAccount(); a.M()\` runs Account's version. That is a real difference from Java,
where methods are virtual by default.

## 2. "Abstract class or interface — how do you choose, now that interfaces can have default methods?"

**Model answer.** An interface is a contract without instance state; a class can implement many, so
it suits capabilities shared by unrelated types (\`IDisposable\`, \`IComparable<T>\`) and anything you
inject or mock — which in ASP.NET Core is most services. An abstract class can hold fields,
constructors and finished methods, but a class has only one base, so it suits closely related types
sharing state or a fixed algorithm with overridable steps. C# 8 default interface methods let an
interface evolve without breaking implementers, but they still carry **no instance state** and are
callable only through the interface type — so **state and single inheritance** remain the deciding
difference.

**Follow-up:** "Two interfaces declare \`void Save()\` with different meanings — what do you do?"
Implement them **explicitly**: \`void IFileStore.Save() {...}\` and \`void ICloudStore.Save() {...}\`;
each is called through its own interface.

## 3. "class, struct or record — what is the difference?"

**Model answer.** A \`class\` is a reference type: variables share one object, and \`==\` compares
references by default — right for entities with identity and changing state. A \`struct\` is a value
type: assignment copies the data, it cannot be null without \`?\`, and it should be small and immutable
— \`DateTime\`, a \`Point\`. A \`record\` (C# 9) is a reference type with compiler-generated value
equality, \`ToString\`, \`init\` properties and \`with\`-expressions — ideal for DTOs and messages.
\`record struct\` (C# 10) is the value-type version.

**Follow-up:** "Why must Equals and GetHashCode be overridden together?" Hash-based collections pick
a bucket by \`GetHashCode\` before calling \`Equals\`; if equal objects hash differently, a \`HashSet\`
stores duplicates and a \`Dictionary\` misses keys. Records generate both consistently.

## Answering aloud

Say the definition, give the C# example, then name the trade-off. Interviewers listen for the third
part — it is what separates a memorised answer from an understood one.`,
    mcqs: [
      mcq('An interviewer asks what changes in C# compared with Java when a base method is not marked virtual. Which answer is accurate?', [
        ['Nothing — C# methods are virtual by default, as in Java', false],
        ['It can only be hidden with new, and the declared type picks the method', true],
        ['It can still be overridden, but only by classes inside the same assembly', false],
        ['The compiler makes it virtual when a subclass declares override', false],
      ], 'C# methods are non-virtual unless declared virtual (or abstract). Overriding one is CS0506; a same-named method hides it, and calls bind to the variable\'s compile-time type.'),
      mcq('C# 8 added default interface methods. What still separates an interface from an abstract class?', [
        ['Interfaces still may not contain any method bodies', false],
        ['Only abstract classes may declare abstract members', false],
        ['An abstract class may be implemented by many unrelated classes', false],
        ['Only an abstract class can hold instance state and constructors', true],
      ], 'Interfaces can now carry behaviour but still have no instance fields or constructors, and a class can implement many interfaces while deriving from one class.'),
      mcq('Which type fits an ASP.NET Core API request body such as `{ "productId": 7, "quantity": 2 }` best?', [
        ['A mutable struct, so that each request is copied safely', false],
        ['A record such as CreateOrderRequest(int ProductId, int Quantity)', true],
        ['A static class with public static ProductId and Quantity fields', false],
        ['An abstract class, so each endpoint can derive its own request', false],
      ], 'A request DTO is pure data that should not change after binding: a record gives concise syntax, init-only properties, value equality and readable ToString. Static fields would be shared by every request.'),
    ],
  },

  {
    unitCode: 'JT_CS_OOP_MINI_PROJECT',
    notes: `# Mini Project — A Bank Account System

Build a console bank in C# (.NET 8, no frameworks beyond the base library). The point is not the
banking — it is designing classes that cannot be put into an invalid state, and using inheritance and
interfaces where each genuinely fits.

## What it does

The program keeps accounts in memory and reads commands from the console:

    OPEN SAVINGS asha 5000
    OPEN CURRENT ravi 0
    DEPOSIT S1 2500
    WITHDRAW C1 300
    TRANSFER S1 C1 1000
    MONTHEND 1.5
    STATEMENT S1
    EXIT

Savings accounts get ids S1, S2, …; current accounts C1, C2, ….

## Requirements

1. **Account types.** An abstract \`Account\` with a get-only \`Id\` and \`Owner\` and a
   \`decimal Balance { get; private set; }\` (\`decimal\`, never \`double\`, for money). Two concrete types:
   - \`SavingsAccount\`: no overdraft; at least ₹1,000 must remain after any withdrawal.
   - \`CurrentAccount\`: an overdraft limit set at opening (default ₹5,000); the balance may go negative
     down to minus that limit.
   The withdrawal rule differs by type, so \`protected abstract bool CanWithdraw(decimal amount)\` is
   overridden in each — never decided with \`is\` or a \`switch\` on the type.
2. **Encapsulation.** Balance changes only through \`Deposit\` and \`Withdraw\` on \`Account\`. There is
   no public setter. The transaction history is exposed as \`IReadOnlyList<Transaction>\`.
3. **An interface.** \`IInterestBearing\` with \`void AddInterest(decimal ratePercent)\`, implemented by
   \`SavingsAccount\` only. \`MONTHEND <rate>\` applies interest to every account that implements it.
4. **Transfers.** \`Bank.Transfer(fromId, toId, amount)\` withdraws then deposits. If the withdrawal is
   refused, neither account changes.
5. **Input validation.** Non-numeric amounts (\`decimal.TryParse\`), zero or negative amounts, unknown
   account ids and unknown commands each print a clear message and change nothing. The program never
   crashes on bad input.
6. **Statements.** \`STATEMENT <id>\` prints each transaction (type, amount, balance after) and the
   current balance, formatted as rupees with two decimals.
7. **Transaction** is a \`record\` (type, amount, balance after, timestamp) — immutable by design.
8. **Equality and printing.** \`Account\` overrides \`Equals\`/\`GetHashCode\` by \`Id\` and \`ToString\`
   (\`S1 asha 7,500.00\`).

## Acceptance criteria

- Withdrawing 4,500 from a savings account holding 5,000 is refused (it would leave 500); the balance
  stays 5,000.00.
- A current account with a 5,000 overdraft can reach −5,000.00 and no further.
- A refused transfer leaves both balances exactly as they were.
- \`DEPOSIT S1 abc\` and \`DEPOSIT S1 -50\` each print an error and change nothing.
- After \`MONTHEND 1\`, a savings balance of 10,000.00 becomes 10,100.00; current accounts are
  untouched.
- No field of any class is public, and no type check decides a withdrawal rule.

## Stretch goals

Save accounts to a file on EXIT and load them on start (after the Exceptions topic); add a
\`FixedDepositAccount\` that refuses withdrawals before maturity — it should need a new class and no
edits to \`Bank\`.

## What to submit

The source (one class per file), a README with three sample sessions (one normal, one with a refused
withdrawal or transfer, one with invalid input), and five sentences explaining why \`Account\` is
abstract, why \`IInterestBearing\` is an interface, and how your design stops a balance being set
directly.`,
    mcqs: [
      mcq('The brief stores balances as `decimal` rather than `double`. Why?', [
        ['decimal is a reference type, so balances are shared safely', false],
        ['double cannot represent amounts like 0.10 exactly; decimal can', true],
        ['decimal uses less memory than double for large balances', false],
        ['double cannot hold negative values, which overdrafts need', false],
      ], 'double is binary floating point, so most decimal fractions are approximations and sums drift (0.1 + 0.2 != 0.3). decimal stores base-10 digits exactly, which is why .NET money code uses it.'),
      mcq('In the C# bank, SavingsAccount keeps a minimum balance and CurrentAccount allows an overdraft. Where should that withdrawal rule live?', [
        ['In Bank, as an if/else chain that checks `account is SavingsAccount`', false],
        ['In the command loop, where each WITHDRAW line is parsed', false],
        ['In a CanWithdraw method that each account type overrides', true],
        ['In a public bool AllowOverdraft field set by whoever opens it', false],
      ], 'The rule belongs to the account type, so each subclass overrides CanWithdraw and Account.Withdraw calls it polymorphically. A new account type then needs a new class, not edits to every if/else.'),
    ],
    assignment: {
      title: 'A Bank Account System',
      description: 'A console bank with savings and current accounts, deposits, withdrawals, transfers, interest and statements, designed with encapsulation, inheritance and an interface.',
      instructions: `Build the bank described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The C# source (.NET 8 console app): an abstract \`Account\`, \`SavingsAccount\`, \`CurrentAccount\`,
   an \`IInterestBearing\` interface, a \`Transaction\` record, a \`Bank\` that holds accounts and performs
   transfers, and \`Program\` with the command loop.
2. A README with three sample sessions copied from your console — one normal, one with a refused
   withdrawal or transfer, one with invalid input (a non-numeric amount, a negative amount, an unknown
   account id).
3. Five sentences explaining why \`Account\` is abstract, why \`IInterestBearing\` is an interface, and
   how your design stops a balance from being set directly.

**Before you submit, check every acceptance criterion in the brief** by running it, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct banking behaviour', description: 'Deposits, withdrawals, transfers, minimum balance, overdraft limit and month-end interest all behave as the acceptance criteria state; a refused transfer changes nothing.', maxPoints: 30 },
        { criterion: 'Encapsulation', description: 'All fields private; Balance has a private setter and changes only through Deposit and Withdraw; history exposed as IReadOnlyList; money held as decimal.', maxPoints: 20 },
        { criterion: 'Inheritance and interface used where they fit', description: 'Abstract Account with an overridden CanWithdraw; IInterestBearing implemented only by savings; no type checks decide withdrawal rules.', maxPoints: 20 },
        { criterion: 'Input validation', description: 'Non-numeric, zero and negative amounts, unknown ids and unknown commands each give a clear message; the program never crashes on bad input.', maxPoints: 15 },
        { criterion: 'Object methods and explanation', description: 'Equals and GetHashCode by Id, a useful ToString, Transaction as a record, and a README whose sessions and five sentences justify the design.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'JT_CS_OOP_CHECKPOINT',
    notes: `Ten questions across the whole topic: classes and references, constructors, properties, static and
readonly, inheritance, virtual/override/new, abstraction, structs and records, and the Object methods.
Most show a few lines of C# and ask what happens. Trace the code by hand — which constructor runs
first, whether the method is virtual, whether the type copies by value — before you look at the
options.`,
    checkpoint: [
      mcq(`What does this print?

    class Basket { public int Items; }
    static void Add(Basket b) { b.Items += 2; }

    var basket = new Basket();
    Add(basket);
    Add(basket);
    Console.WriteLine(basket.Items);`, [
        ['0', false],
        ['2', false],
        ['4', true],
        ['It does not compile', false],
      ], 'Add receives a copy of the reference, but it points at the caller\'s Basket, so each call changes the shared object. Two calls add 4.'),
      mcq(`What does this print?

    class Engine
    {
        public Engine() : this(4) { Console.Write("X"); }
        public Engine(int cylinders) { Console.Write(cylinders); }
    }

    new Engine();`, [
        ['X4', false],
        ['4X', true],
        ['4', false],
        ['X', false],
      ], 'The : this(4) target runs first and writes 4; then the parameterless constructor\'s body writes X.'),
      mcq('`public decimal Balance { get; private set; }` is declared on `Account`. Which line, written in a separate `Program` class, compiles?', [
        ['account.Balance = 100m;', false],
        ['account.Balance += 100m;', false],
        ['var b = account.Balance;', true],
        ['account.set_Balance(100m);', false],
      ], 'The getter is public and the setter private. Reading compiles; assignment and compound assignment both need the inaccessible setter, and set_Balance is not callable directly from C#.'),
      mcq(`What does this print?

    class Device
    {
        public virtual string Id() { return "device"; }
        public string Type() { return "generic"; }
    }
    class Phone : Device
    {
        public override string Id() { return "phone"; }
        public new string Type() { return "mobile"; }
    }

    Device d = new Phone();
    Console.WriteLine(d.Id() + " " + d.Type());`, [
        ['phone mobile', false],
        ['device generic', false],
        ['device mobile', false],
        ['phone generic', true],
      ], 'Id is virtual and overridden, so it dispatches to Phone. Type is hidden with new, so the declared type Device picks Device.Type.'),
      mcq('An `abstract class Report` has `public abstract string Render();` and `class PdfReport : Report` does not override Render. What happens?', [
        ['PdfReport compiles, and Render returns null when called', false],
        ['PdfReport fails to compile unless it is also declared abstract', true],
        ['PdfReport compiles, and Render throws NotImplementedException', false],
        ['PdfReport compiles, but only Report objects can call Render', false],
      ], 'A non-abstract class must implement every inherited abstract member (CS0534). Otherwise it must be declared abstract itself.'),
      mcq(`What does this print?

    struct Coin { public int Value; }

    var a = new Coin { Value = 5 };
    var b = a;
    b.Value = 10;
    object boxed = a;
    a.Value = 20;
    Console.WriteLine(((Coin)boxed).Value + " " + b.Value);`, [
        ['20 10', false],
        ['5 10', true],
        ['5 5', false],
        ['20 20', false],
      ], 'b is a copy, so changing it does not touch a. Boxing copies a\'s value (5) into a new object, so changing a afterwards does not change the box. The line prints 5 and 10.'),
      mcq('`record Seat(string Row, int Number);` — what does `new Seat("A", 4).Equals(new Seat("A", 4))` return, and what does `ReferenceEquals` return for the same two?', [
        ['True and False', true],
        ['True and True', false],
        ['False and False', false],
        ['False and True', false],
      ], 'Records compare by value, so Equals is True. They are still two separate objects on the heap, so ReferenceEquals is False.'),
      mcq('A `Product` class overrides `Equals` by `Sku` but not `GetHashCode`. Two equal products are used as keys in a `Dictionary<Product, int>`. What is the likely symptom?', [
        ['The compiler refuses the Dictionary declaration', false],
        ['The second Add throws ArgumentException because the two keys are equal', false],
        ['Both keys are stored, and a lookup with an equal Product misses', true],
        ['Lookups work but are slower than with a hash code', false],
      ], 'The inherited per-object hash sends equal products to different buckets, so the dictionary stores both and a lookup with a third equal Product searches the wrong bucket. The compiler only warns (CS0659).'),
      mcq('`static class MathUtil { public static int Square(int x) { return x * x; } }` — which line fails to compile?', [
        ['int s = MathUtil.Square(4);', false],
        ['var m = new MathUtil();', true],
        ['Console.WriteLine(MathUtil.Square(2));', false],
        ['Func<int, int> f = MathUtil.Square;', false],
      ], 'A static class cannot be instantiated. Its members are called through the class name, and a static method can be assigned to a delegate.'),
      mcq('A team keeps adding `if (account is SavingsAccount) ... else if (account is CurrentAccount) ...` in five services. What is the OOP fix?', [
        ['Add an AccountType string and switch on it in each service', false],
        ['Move each branch into a virtual method that each type overrides', true],
        ['Make every account a struct, so type checks are faster', false],
        ['Mark SavingsAccount and CurrentAccount sealed', false],
      ], 'Type checks scattered across callers are the smell polymorphism removes. Put the behaviour on the account types as an override; adding a new type then changes one class instead of five services.'),
    ],
  },
];

/* ══ JT_CS_EXCEPTIONS — Exceptions and File I/O in C# ════════════════════════════════════ */

const EXCEPTION_BUNDLES: PilotBundle[] = [
  {
    unitCode: 'JT_CS_EXCEPTIONS_HIERARCHY',
    notes: `An **exception** is .NET's way of saying "this operation could not do what it promised". When one is
thrown, normal execution stops and the runtime walks back up the call stack looking for a matching
\`catch\`. If none is found, the program ends and prints the exception and its stack trace.

## The family tree

Every exception derives from \`System.Exception\`. The ones you will meet weekly:

    System.Exception
    ├── SystemException                      (thrown by the runtime and base library)
    │   ├── ArgumentException                — a parameter value is not acceptable
    │   │   ├── ArgumentNullException        — a parameter was null
    │   │   └── ArgumentOutOfRangeException  — outside the allowed range (also List<T>[badIndex])
    │   ├── InvalidOperationException        — the object's state does not allow this call
    │   │                                      (Queue.Dequeue on empty, modifying a list while iterating it)
    │   ├── NullReferenceException           — you used a member through a null reference
    │   ├── IndexOutOfRangeException         — array index outside 0..Length-1
    │   ├── FormatException                  — int.Parse("12a")
    │   ├── InvalidCastException             — (int)someObjectHoldingAString
    │   ├── ArithmeticException
    │   │   ├── DivideByZeroException        — integer or decimal division by zero
    │   │   └── OverflowException            — checked arithmetic, int.Parse("99999999999")
    │   ├── IO.IOException
    │   │   ├── FileNotFoundException
    │   │   └── DirectoryNotFoundException
    │   └── NotSupportedException / NotImplementedException (the latter derives from SystemException)
    └── (your own exceptions derive from Exception)

\`KeyNotFoundException\` (a missing \`Dictionary\` key) and \`TaskCanceledException\` (cancelled async work)
are other everyday ones.

Two runtime facts worth knowing:

- **Floating-point division by zero does not throw.** \`10 / 0\` with ints throws
  \`DivideByZeroException\`; \`10.0 / 0\` gives \`double.PositiveInfinity\`, and \`0.0 / 0\` gives \`NaN\`.
- **Integer overflow is silent by default.** \`int.MaxValue + 1\` wraps to \`-2147483648\`. Inside
  \`checked(...)\` (or with \`<CheckForOverflowUnderflow>\` on) it throws \`OverflowException\`.

## No checked exceptions

Java forces a method to declare or catch "checked" exceptions. **C# has no checked exceptions**: no
\`throws\` clause, and the compiler never makes you catch anything. The designers judged that forced
catching led to empty catch blocks and versioning pain. The cost is discipline: read the documentation
("Exceptions" section of each method on learn.microsoft.com) to know what a call can throw, and catch
only what you can handle.

## What an exception carries

    try { int.Parse("12a"); }
    catch (FormatException ex)
    {
        Console.WriteLine(ex.GetType().Name);   // FormatException
        Console.WriteLine(ex.Message);           // human-readable reason
        Console.WriteLine(ex.StackTrace);        // where it happened
        Console.WriteLine(ex.InnerException);    // the exception that caused this one, if any
    }

## Reading a stack trace

    Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.
       at Shop.OrderService.Total(Order order) in C:\\src\\Shop\\OrderService.cs:line 42
       at Shop.OrderController.Checkout(Int32 id) in C:\\src\\Shop\\OrderController.cs:line 17
       at Program.Main() in C:\\src\\Shop\\Program.cs:line 9

Read it **top-down**: the first line is the exception type and message; the first \`at\` line is
**where it was thrown** (OrderService.cs, line 42); each following line is the caller that led
there. Start at the top frame that is *your* code — skip framework frames — and ask what was null
there. With an \`InnerException\`, the trace shows "---> " and the inner exception's own trace: the
innermost one is usually the real cause.

## Common mistakes

- Catching \`NullReferenceException\` or \`IndexOutOfRangeException\` instead of fixing the bug — these
  mean the code is wrong, not that the world is unusual.
- Reading only the last line of a long trace instead of the first one.
- Expecting \`double\` division by zero to throw.`,
    mcqs: [
      mcq('What does `int.Parse("12a")` throw?', [
        ['ArgumentException, because the argument is a bad string', false],
        ['InvalidCastException, because a string cannot become an int', false],
        ['FormatException, because the text is not a valid number', true],
        ['It returns 12 and ignores the trailing letter', false],
      ], 'int.Parse throws FormatException when the text is not in a valid integer format, ArgumentNullException for null, and OverflowException when the number is too large for an int.'),
      mcq(`What happens when this runs?

    int zero = 0;
    double half = 10.0 / zero;
    int whole = 10 / zero;`, [
        ['Both lines throw DivideByZeroException', false],
        ['The first gives Infinity; the second throws DivideByZeroException', true],
        ['Neither line throws: whole becomes 0 and half becomes positive Infinity', false],
        ['The first throws; the second gives int.MaxValue', false],
      ], 'Floating-point division follows IEEE 754 and yields positive infinity. Integer (and decimal) division by zero throws DivideByZeroException.'),
      mcq('A method you call may fail with an IOException, but it declares no throws clause. What does the C# compiler require of your calling code?', [
        ['A try/catch for IOException, or the build fails', false],
        ['A throws IOException clause on your own method', false],
        ['Nothing — C# has no checked exceptions', true],
        ['An [Throws] attribute that documents the exception', false],
      ], 'C# does not have checked exceptions, so the compiler never forces a catch or a declaration. Knowing what a call can throw comes from its documentation.'),
    ],
    checkpoint: [
      mcq(`Which exception does each line throw?

    var list = new List<int> { 1, 2, 3 };
    var arr  = new int[3];
    // line A: list[5]
    // line B: arr[5]`, [
        ['A: IndexOutOfRangeException, B: ArgumentOutOfRangeException', false],
        ['A: ArgumentOutOfRangeException, B: IndexOutOfRangeException', true],
        ['Both throw IndexOutOfRangeException', false],
        ['Both throw ArgumentOutOfRangeException', false],
      ], 'The List<T> indexer validates its argument and throws ArgumentOutOfRangeException; an array access is checked by the runtime and throws IndexOutOfRangeException.'),
      mcq(`What does this print?

    int big = int.MaxValue;
    Console.WriteLine(big + 1);`, [
        ['2147483648', false],
        ['It throws OverflowException', false],
        ['-2147483648', true],
        ['It does not compile: the result does not fit', false],
      ], 'Arithmetic is unchecked by default, so the value wraps around to int.MinValue. Wrapping it in checked(...) would throw OverflowException.'),
      mcq(`A log shows:

    System.NullReferenceException: Object reference not set to an instance of an object.
       at Shop.Cart.Total() in Cart.cs:line 31
       at Shop.CheckoutService.Pay(Cart cart) in CheckoutService.cs:line 58
       at Shop.Program.Main() in Program.cs:line 12

Where was the exception thrown?`, [
        ['Program.cs line 12, the first call in the program', false],
        ['CheckoutService.cs line 58, where Pay was called', false],
        ['Cart.cs line 31, inside Cart.Total', true],
        ['It cannot be known without the inner exception', false],
      ], 'The first at line is the frame where the exception was thrown; the lines below it are the callers. Something used at Cart.cs line 31 was null.'),
    ],
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_TRY_CATCH',
    notes: `## try, catch, finally

    try
    {
        int qty = int.Parse(input);
        order.Add(productId, qty);
    }
    catch (FormatException)
    {
        Console.WriteLine("Quantity must be a whole number.");
    }
    catch (ArgumentOutOfRangeException ex)
    {
        Console.WriteLine("Quantity out of range: " + ex.Message);
    }
    finally
    {
        Console.WriteLine("done");      // runs whether or not anything was thrown
    }

- The runtime checks \`catch\` clauses **top to bottom** and runs the **first** whose type matches the
  exception or one of its base types. Order them **most specific first**: \`catch (Exception)\` before
  \`catch (FormatException)\` is compile error CS0160 — the second could never run.
- \`catch (ArgumentException)\` also catches \`ArgumentNullException\` and \`ArgumentOutOfRangeException\`.
- \`finally\` runs after the try (and any catch) **on every path** — normal completion, a caught
  exception, an uncaught exception propagating out, even a \`return\` inside the try. It is for cleanup.

## finally and return

    static int Read()
    {
        int x = 1;
        try { return x; }
        finally { x = 2; }
    }
    // Read() returns 1

The return value is evaluated **before** finally runs, so changing \`x\` in finally does not change what
is returned. (C# does not allow \`return\` inside \`finally\` at all.)

## Exception filters (C# 6)

    catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
    {
        return null;            // only 404s are handled here; other HTTP errors keep propagating
    }

The \`when\` condition is evaluated *before* the stack unwinds; if it is false, the clause is skipped as
if it were not there. Filters keep catch blocks narrow without catching and rethrowing.

## throw, throw; and throw ex

    catch (SqlException ex)
    {
        logger.LogError(ex, "Saving order failed");
        throw;          // rethrow the SAME exception, original stack trace intact
    }

- \`throw;\` (no operand) rethrows the current exception and **keeps its stack trace**.
- \`throw ex;\` throws the same object but **resets the stack trace** to this line — the place where
  the problem really happened is lost. Code analysers flag it (CA2200).
- \`throw new OrderSaveException("...", ex);\` **wraps** it: a higher-level exception, with the original
  kept as \`InnerException\`.

Since C# 7, \`throw\` is also an expression: \`_name = name ?? throw new ArgumentNullException(nameof(name));\`.
.NET 6+ adds \`ArgumentNullException.ThrowIfNull(name);\`.

## Which exceptions to catch

Catch an exception only where you can **do something** about it: retry, use a default, show the user a
message, or translate it into a better one. Otherwise let it propagate. In ASP.NET Core, unhandled
exceptions reach middleware that logs them and returns a 500 — you rarely need \`catch (Exception)\`
in a controller.

\`catch (Exception)\` is acceptable at the very top of a program or a background loop, to log and
keep going. Never write an empty catch: it hides bugs.

## Exceptions are for exceptional cases

Throwing is expensive (it captures a stack trace) and makes control flow hard to follow. Do not use
exceptions for expected outcomes — check \`dict.ContainsKey\` or use \`TryGetValue\`, use \`int.TryParse\`
for user input. The next units come back to this.`,
    workedExample: `**Problem.** A method reads a quantity typed by a user and adds it to a cart. Bad text should
produce a friendly message; a quantity the cart refuses should produce a different one; anything else
(a bug, a database failure) must not be hidden — but it must be logged with its original stack trace.

**Step 1 — list what can go wrong and who should handle it.**
- Text that is not a number → expected; handle here, tell the user.
- A quantity outside 1–10 → the cart throws \`ArgumentOutOfRangeException\`; handle here.
- Anything else → not this method's job; log it and let it propagate.

**Step 2 — order the catches from specific to general.**

    public void AddFromInput(Cart cart, int productId, string input)
    {
        try
        {
            int qty = int.Parse(input);
            cart.Add(productId, qty);
            Console.WriteLine("Added " + qty);
        }
        catch (FormatException)
        {
            Console.WriteLine("Please type a whole number.");
        }
        catch (ArgumentOutOfRangeException ex)
        {
            Console.WriteLine("Not allowed: " + ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected failure adding product {Id}", productId);
            throw;                          // not throw ex — keep the original trace
        }
    }

**Step 3 — check each path.**
- \`"abc"\` → FormatException → friendly message; nothing added.
- \`"50"\` → the cart refuses → ArgumentOutOfRangeException → second message.
- The database is down → some other exception → logged, then rethrown with its stack trace intact, so
  the caller (or ASP.NET Core's error middleware) still sees where it really failed.

**Step 4 — improve it.** The first catch handles an *expected* outcome with an exception. Using
\`int.TryParse\` removes that case from the try block entirely:

    if (!int.TryParse(input, out int qty)) { Console.WriteLine("Please type a whole number."); return; }

Exceptions are now reserved for what is genuinely exceptional.`,
    mcqs: [
      mcq(`What does this print?

    static int Run()
    {
        try { Console.Write("T "); throw new InvalidOperationException(); }
        catch (InvalidOperationException) { Console.Write("C "); return 1; }
        finally { Console.Write("F "); }
    }

    Console.WriteLine(Run());`, [
        ['T C 1 F', false],
        ['T F C 1', false],
        ['T C 1', false],
        ['T C F 1', true],
      ], 'The catch runs and evaluates its return value, then finally runs before the method actually returns. Only after that does Main print the returned 1.'),
      mcq('`catch (Exception) { ... }` is placed directly above `catch (FormatException) { ... }` on the same try. What happens?', [
        ['FormatException is handled by the second clause as normal', false],
        ['Both clauses run, the general one first', false],
        ['It compiles, but the second clause is silently ignored', false],
        ['Compile error: the earlier clause already catches FormatException', true],
      ], 'Catch clauses are tested in order, so a FormatException would always match catch (Exception) first. C# rejects the unreachable clause with CS0160. Put specific types first.'),
      mcq('Inside a catch block, what is the difference between `throw;` and `throw ex;`?', [
        ['None — both rethrow the same exception object identically', false],
        ['throw; keeps the original stack trace; throw ex; resets it to this line', true],
        ['throw ex; keeps the stack trace; throw; creates a new exception', false],
        ['throw; is only valid inside a finally block', false],
      ], 'throw; rethrows the current exception unchanged. throw ex; throws the same object but restarts its stack trace at the rethrow, hiding where the failure actually happened.'),
    ],
    checkpoint: [
      mcq(`What does this method return?

    static int Load()
    {
        int x = 1;
        try { return x; }
        finally { x = 2; }
    }`, [
        ['2, because finally runs last and changes x', false],
        ['1, because the return value is fixed before finally runs', true],
        ['It does not compile: finally cannot assign a local', false],
        ['0, because finally resets the return value', false],
      ], 'return x evaluates x (1) and stores it as the result; finally then runs and changes the local, which no longer affects the value being returned.'),
      mcq(`What does this print?

    try { throw new ArgumentNullException("name"); }
    catch (ArgumentException ex) { Console.Write("A:" + ex.GetType().Name); }
    catch (Exception) { Console.Write("E"); }`, [
        ['E', false],
        ['A:ArgumentException', false],
        ['A:ArgumentNullException', true],
        ['A:ArgumentNullException E', false],
      ], 'ArgumentNullException derives from ArgumentException, so the first clause matches. The object keeps its real type, so GetType().Name prints ArgumentNullException. Only one catch runs.'),
      mcq('`catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)` — a request fails with status 500. What happens?', [
        ['The clause catches it, and StatusCode is set to NotFound', false],
        ['The filter is false, so the clause is skipped and the exception propagates', true],
        ['The program crashes, because a filter must always be true', false],
        ['The clause still catches it, because when is only a hint used for logging', false],
      ], 'An exception filter is checked before the clause is chosen. When it is false the catch is ignored, as if it were not there, and the exception continues to the next handler.'),
    ],
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_USING_FILES',
    notes: `Files, network connections, database connections and streams hold resources the garbage collector
does not manage — an open file handle, a socket. You must release them promptly, and **IDisposable**
is how .NET says "I hold one; call \`Dispose()\` when done".

## using

    using (var reader = new StreamReader("orders.csv"))
    {
        string line;
        while ((line = reader.ReadLine()) != null)
        {
            Console.WriteLine(line);
        }
    }   // reader.Dispose() runs here — even if an exception was thrown inside

A \`using\` statement is \`try { ... } finally { reader.Dispose(); }\` written for you. **C# 8** added the
**using declaration**, which disposes at the end of the enclosing scope:

    using var writer = new StreamWriter("report.txt");
    writer.WriteLine("Total: 42");
    // disposed when the method (or block) ends

Several \`using\`s dispose in **reverse** order of creation — the last opened is the first closed.

## Why Dispose matters for writers

\`StreamWriter\` buffers text in memory. Until it is flushed — which \`Dispose\` does — the file on disk
may be **empty**. A program that creates a \`StreamWriter\`, writes, and never disposes it can leave a
0-byte file, and the open handle stops other code from deleting or reopening the file. With \`using\`,
both problems disappear.

## The File helpers

For small files, the static \`System.IO.File\` methods open, read or write, and close in one call:

    string text = File.ReadAllText("notes.txt");
    string[] lines = File.ReadAllLines("marks.csv");        // whole file in memory
    File.WriteAllText("out.txt", "hello");                   // creates or overwrites
    File.AppendAllText("log.txt", "started\\n");             // creates or appends
    bool exists = File.Exists("config.json");

\`File.ReadLines(path)\` returns lines lazily, one at a time — use it (or a \`StreamReader\`) for files too
big to load whole. Every async version exists too: \`await File.ReadAllTextAsync(path)\`.

## Paths

Build paths with \`Path.Combine(dir, "data", "marks.csv")\` rather than \`+ "\\\\" +\` — it uses the right
separator on Windows and Linux (where your API will likely run in a container). A relative path is
relative to the process's **current directory**, not to the .cs file — a common "file not found" in
\`dotnet run\` versus Visual Studio.

## What can go wrong

| Exception | Cause |
|---|---|
| \`FileNotFoundException\` | the file does not exist |
| \`DirectoryNotFoundException\` | a folder in the path does not exist |
| \`UnauthorizedAccessException\` | no permission, or the path is a directory |
| \`IOException\` | the file is locked by another process, disk full, … |

\`FileNotFoundException\` and \`DirectoryNotFoundException\` both derive from \`IOException\`. Checking
\`File.Exists\` first is useful for a friendly message, but the file can still vanish between the check
and the open, so the \`catch\` is still needed for robust code.

## A complete example

    static int CountValidLines(string path)
    {
        try
        {
            int count = 0;
            foreach (var line in File.ReadLines(path))
                if (line.Trim().Length > 0) count++;
            return count;
        }
        catch (FileNotFoundException)
        {
            Console.WriteLine("No such file: " + path);
            return 0;
        }
    }

## Common mistakes

- Opening a \`StreamWriter\` without \`using\` — empty or truncated output, locked file.
- \`File.ReadAllLines\` on a multi-gigabyte log.
- Hard-coded \`C:\\\\\` paths that break when the API is deployed to Linux.
- \`ReadLine()\` returns \`null\` at the end of the stream — forgetting that check causes a
  NullReferenceException on the last iteration.`,
    mcqs: [
      mcq(`What does this print?

    class Res : IDisposable
    {
        private readonly string name;
        public Res(string n) { name = n; Console.Write("open " + n + " "); }
        public void Dispose() { Console.Write("close " + name + " "); }
    }

    using (var a = new Res("a"))
    using (var b = new Res("b"))
    {
        Console.Write("body ");
    }`, [
        ['open a open b body close a close b', false],
        ['open a body close a open b close b', false],
        ['open a open b body', false],
        ['open a open b body close b close a', true],
      ], 'Nested usings dispose in reverse order of creation: b, opened last, is closed first. Each using is a try/finally, so the inner one finishes before the outer one.'),
      mcq('A program runs `var w = new StreamWriter("out.txt"); w.Write("hello");` and then checks the file size, without disposing or flushing. What size is the file most likely to be?', [
        ['0 bytes, as the text is still in the writer\'s buffer', true],
        ['5 bytes, as Write sends text straight to disk', false],
        ['It throws IOException, since the writer was not closed', false],
        ['10 bytes, as each char is two bytes in .NET', false],
      ], 'StreamWriter buffers its output and flushes when the buffer fills or when it is flushed or disposed. Until then the file can be empty. A using block guarantees the flush and the release of the handle.'),
      mcq('Which call reads a 20 GB log file one line at a time without loading it all into memory?', [
        ['File.ReadAllLines(path)', false],
        ['File.ReadAllText(path).Split(\'\\n\')', false],
        ['File.ReadLines(path)', true],
        ['File.OpenRead(path).ToArray()', false],
      ], 'File.ReadLines returns a lazy IEnumerable<string> that reads the next line only when asked. ReadAllLines and ReadAllText load the entire file first.'),
    ],
    checkpoint: [
      mcq('`new StreamReader("data/marks.csv")` throws, and the folder `data` does not exist. Which exception type is thrown, and what is its base class?', [
        ['FileNotFoundException, deriving from ArgumentException', false],
        ['DirectoryNotFoundException, deriving from IOException', true],
        ['UnauthorizedAccessException, deriving from IOException', false],
        ['InvalidOperationException, deriving from SystemException', false],
      ], 'A missing folder in the path gives DirectoryNotFoundException; a missing file in an existing folder gives FileNotFoundException. Both derive from IOException, so catch (IOException) handles either.'),
      mcq(`A file contains three lines: a, b, c. What does this print?

    int n = 0;
    using (var r = new StreamReader(path))
    {
        string line;
        while ((line = r.ReadLine()) != null) n++;
    }
    Console.WriteLine(n);`, [
        ['2', false],
        ['4', false],
        ['It throws at the end of the file', false],
        ['3', true],
      ], 'ReadLine returns each line in turn and then null at the end of the stream, which ends the loop. Three lines are counted.'),
      mcq('C# 8\'s `using var conn = new SqlConnection(cs);` appears at the top of a method. When is conn disposed?', [
        ['At the end of the enclosing scope — here, when the method exits', true],
        ['Immediately after the declaration statement completes', false],
        ['Only when the garbage collector finalises the object', false],
        ['Never — a using declaration only imports a namespace', false],
      ], 'A using declaration disposes the variable when control leaves the scope it was declared in, including by return or exception — like a using block that spans the rest of the scope.'),
    ],
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_CUSTOM',
    notes: `The built-in exceptions describe programming errors well (\`ArgumentNullException\`,
\`InvalidOperationException\`). For failures that belong to **your domain** — an order that does not
exist, a seat already booked — a custom exception lets callers catch exactly that case.

## Defining one

    public class OrderNotFoundException : Exception
    {
        public int OrderId { get; }

        public OrderNotFoundException(int orderId)
            : base("Order " + orderId + " was not found.")
        {
            OrderId = orderId;
        }

        public OrderNotFoundException(int orderId, Exception inner)
            : base("Order " + orderId + " was not found.", inner)
        {
            OrderId = orderId;
        }
    }

Conventions: derive from \`Exception\` (not \`ApplicationException\` — that guidance is obsolete); end the
name with **Exception**; pass a clear message to \`base(...)\`; offer a constructor that accepts an
**inner exception**; add properties for data a handler needs (\`OrderId\`), rather than making callers
parse the message.

## Wrapping

    try { row = db.Load(orderId); }
    catch (SqlException ex)
    {
        throw new OrderNotFoundException(orderId, ex);   // a domain error; the SQL detail kept inside
    }

The caller catches \`OrderNotFoundException\` without knowing about SQL; the log still shows the
original as \`InnerException\`.

In ASP.NET Core, a small piece of middleware or an exception filter can map
\`OrderNotFoundException\` → **404** and \`ValidationException\` → **400** in one place, instead of every
controller catching.

## The Try pattern

    int qty;
    if (int.TryParse(input, out qty))  { /* use qty */ }      // C# 7+: TryParse(input, out int qty)
    else                               { Console.WriteLine("Not a number"); }

\`TryParse\` returns \`bool\` and passes the result through an \`out\` parameter. It **never throws** for bad
text (it returns \`false\` and sets the out value to 0). The same shape appears in
\`Dictionary.TryGetValue\`, \`Enum.TryParse\`, \`DateTime.TryParse\` and \`ConcurrentQueue.TryDequeue\`.
You can write your own:

    public bool TryFind(int id, out Order order) { ... }

## Throw, or return a result?

Ask: **is failure an expected, common outcome the caller must handle?**

- **Yes** — user input that may not parse, a lookup that may miss, a cache that may be empty — use
  the Try pattern, return \`null\`/\`bool\`, or a result type. The caller is forced to look at it, and it
  costs nothing.
- **No** — the caller broke a rule (null argument, negative quantity), or the system failed (database
  down, disk full) — **throw**. The caller cannot sensibly continue, and silently returning \`false\`
  would hide the problem.

A good API often offers both: \`int.Parse\` (throws) and \`int.TryParse\` (does not);
\`dict[key]\` (throws \`KeyNotFoundException\`) and \`dict.TryGetValue\`.

## Common mistakes

- A custom exception for every method — create one only when a caller would catch it specifically.
- Losing the cause: \`throw new MyException("failed")\` without passing \`ex\` as the inner exception.
- Using exceptions for flow control in a loop over user input — slow, and it buries real errors.
- Catching your own exception type just to return \`false\` — that method wanted the Try pattern.`,
    workedExample: `**Problem.** A seat-booking service has \`Book(int seatNo)\`. Seats are 1–200. Booking an
already-booked seat is a business rule the UI must show nicely. Callers sometimes just want to know
whether a seat is free. Design the errors.

**Step 1 — classify each failure.**
- \`seatNo\` outside 1–200: the caller passed something invalid → a programming error →
  \`ArgumentOutOfRangeException\`.
- Seat already booked: a domain rule a caller may want to handle specifically → a custom
  \`SeatAlreadyBookedException\` carrying the seat number.
- "Is this seat free?": an expected yes/no → no exception at all; a \`bool\` method.

**Step 2 — the custom exception.**

    public class SeatAlreadyBookedException : Exception
    {
        public int SeatNo { get; }
        public SeatAlreadyBookedException(int seatNo)
            : base("Seat " + seatNo + " is already booked.")
        {
            SeatNo = seatNo;
        }
    }

**Step 3 — the service.**

    public class BookingService
    {
        private readonly HashSet<int> booked = new HashSet<int>();

        public bool IsFree(int seatNo) => !booked.Contains(seatNo);

        public void Book(int seatNo)
        {
            if (seatNo < 1 || seatNo > 200)
                throw new ArgumentOutOfRangeException(nameof(seatNo), "Seats are 1-200.");
            if (!booked.Add(seatNo))                       // Add returns false if already present
                throw new SeatAlreadyBookedException(seatNo);
        }

        public bool TryBook(int seatNo)                     // the Try version for callers who expect failure
        {
            if (seatNo < 1 || seatNo > 200) return false;
            return booked.Add(seatNo);
        }
    }

**Step 4 — the caller.**

    try { service.Book(seat); Console.WriteLine("Booked " + seat); }
    catch (SeatAlreadyBookedException ex) { Console.WriteLine("Sorry, seat " + ex.SeatNo + " is taken."); }

\`ArgumentOutOfRangeException\` is deliberately **not** caught here: it signals a bug in the caller, and
hiding it would let the bug survive. A caller that expects collisions (a "pick any free seat" loop)
uses \`TryBook\` and never pays for an exception.`,
    mcqs: [
      mcq('Which declaration follows .NET conventions for a custom exception?', [
        ['class InvalidCoupon : ApplicationException { }', false],
        ['class InvalidCouponError : Exception { public string Code; public string Reason; } with no constructors', false],
        ['class InvalidCoupon : SystemException { }', false],
        ['class InvalidCouponException : Exception, plus (message) and (message, inner) constructors', true],
      ], 'Custom exceptions derive from Exception, end in Exception, and offer constructors that accept a message and an inner exception. ApplicationException adds nothing, and SystemException is reserved for the runtime.'),
      mcq(`What does this print?

    int value;
    bool ok = int.TryParse("abc", out value);
    Console.WriteLine(ok + " " + value);`, [
        ['False 0', true],
        ['It throws FormatException', false],
        ['False and an unassigned value', false],
        ['True 0', false],
      ], 'TryParse never throws for bad text. It returns false and sets the out parameter to 0 (default(int)).'),
      mcq('A login form parses a PIN typed by the user, and wrong input is common. Which approach fits?', [
        ['int.Parse inside try/catch (FormatException) on every keystroke', false],
        ['int.TryParse, treating false as an ordinary validation message', true],
        ['A custom InvalidPinException thrown from the parser', false],
        ['Convert.ToInt32 and let the global error page handle it', false],
      ], 'Bad user input is an expected outcome, so the Try pattern fits: no exception cost, and the caller must look at the bool. Exceptions are for broken rules and system failures.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    try
    {
        try { int.Parse("x"); }
        catch (FormatException ex) { throw new OrderImportException("Bad row", ex); }
    }
    catch (OrderImportException ex)
    {
        Console.WriteLine(ex.Message + "|" + ex.InnerException.GetType().Name);
    }`, [
        ['Bad row|OrderImportException', false],
        ['Input string was not in a correct format.|FormatException', false],
        ['It crashes: InnerException is null', false],
        ['Bad row|FormatException', true],
      ], 'The custom exception was created with the FormatException as its inner exception, so Message is "Bad row" and InnerException is the original FormatException. (OrderImportException passes both to base(message, inner).)'),
      mcq('`OrderService.Get(id)` is called with an id that does not exist, and every caller needs to tell that apart from a database failure. What should Get do?', [
        ['Return an empty Order with all of its fields left at default values', false],
        ['Throw a plain Exception whose message says "not found"', false],
        ['Throw OrderNotFoundException with an OrderId property', true],
        ['Catch every exception and return null in all cases', false],
      ], 'A specific exception type lets callers (or a single middleware mapping it to 404) handle "not found" without parsing messages, while database exceptions still propagate separately. An empty object or blanket null hides the difference.'),
      mcq('A method wraps a SqlException as `throw new ReportFailedException("Report failed");` — without passing the original. What is lost?', [
        ['Nothing; the runtime links the two exceptions automatically', false],
        ['Only the new message; the SQL error text is still printed', false],
        ['The original exception, its message and its stack trace', true],
        ['The ability to catch ReportFailedException by its type', false],
      ], 'Without passing ex as the inner exception, the SQL error and where it happened are discarded. Use the (message, inner) constructor so logs show the cause.'),
    ],
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_DEBUGGING',
    notes: `Seven exception and file faults found in real .NET code. For each: the symptom, the cause, the fix.

## 1. The swallowed exception

    try { SaveOrder(order); }
    catch (Exception) { }

**Symptom:** users say orders "disappear"; the logs are clean. **Cause:** every failure — a bug, a
timeout, a constraint violation — is caught and ignored. **Fix:** catch only what you can handle; at
minimum log and rethrow: \`catch (Exception ex) { logger.LogError(ex, "..."); throw; }\`.

## 2. The stack trace that points at the wrong line

    catch (Exception ex) { Log(ex); throw ex; }

**Symptom:** every error's trace ends in this catch block, never where it really failed. **Cause:**
\`throw ex;\` resets the stack trace. **Fix:** \`throw;\`.

## 3. The catch that never runs

    catch (Exception ex) { ... }
    catch (FormatException ex) { ... }   // CS0160

**Symptom:** the build fails (or, with \`IOException\` before \`FileNotFoundException\`, the specific
handler is unreachable). **Cause:** general before specific. **Fix:** most specific first.

## 4. The finally that hides the real error

    try { ProcessFile(path); }
    finally { reader.Close(); }        // reader is null if opening failed

**Symptom:** the log shows a NullReferenceException from the finally block; the original
FileNotFoundException is gone. **Cause:** an exception thrown in \`finally\` replaces the one in flight.
**Fix:** use \`using\`, which disposes only what was created; never let cleanup code throw.

## 5. The empty output file

    var w = new StreamWriter("report.csv");
    foreach (var r in rows) w.WriteLine(r);
    // method ends

**Symptom:** \`report.csv\` exists but is empty or ends mid-line; deleting it says "in use by another
process". **Cause:** the writer was never disposed, so its buffer was never flushed and the handle
stayed open. **Fix:** \`using var w = new StreamWriter(...)\` (or a \`using\` block).

## 6. Parse on user input

    int age = int.Parse(Console.ReadLine());

**Symptom:** the console app crashes with FormatException when someone types "twenty", and with
ArgumentNullException when input is redirected from an empty file (ReadLine returned null).
**Cause:** \`Parse\` throws on anything unexpected. **Fix:** \`int.TryParse\` and a message.

## 7. Exceptions as a loop condition

    while (true)
    {
        try { items.Add(queue.Dequeue()); }
        catch (InvalidOperationException) { break; }    // "queue is empty"
    }

**Symptom:** slow under load; real InvalidOperationExceptions are mistaken for "empty". **Cause:** an
expected condition is signalled by an exception. **Fix:** \`while (queue.Count > 0)\` or
\`queue.TryDequeue(out var item)\` (.NET Core 2.0+).

## How to work

Turn on first-chance exceptions in the debugger (Visual Studio: *Exception Settings*; VS Code: break
on "All Exceptions") — it stops where an exception is thrown, even one that is later swallowed. Read
the **first** frame of the stack trace that is your code, and look at \`InnerException\` before
anything else.`,
    mcqs: [
      mcq('An order-saving method has `catch (Exception) { }` around its body. What is the main problem?', [
        ['It is slower than catching a specific exception type', false],
        ['Every failure, including bugs, disappears without a trace', true],
        ['It prevents the finally block from running afterwards', false],
        ['It does not compile without a variable name after Exception', false],
      ], 'An empty catch of Exception hides every error: the caller believes the save worked and nothing is logged. Catch what you can handle, and log and rethrow the rest.'),
      mcq('Every logged error\'s stack trace ends inside the same catch block of `ErrorHandler.Wrap`, never in the method that failed. What in that block causes it?', [
        ['Rethrowing with throw ex; instead of throw;', true],
        ['A call to logger.LogError(ex) before rethrowing', false],
        ['Declaring the catch variable as ex instead of e', false],
        ['Catching Exception instead of SystemException', false],
      ], 'throw ex; restarts the stack trace at the rethrow. throw; preserves the original frames, so the trace points at the real failure.'),
      mcq('A finally block calls `reader.Close()`, but reader is null when the file did not exist. What does the log show?', [
        ['The FileNotFoundException, with the NullReferenceException as inner', false],
        ['Both exceptions, one after the other, in the order they were thrown', false],
        ['A NullReferenceException from finally; the FileNotFoundException is lost', true],
        ['Nothing — exceptions inside finally are ignored by the runtime', false],
      ], 'An exception thrown in finally replaces the one already propagating, so the original cause vanishes. A using statement disposes only what was created and avoids this.'),
      mcq('A console app crashes with ArgumentNullException at `int.Parse(Console.ReadLine())` when its input is redirected from an empty file. Why?', [
        ['ReadLine returns null at end of input, and Parse rejects null', true],
        ['Redirected input is always treated as the text "null"', false],
        ['int.Parse throws ArgumentNullException for any invalid text', false],
        ['Console is disposed when input is redirected from a file', false],
      ], 'Console.ReadLine returns null when there is no more input; int.Parse(null) throws ArgumentNullException (bad text gives FormatException). Check for null and use TryParse.'),
    ],
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_PRACTICE',
    notes: `Repetition until handling failure is a habit. Write each in a console project, and test the bad
inputs as deliberately as the good ones.

**Exercise 1 — Safe division.** Read two integers per line until end of input and print the quotient,
or \`cannot divide by zero\` — once with a \`try/catch (DivideByZeroException)\`, once with an \`if\`.
Which version would you ship, and why?

**Exercise 2 — Order the catches.** Write a method that can throw \`FormatException\`,
\`OverflowException\` and \`ArgumentNullException\` (hint: \`int.Parse\`). Catch each with a different
message, then add a final \`catch (Exception)\` that logs and rethrows with \`throw;\`. Try to put the
general clause first and read the compiler error.

**Exercise 3 — finally and return.** Predict, then run: a method that returns a value from \`try\`,
changes the variable in \`finally\`, and prints in both. In what order do the prints appear, and what is
returned?

**Exercise 4 — Write and read a file.** Write five lines to \`scores.txt\` with a \`StreamWriter\` in a
\`using\` block, then read them back with \`File.ReadAllLines\` and print the count. Remove the \`using\`
and observe what the file contains.

**Exercise 5 — A custom exception.** Write \`InsufficientFundsException\` with \`Needed\` and
\`Available\` properties and both standard constructors. Throw it from \`Wallet.Spend\` and catch it
in Main, printing both amounts.

**Exercise 6 — Parse or TryParse?** Rewrite a loop that parses 100,000 strings with
\`int.Parse\` inside \`try/catch\` (half of them invalid) to use \`int.TryParse\`, and time both with
\`Stopwatch\`.

## The graded exercise — Marks Importer

Read "name marks" lines, accept the valid ones and report every invalid one by line number, using
\`int.TryParse\` and a custom exception. The full specification is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, a line is "10 0". Why is the `if (b == 0)` version usually the one to ship?', [
        ['A try/catch cannot catch DivideByZeroException at all', false],
        ['Zero is an expected input, so a plain check is clearer and cheaper', true],
        ['The if version also handles double division by zero, which try cannot', false],
        ['DivideByZeroException is checked, so it must be declared', false],
      ], 'A zero divisor is a foreseeable input, not an exceptional failure. Checking first states the rule plainly and avoids the cost of throwing.'),
      mcq('In Exercise 2, `int.Parse` receives "99999999999". Which catch clause handles it?', [
        ['catch (FormatException)', false],
        ['catch (OverflowException)', true],
        ['catch (ArgumentNullException)', false],
        ['catch (InvalidCastException)', false],
      ], 'The text is a well-formed integer that does not fit in an int, so int.Parse throws OverflowException rather than FormatException.'),
      mcq('In Exercise 3, try does `Console.Write("try "); return x;` with x = 1, and finally does `x = 9; Console.Write("finally ");`. What is printed, and what is returned?', [
        ['try finally, and 9 is returned', false],
        ['finally try, and 1 is returned', false],
        ['try finally, and 1 is returned', true],
        ['try only, and 1 is returned', false],
      ], 'The try prints first and fixes the return value at 1. finally then prints and changes x, which no longer affects the returned value.'),
      mcq('In Exercise 4, the `using` around the StreamWriter is removed and the program ends right after writing. What do you most likely observe?', [
        ['The file has all five lines, as before', false],
        ['The build fails because StreamWriter requires using', false],
        ['The file is empty or incomplete, because the buffer was not flushed', true],
        ['The program throws ObjectDisposedException when Main returns at the end', false],
      ], 'Without Dispose (or Flush), buffered text may never reach the file. The compiler does not require using; the bug shows up only at runtime.'),
      mcq('In Exercise 6, the TryParse loop is much faster than the Parse-plus-catch loop on half-invalid input. Why?', [
        ['TryParse uses a lookup table of common numbers', false],
        ['Throwing captures a stack trace and unwinds the stack per bad string', true],
        ['TryParse skips validating its input entirely', false],
        ['int.Parse converts every string to a double first and then rounds it', false],
      ], 'Creating and throwing an exception is expensive: the runtime captures the stack trace and searches for a handler. TryParse reports failure with a bool, so a bad string costs almost nothing.'),
    ],
    assignment: {
      title: 'Marks Importer',
      description: 'Read name and marks lines, accept the valid ones, and report each invalid line by number — with int.TryParse and a custom exception.',
      instructions: `Write a C# console program that imports student marks and reports every bad line.

**The grader runs C# 7 (Mono):** use a classic \`class Program { static void Main() { ... } }\`;
declare \`out\` variables before the call (\`int marks; int.TryParse(text, ..., out marks)\`). Read input
with \`Console.ReadLine()\` until it returns \`null\`.

**Input**

Any number of lines, each meant to be:

    <name> <marks>

Names have no spaces. Lines are numbered from 1, **counting blank lines**; a blank (or all-space) line is
skipped silently.

**Rules for each non-blank line**

- Not exactly two fields → \`Line <n>: expected a name and marks\`
- Marks not a whole number (including decimals and numbers too big for an \`int\`) →
  \`Line <n>: '<text>' is not a whole number\`
- Marks outside 0–100 → \`Line <n>: <marks> is out of range 0-100\`
- Otherwise the line is valid.

Print each error as soon as its line is read.

**Design (this is what the exercise is for)**

- A custom \`class InvalidMarkException : Exception\` with a constructor that passes the message to
  \`base\`.
- A method \`static int ParseMarks(string text)\` that uses
  \`int.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out marks)\` — never
  \`int.Parse\` — and throws \`InvalidMarkException\` with the right message for bad or out-of-range marks.
- The main loop catches \`InvalidMarkException\` only, prints \`Line <n>: \` followed by its \`Message\`,
  and carries on. No other exception should be possible.

**Summary** — after the last line, print:

    Valid: <count>
    Invalid: <count>
    Average: <average of valid marks, two decimals>
    Top: <name> (<marks>)

With no valid lines, print \`Average: n/a\` and \`Top: none\`. If several students share the top mark,
name the first. Format the average with \`ToString("F2", CultureInfo.InvariantCulture)\`.

**Example**

Input:

    Asha 82
    Ravi abc
    Kiran 105
    Divya

    Sam 74

Output:

    Line 2: 'abc' is not a whole number
    Line 3: 105 is out of range 0-100
    Line 4: expected a name and marks
    Valid: 2
    Invalid: 3
    Average: 78.00
    Top: Asha (82)

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including decimals, negative and huge numbers, wrong field counts, blank lines, ties and empty input.', maxPoints: 60 },
        { criterion: 'Safe parsing', description: 'int.TryParse with InvariantCulture is used for every number; int.Parse and Convert.ToInt32 are not; nothing can crash the program on bad input.', maxPoints: 25 },
        { criterion: 'Custom exception used well', description: 'InvalidMarkException derives from Exception and passes its message to base; the loop catches that type only and never catch (Exception).', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Globalization;

// TODO: class InvalidMarkException : Exception with a (string message) constructor

class Program
{
    // TODO: static int ParseMarks(string text) — int.TryParse, then throw InvalidMarkException
    //       for text that is not a whole number or marks outside 0-100

    static void Main()
    {
        string line;
        int lineNo = 0;
        while ((line = Console.ReadLine()) != null)
        {
            lineNo++;
            string[] parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) continue;

            // TODO: validate the line, catch InvalidMarkException and print "Line n: message"
        }

        // TODO: print Valid, Invalid, Average and Top
    }
}
`,
        tests: [
          { input: 'Asha 82\nRavi 67\nMeena 91\n', expectedOutput: 'Valid: 3\nInvalid: 0\nAverage: 80.00\nTop: Meena (91)' },
          { input: 'Asha 82\nRavi abc\nKiran 105\nDivya\n\nSam 74\n', expectedOutput: "Line 2: 'abc' is not a whole number\nLine 3: 105 is out of range 0-100\nLine 4: expected a name and marks\nValid: 2\nInvalid: 3\nAverage: 78.00\nTop: Asha (82)" },
          { input: 'Anu 7.5\nBala -3\nCher 99999999999\n', expectedOutput: "Line 1: '7.5' is not a whole number\nLine 2: -3 is out of range 0-100\nLine 3: '99999999999' is not a whole number\nValid: 0\nInvalid: 3\nAverage: n/a\nTop: none", isHidden: true },
          { input: 'Lata 90\nJoe 90 extra\nRaj 90\n', expectedOutput: 'Line 2: expected a name and marks\nValid: 2\nInvalid: 1\nAverage: 90.00\nTop: Lata (90)', isHidden: true },
          { input: '', expectedOutput: 'Valid: 0\nInvalid: 0\nAverage: n/a\nTop: none', isHidden: true },
          { input: 'Zed 0\nAmy 100\nBo 100\n', expectedOutput: 'Valid: 3\nInvalid: 0\nAverage: 66.67\nTop: Amy (100)', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_INTERVIEW_QUESTION',
    notes: `Three exception questions .NET interviewers ask freshers. For each: an answer that gets you through,
and the follow-up a good answer earns.

## 1. "What is the difference between throw and throw ex?"

**Model answer.** Both rethrow the same exception object from a catch block. \`throw;\` preserves the
original stack trace, so the log shows the line where the failure really happened. \`throw ex;\` resets
the stack trace to the catch block, which hides the origin — analysers flag it as CA2200. If I need to
add context, I wrap instead: \`throw new OrderSaveException("Saving order 42 failed", ex);\`, keeping the
original as \`InnerException\`.

**Follow-up:** "When would you catch an exception at all?" When I can do something useful — retry a
transient failure, fall back to a default, translate it into a domain exception, or show the user a
message. Otherwise I let it propagate to a single global handler; in ASP.NET Core that is the
exception-handling middleware, which logs it and returns a ProblemDetails 500.

## 2. "C# has no checked exceptions. Is that a problem?"

**Model answer.** Java forces callers to catch or declare checked exceptions; C# deliberately does
not. The designers found that forced handling produced empty catch blocks and made it hard to change a
method's exceptions without breaking every caller. The trade-off is that the compiler will not remind
you, so you read the documentation, catch specific exceptions where you can handle them, and rely on
a top-level handler for the rest. For expected failures, .NET APIs offer the Try pattern —
\`int.TryParse\`, \`TryGetValue\` — so you are not forced into exceptions for normal outcomes.

**Follow-up:** "When should a method throw versus return false?" Throw when the caller broke a contract
or the system failed — they cannot sensibly continue. Return a result (Try pattern, \`null\`, a result
type) when failure is an ordinary, expected outcome the caller must handle.

## 3. "What does using do, and why does it matter?"

**Model answer.** \`using\` guarantees \`Dispose()\` is called on an \`IDisposable\` object when the block
(or, for a C# 8 using declaration, the scope) ends — even if an exception is thrown. It compiles to
try/finally. It matters because file handles, database connections and sockets are not managed by the
garbage collector's timetable: a \`SqlConnection\` not disposed is not returned to the pool, and under
load the pool runs dry; a \`StreamWriter\` not disposed may never flush its buffer.

**Follow-up:** "Then why not dispose an HttpClient after every request?" Because disposing it closes its
connections, and creating one per request under load can exhaust sockets. Use one long-lived instance
or \`IHttpClientFactory\` — knowing when *not* to dispose is part of the answer.

## Answering aloud

State the rule, give one line of C#, then name the consequence of getting it wrong. "throw ex loses the
stack trace, so production logs point at the wrong line" is the sentence an interviewer remembers.`,
    mcqs: [
      mcq('An interviewer asks why `throw ex;` is flagged in code review. What is the best answer?', [
        ['It creates a new exception object, wasting memory', false],
        ['It resets the stack trace, so logs no longer show where the failure happened', true],
        ['It is not allowed inside a catch block that has a variable', false],
        ['It silently converts the original exception into a plain System.Exception', false],
      ], 'throw ex; rethrows the same object but restarts its stack trace at the catch block. throw; keeps the original trace; wrapping keeps it as InnerException.'),
      mcq('Follow-up: when should a .NET method return false (the Try pattern) rather than throw?', [
        ['Whenever the method is called from inside a loop or a LINQ query', false],
        ['Only when the method is private or internal', false],
        ['When the method has more than one way to fail', false],
        ['When failure is an ordinary outcome the caller must handle', true],
      ], 'Expected outcomes such as unparseable input or a missing key suit a bool result. Broken contracts and system failures should throw, because the caller cannot sensibly continue.'),
      mcq('Why does disposing a SqlConnection with `using` matter in a busy ASP.NET Core API?', [
        ['A connection that is not disposed is not returned to the pool, which can run out', true],
        ['The garbage collector cannot free any objects that implement IDisposable', false],
        ['Without using, every SQL query is executed twice', false],
        ['using encrypts the connection string while the query runs', false],
      ], 'Dispose returns the connection to the pool promptly. Left to the garbage collector, connections linger, and under load the pool is exhausted and requests time out.'),
    ],
  },

  {
    unitCode: 'JT_CS_EXCEPTIONS_CHECKPOINT',
    notes: `Ten questions across the topic: the exception hierarchy, try/catch/finally, throw versus throw ex,
using and files, custom exceptions and the Try pattern. Most show a few lines of C# and ask what
happens. Decide which clause matches, what finally does, and what reaches the caller, before you look
at the options.`,
    checkpoint: [
      mcq(`What does this print?

    static void Run()
    {
        try
        {
            try { throw new FormatException(); }
            finally { Console.Write("inner "); }
        }
        catch (FormatException) { Console.Write("outer "); }
    }`, [
        ['outer inner', false],
        ['outer', false],
        ['inner outer', true],
        ['inner', false],
      ], 'The inner try has no catch, so its finally runs as the exception leaves it, writing inner. The exception then reaches the outer catch, which writes outer.'),
      mcq(`What does this print?

    try
    {
        try { throw new InvalidOperationException("first"); }
        finally { throw new IOException("second"); }
    }
    catch (Exception ex) { Console.WriteLine(ex.Message); }`, [
        ['first', false],
        ['second', true],
        ['first second', false],
        ['Nothing — two exceptions crash the program', false],
      ], 'An exception thrown from finally replaces the one already propagating. The first exception is lost, which is why cleanup code must not throw.'),
      mcq('Which exception does `var d = new Dictionary<string, int>(); int x = d["missing"];` throw?', [
        ['ArgumentNullException', false],
        ['IndexOutOfRangeException', false],
        ['InvalidOperationException', false],
        ['KeyNotFoundException', true],
      ], 'The Dictionary indexer throws KeyNotFoundException for a key that is not present. Use TryGetValue when a missing key is expected.'),
      mcq('`object o = "42"; int n = (int)o;` — what happens?', [
        ['n becomes 42, because the cast parses the string', false],
        ['It throws InvalidCastException: a boxed string is not an int', true],
        ['It throws FormatException, exactly as int.Parse("42x") would do', false],
        ['It does not compile: object cannot be cast to int', false],
      ], 'A cast from object unboxes or converts references; it never parses text. The object holds a string, so the cast fails at runtime with InvalidCastException. It compiles because object could hold a boxed int.'),
      mcq(`A catch block is:

    catch (SqlException ex)
    {
        logger.LogError(ex, "Save failed");
        throw;
    }

What does the caller receive?`, [
        ['A new Exception wrapping the SqlException', false],
        ['The same SqlException, with its original stack trace', true],
        ['Nothing — logging the exception marks it as handled', false],
        ['The SqlException, with its stack trace starting at this catch', false],
      ], 'throw; with no operand rethrows the exception currently being handled, unchanged. Its stack trace still points at where it was first thrown.'),
      mcq('Which statement about `using (var w = new StreamWriter(path)) { w.WriteLine("x"); }` is true?', [
        ['It is equivalent to a try/finally that calls w.Dispose()', true],
        ['It imports the System.IO namespace for the block only', false],
        ['Dispose runs only if no exception is thrown in the block', false],
        ['The file is written only when the garbage collector runs', false],
      ], 'A using statement compiles to try { ... } finally { if (w != null) w.Dispose(); }, so the writer is flushed and closed on every path, including exceptions.'),
      mcq(`What does this print?

    int n;
    Console.WriteLine(int.TryParse(" 42 ", out n) + " " + n);`, [
        ['False 0', false],
        ['True 42', true],
        ['True 0', false],
        ['It throws FormatException', false],
      ], 'The default NumberStyles.Integer allows leading and trailing white space and a sign, so " 42 " parses to 42 and TryParse returns True.'),
      mcq('A domain exception `PaymentDeclinedException` must carry the declined amount for the handler. What is the best design?', [
        ['Put the amount in the message and parse it out in the handler', false],
        ['Add a get-only Amount property, set from the constructor', true],
        ['Store the amount in a static field that the handler reads', false],
        ['Throw the amount itself: throw new Exception(amount.ToString())', false],
      ], 'Data a handler needs belongs in typed properties on the exception. Parsing messages is fragile, and a static field is shared by every request at once.'),
      mcq('Which exception type is the *base* of both FileNotFoundException and DirectoryNotFoundException?', [
        ['ArgumentException', false],
        ['InvalidOperationException', false],
        ['IOException', true],
        ['UnauthorizedAccessException', false],
      ], 'Both derive from System.IO.IOException, so catch (IOException) handles a missing file, a missing folder and a locked file alike.'),
      mcq('An API endpoint receives `?page=abc`. The developer writes `int page = int.Parse(Request.Query["page"]);` with a catch-all that returns 500. What is the better design?', [
        ['Keep the 500 response, since bad input is a server error', false],
        ['Catch NullReferenceException in addition and return a 404', false],
        ['Use int.TryParse and return a 400 Bad Request when it fails', true],
        ['Wrap the parse in a custom PageParseException for every request', false],
      ], 'Bad query text is an expected client mistake, so it should be validated with TryParse and answered with 400. A 500 tells the client the server broke, and throwing costs more than checking.'),
    ],
  },
];

export const TRACK_CS_OOP_BUNDLES: PilotBundle[] = [...OOP_BUNDLES, ...EXCEPTION_BUNDLES];
