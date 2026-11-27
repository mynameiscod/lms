/**
 * Career-track placement content: Core Java at interview depth (JT_IV_CORE_JAVA), for Java Full
 * Stack + AI.
 *
 * Students have finished the track's Core Java, OOP, collections and concurrency topics, so this is
 * not teaching from zero: each question-set unit is the 8–12 questions interviewers really ask on its
 * subject, with the strong answer, the follow-up and the wrong answers that lose the round. The
 * stems go one level deeper than the teaching topics — HashMap resize and treeification, the string
 * pool and constant folding, broken equals/hashCode contracts, volatile vs synchronized vs atomic,
 * happens-before, stream laziness, Optional anti-patterns, GC roots and leaks, Java 8 vs 17.
 *
 * Java 17 is the reference. Where a behaviour changed between versions (string pool location,
 * PermGen vs Metaspace, compact strings, the default collector, Stream.toList) the notes say so.
 *
 * Attribution: the topic is multi-skill (default JAVA_OOP). Each IV_* unit declares one skill and
 * every checkpoint question in it names that skill; the CHECKPOINT unit names the skill each
 * question measures. Practice mcqs name none.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

export const TRACK_IV_CORE_JAVA_BUNDLES: PilotBundle[] = [
  /* ── IV_LANGUAGE ────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_IV_LANGUAGE',
    notes: `The first ten minutes of almost every Java interview are spent here. The questions sound
basic, which is exactly why a vague answer costs so much: the interviewer is checking whether you
know *why*, not *what*. Each question below has the answer that earns the follow-up, the follow-up
itself, and the answers that end the topic badly.

## Q1. "What is the difference between JDK, JRE and JVM?"

**Strong answer.** "The JVM is the runtime that loads bytecode, verifies it, interprets it and
JIT-compiles hot methods to native code, and manages memory with the garbage collector. The JRE was
the JVM plus the standard class library — enough to *run* Java. The JDK is the JRE plus the
development tools: \`javac\`, \`jar\`, \`jshell\`, \`jdb\`, \`jlink\`. Since Java 11 Oracle no longer
ships a separate JRE; you get a JDK, and \`jlink\` builds a trimmed runtime for your app — that is
what a slim Docker image uses."

**Follow-up:** "Is Java compiled or interpreted?" — both: \`javac\` compiles source to bytecode; the
JVM interprets bytecode and the JIT (C1, then C2) compiles frequently-run methods to machine code at
runtime. That is why a Java service gets faster after warm-up.

**Wrong answers:** "JVM is platform-independent" (the *bytecode* is; each OS has its own JVM). "JRE
is for developers."

## Q2. "Why is String immutable?"

**Strong answer.** Four reasons, in this order: (1) the **string pool** — literals are shared, so if
one holder could change \`"admin"\`, every other holder would see it; (2) **security** — class names,
file paths, DB URLs and hostnames are passed as strings and checked before use; a mutable string
could change between the check and the use; (3) **hash caching** — \`String\` caches its
\`hashCode\`, which makes it a cheap, safe \`HashMap\` key; (4) **thread safety** for free.

**Follow-up:** "How is it immutable — the class is final and the field is private final, but is that
enough?" — also no method mutates the array, and the constructor copies the char/byte array it is
given. Since **Java 9 (compact strings)** the field is a \`byte[]\` plus a \`coder\` (LATIN1 or UTF16),
not a \`char[]\` — Latin-1 text takes half the memory.

## Q3. "Where do string literals live, and what does this print?"

    String a = "java";
    String b = "java";
    String c = new String("java");
    String d = "ja" + "va";
    String part = "ja";
    String e = part + "va";
    System.out.println((a == b) + " " + (a == c) + " " + (a == d) + " " + (a == e) + " " + (a == e.intern()));
    // true false true false true

**Strong answer.** Literals are interned in the string pool, so \`a\` and \`b\` are one object.
\`new String\` always creates a new heap object. \`"ja" + "va"\` is a **compile-time constant** — javac
folds it to \`"java"\`, so it is the pooled object. \`part + "va"\` involves a non-final variable, so
it is built at runtime (via \`StringConcatFactory\` since Java 9, \`StringBuilder\` before) and is a
new object. \`intern()\` returns the pooled copy. Make \`part\` **final** and \`a == e\` becomes true,
because \`part\` is then a constant too.

**Follow-up:** "Where is the pool?" — in the heap since **Java 7** (it was in PermGen before, which is
why heavy interning used to cause \`OutOfMemoryError: PermGen space\`).

**Wrong answer:** "\`new String("java")\` creates two objects every time." It creates one new object;
the literal is created once when the class is loaded, not per call.

## Q4. "== vs equals?"

**Strong answer.** \`==\` compares primitive values, or for references whether both point at the
**same object**. \`equals\` compares logical content — *if* the class overrides it; \`Object.equals\` is
\`==\`. Then the trap they are really asking about:

    Integer x = 127, y = 127;   // x == y  -> true
    Integer p = 128, q = 128;   // p == q  -> false

Autoboxing calls \`Integer.valueOf\`, which returns cached objects for **-128 to 127**; outside that
range each box is a new object. The upper bound can be raised with
\`-XX:AutoBoxCacheMax\`, so never rely on it — compare boxed numbers with \`equals\`.

## Q5. "Is Java pass-by-value or pass-by-reference?"

**Strong answer.** "Always pass-by-value. For objects, the value passed is the reference. The method
can mutate the object through it, but assigning a new object to the parameter is invisible to the
caller." Then prove it with a \`swap(a, b)\` that does nothing. The follow-up is usually "then how do
you return two values?" — a small record, an array, or a mutable holder.

## Q6. "What does static mean? Can you override a static method?"

**Strong answer.** \`static\` members belong to the class, not an instance: one copy, created when the
class is initialised. Static methods are **hidden**, not overridden — the call is bound at compile
time to the *declared* type:

    class A { static String who() { return "A"; } }
    class B extends A { static String who() { return "B"; } }
    A ref = new B();
    ref.who();   // "A" — chosen by the static type

**Follow-up:** "Why can't a static method use \`this\`?" — there is no instance. "When does a static
block run?" — once, at class initialisation (first active use), not at class loading.

## Q7. "final, finally, finalize?"

**Strong answer.** \`final\` — a variable assigned once, a method that cannot be overridden, a class
that cannot be extended. \`finally\` — a block that runs after try/catch whether or not an exception
was thrown (not if the JVM exits or the thread is killed). \`finalize\` — a method the GC *might* call
before reclaiming an object; deprecated since **Java 9** and deprecated for removal since **Java 18**.
Use try-with-resources or \`Cleaner\`.

**Follow-up:** "Does final make an object immutable?" — no. \`final List<String> list\` cannot be
re-pointed, but \`list.add(...)\` works.

## Q8. "Why is main public static void? What if it is not static?"

**Strong answer.** The launcher calls it before any object exists, so it must be static; it must be
public to be reachable; it returns nothing to the JVM (use \`System.exit(code)\` for an exit code).
Without static it compiles but the launcher reports that the main method is not static. (Java 21
previews instance main methods — mention it only if asked about new versions.)

## Q9. "What is var? Is Java dynamically typed now?"

**Strong answer.** \`var\` (Java 10) is **local variable type inference**: the compiler infers the
static type from the initialiser, and it is fixed from then on. \`var list = new ArrayList<String>();\`
is an \`ArrayList<String>\`. It is not allowed for fields, method parameters or return types, needs an
initialiser, and \`var x = null;\` does not compile. Java is still statically typed.

## Q10. "StringBuilder vs StringBuffer vs String concatenation in a loop?"

**Strong answer.** \`String +=\` in a loop creates a new string each iteration — O(n²) characters
copied. \`StringBuilder\` appends into one growable buffer. \`StringBuffer\` is the same but every method
is \`synchronized\`, which is useless for a local variable; use \`StringBuilder\`. A single expression
like \`a + b + c\` is fine — the compiler optimises it.

## How you are judged

Strong candidates attach a *reason* and a *version* to each fact ("since Java 7 the pool is on the
heap"). Weak ones recite definitions. Saying "Java passes objects by reference" or "Integer == works
for numbers" is the answer interviewers remember.`,
    workedExample: `**Question: "What does this print, and why?" — answered out loud, line by line.**

    final String prefix = "user";
    String dynamic = "user";
    String k1 = "user42";
    String k2 = prefix + "42";
    String k3 = dynamic + "42";
    System.out.println(k1 == k2);          // ?
    System.out.println(k1 == k3);          // ?
    System.out.println(k1.equals(k3));     // ?

**Step 1 — name the mechanism before the output.** "Three things decide this: literals are pooled,
compile-time constants are folded by javac, and anything computed at runtime is a fresh object."

**Step 2 — k1.** A literal, so it is the pooled \`"user42"\`.

**Step 3 — k2.** \`prefix\` is \`final\` and initialised with a literal, so it is a *constant variable*.
\`prefix + "42"\` is therefore a constant expression; javac writes \`"user42"\` straight into the class
file. Same pooled object: \`k1 == k2\` is **true**.

**Step 4 — k3.** \`dynamic\` is not final, so the concatenation happens at runtime and produces a new
String on the heap. \`k1 == k3\` is **false**, and \`k1.equals(k3)\` is **true** because the characters
match.

**Step 5 — the lesson, said unprompted.** "This is why we never compare strings with \`==\` in real
code: whether two equal strings are the same object depends on compiler folding and interning, which
is an implementation detail. If I need identity-based comparison for memory reasons I would call
\`intern()\` deliberately, but in a web app I just use \`equals\`."

That last sentence is what turns a trivia answer into a strong one.`,
    mcqs: [
      mcq(`What does this print on a default JVM?

    Integer hits = 100, limit = 100;
    Integer big = 1000, cap = 1000;
    System.out.println((hits == limit) + " " + (big == cap));`, [
        ['true true', false],
        ['true false', true],
        ['false false', false],
        ['false true', false],
      ], 'Autoboxing goes through Integer.valueOf, which returns cached objects from -128 to 127. 100 hits the cache so both names share one object; 1000 does not, so two distinct Integer objects are compared by identity.'),
      mcq(`An interviewer shows this and asks for the output:

    String base = "pay";
    String s1 = "payment";
    String s2 = base + "ment";
    String s3 = s2.intern();
    System.out.println((s1 == s2) + " " + (s1 == s3));`, [
        ['true true', false],
        ['false false', false],
        ['false true', true],
        ['true false', false],
      ], 'base is not final, so base + "ment" is computed at runtime into a new heap object and s1 == s2 is false. intern() returns the pooled "payment" literal, which is exactly the object s1 already refers to.'),
      mcq('A candidate says "I use var everywhere now, so my fields and method parameters are dynamically typed." What is wrong with the claim?', [
        ['var only works for local variables, and it fixes a static type', true],
        ['var works on fields too, but the type is chosen at runtime', false],
        ['var is allowed only in lambdas, where it stays dynamic', false],
        ['var is legal everywhere but disables generics type checks', false],
      ], 'var (Java 10) is local-variable type inference: the compiler infers the static type from the initialiser and it never changes. It cannot be used for fields, parameters or return types, and Java remains statically typed.'),
    ],
    checkpoint: [
      ck('JAVA_BASICS', `What does this print?

    class Parent { static String tag() { return "P"; } }
    class Child extends Parent { static String tag() { return "C"; } }

    Parent ref = new Child();
    System.out.println(ref.tag());`, [
        ['C, because the object is a Child at runtime', false],
        ['P, because static calls bind to the declared type', true],
        ['It fails to compile: statics cannot be redeclared', false],
        ['It throws, since a static is called on an instance', false],
      ], 'Static methods are hidden, not overridden. The call is resolved at compile time using the static type of ref, which is Parent, so Parent.tag() runs whatever the object really is.'),
      ck('JAVA_BASICS', `A method is declared as below. What does the caller see afterwards?

    static void grow(StringBuilder sb, int n) {
        sb.append("!");
        sb = new StringBuilder("reset");
        n = n + 1;
    }

    StringBuilder msg = new StringBuilder("hi");
    int count = 1;
    grow(msg, count);
    System.out.println(msg + " " + count);`, [
        ['reset 2', false],
        ['hi! 2', false],
        ['reset 1', false],
        ['hi! 1', true],
      ], 'Java passes copies of values. The copied reference still points at the caller\'s builder when append runs, so "!" is added; re-pointing sb and changing n only affect the method\'s own copies.'),
      ck('JAVA_BASICS', 'A team is on Java 6 and sees "OutOfMemoryError: PermGen space" after interning millions of strings. On Java 17 the same code fails differently, if at all. Why?', [
        ['Java 17 stores interned strings in the stack of each thread', false],
        ['Java 17 compresses interned strings so they cannot overflow', false],
        ['The pool moved into the main heap in Java 7, and is collected there', true],
        ['Java 17 removed intern(), so the code no longer compiles', false],
      ], 'Since Java 7 the string pool lives in the ordinary heap, where unreferenced pooled strings are garbage-collected; Java 8 also replaced PermGen with Metaspace. Heavy interning now shows up as heap pressure, not PermGen exhaustion.'),
    ],
  },

  /* ── IV_OOP ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_IV_OOP',
    notes: `"Explain the four pillars of OOP" is asked to filter out people who memorised a list. The
real questions come straight after: a three-line class hierarchy and "what does this print?". These
are the ones that decide the round.

## Q1. "Explain encapsulation, inheritance, polymorphism and abstraction — with your project."

**Strong answer.** Give each a one-line definition *and* a place it appears in your capstone.
"Encapsulation: my \`Order\` entity has no public setters for \`status\`; only \`markShipped()\` changes
it, so the rule lives in one place. Abstraction: my controller depends on \`PaymentService\`, an
interface — it doesn't know Razorpay exists. Polymorphism: Spring injects \`RazorpayPaymentService\`
in prod and a fake in tests, and the same call runs different code. Inheritance: I use it rarely —
mostly \`extends\` for exceptions and a \`BaseEntity\` with id and timestamps."

**Wrong answer:** "Encapsulation is making fields private and adding getters and setters for all of
them." Getter/setter for everything is *no* encapsulation — the invariant is still unprotected.

## Q2. "Overloading vs overriding — when is each decided?"

**Strong answer.** Overloading: same name, different parameter lists, **chosen at compile time** from
the *declared* types of the arguments. Overriding: same signature in a subclass, **chosen at runtime**
from the *actual* object. The killer example:

    void print(Object o) { System.out.println("object"); }
    void print(String s) { System.out.println("string"); }

    Object x = "hello";
    print(x);       // object  — overload picked from the static type Object
    print(null);    // string  — the most specific applicable overload

If the overloads were \`print(String)\` and \`print(Integer)\`, \`print(null)\` would be a **compile error**
(ambiguous).

**Follow-up:** "Rules for overriding?" — same signature; return type may be a **covariant** subtype;
access may be widened but not narrowed; may not throw *broader checked* exceptions; \`private\`,
\`static\` and \`final\` methods are not overridden. Always use \`@Override\`.

## Q3. "Are fields polymorphic?"

**Strong answer.** No. Fields are resolved by the declared type; only instance methods dispatch
dynamically.

    class Animal { String name = "animal"; String speak() { return "..."; } }
    class Dog extends Animal { String name = "dog"; String speak() { return "woof"; } }
    Animal a = new Dog();
    a.name;     // "animal"
    a.speak();  // "woof"

Declaring a same-named field in a subclass **hides** the parent's. It is legal and almost always a bug.

## Q4. "What happens if a constructor calls an overridable method?"

**Strong answer.** The subclass override runs **before the subclass's field initialisers have run**,
so it sees default values:

    class Base { Base() { init(); } void init() {} }
    class Report extends Base {
        private String title = "Q3";
        @Override void init() { System.out.println(title.length()); }   // NullPointerException
    }
    new Report();

Order: \`Base()\` → (virtual) \`Report.init()\` sees \`title == null\` → only then \`title = "Q3"\`. Fix: make
the method \`private\` or \`final\`, or don't call it from the constructor. (Effective Java, item 19.)

## Q5. "Abstract class vs interface — after Java 8?"

**Strong answer.** Since Java 8 interfaces can have \`default\` and \`static\` methods, and since Java 9
\`private\` methods, so "interfaces have no code" is outdated. The real differences: an abstract class
can have **state** (instance fields) and **constructors**; a class extends **one** class but
implements **many** interfaces. Use an interface for a capability or a contract (\`Comparable\`,
\`PaymentService\`); an abstract class for a partial implementation sharing state (template method).

**Follow-up — the diamond:** two interfaces both give \`default void log()\`; a class implementing both
**must override** \`log()\` or it does not compile, and can pick one with \`A.super.log()\`. If a
superclass has a \`log()\`, the class wins over interfaces ("class wins" rule).

## Q6. "Composition over inheritance — why?"

**Strong answer.** Inheritance couples you to the parent's implementation. The classic proof is the
counting \`HashSet\`: override \`add\` and \`addAll\` to count, call \`addAll\` with three items, and the
count is **6**, because \`HashSet.addAll\` calls \`add\` internally. Wrap a \`Set\` instead (forward each
call) and the count is 3, whatever the internals do. Inheritance is right for a true is-a where the
parent is designed for extension.

## Q7. "Why does Java not support multiple inheritance of classes?"

**Strong answer.** To avoid the ambiguity of two parents with the same method *and state* — which
constructor runs, which field wins. Java allows multiple inheritance of **type** (interfaces) and,
since Java 8, of **behaviour** via defaults — with the compile-time rule above to resolve conflicts.
State is never inherited from two places.

## Q8. "What are records and sealed classes, and why were they added?"

**Strong answer.** A **record** (Java 16) is a transparent data carrier: \`record Point(int x, int y) {}\`
gives private final fields, a canonical constructor, accessors \`x()\` and \`y()\`, and
\`equals\`/\`hashCode\`/\`toString\` from the components. It is implicitly final and cannot extend
another class (it extends \`java.lang.Record\`), but can implement interfaces. Validation goes in a
compact constructor. A **sealed** class or interface (Java 17) lists its permitted subtypes —
\`sealed interface Shape permits Circle, Square\` — so a \`switch\` over it can be **exhaustive** with no
\`default\`.

**Follow-up:** "Can a record be a JPA entity?" — no: entities need a no-arg constructor, mutable state
and proxies. Records are perfect for DTOs and projections.

## Q9. "What is the contract of a subclass — what is Liskov substitution?"

**Strong answer.** Any code written against the parent must keep working with the child. The classic
violation is \`Square extends Rectangle\`: \`setWidth(5); setHeight(4); area()\` expects 20 and a square
returns 16. If the child must weaken a promise or throw \`UnsupportedOperationException\` for an
inherited method, it should not be a subclass.

## How you are judged

Strong: predicts the output of overload/override/field-hiding code without hesitating, and ties the
pillars to their own code. Weak: definitions only, "abstract classes can't have code", or calling
static method hiding "overriding".`,
    workedExample: `**Question: "Trace this and tell me what it prints."**

    class Shape {
        String name = "shape";
        Shape() { describe(); }
        void describe() { System.out.println("Shape:" + name); }
        static String kind() { return "generic"; }
    }
    class Circle extends Shape {
        String name = "circle";
        double r = 2;
        @Override void describe() { System.out.println("Circle:" + name + ":" + r); }
        static String kind() { return "round"; }
    }

    Shape s = new Circle();
    s.describe();
    System.out.println(s.name + " " + s.kind());

**Line 1, \`new Circle()\`.** The \`Circle\` constructor first calls \`super()\`. \`Shape\`'s field
initialiser runs (\`Shape.name = "shape"\`), then the \`Shape\` constructor body calls \`describe()\`. That
call is virtual, so \`Circle.describe()\` runs — but \`Circle\`'s field initialisers have **not run yet**.
\`Circle.name\` is \`null\` and \`r\` is \`0.0\`. Output: **\`Circle:null:0.0\`**.

Then \`Circle\`'s initialisers run: \`name = "circle"\`, \`r = 2\`.

**Line 2, \`s.describe()\`.** Dynamic dispatch again, fields now initialised: **\`Circle:circle:2.0\`**.

**Line 3.** \`s.name\` — fields are not polymorphic; the declared type is \`Shape\`, so **\`shape\`**.
\`s.kind()\` — static, bound to the declared type: **\`generic\`**. Output: **\`shape generic\`**.

**What to say after the trace:** "Three rules showed up: instance methods dispatch on the runtime
type, fields and statics bind to the declared type, and a constructor calling an overridable method
exposes a half-built object. In real code I'd make \`describe\` final or not call it from the
constructor, and I'd never redeclare a field in a subclass."`,
    mcqs: [
      mcq(`What does this print?

    static String route(Object o)  { return "object"; }
    static String route(String s)  { return "string"; }

    Object payload = "order-17";
    System.out.println(route(payload) + " " + route(null));`, [
        ['string string', false],
        ['object string', true],
        ['object object', false],
        ['It does not compile: route(null) is ambiguous', false],
      ], 'Overloads are chosen at compile time from declared types: payload is declared Object, so route(Object) is picked. For null both apply, and String is more specific than Object, so route(String) wins — no ambiguity here.'),
      mcq('A class implements two interfaces, Auditable and Loggable, and both declare `default String label()`. The class declares no label() method. What happens?', [
        ['It compiles and calls whichever interface is listed first', false],
        ['It compiles, and calling label() throws at runtime', false],
        ['It fails to compile until the class overrides label()', true],
        ['It compiles and label() returns null by default', false],
      ], 'Two inherited defaults with the same signature conflict, so the compiler requires the class to override the method. Inside the override it may delegate with Auditable.super.label() or Loggable.super.label().'),
      mcq('A subclass of HashSet overrides add() and addAll() to increment a counter, then calls addAll(List.of("a","b","c")) on an empty set. The counter reads 6. What is the best explanation?', [
        ['HashSet.addAll calls add for each item, so each is counted twice', true],
        ['The set stores each string twice because hashCode is not overridden', false],
        ['List.of duplicates its elements when they are passed to a set', false],
        ['The JIT compiler inlined addAll and executed the loop twice', false],
      ], 'HashSet inherits addAll from AbstractCollection, which calls add() per element — so the overridden add counts again. It is the classic argument for composition: a wrapper that forwards to a Set does not depend on those internals.'),
    ],
    checkpoint: [
      ck('JAVA_OOP', `What happens when this runs?

    class Base {
        Base() { setup(); }
        void setup() {}
    }
    class Invoice extends Base {
        private final java.util.List<String> lines = new java.util.ArrayList<>();
        @Override void setup() { lines.add("header"); }
    }

    new Invoice();`, [
        ['A NullPointerException: lines is still null during setup', true],
        ['It works, because final fields initialise before super()', false],
        ['It fails to compile, as constructors cannot call methods', false],
        ['Base.setup() runs instead, since the object is half-built', false],
      ], 'Base() runs before Invoice\'s field initialisers, and the call to setup() still dispatches to the Invoice override. At that moment lines has its default value null, so lines.add throws a NullPointerException.'),
      ck('JAVA_OOP', `Which override compiles?

    class Repo {
        protected Number find(int id) throws java.io.IOException { return 0; }
    }`, [
        ['class R extends Repo { private Number find(int id) { return 1; } }', false],
        ['class R extends Repo { public Integer find(int id) { return 1; } }', true],
        ['class R extends Repo { protected Object find(int id) { return 1; } }', false],
        ['class R extends Repo { protected Number find(int id) throws Exception { return 1; } }', false],
      ], 'An override may widen access (protected to public), return a covariant subtype (Integer is a Number) and throw fewer checked exceptions. Narrowing to private, widening the return type to Object, or throwing the broader Exception are all rejected.'),
      ck('JAVA_OOP', 'An interviewer asks: "Your team wants to make OrderResponse a Java record. Anything to watch for?" Which concern is real?', [
        ['A record cannot implement interfaces such as Serializable', false],
        ['Record fields are mutable unless each is marked final', false],
        ['A record cannot extend a class such as a shared BaseDto', true],
        ['A record has no equals method, so tests comparing it fail', false],
      ], 'Records implicitly extend java.lang.Record and are final, so they cannot extend another class — a BaseDto hierarchy has to become an interface. They can implement interfaces, their fields are final, and equals/hashCode come from the components.'),
    ],
  },

  /* ── IV_COLLECTIONS ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_IV_COLLECTIONS',
    notes: `"How does HashMap work internally?" is the single most-asked Core Java question in Indian
service and product company interviews. A strong candidate can draw it, give the numbers, and
explain what breaks it.

## Q1. "How does HashMap work internally?"

**Strong answer — draw it while you talk.**

    table (Node[]), capacity 16
    [0] -> null
    [1] -> (k1,v1) -> (k9,v9)        a bin: linked list of Nodes
    [2] -> null
    ...
    [5] -> TreeNode (red-black tree) only when the bin is long

1. \`put(k, v)\`: compute \`k.hashCode()\`, then **spread** it: \`h ^ (h >>> 16)\`, so the high bits affect
   the index.
2. Index = \`(n - 1) & hash\` — a bit mask, which is why capacity is always a **power of two**.
3. Empty bin: store a new Node. Otherwise walk the bin: if a node has the **same hash and
   \`equals\`** the key, replace its value; else append.
4. \`get(k)\` repeats steps 1–2, then uses \`equals\` within the bin.
5. A \`null\` key is allowed (one) and always hashes to bin 0.

## Q2. "When does it resize, and what does resizing do?"

**Strong answer.** Default capacity **16**, load factor **0.75**, so the threshold is **12**: inserting
the 13th mapping doubles the table to 32. The table itself is created lazily on the first \`put\`.
Resizing reallocates and re-distributes every entry. In Java 8 this is cheap per entry: because
capacity doubles, each entry either stays at index \`i\` or moves to \`i + oldCap\`, decided by one bit of
the hash, and the bin is split into "lo" and "hi" lists **preserving order** (Java 7 reversed the
list, which caused the infamous infinite loop under concurrent resize).

**Follow-up:** "You know you'll insert 1,000 entries — what do you do?" — presize:
\`new HashMap<>(1334)\` (1000 / 0.75, rounded up) or, from **Java 19**, \`HashMap.newHashMap(1000)\`.
\`new HashMap<>(1000)\` gives capacity 1024 and threshold 768, so it still resizes once.

## Q3. "What is treeification?"

**Strong answer.** Since Java 8, when one bin reaches **8** nodes (\`TREEIFY_THRESHOLD\`) **and** the table
capacity is at least **64** (\`MIN_TREEIFY_CAPACITY\`), the bin becomes a red-black tree, turning a
worst-case O(n) lookup into O(log n). If the table is smaller than 64, HashMap **resizes instead**.
A tree shrinks back to a list at **6** nodes. Trees order by hash, then by \`compareTo\` if the keys
are \`Comparable\`. It exists to defend against hash-flooding attacks with many colliding keys.

**Wrong answer:** "HashMap lookup is always O(1)." It is O(1) *on average* with a decent hashCode.

## Q4. "What is the equals/hashCode contract, and what breaks if you violate it?"

**Strong answer.** Equal objects **must** have equal hash codes; unequal objects *may* collide.
\`hashCode\` must be stable while the object is in a hash collection. Violations:

- **equals overridden, hashCode not:** two equal \`Employee\` objects land in different bins; a
  \`HashSet\` keeps "duplicates" and \`map.get(new Employee(7))\` returns null.
- **hashCode depends on a mutable field that changes after insertion:**

        Set<Employee> set = new HashSet<>();
        Employee e = new Employee(7, "Ravi");
        set.add(e);
        e.setName("Ravi K");        // name is part of hashCode
        set.contains(e);            // false — looks in the wrong bin
        set.remove(e);              // false — a leak: it can never be removed

- **hashCode returns a constant:** still *correct*, but every entry is in one bin.

Use immutable keys (String, Integer, records). Generate both methods from the same fields.

## Q5. "HashMap vs Hashtable vs ConcurrentHashMap vs synchronizedMap?"

**Strong answer.** \`Hashtable\` is legacy: every method synchronized on the table, no nulls.
\`Collections.synchronizedMap\` wraps any map with one lock — and you must still lock it manually to
iterate. \`ConcurrentHashMap\` (Java 8+) uses **CAS for empty bins and synchronizes on the first node
of a bin** for the rest (Java 7 used 16 segments), so readers never block and writers to different
bins don't contend. It allows **no null keys or values** — \`get\` returning null must mean "absent".
Its iterators are **weakly consistent**: no \`ConcurrentModificationException\`.

**Follow-up:** "Is this thread-safe?"

    if (!chm.containsKey(user)) chm.put(user, 1);   // NO — check-then-act race
    chm.merge(user, 1, Integer::sum);               // yes — atomic per key

## Q6. "What is fail-fast vs fail-safe?"

**Strong answer.** \`ArrayList\`/\`HashMap\` iterators are fail-fast: they record \`modCount\` and throw
\`ConcurrentModificationException\` on the next \`next()\` if the collection was structurally modified
by anything other than the iterator itself — **even in a single thread**. Fix: \`iterator.remove()\` or
\`list.removeIf(...)\`. \`CopyOnWriteArrayList\` iterates a snapshot; concurrent collections are weakly
consistent. Fail-fast is best-effort, not a guarantee — removing the second-to-last element inside
a for-each silently ends the loop without throwing.

## Q7. "ArrayList vs LinkedList — really?"

**Strong answer.** \`ArrayList\`: O(1) random access, amortised O(1) append, grows by **1.5×**
(default capacity 10, allocated on first add). \`LinkedList\`: O(1) insert/remove *at a node you
already hold*, but O(n) to find it, and every node is a separate object (worse cache locality,
~24+ bytes of overhead each). In practice ArrayList wins almost always; for a queue or stack use
\`ArrayDeque\`.

## Q8. "Arrays.asList vs List.of vs new ArrayList?"

**Strong answer.** \`Arrays.asList\` is a **fixed-size view** over the array: \`set\` works (and writes
through to the array), \`add\`/\`remove\` throw \`UnsupportedOperationException\`; nulls allowed.
\`List.of\` (Java 9) is **unmodifiable**: every mutator throws, and **nulls are rejected** (even
\`contains(null)\` throws NPE). \`new ArrayList<>(...)\` is a normal mutable copy.

## Q9. "TreeMap — what does it use to decide equality?"

**Strong answer.** \`compareTo\`/the comparator — **not** \`equals\`. A comparator that compares only by
length treats \`"java"\` and \`"rust"\` as the same key; the second \`put\` replaces the first value. That
is why comparators should be "consistent with equals". \`TreeMap\` gives O(log n) and sorted
navigation (\`floorKey\`, \`headMap\`).

## Q10. "How would you build an LRU cache?"

**Strong answer.**

    class Lru<K, V> extends LinkedHashMap<K, V> {
        private final int max;
        Lru(int max) { super(16, 0.75f, true); this.max = max; }   // true = access order
        @Override protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > max; }
    }

Follow-up: "thread-safe?" — no; wrap it, or use Caffeine in production. If they want it from scratch:
HashMap + doubly linked list, O(1) get and put.`,
    workedExample: `**Question: "I insert 13 keys into new HashMap<>(). Walk me through what happens to the table."**

**Before the first put.** \`new HashMap<>()\` allocates nothing — the table is \`null\`; capacity 16 and
load factor 0.75 are just defaults waiting to be used.

**Put 1.** The table is created with 16 bins; threshold = 16 × 0.75 = **12**. The key's hash is
spread (\`h ^ (h >>> 16)\`) and masked with \`15\` (binary 1111) to choose a bin.

**Puts 2–12.** Each goes to bin \`hash & 15\`. Two keys with different hashes can still share a bin if
their low four bits match; that bin becomes a short linked list. After the 12th put, size = 12, which
is not *greater* than the threshold, so nothing happens.

**Put 13.** Size becomes 13 > 12, so \`resize()\` runs: new capacity **32**, new threshold **24**. Every
bin is split. The mask goes from \`1111\` to \`11111\`, so only one extra bit matters — the bit worth 16:

    hash ...0 0101  -> was bin 5, stays bin 5        (bit 16 is 0: "lo" list)
    hash ...1 0101  -> was bin 5, moves to bin 21    (bit 16 is 1: "hi" list, 5 + 16)

No hash is recomputed and the relative order inside each bin is kept.

**What I'd add without being asked.** "If one bin had grown to 8 entries while capacity was still 16
or 32, HashMap would have resized rather than treeified, because treeification needs capacity 64.
And if I know I'm loading 13 entries, I'd pass a capacity up front so this resize never happens."`,
    mcqs: [
      mcq('A HashMap created with `new HashMap<>()` has 12 entries. One more distinct key is put. What happens to the table?', [
        ['Nothing yet; it resizes only when it reaches 16 entries', false],
        ['It doubles to 32 bins, because 13 exceeds 16 × 0.75', true],
        ['It grows by half to 24 bins, as ArrayList does', false],
        ['The longest bin is converted to a red-black tree', false],
      ], 'The default capacity is 16 with load factor 0.75, giving a threshold of 12. The 13th mapping pushes size above it, so the table doubles to 32 and the entries are split between index i and i + 16.'),
      mcq('In a HashMap with 16 bins, a badly written key class sends 9 keys to the same bin. What does Java 17 do with that bin?', [
        ['It converts the bin to a red-black tree straight away', false],
        ['It throws IllegalStateException for too many collisions', false],
        ['It keeps the bin as a list forever, since 16 is the default', false],
        ['It resizes the table instead, as capacity is under 64', true],
      ], 'Treeification needs a bin of at least 8 nodes AND a table of at least 64 bins (MIN_TREEIFY_CAPACITY). Below 64, HashMap prefers to resize, which may spread the colliding keys; only on a large enough table does the bin become a tree.'),
      mcq(`What does this print?

    Map<String, Integer> scores = new ConcurrentHashMap<>();
    scores.put("asha", 1);
    scores.put("ravi", null);
    System.out.println(scores.size());`, [
        ['1, because the null value is silently ignored', false],
        ['2, because null values are allowed but not null keys', false],
        ['Nothing: put("ravi", null) throws NullPointerException', true],
        ['2, as ConcurrentHashMap stores null as an empty marker', false],
      ], 'ConcurrentHashMap rejects null keys and null values with a NullPointerException, so that get() returning null can only mean "absent" — otherwise a concurrent reader could not tell absent from mapped-to-null.'),
    ],
    checkpoint: [
      ck('JAVA_COLLECTIONS', `What does this print?

    record Tag(String name) {}
    class Badge {
        String name;
        Badge(String n) { name = n; }
        @Override public boolean equals(Object o) {
            return o instanceof Badge b && b.name.equals(name);
        }
    }
    Set<Object> set = new HashSet<>();
    set.add(new Tag("x"));   set.add(new Tag("x"));
    set.add(new Badge("x")); set.add(new Badge("x"));
    System.out.println(set.size());`, [
        ['2', false],
        ['4', false],
        ['3', true],
        ['1', false],
      ], 'A record generates equals and hashCode from its components, so the two Tags collapse to one. Badge overrides equals but not hashCode, so its two equal objects almost certainly land in different bins and both are kept: 1 + 2 = 3.'),
      ck('JAVA_COLLECTIONS', `What happens?

    List<String> names = new ArrayList<>(List.of("a", "b", "c"));
    for (String n : names) {
        if (n.equals("b")) names.remove(n);
    }
    System.out.println(names);`, [
        ['ConcurrentModificationException on the next iteration', false],
        ['[a, c] is printed, and "c" was never visited by the loop', true],
        ['[a, c] is printed, after the loop visits all three', false],
        ['UnsupportedOperationException, since List.of is immutable', false],
      ], 'After removing "b" the size is 2 and the iterator cursor is 2, so hasNext() returns false and the loop ends before next() can check modCount. No exception — fail-fast is best effort — and "c" is silently skipped. The copy into ArrayList makes the list mutable.'),
      ck('JAVA_COLLECTIONS', `What does this print?

    Map<String, Integer> m = new TreeMap<>(Comparator.comparingInt(String::length));
    m.put("java", 1);
    m.put("rust", 2);
    m.put("go", 3);
    System.out.println(m);`, [
        ['{java=1, rust=2, go=3}', false],
        ['{go=3, java=1, rust=2}', false],
        ['{go=3, rust=2, java=1}', false],
        ['{go=3, java=2}', true],
      ], 'TreeMap decides key identity with the comparator, not equals. "rust" compares equal to "java" (both length 4), so put replaces the value but keeps the original key "java". Entries print in comparator order: shorter first.'),
    ],
  },

  /* ── IV_JAVA8 ───────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_IV_JAVA8',
    notes: `Every Java 8 question has a "what does this print" twin. Interviewers love streams because a
candidate who only memorised "map transforms, filter filters" falls over the moment laziness or
short-circuiting is involved.

## Q1. "What is a functional interface? Name some."

**Strong answer.** An interface with exactly **one abstract method** — default and static methods
don't count, nor do methods that override \`Object\`'s (\`Comparator\` declares \`equals\` and is still
functional). \`@FunctionalInterface\` makes the compiler enforce it. Core ones: \`Function<T,R>\`,
\`Predicate<T>\`, \`Supplier<T>\`, \`Consumer<T>\`, \`BiFunction\`, \`UnaryOperator\`, plus the primitive
versions (\`IntPredicate\`, \`ToIntFunction\`) that avoid boxing. \`Runnable\` and \`Callable\` are functional
interfaces too.

**Follow-up:** "Why must captured variables be effectively final?" — a lambda captures the *value*;
the local may live on a stack frame that is gone when the lambda runs, and allowing mutation would
invite data races. Mutating a field or an \`AtomicInteger\` is allowed (and usually a smell).

## Q2. "Are streams lazy? Prove it."

**Strong answer.** Intermediate operations (\`filter\`, \`map\`, \`peek\`, \`sorted\`) only build a pipeline;
nothing runs until a **terminal** operation (\`collect\`, \`forEach\`, \`count\`, \`findFirst\`).

    Stream<String> s = Stream.of("a", "b").peek(System.out::println);
    // prints nothing — no terminal operation

And processing is **vertical**: each element goes through the whole pipeline before the next starts.

    Stream.of(5, 8, 12, 3)
        .filter(n -> { System.out.println("filter " + n); return n > 6; })
        .map(n -> { System.out.println("map " + n); return n * 2; })
        .findFirst();
    // filter 5, filter 8, map 8   — then stops

\`findFirst\` **short-circuits**: 12 and 3 are never touched. Short-circuiting operations: \`findFirst\`,
\`findAny\`, \`anyMatch\`, \`allMatch\`, \`noneMatch\`, \`limit\`, \`takeWhile\`. That is why
\`Stream.iterate(1, i -> i + 1).filter(...).limit(5)\` terminates on an infinite stream.

**Follow-up:** "Does \`sorted\` change this?" — yes: it is a **stateful barrier**; it must see every
element before passing any on.

**Also:** Java 9+ may skip \`peek\`/\`map\` entirely for \`count()\` when the size is known from the source —
\`List.of(1,2,3).stream().peek(...).count()\` prints nothing. Never put side effects you rely on in \`peek\`.

## Q3. "map vs flatMap?"

**Strong answer.** \`map\` is one-to-one: \`Stream<Order>\` → \`Stream<List<Item>>\`. \`flatMap\` maps each
element to a *stream* and concatenates them: \`orders.stream().flatMap(o -> o.items().stream())\` →
\`Stream<Item>\`. Same idea on \`Optional\`: \`map\` would give \`Optional<Optional<X>>\` when the function
already returns an Optional; \`flatMap\` flattens it.

## Q4. "Can you reuse a stream?"

**Strong answer.** No. After a terminal operation, any further operation throws
\`IllegalStateException: stream has already been operated upon or closed\`. Keep a
\`Supplier<Stream<T>>\` or re-stream the source.

## Q5. "Collectors.toMap — what goes wrong?"

**Strong answer.** Duplicate keys throw \`IllegalStateException: Duplicate key\`. Pass a merge
function: \`toMap(Emp::dept, Emp::salary, Integer::sum)\`. A **null value** throws NPE (it uses
\`HashMap.merge\`). For grouping use \`groupingBy(Emp::dept, counting())\`, \`partitioningBy\` for a
boolean split, \`joining(", ")\` for strings.

**Follow-up:** "\`collect(Collectors.toList())\` vs \`.toList()\`?" — \`Stream.toList()\` (**Java 16**)
returns an **unmodifiable** list; \`Collectors.toList()\` makes no guarantee and in practice returns an
\`ArrayList\`. Code that later calls \`add\` breaks when "modernised".

## Q6. "What is Optional for, and how is it misused?"

**Strong answer.** It is a **return type** that says "there might be no result" — \`findById\` returns
\`Optional<User>\`. Anti-patterns:

- \`opt.get()\` without checking — just an NPE with a different name. Use \`orElseThrow()\` (Java 10).
- \`if (opt.isPresent()) { return opt.get(); } else { return x; }\` — use \`orElse\`/\`map\`.
- **Optional as a field or method parameter** — not \`Serializable\`, adds allocation, and callers can
  still pass \`null\` for the Optional itself.
- \`Optional.of(maybeNull)\` — throws NPE immediately; use \`ofNullable\`.
- \`Optional<List<X>>\` — return an empty list.
- **\`orElse\` vs \`orElseGet\`:** \`orElse(expensive())\` *always* evaluates its argument, even when the
  value is present. \`orElseGet(() -> expensive())\` calls it only when empty:

        user.orElse(createGuestUser());          // creates (and maybe saves!) a guest every time
        user.orElseGet(() -> createGuestUser()); // only when absent

## Q7. "Parallel streams — when?"

**Strong answer.** Rarely. They run on the shared \`ForkJoinPool.commonPool()\` (cores − 1 threads), so
one slow blocking call starves every other parallel stream in the JVM, including in a web server.
Worth it only for CPU-heavy work on large, easily-split sources (arrays, \`ArrayList\`, ranges) with
no shared mutable state. Collecting into a shared \`ArrayList\` from \`forEach\` is a data race — use
\`collect\`.

## Q8. "Method references — the four kinds?"

**Strong answer.** Static (\`Integer::parseInt\`), bound instance (\`System.out::println\`, \`user::getName\`),
unbound instance (\`String::toUpperCase\` — the receiver is the first argument), constructor
(\`ArrayList::new\`).

## Q9. "Which post-Java 8 features do you actually use?"

**Strong answer.** Name them with versions: \`var\` (10), \`List.of\`/\`Map.of\` (9), switch **expressions**
with arrows and \`yield\` (14), text blocks (15), records (16), pattern matching for \`instanceof\` (16),
\`Stream.toList()\` (16), sealed classes (17). Show one:

    String label = switch (status) {
        case NEW, PENDING -> "open";
        case SHIPPED -> "on the way";
        case DELIVERED -> { audit(status); yield "done"; }
    };

A switch expression over an enum must be **exhaustive**; no fall-through.

## How you are judged

Strong: predicts exactly which elements a short-circuiting pipeline touches; knows \`orElse\` is eager;
uses \`Optional\` only as a return type. Weak: "streams are faster than loops", "use parallel streams
for performance", or \`Optional.get()\` everywhere.`,
    mcqs: [
      mcq(`What does this print?

    List<Integer> nums = List.of(4, 9, 16, 25);
    nums.stream()
        .map(n -> { System.out.print("m" + n + " "); return n + 1; })
        .anyMatch(n -> n > 9);`, [
        ['m4 m9 ', true],
        ['m4 m9 m16 m25 ', false],
        ['m4 ', false],
        ['Nothing, because anyMatch is an intermediate operation', false],
      ], 'Elements flow one at a time through the whole pipeline. 4 maps to 5, which fails n > 9; 9 maps to 10, which passes, so anyMatch short-circuits and 16 and 25 are never mapped. anyMatch is a terminal operation.'),
      mcq(`A service method contains this. The user is found in the database. How many times is createGuest() called?

    User u = repo.findByEmail(email).orElse(createGuest());`, [
        ['Never, because the Optional already holds a value', false],
        ['Once, because orElse evaluates its argument eagerly', true],
        ['Once, but only when the JIT has not yet inlined the call', false],
        ['Twice: once to build the guest and once to compare it', false],
      ], 'orElse takes a value, so Java evaluates createGuest() before orElse is even called — present or not. orElseGet(() -> createGuest()) takes a Supplier and calls it only when the Optional is empty.'),
      mcq(`What happens?

    record Emp(String dept, int salary) {}
    var list = List.of(new Emp("IT", 50), new Emp("HR", 40), new Emp("IT", 70));
    Map<String, Integer> m = list.stream().collect(Collectors.toMap(Emp::dept, Emp::salary));`, [
        ['m is {IT=70, HR=40}, as the later value replaces the first', false],
        ['m is {IT=120, HR=40}, as values for one key are summed', false],
        ['An IllegalStateException for the duplicate key IT', true],
        ['m is {IT=50, HR=40}, as the first value for a key is kept', false],
      ], 'The two-argument toMap has no merge function and throws IllegalStateException: Duplicate key IT. Pass a third argument such as Integer::sum or (a, b) -> b to decide what a repeated key means.'),
    ],
    checkpoint: [
      ck('JAVA_STREAMS', `What does this print?

    Stream<String> words = Stream.of("api", "db", "ui")
        .filter(w -> { System.out.print("f:" + w + " "); return w.length() > 2; });
    System.out.print("built ");
    long kept = words.count();`, [
        ['f:api f:db f:ui built ', false],
        ['built f:api f:db f:ui ', true],
        ['built ', false],
        ['f:api built ', false],
      ], 'filter is lazy, so building the pipeline prints nothing and "built " comes first. count() then runs the pipeline; because a filter is present the stream size is unknown, so every element must pass through filter and all three are printed.'),
      ck('JAVA_STREAMS', `What happens on the last line?

    List<String> ids = Stream.of("a1", "b2").toList();   // Java 17
    List<String> more = new ArrayList<>(ids);
    more.add("c3");
    ids.add("d4");`, [
        ['It works, as toList() returns an ArrayList like Collectors.toList()', false],
        ['UnsupportedOperationException, since Stream.toList() is unmodifiable', true],
        ['ConcurrentModificationException, as more was copied from ids', false],
        ['A compile error, because toList() returns an immutable List type', false],
      ], 'Stream.toList() (Java 16) returns an unmodifiable list, so add throws UnsupportedOperationException at runtime — the static type is still plain List, so it compiles. The ArrayList copy is independent and can be modified freely.'),
      ck('JAVA_STREAMS', 'In code review you see `public void notify(Optional<String> email)` called as `notify(null)` from one place. What is the strongest review comment?', [
        ['It still allows null and adds overhead; overload the method instead', true],
        ['Change the call to notify(Optional.of(null)) so the Optional is never null', false],
        ['It is fine, because Optional parameters are converted to empty when null', false],
        ['Mark the parameter final so the compiler rejects a null argument', false],
      ], 'Optional was designed as a return type. As a parameter it does not stop callers passing null, so the method needs a null check anyway; Optional.of(null) throws NPE. An overload without the argument, or a nullable String, is clearer.'),
    ],
  },

  /* ── IV_CONCURRENCY ─────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_IV_CONCURRENCY',
    notes: `Concurrency is where a product company separates a fresher who read a tutorial from one who
understands the memory model. The questions escalate; know the first three cold and be able to reason
your way through the rest.

## Q1. "Thread vs Runnable vs Callable — and start() vs run()?"

**Strong answer.** Prefer implementing \`Runnable\` (or \`Callable\`, which returns a value and may throw
a checked exception) and handing it to an executor — the task is separate from the mechanism, and the
class can still extend something else. \`start()\` creates a new OS thread that calls \`run()\`; calling
\`run()\` directly just executes it **on the current thread**, no concurrency. Calling \`start()\` twice
throws \`IllegalThreadStateException\`.

## Q2. "volatile vs synchronized vs AtomicInteger?"

**Strong answer — three different guarantees.**

| | Visibility | Atomic compound ops | Mutual exclusion |
|---|---|---|---|
| \`volatile\` | yes | no | no |
| \`synchronized\` | yes | yes | yes (blocking) |
| \`AtomicInteger\` | yes | yes, for its own ops (CAS) | no (lock-free) |

    volatile int hits;
    hits++;   // NOT safe: read, add, write — two threads can both read 5 and write 6

\`volatile\` is right for a **flag** written by one thread and read by others (\`volatile boolean
running\`). For a counter use \`AtomicInteger.incrementAndGet()\` (or \`LongAdder\` under heavy contention).
Use \`synchronized\`/\`ReentrantLock\` when several fields must change together.

**Wrong answer:** "volatile makes a variable thread-safe."

## Q3. "What is happens-before?"

**Strong answer.** The Java Memory Model's rule for when one thread's write is **guaranteed visible**
to another. Without a happens-before edge, the JIT and CPU may reorder or cache, and a thread can
see a stale value forever. Edges: unlocking a monitor → later locking the **same** monitor; a write to
a volatile → a later read of it; \`Thread.start()\` → everything in the started thread; everything in a
thread → another thread's successful \`join()\` on it; completion of a \`Future\` → \`get()\`.

    boolean done = false;                 // not volatile
    // thread A: while (!done) { }        // may spin forever — JIT hoists the read
    // thread B: done = true;

**Follow-up — double-checked locking:**

    private static volatile Config instance;
    static Config get() {
        if (instance == null) {
            synchronized (Config.class) {
                if (instance == null) instance = new Config();
            }
        }
        return instance;
    }

Without \`volatile\`, another thread may see a non-null reference to a **partially constructed**
object, because the write of the reference can be reordered before the constructor's writes. Simpler:
the holder-class idiom or an enum singleton.

## Q4. "wait/notify vs sleep?"

**Strong answer.** \`sleep\` pauses the thread and **keeps** any locks it holds. \`wait\` must be called
while holding the object's monitor (else \`IllegalMonitorStateException\`), **releases** it, and waits
for \`notify\`/\`notifyAll\`. Always \`wait\` in a \`while\` loop re-checking the condition — spurious
wakeups are allowed. In modern code use \`BlockingQueue\`, \`CountDownLatch\` or \`Condition\`.

## Q5. "What is a deadlock and how do you prevent one?"

**Strong answer.** Two threads each hold a lock the other needs: T1 locks \`accountA\` then wants
\`accountB\`; T2 locks \`accountB\` then wants \`accountA\`. Prevent with a **global lock order** (always lock
the lower account id first), \`tryLock\` with a timeout, or by not holding a lock while calling foreign
code. Diagnose with \`jstack\` — it prints "Found one Java-level deadlock".

## Q6. "Why use an ExecutorService? Which one?"

**Strong answer.** Thread creation is expensive and unbounded threads exhaust memory. A pool reuses
threads and queues tasks. Be careful with the factory methods: \`Executors.newFixedThreadPool\` uses an
**unbounded queue** (memory risk under load); \`newCachedThreadPool\` creates **unbounded threads**.
In production, build a \`ThreadPoolExecutor\` with a bounded queue and a rejection policy, and always
\`shutdown()\`. Java 21 adds **virtual threads** (\`Executors.newVirtualThreadPerTaskExecutor()\`) for
blocking I/O workloads.

## Q7. "CompletableFuture — thenApply vs thenCompose vs thenCombine?"

**Strong answer.** \`thenApply(f)\` — transform the result synchronously (like \`map\`). \`thenCompose(f)\` —
\`f\` itself returns a CompletableFuture; flattens it (like \`flatMap\`). \`thenCombine(other, f)\` — wait
for two independent futures and merge. \`supplyAsync\` without an executor uses
\`ForkJoinPool.commonPool()\` — pass your own executor for blocking I/O. Errors: \`exceptionally\` or
\`handle\`; \`join()\` throws an unchecked \`CompletionException\`, \`get()\` a checked \`ExecutionException\`.

    CompletableFuture<User> u = CompletableFuture.supplyAsync(() -> users.find(id), ioPool);
    CompletableFuture<List<Order>> o = CompletableFuture.supplyAsync(() -> orders.byUser(id), ioPool);
    Dashboard d = u.thenCombine(o, Dashboard::new).join();   // both calls run in parallel

## Q8. "Is ConcurrentHashMap enough to make my code thread-safe?"

**Strong answer.** Each *single* call is atomic; a *sequence* is not. \`get\` then \`put\` is a race; use
\`merge\`, \`compute\`, \`computeIfAbsent\`, \`putIfAbsent\`. And don't do slow or recursive work inside
\`computeIfAbsent\` — it holds the bin lock.

## Q9. "What is ThreadLocal and when does it leak?"

**Strong answer.** A per-thread variable — Spring keeps the security context and transaction in one.
In a **thread pool** the threads never die, so a value you don't \`remove()\` stays reachable forever and
leaks into the next request handled by that thread — a memory leak *and* a security bug (the next
user sees the previous user's data). Always clear it in \`finally\`.

## How you are judged

Strong: separates visibility from atomicity; names happens-before edges; knows \`count++\` on a
volatile is broken. Weak: "synchronized everything", "volatile makes it thread-safe", or not knowing
that \`run()\` doesn't start a thread.`,
    workedExample: `**Question: "Two threads each call increment() 10,000 times. Fix this class — and justify every option."**

    class Counter {
        private int count;
        void increment() { count++; }
        int get() { return count; }
    }

**Step 1 — say what's wrong.** \`count++\` is three steps: read, add one, write. Thread A reads 41,
thread B reads 41, both write 42 — one increment lost. The final value is usually *less* than 20,000
and varies per run. Separately, \`get()\` from a third thread may see a stale value: no happens-before.

**Step 2 — reject the tempting wrong fix.** "Make it \`volatile\`." That fixes visibility only; the
read-add-write is still not atomic. Same lost updates.

**Step 3 — three correct fixes, with trade-offs.**

    // (a) synchronized — mutual exclusion + visibility
    synchronized void increment() { count++; }
    synchronized int get() { return count; }        // get must sync too, for visibility

    // (b) AtomicInteger — lock-free CAS loop
    private final AtomicInteger count = new AtomicInteger();
    void increment() { count.incrementAndGet(); }

    // (c) LongAdder — striped cells, best under heavy write contention
    private final LongAdder count = new LongAdder();
    void increment() { count.increment(); }
    long get() { return count.sum(); }               // sum is not an atomic snapshot

**Step 4 — choose.** "For a single counter I'd use \`AtomicInteger\`. If it's a hot metrics counter
hit by many threads and read rarely, \`LongAdder\`. If the counter must change together with another
field — say \`count\` and \`total\` for an average — I need a lock, because two atomics updated separately
can be observed half-updated."

**Step 5 — prove it.** Start two threads, \`join()\` both, assert 20,000. \`join\` also gives the
happens-before edge that makes the final read safe.`,
    mcqs: [
      mcq('A field is declared `volatile int pending;` and four threads each run `pending++` 1,000 times. What final value should you expect?', [
        ['Exactly 4,000, because volatile makes ++ atomic', false],
        ['Often below 4,000: volatile gives visibility, not atomic ++', true],
        ['Exactly 1,000, because each thread sees only its own copy', false],
        ['It does not compile: ++ is not allowed on a volatile', false],
      ], 'pending++ is a read, an add and a write. volatile makes each read and write visible to other threads but does not make the three steps indivisible, so concurrent increments can overwrite each other. Use AtomicInteger or a lock.'),
      mcq(`What is the problem with this lazy singleton?

    private static Config instance;           // not volatile
    static Config get() {
        if (instance == null) {
            synchronized (Config.class) {
                if (instance == null) instance = new Config();
            }
        }
        return instance;
    }`, [
        ['Two Config objects are always created on a multicore CPU', false],
        ['The synchronized block deadlocks if two threads enter get()', false],
        ['A thread may see a non-null but half-constructed Config', true],
        ['Nothing; the second null check makes it fully safe', false],
      ], 'The unsynchronized first read has no happens-before edge with the write, and the reference write may be reordered before the constructor\'s field writes. Declaring instance volatile, or using the holder-class idiom, fixes it.'),
      mcq('In a Spring Boot service, a developer calls `CompletableFuture.supplyAsync(() -> restClient.get()...)` for each of 200 blocking HTTP calls, with no executor argument. What is the main risk?', [
        ['Each call creates a new OS thread, exhausting memory', false],
        ['supplyAsync runs every task on the caller thread in order', false],
        ['The futures are garbage-collected before they complete', false],
        ['The blocking calls tie up the small shared commonPool', true],
      ], 'Without an executor, supplyAsync uses ForkJoinPool.commonPool(), sized to the CPU count and shared by the whole JVM including parallel streams. Blocking I/O parks those few threads; pass a dedicated executor (or use virtual threads on Java 21).'),
    ],
    checkpoint: [
      ck('JAVA_CONCURRENCY', `Thread A runs the loop; thread B later sets the flag. On a JIT-compiled JVM, what can happen?

    class Worker {
        boolean stop = false;
        void loop() { while (!stop) { /* no calls, no locks */ } }
    }`, [
        ['A sees the change within one loop iteration, as fields are shared', false],
        ['A may spin forever, as nothing orders B\'s write before A\'s read', true],
        ['B\'s write throws IllegalMonitorStateException without a lock', false],
        ['A exits, but only after the next garbage collection runs', false],
      ], 'With no happens-before edge the JIT may hoist the read of stop out of the loop, so A never sees B\'s write. Declaring stop volatile (or using an AtomicBoolean) creates the edge and guarantees visibility.'),
      ck('JAVA_CONCURRENCY', `What does this print, and how many threads run the task?

    Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()), "worker");
    t.run();`, [
        ['worker — the task runs on the new thread named worker', false],
        ['Nothing, because run() only schedules the thread', false],
        ['main — run() executes the task on the calling thread', true],
        ['IllegalThreadStateException, since start() was skipped', false],
      ], 'Calling run() directly is an ordinary method call: the Runnable executes on the current (main) thread and no new thread is ever started. Only start() asks the JVM to create a thread that then invokes run().'),
      ck('JAVA_CONCURRENCY', 'Two transfer threads deadlock: one locks account 7 then 9, the other locks 9 then 7. Which change removes the deadlock without a global lock?', [
        ['Make both account balance fields volatile', false],
        ['Always lock the account with the lower id first', true],
        ['Call Thread.yield() between the two lock calls', false],
        ['Replace synchronized with a fair ReentrantLock', false],
      ], 'Deadlock needs a cycle in lock acquisition. Ordering locks globally (by id) means both threads try account 7 first, so one waits before holding anything and the cycle cannot form. volatile, yield and fairness do not break the cycle.'),
    ],
  },

  /* ── IV_EXCEPTIONS_JVM ──────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_IV_EXCEPTIONS_JVM',
    notes: `This set mixes two things interviewers often ask together: exception design (a design-sense
question) and JVM memory (a "do you know what's under the hood" question). Both end with "have you
ever debugged one in your project?" — have a story ready.

