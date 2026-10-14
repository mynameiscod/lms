/**
 * Career-track content: the Java Collections Framework (JT_JAVA_COLLECTIONS) and modern Java —
 * lambdas, streams, Optional and Java 17 syntax (JT_JAVA_MODERN).
 *
 * Collections are where a Java interview spends most of its time, because the questions have exact
 * answers: what a HashMap does with a key, what ArrayList costs to grow, why a for-each loop throws
 * when you remove from it. Every question here is about specific code and what it does when run.
 *
 * Attribution: both topics are single-skill (JAVA_COLLECTIONS, JAVA_STREAMS), so no question names
 * a skill. The two practice exercises compile and pass on Java 15 — the runner's version — so they
 * use no records and no Stream.toList(), even where the notes teach Java 17.
 */
import { PilotBundle, PilotMcq } from './pilotUnitContent';

const mcq = (question: string, options: [string, boolean][], explanation: string): PilotMcq =>
  ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TRACK_JAVA_COLLECTIONS_BUNDLES: PilotBundle[] = [
  /* ══ JT_JAVA_COLLECTIONS — The Collections Framework ═════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_COLLECTIONS_FRAMEWORK',
    notes: `An array has a fixed length and no behaviour. The **Collections Framework** (\`java.util\`) gives
you resizable, searchable containers behind a small set of interfaces.

## The interfaces

    Iterable
      └─ Collection
           ├─ List    ordered, indexed, duplicates allowed   → ArrayList, LinkedList
           ├─ Set     no duplicates                          → HashSet, LinkedHashSet, TreeSet
           └─ Queue   ordered for processing                 → ArrayDeque, PriorityQueue, LinkedList
    Map  (key → value; NOT a Collection)                     → HashMap, LinkedHashMap, TreeMap

\`Map\` sits outside \`Collection\` because it stores pairs, not single elements. You reach its
contents through three views: \`keySet()\`, \`values()\` and \`entrySet()\`.

## Program to the interface

    List<String> names = new ArrayList<>();     // good
    ArrayList<String> names2 = new ArrayList<>(); // works, but ties every caller to ArrayList

Declaring by interface means you can swap \`ArrayList\` for \`LinkedList\` (or a \`TreeSet\` for a
\`HashSet\`) by changing one line. Method parameters and return types should be interfaces too.

## Collections hold objects, not primitives

    List<Integer> marks = new ArrayList<>();
    marks.add(90);                 // autoboxed to Integer.valueOf(90)
    int first = marks.get(0);      // unboxed

Boxing costs memory (an \`Integer\` is an object of ~16 bytes against 4 for an \`int\`) and unboxing a
\`null\` throws \`NullPointerException\`.

## Immutable and fixed-size lists

    List<String> a = List.of("x", "y");        // immutable: add, set, remove all throw
    List<String> b = Arrays.asList("x", "y");  // fixed-size view of an array: set works, add throws
    List<String> c = new ArrayList<>(a);       // a real, modifiable copy

Both throw \`UnsupportedOperationException\`, not a compile error — the interface has the method, the
implementation refuses it. \`List.of\` also rejects \`null\` elements.

## The Collections utility class

\`Collections.sort\`, \`Collections.reverse\`, \`Collections.max\`, \`Collections.unmodifiableList\`
and \`Collections.emptyList\` are static helpers. Note the **s**: \`Collection\` is the interface,
\`Collections\` is the helper class — a favourite one-line interview question.

## Common mistakes

- Returning \`ArrayList\` from a public method instead of \`List\`.
- Calling \`add\` on the result of \`Arrays.asList\` or \`List.of\`.
- Using raw types (\`List list = new ArrayList();\`) — the compiler stops checking element types.`,
    workedExample: `**Goal: choose the interface for each requirement.**

- "Keep the order students joined, allow the same name twice" → \`List\` (\`ArrayList\`).
- "Remember which roll numbers have submitted" → \`Set\` (\`HashSet\`): only membership matters.
- "Look up a student's marks by roll number" → \`Map<Integer, Integer>\` (\`HashMap\`).
- "Serve support tickets in arrival order" → \`Queue\` (\`ArrayDeque\`).

Then declare each by its interface: \`Map<Integer, Integer> marks = new HashMap<>();\`. If you later
need the roll numbers sorted, you change only the right-hand side to \`new TreeMap<>()\`.`,
    mcqs: [
      mcq('List<String> tags = List.of("a", "b"); tags.add("c"); — what happens?',
        [['UnsupportedOperationException at run time', true], ['A compile error on the add line', false], ['The list becomes [a, b, c]', false], ['The add returns false and nothing changes', false]],
        'List.of returns an immutable list. The List interface still declares add, so it compiles, but the implementation throws UnsupportedOperationException when called.'),
      mcq('Which of these types does NOT extend the Collection interface?',
        [['Map', true], ['Queue', false], ['Set', false], ['List', false]],
        'Map stores key-value pairs rather than single elements, so it is a separate hierarchy. You view its contents through keySet, values and entrySet.'),
      mcq('Why is "List<String> names = new ArrayList<>();" preferred over declaring the variable as ArrayList?',
        [['Callers depend only on List, so the class can change', true], ['It makes every get call run faster', false], ['ArrayList cannot be used as the declared type of a local variable', false], ['It stops null elements being added', false]],
        'Declaring by the interface keeps the rest of the code ignorant of the implementation. Switching to LinkedList is then a one-line change.'),
    ],
    checkpoint: [
      mcq('List<String> fixed = Arrays.asList("p", "q"); fixed.set(0, "z"); fixed.add("r"); — which line fails?',
        [['The add: Arrays.asList is fixed-size but settable', true], ['The set: the list is fully immutable', false], ['Neither; both lines succeed', false], ['Both, with a compile error each', false]],
        'Arrays.asList returns a fixed-size view backed by the array. Replacing an element with set is allowed; changing the size with add throws UnsupportedOperationException.'),
      mcq('List<Integer> xs = new ArrayList<>(); xs.add(null); int v = xs.get(0); — what happens on the last line?',
        [['NullPointerException while unboxing', true], ['v is set to 0', false], ['A compile error: int cannot hold null', false], ['ClassCastException', false]],
        'Collections store Integer objects. Assigning to an int unboxes with intValue(), and calling that on null throws NullPointerException.'),
      mcq('A colleague asks for "the class with static sort, reverse and unmodifiableList helpers". Which do you name?',
        [['java.util.Collections', true], ['java.util.Collection', false], ['java.util.Arrays', false], ['java.util.List', false]],
        'Collections (plural) is the utility class of static helpers. Collection (singular) is the root interface; Arrays has helpers for arrays, not lists.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_LISTS',
    notes: `Both \`ArrayList\` and \`LinkedList\` implement \`List\`, but they are built completely
differently, and the cost of each operation follows from the structure.

## ArrayList: a resizable array

Internally it holds an \`Object[] elementData\` and a \`size\`. \`new ArrayList<>()\` starts with an
empty array; the first \`add\` allocates capacity **10**. When the array is full, it grows to
**old + old/2** (1.5×) and copies everything across with \`Arrays.copyOf\`.

    List<Integer> xs = new ArrayList<>();
    for (int i = 0; i < 11; i++) xs.add(i);   // capacity 10 → 15 on the 11th add

Growth is O(n) when it happens but rare, so \`add\` at the end is **amortised O(1)**. If you know the
size, \`new ArrayList<>(10_000)\` skips the copies.

| Operation | ArrayList | LinkedList |
|---|---|---|
| get(i) | O(1) | O(n) — walks from the nearer end |
| add at end | amortised O(1) | O(1) |
| add/remove at index 0 | O(n) — shifts every element | O(1) |
| add/remove in the middle | O(n) shift | O(n) to find + O(1) to unlink |
| memory per element | one reference | node with item, next, prev |

## LinkedList: a doubly linked list

Each element lives in a \`Node\` with \`prev\` and \`next\` pointers. Inserting at either end is cheap,
but \`get(i)\` must walk node by node, and every node is a separate object scattered in memory, which
is unfriendly to the CPU cache. In practice **ArrayList wins almost every benchmark**, even for many
middle inserts. Use \`ArrayDeque\` when you need a fast queue; \`LinkedList\` is rarely the right answer.

## The remove trap

    List<Integer> ids = new ArrayList<>(List.of(10, 20, 30));
    ids.remove(1);                        // removes INDEX 1 → [10, 30]
    ids.remove(Integer.valueOf(10));      // removes the VALUE 10 → [30]
    System.out.println(ids);              // [30]

\`remove(int)\` and \`remove(Object)\` are overloads; an \`int\` literal picks the index version.

## Looping with get(i) on a LinkedList

    for (int i = 0; i < linked.size(); i++) linked.get(i);   // O(n²) overall!

Use for-each (an iterator) instead — it is O(n) on both.

## Common mistakes

- Choosing LinkedList "because inserts are O(1)" without counting the O(n) search to reach the spot.
- \`list.remove(5)\` on a \`List<Integer>\` meaning the value 5.
- \`contains\` on a large list inside a loop — O(n) each time; use a \`HashSet\`.`,
    mcqs: [
      mcq('An ArrayList created with new ArrayList<>() has had 10 elements added. What is its capacity after the 11th add?',
        [['15', true], ['20', false], ['11', false], ['16', false]],
        'ArrayList grows to old + old >> 1, i.e. one and a half times. 10 + 5 = 15, and the existing elements are copied into the new array.'),
      mcq('List<Integer> v = new ArrayList<>(List.of(5, 6, 7)); v.remove(1); System.out.println(v); — what prints?',
        [['[5, 7]', true], ['[6, 7]', false], ['[5, 6, 7]', false], ['[5, 6]', false]],
        'The int literal 1 selects remove(int index), so the element at index 1 (the value 6) is removed. To remove the value use remove(Integer.valueOf(1)).'),
      mcq('Which access pattern is O(n squared) in total on a LinkedList of n elements?',
        [['A for loop calling list.get(i) for every i', true], ['A for-each loop over every element', false], ['Calling addFirst n times', false], ['Calling removeLast n times', false]],
        'Each get(i) walks from the nearer end, costing O(n), and the loop does it n times. For-each uses an iterator that moves one node per step.'),
    ],
    checkpoint: [
      mcq('A service inserts at index 0 of an ArrayList of 1,000,000 items on every request. What does each insert cost?',
        [['O(n): every element shifts one slot right', true], ['O(1): ArrayList keeps spare room at the front', false], ['O(log n): the array is split in halves', false], ['O(1) amortised, the same as adding at the end', false]],
        'An ArrayList stores elements contiguously from index 0, so inserting at the front moves all n existing elements with System.arraycopy.'),
      mcq('You know a list will hold exactly 50,000 items. What does new ArrayList<>(50_000) save?',
        [['The repeated grow-and-copy steps while filling it', true], ['Nothing; the argument is only a hint that is ignored', false], ['The cost of every later get call', false], ['It makes the list immutable after 50,000 adds', false]],
        'The constructor argument sets the initial capacity, so the backing array is allocated once and never needs to grow while 50,000 items are added.'),
      mcq('Why does an ArrayList usually beat a LinkedList even for workloads with some middle inserts?',
        [['Contiguous memory is cache-friendly; nodes are scattered', true], ['LinkedList inserts are O(n) at both ends', false], ['ArrayList inserts in the middle are O(1)', false], ['LinkedList cannot hold more than 2^16 nodes in a single list instance', false]],
        'Finding the insert point in a LinkedList is an O(n) walk over scattered nodes, while ArrayList shifts a contiguous block that the CPU copies very quickly.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_SETS',
    notes: `A \`Set\` stores each element at most once. The three implementations differ in **order** and
in **what they ask of your elements**.

| Set | Order of iteration | Lookup | Needs |
|---|---|---|---|
| HashSet | unspecified | O(1) average | equals + hashCode |
| LinkedHashSet | insertion order | O(1) average | equals + hashCode |
| TreeSet | sorted | O(log n) | compareTo or a Comparator |

    Set<String> seen = new HashSet<>();
    System.out.println(seen.add("java"));   // true  — added
    System.out.println(seen.add("java"));   // false — already there
    Set<Integer> sorted = new TreeSet<>(List.of(5, 1, 3));
    System.out.println(sorted);             // [1, 3, 5]

## How HashSet decides "already there"

A \`HashSet\` is a \`HashMap\` underneath: your element is the key and a dummy object is the value.
To find an element it computes \`hashCode()\` to pick a bucket, then calls \`equals()\` on the entries
in that bucket. So **both methods must agree**: equal objects must have equal hash codes.

    class Point {
        int x, y;
        Point(int x, int y) { this.x = x; this.y = y; }
        @Override public boolean equals(Object o) {
            return o instanceof Point && ((Point) o).x == x && ((Point) o).y == y;
        }
        // no hashCode override!
    }
    Set<Point> ps = new HashSet<>();
    ps.add(new Point(1, 2));
    System.out.println(ps.contains(new Point(1, 2)));   // false (almost always)

Without \`hashCode\`, the two points get identity hash codes, land in different buckets, and
\`equals\` is never even called. Fix: \`@Override public int hashCode() { return Objects.hash(x, y); }\`.

## TreeSet uses compareTo, not equals

A \`TreeSet\` treats two elements as duplicates when \`compareTo\` returns 0 — even if \`equals\` says
they differ. A TreeSet of employees ordered only by salary keeps **one employee per salary**.

    Set<String> ci = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
    ci.add("Java"); ci.add("JAVA");
    System.out.println(ci);   // [Java]

\`TreeSet\` also offers \`first()\`, \`last()\`, \`floor(x)\`, \`ceiling(x)\` and \`headSet/tailSet\`.

## Common mistakes

- Overriding \`equals\` without \`hashCode\` (or the reverse).
- Changing a field used by \`hashCode\` after the object is in the set — it becomes unfindable.
- Expecting \`HashSet\` to print in insertion order; use \`LinkedHashSet\`.
- Adding \`null\` to a \`TreeSet\` with natural ordering — \`NullPointerException\`.`,
    mcqs: [
      mcq('Set<String> s = new HashSet<>(); s.add("x"); System.out.println(s.add("x")); — what prints?',
        [['false', true], ['true', false], ['x', false], ['An IllegalStateException', false]],
        'Set.add returns true only when the set changed. The second "x" is equal to the existing one, so nothing is added and add returns false.'),
      mcq('You need unique visitor IDs printed in the order the visitors first arrived. Which set fits?',
        [['LinkedHashSet', true], ['HashSet', false], ['TreeSet', false], ['EnumSet', false]],
        'LinkedHashSet keeps a linked list through its entries in insertion order while still giving O(1) add and contains.'),
      mcq('A TreeSet<Employee> uses a Comparator on salary alone. Two different employees both earn 50,000. How many does the set keep?',
        [['One; compare returning 0 means duplicate', true], ['Two, because equals says they differ', false], ['Two, stored in the same tree node', false], ['None; it throws on the second add', false]],
        'TreeSet decides duplicates with its comparator. A result of 0 means "same element", so the second add is rejected. Add a tie-breaker such as id.'),
    ],
    checkpoint: [
      mcq('A Point class overrides equals but not hashCode. set.add(new Point(1, 2)); set.contains(new Point(1, 2)) on a HashSet usually returns what?',
        [['false, because the hash codes differ', true], ['true, because equals is overridden', false], ['true, but only for small coordinates', false], ['It throws ClassCastException', false]],
        'HashSet picks a bucket by hashCode first. The default identity hash codes differ, so the lookup searches the wrong bucket and equals never runs.'),
      mcq('new TreeSet<>(List.of(42, 7, 19)) is printed. What appears?',
        [['[7, 19, 42]', true], ['[42, 7, 19]', false], ['[42, 19, 7]', false], ['The order is unspecified', false]],
        'TreeSet is a red-black tree that iterates in ascending natural order, so the integers print sorted regardless of insertion order.'),
      mcq('A HashSet holds an object; then a field used in its hashCode is changed. What is the likely effect?',
        [['contains and remove can no longer find it', true], ['The set rehashes the object automatically', false], ['The object is silently dropped from the set', false], ['The next add throws ConcurrentModificationException', false]],
        'The object stays in the bucket chosen by its old hash. Lookups now compute a new hash and look elsewhere, so the element is effectively lost.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_MAPS',
    notes: `A \`Map<K, V>\` stores one value per key. It is the most used structure in backend code:
counting, grouping, caching and indexing by id.

    Map<String, Integer> stock = new HashMap<>();
    stock.put("pen", 10);
    stock.put("pen", 12);                         // replaces; put returns the old value 10
    System.out.println(stock.get("pen"));         // 12
    System.out.println(stock.get("ink"));         // null — absent
    System.out.println(stock.getOrDefault("ink", 0)); // 0
    stock.merge("pen", 1, Integer::sum);          // 13 — the counting idiom
    stock.computeIfAbsent("box", k -> 0);         // inserts box=0

## How HashMap finds a key

1. **Hash.** It calls \`key.hashCode()\` and spreads it: \`h ^ (h >>> 16)\`, so high bits affect the
   low bits used for indexing.
2. **Index.** The table length \`n\` is always a power of two; the bucket is \`(n - 1) & hash\`.
3. **Search the bucket.** Entries in one bucket form a linked list. For each node it checks the
   stored hash, then \`==\` or \`equals\` on the key.
4. **Treeify.** When one bucket reaches **8** entries and the table has at least **64** buckets, that
   bucket becomes a red-black tree, so a pile of collisions costs O(log n) instead of O(n). (Below
   64 buckets it resizes instead; a tree shrinks back to a list at 6.)

## Capacity and load factor

The default table has **16** buckets and load factor **0.75**, so it resizes when size exceeds
16 × 0.75 = **12**. Resizing doubles the table and redistributes entries — O(n), but rare.
Average \`get\`/\`put\` is O(1); a terrible \`hashCode\` (say, \`return 1;\`) makes every key collide.

## Rules for keys

- Keys must have consistent \`equals\` and \`hashCode\`, and must **not change** while in the map.
  Strings and boxed numbers are immutable, which is why they make good keys.
- \`HashMap\` allows one \`null\` key and \`null\` values; \`Hashtable\` and \`ConcurrentHashMap\` allow neither.

## TreeMap and LinkedHashMap

\`TreeMap\` keeps keys sorted (O(log n) operations) and adds \`firstKey\`, \`floorKey\`, \`headMap\`.
\`LinkedHashMap\` keeps insertion order — and, with access order, is the classic LRU cache base.

## Iterating

    for (Map.Entry<String, Integer> e : stock.entrySet())
        System.out.println(e.getKey() + "=" + e.getValue());

Use \`entrySet\`, not \`keySet\` + \`get\`, which looks every key up a second time.

## Interview traps

- \`get\` returning \`null\` does not prove the key is absent — the value may be \`null\`. Use
  \`containsKey\`.
- HashMap is not thread-safe; concurrent writes can lose entries. Use \`ConcurrentHashMap\`.`,
    workedExample: `**Goal: count words, then print them alphabetically.**

    String text = "to be or not to be";
    Map<String, Integer> counts = new TreeMap<>();
    for (String w : text.split(" ")) counts.merge(w, 1, Integer::sum);
    System.out.println(counts);   // {be=2, not=1, or=1, to=2}

\`merge(w, 1, Integer::sum)\` says: if \`w\` is absent, store 1; otherwise store old + 1. Choosing a
\`TreeMap\` instead of a \`HashMap\` is the only change needed to make the output sorted by key.`,
    mcqs: [
      mcq('With default settings, after how many entries does a new HashMap first resize its table?',
        [['When the 13th entry is added', true], ['When the 17th entry is added', false], ['When the 9th entry is added', false], ['It never resizes; buckets just grow', false]],
        'The default capacity is 16 and the load factor 0.75, giving a threshold of 12. Adding the 13th entry exceeds it and the table doubles to 32.'),
      mcq('Map<String,Integer> m = new HashMap<>(); m.put("a", 1); System.out.println(m.put("a", 5)); — what prints?',
        [['1', true], ['5', false], ['null', false], ['true', false]],
        'put returns the value previously associated with the key, or null if there was none. The old value for "a" was 1.'),
      mcq('When does a HashMap bucket turn from a linked list into a red-black tree?',
        [['At 8 entries, if the table has 64+ buckets', true], ['At 8 entries in one bucket, whatever the table size is', false], ['When the load factor passes 0.75', false], ['At 16 entries in any single bucket', false]],
        'TREEIFY_THRESHOLD is 8 and MIN_TREEIFY_CAPACITY is 64. With a smaller table HashMap resizes instead, since spreading entries is cheaper than building a tree.'),
    ],
    checkpoint: [
      mcq('map.get("k") returns null. What can you conclude?',
        [['Either k is absent or it maps to null', true], ['k is definitely not in the map', false], ['The map must be a TreeMap', false], ['k is present but was garbage collected', false]],
        'HashMap allows null values, so null from get is ambiguous. containsKey("k") is the call that answers whether the key is present.'),
      mcq('A class used as a HashMap key returns 1 from hashCode for every instance. What happens to lookups as the map grows?',
        [['All keys share a bucket, so lookups degrade', true], ['Lookups stay O(1) because equals sorts out the collisions', false], ['put throws once two keys share a hash', false], ['The map silently keeps only one entry', false]],
        'Every key lands in the same bucket, so a lookup scans a list (or, once treeified, a tree) instead of jumping straight to one entry. The map stays correct but slow.'),
      mcq('You need prices keyed by product code, printed in ascending code order. Which map do you choose?',
        [['TreeMap', true], ['HashMap', false], ['LinkedHashMap', false], ['Hashtable', false]],
        'TreeMap keeps its keys sorted by natural order or a comparator. LinkedHashMap keeps insertion order, and HashMap guarantees no order at all.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_QUEUES',
    notes: `A \`Queue\` hands elements out in a defined order; a \`Deque\` ("deck") allows both ends.

## The two method families

| | throws on failure | returns special value |
|---|---|---|
| insert | add(e) | offer(e) → false |
| remove head | remove() | poll() → null |
| look at head | element() | peek() → null |

Prefer \`offer/poll/peek\` when "empty" is a normal case you will check for.

## ArrayDeque: the stack and the queue

\`ArrayDeque\` is a circular array — O(1) at both ends, no node objects. It replaces both \`Stack\`
(legacy, synchronized, extends Vector) and \`LinkedList\` as a queue.

    Deque<Integer> stack = new ArrayDeque<>();
    stack.push(1); stack.push(2); stack.push(3);
    System.out.println(stack.pop());    // 3 — LIFO

    Queue<String> q = new ArrayDeque<>();
    q.offer("a"); q.offer("b");
    System.out.println(q.poll());       // a — FIFO

\`push\` and \`pop\` work at the **head**; \`offer\` adds at the **tail**. \`ArrayDeque\` rejects \`null\`
(\`NullPointerException\`), because \`null\` is what \`poll\` returns to mean "empty".

## PriorityQueue: a binary heap

\`PriorityQueue\` always gives you the **smallest** element by natural order (a min-heap), or by the
\`Comparator\` you pass.

    PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(5, 1, 4));
    pq.offer(2);
    System.out.println(pq.peek());   // 1
    System.out.println(pq);          // [1, 2, 4, 5] or similar — NOT guaranteed sorted
    while (!pq.isEmpty()) System.out.print(pq.poll() + " ");   // 1 2 4 5

    PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());

Costs: \`offer\` and \`poll\` O(log n), \`peek\` O(1), \`contains\` and \`remove(Object)\` O(n). The heap
is stored in an array where the children of index i are 2i+1 and 2i+2; only the head is in its final
position, which is why **printing or iterating a PriorityQueue does not show sorted order**. Only
repeated \`poll\` does.

## Where these appear in interviews

- Balanced brackets → stack (\`ArrayDeque\`).
- BFS on a graph or grid → queue.
- "Top k largest" → a min-heap of size k: offer each item, poll when size exceeds k. O(n log k).
- Merge k sorted lists, Dijkstra → priority queue.

## Common mistakes

- Using \`Stack\` in new code.
- Expecting \`for (int x : pq)\` to visit in priority order.
- Forgetting that \`PriorityQueue\` is a min-heap by default.`,
    mcqs: [
      mcq('Deque<Integer> d = new ArrayDeque<>(); d.push(1); d.push(2); d.offer(3); System.out.println(d.pop()); — what prints?',
        [['2', true], ['1', false], ['3', false], ['An exception: mixed stack and queue calls', false]],
        'push adds at the head, so after two pushes the head is 2. offer adds 3 at the tail. pop removes from the head, giving 2.'),
      mcq('What does queue.poll() return when an ArrayDeque used as a queue is empty?',
        [['null', true], ['It throws NoSuchElementException', false], ['0', false], ['Optional.empty()', false]],
        'poll is the special-value form and returns null on an empty queue. remove() is the form that throws NoSuchElementException.'),
      mcq('To keep the 3 largest numbers from a stream of a million, which structure is the standard choice?',
        [['A min-heap capped at size 3', true], ['A max-heap holding every number', false], ['An ArrayList sorted after each add', false], ['A LinkedList kept in sorted order', false]],
        'A min-heap of size k keeps the k largest seen so far; its head is the smallest of them and is evicted when a larger number arrives. That costs O(n log k).'),
    ],
    checkpoint: [
      mcq('A PriorityQueue<Integer> holds 9, 3, 7 and 1. Which statement about printing it with System.out.println is accurate?',
        [['Only the head is guaranteed; the rest is heap order', true], ['toString is always fully sorted ascending', false], ['toString always shows insertion order', false], ['toString is always sorted in descending order', false]],
        'A PriorityQueue is a binary heap in an array. Only index 0 is guaranteed to be the minimum; to get sorted order you must poll repeatedly.'),
      mcq('PriorityQueue<String> pq = new PriorityQueue<>(Comparator.reverseOrder()); pq.addAll(List.of("kiwi", "apple", "mango")); What does pq.poll() return?',
        [['mango', true], ['apple', false], ['kiwi', false], ['null', false]],
        'With reverseOrder the queue becomes a max-heap of strings, so the head is the alphabetically last word, "mango".'),
      mcq('Why is new ArrayDeque<>() recommended over java.util.Stack for a stack?',
        [['Stack is synchronized legacy code built on Vector', true], ['Stack cannot push more than 10 elements', false], ['ArrayDeque allows null elements, while Stack does not', false], ['Stack has no pop method, only remove', false]],
        'Stack extends Vector, so every call pays for synchronization, and it exposes index-based methods a stack should not have. ArrayDeque is the documented replacement.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_ITERATION_SORTING',
    notes: `## Fail-fast iterators

Every \`ArrayList\` and \`HashMap\` keeps a \`modCount\` that increases on each structural change. An
iterator remembers it when created and checks it on every \`next()\`; if it changed behind the
iterator's back, it throws \`ConcurrentModificationException\` (CME). A for-each loop **is** an
iterator, so this fails:

    List<String> names = new ArrayList<>(List.of("ana", "bo", "cy", "di"));
    for (String n : names)
        if (n.startsWith("b")) names.remove(n);   // CME on the next iteration

Three correct ways:

    Iterator<String> it = names.iterator();
    while (it.hasNext()) if (it.next().startsWith("b")) it.remove();   // 1. the iterator's own remove

    names.removeIf(n -> n.startsWith("b"));                            // 2. simplest (Java 8+)

    for (int i = names.size() - 1; i >= 0; i--)                         // 3. index loop, backwards
        if (names.get(i).startsWith("b")) names.remove(i);

Nothing here is about threads: one thread can cause CME. A notorious quirk — removing the
**second-to-last** element inside for-each throws nothing, because \`hasNext()\` then sees
cursor == size and the loop simply ends (skipping the last element). Fail-fast is "best effort".

## Comparable: the natural order

A class implements \`Comparable<T>\` to define one ordering of its own:

    class Student implements Comparable<Student> {
        String name; int marks;
        public int compareTo(Student o) { return Integer.compare(marks, o.marks); }
    }
    Collections.sort(list);   // uses compareTo

Return negative, zero or positive. **Never** \`return marks - o.marks;\` — subtraction overflows
for values far apart (\`Integer.MIN_VALUE - 1\` is positive) and silently corrupts the sort.

## Comparator: any order, from outside

    list.sort(Comparator.comparing((Student s) -> s.name));
    list.sort(Comparator.comparingInt((Student s) -> s.marks).reversed()
                        .thenComparing(s -> s.name));

\`Comparator\` lets you sort a class you cannot edit, or sort the same class several ways. Since
Java 8, \`comparing\`, \`thenComparing\`, \`reversed\`, \`nullsFirst\` build comparators from parts.

\`List.sort\` and \`Collections.sort\` are **stable** (TimSort, O(n log n)): equal elements keep their
relative order, which is why sorting by name and then by department gives department-then-name.

## Interview traps

- \`compareTo\` should be consistent with \`equals\`, or TreeSet/TreeMap will behave oddly.
- \`.reversed()\` on a chain reverses the **whole** chain built so far.
- \`Arrays.sort(int[])\` uses dual-pivot quicksort (not stable, but primitives cannot tell).`,
    mcqs: [
      mcq('names is an ArrayList [a, b, c, d]. A for-each loop calls names.remove(x) when x equals "b". What happens?',
        [['ConcurrentModificationException on the next step', true], ['"b" is removed and the loop finishes', false], ['A compile error: a list cannot be modified inside for-each', false], ['The loop skips "b" without removing it', false]],
        'The remove bumps modCount. When the loop calls next() again, the iterator sees the count differs from what it expected and throws.'),
      mcq('Which compareTo body is safe for any two int values?',
        [['return Integer.compare(a, o.a);', true], ['return a - o.a;', false], ['return a > o.a ? 1 : 0;', false], ['return (a - o.a) % 2;', false]],
        'Subtraction overflows when the values are far apart, flipping the sign. The ternary never returns negative, and the modulo is meaningless. Integer.compare has no overflow.'),
      mcq('people.sort(Comparator.comparing(Person::getCity).thenComparing(Person::getName)); — how is the list ordered?',
        [['By city, and by name within each city', true], ['By name, and by city within each name', false], ['By city only; thenComparing is ignored', false], ['By whichever key differs first alphabetically', false]],
        'The first comparator decides the order; thenComparing is consulted only when two people share a city, so names are sorted within each city.'),
    ],
    checkpoint: [
      mcq('List [a, b, c] is looped with for-each, and "b" (the second-to-last element) is removed inside the loop. What happens?',
        [['No exception; the loop ends and "c" is never visited', true], ['ConcurrentModificationException at once', false], ['"b" is removed and "c" is still visited', false], ['An IndexOutOfBoundsException is thrown', false]],
        'After the removal the size is 2 and the cursor is 2, so hasNext() returns false and next() never runs its check. Fail-fast detection is best effort only.'),
      mcq('A compareTo returns this.balance - other.balance for int balances, and the list holds Integer.MIN_VALUE and 5. What goes wrong?',
        [['The subtraction overflows and gives the wrong sign', true], ['Nothing; int subtraction is always exact', false], ['It throws ArithmeticException on overflow', false], ['Collections.sort rejects negative values', false]],
        'Integer.MIN_VALUE - 5 wraps around to a large positive number, so the most negative balance is treated as larger. Java int arithmetic overflows silently.'),
      mcq('You sort a list of orders by date with a stable sort, then sort it again by customer. What order results?',
        [['By customer, and by date within each customer', true], ['By date, and by customer within each date', false], ['By customer only; the date order is lost', false], ['Unpredictable, since sorts are not stable', false]],
        'List.sort is stable: orders with the same customer keep the relative order the first sort gave them, which was by date.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_GENERICS',
    notes: `Generics let a class or method work with a type chosen by the caller, checked at **compile
time**.

    List raw = new ArrayList();          // raw type: anything goes in
    raw.add("x"); raw.add(42);
    String s = (String) raw.get(1);      // ClassCastException at run time

    List<String> safe = new ArrayList<>();
    safe.add(42);                        // compile error — caught early

## A generic class and method

    class Box<T> {
        private T value;
        Box(T value) { this.value = value; }
        T get() { return value; }
    }
    static <T> T firstOrDefault(List<T> xs, T fallback) {
        return xs.isEmpty() ? fallback : xs.get(0);
    }
    Box<String> b = new Box<>("hi");       // diamond infers String
    System.out.println(firstOrDefault(List.of(), "none"));   // none

The \`<T>\` before the return type declares the method's own type parameter.

## Bounded types

    static <T extends Comparable<T>> T max(List<T> xs) {
        T best = xs.get(0);
        for (T x : xs) if (x.compareTo(best) > 0) best = x;
        return best;
    }

\`extends\` here means "is or is a subtype of" — for classes and interfaces alike.

## Generics are invariant

\`Integer\` is a \`Number\`, but \`List<Integer>\` is **not** a \`List<Number>\`. If it were, you could
add a \`Double\` to a list of integers through the wider reference. Wildcards relax this safely:

- \`List<? extends Number>\` — a list of *some* subtype of Number. You can **read** Numbers; you cannot
  add (except \`null\`), because the real type is unknown.
- \`List<? super Integer>\` — a list of Integer or a supertype. You can **add** Integers; reads give
  \`Object\`.

The rule is **PECS: Producer Extends, Consumer Super**. \`Collections.copy(List<? super T> dest,
List<? extends T> src)\` is the textbook example.

## Type erasure

Generic types exist only at compile time. The compiler checks them, inserts casts, then erases
\`T\` to \`Object\` (or its bound). Consequences:

- \`new T()\` and \`new T[10]\` do not compile.
- \`List<String>\` and \`List<Integer>\` are the same class at run time:
  \`new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass()\` is \`true\`.
- You cannot overload \`f(List<String>)\` and \`f(List<Integer>)\` — same erasure.
- Primitives are not allowed: \`List<int>\` is an error; use \`List<Integer>\`.

## Common mistakes

- Using raw types to "make the warning go away".
- Expecting \`instanceof List<String>\` to work — it does not compile.`,
    mcqs: [
      mcq('void total(List<Number> xs) is called with a List<Integer>. What happens?',
        [['A compile error: generics are invariant', true], ['It compiles and works, since Integer is a Number', false], ['It compiles but throws ClassCastException', false], ['It compiles with an unchecked warning only', false]],
        'List<Integer> is not a subtype of List<Number>. Declaring the parameter as List<? extends Number> would accept it while still allowing reads.'),
      mcq('With List<? extends Number> nums, which statement compiles?',
        [['Number n = nums.get(0);', true], ['nums.add(5);', false], ['nums.add(5.0);', false], ['Integer i = nums.get(0);', false]],
        'The list holds some unknown subtype of Number, so reading gives a Number. Adding anything but null is refused, since the actual element type might not accept it.'),
      mcq('What does new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass() evaluate to?',
        [['true', true], ['false', false], ['A compile error', false], ['It throws at run time', false]],
        'Type erasure removes the type arguments, so both objects are plain java.util.ArrayList at run time and share one Class object.'),
    ],
    checkpoint: [
      mcq('Inside class Cache<T>, the line T fresh = new T(); is written. Why is it rejected?',
        [['Erasure leaves no type at run time to construct', true], ['T must first be declared as static', false], ['Constructors are not allowed in generic classes', false], ['It compiles but always returns null', false]],
        'After erasure T is just Object (or its bound), so the JVM has no idea which class to instantiate. Pass a Supplier<T> or a Class<T> instead.'),
      mcq('A method must add Integer values into a list the caller provides, which may be a List<Number> or a List<Object>. Which parameter type fits?',
        [['List<? super Integer>', true], ['List<? extends Integer>', false], ['List<Integer>', false], ['List<?>', false]],
        'A consumer of Integers takes ? super Integer (the "consumer super" half of PECS), which accepts List<Integer>, List<Number> and List<Object> and allows adding.'),
      mcq('A legacy method returns a raw List into which someone added an Integer. Code does String s = (String) list.get(0). When does it fail?',
        [['At run time, with ClassCastException', true], ['At compile time, with a type error', false], ['Never; the value is converted to a String', false], ['When the list is first created', false]],
        'Raw types switch off compile-time checking, so the mistake is only found when the cast runs and the element turns out to be an Integer.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_DEBUGGING',
    notes: `Collection bugs rarely crash where the mistake is. Each case below is real code from a
fresher project, the symptom, the diagnosis and the one-line fix.

## Case 1 — removing inside for-each

    for (Order o : orders)
        if (o.isCancelled()) orders.remove(o);

**Symptom:** \`java.util.ConcurrentModificationException at ArrayList$Itr.checkForComodification\`.
**Cause:** the list changed under its own iterator. **Fix:** \`orders.removeIf(Order::isCancelled);\`

## Case 2 — the key that vanished

    Set<Point> visited = new HashSet<>();
    Point p = new Point(0, 0);
    visited.add(p);
    p.x = 5;                                 // mutates a field used in hashCode
    System.out.println(visited.contains(p)); // false
    System.out.println(visited.size());      // 1

**Cause:** the object sits in the bucket for its old hash. **Fix:** make keys immutable (final
fields, or a record), or remove → change → re-add.

## Case 3 — duplicates in a HashSet

    class Email { String addr; /* equals overridden, hashCode NOT */ }
    set.add(new Email("a@x.com")); set.add(new Email("a@x.com"));
    System.out.println(set.size());   // 2

