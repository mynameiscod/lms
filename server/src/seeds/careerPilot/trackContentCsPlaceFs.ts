/**
 * Career-track content (.NET Full Stack + AI, batch N5): the C# and .NET MCQ rounds
 * (JT_MCQ_CSHARP_DOTNET) and the .NET full-stack candidate (JT_PLACE_DOTNET_FS).
 *
 * MCQ rounds: every "what does this print" snippet was compiled and run with the .NET Framework csc
 * (C# 5) and is written in C# 5 syntax; none of the behaviours shown differs on .NET 8. ASP.NET Core and
 * EF Core answers are the documented .NET 8 / EF Core 8 behaviour.
 *
 * The candidate: the capstone defended here is the one from JT_CAPSTONE_DOTNET — React 18 + Vite in
 * front of an ASP.NET Core 8 Web API (EF Core 8 on SQL Server, Identity + JWT bearer, xUnit and
 * WebApplicationFactory tests), with the AI INSIDE the API: a streamed RAG assistant built on the OpenAI
 * .NET SDK and a Semantic Kernel agent whose functions call the service layer as the signed-in user
 * (ICurrentUser) and never place an order or submit an application without the user's click.
 *
 * Attribution: both topics are multi-skill. JT_MCQ_CSHARP_DOTNET (CSHARP_BASICS, CSHARP_OOP,
 * ASPNET_CORE, EF_CORE): MCQ_OUTPUT declares CSHARP_BASICS and CSHARP_OOP, MCQ_DOTNET declares
 * ASPNET_CORE and EF_CORE, the checkpoint spreads over all four. JT_PLACE_DOTNET_FS
 * (PLACEMENT_READINESS, PORTFOLIO_EVIDENCE, TECHNICAL_EXPLANATION, INTERVIEW_PERFORMANCE): checkpoint
 * questions name the skill they measure, from the unit's own skillKeys where it declares them.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });
const ck = (skillKey: string, question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ ...mcq(question, options, explanation), skillKey });

/* ══ JT_MCQ_CSHARP_DOTNET — C# and .NET MCQ Rounds ═════════════════════════════════════════ */

