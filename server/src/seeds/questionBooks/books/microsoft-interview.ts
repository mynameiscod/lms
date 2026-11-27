import { SeedBook, ALL_YEARS } from '../types';

/**
 * Microsoft interview questions for freshers (SDE / Software Engineer style).
 * Hiring patterns change every year, so process facts are phrased as "typically" / "in recent drives".
 * Python is Python 3.
 */
const book: SeedBook = {
  slug: 'microsoft-interview',
  title: 'Microsoft Interview Questions',
  kind: 'company',
  subject: 'Microsoft',
  description: 'Microsoft fresher prep: hiring rounds, online-assessment style code reading, OOP/OS/DBMS and design basics, medium/hard DSA in Python and growth-mindset behavioural answers.',
  color: '#0369a1',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 110,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Microsoft typically hire freshers for software engineering roles?`,
          a: `The exact process changes by year, campus and team, so always check the official Microsoft careers site and your placement cell's notice. In recent drives fresher hiring has typically looked like this:

1. **Application**: campus placement, the Microsoft careers site or a referral, for full-time or internship roles.
2. **Online assessment (OA)**: usually timed coding problems on an online platform.
3. **Technical interviews**: commonly two to four rounds of problem solving and coding, often with CS fundamentals, project discussion and sometimes basic design.
4. **Final round**: often with a senior engineer or manager, mixing a technical problem with behavioural and culture questions (frequently called the "AA" round, see the next question).
5. **Offer**: decisions are based on feedback from all interviewers.

Interviews can be on a whiteboard, a shared editor or paper, so practise writing complete code without an IDE.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Expect to write full working code, not pseudocode, and to test it yourself.`,
        },
        {
          q: `What is usually in the Microsoft online assessment and how should you approach it?`,
          a: `In recent campus drives the Microsoft OA has typically been a short, timed **coding test** (a small number of problems) on a third-party platform, scored on hidden test cases that include large inputs. Some drives have also had MCQs on code output and CS basics. The format varies, so read the instructions in your invite.

Common problem areas: arrays and strings, hashing, two pointers, greedy, sorting, binary search, trees, BFS/DFS and DP.

How to approach it:
- **Read constraints first**: if n can be 100,000, an O(n²) solution will time out even if it passes the samples.
- **Test edge cases** yourself: empty input, one element, all equal, negatives, maximum sizes.
- **Correctness first, then speed**: a correct O(n log n) beats a buggy O(n).
- Since only hidden tests decide the score, write a few of your own tests in the editor before submitting.
- Manage time: if stuck for 15 minutes, submit the brute force for partial credit and move on.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Partial scores on hidden tests often count: never leave a problem with nothing submitted.`,
        },
        {
          q: `What is the "AA" (As Appropriate) round in Microsoft interviews?`,
          a: `Candidates commonly describe the last Microsoft interview as the **AA (As Appropriate)** round. It is usually taken by a senior engineer or hiring manager, and it tends to happen when earlier rounds went well (though not reaching it is not a fixed rule, and processes differ by team).

What it usually covers:
- A **technical problem**, sometimes more open-ended than earlier rounds, with follow-ups on scale, edge cases or alternative approaches.
- A **deep dive into your project or internship**: why you chose a design, what broke, what you would change.
- **Behavioural and culture questions**: learning from failure, teamwork, handling disagreement, customer focus, and **growth mindset**.

How to prepare:
- Know every project on your resume in depth, including numbers and trade-offs.
- Prepare 6–8 STAR stories about learning, collaboration and failure.
- Ask thoughtful questions at the end about the team and the work.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Treat the AA round as both technical and cultural; a strong coder who sounds closed to feedback can still miss out.`,
        },
        {
          q: `What do Microsoft interviewers evaluate in a technical round?`,
          a: `Besides reaching a correct solution, interviewers usually note:

- **Clarifying questions**: input format, size, edge cases. Microsoft problems are sometimes deliberately vague.
- **Problem-solving approach**: brute force first, then improvement, with clear reasoning.
- **Coding**: complete, clean, compilable code with good names; no "I'll fill this in later" gaps.
- **Testing**: Microsoft has a strong culture of quality, so you may be asked "How would you test this?" Expect to list normal, boundary, invalid and large-input cases.
- **Complexity analysis**: correct time and space.
- **Communication and collaboration**: thinking aloud, taking hints well, treating the interviewer as a teammate.

A reliable structure for each problem: restate the problem, ask questions, give an example, outline the approach and complexity, code, then dry-run and test.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `After coding, say "Let me test this" and trace an edge case before the interviewer asks.`,
        },
        {
          q: `How should a fresher prepare for Microsoft interviews?`,
          a: `A focused plan of about two months:

- **DSA core (weeks 1–4)**: arrays, strings, hashing, two pointers, sliding window, stacks, linked lists, trees and BSTs, heaps, binary search. Microsoft has a reputation for tree, linked-list and string problems, so practise those well.
- **Advanced topics (weeks 5–6)**: graphs (BFS, DFS, topological sort), recursion and backtracking, dynamic programming (1-D, 2-D, strings).
- **CS fundamentals**: OOP, OS (processes, threads, memory, scheduling), DBMS (normalization, transactions, indexing), networks basics, plus fresher-level design (classes for a parking lot, LRU cache, scaling basics).
- **Projects**: be ready to explain design choices, bugs you fixed and what you would improve.
- **Mocks (weeks 7–8)**: timed problems on paper or a plain editor, explained aloud.
- **Behavioural**: STAR stories for growth mindset, collaboration, failure and feedback.

Revise one language deeply (Python, Java or C++) rather than switching between several.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Practise writing code by hand at least a few times; whiteboard-style rounds still happen.`,
        },
        {
          q: `What are the usual ways to apply to Microsoft, and how should your resume look?`,
          a: `Common routes (depending on the year and your college):

- **Campus placement** for full-time and internship roles; your placement cell shares eligibility rules.
- **Microsoft careers site**: search for university or entry-level software engineering roles in India.
- **Referral**: from someone who knows your work, with the specific job ID.
- **Internships**: a good internship can lead to a pre-placement offer, depending on performance and openings.

Resume tips:
- One page, with projects and internships first if your CGPA is not your strongest point.
- For each project: what it does, your role, tech used and a measurable result ("handled 1,000 concurrent users in a load test").
- List only languages and tools you can answer questions on.
- Add links to GitHub or a deployed project that actually works.

Microsoft never asks candidates for money to process an application; treat any such message as a scam.`,
          d: 'easy',
          at: 'Microsoft',
        },
        {
          q: `What is "growth mindset" and why does Microsoft talk about it so much?`,
          a: `**Growth mindset** is the belief that abilities can be developed through effort, learning and feedback, as opposed to a **fixed mindset**, which treats ability as something you either have or do not. The idea comes from psychologist Carol Dweck's research.

At Microsoft it is a central part of the culture that CEO Satya Nadella has promoted, often summed up as moving from being "know-it-alls" to "learn-it-alls". Microsoft's stated mission is "to empower every person and every organization on the planet to achieve more", and its culture pages also stress customer focus, diversity and inclusion, and working as **One Microsoft** across teams.

What this means in interviews:
- You may be asked about failures, feedback and learning something hard.
- Interviewers notice how you react to hints: curious and open is good, defensive is not.
- Saying "I don't know, but here is how I would figure it out" is better than bluffing.

Prepare real examples where you learned from a mistake or picked up a new skill quickly.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Do not just define growth mindset; show it with a story where feedback changed what you did.`,
        },
        {
          q: `In a Microsoft interview you are asked, "How would you test this function?" How should you answer?`,
          a: `Answer in categories so you sound systematic. Example: testing a function \`find_max(nums)\`.

- **Normal cases**: \`[3, 1, 4]\` returns 4.
- **Boundary cases**: single element \`[7]\`; maximum at the first or last position; all elements equal.
- **Special values**: negatives only \`[-5, -2, -9]\` (a bug starting \`max = 0\` fails here); very large or very small numbers.
- **Invalid input**: empty list (should it raise an error or return None? ask!), \`None\`, wrong types.
- **Performance**: a list of a million elements finishes in linear time.
- **Repeat/consistency**: the function does not change the input list.

\`\`\`python
def find_max(nums):
    if not nums:
        raise ValueError("empty list")
    best = nums[0]
    for x in nums[1:]:
        if x > best:
            best = x
    return best

assert find_max([3, 1, 4]) == 4
assert find_max([-5, -2, -9]) == -2
assert find_max([7]) == 7
\`\`\`

For a larger feature (e.g. a login page), also mention functional, UI, security, accessibility and load testing.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Always include "negative numbers only" and "empty input": they expose the most common bugs.`,
        },
      ],
    },
    {
      title: 'Online assessment (test style)',
      questions: [
        {
          q: `What does this code print?

\`\`\`python
def f(x):
    c = 0
    while x:
        x &= x - 1
        c += 1
    return c

print(f(29))
\`\`\`

A) 3  B) 4  C) 5  D) 29`,
          a: `**Answer: B) 4**

\`x & (x - 1)\` clears the **lowest set bit** of x. So the loop runs once for every 1-bit, and the function counts set bits (Brian Kernighan's method).

29 in binary is **11101**, which has four 1-bits. Trace:
- 11101 & 11100 = 11100 (c = 1)
- 11100 & 11011 = 11000 (c = 2)
- 11000 & 10111 = 10000 (c = 3)
- 10000 & 01111 = 00000 (c = 4)

The loop stops at 0 and returns **4**. Its running time is O(number of set bits), better than checking all 32 bits. Python's \`bin(29).count("1")\` gives the same answer.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `x & (x - 1) == 0 also tests whether x (> 0) is a power of two.`,
        },
        {
          q: `What is the time complexity of \`solve(a)\` for a list of length n?

\`\`\`python
def solve(a):
    if len(a) <= 1:
        return
    mid = len(a) // 2
    solve(a[:mid])
    solve(a[mid:])
    for x in a:
        pass
\`\`\`

A) O(n)  B) O(log n)  C) O(n log n)  D) O(n²)`,
          a: `**Answer: C) O(n log n)**

Each call on n elements:
- makes **two** recursive calls on halves (the slices cost O(n) to create),
- then loops over all n elements: O(n).

So **T(n) = 2T(n/2) + O(n)**, the same recurrence as merge sort.

Recursion-tree view: there are about log₂ n levels; at each level the total size of all sub-lists is n, so each level costs O(n). Total: O(n) × log n = **O(n log n)**.

By the Master Theorem: a = 2, b = 2, f(n) = n = n^(log₂2), which is the "equal" case, giving Θ(n log n).

If the loop were missing, T(n) = 2T(n/2) + O(1) would give O(n) (ignoring slicing); if it made only one recursive call, T(n) = T(n/2) + O(n) would give O(n).`,
          d: 'medium',
          at: 'Microsoft',
        },
        {
          q: `What does this print?

\`\`\`python
s = "interview"
print(s[::-1][2:5])
\`\`\`

A) "ter"  B) "ivr"  C) "wei"  D) "rvi"`,
          a: `**Answer: B) "ivr"**

Step 1: \`s[::-1]\` reverses the string. "interview" reversed is **"weivretni"**.

Step 2: index the reversed string:

| index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| char | w | e | i | v | r | e | t | n | i |

\`[2:5]\` takes indices 2, 3 and 4 (the end index is excluded): **"i", "v", "r"**, which gives **"ivr"**.

Remember: slicing never raises an IndexError for out-of-range bounds; \`s[2:100]\` simply stops at the end.`,
          d: 'easy',
          at: 'Microsoft',
        },
        {
          q: `This palindrome check crashes. Which change fixes it?

\`\`\`python
def is_palindrome(s):
    i, j = 0, len(s)
    while i < j:
        if s[i] != s[j]:
            return False
        i += 1
        j -= 1
    return True
\`\`\`

A) while i <= j  B) j = len(s) - 1  C) i = 1  D) return False at the end`,
          a: `**Answer: B) \`j = len(s) - 1\`**

Indices of a string of length n run from 0 to n − 1. Starting \`j = len(s)\` makes the first comparison read \`s[len(s)]\`, which raises **IndexError** for any non-empty string.

With \`j = len(s) - 1\`:
- "racecar": compares r-r, a-a, c-c, then i == j at "e" and the loop stops: returns True.
- "abca": a-a, then b vs c: returns False.
- "": j = −1, the loop never runs: returns True (an empty string is a palindrome).

Why not A: \`i <= j\` would still read \`s[len(s)]\` first; and comparing the middle character with itself is harmless but unnecessary. C skips the first character, and D makes every input False.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `For any two-pointer code, check the very first comparison with a 1-character input.`,
        },
        {
          q: `What is the smaller angle between the hour and minute hands of a clock at 3:40?

A) 120°  B) 130°  C) 140°  D) 150°`,
          a: `**Answer: B) 130°**

