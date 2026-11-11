import { SeedBook, ALL_YEARS } from '../types';

/**
 * Amazon interview questions for freshers (SDE-1 / SDE intern style).
 * Hiring patterns change every year, so process facts are phrased as "typically" / "in recent drives".
 * Python is Python 3.
 */
const book: SeedBook = {
  slug: 'amazon-interview',
  title: 'Amazon Interview Questions',
  kind: 'company',
  subject: 'Amazon',
  description: 'Amazon SDE fresher prep: hiring rounds, online-assessment style code reading, CS fundamentals, medium/hard DSA in Python and Leadership Principles STAR answers.',
  color: '#b45309',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 109,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Amazon typically hire freshers for software roles?`,
          a: `Amazon's fresher hiring for roles such as **SDE-1** or **SDE intern** usually follows this shape (it changes between years and campuses, so always check the official careers page and your placement cell's notice):

1. **Application** through campus placement, the Amazon careers site (amazon.jobs) or a referral.
2. **Online assessment (OA)**: typically coding problems plus work-style / work-simulation sections.
3. **Technical interviews**: commonly two to four rounds. Each mixes data structures and algorithms coding with **Leadership Principles (LP)** behavioural questions.
4. One of the rounds may involve a **bar raiser**, an experienced interviewer from outside the hiring team who protects the hiring standard.
5. **Debrief**: interviewers compare written feedback and a hiring decision is made.

Unlike many service companies, there is usually no separate "HR round" that only checks documents: behavioural questions are spread across every interview.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Prepare for coding and behavioural questions in EVERY round, not just the last one.`,
        },
        {
          q: `What does the Amazon online assessment usually contain?`,
          a: `In recent drives the Amazon OA for freshers has typically included some of these sections (the mix varies by year and role):

- **Coding**: usually a small number of DS/algo problems in a browser IDE, scored on hidden test cases. Expect arrays, strings, hashing, sliding window, heaps, graphs and simple DP.
- **Code debugging / code reading** (in some years): short snippets where you find a bug or predict the output.
- **Work Style Assessment**: a questionnaire of statements ("I prefer to act quickly even with incomplete data") mapped to Leadership Principles.
- **Work Simulation**: realistic workplace scenarios (emails, priorities, customer issues) where you pick the most and least effective response.

