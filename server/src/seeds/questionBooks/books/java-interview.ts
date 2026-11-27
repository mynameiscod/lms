import { SeedBook, Y2 } from '../types';

const book: SeedBook = {
  slug: 'java-interview',
  title: 'Java Interview Questions',
  kind: 'topic',
  subject: 'Java',
  description: `The Java questions freshers face most: JVM basics, OOP, Strings, collections, exceptions, threads and Java 8 features, with clear answers and short code examples.`,
  color: '#c2410c',
  emblem: '☕',
  audience: 'all',
  stages: Y2,
  tracks: [],
  order: 60,
  chapters: [
    {
      title: `Java basics and JVM`,
      questions: [
        {
          q: `What is the difference between JDK, JRE and JVM?`,
          a: `- **JVM (Java Virtual Machine)** runs Java bytecode. It loads classes, verifies them, manages memory and executes the code. Each operating system has its own JVM.
- **JRE (Java Runtime Environment)** = JVM + the core class libraries (like \`java.lang\`, \`java.util\`). It is what you need to **run** a Java program.
- **JDK (Java Development Kit)** = JRE + development tools such as the compiler \`javac\`, the debugger, \`javadoc\` and \`jar\`. It is what you need to **write and compile** Java programs.

So the relationship is: **JDK ⊃ JRE ⊃ JVM**. A developer installs the JDK; a machine that only runs Java apps needs just a runtime. (Since Java 11, Oracle no longer ships a separate JRE download, but the concept is still asked.)`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
          tip: `Draw three nested boxes on paper while answering. It shows clear understanding in seconds.`,
        },
        {
          q: `Why is Java called platform independent?`,
          a: `Java source code is not compiled into machine code for one processor. Instead, \`javac\` compiles it into **bytecode** (\`.class\` files), which is the same on every system.

That bytecode is run by the **JVM**, and there is a JVM for Windows, Linux, macOS and so on. Each JVM translates the same bytecode into the native instructions of its own machine.

\`\`\`text
Hello.java --javac--> Hello.class (bytecode) --> JVM on Windows / Linux / Mac
\`\`\`

This is the idea of **"Write Once, Run Anywhere"**. Note the fine point: the Java *program* is platform independent, but the **JVM itself is platform dependent**, because each OS needs its own JVM build.`,
          d: 'easy',
          at: 'TCS, Accenture, Cognizant',
          tip: `Always add that the JVM itself is platform dependent. Interviewers love that follow-up.`,
        },
        {
          q: `Explain the signature public static void main(String[] args).`,
          a: `This is the entry point the JVM looks for when it starts a program.

- **public** - the JVM must be able to call it from outside the class.
- **static** - the JVM calls it without creating an object of the class.
- **void** - it returns nothing to the JVM (use \`System.exit(code)\` to return a status).
- **main** - the fixed name the JVM searches for.
- **String[] args** - command-line arguments passed when running the program.

\`\`\`java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Args: " + args.length);
    }
}
\`\`\`

Valid variations: \`String... args\`, \`String args[]\`, and changing the order to \`static public\`. If \`static\` or \`public\` is missing, the code compiles but fails at runtime because the JVM cannot find a proper main method. You can overload \`main\`, but the JVM only calls this exact signature.`,
          d: 'easy',
          at: 'Infosys, Capgemini',
        },
        {
          q: `What does the static keyword mean in Java?`,
          a: `\`static\` means the member belongs to the **class**, not to any one object. There is only one copy, shared by all objects.

- **Static variable** - one shared value, e.g. a counter of objects created.
- **Static method** - called using the class name; it cannot use \`this\` or access instance fields directly.
- **Static block** - runs once when the class is loaded, used for setup.
- **Static nested class** - a nested class that does not need an outer object.

\`\`\`java
class Student {
    static int count = 0;   // shared
    String name;            // per object
    Student(String name) { this.name = name; count++; }
    static int getCount() { return count; }
}
// Student.getCount() works without creating an object
\`\`\`

Static members are useful for utility methods (like \`Math.max\`) and constants (\`static final\`).`,
          d: 'medium',
          at: 'Wipro, HCL',
          tip: `Mention that static methods cannot be overridden, only hidden. It links nicely to OOP questions.`,
        },
        {
          q: `What is the difference between final, finally and finalize?`,
          a: `They only sound alike; they are unrelated.

- **final** (keyword): a \`final\` variable cannot be reassigned, a \`final\` method cannot be overridden, and a \`final\` class cannot be extended (e.g. \`String\`).
- **finally** (block): used with \`try\`/\`catch\`. It **always runs**, whether an exception occurs or not, so it is used for cleanup like closing files. (It is skipped only if the JVM stops, e.g. \`System.exit()\`.)
- **finalize()** (method): was called by the garbage collector before destroying an object. It is unreliable and **deprecated since Java 9**; use try-with-resources or \`Cleaner\` instead.

\`\`\`java
final int max = 10;
try {
    int x = 5 / 0;
} catch (ArithmeticException e) {
    System.out.println("Error");
} finally {
    System.out.println("Always runs");
}
\`\`\``,
          d: 'medium',
          at: 'TCS, Cognizant, Tech Mahindra',
        },
        {
          q: `What is the difference between stack and heap memory? How does garbage collection work?`,
          a: `- **Stack**: each thread has its own stack. It stores method calls, local variables and object references. Memory is freed automatically when a method returns. It is small and fast; too deep recursion gives \`StackOverflowError\`.
- **Heap**: shared by all threads. All **objects** (created with \`new\`) live here. When it is full you get \`OutOfMemoryError\`.

\`\`\`java
void demo() {
    int a = 10;                 // stack
    Student s = new Student();  // s on stack, object on heap
}
\`\`\`

**Garbage collection (GC)** automatically frees heap objects that are no longer **reachable** from any live reference (stack variables, static fields and so on). Most JVMs divide the heap into a **young generation** (new objects, collected often) and an **old generation** (long-lived objects). You can request GC with \`System.gc()\`, but the JVM decides when it actually runs.`,
          d: 'medium',
          at: 'Accenture, Capgemini',
        },
        {
          q: `Explain the JVM architecture. What is the JIT compiler?`,
          a: `The JVM has three main parts:

1. **Class loader subsystem** - loads \`.class\` files. It works in a hierarchy: Bootstrap loader (core Java classes), Platform/Extension loader, and Application loader (your classes). It also **links** (verifies bytecode, prepares static fields) and **initializes** classes.
2. **Runtime data areas** - Method area/Metaspace (class info, static data), Heap (objects), Java stacks (one per thread), PC registers, and native method stacks.
3. **Execution engine** - the **interpreter**, the **JIT compiler** and the **garbage collector**.

The interpreter runs bytecode line by line, which is slow for code that repeats. The **JIT (Just-In-Time) compiler** watches which methods run often ("hot spots") and compiles them into native machine code at runtime. Later calls run that native code directly, which is why Java programs get faster after warming up. This is how Java achieves near-native speed while keeping bytecode portable.`,
          d: 'hard',
          at: 'Amazon, Oracle, Zoho',
        },
        {
          q: `Is Java pass by value or pass by reference?`,
          a: `Java is **always pass by value**. For objects, the value that is copied is the **reference** (the address), not the object itself.

So a method can **change the object's contents** through the copied reference, but it **cannot make the caller's variable point to a new object**.

\`\`\`java
static void change(StringBuilder sb) {
    sb.append(" World");      // modifies the same object
    sb = new StringBuilder("New"); // only the local copy changes
}

public static void main(String[] args) {
    StringBuilder s = new StringBuilder("Hello");
    change(s);
    System.out.println(s); // Hello World
}
\`\`\`

For primitives, the value itself is copied, so changes inside the method never affect the caller. A classic proof: a \`swap(a, b)\` method on two objects does not swap them for the caller.`,
          d: 'hard',
          at: 'Amazon, Infosys (Power Programmer)',
          tip: `Say "pass by value of the reference" and back it up with the swap example.`,
        },
      ],
    },
    {
      title: `OOP in Java`,
      questions: [
        {
          q: `What are the four pillars of OOP? Explain with Java examples.`,
          a: `1. **Encapsulation** - keep data private and expose it through methods. Example: \`private double balance\` with \`deposit()\` and \`getBalance()\`.
2. **Inheritance** - a class reuses another class using \`extends\`. Example: \`class Car extends Vehicle\`.
3. **Polymorphism** - one name, many forms. Compile-time (method overloading) and runtime (method overriding).
4. **Abstraction** - show what an object does, hide how. Achieved with abstract classes and interfaces.

\`\`\`java
abstract class Shape {            // abstraction
    abstract double area();
}
class Circle extends Shape {      // inheritance
    private double r;             // encapsulation
    Circle(double r) { this.r = r; }
    double area() { return Math.PI * r * r; } // polymorphism (override)
}
Shape s = new Circle(2);
System.out.println(s.area());
\`\`\`

Give a real-life example for each if possible, such as an ATM for abstraction.`,
          d: 'easy',
          at: 'TCS, Wipro, Infosys',
        },
        {
          q: `What is the difference between method overloading and method overriding?`,
          a: `| | Overloading | Overriding |
|---|---|---|
| Where | Same class (or subclass) | Subclass of a parent class |
| Parameters | Must differ (number, type or order) | Must be the same |
| Return type | Can differ | Same or a subtype (covariant) |
| Resolved | Compile time (static polymorphism) | Runtime (dynamic polymorphism) |
| Static/private methods | Can be overloaded | Cannot be overridden |

\`\`\`java
class Calc {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; } // overloading
}
class Animal { void sound() { System.out.println("..."); } }
class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }     // overriding
}
\`\`\`

An overriding method cannot reduce visibility (a \`public\` method cannot become \`protected\`) and cannot throw broader checked exceptions. Changing only the return type is **not** overloading and causes a compile error.`,
          d: 'easy',
          at: 'Cognizant, Accenture, HCL',
          tip: `Use @Override in your example; it shows you know the compiler checks the override.`,
        },
        {
          q: `What is the difference between an abstract class and an interface? How did Java 8 change interfaces?`,
          a: `**Abstract class**
- Declared with \`abstract\`; can have abstract and concrete methods.
- Can have instance variables, constructors and any access modifier.
- A class can extend **only one** abstract class.

**Interface**
- Fields are always \`public static final\` constants; no constructors.
- A class can implement **many** interfaces.

**Java 8 and later**: interfaces can have \`default\` methods (with a body) and \`static\` methods. Java 9 added \`private\` methods. Default methods let old interfaces gain new methods without breaking existing classes (that is how \`forEach\` was added to \`Iterable\`).

\`\`\`java
interface Payment {
    void pay(double amt);
    default void receipt() { System.out.println("Paid"); }
}
abstract class Vehicle {
    protected int wheels;
    Vehicle(int w) { wheels = w; }
    abstract void start();
}
\`\`\`

**Rule of thumb**: use an abstract class for an "is-a" family that shares state; use an interface for a capability ("can-do") that unrelated classes may share.`,
          d: 'medium',
          at: 'TCS Digital, Infosys, Capgemini',
        },
        {
          q: `Explain the access modifiers in Java.`,
          a: `Java has four access levels, from most to least open:

| Modifier | Same class | Same package | Subclass (other package) | Everywhere |
|---|---|---|---|---|
| \`public\` | Yes | Yes | Yes | Yes |
| \`protected\` | Yes | Yes | Yes | No |
| default (no keyword) | Yes | Yes | No | No |
| \`private\` | Yes | No | No | No |

\`\`\`java
public class Account {
    private double balance;      // only inside Account
    protected String type;       // package + subclasses
    String branch;               // package-private
    public double getBalance() { return balance; }
}
\`\`\`

A top-level class can only be \`public\` or default. Good practice is to keep fields \`private\` and expose only what is needed through \`public\` methods, which is encapsulation.`,
          d: 'easy',
          at: 'Wipro, Tech Mahindra',
        },
        {
          q: `What is a constructor? What is a default constructor?`,
          a: `A **constructor** is a special block that runs when an object is created with \`new\`. It sets up the object's initial state.

Rules:
- Same name as the class.
- **No return type**, not even \`void\` (adding one turns it into a normal method).
- Can be overloaded; cannot be \`static\`, \`final\` or \`abstract\`.

If you write **no constructor at all**, the compiler adds a **default constructor** with no parameters that just calls \`super()\`. If you write any constructor yourself, the default one is **not** added.

\`\`\`java
class Student {
    String name;
    Student() { this.name = "Unknown"; }        // no-arg
    Student(String name) { this.name = name; }  // parameterized
}
Student a = new Student();
Student b = new Student("Ravi");
\`\`\`

This is why \`new Student()\` fails to compile when only \`Student(String name)\` exists.`,
          d: 'easy',
          at: 'Infosys, Cognizant',
        },
        {
          q: `What is constructor chaining? Explain this() and super().`,
          a: `**Constructor chaining** means one constructor calls another, so setup code is not repeated.

- **\`this(...)\`** calls another constructor of the **same class**.
- **\`super(...)\`** calls a constructor of the **parent class**.

Either call must be the **first statement** in the constructor, so you cannot use both in the same constructor. If you write neither, the compiler inserts \`super()\` automatically, which is why the parent is always built first.

\`\`\`java
class Person {
    String name;
    Person(String name) { this.name = name; }
}
class Employee extends Person {
    double salary;
    Employee(String name) {
        this(name, 25000);          // same class
    }
    Employee(String name, double salary) {
        super(name);                // parent class
        this.salary = salary;
    }
}
\`\`\`

\`new Employee("Asha")\` runs: \`Employee(String)\` -> \`Employee(String, double)\` -> \`Person(String)\`. If the parent has no no-arg constructor, the child must call \`super(...)\` explicitly or it will not compile.`,
          d: 'medium',
          at: 'TCS, Accenture',
        },
        {
          q: `Can we override static or private methods in Java?`,
          a: `**No to both.**

- **Private methods** are not visible to subclasses, so there is nothing to override. A method with the same name in the child is just a new, unrelated method.
- **Static methods** belong to the class. If a child declares the same static method, it **hides** the parent's method (method hiding). Which one runs depends on the **reference type**, not the object type, so there is no runtime polymorphism.

\`\`\`java
class Parent {
    static void show() { System.out.println("Parent"); }
}
class Child extends Parent {
    static void show() { System.out.println("Child"); }
}
Parent p = new Child();
p.show();   // prints "Parent" - decided by reference type
\`\`\`

With instance methods, the same code would print "Child". Also, \`final\` methods cannot be overridden, and adding \`@Override\` to a static or private method gives a compile error, which is a quick way to prove it.`,
          d: 'medium',
          at: 'Capgemini, Zoho',
        },
        {
          q: `Why does Java not support multiple inheritance of classes? How is the diamond problem handled with default methods?`,
          a: `If class C could extend both A and B, and both had a method \`show()\`, the compiler would not know which one C inherits. This is the **diamond problem**. Java avoids it by allowing a class to **extend only one class**, while it may implement many interfaces.

Since Java 8, interfaces can have \`default\` methods, so the conflict can appear again. Java resolves it with clear rules:
1. A method in the class (or a superclass) wins over interface defaults.
2. A more specific interface (a sub-interface) wins over its parent.
3. Otherwise the class **must override** the method, or it will not compile. It can pick one with \`InterfaceName.super.method()\`.

\`\`\`java
interface A { default void hello() { System.out.println("A"); } }
interface B { default void hello() { System.out.println("B"); } }
class C implements A, B {
    @Override
    public void hello() {
        A.super.hello();   // explicitly choose A
    }
}
\`\`\``,
          d: 'hard',
          at: 'Amazon, Infosys, TCS Digital',
          tip: `Write the X.super.method() syntax. Few candidates remember it.`,
        },
      ],
    },
    {
      title: `Strings, arrays and wrapper classes`,
      questions: [
        {
          q: `What is the difference between == and equals() in Java?`,
          a: `- **\`==\`** compares **references** for objects: are both variables pointing to the same object in memory? For primitives, it compares values.
- **\`equals()\`** compares **content**, as defined by the class. \`String\`, \`Integer\` and collections override it to compare values. The default \`Object.equals()\` behaves like \`==\`.

\`\`\`java
String a = "java";
String b = "java";
String c = new String("java");

System.out.println(a == b);       // true  (same pool object)
System.out.println(a == c);       // false (different objects)
System.out.println(a.equals(c));  // true  (same content)
\`\`\`

Always use \`equals()\` to compare strings and other objects. To avoid a \`NullPointerException\`, write the known value first: \`"java".equals(input)\`, or use \`Objects.equals(x, y)\`.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Cognizant',
        },
        {
          q: `Why is String immutable in Java?`,
          a: `Once a \`String\` object is created, its value cannot change. Methods like \`concat()\`, \`toUpperCase()\` or \`replace()\` return a **new** String.

\`\`\`java
String s = "hello";
s.toUpperCase();
System.out.println(s);      // hello (unchanged)
s = s.toUpperCase();        // now s points to a new object "HELLO"
\`\`\`

Reasons for this design:
1. **String pool** - many variables can safely share one literal object, which saves memory. That is only safe if nobody can change it.
2. **Security** - strings hold file paths, URLs, usernames and class names. If they could change after a security check, it would be a risk.
3. **Thread safety** - immutable objects can be shared between threads without synchronization.
4. **Hash code caching** - the hash is computed once and reused, which makes Strings fast as \`HashMap\` keys.

The \`String\` class is also \`final\`, so no subclass can break this behaviour.`,
          d: 'medium',
          at: 'Accenture, Capgemini, Deloitte',
        },
        {
          q: `What is the String pool? How many objects does new String("hello") create?`,
          a: `The **String pool** (String constant pool) is a special area in the heap where Java stores string **literals**. When you write a literal, the JVM checks the pool first; if the same value exists, it reuses that object instead of creating a new one.

\`\`\`java
String a = "hello";              // created in the pool
String b = "hello";              // reuses the same object
String c = new String("hello");  // new object in normal heap
String d = c.intern();           // returns the pool object

System.out.println(a == b); // true
System.out.println(a == c); // false
System.out.println(a == d); // true
\`\`\`

\`new String("hello")\` creates **up to two objects**: one in the pool for the literal \`"hello"\` (only if it is not already there) and one in the regular heap because of \`new\`. If the literal is already in the pool, only one new object is created.

The \`intern()\` method returns the pooled copy, adding it to the pool if needed.`,
          d: 'medium',
          at: 'TCS, Infosys, HCL',
          tip: `Answer "one or two, depending on whether the literal is already pooled". That precision impresses.`,
        },
        {
          q: `What is the difference between String, StringBuilder and StringBuffer?`,
          a: `| | String | StringBuilder | StringBuffer |
|---|---|---|---|
| Mutable | No | Yes | Yes |
| Thread-safe | Yes (immutable) | No | Yes (synchronized methods) |
| Speed | Slow for repeated changes | Fastest | Slower than StringBuilder |
| Since | Java 1.0 | Java 5 | Java 1.0 |

\`\`\`java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) {
    sb.append(i);           // modifies the same object
}
System.out.println(sb.toString()); // 01234
\`\`\`

Concatenating a \`String\` with \`+\` inside a loop creates a new object every time, wasting memory. Use:
- **String** for fixed text,
- **StringBuilder** for building text in a single thread (the usual choice),
- **StringBuffer** only when several threads modify the same text.`,
          d: 'easy',
          at: 'Wipro, Cognizant, Accenture',
        },
        {
          q: `What is the difference between an array and an ArrayList?`,
          a: `| | Array | ArrayList |
|---|---|---|
| Size | Fixed once created | Grows and shrinks automatically |
| Types | Primitives and objects | Objects only (uses wrappers like \`Integer\`) |
| Length | \`arr.length\` (a field) | \`list.size()\` (a method) |
| Methods | None built in | \`add\`, \`remove\`, \`contains\`, and more |
| Generics | Not applicable | Type safe with \`<T>\` |
| Speed | Slightly faster | Small overhead |

\`\`\`java
int[] arr = new int[3];        // default values 0,0,0
arr[0] = 10;

List<Integer> list = new ArrayList<>();
list.add(10);
list.add(20);
System.out.println(arr.length + " " + list.size()); // 3 2
\`\`\`

Also remember: \`String\` uses \`length()\` (a method), arrays use \`length\` (a field). Use an array when the size is known and performance matters; use an \`ArrayList\` when the size changes.`,
          d: 'easy',
          at: 'TCS, Infosys',
        },
        {
          q: `What are wrapper classes? Explain autoboxing and unboxing.`,
          a: `Each primitive type has a **wrapper class** that represents it as an object: \`int\` -> \`Integer\`, \`char\` -> \`Character\`, \`double\` -> \`Double\`, \`boolean\` -> \`Boolean\`, and so on.

They are needed because **collections and generics work only with objects**, and wrappers provide useful methods like \`Integer.parseInt()\` and constants like \`Integer.MAX_VALUE\`.

- **Autoboxing**: the compiler converts a primitive to its wrapper automatically.
- **Unboxing**: converts the wrapper back to a primitive.

\`\`\`java
List<Integer> nums = new ArrayList<>();
nums.add(5);              // autoboxing: int -> Integer
int x = nums.get(0);      // unboxing: Integer -> int
int n = Integer.parseInt("42");
\`\`\`

Watch out: unboxing a \`null\` wrapper throws a \`NullPointerException\`:

\`\`\`java
Integer count = null;
int c = count;   // NullPointerException
\`\`\`

Boxing inside large loops also creates many objects and slows code down.`,
          d: 'medium',
          at: 'Capgemini, HCL',
        },
        {
          q: `Why is char[] preferred over String for storing passwords?`,
          a: `Because a \`String\` is **immutable** and may live in memory longer than you want.

1. **You cannot erase a String.** After using a password String, its value stays in the heap (and possibly the String pool) until the garbage collector removes it, which may be much later. Anyone with a memory dump could read it.
2. **A char[] can be wiped.** After use, you overwrite it so the secret is gone immediately.
3. **Accidental logging.** Printing a String shows the password; printing a \`char[]\` shows something like \`[C@1b6d3586\`.

\`\`\`java
char[] password = console.readPassword("Password: ");
try {
    authenticate(password);
} finally {
    java.util.Arrays.fill(password, '0');  // erase it
}
\`\`\`

This is why \`Console.readPassword()\` and Swing's \`JPasswordField.getPassword()\` return \`char[]\`. In practice, passwords should also be hashed (e.g. with bcrypt) before storing, never kept as plain text.`,
          d: 'medium',
          at: 'Deloitte, Barclays',
        },
        {
          q: `Why does Integer a = 127, b = 127 give a == b true, but 128 gives false?`,
          a: `Because of the **Integer cache**. When you autobox an \`int\`, Java calls \`Integer.valueOf()\`. For values from **-128 to 127**, \`valueOf()\` returns a **cached object** instead of creating a new one. Outside that range, a new object is created each time.

\`\`\`java
Integer a = 127, b = 127;
System.out.println(a == b);        // true  (same cached object)

Integer c = 128, d = 128;
System.out.println(c == d);        // false (two different objects)
System.out.println(c.equals(d));   // true  (same value)
\`\`\`

\`==\` compares references, so it only returns true when both point to the same cached object. Similar caches exist for \`Byte\`, \`Short\`, \`Long\` (-128 to 127), \`Character\` (0 to 127) and \`Boolean\`. The upper limit for \`Integer\` can be raised with the JVM option \`-XX:AutoBoxCacheMax\`.

The lesson: **never compare wrapper objects with \`==\`**; use \`equals()\` or unbox to primitives first.`,
          d: 'hard',
          at: 'Amazon, Zoho, Infosys',
          tip: `This often appears as an output-prediction question. Say "Integer cache, -128 to 127" immediately.`,
        },
      ],
    },
    {
      title: `Collections framework`,
      questions: [
        {
          q: `Explain the Java Collections framework hierarchy. What is the difference between Collection and Collections?`,
          a: `The framework is a set of interfaces and classes for storing groups of objects.

- **\`Collection\`** (interface) is the root, extended by:
  - **List** - ordered, allows duplicates: \`ArrayList\`, \`LinkedList\`, \`Vector\`.
  - **Set** - no duplicates: \`HashSet\`, \`LinkedHashSet\`, \`TreeSet\` (sorted).
  - **Queue/Deque** - processing order: \`PriorityQueue\`, \`ArrayDeque\`.
- **\`Map\`** stores key-value pairs and is **not** a child of \`Collection\`: \`HashMap\`, \`LinkedHashMap\`, \`TreeMap\`, \`Hashtable\`.

**Collection vs Collections**: \`Collection\` is the **interface**; \`Collections\` is a **utility class** with static helper methods.

\`\`\`java
List<Integer> list = new ArrayList<>(List.of(3, 1, 2));
Collections.sort(list);                 // [1, 2, 3]
Collections.reverse(list);              // [3, 2, 1]
int max = Collections.max(list);        // 3
List<Integer> safe = Collections.unmodifiableList(list);
\`\`\``,
          d: 'easy',
          at: 'TCS, Wipro, Cognizant',
        },
        {
          q: `What is the difference between ArrayList and LinkedList?`,
          a: `| | ArrayList | LinkedList |
|---|---|---|
| Internal structure | Dynamic (resizable) array | Doubly linked list |
| Access by index \`get(i)\` | O(1), fast | O(n), walks the list |
| Insert/remove at the end | Amortized O(1) | O(1) |
| Insert/remove in the middle | O(n), shifts elements | O(1) once at the node, but finding it is O(n) |
| Memory | Less (just the array) | More (each node holds two links) |
| Extra role | List only | Also a \`Deque\` (queue/stack) |

\`\`\`java
List<String> a = new ArrayList<>();
a.add("x"); a.get(0);           // fast random access

LinkedList<String> l = new LinkedList<>();
l.addFirst("x"); l.removeLast(); // fast at both ends
\`\`\`

When an \`ArrayList\` is full, it creates a larger array (about 1.5 times) and copies the elements. In real projects \`ArrayList\` is the default choice because it is cache friendly; \`LinkedList\` suits frequent add/remove at the ends.`,
          d: 'easy',
          at: 'Infosys, Accenture, Capgemini',
        },
        {
          q: `How does HashMap work internally?`,
          a: `A \`HashMap\` stores entries in an **array of buckets** (default size 16).

**put(key, value)**:
1. Calls \`key.hashCode()\` and spreads the bits to get a hash.
2. Finds the bucket index: \`(n - 1) & hash\`.
3. If the bucket is empty, stores a new node there.
4. If not (a **collision**), it walks the nodes in that bucket. If a key is \`equals()\` to the new key, the value is **replaced**; otherwise the new node is added to the end.

**get(key)** repeats steps 1-2 and uses \`equals()\` to find the matching key in that bucket.

**Java 8 improvement**: when one bucket holds more than **8** nodes (and the table has at least 64 buckets), the linked list becomes a **red-black tree**, so the worst-case lookup becomes O(log n) instead of O(n).

**Resizing**: when size exceeds capacity x **load factor (0.75)**, the array doubles and entries are redistributed.

\`\`\`java
Map<String, Integer> m = new HashMap<>();
m.put("apple", 1);
m.put("apple", 2);    // replaces value
System.out.println(m.get("apple")); // 2
\`\`\`

HashMap allows one \`null\` key (stored in bucket 0) and many \`null\` values. Average put/get time is O(1).`,
          d: 'hard',
          at: 'Amazon, Infosys, Accenture, Morgan Stanley',
          tip: `Mention 16, 0.75, collision and the Java 8 tree change. These four points cover what most interviewers check.`,
        },
        {
          q: `What is the hashCode() and equals() contract?`,
          a: `The rules that let hash-based collections (\`HashMap\`, \`HashSet\`) work correctly:

1. If two objects are **equal** by \`equals()\`, they **must** return the **same** \`hashCode()\`.
2. If two objects have the same hash code, they **may or may not** be equal (that is a collision).
3. \`hashCode()\` must return the same value each time while the fields used in \`equals()\` do not change.

So **whenever you override \`equals()\`, you must override \`hashCode()\`**. If you do not, two "equal" objects may land in different buckets, and a \`HashSet\` will store duplicates or a \`HashMap\` lookup will fail.

\`\`\`java
class Emp {
    int id; String name;
    Emp(int id, String name) { this.id = id; this.name = name; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Emp)) return false;
        Emp e = (Emp) o;
        return id == e.id && Objects.equals(name, e.name);
    }
    @Override
    public int hashCode() { return Objects.hash(id, name); }
}
\`\`\``,
          d: 'medium',
          at: 'TCS Digital, Cognizant, Capgemini',
        },
        {
          q: `What is the difference between HashMap, Hashtable and ConcurrentHashMap?`,
          a: `| | HashMap | Hashtable | ConcurrentHashMap |
|---|---|---|---|
| Thread-safe | No | Yes | Yes |
| How | - | Every method \`synchronized\` (locks whole map) | Fine-grained locking + CAS on buckets |
| Performance | Fastest (single thread) | Slow under many threads | Fast under many threads |
| null key/values | One null key, many null values | Not allowed | Not allowed |
| Iterator | Fail-fast | Fail-fast (Enumeration not) | Weakly consistent, no exception |
| Status | Modern | Legacy (Java 1.0) | Modern (Java 5+) |

\`\`\`java
Map<String, Integer> hits = new ConcurrentHashMap<>();
hits.merge("home", 1, Integer::sum);   // atomic update
\`\`\`

Use **HashMap** in single-threaded code, **ConcurrentHashMap** when several threads share the map. Avoid **Hashtable** in new code. In Java 7, ConcurrentHashMap used segment locks; since Java 8 it locks only the single bucket being changed, so reads never block.`,
          d: 'medium',
          at: 'Infosys, Wipro, Barclays',
        },
        {
          q: `How does HashSet work internally? How does it avoid duplicates?`,
          a: `A \`HashSet\` is backed by a **HashMap**. Every element you add is stored as a **key** in that internal map, and the value is a single shared dummy object called \`PRESENT\`.

\`\`\`java
// simplified from the JDK source
private transient HashMap<E, Object> map;
private static final Object PRESENT = new Object();

public boolean add(E e) {
    return map.put(e, PRESENT) == null;
}
\`\`\`

Since map keys are unique, adding an element that already exists only replaces the dummy value, and \`add()\` returns **false**. Uniqueness is decided using \`hashCode()\` to find the bucket and \`equals()\` to compare, so custom objects must override both correctly.

\`\`\`java
Set<String> s = new HashSet<>();
System.out.println(s.add("A")); // true
System.out.println(s.add("A")); // false (duplicate)
\`\`\`

HashSet does not keep insertion order. Use \`LinkedHashSet\` for insertion order and \`TreeSet\` for sorted order.`,
          d: 'medium',
          at: 'TCS, HCL, Accenture',
        },
        {
          q: `What is the difference between Comparable and Comparator?`,
          a: `Both are used to sort objects.

| | Comparable | Comparator |
|---|---|---|
| Package | \`java.lang\` | \`java.util\` |
| Method | \`compareTo(T o)\` | \`compare(T a, T b)\` |
| Where written | Inside the class itself | In a separate class or a lambda |
| Number of orders | One "natural" order | Many different orders |
| Used by | \`Collections.sort(list)\` | \`Collections.sort(list, cmp)\` / \`list.sort(cmp)\` |

\`\`\`java
class Student implements Comparable<Student> {
    String name; int marks;
    Student(String n, int m) { name = n; marks = m; }
    public int compareTo(Student o) {
        return Integer.compare(this.marks, o.marks); // natural order by marks
    }
}

List<Student> list = new ArrayList<>();
Collections.sort(list);                                   // by marks
list.sort(Comparator.comparing(s -> s.name));             // by name
list.sort(Comparator.comparingInt((Student s) -> s.marks).reversed());
\`\`\`

Use \`Comparable\` for the obvious default order; use \`Comparator\` when you need other orders or cannot change the class.`,
          d: 'easy',
          at: 'Cognizant, Capgemini, Wipro',
        },
        {
          q: `What are fail-fast and fail-safe iterators? Why does ConcurrentModificationException occur?`,
          a: `**Fail-fast** iterators (used by \`ArrayList\`, \`HashMap\`, \`HashSet\`) throw \`ConcurrentModificationException\` if the collection is **structurally changed** while iterating, other than through the iterator itself. Internally, the collection keeps a \`modCount\`; the iterator remembers it and checks it on every \`next()\`.

\`\`\`java
List<Integer> list = new ArrayList<>(List.of(1, 2, 3, 4));
for (Integer n : list) {
    if (n % 2 == 0) list.remove(n);   // ConcurrentModificationException
}
\`\`\`

Correct ways to remove while iterating:

\`\`\`java
Iterator<Integer> it = list.iterator();
while (it.hasNext()) {
    if (it.next() % 2 == 0) it.remove();
}
// or simply
list.removeIf(n -> n % 2 == 0);
\`\`\`

**Fail-safe** (weakly consistent) iterators, used by \`CopyOnWriteArrayList\` and \`ConcurrentHashMap\`, do not throw. \`CopyOnWriteArrayList\` iterates over a snapshot copy, so changes made during iteration are not seen by that iterator. Note that fail-fast behaviour is "best effort", not guaranteed, so never rely on it for program logic.`,
          d: 'hard',
          at: 'Amazon, Zoho, Morgan Stanley',
        },
      ],
    },
    {
      title: `Exceptions, multithreading and Java 8+`,
      questions: [
        {
          q: `What is the difference between checked and unchecked exceptions?`,
          a: `- **Checked exceptions** are checked by the **compiler**. You must either handle them with \`try/catch\` or declare them with \`throws\`. They represent recoverable problems outside your control. Examples: \`IOException\`, \`SQLException\`, \`FileNotFoundException\`.
- **Unchecked exceptions** are subclasses of \`RuntimeException\`. The compiler does not force you to handle them. They usually mean a programming bug. Examples: \`NullPointerException\`, \`ArrayIndexOutOfBoundsException\`, \`ArithmeticException\`, \`IllegalArgumentException\`.

\`Error\` (like \`OutOfMemoryError\`) is also unchecked, but it signals serious JVM problems you should not catch.

\`\`\`java
// checked: must handle or declare
void read() throws IOException {
    Files.readAllLines(Path.of("data.txt"));
}
// unchecked: compiles, fails at runtime
int[] a = new int[2];
a[5] = 1;   // ArrayIndexOutOfBoundsException
\`\`\`

Hierarchy: \`Throwable\` -> \`Exception\` (checked) -> \`RuntimeException\` (unchecked), and \`Throwable\` -> \`Error\`. Also know \`throw\` (raises one exception) vs \`throws\` (declares in a method signature).`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro',
        },
        {
          q: `What is try-with-resources?`,
          a: `Introduced in Java 7, **try-with-resources** automatically closes resources such as files, streams and database connections when the block ends, whether it finishes normally or throws an exception.

Any class that implements **\`AutoCloseable\`** (or \`Closeable\`) can be used.

\`\`\`java
try (BufferedReader br = new BufferedReader(new FileReader("data.txt"))) {
    System.out.println(br.readLine());
} catch (IOException e) {
    System.out.println("Error: " + e.getMessage());
}
// br.close() is called automatically
\`\`\`

Benefits over a manual \`finally\` block:
- Less code and no forgotten \`close()\` calls, so no resource leaks.
- Multiple resources can be declared, separated by \`;\`. They are closed in **reverse order**.
- If both the body and \`close()\` throw, the body's exception is kept and the close exception is attached as a **suppressed** exception (\`e.getSuppressed()\`), so the real cause is not lost.

Since Java 9, an effectively final variable declared earlier can be used directly: \`try (br) { ... }\`.`,
          d: 'medium',
          at: 'Capgemini, Accenture',
        },
        {
          q: `What is the difference between extending Thread and implementing Runnable?`,
          a: `Both create a task that runs in a separate thread.

\`\`\`java
class MyThread extends Thread {
    public void run() { System.out.println("Thread way"); }
}
class MyTask implements Runnable {
    public void run() { System.out.println("Runnable way"); }
}

new MyThread().start();
new Thread(new MyTask()).start();
new Thread(() -> System.out.println("Lambda")).start();
\`\`\`

**Implementing Runnable is preferred** because:
1. Java allows only one parent class. Extending \`Thread\` uses it up; with \`Runnable\` your class can still extend another class.
2. It separates the **task** from the **thread**, which is cleaner design.
3. The same \`Runnable\` can be given to an \`ExecutorService\` thread pool.

Always call **\`start()\`**, not \`run()\`. \`start()\` creates a new thread that then calls \`run()\`; calling \`run()\` directly just runs it in the current thread like a normal method. Calling \`start()\` twice on the same thread throws \`IllegalThreadStateException\`. If the task must return a result, use \`Callable\` with an executor.`,
          d: 'easy',
          at: 'TCS, Cognizant, HCL',
        },
        {
          q: `What is the synchronized keyword and why is it needed?`,
          a: `When several threads change shared data at the same time, results can be wrong. This is a **race condition**. For example, \`count++\` is really three steps (read, add, write), and two threads can interleave them and lose an update.

\`synchronized\` lets only **one thread at a time** run a block of code for a given lock (monitor). Other threads wait.

\`\`\`java
class Counter {
    private int count = 0;

    public synchronized void increment() {   // lock = this object
        count++;
    }

    public void add(int n) {
        synchronized (this) {                // synchronized block
            count += n;
        }
    }
}
\`\`\`

- A synchronized **instance method** locks the object (\`this\`).
- A synchronized **static method** locks the class object (\`Counter.class\`).
- A synchronized **block** locks only the needed part, which is better for performance.

It also guarantees **visibility**: changes made inside are seen by the next thread that takes the same lock. Downsides are slower code and a risk of deadlock. Alternatives include \`AtomicInteger\` and \`ReentrantLock\`.`,
          d: 'medium',
          at: 'Infosys, Wipro, Accenture',
        },
        {
          q: `What does volatile do? How is it different from synchronized?`,
          a: `Each thread may keep a **cached copy** of a variable, so a change by one thread may not be seen by another. Declaring a variable \`volatile\` makes every read come from **main memory** and every write go straight to main memory. It also prevents the compiler and CPU from reordering instructions around it.

\`\`\`java
class Worker implements Runnable {
    private volatile boolean running = true;
    public void run() {
        while (running) { /* work */ }   // sees the update
    }
    public void stop() { running = false; }
}
\`\`\`

Without \`volatile\`, the loop might never see \`running = false\` and run forever.

| | volatile | synchronized |
|---|---|---|
| Visibility | Yes | Yes |
| Atomicity (e.g. \`count++\`) | **No** | Yes |
| Locking/blocking | No | Yes |
| Applies to | Variables only | Methods and blocks |

So \`volatile\` suits simple flags written by one thread and read by others. For compound actions like \`count++\` use \`synchronized\` or \`AtomicInteger\`.`,
          d: 'hard',
          at: 'Amazon, Goldman Sachs, Zoho',
          tip: `Key line: volatile gives visibility, not atomicity. Then show why count++ still breaks.`,
        },
        {
          q: `What is a deadlock? How can you prevent it?`,
          a: `A **deadlock** happens when two or more threads wait for each other's locks forever, so none can continue.

\`\`\`java
Object lockA = new Object(), lockB = new Object();

Thread t1 = new Thread(() -> {
    synchronized (lockA) {
        synchronized (lockB) { System.out.println("t1"); }
    }
});
Thread t2 = new Thread(() -> {
    synchronized (lockB) {          // opposite order
        synchronized (lockA) { System.out.println("t2"); }
    }
});
\`\`\`

If t1 holds \`lockA\` and t2 holds \`lockB\`, each waits for the other: deadlock.

Four conditions must all hold: mutual exclusion, hold and wait, no preemption, and circular wait. Break any one to prevent it:
- **Always take locks in the same order** (the most common fix).
- Use \`ReentrantLock.tryLock(timeout)\` so a thread gives up instead of waiting forever.
- Hold locks for the shortest time and avoid nested locks.
- Prefer higher-level tools like \`ConcurrentHashMap\` and executors.

To detect one, take a thread dump (\`jstack <pid>\`) or use JConsole/VisualVM; they report "Found one Java-level deadlock".`,
          d: 'hard',
          at: 'Amazon, Infosys, Barclays',
        },
        {
          q: `What is a functional interface? How are lambda expressions related to it?`,
          a: `A **functional interface** has exactly **one abstract method**. It may also have default and static methods. The \`@FunctionalInterface\` annotation is optional but makes the compiler check the rule.

A **lambda expression** (Java 8) is a short way to provide that one method's implementation without writing a class.

\`\`\`java
@FunctionalInterface
interface Calculator {
    int apply(int a, int b);
}

Calculator add = (a, b) -> a + b;
Calculator mul = (a, b) -> a * b;
System.out.println(add.apply(2, 3)); // 5
\`\`\`

Common built-in functional interfaces in \`java.util.function\`:
- \`Predicate<T>\` - \`test(T)\` returns boolean
- \`Function<T, R>\` - \`apply(T)\` returns R
- \`Consumer<T>\` - \`accept(T)\` returns nothing
- \`Supplier<T>\` - \`get()\` returns T

Older examples include \`Runnable\` and \`Comparator\`. A **method reference** like \`String::toUpperCase\` or \`System.out::println\` is an even shorter form of a lambda. Variables used inside a lambda must be **effectively final**.`,
          d: 'easy',
          at: 'TCS Digital, Cognizant, Capgemini',
        },
        {
          q: `What are Java 8 streams? Explain intermediate and terminal operations, and Optional.`,
          a: `A **stream** processes a sequence of elements in a declarative pipeline, without changing the source collection.

- **Intermediate operations** return a new stream and are **lazy** (they run only when a terminal operation is called): \`filter\`, \`map\`, \`sorted\`, \`distinct\`, \`limit\`.
- **Terminal operations** produce a result and end the stream: \`collect\`, \`forEach\`, \`count\`, \`reduce\`, \`findFirst\`, \`anyMatch\`.

\`\`\`java
List<String> names = List.of("ravi", "anu", "kiran", "amit");
List<String> result = names.stream()
        .filter(n -> n.startsWith("a"))
        .map(String::toUpperCase)
        .sorted()
        .collect(Collectors.toList());   // [AMIT, ANU]
\`\`\`

A stream can be used only once. \`parallelStream()\` can split work across cores.

**Optional** is a container that may or may not hold a value, used to avoid \`null\` checks and \`NullPointerException\`. Methods like \`findFirst()\` return it.

\`\`\`java
Optional<String> first = names.stream()
        .filter(n -> n.length() > 10)
        .findFirst();
System.out.println(first.orElse("none"));     // none
first.ifPresent(System.out::println);
\`\`\`

Prefer \`orElse\`, \`orElseGet\`, \`map\` and \`ifPresent\` over calling \`get()\` without checking.`,
          d: 'medium',
          at: 'Infosys, Accenture, Deloitte',
          tip: `Be ready to write a stream live: filter, map, collect. Practise groupingBy too.`,
        },
      ],
    },
  ],
};

export default book;
