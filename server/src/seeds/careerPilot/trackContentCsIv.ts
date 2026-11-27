/**
 * Career-track placement content, batch N5: C# (JT_IV_CSHARP) and ASP.NET Core, EF Core and SQL Server
 * (JT_IV_ASPNET) at interview depth, for .NET Full Stack + AI.
 *
 * Students finished the whole .NET track in Year 3 — C#, collections, LINQ, async, ADO.NET, EF Core, DI,
 * an ASP.NET Core Web API with JWT and tests, SQL Server, React on top and a deployed capstone. This is
 * not teaching from zero: each question-set unit is the questions interviewers really ask on its subject,
 * with the strong answer, the follow-up and the answers that lose the round. The stems go one level
 * deeper than the teaching topics — boxing and reference equality on object, the List-of-struct
 * compile error, field initialisers running before the base constructor, a mutated dictionary key,
 * for-loop vs foreach closures, multiple enumeration, async running synchronously to the first await,
 * WhenAll and the first exception, return vs finally, the captive dependency, IOptionsMonitor, the
 * [ApiController] automatic 400, AsNoTracking and SaveChanges, rowversion, 401 vs 403, CORS with
 * credentials, SARGable predicates, RCSI, IHttpClientFactory and liveness vs readiness.
 *
 * Every "what does this print" was compiled and run with the .NET Framework csc (C# 5). Newer features
 * (records, default interface methods, exception filters, nullable reference types) are documented
 * behaviour and the notes name the version. ASP.NET Core, EF Core and SQL Server are .NET 8, EF Core 8
 * and SQL Server 2022.
 *
 * Attribution: both topics are multi-skill (defaults CSHARP_OOP and ASPNET_CORE). Each IV_* unit
 * declares one skill and every checkpoint question in it names that skill; the CHECKPOINT unit spreads
 * its ten over the topic's skills. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_CS_IV_BUNDLES: PilotBundle[] = [
  /* ══ JT_IV_CSHARP ═══════════════════════════════════════════════════════════════════════ */

  /* ── IV_LANGUAGE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_IV_LANGUAGE',
    notes: `A C# interview almost always opens on the type system, because one distinction decides the rest of
the round: **value types hold their data, reference types hold a reference to an object on the heap.** A
candidate who really holds that model answers boxing, copying, \`ref\`, string and equality questions
without memorising them. Each question below has the answer that earns the follow-up, the follow-up
itself, and the trap.

## Q1. "What is the difference between a value type and a reference type?"

**Strong answer.** "A value type — \`int\`, \`double\`, \`bool\`, \`DateTime\`, any \`struct\` or \`enum\` —
holds its data directly; assigning it copies the data. A reference type — \`class\`, \`string\`, arrays,
delegates, \`record\` (class) — is an object on the managed heap, and a variable holds a reference to it;
assigning copies the reference, so two variables can see the same object."

**Follow-up:** "So value types live on the stack?" — "Not always. A local \`int\` usually does, but an
\`int\` field of a class lives inside that object on the heap, and a captured local in a lambda moves into
a heap-allocated closure. *Value vs reference* is about copy semantics; *stack vs heap* is an
implementation detail."

**Trap:** "Structs are on the stack, classes are on the heap" said as a rule — the follow-up is designed to
catch exactly that.

## Q2. "What is boxing, and why does it matter?"

**Strong answer.** "Converting a value type to \`object\` or to an interface it implements allocates a
heap object and copies the value into it — that is boxing. Unboxing checks the type and copies it back.
The box is a *copy*: changing the original afterwards does not change the box."

    object a = 5; object b = 5;
    int n = 7; object boxed = n; n = 9;
    Console.WriteLine((a == b) + " " + a.Equals(b) + " " + boxed);   // False True 7

\`==\` on two \`object\` variables is **reference** equality — two separate boxes. \`Equals\` is virtual and
\`Int32.Equals\` compares the values.

**Follow-up:** "Where does boxing sneak into real code?" — the old non-generic \`ArrayList\` and
\`Hashtable\`, \`string.Format\` with value arguments, calling an interface method on a struct through the
interface, and a struct used as a dictionary key without overriding \`Equals\`/\`GetHashCode\` (the default
\`ValueType.Equals\` uses reflection). Generics (\`List<int>\`) exist largely to avoid it.

## Q3. "Strings are reference types — so why does == compare their contents?"

**Strong answer.** "\`string\` overloads \`==\` to compare characters, and \`string\` is immutable, so it
*behaves* like a value even though it is a reference type. But operator overloads are chosen at compile
time by the static type: cast both sides to \`object\` and \`==\` becomes reference comparison again."

    string s1 = "hello";
    string s2 = new string("hello".ToCharArray());
    Console.WriteLine(((object)s1 == (object)s2) + " " + (s1 == s2));   // False True

**Follow-up:** "What is interning?" — the CLR keeps one shared instance of every string *literal*, so two
\`"hello"\` literals are the same object; strings built at runtime are not interned unless you call
\`string.Intern\`. Never rely on it for correctness.

**Follow-up 2:** "Why is concatenating in a loop slow?" — each \`+=\` allocates a new string and copies;
O(n²) for n pieces. \`StringBuilder\` appends into a growable buffer; \`string.Join\` and
\`string.Concat\` over a collection are fine too.

## Q4. "ref, out and in — when do you use each?"

**Strong answer.**
- \`ref\` — pass the *variable*, not a copy. The method can read it and reassign it; the caller must
  initialise it first.
- \`out\` — the method **must** assign it before returning; the caller need not initialise it. That is
  the \`TryParse\` pattern: \`int.TryParse(text, out int n)\` (C# 7 \`out var\`).
- \`in\` (C# 7.2) — pass a large struct by read-only reference to avoid copying it; the method cannot
  assign it.

**Follow-up:** "Does passing a reference type need \`ref\`?" — only to *reassign the caller's variable*.
Without \`ref\` the method gets a copy of the reference: it can mutate the object, but pointing its
parameter at a new object does not affect the caller.

    static void Reset(int[] a) { a[0] = 0; a = new int[] { 9 }; }   // caller sees the 0, not the 9

**Trap:** "C# passes objects by reference." C# passes everything **by value** unless you write \`ref\`,
\`out\` or \`in\`; for a reference type the value copied is the reference.

## Q5. "Why does list[0].X = 5 not compile when the list holds structs?"

**Strong answer.** "The \`List<T>\` indexer is a method that *returns a copy* of the struct. Assigning a
field of a temporary copy would be lost, so the compiler refuses it — error CS1612, 'Cannot modify the
return value ... because it is not a variable'. An array element is a variable, so \`arr[0].X = 5\` is
fine. Fix: copy out, modify, write back — or make the struct immutable, which is the guideline anyway."

## Q6. "Nullable value types vs nullable reference types?"

**Strong answer.** "\`int?\` is \`Nullable<int>\` — a real runtime type with \`HasValue\` and \`Value\`.
Arithmetic with a null operand gives null (*lifted* operators), and comparisons \`<\`, \`>\`, \`<=\`, \`>=\`
with a null operand are **false**. Nullable *reference* types (C# 8, on by default in new .NET projects
via \`<Nullable>enable</Nullable>\`) are only annotations: \`string?\` and \`string\` are the same runtime
type, the compiler just warns when you might dereference null."

    int? a = null; int? b = 5;
    // a + b == null → True,  a < b → False,  a >= b → False,  a != b → True

**Follow-up:** "What does \`!\` after an expression do?" — the null-forgiving operator: it silences the
warning and changes nothing at runtime.

## Q7. "const vs readonly?"

**Strong answer.** "\`const\` is a compile-time constant, implicitly static, only for primitives, enums
and strings — and its value is **copied into every assembly that uses it**, so changing a public const in
a library needs every consumer recompiled. \`readonly\` is assigned in the declaration or constructor,
can be any type, and is read at runtime. For values that might change, \`static readonly\`."

## How you are judged

Strong candidates talk about *copy semantics* and *static vs runtime type*, and label implementation
details as such. Weak ones recite "structs on the stack" and "objects passed by reference".`,
    mcqs: [
      mcq(`What does this print?

    object a = 5; object b = 5;
    int n = 7; object boxed = n; n = 9;
    Console.WriteLine((a == b) + " " + a.Equals(b) + " " + boxed);`, [
        ['True True 9', false],
        ['False True 7', true],
        ['True True 7', false],
        ['False False 9', false],
      ], 'Each assignment to object boxes the int into its own heap object, so == on two object variables compares references and is False. Equals is virtual and Int32.Equals compares values. The box holds a copy, so changing n later does not affect it.'),
      mcq(`What happens when this is compiled?

    struct Point { public int X; }
    ...
    var pts = new List<Point>();
    pts.Add(new Point());
    pts[0].X = 5;`, [
        ['It compiles, and pts[0].X is 5 afterwards', false],
        ['It compiles, but pts[0].X is still 0 afterwards', false],
        ['It fails: the indexer returns a copy, error CS1612', true],
        ['It throws InvalidOperationException at runtime', false],
      ], 'The List<T> indexer returns a copy of the struct, and modifying a field of a temporary copy would be silently lost, so the compiler rejects it with CS1612. An array element is a variable, so the same line works on Point[].'),
      mcq(`What does this print?

    string s1 = "hello";
    string s2 = new string("hello".ToCharArray());
    Console.WriteLine(((object)s1 == (object)s2) + " " + (s1 == s2)
        + " " + ((object)s1 == (object)string.Intern(s2)));`, [
        ['True True True', false],
        ['False False True', false],
        ['False True False', false],
        ['False True True', true],
      ], 'Operator overloads are picked by static type: cast to object, == compares references, and s2 is a new string built at runtime. string == compares characters. string.Intern returns the pooled instance, which is the literal s1 refers to.'),
    ],
    checkpoint: [
      ck('CSHARP_BASICS', `What does this print?

    static void Reset(int[] a) { a[0] = 0; a = new int[] { 9 }; }
    static void ResetRef(ref int[] a) { a = new int[] { 9 }; }
    ...
    int[] x = { 1, 2 };
    Reset(x); Console.Write(x[0]);
    ResetRef(ref x); Console.Write(x[0]);`, [
        ['19', false],
        ['09', true],
        ['99', false],
        ['01', false],
      ], 'Without ref the method gets a copy of the reference: writing a[0] changes the shared array, but pointing a at a new array is invisible to the caller. With ref the caller\'s variable itself is reassigned, so x now refers to { 9 }.'),
      ck('CSHARP_BASICS', `What does this print?

    int? a = null; int? b = 5;
    Console.WriteLine((a + b == null) + " " + (a < b) + " " + (a >= b) + " " + (a != b));`, [
        ['True False False True', true],
        ['True True False True', false],
        ['False False True True', false],
        ['It throws InvalidOperationException', false],
      ], 'Lifted arithmetic with a null operand gives null. The relational operators <, >, <= and >= return false whenever either operand is null, so a < b and a >= b are both false. == and != treat null as a value, so a != b is true.'),
      ck('CSHARP_BASICS', 'A library exposes public const int MaxRetries = 3. The team changes it to 5, rebuilds only the library and redeploys that DLL. What do the consuming services that were not rebuilt use?', [
        ['5, because const values are read from the library each time', false],
        ['3, because the const was copied into each consumer at compile time', true],
        ['5 after an app pool restart, because constants are cached per process', false],
        ['Nothing: the runtime throws MissingFieldException on first use', false],
      ], 'A const is a compile-time constant and its value is baked into the IL of every assembly that uses it. Consumers keep 3 until they are recompiled. A static readonly field is read at runtime, which is why it is preferred for values that may change.'),
    ],
  },

  /* ── IV_OOP ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_IV_OOP',
    notes: `"Explain the four pillars" is the warm-up. What decides a C# OOP round is the C#-specific machinery:
\`virtual\`, \`override\` and \`new\`, what really runs during construction, abstract classes against
interfaces now that interfaces can carry code, and when a struct or a record is the right type.

## Q1. "virtual, override and new — what is the difference?"

**Strong answer.** "Methods in C# are non-virtual by default. \`virtual\` lets a derived class
\`override\`, and the call is then decided by the **runtime type** of the object. \`new\` *hides* the base
member instead: a different method that happens to have the same name, chosen by the **static type** of
the variable."

    class Base    { public virtual string Name() { return "Base"; }    public string Id() { return "B"; } }
    class Derived : Base { public override string Name() { return "Derived"; } public new string Id() { return "D"; } }

    Base x = new Derived();
    x.Name();              // "Derived" — runtime type
    x.Id();                // "B"       — static type is Base
    ((Derived)x).Id();     // "D"

**Follow-up:** "Why does C# make you write \`override\` when Java does not?" — so that a base class adding
a method later cannot silently change a derived class's behaviour (the brittle base class problem). Without
\`override\` or \`new\` the compiler warns CS0108 and treats it as \`new\`.

**Trap:** "new and override are the same" — interviewers write the snippet above specifically to catch it.

## Q2. "What runs, in what order, when you construct a derived object?"

**Strong answer.** "Derived field initialisers, then base field initialisers, then the base constructor
body, then the derived constructor body. Static constructors run once, before the first use of the type —
derived first, because constructing \`B\` touches \`B\` before its base."

The trap that follows: **a virtual call from a base constructor runs the override before the derived
constructor body has run.** In C#, derived *field initialisers* have already run, so a field set by an
initialiser has its value — unlike Java, where it would still be null:

    class Base { public Base() { Show(); } public virtual void Show() { } }
    class Derived : Base {
        string tag = "field";
        public Derived() { tag = "ctor"; Show(); }
        public override void Show() { Console.Write(tag + " "); }
    }
    new Derived();   // field ctor

**Follow-up:** "So is calling virtual methods in a constructor fine?" — no; the override sees a
half-built object (anything the derived constructor sets is not set yet). Code analysis rule CA2214 flags
it.

## Q3. "Abstract class or interface?"

**Strong answer.** "An interface is a contract a type can sign many of; a class has one base class. Use an
abstract class when related types share **state and code** — fields, constructors, protected helpers.
Since C# 8 interfaces can have *default implementations* and static members, but still no instance fields
and no constructors, so they cannot hold per-object state."

**Follow-up:** "Can you call a default interface method on the class?" — only through the interface:

    interface ILogger { void Log(string m); string Prefix() => "[app]"; }
    class FileLogger : ILogger { public void Log(string m) { } }

    new FileLogger().Prefix();            // compile error — the class does not inherit it
    ((ILogger)new FileLogger()).Prefix(); // "[app]"

Default methods exist to let a library **add a member to a published interface** without breaking every
implementer — not as a replacement for abstract classes.

## Q4. "Explicit interface implementation — why would you use it?"

**Strong answer.** "\`string IPrinter.Print()\` implements the member only for callers holding an
\`IPrinter\`. Use it when two interfaces have members with the same signature but different meanings, or
to keep an interface member off the class's public surface (\`IDisposable.Dispose\` on a type that exposes
\`Close\`)." A class can have both a public \`Print\` and an explicit \`IPrinter.Print\`; which runs depends
on the static type of the reference.

## Q5. "sealed — why, and does it matter for performance?"

**Strong answer.** "\`sealed\` stops further inheritance (on a class) or further overriding (on an
\`override\`). It documents that the type was not designed for extension, and the JIT can devirtualise
calls on sealed types. Seal by default; open up deliberately."

## Q6. "Struct, class or record?"

**Strong answer.**
- **class** — identity matters, it is mutable or large, it takes part in inheritance.
- **struct** — small (a rule of thumb is 16 bytes or less), immutable, value semantics: \`Money\`,
  \`Point\`, \`DateRange\`. Copies on every assignment; default \`Equals\` compares fields.
- **record** (C# 9) — a class with **value-based equality**, a readable \`ToString\`, and non-destructive
  mutation with \`with\`. Ideal for DTOs and messages. \`record struct\` (C# 10) is the value-type form.

    record Person(string Name);
    var a = new Person("Asha");
    var b = a with { Name = "Asha" };
    // a == b → true (same values); ReferenceEquals(a, b) → false

**Follow-up:** "Is a record immutable?" — positional record *classes* get \`init\`-only properties, so
shallowly yes; but a \`List<T>\` property can still be mutated, and a \`record struct\`'s positional
properties are mutable unless declared \`readonly record struct\`.

## Q7. "Composition over inheritance — show me."

**Strong answer.** A \`PdfInvoice : Invoice : Document\` hierarchy breaks as soon as you need an emailed
PDF and a printed CSV. Inject an \`IInvoiceFormatter\` and an \`IInvoiceSender\` instead; each varies
independently and is testable alone. Inheritance is for genuine *is-a* with shared behaviour; DI-friendly
composition is the default in ASP.NET Core code.

## How you are judged

Strong candidates reason from *static type vs runtime type* and know which C# version added what. Weak
ones say "interfaces cannot have code" (out of date since C# 8) or cannot predict \`new\` vs \`override\`.`,
    workedExample: `**The question.** "Our payment classes started charging the wrong fee after someone 'cleaned up' the
warnings. Here is the code. What happened?"

    public class PaymentMethod {
        public virtual decimal Fee(decimal amount) { return 0m; }
    }
    public class Card : PaymentMethod {
        public new decimal Fee(decimal amount) { return amount * 0.02m; }   // was: override
    }
    ...
    PaymentMethod pm = new Card();
    var fee = pm.Fee(1000m);                                           // 0, not 20

**Step 1 — name the mechanism.** \`new\` hides; it does not override. \`pm\` is typed \`PaymentMethod\`, so
the compiler binds \`pm.Fee\` to the virtual slot of \`PaymentMethod.Fee\`, and nothing overrides that slot.
\`Card.Fee\` only runs when the static type is \`Card\`.

**Step 2 — explain the history.** Originally the method was declared \`public decimal Fee\` with no
modifier, which gives warning CS0108 ("hides inherited member; use the new keyword if hiding was
intended"). Someone silenced the warning by adding \`new\` — exactly the wrong fix. The intent was
\`override\`.

**Step 3 — fix it, and prevent it.**

    public class Card : PaymentMethod {
        public override decimal Fee(decimal amount) { return amount * 0.02m; }
    }

Add a unit test that calls \`Fee\` through the base type, and treat CS0108 and CS0114 as errors
(\`<WarningsAsErrors>\` in the project file) so hiding can never be "fixed" this way again.

**Step 4 — the follow-ups you pre-empt.** "Would an abstract base be better?" — yes: make \`Fee\`
\`abstract\` and every payment method *must* decide its fee; a missing override becomes a compile error.
"Should \`Card\` be sealed?" — if nothing is meant to derive from it, yes.`,
    mcqs: [
      mcq(`What does this print?

    class Base { public virtual string Name() { return "Base"; } public string Id() { return "B"; } }
    class Derived : Base { public override string Name() { return "Derived"; } public new string Id() { return "D"; } }
    ...
    Base x = new Derived();
    Console.WriteLine(x.Name() + x.Id() + ((Derived)x).Id());`, [
        ['DerivedDD', false],
        ['BaseBD', false],
        ['DerivedBD', true],
        ['DerivedBB', false],
      ], 'Name is virtual and overridden, so the runtime type Derived decides. Id is hidden with new, so the static type decides: through a Base variable it is Base.Id, and after the cast it is Derived.Id.'),
      mcq(`What does this print?

    class Base { public Base() { Show(); } public virtual void Show() { Console.Write("Base "); } }
    class Derived : Base {
        string tag = "field";
        public Derived() { tag = "ctor"; Show(); }
        public override void Show() { Console.Write(tag + " "); }
    }
    ...
    new Derived();`, [
        ['field ctor', true],
        ['Base ctor', false],
        [' ctor (an empty tag first)', false],
        ['ctor ctor', false],
      ], 'C# runs derived field initialisers before the base constructor, so when the base constructor makes the virtual call, the override runs and tag is already "field". The derived constructor body then sets "ctor". In Java the first value would still be null.'),
      mcq(`With C# 8 or later, what happens on the last line?

    interface ILogger { void Log(string m); string Prefix() => "[app]"; }
    class FileLogger : ILogger { public void Log(string m) { } }
    ...
    var f = new FileLogger();
    Console.WriteLine(f.Prefix());`, [
        ['It prints [app], inherited from the interface', false],
        ['It compiles but throws NotImplementedException', false],
        ['It prints an empty line, as Prefix is not implemented', false],
        ['Compile error: FileLogger has no member called Prefix', true],
      ], 'A default interface method is not inherited by the implementing class; it is reachable only through a reference of the interface type, such as ((ILogger)f).Prefix(). That keeps adding a member to an interface from changing existing classes.'),
    ],
    checkpoint: [
      ck('CSHARP_OOP', `What does this print?

    struct S { public int A; }
    class C { public int A; }
    ...
    S x = new S(); x.A = 1; S y = new S(); y.A = 1;
    C p = new C(); p.A = 1; C q = new C(); q.A = 1;
    Console.WriteLine(x.Equals(y) + " " + p.Equals(q));`, [
        ['True True', false],
        ['True False', true],
        ['False False', false],
        ['False True', false],
      ], 'ValueType.Equals compares the fields of two structs, so x equals y. A class without an Equals override inherits Object.Equals, which is reference equality, and p and q are two separate objects.'),
      ck('CSHARP_OOP', 'Since C# 8 interfaces can have default method bodies and static members. What can an abstract class still have that an interface cannot?', [
        ['Methods with a body that callers can use', false],
        ['Static members shared by every implementer', false],
        ['Instance fields and constructors for its state', true],
        ['Public members that derived types must provide', false],
      ], 'Interfaces may carry default implementations and static members, but not instance fields or constructors, so they cannot hold per-object state. When related types share state and initialisation, an abstract base class is still the tool.'),
      ck('CSHARP_OOP', `In C# 9, what does this print?

    record Person(string Name);
    ...
    var a = new Person("Asha");
    var b = a with { Name = "Asha" };
    Console.WriteLine((a == b) + " " + ReferenceEquals(a, b));`, [
        ['True True', false],
        ['False False', false],
        ['False True', false],
        ['True False', true],
      ], 'A with expression always creates a new object, so the references differ. Records generate value-based equality and an == operator that compares the properties, and both have Name "Asha".'),
    ],
  },

  /* ── IV_COLLECTIONS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_IV_COLLECTIONS',
    notes: `"How does Dictionary work?" is to a .NET interview what "how does HashMap work?" is to a Java one.
Then come the costs of everyday operations — because a candidate who writes \`list.Contains(id)\` inside a
loop over a lakh of orders has just written an O(n²) endpoint — and the interface questions.

## Q1. "How is List<T> implemented?"

**Strong answer.** "An array plus a count. Indexing is O(1). \`Add\` is amortised O(1): when the array
is full it allocates one twice as large (capacity 0, then 4, 8, 16...) and copies. \`Insert(0, x)\` and
\`RemoveAt(0)\` shift every element — O(n). \`Contains\` and \`IndexOf\` are linear scans."

**Follow-up:** "You know you will add a lakh items?" — pass the capacity to the constructor to avoid the
repeated grow-and-copy. "You need a queue?" — \`Queue<T>\` (a circular buffer): O(1) at both ends.

## Q2. "How does Dictionary<TKey, TValue> work?"

**Strong answer.** "A hash table with chaining through an entries array. \`GetHashCode()\` picks a bucket;
entries in the same bucket are linked by index; a lookup compares the stored hash first and then calls
\`Equals\`. Add, lookup and remove are O(1) on average, O(n) if every key collides. When it fills up it
resizes to a larger prime and rehashes."

**Follow-up:** "Is enumeration order guaranteed?" — **no**. It happens to follow insertion order until you
remove something, and the documentation says the order is undefined. Use \`SortedDictionary\` (a
red-black tree, O(log n)) for key order, or keep a separate list.

## Q3. "What are the rules for GetHashCode?"

**Strong answer.** "Equal objects must return equal hash codes. The hash must not change while the object
is a key. Unequal objects may collide — that only costs speed. If you override \`Equals\`, override
\`GetHashCode\` (the compiler warns CS0659). Base both on immutable fields; \`HashCode.Combine(a, b)\` in
modern .NET."

The trap — a key mutated after insertion:

    var d = new Dictionary<Key, string>();
    var k = new Key { Id = 1 };    // hash and Equals use Id
    d[k] = "one";
    k.Id = 2;
    // d.ContainsKey(k) → False (looks in bucket for 2)
    // d.ContainsKey(new Key { Id = 1 }) → False (right bucket, but Equals fails)
    // d.Count → 1 — the entry is still there, unreachable

## Q4. "What happens if you modify a List while you foreach over it?"

**Strong answer.** "The enumerator records the list's version; \`Add\` or \`Remove\` bumps it, and the next
\`MoveNext\` throws \`InvalidOperationException: Collection was modified\`. Fixes: iterate a copy
(\`ToList()\`), loop backwards with an index, or use \`RemoveAll(predicate)\` — one O(n) pass."

## Q5. "IEnumerable, ICollection, IList — what does each promise?"

**Strong answer.**
- \`IEnumerable<T>\` — can be iterated, once or many times; nothing about count or indexing; may be lazy.
- \`ICollection<T>\` — adds \`Count\`, \`Add\`, \`Remove\`, \`Contains\`.
- \`IList<T>\` — adds index access and \`Insert\`.
- \`IReadOnlyList<T>\` / \`IReadOnlyCollection<T>\` — count and indexing without mutation.

**Follow-up:** "What should a public method return?" — the narrowest thing callers need:
\`IReadOnlyList<T>\` when they need the count and index; \`IEnumerable<T>\` only if lazy streaming is
intended. Returning \`IEnumerable<T>\` over a query invites multiple enumeration.

## Q6. "Which collection would you pick?"

| Need | Type | Cost |
|---|---|---|
| Lookup by key | \`Dictionary\` | O(1) average |
| Unique membership | \`HashSet\` | O(1) average |
| Sorted by key | \`SortedDictionary\` / \`SortedSet\` | O(log n) |
| FIFO / LIFO | \`Queue\` / \`Stack\` | O(1) |
| Priority (.NET 6+) | \`PriorityQueue<TElement, TPriority>\` | O(log n) |
| Shared across threads | \`ConcurrentDictionary\` | lock-striped |

**Follow-up:** case-insensitive keys — pass a comparer, \`new HashSet<string>(StringComparer.OrdinalIgnoreCase)\`,
instead of calling \`ToLower()\` on every key.

## Q7. "Generics — what do constraints buy you, and why are .NET generics not erased?"

**Strong answer.** "A constraint tells the compiler what \`T\` can do: \`where T : IComparable<T>\` lets
you call \`CompareTo\`, \`where T : new()\` lets you write \`new T()\`, \`where T : class\` / \`struct\`
restrict the kind. .NET generics are **reified**: \`List<int>\` is a real type at runtime with \`int\`
stored unboxed, and \`typeof(T)\` works — unlike Java's erasure."

**Follow-up:** "Is \`List<string>\` a \`List<object>\`?" — no; \`List<T>\` is invariant because you could
add an \`int\` to it. \`IEnumerable<out T>\` is covariant, so \`IEnumerable<string>\` *is* an
\`IEnumerable<object>\`. Arrays are covariant too — and pay for it with a runtime check:
\`object[] arr = new string[2]; arr[0] = 1;\` throws \`ArrayTypeMismatchException\`.

## How you are judged

Strong candidates give costs with every answer and know the hash/equals contract. Weak ones say "a
dictionary keeps insertion order" or reach for \`List.Contains\` inside a loop.`,
    mcqs: [
      mcq(`Key overrides GetHashCode and Equals using its Id field. What does this print?

    var d = new Dictionary<Key, string>();
    var k = new Key(); k.Id = 1; d[k] = "one"; k.Id = 2;
    var probe = new Key(); probe.Id = 1;
    Console.WriteLine(d.ContainsKey(k) + " " + d.ContainsKey(probe) + " " + d.Count);`, [
        ['True False 1', false],
        ['False True 1', false],
        ['False False 1', true],
        ['False False 0', false],
      ], 'The entry was filed under hash 1. Looking up k now hashes to 2 and misses; the probe finds the stored hash 1 but Equals compares Id 1 with the mutated Id 2 and fails. The entry is still counted, just unreachable. Keys must not change while in a dictionary.'),
      mcq(`What does this print?

    var nums = new List<int> { 1, 2, 3, 4 };
    try { foreach (var n in nums) if (n % 2 == 0) nums.Remove(n); }
    catch (InvalidOperationException) { Console.Write("IOE "); }
    Console.WriteLine(nums.Count);`, [
        ['IOE 3', true],
        ['2', false],
        ['IOE 4', false],
        ['3', false],
      ], 'Removing 2 succeeds and changes the list\'s version; the enumerator notices on the next MoveNext and throws "Collection was modified". By then one element is gone, so 3 remain. RemoveAll(n => n % 2 == 0) is the one-pass fix.'),
      mcq(`What does this print?

    var s = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Asha", "asha", "ASHA", "Ravi" };
    var t = new HashSet<string> { "Asha", "asha", "ASHA", "Ravi" };
    Console.WriteLine(s.Count + " " + t.Count);`, [
        ['4 4', false],
        ['2 2', false],
        ['1 4', false],
        ['2 4', true],
      ], 'The comparer decides both hashing and equality. With OrdinalIgnoreCase the three spellings of Asha are one element, plus Ravi. The default comparer is ordinal and case-sensitive, so all four strings are distinct.'),
    ],
    checkpoint: [
      ck('CSHARP_COLLECTIONS', `What does this print?

    var d = new Dictionary<string, int>();
    d["a"] = 1; d["a"] = 2;
    try { d.Add("a", 3); } catch (ArgumentException) { Console.Write("dup "); }
    int v;
    Console.WriteLine(d.TryGetValue("b", out v) + " " + v + " " + d["a"]);`, [
        ['False 0 3', false],
        ['dup False 0 2', true],
        ['dup True 0 2', false],
        ['False 0 2', false],
      ], 'The indexer setter adds or overwrites, so the second assignment just replaces 1 with 2. Add refuses an existing key with ArgumentException. TryGetValue on a missing key returns false and sets the out value to default(int), 0.'),
      ck('CSHARP_COLLECTIONS', 'A method checks ids.Contains(order.CustomerId) for each of 1,00,000 orders, where ids is a List<int> of 50,000 ids. What is the right fix?', [
        ['Sort the list once and call Contains, which then uses binary search', false],
        ['Build a HashSet<int> from ids once and test membership against it', true],
        ['Switch to a LinkedList<int>, which has a faster Contains', false],
        ['Run the loop with Parallel.ForEach so the scans overlap', false],
      ], 'List.Contains is a linear scan whether or not the list is sorted, so the loop is O(n·m). A HashSet gives O(1) average membership, making the whole thing O(n + m). A sorted list would need BinarySearch, not Contains, and LinkedList is no faster.'),
      ck('CSHARP_COLLECTIONS', `What happens when this runs?

    object[] arr = new string[2];
    arr[0] = 1;`, [
        ['Compile error: an int cannot go into object[]', false],
        ['It stores the boxed 1, since arr is object[]', false],
        ['ArrayTypeMismatchException at runtime', true],
        ['InvalidCastException on the first assignment', false],
      ], 'Arrays of reference types are covariant, so a string[] can be referenced as object[]. The compiler accepts the store, but the runtime checks the actual element type on every write and throws ArrayTypeMismatchException. Generic List<T> is invariant and avoids this.'),
    ],
  },

  /* ── IV_LINQ_DELEGATES ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_IV_LINQ_DELEGATES',
    notes: `Delegates, lambdas and LINQ are where C# rounds put their "what does this print" questions, because
two ideas trip most candidates: **closures capture variables, not values**, and **LINQ queries run when
enumerated, not when written.**

## Q1. "What is a delegate? Func vs Action vs Predicate?"

**Strong answer.** "A type-safe reference to a method — an object that holds a target and a method
pointer. \`Func<T1, ..., TResult>\` returns a value, \`Action<T1, ...>\` returns void,
\`Predicate<T>\` is \`Func<T, bool>\` from before generics settled. Lambdas convert to whichever delegate
type the context expects."

**Follow-up:** "What is a multicast delegate?" — \`+=\` combines delegates into an invocation list; all
run in order. If they return values, the caller gets **only the last one's**:

    Func<int> f = () => 1;
    f += () => 2;
    Console.WriteLine(f());   // 2

And if one handler throws, the rest do not run.

## Q2. "What does the event keyword add on top of a delegate field?"

**Strong answer.** "Encapsulation. Outside the declaring class you can only \`+=\` and \`-=\` handlers. You
cannot assign the event (\`= null\` would wipe everybody's subscriptions) and you cannot invoke it — only
the owner raises it. Raise it with \`Paid?.Invoke(this, args)\` so a race with the last unsubscribe does
not cause a NullReferenceException."

**Follow-up:** "How do events cause memory leaks?" — the publisher's invocation list holds a reference to
every subscriber. A long-lived publisher (a static event, a singleton service) keeps short-lived
subscribers alive until they unsubscribe.

## Q3. "What does a lambda capture?"

**Strong answer.** "The **variable**, not its current value. The compiler hoists captured locals into a
closure object shared by the lambda and the method." The classic:

    var actions = new List<Action>();
    for (int i = 0; i < 3; i++) actions.Add(() => Console.Write(i));
    foreach (var n in new[] { 0, 1, 2 }) actions.Add(() => Console.Write(n));
    foreach (var a in actions) a();   // 333012

A \`for\` loop has **one** \`i\` for the whole loop, which ends at 3. Since **C# 5**, a \`foreach\` loop
variable is a fresh variable per iteration, so each lambda gets its own \`n\`. Fix for \`for\`: copy into a
local inside the body (\`int copy = i;\`).

## Q4. "What is deferred execution?"

**Strong answer.** "Most LINQ operators — \`Where\`, \`Select\`, \`OrderBy\`, \`GroupBy\` — build a query
and run nothing. The work happens when you enumerate: \`foreach\`, \`ToList\`, \`Count\`, \`First\`,
\`Sum\`. So the query sees the source **as it is at enumeration time**, and enumerating twice runs it
twice."

    var list = new List<int> { 1, 2, 3 };
    var big = list.Where(x => x > 1);           // nothing runs
    var snap = list.Where(x => x > 1).ToList(); // runs now: [2, 3]
    list.Add(4);
    // big.Count() → 3, snap.Count → 2

**Follow-up:** "Why does ReSharper warn about 'possible multiple enumeration'?" — calling \`Sum()\` and
then \`Max()\` on the same lazy query runs the whole pipeline (and any side effects, or a database query)
twice. Materialise once with \`ToList()\` when you need it more than once.

## Q5. "IEnumerable<T> vs IQueryable<T>?"

**Strong answer.** "\`IEnumerable<T>\` runs LINQ in memory with delegates. \`IQueryable<T>\` holds an
**expression tree** that a provider — EF Core — translates to SQL. The moment a query is typed as
\`IEnumerable<T>\`, every later operator runs in memory."

    IEnumerable<Order> orders = db.Orders;               // typed as IEnumerable
    var big = orders.Where(o => o.Total > 1000).ToList(); // SELECT * FROM Orders, then filters in C#

Keep it \`IQueryable\` until the filter, sort and paging are applied; a repository returning
\`IEnumerable<T>\` from a \`DbSet\` quietly loads the whole table.

## Q6. "First, FirstOrDefault, Single, SingleOrDefault?"

**Strong answer.** "\`First\` throws if empty; \`FirstOrDefault\` returns \`default(T)\` — null or 0.
\`Single\` throws if there is not **exactly one** match — zero *or* more than one; \`SingleOrDefault\`
throws only on more than one. Use \`Single\` when duplicates mean corrupt data, \`First\` when you just
want one. Against a database \`Single\` asks for two rows to check."

## Q7. "Write a LINQ query: top three customers by revenue in the last 30 days."

    var since = DateTime.UtcNow.AddDays(-30);
    var top = orders
        .Where(o => o.PlacedAt >= since)
        .GroupBy(o => o.CustomerId)
        .Select(g => new { CustomerId = g.Key, Revenue = g.Sum(o => o.Total) })
        .OrderByDescending(x => x.Revenue)
        .Take(3)
        .ToList();

**Follow-up:** "What does the SQL look like with EF Core?" — one \`GROUP BY\` query with \`SUM\`,
\`ORDER BY ... DESC\` and \`TOP(3)\`; computing \`DateTime.UtcNow\` into a variable first makes it a
parameter.

## How you are judged

Strong candidates say *when* a query runs and *what* a lambda captured. Weak ones expect \`012012\` from
the closure question or call \`ToList()\` on a \`DbSet\` before filtering.`,
    mcqs: [
      mcq(`Compiled with C# 5 or later, what does this print?

    var actions = new List<Action>();
    for (int i = 0; i < 3; i++) actions.Add(() => Console.Write(i));
    foreach (var n in new[] { 0, 1, 2 }) actions.Add(() => Console.Write(n));
    foreach (var a in actions) a();`, [
        ['012012', false],
        ['333222', false],
        ['333012', true],
        ['012222', false],
      ], 'Lambdas capture variables. A for loop has a single i shared by every iteration, and it is 3 when the lambdas run. Since C# 5 each foreach iteration declares a fresh n, so those lambdas print 0, 1 and 2.'),
      mcq(`What does this print?

    var list = new List<int> { 1, 2, 3 };
    var big = list.Where(x => x > 1);
    var snap = list.Where(x => x > 1).ToList();
    list.Add(4);
    Console.WriteLine(big.Count() + " " + snap.Count);`, [
        ['2 2', false],
        ['3 2', true],
        ['3 3', false],
        ['2 3', false],
      ], 'Where is deferred: big runs when Count() enumerates it, after 4 was added, so it finds 2, 3 and 4. ToList ran the query immediately and copied the two matches that existed at that moment.'),
      mcq(`What does this print?

    Func<int> f = () => 1;
    f += () => 2;
    Console.WriteLine(f());`, [
        ['1, from the first delegate in the list', false],
        ['3, the sum of both return values', false],
        ['Compile error: += is only for events', false],
        ['2, the value of the last delegate run', true],
      ], 'Combining delegates builds an invocation list and invoking it runs every target in order. When they return values, only the last one\'s result comes back to the caller; the others are discarded.'),
    ],
    checkpoint: [
      ck('CSHARP_LINQ', `What does this print?

    int calls = 0;
    var q = Enumerable.Range(1, 3).Select(x => { calls++; return x * 2; });
    var s = q.Sum();
    var m = q.Max();
    Console.WriteLine(calls + " " + s + " " + m);`, [
        ['3 12 6', false],
        ['0 12 6', false],
        ['6 12 6', true],
        ['6 12 12', false],
      ], 'q is a deferred query, so Sum enumerates it once and Max enumerates it again, running the selector three times each. Materialising with ToList() before the two calls would run it only three times.'),
      ck('CSHARP_LINQ', `An EF Core repository has this method. What does calling GetBig() do against SQL Server?

    public List<Order> GetBig() {
        IEnumerable<Order> orders = db.Orders;
        return orders.Where(o => o.Total > 1000).ToList();
    }`, [
        ['Sends WHERE Total > 1000 to SQL Server, as EF sees the lambda', false],
        ['Throws, because a DbSet cannot be assigned to IEnumerable', false],
        ['Reads every order row, then filters them in memory in C#', true],
        ['Sends the filter only if lazy loading has been enabled', false],
      ], 'The static type picks the extension method. Typed as IEnumerable, Where is Enumerable.Where with a compiled delegate, so EF runs SELECT on the whole table and the filter happens in the app. Keeping it IQueryable lets EF translate the expression to SQL.'),
      ck('CSHARP_LINQ', 'A class declares public event EventHandler Paid. Which line will NOT compile in another class that holds an account reference?', [
        ['account.Paid += OnPaid;', false],
        ['account.Paid -= OnPaid;', false],
        ['account.Paid(account, EventArgs.Empty);', true],
        ['account.Paid += (s, e) => Log("paid");', false],
      ], 'Outside the declaring class an event exposes only add and remove. Invoking it, or assigning it with =, is allowed only inside the class, which stops other code from raising the event or wiping every subscriber.'),
    ],
  },

  /* ── IV_ASYNC ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_IV_ASYNC',
    notes: `Every ASP.NET Core job asks about async, and the interviewer is listening for one sentence: **await does
not create a thread — it frees the current one while the operation is pending.** After that come the
deadlock, async void, running things concurrently, cancellation and thread safety.

## Q1. "What does await actually do?"

**Strong answer.** "The compiler turns the async method into a state machine. At an \`await\` on a task
that is not finished, the method registers the rest of itself as a continuation and **returns to its
caller** — the thread goes back to the pool to serve other requests. When the I/O completes, the
continuation runs, usually on a pool thread. If the awaited task is already complete, execution just
continues synchronously."

    static async Task Work() { Console.Write("A"); await Task.Delay(50); Console.Write("C"); }
    ...
    var t = Work(); Console.Write("B"); t.Wait(); Console.Write("D");    // ABCD

The method runs **synchronously up to the first incomplete await** — that is why A prints before B.

**Follow-up:** "So does async make code faster?" — no; a single request takes as long. It lets the
server handle far more concurrent requests with the same threads, because no thread sits blocked on I/O.

## Q2. "Task vs Thread vs ValueTask?"

**Strong answer.** "A \`Thread\` is an OS thread — expensive, about 1 MB of stack. A \`Task\` is a promise
of a result; it may run on a pool thread (\`Task.Run\`) or involve no thread at all (an I/O wait).
\`ValueTask<T>\` avoids allocating a \`Task\` when the result is usually available synchronously — a cache
hit — but must be awaited **only once** and never awaited concurrently."

**Follow-up:** "When would you use Task.Run in ASP.NET Core?" — almost never for request work: the request
is already on a pool thread, so moving it to another one adds overhead. Use it in desktop apps to keep the
UI thread free, or for genuinely CPU-bound work you want off the current thread.

## Q3. "Why can .Result or .Wait() deadlock?"

**Strong answer.** "In an environment with a single-threaded **SynchronizationContext** — WinForms, WPF,
classic ASP.NET — \`await\` resumes on that context. If the caller blocks that same thread with
\`.Result\`, the continuation can never run, and the task can never finish: deadlock. ASP.NET Core has no
SynchronizationContext, so it does not deadlock that way — but blocking still holds a pool thread, and
under load that causes **thread-pool starvation**: requests queue, latency climbs, the server looks
hung."

**Follow-up:** "What is ConfigureAwait(false)?" — "Do not resume on the captured context." Library code
uses it so it works under any host; in ASP.NET Core application code it makes no difference. The real fix
is *async all the way down*.

## Q4. "What is wrong with async void?"

**Strong answer.** "The caller cannot await it, so it cannot know when it finished, and an exception
cannot be caught by the caller — it is raised on the SynchronizationContext or the thread pool, and in
.NET Core an unhandled exception there **crashes the process**. async void is only for event handlers.
Everything else returns \`Task\`."

## Q5. "How do you run independent calls concurrently?"

**Strong answer.** "Start them all, then await them together."

    var userTask = users.GetAsync(id);           // starts
    var ordersTask = orders.ForUserAsync(id);    // starts
    await Task.WhenAll(userTask, ordersTask);    // ~max(time), not the sum

Awaiting each one immediately in sequence takes the *sum* of their times.

**Follow-up:** "What if two of them throw?" — \`await\` on \`WhenAll\` rethrows **only the first**
exception (in the order the tasks were passed); the returned task's \`.Exception.InnerExceptions\` holds
all of them.

**Trap:** running two queries concurrently on the **same EF Core DbContext** — it is not thread-safe and
throws "A second operation was started on this context". Use separate contexts (a factory) or run them
in sequence.

## Q6. "How does cancellation work?"

**Strong answer.** "Cooperatively. A \`CancellationToken\` is passed down; async APIs (\`HttpClient\`,
EF Core, \`Task.Delay\`) observe it and throw \`OperationCanceledException\`; CPU loops call
\`token.ThrowIfCancellationRequested()\`. In ASP.NET Core, an action parameter of type
\`CancellationToken\` is bound to \`HttpContext.RequestAborted\`, so a closed browser tab stops the
database query."

## Q7. "Is count++ thread-safe? How do you make shared state safe?"

**Strong answer.** "No: it is read, add, write — two threads can read the same value and lose an
increment. Options: \`Interlocked.Increment(ref count)\` for one number; \`lock\` around a small critical
section (never \`await\` inside a \`lock\` — the compiler forbids it; use \`SemaphoreSlim.WaitAsync\`);
concurrent collections like \`ConcurrentDictionary\`. Best of all: do not share mutable state —
singletons in ASP.NET Core are hit by many requests at once."

## How you are judged

Strong candidates say "await frees the thread" and name thread-pool starvation. Weak ones say "async runs
the method on another thread" or fix a deadlock by adding more \`Task.Run\`.`,
    workedExample: `**The question.** "Under load, our ASP.NET Core API stops responding for seconds at a time. CPU is
at 10%. Here is the code we suspect. What is going on?"

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var product = _catalog.GetAsync(id).Result;          // blocks
        var stock = _inventory.GetStockAsync(id).Result;     // blocks
        return Ok(new { product, stock });
    }

**Step 1 — rule out the classic deadlock.** ASP.NET Core has no SynchronizationContext, so \`.Result\`
does not deadlock the way it did in classic ASP.NET. Say so — it shows you know the difference.

**Step 2 — name the real failure: thread-pool starvation.** Each request occupies a pool thread that
sits blocked for the whole HTTP and database wait. The continuations that would complete those tasks also
need pool threads. Under load every thread is blocked, the pool adds new threads only gradually, and
requests queue. Low CPU with high latency is the signature.

**Step 3 — fix it: async all the way, and run the independent calls together.**

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var productTask = _catalog.GetAsync(id, ct);
        var stockTask = _inventory.GetStockAsync(id, ct);
        await Task.WhenAll(productTask, stockTask);
        return Ok(new { product = productTask.Result, stock = stockTask.Result });
    }

\`.Result\` after \`WhenAll\` is safe — both tasks are complete. The token cancels the work when the client
disconnects.

**Step 4 — the follow-ups.** "What if both services use the same DbContext?" — then they cannot run
concurrently; await them in sequence or use \`IDbContextFactory\`. "How would you have found it?" —
\`dotnet-counters\` showing a growing thread-pool queue length and thread count, while CPU stays low.`,
    mcqs: [
      mcq(`What does this print?

    static async Task Work() { Console.Write("A"); await Task.Delay(50); Console.Write("C"); }
    ...
    var t = Work();
    Console.Write("B");
    t.Wait();
    Console.WriteLine("D");`, [
        ['BACD', false],
        ['ABCD', true],
        ['ACBD', false],
        ['BCAD', false],
      ], 'An async method runs synchronously on the caller\'s thread until its first await of an incomplete task, so A prints first. Then it returns a Task, the caller prints B, Wait blocks until the continuation prints C, and D follows.'),
      mcq('An ASP.NET Core 8 controller calls GetAsync(id).Result instead of awaiting it. What is the realistic production symptom under load?', [
        ['An immediate deadlock on the first request, as in classic ASP.NET', false],
        ['A compile-time warning that the build server turns into an error', false],
        ['Slow, queued requests from thread-pool starvation while CPU is low', true],
        ['Nothing at all: ASP.NET Core rewrites .Result into an await', false],
      ], 'ASP.NET Core has no SynchronizationContext, so the classic deadlock does not happen, but every blocked request holds a pool thread. Under load the pool runs out, grows slowly, and requests queue with low CPU — thread-pool starvation.'),
      mcq('Why is async void acceptable for a button-click handler but wrong for a service method?', [
        ['The caller cannot await it, and its exceptions escape the caller', true],
        ['async void methods always run on a fresh dedicated thread', false],
        ['async void cannot contain await, so the method runs synchronously', false],
        ['It is slower, because void methods allocate two state machines', false],
      ], 'An async void method gives the caller no Task, so nothing can await completion or catch its exceptions; an unhandled one is raised on the context or thread pool and can crash the process. Event handlers must return void, so they are the exception.'),
    ],
    checkpoint: [
      ck('CSHARP_ASYNC', `What does this print?

    static async Task<string> Fail(string m) { await Task.Delay(10); throw new InvalidOperationException(m); }
    static async Task Run() {
        var all = Task.WhenAll(Fail("x"), Fail("y"));
        try { await all; }
        catch (InvalidOperationException e) { Console.WriteLine(e.Message + " " + all.Exception.InnerExceptions.Count); }
    }`, [
        ['x 1', false],
        ['y 2', false],
        ['One or more errors occurred. 2', false],
        ['x 2', true],
      ], 'WhenAll completes faulted with every exception collected in task order. await unwraps the AggregateException and rethrows only the first, so the catch sees "x"; the task\'s Exception still holds both inner exceptions.'),
      ck('CSHARP_ASYNC', 'An action awaits GetUserAsync() (300 ms) and then GetOrdersAsync() (400 ms); neither depends on the other and they use different services. What is the better version, and roughly how long does it take?', [
        ['Wrap each call in Task.Run and await both; about 700 ms', false],
        ['Start both tasks, then await Task.WhenAll; about 400 ms', true],
        ['Call both with .Result so they run in parallel; about 400 ms', false],
        ['Add ConfigureAwait(false) to both awaits; about 350 ms', false],
      ], 'Awaiting one after the other costs the sum. Starting both before awaiting lets the two I/O waits overlap, so the total is about the longer of them. Task.Run only adds a thread hop, .Result blocks, and ConfigureAwait does not change the timing.'),
      ck('CSHARP_ASYNC', 'A singleton service increments a private int counter with counter++ from many concurrent requests. Which change makes the count exact?', [
        ['Mark the field volatile so every thread sees the latest value', false],
        ['Make the method async so each increment is awaited in turn', false],
        ['Make the field static so all requests share one copy of it', false],
        ['Use Interlocked.Increment(ref counter) for the update', true],
      ], 'counter++ is a read, an add and a write; two threads can read the same value and one increment is lost. Interlocked.Increment does it atomically. volatile only affects visibility and ordering, not atomicity, and async or static change nothing here.'),
    ],
  },

  /* ── IV_MEMORY_EXCEPTIONS ───────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_IV_MEMORY_EXCEPTIONS',
    notes: `The memory questions check that you know what the garbage collector does *and what it does not do*
— it frees memory, it does not close connections. The exception questions check that you can keep a stack
trace intact and write handlers that do not swallow bugs.

## Q1. "How does the .NET garbage collector work?"

**Strong answer.** "It is a tracing, generational, compacting collector. From the roots — locals on
thread stacks, statics, GC handles — it marks reachable objects, frees the rest and compacts the survivors.
Most objects die young, so the heap is split into **generations 0, 1 and 2**: gen 0 is collected often
and cheaply, survivors are promoted. Objects of **85,000 bytes or more** go on the **Large Object Heap**,
which is collected with gen 2 and not compacted by default."

**Follow-up:** "Can a cycle of objects leak?" — no; tracing from roots finds that a cycle is unreachable.
.NET leaks come from *reachable* garbage: a static list that only grows, an event subscription from a
long-lived publisher, a cache with no eviction.

**Follow-up 2:** "Should you call GC.Collect()?" — almost never; it promotes live objects and costs time.

## Q2. "IDisposable vs a finaliser?"

**Strong answer.** "The GC manages memory only. File handles, sockets and database connections are
**unmanaged resources** that must be released deterministically — that is \`IDisposable.Dispose\`, called
by \`using\`. A finaliser (\`~Type()\`) is a safety net the GC runs at some unknown later time, on a
finaliser thread; objects with finalisers survive an extra collection. The full Dispose pattern calls
\`GC.SuppressFinalize(this)\` in \`Dispose\` so the finaliser is skipped once cleanup is done."

**Follow-up:** "When do you write a finaliser?" — only when you directly own an unmanaged handle, and
modern code wraps it in a \`SafeHandle\` instead. Wrapping a \`SqlConnection\` needs \`Dispose\` only.

## Q3. "What does using compile to?"

**Strong answer.** "\`try { ... } finally { if (x != null) x.Dispose(); }\`. Nested usings dispose in
**reverse** order of creation. C# 8 adds the declaration form \`using var conn = ...;\`, disposed at the
end of the enclosing scope, and \`await using\` for \`IAsyncDisposable\`."

    using (var a = new R("a")) using (var b = new R("b")) { Console.Write("work "); }
    // open a open b work close b close a

## Q4. "throw vs throw ex?"

**Strong answer.** "\`throw;\` rethrows the current exception with its original stack trace. \`throw ex;\`
throws the same object but **resets the stack trace** to this line — you lose where it really failed. To
add context, wrap it: \`throw new OrderFailedException("...", ex);\` keeps the original as
\`InnerException\`."

## Q5. "Does finally run if the try returns?"

**Strong answer.** "Yes. The return value is evaluated first and stored; \`finally\` then runs; then the
method returns the stored value. Changing the local in \`finally\` does not change what is returned, and
C# does **not** allow \`return\` inside \`finally\` (CS0157)."

    static int Get() { int x = 1; try { return x; } finally { x = 2; Console.Write("finally "); } }
    Console.WriteLine(Get());   // finally 1

**Follow-up:** "When does finally not run?" — \`Environment.FailFast\`, a killed process, a
\`StackOverflowException\` (which cannot be caught in .NET Core).

## Q6. "What are exception filters?"

**Strong answer.** "C# 6 \`catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.TooManyRequests)\`.
The filter runs **before** the stack unwinds; if it is false, the catch is skipped as if it were not there
and the exception keeps searching outward with its stack intact. They are cleaner than catch-check-rethrow,
and \`when (Log(e))\` with a method that returns false is a known trick to log without catching."

## Q7. "How should exceptions be handled in an API?"

**Strong answer.** "Catch where you can **do something** — retry, translate, add context. Do not catch
\`Exception\` and return null; let unexpected exceptions reach one global handler (ASP.NET Core
\`UseExceptionHandler\` with \`IExceptionHandler\` in .NET 8) that logs once and returns a ProblemDetails
500. Use exceptions for exceptional cases, not for validation flow — they are expensive to throw."

**Trap:** catch clauses are tried top to bottom, and a general one before a specific one is a compile
error (CS0160), not a silent bug.

## How you are judged

Strong candidates separate "memory" from "resources" and keep stack traces. Weak ones say "the GC closes
the connection eventually" or use \`throw ex\`.`,
    mcqs: [
      mcq(`What does this print?

    static int Get() {
        int x = 1;
        try { return x; }
        finally { x = 2; Console.Write("finally "); }
    }
    ...
    Console.WriteLine(Get());`, [
        ['finally 1', true],
        ['finally 2', false],
        ['1 finally', false],
        ['1, and finally is skipped by return', false],
      ], 'The return value is evaluated and saved before finally runs. finally then executes and prints, and changing the local x afterwards does not alter the saved value, so the method returns 1.'),
      mcq('A catch block logs and then writes throw ex; instead of throw;. What is lost?', [
        ['The exception message, which is cleared by the rethrow', false],
        ['Nothing, the two forms compile to the same IL instruction', false],
        ['The InnerException, which throw ex sets back to null', false],
        ['The original stack trace, which now starts at the catch', true],
      ], 'throw ex throws the same object but resets its stack trace to the current line, so you can no longer see where it really failed. A bare throw; rethrows with the trace intact. To add context, wrap it in a new exception with the original as InnerException.'),
      mcq(`What does this print?

    class R : IDisposable {
        string n;
        public R(string n) { this.n = n; Console.Write("open " + n + " "); }
        public void Dispose() { Console.Write("close " + n + " "); }
    }
    ...
    using (var a = new R("a")) using (var b = new R("b")) { Console.Write("work "); }`, [
        ['open a open b work close a close b', false],
        ['open a open b work close b close a', true],
        ['open a work close a open b close b', false],
        ['open a open b work (Dispose runs at GC)', false],
      ], 'using compiles to try/finally with Dispose in the finally, and nested usings unwind like a stack: b was created last, so it is disposed first, then a. Disposal is deterministic, not left to the garbage collector.'),
    ],
    checkpoint: [
      ck('CSHARP_EXCEPTIONS', 'What happens when a C# 6 exception filter catch (Exception e) when (IsTransient(e)) evaluates to false?', [
        ['The catch body runs anyway, as the filter is only advisory', false],
        ['The exception is swallowed and execution resumes after the try', false],
        ['The clause is skipped and the search goes on, stack not yet unwound', true],
        ['The runtime rethrows the exception with its stack trace reset', false],
      ], 'Filters run during the first pass, before any unwinding. A false filter makes the runtime treat the clause as non-matching and keep looking for a handler further out, with the original stack still intact for debuggers and dumps.'),
      ck('CSHARP_EXCEPTIONS', 'A class wraps a SqlConnection and nothing else unmanaged. What should it implement?', [
        ['IDisposable, calling the connection\'s Dispose in its own Dispose', true],
        ['A finaliser that closes the connection when the GC runs it', false],
        ['Both a finaliser and IDisposable, as every resource needs both', false],
        ['Nothing: the GC closes connections when it frees the object', false],
      ], 'The class owns a disposable, not a raw handle, so it implements IDisposable and forwards Dispose; callers use using. A finaliser is only for types that directly own an unmanaged handle, and it runs at an unpredictable time on the finaliser thread.'),
      ck('CSHARP_EXCEPTIONS', 'Which objects does the .NET GC place directly on the Large Object Heap?', [
        ['Every object that survives two gen 0 collections', false],
        ['Objects of 85,000 bytes or more, such as big arrays', true],
        ['Objects that have a finaliser declared on their type', false],
        ['Any string longer than 1,000 characters in length', false],
      ], 'Allocations of 85,000 bytes or more go to the LOH, which is collected with gen 2 and not compacted by default, so repeated large buffers fragment it; ArrayPool<T> is the usual remedy. Surviving collections promotes objects to gen 1 and gen 2, not the LOH.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_RAPID_FIRE',
    notes: `A screening call: thirty questions in about ten minutes. The interviewer wants a correct, one-line
answer, not an essay. Cover the answer, say yours out loud, then check.

## Types and values

1. **Default value of an int field? A string field?** — 0; null.
2. **\`int.MaxValue + 1\` in a variable, default (unchecked) context?** — Wraps to \`int.MinValue\`; use \`checked\` to throw \`OverflowException\`.
3. **\`0.1 + 0.2 == 0.3\` with double? With decimal?** — False; True (\`0.1m + 0.2m == 0.3m\`). Money is \`decimal\`.
4. **\`-7 / 2\` and \`-7 % 2\` in C#?** — -3 and -1; integer division truncates toward zero.
5. **What is boxing?** — Wrapping a value type in a heap object when it is treated as \`object\` or an interface.
6. **Is \`string\` a value type?** — No; an immutable reference type with value-like \`==\`.
7. **\`const\` vs \`readonly\`?** — Compile-time and copied into callers; vs assigned at runtime in the constructor.
8. **What does \`is\` return? \`as\`?** — \`bool\` (and C# 7 pattern binding); the cast or null, never an exception.
9. **What does \`??\` do? \`??=\`?** — Right side if the left is null; assigns only if null (C# 8).
10. **\`var\` — dynamic typing?** — No; the type is inferred at compile time and fixed.

## OOP

11. **Default accessibility of a class member? Of a top-level class?** — private; internal.
12. **Can a struct inherit from a class?** — No; structs can implement interfaces only.
13. **\`new\` modifier on a method?** — Hides the base member; chosen by static type.
14. **\`sealed override\`?** — Overrides and stops further overriding.
15. **Can an interface have fields?** — Not instance fields; static ones since C# 8.
16. **What does \`protected internal\` mean?** — Accessible from the same assembly **or** derived types.
17. **What does a record add?** — Value equality, \`ToString\`, \`with\` copies, deconstruction.

## Collections and LINQ

18. **Cost of \`Dictionary\` lookup?** — O(1) average.
19. **Is \`Dictionary\` enumeration order guaranteed?** — No.
20. **Initial capacity growth of \`List<T>\`?** — 4 on first add, then doubles.
21. **\`Any()\` vs \`Count() > 0\` on a query?** — \`Any\` stops at the first match; prefer it.
22. **When does a \`Where\` query run?** — When enumerated (deferred execution).
23. **\`Single\` with two matches?** — Throws \`InvalidOperationException\`.
24. **\`IQueryable\` holds what?** — An expression tree a provider translates (to SQL in EF Core).

## Async and runtime

25. **Does \`await\` start a new thread?** — No; it frees the current one until the task completes.
26. **What should an async method return instead of void?** — \`Task\` or \`Task<T>\`.
27. **Thread-safe dictionary type?** — \`ConcurrentDictionary<TKey, TValue>\`.
28. **Objects of what size go on the LOH?** — 85,000 bytes or more.
29. **\`throw;\` vs \`throw ex;\`?** — The first keeps the stack trace.
30. **What runs the \`Dispose\` in a \`using\` block?** — A compiler-generated \`finally\`.

## Scoring

25+ correct and quick: strong. 20–24: fine, revise the misses. Under 20, or any "structs live on the stack,
always" / "await runs code on a new thread" / "the GC closes connections": go back to the question sets.`,
    mcqs: [
      mcq(`Rapid fire: what does this print?

    int x = int.MaxValue;
    x++;
    Console.WriteLine(x);`, [
        ['2147483648', false],
        ['-2147483648', true],
        ['It throws OverflowException', false],
        ['2147483647', false],
      ], 'C# integer arithmetic is unchecked by default, so incrementing int.MaxValue wraps around to int.MinValue. A checked block or the CheckForOverflowUnderflow compiler option makes it throw OverflowException instead.'),
      mcq(`Rapid fire: what does this print?

    Console.WriteLine((0.1 + 0.2 == 0.3) + " " + (0.1m + 0.2m == 0.3m));`, [
        ['True True', false],
        ['False False', false],
        ['False True', true],
        ['True False', false],
      ], 'double is binary floating point, and 0.1 and 0.2 cannot be represented exactly, so their sum differs from 0.3 in the last bits. decimal stores base-10 digits, so 0.1m + 0.2m is exactly 0.3m — the reason money is decimal.'),
      mcq(`Rapid fire: what does this print?

    Console.WriteLine(-7 / 2 + " " + -7 % 2);`, [
        ['-4 1', false],
        ['-3.5 -1', false],
        ['-4 -1', false],
        ['-3 -1', true],
      ], 'Integer division in C# truncates toward zero, so -7 / 2 is -3, and the remainder takes the sign of the dividend, so -7 % 2 is -1. Python floors instead and would give -4 and 1.'),
      mcq('Rapid fire: "What does the as operator do when the cast is not possible?"', [
        ['It throws an InvalidCastException at runtime', false],
        ['It returns null instead of throwing an exception', true],
        ['It returns the default value of the target type', false],
        ['It fails to compile for any type that may not match', false],
      ], 'as performs a reference or nullable conversion and yields null on failure, so it works only for reference types and nullable value types. A cast expression throws InvalidCastException; is tests without converting.'),
      mcq('Rapid fire: "Is var dynamic typing?"', [
        ['Yes; the type is decided each time the value changes', false],
        ['Yes; var is an alias for the dynamic keyword', false],
        ['No; the compiler infers one fixed static type', true],
        ['No; var always means the variable is an object', false],
      ], 'var asks the compiler to infer the static type from the initialiser, and that type is fixed: assigning a value of another type is a compile error. dynamic is the keyword that defers binding to runtime.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_MOCK',
    notes: `This is the interviewer's script for a 35-minute C# round — the first technical round at a product
company, or the technical round of a service company's premium .NET hiring. Do it with a friend reading the
interviewer's lines, or record yourself. The scoring notes are what a real panel writes down.

## Opening (2 min)

"Which .NET and C# version did your capstone use, and name one feature newer than C# 8 you actually used."

- **Strong:** ".NET 8, C# 12. I used records for the DTOs, a primary constructor on a service, and
  nullable reference types turned on — they caught two null bugs before review."
- **OK:** names the version, vague on features.
- **Weak:** cannot name the version, or names "LINQ" as a new feature.

## Q1. The type system (4 min)

"\`object a = 5; object b = 5;\` — is \`a == b\` true? Why?" **Follow-up:** "Then why is
\`"x" == "x"\` true for strings?"

- **Strong:** two boxes, \`==\` on \`object\` is reference equality — false; \`Equals\` is true; string
  overloads \`==\`, chosen by static type, and cast to object it compares references.
- **OK:** right answer, no mention of static type.
- **Weak:** "true, both are 5".

## Q2. override vs new (4 min)

"Here is a \`Base\` with a virtual \`Fee()\` and a \`Card\` that declares \`new decimal Fee()\`. What does
\`PaymentMethod pm = new Card(); pm.Fee(1000)\` call?"

- **Strong:** the base method — \`new\` hides and the static type decides; fix with \`override\`; mentions
  warning CS0108.
- **Weak:** "Card's Fee, because the object is a Card".

## Q3. Collections (5 min)

"How does \`Dictionary\` find a key? What happens if I mutate a key after adding it?"

- **Strong:** hash → bucket → compare stored hash → \`Equals\`; O(1) average; equal objects must have equal
  hashes; a mutated key becomes unreachable but still counted; keys should be immutable.
- **OK:** "it's a hash table", no hash/equals contract.

## Q4. LINQ and closures (5 min)

"What does a \`for\` loop that adds \`() => Console.Write(i)\` three times print when the actions run? And
why is calling \`Sum()\` then \`Max()\` on the same query flagged in review?"

- **Strong:** \`333\` — one \`i\` captured; \`foreach\` is fresh per iteration since C# 5; deferred
  execution runs the query twice — with EF Core, two round-trips.
- **Weak:** "012" and no idea what deferred execution means.

## Q5. async (6 min)

"An endpoint calls two services with \`.Result\`. It is slow under load and CPU is low. Explain, then
rewrite it." **Follow-up:** "Why doesn't it deadlock like it did in classic ASP.NET?"

- **Strong:** thread-pool starvation; async all the way, start both then \`Task.WhenAll\`, pass a
  \`CancellationToken\`; no SynchronizationContext in ASP.NET Core; warns about one DbContext used
  concurrently.
- **OK:** "use await", cannot explain starvation.
- **Weak:** "wrap it in Task.Run".

## Q6. Resources and exceptions (4 min)

"When does a \`SqlConnection\` get closed if you forget \`using\`? And what is wrong with \`throw ex;\`?"

- **Strong:** not deterministically — maybe never before the pool runs out ("Timeout expired... max pool
  size was reached"); \`using\` is \`try/finally\`; \`throw ex\` resets the stack trace.
- **Weak:** "the garbage collector closes it".

## Whiteboard task (5 min)

"Write a thread-safe in-memory cache: \`GetOrAdd(key, factory)\` that calls the factory **at most once** per
key, even under concurrent requests."

    public class OnceCache<TKey, TValue>
    {
        private readonly ConcurrentDictionary<TKey, Lazy<TValue>> _map =
            new ConcurrentDictionary<TKey, Lazy<TValue>>();

        public TValue GetOrAdd(TKey key, Func<TKey, TValue> factory)
        {
            return _map.GetOrAdd(key, k => new Lazy<TValue>(() => factory(k))).Value;
        }
    }

- **Strong:** the above, and explains *why* \`Lazy\`: \`ConcurrentDictionary.GetOrAdd\` can call its value
  factory more than once under a race (only one result is stored); wrapping in \`Lazy<T>\` (thread-safe by
  default) makes the expensive factory run once. Mentions eviction as the next problem.
- **OK:** plain \`ConcurrentDictionary.GetOrAdd(key, factory)\` — thread-safe, but the factory may run twice.
- **Weak:** a \`Dictionary\` with no locking, or a \`lock\` around an \`await\` (does not compile).

## Scoring

Hire bar: strong on Q2, Q4 and Q5, at least OK everywhere else, and the whiteboard task thread-safe. One
confident wrong fact ("await creates a thread", "the GC closes connections") outweighs two OK answers.`,
    mcqs: [
      mcq('In the whiteboard task a candidate writes _map.GetOrAdd(key, factory) on a ConcurrentDictionary with no Lazy. What does the panel note?', [
        ['Not thread-safe: the dictionary can be corrupted by the race', false],
        ['Thread-safe, but the factory can run twice for one key', true],
        ['Correct and optimal; Lazy would only add an allocation', false],
        ['Deadlock risk, as GetOrAdd holds a lock while calling factory', false],
      ], 'ConcurrentDictionary stays consistent, but GetOrAdd runs the value factory outside its locks, so two racing threads can both run it and only one result is stored. Storing Lazy<TValue> makes the expensive work happen once.'),
      mcq('For Q5, which answer earns "strong" on the slow endpoint that uses .Result twice?', [
        ['Wrap each call in Task.Run so the blocking happens elsewhere', false],
        ['Add ConfigureAwait(false) after each .Result call to unblock it', false],
        ['Make it async, start both calls, then await Task.WhenAll', true],
        ['Raise the minimum thread-pool size so blocking stops mattering', false],
      ], 'The cause is blocked pool threads, so the fix is not to block: async all the way, with the two independent calls started together and awaited with WhenAll. Task.Run still blocks a thread, and raising pool limits only delays the starvation.'),
      mcq('For Q1, a candidate says "a == b is true because both are 5". What is the gap?', [
        ['None; boxed integers with the same value are interned', false],
        ['It is true only in Release builds, which reuse boxes', false],
        ['== on object is reference equality, and each box is new', true],
        ['It depends on whether 5 is inside the small-int cache', false],
      ], 'Each assignment to object allocates a separate box, and the == chosen for two object operands compares references, so it is false. .NET has no small-integer box cache; that is a Java Integer and CPython idea.'),
      mcq('For Q6, which answer about a SqlConnection opened without using is strong?', [
        ['It stays checked out until finalised, so the pool can run dry', true],
        ['The GC closes it at the end of the method, so it is harmless', false],
        ['It closes itself after the command finishes executing', false],
        ['ADO.NET reclaims it after 30 seconds of idle time', false],
      ], 'An undisposed connection is not returned to the pool until something closes it; nothing does that deterministically, so under load the pool reaches Max Pool Size and new opens time out. using guarantees Dispose, which returns it to the pool.'),
      mcq('For Q4, a candidate predicts 012 for the three for-loop lambdas. Which correction shows the candidate understands why?', [
        ['The lambdas run after the loop, and each copies i when it runs', false],
        ['The compiler optimises the loop and reuses the last delegate', false],
        ['for loops evaluate the condition last, so i is always 3', false],
        ['All three lambdas capture the one variable i, which ends at 3', true],
      ], 'A closure captures the variable, not its value, and a for loop declares i once for all iterations. When the lambdas finally run, i has reached 3, so each prints 3. Copying i into a local inside the body gives each lambda its own variable.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CSHARP_CHECKPOINT',
    notes: `Ten questions across the whole topic — value semantics and string equality, overriding and
construction order, collections, LINQ, async and exceptions. Each is the kind of code an interviewer slides
across the table. Read the code fully before you answer: the traps are in the static types, in what a
lambda captured, and in when a task finishes.`,
    checkpoint: [
      ck('CSHARP_BASICS', `What does this print?

    struct Wallet { public int Balance; }
    static void Add(Wallet w) { w.Balance += 50; }
    static void AddRef(ref Wallet w) { w.Balance += 50; }
    ...
    Wallet w = new Wallet(); w.Balance = 100;
    Add(w); AddRef(ref w);
    Console.WriteLine(w.Balance);`, [
        ['200', false],
        ['100', false],
        ['150', true],
        ['50', false],
      ], 'A struct is copied when passed by value, so Add changes its own copy and the caller\'s Wallet keeps 100. With ref the method works on the caller\'s variable, so AddRef raises it to 150.'),
      ck('CSHARP_BASICS', `What does this print?

    object o1 = "ab";
    string t = "a";
    object o2 = t + "b";
    Console.WriteLine((o1 == o2) + " " + o1.Equals(o2));`, [
        ['False True', true],
        ['True True', false],
        ['False False', false],
        ['True False', false],
      ], 't + "b" is computed at runtime and makes a new string, while o1 is the interned literal. Both variables are typed object, so == compares references and is False. Equals is virtual and string.Equals compares characters.'),
      ck('CSHARP_OOP', `What does this print?

    interface IPrinter { string Print(); }
    class Doc : IPrinter {
        public string Print() { return "public"; }
        string IPrinter.Print() { return "explicit"; }
    }
    ...
    Doc d = new Doc(); IPrinter p = d;
    Console.WriteLine(d.Print() + " " + p.Print());`, [
        ['public public', false],
        ['explicit explicit', false],
        ['public explicit', true],
        ['Compile error: Print is defined twice', false],
      ], 'An explicit implementation is reachable only through the interface type, so p.Print() maps to IPrinter.Print. Through the class type the public method is the only Print visible. Both may coexist because the explicit one is not a class member by name.'),
      ck('CSHARP_OOP', `What does this print?

    class A { public A() { Console.Write("A "); } static A() { Console.Write("sA "); } }
    class B : A { public B() { Console.Write("B "); } static B() { Console.Write("sB "); } }
    ...
    new B(); new B();`, [
        ['sA sB A B A B', false],
        ['sB sA A B A B', true],
        ['sA A sB B A B', false],
        ['sB sA A B sB sA A B', false],
      ], 'Creating B first triggers B\'s static constructor; B\'s instance constructor then calls A\'s, which first triggers A\'s static constructor. Static constructors run once per type, so the second new B() prints only A B.'),
      ck('CSHARP_COLLECTIONS', `What does this print?

    var st = new Stack<int>(new[] { 1, 2, 3 });
    var qu = new Queue<int>(new[] { 1, 2, 3 });
    Console.WriteLine(st.Peek() + " " + qu.Peek() + " " + string.Join(",", st));`, [
        ['1 1 1,2,3', false],
        ['3 3 3,2,1', false],
        ['3 1 1,2,3', false],
        ['3 1 3,2,1', true],
      ], 'Building a Stack from a sequence pushes the items in order, so 3 is on top, and enumerating a stack goes from top to bottom. A Queue keeps the order given, so its front is 1.'),
      ck('CSHARP_COLLECTIONS', 'A public method returns List<Order> today. Callers only read the result and need its count and index access. Which return type is the better contract?', [
        ['IEnumerable<Order>, the most general interface available', false],
        ['IReadOnlyList<Order>, giving count and indexing without Add', true],
        ['Order[], so callers cannot change the element count', false],
        ['ICollection<Order>, since it already includes Count', false],
      ], 'IReadOnlyList states exactly what callers may do: count, index and enumerate, no mutation. IEnumerable hides the count and invites repeated lazy enumeration, ICollection exposes Add and Remove, and an array still lets callers overwrite elements.'),
      ck('CSHARP_LINQ', `What does this print?

    var words = new[] { "kiwi", "fig", "apple", "plum", "pear" };
    var g = words.GroupBy(w => w.Length).OrderByDescending(x => x.Count()).First();
    Console.WriteLine(g.Key + " " + string.Join(",", g));`, [
        ['4 kiwi,plum,pear', true],
        ['5 apple', false],
        ['4 pear,plum,kiwi', false],
        ['3 kiwi,plum,pear', false],
      ], 'Grouping by length gives 4 → kiwi, plum, pear; 3 → fig; 5 → apple. The group of 4 has the most members. GroupBy keeps elements in their original order within a group, and the key is the length, 4.'),
      ck('CSHARP_LINQ', `What does this print?

    var nums = new[] { 3, 5, 5 };
    Console.Write(nums.FirstOrDefault(x => x > 9) + " ");
    try { Console.WriteLine(nums.Single(x => x == 5)); }
    catch (InvalidOperationException) { Console.WriteLine("IOE"); }`, [
        ['0 5', false],
        ['null IOE', false],
        ['IOE', false],
        ['0 IOE', true],
      ], 'FirstOrDefault with no match returns default(int), which is 0. Single requires exactly one match and two elements equal 5, so it throws InvalidOperationException. First would have returned 5.'),
      ck('CSHARP_ASYNC', `What does this print?

    static async Task<int> Slow(int v) { await Task.Delay(100 * v); Console.Write(v + " "); return v; }
    ...
    var t1 = Slow(3); var t2 = Slow(1);
    var r = Task.WhenAll(t1, t2).Result;
    Console.WriteLine(r[0] + r[1] * 10);`, [
        ['3 1 13', false],
        ['1 3 31', false],
        ['1 3 13', true],
        ['3 1 31', false],
      ], 'Both tasks start immediately and wait concurrently, so the 100 ms one prints 1 before the 300 ms one prints 3. WhenAll returns results in the order the tasks were passed, not the order they finished: r is { 3, 1 }, giving 3 + 10.'),
      ck('CSHARP_EXCEPTIONS', `What does this print?

    try {
        try { int.Parse("x"); }
        catch (FormatException e) { throw new InvalidOperationException("bad input", e); }
    }
    catch (Exception e) {
        Console.WriteLine(e.GetType().Name + " " + e.InnerException.GetType().Name);
    }`, [
        ['FormatException InvalidOperationException', false],
        ['InvalidOperationException FormatException', true],
        ['FormatException, then a NullReferenceException', false],
        ['InvalidOperationException Exception', false],
      ], 'int.Parse("x") throws FormatException; the inner catch wraps it in a new InvalidOperationException with the original passed as InnerException. The outer handler sees the wrapper, and the original stays available with its own stack trace.'),
    ],
  },

  /* ══ JT_IV_ASPNET ═══════════════════════════════════════════════════════════════════════ */

  /* ── IV_PIPELINE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_IV_PIPELINE',
    notes: `ASP.NET Core rounds start with "walk me through what happens to a request", because the answer shows
whether you have seen beyond controllers. Then come DI lifetimes — the single most-asked .NET backend
question — and configuration. All of this is .NET 8 with the \`WebApplication\` minimal hosting model.

## Q1. "What happens between Kestrel receiving a request and your action running?"

**Strong answer.** "Kestrel parses the HTTP request into an \`HttpContext\` and hands it to the
**middleware pipeline** — a chain of delegates built once at startup in the order of the \`app.Use...\`
calls. Each middleware can act on the request, call \`next\` to pass it on, and act on the response on the
way back. Routing matches an endpoint; authentication sets \`HttpContext.User\`; authorization checks the
endpoint's policy; the endpoint middleware runs the controller action or minimal-API handler; the
response travels back out through the same middleware in reverse."

    app.Use(async (ctx, next) => { Console.Write("1 "); await next(); Console.Write("4 "); });
    app.Use(async (ctx, next) => { Console.Write("2 "); await next(); Console.Write("3 "); });
    app.Run(async ctx => { Console.Write("H "); await ctx.Response.WriteAsync("ok"); });
    // one request prints: 1 2 H 3 4

**Follow-up:** "What does app.Run do differently?" — it is **terminal**: it never calls a next
delegate, so anything registered after it never runs. A middleware that writes a response and does not
call \`next\` *short-circuits* the same way — that is how static files and CORS preflight answers work.

## Q2. "Does middleware order matter? Give an order."

**Strong answer.** "Completely — it is the order of execution. The documented order:
\`UseExceptionHandler\` first (so it wraps everything), \`UseHsts\` / \`UseHttpsRedirection\`,
\`UseStaticFiles\`, \`UseRouting\`, \`UseCors\`, \`UseAuthentication\`, \`UseAuthorization\`, then the
endpoints. Authentication must come before authorization — authorization reads the user that
authentication set."

**Trap:** putting \`UseCors\` after authorization. A request with an expired token is answered with 401
before the CORS middleware can add \`Access-Control-Allow-Origin\`, so the browser hides the response and
reports a CORS error that is really an auth problem. The documentation puts \`UseCors\` before
\`UseAuthorization\` precisely so CORS headers appear on unauthorised responses too.

## Q3. "What are the three service lifetimes?"

**Strong answer.**
- **Transient** — a new instance every time it is resolved. Light, stateless services.
- **Scoped** — one instance per **request** (per DI scope). \`DbContext\` is scoped by default with
  \`AddDbContext\`, so everything in one request shares one unit of work.
- **Singleton** — one instance for the application's lifetime. Must be thread-safe: every request hits it
  concurrently.

**Follow-up:** "A scoped service is injected into a controller and into a repository the controller
uses. How many instances in one request?" — one. In two requests — two.

## Q4. "What is a captive dependency?"

**Strong answer.** "A longer-lived service holding a shorter-lived one — a singleton that takes a scoped
\`DbContext\` in its constructor. The singleton keeps the first request's \`DbContext\` forever: stale
tracked entities, and concurrent requests using one non-thread-safe context. In Development,
\`WebApplicationBuilder\` turns on **scope validation** (\`ValidateScopes\` and \`ValidateOnBuild\`), so it
fails at startup with 'Cannot consume scoped service ... from singleton'. In Production that check is off
and the bug ships."

**Fix:** make the consumer scoped too, or inject \`IServiceScopeFactory\` and create a scope per unit of
work (the pattern for background services), or use \`IDbContextFactory<T>\`.

## Q5. "How does configuration work, and what overrides what?"

**Strong answer.** "\`WebApplication.CreateBuilder\` layers providers; a later one overrides an earlier one
for the same key: \`appsettings.json\` → \`appsettings.{Environment}.json\` → user secrets (Development
only) → environment variables → command-line arguments. Hierarchical keys use \`:\`; in environment
variables use a double underscore: \`ConnectionStrings__Default\`."

**Follow-up:** "How do you read typed settings?" — the **options pattern**: bind a section to a class with
\`builder.Services.Configure<SmtpOptions>(builder.Configuration.GetSection("Smtp"))\`, add
\`.ValidateDataAnnotations().ValidateOnStart()\` (via \`AddOptions<T>().Bind(...)\`) so a missing value
fails at startup, not at the first email.

## Q6. "IOptions, IOptionsSnapshot, IOptionsMonitor?"

**Strong answer.**
- \`IOptions<T>\` — singleton, read once; changes to the file are never seen.
- \`IOptionsSnapshot<T>\` — scoped; recomputed per request, so a request sees a consistent value and the
  next one sees the change. Cannot be injected into a singleton.
- \`IOptionsMonitor<T>\` — singleton; \`CurrentValue\` reflects reloads, and \`OnChange\` notifies you. The
  one to use in a singleton that must follow configuration changes.

## Q7. "Why does ASP.NET Core use constructor injection, and when is it a smell?"

**Strong answer.** "Dependencies are explicit, testable with fakes, and the container builds the object
graph. A constructor with eight dependencies is the smell — the class does too much; split it. Resolving
services by hand with \`IServiceProvider.GetService\` inside business code is the *service locator*
anti-pattern."

## How you are judged

Strong candidates draw the pipeline as nested calls and explain the captive dependency without being led.
Weak ones say "middleware runs in any order" or "scoped means one per user session".`,
    workedExample: `**The question.** "Our product API sometimes returns another request's half-saved data, and under load
we see 'A second operation was started on this context instance'. Here is the cache. What is wrong?"

    builder.Services.AddDbContext<ShopDb>(o => o.UseSqlServer(conn));   // scoped
    builder.Services.AddSingleton<ProductCache>();

    public class ProductCache {
        private readonly ShopDb _db;
        public ProductCache(ShopDb db) { _db = db; }
        public Task<Product?> GetAsync(int id) => _db.Products.FindAsync(id).AsTask();
    }

**Step 1 — name the bug: a captive dependency.** \`ProductCache\` is a singleton; the container creates
it once, during the first request that needs it, and gives it *that request's* \`ShopDb\`. The scoped
context is now captured for the life of the process.

**Step 2 — explain both symptoms.** The captured context keeps **tracking** every entity it loaded and
anything another code path attached to it, so reads return stale or half-modified objects. And
\`DbContext\` is not thread-safe: two concurrent requests calling \`GetAsync\` run two operations on one
context — the "second operation" exception.

**Step 3 — say why tests did not catch it.** In Development, scope validation would have thrown at
startup. Their integration tests ran with \`ASPNETCORE_ENVIRONMENT=Production\` settings, and so does
production, where validation is off.

**Step 4 — fix it.** If the cache must be a singleton, give it a factory and a short-lived context per
call, and cache real data — not a context:

    builder.Services.AddDbContextFactory<ShopDb>(o => o.UseSqlServer(conn));

    public class ProductCache {
        private readonly IDbContextFactory<ShopDb> _factory;
        private readonly IMemoryCache _cache;
        public ProductCache(IDbContextFactory<ShopDb> factory, IMemoryCache cache) { _factory = factory; _cache = cache; }

        public async Task<Product?> GetAsync(int id) {
            return await _cache.GetOrCreateAsync(id, async entry => {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
                await using var db = await _factory.CreateDbContextAsync();
                return await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            });
        }
    }

**Step 5 — prevent it.** Turn on \`ValidateScopes\` and \`ValidateOnBuild\` in every environment's test run
(\`builder.Host.UseDefaultServiceProvider(o => { o.ValidateScopes = true; o.ValidateOnBuild = true; })\`).`,
    mcqs: [
      mcq(`One request reaches this pipeline. What is written to the console?

    app.Use(async (ctx, next) => { Console.Write("1 "); await next(); Console.Write("4 "); });
    app.Use(async (ctx, next) => { Console.Write("2 "); await next(); Console.Write("3 "); });
    app.Run(async ctx => { Console.Write("H "); await ctx.Response.WriteAsync("ok"); });`, [
        ['1 2 H 4 3', false],
        ['1 4 2 3 H', false],
        ['1 2 H 3 4', true],
        ['H 1 2 3 4', false],
      ], 'Middleware nests: each one runs its code before next() on the way in and the code after next() on the way out. The terminal Run handler is innermost, so the outbound halves run in reverse order of registration: 3 before 4.'),
      mcq('A singleton service takes a scoped DbContext in its constructor. What happens when the app runs in the Development environment on .NET 8?', [
        ['Startup fails, as scope validation rejects scoped-in-singleton', true],
        ['It runs fine; the singleton gets a new DbContext per request', false],
        ['The container silently promotes the DbContext to a singleton', false],
        ['It compiles with a warning and works until two users log in', false],
      ], 'In Development, WebApplicationBuilder enables ValidateScopes and ValidateOnBuild, so building the provider throws "Cannot consume scoped service ... from singleton". In Production the check is off and the singleton captures one DbContext for good.'),
      mcq('A singleton email service must pick up a changed SMTP host in appsettings.json without a restart. Which options interface should it inject?', [
        ['IOptions<SmtpOptions>, which re-reads the file on each access', false],
        ['IOptionsSnapshot<SmtpOptions>, which is refreshed per request', false],
        ['IConfiguration directly, as options are fixed at startup', false],
        ['IOptionsMonitor<SmtpOptions>, using CurrentValue each time', true],
      ], 'IOptions is computed once. IOptionsSnapshot is scoped and cannot be injected into a singleton. IOptionsMonitor is a singleton whose CurrentValue follows configuration reloads, with OnChange for notifications.'),
    ],
    checkpoint: [
      ck('ASPNET_CORE', 'A service registered with AddScoped is injected into a controller and into the repository that controller uses. How many instances does a single request get?', [
        ['Two, one for each of the classes that asks for it', false],
        ['One, shared by both for the whole request', true],
        ['One for the whole app until it restarts', false],
        ['A new one each time a method is called', false],
      ], 'Scoped means one instance per DI scope, and ASP.NET Core creates one scope per request. Everything resolved in that request shares it; the next request gets a new one. Transient would give two.'),
      ck('ASPNET_CORE', 'ConnectionStrings:Default is set in appsettings.json, in appsettings.Production.json and in an environment variable ConnectionStrings__Default. In Production, which value does the app use?', [
        ['The appsettings.Production.json one, as it is environment-specific', false],
        ['The appsettings.json one, as the base file is read last', false],
        ['The environment variable, which is added after both JSON files', true],
        ['None: duplicate keys make the configuration builder throw', false],
      ], 'CreateBuilder adds appsettings.json, then appsettings.{Environment}.json, then user secrets in Development, then environment variables, then command-line arguments. A later provider wins for the same key, and __ maps to the : separator.'),
      ck('ASPNET_CORE', 'A developer registers a logging middleware with app.Use after the line app.Run(handler). What happens to it?', [
        ['It runs after the handler, as the last step of the pipeline', false],
        ['It never runs, because app.Run is terminal and never calls next', true],
        ['It runs first, because Use always outranks Run in the request pipeline', false],
        ['Startup throws, because nothing may be added after app.Run', false],
      ], 'The pipeline is built in registration order, and the delegate from app.Run ends the chain without a next to call. Middleware added after it is attached to nothing reachable, so it is silently never executed.'),
    ],
  },

  /* ── IV_WEBAPI ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_IV_WEBAPI',
    notes: `Web API questions check that you design endpoints a front end and other teams can rely on: correct
binding and validation, the right status codes, consistent errors, and a plan for change. HTTP semantics
themselves are in the shared web interview pack; this is what ASP.NET Core does with them.

## Q1. "Controllers or minimal APIs?"

**Strong answer.** "Both run on the same routing and endpoint system. Controllers give conventions,
filters, \`[ApiController]\` behaviours and automatic model validation — good for a large API with many
endpoints and a team. Minimal APIs are less ceremony and slightly faster — good for small services and
focused endpoints; route groups (\`MapGroup\`) and endpoint filters cover a lot of what controllers do.
In .NET 8, minimal APIs do **not** validate DataAnnotations automatically; you add a filter or a library
such as FluentValidation."

## Q2. "What does [ApiController] do?"

**Strong answer.**
- **Automatic 400**: if model state is invalid, the action never runs; the client gets a
  \`ValidationProblemDetails\` body listing the errors per field.
- **Binding source inference**: complex types from the body, \`IFormFile\` from the form, route values
  from the route, simple types from the query string, registered services from DI.
- Attribute routing is required, and error status codes get a ProblemDetails body.

**Follow-up:** "Then why do I still see \`if (!ModelState.IsValid)\` in code?" — it is dead code under
\`[ApiController]\`, or the team suppressed the automatic filter
(\`SuppressModelStateInvalidFilter\`) to shape the response themselves.

## Q3. "Which status codes do you return?"

| Situation | Code | ASP.NET Core |
|---|---|---|
| Read | 200 | \`Ok(dto)\` |
| Created | 201 + \`Location\` | \`CreatedAtAction(nameof(Get), new { id }, dto)\` |
| Update or delete, nothing to return | 204 | \`NoContent()\` |
| Validation failed | 400 | automatic with \`[ApiController]\` |
| Not logged in / bad token | 401 | the JWT handler |
| Logged in, not allowed | 403 | \`Forbid()\` / a failed policy |
| Not found | 404 | \`NotFound()\` |
| Version conflict | 409 or 412 | concurrency exception |
| Business rule violated | 422 | \`UnprocessableEntity()\` |

**Trap:** returning 200 with \`{ "success": false }\` — the client, the logs and the monitoring all think
it worked.

## Q4. "How do you return errors consistently?"

**Strong answer.** "RFC 9457 **ProblemDetails** — \`type\`, \`title\`, \`status\`, \`detail\`,
\`instance\`, plus extensions such as a trace id. In .NET 8: \`builder.Services.AddProblemDetails()\` and
\`app.UseExceptionHandler()\` turn unhandled exceptions into a 500 ProblemDetails without leaking the
stack trace; an \`IExceptionHandler\` maps domain exceptions (\`NotFoundException\` → 404) in one place.
\`UseDeveloperExceptionPage\` only in Development."

## Q5. "Filters or middleware?"

**Strong answer.** "Middleware sees **every** request, including static files and 404s, and knows nothing
about MVC. Filters run **inside** MVC around a specific action and can see the action, its arguments and
model state. Order: authorization filters → resource filters → model binding → action filters → the
action → result filters, with exception filters wrapping the action and results. Cross-cutting HTTP
concerns (correlation ids, request logging) are middleware; action-aware concerns (auditing arguments,
an idempotency key on certain POSTs) are filters."

## Q6. "How do you version an API?"

**Strong answer.** "URL segment (\`/api/v2/orders\`), query string or a header — URL is the most visible
and cache-friendly. In .NET the \`Asp.Versioning.Mvc\` package handles it, reports supported versions in a
header and marks deprecated ones. Additive changes (a new optional field) do not need a version; removing
or renaming a field, or changing its meaning, does."

## Q7. "How do you return a large list?"

**Strong answer.** "Never unbounded. Paging with a capped \`pageSize\` and a stable \`ORDER BY\`
(\`Skip\`/\`Take\`), or **keyset** paging (\`WHERE Id > @lastId\`) for deep pages because \`OFFSET\`
still reads the skipped rows. Return DTOs, not entities — entities leak columns and can serialise whole
object graphs (and loop on cycles)."

## How you are judged

Strong candidates name the \`[ApiController]\` behaviours and pick status codes without hesitating. Weak
ones return entities straight from EF Core and 200 for everything.`,
    mcqs: [
      mcq('A POST action on an [ApiController] controller receives a body that fails a [Required] check. What does the client get?', [
        ['A 200 with ModelState.IsValid false passed into the action', false],
        ['A 500, because the null value reaches the database insert', false],
        ['A 400 with ValidationProblemDetails; the action never runs', true],
        ['A 422 with an empty body, as validation is a business rule', false],
      ], '[ApiController] adds a filter that checks model state before the action runs and returns 400 with a ValidationProblemDetails body listing the errors by field. The action is not invoked at all unless that filter is suppressed.'),
      mcq('You need to record the arguments of every action in OrdersController for an audit log. Where does this belong?', [
        ['In an action filter, which sees the action and its bound arguments', true],
        ['In middleware, which already sees the parsed arguments of every action', false],
        ['In Program.cs, inside a route constraint for each route', false],
        ['In a result filter, which runs before model binding', false],
      ], 'Action filters run inside MVC around the action, after model binding, so ActionArguments holds the bound values. Middleware sees only the raw HTTP request. Result filters run after the action, and model binding precedes all action filters.'),
      mcq('What does return CreatedAtAction(nameof(GetById), new { id = order.Id }, dto) send besides the body?', [
        ['Status 200 and an ETag header for the new resource', false],
        ['Status 202 and a Retry-After header for the client', false],
        ['Status 204 with no headers, since it already has a body', false],
        ['Status 201 and a Location header that points to GetById', true],
      ], 'CreatedAtAction produces 201 Created and uses the named action plus route values to generate the URL of the new resource for the Location header, so the client knows where to GET it.'),
    ],
    checkpoint: [
      ck('ASPNET_CORE', 'On an [ApiController] controller, a POST action has one parameter of a complex type CreateOrderRequest with no binding attribute. Where is it bound from?', [
        ['The query string, the default for every parameter type', false],
        ['The form fields, because it is a POST request', false],
        ['The request body, inferred as [FromBody] for complex types', true],
        ['The route values, then the query string if none match', false],
      ], '[ApiController] infers binding sources: complex types come from the body, IFormFile from the form, names in the route template from the route, and other simple types from the query string.'),
      ck('ASPNET_CORE', 'A .NET 8 app calls builder.Services.AddProblemDetails() and app.UseExceptionHandler(). An action throws an unexpected NullReferenceException in Production. What does the client receive?', [
        ['A 500 with an application/problem+json body and no stack trace', true],
        ['A 500 HTML page showing the exception message and its full stack trace', false],
        ['A 400 ValidationProblemDetails naming the null property', false],
        ['A dropped connection, as nothing handled the exception', false],
      ], 'UseExceptionHandler catches the exception, and with the ProblemDetails service registered it writes a standard 500 problem+json response. The developer exception page with the stack trace is only for Development.'),
      ck('ASPNET_CORE', 'A team moves an endpoint from a controller to a .NET 8 minimal API. Its request DTO uses [Required] and [Range]. What changes?', [
        ['Nothing: minimal APIs validate DataAnnotations the same way', false],
        ['The attributes stop compiling, as they need a controller', false],
        ['Invalid requests now get 422 instead of 400 automatically', false],
        ['Validation no longer runs unless they add a filter or library', true],
      ], 'In .NET 8, automatic DataAnnotations validation is part of the MVC [ApiController] pipeline. Minimal APIs bind the DTO but do not validate it, so an endpoint filter or a library such as FluentValidation has to do it.'),
    ],
  },

  /* ── IV_EFCORE ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_IV_EFCORE',
    notes: `EF Core questions are where backend rounds separate people who used an ORM from people who know what
SQL it sends. Have one answer ready for each: what tracking costs, how N+1 happens, how migrations work in
a team, how to run raw SQL safely, and how two users editing the same row are handled. EF Core 8.

## Q1. "What is change tracking, and when do you turn it off?"

**Strong answer.** "Entities returned by a query are **tracked** by the \`DbContext\`: it keeps a
snapshot, and \`SaveChanges\` compares each tracked entity with its snapshot to generate \`INSERT\`,
\`UPDATE\` and \`DELETE\`. Tracking costs memory and CPU. For read-only queries — almost every GET — use
\`AsNoTracking()\` (or set \`QueryTrackingBehavior.NoTracking\` on the context)."

**Follow-up:** "I load with AsNoTracking, change a property and call SaveChanges. What happens?" —
nothing: the context does not know the entity, so no \`UPDATE\` is sent and \`SaveChanges\` returns 0. Use
\`db.Update(entity)\` (marks *every* column modified) or load it tracked.

**Follow-up 2:** "Bulk update without loading?" — EF Core 7+ \`ExecuteUpdateAsync\` /
\`ExecuteDeleteAsync\` send one statement and bypass the change tracker.

## Q2. "What is the N+1 problem and how do you fix it?"

**Strong answer.** "One query for the list, then one query per row for a related entity — usually lazy
loading, or a loop that queries. 50 orders become 51 round-trips. Fixes: \`Include\` for eager loading,
or better, a **projection** with \`Select\` into a DTO, which fetches only the columns you return in one
query with a join."

    var rows = await db.Orders
        .Where(o => o.Status == OrderStatus.Open)
        .Select(o => new OrderRow(o.Id, o.Total, o.Customer.Name))
        .ToListAsync();                         // one query, three columns plus a join

**Follow-up:** "Include two collections in one query?" — a **cartesian explosion**: the joined result
has orders × lines × payments rows. \`AsSplitQuery()\` sends one query per collection instead; EF Core logs
a warning when you load several collections in one query without choosing.

## Q3. "How do migrations work in a team?"

**Strong answer.** "\`dotnet ef migrations add\` compares the model with the **model snapshot** file and
generates a migration. Two branches that both add migrations conflict in the snapshot; resolve by removing
your migration, merging, and adding it again — never by hand-editing the snapshot. Review the generated
code: a column rename can come out as drop-and-add, which loses data."

**Follow-up:** "How do you apply them to production?" — not \`Database.Migrate()\` at startup when several
instances start together. Generate an **idempotent SQL script**
(\`dotnet ef migrations script --idempotent\`) or a **migration bundle** and run it once in the deployment
pipeline, with a DBA review for big tables.

## Q4. "How do you run raw SQL safely?"

**Strong answer.** "\`FromSql\` and \`ExecuteSql\` take an interpolated string as a \`FormattableString\`
and turn each hole into a **parameter** — safe. \`FromSqlRaw\` with string concatenation is SQL injection.
\`FromSqlRaw\` is fine with explicit parameters (\`{0}\` placeholders or \`SqlParameter\`) when the SQL text
itself must be dynamic."

    var name = Request.Query["name"];
    db.Customers.FromSql($"SELECT * FROM Customers WHERE Name = {name}");    // parameterised
    db.Customers.FromSqlRaw("SELECT * FROM Customers WHERE Name = '" + name + "'");   // injectable

## Q5. "Transactions?"

**Strong answer.** "Each \`SaveChanges\` is already **one transaction** — all of its changes commit or none
do. When several \`SaveChanges\` calls, or EF plus raw SQL, must be atomic, use
\`await using var tx = await db.Database.BeginTransactionAsync();\` ... \`await tx.CommitAsync();\`. With
SQL Server's retrying execution strategy, wrap the transaction in
\`db.Database.CreateExecutionStrategy().ExecuteAsync(...)\` so a retry replays the whole unit."

## Q6. "Two users edit the same product. How do you stop a lost update?"

**Strong answer.** "Optimistic concurrency with a **concurrency token** — on SQL Server a \`rowversion\`
column: \`[Timestamp] public byte[] RowVersion { get; set; }\`. EF adds \`WHERE RowVersion = @original\` to
the \`UPDATE\`; if another user changed the row, zero rows are affected and EF throws
\`DbUpdateConcurrencyException\`. The API returns **409** (or 412 with ETags) and the client reloads and
retries or merges."

**Follow-up:** "Why not pessimistic locking?" — holding row locks across a user's think time blocks
everyone else; optimistic costs nothing when conflicts are rare, which they usually are.

## Q7. "DbContext lifetime and thread safety?"

**Strong answer.** "Scoped — one per request — and **not thread-safe**: no parallel queries on one
context (\`Task.WhenAll\` over two queries on the same context throws). Background services and singletons
use \`IDbContextFactory<T>\` or create a scope. \`AddDbContextPool\` reuses context instances to cut
allocation cost on hot paths."

## How you are judged

Strong candidates can say what SQL a LINQ query sends and how many round-trips a page costs. Weak ones say
"EF Core handles performance" or fix N+1 by adding \`Include\` everywhere.`,
    workedExample: `**The question.** "This endpoint lists 50 open tickets with the customer's name and the agent's
name. It takes 1.2 s. Make it fast and tell me what you changed."

    public async Task<List<TicketDto>> Open()
    {
        var tickets = await _db.Tickets.Where(t => !t.Closed).ToListAsync();
        var result = new List<TicketDto>();
        foreach (var t in tickets)
        {
            var customer = await _db.Customers.FindAsync(t.CustomerId);
            var agent = await _db.Agents.FindAsync(t.AgentId);
            result.Add(new TicketDto(t.Id, t.Subject, customer!.Name, agent!.Name));
        }
        return result;
    }

**Step 1 — count the round-trips.** One query for tickets, then two \`FindAsync\` calls per ticket (some
answered from the change tracker if the same customer repeats). For 50 tickets that is up to 101 queries;
at about 10 ms each, the 1.2 s is the network, not SQL Server.

**Step 2 — notice the other waste.** Every ticket column is loaded (including a long \`Description\`),
and every entity is tracked although nothing is saved.

**Step 3 — rewrite as one projected query.**

    public Task<List<TicketDto>> Open() =>
        _db.Tickets
           .Where(t => !t.Closed)
           .OrderBy(t => t.CreatedAt)
           .Take(50)
           .Select(t => new TicketDto(t.Id, t.Subject, t.Customer.Name, t.Agent.Name))
           .ToListAsync();

EF Core translates the navigation properties into two joins and selects four columns. A projection into a
DTO is not tracked, so \`AsNoTracking\` is unnecessary. Paging with a stable order is added because "list
the open tickets" will not stay at 50.

**Step 4 — verify, do not guess.** Turn on \`LogTo(Console.WriteLine, LogLevel.Information)\` or use
\`ToQueryString()\` to read the SQL, then check the plan: an index on \`Tickets(Closed, CreatedAt)\`
including \`Subject\` makes the filter and sort a seek.

**Step 5 — the follow-ups.** "Why not \`Include(t => t.Customer).Include(t => t.Agent)\`?" — it also fixes
the N+1, but loads whole entities and tracks them; the projection returns only what the DTO needs. "What
if the DTO needed the ticket's comments too?" — a collection: project it inside the \`Select\`, and consider
\`AsSplitQuery\` if it multiplies rows.`,
    mcqs: [
      mcq(`What does this EF Core 8 code do to the database?

    var p = await db.Products.AsNoTracking().FirstAsync(x => x.Id == 7);
    p.Price = 99;
    var n = await db.SaveChangesAsync();`, [
        ['Sends UPDATE Products SET Price = 99 WHERE Id = 7, so n is 1', false],
        ['Throws, because a no-tracking entity cannot be modified', false],
        ['Sends an UPDATE that sets every column of product 7', false],
        ['Sends no UPDATE at all; n is 0 since nothing is tracked', true],
      ], 'AsNoTracking returns entities the context does not track, so SaveChanges finds no changes and returns 0. To save, attach it with db.Update(p), which marks every column modified, or load it tracked.'),
      mcq('An endpoint loads 50 orders, then loops and lazy-loads order.Customer.Name for each. How many database round-trips does one call make, and what is the usual fix?', [
        ['One, because EF batches lazy loads; nothing to fix', false],
        ['Two, one per table; switch to AsSplitQuery()', false],
        ['Fifty-one; project the needed columns with Select in one query', true],
        ['Fifty; add AsNoTracking() so the customers are cached across loads', false],
      ], 'One query for the orders plus one lazy load per order is the N+1 pattern. A Select projection into a DTO, or Include, fetches the customer names in the same query with a join. AsNoTracking does not batch anything.'),
      mcq('Product has [Timestamp] public byte[] RowVersion. Two users load product 7, both change it, and the second user calls SaveChanges after the first. What happens to the second save?', [
        ['It silently overwrites the first user\'s change', false],
        ['It merges both users\' changes column by column', false],
        ['It waits until the first user\'s transaction ends', false],
        ['It throws DbUpdateConcurrencyException, 0 rows hit', true],
      ], 'EF adds WHERE RowVersion = @original to the UPDATE. The first save changed the rowversion, so the second UPDATE matches no row and EF throws DbUpdateConcurrencyException, which the API turns into a 409 so the user can reload.'),
    ],
    checkpoint: [
      ck('EF_CORE', 'A query uses .Include(o => o.Lines).Include(o => o.Payments) on 200 orders, each with 20 lines and 5 payments. Why is it slow, and what does EF Core 8 offer?', [
        ['The single join multiplies rows to about 20,000; AsSplitQuery()', true],
        ['Include always issues one query per order row; use AsNoTracking()', false],
        ['Two Includes disable indexes; replace them with FromSqlRaw', false],
        ['EF loads lines lazily anyway; call ToList() before Include', false],
      ], 'Two collection includes in one query produce a cartesian product: orders × lines × payments rows, with order data repeated. AsSplitQuery sends one query per collection; EF Core warns when several collections are loaded in a single query without a choice.'),
      ck('EF_CORE', 'Which of these EF Core 8 calls is open to SQL injection when name comes from the query string?', [
        ['db.Customers.FromSql($"SELECT * FROM Customers WHERE Name = {name}")', false],
        ['db.Customers.Where(c => c.Name == name)', false],
        ['db.Customers.FromSqlRaw("SELECT * FROM Customers WHERE Name = \'" + name + "\'")', true],
        ['db.Database.ExecuteSql($"DELETE FROM Carts WHERE Owner = {name}")', false],
      ], 'FromSql and ExecuteSql receive a FormattableString and turn every interpolated value into a DbParameter, and LINQ is always parameterised. FromSqlRaw with string concatenation sends the user\'s text as part of the SQL itself.'),
      ck('EF_CORE', 'The API runs on four instances. Each calls db.Database.Migrate() at startup. What is the recommended change?', [
        ['Keep it, since EF Core takes a global lock across all the instances', false],
        ['Call EnsureCreated() instead, which never conflicts', false],
        ['Run an idempotent script or bundle once in the deploy pipeline', true],
        ['Add AsNoTracking() to the migration so it does not lock', false],
      ], 'Several instances migrating at once can race, and app startup is the wrong place for schema changes that may need review or take long locks. dotnet ef migrations script --idempotent or a migration bundle runs once per deployment. EnsureCreated bypasses migrations entirely.'),
    ],
  },

  /* ── IV_SECURITY ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_IV_SECURITY',
    notes: `Security questions in a .NET round are practical: what the JWT handler checks, why a token cannot be
taken back, how passwords are stored, how to say "only the owner may edit this order", and the CORS and
secrets mistakes that reach production. General web security (XSS, CSRF, OWASP) is in the shared web pack.

## Q1. "Authentication vs authorization — and which status code for each?"

**Strong answer.** "Authentication answers *who are you* and sets \`HttpContext.User\`; authorization
answers *are you allowed* for this endpoint or resource. No token or a bad token → **401**, with a
\`WWW-Authenticate\` header. A valid user without permission → **403**. Returning 404 instead of 403 is a
deliberate choice when you do not want to reveal that a resource exists."

## Q2. "What does the JWT bearer handler validate?"

**Strong answer.** "The signature with the configured key (or the issuer's keys from its metadata), the
issuer, the audience, and the lifetime — \`exp\` and \`nbf\` — with a default **clock skew of five
minutes**, so a token 'expires' up to five minutes late unless you set \`ClockSkew\`. Claims become the
\`ClaimsPrincipal\`. It does **not** check whether the user still exists or was blocked."

**Follow-up:** "Where do you keep the JWT in a React app?" — the trade-off: \`localStorage\` is readable by
any XSS; an \`HttpOnly\`, \`Secure\`, \`SameSite\` cookie is not readable by script but brings CSRF back into
scope. Many teams keep a short-lived access token in memory and a refresh token in an HttpOnly cookie.

## Q3. "How do you log a user out or revoke a JWT?"

**Strong answer.** "You cannot un-issue a self-contained token — the API accepts it until it expires. So:
**short-lived access tokens** (5–15 minutes) plus **refresh tokens** stored server-side, which you can
revoke and rotate on each use; for immediate revocation, a deny-list of token ids (\`jti\`) checked per
request, or a per-user 'security stamp' / token version claim compared against the database."

## Q4. "How does ASP.NET Core Identity store passwords?"

**Strong answer.** "Never encrypted, never plain SHA-256. \`PasswordHasher<TUser>\` uses **PBKDF2** with a
random per-password salt and many iterations (in .NET 7+, HMAC-SHA512 with 100,000 iterations), and stores
the algorithm marker, salt and hash together so the format can be upgraded: \`VerifyHashedPassword\` can
return \`SuccessRehashNeeded\`. Identity also gives lockout after failed attempts, email confirmation, 2FA
and the security stamp."

## Q5. "Roles, claims, policies — and resource-based authorization?"

**Strong answer.** "\`[Authorize(Roles = "Admin")]\` is the simple case. **Policies** are named rules —
\`options.AddPolicy("CanRefund", p => p.RequireClaim("dept", "finance"))\` — applied with
\`[Authorize(Policy = "CanRefund")]\`, and custom ones are requirement + handler classes. When the rule
depends on the **resource** — 'only the order's owner may cancel it' — the attribute cannot know the
order, so you load it and call \`IAuthorizationService.AuthorizeAsync(User, order, "SameOwner")\` in the
action."

**Trap:** \`GET /api/orders/{id}\` that checks only \`[Authorize]\` — any logged-in user can read any order
by changing the id. That is IDOR, the most common API vulnerability.

## Q6. "How do you configure CORS correctly?"

**Strong answer.** "CORS is enforced by **browsers**; it does not protect the API from curl or another
server. Name the exact origins: \`policy.WithOrigins("https://app.example.in").AllowAnyHeader().AllowAnyMethod()\`.
If the front end sends cookies, add \`AllowCredentials()\` — and then a wildcard origin is forbidden;
ASP.NET Core throws if you combine \`AllowAnyOrigin()\` with \`AllowCredentials()\`. Put \`UseCors\` after
\`UseRouting\` and before authentication."

## Q7. "Where do secrets go?"

**Strong answer.** "Not in \`appsettings.json\` and not in git. In development, \`dotnet user-secrets\` —
a plain JSON file in your user profile, outside the repo, read only in the Development environment. In
production, environment variables from the platform, or Azure Key Vault / AWS Secrets Manager through a
configuration provider, ideally with a managed identity so there is no secret to fetch the secrets. Rotate
anything that was ever committed."

## How you are judged

Strong candidates distinguish 401 from 403, admit a JWT cannot be revoked by itself and know what IDOR is.
Weak ones "encrypt passwords" or answer every CORS error with \`AllowAnyOrigin\`.`,
    mcqs: [
      mcq('A logged-in user with a valid JWT calls an endpoint marked [Authorize(Roles = "Admin")] but is not an admin. What status code does ASP.NET Core return?', [
        ['401 Unauthorized, because the role is missing', false],
        ['403 Forbidden, as they are known but not permitted', true],
        ['404 Not Found, to hide that the endpoint exists', false],
        ['400 Bad Request, because the token lacks a role claim', false],
      ], 'Authentication succeeded, so the user is known; authorization failed, so the handler forbids the request with 403. 401 is for a missing or invalid token. Returning 404 is possible but has to be coded deliberately.'),
      mcq('A user logs out of the React app, but a copy of their JWT keeps working against the API for another 50 minutes. What is the standard design that limits this?', [
        ['Delete the token from localStorage, which also invalidates it on the server', false],
        ['Use a longer signing key so stolen tokens cannot be replayed', false],
        ['Encrypt the JWT payload so a copied token cannot be decoded', false],
        ['Short-lived access tokens and revocable server-side refresh tokens', true],
      ], 'A signed JWT is valid until it expires and the API holds no record to revoke it. Keeping access tokens to minutes and storing refresh tokens server-side, where logout revokes them, bounds the damage. A jti deny-list handles immediate revocation.'),
      mcq('With default JwtBearer options, a token\'s exp claim passed two minutes ago. What does the API do?', [
        ['Rejects it with 401, because exp is checked to the second', false],
        ['Accepts it, since the default clock skew allows five minutes', true],
        ['Accepts it forever, as lifetime is not validated by default', false],
        ['Issues a fresh token automatically and accepts the request', false],
      ], 'TokenValidationParameters validates the lifetime with a default ClockSkew of five minutes to allow for clock drift between servers. Set ClockSkew to TimeSpan.Zero or a small value when short expiry matters.'),
    ],
    checkpoint: [
      ck('ASPNET_SECURITY', 'Only the customer who placed an order may cancel it. Why can\'t a plain [Authorize(Policy = "Owner")] attribute enforce this, and what is used instead?', [
        ['Policies cannot read claims; use a role per customer', false],
        ['Attributes run after the action; move the check into middleware', false],
        ['It cannot see the order; call AuthorizeAsync with the loaded order', true],
        ['Policies only work on minimal APIs; use an action filter on controllers', false],
      ], 'An attribute is evaluated before the action loads anything, so it cannot see whose order it is. Resource-based authorization loads the order and calls AuthorizeAsync(User, order, policy), whose handler compares the owner with the user.'),
      ck('ASPNET_SECURITY', 'A developer configures a CORS policy with AllowAnyOrigin() and AllowCredentials() so the React app can send its auth cookie. What happens?', [
        ['It works, and any site can now make credentialed calls', false],
        ['The browser sends the cookie but hides the response body', false],
        ['ASP.NET Core rejects the combination when building the policy', true],
        ['It works only for GET requests, as POST needs a preflight', false],
      ], 'The CORS protocol forbids a wildcard origin together with credentials, and ASP.NET Core\'s policy builder throws an InvalidOperationException for that combination. List the real origins with WithOrigins when credentials are needed.'),
      ck('ASPNET_SECURITY', 'Which statement about dotnet user-secrets is accurate?', [
        ['It encrypts secrets into appsettings.json for production', false],
        ['It stores plain JSON in the user profile, for development only', true],
        ['It uploads the secrets to Azure Key Vault whenever you run the app', false],
        ['It is read in every environment, overriding env variables', false],
      ], 'User secrets live in a secrets.json file under the user profile, outside the project folder so they are not committed. The file is not encrypted, and CreateBuilder adds it only in the Development environment.'),
    ],
  },

  /* ── IV_SQLSERVER ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_IV_SQLSERVER',
    notes: `A .NET backend round almost always has SQL Server questions beyond plain SQL (which is in the shared SQL
pack): indexes as SQL Server builds them, reading an execution plan, isolation and locking, and deadlocks.
SQL Server 2022.

## Q1. "Clustered vs nonclustered index?"

**Strong answer.** "A **clustered** index *is* the table: the data rows are stored in the leaf level of a
B-tree, in key order — so there is one per table. A primary key creates it by default if none exists. A
**nonclustered** index is a separate B-tree whose leaves hold the index key plus a **row locator** — the
clustered key. A table without a clustered index is a *heap*."

**Follow-up:** "What makes a good clustered key?" — narrow, unique, static and ever-increasing (an \`INT
IDENTITY\` or a sequential GUID), because every nonclustered index carries a copy of it, and a random GUID
key causes page splits and fragmentation.

## Q2. "What is a key lookup, and what is a covering index?"

**Strong answer.** "If a nonclustered index finds the rows but the query needs columns it does not
contain, SQL Server does a **key lookup** into the clustered index for each row — fine for ten rows,
terrible for fifty thousand, and the optimizer may give up and scan. A **covering index** contains every
column the query needs: key columns for seeking and sorting, \`INCLUDE\` columns stored only at the leaf."

    CREATE NONCLUSTERED INDEX IX_Orders_Customer_Date
    ON dbo.Orders (CustomerId, OrderDate DESC)
    INCLUDE (Total, Status);

## Q3. "How do you read an execution plan?"

**Strong answer.** "Actual plan, read right to left. Look for **scans** where you expected **seeks**, key
lookups with high row counts, a big gap between estimated and actual rows (stale statistics or parameter
sniffing), expensive sorts and hash joins spilling to tempdb, and warnings such as implicit conversions.
Then \`SET STATISTICS IO ON\` for logical reads — the number that tells you whether the fix worked."

## Q4. "What makes a predicate SARGable?"

**Strong answer.** "The column must stand alone so the index can seek. \`WHERE YEAR(OrderDate) = 2024\`
wraps the column in a function and forces a scan; write the range:
\`WHERE OrderDate >= '2024-01-01' AND OrderDate < '2025-01-01'\`. Same for \`LIKE '%term'\`,
\`ISNULL(col, 0) = 5\`, and an \`NVARCHAR\` parameter compared with a \`VARCHAR\` column (an implicit
conversion on the column side)."

## Q5. "Isolation levels and locking in SQL Server?"

**Strong answer.** "READ UNCOMMITTED, READ COMMITTED (the default), REPEATABLE READ, SERIALIZABLE, plus
SNAPSHOT. Under plain READ COMMITTED, readers take shared locks and **wait for writers**. Turning on
**READ_COMMITTED_SNAPSHOT** (RCSI) makes READ COMMITTED use row versions in tempdb: readers see the last
committed version and neither blocks the other. Azure SQL Database has RCSI on by default; a SQL Server
install does not."

**Follow-up:** "What about WITH (NOLOCK)?" — that is READ UNCOMMITTED: dirty reads of data that may be
rolled back, and under page splits it can **skip rows or read them twice**. It is not a free performance
switch; RCSI is the proper fix for reader/writer blocking.

## Q6. "What is a deadlock and how do you handle it?"

**Strong answer.** "Two transactions each hold a lock the other needs. SQL Server's lock monitor detects
the cycle and kills one — the **victim** — with error **1205**. Prevent it: touch tables in the same order
in every code path, keep transactions short (no user waits or HTTP calls inside), add indexes so updates
lock fewer rows. Handle it: the victim's work is rolled back, so retry the whole transaction — EF Core's
\`EnableRetryOnFailure\` treats 1205 as transient. Diagnose with the deadlock graph from the
\`system_health\` Extended Events session."

## Q7. "Stored procedures or EF Core queries?"

**Strong answer.** "EF Core for the CRUD and most queries: typed, versioned with migrations, testable.
Procedures for set-based heavy work close to the data — month-end aggregation, bulk merges — or where a
DBA must own and tune the SQL. Both are parameterised and both get cached plans; 'procedures are always
faster' is a myth. Either way watch **parameter sniffing**: a plan compiled for a rare value reused for a
common one."

## How you are judged

Strong candidates explain an index as a B-tree, read a plan and know RCSI. Weak ones add an index on every
column or put \`NOLOCK\` on every query.`,
    mcqs: [
      mcq('An interviewer asks why a SQL Server table is limited in how many clustered indexes it may have. What is the limit and the reason?', [
        ['Up to 999, the same limit as nonclustered indexes', false],
        ['One, because it defines how the table rows are stored', true],
        ['One per filegroup the table is partitioned across', false],
        ['Two: one for the primary key and one for a unique key', false],
      ], 'The leaf level of a clustered index is the data itself, stored in key order, and rows can only be stored in one order. Nonclustered indexes are separate structures, up to 999 per table, pointing back to the clustered key.'),
      mcq('A plan shows an Index Seek on IX_Orders_CustomerId followed by a Key Lookup executed 48,000 times for SELECT CustomerId, OrderDate, Total. What is the usual fix?', [
        ['Rebuild the clustered index so that each of its lookups gets faster', false],
        ['Add WITH (NOLOCK) so the lookups stop taking locks', false],
        ['Add INCLUDE (OrderDate, Total) so the index covers the query', true],
        ['Drop the index, because a full scan is always faster', false],
      ], 'Each key lookup fetches the missing columns from the clustered index row by row. Including OrderDate and Total in the nonclustered index makes it covering, so the seek returns everything and the 48,000 lookups disappear.'),
      mcq('Under default READ COMMITTED, report queries wait on long write transactions. Which database setting lets readers see the last committed rows without being blocked?', [
        ['READ_COMMITTED_SNAPSHOT ON, using row versions', true],
        ['SET TRANSACTION ISOLATION LEVEL SERIALIZABLE', false],
        ['AUTO_UPDATE_STATISTICS ON for every table', false],
        ['RECOVERY SIMPLE, so the log stops holding locks', false],
      ], 'With RCSI, statements under READ COMMITTED read the last committed version of each row from the version store in tempdb instead of taking shared locks, so readers and writers stop blocking each other. SERIALIZABLE blocks more, not less.'),
    ],
    checkpoint: [
      ck('SQL_SERVER', 'Orders has an index on OrderDate. Which WHERE clause lets SQL Server seek on it for all of 2024?', [
        ['WHERE YEAR(OrderDate) = 2024', false],
        ['WHERE CONVERT(char(4), OrderDate, 112) = \'2024\'', false],
        ['WHERE DATEDIFF(year, OrderDate, CAST(\'2024-06-01\' AS date)) = 0', false],
        ['WHERE OrderDate >= \'2024-01-01\' AND OrderDate < \'2025-01-01\'', true],
      ], 'A predicate is SARGable only when the indexed column stands alone. Wrapping OrderDate in YEAR, CONVERT or DATEDIFF makes SQL Server compute the function for every row, which means a scan. A half-open date range seeks.'),
      ck('SQL_SERVER', 'An API call fails with SQL Server error 1205 ("chosen as the deadlock victim"). What is the right response in the application?', [
        ['Retry the whole transaction, since its work was rolled back', true],
        ['Retry only the statement that failed, keeping earlier work', false],
        ['Ignore it: the other transaction will commit both changes', false],
        ['Add WITH (NOLOCK) to every query in the transaction', false],
      ], 'SQL Server resolves a deadlock by rolling back the victim\'s entire transaction, so the unit of work must be retried from the start. EF Core\'s retrying execution strategy treats 1205 as transient. Consistent lock order and short transactions prevent it.'),
      ck('SQL_SERVER', 'Why do experienced reviewers reject WITH (NOLOCK) added to "fix" slow reads?', [
        ['It disables the indexes the query would otherwise use', false],
        ['It allows dirty reads and can skip or double-count rows', true],
        ['It makes the query take exclusive locks on the table', false],
        ['It only works inside stored procedures, not from EF', false],
      ], 'NOLOCK is READ UNCOMMITTED: it can return changes that are later rolled back, and during page splits an allocation-order scan can miss rows or read them twice. RCSI removes reader/writer blocking without those anomalies.'),
    ],
  },

  /* ── IV_ARCHITECTURE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_IV_ARCHITECTURE',
    notes: `The last part of a backend round is "your API is live — now what?" The interviewer wants to hear about
caching, background work, outbound HTTP, logging, health, tests and containers, and what breaks first when
traffic grows ten times. System design at scale is in the shared design pack; this is the .NET toolbox.

## Q1. "How do you cache in ASP.NET Core?"

**Strong answer.** "\`IMemoryCache\` — in-process, fastest, but **per instance**: with three instances
behind a load balancer, each has its own copy and invalidation reaches only one. \`IDistributedCache\` with
Redis — shared by all instances, survives restarts, costs a network hop and serialisation. **Output
caching** (.NET 7+, \`AddOutputCache\` / \`[OutputCache]\`) caches whole responses on the server. HTTP
caching headers let browsers and CDNs do the work."

**Follow-up:** "How do you set expiry?" — absolute expiry for data that must refresh, sliding for
session-like data, always a size or count limit, and think about a stampede: many requests missing at once
all hit the database.

## Q2. "How do you run background work?"

**Strong answer.** "\`BackgroundService\` (an \`IHostedService\`) for in-process loops — polling an outbox,
cleaning expired tokens. It is a **singleton**, so it must create a scope for scoped services:"

    public class OutboxWorker : BackgroundService {
        private readonly IServiceScopeFactory _scopes;
        public OutboxWorker(IServiceScopeFactory scopes) { _scopes = scopes; }
        protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
            while (!stoppingToken.IsCancellationRequested) {
                using (var scope = _scopes.CreateScope()) {
                    var db = scope.ServiceProvider.GetRequiredService<ShopDb>();
                    // send pending messages
                }
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

**Follow-up:** "What if the app runs on four instances?" — four workers process the same rows; claim rows
with a status update (\`UPDATE ... OUTPUT\` or \`UPDLOCK, READPAST\`), or use a queue (Azure Service Bus,
RabbitMQ) or a job library such as Hangfire. Long or important work does not belong in fire-and-forget
\`Task.Run\` in a request.

## Q3. "How do you call other HTTP services?"

**Strong answer.** "Through \`IHttpClientFactory\` — \`AddHttpClient<PaymentsClient>()\` for a typed
client. \`new HttpClient()\` per request leaves sockets in TIME_WAIT and can exhaust them under load; one
static \`HttpClient\` forever never sees DNS changes. The factory pools handlers and recycles them. Add
resilience — timeouts, retries with backoff for transient errors, a circuit breaker —
with \`Microsoft.Extensions.Http.Resilience\` (\`AddStandardResilienceHandler\`) in .NET 8."

## Q4. "How do you log?"

**Strong answer.** "\`ILogger<T>\` with **message templates**:
\`_logger.LogInformation("Order {OrderId} placed by {UserId}", order.Id, userId);\` — not string
interpolation, so the values are stored as searchable fields and the template groups identical events. A
provider such as Serilog or OpenTelemetry ships them to Seq, Elastic or Application Insights. Correlate
with the trace id; never log passwords, tokens or full card numbers."

## Q5. "Health checks — liveness vs readiness?"

**Strong answer.** "\`builder.Services.AddHealthChecks().AddSqlServer(conn)\` and
\`app.MapHealthChecks(...)\`. **Liveness** answers 'is the process alive?' — no dependency checks, or a
database blip makes the orchestrator restart every healthy instance. **Readiness** answers 'can I take
traffic?' — checks the database and other dependencies, and a failure only takes the instance out of the
load balancer. Map them as two endpoints with tag predicates."

## Q6. "How do you test an ASP.NET Core API?"

**Strong answer.** "Unit tests (xUnit, a mocking library) for domain logic and services. **Integration
tests** with \`WebApplicationFactory<Program>\`: the real pipeline in memory — routing, filters, JSON,
auth — with an \`HttpClient\`, and services overridden in \`ConfigureTestServices\`. For the database, a
real SQL Server in a container (Testcontainers) beats the EF in-memory provider, which does not behave
like SQL. With top-level statements, add \`public partial class Program { }\` so the test project can
reference it."

## Q7. "What breaks at ten times the users?"

**Strong answer.** "In order of likelihood: the database (missing indexes, N+1, chatty endpoints) —
measure with Query Store; **sync-over-async** causing thread-pool starvation; \`IMemoryCache\` and
in-process state that is wrong once you scale out; sticky assumptions such as files saved to local disk;
connection pool exhaustion; and no rate limiting (\`AddRateLimiter\`, .NET 7+). The app tier is stateless
and scales out in containers; the database scales up, with read replicas and caching in front."

## How you are judged

Strong candidates bring up per-instance state, scopes in background services and IHttpClientFactory
unprompted. Weak ones answer "add more servers" to every scaling question.`,
    mcqs: [
      mcq('The API runs on three instances behind a load balancer. An admin edits a product and the code removes it from IMemoryCache. Users still see the old price for minutes. Why?', [
        ['IMemoryCache ignores Remove until the entry\'s expiry time passes', false],
        ['Each instance has its own cache, and only one entry was removed', true],
        ['The load balancer caches GET responses for five minutes by default', false],
        ['EF Core change tracking still holds the old product in each request', false],
      ], 'IMemoryCache lives inside one process. Removing the entry on the instance that handled the edit leaves stale copies on the other two. A distributed cache such as Redis, or a pub/sub invalidation message, keeps all instances consistent.'),
      mcq('A BackgroundService injects ShopDb (registered with AddDbContext) in its constructor. What is wrong?', [
        ['Nothing: hosted services may take any service in the constructor', false],
        ['BackgroundService cannot use EF Core because it has no HttpContext', false],
        ['ShopDb must be registered as transient for background services', false],
        ['It is a singleton holding a scoped context; create a scope per run', true],
      ], 'Hosted services are singletons, so a DbContext taken in the constructor would live for the whole process, and scope validation rejects it. Inject IServiceScopeFactory and resolve the context inside a scope for each unit of work.'),
      mcq('Which log line is written the way ASP.NET Core structured logging intends?', [
        ['_logger.LogInformation($"Order {order.Id} placed by {userId} at {DateTime.UtcNow}");', false],
        ['_logger.LogInformation("Order " + order.Id + " placed by " + userId);', false],
        ['_logger.LogInformation("Order {OrderId} placed by {UserId}", order.Id, userId);', true],
        ['Console.WriteLine("Order {0} placed by {1}", order.Id, userId);', false],
      ], 'A message template with named holes keeps OrderId and UserId as separate, queryable properties and lets the sink group identical events. Interpolation and concatenation bake the values into one string, and Console bypasses logging entirely.'),
    ],
    checkpoint: [
      ck('ASPNET_CORE', 'A service does using (var client = new HttpClient()) { ... } for every outgoing call. Under load, calls start failing with socket errors. What is the fix?', [
        ['Make one static HttpClient for the whole app and never dispose it', false],
        ['Use IHttpClientFactory so handlers and connections are pooled', true],
        ['Raise the request timeout so sockets have time to close', false],
        ['Wrap each call in Task.Run so it uses a separate thread', false],
      ], 'Disposing an HttpClient per call closes its connection, leaving sockets in TIME_WAIT until they run out. A static client avoids that but never notices DNS changes. IHttpClientFactory pools and recycles handlers, solving both.'),
      ck('ASPNET_CORE', 'The liveness endpoint used by Kubernetes checks SQL Server. The database has a 30-second blip. What happens, and what should change?', [
        ['Nothing bad; liveness failures only remove pods from the load balancer', false],
        ['Kubernetes scales the pods up, which takes load off the database', false],
        ['The health endpoint caches its result, so the blip is never seen', false],
        ['Every pod is restarted; check dependencies only in readiness', true],
      ], 'A failed liveness probe tells the orchestrator the process is broken, so it restarts it — every replica at once during a database blip. Dependency checks belong in the readiness probe, which only takes the instance out of rotation.'),
      ck('ASPNET_CORE', 'Which approach runs an integration test through the real ASP.NET Core pipeline — routing, filters, JSON and auth — without deploying the app?', [
        ['Instantiate the controller class with new and call its action method', false],
        ['Use WebApplicationFactory<Program> and its in-memory HttpClient', true],
        ['Mock HttpContext with a library and pass it to the action', false],
        ['Call the endpoint with curl from a shell script in CI', false],
      ], 'WebApplicationFactory boots the app on an in-memory test server and hands out an HttpClient, so requests go through middleware, routing, binding, filters and serialisation. ConfigureTestServices swaps dependencies such as the database or the clock.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_RAPID_FIRE',
    notes: `A screening call for a .NET backend role: thirty questions in about ten minutes. One correct line each.
Cover the answer, say yours out loud, then check.

## Pipeline and DI

1. **Which web server does ASP.NET Core ship with?** — Kestrel.
2. **What does middleware call to pass the request on?** — \`next\` (the next delegate).
3. **Which is terminal: \`app.Use\` or \`app.Run\`?** — \`app.Run\`.
4. **Authentication or authorization first?** — Authentication.
5. **The three DI lifetimes?** — Transient, scoped, singleton.
6. **Default lifetime of \`AddDbContext\`?** — Scoped.
7. **Singleton holding a scoped service is called?** — A captive dependency.
8. **Options interface a singleton uses to see reloads?** — \`IOptionsMonitor<T>\`.
9. **Environment variable for \`ConnectionStrings:Default\`?** — \`ConnectionStrings__Default\`.
10. **Variable that sets the environment?** — \`ASPNETCORE_ENVIRONMENT\` (or \`DOTNET_ENVIRONMENT\`).

## Web API

11. **What does \`[ApiController]\` return for invalid model state?** — 400 with ValidationProblemDetails.
12. **Status for a created resource?** — 201 with a Location header.
13. **Status for a successful DELETE with no body?** — 204.
14. **Standard error body format?** — ProblemDetails (RFC 9457).
15. **.NET 8 interface for global exception mapping?** — \`IExceptionHandler\`.
16. **Do .NET 8 minimal APIs validate DataAnnotations automatically?** — No.

## EF Core

17. **Read-only query optimisation?** — \`AsNoTracking()\`.
18. **Is one \`SaveChanges\` call transactional?** — Yes.
19. **Exception for a stale rowversion?** — \`DbUpdateConcurrencyException\`.
20. **Fix for a cartesian explosion from two Includes?** — \`AsSplitQuery()\`.
21. **Safe raw SQL method with interpolation?** — \`FromSql\` (or \`FromSqlInterpolated\`).
22. **Bulk update without loading entities (EF Core 7+)?** — \`ExecuteUpdateAsync\`.
23. **Is \`DbContext\` thread-safe?** — No.

## Security and SQL Server

24. **Status for a valid token but wrong role?** — 403.
25. **Default JWT clock skew?** — Five minutes.
26. **Identity's password hashing algorithm?** — PBKDF2 with a salt.
27. **Clustered indexes per table?** — One.
28. **SQL Server's default isolation level?** — READ COMMITTED.
29. **Deadlock victim error number?** — 1205.
30. **Right way to make many outbound HTTP calls?** — \`IHttpClientFactory\`.

## Scoring

25+ correct and quick: strong. 20–24: fine, revise the misses. Under 20, or any "scoped means per user" /
"we encrypt passwords" / "NOLOCK makes it faster, no downside": back to the question sets.`,
    mcqs: [
      mcq('Rapid fire: "What is the default service lifetime when you call AddDbContext<T>()?"', [
        ['Transient', false],
        ['Singleton', false],
        ['Scoped', true],
        ['Pooled', false],
      ], 'AddDbContext registers the context as scoped, so one request shares one unit of work and change tracker. AddDbContextPool reuses instances behind the scenes but each request still gets its own context for its duration.'),
      mcq('Rapid fire: "Which environment variable decides whether appsettings.Development.json is loaded?"', [
        ['ASPNETCORE_ENVIRONMENT', true],
        ['ASPNETCORE_URLS', false],
        ['DOTNET_CLI_HOME', false],
        ['DOTNET_APPSETTINGS_PROFILE', false],
      ], 'The host reads ASPNETCORE_ENVIRONMENT (or DOTNET_ENVIRONMENT) and loads appsettings.{Environment}.json on top of appsettings.json. When it is not set the environment is Production.'),
      mcq('Rapid fire: "What is SQL Server\'s default transaction isolation level?"', [
        ['SNAPSHOT', false],
        ['READ UNCOMMITTED', false],
        ['SERIALIZABLE', false],
        ['READ COMMITTED', true],
      ], 'SQL Server defaults to READ COMMITTED, implemented with shared locks unless the database has READ_COMMITTED_SNAPSHOT turned on, in which case it uses row versioning. Azure SQL Database turns that option on by default.'),
      mcq('Rapid fire: "Which EF Core 7+ method updates many rows in one statement without loading them?"', [
        ['SaveChangesAsync() with AutoDetectChanges off', false],
        ['ExecuteUpdateAsync() on the filtered query', true],
        ['UpdateRange() followed by SaveChanges()', false],
        ['AsNoTracking().ForEach() on the DbSet', false],
      ], 'ExecuteUpdateAsync translates the query and the SetProperty calls into a single UPDATE ... WHERE statement and bypasses the change tracker. UpdateRange still needs the entities in memory and sends one UPDATE per row.'),
      mcq('Rapid fire: "Which status code means the request had no valid credentials?"', [
        ['403 Forbidden', false],
        ['400 Bad Request', false],
        ['401 Unauthorized', true],
        ['407 Proxy Auth Required', false],
      ], '401 means the caller is not authenticated — no token, or an invalid or expired one — and comes with a WWW-Authenticate header. 403 is for an authenticated caller who lacks permission.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_MOCK',
    notes: `The interviewer's script for a 40-minute .NET backend round, built around the candidate's own project.
Do it with a friend reading the interviewer's lines and your capstone open. The scoring notes are what a
real panel writes down.

## Opening (3 min)

"Walk me through what happens when your React app calls \`POST /api/orders\`, from the browser to the row in
SQL Server."

- **Strong:** CORS preflight if cross-origin; Kestrel; middleware in order (exception handler, routing,
  CORS, authentication validates the JWT, authorization checks the policy); \`[ApiController]\` binds and
  validates the body (automatic 400); the action calls a scoped service with a scoped \`DbContext\`;
  \`SaveChanges\` in one transaction; 201 with a Location header.
- **OK:** controller → service → database, nothing about the pipeline.
- **Weak:** cannot say where the token is checked.

## Q1. DI lifetimes (5 min)

"Which lifetime is your \`DbContext\`? Your email sender? What happens if a singleton takes the
\`DbContext\`?" **Follow-up:** "Why didn't your tests catch it?"

- **Strong:** scoped, singleton or transient with a reason; captive dependency, stale tracking and
  concurrent use; scope validation only on in Development.
- **Weak:** "scoped means one per user".

## Q2. EF Core performance (7 min)

"This page lists 50 orders with customer names and takes a second. What do you check first?"

- **Strong:** log the SQL, count round-trips — N+1; project into a DTO with \`Select\`; \`AsNoTracking\`
  for entity reads; paging with a stable order; check the plan and add a covering index.
- **OK:** "add Include" with no idea of the SQL.
- **Weak:** "add caching" as the first move.

## Q3. Concurrency (5 min)

"Two admins edit the same product at the same time. What happens in your app today? What should happen?"

- **Strong:** last write wins today; add a \`rowversion\` concurrency token; \`DbUpdateConcurrencyException\`
  → 409; the client reloads and merges.
- **Weak:** "SQL Server locks the row, so it's fine".

## Q4. Security (7 min)

"How does a user log out in your app? Can user 12 read user 13's order by changing the id? Where is your
JWT signing key?"

- **Strong:** short-lived access tokens and revocable refresh tokens — honest that the access token stays
  valid until expiry; ownership checked with resource-based authorization or a \`WHERE UserId = @me\`
  filter; key in user secrets locally and environment variables or a vault in production, never in git.
- **Weak:** "logout deletes the token so it can't be used" or the key in \`appsettings.json\`.

## Q5. SQL Server (5 min)

"Your orders search is slow on \`WHERE YEAR(CreatedAt) = @year AND Status = @status\`. Fix it."

- **Strong:** not SARGable — rewrite as a date range; index on \`(Status, CreatedAt)\` with the selected
  columns included; check the plan for a seek and the logical reads.
- **Weak:** "add an index on CreatedAt" without changing the predicate.

## Q6. Production (5 min)

"You deploy three instances. What in your code is now wrong?"

- **Strong:** \`IMemoryCache\` invalidation per instance; uploaded files on local disk; background workers
  running three times; migrations at startup racing; health checks split into liveness and readiness.
- **Weak:** "nothing, it's stateless" without checking.

## Whiteboard task (3 min)

"Write the action for \`GET /api/orders/{id}\` that returns 404 when the order does not exist and 403 when
it is someone else's."

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDto>> Get(int id, CancellationToken ct)
    {
        var order = await _db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return NotFound();
        var auth = await _authz.AuthorizeAsync(User, order, "SameOwner");
        if (!auth.Succeeded) return Forbid();
        return Ok(OrderDto.From(order));
    }

- **Strong:** as above, or filters by the current user in the query and returns 404 for both cases —
  and explains that choice hides which ids exist.
- **Weak:** no ownership check at all.

## Scoring

Hire bar: strong on Q1, Q2 and Q4, at least OK elsewhere, and an ownership check in the whiteboard task.
"SQL Server locks it so it's fine" or "logout invalidates the JWT" outweigh two OK answers.`,
    mcqs: [
      mcq('In Q4 a candidate says "on logout we delete the JWT from localStorage, so it can no longer be used". How does the panel score it?', [
        ['Strong: deleting it client-side revokes it on the server', false],
        ['Weak: any copy stays valid until it expires', true],
        ['Strong, provided the token is signed with HS256', false],
        ['OK: true only when the API uses cookie authentication', false],
      ], 'The API validates a self-contained JWT by signature and expiry; it has no record that the user logged out. A copied or stolen token keeps working until exp. Short lifetimes and revocable refresh tokens are the strong answer.'),
      mcq('In Q2 the candidate\'s first move is "put Redis in front of the order list". Why does the panel mark it down?', [
        ['Redis cannot store lists of DTOs from EF Core', false],
        ['Caching is banned in ASP.NET Core APIs by default', false],
        ['Redis is only allowed with minimal APIs', false],
        ['It hides the N+1 cause instead of measuring and fixing it', true],
      ], 'A one-second list of 50 rows is almost always round-trips or a missing index. Logging the SQL, projecting with Select and checking the plan fixes the cause; a cache added first only masks it and adds invalidation problems.'),
      mcq('In Q3 a candidate answers "SQL Server locks the row while one admin edits, so there is no problem". What is the gap?', [
        ['Correct; row locks last for the whole edit session', false],
        ['Correct, but only under the SERIALIZABLE isolation level', false],
        ['Locks last only for the UPDATE, so the later save overwrites', true],
        ['Wrong only because EF Core disables locking by default', false],
      ], 'Each admin loads the product, edits it in the browser for minutes, then saves; locks are held only while each UPDATE runs, so the second save silently replaces the first. A rowversion token detects the conflict and turns it into a 409.'),
      mcq('In the whiteboard task, which version gets "strong"?', [
        ['Load the order by id and return it; [Authorize] already makes it safe', false],
        ['Return 404 if missing, then check ownership before returning it', true],
        ['Check ownership in the React app before calling the API', false],
        ['Return 403 for every order id the user did not create today', false],
      ], 'The endpoint itself must check that the order belongs to the caller, because any logged-in user can change the id in the URL (IDOR). [Authorize] proves only that the user is logged in, and a front-end check is trivially bypassed.'),
      mcq('In Q6, which item shows the candidate understands scaling out to three instances?', [
        ['Background workers now run three times and must claim work', true],
        ['Each instance needs its own copy of the SQL Server database', false],
        ['JWTs signed on one instance cannot be validated on another', false],
        ['Scoped services become singletons across the instances', false],
      ], 'A BackgroundService runs in every instance, so three copies process the same rows unless work is claimed atomically or moved to a queue. Instances share one database, and a JWT validates anywhere that has the same signing key.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_ASPNET_CHECKPOINT',
    notes: `Ten questions across the topic — the pipeline and DI, Web API behaviour, EF Core, security and SQL
Server. Each describes code or a production situation an interviewer would put in front of you. Decide what
actually happens at runtime, not what the code seems to intend.`,
    checkpoint: [
      ck('ASPNET_CORE', 'A transient service is injected into a controller and also into a scoped OrderService that the controller uses. How many instances of the transient exist in one request?', [
        ['One, as the request scope shares it', false],
        ['Two, one for each class that resolves it', true],
        ['One for the whole lifetime of the app', false],
        ['None until a method on it is first called', false],
      ], 'Transient means a new instance every time the container resolves the service. The controller and OrderService each resolve it once, so the request has two. A scoped registration would have given one shared instance.'),
      ck('ASPNET_CORE', 'A team calls app.UseAuthorization() and only then app.UseCors(). When a user\'s token expires, the React app shows a CORS error instead of handling a 401. Why?', [
        ['The 401 is sent before CORS middleware adds its headers', true],
        ['Browsers never show 401 responses to cross-origin scripts', false],
        ['UseCors only works with minimal APIs, not with controllers', false],
        ['An expired token makes Kestrel drop the CORS preflight', false],
      ], 'Authorization short-circuits the request with 401 before the CORS middleware runs, so the response has no Access-Control-Allow-Origin header and the browser hides it from the script. The documented order puts UseCors before UseAuthorization so even rejected calls carry CORS headers.'),
      ck('ASPNET_CORE', 'A singleton service injects IOptionsSnapshot<PricingOptions>. What happens?', [
        ['It works and sees new values on each request', false],
        ['It works but only ever sees the startup values', false],
        ['Scope validation fails: a scoped service in a singleton', true],
        ['It compiles to IOptionsMonitor automatically', false],
      ], 'IOptionsSnapshot is registered as scoped so it can be recomputed per request, which makes it a captive dependency inside a singleton; scope validation rejects it. A singleton should use IOptionsMonitor and read CurrentValue.'),
      ck('EF_CORE', 'A GET endpoint loads 500 products to return as JSON and never saves anything. Which single change cuts EF Core\'s overhead most directly?', [
        ['Call SaveChanges() at the end to release the entities', false],
        ['Use AsNoTracking(), so no snapshots are kept for them', true],
        ['Wrap the query in an explicit database transaction', false],
        ['Register the DbContext as a singleton to reuse its cache', false],
      ], 'Tracked queries make the context store an entry and a snapshot for every entity so SaveChanges can detect changes. A read-only endpoint needs none of that; AsNoTracking skips it. A DbContext must never be a singleton.'),
      ck('EF_CORE', 'Two calls to SaveChanges must succeed or fail together, along with one ExecuteSql statement. How is that done in EF Core 8?', [
        ['Nothing is needed; every SaveChanges joins one ambient transaction', false],
        ['Call SaveChanges once at the end and hope ExecuteSql never fails', false],
        ['Set AutoDetectChangesEnabled to false so they run as one unit', false],
        ['Begin a transaction on db.Database, run all three, then commit', true],
      ], 'Each SaveChanges is its own transaction by default, and ExecuteSql runs immediately. BeginTransactionAsync on the context\'s database makes all three part of one transaction committed by CommitAsync; with a retrying strategy, wrap it in the execution strategy.'),
      ck('EF_CORE', 'Two developers each add a migration on separate branches, and both branches are merged. The next migrations add complains about the model snapshot. What is the clean fix?', [
        ['Remove your migration, merge the other, then add yours again', true],
        ['Edit the model snapshot file by hand until it compiles', false],
        ['Delete every migration and recreate the database from scratch', false],
        ['Rename one migration file so its timestamp sorts first', false],
      ], 'Each migration was generated against a snapshot without the other\'s change. Removing yours, taking the merged snapshot and regenerating produces a migration that knows about both. Hand-editing the snapshot or recreating the database loses information.'),
      ck('ASPNET_SECURITY', 'GET /api/orders/{id} has [Authorize] and returns any order by id. A logged-in user changes the id in the URL and sees another customer\'s order. What is this, and the fix?', [
        ['CSRF; add an antiforgery token to the GET request', false],
        ['XSS; HTML-encode the order before returning it', false],
        ['Token replay; shorten the JWT lifetime to one minute', false],
        ['IDOR; check that the order belongs to the caller', true],
      ], 'Insecure direct object reference: the endpoint authenticates the user but never checks ownership of the object. Filter by the current user in the query or use resource-based authorization, returning 404 or 403.'),
      ck('ASPNET_SECURITY', 'How does ASP.NET Core Identity\'s default PasswordHasher store a password?', [
        ['AES-encrypted with a symmetric key kept in appsettings.json', false],
        ['A salted PBKDF2 hash with the format marker stored too', true],
        ['A single SHA-256 hash, with a site-wide pepper', false],
        ['Plain text in a column the database encrypts at rest', false],
      ], 'Passwords are hashed, not encrypted, so they cannot be recovered. PasswordHasher uses PBKDF2 with a random salt and many iterations and stores a version marker with the salt and hash, so it can return SuccessRehashNeeded and upgrade old hashes.'),
      ck('SQL_SERVER', 'A table\'s clustered primary key is a random GUID (NEWID()). Inserts are slow and the index is badly fragmented. Why?', [
        ['GUIDs cannot be indexed, so every insert scans the table', false],
        ['Random keys land on random pages, causing page splits', true],
        ['A GUID key forces SERIALIZABLE isolation on every insert', false],
        ['NEWID() locks the whole table while it generates a value', false],
      ], 'A clustered index stores rows in key order. Random GUIDs insert into the middle of full pages, splitting them and fragmenting the index; every nonclustered index also carries the wide 16-byte key. An IDENTITY or a sequential GUID appends at the end.'),
      ck('SQL_SERVER', 'Every 10 minutes, two API calls deadlock: one updates Orders then Payments, the other updates Payments then Orders. What prevents it?', [
        ['Use NOLOCK table hints on both of the UPDATE statements', false],
        ['Raise the lock timeout so neither waits forever', false],
        ['Update the two tables in the same order in both paths', true],
        ['Run each UPDATE in its own separate transaction', false],
      ], 'The deadlock is a cycle: each transaction holds the lock the other wants next. Taking locks in one consistent order removes the cycle. NOLOCK does not apply to writes, and splitting the transaction loses atomicity.'),
    ],
  },
];