How to approach it:
- Read constraints first; an O(n²) answer may time out on large inputs.
- Handle edge cases: empty input, one element, duplicates, negatives.
- Answer the work-style sections honestly and consistently; they are checked for consistency, not trick answers.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Practise in a plain editor with no autocomplete, under a timer, before the real OA.`,
        },
        {
          q: `How should you answer Amazon's Work Style Assessment and Work Simulation?`,
          a: `Both sections check how you behave at work against the **Leadership Principles**, not your coding.

**Work Style Assessment**: you rate or choose between statements. Tips:
- Be honest but think about the principles: Amazon values **Customer Obsession**, **Ownership**, **Bias for Action** and **Deliver Results**.
- Stay consistent. The same trait is asked in different words; contradicting yourself hurts more than one "imperfect" answer.

**Work Simulation**: you play a new employee handling scenarios such as a customer complaint, a teammate missing a deadline or a conflict of priorities. Good answers usually:
- Put the **customer** first while staying within reason.
- **Take ownership** instead of escalating everything or blaming others.
- Use **data** before deciding (Dive Deep), but do not freeze when a decision is reversible (Bias for Action).
- Communicate early with your manager and stakeholders.

There is no way to "game" these sections reliably; reading the 16 principles on Amazon's site and reflecting on your own examples is the best preparation.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Read every option before choosing: two can look right, pick the one that fixes the customer problem and owns it.`,
        },
        {
          q: `What are Amazon's Leadership Principles and why do they matter in interviews?`,
          a: `The **Leadership Principles (LPs)** are the 16 values Amazon uses to hire and evaluate people. The list is published on Amazon's site and includes:

- **Customer Obsession**, **Ownership**, **Invent and Simplify**, **Are Right, A Lot**
- **Learn and Be Curious**, **Hire and Develop the Best**, **Insist on the Highest Standards**, **Think Big**
- **Bias for Action**, **Frugality**, **Earn Trust**, **Dive Deep**
- **Have Backbone; Disagree and Commit**, **Deliver Results**
- **Strive to be Earth's Best Employer**, **Success and Scale Bring Broad Responsibility**

Why they matter: interviewers are commonly assigned a few LPs each and ask behavioural questions such as "Tell me about a time you..." to collect evidence for them. A strong coder with weak LP answers can still be rejected.

Preparation: build a story bank of 8–10 real situations (projects, internships, college events, team conflicts) and map each to two or three LPs, told in **STAR** format.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Freshers rarely need all 16: be strongest on Customer Obsession, Ownership, Dive Deep, Bias for Action, Learn and Be Curious.`,
        },
        {
          q: `What is a "bar raiser" at Amazon and how is that round different?`,
          a: `A **bar raiser** is an experienced Amazonian, usually from a different team than the one hiring, who is trained to keep the hiring bar high. The idea is that every new hire should be better than at least half of the people already in that role.

How the round tends to feel:
- It can be a coding round, a behavioural round or both; you are often not told which interviewer is the bar raiser.
- Follow-up questions go deeper: "What exactly did **you** do?", "What data did you look at?", "What would you do differently?"
- The bar raiser's view carries significant weight in the debrief and they can block a hire, because their job is long-term quality, not filling a seat fast.

How to handle it:
- Use real, specific stories with numbers and your own actions ("I", not "we").
- Admit what went wrong in a story and what you learned.
- In coding, explain trade-offs and test your code without being asked.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Treat every round as the bar raiser round: depth and honesty beat polished but vague answers.`,
        },
        {
          q: `How should a fresher prepare for Amazon's coding interviews in about two months?`,
          a: `A practical 8-week plan:

- **Weeks 1–2: foundations.** Arrays, strings, hashing, two pointers, sliding window, prefix sums. Solve 3–4 problems a day, easy to medium.
- **Weeks 3–4: linear and tree structures.** Stacks, queues, monotonic deque, linked lists, binary trees, BST, recursion, binary search on answers.
- **Weeks 5–6: heaps, graphs, DP.** Top-K with heaps, BFS/DFS, topological sort, Dijkstra basics, 1-D and 2-D DP (knapsack, coin change, LIS, grid paths).
- **Week 7: mock interviews.** Solve on a whiteboard or plain editor, out loud, in 35–40 minutes, with a friend asking follow-ups.
- **Week 8: LP stories + revision.** Write 8–10 STAR stories, revise mistakes notebook, redo problems you failed.

During practice always state brute force first, then optimise, give time/space complexity, and dry-run with an edge case.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Keep a mistakes notebook: the pattern you missed once is the one you will miss again.`,
        },
        {
          q: `What are the common ways for a fresher to apply to Amazon?`,
          a: `Typical routes (availability depends on the year and your college):

- **Campus placement**: Amazon visits some colleges for SDE and internship roles. Your placement cell shares eligibility rules, which can include CGPA and backlog criteria.
- **Off-campus via amazon.jobs**: search "SDE" or "University" roles for India locations and apply with a one-page resume.
- **Employee referral**: a referral from a current employee can help your resume get reviewed; ask people you actually know, with the exact job ID.
- **Internships**: a strong internship can lead to a full-time offer, depending on performance and business needs.

Resume tips for Amazon:
- Lead with projects and internships, each with impact in numbers ("cut page load from 4s to 1.2s").
- Mention data structures, languages and tools you actually used.
- Keep it to one page and be ready to defend every line.

Be careful of fake "Amazon job" messages asking for fees; Amazon does not charge candidates to apply.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Apply to a specific job ID; generic emails to recruiters rarely work.`,
        },
        {
          q: `What does an Amazon interviewer look for during a coding round besides the correct answer?`,
          a: `Getting the right output is necessary but not enough. Interviewers usually write feedback on:

- **Problem understanding**: did you ask clarifying questions (input size, duplicates, negatives, empty input)?
- **Approach**: did you start with a brute force, then improve it, and explain why the better solution works?
- **Complexity**: can you state time and space complexity correctly?
- **Code quality**: readable names, small helper functions, no copy-paste blocks, correct handling of edge cases.
- **Testing**: did you dry-run your code with a normal case and an edge case and fix bugs yourself?
- **Communication**: did you think aloud so the interviewer could follow and give hints?
- **Coachability**: when given a hint, did you use it?

A good flow for 40 minutes: 5 minutes clarify, 5 minutes approach, 20 minutes code, 5–10 minutes test and discuss.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Silence is the biggest mistake: if you are stuck, say what you are trying and why.`,
        },
      ],
    },
    {
      title: 'Online assessment (test style)',
      questions: [
        {
          q: `What does this Python code print?

\`\`\`python
def add(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add(1))
print(add(2))
print(add(3, []))
\`\`\`

A) [1] / [2] / [3]  B) [1] / [1, 2] / [3]  C) [1] / [1, 2] / [1, 2, 3]  D) Error`,
          a: `**Answer: B) [1] / [1, 2] / [3]**

Default argument values are evaluated **once**, when the function is defined, not on every call. So the same list object is shared by every call that does not pass \`bucket\`.

- \`add(1)\`: default list becomes \`[1]\` and is printed.
- \`add(2)\`: the **same** default list becomes \`[1, 2]\`.
- \`add(3, [])\`: a new empty list is passed, so it prints \`[3]\`; the default list is untouched.

The usual fix:

\`\`\`python
def add(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
\`\`\``,
          d: 'medium',
          at: 'Amazon',
          tip: `Mutable defaults (list, dict, set) are a favourite code-reading trap. Use None as the default.`,
        },
        {
          q: `This binary search sometimes returns -1 even when the target is present. Which single change fixes it?

\`\`\`python
def search(a, target):
    lo, hi = 0, len(a) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] == target:
            return mid
        elif a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
\`\`\`

A) mid = (lo + hi + 1) // 2  B) while lo <= hi:  C) hi = mid  D) lo = mid`,
          a: `**Answer: B) \`while lo <= hi:\`**

With \`lo < hi\` the loop stops as soon as \`lo == hi\`, so the last remaining candidate is never checked.

Example: \`a = [5]\`, \`target = 5\`. Then \`lo = hi = 0\`, the loop body never runs, and the function returns -1.

Another: \`a = [1, 3]\`, \`target = 3\`. First \`mid = 0\`, \`a[0] = 1 < 3\` so \`lo = 1\`; now \`lo == hi == 1\` and the loop exits without checking \`a[1]\`.

With \`lo <= hi\`, the single remaining element is compared, and because both branches move \`lo\` or \`hi\` past \`mid\`, the loop always terminates.

Why not the others: C or D (\`hi = mid\` / \`lo = mid\`) with the current loop can cause an infinite loop or still skip elements; A changes only which middle is picked and does not fix the missed last element.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Check loop boundaries with a 1-element and 2-element array: most binary search bugs show up there.`,
        },
        {
          q: `What is the time complexity of this code?

\`\`\`python
for i in range(n):
    j = 1
    while j < n:
        j *= 2
\`\`\`

A) O(n)  B) O(log n)  C) O(n log n)  D) O(n²)`,
          a: `**Answer: C) O(n log n)**

- The outer loop runs **n** times.
- The inner loop starts at \`j = 1\` and doubles \`j\` each time: 1, 2, 4, 8, ... until \`j >= n\`. That takes about **log₂ n** steps.
- The inner loop does not depend on \`i\`, so total work is n × log₂ n.

Total: **O(n log n)**.

Compare: if the inner loop were \`while j < i\` it would still be O(n log n) overall (sum of log i for i up to n is about n log n), and if it were \`j += 1\` instead of \`j *= 2\` it would become O(n²).`,
          d: 'easy',
          at: 'Amazon',
          tip: `A variable that doubles or halves each step means a log factor.`,
        },
        {
          q: `What does this code print?

\`\`\`python
a = [1, 2, 3]
b = a
b.append(4)
c = a[:]
c.append(5)
print(a, len(c))
\`\`\`

A) [1, 2, 3] 4  B) [1, 2, 3, 4] 5  C) [1, 2, 3, 4, 5] 5  D) [1, 2, 3, 4] 4`,
          a: `**Answer: B) [1, 2, 3, 4] 5**

- \`b = a\` does **not** copy the list; \`a\` and \`b\` are two names for the same object. So \`b.append(4)\` changes \`a\` too: \`a = [1, 2, 3, 4]\`.
- \`c = a[:]\` makes a **shallow copy**, a new list \`[1, 2, 3, 4]\`.
- \`c.append(5)\` changes only the copy: \`c = [1, 2, 3, 4, 5]\`, length 5.
- \`a\` stays \`[1, 2, 3, 4]\`.

So the output is \`[1, 2, 3, 4] 5\`.

Remember that a shallow copy copies only the outer list: for a list of lists, the inner lists are still shared (use \`copy.deepcopy\` for full independence).`,
          d: 'easy',
          at: 'Amazon',
        },
        {
          q: `Five parcels P, Q, R, S and T are delivered one after another in slots 1 to 5. Q is delivered immediately after P. R is delivered before P. T is delivered immediately before R. T is not delivered first. S is delivered either first or last. Which parcel is delivered in slot 3?

A) P  B) Q  C) R  D) T`,
          a: `**Answer: C) R**

Combine the "immediately" rules into blocks:
- T immediately before R: block **T R**.
- P immediately before Q: block **P Q**.
- R before P, so the order is **T R ... P Q**, which uses 4 consecutive-ish slots, with S in slot 1 or slot 5.

Case 1: S last gives **T R P Q S**. T is first, which breaks "T is not delivered first". Rejected.

Case 2: S first gives **S T R P Q**. Check: Q right after P (slots 4, 5), R (3) before P (4), T (2) right before R (3), T not first, S first. All conditions hold.

So the only order is S, T, R, P, Q and slot 3 is **R**.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Glue "immediately before/after" items into blocks first; it cuts the cases to two or three.`,
        },
        {
          q: `This function should reverse a singly linked list, but it returns only the first node. What is the bug?

\`\`\`python
def reverse(head):
    prev = None
    curr = head
    while curr:
        curr.next = prev
        prev = curr
        curr = curr.next
    return prev
\`\`\`

A) prev should start as head  B) The next node is lost because curr.next is overwritten before moving forward  C) It should return curr  D) The loop should be while curr.next`,
          a: `**Answer: B**

Trace with 1 → 2 → 3:
- \`curr = 1\`: \`1.next = None\`, \`prev = 1\`, then \`curr = curr.next\`, which is now **None** (we just overwrote it). The loop ends and the function returns node 1 alone; nodes 2 and 3 are lost.

The fix is to save the next node **before** changing the pointer:

\`\`\`python
def reverse(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next      # remember the rest of the list
        curr.next = prev     # reverse this link
        prev = curr
        curr = nxt
    return prev
\`\`\`

Now each step reverses one link and moves forward. Time O(n), space O(1). Returning \`prev\` is correct because when \`curr\` becomes None, \`prev\` points to the old last node, the new head.`,
          d: 'hard',
          at: 'Amazon',
          tip: `In pointer problems, ask "what do I lose when I overwrite this?" before every assignment.`,
        },
        {
          q: `A bag has 4 red and 6 blue balls. Two balls are drawn at random without replacement. What is the probability that both are the same colour?

A) 2/15  B) 1/3  C) 7/15  D) 8/15`,
          a: `**Answer: C) 7/15**

Total ways to choose 2 balls from 10: C(10, 2) = 45.

Same colour means both red or both blue:
- Both red: C(4, 2) = 6
- Both blue: C(6, 2) = 15

Favourable = 6 + 15 = 21.

Probability = 21 / 45 = **7/15**.

Check by the sequential method: P(red, red) = 4/10 × 3/9 = 12/90; P(blue, blue) = 6/10 × 5/9 = 30/90. Sum = 42/90 = 7/15. Both methods agree.`,
          d: 'easy',
          at: 'Amazon',
        },
        {
          q: `How many times is \`fib\` called in total (including the first call) when you run \`fib(5)\`?

\`\`\`python
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
\`\`\`

A) 9  B) 11  C) 15  D) 25`,
          a: `**Answer: C) 15**

Let C(n) be the number of calls made by \`fib(n)\`, counting itself.
- C(0) = 1 and C(1) = 1 (base cases, no further calls).
- For n ≥ 2: C(n) = 1 + C(n − 1) + C(n − 2).

Compute:
- C(2) = 1 + 1 + 1 = 3
- C(3) = 1 + 3 + 1 = 5
- C(4) = 1 + 5 + 3 = 9
- C(5) = 1 + 9 + 5 = **15**

This repeated work is why naive recursive Fibonacci is exponential (about O(1.6ⁿ)). With memoization (\`functools.lru_cache\`) each n from 0 to 5 is computed once, so the work becomes O(n).`,
          d: 'hard',
          at: 'Amazon',
          tip: `Write the recurrence for the count, not just for the value; it is quicker than drawing the full tree.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `Explain the four pillars of OOP with a short example.`,
          a: `- **Encapsulation**: keep data and the methods that use it together, and hide internal state. Outsiders change it only through methods.
- **Abstraction**: expose *what* an object does and hide *how*. A caller uses \`cart.checkout()\` without knowing payment details.
- **Inheritance**: a class reuses and extends another class (an "is-a" relationship).
- **Polymorphism**: the same call behaves differently depending on the object's actual type.

\`\`\`python
class Payment:                       # abstraction
    def pay(self, amount):
        raise NotImplementedError

class UpiPayment(Payment):           # inheritance
    def pay(self, amount):
        return f"Paid {amount} by UPI"

class CardPayment(Payment):
    def __init__(self, card_no):
        self.__card_no = card_no     # encapsulation (name-mangled)
    def pay(self, amount):
        return f"Paid {amount} by card ending {self.__card_no[-4:]}"

for p in [UpiPayment(), CardPayment("4111222233334444")]:
    print(p.pay(500))                # polymorphism
\`\`\``,
          d: 'easy',
          at: 'Amazon',
          tip: `Use an example from an e-commerce system; it fits Amazon and keeps the answer concrete.`,
        },
        {
          q: `What is the difference between a process and a thread?`,
          a: `| | Process | Thread |
|---|---|---|
| What it is | A running program with its own address space | A unit of execution inside a process |
| Memory | Separate memory (code, data, heap) | Shares the process's code, data and heap; has its own stack and registers |
| Creation cost | Higher | Lower |
| Communication | Needs IPC (pipes, sockets, shared memory) | Direct, through shared variables |
| Failure impact | A crash usually affects only that process | A crash in one thread can bring down the whole process |
| Context switch | Slower (address-space switch) | Faster |

Example: a browser may run each tab as a separate **process** for isolation, while one tab uses several **threads** for rendering, networking and JavaScript.

Because threads share memory, they need synchronization (locks, semaphores) to avoid race conditions.`,
          d: 'easy',
          at: 'Amazon',
        },
        {
          q: `What is a deadlock? State the four necessary conditions and how to prevent it.`,
          a: `A **deadlock** is when a set of processes or threads each wait for a resource held by another in the set, so none can proceed.

Four **Coffman conditions**, all of which must hold:
1. **Mutual exclusion**: a resource can be held by only one thread at a time.
2. **Hold and wait**: a thread holds one resource while waiting for another.
3. **No preemption**: a resource cannot be forcibly taken away.
4. **Circular wait**: T1 waits for T2, T2 waits for T3, ... , Tn waits for T1.

Prevention breaks at least one condition:
- **Lock ordering** (breaks circular wait): always acquire locks in a fixed global order, e.g. by account ID.
- Acquire all needed resources at once or none (breaks hold and wait).
- Use timeouts / \`try_lock\` and release on failure (acts like preemption).

Other strategies: **avoidance** (Banker's algorithm checks safe states) and **detection and recovery** (find a cycle in the wait-for graph, then kill or roll back a thread).

Example: transfer(A, B) locks A then B while transfer(B, A) locks B then A; ordering by ID removes the deadlock.`,
          d: 'medium',
          at: 'Amazon',
        },
        {
          q: `How does a hash map work internally, and what is its time complexity?`,
          a: `A **hash map** stores key-value pairs in an array of **buckets**.

1. **Hash**: compute \`hash(key)\`, then map it to a bucket index, e.g. \`hash % capacity\`.
2. **Store**: put the pair in that bucket.
3. **Collisions** (two keys, same bucket) are handled by:
   - **Chaining**: each bucket holds a list (Java's HashMap converts long chains to balanced trees).
   - **Open addressing**: probe for the next free slot (Python's \`dict\` uses a form of this).
4. **Resize**: when the load factor (items / buckets) passes a threshold, the table grows (often doubles) and all keys are rehashed.

Complexity:
- Average **O(1)** for get, put and delete.
- Worst case **O(n)** when many keys collide (O(log n) per bucket with tree bins).
- A single resize is O(n), but **amortised** insert stays O(1).

Requirements for keys: equal keys must have equal hashes, and keys should be immutable (in Python, a list cannot be a dict key; a tuple can).`,
          d: 'medium',
          at: 'Amazon',
          tip: `Mention load factor and resizing: it shows you know why the average is O(1).`,
        },
        {
          q: `What is a database index? How does it speed up queries and what does it cost?`,
          a: `An **index** is a separate data structure, usually a **B+ tree**, that keeps column values sorted with pointers to the rows. It works like the index at the back of a book.

How it helps:
- Without an index, \`WHERE email = 'a@x.com'\` scans every row: O(n).
- With a B+ tree index on \`email\`, the database walks a shallow tree: about O(log n), a few disk pages.
- Sorted order also helps \`ORDER BY\`, range queries (\`BETWEEN\`) and joins on the indexed column.

Costs:
- **Slower writes**: every INSERT, UPDATE or DELETE must update each index.
- **Extra storage**.
- Indexes on low-selectivity columns (e.g. a boolean) rarely help.

Useful terms:
- **Clustered index**: the table rows are physically stored in index order (in MySQL InnoDB, the primary key).
- **Composite index** on (a, b): helps queries filtering on \`a\` or on \`a\` and \`b\`, but not on \`b\` alone (left-most prefix rule).

\`\`\`sql
CREATE INDEX idx_orders_customer ON orders (customer_id, created_at);
\`\`\``,
          d: 'medium',
          at: 'Amazon',
        },
        {
          q: `SQL vs NoSQL: when would you choose each? Explain the CAP theorem briefly.`,
          a: `**SQL (relational)**: tables with a fixed schema, joins, strong **ACID** transactions. Examples: MySQL, PostgreSQL. Best for data with clear relationships where correctness is critical: payments, orders, inventory counts.

**NoSQL**: flexible schemas, designed to scale horizontally. Types:
- Key-value (Amazon DynamoDB, Redis), document (MongoDB), wide-column (Cassandra), graph (Neo4j).
- Best for very high traffic with simple access patterns, e.g. a shopping cart or session store looked up by user ID.

Trade-offs: NoSQL often gives up joins and some transaction guarantees (or limits them) in exchange for scale and availability.

**CAP theorem**: in a distributed data store, when a **network partition (P)** happens you must choose between:
- **Consistency (C)**: every read sees the latest write, or gets an error.
- **Availability (A)**: every request gets a response, possibly stale.

Since partitions cannot be ruled out in real networks, the practical choice is CP vs AP. A bank balance leans CP; a product-review count can be AP with eventual consistency.`,
          d: 'hard',
          at: 'Amazon',
          tip: `Tie the answer to a use case: "cart in a key-value store, orders in a relational DB" sounds like real design.`,
        },
        {
          q: `What happens when you type www.amazon.in in the browser and press Enter?`,
          a: `1. **URL parsing**: the browser reads the scheme (https), host and path.
2. **DNS lookup**: the browser cache, OS cache, then a DNS resolver translate the host name to an IP address (resolver → root → .in TLD → authoritative server).
3. **TCP connection**: a three-way handshake (SYN, SYN-ACK, ACK) to port 443.
4. **TLS handshake**: the server sends its certificate, the browser verifies it, and both agree on session keys, so traffic is encrypted.
5. **HTTP request**: \`GET /\` with headers (cookies, user agent, accepted encodings).
6. **Server side**: the request typically hits a CDN or load balancer, which forwards it to an application server; that server may read from caches and databases and builds the response.
7. **HTTP response**: status code (200, 301, 404...), headers and the HTML body.
8. **Rendering**: the browser parses HTML into the DOM, CSS into the CSSOM, runs JavaScript, fetches images/scripts (more requests), then lays out and paints the page.

Connections may be reused (keep-alive, HTTP/2) for the later requests.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Go in order and name the protocol at each step: DNS, TCP, TLS, HTTP. Depth on one step is a bonus.`,
        },
        {
          q: `How would you design a simple URL shortener (like a short-link service) at a fresher level?`,
          a: `**Requirements**: create a short code for a long URL; redirect the short URL to the long one; reads far outnumber writes.

**API**
- \`POST /shorten {url}\` returns \`https://sho.rt/aZ3k9Q\`
- \`GET /aZ3k9Q\` returns **301/302** redirect to the long URL.

**Generating the code**
- Take a unique numeric ID (database auto-increment or a distributed ID generator) and **Base62-encode** it (a–z, A–Z, 0–9). 7 characters give 62⁷, about 3.5 trillion codes.
- Hashing the URL (e.g. MD5 then take 7 chars) is an alternative but needs collision handling.

**Storage**: a key-value table \`code → long_url, created_at, expiry\`. A key-value store fits well since every lookup is by code.

**Scaling reads**
- A **cache** (e.g. Redis) in front of the database for popular codes.
- Stateless app servers behind a **load balancer**, so you can add servers.

**Extras to mention**: expiry, custom aliases, rate limiting to stop abuse, analytics via an async queue so redirects stay fast.`,
          d: 'hard',
          at: 'Amazon',
          tip: `Start with requirements and APIs before boxes; interviewers judge the reasoning, not a perfect diagram.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Find the length of the longest substring without repeating characters. Example: "abcabcbb" gives 3 ("abc").`,
          a: `**Approach: sliding window with last-seen positions.**

Keep a window \`[start, i]\` with no repeats. Store the last index of each character. When the current character was last seen inside the window, move \`start\` just past that position. Track the best window length.

**Complexity**: O(n) time (each index is visited once), O(k) space for k distinct characters.

\`\`\`python
def length_of_longest_substring(s: str) -> int:
    last = {}
    start = best = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best

print(length_of_longest_substring("abcabcbb"))  # 3
print(length_of_longest_substring("bbbbb"))     # 1
print(length_of_longest_substring("pwwkew"))    # 3
print(length_of_longest_substring(""))          # 0
\`\`\`

The check \`last[ch] >= start\` matters: in "abba", when the second "a" arrives, its old position is outside the window and must not move \`start\` backwards.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Dry-run "abba" aloud; it catches the most common sliding-window bug.`,
        },
        {
          q: `Find the k-th largest element in an unsorted array without fully sorting it.`,
          a: `**Approach: min-heap of size k.**

Push elements into a min-heap; whenever its size goes above k, pop the smallest. After processing everything, the heap holds the k largest elements and its top (the smallest of them) is the k-th largest.

**Complexity**: O(n log k) time, O(k) space. Better than sorting (O(n log n)) when k is small, and it works on a stream.

\`\`\`python
import heapq

def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]

print(kth_largest([3, 2, 1, 5, 6, 4], 2))           # 5
print(kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))  # 4
\`\`\`

Follow-up: **Quickselect** finds it in O(n) average time (O(n²) worst case) by partitioning like quicksort and recursing into only one side. Duplicates count separately, so in the second example the sorted order is 6, 5, 5, 4 and the 4th largest is 4.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Say why a MIN-heap is used for the k largest; candidates often reach for a max-heap and get confused.`,
        },
        {
          q: `Given a 2-D grid of '1' (land) and '0' (water), count the number of islands. Land cells connect horizontally or vertically.`,
          a: `**Approach: BFS (or DFS) flood fill.**

Scan every cell. When you find unvisited land, it is a new island: increment the count and BFS from it, marking every connected land cell as visited (here by turning it into '0').

**Complexity**: O(R × C) time, each cell is processed once; O(min(R, C)) to O(R × C) space for the queue.

\`\`\`python
from collections import deque

def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                grid[r][c] = '0'
                q = deque([(r, c)])
                while q:
                    x, y = q.popleft()
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == '1':
                            grid[nx][ny] = '0'
                            q.append((nx, ny))
    return count

g = [list("11000"), list("11000"), list("00100"), list("00011")]
print(num_islands(g))  # 3
\`\`\`

Mark cells when you **enqueue** them, not when you pop, or the same cell can be queued many times.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Ask whether you may modify the input; if not, use a visited set.`,
        },
        {
          q: `Merge k sorted linked lists into one sorted linked list.`,
          a: `**Approach: min-heap of list heads.**

Put the head of each list into a min-heap keyed by value. Repeatedly pop the smallest node, append it to the result and push that node's next. Include an index in the tuple so Python never compares two nodes when values tie.

**Complexity**: O(N log k) time for N total nodes and k lists; O(k) heap space.

\`\`\`python
import heapq

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def merge_k_lists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    dummy = tail = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next

def build(vals):
    dummy = cur = ListNode()
    for v in vals:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

head = merge_k_lists([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])])
out = []
while head:
    out.append(head.val)
    head = head.next
print(out)  # [1, 1, 2, 3, 4, 4, 5, 6]
\`\`\`

Alternative: divide and conquer (merge pairs of lists), also O(N log k).`,
          d: 'hard',
          at: 'Amazon',
          tip: `Explain the tie-breaker index; without it Python raises TypeError comparing ListNode objects.`,
        },
        {
          q: `Find the lowest common ancestor (LCA) of two nodes p and q in a binary tree (not necessarily a BST).`,
          a: `**Approach: post-order recursion.**

For each node, ask the left and right subtrees whether they contain p or q.
- If the current node is p or q (or None), return it.
- If both sides return a non-None node, p and q are on different sides, so the current node is the LCA.
- Otherwise return whichever side is non-None.

Assumes both p and q exist in the tree.

**Complexity**: O(n) time, O(h) recursion space (h = tree height).

\`\`\`python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def lca(root, p, q):
    if root is None or root is p or root is q:
        return root
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right:
        return root
    return left if left else right

n7, n4 = TreeNode(7), TreeNode(4)
n2 = TreeNode(2, n7, n4)
n5 = TreeNode(5, TreeNode(6), n2)
n1 = TreeNode(1, TreeNode(0), TreeNode(8))
root = TreeNode(3, n5, n1)
print(lca(root, n5, n1).val)  # 3
print(lca(root, n7, n4).val)  # 2
print(lca(root, n5, n4).val)  # 5
\`\`\`

For a **BST** it is simpler: walk from the root; go left if both values are smaller, right if both are larger, else the current node is the LCA.`,
          d: 'medium',
          at: 'Amazon',
        },
        {
          q: `Coin change: given coin denominations and an amount, return the minimum number of coins needed, or -1 if it cannot be made.`,
          a: `**Approach: bottom-up DP (unbounded coins).**

\`dp[x]\` = minimum coins to make amount x. \`dp[0] = 0\`; every other value starts at infinity. For each amount, try every coin: \`dp[x] = min(dp[x], dp[x - coin] + 1)\`.

Greedy (always take the largest coin) fails: with coins [1, 3, 4] and amount 6, greedy gives 4+1+1 = 3 coins but the best is 3+3 = 2 coins.

**Complexity**: O(amount × number of coins) time, O(amount) space.

\`\`\`python
def coin_change(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount
    for x in range(1, amount + 1):
        for c in coins:
            if c <= x and dp[x - c] + 1 < dp[x]:
                dp[x] = dp[x - c] + 1
    return dp[amount] if dp[amount] != INF else -1

print(coin_change([1, 2, 5], 11))  # 3  (5 + 5 + 1)
print(coin_change([2], 3))         # -1
print(coin_change([1, 3, 4], 6))   # 2  (3 + 3)
print(coin_change([1], 0))         # 0
\`\`\``,
          d: 'medium',
          at: 'Amazon',
          tip: `Show the greedy counter-example first; it justifies why DP is needed.`,
        },
        {
          q: `Sliding window maximum: given an array and window size k, return the maximum of every window of size k.`,
          a: `**Approach: monotonic deque of indices.**

Keep a deque of indices whose values are in **decreasing** order.
1. Drop the front index if it has slid out of the window (\`<= i - k\`).
2. Pop from the back while the back value is **smaller than or equal to** the new value; those can never be a maximum again.
3. Append the new index.
4. Once the first window is complete (\`i >= k - 1\`), the front is the window maximum.

**Complexity**: O(n) time, since every index is pushed and popped at most once; O(k) space.

\`\`\`python
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()
    out = []
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k:
            dq.popleft()
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))  # [3, 3, 5, 5, 6, 7]
print(max_sliding_window([9, 8, 7], 1))                   # [9, 8, 7]
\`\`\`

A heap also works in O(n log n) with lazy removal of stale indices, but the deque is optimal.`,
          d: 'hard',
          at: 'Amazon',
          tip: `Store indices, not values, so you can tell when the front has left the window.`,
        },
        {
          q: `Design a data structure that supports adding numbers from a stream and returning the current median at any time.`,
          a: `**Approach: two heaps.**

- \`low\`: a **max-heap** of the smaller half (Python has only min-heaps, so store negatives).
- \`high\`: a **min-heap** of the larger half.
- Keep \`len(low) == len(high)\` or \`len(low) == len(high) + 1\`.

Add: push to \`low\`, move \`low\`'s largest to \`high\` (so every low value ≤ every high value), then if \`high\` became bigger, move its smallest back to \`low\`.

Median: if sizes differ, the top of \`low\`; otherwise the average of both tops.

**Complexity**: add O(log n), median O(1), space O(n).

\`\`\`python
import heapq

class MedianFinder:
    def __init__(self):
        self.low = []   # max-heap via negatives
        self.high = []  # min-heap

    def add_num(self, num):
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def find_median(self):
        if len(self.low) > len(self.high):
            return float(-self.low[0])
        return (-self.low[0] + self.high[0]) / 2

m = MedianFinder()
for x in [5, 15, 1, 3]:
    m.add_num(x)
    print(m.find_median())  # 5.0, 10.0, 5.0, 4.0
\`\`\``,
          d: 'hard',
          at: 'Amazon',
          tip: `State the invariant (sizes and ordering) before coding; the code follows from it.`,
        },
      ],
    },
    {
      title: 'Leadership Principles and bar raiser',
      questions: [
        {
          q: `Why do you want to work at Amazon?`,
          a: `Make it specific and link it to the Leadership Principles and to yourself. A model answer:

"Three reasons. First, **scale and Customer Obsession**: services I use every day, like [an Amazon product you actually use], serve millions of customers, and I want to build software where small improvements reach that many people. Second, **Ownership**: I have read that Amazon teams own their services end to end, from design to on-call. In [your project] I enjoyed doing exactly that, from writing the API to fixing production bugs, and I want to grow in that kind of environment early in my career. Third, **Learn and Be Curious**: the breadth of problems, from retail and logistics to cloud, means I will keep learning. I am preparing for that by [a course, AWS certification or project you did]."

Avoid answers that are only about salary, brand name or "it's a big company". Show that you understand how Amazon works and that you already behave in that way.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Name one real Amazon product or service you use and what you would improve in it.`,
        },
        {
          q: `Tell me about a time you went out of your way for a customer or user. (Customer Obsession)`,
          a: `Use **STAR** and make the "user" real: a project user, a college club member, a client in an internship.

- **Situation**: "In [your project], a library app used by about 200 students in my college, users complained they missed book due dates."
- **Task**: "I was the backend developer; reminders were not in our plan, but users were paying late fines."
- **Action**: "I spoke to five regular users to understand the problem: they did not open the app daily. So instead of an in-app banner, I built an email reminder two days before the due date using a scheduled job. I tested it with a small group first and added an unsubscribe link after one user asked."
- **Result**: "Late returns dropped from about 30% to 12% in the next month, and the librarian asked us to keep the feature."

Why it maps to **Customer Obsession**: you started from the customer's problem, talked to them, and measured the outcome, rather than building what was easiest.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Show that you LISTENED to the user before building; that is the heart of Customer Obsession.`,
        },
        {
          q: `Tell me about a time you took ownership of a problem that was not strictly your responsibility. (Ownership)`,
          a: `**STAR model answer**

- **Situation**: "During our final-year project [project name], two days before the review, the deployment that a teammate had set up broke after a library update."
- **Task**: "Deployment was his task and he was unwell. If the demo failed, the whole team would lose marks."
- **Action**: "I told the team I would take it on, read the error logs, and found that a dependency version had changed. I pinned the versions in requirements.txt, redeployed, and wrote a short README of the deployment steps so anyone could redo it. I also added a simple health-check script that we ran before every demo."
- **Result**: "The demo ran without issues and we scored [grade]. The README was later used by the next batch."

Points that show **Ownership**:
- You did not say "that's not my job".
- You fixed the root cause, not just the symptom.
- You left something that prevents the problem next time (documentation, script).`,
          d: 'medium',
          at: 'Amazon',
          tip: `End with what you put in place so it never happens again; owners think long term.`,
        },
        {
          q: `Tell me about a time you had to make a decision quickly without all the information. (Bias for Action)`,
          a: `**STAR model answer**

- **Situation**: "At a 24-hour hackathon, six hours before submission, our chosen maps API started rate-limiting our free key."
- **Task**: "As the team lead I had to decide quickly whether to wait for the limit to reset, rewrite with another API, or cut the feature."
- **Action**: "I could not know when the limit would reset. I noted that switching was **reversible**: we could keep both code paths. So I split the team: one person built a small adapter for an open-source map library while the rest continued other features. I set a check-in after 90 minutes to decide finally."
- **Result**: "The adapter worked in about an hour, the demo ran smoothly and we finished in the top [X] out of [Y] teams. I learned to separate reversible decisions, where speed matters, from irreversible ones, where more analysis is worth it."

Amazon often describes this as "two-way door" decisions: speed matters because many decisions can be undone.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Say why the decision was safe to make fast (reversible, limited risk); speed alone is not the point.`,
        },
        {
          q: `Tell me about a time you used data to find the root cause of a problem. (Dive Deep)`,
          a: `**STAR model answer**

- **Situation**: "In my internship at [company], the team's report-generation API had become slow; some calls took 8–10 seconds."
- **Task**: "I was asked to find out why. Others assumed the server needed more memory."
- **Action**: "Instead of guessing, I added timing logs around each step and found 90% of the time was in one database query. I ran \`EXPLAIN\` on it and saw a full table scan on a table with about 2 million rows, because the filter column had no index. I tested an index on a copy of the database first and compared query plans."
- **Result**: "After adding the index, the API went from about 9 seconds to under 400 ms with no hardware change, and I shared the before/after numbers with the team."

What makes this **Dive Deep**:
- You measured instead of trusting assumptions.
- You know the details (numbers, tools, the exact cause).
- Expect follow-ups like "Why that index?" or "What else did you check?", so only tell stories you know inside out.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Numbers make Dive Deep stories credible: before, after, and how you measured them.`,
        },
        {
          q: `Tell me about a time you disagreed with a teammate or senior. What happened? (Have Backbone; Disagree and Commit)`,
          a: `**STAR model answer**

- **Situation**: "In [your project], our team lead wanted to store user passwords encrypted with a reversible key so we could 'recover' them for users."
- **Task**: "I believed this was a security risk and wanted us to use hashing with password reset instead."
- **Action**: "I did not argue in the group chat. I asked for 15 minutes, showed two short articles on password storage best practice, and explained the risk with an example: if the key leaked, every password leaked. I proposed bcrypt hashing plus an email reset flow and estimated the extra work at one day. I also listened to his concern, which was a smooth demo for the faculty."
- **Result**: "He agreed to switch. On another point, the choice of frontend framework, I disagreed but the team chose React; I **committed fully** and learned it rather than slowing the team."

This shows both halves of the principle: speak up respectfully with data (**Have Backbone**), and once a decision is made, support it (**Disagree and Commit**).`,
          d: 'hard',
          at: 'Amazon',
          tip: `Show respect and data, never "I was right and they were wrong"; and include a time you committed anyway.`,
        },
        {
          q: `Tell me about a time you failed or received critical feedback. What did you learn? (Learn and Be Curious, Earn Trust)`,
          a: `**STAR model answer**

- **Situation**: "In my second year I took on the backend of a college fest registration site."
- **Task**: "I had to deliver the payment and registration flow in two weeks."
- **Action (what went wrong)**: "I underestimated the work, did not write tests, and on launch day duplicate registrations appeared when users double-clicked submit. A senior reviewer told me directly that I should have tested failure cases and asked for help earlier."
- **Action (what I did)**: "I fixed it the same day with a unique constraint and an idempotency check, apologised to the organisers, and cleaned the duplicate records. Afterwards I learned unit testing with pytest and started breaking tasks into daily goals that I share with my team."
- **Result**: "In my next project, [project name], I wrote tests for every API and finished on time. I now ask for review early."

Interviewers want **real** failures with your share of the blame (**Earn Trust**: being vocally self-critical) and clear learning (**Learn and Be Curious**). A "failure" that is secretly a boast ("I worked too hard") hurts you.`,
          d: 'medium',
          at: 'Amazon',
          tip: `Pick a real failure that is now fixed, and spend most of the time on what changed afterwards.`,
        },
        {
          q: `Are you open to relocating, and what questions would you ask the interviewer at the end?`,
          a: `**Relocation**: Amazon's tech roles in India are in several cities, and team location can depend on business needs. A good answer is honest and flexible:

"Yes, I am open to relocating to any location where the team needs me. I have lived away from home for college [or: I am comfortable moving], and for my first role the team and the learning matter more to me than the city."

If you truly have a constraint, say so politely and early rather than accepting and backing out later.

**Questions to ask** (shows curiosity and interest):
- "What does a new SDE's first three months usually look like on your team?"
- "How does the team measure customer impact for the services it owns?"
- "What is something your team built recently that you are proud of?"
- "What qualities do the strongest new engineers on your team share?"

Avoid asking only about salary, leave or work hours in a technical interview; those discussions happen with the recruiter.`,
          d: 'easy',
          at: 'Amazon',
          tip: `Prepare two questions; ask the one that the interview has not already answered.`,
        },
      ],
    },
  ],
};

export default book;