**Cause:** missing \`hashCode\`. **Fix:** override it from the same fields as \`equals\`
(\`Objects.hash(addr)\`). IntelliJ's *Generate → equals() and hashCode()* writes both together.

## Case 4 — a sort that is "mostly right"

    accounts.sort((a, b) -> a.balance - b.balance);   // int balances, some huge negatives

**Cause:** subtraction overflow; TimSort may even throw \`IllegalArgumentException: Comparison method
violates its general contract!\`. **Fix:** \`Comparator.comparingInt(a -> a.balance)\`.

## Case 5 — the raw type that compiled

    List items = new ArrayList();
    items.add("10"); items.add(20);
    int sum = 0;
    for (Object o : items) sum += (Integer) o;   // ClassCastException on "10"

**Cause:** raw type; the compiler only warned. **Fix:** \`List<Integer>\`; the bad add becomes a
compile error.

## Case 6 — the wrong remove

    List<Integer> ids = new ArrayList<>(List.of(3, 8, 1));
    ids.remove(3);   // IndexOutOfBoundsException: Index 3 out of bounds for length 3

**Fix:** \`ids.remove(Integer.valueOf(3));\`

## The method

Read the **exception class and the top frame** first: \`checkForComodification\` means CME; \`HashMap\`
returning \`null\` for a key you added means equals/hashCode or mutation. Then reproduce with the
smallest list that shows it, and change one thing.`,
    mcqs: [
      mcq('A stack trace ends in ArrayList$Itr.checkForComodification. Which code most likely caused it?',
        [['list.remove(x) inside a for-each over list', true], ['list.get(i) with i equal to list.size() in a for loop', false], ['Sorting a list that contains null', false], ['Calling list.add on a List.of result', false]],
        'checkForComodification is the iterator comparing modCount with its expected count. Only a structural change made outside that iterator, during iteration, trips it.'),
      mcq('A HashSet<Email> reports size 2 after adding two Email objects with the same address. equals compares addresses. What is missing?',
        [['A hashCode override using the address', true], ['A compareTo method on Email', false], ['A toString override on Email', false], ['Making the set a LinkedHashSet', false]],
        'Without hashCode the two objects keep different identity hashes and land in different buckets, so equals is never called and both are stored.'),
      mcq('TimSort throws "Comparison method violates its general contract!" on a comparator written as (a, b) -> a.score - b.score. What is the root cause?',
        [['Overflow makes the comparator inconsistent', true], ['TimSort cannot sort objects with int fields', false], ['The list contains duplicate scores', false], ['The lambda must be declared static', false]],
        'With extreme values a.score - b.score can overflow and change sign, so the comparator says a < b and b < a. TimSort detects the contradiction and throws.'),
      mcq('After visited.add(p); p.x = 5; the call visited.contains(p) is false although size() is 1. Which fix is right?',
        [['Make the fields used by hashCode immutable', true], ['Call visited.rehash() after the change', false], ['Switch to a LinkedHashSet', false], ['Override toString on the class', false]],
        'The element was placed by its old hash; changing a hashed field strands it. Immutable keys (final fields or a record) make the bug impossible.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_PRACTICE',
    notes: `Five exercises. Write each one in IntelliJ before checking the hint, and run it on the
inputs given. The graded exercise below this page is a sixth, run automatically.

## 1. First repeated character

Given \`"programming"\`, return the first character that appears twice when reading left to right
(\`r\`). Hint: a \`HashSet<Character>\` of characters seen; the first failed \`add\` is the answer.

## 2. Group anagrams

Given \`["eat", "tea", "tan", "ate", "nat", "bat"]\`, group words that are anagrams.
Hint: the key is the word's sorted letters — \`char[] c = w.toCharArray(); Arrays.sort(c);\` — and
\`map.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(w)\`.

## 3. Balanced brackets

\`"{[()]}"\` → true, \`"([)]"\` → false. Hint: \`Deque<Character>\` as a stack; push openers, and on a
closer check that \`pop()\` matches. Do not forget to check the stack is empty at the end.

## 4. Top k frequent numbers

For \`[1,1,1,2,2,3]\` and k = 2, return \`[1, 2]\`. Hint: count with a map, then a
\`PriorityQueue\` of entries ordered by count, capped at size k.

## 5. Sort students

A list of \`Student(name, marks)\`: sort by marks descending, then name ascending.
Hint: \`Comparator.comparingInt((Student s) -> s.marks).reversed().thenComparing(s -> s.name)\` —
note that \`reversed()\` must come **before** \`thenComparing\`, or the names come out reversed too.

## Check yourself

For each exercise, say the time complexity aloud. Exercise 2 is O(n · k log k) for n words of
length k; exercise 4 is O(n log k). An interviewer will ask.`,
    mcqs: [
      mcq('To find the first repeated character in a string in one pass, which structure do you keep?',
        [['A HashSet of characters already seen', true], ['A TreeSet, so characters stay sorted', false], ['An ArrayList searched with contains', false], ['A PriorityQueue of characters', false]],
        'HashSet.add returns false the moment a character is already present, in O(1). An ArrayList contains is O(n), and sorting loses the left-to-right order.'),
      mcq('For grouping anagrams, what key does each word go under in the Map<String, List<String>>?',
        [['Its letters sorted into a new String', true], ['Its length', false], ['Its hashCode as a String', false], ['Its first and last letter', false]],
        'Anagrams contain the same letters, so sorting them gives an identical string. Length or end letters would merge words that are not anagrams.'),
      mcq('A bracket checker pushes openers and pops on closers. Which input does it get wrong if it skips the final empty-stack check?',
        [['"(()"', true], ['"())"', false], ['"([)]"', false], ['"()"', false]],
        'Every closer in "(()" matches, so the loop finishes without error, but one "(" is left on the stack. Only the final isEmpty() check catches the unclosed bracket.'),
      mcq('Comparator.comparingInt((Student s) -> s.marks).thenComparing(s -> s.name).reversed() — how are two students with equal marks ordered?',
        [['By name, descending', true], ['By name, ascending', false], ['In their original order', false], ['By marks only; names are ignored', false]],
        'reversed() applies to the whole chain built so far, including the name tie-breaker. Call reversed() before thenComparing to reverse marks only.'),
      mcq('Counting n numbers with a HashMap, then keeping the top k in a size-k heap, costs what overall?',
        [['O(n log k)', true], ['O(n^2)', false], ['O(k log n)', false], ['O(n + k)', false]],
        'Counting is O(n). Pushing up to n distinct entries through a heap that never exceeds size k costs O(log k) each, so the total is O(n log k).'),
    ],
    assignment: {
      title: 'Word Frequency Report',
      description: 'Count the words in a block of text with a HashMap and print the most frequent ones, ordered by count and then alphabetically.',
      instructions: `Read standard input. The **first line** is an integer **N**. Every line after it is text.

A **word** is a run of letters a–z, compared case-insensitively: \`The\`, \`the\` and \`THE\` are the
same word, written in lower case. Anything that is not a letter (digits, spaces, punctuation,
apostrophes) separates words, so \`don't\` is the two words \`don\` and \`t\`.

Print the **N** most frequent words, one per line, as \`word count\`. Order them by count, highest
first; words with the same count are ordered alphabetically. If there are fewer than N distinct
words, print them all. If the text has no words at all, print \`no words\`.

Example input:

    3
    the cat and the hat
    The end

Expected output:

    the 3
    and 1
    cat 1

Use a \`HashMap<String, Integer>\` to count (\`merge\` is the one-line idiom) and a \`Comparator\` to
sort the entries. Hint: \`line.toLowerCase().split("[^a-z]+")\` can produce an empty first token —
skip empty strings.`,
      rubric: [
        { criterion: 'Words counted correctly', description: 'Case-insensitive, letters only, empty tokens skipped, across every input line.', maxPoints: 10 },
        { criterion: 'Deterministic ordering', description: 'Count descending, then word ascending, with a Comparator rather than ad-hoc loops.', maxPoints: 10 },
        { criterion: 'Edge cases handled', description: 'Fewer words than N, and text with no words at all, give the stated output.', maxPoints: 5 },
      ],
      totalPoints: 25,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(in.readLine().trim());
        Map<String, Integer> counts = new HashMap<>();
        String line;
        while ((line = in.readLine()) != null) {
            // TODO: split the line into lower-case words and count each one
        }
        // TODO: sort the entries by count (highest first), then by word,
        // and print the first n as "word count" — or "no words" if there are none
    }
}
`,
        tests: [
          { input: '3\nthe cat and the hat\nThe end\n', expectedOutput: 'the 3\nand 1\ncat 1' },
          { input: '2\nHello, hello! World; world... hello?\n', expectedOutput: 'hello 3\nworld 2' },
          { input: '10\nb a c\n', expectedOutput: 'a 1\nb 1\nc 1' },
          { input: '5\n123 456 !!!\n', expectedOutput: 'no words', isHidden: true },
          { input: '4\nto be or not to be\nthat is the question\nTo be, or not to be: that is it.\n', expectedOutput: 'be 4\nto 4\nis 2\nnot 2', isHidden: true },
          { input: "1\ndon't stop\nDON T\n", expectedOutput: 'don 2', isHidden: true },
        ],
        difficulty: 'easy',
        passingPoints: 15,
      },
    },
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_INTERVIEW_QUESTION',
    notes: `Three questions asked in nearly every Java fresher and SDE-1 round. Say the answers aloud;
the interviewer is grading the explanation and the follow-up, not the vocabulary.

## Q1. "How does HashMap work internally?"

**Model answer.** A HashMap is an array of buckets; the default is 16 buckets with load factor
0.75. On \`put(k, v)\` it takes \`k.hashCode()\`, mixes the high bits into the low bits, and uses
\`(n - 1) & hash\` as the bucket index — n is always a power of two. If the bucket is empty the entry
goes in; otherwise it walks the bucket comparing hashes and then \`equals\`, replacing the value on a
match or appending a node. When size passes capacity × load factor (12 by default) the table
doubles and entries are redistributed. Since Java 8, a bucket with 8 or more entries in a table of
at least 64 buckets becomes a red-black tree, so worst-case lookup is O(log n) rather than O(n).
\`get\` follows the same path.

**Follow-up:** "What happens if two keys have the same hashCode?" — They share a bucket; \`equals\`
tells them apart, so both are stored. "And if equals is true but hashCodes differ?" — The contract
is broken and the map may store both or fail to find either. "Why must keys be immutable?" — A
mutated key is stranded in its old bucket.

## Q2. "ArrayList vs LinkedList — which do you use?"

**Model answer.** ArrayList is a resizable array: O(1) random access, amortised O(1) append, O(n)
inserts and removes in the middle because elements shift; it grows by 1.5×. LinkedList is a doubly
linked list: O(1) at the ends, but O(n) to reach an index, plus a node object per element. I use
ArrayList by default — contiguous memory makes it faster in practice even where big-O suggests
otherwise — and ArrayDeque when I need a queue or stack.

**Follow-up:** "When would LinkedList win?" — Removing many elements during one pass with an
\`Iterator\`, where each \`it.remove()\` is O(1). Even then, \`removeIf\` on an ArrayList is O(n) too.

## Q3. "What is a fail-fast iterator? Fail-safe?"

**Model answer.** Fail-fast iterators — ArrayList, HashMap — record the collection's \`modCount\` and
throw \`ConcurrentModificationException\` if it changes during iteration by any means other than the
iterator's own \`remove\`. It is best effort, a bug detector rather than a guarantee. Fail-safe
(more precisely, weakly consistent or snapshot) iterators — \`CopyOnWriteArrayList\`,
\`ConcurrentHashMap\` — never throw; they iterate a snapshot or tolerate concurrent changes, and
may not show the newest updates.

**Follow-up:** "So how do you remove while iterating?" — \`Iterator.remove()\` or
\`removeIf\`. "Is CME only a multithreading problem?" — No; a single thread modifying the list inside
its own for-each loop is the usual cause.

**Also expect:** "Comparable vs Comparator" — Comparable is the class's own single natural order
(\`compareTo\`, in \`java.lang\`); Comparator is an external strategy (\`compare\`, in \`java.util\`),
so you can have many and use them on classes you cannot edit.`,
    mcqs: [
      mcq('In an interview you are asked what HashMap does when two different keys have the same hashCode. What is the correct answer?',
        [['Both go in one bucket; equals tells them apart', true], ['The second put overwrites the first value', false], ['put throws a DuplicateKeyException', false], ['The map resizes until the hashes differ', false]],
        'A hash collision is normal. Both entries live in the same bucket and the map uses equals to find the right one; only equal keys replace each other.'),
      mcq('Which iterator never throws ConcurrentModificationException when the collection changes during iteration?',
        [["CopyOnWriteArrayList's iterator", true], ["ArrayList's iterator", false], ["HashMap's keySet iterator", false], ["LinkedList's listIterator", false]],
        'CopyOnWriteArrayList iterates over a snapshot of its array taken when the iterator was created, so later writes cannot disturb it.'),
      mcq('An interviewer asks where compareTo and compare are declared. Which pairing is right?',
        [['Comparable.compareTo, Comparator.compare', true], ['Comparator.compareTo, Comparable.compare', false], ['Both are declared on Object', false], ['Both are declared on Collections', false]],
        'Comparable (java.lang) declares compareTo(T) for an object to compare itself; Comparator (java.util) declares compare(T, T) for an external ordering.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_COLLECTIONS_CHECKPOINT',
    notes: `Ten questions across the whole topic: the framework, lists, sets, maps, queues, iteration
and sorting, and generics. Each is a short piece of Java or a design decision; trace the code by
hand before you choose. Where a question asks what prints, assume Java 17.`,
    checkpoint: [
      mcq('Map<Character, Integer> m = new TreeMap<>(); for (char c : "banana".toCharArray()) m.merge(c, 1, Integer::sum); System.out.println(m); — what prints?',
        [['{a=3, b=1, n=2}', true], ['{b=1, a=3, n=2}', false], ['{a=1, b=1, n=1}', false], ['{n=2, b=1, a=3}', false]],
        'merge stores 1 for a new key and adds 1 for an existing one. TreeMap orders the character keys ascending, so a, b, n.'),
      mcq('Set<String> s = new TreeSet<>(String.CASE_INSENSITIVE_ORDER); s.add("Java"); s.add("JAVA"); s.add("java"); System.out.println(s.size()); — what prints?',
        [['1', true], ['3', false], ['2', false], ['0', false]],
        'The comparator treats the three strings as equal (compare returns 0), and TreeSet uses the comparator to detect duplicates, so only "Java" is kept.'),
      mcq('A rate limiter must look up a user by id and also iterate users from least to most recently used. Which class is the natural base?',
        [['LinkedHashMap with access order', true], ['TreeMap keyed by user id', false], ['HashMap plus a separate ArrayList', false], ['PriorityQueue of user ids', false]],
        'new LinkedHashMap<>(16, 0.75f, true) moves an entry to the end on each access, giving O(1) lookups and least-recently-used iteration order.'),
      mcq('List<Integer> a = new ArrayList<>(List.of(1, 2, 3)); List<Integer> b = a; b.add(4); System.out.println(a.size()); — what prints?',
        [['4', true], ['3', false], ['1', false], ['It throws UnsupportedOperationException', false]],
        'b = a copies the reference, not the list, so both names point at the same ArrayList. new ArrayList<>(a) would make an independent copy.'),
      mcq('Deque<String> d = new ArrayDeque<>(); d.offer("x"); d.offer(null); — what happens on the second call?',
        [['NullPointerException', true], ['null is stored at the tail', false], ['offer returns false', false], ['IllegalStateException', false]],
        'ArrayDeque forbids null elements because poll and peek return null to signal an empty deque; inserting null throws NullPointerException.'),
      mcq('Iterator<Integer> it = list.iterator(); while (it.hasNext()) if (it.next() % 2 == 0) it.remove(); — what does this do to [1, 2, 3, 4]?',
        [['Leaves [1, 3] with no exception', true], ['Throws ConcurrentModificationException', false], ['Leaves [2, 4]', false], ['Throws IllegalStateException', false]],
        'Iterator.remove deletes the element last returned by next and updates the iterator\'s expected count, so it is the safe way to remove during iteration.'),
      mcq('static <T extends Comparable<T>> T maxOf(List<T> xs) is called with a List<Object>. What happens?',
        [['Compile error: Object is not Comparable', true], ['It returns the largest object by hash', false], ['It throws ClassCastException at run time', false], ['It compiles with an unchecked warning', false]],
        'The bound requires T to implement Comparable<T>. Object does not, so the call fails type checking before anything runs.'),
      mcq('A HashMap<String, Integer> is written to by eight threads at once with no locking. What is the risk?',
        [['Lost updates and corrupted internal state', true], ['Nothing; HashMap synchronizes put', false], ['A compile-time warning only', false], ['Only slower lookups, never wrong data', false]],
        'HashMap is not thread-safe: concurrent puts and resizes can drop entries or leave buckets inconsistent. Use ConcurrentHashMap for shared maps.'),
      mcq('PriorityQueue<int[]> pq = new PriorityQueue<>((p, q) -> Integer.compare(p[1], q[1])); pq.add(new int[]{1, 9}); pq.add(new int[]{2, 4}); pq.add(new int[]{3, 6}); What is pq.poll()[0]?',
        [['2', true], ['1', false], ['3', false], ['9', false]],
        'The comparator orders arrays by their second element, so the head is {2, 4}, the smallest second value. poll returns it and [0] is 2.'),
      mcq('List<Integer> nums = new ArrayList<>(List.of(4, 5, 6)); nums.remove(Integer.valueOf(5)); nums.remove(0); System.out.println(nums); — what prints?',
        [['[6]', true], ['[4]', false], ['[5, 6]', false], ['[4, 6]', false]],
        'The first call removes the value 5, leaving [4, 6]; the second uses an int, so it removes index 0 (the value 4), leaving [6].'),
    ],
  },

  /* ══ JT_JAVA_MODERN — Modern Java ══════════════════════════════════════════════════════ */
  {
    unitCode: 'JT_JAVA_MODERN_LAMBDAS',
    notes: `A **lambda** is a block of behaviour you can store in a variable and pass to a method.
Java 8 added them so that "sort by this", "keep only these" and "do this to each" can be said in
one line instead of an anonymous class.

    // before Java 8
    Collections.sort(names, new Comparator<String>() {
        public int compare(String a, String b) { return a.length() - b.length(); }
    });
    // with a lambda
    names.sort((a, b) -> Integer.compare(a.length(), b.length()));

## Functional interfaces

A lambda has no type of its own; it becomes an instance of a **functional interface** — an
interface with exactly **one abstract method** (default and static methods do not count).
\`@FunctionalInterface\` makes the compiler enforce that. The ones in \`java.util.function\`:

| Interface | Method | Shape | Example |
|---|---|---|---|
| Function<T, R> | apply | T → R | s -> s.length() |
| Predicate<T> | test | T → boolean | n -> n > 0 |
| Consumer<T> | accept | T → void | s -> System.out.println(s) |
| Supplier<T> | get | () → T | () -> new ArrayList<>() |
| BiFunction<T, U, R> | apply | (T, U) → R | (a, b) -> a + b |
| UnaryOperator<T> / BinaryOperator<T> | apply | T → T / (T, T) → T | x -> x * 2 |

Primitive versions (\`IntPredicate\`, \`ToIntFunction\`, \`IntBinaryOperator\`) avoid boxing.

## Composing

    Function<Integer, Integer> twice = x -> x * 2;
    Function<Integer, Integer> plus3 = x -> x + 3;
    System.out.println(twice.andThen(plus3).apply(5));   // 13  — twice first, then plus3
    System.out.println(twice.compose(plus3).apply(5));   // 16  — plus3 first, then twice

    Predicate<String> blank = String::isBlank;
    Predicate<String> hasText = blank.negate();
    System.out.println(hasText.and(s -> s.length() < 5).test("java"));   // true

## Capturing variables

A lambda can read local variables from the enclosing method only if they are **effectively final**
— never reassigned after initialisation:

    int count = 0;
    list.forEach(x -> count++);   // compile error: must be final or effectively final

The lambda may run later or on another thread, so Java captures the *value*; allowing reassignment
would make that copy lie. (Fields are not restricted, and an \`AtomicInteger\` or array element can be
changed — but if you need that, a stream \`count()\` or a loop is usually the honest answer.)

Inside a lambda, \`this\` is the enclosing object — unlike an anonymous class, which has its own.

## Common mistakes

- Thinking a lambda is an object of a new class each call; non-capturing lambdas are usually a single
  reused instance.
- Throwing a checked exception from a \`Function\` — \`apply\` declares none, so it does not compile.
- Long multi-statement lambdas; extract a method and use a method reference.`,
    mcqs: [
      mcq('Function<Integer,Integer> f = x -> x + 1; Function<Integer,Integer> g = x -> x * 10; What is f.andThen(g).apply(2)?',
        [['30', true], ['21', false], ['12', false], ['20', false]],
        'andThen runs f first and passes its result to g: f(2) = 3, then g(3) = 30. compose would run g first, giving f(20) = 21.'),
      mcq('Which interface fits a lambda that takes no arguments and returns a fresh HashMap?',
        [['Supplier<Map<String, Integer>>', true], ['Consumer<Map<String, Integer>>', false], ['Function<Void, Map<String, Integer>>', false], ['Predicate<Map<String, Integer>>', false]],
        'Supplier.get takes nothing and returns a value. Consumer takes a value and returns nothing; Predicate returns boolean.'),
      mcq('int total = 0; nums.forEach(n -> total += n); — why does this not compile?',
        [['total is reassigned, so it is not effectively final', true], ['forEach cannot take a lambda that has a statement body', false], ['int cannot be used inside any lambda', false], ['The += operator is banned in lambdas', false]],
        'A lambda may only capture local variables that are never reassigned. Summing belongs in a stream (mapToInt(...).sum()) or a plain loop.'),
    ],
    checkpoint: [
      mcq('An interface declares one abstract method plus two default methods. Can a lambda implement it?',
        [['Yes; only abstract methods count', true], ['No; it must have exactly one method of any kind', false], ['Only if it is annotated @FunctionalInterface', false], ['Only if the default methods are removed', false]],
        'A functional interface has a single abstract method; default and static methods have bodies already. The annotation only asks the compiler to check this.'),
      mcq('Predicate<Integer> even = n -> n % 2 == 0; Predicate<Integer> big = n -> n > 10; What is even.negate().and(big).test(13)?',
        [['true', true], ['false', false], ['It throws NullPointerException', false], ['It does not compile', false]],
        '13 is odd, so even.negate() is true, and 13 > 10, so big is true. Both parts hold, so the combined predicate returns true.'),
      mcq('Why would you choose IntPredicate over Predicate<Integer> for filtering a large int array?',
        [['It tests a primitive int with no boxing', true], ['Predicate<Integer> cannot test negative numbers', false], ['IntPredicate runs the test in parallel', false], ['Predicate<Integer> is deprecated since Java 11', false]],
        'Predicate<Integer> needs every int boxed into an Integer object. IntPredicate.test(int) works on the primitive directly, saving allocation.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_METHOD_REFS',
    notes: `A **method reference** is a lambda that only calls an existing method, written with \`::\`.
It is shorter and names the operation instead of describing it.

| Kind | Syntax | Equivalent lambda |
|---|---|---|
| Static method | Integer::parseInt | s -> Integer.parseInt(s) |
| Method of a particular object | System.out::println | x -> System.out.println(x) |
| Instance method of an arbitrary object | String::toUpperCase | s -> s.toUpperCase() |
| Constructor | ArrayList::new | () -> new ArrayList<>() |

    List<String> raw = List.of("3", "1", "2");
    List<Integer> nums = raw.stream().map(Integer::parseInt).collect(Collectors.toList());
    nums.forEach(System.out::println);         // 3 1 2, one per line

## The "arbitrary object" kind

With \`String::toUpperCase\` the **first parameter becomes the receiver**. So a two-argument shape can
take an instance method of one argument:

    Comparator<String> byIgnoreCase = String::compareToIgnoreCase;   // (a, b) -> a.compareToIgnoreCase(b)
    BiFunction<String, String, Boolean> same = String::equals;      // (a, b) -> a.equals(b)

## Constructor references

    Supplier<List<String>> make = ArrayList::new;          // no-arg constructor
    Function<String, StringBuilder> sb = StringBuilder::new;  // one-arg constructor
    IntFunction<int[]> arr = int[]::new;                   // array of the given size
    String[] out = names.stream().toArray(String[]::new);

Which constructor is chosen depends on the functional interface the reference is assigned to.

## When the reference is evaluated

\`System.out::println\` evaluates \`System.out\` **once**, when the reference is created; a lambda
\`x -> System.out.println(x)\` reads \`System.out\` on every call. Likewise \`obj::method\` with a
\`null\` obj throws \`NullPointerException\` immediately, not when called.

## When a lambda reads better

- The call needs extra arguments: \`s -> s.substring(0, 3)\` has no method-reference form.
- The reference would be ambiguous: \`Function<Integer, String> f = Integer::toString;\` does
  **not compile** — it matches both static \`toString(int)\` and instance \`toString()\`.
- A long class name makes the reference noisier than the lambda.

## Common mistakes

- Writing \`String::length()\` with parentheses — a syntax error.
- Expecting \`this::helper\` to work in a static method — there is no \`this\`.`,
    mcqs: [
      mcq('Which method reference is equivalent to (a, b) -> a.compareToIgnoreCase(b)?',
        [['String::compareToIgnoreCase', true], ['a::compareToIgnoreCase', false], ['String.compareToIgnoreCase', false], ['Comparator::compareToIgnoreCase', false]],
        'An unbound instance-method reference makes the first argument the receiver and passes the rest, which is exactly (a, b) -> a.compareToIgnoreCase(b).'),
      mcq('Function<Integer, String> f = Integer::toString; — what does the compiler say?',
        [['It is ambiguous and does not compile', true], ['It compiles and calls the static method', false], ['It compiles and calls the instance method', false], ['It compiles with an unchecked warning', false]],
        'Both static Integer.toString(int) and instance Integer.toString() fit the shape Integer -> String, so the reference is ambiguous. Use a lambda or String::valueOf.'),
      mcq('names.stream().toArray(String[]::new) passes what kind of reference to toArray?',
        [['An array constructor reference', true], ['A static method reference', false], ['A bound instance method reference', false], ['A reference to String.valueOf', false]],
        'String[]::new is an IntFunction<String[]> that creates an array of the requested size, so toArray can build a String[] instead of an Object[].'),
    ],
    checkpoint: [
      mcq('Printer p = null; Runnable r = p::print; — when is the NullPointerException thrown?',
        [['When the reference is created', true], ['When r.run() is first called', false], ['Never; a null receiver is skipped', false], ['At compile time', false]],
        'A bound method reference evaluates its receiver immediately and fails fast on null. The lambda () -> p.print() would only fail when run.'),
      mcq('Which of these lambdas has NO direct method-reference equivalent?',
        [['s -> s.substring(0, 3)', true], ['s -> s.trim()', false], ['s -> Integer.parseInt(s)', false], ['() -> new HashSet<String>()', false]],
        'The substring call passes extra fixed arguments that are not lambda parameters, so no method reference can express it. The others map to String::trim, Integer::parseInt and HashSet::new.'),
      mcq('Supplier<StringBuilder> a = StringBuilder::new; Function<String, StringBuilder> b = StringBuilder::new; — which constructors are used?',
        [['No-arg for a, String argument for b', true], ['No-arg for both; b ignores the argument', false], ['String argument for both', false], ['Neither compiles; constructors are ambiguous', false]],
        'The target functional interface picks the overload: Supplier has no parameters, so StringBuilder(); Function<String, ...> passes one String, so StringBuilder(String).'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_STREAMS',
    notes: `A **stream** is a pipeline over a source of data: a source, zero or more **intermediate**
operations, and one **terminal** operation.

    List<String> names = List.of("ravi", "asha", "kiran", "anu", "asha");
    List<String> result = names.stream()        // source
        .filter(n -> n.startsWith("a"))         // intermediate
        .distinct()                             // intermediate
        .map(String::toUpperCase)               // intermediate
        .sorted()                               // intermediate
        .collect(Collectors.toList());          // terminal
    System.out.println(result);                 // [ANU, ASHA]

A stream does not store data and does not change its source; it describes a computation.

## Laziness and vertical execution

Intermediate operations only build the pipeline. **Nothing runs until a terminal operation is
called**, and then each element travels down the whole pipeline before the next starts:

    Optional<String> first = Stream.of("a", "bb", "ccc")
        .filter(s -> { System.out.println("filter " + s); return s.length() > 1; })
        .map(s -> { System.out.println("map " + s); return s.toUpperCase(); })
        .findFirst();
    System.out.println(first.get());

prints \`filter a\`, \`filter bb\`, \`map bb\`, \`BB\` — "ccc" is never touched, because \`findFirst\`
**short-circuits**. \`limit\`, \`anyMatch\`, \`allMatch\`, \`noneMatch\` and \`findAny\` do too.

## The operations you will use

- Intermediate: \`filter\`, \`map\`, \`flatMap\`, \`distinct\`, \`sorted\`, \`limit\`, \`skip\`, \`peek\`.
- Terminal: \`collect\`, \`forEach\`, \`count\`, \`reduce\`, \`min\`, \`max\`, \`findFirst\`, \`anyMatch\`,
  \`toArray\`. (Java 16 added \`toList()\`, which returns an unmodifiable list.)
- \`sorted\` and \`distinct\` are **stateful**: \`sorted\` must see every element before emitting one.

## Primitive streams

    int total = orders.stream().mapToInt(Order::getAmount).sum();
    OptionalDouble avg = IntStream.of(4, 8, 9).average();   // OptionalDouble[7.0]
    IntStream.range(0, 5).sum();                            // 10  (0..4)
    IntStream.rangeClosed(1, 5).sum();                      // 15

\`IntStream\` avoids boxing and adds \`sum\`, \`average\` and \`summaryStatistics\`.

## A stream is single-use

    Stream<String> s = names.stream();
    s.count();
    s.count();   // IllegalStateException: stream has already been operated upon or closed

Ask the collection for a new stream each time, or keep a \`Supplier<Stream<T>>\`.

## Costs and mistakes

- A stream is not faster than a loop; it is clearer. \`parallelStream()\` only helps for large,
  CPU-bound work with no shared state.
- Side effects in \`map\` or \`filter\` (adding to an outside list) break under parallelism; let
  \`collect\` build the result.
- A pipeline with no terminal operation does nothing at all — \`peek\` will print nothing.`,
    workedExample: `**Goal: the three highest distinct scores above 40, as a comma-separated string.**

    int[] scores = {55, 91, 40, 77, 91, 63, 12};
    String top = Arrays.stream(scores)
        .filter(s -> s > 40)          // 55 91 77 91 63
        .distinct()                   // 55 91 77 63
        .boxed()                      // Stream<Integer>, so we can sort descending
        .sorted(Comparator.reverseOrder())
        .limit(3)
        .map(String::valueOf)
        .collect(Collectors.joining(", "));
    System.out.println(top);          // 91, 77, 63

\`boxed()\` is needed because \`IntStream.sorted()\` has no comparator argument.`,
    mcqs: [
      mcq('List.of(1, 2, 3).stream().peek(System.out::println).map(n -> n * 2); — what is printed?',
        [['Nothing', true], ['1 2 3', false], ['2 4 6', false], ['1 2 3 then 2 4 6', false]],
        'There is no terminal operation, so the pipeline is only described and never run. peek and map are both lazy intermediate operations.'),
      mcq('What does IntStream.range(1, 5).sum() return?',
        [['10', true], ['15', false], ['5', false], ['14', false]],
        'range excludes its upper bound, so it yields 1, 2, 3 and 4, which sum to 10. rangeClosed(1, 5) would include 5 and give 15.'),
      mcq('Stream.of(5, 3, 8, 1).filter(n -> n > 2).sorted().findFirst() returns what?',
        [['Optional[3]', true], ['Optional[5]', false], ['Optional[1]', false], ['3', false]],
        'filter keeps 5, 3 and 8; sorted orders them 3, 5, 8; findFirst returns the first wrapped in an Optional.'),
    ],
    checkpoint: [
      mcq('Stream<String> s = list.stream(); long a = s.count(); long b = s.count(); — what happens?',
        [['IllegalStateException on the second count', true], ['b is 0 because the stream is already exhausted', false], ['b equals a; streams can be replayed', false], ['A compile error on the second count', false]],
        'A stream can be consumed by exactly one terminal operation. The second call finds it already operated upon and throws IllegalStateException.'),
      mcq('A filter lambda prints each element it tests. Stream.of("x", "yy", "zzz", "w").filter(...).anyMatch(s -> s.length() == 2) runs. How many elements are tested?',
        [['2', true], ['4', false], ['1', false], ['3', false]],
        'Streams process elements one at a time down the pipeline, and anyMatch stops as soon as it gets true. "x" fails and "yy" succeeds, so "zzz" and "w" are never reached.'),
      mcq('Which operation must see every element before it can pass any element on?',
        [['sorted', true], ['filter', false], ['map', false], ['peek', false]],
        'sorted is a stateful operation: the smallest element could be the last one, so it buffers the whole input before emitting anything.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_COLLECTORS',
    notes: `\`collect\` is the terminal operation that turns a stream into a collection, a map, a string or a
summary. The recipes live in \`java.util.stream.Collectors\`.

    List<String> words = List.of("apple", "avocado", "banana", "blueberry", "cherry");

## Lists, sets and strings

    words.stream().filter(w -> w.length() > 6).collect(Collectors.toList());      // [avocado, blueberry]
    words.stream().map(String::length).collect(Collectors.toSet());              // {5, 6, 7, 9} in some order
    words.stream().map(w -> w.substring(0, 2)).collect(Collectors.joining(", ", "[", "]"));
    // [ap, av, ba, bl, ch]

\`toList()\` makes no promise about the list type or mutability (it is an ArrayList today); use
\`Collectors.toCollection(ArrayList::new)\` if you must modify the result.

## Grouping

    Map<Character, List<String>> byLetter = words.stream()
        .collect(Collectors.groupingBy(w -> w.charAt(0)));
    // {a=[apple, avocado], b=[banana, blueberry], c=[cherry]}

    Map<Character, Long> counts = words.stream()
        .collect(Collectors.groupingBy(w -> w.charAt(0), TreeMap::new, Collectors.counting()));
    // {a=2, b=2, c=1}  — sorted keys because of TreeMap::new; counting() gives Long

The second argument (a **downstream collector**) decides what each group becomes: \`counting()\`,
\`summingInt(...)\`, \`averagingDouble(...)\`, \`mapping(f, toList())\`, \`maxBy(comparator)\`.
\`groupingBy\` returns a \`HashMap\` by default and throws \`NullPointerException\` if the classifier
returns \`null\`.

    Map<Boolean, List<Integer>> parts = Stream.of(1, 2, 3, 4, 5)
        .collect(Collectors.partitioningBy(n -> n % 2 == 0));
    // {false=[1, 3, 5], true=[2, 4]} — both keys are always present

## toMap and duplicate keys

    Map<String, Integer> lengths = words.stream()
        .collect(Collectors.toMap(w -> w, String::length));

If two elements produce the same key, \`toMap\` throws \`IllegalStateException: Duplicate key\`.
Pass a merge function to decide: \`toMap(k, v, Integer::sum)\` adds them,
\`(a, b) -> a\` keeps the first.

## reduce

    int sum = Stream.of(1, 2, 3, 4).reduce(0, Integer::sum);          // 10
    Optional<Integer> max = Stream.of(1, 2, 3, 4).reduce(Integer::max); // Optional[4]

The identity must truly be neutral (0 for sum, 1 for product) — a wrong identity is applied once per
parallel chunk. For sums prefer \`mapToInt(...).sum()\`.

## Interview traps

- \`counting()\` returns \`Long\`, so the map is \`Map<K, Long>\`, not \`Map<K, Integer>\`.
- \`groupingBy\` key order is unspecified; pass \`TreeMap::new\` when the output is shown to a user.`,
    mcqs: [
      mcq('Stream.of("a", "bb", "cc").collect(Collectors.toMap(String::length, s -> s)) — what happens?',
        [['IllegalStateException for duplicate key 2', true], ['It returns {1=a, 2=cc}', false], ['It returns {1=a, 2=bb}', false], ['It returns {1=a, 2=[bb, cc]}', false]],
        '"bb" and "cc" both map to key 2 and no merge function was given, so toMap refuses to choose and throws IllegalStateException.'),
      mcq('What type does words.stream().collect(Collectors.groupingBy(String::length, Collectors.counting())) produce?',
        [['Map<Integer, Long>', true], ['Map<Integer, Integer>', false], ['Map<Integer, List<String>>', false], ['Map<String, Long>', false]],
        'The classifier String::length gives Integer keys, and counting() always produces a Long count for each group.'),
      mcq('Stream.of(3, 6, 9).collect(Collectors.partitioningBy(n -> n > 10)) gives what?',
        [['{false=[3, 6, 9], true=[]}', true], ['{false=[3, 6, 9]}', false], ['{true=[]}', false], ['An empty map', false]],
        'partitioningBy always creates both the true and the false key, even when one partition is empty.'),
    ],
    checkpoint: [
      mcq('Stream.of(2, 3, 4).reduce(1, (a, b) -> a * b) returns what?',
        [['24', true], ['9', false], ['10', false], ['0', false]],
        'Starting from the identity 1, it multiplies through: 1 * 2 * 3 * 4 = 24. An identity of 0 would have made every product 0.'),
      mcq('A report must show employee counts per department in alphabetical order of department. Which collector call is right?',
        [['groupingBy(Emp::getDept, TreeMap::new, counting())', true], ['groupingBy(Emp::getDept, counting())', false], ['toMap(Emp::getDept, e -> 1)', false], ['partitioningBy(Emp::getDept)', false]],
        'The map factory TreeMap::new keeps department keys sorted. The plain form returns a HashMap with no order, and toMap would throw on repeated departments.'),
      mcq('names.stream().collect(Collectors.toMap(n -> n.charAt(0), n -> 1, Integer::sum)) on ["ann", "amy", "bob"] gives what?',
        [['{a=2, b=1}', true], ['{a=1, b=1}', false], ['IllegalStateException', false], ['{a=[ann, amy], b=[bob]}', false]],
        'Both "ann" and "amy" produce key a; the merge function Integer::sum adds their values 1 + 1. "bob" gives b=1.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_OPTIONAL',
    notes: `\`Optional<T>\` is a container that holds one value or nothing. Its job is to make "this method
might not have an answer" visible in the **return type**, so a caller cannot forget to handle it
the way they forget to check for \`null\`.

    Optional<User> findByEmail(String email) {
        return Optional.ofNullable(users.get(email));
    }

## Creating

    Optional.of("x");          // a value; Optional.of(null) throws NullPointerException
    Optional.ofNullable(maybe); // empty if maybe is null
    Optional.empty();

## Consuming — without get()

    String city = findByEmail(e)
        .map(User::getAddress)          // Optional<Address>
        .map(Address::getCity)          // Optional<String>; empty if any step was null
        .filter(c -> !c.isBlank())
        .orElse("Unknown");

    findByEmail(e).ifPresent(u -> mailer.send(u));
    findByEmail(e).ifPresentOrElse(u -> log(u), () -> log("none"));    // Java 9
    User u = findByEmail(e).orElseThrow(() -> new UserNotFoundException(e));

Use \`flatMap\` when the mapping function itself returns an \`Optional\`, so you do not end up with
\`Optional<Optional<T>>\`.

## orElse vs orElseGet

    String a = Optional.of("cached").orElse(loadFromDb());        // loadFromDb() STILL runs
    String b = Optional.of("cached").orElseGet(() -> loadFromDb()); // loadFromDb() does not run

\`orElse\`'s argument is an ordinary expression, evaluated before the call. If the fallback is
expensive or has side effects, use \`orElseGet\`.

## Misuses an interviewer looks for

- **\`opt.get()\` without checking** — throws \`NoSuchElementException\` when empty; it is just a
  null check moved somewhere else. \`if (opt.isPresent()) opt.get()\` is legal but misses the point.
- **Optional fields, parameters or collection elements.** It was designed for return values; it is
  not \`Serializable\`, and an \`Optional\` parameter forces every caller to wrap.
- **\`Optional<List<T>>\`** — return an empty list instead.
- **Returning \`null\` from a method declared to return Optional** — the worst of both worlds.
- Using it for hot-path primitives — prefer \`OptionalInt\` or a sentinel.

## Where you meet it

\`stream.findFirst()\`, \`max\`, \`min\` and \`reduce\` without an identity all return \`Optional\`,
because an empty stream has no answer. Spring Data's \`findById\` does the same.`,
    mcqs: [
      mcq('Optional.of(null) is called. What happens?',
        [['NullPointerException is thrown', true], ['An empty Optional is returned', false], ['An Optional holding null is returned', false], ['A compile error', false]],
        'Optional.of requires a non-null value and throws NullPointerException otherwise. Optional.ofNullable is the factory that turns null into empty.'),
      mcq('Optional.of("hit").orElse(expensiveLookup()) — does expensiveLookup run?',
        [['Yes, the argument is evaluated first', true], ['No, because a value is present', false], ['Only when assertions are enabled', false], ['Only on the first call', false]],
        'orElse takes a value, so Java evaluates expensiveLookup() before calling orElse. orElseGet takes a Supplier and only calls it when the Optional is empty.'),
      mcq('A repository method returns Optional<Customer>. Which consumer code is the idiomatic one?',
        [['repo.find(id).map(Customer::getName).orElse("guest")', true], ['repo.find(id).get().getName()', false], ['repo.find(id) == null ? "guest" : ...', false], ['repo.find(id).isPresent() ? null : "guest"', false]],
        'map transforms the value if present and orElse supplies the fallback, with no unchecked get and no null comparison against the Optional itself.'),
    ],
    checkpoint: [
      mcq('Optional<String> o = Optional.empty(); String s = o.get(); — what happens?',
        [['NoSuchElementException', true], ['s is null', false], ['NullPointerException', false], ['s is the empty string', false]],
        'get on an empty Optional throws NoSuchElementException ("No value present"). orElseThrow() makes that intent explicit; orElse supplies a default.'),
      mcq('findUser returns Optional<User>, and User.getManager returns Optional<User>. Which call yields Optional<User> for the manager?',
        [['findUser(id).flatMap(User::getManager)', true], ['findUser(id).map(User::getManager)', false], ['findUser(id).get().getManager().get()', false], ['findUser(id).filter(User::getManager)', false]],
        'map would wrap the returned Optional again, giving Optional<Optional<User>>. flatMap expects a function that returns an Optional and does not double-wrap.'),
      mcq('A class declares private Optional<String> middleName; as a field. What is the strongest objection?',
        [['Optional is meant for returns and is not Serializable', true], ['Fields cannot have generic types', false], ['It makes the field static automatically', false], ['Optional fields are banned by the compiler', false]],
        'Optional was designed as a return type. As a field it adds an object per instance, breaks serialization, and can itself be null. Use a nullable field and return Optional from the getter.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_JAVA17',
    notes: `Java 17 is the long-term-support release most companies run today. Four features change how
everyday code looks. (The exercise runner here is Java 15, which has text blocks and switch
expressions but not records.)

## var — local type inference (Java 10)

    var names = new ArrayList<String>();          // ArrayList<String>
    for (var e : map.entrySet()) { ... }          // Map.Entry<K, V>

\`var\` is still static typing — the compiler infers the type once and fixes it. Rules: local
variables only (not fields, parameters or return types); it needs an initialiser; \`var x = null;\`
and \`var f = () -> 1;\` do not compile; \`var list = new ArrayList<>();\` infers
\`ArrayList<Object>\`. Use it when the right-hand side already shows the type.

## Records (Java 16)

    record Point(int x, int y) {
        Point {                                     // compact constructor: validation
            if (x < 0 || y < 0) throw new IllegalArgumentException("negative");
        }
        double dist() { return Math.sqrt(x * x + y * y); }
    }
    Point p = new Point(3, 4);
    System.out.println(p);                          // Point[x=3, y=4]
    System.out.println(p.x() + " " + p.dist());     // 3 5.0
    System.out.println(p.equals(new Point(3, 4)));  // true

A record is a transparent, immutable data carrier. The compiler generates \`private final\` fields,
the canonical constructor, accessors named after the components (\`x()\`, not \`getX()\`), and
\`equals\`, \`hashCode\` and \`toString\` from all components. A record is implicitly \`final\`, cannot
extend a class (it extends \`java.lang.Record\`), and cannot declare extra instance fields. It is only
**shallowly** immutable: a \`List\` component can still be modified unless you copy it with
\`List.copyOf\`. Records are ideal DTOs and map keys.

## Text blocks (Java 15)

    String json = """
        {
          "name": "Asha",
          "role": "admin"
        }
        """;

The common leading indentation (measured against the closing \`"""\`) is stripped, line breaks are
kept, quotes need no escaping, and the string ends with a newline here.

## switch expressions (Java 14)

    String kind = switch (day) {
        case SATURDAY, SUNDAY -> "weekend";
        case MONDAY -> {
            audit();
            yield "start";                          // yield returns a value from a block
        }
        default -> "weekday";
    };

Arrow cases **never fall through**, several labels share a case, and a switch *expression* must be
exhaustive — every enum constant, or a \`default\`.

## Also in Java 17

- Pattern matching for instanceof (16): \`if (obj instanceof String s && !s.isEmpty())\` — no cast.
- Sealed classes (17): \`sealed interface Shape permits Circle, Square\` limits who may implement it.

## Common mistakes

- Calling \`p.getX()\` on a record.
- Using \`var\` where the type is not obvious (\`var x = service.process();\`).
- Forgetting \`yield\` inside a block in a switch expression.`,
    mcqs: [
      mcq('record Item(String name, int qty) {} — what does System.out.println(new Item("pen", 2)) print?',
        [['Item[name=pen, qty=2]', true], ['Item{name=pen, qty=2}', false], ['Item@1b6d3586', false], ['(pen, 2)', false]],
        'Records generate toString in the form Name[component=value, ...] from every component, in declaration order.'),
      mcq('Which of these declarations compiles?',
        [['var count = 0;', true], ['var empty = null;', false], ['var later;', false], ['var adder = (a, b) -> a + b;', false]],
        'var needs an initialiser from which a real type can be inferred. null has no usable type, and a lambda needs a target type that var cannot give it.'),
      mcq('int n = switch (code) { case 1 -> 10; case 2 -> 20; }; where code is an int — why does it fail to compile?',
        [['The switch expression is not exhaustive', true], ['Arrow cases cannot return numbers', false], ['switch cannot be used as an expression', false], ['Each case needs a break statement', false]],
        'A switch expression must produce a value for every possible input. An int has many other values, so a default case is required.'),
    ],
    checkpoint: [
      mcq('record Order(String id, List<String> items) {} — an Order is created with an ArrayList, which the caller later adds to. What happens to the order?',
        [['Its items change; records are shallowly immutable', true], ['Nothing; records deep-copy every component when constructed', false], ['The add throws UnsupportedOperationException', false], ['The record becomes unequal to itself', false]],
        'The record field is final, but it points at the same mutable ArrayList. Copy defensively in a compact constructor with items = List.copyOf(items).'),
      mcq('Given record Point(int x, int y), how do you read the x component?',
        [['p.x()', true], ['p.getX()', false], ['p.x', false], ['p.get("x")', false]],
        'Record accessors are named exactly after the components, so x() and y(). The field itself is private, and no getX() is generated.'),
      mcq('In a switch expression, a case needs to log and then produce "late". Which keyword returns the value from its block?',
        [['yield', true], ['return', false], ['break', false], ['emit', false]],
        'Inside a block in a switch expression, yield gives the value of the whole switch. return would try to leave the enclosing method instead.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_DEBUGGING',
    notes: `Stream and lambda bugs are often silent — the code runs and the answer is wrong. Each case
below is the code, the symptom, the cause and the fix.

## Case 1 — a stream used twice

    Stream<Order> open = orders.stream().filter(Order::isOpen);
    long count = open.count();
    List<Order> list = open.collect(Collectors.toList());
    // IllegalStateException: stream has already been operated upon or closed

**Fix:** build a new stream each time, or collect once and use the list for both.

## Case 2 — side effects in map

    List<String> seen = new ArrayList<>();
    List<String> upper = names.parallelStream()
        .map(n -> { seen.add(n); return n.toUpperCase(); })
        .collect(Collectors.toList());

**Symptom:** \`seen\` sometimes has missing entries, \`null\`s, or throws
\`ArrayIndexOutOfBoundsException\` — \`ArrayList\` is not thread-safe. Even sequentially, behaviour that
depends on \`map\` running for every element breaks when a short-circuit is added later.
**Fix:** functions in a pipeline should be pure; produce both results with collectors.

## Case 3 — Optional.get() without a check

    String email = repo.findById(id).get().getEmail();
    // NoSuchElementException: No value present

**Fix:** decide what absent means: \`.map(User::getEmail).orElseThrow(() -> new NotFound(id))\`.

## Case 4 — toMap with duplicate keys

    Map<String, Employee> byDept = staff.stream()
        .collect(Collectors.toMap(Employee::getDept, e -> e));
    // IllegalStateException: Duplicate key Sales (attempted merging values ...)

**Cause:** several employees per department. **Fix:** \`groupingBy(Employee::getDept)\` for a list per
key, or a merge function such as \`(a, b) -> a.getSalary() >= b.getSalary() ? a : b\`.

## Case 5 — the pipeline that never ran

    list.stream().map(String::trim).filter(s -> !s.isEmpty());
    // list is unchanged, nothing happened

**Cause:** no terminal operation, and streams never modify their source. **Fix:**
\`list = list.stream()...collect(Collectors.toList());\` or \`list.replaceAll(String::trim)\`.

## Case 6 — Stream.of on a primitive array

    int[] marks = {70, 80, 90};
    System.out.println(Stream.of(marks).count());   // 1  — a Stream<int[]> of ONE array

**Fix:** \`Arrays.stream(marks)\` or \`IntStream.of(marks)\` — count is 3.

## Case 7 — the mutated captured variable

    int total = 0;
    prices.forEach(p -> total += p);   // does not compile

**Fix:** \`int total = prices.stream().mapToInt(Integer::intValue).sum();\`

## The method

Exceptions name the problem precisely here: "already operated upon" is reuse, "Duplicate key" is
toMap, "No value present" is \`Optional.get\`. For silent wrong answers, add \`.peek(System.out::println)\`
between stages to watch elements flow — then remove it.`,
    mcqs: [
      mcq('A log shows "IllegalStateException: Duplicate key Sales". Which call produced it?',
        [['Collectors.toMap without a merge function', true], ['Collectors.groupingBy with a counting() downstream', false], ['Stream.distinct on a list of strings', false], ['HashMap.put with an existing key', false]],
        'toMap throws when two elements yield the same key and no merge function was supplied. HashMap.put just replaces, and groupingBy collects duplicates into a group.'),
      mcq('int[] marks = {70, 80, 90}; Stream.of(marks).count() returns 1. Why?',
        [['Stream.of treats the int[] as one element', true], ['count stops at the first element', false], ['Stream.of ignores primitive values', false], ['The array is consumed after one read', false]],
        'Stream.of(T...) cannot spread an int[] into Integers, so T becomes int[] and the stream has one element. Arrays.stream(marks) gives an IntStream of three.'),
      mcq('A parallel stream adds each element to an outside ArrayList inside map. What is the realistic failure?',
        [['Lost or null entries, or an exception', true], ['A compile error about effectively final', false], ['The stream silently runs sequentially', false], ['Each thread gets its own copy of the list', false]],
        'The list reference is effectively final, so it compiles, but ArrayList is not thread-safe. Concurrent adds can overwrite each other or overflow the array.'),
      mcq('list.stream().map(String::trim); is meant to trim every string in list. What is wrong?',
        [['No terminal operation, and streams never change their source', true], ['String::trim is not a valid method reference', false], ['map needs a Consumer, not a Function', false], ['trim returns void, so map has nothing to keep', false]],
        'The pipeline never runs without a terminal operation, and even when it does it produces new values rather than editing the list. Collect the result or use replaceAll.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_PRACTICE',
    notes: `Five stream exercises, then the graded one below. Write each pipeline first, then run it on
the data given.

    class Emp { String name, dept; int salary; int age; /* constructor, getters */ }

## 1. Names of the over-30s, sorted

    List<String> names = emps.stream().filter(e -> e.getAge() > 30)
        .map(Emp::getName).sorted().collect(Collectors.toList());

## 2. Total and average salary

\`mapToInt(Emp::getSalary).sum()\`, and \`.average()\` which returns an \`OptionalDouble\` — decide what
an empty list should report.

## 3. Headcount per department, alphabetical

\`groupingBy(Emp::getDept, TreeMap::new, counting())\` — note the counts are \`Long\`.

## 4. Highest-paid per department

\`groupingBy(Emp::getDept, maxBy(Comparator.comparingInt(Emp::getSalary)))\` gives
\`Map<String, Optional<Emp>>\`. Wrap it in \`collectingAndThen(..., Optional::get)\` to unwrap — safe
here because a group is never empty.

## 5. Every distinct skill

Each employee has \`List<String> skills\`. Get all distinct skills sorted:

    emps.stream().flatMap(e -> e.getSkills().stream()).distinct().sorted()
        .collect(Collectors.toList());

\`map\` would give a \`Stream<List<String>>\`; \`flatMap\` flattens it to \`Stream<String>\`.

## Check yourself

Rewrite exercise 3 as a plain loop with a \`TreeMap\` and \`merge\`. If the loop feels clearer to you,
that is fine — in an interview, say which you would choose and why.`,
    mcqs: [
      mcq('Each Emp has a List<String> skills. Which pipeline yields a Stream<String> of every skill?',
        [['emps.stream().flatMap(e -> e.getSkills().stream())', true], ['emps.stream().map(e -> e.getSkills())', false], ['emps.stream().map(e -> e.getSkills().stream())', false], ['emps.stream().forEach(e -> e.getSkills())', false]],
        'map would produce a Stream of lists (or of streams). flatMap replaces each employee with the elements of its skill stream, giving one flat Stream<String>.'),
      mcq('emps.stream().mapToInt(Emp::getSalary).average() on an empty list returns what?',
        [['OptionalDouble.empty', true], ['0.0', false], ['NaN', false], ['It throws ArithmeticException', false]],
        'The average of nothing is undefined, so average returns an empty OptionalDouble. Decide the fallback yourself, for example orElse(0).'),
      mcq('groupingBy(Emp::getDept, maxBy(comparingInt(Emp::getSalary))) produces which map type?',
        [['Map<String, Optional<Emp>>', true], ['Map<String, Emp>', false], ['Map<String, Integer>', false], ['Map<String, List<Emp>>', false]],
        'maxBy returns an Optional because it is defined for empty input too. collectingAndThen(maxBy(...), Optional::get) unwraps it.'),
      mcq('Which pipeline lists the names of employees older than 30 in alphabetical order?',
        [['filter(age > 30), then map(name), then sorted()', true], ['sorted(), then map(name), then filter(age > 30)', false], ['map(name), then filter(age > 30), then sorted()', false], ['filter(age > 30), then sorted(), with no map', false]],
        'After map(name) the age is gone, so filtering must come first. Sorting the names after mapping orders them alphabetically.'),
      mcq('Stream.of("b", "a", "b", "c").distinct().count() returns what?',
        [['3', true], ['4', false], ['2', false], ['1', false]],
        'distinct removes the second "b" using equals, leaving b, a and c, so count returns 3.'),
    ],
    assignment: {
      title: 'Department Salary Report with Streams',
      description: 'Read employee records, group them by department with streams, and print a sorted summary for each department.',
      instructions: `Read standard input. Each non-blank line is an employee record:

    name,department,salary

Trim spaces around each field. A line is **invalid** if it does not have exactly three
comma-separated fields, if the name or department is empty, or if the salary is not a whole number.
Skip invalid lines and count them.

For each department, in **alphabetical order**, print one line:

    <department>: count=<n> total=<sum> avg=<avg> top=<name>

- \`avg\` is \`total / count\` using whole-number division (round down).
- \`top\` is the highest-paid employee in the department; on a tie, the name that comes first
  alphabetically.

After the departments, print \`skipped=<k>\` — the number of invalid lines (blank lines are not
counted). If there are no valid records, print only the \`skipped\` line.

Example input:

    Asha,Engineering,90000
    Ravi,Engineering,80000
    Meera,Sales,50000

Expected output:

    Engineering: count=2 total=170000 avg=85000 top=Asha
    Sales: count=1 total=50000 avg=50000 top=Meera
    skipped=0

Use streams for the grouping and summaries: \`Collectors.groupingBy\` with \`TreeMap::new\`, then
\`mapToLong(...).sum()\` and a \`Comparator\` for the top earner. Use a small class for an employee —
the runner is Java 15, so records are not available.`,
      rubric: [
        { criterion: 'Parsing and validation', description: 'Fields trimmed; wrong field counts, empty names and non-numeric salaries skipped and counted; blank lines ignored.', maxPoints: 10 },
        { criterion: 'Grouping with streams', description: 'Departments grouped with a collector and printed in alphabetical order.', maxPoints: 10 },
        { criterion: 'Correct summaries', description: 'Count, total, rounded-down average and the top earner with the alphabetical tie-break.', maxPoints: 10 },
      ],
      totalPoints: 30,
      coding: {
        language: 'java',
        starter: `import java.io.*;
import java.util.*;
import java.util.stream.*;

public class Main {
    static class Employee {
        final String name, dept;
        final long salary;
        Employee(String name, String dept, long salary) {
            this.name = name; this.dept = dept; this.salary = salary;
        }
    }

    public static void main(String[] args) {
        List<String> lines = new BufferedReader(new InputStreamReader(System.in)).lines()
            .map(String::trim).filter(l -> !l.isEmpty()).collect(Collectors.toList());
        List<Employee> staff = new ArrayList<>();
        int skipped = 0;
        // TODO: parse each line into an Employee, counting invalid lines in skipped

        // TODO: group staff by department (sorted), and print one summary line per department

        System.out.println("skipped=" + skipped);
    }
}
`,
        tests: [
          { input: 'Asha,Engineering,90000\nRavi,Engineering,80000\nMeera,Sales,50000\n', expectedOutput: 'Engineering: count=2 total=170000 avg=85000 top=Asha\nSales: count=1 total=50000 avg=50000 top=Meera\nskipped=0' },
          { input: 'Zed,Ops,100\nAmy,Ops,100\nBob,Ops,50\n', expectedOutput: 'Ops: count=3 total=250 avg=83 top=Amy\nskipped=0' },
          { input: 'Asha,Engineering,90000\nbad line\nKiran,HR,abc\n\nLeo,HR,40000\n', expectedOutput: 'Engineering: count=1 total=90000 avg=90000 top=Asha\nHR: count=1 total=40000 avg=40000 top=Leo\nskipped=2' },
          { input: 'Tom,Sales,10\nAnn,Marketing,25\nCal,Sales,11\nDee,Marketing,25\nEve,Sales,10\n', expectedOutput: 'Marketing: count=2 total=50 avg=25 top=Ann\nSales: count=3 total=31 avg=10 top=Cal\nskipped=0', isHidden: true },
          { input: 'x,,5\nNoComma\nA,B,C,D\n', expectedOutput: 'skipped=3', isHidden: true },
          { input: 'Raj, Finance , 70001\nSam,Finance,70000\n', expectedOutput: 'Finance: count=2 total=140001 avg=70000 top=Raj\nskipped=0', isHidden: true },
        ],
        difficulty: 'medium',
        passingPoints: 20,
      },
    },
  },
  {
    unitCode: 'JT_JAVA_MODERN_INTERVIEW_QUESTION',
    notes: `Three questions that come up whenever a Java 8+ codebase is discussed. Answer aloud, with a
small example each time — the example is what convinces the interviewer.

## Q1. "What is the difference between map and flatMap?"

**Model answer.** Both are intermediate operations that apply a function to each element. \`map\` is
one-to-one: each element becomes exactly one result, so \`Stream<T>\` becomes \`Stream<R>\`. \`flatMap\`
is one-to-many: the function returns a **stream** for each element, and \`flatMap\` concatenates
those streams into one.

    List<List<Integer>> nested = List.of(List.of(1, 2), List.of(3), List.of());
    nested.stream().map(List::size).collect(Collectors.toList());              // [2, 1, 0]
    nested.stream().flatMap(List::stream).collect(Collectors.toList());        // [1, 2, 3]

**Follow-up:** "Where else does flatMap appear?" — \`Optional.flatMap\`, when the mapping function
already returns an Optional, avoids \`Optional<Optional<T>>\`. Same idea: map then flatten one level.

## Q2. "Intermediate vs terminal operations — and what does lazy mean?"

**Model answer.** Intermediate operations (\`filter\`, \`map\`, \`sorted\`, \`distinct\`, \`limit\`) return
a new stream and do no work; they describe the pipeline. A terminal operation (\`collect\`,
\`forEach\`, \`count\`, \`reduce\`, \`findFirst\`) triggers the processing and consumes the stream, which
cannot be reused. Because work happens only at the terminal step, elements flow through the whole
pipeline one by one, and short-circuiting operations like \`findFirst\` or \`limit\` can stop early —
\`Stream.iterate(1, n -> n + 1).filter(n -> n % 7 == 0).findFirst()\` terminates on an infinite stream.

**Follow-up:** "What is a stateful intermediate operation?" — \`sorted\` and \`distinct\` must remember
elements they have seen; \`sorted\` buffers everything, which matters for large or infinite streams
and for parallel performance.

## Q3. "How is Optional misused?"

**Model answer.** Optional is for **return types** that may have no value. The misuses are: calling
\`get()\` without checking, which just turns a \`NullPointerException\` into a
\`NoSuchElementException\`; using Optional for fields, method parameters or collection elements;
returning \`Optional<List<T>>\` instead of an empty list; returning \`null\` from a method declared as
Optional; and \`orElse(expensiveCall())\` where \`orElseGet\` should be used because \`orElse\` evaluates
its argument eagerly. The idiomatic chain is \`map\` / \`filter\` / \`orElse\` / \`orElseThrow\`.

**Follow-up:** "Then why not use Optional everywhere instead of null?" — Each one is an extra object,
it is not \`Serializable\`, and inside a class a nullable field plus a getter that returns Optional
says the same thing more cheaply.

**Also expect:** "Are parallel streams always faster?" — No. They use the common ForkJoinPool, pay
for splitting and merging, and help only for large, CPU-bound, side-effect-free work on sources that
split well (arrays, ArrayList — not LinkedList or I/O).`,
    mcqs: [
      mcq('List.of(List.of("a", "b"), List.of("c")).stream().flatMap(List::stream).count() returns what?',
        [['3', true], ['2', false], ['1', false], ['5', false]],
        'flatMap replaces each inner list with a stream of its elements and concatenates them, giving a, b and c, so the count is 3. With map the count would be 2.'),
      mcq('Stream.iterate(1, n -> n + 1).filter(n -> n % 7 == 0).findFirst() is run. What is the result?',
        [['Optional[7] — findFirst short-circuits', true], ['It never terminates; the stream is infinite', false], ['Optional.empty, as the stream has no end', false], ['IllegalStateException for an infinite source', false]],
        'Elements are pulled one at a time only as the terminal operation needs them. findFirst stops at the first match, 7, so the infinite source is never exhausted.'),
      mcq('An interviewer asks when a parallel stream is a poor choice. Which answer is strongest?',
        [['Small or I/O-bound work, or shared mutable state', true], ['Whenever the list being processed has more than 1,000 items', false], ['Whenever the pipeline uses map or filter', false], ['Never; parallel streams are always faster', false]],
        'Splitting work across the common ForkJoinPool has overhead, I/O waits do not benefit, and shared mutable state becomes a race. Large CPU-bound pure work is where it helps.'),
    ],
  },
  {
    unitCode: 'JT_JAVA_MODERN_MINI_PROJECT',
    notes: `# Mini Project — A Library Management System

Build a **console application** for a small college library. It brings together everything from
Core Java to this topic: classes and encapsulation, collections chosen for their costs, custom
exceptions, and streams for search and reports.

## The domain

- **Book** — ISBN (unique), title, author, year, number of copies, copies available.
- **Member** — member id (unique), name, type (STUDENT or FACULTY). Students may hold **3** books at
  a time, faculty **5**.
- **Loan** — book, member, borrow date, due date (14 days later), return date (empty until returned).

## Functional requirements

1. Add, list and remove books; add and list members. Removing a book that is on loan is refused.
2. **Borrow**: a member borrows a book if a copy is available and they are under their limit.
3. **Return**: closes the loan; a return after the due date records a fine of ₹5 per day late.
4. **Search** books by title or author substring (case-insensitive), and by year range — with streams.
5. **Reports** (streams and collectors):
   - books currently on loan, sorted by due date;
   - overdue loans as of a given date, with member name and days overdue;
   - the 5 most borrowed books of all time;
   - loans per member type (\`groupingBy\`), and total fines collected.
6. A text menu loop that reads commands until \`exit\`.

## Technical requirements

- Store books in a \`Map<String, Book>\` keyed by ISBN and members in a \`Map<String, Member>\`; justify
  each collection choice in a comment.
- Custom exceptions: \`BookNotAvailableException\`, \`LoanLimitExceededException\`,
  \`NotFoundException\`. The menu catches them and prints a clear message; the program never crashes
  on bad input.
- Use \`Optional\` for lookups that may find nothing; never return \`null\` from a finder.
- Use \`LocalDate\` for dates; pass "today" into methods so reports can be tested.
- Records (or small immutable classes) for report rows; \`equals\`/\`hashCode\` wherever a class is a
  map key or set element.
- Load a few sample books and members at start-up, from a text block or a file.

## Acceptance criteria

- Borrowing the last copy makes the book unavailable; a second borrow raises
  \`BookNotAvailableException\` and the menu explains it.
- A student with 3 open loans cannot borrow a fourth.
- Returning a book 4 days late records a ₹20 fine.
- Searching "java" finds "Effective Java" and "Head First Java".
- Every report prints in a deterministic order.
- A README lists the commands, one sample session, and the complexity of borrow and search.

## Stretch

Save and load state from a CSV file; add a reservation queue per book (an \`ArrayDeque\` of members).`,
    mcqs: [
      mcq('In the library system, which structure gives O(1) lookup of a book when a member types its ISBN?',
        [['A HashMap<String, Book> keyed by ISBN', true], ['An ArrayList<Book> searched by a loop', false], ['A TreeSet<Book> ordered by title', false], ['A PriorityQueue<Book> by year', false]],
        'Lookup by a unique key is exactly what a HashMap provides in O(1) average time. A list search is O(n), and a set ordered by title cannot find by ISBN.'),
      mcq('A borrow request finds no available copy. What should the borrow method do in this design?',
        [['Throw BookNotAvailableException for the menu to report', true], ['Return null so the caller checks it', false], ['Print an error and call System.exit(1)', false], ['Silently create an extra copy', false]],
        'A custom checked or runtime exception names the rule that was broken and lets the menu decide how to tell the user, without null checks or ending the program.'),
    ],
    assignment: {
      title: 'Library Management System',
      description: 'A console library system with books, members and loans, built with OOP, collections, custom exceptions and stream-based search and reports.',
      instructions: `Build the system described in the brief. Submit a link to a Git repository containing:

1. The source code, organised in packages (for example \`model\`, \`service\`, \`exception\`, \`app\`).
2. A README with the commands, one sample session copied from the console, and one paragraph
   justifying each collection you chose with its cost.
3. Evidence of every acceptance criterion — a short transcript per criterion, or unit tests.

Work in small commits with clear messages. Keep \`main\` thin: it reads commands and calls services;
the rules about limits, availability and fines live in the service layer, where they can be tested.`,
      rubric: [
        { criterion: 'Domain model and encapsulation', description: 'Book, Member and Loan with private state, validation, and equals/hashCode where needed.', maxPoints: 20 },
        { criterion: 'Collections chosen and justified', description: 'Maps for lookup, sensible ordering for reports, with the cost of each choice explained.', maxPoints: 20 },
        { criterion: 'Rules and exceptions', description: 'Loan limits, availability and fines enforced; custom exceptions caught with clear messages; no crash on bad input.', maxPoints: 20 },
        { criterion: 'Streams for search and reports', description: 'Search and all four reports written as stream pipelines with collectors, in deterministic order.', maxPoints: 25 },
        { criterion: 'Repository and README', description: 'Packages, small commits, a README with commands, a sample session and evidence for each acceptance criterion.', maxPoints: 15 },
      ],
      totalPoints: 100,
    },
  },
  {
    unitCode: 'JT_JAVA_MODERN_CHECKPOINT',
    notes: `Ten questions across modern Java: lambdas and functional interfaces, method references,
streams, collectors, Optional, and Java 17 syntax. Trace each snippet by hand before you choose;
where a question asks what prints, assume Java 17.`,
    checkpoint: [
      mcq('List.of("kiwi", "fig", "banana").stream().map(String::length).reduce(0, Integer::sum) returns what?',
        [['13', true], ['3', false], ['6', false], ['kiwifigbanana', false]],
        'map turns the words into lengths 4, 3 and 6; reduce adds them from the identity 0, giving 13.'),
      mcq('Stream.of("x", "y", "z").collect(Collectors.joining("-", "<", ">")) produces what?',
        [['<x-y-z>', true], ['<x>-<y>-<z>', false], ['x-y-z', false], ['<-x-y-z->', false]],
        'joining(delimiter, prefix, suffix) puts the delimiter between elements and wraps the whole result once in the prefix and suffix.'),
      mcq('Supplier<Double> s = Math::random; — which kind of method reference is this?',
        [['A static method reference', true], ['A bound instance method reference', false], ['A constructor reference', false], ['An unbound instance method reference', false]],
        'Math.random is a static method taking no arguments and returning a double, which fits Supplier<Double>.get via a static method reference.'),
      mcq('Optional.ofNullable(name).map(String::trim).filter(s -> !s.isEmpty()).orElse("anonymous") with name = "   " returns what?',
        [['"anonymous"', true], ['"   "', false], ['""', false], ['It throws NoSuchElementException', false]],
        'The value is present, trim makes it "", and the filter rejects the empty string, leaving an empty Optional, so orElse supplies "anonymous".'),
      mcq('IntStream.rangeClosed(1, 4).map(i -> i * i).boxed().collect(Collectors.toList()) gives what?',
        [['[1, 4, 9, 16]', true], ['[1, 4, 9]', false], ['[0, 1, 4, 9]', false], ['30', false]],
        'rangeClosed includes both ends, so 1 to 4. map squares each; boxed turns the ints into Integers so they can be collected into a List.'),
      mcq('A teammate writes Map<String, Integer> m = names.stream().collect(groupingBy(n -> n, counting())); Why will it not compile?',
        [['counting() yields Long, so the map is Map<String, Long>', true], ['groupingBy cannot use the element itself as a key', false], ['counting() needs a Comparator argument', false], ['groupingBy only accepts method references', false]],
        'The downstream collector counting() produces Long values. Declare Map<String, Long>, or use summingInt(n -> 1) if you really want Integer.'),
      mcq('String s = """\n    Hi\n      there\n    """; — how many leading spaces does "there" keep?',
        [['2', true], ['6', false], ['0', false], ['4', false]],
        'A text block strips the common indentation, here 4 spaces set by "Hi" and the closing delimiter. "there" had 6, so 2 remain.'),
      mcq('Object o = "hello"; if (o instanceof String s && s.length() > 3) System.out.println(s.toUpperCase()); — what prints on Java 17?',
        [['HELLO', true], ['hello (printed unchanged)', false], ['Nothing; s is out of scope', false], ['A compile error: s is undeclared', false]],
        'Pattern matching for instanceof binds s when the test succeeds, and s is in scope on the right of && and in the if body. "hello" has 5 characters.'),
      mcq('A method returns Optional<Account> but, on one path, ends with return null;. What happens to a caller doing find().isPresent()?',
        [['NullPointerException at the caller', true], ['isPresent() returns false', false], ['The compiler rejects return null', false], ['Java converts null to Optional.empty()', false]],
        'Nothing stops a method from returning null where an Optional is declared, and calling isPresent on null throws. Always return Optional.empty().'),
      mcq('Stream.of(1, 2, 3, 4, 5, 6).filter(n -> n % 2 == 0).map(n -> n * 10).limit(2).collect(Collectors.toList()) gives what?',
        [['[20, 40]', true], ['[20, 40, 60]', false], ['[10, 20]', false], ['[2, 4]', false]],
        'filter keeps 2, 4 and 6, map makes them 20, 40 and 60, and limit(2) stops after the first two, so 6 is never mapped.'),
    ],
  },
];