- The **minute hand** moves 6° per minute: 40 × 6 = **240°** from 12.
- The **hour hand** moves 30° per hour plus 0.5° per minute: 3 × 30 + 40 × 0.5 = 90 + 20 = **110°**.
- Difference: 240 − 110 = **130°**.

Since 130° is less than 180°, it is already the smaller angle (the other side is 230°).

Shortcut formula: angle = |30H − 5.5M| = |90 − 220| = 130°. If the result is above 180°, subtract it from 360°.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `The common mistake is forgetting the hour hand also moves: 0.5° every minute.`,
        },
        {
          q: `What does this code print?

\`\`\`python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])
\`\`\`

A) [0, 1, 2]  B) [2, 2, 2]  C) [0, 0, 0]  D) NameError`,
          a: `**Answer: B) [2, 2, 2]**

Each lambda captures the **variable** \`i\`, not its value at creation time (late binding). The lambdas run only after the comprehension has finished, when \`i\` is 2 inside that comprehension's scope. So all three return 2.

It is not a NameError: the comprehension's scope is kept alive by the closures, so \`i\` is still reachable.

Fix by binding the current value as a default argument (defaults are evaluated when the lambda is created):

\`\`\`python
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])   # [0, 1, 2]
\`\`\`

Or use \`functools.partial\`. The same late-binding behaviour applies to nested functions defined in a loop, a common source of bugs with callbacks.`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Closures capture variables, not values: remember the i=i default-argument trick.`,
        },
        {
          q: `This function should detect a cycle in a directed graph, but it wrongly returns True for graph = {'A': ['B', 'C'], 'B': ['D'], 'C': ['D'], 'D': []}. What is the fix?

\`\`\`python
def has_cycle(graph):
    visited = set()
    def dfs(u):
        visited.add(u)
        for v in graph[u]:
            if v in visited:
                return True
            if dfs(v):
                return True
        return False
    return any(dfs(u) for u in graph if u not in visited)
\`\`\`

A) Use BFS instead of DFS  B) Also track the nodes on the current DFS path, and report a cycle only when v is on that path  C) Clear visited before each dfs call  D) Sort the adjacency lists`,
          a: `**Answer: B**

The graph is a DAG (A→B→D and A→C→D, no cycle). DFS visits A, B, D; then from C it sees D already **visited** and returns True. But D was finished on another branch; reaching it again is a "cross edge", not a cycle.

In a directed graph, a cycle exists only if you reach a node that is **still on the current recursion path** (a back edge). Keep a second set for that path:

\`\`\`python
def has_cycle(graph):
    visited, on_path = set(), set()
    def dfs(u):
        visited.add(u)
        on_path.add(u)
        for v in graph[u]:
            if v in on_path:
                return True
            if v not in visited and dfs(v):
                return True
        on_path.remove(u)
        return False
    return any(dfs(u) for u in graph if u not in visited)

print(has_cycle({'A': ['B', 'C'], 'B': ['D'], 'C': ['D'], 'D': []}))  # False
print(has_cycle({'A': ['B'], 'B': ['C'], 'C': ['A']}))                # True
\`\`\`

O(V + E) time. C would make it correct but exponential in the worst case. (For **undirected** graphs the rule differs: ignore the parent edge.)`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Directed cycle = back edge to a node on the current path (white/grey/black colouring).`,
        },
        {
          q: `100 doors are all closed. Person 1 toggles every door, person 2 toggles every 2nd door, person 3 every 3rd door, and so on up to person 100. How many doors are open at the end?

A) 1  B) 10  C) 50  D) 0`,
          a: `**Answer: B) 10**