## Q1. "Checked vs unchecked — and which should my code throw?"

**Strong answer.** Checked exceptions (\`Exception\` but not \`RuntimeException\`) must be caught or
declared: \`IOException\`, \`SQLException\`. Unchecked (\`RuntimeException\` and subclasses) need not be.
\`Error\` (\`OutOfMemoryError\`, \`StackOverflowError\`) is for JVM-level problems you don't catch. Design
rule: checked for **recoverable conditions the caller can reasonably act on**; unchecked for
**programming errors** and for most business errors in a Spring app. Spring itself translates
\`SQLException\` into unchecked \`DataAccessException\`, and \`@Transactional\` by default **rolls back
only on unchecked exceptions** — a checked exception commits unless you set \`rollbackFor\`.

**Follow-up:** "Why do people dislike checked exceptions?" — they leak implementation (\`throws
SQLException\` through every layer), they don't compose with lambdas (\`Function.apply\` declares no
checked exception), and they encourage empty catch blocks.

## Q2. "What does this return?"

    static int code() {
        try { return 1; }
        finally { return 2; }
    }        // 2

**Strong answer.** \`finally\` runs after the \`return 1\` value is computed but before the method
returns; a \`return\` in \`finally\` **replaces** it — and also **swallows any exception** thrown in try.
Never return from finally. Variant: \`int x = 1; try { return x; } finally { x = 5; }\` returns **1** —
the value was already saved.

## Q3. "What is try-with-resources and what are suppressed exceptions?"

**Strong answer.** \`try (var in = ...; var out = ...) { }\` closes every \`AutoCloseable\` automatically,
in **reverse order of declaration**, even on exception. If the body throws and \`close()\` also throws,
the body's exception propagates and the close exception is attached via \`addSuppressed\` — read it
with \`getSuppressed()\`. The old try/finally pattern lost the original exception. Java 9 lets you use
an effectively final variable: \`try (conn) { ... }\`.

## Q4. "Exception handling best practices — what do you do in a REST API?"

**Strong answer.** Throw specific unchecked exceptions from the service (\`OrderNotFoundException\`);
map them in one \`@RestControllerAdvice\` to a status code and an error body; log once, at the boundary,
with the stack trace; never \`catch (Exception e) {}\`; never use exceptions for normal control flow;
preserve the cause when wrapping (\`new ServiceException("...", e)\`). Catch \`Throwable\` only at the very
top, if at all.

## Q5. "Heap vs stack?"

**Strong answer.** Each thread has its own **stack** of frames: local primitives and references, and
the operand stack — freed when the method returns, no GC needed. Objects live on the shared **heap**,
managed by the GC. Deep or infinite recursion → \`StackOverflowError\` (default ~512 KB–1 MB per
thread, \`-Xss\`). Heap full and GC can't free enough → \`OutOfMemoryError: Java heap space\` (\`-Xmx\`).
Class metadata lives in **Metaspace** (native memory) since **Java 8**, replacing PermGen. (The JIT
may use *escape analysis* to avoid allocating objects that never leave a method — an optimisation, not
a rule you can rely on.)

## Q6. "How does garbage collection decide what to free? What are GC roots?"

**Strong answer.** Java uses **reachability**, not reference counting: anything reachable from a GC
root by a chain of strong references is live; the rest is garbage — so **cycles are collected**. GC
roots: local variables and operands on the stacks of **live threads**; **static fields** of loaded
classes; JNI references; monitors held by synchronized; the threads themselves. Generational
hypothesis: most objects die young, so the heap is split into young (eden + survivors, collected
often and cheaply) and old. Default collector: **G1** since Java 9 (Parallel in Java 8); **ZGC** and
Shenandoah for very low pause times.

**Follow-up:** "Can you force a GC?" — \`System.gc()\` is only a hint.

## Q7. "Can Java have memory leaks? Give real examples."

**Strong answer.** Yes — a leak in Java is an object that is **still reachable but never used again**:

- a \`static Map\` used as a cache with no eviction;
- \`ThreadLocal\` values never removed in a thread pool;
- listeners/callbacks registered and never unregistered;
- a non-static inner class or lambda holding the outer object alive;
- keys mutated after insertion into a HashSet — unremovable;
- unclosed streams, connections, \`ResultSet\`s (native resources too).

**How to find it:** the heap grows after every full GC; take a heap dump
(\`-XX:+HeapDumpOnOutOfMemoryError\`, or \`jcmd <pid> GC.heap_dump\`) and open it in Eclipse MAT — look
at the **dominator tree** and the path to GC roots.

## Q8. "Strong, soft, weak, phantom references?"

**Strong answer.** Strong: normal; never collected while reachable. **Soft**: cleared only under memory
pressure — memory-sensitive caches. **Weak**: cleared at the next GC once only weakly reachable —
\`WeakHashMap\` keys, canonicalising maps. **Phantom**: for post-mortem cleanup via a
\`ReferenceQueue\` (what \`Cleaner\` uses).

## Q9. "What happens when you catch StackOverflowError or OutOfMemoryError?"

**Strong answer.** You can catch them (they're \`Throwable\`s), but the JVM may be in an inconsistent
state — partially updated objects, a thread killed mid-operation. Log and let the process restart;
in a container, set \`-XX:+ExitOnOutOfMemoryError\` so the orchestrator replaces it.

## How you are judged

Strong: knows the \`@Transactional\` rollback rule, explains leaks as "reachable but unused", names G1
and Metaspace with versions, has used a heap dump. Weak: "Java has no memory leaks because of GC",
"finally always returns its own value safely", or catching \`Exception\` everywhere.`,
    mcqs: [
      mcq(`What does this method return?

    static int attempts() {
        int n = 3;
        try {
            return n;
        } finally {
            n = 10;
        }
    }`, [
        ['10, because finally runs before the method returns', false],
        ['3, because the return value was saved before finally', true],
        ['13, because finally adds to the pending return value', false],
        ['It does not compile: n is modified after return', false],
      ], 'return n evaluates and stores 3 before finally runs. Changing the local n inside finally does not touch that saved value. Only a return statement inside finally would replace it — which is why returning from finally is banned in good style.'),
      mcq('A @Transactional service method saves an order, then throws `new IOException("mail failed")` (a checked exception), with no rollbackFor set. What happens to the saved order?', [
        ['It is committed: by default only unchecked exceptions roll back', true],
        ['It is rolled back, since every exception aborts a transaction', false],
        ['It stays pending until the next transaction commits it', false],
        ['Spring wraps the exception and always rolls back the save', false],
      ], 'Spring\'s default rollback rule is RuntimeException and Error only. A checked exception propagates but the transaction commits. Add @Transactional(rollbackFor = Exception.class), or throw an unchecked exception.'),
      mcq('A Spring Boot service\'s heap rises after every full GC until OutOfMemoryError. The heap dump shows a `static Map<String, Report>` holding 2 million entries. What is the leak?', [
        ['The GC cannot collect objects stored in a HashMap', false],
        ['Report objects reference each other in a cycle', false],
        ['A static field is a GC root, so the cached entries stay live', true],
        ['The Map was allocated in Metaspace instead of the heap', false],
      ], 'Static fields are GC roots, so everything reachable from that map is live forever. Without eviction the cache only grows. Cycles are not the problem — Java\'s tracing GC collects unreachable cycles; bound the cache or use Caffeine with a size limit.'),
    ],
    checkpoint: [
      ck('JAVA_EXCEPTIONS', `What is printed?

    class Res implements AutoCloseable {
        String n; Res(String n) { this.n = n; }
        public void close() { System.out.print("close-" + n + " "); }
    }
    try (Res a = new Res("a"); Res b = new Res("b")) {
        System.out.print("body ");
        throw new IllegalStateException("x");
    } catch (IllegalStateException e) {
        System.out.print("catch");
    }`, [
        ['body catch close-a close-b ', false],
        ['body close-a close-b catch', false],
        ['body catch close-b close-a ', false],
        ['body close-b close-a catch', true],
      ], 'Resources are closed in reverse order of declaration and before the catch block runs: b first, then a. Only then does control reach catch, so "catch" is printed last.'),
      ck('JAVA_EXCEPTIONS', `What does a caller of load() receive?

    static String load() {
        try {
            throw new RuntimeException("db down");
        } finally {
            return "cached";
        }
    }`, [
        ['The RuntimeException "db down"', false],
        ['The string "cached", with the exception lost', true],
        ['A compile error: finally cannot contain return', false],
        ['"cached" and the exception added as suppressed', false],
      ], 'A return in finally completes the method normally and discards the pending exception — it is not even recorded as suppressed. That silent loss is exactly why returning from finally is treated as a bug.'),
      ck('JAVA_EXCEPTIONS', 'Which object is NOT kept alive merely by being referenced from a GC root?', [
        ['An object held in a static List of a loaded class', false],
        ['An object referenced by a local variable in a running thread', false],
        ['An object referenced only as a key of a WeakHashMap', true],
        ['A value stored in a ThreadLocal of a pooled thread', false],
      ], 'WeakHashMap holds its keys through weak references, so a key reachable only from there is cleared at the next GC. Static fields, live thread stacks and a pooled thread\'s ThreadLocalMap values are all strong paths from GC roots.'),
    ],
  },

  /* ── RAPID_FIRE ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_RAPID_FIRE',
    notes: `A screening call: thirty questions in about ten minutes. The interviewer wants a correct,
one-line answer — not an essay. Cover the answer, say yours out loud, then check.

## Language and JVM

1. **Default capacity and load factor of HashMap?** — 16 and 0.75; resizes when size exceeds 12.
2. **Integer cache range?** — -128 to 127 (upper bound tunable with \`-XX:AutoBoxCacheMax\`).
3. **Where is the string pool since Java 7?** — In the main heap (it was in PermGen).
4. **What replaced PermGen in Java 8?** — Metaspace, in native memory.
5. **Default GC since Java 9?** — G1.
6. **What does \`"a" + "b" == "ab"\` give?** — true; javac folds the constant.
7. **Can \`var\` be used for a field?** — No, only local variables (and lambda/for variables).
8. **Size of an \`int\` and a \`long\`?** — 32 and 64 bits, on every platform.
9. **\`char\` signed or unsigned?** — Unsigned 16-bit.
10. **What is \`Math.abs(Integer.MIN_VALUE)\`?** — Still \`Integer.MIN_VALUE\` — it overflows.

## OOP

11. **Can you override a static method?** — No, it is hidden; the call binds to the declared type.
12. **Can you override a private method?** — No; a same-named subclass method is a new method.
13. **Can a constructor be final?** — No; constructors are not inherited.
14. **Can an interface have a private method?** — Yes, since Java 9.
15. **Can a record extend a class?** — No; it implicitly extends \`java.lang.Record\`.
16. **Which keyword limits a class's subclasses to a list?** — \`sealed\` with \`permits\` (Java 17).
17. **Is \`Object.equals\` the same as \`==\`?** — Yes, until a class overrides it.

## Collections

18. **When does a HashMap bin become a tree?** — 8 nodes in the bin and table capacity ≥ 64.
19. **Does HashMap allow a null key?** — One, stored in bin 0. ConcurrentHashMap allows none.
20. **ArrayList growth factor?** — 1.5×.
21. **What does \`List.of(...).add(x)\` throw?** — \`UnsupportedOperationException\`.
22. **Does \`List.of\` accept null?** — No, NullPointerException.
23. **What does TreeMap use for key equality?** — \`compareTo\` or the comparator, not \`equals\`.
24. **Best class for a stack or queue?** — \`ArrayDeque\`.

## Streams and Java 8+

25. **Does \`peek\` run without a terminal operation?** — No; streams are lazy.
26. **\`orElse\` vs \`orElseGet\`?** — \`orElse\` always evaluates its argument; \`orElseGet\` only when empty.
27. **Can a stream be reused?** — No, IllegalStateException.

## Concurrency and exceptions

28. **Does volatile make \`count++\` atomic?** — No; it gives visibility and ordering only.
29. **Does \`sleep\` release a monitor?** — No; \`wait\` does.
30. **Does \`@Transactional\` roll back on a checked exception by default?** — No, only unchecked.

**Scoring a screening call:** 25+ correct and quick is a pass; hesitation is fine, a wrong "fact"
said confidently is what is noted.`,
    mcqs: [
      mcq('Rapid fire: "What does Math.abs(Integer.MIN_VALUE) return?"', [
        ['Integer.MAX_VALUE, the closest positive int value', false],
        ['Integer.MIN_VALUE, because the result overflows', true],
        ['2147483648, promoted to a long automatically', false],
        ['It throws an ArithmeticException on overflow', false],
      ], 'The int range is -2147483648 to 2147483647, so +2147483648 cannot be represented; negation wraps back to MIN_VALUE. Math.absExact (Java 15) throws ArithmeticException instead.'),
      mcq('Rapid fire: "Since which version can an interface declare a private method?"', [
        ['Java 8, alongside default methods', false],
        ['Java 11, the first LTS release after Java 8', false],
        ['Java 17, together with sealed types', false],
        ['Java 9, to share code between defaults', true],
      ], 'Java 8 added default and static interface methods; Java 9 added private (and private static) methods so that several defaults can share a helper without exposing it as part of the interface.'),
      mcq('Rapid fire: "What is the default garbage collector on Java 17?"', [
        ['G1, the default since Java 9', true],
        ['Parallel GC, the throughput collector', false],
        ['ZGC, the default since Java 15', false],
        ['CMS, the concurrent mark-sweep collector', false],
      ], 'G1 became the default in Java 9, replacing Parallel. ZGC became production-ready in Java 15 but must be selected with -XX:+UseZGC; CMS was removed in Java 14.'),
      mcq('Rapid fire: "Is Java\'s char type signed?"', [
        ['Yes, an 8-bit signed byte as in C', false],
        ['Yes, a 16-bit signed integer type', false],
        ['No, it is a 16-bit unsigned UTF-16 code unit', true],
        ['No, it is a 32-bit Unicode code point', false],
      ], 'char is an unsigned 16-bit type holding a UTF-16 code unit, range 0 to 65535. Characters outside the Basic Multilingual Plane, such as most emoji, need two chars (a surrogate pair).'),
      mcq('Rapid fire: "When HashMap.put receives a key, which existing keys does it call equals on?"', [
        ['Every key in the table, one by one', false],
        ['Keys in its own bin whose hash matches', true],
        ['None; it compares the hash codes and nothing else', false],
        ['Only keys stored in a treeified bin', false],
      ], 'HashMap first selects the bin from the spread hash, then within that bin checks hash equality before calling equals (and short-circuits on ==). Comparing only hashes would merge distinct keys that collide.'),
      mcq('Rapid fire: "What does Thread.sleep(1000) do to locks the thread holds?"', [
        ['It releases them and re-acquires them after waking', false],
        ['It releases only the monitor of the current object', false],
        ['It throws IllegalMonitorStateException if one is held', false],
        ['Nothing — the thread keeps every lock while it sleeps', true],
      ], 'sleep pauses the thread without touching its monitors, so other threads needing those locks stay blocked. Object.wait() is the call that releases the monitor it is invoked on.'),
    ],
  },

  /* ── MOCK ───────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_MOCK',
    notes: `This is the interviewer's script for a 35-minute Core Java round at a product company or the
technical round of a service company's digital/premium hiring. Do it with a friend reading the
interviewer's lines, or record yourself. The scoring notes are what a real panel writes down.

## Opening (2 min)

"Tell me which Java version you used in your capstone, and one Java feature newer than Java 8 you
actually used."

- **Strong:** "Java 17. I used records for my DTOs — \`record OrderResponse(Long id, String status,
  BigDecimal total)\` — and switch expressions in the status mapper."
- **OK:** names Java 17, vague on features.
- **Weak:** "Java 8" with no reason, or names a feature and can't show a line of it.

## Q1. String and equality (4 min)

"What does \`new String("hi") == "hi"\` print? Why? When does \`==\` on strings return true?"
**Follow-up:** "Why is String immutable — give me the security reason."

- **Strong:** false; new heap object vs pooled literal; true for literals and compile-time constants
  and after \`intern()\`; security — validated values can't change after the check.
- **Weak:** "true because the content is the same."

## Q2. OOP trace (5 min)

Show the constructor-calls-overridable-method code (a subclass field read in an override called from
the parent constructor). "What happens?" **Follow-up:** "How would you fix it?"

- **Strong:** traces construction order, predicts null/0 or NPE, fixes with final/private or by not
  calling it.
- **OK:** gets the output after prompting.
- **Weak:** assumes subclass fields initialise first.

## Q3. HashMap internals (6 min)

"Explain how HashMap stores an entry. When does it resize? What changed in Java 8?"
**Follow-up 1:** "What happens if I override equals but not hashCode?"
**Follow-up 2:** "I mutate a field used in hashCode after putting the object in a HashSet. Now what?"

- **Strong:** draws the table; spread hash, \`(n-1) & hash\`, 16/0.75/12, doubling, treeify at 8 with
  capacity 64; explains the lost-in-wrong-bin effect for both follow-ups.
- **OK:** buckets and equals/hashCode, no numbers.
- **Weak:** "it uses hashing", or says HashMap is thread-safe.

## Q4. Streams (4 min)

"Without running it, tell me exactly what this prints:"

    Stream.of("aa", "b", "cccc", "dd")
          .filter(s -> { System.out.println("F " + s); return s.length() > 1; })
          .map(s -> { System.out.println("M " + s); return s.toUpperCase(); })
          .limit(2)
          .forEach(s -> System.out.println("E " + s));

Answer: \`F aa, M aa, E AA, F b, F cccc, M cccc, E CCCC\` — vertical processing, \`b\` dies at the filter,
\`limit(2)\` short-circuits so \`dd\` is never read.

- **Strong:** exact order. **OK:** right elements, wrong order (horizontal). **Weak:** prints all of
  F first, or includes \`dd\`.

## Q5. Concurrency (6 min)

"A \`volatile int\` counter is incremented by 10 threads. Is it correct? Fix it two ways."
**Follow-up:** "What is happens-before? Give me two edges."

- **Strong:** no — visibility not atomicity; AtomicInteger / synchronized (and LongAdder); edges:
  monitor unlock→lock, volatile write→read, start, join.
- **Weak:** "volatile makes it thread-safe."

## Q6. Exceptions (4 min)

"Checked or unchecked for a \`PaymentDeclinedException\` in your Spring service — and why?"
**Follow-up:** "What does \`@Transactional\` do if a checked exception is thrown?"

- **Strong:** unchecked, handled in \`@RestControllerAdvice\`; knows the default commit on checked
  exceptions and \`rollbackFor\`.
- **Weak:** "always catch Exception and log it."

## Q7. JVM memory (4 min)

"Your service's memory keeps growing until it crashes. How do you investigate?"

- **Strong:** confirm growth after full GCs (a leak, not just a big heap), heap dump, MAT dominator
  tree and path to GC roots; names likely causes (static cache, ThreadLocal, listeners).
- **Weak:** "increase -Xmx" as the whole answer.

## Whiteboard task (5 min)

"Write a thread-safe, size-bounded LRU cache of \`String\` to \`String\`."

- **Strong:** \`LinkedHashMap\` with access order and \`removeEldestEntry\`, wrapped with synchronized
  methods; mentions that \`get\` mutates order so even reads need the lock; mentions Caffeine for
  production.
- **OK:** correct LRU, forgets thread safety or that \`get\` reorders.
- **Weak:** a HashMap with no eviction order.

## Scoring

Hire bar: strong on Q3 and Q5, at least OK everywhere else, and the whiteboard task correct. One
confident wrong fact ("HashMap is synchronized", "volatile is atomic") outweighs two OK answers.`,
    mcqs: [
      mcq(`In the mock's stream question, what is the full output?

    Stream.of("aa", "b", "cccc", "dd")
          .filter(s -> { System.out.println("F " + s); return s.length() > 1; })
          .map(s -> { System.out.println("M " + s); return s.toUpperCase(); })
          .limit(2)
          .forEach(s -> System.out.println("E " + s));`, [
        ['F aa, F b, F cccc, F dd, M aa, M cccc, M dd, E AA, E CCCC', false],
        ['F aa, M aa, E AA, F b, F cccc, M cccc, E CCCC', true],
        ['F aa, M aa, E AA, F b, M b, E B', false],
        ['F aa, M aa, E AA, F b, F cccc, M cccc, E CCCC, F dd', false],
      ], 'Each element flows through the pipeline before the next is pulled. "b" is rejected at the filter, and once limit(2) has passed two elements it short-circuits, so "dd" is never read from the source.'),
      mcq('In the whiteboard task, a candidate builds the LRU cache from a LinkedHashMap with accessOrder = true and makes only put() synchronized. Why does the panel mark it down?', [
        ['get() reorders the linked list, so unsynchronized reads race too', true],
        ['LinkedHashMap cannot evict, so the cache is not size-bounded', false],
        ['synchronized cannot be used on a method of a generic class', false],
        ['accessOrder must be false for an LRU, so eviction is wrong', false],
      ], 'With access order, get() moves the entry to the tail of the internal linked list — a structural change. Concurrent unsynchronized gets can corrupt that list, so every method that touches the map must hold the same lock.'),
      mcq('For Q7, the candidate says "I would just increase -Xmx to 8 GB." Why does that score as weak?', [
        ['-Xmx cannot be changed for a Spring Boot application', false],
        ['A larger heap always makes garbage collection slower', false],
        ['Metaspace, not the heap, is what -Xmx actually sizes', false],
        ['A true leak still fills a larger heap; it only buys time', true],
      ], 'If memory still grows after full GCs, objects stay reachable. More heap delays the crash but does not find the reference holding them — a heap dump and the path to GC roots does.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_IV_CORE_JAVA_CHECKPOINT',
    notes: `Ten questions across the whole topic — strings and the JVM, OOP dispatch, HashMap and
collections, streams and Optional, the memory model, and exceptions. Each is the kind of code an
interviewer slides across the table. Read the code fully before you answer; the traps are in the
details (a missing \`final\`, a mutated key, an eager argument).`,
    checkpoint: [
      ck('JAVA_BASICS', `What does this print?

    final String env = "prod";
    String host = "prod-db";
    String built = env + "-db";
    StringBuilder sb = new StringBuilder("prod-db");
    System.out.println((host == built) + " " + host.equals(sb));`, [
        ['false false', false],
        ['true true', false],
        ['false true', false],
        ['true false', true],
      ], 'env is a final constant, so env + "-db" is folded at compile time to the pooled literal, making host == built true. String.equals returns false for any non-String argument, including a StringBuilder with the same characters — use contentEquals.'),
      ck('JAVA_OOP', `What does this print?

    class Account { String type = "base"; String type() { return type; } }
    class Savings extends Account { String type = "savings"; @Override String type() { return type; } }

    Account a = new Savings();
    System.out.println(a.type + " " + a.type());`, [
        ['savings savings', false],
        ['base savings', true],
        ['base base', false],
        ['savings base', false],
      ], 'Field access is resolved from the declared type Account, so a.type reads the hidden parent field "base". The method call dispatches on the runtime type, so Savings.type() returns its own field "savings".'),
      ck('JAVA_COLLECTIONS', `What does this print?

    class Key {
        int id;
        Key(int id) { this.id = id; }
        @Override public boolean equals(Object o) { return o instanceof Key k && k.id == id; }
        @Override public int hashCode() { return id; }
    }
    Map<Key, String> m = new HashMap<>();
    Key k = new Key(1);
    m.put(k, "one");
    k.id = 2;
    System.out.println(m.get(new Key(1)) + " " + m.get(k));`, [
        ['one one', false],
        ['null one', false],
        ['one null', false],
        ['null null', true],
      ], 'The entry sits in the bin for hash 1, but its key now has id 2. new Key(1) finds the right bin yet fails equals (ids 1 and 2); k looks in the bin for hash 2, which is empty. The entry is unreachable — a classic mutable-key leak.'),
      ck('JAVA_COLLECTIONS', 'You insert 100 entries into `new HashMap<>(100)`. How many times does the table resize during the inserts?', [
        ['None, because 100 slots were requested', false],
        ['Once, from 128 bins to 256', true],
        ['Twice, from 16 to 64 and then to 128', false],
        ['Three times, doubling from 16 each time', false],
      ], 'HashMap rounds the requested capacity up to a power of two, 128, giving a threshold of 96. Entry 97 exceeds it and the table doubles to 256. To avoid any resize you would request about 100 / 0.75 = 134, or use HashMap.newHashMap(100) on Java 19+.'),
      ck('JAVA_STREAMS', `How many times is lookup() called?

    List<String> ids = List.of("u1", "u2", "u3", "u4");
    Optional<String> hit = ids.stream()
        .map(id -> lookup(id))            // returns null for u1, a name otherwise
        .filter(Objects::nonNull)
        .findFirst();`, [
        ['2', true],
        ['4', false],
        ['1', false],
        ['3', false],
      ], 'Processing is element by element. u1 is looked up and filtered out; u2 is looked up, passes the filter, and findFirst short-circuits. u3 and u4 are never pulled from the source.'),
      ck('JAVA_STREAMS', `What happens?

    Map<String, Long> counts = Stream.of("a", "b", "a")
        .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
    Optional<Long> c = Optional.of(counts.get("z"));
    System.out.println(c.isPresent());`, [
        ['It prints false, because get returned null for "z"', false],
        ['It prints true, because Optional wraps the null value', false],
        ['It prints false, since groupingBy adds "z" with count 0', false],
        ['A NullPointerException from Optional.of(null)', true],
      ], 'counts.get("z") returns null, and Optional.of rejects null with a NullPointerException. Optional.ofNullable(counts.get("z")) would give an empty Optional; counts.getOrDefault("z", 0L) avoids the Optional altogether.'),
      ck('JAVA_CONCURRENCY', `Is this counter correct when called from many threads?

    private final Map<String, Integer> hits = new ConcurrentHashMap<>();
    void record(String page) {
        Integer old = hits.get(page);
        hits.put(page, old == null ? 1 : old + 1);
    }`, [
        ['Yes, every ConcurrentHashMap method is thread-safe', false],
        ['No, the get then put sequence can lose updates', true],
        ['No, ConcurrentHashMap throws on concurrent put', false],
        ['Yes, as long as the page keys are interned strings', false],
      ], 'Each call is atomic on its own, but two threads can both read 5 and both write 6. hits.merge(page, 1, Integer::sum) performs the read-modify-write atomically for the key.'),
      ck('JAVA_CONCURRENCY', 'Thread A writes `data = 42;` then `ready = true;` where only `ready` is volatile. Thread B reads `ready` as true, then reads `data`. What value of data is B guaranteed to see?', [
        ['42, since the volatile write orders the earlier write too', true],
        ['No guarantee; only ready itself is made visible', false],
        ['42, but only if data is also declared final', false],
        ['0, because non-volatile fields are cached per thread', false],
      ], 'A volatile write happens-before every later read that sees it, and program order puts data = 42 before that write. So B, having read ready == true, must see 42 — this piggybacking on a volatile flag is the standard safe-publication pattern.'),
      ck('JAVA_EXCEPTIONS', `What is the outcome?

    try (var conn = dataSource.getConnection()) {   // close() will throw SQLException("close")
        throw new IllegalArgumentException("bad id");
    }`, [
        ['SQLException "close" propagates and the other is lost', false],
        ['IllegalArgumentException propagates; "close" is suppressed', true],
        ['Both are thrown, one after the other, to the caller', false],
        ['IllegalArgumentException propagates; "close" is discarded', false],
      ], 'try-with-resources keeps the body\'s exception as primary and attaches the exception from close() via addSuppressed, where e.getSuppressed() can read it. The older try/finally pattern was the one that lost the original exception.'),
      ck('JAVA_EXCEPTIONS', `A Tomcat request thread runs this for every request. What goes wrong over a day of traffic?

    static final ThreadLocal<List<String>> AUDIT = ThreadLocal.withInitial(ArrayList::new);
    void handle(Request r) {
        AUDIT.get().add(r.path());
        process(r);
    }`, [
        ['Nothing: ThreadLocal values are freed when each request ends', false],
        ['Each request gets a fresh list, so the memory use stays flat', false],
        ['The lists grow without bound and leak data between requests', true],
        ['It throws IllegalStateException once the pool reuses a thread', false],
      ], 'Pool threads live for the life of the server, so each thread\'s list is reachable from a GC root and is never cleared — it grows with every request and the next request sees earlier paths. Call AUDIT.remove() in a finally block.'),
    ],
  },
];
