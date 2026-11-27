/**
 * Career-track content (.NET Full Stack + AI): C# collections and generics (JT_CS_COLLECTIONS) and
 * delegates, LINQ and modern C# (JT_CS_LINQ).
 *
 * Collections and LINQ are where a C# interview spends its time, because the questions have exact
 * answers: what a Dictionary does with a key, when a LINQ query actually runs, why a foreach throws
 * when you remove from the list it walks. Nearly every question is about specific code.
 *
 * Teaching is modern C# (.NET 8, C# 12); features newer than C# 7 are named with their version. The
 * two graded exercises are classic C# (a Main method, no interpolation, no PriorityQueue), because
 * the runner is Mono 6.12. Every stated output of classic C# code was run.
 *
 * Attribution: both topics are single-skill (CSHARP_COLLECTIONS, CSHARP_LINQ), so no question names
 * a skill.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_CS_COLLECTIONS_BUNDLES: PilotBundle[] = [
  /* ══ JT_CS_COLLECTIONS — Collections and Generics in C# ══════════════════════════════════ */
  {
    unitCode: 'JT_CS_COLLECTIONS_OVERVIEW',
    notes: `An array in C# has a fixed length. Almost all real code keeps its data in the generic
collections of **System.Collections.Generic**, which grow, search and remove for you — and every
one of them is reached through a small set of interfaces.

## The interfaces, from least to most capable

    IEnumerable<T>          can be walked with foreach            (every collection, every LINQ query)
      └─ ICollection<T>     + Count, Add, Remove, Contains, Clear
           ├─ IList<T>      + index: list[i], Insert, RemoveAt    → List<T>, T[]
           ├─ ISet<T>       + set operations, no duplicates       → HashSet<T>, SortedSet<T>
           └─ IDictionary<TKey,TValue>  key → value pairs         → Dictionary, SortedDictionary
    IReadOnlyList<T>, IReadOnlyCollection<T>, IReadOnlyDictionary<TKey,TValue>  — read-only views

A \`Dictionary<TKey,TValue>\` is an \`ICollection<KeyValuePair<TKey,TValue>>\`: walking it with
foreach gives you pairs with \`.Key\` and \`.Value\`.

\`Stack<T>\` and \`Queue<T>\` implement \`IEnumerable<T>\` and \`IReadOnlyCollection<T>\` but not
\`ICollection<T>\` — you add to them with Push and Enqueue, not Add.

## Program to the interface

    IList<string> names = new List<string>();          // a variable typed by what you need
    public decimal Total(IEnumerable<Order> orders)    // a parameter that accepts any sequence
    public IReadOnlyList<Order> Recent() { ... }       // a return that callers cannot modify

The rule: **accept the least you need, return the most useful thing you can promise.** A method that
only loops over its argument should take \`IEnumerable<T>\`, so callers can pass a List, an array, a
HashSet or a LINQ query. A method that returns a list it does not want callers to change returns
\`IReadOnlyList<T>\`.

## var and target-typed new

    var prices = new Dictionary<string, decimal>();       // var: the type comes from the right
    Dictionary<string, decimal> prices2 = new();          // C# 9 target-typed new
    List<int> marks = [90, 75, 82];                       // C# 12 collection expression

All three are the same thing at run time. \`var\` is not dynamic typing — the compiler fixes the type
once, at the declaration.

## Interfaces promise less than the object can do

    IList<int> fixedSize = new int[3];
    fixedSize.Add(1);      // compiles — IList has Add — but throws NotSupportedException

An array implements \`IList<T>\`, but its length cannot change. The interface says "may support Add";
the object says no at run time. The same is true of \`list.AsReadOnly()\`.

## The old non-generic collections

\`ArrayList\` and \`Hashtable\` (System.Collections) predate generics and store \`object\`, so every
int is boxed and every read needs a cast. You will meet them in legacy code; never choose them for
new code.

## Python, for comparison

\`List<T>\` is Python's list, \`Dictionary<TKey,TValue>\` is dict, \`HashSet<T>\` is set. The
difference is that every C# collection has **one element type**, checked by the compiler: a
\`List<int>\` cannot hold a string.`,
    workedExample: `**Problem.** A reporting method is written as

    public static int CountLate(List<Delivery> deliveries)
    {
        int late = 0;
        foreach (var d in deliveries) if (d.Late) late++;
        return late;
    }

A caller has a \`HashSet<Delivery>\` and another has the result of a LINQ \`Where\`. Neither compiles.
Fix the signature.

1. What does the method use? Only foreach. Nothing indexes, adds or counts the list itself.
2. The least capable interface that supports foreach is \`IEnumerable<Delivery>\`.
3. Change the parameter: \`CountLate(IEnumerable<Delivery> deliveries)\`.
4. Now a \`List<Delivery>\`, a \`Delivery[]\`, a \`HashSet<Delivery>\` and a LINQ query all convert to
   it implicitly, and the body is unchanged.

The reasoning to say aloud: a parameter type is a demand on the caller, so demand only what the
method uses.`,
    mcqs: [
      mcq('A method only walks its argument with foreach. Which parameter type lets callers pass a List, an array and a HashSet?', [
        ['IEnumerable<T>', true],
        ['List<T>', false],
        ['IList<T>', false],
        ['T[]', false],
      ], 'All three implement IEnumerable<T>, the interface foreach needs. IList<T> excludes HashSet, and List<T> or T[] excludes every other collection.'),
      mcq(`What happens when this runs?

    IList<int> slots = new int[3];
    slots.Add(7);`, [
        ['It compiles and throws NotSupportedException', true],
        ['It does not compile, because arrays have no Add', false],
        ['The array grows to four elements with 7 at the end', false],
        ['7 is written into slots[0], replacing the zero there', false],
      ], 'Arrays implement IList<T>, so the call compiles, but an array cannot change length, so the implementation throws NotSupportedException at run time.'),
      mcq('A service method returns its internal List<Order> and callers keep adding to it. Which return type best states that they must not?', [
        ['IReadOnlyList<Order>', true],
        ['IEnumerable<object>', false],
        ['ICollection<Order>', false],
        ['List<object>', false],
      ], 'IReadOnlyList<T> keeps indexing and Count but has no Add or Remove. ICollection<Order> still has Add. Returning list.AsReadOnly() also stops a cast back to List from working.'),
    ],
    checkpoint: [
      mcq('Which of these is true of var in `var scores = new Dictionary<string, int>();`?', [
        ['scores is a Dictionary<string, int>, fixed at compile time', true],
        ['scores can later be assigned a List<int> because var is dynamic', false],
        ['scores is typed as object and each use needs a cast', false],
        ['var makes the dictionary read-only after this line', false],
      ], 'var asks the compiler to take the type from the initialiser. The variable is statically a Dictionary<string, int>; assigning anything else later is a compile error.'),
      mcq('Why should new code use List<int> rather than the old ArrayList for a list of numbers?', [
        ['ArrayList stores object, so ints are boxed and reads need casts', true],
        ['ArrayList cannot grow once it has been created', false],
        ['ArrayList was removed from .NET and no longer compiles', false],
        ['List<int> is a linked list, so inserting into it is cheaper', false],
      ], 'ArrayList predates generics and holds object references: each int is boxed on the way in and must be cast on the way out, and the compiler cannot stop a string being added.'),
      mcq('Walking a Dictionary<string, decimal> with foreach gives you values of which type?', [
        ['KeyValuePair<string, decimal>', true],
        ['string, the keys only', false],
        ['decimal, the values only', false],
        ['Tuple<string, decimal>', false],
      ], 'A dictionary is a collection of KeyValuePair<TKey,TValue>. Use .Key and .Value on each item, or walk dict.Keys or dict.Values when you only need one side.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_LISTS',
    notes: `\`List<T>\` is the collection you reach for first. \`LinkedList<T>\` is the one you reach for
almost never — and an interviewer wants you to say why.

## List<T> is an array that grows

Inside a List is a plain array and a count. When the array is full, Add allocates a new array of
**double** the size and copies everything across.

    var marks = new List<int>();
    Console.WriteLine(marks.Capacity);   // 0
    marks.Add(90);
    Console.WriteLine(marks.Capacity);   // 4
    for (int i = 0; i < 4; i++) marks.Add(i);
    Console.WriteLine(marks.Capacity);   // 8   (Count is 5)

**Count** is how many items there are; **Capacity** is how many fit before the next copy. Doubling
makes Add **O(1) amortised**: a copy is O(n), but it happens so rarely that the average stays
constant. If you know the size, say so — \`new List<int>(10_000)\` — and no copy happens at all.

## What each List operation costs

| Operation | Cost | Why |
|---|---|---|
| list[i], list[i] = x | O(1) | array index |
| Add(x) | O(1) amortised | write at the end, occasionally grow |
| Insert(0, x), RemoveAt(0) | O(n) | every later element shifts |
| Remove(x), Contains(x), IndexOf(x) | O(n) | linear search with Equals |
| Sort() | O(n log n) | introsort, not stable |

Removing from the **end** is O(1); removing from the front shifts the whole array.

    var orders = new List<string> { "A", "B", "C" };
    orders.Insert(0, "Z");        // Z A B C — three elements shifted right
    orders.RemoveAt(orders.Count - 1);  // Z A B — nothing shifts
    orders.RemoveAll(o => o == "A");    // removes every match in one O(n) pass

## LinkedList<T> is a chain of nodes

Each \`LinkedListNode<T>\` holds a value and references to the previous and next node.

    var line = new LinkedList<int>();
    line.AddLast(2);
    line.AddFirst(1);
    line.AddLast(3);
    LinkedListNode<int> two = line.Find(2);   // O(n) search
    line.AddAfter(two, 9);                    // O(1) once you hold the node
    Console.WriteLine(string.Join(",", line)); // 1,2,9,3

Insert and remove are O(1) **only if you already hold the node**. Getting to the node is O(n), and a
LinkedList has **no indexer** — \`line[2]\` does not compile.

## Which to choose

Choose \`List<T>\` unless you have measured otherwise. Its elements sit next to each other in memory,
so the CPU cache reads them in batches; a linked list's nodes are scattered objects, each one a cache
miss and each one an allocation for the garbage collector. LinkedList wins only when you keep node
references and insert or remove in the middle constantly — an LRU cache that moves a node to the
front on every hit is the textbook case.

If you need fast adds and removes at **both ends**, that is a queue or a deque, not a linked list.

## Arrays still matter

\`int[]\` is fixed-size and slightly faster. APIs often take and return arrays (\`string.Split\`
returns \`string[]\`). Convert with \`new List<string>(array)\` or \`list.ToArray()\`.`,
    mcqs: [
      mcq(`What does this print?

    var ids = new List<int>();
    ids.Add(1);
    Console.WriteLine(ids.Count + " " + ids.Capacity);`, [
        ['1 4', true],
        ['1 1', false],
        ['1 16', false],
        ['4 4', false],
      ], 'Count is the number of items, one. The first Add allocates an internal array of four slots, so Capacity is 4; it doubles to 8 when the fifth item arrives.'),
      mcq('Why is List<T>.Insert(0, x) slow on a list of a million items?', [
        ['Every existing element is shifted one slot to the right', true],
        ['The list searches the whole array for a free slot first', false],
        ['Insert always reallocates the array at double its size', false],
        ['Index 0 is reserved, so the list rebuilds its header', false],
      ], 'List<T> is an array. Putting something at the front means moving all n elements up by one, which is O(n). Adding at the end moves nothing.'),
      mcq('Which line does not compile, given `var line = new LinkedList<string>();`?', [
        ['var third = line[2];', true],
        ['line.AddFirst("start");', false],
        ['var node = line.Find("x");', false],
        ['line.RemoveLast();', false],
      ], 'LinkedList<T> has no indexer, because reaching position i means walking i nodes. It offers AddFirst, AddLast, Find and RemoveFirst or RemoveLast instead.'),
    ],
    checkpoint: [
      mcq('You will add exactly 50,000 records to a List<Record>. What avoids every internal resize?', [
        ['new List<Record>(50000)', true],
        ['new LinkedList<Record>() instead', false],
        ['calling TrimExcess() after each Add', false],
        ['adding with Insert(0, r) rather than Add', false],
      ], 'Passing the capacity to the constructor allocates one array big enough for all of them, so no doubling and copying ever happens. TrimExcess shrinks capacity, which makes resizing worse.'),
      mcq('A LinkedList<Job> is chosen because "insertion is O(1)". When is that claim actually true?', [
        ['Only when the code already holds the node to insert after', true],
        ['Always, for any position given as an index number', false],
        ['Only when the list has fewer than sixteen nodes', false],
        ['Only when inserting before the first node in the list', false],
      ], 'AddAfter and AddBefore are O(1) given a LinkedListNode. Finding the node by value or position is an O(n) walk, which usually costs more than shifting a List.'),
      mcq(`What does this print?

    var q = new List<string> { "a", "b", "c", "d" };
    q.RemoveAt(q.Count - 1);
    q.Insert(1, "x");
    Console.WriteLine(string.Join("", q));`, [
        ['axbc', true],
        ['xabc', false],
        ['abxc', false],
        ['axbcd', false],
      ], 'RemoveAt(3) drops "d", leaving a b c. Insert(1, "x") puts x at index 1, shifting b and c right, so the list is a x b c.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_DICTIONARIES',
    notes: `\`Dictionary<TKey,TValue>\` maps keys to values with O(1) average lookup. Counting and grouping —
half of all interview problems — are built on it.

## The four ways to read and write

    var stock = new Dictionary<string, int>();
    stock["pen"] = 10;          // add, or overwrite if "pen" exists
    stock.Add("ink", 4);        // add; throws ArgumentException if "ink" exists
    int pens = stock["pen"];    // read; throws KeyNotFoundException if missing

    if (stock.TryGetValue("glue", out int glue))   // read without an exception
        Console.WriteLine(glue);
    else
        Console.WriteLine("no glue");               // glue is 0 here

\`TryGetValue\` does one lookup. The pattern \`if (d.ContainsKey(k)) x = d[k];\` does two.
(\`out int glue\` declares the variable inline — C# 7. In older C# declare it first.)

## Counting

    var counts = new Dictionary<string, int>();
    foreach (var word in words)
    {
        counts.TryGetValue(word, out int c);   // c is 0 when the word is new
        counts[word] = c + 1;
    }

## Grouping

    var byCity = new Dictionary<string, List<string>>();
    foreach (var s in students)
    {
        if (!byCity.TryGetValue(s.City, out var list))
        {
            list = new List<string>();
            byCity[s.City] = list;
        }
        list.Add(s.Name);
    }

## How a Dictionary finds a key

1. It calls \`key.GetHashCode()\`, an int.
2. It maps that int to a **bucket** (hash modulo the number of buckets).
3. In that bucket's chain it compares each stored key with \`Equals\` until one matches.

Two different keys landing in one bucket is a **collision**; the chain gets longer and lookup slows
toward O(n) in the worst case. When the dictionary is full enough it **resizes** — roughly doubling
its buckets to a prime size and rehashing every entry.

That is why a key type must have \`GetHashCode\` and \`Equals\` that agree: equal keys must give
equal hash codes. string, int and records already do. A class you write uses **reference equality**
unless you override both — two \`new Point(1, 2)\` objects are different keys.

**Never mutate a key** after it is in the dictionary. Its hash changes, it sits in the wrong
bucket, and lookups by the very same object fail.

## Comparers

    var cities = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    cities["Pune"] = 1;
    cities["PUNE"]++;           // same key: now 2, Count is 1

Passing an \`IEqualityComparer<T>\` changes what "same key" means without changing the key type.

## Order

A \`Dictionary\` makes **no promise** about enumeration order. It often looks like insertion order
in small tests; never rely on it. If you need sorted keys use **SortedDictionary<TKey,TValue>** — a
red-black tree with O(log n) operations that walks in key order — or sort the keys when you print.

    var ranks = new SortedDictionary<int, string> { [3] = "c", [1] = "a", [2] = "b" };
    Console.WriteLine(string.Join(",", ranks.Keys));   // 1,2,3

(The \`[3] = "c"\` index-initialiser syntax is C# 6; \`{ { 3, "c" } }\` works everywhere.)`,
    workedExample: `**Problem.** Given a list of order lines \`(customer, amount)\`, print each customer's total
and the customer who spent most.

    var totals = new Dictionary<string, decimal>();
    foreach (var line in lines)
    {
        totals.TryGetValue(line.Customer, out decimal t);
        totals[line.Customer] = t + line.Amount;
    }

    string best = null;
    foreach (var kv in totals)
        if (best == null || kv.Value > totals[best]) best = kv.Key;

1. **One pass to accumulate.** TryGetValue gives 0 for a new customer, so there is no special case.
2. **Indexer to write.** \`totals[key] = ...\` adds or overwrites; \`Add\` would throw on the
   second line for the same customer.
3. **A second pass to find the maximum**, walking pairs with \`.Key\` and \`.Value\`.
4. **Ties.** If two customers tie, which one wins depends on the dictionary's enumeration order,
   which is not guaranteed. If the output must be deterministic, break ties explicitly — for
   example by name with \`string.CompareOrdinal\`.

Total cost: O(n) for n lines, against O(n²) for searching a list of customers each time.`,
    mcqs: [
      mcq(`What does this print?

    var d = new Dictionary<string, int>();
    d["a"] = 1;
    d["a"] = 2;
    Console.WriteLine(d["a"] + " " + d.Count);`, [
        ['2 1', true],
        ['1 1', false],
        ['2 2', false],
        ['It throws ArgumentException on the second assignment', false],
      ], 'The indexer setter adds a missing key or overwrites an existing one, so the second line replaces 1 with 2 and the dictionary still holds one key. Only Add throws on a duplicate.'),
      mcq('A lookup `prices["mango"]` runs when "mango" was never added. What happens?', [
        ['KeyNotFoundException is thrown', true],
        ['It returns 0, the default for decimal', false],
        ['It returns null and the caller must check it', false],
        ['"mango" is added with a default price', false],
      ], 'The indexer getter throws when the key is missing. Use TryGetValue (or GetValueOrDefault on .NET Core) when absence is a normal case.'),
      mcq('A class Point without Equals or GetHashCode overrides is used as a dictionary key. What does `map[new Point(1, 2)]` find after `map[new Point(1, 2)] = "home"`?', [
        ['Nothing — the lookup throws KeyNotFoundException', true],
        ['"home", because the coordinates are equal', false],
        ['"home", but only when the Point fields are public', false],
        ['null, because a class key maps to a default value', false],
      ], 'Without overrides a class uses reference identity, so the second new Point is a different key. Override both Equals and GetHashCode from X and Y, or make Point a record.'),
    ],
    checkpoint: [
      mcq('Which line both reads a value and avoids an exception when the key is missing, in a single lookup?', [
        ['if (stock.TryGetValue(item, out int qty)) { ... }', true],
        ['if (stock.ContainsKey(item)) qty = stock[item];', false],
        ['qty = stock[item] ?? 0;', false],
        ['try { qty = stock[item]; } catch { qty = 0; }', false],
      ], 'TryGetValue looks the key up once and reports success. ContainsKey then the indexer looks it up twice; the try/catch costs an exception; ?? does not compile against a non-nullable int.'),
      mcq(`What does this print?

    var c = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    c["Pune"] = 1;
    c["PUNE"]++;
    Console.WriteLine(c.Count + " " + c["pune"]);`, [
        ['1 2', true],
        ['2 1', false],
        ['1 1', false],
        ['It throws KeyNotFoundException at the increment', false],
      ], 'The case-insensitive comparer makes "Pune", "PUNE" and "pune" the same key. The increment reads 1 and writes 2 back to that one entry.'),
      mcq('An object used as a Dictionary key has a field that is part of its GetHashCode. The field is changed after the object was added. What is the likely result?', [
        ['Lookups with that same object stop finding the entry', true],
        ['The dictionary moves the entry to the right bucket by itself', false],
        ['The compiler refuses to let a key object be changed', false],
        ['The entry is removed from the dictionary automatically', false],
      ], 'The entry stays in the bucket chosen by the old hash. A lookup now hashes to a different bucket and never reaches it. Keys should be immutable.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_SETS',
    notes: `A set answers one question fast: "have I seen this before?" C# has two, and the choice is about
order.

## HashSet<T>: O(1) membership, no order

    var seen = new HashSet<int> { 1, 2, 3 };
    Console.WriteLine(seen.Add(2));   // False — already present, nothing changes
    Console.WriteLine(seen.Add(9));   // True
    Console.WriteLine(seen.Count);    // 4

\`Add\` returns a bool, which makes "first time I see it" a one-liner:

    foreach (var email in signups)
        if (!unique.Add(email)) Console.WriteLine("duplicate: " + email);

HashSet uses the same hashing as Dictionary: \`GetHashCode\` to pick a bucket, \`Equals\` to
confirm. Contains, Add and Remove are O(1) on average. Enumeration order is **not** defined.

## SortedSet<T>: ordered, O(log n)

    var tags = new SortedSet<string>(StringComparer.Ordinal) { "pear", "Apple", "banana", "apple" };
    Console.WriteLine(string.Join(",", tags));   // Apple,apple,banana,pear

A SortedSet is a red-black tree. It walks in order and gives you \`Min\`, \`Max\` and
\`GetViewBetween(lo, hi)\`, at O(log n) per operation. Without a comparer, strings are ordered by
the **current culture** — \`apple\` before \`Apple\` on most machines. Pass
\`StringComparer.Ordinal\` when the order must be the same everywhere.

## Set operations

    var a = new HashSet<int> { 1, 2, 3, 4 };
    a.IntersectWith(new[] { 3, 4, 5 });     // a is now {3, 4}
    var b = new HashSet<int> { 1, 2, 3 };
    b.ExceptWith(new[] { 2 });              // {1, 3}
    b.UnionWith(new[] { 7, 1 });            // {1, 3, 7}
    bool sub = a.IsSubsetOf(b);             // false

These methods **modify the set they are called on**; they do not return a new set. LINQ's
\`Intersect\`, \`Except\` and \`Union\` return new sequences instead.

## What a set needs from its elements

For HashSet: \`Equals\` and \`GetHashCode\` that agree. For SortedSet: an ordering — the element
implements \`IComparable<T>\` or you pass an \`IComparer<T>\`.

    class Pt { public int X; public Pt(int x) { X = x; } }
    var pts = new HashSet<Pt> { new Pt(1), new Pt(1) };
    Console.WriteLine(pts.Count);   // 2 — reference equality, two different objects

Override both methods (or use a \`record\`, C# 9, which generates value equality) and Count becomes 1.

    public override bool Equals(object obj) => obj is Pt p && p.X == X;
    public override int GetHashCode() => X.GetHashCode();

For a SortedSet, the comparer decides duplicates: two elements that compare as 0 are the **same**
element, even if Equals says otherwise. A SortedSet of people ordered by age keeps one person per age.

## Choosing

- Need "contains" and nothing else → HashSet.
- Need it sorted, or need the smallest/largest/range → SortedSet.
- Need duplicates counted → not a set; a \`Dictionary<T,int>\`.`,
    mcqs: [
      mcq(`What does this print?

    var s = new HashSet<string> { "x", "y" };
    bool first = s.Add("y");
    bool second = s.Add("z");
    Console.WriteLine(first + " " + second + " " + s.Count);`, [
        ['False True 3', true],
        ['True True 4', false],
        ['False True 4', false],
        ['True False 3', false],
      ], 'Adding "y" again changes nothing and returns false. "z" is new, so Add returns true and the set holds x, y and z: three items.'),
      mcq('A SortedSet<Person> is built with a comparer that orders by Age only. Two different people are both 25. What happens when both are added?', [
        ['The second Add returns false and only one is kept', true],
        ['Both are kept, ordered by their names', false],
        ['Both are kept, in the order they were added', false],
        ['The set throws ArgumentException on the second Add', false],
      ], 'In a sorted set the comparer defines equality: compare result 0 means "same element". Add a tie-breaker such as name to keep both.'),
      mcq('After `a.IntersectWith(b);` on two HashSet<int> variables, what holds the intersection?', [
        ['a, which was changed in place', true],
        ['a new set returned by the method', false],
        ['b, which was changed in place', false],
        ['both a and b, which now hold the same items', false],
      ], 'The ISet<T> methods mutate the receiver and return void. LINQ Intersect is the version that leaves both sources alone and returns a new sequence.'),
    ],
    checkpoint: [
      mcq('You must check 10 million incoming IDs against a list of 50,000 banned IDs. Which structure for the banned list?', [
        ['HashSet<long>, for O(1) Contains on every check', true],
        ['List<long>, kept sorted by calling Sort() once', false],
        ['SortedSet<long>, for ordered walking of the IDs', false],
        ['LinkedList<long>, so new bans can be added cheaply', false],
      ], 'Only membership is asked, so the O(1) average Contains of a HashSet wins. A List is O(n) per check; a sorted List or SortedSet is O(log n) and adds nothing you need.'),
      mcq(`Given a class Tag with no Equals or GetHashCode override, what does this print?

    var tags = new HashSet<Tag>();
    tags.Add(new Tag("cs"));
    tags.Add(new Tag("cs"));
    Console.WriteLine(tags.Count);`, [
        ['2', true],
        ['1', false],
        ['0', false],
        ['It throws ArgumentException on the second Add', false],
      ], 'Object\'s default Equals and GetHashCode use reference identity, so the two objects are different elements. Overriding both by name, or declaring Tag as a record, makes the count 1.'),
      mcq('Why pass StringComparer.Ordinal to a SortedSet<string> whose contents go into a test\'s expected output?', [
        ['Default string order depends on the culture of the machine', true],
        ['A SortedSet without a comparer does not sort strings', false],
        ['Ordinal makes the set case-insensitive for duplicates', false],
        ['Without it the set throws on mixed-case strings', false],
      ], 'Without a comparer strings use culture-sensitive comparison, which can order "apple" and "Apple" differently on different machines. Ordinal compares character codes and is identical everywhere.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_STACKS_QUEUES',
    notes: `Three collections that decide **which item comes out next**: the newest (Stack), the oldest
(Queue), or the most important (PriorityQueue).

## Stack<T>: last in, first out

    var history = new Stack<string>();
    history.Push("home");
    history.Push("cart");
    history.Push("pay");
    Console.WriteLine(history.Pop());    // pay
    Console.WriteLine(history.Peek());   // cart (still on the stack)
    Console.WriteLine(history.Count);    // 2

Push, Pop and Peek are O(1). Pop or Peek on an **empty** stack throws
\`InvalidOperationException\`; check \`Count\` first or use \`TryPop(out var x)\` (.NET Core 2.0+).

Walking a stack with foreach goes **top to bottom**:

    var s = new Stack<int>(new[] { 1, 2, 3 });    // pushes 1, then 2, then 3
    Console.WriteLine(string.Join(",", s));       // 3,2,1

Uses: undo history, back navigation, matching brackets, depth-first search, evaluating expressions.

## Queue<T>: first in, first out

    var tickets = new Queue<int>(new[] { 1, 2, 3 });
    tickets.Enqueue(4);
    tickets.Dequeue();                            // removes 1
    Console.WriteLine(string.Join(",", tickets)); // 2,3,4
    Console.WriteLine(tickets.Peek());            // 2

Enqueue and Dequeue are O(1) — a Queue is a circular array, so removing from the front does not
shift anything (unlike \`list.RemoveAt(0)\`, which is O(n)). Uses: breadth-first search, print
jobs, request buffering, processing in arrival order.

## PriorityQueue<TElement,TPriority> (.NET 6+)

    var jobs = new PriorityQueue<string, int>();
    jobs.Enqueue("send newsletter", 5);
    jobs.Enqueue("fix outage", 1);
    jobs.Enqueue("reply to ticket", 3);
    while (jobs.TryDequeue(out string job, out int priority))
        Console.WriteLine(priority + " " + job);
    // 1 fix outage
    // 3 reply to ticket
    // 5 send newsletter

It is a **min-heap**: the element with the **lowest** priority value comes out first. Enqueue and
Dequeue are O(log n). Points that catch people:

- For "largest first", reverse the comparer:
  \`new PriorityQueue<string, int>(Comparer<int>.Create((a, b) => b.CompareTo(a)))\`.
- Elements with **equal priority come out in no guaranteed order** — it is not FIFO within a
  priority. Add a sequence number to the priority if arrival order must break ties.
- Enumerating it (\`jobs.UnorderedItems\`) does not give priority order. Only Dequeue does.
- It does not support changing an item's priority in place; enqueue it again and skip stale entries.

It exists only on .NET 6 and later. On older runtimes the usual stand-in is a \`SortedSet\` of
(priority, sequence, item) or a hand-written binary heap.

## Choosing

| Need | Use |
|---|---|
| Undo, backtracking, nested structure | Stack<T> |
| Process in arrival order, BFS | Queue<T> |
| Always take the most urgent next, Dijkstra, top-k | PriorityQueue<TElement,TPriority> |`,
    mcqs: [
      mcq(`What does this print?

    var st = new Stack<char>();
    st.Push('a');
    st.Push('b');
    st.Pop();
    st.Push('c');
    Console.WriteLine(new string(st.ToArray()));`, [
        ['ca', true],
        ['ac', false],
        ['abc', false],
        ['cb', false],
      ], 'After the pushes and the pop the stack holds a at the bottom and c on top. ToArray, like foreach, lists a stack from top to bottom, so the string is "ca".'),
      mcq('A PriorityQueue<string, int> gets ("low", 9), ("urgent", 1), ("mid", 4). What does the first Dequeue return?', [
        ['"urgent"', true],
        ['"low"', false],
        ['"mid"', false],
        ['whichever element was enqueued first', false],
      ], 'PriorityQueue is a min-heap: the smallest priority value is dequeued first. Pass a reversed Comparer<int> to make the largest value come out first.'),
      mcq('Why is Queue<T>.Dequeue O(1) when List<T>.RemoveAt(0) is O(n)?', [
        ['A Queue is a circular array that just moves its head index', true],
        ['A Queue is a linked list of nodes rather than an array', false],
        ['Dequeue leaves a hole that is filled by the next Enqueue', false],
        ['A Queue sorts itself so the first item is always at the end', false],
      ], 'Queue<T> keeps head and tail indexes into a circular buffer. Taking the front item advances the head; nothing is copied. RemoveAt(0) has to shift every later element.'),
    ],
    checkpoint: [
      mcq('A browser keeps visited pages so that Back returns to the most recent one. Which collection models that directly?', [
        ['Stack<string>', true],
        ['Queue<string>', false],
        ['HashSet<string>', false],
        ['SortedSet<string>', false],
      ], 'Back always undoes the latest visit: last in, first out. A queue would return the oldest page; sets do not keep visit order at all.'),
      mcq(`What does this print?

    var q = new Queue<int>();
    q.Enqueue(10);
    q.Enqueue(20);
    q.Enqueue(30);
    q.Dequeue();
    q.Enqueue(40);
    Console.WriteLine(q.Peek() + " " + q.Count);`, [
        ['20 3', true],
        ['10 3', false],
        ['40 3', false],
        ['20 4', false],
      ], 'Dequeue removes 10, the oldest. 40 joins the back. The front is now 20 and the queue holds 20, 30 and 40.'),
      mcq('Two tasks are enqueued into a PriorityQueue with the same priority, 2. Which comes out first?', [
        ['Either one; equal priorities have no guaranteed order', true],
        ['The one enqueued first, because ties are FIFO', false],
        ['The one enqueued last, because ties are LIFO', false],
        ['Neither — the queue throws on a duplicate priority', false],
      ], 'A binary heap does not preserve insertion order among equal keys. If arrival order matters, make the priority a pair such as (2, sequenceNumber).'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_ITERATION_SORTING',
    notes: `How foreach really works, how to write your own sequence with \`yield return\`, and how to tell
C# what order your objects go in.

## foreach is IEnumerator underneath

    foreach (var x in items) Console.WriteLine(x);

compiles to roughly:

    using (var e = items.GetEnumerator())
        while (e.MoveNext()) { var x = e.Current; Console.WriteLine(x); }

## Do not change a collection while walking it

    var nums = new List<int> { 1, 2, 3, 4 };
    foreach (var n in nums)
        if (n % 2 == 0) nums.Remove(n);    // InvalidOperationException: Collection was modified

The List keeps a version number; Add or Remove bumps it, and the enumerator throws on its next
MoveNext. Fixes:

    nums.RemoveAll(n => n % 2 == 0);                     // best: one pass, built for this
    for (int i = nums.Count - 1; i >= 0; i--)            // backwards by index also works
        if (nums[i] % 2 == 0) nums.RemoveAt(i);
    foreach (var n in nums.ToList()) ...                 // walk a copy, change the original

## Writing an iterator with yield return

    static IEnumerable<int> Evens(int limit)
    {
        for (int i = 0; i <= limit; i += 2)
            yield return i;
    }

The compiler turns the method into a state machine. **Nothing in the body runs when you call it** —
it runs a piece at a time, each time the caller asks for the next item:

    static IEnumerable<int> Gen()
    {
        Console.Write("[start]"); yield return 1;
        Console.Write("[mid]");   yield return 2;
        Console.Write("[end]");
    }

    var g = Gen();
    Console.WriteLine("created");
    foreach (var x in g) Console.Write("<" + x + ">");
    // created
    // [start]<1>[mid]<2>[end]

\`yield break\` ends the sequence early. Because the body is lazy, an argument check inside an
iterator does not throw until the first MoveNext — put validation in a non-iterator wrapper method.

## Natural order: IComparable<T>

    class Student : IComparable<Student>
    {
        public string Name; public int Marks;
        public int CompareTo(Student other) => other.Marks.CompareTo(Marks);  // highest first
    }

    students.Sort();   // uses CompareTo

CompareTo returns negative (this first), zero (equal) or positive (other first). Use
\`a.CompareTo(b)\` on the field rather than \`a - b\`, which overflows for large ints.

## Any other order: IComparer<T> or a Comparison<T>

    class ByName : IComparer<Student>
    {
        public int Compare(Student a, Student b) => string.CompareOrdinal(a.Name, b.Name);
    }
    students.Sort(new ByName());

    students.Sort((a, b) => a.Marks != b.Marks
        ? b.Marks.CompareTo(a.Marks)                  // marks, high to low
        : string.CompareOrdinal(a.Name, b.Name));     // then name A→Z

\`Comparer<T>.Create(lambda)\` turns a lambda into an IComparer when an API needs the interface
(SortedSet, SortedDictionary, PriorityQueue).

## Stability

\`List<T>.Sort\` and \`Array.Sort\` are **not stable**: elements that compare equal may come out in
any order. LINQ's \`OrderBy\` / \`ThenBy\` **is** stable. If ties matter, either add a tie-breaker to
the comparer or use OrderBy.`,
    workedExample: `**Problem.** Sort a leaderboard: highest score first; equal scores by fewer attempts; still equal,
by name A→Z. Output must be identical on every machine.

    players.Sort((a, b) =>
    {
        int c = b.Score.CompareTo(a.Score);          // 1. score, descending: compare b to a
        if (c != 0) return c;
        c = a.Attempts.CompareTo(b.Attempts);        // 2. attempts, ascending
        if (c != 0) return c;
        return string.CompareOrdinal(a.Name, b.Name); // 3. name, ordinal, so culture cannot change it
    });

1. Each key is compared only when every earlier key tied.
2. Descending is written by swapping the operands, never by negating a subtraction.
3. The last key makes the order **total**: no two distinct players compare as 0, so the unstable
   List.Sort cannot reorder ties.
4. Ordinal comparison makes "Zara" sort before "anil" (uppercase codes are smaller) — predictable,
   which a test needs, if not what a human expects. Use \`StringComparer.OrdinalIgnoreCase\` and a
   final ordinal key if the brief asks for case-insensitive names.`,
    mcqs: [
      mcq(`What happens when this runs?

    var ids = new List<int> { 1, 2, 3, 4 };
    foreach (var id in ids)
        if (id == 2) ids.Remove(id);`, [
        ['InvalidOperationException on the next loop step', true],
        ['ids becomes 1, 3, 4 and the loop finishes normally', false],
        ['The loop skips 3 silently and ends with 1, 3, 4', false],
        ['It does not compile, because ids is being iterated', false],
      ], 'Remove bumps the list\'s version number, and the enumerator checks it on MoveNext and throws "Collection was modified". Use RemoveAll or loop backwards by index.'),
      mcq(`What is printed first?

    static IEnumerable<int> Load()
    {
        Console.WriteLine("loading");
        yield return 1;
    }

    var items = Load();
    Console.WriteLine("ready");
    foreach (var i in items) Console.WriteLine(i);`, [
        ['ready', true],
        ['loading', false],
        ['1', false],
        ['Nothing — an iterator that yields once prints no output', false],
      ], 'Calling an iterator method only creates the state machine. Its body starts at the first MoveNext, inside foreach, so "ready" prints before "loading".'),
      mcq('Which Comparison<Order> sorts orders by Total from highest to lowest?', [
        ['(a, b) => b.Total.CompareTo(a.Total)', true],
        ['(a, b) => a.Total.CompareTo(b.Total)', false],
        ['(a, b) => a.Total > b.Total ? 1 : -1', false],
        ['(a, b) => (int)(a.Total - b.Total)', false],
      ], 'Comparing b to a reverses natural order. The ternary never returns 0 and breaks the comparer contract; the subtraction is ascending and truncates fractions.'),
    ],
    checkpoint: [
      mcq('Why can `if (count < 0) throw ...` at the top of a yield-return method fail to throw when the method is called?', [
        ['The body does not run until the sequence is first enumerated', true],
        ['Exceptions are swallowed inside every iterator method', false],
        ['yield return converts all exceptions into an empty sequence', false],
        ['The check runs only after the last item has been yielded', false],
      ], 'An iterator\'s body is deferred. The throw happens at the first MoveNext, possibly far from the bad call. Split it: a normal method validates and returns the result of a private iterator.'),
      mcq('A List<Employee> is sorted with List.Sort by department only. Two employees in the same department swap places between runs. Why?', [
        ['List.Sort is not stable, so equal elements may be reordered', true],
        ['List.Sort sorts in descending order when keys tie', false],
        ['The comparer is called in parallel on several threads', false],
        ['Sort uses each object\'s hash code to break ties', false],
      ], 'List<T>.Sort uses introsort, which is unstable. Add a tie-breaker to the comparer, or use LINQ OrderBy, which keeps equal elements in their original order.'),
      mcq('A class implements `IComparable<Product>`. Which call uses that implementation?', [
        ['products.Sort() with no arguments', true],
        ['products.Sort(new ByPrice())', false],
        ['products.Reverse()', false],
        ['products.Distinct()', false],
      ], 'Parameterless Sort uses Comparer<T>.Default, which calls the element\'s IComparable<T>.CompareTo. Passing an IComparer overrides it; Reverse and Distinct do not compare order.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_GENERICS',
    notes: `\`List<T>\` works for any T because it is **generic**: written once with a type parameter, checked by
the compiler for each type it is used with. You can write your own.

## A generic class

    public class Box<T>
    {
        private readonly List<T> _items = new List<T>();
        public void Put(T item) => _items.Add(item);
        public T Take(int i) => _items[i];
        public int Count => _items.Count;
    }

    var names = new Box<string>();
    names.Put("Asha");
    // names.Put(42);   // compile error: cannot convert int to string

Unlike Java, .NET generics are **reified**: \`Box<int>\` and \`Box<string>\` are distinct types at run
time, \`typeof(T)\` works inside the class, and a \`Box<int>\` stores ints unboxed. One consequence:
each closed type gets its own static fields.

    class Counter<T> { public static int Count; }
    Counter<int>.Count++; Counter<int>.Count++; Counter<string>.Count++;
    Console.WriteLine(Counter<int>.Count + " " + Counter<string>.Count);   // 2 1

## A generic method

    public static T Largest<T>(IEnumerable<T> items) where T : IComparable<T>
    {
        bool any = false; T best = default(T);
        foreach (var x in items)
            if (!any || x.CompareTo(best) > 0) { best = x; any = true; }
        if (!any) throw new InvalidOperationException("empty");
        return best;
    }

    int m = Largest(new[] { 3, 9, 4 });   // T inferred as int

The compiler **infers** T from the arguments; you rarely write \`Largest<int>(...)\`.
\`default(T)\` (or \`default\` in C# 7.1+) is 0, false or null depending on T.

## Constraints: what T is allowed to be

Without constraints you can only use T as an object. A \`where\` clause unlocks members:

| Constraint | Means | Unlocks |
|---|---|---|
| where T : IComparable<T> | T implements the interface | x.CompareTo(y) |
| where T : class | reference type | T can be null; comparisons with null |
| where T : struct | non-nullable value type | T? as Nullable<T> |
| where T : new() | has a public parameterless constructor | new T() |
| where T : Entity | derives from Entity | Entity's members |
| where T : notnull | non-nullable (C# 8) | used for dictionary keys |

    public class Repository<T> where T : Entity, new()
    {
        public T Create() { var e = new T(); e.CreatedAt = DateTime.UtcNow; return e; }
    }

Several constraints are comma-separated; \`new()\` must come last.

## Reading generic signatures

    public static TResult Aggregate<TSource, TAccumulate, TResult>(...)
    public class Dictionary<TKey, TValue> where TKey : notnull

Read each \`T...\` as "a type the caller chooses", then the constraints as "but it must be able to …".

## Variance: why IEnumerable<string> is an IEnumerable<object>

    IEnumerable<object> objs = new List<string> { "x" };   // compiles: IEnumerable<out T> is covariant
    // List<object> list = new List<string>();             // does not compile

\`IEnumerable<out T>\` only ever hands T **out**, so treating a sequence of strings as a sequence of
objects is safe. \`List<T>\` also takes T **in** (Add); if a \`List<string>\` could be used as a
\`List<object>\`, someone could Add an int to it. So List is **invariant**. \`IComparer<in T>\` and
\`Action<in T>\` are **contravariant** — a comparer of objects can compare strings.`,
    mcqs: [
      mcq(`What does this print?

    class Counter<T> { public static int Hits; }

    Counter<int>.Hits++;
    Counter<string>.Hits++;
    Counter<int>.Hits++;
    Console.WriteLine(Counter<int>.Hits + " " + Counter<string>.Hits);`, [
        ['2 1', true],
        ['3 3', false],
        ['2 2', false],
        ['1 1', false],
      ], 'Counter<int> and Counter<string> are different closed types in .NET, and each has its own static field. Two increments go to the int version and one to the string version.'),
      mcq('Which constraint lets a generic method body write `new T()`?', [
        ['where T : new()', true],
        ['where T : class', false],
        ['where T : struct, IDisposable', false],
        ['where T : IComparable<T>', false],
      ], 'Only the new() constraint guarantees a public parameterless constructor. class says T is a reference type but says nothing about constructors.'),
      mcq('Which assignment compiles?', [
        ['IEnumerable<object> a = new List<string>();', true],
        ['List<object> b = new List<string>();', false],
        ['IList<object> c = new List<string>();', false],
        ['ICollection<object> d = new List<string>();', false],
      ], 'IEnumerable<out T> is covariant because it only returns T. List<T>, IList<T> and ICollection<T> accept T through Add, so they are invariant and the conversion is refused.'),
    ],
    checkpoint: [
      mcq('Inside `static T Max<T>(T a, T b)` with no constraint, `a.CompareTo(b)` does not compile. What is the fix?', [
        ['Add where T : IComparable<T> to the method', true],
        ['Cast both arguments to int before comparing them', false],
        ['Add where T : class so T is a reference type', false],
        ['Declare the parameters as object instead of T', false],
      ], 'Without a constraint the compiler only knows T is an object. The IComparable<T> constraint promises CompareTo exists for every T the caller is allowed to pass.'),
      mcq('What is `default(T)` when T is int, and when T is string?', [
        ['0 for int, null for string', true],
        ['0 for int, "" for string', false],
        ['null for both, because T is generic', false],
        ['It does not compile without a constraint on T', false],
      ], 'default(T) is the all-zero value of the type: 0 for numbers, false for bool, null for any reference type including string. No constraint is needed.'),
      mcq('How do .NET generics differ from Java generics at run time?', [
        ['.NET keeps the type argument, so List<int> stores unboxed ints', true],
        ['.NET erases T to object, exactly as Java does', false],
        ['.NET generics exist only for classes, not methods', false],
        ['.NET checks generic types at run time, not compile time', false],
      ], '.NET generics are reified: List<int> is a real type with an int[] inside, typeof(T) works, and each closed type has its own statics. Java erases type arguments and boxes primitives.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_DEBUGGING',
    notes: `Seven collection bugs that reach code review again and again. For each: the symptom, the cause,
and the one change that fixes it.

## 1. Removing inside foreach

    foreach (var c in cart.Items)
        if (c.Quantity == 0) cart.Items.Remove(c);

**Symptom:** \`InvalidOperationException: Collection was modified; enumeration operation may not
execute.\` **Cause:** the enumerator notices the list's version changed. **Fix:**
\`cart.Items.RemoveAll(c => c.Quantity == 0);\`

## 2. Reading a key that might be missing

    var price = prices[sku];    // KeyNotFoundException for a new SKU

**Cause:** the indexer getter throws on a missing key. **Fix:**
\`if (!prices.TryGetValue(sku, out var price)) { /* not found path */ }\`

## 3. Add on a key that already exists

    foreach (var row in rows) totals.Add(row.City, row.Amount);   // ArgumentException on the second Pune row

**Cause:** \`Add\` refuses duplicates. The intent was to accumulate. **Fix:**
\`totals.TryGetValue(row.City, out var t); totals[row.City] = t + row.Amount;\`

## 4. A custom key with Equals but no GetHashCode

    class Sku { public string Code; public override bool Equals(object o) => o is Sku s && s.Code == Code; }
    var stock = new Dictionary<Sku, int> { [new Sku { Code = "A1" }] = 5 };
    stock.ContainsKey(new Sku { Code = "A1" });   // false

**Symptom:** a compiler warning (CS0659) and lookups that fail. **Cause:** equal keys get different
hash codes and land in different buckets. **Fix:** override \`GetHashCode\` from the same fields —
\`public override int GetHashCode() => Code.GetHashCode();\` — or make Sku a record.

## 5. Mutating a key after inserting it

    var seen = new HashSet<Sku> { sku };
    sku.Code = "B2";
    seen.Contains(sku);      // false, though it is the same object

**Cause:** the element is filed under its old hash. **Fix:** make key fields read-only (\`init\` or
\`readonly\`), or Remove, change, Add.

## 6. Relying on Dictionary order

A report prints \`foreach (var kv in totals)\` and a test that passed for months fails after a
removal and re-insert. **Cause:** Dictionary enumeration order is unspecified; removing frees a slot
that a later Add reuses. **Fix:** sort for output — \`foreach (var k in totals.Keys.OrderBy(k => k,
StringComparer.Ordinal))\` — or use SortedDictionary.

## 7. A comparer that is not a valid ordering

    list.Sort((a, b) => a.Score > b.Score ? -1 : 1);   // never returns 0

**Symptom:** odd orders, and sometimes \`InvalidOperationException: IComparer.Compare() method returns
inconsistent results\`. **Cause:** \`Compare(x, x)\` must be 0, and \`Compare(a, b)\` must be the
opposite sign of \`Compare(b, a)\`. **Fix:** \`(a, b) => b.Score.CompareTo(a.Score)\`.

## How to approach any of these

1. Read the exception type and the line. 2. Ask which collection rule it breaks: version check,
missing key, duplicate key, hash/equals contract, ordering contract. 3. Fix that rule, not the
symptom — do not wrap it in try/catch.`,
    mcqs: [
      mcq('`totals.Add(row.City, row.Amount)` throws ArgumentException on the second row for "Pune". The intent is a running total per city. What is the right change?', [
        ['Read the current total with TryGetValue and assign total + amount', true],
        ['Wrap the Add in try/catch and ignore the duplicate', false],
        ['Check ContainsKey first and skip the row when it exists', false],
        ['Switch to a SortedDictionary, which allows duplicate keys', false],
      ], 'The bug is using Add for accumulation. Reading the current value (0 when new) and writing back through the indexer adds or updates. Skipping or catching loses the second amount.'),
      mcq('A class overrides Equals but not GetHashCode and is used as a HashSet element. What is the usual symptom?', [
        ['Contains returns false for an equal but different object', true],
        ['The code fails to compile until GetHashCode is added', false],
        ['Contains throws InvalidOperationException', false],
        ['Every element hashes to the same bucket, so it is only slow', false],
      ], 'GetHashCode still comes from object identity, so equal objects pick different buckets and Equals is never consulted. The compiler only warns (CS0659); it does not stop the build.'),
      mcq('A test compares `string.Join(",", dict.Keys)` to a fixed string and fails intermittently after the code started removing keys. What is the fix?', [
        ['Order the keys explicitly before joining them', true],
        ['Call dict.TrimExcess() before reading the keys', false],
        ['Rebuild the dictionary with the same capacity first', false],
        ['Use dict.Values instead, which keeps insertion order', false],
      ], 'Dictionary enumeration order is unspecified and changes when freed slots are reused. Sort the keys (with an ordinal comparer) or use SortedDictionary when order is part of the output.'),
      mcq('`list.Sort((a, b) => a.Age < b.Age ? -1 : 1)` sometimes throws "IComparer.Compare() method returns inconsistent results". Why?', [
        ['It never returns 0, so comparing an item to itself says "greater"', true],
        ['The lambda should return a bool rather than an int for Sort', false],
        ['Sort cannot accept a lambda, only an IComparer object', false],
        ['Ages must be compared as strings for Sort to work', false],
      ], 'A valid comparison returns 0 for equal items and opposite signs when the arguments are swapped. Use a.Age.CompareTo(b.Age), which satisfies both rules.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_PRACTICE',
    notes: `No new ideas — repetition until choosing and using a collection stops needing thought. Write each
one in a console project, and predict the output before you run it.

**Exercise 1 — First repeated character.** Given a string, print the first character that appears
twice, or \`none\`. Use a \`HashSet<char>\` and the bool returned by Add. ("swiss" → s;
"abc" → none.)

**Exercise 2 — Anagram groups.** Given words, group the ones that are anagrams of each other. Key a
\`Dictionary<string, List<string>>\` by the word's letters sorted
(\`new string(word.OrderBy(c => c).ToArray())\`). Print groups with more than one word.

**Exercise 3 — Balanced brackets.** With a \`Stack<char>\`, decide whether \`{[()()]}\` and
\`([)]\` are balanced. Push openers; on a closer, Pop and check the pair; at the end the stack must
be empty.

**Exercise 4 — Hot-potato queue.** Seat n players in a \`Queue<string>\`. Repeatedly move k players
from the front to the back, then remove the next one. Print who is removed, in order, and the winner.

**Exercise 5 — Sort with a comparer.** Sort \`List<Student>\` by marks descending, then name
ascending (ordinal). Write it once as an \`IComparer<Student>\` class and once as a lambda. Then
check: does the order of two students with equal marks and equal names matter? (No — they are
indistinguishable for this order.)

**Exercise 6 — A generic helper.** Write \`static Dictionary<TKey, int> CountBy<T, TKey>(IEnumerable<T>
items, Func<T, TKey> key)\` and use it to count words by length and students by city.

## The graded exercise — Page visits

Read a visit log from standard input and report unique users and per-page statistics in a fixed
order. Your program is run against test cases, so the output must match exactly. The full
specification is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, what does `seen.Add(c)` return on the second "s" of "swiss"?', [
        ['false, since "s" is already in the set', true],
        ['true, since Add always succeeds on a HashSet', false],
        ['the index where "s" was first stored', false],
        ['It throws, because a set cannot take a duplicate', false],
      ], 'HashSet.Add returns false when the element is already present and leaves the set unchanged. That return value is the whole check: the first false is the first repeat.'),
      mcq('In Exercise 2, why key the dictionary by the sorted letters of each word?', [
        ['All anagrams of a word sort to the same string', true],
        ['Sorted strings use less memory as dictionary keys', false],
        ['A Dictionary requires its string keys to be sorted', false],
        ['Sorting removes the duplicate letters from each word', false],
      ], 'Anagrams contain the same letters in a different order, so sorting gives every anagram one shared key ("listen" and "silent" both become "eilnst").'),
      mcq('In Exercise 3, the input is "(()". What tells you it is unbalanced?', [
        ['The stack still holds an opener when the input ends', true],
        ['Pop is called on an empty stack partway through', false],
        ['A closer is matched with the wrong kind of opener', false],
        ['The string has an odd number of characters in total', false],
      ], 'Every closer matches, but one "(" is never closed, so the stack is not empty at the end. An odd length does imply imbalance, but the stack check is the general rule.'),
      mcq('In Exercise 4, why a Queue<string> rather than a List<string> with RemoveAt(0)?', [
        ['Dequeue is O(1), while RemoveAt(0) shifts every player', true],
        ['A List cannot hold the same name more than once', false],
        ['A Queue keeps the players sorted by name automatically', false],
        ['List.RemoveAt(0) throws when the list has one item left', false],
      ], 'Moving players from front to back is exactly Dequeue then Enqueue, both O(1). Doing it on a List costs O(n) per move for the shift.'),
      mcq('In Exercise 5, which comparer body sorts by marks descending, then name ascending?', [
        ['a.Marks != b.Marks ? b.Marks.CompareTo(a.Marks) : string.CompareOrdinal(a.Name, b.Name)', true],
        ['a.Marks != b.Marks ? a.Marks.CompareTo(b.Marks) : string.CompareOrdinal(b.Name, a.Name)', false],
        ['b.Marks.CompareTo(a.Marks) + string.CompareOrdinal(a.Name, b.Name)', false],
        ['a.Name == b.Name ? 0 : b.Marks.CompareTo(a.Marks)', false],
      ], 'Marks decide first, compared b to a for descending; only on a tie do names decide, compared a to b for ascending. Adding two comparison results can let the name outweigh the marks.'),
    ],
    assignment: {
      title: 'Page Visits with Dictionary, HashSet and a Comparer',
      description: 'Count visits and unique visitors per page from a log on standard input, and print the pages in a fixed order using a custom comparer.',
      instructions: `Write a C# console program that reads a visit log and reports on it.

**The grader runs C# 7 (Mono).** Use a classic \`static void Main()\` inside a class; do not use
top-level statements, records, \`$"..."\` interpolation or \`PriorityQueue\`. Generic collections and
LINQ are fine.

**Input**

The first line is a number N. Each of the next N lines is one visit:

    <user> <page>

Words are separated by one or more spaces. User and page names are **case-sensitive**: \`Home\` and
\`home\` are different pages. A line that does not have exactly two words is ignored (but counted —
see below).

**What to compute**

- The number of distinct users across all valid lines.
- For each page: how many visits it had, and how many **distinct** users visited it.

**Output**

    Unique users: <count>
    <page> <visits> <distinctUsers>
    ...
    Ignored lines: <count>

Pages are printed in this order:

1. more visits first;
2. if visits tie, more distinct users first;
3. if both tie, by page name in **ordinal** order (\`string.CompareOrdinal\`) — so \`Home\` comes
   before \`home\`, and \`/a\` before \`/b\`.

Print the \`Ignored lines\` line **only if** at least one line was ignored. If N is 0, print only
\`Unique users: 0\`.

**Example**

Input:

    7
    asha home
    ravi home
    asha cart
    meena home
    asha home
    ravi cart
    meena about

Output:

    Unique users: 3
    home 4 3
    cart 2 2
    about 1 1

**Design (this is what the exercise is for)**

- A \`Dictionary<string, ...>\` keyed by page, holding a visit count and a \`HashSet<string>\` of users.
- One \`HashSet<string>\` for all users.
- The order written as an \`IComparer<T>\` class or a \`Comparison<T>\` lambda passed to
  \`List<T>.Sort\` — not a chain of nested loops.

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including ties, case-sensitive names, ignored lines and an empty log.', maxPoints: 60 },
        { criterion: 'Right collections', description: 'A Dictionary keyed by page, a HashSet per page for distinct users and one HashSet for all users; TryGetValue or the indexer used correctly, no linear searches.', maxPoints: 25 },
        { criterion: 'Comparer', description: 'The three-level order is one IComparer or Comparison passed to Sort, comparing with CompareTo and string.CompareOrdinal rather than subtraction.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        int n = int.Parse(Console.ReadLine().Trim());
        for (int i = 0; i < n; i++)
        {
            string line = Console.ReadLine();
            string[] parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            // TODO: skip (and count) lines without exactly two words
            // TODO: record the user, and the visit and the user for parts[1]
        }

        // TODO: print "Unique users: <count>"
        // TODO: sort the pages (visits desc, distinct users desc, name ordinal) and print each
        // TODO: print "Ignored lines: <count>" only when some line was ignored
    }
}
`,
        tests: [
          { input: '7\nasha home\nravi home\nasha cart\nmeena home\nasha home\nravi cart\nmeena about\n', expectedOutput: 'Unique users: 3\nhome 4 3\ncart 2 2\nabout 1 1' },
          { input: '4\nu1 /a\nu2 /b\nu1 /b\nu2 /a\n', expectedOutput: 'Unique users: 2\n/a 2 2\n/b 2 2' },
          { input: '5\nkiran Home\nkiran home\ndivya home\nkiran Home\nbala about\n', expectedOutput: 'Unique users: 3\nhome 2 2\nHome 2 1\nabout 1 1', isHidden: true },
          { input: '0\n', expectedOutput: 'Unique users: 0', isHidden: true },
          { input: '4\nasha home\nbroken\nravi  cart   \nx y z\n', expectedOutput: 'Unique users: 2\ncart 1 1\nhome 1 1\nIgnored lines: 2', isHidden: true },
          { input: '3\nzed blog\nzed blog\nzed blog\n', expectedOutput: 'Unique users: 1\nblog 3 1', isHidden: true },
          { input: '6\na p2\nb p1\nc p2\na p1\nb p3\nb p3\n', expectedOutput: 'Unique users: 3\np1 2 2\np2 2 2\np3 2 1', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_INTERVIEW_QUESTION',
    notes: `Three collection questions asked in nearly every .NET interview. For each: the answer that gets you
through, and the follow-up a good answer earns.

## 1. "How does a Dictionary work internally? What is the time complexity of a lookup?"

**Model answer.** A Dictionary keeps an array of buckets and an array of entries. To find a key it
calls \`GetHashCode\`, maps the hash to a bucket, and walks that bucket's chain comparing keys with
\`Equals\`. With a reasonable hash function the chains stay short, so add, lookup and remove are
**O(1) on average**. When the entry count reaches capacity it resizes — allocates a larger prime
number of buckets and re-inserts every entry — which is O(n) but rare, so Add is O(1) amortised.
The worst case, every key colliding, is O(n).

**Follow-up:** "What do you need to do to use your own class as a key?" Override \`Equals\` and
\`GetHashCode\` from the same fields so equal keys hash equally, make those fields immutable, or use
a record. Or pass an \`IEqualityComparer<T>\` to the constructor.

## 2. "List<T> or LinkedList<T> — when would you choose each?"

**Model answer.** List<T> is a growable array: O(1) index, O(1) amortised Add at the end, O(n)
insert or remove in the middle because elements shift. LinkedList<T> is doubly linked: O(1) insert
and remove **given a node**, but O(n) to find a node and no indexer. In practice List wins almost
always — contiguous memory is cache-friendly and there is one allocation instead of one per node.
I would choose LinkedList only when I already hold node references and constantly splice in the
middle, such as an LRU cache combined with a Dictionary of nodes.

**Follow-up:** "What does List do when it runs out of space?" It allocates an array of double the
capacity and copies the elements across. Passing the expected size to the constructor avoids those
copies.

## 3. "What is the difference between IEnumerable<T>, ICollection<T> and IList<T>?"

**Model answer.** Each adds to the one before. IEnumerable<T> can only be enumerated — it is what
foreach and LINQ need. ICollection<T> adds Count, Add, Remove, Contains and Clear. IList<T> adds
positional access: the indexer, Insert, RemoveAt and IndexOf. I type a parameter by the least it
needs — usually IEnumerable<T> — and a return value by what the caller may do, often
IReadOnlyList<T>.

**Follow-up:** "Is there a cost to taking IEnumerable<T> and calling Count() on it?" If the sequence
is really a collection, LINQ's Count() uses the Count property; if it is a lazy query, Count()
enumerates the whole thing, and a later foreach enumerates it again. Materialise with ToList() once
if you need both.

## Answering aloud

Give the structure, the complexity, and then the trade-off or the case where your answer changes.`,
    mcqs: [
      mcq('An interviewer asks for the worst-case lookup cost in a Dictionary and why. What is the accurate answer?', [
        ['O(n), when every key lands in the same bucket', true],
        ['O(1), because hashing never needs to compare keys', false],
        ['O(log n), because buckets are kept as sorted trees', false],
        ['O(n log n), because the buckets are re-sorted on lookup', false],
      ], 'Average lookup is O(1), but if all keys collide one chain holds everything and the search compares keys one by one. A good GetHashCode keeps that from happening.'),
      mcq('Follow-up: "What happens inside List<T> when Count reaches Capacity and you Add?"', [
        ['A new array of double the capacity is allocated and items copied', true],
        ['A second array is linked on, so the old one is not copied', false],
        ['The Add throws until you call EnsureCapacity yourself', false],
        ['The list switches to a linked representation internally', false],
      ], 'List<T> is backed by one array. When it is full, it allocates a bigger array (double the size) and copies, which is O(n) occasionally and O(1) amortised per Add.'),
      mcq('A method takes IEnumerable<Order>, calls orders.Count(), then loops with foreach. The argument is a LINQ query over a database. What is the risk?', [
        ['The query is enumerated twice, so it runs twice', true],
        ['Count() always returns 0 for a lazy query', false],
        ['foreach cannot iterate after Count() has been called', false],
        ['IEnumerable<T> does not provide a Count() method', false],
      ], 'A deferred query re-executes on every enumeration. Calling ToList() once at the start materialises it, and then Count and the loop both use the list.'),
    ],
  },

  {
    unitCode: 'JT_CS_COLLECTIONS_CHECKPOINT',
    notes: `Ten questions across the whole topic: the interfaces, List and LinkedList, Dictionary, sets, stacks
and queues, iteration and sorting, and generics. Most show a few lines of C# and ask what happens.
Trace the code by hand — what is in the collection after each line, and which rule (hashing,
ordering, version checks) applies — before you look at the options.`,
    checkpoint: [
      mcq(`What does this print?

    var stock = new Dictionary<string, int> { { "pen", 3 } };
    stock["ink"] = 2;
    stock["pen"] += 5;
    Console.WriteLine(stock.Count + " " + stock["pen"]);`, [
        ['2 8', true],
        ['2 5', false],
        ['3 8', false],
        ['1 8', false],
      ], 'Assigning stock["ink"] adds a second key. The compound assignment reads pen (3), adds 5 and writes 8 back to the same key, so there are two keys and pen holds 8.'),
      mcq(`What does this print?

    var s = new Stack<int>(new[] { 4, 5, 6 });
    s.Pop();
    s.Push(9);
    Console.WriteLine(string.Join(",", s));`, [
        ['9,5,4', true],
        ['4,5,9', false],
        ['9,6,5,4', false],
        ['5,4,9', false],
      ], 'The constructor pushes 4, 5, 6, so 6 is on top. Pop removes 6 and Push puts 9 on top. Enumerating a stack goes top to bottom: 9, 5, 4.'),
      mcq(`What does this print?

    var tags = new HashSet<string> { "api", "db" };
    tags.UnionWith(new[] { "db", "ui" });
    tags.ExceptWith(new[] { "api" });
    Console.WriteLine(tags.Count + " " + tags.Contains("db"));`, [
        ['2 True', true],
        ['3 True', false],
        ['2 False', false],
        ['4 True', false],
      ], 'UnionWith adds only "ui" ("db" is already there), giving api, db, ui. ExceptWith removes api, leaving db and ui: two elements, and db is present.'),
      mcq('A product catalogue needs lookups by SKU and must also list products in SKU order for a report. Which is the simplest correct choice?', [
        ['SortedDictionary<string, Product> keyed by SKU', true],
        ['Dictionary<string, Product>, relying on its insertion order', false],
        ['HashSet<Product> with Equals overridden on the SKU', false],
        ['List<Product> searched with IndexOf for each lookup', false],
      ], 'SortedDictionary gives O(log n) lookup and walks keys in order. A Dictionary\'s order is unspecified; a HashSet has no key lookup; a List lookup is O(n).'),
      mcq(`What happens when this runs?

    var names = new List<string> { "a", "b", "c" };
    foreach (var n in names)
        if (n == "b") names.Add("d");`, [
        ['InvalidOperationException after "b" is processed', true],
        ['The loop runs four times, including "d"', false],
        ['The loop runs three times and the list ends with "d"', false],
        ['It does not compile, because names is being enumerated', false],
      ], 'Add changes the list\'s version, so the enumerator throws on the next MoveNext. Adding is as illegal as removing during foreach over a List.'),
      mcq('Which declaration lets callers pass a List, an array or a LINQ query while promising nothing will be added?', [
        ['void Print(IEnumerable<Invoice> invoices)', true],
        ['void Print(List<Invoice> invoices)', false],
        ['void Print(ICollection<Invoice> invoices)', false],
        ['void Print(Invoice[] invoices)', false],
      ], 'IEnumerable<T> is implemented by all three and exposes no Add. ICollection<T> excludes LINQ queries and has Add; List<T> or an array accepts only that one type.'),
      mcq(`What does this print?

    static IEnumerable<int> Take3()
    {
        yield return 1;
        yield return 2;
        yield break;
        yield return 3;
    }
    Console.WriteLine(string.Join(",", Take3()));`, [
        ['1,2', true],
        ['1,2,3', false],
        ['1', false],
        ['It does not compile, because of unreachable code', false],
      ], 'yield break ends the sequence, so 3 is never produced. The unreachable yield return earns a warning, not an error.'),
      mcq('A generic method needs to call `item.Validate()` defined on an abstract class Entity. Which signature allows it?', [
        ['static void Check<T>(T item) where T : Entity', true],
        ['static void Check<T>(T item) where T : class', false],
        ['static void Check<T>(T item) where T : new()', false],
        ['static void Check<T>(T item)', false],
      ], 'A base-class constraint tells the compiler every T derives from Entity, so Entity\'s members are available on item. class and new() do not say which members T has.'),
      mcq('A PriorityQueue<string, int> must hand out the job with the HIGHEST number first. What do you change?', [
        ['Pass a comparer that reverses int order to the constructor', true],
        ['Nothing — PriorityQueue always dequeues the largest value', false],
        ['Enqueue the jobs in descending order of priority', false],
        ['Read UnorderedItems, which lists the highest first', false],
      ], 'PriorityQueue is a min-heap. Comparer<int>.Create((a, b) => b.CompareTo(a)) flips it; negating the priority is a common alternative. Enqueue order and UnorderedItems do not decide dequeue order.'),
      mcq(`What does this print?

    var marks = new List<int> { 70, 95, 80 };
    marks.Sort((a, b) => b.CompareTo(a));
    marks.RemoveAt(0);
    Console.WriteLine(string.Join(",", marks));`, [
        ['80,70', true],
        ['95,80', false],
        ['70,80', false],
        ['95,70', false],
      ], 'Comparing b to a sorts descending: 95, 80, 70. RemoveAt(0) removes 95, leaving 80 and 70.'),
    ],
  },
  /* ══ JT_CS_LINQ — Delegates, LINQ and Modern C# ══════════════════════════════════════════ */
  {
    unitCode: 'JT_CS_LINQ_DELEGATES',
    notes: `A **delegate** is a type whose values are methods. It lets you pass behaviour — "how to compare",
"what to do when it finishes", "which items to keep" — the way you pass data.

## Declaring and using a delegate type

    public delegate bool Rule(int value);           // any method: int → bool

    static bool IsEven(int n) { return n % 2 == 0; }

    Rule r = IsEven;                                 // a method group converts to the delegate
    Console.WriteLine(r(4));                         // True — invoking the delegate calls IsEven

A delegate value holds a method (and, for an instance method, the object to call it on). Invoking it
is a normal call.

## You rarely declare your own: Func, Action, Predicate

.NET defines generic delegates for almost every shape:

| Type | Shape | Example |
|---|---|---|
| \`Action\` | no args, no result | \`Action beep = () => Console.Beep();\` |
| \`Action<T1, T2>\` | args, no result | \`Action<string> log = Console.WriteLine;\` |
| \`Func<TResult>\` | no args, a result | \`Func<DateTime> now = () => DateTime.UtcNow;\` |
| \`Func<T1, T2, TResult>\` | args **then** the result type last | \`Func<int, int, int> add = (a, b) => a + b;\` |
| \`Predicate<T>\` | T → bool | \`Predicate<int> isEven = n => n % 2 == 0;\` |

The **last** type argument of a Func is the return type. \`Func<string, int>\` takes a string and
returns an int.

## Passing behaviour into a method

    static List<T> Keep<T>(IEnumerable<T> items, Func<T, bool> test)
    {
        var result = new List<T>();
        foreach (var x in items) if (test(x)) result.Add(x);
        return result;
    }

    var big = Keep(orders, o => o.Total > 1000);
    var mine = Keep(orders, o => o.Customer == "Asha");

One loop, many behaviours. This is exactly how LINQ's Where is built. The framework uses
\`Predicate<T>\` in older List methods (\`FindAll\`, \`RemoveAll\`, \`Exists\`) and \`Func<T, bool>\` in
LINQ; they have the same shape but are **different types**, so one does not convert to the other
without a lambda in between.

## Multicast delegates

A delegate can hold several methods. \`+=\` adds one; invoking calls them all in order.

    Action<string> notify = s => Console.Write("mail:" + s + " ");
    notify += s => Console.Write("sms:" + s + " ");
    notify("paid");        // mail:paid sms:paid

For a delegate that returns a value, **only the last method's result** is returned:

    Func<int, int> f = x => x + 1;
    f += x => x * 10;
    Console.WriteLine(f(5));   // 50 — both ran, the second result wins

Multicast is used for notifications (events, next unit), almost never for Funcs.

## Invoking a delegate that may be null

A delegate variable with nothing assigned is \`null\`; calling it throws NullReferenceException.
\`callback?.Invoke(result);\` (C# 6) calls it only when it is set.`,
    workedExample: `**Problem.** A discount engine has five if/else branches, one per festival. Every new festival edits
the method. Rewrite it so new rules are added without touching the engine.

    var rules = new List<Func<Order, decimal>>
    {
        o => o.Total > 5000 ? 0.10m * o.Total : 0m,          // big-order rule
        o => o.Items.Count >= 3 ? 200m : 0m,                 // three-item rule
    };

    decimal Discount(Order o)
    {
        decimal best = 0m;
        foreach (var rule in rules) best = Math.Max(best, rule(o));
        return best;
    }

    rules.Add(o => o.Date.Month == 11 ? 0.05m * o.Total : 0m);   // Diwali, added from outside

1. Each rule has the same shape — Order in, decimal out — so the type is \`Func<Order, decimal>\`.
2. The engine loops over rules and keeps the best; it never names a festival.
3. Adding a rule is adding a lambda to the list. The engine is closed for edits and open for new
   behaviour — the strategy pattern, with delegates instead of one class per strategy.`,
    mcqs: [
      mcq('Which delegate type matches a method that takes a string and an int and returns a bool?', [
        ['Func<string, int, bool>', true],
        ['Func<bool, string, int>', false],
        ['Action<string, int, bool>', false],
        ['Predicate<string, int>', false],
      ], 'For Func the parameter types come first and the return type is the last type argument. Action never returns a value, and Predicate takes exactly one argument.'),
      mcq(`What does this print?

    Func<int, int> f = x => x + 1;
    f += x => x * 10;
    Console.WriteLine(f(5));`, [
        ['50', true],
        ['6', false],
        ['60', false],
        ['56', false],
      ], 'Invoking a multicast delegate calls every method in order, but only the last one\'s return value comes back. Both run on 5; the second returns 50.'),
      mcq('`OnDone` is an `Action<string>` field nobody has assigned. What does `OnDone("ok");` do?', [
        ['Throws NullReferenceException', true],
        ['Does nothing, since an empty delegate is skipped', false],
        ['Fails to compile because OnDone may be null', false],
        ['Prints "ok" through the default delegate handler', false],
      ], 'An unassigned delegate field is null, and invoking null throws. Write OnDone?.Invoke("ok") to call it only when something is attached.'),
    ],
    checkpoint: [
      mcq('What is the type of `n => n.Length > 3` when assigned to a variable for List<string>.FindAll?', [
        ['Predicate<string>', true],
        ['Func<int, bool>', false],
        ['Action<string>', false],
        ['Func<bool, string>', false],
      ], 'FindAll takes a Predicate<T>, a delegate from T to bool. Func<string, bool> has the same shape but is a different type, so a variable of that type would not be accepted.'),
      mcq('Why is a method taking `Func<Order, bool> filter` more reusable than one that filters on `order.Total > 1000` inside?', [
        ['The caller decides the condition without changing the method', true],
        ['Delegates make the loop run in parallel automatically', false],
        ['A Func can be compiled to SQL, while an if statement cannot', false],
        ['Func parameters avoid allocating any objects at run time', false],
      ], 'Passing the condition as a delegate separates "how to loop" from "what to keep". Every caller supplies its own rule; the method never changes.'),
      mcq(`What does this print?

    Action<string> log = s => Console.Write("A" + s);
    log += s => Console.Write("B" + s);
    log("x");`, [
        ['AxBx', true],
        ['Bx', false],
        ['Ax', false],
        ['BxAx', false],
      ], '+= appends a second method to the invocation list, and invoking calls them in the order they were added.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_LAMBDAS_EVENTS',
    notes: `A **lambda** is an inline, unnamed method. An **event** is a delegate that only its owner can fire.
Together they are how .NET code says "when this happens, do that".

## Lambda syntax

    Func<int, int> square = x => x * x;                 // one parameter, expression body
    Func<int, int, int> add = (a, b) => a + b;          // several parameters need parentheses
    Action hello = () => Console.WriteLine("hi");       // none
    Func<string, bool> valid = s =>
    {
        if (string.IsNullOrWhiteSpace(s)) return false; // statement body: braces and return
        return s.Length <= 50;
    };

The parameter types come from the delegate type the lambda is converted to. Since C# 10 a lambda can
have a natural type: \`var parse = (string s) => int.Parse(s);\` infers \`Func<string, int>\`.

## Closures: a lambda captures variables, not values

    int counter = 0;
    Action inc = () => counter++;
    inc(); inc();
    Console.WriteLine(counter);     // 2 — the lambda changed the outer variable itself

The compiler moves \`counter\` into a hidden object shared by the method and the lambda. That is
powerful and it is a trap.

## The capture trap in a for loop

    var actions = new List<Action>();
    for (int i = 0; i < 3; i++)
        actions.Add(() => Console.Write(i));
    foreach (var a in actions) a();     // 333

There is **one** \`i\` for the whole loop. Every lambda captured it, and by the time they run it is 3.
Fix: copy it into a variable declared inside the loop body.

    for (int i = 0; i < 3; i++)
    {
        int copy = i;
        actions.Add(() => Console.Write(copy));   // 012
    }

Since C# 5, a **foreach** loop variable is fresh on each iteration, so
\`foreach (var i in new[] { 0, 1, 2 }) actions.Add(() => Console.Write(i));\` prints 012. The
\`for\` loop was not changed.

## Events

    public class Order
    {
        public event EventHandler<string> StatusChanged;

        public void Ship()
        {
            // ... update state ...
            StatusChanged?.Invoke(this, "Shipped");
        }
    }

    var order = new Order();
    order.StatusChanged += (sender, status) => Console.WriteLine("Email: " + status);
    order.StatusChanged += (sender, status) => Console.WriteLine("SMS: " + status);
    order.Ship();

What \`event\` adds over a public delegate field: outside code can only \`+=\` and \`-=\`. It
**cannot** invoke the event, assign it with \`=\` (wiping other subscribers), or read the list.

The convention is \`EventHandler\` or \`EventHandler<TEventArgs>\`: a \`(object sender, TEventArgs e)\`
signature. Raise with \`?.Invoke\`, because an event with no subscribers is null.

## Unsubscribing, and the leak it prevents

    EventHandler<string> handler = (s, st) => Console.WriteLine(st);
    order.StatusChanged += handler;
    order.StatusChanged -= handler;          // works: the same delegate instance

    order.StatusChanged -= (s, st) => Console.WriteLine(st);   // removes nothing — a new lambda

To unsubscribe, keep a reference to the handler. A long-lived publisher holds references to every
subscriber's handler, so a subscriber that never unsubscribes is never garbage collected — the
classic .NET event memory leak.`,
    mcqs: [
      mcq(`What does this print?

    var list = new List<Func<int>>();
    for (int i = 0; i < 3; i++) list.Add(() => i * 10);
    foreach (var f in list) Console.Write(f() + " ");`, [
        ['30 30 30', true],
        ['0 10 20', false],
        ['20 20 20', false],
        ['0 0 0', false],
      ], 'All three lambdas capture the single loop variable i, which is 3 when the loop ends. Copy i into a local declared inside the body to capture each value.'),
      mcq('Outside the Order class, which line on `public event EventHandler Shipped;` does NOT compile?', [
        ['order.Shipped(order, EventArgs.Empty);', true],
        ['order.Shipped += OnShipped;', false],
        ['order.Shipped -= OnShipped;', false],
        ['order.Shipped += (s, e) => Console.WriteLine("sent");', false],
      ], 'The event keyword restricts outside code to += and -=. Only the declaring class may invoke the event, which stops other code from faking a notification.'),
      mcq(`What does this print?

    Action<string> log = s => Console.Write("1" + s);
    log += s => Console.Write("2" + s);
    log -= s => Console.Write("1" + s);
    log("y");`, [
        ['1y2y', true],
        ['2y', false],
        ['1y', false],
        ['Nothing, because -= removed both methods', false],
      ], 'The lambda after -= is a new delegate instance that was never subscribed, so nothing is removed. Keep the original handler in a variable to unsubscribe it.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    var acts = new List<Action>();
    foreach (var n in new[] { 1, 2, 3 })
        acts.Add(() => Console.Write(n));
    foreach (var a in acts) a();`, [
        ['123', true],
        ['333', false],
        ['111', false],
        ['It does not compile, because n is a foreach variable', false],
      ], 'Since C# 5 each foreach iteration has its own copy of the loop variable, so each lambda captures a different n. Only the for loop still shares one variable.'),
      mcq('Why should a class expose `public event EventHandler Paid;` rather than `public EventHandler Paid;`?', [
        ['Outside code can then only subscribe or unsubscribe', true],
        ['An event field is faster to invoke than a delegate field', false],
        ['A plain delegate field cannot hold more than one handler', false],
        ['Only events can be invoked with the ?.Invoke syntax', false],
      ], 'With a bare delegate field any caller could invoke it or assign = and wipe every other subscriber. event allows only += and -= from outside the class.'),
      mcq('A short-lived form subscribes to a long-lived service\'s event and never unsubscribes. What is the consequence?', [
        ['The service keeps every form alive, so they are never collected', true],
        ['The handler stops firing once the form goes out of scope', false],
        ['The runtime unsubscribes the form automatically when it closes', false],
        ['The service throws when it raises the event to a closed form', false],
      ], 'The event\'s invocation list holds a reference to each handler and its target object. While the service lives, the forms are reachable and the garbage collector cannot free them.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_LINQ_BASICS',
    notes: `**LINQ** (Language Integrated Query, \`using System.Linq;\`) is a set of extension methods on
\`IEnumerable<T>\` that filter, transform, sort and summarise sequences — the same code for a List, an
array, a dictionary or (through EF Core) a database table.

## Where, Select, OrderBy

    var students = new List<Student> { ... };

    var toppers = students
        .Where(s => s.Marks >= 90)            // keep matching items
        .OrderByDescending(s => s.Marks)      // sort by a key
        .ThenBy(s => s.Name)                  // tie-breaker
        .Select(s => s.Name.ToUpper())        // transform each item
        .ToList();                            // run it and collect a List<string>

Each method returns a new sequence; nothing in the source list changes. \`Select\` can change the
element type — here Student becomes string.

## Projections into new shapes

    var rows = students.Select(s => new { s.Name, Grade = s.Marks >= 60 ? "Pass" : "Fail" });
    foreach (var r in rows) Console.WriteLine(r.Name + " " + r.Grade);

\`new { ... }\` is an **anonymous type**: read-only properties, value equality, a name only the
compiler knows (so \`var\` is required). Use it inside a method; return a named class or record
from a method. \`Select((s, i) => ...)\` also gives you the index.

## Query syntax

    var q = from s in students
            where s.Marks >= 90
            orderby s.Marks descending, s.Name
            select s.Name;

The compiler rewrites this into the method calls above. Both are LINQ; most codebases use method
syntax and switch to query syntax for joins and \`let\`.

## Picking single items

| Method | Empty sequence | More than one match |
|---|---|---|
| \`First()\` | throws InvalidOperationException | returns the first |
| \`FirstOrDefault()\` | returns default (null, 0) | returns the first |
| \`Single()\` | throws | **throws** |
| \`SingleOrDefault()\` | returns default | **throws** |
| \`Last()\`, \`ElementAt(i)\` | throws | — |

Use \`Single\` when more than one result means corrupt data (an email that must be unique);
\`First\` when you just want one. \`FirstOrDefault\` on a list of ints returns 0 for "none", which is
indistinguishable from a real 0 — check \`Any\` first, or project to \`int?\`.

## Questions about the whole sequence

    bool anyFailed = students.Any(s => s.Marks < 35);    // stops at the first match
    bool allPassed = students.All(s => s.Marks >= 35);   // stops at the first failure
    int toppers = students.Count(s => s.Marks >= 90);
    bool hasAsha = names.Contains("Asha");

Prefer \`Any()\` over \`Count() > 0\`: Any stops at the first element, Count walks them all.

## Paging and slicing

    var page2 = products.OrderBy(p => p.Id).Skip(10).Take(10);   // items 11–20
    var distinctCities = students.Select(s => s.City).Distinct();

\`Distinct\` uses Equals and GetHashCode — fine for strings and numbers, but your own classes need
overrides (or \`DistinctBy\` in .NET 6+).`,
    workedExample: `**Problem.** From a list of products, show the names of the three cheapest in-stock items in the
"Stationery" category, cheapest first; ties by name.

    var cheapest = products
        .Where(p => p.Category == "Stationery" && p.Stock > 0)
        .OrderBy(p => p.Price)
        .ThenBy(p => p.Name, StringComparer.Ordinal)
        .Take(3)
        .Select(p => p.Name + " - " + p.Price)
        .ToList();

1. **Filter first.** Where reduces the data before the sort, which is O(n log n).
2. **Sort with a tie-breaker.** \`ThenBy\` applies only within equal prices. Calling \`OrderBy\`
   twice would instead re-sort everything by name, throwing the price order away.
3. **Take after sorting.** Take(3) before OrderBy would take any three and then sort them.
4. **Select last**, so the sort still sees the Product objects.
5. **ToList at the end** runs the query once and gives a stable result to pass around.`,
    mcqs: [
      mcq(`What does this print?

    var words = new[] { "bob", "amy", "cat", "carl" };
    var q = from w in words
            where w.Length == 3
            orderby w descending
            select w.ToUpper();
    Console.WriteLine(string.Join(",", q.Take(2)));`, [
        ['CAT,BOB', true],
        ['AMY,BOB', false],
        ['BOB,AMY', false],
        ['CARL,CAT', false],
      ], 'The filter keeps bob, amy and cat; descending order is cat, bob, amy; Take(2) keeps the first two, and select upper-cases them.'),
      mcq('An email column must be unique. Which call fails loudly if two users share an email?', [
        ['users.Single(u => u.Email == email)', true],
        ['users.First(u => u.Email == email)', false],
        ['users.FirstOrDefault(u => u.Email == email)', false],
        ['users.Where(u => u.Email == email).Last()', false],
      ], 'Single throws InvalidOperationException when more than one element matches, which surfaces the corrupt data. First and FirstOrDefault quietly return one of them.'),
      mcq('Which is the cheapest way to ask whether any order is unpaid?', [
        ['orders.Any(o => !o.Paid)', true],
        ['orders.Count(o => !o.Paid) > 0', false],
        ['orders.Where(o => !o.Paid).ToList().Count != 0', false],
        ['orders.Select(o => !o.Paid).Contains(true) == true', false],
      ], 'Any stops at the first unpaid order. Count walks the whole sequence, and ToList also allocates a list just to measure it.'),
    ],
    checkpoint: [
      mcq('What does `new List<int>().FirstOrDefault()` return, and why can that be misleading?', [
        ['0, which looks the same as a real element equal to 0', true],
        ['null, which must then be checked before use', false],
        ['It throws InvalidOperationException on an empty list', false],
        ['-1, the conventional "not found" marker in .NET', false],
      ], 'FirstOrDefault returns default(T), which for int is 0. A caller cannot tell "empty" from "first element was 0"; check Any first or use a nullable projection.'),
      mcq(`What does this print?

    var nums = new[] { 4, 7, 8, 9, 10 };
    Console.WriteLine(nums.Where(n => n % 2 == 0).Skip(1).First());`, [
        ['8', true],
        ['4', false],
        ['7', false],
        ['10', false],
      ], 'Where keeps 4, 8 and 10. Skip(1) drops 4, and First returns 8.'),
      mcq('`products.OrderBy(p => p.Price).OrderBy(p => p.Name)` was meant to sort by price, then name for ties. What does it actually do?', [
        ['Sorts by name only; the price order is replaced', true],
        ['Sorts by price, and by name only where prices tie', false],
        ['Sorts by price and name combined into one key', false],
        ['Throws, because OrderBy cannot be called twice', false],
      ], 'A second OrderBy starts a new sort over the whole sequence. Because LINQ sorting is stable, price survives only as the order among equal names. ThenBy is the tie-breaker.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_LINQ_GROUPING',
    notes: `Reports are grouping and summing. LINQ does both in a few lines, and an interviewer will ask you to
write one on the spot.

## Aggregates

    int total = orders.Sum(o => o.Quantity);
    decimal biggest = orders.Max(o => o.Amount);
    double avg = new[] { 1, 2 }.Average();      // 1.5 — Average of ints is a double
    int n = orders.Count();

Rules that trip people:

- \`Sum\` of an empty sequence is **0**.
- \`Max\`, \`Min\` and \`Average\` of an empty sequence of non-nullable numbers **throw
  InvalidOperationException**. Guard with \`Any()\`, or use \`DefaultIfEmpty()\`.
- \`MaxBy\` / \`MinBy\` (.NET 6+) return the **element** with the largest key; \`Max(o => o.Amount)\`
  returns only the amount.

## GroupBy

    var byCity = students.GroupBy(s => s.City);
    foreach (var g in byCity)
        Console.WriteLine(g.Key + ": " + g.Count() + " students, top " + g.Max(s => s.Marks));

Each group is an \`IGrouping<TKey, TElement>\`: it has a \`Key\` and **is** a sequence of the
elements. Groups come out in the order their keys **first appear** in the source — not sorted — and
elements keep their source order within a group.

    var words = new[] { "bob", "amy", "cat", "ann", "bea", "carl" };
    foreach (var g in words.GroupBy(w => w[0])) Console.Write(g.Key + ":" + g.Count() + " ");
    // b:2 a:2 c:2

A typical report groups, projects, then sorts:

    var report = sales
        .GroupBy(s => s.Region)
        .Select(g => new { Region = g.Key, Orders = g.Count(), Revenue = g.Sum(s => s.Qty * s.Price) })
        .OrderByDescending(r => r.Revenue)
        .ThenBy(r => r.Region);

Group by **several fields** with an anonymous type key: \`GroupBy(s => new { s.Region, s.Year })\` —
anonymous types compare by value, so equal pairs fall into one group.

\`ToDictionary(x => x.Id)\` builds a lookup (and throws on duplicate keys); \`ToLookup(x => x.City)\`
builds a one-to-many lookup that returns an empty sequence, not an exception, for a missing key.

## Join

    var rows = employees.Join(departments,
        e => e.DeptId,              // key from the left
        d => d.Id,                  // key from the right
        (e, d) => e.Name + " - " + d.Title);

\`Join\` is an **inner join**: an employee whose DeptId has no department is left out. In query syntax:

    var rows = from e in employees
               join d in departments on e.DeptId equals d.Id
               select new { e.Name, d.Title };

For a left join, use \`join ... into g\` followed by \`from d in g.DefaultIfEmpty()\`, which yields
null for unmatched rows. \`GroupJoin\` gives each left item with the sequence of its matches.

## SelectMany: flattening

    var allSkills = candidates.SelectMany(c => c.Skills).Distinct();

Select would give a sequence of lists; SelectMany concatenates them into one sequence.

## Aggregate: a general fold

    int product = new[] { 1, 2, 3, 4 }.Aggregate((acc, x) => acc * x);      // 24
    string path = new[] { "a", "b" }.Aggregate("root", (acc, s) => acc + "/" + s);   // root/a/b

Without a seed the first element is the starting accumulator (and an empty sequence throws). Reach
for Sum, Max or string.Join first; use Aggregate when none of them fits.`,
    mcqs: [
      mcq(`What does this print?

    var words = new[] { "pear", "plum", "fig", "pea", "kiwi" };
    foreach (var g in words.GroupBy(w => w.Length))
        Console.Write(g.Key + "=" + g.Count() + " ");`, [
        ['4=3 3=2 ', true],
        ['3=2 4=3 ', false],
        ['4=2 3=2 4=1 ', false],
        ['4=3 3=3 ', false],
      ], 'GroupBy collects every word of a length into one group, and groups appear in the order their key is first seen: length 4 (pear), then 3 (fig). pear, plum and kiwi have 4 letters.'),
      mcq('`decimal top = orders.Max(o => o.Amount);` runs on an empty list. What happens?', [
        ['InvalidOperationException: the sequence contains no elements', true],
        ['top is 0, the default value of decimal, and no error occurs', false],
        ['top is decimal.MinValue, the identity for Max', false],
        ['It returns null, so top must be declared decimal?', false],
      ], 'Max, Min and Average over non-nullable numbers throw on an empty sequence. Sum is the exception, returning 0. Guard with Any() or project to decimal? so Max returns null.'),
      mcq('Employees with DeptId 9 exist, but there is no department 9. What does `employees.Join(departments, e => e.DeptId, d => d.Id, ...)` do with them?', [
        ['Leaves them out, because Join is an inner join', true],
        ['Includes them with a null department value', false],
        ['Throws KeyNotFoundException at the first such row', false],
        ['Pairs them with the first department in the list', false],
      ], 'Join keeps only pairs whose keys match on both sides. Keeping unmatched employees needs a left join: join ... into g, then g.DefaultIfEmpty().'),
    ],
    checkpoint: [
      mcq(`What does this print?

    var n = new[] { 1, 2, 3, 4 };
    Console.WriteLine(n.Aggregate((acc, x) => acc * x) + " " + n.Sum());`, [
        ['24 10', true],
        ['10 24', false],
        ['0 10', false],
        ['24 24', false],
      ], 'Aggregate without a seed starts from the first element: 1·2·3·4 = 24. Sum adds them: 10.'),
      mcq('A report must group sales by region AND year. Which key works with GroupBy?', [
        ['s => new { s.Region, s.Year }', true],
        ['s => s.Region + s.Year', false],
        ['s => new List<object> { s.Region, s.Year }', false],
        ['s => s.Region.GetHashCode() ^ s.Year', false],
      ], 'Anonymous types have value equality, so two sales with the same region and year produce equal keys. A List key uses reference equality; string concatenation and XOR can make different pairs collide.'),
      mcq('What does each element of `students.GroupBy(s => s.City)` give you?', [
        ['A Key and the sequence of students in that city', true],
        ['A city name and a count, but not the students', false],
        ['A Dictionary<string, Student> holding one student', false],
        ['The first student of each city, ordered by name', false],
      ], 'Each group is an IGrouping<string, Student>: g.Key is the city and enumerating g gives the students. Count, Sum and the other aggregates can be applied to it.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_DEFERRED',
    notes: `Most LINQ methods do not run when you call them. They build a recipe that runs when somebody
enumerates it. Knowing when that happens is the difference between a fast page and a slow one.

## Deferred: the query runs when it is enumerated

    var nums = new List<int> { 1, 2, 3 };
    var big = nums.Where(n => n > 1);     // nothing has been filtered yet
    nums.Add(4);
    Console.WriteLine(string.Join(",", big));   // 2,3,4 — it saw the 4

\`big\` is a query object holding the source and the lambda. Every \`foreach\`, \`ToList\`, \`Count()\`,
\`First()\` and \`string.Join\` runs it **again from the start**.

## Immediate: these run now

- **Materialisers** — \`ToList\`, \`ToArray\`, \`ToDictionary\`, \`ToHashSet\`, \`ToLookup\` — run the
  query and store the results.
- **Aggregates and single-item operators** — \`Count\`, \`Sum\`, \`Max\`, \`Any\`, \`First\`, \`Single\`
  — run it and return one value.

    var snapshot = nums.Where(n => n > 1).ToList();
    nums.Add(5);
    Console.WriteLine(string.Join(",", snapshot));   // 2,3,4 — fixed when ToList ran

## Lazy also means "only as much as needed"

    int calls = 0;
    var doubled = new[] { 1, 2, 3, 4, 5 }.Select(n => { calls++; return n * 2; });
    Console.WriteLine(doubled.First() + " " + calls);   // 2 1 — only one element was computed

LINQ streams element by element: Where, Select and Take pass each item down the chain as it is
asked for. Sorting and grouping are the exception — OrderBy must read **everything** before it can
yield the first item.

## Multiple enumeration

    var expensive = orders.Where(o => IsFraud(o));   // IsFraud calls a web service
    if (expensive.Any())
        foreach (var o in expensive) Flag(o);         // IsFraud runs again for every order

Every enumeration repeats the work, and if the source changed between them the answers disagree.
Rule: **if you will enumerate a query more than once, call ToList() once** and use the list. Tools
(ReSharper, Rider, Roslyn analysers) flag "possible multiple enumeration" for exactly this.

## IEnumerable<T> vs IQueryable<T>

Over a List, LINQ methods take **delegates** (\`Func<T, bool>\`) and run your C# code in memory —
that is LINQ to Objects, on \`IEnumerable<T>\`.

EF Core's \`DbSet<T>\` is an \`IQueryable<T>\`. Its LINQ methods take **expression trees**
(\`Expression<Func<T, bool>>\`): a description of the lambda as data, which EF Core translates to SQL.

    var q = db.Orders.Where(o => o.Total > 1000).OrderBy(o => o.Date).Take(20);
    // SELECT TOP(20) ... FROM Orders WHERE Total > 1000 ORDER BY Date   — runs in SQL Server

The filter, sort and limit happen in the database, and only 20 rows cross the network. Two
consequences you will meet in the EF Core topic:

- Switching to \`IEnumerable\` too early — \`db.Orders.ToList().Where(...)\` or
  \`.AsEnumerable().Where(...)\` — downloads **every row** and filters in memory.
- A lambda that calls your own C# method cannot be translated to SQL; EF Core throws
  "could not be translated" instead of silently pulling everything.

The query still runs only when enumerated: \`ToListAsync()\`, \`FirstAsync()\`, \`CountAsync()\` and so on.`,
    mcqs: [
      mcq(`What does this print?

    var src = new List<int> { 5, 6 };
    var q = src.Select(x => x * 2);
    src.Add(7);
    Console.WriteLine(q.Count());`, [
        ['3', true],
        ['2', false],
        ['0', false],
        ['6', false],
      ], 'Select is deferred, so the query reads src when Count() runs, after 7 was added. Three elements are projected and counted.'),
      mcq('Which of these runs its query immediately rather than building a deferred one?', [
        ['orders.ToList()', true],
        ['orders.Where(o => o.Paid)', false],
        ['orders.Select(o => o.Id)', false],
        ['orders.OrderBy(o => o.Date)', false],
      ], 'ToList enumerates the source and copies the results into a list straight away. Where, Select and OrderBy return query objects that run only when enumerated.'),
      mcq('`db.Orders.ToList().Where(o => o.Total > 1000)` is slow on a table of a million rows. Why?', [
        ['ToList loads every row before the filter runs in memory', true],
        ['Where on a List sends one SQL query per row', false],
        ['ToList disables the database index on Total', false],
        ['The lambda is compiled again for each of the rows', false],
      ], 'ToList executes the query with no WHERE clause and materialises all rows. Filtering on the IQueryable first (db.Orders.Where(...).ToList()) lets SQL Server return only the matches.'),
    ],
    checkpoint: [
      mcq(`What does this print?

    int calls = 0;
    var q = new[] { 1, 2, 3 }.Where(n => { calls++; return n > 1; });
    var a = q.Count();
    var b = q.Count();
    Console.WriteLine(calls);`, [
        ['6', true],
        ['3', false],
        ['0', false],
        ['2', false],
      ], 'Each Count() enumerates the deferred query from the start, calling the lambda once per element: 3 + 3 = 6. A ToList() before counting would make it 3.'),
      mcq('What is the difference between a lambda passed to Where on a List and on an EF Core DbSet?', [
        ['On the DbSet it becomes an expression tree that is turned into SQL', true],
        ['On the List it is translated to SQL, on the DbSet it runs in C#', false],
        ['There is none; both compile the lambda to a delegate and run it', false],
        ['On the DbSet the lambda runs once for every row in the table', false],
      ], 'IQueryable<T> methods take Expression<Func<T, bool>>, a data structure EF Core reads and translates. IEnumerable<T> methods take Func<T, bool> and simply call it.'),
      mcq(`What does this print?

    var list = new List<int> { 3, 1, 2 };
    var sorted = list.OrderBy(x => x);
    list.Add(0);
    Console.WriteLine(string.Join(",", sorted));`, [
        ['0,1,2,3', true],
        ['1,2,3', false],
        ['3,1,2,0', false],
        ['1,2,3,0', false],
      ], 'OrderBy is deferred like Where. string.Join enumerates it after 0 was added, so the sort sees four elements.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_MODERN_CSHARP',
    notes: `Current .NET code is written in C# 10–12. This unit is the syntax you will read in every
ASP.NET Core project, with the version each feature arrived in.

## Records (C# 9)

    public record Product(string Sku, string Name, decimal Price);

    var a = new Product("P1", "Pen", 10m);
    var b = new Product("P1", "Pen", 10m);
    Console.WriteLine(a == b);              // True — value equality, generated for you
    var c = a with { Price = 12m };         // non-destructive copy with one change
    Console.WriteLine(a);                   // Product { Sku = P1, Name = Pen, Price = 10 }

A positional record generates init-only properties, a constructor, \`Equals\`/\`GetHashCode\` over all
properties, \`==\`, a readable \`ToString\` and deconstruction. Use records for DTOs, API requests and
responses, and value objects. \`record struct\` (C# 10) is the value-type version. A record is
shallowly immutable: a \`List<T>\` property can still be changed through the list.

## init and required (C# 9, C# 11)

    public class Customer
    {
        public required string Email { get; init; }   // must be set in the object initialiser
        public string? Phone { get; init; }            // optional, settable only during creation
    }

    var c = new Customer { Email = "a@x.com" };
    // c.Email = "b@x.com";       // compile error: init-only
    // new Customer { };           // compile error: required member Email not set

## Nullable reference types (C# 8, on by default in new projects)

With \`<Nullable>enable</Nullable>\`, \`string\` means "never null" and \`string?\` means "may be
null". The compiler tracks it:

    string? phone = customer.Phone;
    Console.WriteLine(phone.Length);          // warning CS8602: possible null dereference
    if (phone is not null) Console.WriteLine(phone.Length);   // fine — checked
    Console.WriteLine(phone?.Length ?? 0);    // fine

These are **warnings**, not run-time checks: the program still compiles and can still throw if you
ignore them. \`phone!.Length\` (the null-forgiving operator) silences the warning and promises you
know better. Many teams turn the warnings into errors with \`<WarningsAsErrors>nullable</WarningsAsErrors>\`.

## Pattern matching

    if (shape is Circle c) Console.WriteLine(c.Radius);            // type pattern (C# 7)
    if (order is { Status: "Paid", Total: > 1000 }) Flag(order);   // property + relational (C# 8, 9)
    if (input is not null and not "") Use(input);                   // logical patterns (C# 9)

    string Band(int marks) => marks switch            // switch expression (C# 8)
    {
        >= 90 => "A",
        >= 75 => "B",
        >= 35 => "C",
        _ => "Fail"                                    // discard: everything else
    };

A switch expression returns a value, tests arms **top to bottom**, and must be exhaustive — if no
arm matches at run time it throws \`SwitchExpressionException\`. The compiler warns when it can see
an input no arm covers.

## The rest of the modern file

    namespace Shop.Api;                          // file-scoped namespace (C# 10)
    global using System.Text.Json;               // one using for the whole project (C# 10)
    List<int> ids = [1, 2, 3];                   // collection expression (C# 12)
    public class OrderService(IOrderRepo repo)   // primary constructor (C# 12)
    {
        public Order? Find(int id) => repo.Get(id);
    }
    var total = $"Total: {sum:F2}";              // interpolation (C# 6), raw strings """ (C# 11)

And \`Program.cs\` in a new web project has **top-level statements** (C# 9): no class, no Main —
the compiler generates them.`,
    mcqs: [
      mcq('Given `record Point(int X, int Y);`, what is `new Point(1, 2) == new Point(1, 2)`?', [
        ['True, because records compare by their property values', true],
        ['False, because they are two different objects in memory', false],
        ['It does not compile, since records do not define ==', false],
        ['True only if both were created with the with expression', false],
      ], 'A record generates Equals, GetHashCode and == over its properties, so two records with equal values are equal. A plain class would compare references and print False.'),
      mcq('With nullable reference types enabled, `string? name = Find(); Console.WriteLine(name.Length);` is written. What happens at compile time?', [
        ['A warning about a possible null dereference', true],
        ['A compile error that stops the build', false],
        ['Nothing — the compiler adds a null check for you', false],
        ['The compiler rewrites it as name?.Length', false],
      ], 'Nullable analysis produces warnings (CS8602) by default. It changes nothing at run time, so if name is null the program still throws NullReferenceException.'),
      mcq(`Using this switch expression, what is Band(75)?

    static string Band(int m) => m switch
    {
        >= 90 => "A",
        >= 75 => "B",
        >= 35 => "C",
        _ => "Fail"
    };`, [
        ['"B"', true],
        ['"C"', false],
        ['"A"', false],
        ['"Fail"', false],
      ], 'Arms are tested top to bottom and the first match wins. 75 fails >= 90 and matches >= 75, so the result is "B" even though >= 35 would also match.'),
    ],
    checkpoint: [
      mcq('What does `var p2 = p1 with { Price = 99m };` do when p1 is a record?', [
        ['Creates a copy of p1 with Price changed; p1 is unchanged', true],
        ['Changes Price on p1 and returns the same object', false],
        ['Creates a new record with only Price set, other values default', false],
        ['Does not compile unless Price has a public setter', false],
      ], 'with makes a non-destructive copy: every property is copied and the listed ones are replaced. It works with init-only properties, which is what records generate.'),
      mcq('A class has `public required string Email { get; init; }`. Which line compiles?', [
        ['var c = new Customer { Email = "a@x.com" };', true],
        ['var c = new Customer();', false],
        ['var c = new Customer(); c.Email = "a@x.com";', false],
        ['var c = new Customer { }; c.Email = "a@x.com";', false],
      ], 'required (C# 11) forces the object initialiser to set Email, and init allows setting it only there. Assigning after construction is an error, and omitting it is an error too.'),
      mcq('What does `if (order is { Status: "Paid", Total: > 1000 })` test?', [
        ['order is non-null, Status is "Paid" and Total exceeds 1000', true],
        ['order has been assigned a new anonymous object', false],
        ['order is of a type named Status with a Total field', false],
        ['Status or Total matches; one of them is enough', false],
      ], 'A property pattern also checks the object is not null, then every listed sub-pattern must match: a constant pattern for Status and a relational pattern for Total.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_DEBUGGING',
    notes: `Seven bugs from delegates, LINQ and modern C# that show up in real pull requests. For each: the
symptom, the cause, the fix.

## 1. The captured for-loop variable

    for (int i = 0; i < files.Length; i++)
        tasks.Add(Task.Run(() => Upload(files[i])));   // IndexOutOfRangeException, or wrong files

**Cause:** every lambda shares one \`i\`, which has reached files.Length by the time most of them run.
**Fix:** \`var file = files[i];\` inside the loop and capture \`file\` — or use foreach.

## 2. First() on data that might be empty

    var latest = orders.Where(o => o.CustomerId == id).OrderByDescending(o => o.Date).First();

**Symptom:** \`InvalidOperationException: Sequence contains no elements\` for a new customer.
**Fix:** \`FirstOrDefault()\` and handle null — or use First only where emptiness is truly a bug.

## 3. Max or Average on an empty list

    var avg = marks.Average();       // throws for a student with no marks yet

**Fix:** \`marks.Count == 0 ? 0 : marks.Average()\`, or \`marks.DefaultIfEmpty().Average()\` if 0 is
the right answer.

## 4. Multiple enumeration of an expensive query

    var flagged = orders.Where(o => fraudApi.Check(o));
    log.Info("flagged " + flagged.Count());
    foreach (var o in flagged) Hold(o);     // the API is called twice per order

**Fix:** \`var flagged = orders.Where(...).ToList();\` — enumerate once, use the list.

## 5. Expecting a deferred query to be a snapshot

    var pending = queue.Where(j => !j.Done);
    foreach (var j in queue) j.Done = true;
    Console.WriteLine(pending.Count());     // 0 — the query re-ran after the change

**Fix:** \`ToList()\` at the moment you want the snapshot.

## 6. OrderBy twice instead of ThenBy

    var list = people.OrderBy(p => p.City).OrderBy(p => p.Name);   // sorted by Name only

**Fix:** \`people.OrderBy(p => p.City).ThenBy(p => p.Name)\`.

## 7. An event raised with no subscribers, or unsubscribed with a new lambda

    Changed(this, EventArgs.Empty);     // NullReferenceException when nobody subscribed
    bus.Changed -= (s, e) => Refresh(); // removes nothing; the page leaks

**Fix:** \`Changed?.Invoke(this, EventArgs.Empty);\` and keep the handler in a field so \`-=\`
removes that exact delegate.

## Reading LINQ stack traces

A LINQ exception often surfaces at the line that **enumerates** (the foreach, the ToList, the
Count), not where the query was written — because that is where it runs. Look back to where the
query was built, and check its lambdas.`,
    mcqs: [
      mcq('A LINQ query is built on line 10 and an exception from inside its Where lambda appears with a stack trace pointing at line 40. Why line 40?', [
        ['Line 40 enumerates the query, and that is when the lambda runs', true],
        ['Line numbers in LINQ stack traces are always off by a few lines', false],
        ['The lambda was copied to line 40 when it was compiled', false],
        ['Line 40 caught and rethrew the original exception', false],
      ], 'Deferred execution runs the lambda during enumeration, so the exception is thrown from the foreach, ToList or Count that pulled the items, not where Where was called.'),
      mcq('`var avg = scores.Average();` throws for a new player with no scores. The display should show 0. Which fix is correct?', [
        ['scores.DefaultIfEmpty().Average()', true],
        ['scores.Average() ?? 0', false],
        ['scores.FirstOrDefault().Average()', false],
        ['scores.Where(s => s != 0).Average()', false],
      ], 'DefaultIfEmpty() turns an empty sequence into one containing 0, whose average is 0. ?? does not apply to a non-nullable double, and filtering out zeros still leaves it empty.'),
      mcq('An upload loop `for (int i = 0; i < n; i++) tasks.Add(Task.Run(() => Send(files[i])));` throws IndexOutOfRangeException. What is the fix?', [
        ['Copy files[i] into a local inside the loop and capture that', true],
        ['Change the loop condition to i <= n - 1', false],
        ['Await each Task.Run before starting the next one', false],
        ['Declare i outside the loop so that it lives longer than the tasks', false],
      ], 'All lambdas capture the single loop variable i, which reaches n before most tasks read it. A local declared inside the body is a fresh variable per iteration.'),
      mcq('A page unsubscribes with `bus.Updated -= (s, e) => Refresh();` but keeps receiving updates after closing. Why?', [
        ['The new lambda is a different delegate, so nothing was removed', true],
        ['-= on an event only takes effect after garbage collection runs', false],
        ['Events cannot be unsubscribed once they have been raised', false],
        ['The event needs to be set to null by the page instead', false],
      ], 'Removal matches the delegate instance (target and method). A second lambda with the same body is a different instance. Store the handler and pass that same object to -=.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_PRACTICE',
    notes: `No new ideas — repetition until LINQ is how you think about a list. For each exercise write the
query, then predict its output before running it.

**Exercise 1 — Delegates.** Write \`static int CountWhere(int[] xs, Func<int, bool> test)\` and call
it three ways: evens, multiples of 7, and values between two variables \`lo\` and \`hi\` (a closure).

**Exercise 2 — Basics.** From a \`List<Student>\` (Name, City, Marks): the names of students from
Pune with marks ≥ 75, highest marks first and ties by name; then whether anyone scored 100; then
the second page of five students ordered by name.

**Exercise 3 — Grouping.** Group the same students by city and print \`City: count, average\` with
the average to one decimal place, cities ordered by average descending, then by name.

**Exercise 4 — Join.** Given \`Order(Id, CustomerId, Amount)\` and \`Customer(Id, Name)\`, print each
customer's name with their total spend, including customers with no orders (a left join: \`join ...
into g\`, then \`g.Sum(o => o.Amount)\`, which is 0 for an empty group).

**Exercise 5 — Deferred or not?** For each, say when the query runs and how many times:
\`var q = xs.Where(...); var n = q.Count(); var l = q.ToList();\` and
\`var l = xs.Where(...).ToList(); var n = l.Count;\`.

**Exercise 6 — Modern C#.** Rewrite Exercise 3's result type as a \`record CityStats(string City, int
Count, double Average)\`, and a grade function as a switch expression with relational patterns.

## The graded exercise — Sales by region

Read sales records from standard input, group and total them with LINQ, and print a report in a
fixed, deterministic order. Your program is run against test cases, so the output must match
exactly. The full specification is in the assignment.`,
    mcqs: [
      mcq('In Exercise 1, how does `x => x >= lo && x <= hi` get the values of lo and hi when CountWhere calls it?', [
        ['The lambda captures the variables lo and hi themselves', true],
        ['CountWhere passes lo and hi as hidden extra arguments', false],
        ['lo and hi are copied into the lambda as constants at compile time', false],
        ['It cannot; lo and hi must be declared as static fields', false],
      ], 'A lambda that uses outer locals is a closure: the compiler moves lo and hi into a shared object, and the lambda reads their current values whenever it runs.'),
      mcq('In Exercise 2, which query gives the second page of five students ordered by name?', [
        ['students.OrderBy(s => s.Name).Skip(5).Take(5)', true],
        ['students.Skip(5).Take(5).OrderBy(s => s.Name)', false],
        ['students.OrderBy(s => s.Name).Take(5).Skip(5)', false],
        ['students.OrderBy(s => s.Name).Skip(10).Take(5)', false],
      ], 'Sort first, then skip the first page and take the next five. Paging before sorting gives an arbitrary five; Take(5).Skip(5) is always empty.'),
      mcq('In Exercise 3, what does `g.Average(s => s.Marks)` return when Marks is an int?', [
        ['A double, such as 77.5', true],
        ['An int, rounded down to 77', false],
        ['A decimal, rounded to two places', false],
        ['A string formatted to one decimal place', false],
      ], 'Average over int values returns double so fractional averages are kept. Formatting to one decimal is a separate step, such as avg.ToString("F1").'),
      mcq('In Exercise 4, a customer has no orders. What does `g.Sum(o => o.Amount)` give for their empty group?', [
        ['0, because Sum of an empty sequence is zero', true],
        ['It throws InvalidOperationException', false],
        ['null, because the group has no elements', false],
        ['The customer is dropped before Sum is called', false],
      ], 'Sum is defined as 0 for an empty sequence, unlike Max, Min and Average, which throw. With join ... into, customers without orders still get a group, just an empty one.'),
      mcq('In Exercise 5, how many times does `var q = xs.Where(f); var n = q.Count(); var l = q.ToList();` enumerate xs?', [
        ['Twice: once for Count and once for ToList', true],
        ['Once, when the Where call is made', false],
        ['Once, because Count caches its result for ToList', false],
        ['Three times: Where, Count and ToList each run it', false],
      ], 'Where is deferred and runs nothing. Count and ToList each enumerate the query from scratch, so f runs twice per element.'),
    ],
    assignment: {
      title: 'Sales by Region with LINQ',
      description: 'Read sales records from standard input, group and aggregate them with LINQ, and print a report in a deterministic order.',
      instructions: `Write a C# console program that reads sales and prints a report by region.

**The grader runs C# 7 (Mono).** Use a classic \`static void Main()\` inside a class; do not use
top-level statements, records, \`$"..."\` interpolation, \`MaxBy\` or \`DistinctBy\`. \`System.Linq\` is
available and is what this exercise is for.

**Input**

The first line is a number N. Each of the next N lines is one sale:

    <region> <product> <quantity> <unitPrice>

Words are separated by one or more spaces. Region and product names have no spaces and are
**case-sensitive** (\`alpha\` and \`Alpha\` are different regions). Quantity is a whole number; unit
price is a decimal number written with a dot (for example \`12.50\`). Every line is valid.

Parse prices with \`decimal.Parse(text, CultureInfo.InvariantCulture)\` and compute money in
\`decimal\`.

**Output**

If N is 0, print exactly \`No sales\`. Otherwise print one line per region:

    <region>: <orders> orders, <units> units, <revenue>

where orders is the number of sales lines for the region, units is the sum of quantities, and
revenue is the sum of quantity × unit price, printed with **two decimals** using
\`ToString("F2", CultureInfo.InvariantCulture)\`. The word is always \`orders\`, even for 1.

Regions are ordered by revenue, highest first; ties by region name in **ordinal** order
(\`StringComparer.Ordinal\`, so \`Alpha\` comes before \`alpha\`).

Then one final line naming the product with the most units sold across all regions:

    Best seller: <product> (<units> units)

Ties go to the product name that is first in ordinal order.

**Example**

Input:

    5
    South Pen 10 12.50
    North Notebook 4 60
    South Notebook 2 60
    East Pen 5 12.50
    North Pen 3 12.50

Output:

    North: 2 orders, 7 units, 277.50
    South: 2 orders, 12 units, 245.00
    East: 1 orders, 5 units, 62.50
    Best seller: Pen (18 units)

**Design (this is what the exercise is for)**

- Read the lines into a list of objects of a small \`Sale\` class.
- Build the report with \`GroupBy\`, \`Select\` into a projection, \`Sum\` / \`Count\`, and
  \`OrderByDescending\` with \`ThenBy(..., StringComparer.Ordinal)\` — not with nested loops or a
  hand-written sort.

**How it is graded**

Your program is run against every test case — the examples you can see and several you cannot — and
scored on how many it passes. Output is compared line by line. A reviewer uses the rubric for the
design marks.`,
      rubric: [
        { criterion: 'Correct output', description: 'Every line matches for every test case, including revenue ties, case-sensitive names, decimal prices and an empty input.', maxPoints: 60 },
        { criterion: 'LINQ used for the report', description: 'GroupBy with aggregates projected per group, and the ordering expressed with OrderByDescending and ThenBy; no hand-written grouping loops or sorts.', maxPoints: 25 },
        { criterion: 'Deterministic and exact', description: 'Money in decimal, invariant-culture parsing and formatting, and ordinal tie-breaking, so the output is the same on any machine.', maxPoints: 15 },
      ],
      totalPoints: 100,
      coding: {
        language: 'csharp',
        starter: `using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

class Sale
{
    public string Region;
    public string Product;
    public int Quantity;
    public decimal Price;
}

class Program
{
    static void Main()
    {
        CultureInfo inv = CultureInfo.InvariantCulture;
        int n = int.Parse(Console.ReadLine().Trim());
        var sales = new List<Sale>();
        for (int i = 0; i < n; i++)
        {
            string[] p = Console.ReadLine().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            // TODO: create a Sale from p (parse the price with inv) and add it to sales
        }

        // TODO: print "No sales" when there are none
        // TODO: group by region, order by revenue desc then region (ordinal), print each line
        // TODO: find the best-selling product by units (ties: ordinal name) and print it
    }
}
`,
        tests: [
          { input: '5\nSouth Pen 10 12.50\nNorth Notebook 4 60\nSouth Notebook 2 60\nEast Pen 5 12.50\nNorth Pen 3 12.50\n', expectedOutput: 'North: 2 orders, 7 units, 277.50\nSouth: 2 orders, 12 units, 245.00\nEast: 1 orders, 5 units, 62.50\nBest seller: Pen (18 units)' },
          { input: '3\nWest Bag 1 999.99\nWest Bag 2 999.99\nCentral Lamp 4 450.25\n', expectedOutput: 'West: 2 orders, 3 units, 2999.97\nCentral: 1 orders, 4 units, 1801.00\nBest seller: Lamp (4 units)' },
          { input: '0\n', expectedOutput: 'No sales', isHidden: true },
          { input: '1\nNorth Mug 1 0.10\n', expectedOutput: 'North: 1 orders, 1 units, 0.10\nBest seller: Mug (1 units)', isHidden: true },
          { input: '4\nbeta Pen 2 10\nAlpha Ink 1 20\nalpha Pen 1 20\nGamma Ink 3 5.5\n', expectedOutput: 'Alpha: 1 orders, 1 units, 20.00\nalpha: 1 orders, 1 units, 20.00\nbeta: 1 orders, 2 units, 20.00\nGamma: 1 orders, 3 units, 16.50\nBest seller: Ink (4 units)', isHidden: true },
          { input: '3\nSouth Pen 2 5\nNorth Cap 2 5\nEast Ant 1 5\n', expectedOutput: 'North: 1 orders, 2 units, 10.00\nSouth: 1 orders, 2 units, 10.00\nEast: 1 orders, 1 units, 5.00\nBest seller: Cap (2 units)', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 60,
      },
    },
  },

  {
    unitCode: 'JT_CS_LINQ_INTERVIEW_QUESTION',
    notes: `Three questions asked whenever LINQ appears on a .NET résumé. For each: the answer that gets you
through, and the follow-up a good answer earns.

## 1. "What is deferred execution in LINQ?"

**Model answer.** Most LINQ operators — Where, Select, OrderBy, GroupBy — don't run when called.
They return a query object that runs when it is enumerated: by foreach, ToList, Count, First and so
on. So the query sees the data as it is at enumeration time, and every enumeration runs it again.
Operators that return a single value or a collection — Count, Sum, First, ToList, ToDictionary — run
immediately. In practice I materialise with ToList when I need a snapshot or will enumerate more
than once.

**Follow-up:** "Is OrderBy streamed like Where?" It is deferred, but not streamed: it has to read
the whole source before it can yield the first element, because the smallest item could be last.
Where and Select pass items through one at a time.

## 2. "What is the difference between IEnumerable<T> and IQueryable<T>?"

**Model answer.** IEnumerable<T> is LINQ to Objects: the operators take delegates and run in memory
in my process. IQueryable<T> carries an expression tree and a provider; operators take
\`Expression<Func<...>>\`, and the provider — EF Core — translates the whole query to SQL and runs it
in the database when it is enumerated. So filtering an IQueryable sends a WHERE clause; filtering
after AsEnumerable or ToList pulls every row and filters in C#.

**Follow-up:** "What happens if the Where lambda calls one of your own C# methods?" EF Core cannot
translate it to SQL and throws at run time. Either express the condition with translatable
operations, or deliberately filter what you can in SQL first and finish in memory.

## 3. "What is the difference between a delegate and an event?"

**Model answer.** A delegate is a type-safe reference to one or more methods; Func and Action are
the built-in generic ones. An event is a delegate field wrapped so that outside code can only
subscribe and unsubscribe with += and -=; only the class that declares it can raise it or replace
the handler list. That stops another class from faking the notification or wiping other
subscribers. The convention is EventHandler<TEventArgs>, raised with ?.Invoke.

**Follow-up:** "How can events cause memory leaks?" The publisher holds a reference to each
subscriber's handler. If a short-lived object subscribes to a long-lived publisher and never
unsubscribes, it stays reachable and is never collected. Unsubscribe with the same delegate
instance, or use a weak-event pattern.

## Answering aloud

Define it, show it with one line of code, then give the consequence that bites in production.`,
    mcqs: [
      mcq('Follow-up: is `OrderBy` streamed one element at a time like `Where`?', [
        ['No — it is deferred, but must read everything before yielding', true],
        ['Yes — it yields each element as soon as it reads it', false],
        ['No — OrderBy runs immediately, like ToList', false],
        ['Yes — but only when a ThenBy follows it in the chain', false],
      ], 'Sorting cannot emit the first item until it has seen all of them. OrderBy still waits for enumeration to start, but then buffers the whole source.'),
      mcq('An EF Core query `db.Users.Where(u => IsVip(u))` calls a C# method IsVip. What happens when it is enumerated?', [
        ['EF Core throws because IsVip cannot be translated to SQL', true],
        ['IsVip is translated to a SQL function automatically', false],
        ['The filter is silently skipped and all users are returned', false],
        ['IsVip runs inside SQL Server as a CLR stored procedure', false],
      ], 'IQueryable operators receive an expression tree, and EF Core can translate only operations it knows. Since EF Core 3.0 an untranslatable Where throws rather than quietly loading every row.'),
      mcq('Which statement about events is accurate?', [
        ['Only the declaring class can raise an event', true],
        ['An event can hold at most one handler at a time', false],
        ['Events are raised on a background thread by default', false],
        ['An event with no subscribers is an empty list, never null', false],
      ], 'The event keyword limits outside code to += and -=. Events are multicast, run synchronously on the raising thread, and are null with no subscribers, hence ?.Invoke.'),
    ],
  },

  {
    unitCode: 'JT_CS_LINQ_MINI_PROJECT',
    notes: `# Mini Project — A Library Management System

Build a console library system in C# (.NET 8, no database, no web). The point is not the library —
it is bringing the language together: classes that guard their state, the right collections, your
own exceptions, events, and LINQ for every search and report.

## What it does

The program holds books, members and loans in memory and reads commands from the console:

    ADD-BOOK 978-0134685991 "Effective Java" "Joshua Bloch" 3
    ADD-MEMBER M1 Asha
    BORROW M1 978-0134685991
    RETURN M1 978-0134685991
    SEARCH java
    OVERDUE
    REPORT
    EXIT

## Requirements

1. **Model.** \`Book\` (ISBN, title, author, total copies, available copies), \`Member\` (id, name,
   active loans) and \`Loan\` (book, member, borrowed date, due date, returned date). Use a \`record\`
   for at least one immutable value (for example \`Loan\` or a \`BookSummary\` result). Available
   copies change only through \`Borrow\` and \`Return\` methods — there is no public setter.
2. **Collections.** Books in a \`Dictionary<string, Book>\` keyed by ISBN; members in a
   \`Dictionary<string, Member>\`; a \`List<Loan>\` for history. Duplicate ISBNs or member ids are
   rejected.
3. **Rules, as exceptions.** Write \`LibraryException\` and subclasses such as
   \`BookUnavailableException\` and \`LoanLimitExceededException\`. A member may hold at most 3 books;
   a book with no available copies cannot be borrowed; returning a book the member does not hold is
   an error. The command loop catches \`LibraryException\`, prints its message and continues. Bad
   input (unknown command, missing arguments) never crashes the program.
4. **Dates.** Loans are due 14 days after borrowing. Take the current date from an injectable
   \`Func<DateTime>\` clock (default \`() => DateTime.Today\`) so tests can move time forward.
5. **Events.** \`Library\` raises \`event EventHandler<Loan> BookOverdue\` when the OVERDUE command
   finds a late loan; a console notifier subscribes and prints the reminder.
6. **LINQ for every query.**
   - \`SEARCH <text>\`: books whose title or author contains the text, case-insensitive, ordered by
     title.
   - \`OVERDUE\`: unreturned loans past their due date, oldest due date first, with days late.
   - \`REPORT\`: total books and copies, copies on loan, the five most-borrowed titles (GroupBy over
     loan history, ties by title), and members with no loans.
7. **Output** is deterministic: every list has an explicit order.

## Acceptance criteria

- Borrowing the last copy sets available to 0; the next BORROW of that book prints a
  "not available" message and changes nothing.
- A fourth BORROW by one member is refused with the loan-limit message.
- With the clock moved 15 days ahead, OVERDUE lists the loan as 1 day late and the event handler
  prints a reminder.
- RETURN of a book the member does not hold prints an error; counts are unchanged.
- SEARCH "JAVA" finds "Effective Java".
- REPORT's top-five list is correct after at least eight borrow/return cycles over four books.
- \`ADD-BOOK\` with a non-numeric copy count, and an unknown command, each print an error and the
  program keeps running.

## Stretch goals

Save and load the library to a JSON file with System.Text.Json on EXIT and start (after the
Exceptions topic's file I/O); add a fine of ₹5 per day late, computed in the REPORT.

## What to submit

The source, a README with two sample sessions (one including refused borrows and an overdue
reminder), and five sentences on where you used a record, an event and a custom exception, and why.`,
    mcqs: [
      mcq('The brief asks for the current date through an injected `Func<DateTime>` rather than calling DateTime.Today directly. Why?', [
        ['A test can pass a clock that returns any date it needs', true],
        ['DateTime.Today does not work inside console programs', false],
        ['A Func<DateTime> is faster than reading the system clock', false],
        ['It makes every due date a fixed constant at compile time', false],
      ], 'Overdue logic depends on today\'s date. Injecting the clock as a delegate lets a test return "15 days later" and check the OVERDUE output without waiting two weeks.'),
      mcq('Which LINQ query lists the five most-borrowed titles, ties by title?', [
        ['loans.GroupBy(l => l.Book.Title).OrderByDescending(g => g.Count()).ThenBy(g => g.Key).Take(5)', true],
        ['loans.OrderByDescending(l => l.Book.Title).Take(5).GroupBy(l => l.Book.Title)', false],
        ['loans.GroupBy(l => l.Book.Title).Take(5).OrderByDescending(g => g.Count())', false],
        ['loans.Select(l => l.Book.Title).Distinct().OrderByDescending(t => t.Length).Take(5)', false],
      ], 'Group loans by title, order the groups by size with title as the tie-breaker, then take five. Taking before ordering picks an arbitrary five; Distinct loses the counts.'),
    ],
    assignment: {
      title: 'A Library Management System',
      description: 'A console library with books, members and loans: OOP, collections, custom exceptions, an event and LINQ for search, overdue and reports.',
      instructions: `Build the library described in this unit's brief and submit it as a repository link or a zip.

**Submit:**

1. The C# source (.NET 8 console app): \`Book\`, \`Member\`, \`Loan\` (at least one a record), a
   \`Library\` class that owns the collections, enforces the rules and raises \`BookOverdue\`, your
   \`LibraryException\` hierarchy, and a \`Program\` that runs the command loop.
2. A README with two sample sessions copied from your console — one normal, one showing a refused
   borrow (no copies, and loan limit), a failed return, bad input, and an overdue reminder after
   moving the clock.
3. Five sentences explaining where you used a record, an event and a custom exception, and why
   each was the right tool there.

**Before you submit, check every acceptance criterion in the brief** by running it, not by reading
your code.`,
      rubric: [
        { criterion: 'Correct library behaviour', description: 'Borrow, return, copy counts, the three-book limit, 14-day due dates and overdue detection all behave as the acceptance criteria state; refused operations change nothing.', maxPoints: 30 },
        { criterion: 'LINQ queries', description: 'SEARCH, OVERDUE and REPORT are LINQ queries with explicit, deterministic ordering, including GroupBy for the most-borrowed titles; no hand-written search loops.', maxPoints: 25 },
        { criterion: 'Design: OOP, collections and records', description: 'State is encapsulated (no public setter for available copies); dictionaries keyed by ISBN and member id; at least one record used for an immutable value; the clock injected as a Func<DateTime>.', maxPoints: 20 },
        { criterion: 'Exceptions and events', description: 'A LibraryException hierarchy for rule violations, caught in the command loop; bad input never crashes; BookOverdue raised with ?.Invoke and handled by a subscriber.', maxPoints: 15 },
        { criterion: 'README and explanation', description: 'Two sample sessions that exercise the failure paths, and five sentences that justify the record, the event and the exceptions.', maxPoints: 10 },
      ],
      totalPoints: 100,
    },
  },

  {
    unitCode: 'JT_CS_LINQ_CHECKPOINT',
    notes: `Ten questions across the whole topic: delegates, lambdas and closures, events, LINQ basics,
grouping and aggregates, deferred execution and modern C#. Most show a few lines of C# and ask what
happens. Trace each one: when does the lambda run, what has it captured, and when does the query
actually read its source?`,
    checkpoint: [
      mcq(`What does this print?

    Func<int, int> twice = x => x * 2;
    Func<int, int, int> add = (a, b) => a + b;
    Console.WriteLine(add(twice(3), 4));`, [
        ['10', true],
        ['14', false],
        ['7', false],
        ['24', false],
      ], 'twice(3) is 6, and add(6, 4) is 10. Delegates are called exactly like methods.'),
      mcq(`What does this print?

    int total = 0;
    Action<int> addTo = n => total += n;
    addTo(5);
    addTo(7);
    Console.WriteLine(total);`, [
        ['12', true],
        ['0', false],
        ['7', false],
        ['5', false],
      ], 'The lambda captures the variable total itself, not a copy of its value, so both calls change the same variable.'),
      mcq(`What does this print?

    var nums = new List<int> { 1, 2, 3 };
    var odd = nums.Where(n => n % 2 == 1);
    nums.Add(5);
    nums.Remove(1);
    Console.WriteLine(string.Join(",", odd));`, [
        ['3,5', true],
        ['1,3', false],
        ['1,3,5', false],
        ['3', false],
      ], 'The Where query is deferred. When string.Join enumerates it, nums is 2, 3, 5, and the odd values are 3 and 5.'),
      mcq(`What does this print?

    var emps = new[] { "Asha:HR", "Ravi:IT", "Meena:HR", "Kiran:Ops" };
    var q = emps.GroupBy(e => e.Split(':')[1])
                .OrderByDescending(g => g.Count())
                .ThenBy(g => g.Key)
                .Select(g => g.Key + g.Count());
    Console.WriteLine(string.Join(" ", q));`, [
        ['HR2 IT1 Ops1', true],
        ['HR2 Ops1 IT1', false],
        ['IT1 HR2 Ops1', false],
        ['HR1 IT1 HR1 Ops1', false],
      ], 'Groups are HR (2), IT (1), Ops (1). Sorting by count descending puts HR first; ThenBy on the key orders the ties IT before Ops.'),
      mcq('Which call throws on an empty List<int>?', [
        ['list.Max()', true],
        ['list.Sum()', false],
        ['list.FirstOrDefault()', false],
        ['list.Any()', false],
      ], 'Max of an empty non-nullable sequence throws InvalidOperationException. Sum returns 0, FirstOrDefault returns 0 and Any returns false.'),
      mcq('`var users = repo.Query().Where(u => u.Active);` is enumerated with foreach and then with Count(). The source is a database. What happens?', [
        ['Two separate database queries run', true],
        ['One query runs; Count() reads the cached rows', false],
        ['Count() throws because the query was already enumerated', false],
        ['No database query runs until ToList() is called', false],
      ], 'A deferred query is re-executed each time it is enumerated. Calling ToList() once and using the list would run one query.'),
      mcq('In a class, `public event EventHandler Saved;` is raised with `Saved(this, EventArgs.Empty);` when nobody has subscribed. What happens?', [
        ['NullReferenceException', true],
        ['Nothing — an event without subscribers is skipped', false],
        ['A compile error: events must be raised with Invoke', false],
        ['InvalidOperationException: the event has no handlers', false],
      ], 'With no subscribers the backing delegate is null, and calling null throws. Saved?.Invoke(this, EventArgs.Empty) raises it only when someone is listening.'),
      mcq(`What does this print?

    var pairs = new[] { "ab", "cd" }.SelectMany(s => s.ToCharArray());
    Console.WriteLine(string.Join("-", pairs) + " " + pairs.Count());`, [
        ['a-b-c-d 4', true],
        ['ab-cd 2', false],
        ['a-b-c-d 2', false],
        ['ab-cd 4', false],
      ], 'SelectMany flattens each string\'s characters into one sequence of four chars. Select would give two arrays instead.'),
      mcq('Given `record Order(int Id, decimal Total);`, what does `var b = a with { Total = 0m };` leave in a?', [
        ['The original Total; a is unchanged and b is a new record', true],
        ['Total of 0, because with changes the record in place', false],
        ['Nothing — a is set to null once it has been copied', false],
        ['A Total of 0 and a new Id generated for the copy', false],
      ], 'with creates a new record copying every property and replacing those listed. Records\' positional properties are init-only, so a cannot be changed.'),
      mcq(`Which arm does \`Classify(0)\` hit?

    static string Classify(int n) => n switch
    {
        < 0 => "negative",
        0 => "zero",
        > 100 => "large",
        _ => "positive"
    };`, [
        ['"zero"', true],
        ['"positive"', false],
        ['"negative"', false],
        ['None — a SwitchExpressionException is thrown', false],
      ], 'Arms are tested in order. 0 fails < 0 and matches the constant pattern 0. The discard arm would match too, but it comes last.'),
    ],
  },
];