Door number d is toggled once by every person k that **divides** d. So the number of toggles equals the number of divisors of d.

A door ends **open** only if it was toggled an **odd** number of times.

Divisors usually come in pairs (for 12: 1×12, 2×6, 3×4), giving an even count. The only exception is a **perfect square**, where one pair is the same number twice (for 16: 4×4), so the divisor count is odd.

Perfect squares from 1 to 100: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, which is **10 doors**.

Quick check with door 6: toggled by 1, 2, 3, 6 → 4 times → closed. Door 9: toggled by 1, 3, 9 → 3 times → open.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Odd number of divisors happens only for perfect squares: a pattern that shows up in many puzzles.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `What is the difference between an abstract class and an interface?`,
          a: `Both define a contract that subclasses must follow, but they differ in purpose:

| | Abstract class | Interface |
|---|---|---|
| Relationship | "is-a" (a base type) | "can-do" (a capability) |
| State | Can have fields and constructors | No instance state (Java: only constants) |
| Methods | Abstract and concrete methods | Abstract methods; Java 8+ and C# 8+ also allow default methods |
| Inheritance | A class extends only one (Java/C#) | A class can implement many |

Example: \`Vehicle\` is an abstract class with a shared \`fuel_level\` field and an abstract \`move()\`; \`Serializable\` or \`IComparable\` (C#) is an interface any unrelated class can implement.

Python has no separate interface keyword; you use the \`abc\` module:

\`\`\`python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self): ...

class Square(Shape):
    def __init__(self, side):
        self.side = side
    def area(self):
        return self.side * self.side

print(Square(3).area())   # 9; Shape() itself raises TypeError
\`\`\`

Rule of thumb: use an abstract class to share code among closely related types; use an interface to give unrelated types a common ability.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `C# is common at Microsoft: mentioning IComparable or IDisposable as interface examples helps.`,
        },
        {
          q: `Explain method overloading vs overriding. How does runtime polymorphism work internally?`,
          a: `- **Overloading** (compile-time polymorphism): same method name, different parameter lists, in the same class. The compiler picks the version from the argument types. Example (Java/C#): \`add(int, int)\` and \`add(double, double)\`. Python does not support it directly (the last definition wins); default arguments are used instead.
- **Overriding** (runtime polymorphism): a subclass provides its own version of a method with the same signature as the parent. The version called depends on the **actual object type**, decided at runtime.

\`\`\`java
Shape s = new Circle();
s.draw();   // calls Circle.draw(), even though the reference type is Shape
\`\`\`

**How it works internally** (C++, and similarly in Java/C#): each class with virtual methods has a **virtual method table (vtable)**, an array of pointers to its method implementations. Each object holds a hidden pointer to its class's vtable. A virtual call looks up the method in the object's vtable at runtime, so the subclass's override is called.

Notes: in C++ a method must be marked \`virtual\` to be overridden polymorphically; in C# you use \`virtual\`/\`override\`; in Java non-static, non-final, non-private methods are virtual by default.`,
          d: 'medium',
          at: 'Microsoft',
        },
        {
          q: `Explain common CPU scheduling algorithms.`,
          a: `The scheduler decides which ready process runs on the CPU next. Common algorithms:

- **FCFS (First Come First Served)**: run in arrival order. Simple, but a long job delays short ones (the **convoy effect**).
- **SJF (Shortest Job First)**: run the job with the smallest burst time; gives the minimum average waiting time, but burst times must be predicted and long jobs can **starve**. Its preemptive form is **SRTF** (Shortest Remaining Time First).
- **Priority scheduling**: highest priority first; can starve low-priority jobs. Fix: **aging** (slowly raise the priority of waiting jobs).
- **Round Robin**: each process gets a fixed **time quantum** in turn; good response time for interactive systems. Too small a quantum causes too many context switches; too large behaves like FCFS.
- **Multilevel (feedback) queue**: several queues with different priorities and algorithms; processes can move between queues based on behaviour. Real OSes (including Windows, which uses priority-based preemptive scheduling) use variants of these ideas.

Key metrics: turnaround time = completion − arrival; waiting time = turnaround − burst; response time = first run − arrival.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Be ready to compute average waiting time for 3–4 processes with FCFS and SJF on paper.`,
        },
        {
          q: `What is virtual memory? Explain paging, page faults and thrashing.`,
          a: `**Virtual memory** gives each process its own large, private address space, independent of how much physical RAM exists. The OS and the hardware **MMU** translate virtual addresses to physical ones.

**Paging**:
- Virtual memory is split into fixed-size **pages** (commonly 4 KB) and physical memory into **frames** of the same size.
- A **page table** per process maps page number → frame number. A **TLB** (Translation Lookaside Buffer) caches recent translations to make this fast.
- Pages that are not in RAM can live on disk (swap / page file).

**Page fault**: the process touches a page not currently in RAM. The OS pauses it, loads the page from disk into a free frame (evicting one if needed, using a replacement policy such as **LRU**, FIFO or Clock), updates the page table and resumes the process. Disk access is far slower than RAM, so faults are expensive.

**Thrashing**: when processes' **working sets** do not fit in RAM, the system spends most of its time swapping pages in and out, and CPU utilisation collapses. Fixes: reduce the number of running processes, add RAM, or use working-set / page-fault-frequency control.

Benefits of virtual memory: isolation between processes, running programs larger than RAM, and sharing (e.g. shared libraries mapped into many processes).`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Mention the TLB; it shows you know why paging does not make every memory access twice as slow.`,
        },
        {
          q: `What is normalization? Explain 1NF, 2NF and 3NF with an example.`,
          a: `**Normalization** organises tables to reduce redundancy and avoid update, insert and delete anomalies.

Start with: \`Orders(order_id, customer_name, customer_city, product_ids, product_name)\`.

- **1NF**: every column holds atomic values; no repeating groups. A cell like \`product_ids = "P1, P2"\` breaks 1NF, so split it into one row per (order_id, product_id).
- **2NF**: 1NF, and every non-key column depends on the **whole** primary key. With key (order_id, product_id), \`product_name\` depends only on product_id (a partial dependency), so move it to \`Products(product_id, product_name)\`.
- **3NF**: 2NF, and no **transitive** dependency (non-key → non-key). If \`customer_city\` depends on \`customer_name\`, which depends on order_id, move customer details to \`Customers(customer_id, name, city)\` and keep only \`customer_id\` in Orders.

Result: \`Customers\`, \`Products\`, \`Orders(order_id, customer_id)\`, \`OrderItems(order_id, product_id, qty)\`.

**BCNF** is a stricter 3NF: every determinant must be a candidate key. Sometimes tables are **denormalized** on purpose for faster reads in reporting systems.`,
          d: 'easy',
          at: 'Microsoft',
        },
        {
          q: `Explain ACID properties and transaction isolation levels with the anomalies each prevents.`,
          a: `**ACID**:
- **Atomicity**: all operations of a transaction happen or none do (money debited and credited, or neither).
- **Consistency**: a transaction moves the database from one valid state to another (constraints hold).
- **Isolation**: concurrent transactions do not see each other's intermediate results inappropriately.
- **Durability**: once committed, changes survive crashes (write-ahead log).

**Anomalies**:
- **Dirty read**: reading another transaction's uncommitted change.
- **Non-repeatable read**: reading the same row twice and getting different values because another transaction committed an update in between.
- **Phantom read**: running the same range query twice and getting new rows inserted by another transaction.

**Isolation levels** (SQL standard):

| Level | Dirty | Non-repeatable | Phantom |
|---|---|---|---|
| Read Uncommitted | possible | possible | possible |
| Read Committed | prevented | possible | possible |
| Repeatable Read | prevented | prevented | possible* |
| Serializable | prevented | prevented | prevented |

*Engines differ: MySQL InnoDB's Repeatable Read prevents most phantoms; SQL Server defaults to Read Committed. Higher isolation means more locking or versioning, so lower concurrency.`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Explain each anomaly with a two-transaction timeline; it is clearer than definitions alone.`,
        },
        {
          q: `Explain load balancing, caching, and horizontal vs vertical scaling, at a fresher level.`,
          a: `**Vertical scaling (scale up)**: give one server more CPU, RAM or disk. Simple, no code changes, but there is a hardware limit and the single server is a single point of failure.

**Horizontal scaling (scale out)**: add more servers and spread the load. Practically unlimited and more fault-tolerant, but the application should be **stateless** (keep sessions in a shared store, not in server memory).

**Load balancer**: sits in front of servers and distributes requests using algorithms like **round robin**, **least connections** or **IP hash**. It runs **health checks** and stops sending traffic to failed servers. Cloud platforms such as Azure provide managed load balancers.

**Caching**: store frequently read data in fast memory to avoid repeated slow work.
- Places: browser, **CDN** (static files near users), application cache (e.g. Redis), database buffer.
- Patterns: **cache-aside** (app checks cache, else reads DB and fills cache).
- Problems: **stale data** (use TTL or invalidate on write) and eviction policy (often **LRU**).

Example: a news site handles a traffic spike by putting articles in a cache and a CDN, and adding app servers behind a load balancer.`,
          d: 'medium',
          at: 'Microsoft',
        },
        {
          q: `Design the classes for a parking lot system (object-oriented design).`,
          a: `**Clarify requirements**: multiple floors; spot sizes (small, medium, large); vehicles (bike, car, truck); issue a ticket on entry, charge on exit by duration.

**Core classes**
- \`Vehicle\` (abstract) with \`plate\`, \`size\`; subclasses \`Bike\`, \`Car\`, \`Truck\`.
- \`ParkingSpot\` with \`id\`, \`size\`, \`vehicle\` (None when free), \`can_fit(vehicle)\`.
- \`Floor\` holding spots, \`find_spot(vehicle)\`.
- \`Ticket\` with \`id\`, \`vehicle\`, \`spot\`, \`entry_time\`.
- \`ParkingLot\` (one instance) with floors, \`park(vehicle)\` returning a Ticket and \`leave(ticket)\` returning the fee.
- \`PricingStrategy\` interface (hourly, flat), so pricing can change without touching \`ParkingLot\`.

\`\`\`python
class ParkingSpot:
    ORDER = {"S": 0, "M": 1, "L": 2}
    def __init__(self, sid, size):
        self.id, self.size, self.vehicle = sid, size, None
    def can_fit(self, v):
        return self.vehicle is None and self.ORDER[v.size] <= self.ORDER[self.size]
\`\`\`

**Design points to mention**: encapsulation (spots manage their own state), the **Strategy** pattern for pricing, a free-spot list per size for O(1) lookup instead of scanning, and locking when two entry gates assign spots at once.`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Spend the first minutes on requirements and entities; jumping into code is the most common OOD mistake.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Reverse the order of words in a string. Remove extra spaces. Example: "  the sky  is blue " gives "blue is sky the".`,
          a: `**Approach**: split on whitespace (which drops empty pieces and extra spaces), reverse the list of words, and join with single spaces.

**Complexity**: O(n) time and O(n) space.

\`\`\`python
def reverse_words(s: str) -> str:
    return " ".join(reversed(s.split()))

print(reverse_words("  the sky  is blue "))  # "blue is sky the"
print(reverse_words("hello"))                # "hello"
print(reverse_words("   "))                  # ""
\`\`\`

Interviewers may ask you to do it **without split**, which shows you can work with indices:

\`\`\`python
def reverse_words_manual(s: str) -> str:
    words, i, n = [], 0, len(s)
    while i < n:
        while i < n and s[i] == " ":
            i += 1
        j = i
        while j < n and s[j] != " ":
            j += 1
        if i < j:
            words.append(s[i:j])
        i = j
    return " ".join(words[::-1])

print(reverse_words_manual("  the sky  is blue "))  # "blue is sky the"
\`\`\`

In C++ with a mutable string, the in-place trick is: reverse the whole string, then reverse each word.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Mention the in-place "reverse all, then reverse each word" trick for O(1) extra space.`,
        },
        {
          q: `Check whether a binary tree is a valid binary search tree (BST).`,
          a: `**Approach: pass allowed bounds down the tree.**

Checking only that each node is greater than its left child and less than its right child is **wrong**: a node deep in the left subtree must also be smaller than the root. So each node must lie strictly within (low, high), where the bounds come from its ancestors.

**Complexity**: O(n) time, O(h) recursion space.

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root, low=float('-inf'), high=float('inf')):
    if root is None:
        return True
    if not (low < root.val < high):
        return False
    return (is_valid_bst(root.left, low, root.val) and
            is_valid_bst(root.right, root.val, high))

good = TreeNode(5, TreeNode(3, TreeNode(2), TreeNode(4)), TreeNode(8))
bad = TreeNode(5, TreeNode(3, None, TreeNode(6)), TreeNode(8))  # 6 is in 5's left subtree
print(is_valid_bst(good))  # True
print(is_valid_bst(bad))   # False
\`\`\`

Alternative: an **in-order traversal** of a BST must be strictly increasing; keep the previous value and compare.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Show the counter-example tree that breaks the "compare with children only" approach.`,
        },
        {
          q: `Design an LRU (Least Recently Used) cache with O(1) get and put.`,
          a: `**Approach**: a hash map for O(1) lookup plus an ordering of keys by recent use. In an interview you can explain the classic structure, a **hash map + doubly linked list** (move a node to the front on use, evict from the tail), and in Python implement it with \`OrderedDict\`, which is exactly that internally.

- \`get(key)\`: if missing return -1; else move the key to the "most recent" end and return the value.
- \`put(key, value)\`: insert or update, move to the most-recent end; if size exceeds capacity, remove the **least recent** key.

**Complexity**: O(1) for both operations; O(capacity) space.

\`\`\`python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.data:
            return -1
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key: int, value: int) -> None:
        if key in self.data:
            self.data.move_to_end(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)   # evict least recent

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))   # 1   (1 is now most recent)
c.put(3, 3)       # evicts key 2
print(c.get(2))   # -1
print(c.get(3))   # 3
\`\`\``,
          d: 'medium',
          at: 'Microsoft',
          tip: `If asked not to use OrderedDict, write the doubly linked list with dummy head and tail nodes.`,
        },
        {
          q: `Return all elements of an m x n matrix in spiral order.`,
          a: `**Approach: shrink four boundaries.**

Keep \`top\`, \`bottom\`, \`left\`, \`right\`. Walk right along the top row, down the right column, left along the bottom row, up the left column, shrinking the boundary after each side. Check the boundaries again before the bottom row and left column so a single remaining row or column is not added twice.

**Complexity**: O(m × n) time, O(1) extra space besides the output.

\`\`\`python
def spiral_order(matrix):
    if not matrix:
        return []
    res = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            res.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            res.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                res.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                res.append(matrix[r][left])
            left += 1
    return res

print(spiral_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))       # [1, 2, 3, 6, 9, 8, 7, 4, 5]
print(spiral_order([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]))  # [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
print(spiral_order([[1], [2], [3]]))                          # [1, 2, 3]
\`\`\``,
          d: 'medium',
          at: 'Microsoft',
          tip: `Test a single row and a single column: they catch the double-counting bug.`,
        },
        {
          q: `Serialize a binary tree to a string and deserialize it back to the same tree.`,
          a: `**Approach: pre-order traversal with null markers.**

- **Serialize**: visit node, then left, then right; write \`#\` for a missing child. The null markers make the tree shape unambiguous, so pre-order alone is enough.
- **Deserialize**: read tokens in the same order with an iterator; \`#\` means None, otherwise create the node and recursively build its left then right subtree.

**Complexity**: O(n) time and O(n) space for both.

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def serialize(root):
    out = []
    def go(node):
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        go(node.left)
        go(node.right)
    go(root)
    return ",".join(out)

def deserialize(data):
    tokens = iter(data.split(","))
    def build():
        t = next(tokens)
        if t == "#":
            return None
        node = TreeNode(int(t))
        node.left = build()
        node.right = build()
        return node
    return build()

root = TreeNode(1, TreeNode(2), TreeNode(3, TreeNode(4), TreeNode(5)))
s = serialize(root)
print(s)                          # 1,2,#,#,3,4,#,#,5,#,#
print(serialize(deserialize(s)))  # same string: round trip works
\`\`\`

For very deep trees, Python's recursion limit can be hit; a level-order (BFS) version with a queue avoids that.`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Explain why null markers are needed: pre-order values alone cannot tell left children from right ones.`,
        },
        {
          q: `Find the longest palindromic substring in a string. Example: "babad" gives "bab" (or "aba").`,
          a: `**Approach: expand around centres.**

A palindrome mirrors around its centre. There are 2n − 1 centres: each character (odd length) and each gap between two characters (even length). From each centre, expand while both ends match, and remember the longest.

**Complexity**: O(n²) time, O(1) extra space. (Manacher's algorithm gives O(n) but is rarely expected.)

\`\`\`python
def longest_palindrome(s: str) -> str:
    if not s:
        return ""
    start, end = 0, 0          # best window s[start:end+1]
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l -= 1
            r += 1
        return l + 1, r - 1    # last valid window
    for i in range(len(s)):
        for l, r in (expand(i, i), expand(i, i + 1)):
            if r - l > end - start:
                start, end = l, r
    return s[start:end + 1]

print(longest_palindrome("babad"))   # "bab"
print(longest_palindrome("cbbd"))    # "bb"
print(longest_palindrome("a"))       # "a"
print(longest_palindrome("forgeeksskeegfor"))  # "geeksskeeg"
\`\`\`

A DP table \`dp[i][j]\` (is s[i..j] a palindrome) also works in O(n²) time but needs O(n²) space.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Do not forget even-length centres; "cbbd" is the test that catches it.`,
        },
        {
          q: `Edit distance: find the minimum number of insert, delete or replace operations to convert word1 into word2.`,
          a: `**Approach: 2-D dynamic programming.**

\`dp[i][j]\` = edit distance between the first i characters of word1 and the first j of word2.
- Base: \`dp[i][0] = i\` (delete all), \`dp[0][j] = j\` (insert all).
- If \`word1[i-1] == word2[j-1]\`: \`dp[i][j] = dp[i-1][j-1]\` (no cost).
- Else: \`1 + min(dp[i-1][j]\` (delete), \`dp[i][j-1]\` (insert), \`dp[i-1][j-1]\` (replace)\`)\`.

**Complexity**: O(m × n) time and space (reducible to O(n) space with two rows).

\`\`\`python
def min_distance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]

print(min_distance("horse", "ros"))            # 3
print(min_distance("intention", "execution"))  # 5
print(min_distance("", "abc"))                 # 3
\`\`\`

"horse" → "rorse" (replace h) → "rose" (delete r) → "ros" (delete e): 3 operations.`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Say what each of the three neighbours means (delete, insert, replace); that is what interviewers check.`,
        },
        {
          q: `Merge all overlapping intervals. Example: [[1,3],[2,6],[8,10],[15,18]] gives [[1,6],[8,10],[15,18]].`,
          a: `**Approach: sort by start, then sweep.**

After sorting by start time, overlapping intervals are next to each other. Walk through them: if the current interval starts at or before the end of the last merged interval, extend that end; otherwise start a new merged interval.

**Complexity**: O(n log n) time for sorting, O(n) for the output.

\`\`\`python
def merge(intervals):
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda x: x[0])
    merged = [list(intervals[0])]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))  # [[1, 6], [8, 10], [15, 18]]
print(merge([[1, 4], [4, 5]]))                     # [[1, 5]]
print(merge([[1, 10], [2, 3], [4, 5]]))            # [[1, 10]]
\`\`\`

Two details interviewers check:
- Use \`max\` when extending: \`[1, 10]\` fully contains \`[2, 3]\`, so the end must stay 10.
- Decide whether touching intervals (\`[1, 4]\` and \`[4, 5]\`) merge; here \`<=\` merges them. Ask the interviewer.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Ask whether touching intervals should merge; it changes < to <=.`,
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Why do you want to join Microsoft?`,
          a: `Link Microsoft's mission and culture to your own experience. A model answer:

"Microsoft's mission, to empower every person and every organization on the planet to achieve more, is something I have seen in practice: I have used [a Microsoft product you really use, e.g. VS Code, GitHub, Azure, Teams] for [your project], and it made our team's work easier. I want to build software with that kind of reach.

Second, the culture of **growth mindset** suits how I work. In [your project or internship] I had to learn [a new technology] in a short time, and I enjoyed asking for feedback and improving. I want to start my career in a place that values learning over already knowing everything.

Third, the range of work, from developer tools and cloud to AI and accessibility, means I can keep growing technically. I am preparing for that by [a course, certification or side project]."

Avoid answers about only brand, salary or work-life balance; show you know what Microsoft builds and why it matters to you.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Mention one Microsoft product you actually use and what you would improve in it.`,
        },
        {
          q: `Tell me about a time you failed and what you learned from it. (Growth mindset)`,
          a: `**STAR model answer**

- **Situation**: "In my third year I entered a coding contest team event and also took on the backend of our department website at the same time."
- **Task**: "I promised the website would be ready before the department fest."
- **Action (what went wrong)**: "I underestimated the work and avoided telling anyone I was behind. Two days before the fest the login system still had bugs, and the faculty coordinator was disappointed."
- **Action (what I did)**: "I told the team honestly, asked a friend to help with testing, and we cut a non-essential feature to ship a stable version. Afterwards I asked the coordinator for feedback; she said the problem was not the delay but the late warning."
- **Result**: "Since then I break work into weekly milestones and share status early, even when it is bad news. In [your next project] I flagged a risk in week one, and we delivered on time."

This shows **growth mindset**: you own the failure, seek feedback, and change your behaviour. Avoid fake failures like "I am a perfectionist".`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Spend more time on what you changed afterwards than on the failure itself.`,
        },
        {
          q: `Describe a time you worked with a difficult teammate or had a conflict in a team. (Collaboration)`,
          a: `**STAR model answer**

- **Situation**: "In a four-member mini-project, one teammate often missed meetings and pushed code without telling anyone, which broke the build twice."
- **Task**: "I was coordinating the project and needed to fix this without damaging the team."
- **Action**: "I spoke to him privately rather than in the group chat. I asked what was going on; he had a part-time job and our meeting times clashed with it. We moved the stand-up to the evening, and I suggested we all use pull requests with one reviewer, so nobody's code could break the main branch, including mine. I also paired with him once to review his module."
- **Result**: "The build did not break again, he delivered his module on time, and he later handled the deployment for the final demo."

What this shows (Microsoft values working as **One Microsoft**, across people and teams):
- You assumed good intent and listened first.
- You fixed the **process**, not just the person.
- The outcome was good for the whole team.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Never criticise the teammate personally; describe behaviour and focus on how you solved it together.`,
        },
        {
          q: `Tell me about a time you received difficult feedback. How did you respond?`,
          a: `**STAR model answer**

- **Situation**: "During my internship at [company], I submitted my first major pull request: a feature for exporting reports."
- **Task**: "I expected quick approval, but my mentor left about 20 comments: unclear names, no tests, and a function doing too many things."
- **Action**: "My first reaction was disappointment, but I set up a 20-minute call to understand the reasoning behind the main comments instead of just fixing them one by one. I split the function into smaller ones, added unit tests and wrote down the review points as a personal checklist that I used before every later PR."
- **Result**: "My next PRs needed far fewer comments, and by the end of the internship my mentor asked me to review a new intern's code. I learned that feedback on my code is not criticism of me but the fastest way to improve."

Key message: you were open, asked questions, acted on it and can show the change. That is what "learn-it-all" looks like in practice.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Name a concrete habit you built from the feedback; it proves the change was real.`,
        },
        {
          q: `Tell me about a time you had to learn a new technology quickly.`,
          a: `**STAR model answer**

- **Situation**: "For [your project], we decided two weeks before submission to add real-time notifications, and nobody on the team had used WebSockets."
- **Task**: "I volunteered to learn it and build the feature."
- **Action**: "I first spent an evening on the official documentation and built a tiny chat demo to understand the basics before touching our code. Then I listed what we actually needed (connect, send event, reconnect on drop), built it in small steps, and asked a senior from my college for a 30-minute review. I wrote a one-page guide so my teammates could use it too."
- **Result**: "The feature worked in the demo; notifications reached users within about a second. I now follow the same approach for anything new: small working prototype first, then official docs, then ask for review."

This answer shows a learning **method**, not just that you learned once. Microsoft interviewers like candidates who are curious and can teach themselves, because tools and platforms keep changing.`,
          d: 'medium',
          at: 'Microsoft',
          tip: `Describe HOW you learn (prototype, docs, review); it is repeatable and convincing.`,
        },
        {
          q: `Tell me about the project you are most proud of.`,
          a: `Pick one project you know deeply and structure the answer so the interviewer can ask good follow-ups:

1. **What and why** (20 seconds): "[Project name] is a [type of app] that helps [users] to [problem solved]. I built it because [motivation]."
2. **Your role**: "I designed the database and built the REST APIs in [technology]; two teammates did the frontend."
3. **One hard problem**: "Search was slow with 50,000 records, so I added an index and pagination, which reduced response time from about 3 seconds to 200 ms."
4. **Result**: users, grade, deployment, a measurable outcome.
5. **What you would improve**: "I would add automated tests and caching."

Tips:
- Say "I" for your work and "we" for team work; interviewers want to know your contribution.
- Be ready for deep questions: why that database, how you handled errors, how it would scale to 10x users.
- Mentioning what you would do differently shows growth mindset.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `Prepare a 1-minute version and a 5-minute version of the same project.`,
        },
        {
          q: `Tell me about a time you disagreed with someone more senior. How did you handle it?`,
          a: `**STAR model answer**

- **Situation**: "In my internship, my team lead suggested skipping input validation on an internal tool to meet a deadline, since 'only employees use it'."
- **Task**: "I thought unvalidated input could corrupt the reporting data other teams relied on, but I was the newest person on the team."
- **Action**: "I first made sure I understood his reason: the deadline was fixed by a client demo. Then I asked for five minutes and showed a concrete example where a wrong date format crashed the nightly report in the test environment. I proposed a middle path: validate the three fields that feed the report now (about two hours of work) and the rest after the demo."
- **Result**: "He agreed, we met the deadline, and the nightly report never failed from bad input. He later asked me to add the remaining checks."

What interviewers look for:
- Respect and curiosity about the other person's reasons.
- Data or a demo instead of opinions.
- A practical compromise and, if overruled, full support for the final decision.`,
          d: 'hard',
          at: 'Microsoft',
          tip: `Show that you understood the senior's goal; disagreement should be about the approach, not the person.`,
        },
        {
          q: `Are you willing to relocate, and what questions will you ask the interviewer?`,
          a: `**Relocation**: Microsoft's engineering teams in India are based in a few cities, and the team you join decides the location. Answer honestly and positively:

"Yes, I am comfortable relocating wherever the team is. For my first role, the work and the people I learn from matter more to me than the city."

If you have a genuine constraint (family, health), mention it politely and early rather than accepting and backing out later.

**Good questions to ask at the end**:
- "What does onboarding look like for a new engineer on this team?"
- "How does the team gather feedback from customers or users of the product?"
- "What is a recent technical challenge the team solved that you are proud of?"
- "How do engineers here keep learning, for example through internal courses or hackathons?"
- "What separates the new graduates who do really well here?"

Skip salary and leave questions in technical rounds; the recruiter covers those.`,
          d: 'easy',
          at: 'Microsoft',
          tip: `A question about learning or feedback fits Microsoft's growth-mindset culture well.`,
        },
      ],
    },
  ],
};

export default book;