const MCQ_BUNDLES: PilotBundle[] = [
  /* ── MCQ_OUTPUT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MCQ_CSHARP_DOTNET_MCQ_OUTPUT',
    notes: `The C# section of a company online test (TCS, Infosys, Accenture, Cognizant, Capgemini and most
product-company screeners use the same format) is mostly "what does this print?". Each snippet hides **one rule**
of the language; you have about a minute, so the skill is spotting which rule. Here are twelve. Every snippet below
was compiled and run; the output shown is real, and none of these behaviours differs between .NET Framework and
.NET 8. Cover the answer, predict it, then read why.

## 1. A struct is copied; a class is shared

    struct Point { public int X; }
    class Box { public int X; }

    Point p1 = new Point(); p1.X = 1; Point p2 = p1; p2.X = 5;
    Box b1 = new Box(); b1.X = 1; Box b2 = b1; b2.X = 5;
    Console.WriteLine(p1.X + " " + b1.X);

**Prints** \`1 5\`. **Why:** assigning a struct copies its fields; assigning a class variable copies the
**reference**, so b1 and b2 are one object. The same rule bites with \`List<Point>\`: \`list[0]\` returns a copy, which
is why \`list[0].X = 9\` does not even compile (CS1612), while \`array[0].X = 9\` changes the element in place.

## 2. Boxing takes a snapshot

    int i = 10; object o = i; i++;
    Console.WriteLine(o + " " + i);
    object a = 5, b = 5;
    Console.WriteLine((a == b) + " " + a.Equals(b));

**Prints** \`10 11\` and \`False True\`. **Why:** boxing copies the value into a new object on the heap; later changes
to \`i\` do not reach it. \`==\` on two \`object\` variables compares **references** (two separate boxes), while
\`Equals\` is virtual and \`Int32.Equals\` compares values.

## 3. Strings compare by value with ==, unless you hide them behind object

    string s1 = "hi";
    string s2 = new string(new[] { 'h', 'i' });
    Console.WriteLine((s1 == s2) + " " + ((object)s1 == (object)s2));
    string s = "place"; s.ToUpper();
    Console.WriteLine(s);

**Prints** \`True False\` and \`place\`. **Why:** \`string\` overloads \`==\` to compare characters, but casting to
\`object\` picks the reference comparison, and a string built at run time is a different object from the literal
(literals are interned; \`string.Intern(s2)\` would return the literal's object). Strings are immutable:
\`ToUpper()\` returns a new string, and throwing it away changes nothing.

## 4. override replaces, new hides

    class Animal { public virtual string Speak() { return "animal"; } public string Kind() { return "A"; } }
    class Dog : Animal { public override string Speak() { return "dog"; } public new string Kind() { return "D"; } }

    Animal an = new Dog(); Dog dg = new Dog();
    Console.WriteLine(an.Speak() + " " + an.Kind() + " " + dg.Kind());

**Prints** \`dog A D\`. **Why:** a virtual call is chosen by the **object's** run-time type, so \`Speak\` gives
"dog". \`Kind\` is not virtual; \`new\` only hides it, and a non-virtual call is chosen by the **variable's**
compile-time type — \`Animal\` gives "A", \`Dog\` gives "D".

## 5. A lambda captures the variable, not its value — and foreach is different

    var fs = new List<Func<int>>();
    for (int k = 0; k < 3; k++) fs.Add(() => k);
    var gs = new List<Func<int>>();
    foreach (int k in new[] { 0, 1, 2 }) gs.Add(() => k);
    Console.WriteLine(string.Join(",", fs.Select(f => f())) + " | " + string.Join(",", gs.Select(f => f())));

**Prints** \`3,3,3 | 0,1,2\`. **Why:** a \`for\` loop has **one** variable \`k\` for the whole loop; every lambda reads it
after the loop has left it at 3. Since C# 5, \`foreach\` declares a **fresh** variable per iteration, so each lambda
keeps its own. Fix the \`for\` version by copying: \`int copy = k; fs.Add(() => copy);\`.

## 6. LINQ is lazy: the query runs when you enumerate, every time

    var nums = new List<int> { 1, 2, 3 };
    var big = nums.Where(x => x > 1);
    var snap = nums.Where(x => x > 1).ToList();
    nums.Add(10);
    Console.WriteLine(big.Count() + " " + snap.Count);

**Prints** \`3 2\`. **Why:** \`Where\` stores the query; \`Count()\` runs it against the list as it is **now**, 10
included. \`ToList()\` ran it once, earlier. A query enumerated twice runs twice — a \`Select\` with a counter inside,
followed by \`Count()\` and \`First()\`, runs its lambda 4 + 1 = 5 times over four items.

## 7. finally runs, but cannot change a value already returned

    static int Fin() { int x = 1; try { return x; } finally { x = 2; Console.Write("finally ran; "); } }
    static List<int> FinList() { var l = new List<int> { 1 }; try { return l; } finally { l.Add(2); } }

\`Console.WriteLine(Fin())\` **prints** \`finally ran; 1\`; \`string.Join(",", FinList())\` gives \`1,2\`. **Why:** the
return value is evaluated **before** finally runs. For an \`int\` that is a copy, so \`x = 2\` is too late; for a list
it is a reference, so \`Add\` changes the object the caller receives. Unlike Java, C# does not allow \`return\` inside
\`finally\` (compile error CS0157).

## 8. int arithmetic: truncation, the sign of %, silent overflow

    int max = int.MaxValue;
    Console.WriteLine(max + 1);
    Console.WriteLine((-7 / 2) + " " + (-7 % 2) + " " + (5 % -3));
    long wrong = max * 2; long right = (long)max * 2;
    Console.WriteLine(wrong + " " + right);

**Prints** \`-2147483648\`, \`-3 -1 2\`, \`-2 4294967294\`. **Why:** integer division truncates toward zero, and \`%\`
takes the sign of the **left** operand. Arithmetic is unchecked by default, so overflow wraps; \`checked(max + 1)\`
throws \`OverflowException\`. \`max * 2\` overflows as an \`int\` **before** it is widened to \`long\` — cast one operand
first. (\`int.MaxValue * 2\` written with constants is a compile error, CS0220, because constants are checked.)

## 9. + is evaluated left to right, and char is a number

    Console.WriteLine(1 + 2 + "3" + 4 + 5);
    Console.WriteLine('a' + 1);
    Console.WriteLine((char)('a' + 1));

**Prints** \`3345\`, \`98\`, \`b\`. **Why:** \`1 + 2\` is 3; once a string appears, every later \`+\` concatenates. \`char\`
plus \`int\` is an \`int\` (97 + 1); only the cast turns it back into a character.

## 10. Constructors: field initialisers, then the base constructor, then the body

    class Base0 {
        public Base0() { Console.WriteLine("Base ctor sees " + Describe()); }
        public virtual string Describe() { return "base"; }
    }
    class Derived0 : Base0 {
        private string name = "set by initializer";
        private string late;
        public Derived0() { late = "set in ctor"; }
        public override string Describe() { return name + " / " + (late == null ? "null" : late); }
    }
    new Derived0();

**Prints** \`Base ctor sees set by initializer / null\`. **Why:** C# runs the derived class's **field initialisers
first**, then the base constructor, then the derived constructor body. A virtual call from the base constructor
reaches the override, which sees initialised fields but not what the body sets. (Java differs: its derived
initialisers run after the base constructor.) Never call virtual methods from a constructor.

## 11. Everything is passed by value — including references

    static void Reassign(List<int> l) { l = new List<int> { 9 }; }
    static void AddTo(List<int> l) { l.Add(9); }
    static void RefReassign(ref List<int> l) { l = new List<int> { 9 }; }

    var lst = new List<int> { 1 };
    Reassign(lst); Console.Write(lst.Count + " ");
    AddTo(lst); Console.Write(lst.Count + " ");
    RefReassign(ref lst); Console.WriteLine(string.Join(",", lst));

**Prints** \`1 2 9\`. **Why:** the method gets a copy of the reference. Changing the object through it is visible to
the caller; pointing the copy somewhere else is not. Only \`ref\` (or \`out\`) passes the caller's variable itself.

## 12. Iterators do nothing until enumerated

    static IEnumerable<int> Gen() { Console.Write("start; "); yield return 1; Console.Write("mid; "); yield return 2; }

    var g = Gen();
    Console.Write("created; ");
    foreach (var v in g) Console.Write(v + "; ");

**Prints** \`created; start; 1; mid; 2; \`. **Why:** calling a method that uses \`yield\` only builds the iterator; its
body runs one step per \`MoveNext\`. This is also why argument checks in an iterator method fire late — validate in a
non-iterator wrapper.

## Quick rules the same tests ask

- \`Math.Round(2.5)\` is 2 and \`Math.Round(3.5)\` is 4 (round half to even); \`(int)-2.9\` is -2 (truncation);
  \`Convert.ToInt32(2.5)\` is 2 (also half to even).
- \`int? n = null;\` — \`n > 0\` and \`n <= 0\` are **both** false; \`n + 1\` is null; \`n ?? -1\` is -1.
- \`(Color)5\` on an enum with three members prints \`5\` — no exception; \`default(Color)\` is the zero member.
- A static field in a generic class exists once **per type argument**: \`Counter<int>.Count\` and
  \`Counter<string>.Count\` are separate.
- \`object[] arr = new string[2]; arr[0] = 1;\` compiles and throws \`ArrayTypeMismatchException\`.
- Removing from a \`List<T>\` inside \`foreach\` over it throws \`InvalidOperationException\`; iterate a \`ToList()\` copy.
- A double such as \`0.1 + 0.2\` prints differently on .NET Framework and .NET Core 3.0+, which is why test
  questions compare doubles (\`0.1 + 0.2 == 0.3\` is False) rather than print them.

## How to work an output question in the test

1. Is it a **value or a reference** — struct or class, boxed copy or original?
2. **When** does each part run — constructor order, deferred LINQ, a lazy iterator, finally after the return value?
3. Is the call chosen at **compile time** (non-virtual, overloads, \`new\`) or **run time** (\`override\`)?
4. Could it **not compile** or **throw**? "Compile error" is an option in real tests and is sometimes right.`,
    mcqs: [
      mcq('Three overloads `P(int)`, `P(long)` and `P(string)` each print their parameter type, plus `P(object)`. What does `P((short)3); P(3L); P(null);` print?', [
        ['object long object', false],
        ['int long string', true],
        ['int long object', false],
        ['A compile error: P(null) is ambiguous', false],
      ], 'A short widens implicitly to int, the closest overload; 3L is a long. null converts to both string and object, and string is more specific because it converts to object, so no ambiguity arises.'),
      mcq('`class Shop { public Shop() { Console.Write(Label() + "|"); } public virtual string Label() { return "shop"; } }` and `class Store : Shop { string city = "Pune"; int items; public Store() { items = 5; } public override string Label() { return city + items; } }` — what does `new Store();` print?', [
        ['shop|', false],
        ['Pune5|', false],
        ['Pune0|', true],
        ['|', false],
      ], 'Store\'s field initialisers run before Shop\'s constructor, so city is already "Pune". The virtual call reaches the override, but the Store constructor body has not run yet, so items is still 0.'),
      mcq('`var log = ""; var r = new[] { 4, 5, 6 }.Where(x => { log += "w" + x; return x > 4; }).Select(x => { log += "s" + x; return x; }); var f = r.First();` — what is `f + " " + log`?', [
        ['5 w4w5w6s5s6', false],
        ['5 w4w5s5', true],
        ['4 w4s4', false],
        ['5 s5w4w5', false],
      ], 'LINQ to Objects streams one element at a time through the whole chain, and First stops as soon as it has a result. 4 fails the filter, 5 passes and is selected, and 6 is never touched.'),
    ],
    checkpoint: [
      ck('CSHARP_BASICS', 'What does `int a = 4; a = a++ * 2 + a; Console.WriteLine(a);` print?', [
        ['12', false],
        ['10', false],
        ['13', true],
        ['14', false],
      ], 'Operands are evaluated left to right: a++ yields 4 and sets a to 5, so the expression is 4 * 2 + 5 = 13, which is then assigned back to a. The post-increment\'s own write is overwritten.'),
      ck('CSHARP_OOP', '`class Report : IPrinter` has `public string Print() { return "pdf"; }` and also `string IPrinter.Print() { return "xps"; }`. With `var rp = new Report(); IPrinter ip = rp;`, what does `rp.Print() + " " + ip.Print()` give?', [
        ['pdf pdf', false],
        ['xps xps', false],
        ['A compile error: Print is defined twice', false],
        ['pdf xps', true],
      ], 'An explicit interface implementation is reachable only through the interface type, so ip.Print() runs it. The public method is a separate member that a Report variable sees. Both can coexist.'),
      ck('CSHARP_BASICS', '`struct Seat { public int Row; }` — after `var list = new List<Seat> { new Seat() }; var arr = new Seat[1]; var s = list[0]; s.Row = 7; arr[0].Row = 7;`, what does `list[0].Row + " " + arr[0].Row` give?', [
        ['7 7', false],
        ['0 7', true],
        ['0 0', false],
        ['7 0', false],
      ], 'The list indexer returns a copy of the struct, so changing s leaves the list alone. An array element is a variable, so arr[0].Row = 7 changes it in place. Writing list[0].Row = 7 would not compile (CS1612).'),
    ],
  },

  /* ── MCQ_DOTNET ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MCQ_CSHARP_DOTNET_MCQ_DOTNET',
    notes: `The .NET part of an online test checks **defaults and behaviours**: what ASP.NET Core, its dependency
injection and EF Core do when you did not say. Twelve questions in the test's format, each with the answer and
the reason, all as documented for .NET 8 and EF Core 8. The examples use a store API: \`Product(Id, Name, Price,
Stock)\`, \`Order(Id, CustomerId, Lines)\` and an \`AppDbContext\`.

## 1. In what order does this middleware write?

    app.Use(async (ctx, next) => { Log("A1"); await next(ctx); Log("A2"); });
    app.Use(async (ctx, next) => { Log("B1"); await next(ctx); Log("B2"); });
    app.Run(ctx => { Log("R"); return Task.CompletedTask; });

**Answer:** \`A1 B1 R B2 A2\`. Middleware runs in **registration order** on the way in and reverse order on the
way out. \`app.Run\` is terminal — anything registered after it never runs — and a middleware that does not call
\`next\` short-circuits the rest. That is why \`UseAuthentication()\` must come before \`UseAuthorization()\`, and both
after \`UseRouting()\` when you call it explicitly.

## 2. What are the three lifetimes, and what is a captive dependency?

**Answer:** \`AddTransient\` — a new instance every time it is resolved; \`AddScoped\` — one per request (per scope);
\`AddSingleton\` — one for the application. A singleton that takes a scoped service in its constructor would keep
the first request's instance forever (a **captive dependency**). In the Development environment the host turns on
scope validation, and resolving it throws \`InvalidOperationException\` ("Cannot consume scoped service … from
singleton …"); in Production validation is off by default and the bug ships silently.

## 3. One interface registered twice — what does the constructor get?

    builder.Services.AddScoped<INotifier, EmailNotifier>();
    builder.Services.AddScoped<INotifier, SmsNotifier>();
    builder.Services.TryAddScoped<INotifier, PushNotifier>();

**Answer:** a constructor asking for \`INotifier\` gets **SmsNotifier** — the last registration wins. One asking for
\`IEnumerable<INotifier>\` gets **two**, Email then Sms. \`TryAdd…\` adds nothing when the service type is already
registered, which is how libraries register defaults you can override.

## 4. What does [ApiController] change?

**Answer:** attribute routing is required; complex parameters bind **from the body** without \`[FromBody]\`; an
invalid model (a \`[Required]\` property missing, a \`[Range]\` broken) returns **400 with ValidationProblemDetails
automatically**, before your action body runs — no \`if (!ModelState.IsValid)\` needed; error status codes get a
ProblemDetails body.

## 5. What does each result helper return?

**Answer:** \`Ok(x)\` 200 · \`CreatedAtAction(nameof(Get), new { id }, dto)\` **201 with a Location header** ·
\`NoContent()\` 204 · \`BadRequest()\` 400 · \`NotFound()\` 404 · \`Conflict()\` 409. An action whose declared type is an
object (\`Task<Product?>\`) and that returns **null** sends **204 No Content**, not 404 — return
\`ActionResult<Product>\` and \`NotFound()\` explicitly.

## 6. What does the JSON look like by default?

**Answer:** ASP.NET Core uses System.Text.Json with web defaults: property names in **camelCase**
(\`UnitPrice\` → \`unitPrice\`), case-insensitive reading, enums written as **numbers** unless you add
\`JsonStringEnumConverter\`, and a reference cycle (Order → Lines → Order) throws a \`JsonException\` — one more reason
to return DTOs, not entities.

## 7. Which configuration value wins?

**Answer:** the **last source added**. The default builder adds \`appsettings.json\`, then
\`appsettings.{Environment}.json\`, then user secrets (in Development only), then environment variables, then the
command line. An environment variable \`Jwt__Key\` (double underscore) maps to the key \`Jwt:Key\`. With
\`ASPNETCORE_ENVIRONMENT\` unset, the environment is **Production**.

## 8. 401 or 403?

**Answer:** with JWT bearer, a request with no token or an invalid or expired one to an \`[Authorize]\` endpoint gets
**401** (with \`WWW-Authenticate: Bearer\`); a valid token whose user lacks the role or fails the policy gets **403**.
\`[AllowAnonymous]\` on an action overrides \`[Authorize]\` on its controller. The bearer handler's default
\`ClockSkew\` is **5 minutes**, so a token is still accepted for up to five minutes past its \`exp\`.

## 9. Find, FirstOrDefault and the change tracker

**Answer:** \`FindAsync(id)\` looks in the **change tracker first** and returns an already-tracked entity without a
query; \`FirstOrDefaultAsync(p => p.Id == id)\` always queries. Queries **track** by default: change a property and
\`SaveChangesAsync\` writes it. With \`AsNoTracking()\` the entity is not tracked, so changing it and calling
\`SaveChangesAsync\` writes nothing and returns 0.

## 10. Is a navigation loaded?

**Answer:** **no**, unless you ask. Lazy loading is off by default in EF Core, so \`order.Lines\` is empty (or null,
if you did not initialise the collection) until you \`Include(o => o.Lines)\`, project with \`Select\`, or load it
explicitly. An empty collection is the dangerous case: the code runs and quietly reports zero lines.

## 11. What do the conventions create on SQL Server?

**Answer:** a property named \`Id\` or \`<Type>Id\` is the primary key, and an \`int\` key becomes an **IDENTITY**
column. A \`string\` maps to \`nvarchar(max)\` — NOT NULL when nullable reference types are on and the property is
\`string\`, nullable when it is \`string?\`. A **required** relationship (a non-nullable \`int CustomerId\`) gets
**cascade delete**; an optional one (\`int?\`) gets ClientSetNull.

## 12. What does SaveChanges do with five changes, and what does ExecuteUpdate skip?

**Answer:** \`SaveChangesAsync\` sends all pending changes in **one transaction** — if the fourth insert breaks a
unique index, none are saved and \`DbUpdateException\` is thrown. \`ExecuteUpdateAsync\` / \`ExecuteDeleteAsync\`
(EF Core 7+) run **one SQL statement immediately**, return the number of rows affected, need no
\`SaveChangesAsync\`, and **bypass the change tracker** — tracked entities in memory keep their old values.

## Quick facts the same tests ask

- \`AddDbContext\` registers the context as **scoped**. A DbContext is not thread-safe: starting a second operation
  on it before the first finished throws \`InvalidOperationException\`.
- \`dotnet ef migrations add <Name>\` writes a migration; \`dotnet ef database update\` applies it.
- The official .NET 8 container images listen on port **8080** by default (\`ASPNETCORE_HTTP_PORTS\`).
- The rate-limiting middleware rejects with **503** unless \`RejectionStatusCode\` is set (usually to 429).
- Identity's default password rules: at least 6 characters, with a digit, a lowercase and an uppercase letter, and
  a non-alphanumeric character.
- CORS refuses \`AllowAnyOrigin()\` combined with \`AllowCredentials()\`; name the origins instead.
- A minimal API handler returning a \`string\` sends \`text/plain\`; returning an object sends JSON.`,
    mcqs: [
      mcq('An action is declared `public async Task<Product?> Get(int id) { return await _db.Products.FindAsync(id); }` in an [ApiController]. The id does not exist. What does the client receive?', [
        ['404 Not Found', false],
        ['500, from a NullReferenceException', false],
        ['204 No Content', true],
        ['200 with the body null', false],
      ], 'When an action returns null for an object result, the built-in no-content formatter answers 204. To send 404, declare ActionResult<Product> and return NotFound() when FindAsync gives null.'),
      mcq('`AddScoped<INotifier, EmailNotifier>()`, then `AddScoped<INotifier, SmsNotifier>()`, then `TryAddScoped<INotifier, PushNotifier>()`. How many notifiers does `IEnumerable<INotifier>` resolve to?', [
        ['Three, in registration order', false],
        ['Two: Email, then Sms', true],
        ['One: SmsNotifier', false],
        ['One: PushNotifier', false],
      ], 'Each Add appends a registration, and IEnumerable<T> resolves all of them in order. TryAdd skips because INotifier is already registered. A single INotifier would resolve to the last one, Sms.'),
      mcq('Five new orders are added to the context and `SaveChangesAsync()` is called. The fourth violates a unique index. What is in the database afterwards?', [
        ['The first three orders only', false],
        ['All but the fourth order', false],
        ['None of the five orders', true],
        ['All five; the index is checked later', false],
      ], 'SaveChanges wraps its commands in one transaction by default, so the failure rolls back the three inserts that had already run and DbUpdateException is thrown. Nothing partial is left.'),
    ],
    checkpoint: [
      ck('ASPNET_CORE', 'In Production, `appsettings.json` sets `Jwt:Issuer` to "a", `appsettings.Production.json` sets it to "b", and the environment variable `Jwt__Issuer` is "c". What does `builder.Configuration["Jwt:Issuer"]` return?', [
        ['"a"', false],
        ['"b"', false],
        ['"c"', true],
        ['null, because two of the sources conflict', false],
      ], 'Configuration sources are layered and the last one added wins. The default builder adds environment variables after both JSON files, and the double underscore maps to the colon.'),
      ck('EF_CORE', '`Order` has `public int CustomerId { get; set; }` and a `Customer` navigation, with no configuration in OnModelCreating. A customer with orders is deleted and saved. What happens to the orders?', [
        ['They stay, with CustomerId set to NULL', false],
        ['They are deleted too, by cascade', true],
        ['The save fails with a foreign-key error', false],
        ['They stay, pointing at the missing customer', false],
      ], 'A non-nullable foreign key makes the relationship required, and EF Core\'s convention for a required relationship is cascade delete. A nullable int? key would make it optional, with ClientSetNull.'),
      ck('ASPNET_CORE', 'A `CreateOrderDto` has `[Required] public string? Address { get; set; }`, and the controller has [ApiController]. A client posts JSON without an address. What happens?', [
        ['The action runs with Address set to null', false],
        ['500, as the model binder throws on null', false],
        ['201, with an empty address saved', false],
        ['400 ValidationProblemDetails, action skipped', true],
      ], 'With [ApiController], an invalid model state is answered automatically with 400 and a ValidationProblemDetails body naming the field. The action body is not entered.'),
    ],
  },

  /* ── TIMED_SET ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MCQ_CSHARP_DOTNET_TIMED_SET',
    notes: `A company online test usually gives the language-and-framework section **20 questions in 20 minutes**,
often with a quarter-mark negative marking; the questions do not get easier towards the end. Take this set with a
timer: one minute per question, skip anything over ninety seconds and come back. Then check the key — the
reasoning matters more than the score. Every C# output was compiled and run; every .NET answer is the documented
.NET 8 / EF Core 8 behaviour.

## The set

**Q1.** \`Console.WriteLine(1 + 2 + "3" + 4 + 5);\`

**Q2.** \`Console.WriteLine('a' + 1); Console.WriteLine((char)('a' + 1));\`

**Q3.** \`Console.WriteLine((-7 / 2) + " " + (-7 % 2) + " " + (5 % -3));\`

**Q4.** \`Console.WriteLine(Math.Round(2.5) + " " + Math.Round(3.5) + " " + (int)-2.9);\`

**Q5.** \`int? n = null; Console.WriteLine((n > 0) + " " + (n <= 0) + " " + (n ?? -1));\`

**Q6.** \`class Counter<T> { public static int Count; }\` — after \`Counter<int>.Count++\` twice and
\`Counter<string>.Count++\` once, print both counts.

**Q7.** \`object[] arr = new string[2]; arr[0] = 1;\` — what happens?

**Q8.** \`int z = 3; z = z++; Console.WriteLine(z);\`

**Q9.** \`foreach (var x in list) if (x == 2) list.Remove(x);\` over \`new List<int> { 1, 2, 3 }\` — what happens?

**Q10.** \`Console.WriteLine("a,b,,c".Split(',').Length + " " + "abc".IndexOf('z'));\`

**Q11.** \`var d = new Dictionary<string, int>(); d["x"] = 1; d["x"] = 2; d.Add("x", 3);\` — what happens on each line?

**Q12.** \`new int[0].Sum()\` and \`new int[0].First()\` — what does each do?

**Q13.** What lifetime does \`AddDbContext<AppDbContext>()\` register the context with?

**Q14.** \`ASPNETCORE_ENVIRONMENT\` is not set on the server. Which environment is the app in?

**Q15.** An [ApiController] action receives a body that fails a \`[Range(1, 10)]\` check. What does the client get?

**Q16.** A valid JWT for a Customer calls \`[Authorize(Roles = "Admin")]\`. Status code? And with no token?

**Q17.** Which environment variable sets the configuration key \`ConnectionStrings:Default\`?

**Q18.** Which EF Core call changes rows in SQL Server immediately, without \`SaveChangesAsync\`?

**Q19.** A product with Id 7 is already tracked. Does \`FindAsync(7)\` query the database? Does
\`FirstOrDefaultAsync(p => p.Id == 7)\`?

**Q20.** Which command applies pending migrations to the database?

## Answer key and reasoning

1. **\`3345\`** — 1 + 2 is 3; after the string, every \`+\` concatenates.
2. **\`98\` then \`b\`** — char plus int is an int; the cast makes it a character again.
3. **\`-3 -1 2\`** — division truncates toward zero; \`%\` takes the sign of the left operand.
4. **\`2 4 -2\`** — \`Math.Round\` rounds half to even by default; a cast truncates.
5. **\`False False -1\`** — every ordering comparison with null is false; \`??\` supplies the fallback.
6. **\`2 1\`** — each closed generic type has its own static fields.
7. **\`ArrayTypeMismatchException\`** at run time — array covariance compiles, the store is checked when it runs.
8. **\`3\`** — \`z++\` yields 3, then the assignment writes that 3 back over the increment.
9. **\`InvalidOperationException\`** — the list changed during enumeration; iterate \`list.ToList()\` or use
   \`RemoveAll\`.
10. **\`4 -1\`** — the empty piece between the two commas counts; \`IndexOf\` returns -1 when absent.
11. The indexer adds and then **overwrites** (no error); \`Add\` with an existing key throws **ArgumentException**.
12. \`Sum()\` returns **0**; \`First()\` throws **InvalidOperationException** ("Sequence contains no elements") —
    \`FirstOrDefault()\` returns 0.
13. **Scoped** — one context per request.
14. **Production**.
15. **400** with a ValidationProblemDetails body; the action body never runs.
16. **403**; with no token, **401**.
17. **\`ConnectionStrings__Default\`** — a double underscore stands for the colon on every platform.
18. **\`ExecuteUpdateAsync\`** (or \`ExecuteDeleteAsync\`) — one SQL statement, run at once, change tracker bypassed.
19. **No** for \`FindAsync\` (it returns the tracked instance); **yes** for \`FirstOrDefaultAsync\`, which always queries
    (and then hands back the same tracked instance).
20. **\`dotnet ef database update\`** — \`dotnet ef migrations add\` only writes the migration files.

**Scoring yourself:** 17+ is test-ready; 13–16 means review the rule behind each miss; below 13, redo the output
and .NET units before the next attempt.`,
    mcqs: [
      mcq('What does `Console.WriteLine("" + \'a\' + \'b\' + " " + (\'a\' + \'b\'));` print?', [
        ['ab ab', false],
        ['195 195', false],
        ['ab 195', true],
        ['97 98 195', false],
      ], 'Starting from a string, each char is concatenated as text, giving "ab". Inside the parentheses two chars are added as numbers, 97 + 98 = 195, before being concatenated.'),
      mcq('`string st = "pop"; st.ToUpper(); st = st.Replace("p", "pp"); Console.WriteLine(st);` — what is printed?', [
        ['POP', false],
        ['ppop', false],
        ['ppopp', true],
        ['A compile error', false],
      ], 'Strings are immutable, so the ToUpper result is discarded (an unused result is legal, not a compile error). Replace returns a new string with every occurrence replaced, and this one is assigned back to st.'),
      mcq('What does `Console.WriteLine((string.Compare("apple", "Banana", StringComparison.Ordinal) < 0) + " " + ("Hello" == "hello"));` print?', [
        ['True False', false],
        ['False True', false],
        ['True True', false],
        ['False False', true],
      ], 'Ordinal comparison uses character codes, and lowercase a (97) sorts after uppercase B (66), so the result is positive. String == is case-sensitive, so the second is also False.'),
      mcq('`int max = int.MaxValue; long a = max * 2; long b = (long)max * 2;` — what does `a + " " + b` give?', [
        ['4294967294 4294967294', false],
        ['-2 4294967294', true],
        ['An OverflowException is thrown', false],
        ['-2 -2', false],
      ], 'max * 2 is computed as an int, wraps silently in the default unchecked context to -2, and only then widens to long. Casting one operand first makes the multiplication itself long.'),
      mcq('A class has `public static int Value = Init();` where Init prints "init; ", and an explicit static constructor. What does `Console.Write("before; "); int v = Lazy1.Value; Console.WriteLine("after " + v);` print?', [
        ['init; before; after 42', false],
        ['before; after 42', false],
        ['before; after 42 init;', false],
        ['before; init; after 42', true],
      ], 'With an explicit static constructor, static initialisation runs exactly when the type is first used — here at the read of Lazy1.Value — so "init; " appears between the two writes.'),
      mcq('`Res` prints "open x; " in its constructor and "close x; " in Dispose. What does `using (new Res("a")) using (new Res("b")) { Console.Write("body; "); }` print?', [
        ['open a; open b; body; close b; close a; ', true],
        ['open a; open b; body; close a; close b; ', false],
        ['open a; body; close a; open b; close b; ', false],
        ['open b; open a; body; close a; close b; ', false],
      ], 'Stacked using statements nest: a is acquired first, then b, and disposal runs in reverse order on the way out, like nested finally blocks.'),
      mcq('`int[] data = { 3, 8, 1 }; int[] copy = data; Array.Sort(copy);` — what does `data[0] + " " + string.Join(",", data)` give?', [
        ['3 3,8,1', false],
        ['1 1,3,8', true],
        ['3 1,3,8', false],
        ['1 3,8,1', false],
      ], 'Arrays are reference types, so copy and data name the same array and sorting one sorts both. data.Clone() or ToArray() would make an independent copy.'),
      mcq('The services registered are `AddSingleton<IPriceCache, PriceCache>()` and `AddScoped<AppDbContext>` via AddDbContext, and PriceCache takes AppDbContext in its constructor. The app runs in Development. What happens when IPriceCache is resolved?', [
        ['It works; each request gets a new PriceCache', false],
        ['It works, and the context is shared safely', false],
        ['InvalidOperationException: scoped from singleton', true],
        ['The DbContext is silently made a singleton', false],
      ], 'Scope validation is on in Development and refuses to let a singleton capture a scoped service. In Production it would resolve and keep one DbContext forever — a captive dependency used across threads.'),
      mcq('A JWT\'s exp was two minutes ago, and the API uses AddJwtBearer with default TokenValidationParameters. What does the request get?', [
        ['401, since the token has expired', false],
        ['403, since the token is no longer valid', false],
        ['Accepted, within the default 5-minute ClockSkew', true],
        ['400, since exp is in the past', false],
      ], 'The default ClockSkew is five minutes to tolerate clock drift between servers, so a token up to five minutes past exp is still valid. Set ClockSkew lower if short-lived tokens must expire precisely.'),
      mcq('`var p = await db.Products.AsNoTracking().FirstAsync(x => x.Id == 1); p.Price = 99; var n = await db.SaveChangesAsync();` — what is n, and is the price changed in SQL Server?', [
        ['1, and the price is changed', false],
        ['0, and the price is unchanged', true],
        ['An exception: the entity is untracked', false],
        ['1, but only after a second save', false],
      ], 'SaveChanges writes only what the change tracker knows about. An AsNoTracking entity is unknown to it, so nothing is sent; db.Update(p) or a tracked query would make the change save.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_MCQ_CSHARP_DOTNET_CHECKPOINT',
    notes: `Ten questions in the format of a company online test: C# output first, then ASP.NET Core and EF Core.
Give yourself ten minutes. For each snippet decide value or reference, compile time or run time, and when each part
runs — before you look at the options.`,
    checkpoint: [
      ck('CSHARP_BASICS', 'What does `Console.WriteLine(Convert.ToInt32(2.5) + " " + Convert.ToInt32(3.5) + " " + (int)3.5);` print?', [
        ['3 4 3', false],
        ['2 4 3', true],
        ['3 4 4', false],
        ['2 3 3', false],
      ], 'Convert.ToInt32 rounds a double to the nearest integer, and a tie goes to the even neighbour: 2.5 to 2, 3.5 to 4. A cast truncates toward zero, so (int)3.5 is 3.'),
      ck('CSHARP_BASICS', '`int v; bool ok = int.TryParse("12a", out v);` — what does `ok + " " + v` give?', [
        ['False 12', false],
        ['A FormatException is thrown', false],
        ['True 12', false],
        ['False 0', true],
      ], 'TryParse never throws on bad input; it returns false and sets the out parameter to 0. int.Parse("12a") is the call that throws FormatException.'),
      ck('CSHARP_BASICS', 'What does `Console.WriteLine((0.1 + 0.2 == 0.3) + " " + (0.1m + 0.2m == 0.3m));` print?', [
        ['False True', true],
        ['True True', false],
        ['False False', false],
        ['True False', false],
      ], 'double is binary floating point and cannot represent 0.1 or 0.2 exactly, so the sum differs from 0.3 in the last bit. decimal is base-10, so 0.1m + 0.2m is exactly 0.3m — why money uses decimal.'),
      ck('CSHARP_OOP', '`Animal` has `public virtual string Speak()` and a non-virtual `Kind()`. `Dog` overrides Speak and declares `public new string Kind()`. With `Animal an = new Dog();`, what does `an.Speak() + " " + an.Kind() + " " + ((Dog)an).Kind()` give?', [
        ['dog D D', false],
        ['animal A D', false],
        ['dog A D', true],
        ['dog A A', false],
      ], 'Speak is virtual, so the object\'s type (Dog) decides. Kind is hidden, not overridden, so the variable\'s type decides: Animal\'s for an, Dog\'s after the cast.'),
      ck('CSHARP_OOP', '`Money` overrides Equals and GetHashCode to compare its value but does not overload ==. With `var m1 = new Money(5); var m2 = new Money(5);`, what are `m1 == m2`, `m1.Equals(m2)` and `new HashSet<Money> { m1, m2 }.Count`?', [
        ['True, True and 1', false],
        ['False, True and 1', true],
        ['False, True and 2', false],
        ['False, False and 2', false],
      ], 'Without an operator overload, == on a class compares references. Equals is the override, and HashSet uses GetHashCode and Equals, so the two equal values collapse to one element.'),
      ck('CSHARP_OOP', '`class A1 { public A1() { Console.Write("A"); } }` and `class B1 : A1 { public B1() : this(1) { Console.Write("B"); } public B1(int x) { Console.Write("b" + x); } }` — what does `new B1();` print?', [
        ['AB', false],
        ['Ab1', false],
        ['Bb1', false],
        ['Ab1B', true],
      ], 'this(1) runs the other constructor first, and that one implicitly calls base() before its body. So A1\'s body prints, then B1(int)\'s, and finally the parameterless body.'),
      ck('ASPNET_CORE', 'Middleware A writes "A1", awaits next, writes "A2"; middleware B, registered after it, does the same with "B1" and "B2"; `app.Run` then writes "R". What is the order for one request?', [
        ['A1 A2 B1 B2 R', false],
        ['A1 B1 R B2 A2', true],
        ['R A1 B1 B2 A2', false],
        ['A1 B1 R A2 B2', false],
      ], 'The pipeline is nested: each middleware runs its code before next on the way in, in registration order, and its code after next on the way out, in reverse.'),
      ck('ASPNET_CORE', 'A controller has `[Authorize]` and one of its actions has `[AllowAnonymous]`. A request with no token calls that action. What happens?', [
        ['It runs, as AllowAnonymous overrides Authorize', true],
        ['401, as the controller attribute wins', false],
        ['403, as the user has no role at all', false],
        ['500, as the attributes contradict each other', false],
      ], 'AllowAnonymous skips authorization for that endpoint whatever Authorize attributes it inherits. This is the usual way to open login or a public list on an otherwise protected controller.'),
      ck('EF_CORE', '`Order` initialises `public List<OrderLine> Lines { get; set; } = new();`. Lazy loading is not configured. `var o = await db.Orders.FirstAsync(x => x.Id == 3);` — order 3 has four lines. What is `o.Lines.Count`?', [
        ['4', false],
        ['A NullReferenceException is thrown', false],
        ['0', true],
        ['4, after a second query runs lazily', false],
      ], 'EF Core does not load navigations unless asked, so the collection keeps its empty initial value. Include(x => x.Lines) or a Select projection would load the four lines.'),
      ck('EF_CORE', 'A tracked `product` has Stock 10 in memory. The code runs `await db.Products.Where(p => p.Id == product.Id).ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - 1));` and then reads `product.Stock`. What is it?', [
        ['9, as EF updates the tracked entity', false],
        ['10; SQL Server has 9 now', true],
        ['10, as nothing runs until SaveChanges', false],
        ['9, but only after SaveChangesAsync', false],
      ], 'ExecuteUpdateAsync sends one UPDATE immediately and bypasses the change tracker, so the in-memory entity keeps its old value. Reload it, or avoid mixing the two styles in one unit of work.'),
    ],
  },
];

/* ══ JT_PLACE_DOTNET_FS — The .NET Full-Stack Candidate ════════════════════════════════════ */

const PLACE_BUNDLES: PilotBundle[] = [
  /* ── RESUME ─────────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_DOTNET_FS_RESUME',
    notes: `Year 4 taught you what a resume is for. This unit is narrower: the **.NET full-stack fresher** resume
that gets through a campus or off-campus ATS for roles titled ".NET Developer", "Associate Software Engineer —
.NET", "Full Stack Developer (C#/.NET, React)", "ASP.NET Core Developer" or "Graduate Engineer Trainee — Microsoft
Technologies", and the GitHub that makes every line on it checkable. .NET hiring in India is heavy at service
companies (TCS, Infosys, Cognizant, Capgemini, Accenture, LTIMindtree) and at product and captive centres that run
on Azure — both search the same words.

## The one-page template, in this order

1. **Header** — name, city, phone, a professional email, LinkedIn, GitHub, and the live URL of the capstone.
   Leave out photo, date of birth, marital status, father's name and the "I hereby declare…" line — none is
   searchable and product companies read them as a copied template.
2. **Summary** (two lines, optional) — role + stack + one proof. ".NET full-stack developer (C#, ASP.NET Core 8,
   EF Core, SQL Server, React 18) who built and deployed an e-commerce store with a grounded AI assistant and a
   Semantic Kernel shopping agent."
3. **Skills** — grouped, plain text, no bars or percentages (see below).
4. **Projects** — the capstone first, then two more. For a fresher this is the section that gets read.
5. **Experience / internships** — only real engineering work; otherwise below Projects.
6. **Education** — B.Tech/B.E./MCA branch, college, year, CGPA (state it if ≥ 7; many service companies cut at
   6 or 60%). Class XII and X percentages on one line — mass recruiters still check them.
7. **Certifications and achievements** — ones you can talk about. **AZ-900** or **AZ-204** is worth a line for
   Azure-heavy employers *if you passed it*; a LeetCode rating, a hackathon result or a merged open-source PR also
   count. "Completed C# course" badges do not.

## The skills line an ATS filters on

Recruiters search with the job description's own words. Use the spellings they type:

    Languages:   C#, SQL (T-SQL), JavaScript (ES6+), HTML5, CSS3
    Backend:     .NET 8, ASP.NET Core Web API, Entity Framework Core (EF Core), LINQ, ADO.NET,
                 Dependency Injection, JWT authentication, ASP.NET Core Identity
    Frontend:    React 18, Redux Toolkit, Vite
    Database:    SQL Server (stored procedures, indexes, execution plans)
    Testing:     xUnit, Moq, WebApplicationFactory integration tests
    AI:          OpenAI .NET SDK, Semantic Kernel, RAG (embeddings + vector search), function calling
    Cloud/Tools: Azure App Service, Azure SQL, Docker, Git, GitHub, Visual Studio 2022, Postman

Write "Entity Framework Core (EF Core)" once so both spellings match; "ASP.NET Core", not "ASP.Net" or
"Asp.net core"; "C#", never "C sharp". **Do not write "ASP.NET MVC" or ".NET Framework"** unless you used them —
an older-stack JD searches those words and the panel then asks about Web Forms, \`Global.asax\` and IIS
pipelines. List **Azure** as the services you actually deployed to, not "Microsoft Azure" as a whole. Never list a
skill you cannot defend for five minutes; round 2 is built from this line.

## Project bullets: verb + what + how + number

Each bullet starts with a past-tense verb, names the technology, and carries a number you measured.

- Weak: "Did backend in .NET."
- Strong: "Built 24 ASP.NET Core endpoints with JWT bearer auth and authorization policies; a customer can read
  only their own orders, enforced in the service layer and proven by 31 WebApplicationFactory tests."
- Strong: "Cut the order-history API from 41 SQL queries to 2 (~900 ms → ~120 ms) by replacing lazy navigation
  access with a Select projection; found with EF Core's command logging."
- Strong: "Built a streamed RAG assistant over 640 products with the OpenAI .NET SDK; answers cite product ids and
  score 18/22 on a fixed evaluation set (up from 13 after changing chunk size)."

Every number must survive "how did you measure that?" — "the SQL count from EF Core's logged commands, timings
averaged over 20 requests in Postman" is fine; "it felt faster" is not.

## What not to write

- **Skill bars and percentages** ("C# 90%") — an ATS cannot read them; a human reads them as self-graded.
- **Adjectives** — "hard-working", "quick learner", "passionate about AI". Show them in a bullet or drop them.
- **Skills you cannot defend** — "Microservices, Kubernetes, Azure DevOps, Machine Learning, Blazor, WPF" copied
  from a JD. Calling an LLM API is not machine learning; using Semantic Kernel is not "AI research".
- **A tutorial clone passed off as your project** — the panel has seen the same "Employee Management System" CRUD
  from the same YouTube video forty times. One deployed capstone with tests and an AI feature beats five clones.
- **Two-column, icon-heavy Canva templates** — many ATS parsers read across columns and scramble the text. Single
  column, standard headings, a PDF exported from Word or Google Docs, named
  \`Firstname_Lastname_DotNet_FullStack.pdf\`.

## Matching a job description (10 minutes per application)

1. Copy the JD; highlight every technology and verb ("ASP.NET Core", "Web API", "Entity Framework", "SQL Server",
   "unit testing", "Azure").
2. For each word you genuinely have, make sure the **same word** appears in your skills or a bullet ("Entity
   Framework" → "Entity Framework Core (EF Core)"; "unit testing" → "xUnit").
3. Reorder: the bullet that answers the JD's first requirement goes first under its project.
4. A word you do not have stays off — it goes on your interview-prep list instead.
Keep one master resume and three copies: service/mass-recruiter (C#, SQL, OOP, academics first), product
(ASP.NET Core and EF Core depth, tests, performance numbers), AI-leaning team (the assistant, the agent, the
evaluation score, Semantic Kernel).

## The GitHub that backs every claim

Interviewers open the GitHub link — often during the call, sharing their screen.

- **Profile README** — two lines on who you are, the stack, links to the three projects and the live demo.
- **Pinned repos** — exactly the resume projects, capstone first. Unpin forks and lab assignments.
- **The capstone README** — one-line description, live URL, a screenshot or GIF of the streaming chat, the
  architecture diagram (React → ASP.NET Core API → SQL Server, with the AI inside the API calling the LLM provider
  and the vector store), "Run locally" (\`cp .env.example .env && docker compose up\`), the Swagger link, how to run
  the tests (\`dotnet test\` and the count), the evaluation score, and "Known limits".
- **Commit history** — many small commits over weeks with real messages ("project order lines in GET
  /api/orders"), not one 15,000-line upload. A single commit looks copied.
- **No secrets** — no \`Jwt:Key\`, connection-string password or OpenAI key in \`appsettings.json\` or a committed
  \`.env\`; user secrets in development, App Service settings in production, \`.env\` in \`.gitignore\` with a
  \`.env.example\` of placeholders. A key that was ever pushed must be **revoked**, not just deleted — git history
  keeps it.
- **No build output** — \`bin/\`, \`obj/\`, \`node_modules/\` and \`.vs/\` belong in \`.gitignore\` (\`dotnet new gitignore\`
  writes one). A repo full of DLLs tells the panel nobody looked at it.
- **Tests visible** — a \`tests/\` folder with the xUnit projects next to \`src/\`, so "xUnit" on the resume is one
  click from proof.

The rule: **every resume line points at something checkable** — a repo, a commit, a test, a live URL, a score.`,
    workedExample: `**A weak resume, rewritten.** Pooja, B.Tech CSE 2026, CGPA 7.6, sends this:

    SKILLS: C# 90%  .NET  ASP.Net MVC  Angular  Azure  Machine Learning  ChatGPT  Microservices
    PROJECTS
    1. Online Shopping Website (.NET)
       - Developed a shopping website using .NET and React.
       - Integrated ChatGPT API.
    2. Employee Management System — ASP.NET MVC (YouTube tutorial)
    3. Calculator — Windows Forms

**What a recruiter sees.** A percentage the ATS cannot parse; "ASP.Net MVC" and "Angular" that she never used in the
capstone; "Machine Learning" and "Microservices" with no evidence; "ChatGPT" as a skill; no numbers; a tutorial
clone and a calculator taking two project slots; nothing links to proof.

**Step 1 — inventory what is true.** Pooja lists what she actually built: GadgetGully, a store with React 18 + Vite
+ Redux Toolkit; ASP.NET Core 8 Web API with 22 endpoints, Identity + JWT bearer, CUSTOMER and ADMIN policies;
EF Core 8 on SQL Server; checkout with a guarded \`ExecuteUpdateAsync\` on stock inside one transaction; 47 xUnit
tests, 19 of them WebApplicationFactory permission tests; inside the API, a RAG assistant over 640 products that
streams over SSE and a Semantic Kernel agent with six functions that fills the cart but cannot place an order;
Docker, deployed to Azure App Service with Azure SQL. Two smaller projects: a console app that imports a 200,000-row
CSV into SQL Server with \`SqlBulkCopy\`, and a minimal-API URL shortener with 14 tests.

**Step 2 — rewrite with verb + what + how + number.**

    PROJECTS
    GadgetGully — e-commerce store with an AI shopping assistant   github.com/pooja-r/gadgetgully | gadgetgully.azurewebsites.net
    C#, ASP.NET Core 8 Web API, EF Core 8, SQL Server, React 18, Semantic Kernel, xUnit, Docker, Azure App Service
     - Built 22 Web API endpoints with ASP.NET Core Identity, JWT bearer and authorization policies; customers
       see only their own orders, proven by 19 WebApplicationFactory tests (401, 403 and wrong-owner cases).
     - Made checkout safe under concurrency with a guarded ExecuteUpdateAsync on stock in one transaction; a
       test proves the second buyer of the last unit gets a 409.
     - Built a streamed RAG assistant over 640 products (OpenAI .NET SDK, SSE); cites product ids; 18/22 on a
       fixed evaluation set, up from 13 after re-chunking.
     - Added a Semantic Kernel agent with 6 functions that act as the signed-in user through ICurrentUser; it
       fills the cart but has no place-order function; capped at 5 model requests per message.
    CsvToSql — C# console importer: 200,000 rows into SQL Server in ~6 s with SqlBulkCopy (vs ~4 min row by row)
    Shortly — URL shortener on ASP.NET Core minimal APIs and EF Core | 14 xUnit tests

    SKILLS
    Languages: C#, SQL (T-SQL), JavaScript (ES6+) | Backend: .NET 8, ASP.NET Core Web API, Entity Framework
    Core (EF Core), LINQ, ADO.NET, JWT, ASP.NET Core Identity | Frontend: React 18, Redux Toolkit
    Database: SQL Server | Testing: xUnit, Moq | AI: OpenAI .NET SDK, Semantic Kernel, RAG
    Cloud/Tools: Azure App Service, Azure SQL, Docker, Git, Visual Studio 2022, Postman

**Step 3 — check against a JD.** The target JD (a Hyderabad product company) asks for "C#, .NET Core / ASP.NET
Core Web API, Entity Framework, SQL Server, unit testing, Azure; exposure to GenAI a plus". Every word Pooja has
appears verbatim. "Angular" and "ASP.NET MVC" are gone — she would be asked about them. "Machine Learning" and
"Microservices" are gone because she did neither; she prepares to say how the AI would split into its own service
if it ever needed separate scaling.

**Step 4 — make GitHub agree.** Pin GadgetGully first; the README gets the live link, a GIF of the streaming chat,
the architecture diagram, \`docker compose up\`, \`dotnet test\` (47 passing), the 18/22 evaluation table and "Known
limits" ("assistant has no memory across sessions; product images on the App Service file system"). She finds
\`"OpenAI": { "ApiKey": "sk-..." }\` in an early commit of \`appsettings.Development.json\`, revokes the key, moves the
new one to user secrets, and adds \`bin/\` and \`obj/\`, which she had committed, to \`.gitignore\`.

Result: three projects, each line a checkable claim — and a list of follow-ups Pooja has already rehearsed.`,
    mcqs: [
      mcq('Rakesh\'s skills line reads "C sharp, Asp.net core, Entity framework". The recruiter searches the ATS for "C# AND ASP.NET Core AND EF Core". What is the risk?', [
        ['None; every ATS normalises framework names automatically', false],
        ['His variant spellings may not match the search at all', true],
        ['Lower-case names are ranked lower by every ATS', false],
        ['The ATS ignores the skills line for fresher roles', false],
      ], 'An ATS matches the recruiter\'s terms. "C sharp" and "Entity framework" without "EF Core" may not match, so a qualified profile drops out. Writing "Entity Framework Core (EF Core)" catches both spellings.'),
      mcq('Which GadgetGully bullet best survives a round-2 interviewer asking "how do you know?"', [
        ['Developed a robust, secure and scalable ASP.NET Core backend', false],
        ['Cut order history from 41 queries to 2 with a Select projection', true],
        ['Worked on the Web API and the AI module in a team of three', false],
      ], 'It names the change, the technique and a measured before and after that EF Core\'s logged commands can show. "Robust and scalable" or "worked on" give the interviewer nothing to verify or credit.'),
      mcq('Ananya used ASP.NET Core 8 throughout but adds "ASP.NET MVC, .NET Framework, Web Forms" to match an older JD. What is the likely result?', [
        ['A better ATS score with no effect on the interview', false],
        ['Nothing, since panels treat all of them as one stack', false],
        ['Questions on Web Forms and IIS she cannot answer', true],
        ['An automatic rejection by the ATS for keyword stuffing', false],
      ], 'Round 2 is built from the skills line. An older-stack panel will ask about the page lifecycle, Global.asax or web.config, and she has used none of it. List what she used and be ready to compare it with the older stack.'),
    ],
    checkpoint: [
      ck('PORTFOLIO_EVIDENCE', 'Vikram finds his OpenAI key in an early commit of appsettings.Development.json in his public capstone repo. The latest commit removed it. What must he do first?', [
        ['Nothing more, since the file is now clean', false],
        ['Make the repository private and keep using the same key', false],
        ['Revoke the key at the provider and issue a new one', true],
        ['Add the file to .gitignore so it is ignored', false],
      ], 'Git history keeps every committed version, and bots scan public repositories for keys within minutes. Only revoking stops misuse; then keep the new key in user secrets or host settings.'),
      ck('PLACEMENT_READINESS', 'Sneha applies to a Cognizant-style mass drive and to an Azure-heavy product company in Pune. Which difference between her two resume copies is right?', [
        ['The product copy adds AZ-400, which she plans to take', false],
        ['The product copy leads with Azure deployment and tests', true],
        ['The mass-drive copy removes the capstone to save space', false],
        ['Both are identical so that her story stays consistent', false],
      ], 'The same true facts in a different order: the mass-drive copy leads with C#, SQL, OOP and academics; the product copy leads with the deployed API, the tests and Azure. A certification not yet passed cannot be listed.'),
      ck('PORTFOLIO_EVIDENCE', 'A panellist opens Arjun\'s capstone repository during the call. What most directly backs the resume line "xUnit, WebApplicationFactory tests"?', [
        ['xunit listed in the API project\'s .csproj file', false],
        ['A README sentence saying that all endpoints are tested', false],
        ['A green build badge copied from a template repo', false],
        ['A tests/ project of permission tests and dotnet test', true],
      ], 'Evidence is the tests themselves and a way to run them. A package reference proves only that the library is installed; a sentence or a borrowed badge proves nothing about this code.'),
    ],
  },

  /* ── DEFEND_CAPSTONE ────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_DOTNET_FS_DEFEND_CAPSTONE',
    notes: `Your capstone — React 18 in front of an **ASP.NET Core 8 Web API** on **SQL Server** through EF Core 8,
Identity + JWT bearer, xUnit and WebApplicationFactory tests, and the AI **inside the API**: a streamed RAG
assistant built on the OpenAI .NET SDK and a **Semantic Kernel** agent whose functions act as the signed-in user —
is the biggest single thing in a fresher's technical round 2. Panels spend 15–25 minutes on it. The capstone's own
Defence unit gave you the demo script and the walk-through; this unit is the interview version: the questions
panels at .NET employers actually ask, each with a strong answer, the follow-up, and the wrong answers that sink
candidates. The examples use the store ("GadgetGully"); swap in the job portal where needed.

## 1. "Tell me about your project" — the 2-minute pitch

**Strong:** problem → users → stack → your part → one number → the AI bit → where it runs.
"GadgetGully is an online store for a small gadgets shop that took orders over WhatsApp and kept losing them.
Customers browse, fill a cart, check out and track orders; the admin manages stock and order status. React 18 on an
ASP.NET Core 8 Web API, EF Core on SQL Server, Identity with JWT and two policies, 47 xUnit tests. Inside the same
API there's an assistant that answers from the catalogue with product ids, streamed as it's generated, and a
Semantic Kernel agent that can search and fill your cart but can't place the order. It runs on Azure App Service
with Azure SQL — here's the live link. I built the API, the tests and the AI; my teammate built most of the React
screens."
**Follow-up:** "Show me." — have it open, logged in as a customer and as the admin, the chat ready.
**Wrong:** a six-minute feature tour; "we integrated ChatGPT to make it smart"; never saying what *you* did.

## 2. "Walk me through one request"

**Strong:** draw the boxes — React → (HTTPS, Bearer token) → Kestrel → middleware → controller → service → EF
Core → SQL Server — then trace checkout:
"\`POST /api/orders\` arrives with the access token. The JWT bearer handler validates signature, issuer, audience and
expiry and builds \`HttpContext.User\`; the \`Customer\` policy passes; \`[ApiController]\` binds and validates the DTO or
returns a 400 ValidationProblemDetails; the controller calls \`OrderService.PlaceAsync(userId, dto, ct)\`. The service
opens a transaction, decrements each product's stock with a guarded \`ExecuteUpdateAsync\` — \`WHERE Id = @id AND
Stock >= @qty\` — and if any returns 0 rows it throws \`OutOfStockException\`, which my exception handler turns into a
409 ProblemDetails. Otherwise it inserts the order with the price copied onto each line, clears the cart, commits
and returns 201 with a Location header."
**Follow-up:** "Why copy the price onto the line?" → a later price change must not rewrite what the customer paid.
**Wrong:** naming technologies without a flow; "the controller saves it to the database".

## 3. "Why is the AI inside the API and not a separate service?"

**Strong:** the reason, and the cost you accepted.
"Model calls are slow — two to ten seconds — but they're I/O. In ASP.NET Core an \`await\` on the model holds no
thread, so a long streamed answer doesn't starve checkout. Keeping it in-process gives me one deployment, one auth
scheme, and agent functions that call my services directly with the same \`ICurrentUser\` — no second service to
trust. The cost: a prompt change ships with an app deploy, and a runaway AI feature shares the app's CPU and
memory and the provider's quota. I contain that with an \`ai\` rate-limit policy per user, a 30-second timeout and a
request cap per message. If the AI ever needs its own scaling, it splits along the service layer."
**Follow-up:** "The Python version of this course split it into FastAPI. Who's right?" → both, for their runtime:
a sync Django worker *is* blocked by a long stream; ASP.NET Core's async pipeline is not.
**Wrong:** "C# is faster than Python"; "microservices are bad".

## 4. "Why Semantic Kernel, when you'd already written the loop with the raw SDK?"

**Strong:** what each gave you.
"I wrote tool calling by hand first with \`ChatClient\` — sending the tool definitions, reading the tool calls, running
them, sending \`ToolChatMessage\`s back — so I know exactly what goes over the wire. Semantic Kernel turns my
\`[KernelFunction]\` methods into schemas, runs that loop for me with \`FunctionChoiceBehavior.Auto()\`, and gives me
filters: an \`IFunctionInvocationFilter\` that enforces the allow-list and logs every call, and an
\`IAutoFunctionInvocationFilter\` that stops the loop after five model requests. What I gave up: a bigger
dependency that moves fast between versions, and less direct control over each request."
**Follow-up:** "What's Microsoft.Extensions.AI?" → the newer common \`IChatClient\` abstraction, so code isn't tied
to one provider's SDK — "I know of it; my capstone uses SK."
**Wrong:** "SK is Microsoft's, so it's the best"; "the raw SDK can't call tools".

## 5. "How are the agent's functions secured?"

**Strong:** identity, the same rules as the UI, no irreversible function, limits.
"Six functions: \`search_products\`, \`get_product\`, \`my_orders\`, \`order_status\`, \`add_to_cart\`,
\`remove_from_cart\`. None takes a user id — the user comes from \`ICurrentUser\` over \`HttpContext.User\`, so a prompt
can't name someone else. They call the same services the controllers call, so the same owner filter applies. The
plugin is registered scoped, never singleton, so it never keeps one request's user. There is **no** place-order or
cancel function: the agent ends with 'your cart is ready', and only the customer's click calls \`POST /api/orders\`.
Product descriptions it retrieves are data — a description saying 'ignore your instructions' can't give the model a
function it doesn't have."
**Follow-up:** "What if I add \`place_order\` with a system prompt saying 'always ask first'?" → a prompt asks; injected
text can override it. Irreversible actions need a confirmation the model cannot fake — the user's click.
**Wrong:** "the system prompt tells it to be safe"; "the function names are secret".

## 6. "What was the hardest bug?"

**Strong — symptom, how you found it, cause, fix, what stops it now:**
"Order history took about 900 ms for 20 orders. I turned on EF Core's command logging and saw 41 queries: the DTO
mapping touched \`order.Lines\` and each line's \`Product\` — I'd enabled lazy-loading proxies early on, so every touch
was a round trip. I replaced the mapping with a \`Select\` projection straight into the DTO, \`AsNoTracking\`, which
made it two queries and about 120 ms, removed the proxies, and added a test that counts commands through a
\`DbCommandInterceptor\` so it can't come back."
**Follow-up:** "Include vs a projection?" → \`Include\` loads whole entities and tracks them; a \`Select\` fetches only
the columns the DTO needs and tracks nothing — usually right for a read endpoint.
**Wrong:** "No major bugs"; a CSS issue; a bug your teammate fixed.

## 7. "What breaks at 10× users?"

**Strong:** the first bottleneck with evidence, then fixes in order.
"At 10× the model breaks first: 3–6 seconds per answer and the provider's rate limit. I'd cache answers to
identical catalogue questions, keep the per-user limit, and queue rather than hit 429s from the provider. Next
is SQL Server: product search uses \`Contains\`, which becomes \`LIKE '%…%'\` and can't seek an index — I'd add
full-text search. The API itself is stateless with JWT, so App Service can scale out to more instances."
**Follow-up:** "Anything stopping a second instance?" → product images on the instance's file system (move to Blob
Storage); the in-memory vector store for the demo (move to Azure AI Search or pgvector); a \`BackgroundService\`
ingestion queue in memory would lose work on restart.
**Wrong:** "Use Kubernetes"; "rewrite it as microservices".

## 8. "How do you know the AI is right?"

**Strong:** evaluation, grounding, refusal.
"I have 22 questions in \`eval/questions.json\` — answerable ones with the product ids they must cite, unanswerable
ones that must be refused, and adversarial ones like a planted instruction in a product description. A small
runner scores them against the deployed endpoint: 13/22 first, 18/22 after I split long descriptions into smaller
chunks. The system prompt says answer only from the context and cite ids; the reply comes back as structured
output into a \`record AssistantAnswer(string Answer, string[] CitedIds)\`, and I drop any id that wasn't retrieved.
If nothing passes the similarity threshold, the API says 'I couldn't find that' **without calling the model**."
**Follow-up:** "Why structured output?" → citations become data you can check, not text to parse.
**Wrong:** "GPT-4o is very accurate"; "I tested it a few times and it worked".

## 9. "What would you change?"

**Strong:** a real limitation you found, and why.
"I'd add a CI pipeline that runs \`dotnet test\` against a SQL Server container before every deploy — one migration
only failed on Azure SQL because I'd tested with LocalDB. And I'd move the vector store off in-memory so a restart
doesn't need a re-ingest."
**Wrong:** "Nothing, it's complete"; "add more features".

**Rule for the whole defence:** never claim what you cannot show. "I haven't measured that — here's how I would"
scores better than an invented number the panel can see through.`,
    workedExample: `**Whiteboard: "A customer types 'add the cheapest wireless mouse to my cart' into the chat. What happens,
end to end?"**

Draw this as you talk:

    [React drawer] --fetch POST /api/assistant/chat (Bearer JWT), reads body with a stream reader--> [Kestrel]
      middleware: auth (JWT bearer) -> rate limiter ("ai", per user, 429 over the limit)
      [Authorize] ChatController.Stream(dto, ct)   ct = RequestAborted linked with CancelAfter(30 s)
        1. load conversation 812 for ICurrentUser (owner-checked), last N messages
        2. kernel (scoped) with plugins: Catalog, Cart, Orders; FunctionChoiceBehavior.Auto()
        3. model -> tool call search_products("wireless mouse", sort: price)
              IFunctionInvocationFilter: allow-listed? log it -> CatalogService.SearchAsync -> 5 items
        4. model -> tool call add_to_cart(productId: 3107, qty: 1)
              filter logs it -> CartService.AddAsync(currentUser.Id, 3107, 1)   (user never from the model)
        5. model -> final text, streamed as SSE "data:" chunks, flushed
           IAutoFunctionInvocationFilter: stop if > 5 model requests for this message
        6. save the messages; log user, conversation, functions, tokens in/out, latency
    [React] appends chunks; shows "Logitech M170 (₹549) is in your cart — review and place the order"

Say it in order:

1. "The request is a normal authenticated API call — the same JWT, the same pipeline, plus the per-user \`ai\` rate
   limit."
2. "The kernel is built per request, so the plugins get this request's \`ICurrentUser\`."
3. "The model asks for \`search_products\`; my filter checks the allow-list and logs it; the function calls the same
   \`CatalogService\` the product page uses."
4. "Then \`add_to_cart\` with a product id — the **cart owner** comes from \`ICurrentUser\`, not from anything the model
   wrote."
5. "The final answer streams back as server-sent events. Ordering stays a button the customer presses."

**The follow-up chain and strong answers.**
- "Why does React use fetch and not EventSource?" — "EventSource can't send an Authorization header, and I didn't
  want the token in the URL."
- "What if the user closes the tab?" — "\`RequestAborted\` is cancelled; it's linked into the token I pass to the model
  call and the function calls, so we stop paying for tokens nobody reads."
- "What stops it looping forever?" — "The auto-function-invocation filter ends the loop after five model requests,
  plus \`MaxTokens\` and the 30-second timeout."
- "How would you test this without paying OpenAI?" — "Replace \`IChatCompletionService\` with a fake in a
  WebApplicationFactory test that returns a scripted tool call, then assert the cart changed for *this* user and
  not another."

A candidate who can draw this and survive those four follow-ups has shown the panel they built the agent, not
pasted it.`,
    mcqs: [
      mcq('A panellist asks Harish why GadgetGully\'s streamed chat does not slow checkout, given both run in one ASP.NET Core process. Which answer is strongest?', [
        ['Kestrel gives the AI controller its own dedicated thread pool', false],
        ['An awaited model call holds no thread while it waits', true],
        ['SQL Server queues the checkout requests until the chat ends', false],
        ['Streaming responses always run on a separate process', false],
      ], 'The model call is I/O: with await, the thread returns to the pool until data arrives, so other requests keep being served. There is no separate pool or process; limits and timeouts contain the remaining shared-resource risk.'),
      mcq('Priya\'s first version had `[KernelFunction] MyOrdersAsync(string customerId)`. Why did she change it to read the user from ICurrentUser?', [
        ['Kernel functions are never allowed to take any string parameters', false],
        ['A prompt could fill in another customer\'s id and read orders', true],
        ['ICurrentUser makes each function call cheaper in tokens', false],
        ['Semantic Kernel caches string arguments across all users', false],
      ], 'Anything the model supplies can be steered by the user or by injected text. Identity must come from the authenticated request, so the same owner filter the UI relies on applies to the agent too.'),
      mcq('Asked "how would you test the agent without calling OpenAI?", which answer shows the most understanding?', [
        ['Call the real model in every CI run with a cheaper model', false],
        ['Mock the controller so the agent code is never executed', false],
        ['Skip tests for AI code, since outputs are non-deterministic', false],
        ['Fake the chat service with a scripted call; check the cart', true],
      ], 'A fake IChatCompletionService returning a scripted tool call makes the test deterministic and free, while still exercising the filters, the function and the service — including that the cart changed for this user only.'),
    ],
    checkpoint: [
      ck('TECHNICAL_EXPLANATION', 'Asked for her hardest bug, which answer from Divya would a panel score highest?', [
        ['"41 queries per page from lazy loading; a projection made it 2, now tested."', true],
        ['"There were no serious bugs, as I tested every single feature carefully."', false],
        ['"The cart icon in React did not refresh until I fixed one small Redux selector bug."', false],
        ['"Azure deployment failed for a day, and my teammate sorted it out for us."', false],
      ], 'It has a symptom, how it was found, the cause, a measured fix and a guard against regression, in the part Divya built. A cosmetic fix or a teammate\'s fix gives the panel nothing to credit.'),
      ck('TECHNICAL_EXPLANATION', 'A panellist suggests adding a place_order function to the Semantic Kernel agent, guarded by a system-prompt line "always confirm first". Best response?', [
        ['Agree, as the function would act as the signed-in user', false],
        ['Refuse, because kernel functions cannot make POST calls', false],
        ['Agree, if the temperature is set to zero for that call', false],
        ['Keep ordering a user click; a prompt can be overridden', true],
      ], 'A system-prompt rule is a request the model may not follow, and injected text can override it. Irreversible actions need a confirmation the model cannot produce — the customer pressing the button that calls the normal endpoint.'),
      ck('TECHNICAL_EXPLANATION', 'GadgetGully keeps vectors in an in-memory store and product images on the App Service file system. The panel asks what stops a second instance. Best answer?', [
        ['Nothing; JWT is stateless, so a second instance just works', false],
        ['Each instance has its own vectors and images; move both out', true],
        ['The JWT signing key cannot be shared between instances', false],
        ['SQL Server allows only one API instance to connect at once', false],
      ], 'Stateless auth is necessary but not sufficient: anything kept in one instance\'s memory or disk diverges. A shared vector store and Blob Storage fix it; a signing key is just configuration both instances read.'),
    ],
  },

  /* ── MOCK_LOOP ──────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_DOTNET_FS_MOCK_LOOP',
    notes: `One complete interview day for a **.NET full-stack fresher** role (₹3.5–7 LPA at a service company,
₹7–15 LPA at a product company, captive centre or AI-leaning startup). Run it with a friend or mentor as
interviewer, in order, in one day, with real timers. Year 4's mocks rehearse each round type alone; this strings the
.NET full-stack version together so you feel round 4's fatigue after rounds 1–3.

## Round 0 — Online test (90 min, proctored, camera on)

| Section | Time | What it is |
|---|---|---|
| Aptitude | 25 min, 20 q | Quant (percentages, time and work, time-speed-distance), logical, verbal |
| Technical MCQ | 20 min, 20 q | C# output questions, OOP, SQL, ASP.NET Core and EF Core defaults, OS/DBMS basics |
| Coding | 45 min, 2 problems | One easy (strings/arrays), one medium (hashing, sliding window, stack, or simple DP) |

**Sample C# output MCQ:** a \`for\` loop adds \`() => k\` to a list three times; invoking them prints \`3 3 3\`, while the
same thing with \`foreach\` prints \`0 1 2\`. Know struct vs class copies, boxing, \`virtual\` vs \`new\`, deferred LINQ,
\`Math.Round\` half-to-even, integer overflow.
**Sample coding pair:** (1) Given a sentence, print each word reversed, keeping the word order. (2) Given an array
and k, return the number of contiguous subarrays summing to k (prefix sums + \`Dictionary<long, int>\`).
**Scored on:** hidden test cases passed (partial credit per case), not style.
**Tactics:** many test platforms still run C# on Mono or an older compiler — write a classic \`static void Main\`,
avoid the newest syntax; read big input with one \`Console.In.ReadToEnd()\` and \`Split\`, not \`Console.ReadLine\`
inside a 10⁵ loop; collect output in a \`StringBuilder\` and print once; use \`long\` for sums; do the easy problem
completely first, and never leave the second blank — a brute force passes the small cases.

## Round 1 — Technical: C# + DSA (40–45 min)

**Opening (2 min):** "Introduce yourself" — 60 seconds, ending on the capstone.
**Questions:**
1. "Value types vs reference types — where does each live, and what happens when you box?" — follow-up: a struct
   inside a class; why \`List<Point>\` hands you a copy.
2. "\`IEnumerable\` vs \`IQueryable\`?" — follow-up: what happens if you call \`.AsEnumerable()\` before \`.Where\` on a
   DbSet (the filter runs in memory, after loading every row).
3. "What does \`await\` actually do? Why is \`.Result\` dangerous?" — follow-up: thread-pool starvation; where
   \`ConfigureAwait(false)\` matters (libraries) and why ASP.NET Core has no synchronization context.
4. "\`abstract class\` vs \`interface\` now that interfaces can have default methods?" — follow-up: state, constructors,
   multiple inheritance of interfaces.
5. "\`IDisposable\`, \`using\` and the finaliser — when do you need each?" — follow-up: why \`HttpClient\` should not be
   created and disposed per request (\`IHttpClientFactory\`).
6. Coding on a shared editor (15 min): "Group anagrams" (\`Dictionary<string, List<string>>\` keyed by the sorted
   characters) or "First non-repeating character" — then "what's the complexity?" and "what if the input is a
   2 GB file?"
**Scored on:** correctness, thinking aloud, complexity stated unprompted, using a hint.
Strong = explains the approach before typing, walks an example, fixes own bug, writes idiomatic C# (\`TryGetValue\`,
\`var\`, LINQ where it helps, not where it hides an O(n²)). Weak = silent typing, cannot state complexity, argues with
the hint.

## Round 2 — Technical: ASP.NET Core, EF Core, React, SQL Server and the AI features (45–60 min)

1. "Walk me through your capstone." (10–15 min with follow-ups — see DEFEND_CAPSTONE.)
2. "What happens between Kestrel receiving a request and your action running?" — the middleware pipeline in order
   (exception handler, HTTPS redirection, CORS, authentication, authorization, rate limiter), routing to an endpoint,
   filters, model binding and validation.
3. "Transient, scoped, singleton — which for a DbContext, which for an HttpClient-based service, and what's a captive
   dependency?"
4. "Your orders page is slow — how do you find out why?" — EF Core logging, N+1, \`Include\` vs projection,
   \`AsNoTracking\`, the execution plan in SSMS, a missing index.
5. "Two customers buy the last unit at the same time — what does your code do?" — the guarded update or a
   \`[Timestamp]\` row version and \`DbUpdateConcurrencyException\`.
6. "Clustered vs nonclustered index — what is the clustered index on your Orders table, and what would you add for
   'orders of a customer, newest first'?" — a nonclustered index on (CustomerId, CreatedAt DESC).
7. "In React, where is the token stored, and what happens when it expires mid-session?" — the axios interceptor, 401
   handling, the refresh flow or the "session expired" path.
8. SQL on paper: "Customers who placed more than 3 orders in October, with total spend" — \`JOIN\`, \`WHERE\` on the
   date range, \`GROUP BY\`, \`HAVING COUNT(*) > 3\`.
**Scored on:** depth beyond definitions, tying answers to *your* code, honesty at the edge.
Strong = "In GadgetGully I did X because Y." Weak = a textbook definition, then silence at the first follow-up.

## Round 3 — Managerial / techno-managerial (20–30 min)

"Tell me about a time your teammate's change broke your feature." "Your agent was late — what did you cut?" "On a
Saturday a customer reports the assistant quoting an old price — what do you do?" "Would you work on a .NET
Framework 4.8 maintenance project for your first year?"
**Scored on:** ownership, clear thinking under constraints, a realistic attitude to first-year work.
Strong = a specific STAR story with what *you* did and what changed afterwards; for the legacy question, "yes — and
here is what I'd learn from it". Weak = blame, "I'm a perfectionist", "I only want to work on new tech".

## Round 4 — HR (15–20 min)

"Why .NET and not Java?", "Why our company?", "Comfortable with a service agreement and relocation?", "Shifts that
overlap with a US or UK client?", "Plans for higher studies?", "Expected CTC?"
**Scored on:** consistency with the resume, stability, no red flags. Read the company's Microsoft/Azure partnerships,
its .NET clients and its office locations beforehand. At a mass recruiter the package is fixed — say you are
comfortable with the offered band.

## Debrief template (fill it within an hour, one block per round)

    Round / interviewer role:
    Questions asked (verbatim, in order):
    Answered well — and what made it strong:
    Weak or blank — exact question + what a strong answer would have said:
    Follow-up where I lost the thread:
    Resume or GitHub lines that were probed — did they hold up?
    Time: did I finish the coding task? how long was my intro?
    Fix before next loop (max 3, each with a date and how I'll practise it):

Run the loop again a week later, starting from the "Fix" items. Two recorded loops beat ten mocks nobody wrote
down.`,
    mcqs: [
      mcq('In the online test, Kiran\'s C# solution calls Console.ReadLine and Console.WriteLine once per line for 200,000 lines and times out. What is the likely fix?', [
        ['Mark Main as async so the input is read in parallel', false],
        ['Read all input at once, build output in a StringBuilder', true],
        ['Wrap each line in a try/catch so that slow lines are skipped', false],
        ['Switch every int to decimal so the arithmetic is exact', false],
      ], 'Hundreds of thousands of console calls dominate the run time. Reading the whole input once and writing one buffered output is the standard fix; async, exception handling and decimal only add cost.'),
      mcq('In round 1, Meera\'s anagram grouping compares every pair of words. The interviewer hints "can you do it in one pass?" Which response scores best?', [
        ['Insisting the pairwise version is fine for the sample input', false],
        ['Asking the interviewer to write the one-pass version', false],
        ['Keying a Dictionary by each word\'s sorted letters', true],
        ['Deleting the code and starting again in Python instead', false],
      ], 'Interviewers score how a hint is used: take it, apply it to the code on screen, and re-test on an example. Arguing, handing the problem back or switching language all signal poor collaboration.'),
      mcq('Round 2 asks: "A singleton ReportService takes AppDbContext in its constructor. What goes wrong?" Which answer is strongest?', [
        ['Nothing, as long as every method of ReportService is async', false],
        ['The singleton captures one scoped context for all requests', true],
        ['DbContext cannot be injected into any class but a controller', false],
        ['The context is disposed after the first request, so it 404s', false],
      ], 'A singleton lives for the app, so it keeps the first scope\'s DbContext — shared across concurrent requests, which it is not safe for. Development scope validation throws at resolve time; make the service scoped or use IDbContextFactory.'),
      mcq('In the managerial round, Nikhil is asked whether he would join a .NET Framework 4.8 maintenance project for his first year. Which answer scores best?', [
        ['"Yes — and I\'d learn the old pipeline well enough to help migrate it."', true],
        ['"No, I have only learned .NET 8, and I want to work on new technology only."', false],
        ['"Yes, but I would ask to move to a new project after about a month."', false],
        ['"I would prefer not to answer that until I receive the offer letter."', false],
      ], 'Managers look for a realistic, constructive attitude to first-year work. Much enterprise .NET is legacy, and someone who can read it and help migrate it is valuable; refusing or bargaining reads as a flight risk.'),
      mcq('Rahul\'s debrief after round 2 says "EF Core questions were hard". Which rewrite is most useful for the next loop?', [
        ['"EF Core was hard; I must revise the whole of EF Core this week."', false],
        ['"They asked advanced EF Core topics that freshers never need."', false],
        ['"I was nervous in round 2, so next time I need to stay calmer."', false],
        ['"Missed: Include vs projection; fix: explain with my order API."', true],
      ], 'A debrief works only when it records the exact question, what a strong answer is, and a concrete fix to practise. "Revise everything", blaming the questions or noting nerves gives nothing to rehearse.'),
    ],
  },

  /* ── CHECKPOINT ─────────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'JT_PLACE_DOTNET_FS_CHECKPOINT',
    notes: `This checkpoint measures the judgement a .NET full-stack hiring panel looks for, not memorised facts:
choosing what goes on the resume, making GitHub back it, defending the capstone — the AI inside the API, Semantic
Kernel, the agent's identity rules — under follow-up, and handling each round of the interview day.

Recall the three rules of this topic before you start:
- **Every claim is checkable** — a resume line points at a repo, a test, a live URL, a measured number or an
  evaluation score.
- **Answer with your own code** — "in GadgetGully I did X because Y" beats a textbook definition.
- **Honesty at the edge** — "I haven't used that; here's how I'd approach it" beats a bluff the panel can see.

Each question is a scenario. Pick what a strong candidate would actually do.`,
    checkpoint: [
      ck('PLACEMENT_READINESS', 'Kavin\'s skills line lists "C#, ASP.NET Core, EF Core, React, SQL Server, Kubernetes, Azure DevOps". He has deployed only to App Service from Visual Studio. What should he change?', [
        ['Keep both, since panels rarely ask freshers about DevOps', false],
        ['Replace both with "Azure App Service", which he used', true],
        ['Move both into the summary, where they read as interests', false],
        ['Keep both and watch tutorials the night before interviews', false],
      ], 'Round 2 is built from the skills line, and listing Kubernetes and Azure DevOps invites exactly those questions. App Service is what he used and can defend; moving a claim elsewhere on the page does not make it true.'),
      ck('PLACEMENT_READINESS', 'A Chennai product company\'s JD asks for "C#, .NET Core Web API, Entity Framework, MS SQL, unit testing". Bhavna\'s resume says "APIs", "ORM" and "SQL". What is the right edit?', [
        ['Leave it; any ATS knows that ORM means Entity Framework', false],
        ['Paste the JD in white text at the bottom of the resume', false],
        ['Delete the capstone and rebuild the resume around the JD', false],
        ['Write her true skills in the JD\'s words: EF Core, xUnit', true],
      ], 'Recruiters search the JD\'s exact terms, so true skills should be written in those words. Hidden keyword text is detected and looks dishonest; removing the capstone throws away the strongest evidence.'),
      ck('PORTFOLIO_EVIDENCE', 'During a video interview the panel opens Sameer\'s capstone repository. Which state helps him most?', [
        ['bin/ and obj/ committed, so the build output is visible', false],
        ['A README with the live URL, diagram, dotnet test and score', true],
        ['The whole solution uploaded as one zip in a single commit', false],
        ['The repository kept private, with access given on request', false],
      ], 'A README that links the live app, shows the architecture and says how to run the tests and what the evaluation scored lets every claim be checked in a minute. Build output, a zip or a private repo hide the work.'),
      ck('TECHNICAL_EXPLANATION', 'Mid-defence, the panel asks which similarity measure the vector search used. Rohit used the library default and never checked. Best response?', [
        ['Give a confident, detailed answer so he does not look weak', false],
        ['Say it is an internal detail that developers never need', false],
        ['Say he did not check, then reason about cosine vs distance', true],
        ['Steer the talk back to the EF Core work, which he knows', false],
      ], 'Saying what he verified and then reasoning aloud — cosine similarity versus Euclidean distance on normalised embeddings, and how he would confirm the configured one — is what panels credit. An invented answer is easily exposed.'),
      ck('TECHNICAL_EXPLANATION', 'Asked "why did you keep the AI inside the ASP.NET Core API instead of a separate service?", which answer is strongest?', [
        ['Awaited calls free the thread; limits contain shared risk', true],
        ['ASP.NET Core cannot make HTTP calls to another service', false],
        ['A separate service would need a second SQL Server licence', false],
        ['Semantic Kernel only runs inside a controller action', false],
      ], 'The strong answer gives the real reason — async model calls do not starve other endpoints, one deployment and one auth scheme — and names the cost it accepted, contained by rate limits, timeouts and request caps.'),
      ck('TECHNICAL_EXPLANATION', 'GadgetGully\'s assistant cites product 3307, which was not among the chunks retrieved for that question. How should the candidate explain it?', [
        ['As good retrieval, since the model found a better match', false],
        ['As a missing SQL Server index on the Products table', false],
        ['As a sign that the temperature should be raised', false],
        ['As a hallucination, caught by keeping retrieved ids only', true],
      ], 'Anything the model cites that was not in its context is invented. Intersecting cited ids with the retrieved set catches it cheaply; a higher temperature makes output more random, not more grounded.'),
      ck('TECHNICAL_EXPLANATION', 'A panellist asks why the agent\'s plugin is registered scoped and not singleton. Which answer is right?', [
        ['A singleton plugin would keep the first caller\'s identity', true],
        ['Semantic Kernel refuses to load singleton plugins at all', false],
        ['Scoped services start faster than singletons on each call', false],
        ['Singletons cannot have methods marked [KernelFunction]', false],
      ], 'The plugin reads ICurrentUser, which is per request. A singleton is created once, so it would capture one request\'s user and act as them for everyone. Scoped lifetime gives each request its own plugin.'),
      ck('INTERVIEW_PERFORMANCE', 'In round 1, asked for the first non-repeating character, Asha starts typing nested loops in silence. What should she have done first?', [
        ['Asked for an easier problem that she had practised', false],
        ['Stated a Dictionary-count O(n) plan and tried an example', true],
        ['Said she prefers to code first and explain afterwards', false],
        ['Written the shortest LINQ one-liner she could think of', false],
      ], 'Interviewers score reasoning as much as code. Saying the plan — count with a Dictionary, then scan in order, O(n) — and checking it on an example lets them redirect early and earns credit even if the code has a slip.'),
      ck('INTERVIEW_PERFORMANCE', 'In round 2, Tarun blanks on a clustered-index question; the interviewer moves on to dependency injection lifetimes. What does a strong candidate do?', [
        ['Apologise again for the index answer before continuing', false],
        ['Ask to go back to indexes to win back the lost marks', false],
        ['Reset and answer the DI question fully; one miss is not fatal', true],
        ['Answer the DI question in just one line to save time for later topics', false],
      ], 'Panels score the whole round; one missed question costs far less than letting it spoil the next three. Repeated apologies and asking to revisit draw attention to the miss, and a rushed answer loses those marks too.'),
      ck('INTERVIEW_PERFORMANCE', 'Across two mock loops, Lokesh answers every first ASP.NET Core question well but fails each follow-up ("why?", "what if?"). What should next week focus on?', [
        ['Booking more mocks with new interviewers, changing nothing', false],
        ['Memorising longer definitions for each ASP.NET Core topic', false],
        ['Dropping ASP.NET Core to study only DSA for the whole week', false],
        ['Working out the why behind each missed follow-up in his code', true],
      ], 'Failing follow-ups means definitions without understanding. Tracing why — for example why a singleton cannot hold a DbContext — in his own code is the fix the debriefs point to; more mocks or longer definitions repeat the gap.'),
    ],
  },
];

export const TRACK_CS_PLACE_FS_BUNDLES: PilotBundle[] = [...MCQ_BUNDLES, ...PLACE_BUNDLES];
