import { SeedBook, ALL_YEARS } from '../types';

/**
 * Zoho fresher interview questions. Process details are hedged on purpose: Zoho changes its
 * rounds from drive to drive, so students are pointed to the official careers page.
 */
const book: SeedBook = {
  slug: 'zoho-interview',
  title: 'Zoho Interview Questions',
  kind: 'company',
  subject: 'Zoho',
  description: 'Prepare for Zoho: C output prediction, aptitude, harder programming rounds (matrices, strings, patterns), app-design in code, CS fundamentals and HR questions.',
  color: '#b45309',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 108,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `What does the Zoho fresher hiring process typically look like?`,
          a: `Zoho is a product company, and its fresher process is known for having **several programming rounds** rather than one short coding test. The exact pattern changes between drives, but candidates commonly describe something like:

1. **Written / online test**: C-style output prediction and aptitude or logical questions.
2. **Basic programming round**: a few small-to-medium problems solved on a computer, often in front of an evaluator.
3. **Advanced programming round**: harder problems on strings, matrices and patterns.
4. **Application design round** (in many drives): build a small console application, such as a booking or management system, using classes.
5. **Technical and HR interviews**: your code, projects, CS fundamentals and fit.

Rounds are often held in person over one or more days, and each one is usually an elimination round. Treat this as a typical outline, not a fixed rule, and always check the official Zoho careers page or your placement cell for the current drive.`,
          d: 'easy',
          at: 'Zoho',
          tip: `Expect more hands-on coding than at service companies. Practise writing complete, running programs, not just snippets.`,
        },
        {
          q: `What is the first (written or online) round at Zoho usually like?`,
          a: `In many recent drives the first round mixes two kinds of questions:

- **C aptitude / output prediction**: short C programs where you must say what is printed. Topics that come up: operators and precedence, \`++\`/\`--\`, integer division and \`%\`, loops, \`static\` variables, pointers and arrays, strings, bitwise operators and short-circuit \`&&\`/\`||\`.
- **Quantitative and logical reasoning**: number series, time and distance, clocks, percentages, puzzles.

Some drives have held it on paper and others online, and the mix of sections varies. Because the C questions test exact rules, guessing does not work well: you need to trace code line by line.

**How to prepare:** pick a C aptitude book or question set, solve questions with a pen first, then run the code to check yourself. Learn which expressions are undefined behaviour (for example \`i = i++\`) so a trick question does not confuse you.`,
          d: 'easy',
          at: 'Zoho',
          tip: `Even if you code in Python or Java, revise C basics: pointers, static, operators and printf formats.`,
        },
        {
          q: `What happens in Zoho's programming rounds, and how are they evaluated?`,
          a: `Candidates usually report two levels:

- **Basic programming**: problems such as string reversal by words, number patterns, array rearrangement, simple matrix work. You typically solve them on a system and show the running output.
- **Advanced programming**: harder problems like spiral matrix traversal, string compression and expansion, word search in a grid, printing complex patterns, or problems with many edge cases.

Evaluators commonly look at more than the final output:
- Does the program **actually run** for the sample and for edge cases (empty input, one element, repeated characters)?
- Is the logic **your own** and can you explain it?
- Is the code **readable**: meaningful names, small functions, no copy-paste blocks?
- How do you behave when stuck: do you try a smaller case and debug calmly?

Built-in shortcuts are sometimes discouraged for problems such as sorting or string reversal, so be ready to write the logic yourself.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Test with your own edge cases before calling the evaluator. A working simple solution beats a broken clever one.`,
        },
        {
          q: `What is the application design (advanced) round at Zoho?`,
          a: `In many Zoho drives, a later round asks you to build a **small working application in a few hours**, usually a console program. Commonly reported themes include a taxi or railway booking system, a parking lot, a library or bank account manager, or an e-commerce cart.

You get a written specification and are expected to:
- Model the problem with **classes** (for example \`Taxi\`, \`Booking\`, \`Customer\`).
- Implement features one at a time: booking, cancellation, listing, summaries.
- Keep data in memory using lists and dictionaries (or arrays and structs).
- Handle invalid input and rules stated in the problem.

Often the problem is released in stages, and new requirements are added once you finish the first part. Clean design pays off here: if your code is split into small methods, adding a new rule is quick.

**Prepare** by building three or four such console apps end to end in your chosen language, within a time limit.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Finish a working core first, then add features. Half of every feature working is worse than full basic features.`,
        },
        {
          q: `Which programming language should I use in Zoho's coding rounds?`,
          a: `In most reported drives, candidates can choose a mainstream language such as **C, C++, Java or Python**, but the list can vary, so confirm with the drive instructions.

How to choose:
- Use the language you can write **fastest and most correctly without an IDE's help**. Some setups give a basic editor, so autocomplete may not be there.
- **Java or C++** are good for the application design round because classes and collections are natural there. **Python** is also fine and keeps code short.
- If you choose Python, know how to do things manually as well (reverse a string with a loop, sort with your own logic), because evaluators may ask you to avoid built-ins.

Whatever you choose, you still need **C reading skills** for the written round, because output-prediction questions are commonly written in C.`,
          d: 'easy',
          at: 'Zoho',
          tip: `Do not switch languages in the last month. Depth in one language matters more than surface knowledge of three.`,
        },
        {
          q: `Does Zoho hire only from top colleges, or only people with degrees?`,
          a: `Zoho is publicly known for **focusing on skills over pedigree**. Its founder has spoken often about hiring people without degrees, and the company runs **Zoho Schools of Learning**, a programme that trains students (some straight after school) and has fed many people into Zoho jobs.

For regular fresher hiring, Zoho has recruited through campus drives, off-campus drives and online registrations, from a wide range of colleges. In practice this means:

- Your **coding ability in the rounds** carries most of the weight.
- A strong project you built yourself helps more than certificates.
- Marks still matter for some eligibility filters in certain drives, so read the criteria for the specific drive.

Check the official Zoho careers page for current openings and for Zoho Schools admission details rather than relying on older forum posts.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `How should I prepare for Zoho in about 6–8 weeks?`,
          a: `A practical plan:

**Weeks 1–2: C and aptitude.** Solve 15–20 C output-prediction questions a day by hand (operators, loops, pointers, static, strings, bitwise). Add 10 aptitude questions a day: series, clocks, time and distance, percentages.

**Weeks 3–5: programming.** Two to three problems daily, written fully and run: strings (compression, expansion, reverse words, anagrams), arrays (rearrangement, rotation, max/min alternate), matrices (spiral, rotate, search), patterns (pyramids, X pattern, number triangles). Time yourself.

**Weeks 6–7: application design.** Build three console apps from scratch in 2–3 hours each: taxi booking, library management, bank account with transactions. Then add one new feature to each.

**Week 8: interviews.** Revise OOP, DBMS, OS basics, and be able to explain every line of your projects.

Throughout, solve on paper first, then type, then test edge cases.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Keep a notebook of every mistake in output-prediction questions. Most errors repeat.`,
        },
        {
          q: `What do the final technical and HR interviews at Zoho focus on, and what should I carry?`,
          a: `By the final rounds, the interviewers have usually seen your code, so the discussion often starts there:

- **Technical interview**: why you chose an approach, how to improve its complexity, how your application design would handle a new requirement, plus CS basics (OOP, DBMS, OS) and your projects.
- **HR interview**: motivation to join a product company, willingness to relocate (Zoho has offices in Chennai and several other locations, including rural offices), and long-term interest.

**Carry**: several printed copies of your resume, college ID, government photo ID, mark sheets or provisional certificates, and passport photos, unless the drive instructions say otherwise.

**Offer terms** such as training period, location and any service agreement can differ by drive and role. Read your offer letter carefully and ask HR directly if anything is unclear, instead of relying on hearsay.`,
          d: 'easy',
          at: 'Zoho',
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `A train 150 m long running at 54 km/h crosses a platform in 20 seconds. What is the length of the platform?

A) 100 m  B) 150 m  C) 200 m  D) 250 m`,
          a: `**Answer: B) 150 m**

**Step 1: convert speed to m/s.**
54 km/h × (5/18) = 15 m/s.

**Step 2: distance covered while crossing.**
While crossing a platform, the train covers its own length plus the platform length.
Distance = speed × time = 15 × 20 = 300 m.

**Step 3: subtract the train's length.**
Platform = 300 − 150 = **150 m**.

**Check:** (150 + 150) / 15 = 20 seconds. Correct.

Remember the rule: crossing a pole or a person means distance = train length only; crossing a platform, bridge or another train means you add the other length too.`,
          d: 'easy',
          at: 'Zoho',
          tip: `Convert km/h to m/s by multiplying by 5/18 before doing anything else.`,
        },
        {
          q: `Find the next number: 2, 6, 12, 20, 30, ?

A) 40  B) 42  C) 44  D) 48`,
          a: `**Answer: B) 42**

**Method 1: differences.**
6 − 2 = 4, 12 − 6 = 6, 20 − 12 = 8, 30 − 20 = 10.
The differences grow by 2, so the next difference is 12: 30 + 12 = **42**.

**Method 2: formula.**
Each term is n × (n + 1):
1×2 = 2, 2×3 = 6, 3×4 = 12, 4×5 = 20, 5×6 = 30, so the next is 6×7 = **42**.

Both methods agree. When a series has differences that rise by a constant, look for a product like n(n+1) or a square like n² + something.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `What is the output of this C program?

\`\`\`c
#include <stdio.h>
int main(void) {
    int a = 10, b = 3;
    printf("%d %d %d", a / b, a % b, -a % b);
    return 0;
}
\`\`\`

A) 3 1 1  B) 3 1 -1  C) 3.33 1 -1  D) 3 1 2`,
          a: `**Answer: B) 3 1 -1**

- \`a / b\` is **integer division** because both operands are \`int\`: 10 / 3 = 3 (the fraction is dropped). So option C is impossible with \`%d\`.
- \`a % b\` is the remainder: 10 = 3 × 3 + 1, so **1**.
- \`-a % b\`: unary minus binds tighter than \`%\`, so this is \`(-10) % 3\`. Since C99, integer division **truncates toward zero**: -10 / 3 = -3, and the remainder is -10 − (3 × -3) = -10 + 9 = **-1**. The sign of \`%\` follows the left operand.

So the output is \`3 1 -1\`.

Note: Python behaves differently, \`-10 % 3\` is 2 there, which is a common trap for people who switch languages.`,
          d: 'medium',
          at: 'Zoho',
          tip: `In C, the result of % takes the sign of the dividend (left operand).`,
        },
        {
          q: `What is the output of this C program?

\`\`\`c
#include <stdio.h>
int f(void) {
    static int c = 0;
    c += 2;
    return c;
}
int main(void) {
    int s = 0;
    for (int i = 0; i < 3; i++)
        s += f();
    printf("%d", s);
    return 0;
}
\`\`\`

A) 6  B) 2  C) 12  D) 0`,
          a: `**Answer: C) 12**

A \`static\` local variable is **initialised only once** and **keeps its value between calls**. It lives for the whole program, even though it can only be used inside \`f\`.

Trace:
| Call | c before | c after | returns | s |
|---|---|---|---|---|
| 1 | 0 | 2 | 2 | 2 |
| 2 | 2 | 4 | 4 | 6 |
| 3 | 4 | 6 | 6 | 12 |

So \`s = 2 + 4 + 6 = 12\`.

If \`c\` were a normal local (\`int c = 0;\` without \`static\`), it would reset every call, each call would return 2, and the answer would be 6 (option A). That is exactly the trap this question sets.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `What is the output of this C program?

\`\`\`c
#include <stdio.h>
int main(void) {
    int a[] = {10, 20, 30, 40, 50};
    int *p = a + 1;
    printf("%d %d %d", *p, *(p + 2), p[-1]);
    return 0;
}
\`\`\`

A) 20 40 10  B) 10 30 0  C) 20 30 10  D) 11 13 9`,
          a: `**Answer: A) 20 40 10**

- \`a\` decays to a pointer to \`a[0]\`. Adding 1 moves by **one element** (not one byte), so \`p\` points to \`a[1]\`, which is 20.
- \`*p\` = \`a[1]\` = **20**.
- \`*(p + 2)\` = \`a[1 + 2]\` = \`a[3]\` = **40**.
- \`p[-1]\` means \`*(p - 1)\` = \`a[0]\` = **10**. A negative index is legal here because \`p - 1\` still points inside the array.

The key rule: \`p[i]\` is exactly \`*(p + i)\`, and pointer arithmetic is scaled by the size of the pointed-to type. Option D is the mistake of adding to the values instead of the address.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Rewrite every p[i] as *(p + i) and track which element the pointer points to.`,
        },
        {
          q: `What is the output of this C program?

\`\`\`c
#include <stdio.h>
int main(void) {
    unsigned int x = 13;
    printf("%u %u %u", x >> 1, x & 6, x ^ 5);
    return 0;
}
\`\`\`

A) 6 4 8  B) 26 4 8  C) 6 6 9  D) 6 4 18`,
          a: `**Answer: A) 6 4 8**

Write 13 in binary: **1101**.

- \`x >> 1\`: shift right by one bit: 1101 → 0110 = **6** (same as 13 / 2 with the fraction dropped). Option B is a left shift (13 << 1 = 26).
- \`x & 6\`: 6 is 0110.
  \`\`\`
  1101
  0110 &
  ----
  0100  = 4
  \`\`\`
- \`x ^ 5\`: 5 is 0101. XOR gives 1 where bits differ.
  \`\`\`
  1101
  0101 ^
  ----
  1000  = 8
  \`\`\`

Output: \`6 4 8\`.

Quick facts that help with bitwise questions: \`x & 1\` checks odd/even, \`x >> k\` divides by 2^k, \`x ^ x\` is 0, and \`x & (x - 1)\` clears the lowest set bit.`,
          d: 'hard',
          at: 'Zoho',
        },
        {
          q: `What is the angle between the hour and minute hands of a clock at 3:40?

A) 120°  B) 130°  C) 140°  D) 150°`,
          a: `**Answer: B) 130°**

**Minute hand:** moves 6° per minute. At 40 minutes: 40 × 6 = **240°** from 12.

**Hour hand:** moves 30° per hour plus 0.5° per minute. At 3:40: 3 × 30 + 40 × 0.5 = 90 + 20 = **110°** from 12.

**Difference:** 240 − 110 = **130°**.

**Shortcut formula:** angle = |30H − 5.5M| = |30 × 3 − 5.5 × 40| = |90 − 220| = 130°.
If the result is above 180°, subtract it from 360° to get the smaller angle. Here 130° is already the smaller one.

The common mistake is to place the hour hand exactly on 3 (90°), which gives 150°, option D. The hour hand moves forward as the minutes pass.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Use |30H - 5.5M| and take 360 minus the result if it exceeds 180.`,
        },
        {
          q: `What is the output of this C program?

\`\`\`c
#include <stdio.h>
int main(void) {
    int i = 0, j = 0, k = 0;
    if (i++ || ++j && k++) { }
    printf("%d %d %d", i, j, k);
    return 0;
}
\`\`\`

A) 1 0 0  B) 1 1 0  C) 1 1 1  D) 0 1 1`,
          a: `**Answer: C) 1 1 1**

**Step 1: grouping.** \`&&\` has higher precedence than \`||\`, so the condition is:
\`i++ || (++j && k++)\`

**Step 2: evaluate left to right with short-circuiting.** \`||\` and \`&&\` both have a sequence point after the left operand, so this is well defined.

- \`i++\`: yields the old value **0** (false), then \`i\` becomes 1. Because the left side of \`||\` is false, the right side **must** be evaluated.
- \`++j\`: \`j\` becomes 1 and yields 1 (true). Because the left side of \`&&\` is true, \`k++\` **must** be evaluated.
- \`k++\`: yields 0 (false), then \`k\` becomes 1.

The whole condition is false, so the empty body does not run, but every increment already happened.

Output: \`1 1 1\`. If \`i\` had started at 1, \`||\` would short-circuit and the output would be \`2 0 0\`.`,
          d: 'hard',
          at: 'Zoho',
          tip: `First add brackets by precedence, then evaluate left to right and stop wherever && or || can short-circuit.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `Explain the four pillars of OOP with a small example.`,
          a: `- **Encapsulation**: keep data and the methods that change it together, and hide the data. A \`BankAccount\` keeps \`balance\` private and exposes \`deposit()\` and \`withdraw()\`, so nobody can set a negative balance directly.
- **Abstraction**: show what an object does, hide how. A caller uses \`account.withdraw(500)\` without knowing how the ledger is updated.
- **Inheritance**: a class reuses and extends another. \`SavingsAccount\` and \`CurrentAccount\` both inherit from \`Account\`.
- **Polymorphism**: one interface, many behaviours. \`account.calculate_interest()\` runs different code for savings and current accounts (method overriding). Method overloading, where available, is the compile-time form.

\`\`\`python
class Account:
    def __init__(self, balance): self._balance = balance
    def interest(self): return 0

class Savings(Account):
    def interest(self): return self._balance * 0.04
\`\`\`

At Zoho, interviewers often connect this to your application design round, so be ready to point at your own classes.`,
          d: 'easy',
          at: 'Zoho',
          tip: `Use an example from the app you built in the design round. It shows you applied OOP, not memorised it.`,
        },
        {
          q: `What is the difference between a process and a thread?`,
          a: `A **process** is a running program with its **own memory space** (code, data, heap, stack), open files and resources. A **thread** is a unit of execution **inside** a process. All threads of a process share its code, heap and open files, but each thread has its own stack, registers and program counter.

| | Process | Thread |
|---|---|---|
| Memory | Separate | Shared within the process |
| Creation cost | Higher | Lower |
| Communication | IPC: pipes, sockets, shared memory | Directly through shared variables |
| Crash impact | Usually isolated | Can bring down the whole process |
| Context switch | Slower | Faster |

**Example:** a browser may run each tab as a separate process for isolation, while inside one tab several threads handle rendering, network and scripts.

Because threads share memory, they need **synchronisation** (locks, mutexes, semaphores) to avoid race conditions when two threads update the same data.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `In C, what is the difference between an array and a pointer? What is a dangling pointer?`,
          a: `**Array vs pointer**
- An array like \`int a[5];\` is a **block of 5 ints**; \`sizeof(a)\` gives 20 (with 4-byte int). The name \`a\` cannot be reassigned.
- A pointer like \`int *p = a;\` is a **variable holding an address**; \`sizeof(p)\` is the pointer size (often 8 on 64-bit). It can be changed: \`p++\` is fine, \`a++\` is a compile error.
- In most expressions, an array name **decays** to a pointer to its first element, which is why \`a[i]\` and \`p[i]\` both work.

**Dangling pointer**: a pointer that still holds the address of memory that is no longer valid.
\`\`\`c
int *p = malloc(sizeof(int));
free(p);        // p now dangles
*p = 5;         // undefined behaviour
p = NULL;       // safe habit after free
\`\`\`
Returning the address of a local variable from a function also creates one, because the local is destroyed when the function returns.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Mention sizeof(array) vs sizeof(pointer); it is the clearest proof that they are different.`,
        },
        {
          q: `Explain stack vs heap memory, and the difference between malloc, calloc, realloc and free. What is a memory leak?`,
          a: `**Stack**: holds function call frames, local variables and return addresses. Allocation is automatic and fast; memory is released when the function returns. It is small, and deep recursion can cause a **stack overflow**.

**Heap**: memory you request at run time and must release yourself (in C). Larger but slower to manage.

- \`malloc(n)\`: allocates n bytes, **uninitialised** (garbage values).
- \`calloc(count, size)\`: allocates count × size bytes and **sets them to zero**.
- \`realloc(p, n)\`: resizes a block; it may move it and return a new address, so use a temporary: \`tmp = realloc(p, n); if (tmp) p = tmp;\`
- \`free(p)\`: releases the block. Freeing twice or freeing a non-heap pointer is undefined behaviour.

All three allocators return \`NULL\` on failure, so check the result.

A **memory leak** happens when heap memory is never freed and the last pointer to it is lost, for example by overwriting \`p\` with a new \`malloc\` result. In long-running servers, leaks slowly consume all memory. Languages like Java and Python reduce this with garbage collection, but references kept in long-lived lists can still leak.`,
          d: 'hard',
          at: 'Zoho',
        },
        {
          q: `What is normalization? Explain 1NF, 2NF and 3NF with an example.`,
          a: `**Normalization** organises tables to remove redundancy and update anomalies (where changing one fact means changing many rows).

Start with \`Orders(order_id, customer_name, customer_phone, items, product_id, product_name, qty)\`.

- **1NF**: every column holds a single atomic value and there are no repeating groups. A column \`items = "pen, book"\` breaks 1NF; split it into one row per item.
- **2NF**: 1NF, and every non-key column depends on the **whole** primary key. With key \`(order_id, product_id)\`, \`product_name\` depends only on \`product_id\`, so move it to \`Products(product_id, product_name)\`.
- **3NF**: 2NF, and no non-key column depends on another non-key column (no transitive dependency). \`customer_phone\` depends on the customer, not the order, so move customers to \`Customers(customer_id, name, phone)\` and keep \`customer_id\` in \`Orders\`.

Result: \`Customers\`, \`Products\`, \`Orders(order_id, customer_id)\` and \`OrderItems(order_id, product_id, qty)\`. Reporting systems sometimes **denormalize** on purpose for faster reads.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `What happens when you type a URL such as https://www.zoho.com into a browser and press Enter?`,
          a: `1. **Parse the URL**: scheme (https), host (www.zoho.com), path (/).
2. **DNS lookup**: the browser checks its cache, then the OS cache, then asks a DNS resolver, which walks root → \`.com\` → the domain's name servers to get an **IP address**.
3. **TCP connection**: a three-way handshake (SYN, SYN-ACK, ACK) to port 443.
4. **TLS handshake**: the server sends its certificate, the browser verifies it against trusted authorities, and both sides agree on session keys so traffic is encrypted.
5. **HTTP request**: \`GET / HTTP/1.1\` (or HTTP/2) with headers like Host, cookies and User-Agent.
6. **Server side**: a load balancer forwards the request to an application server, which may query databases and caches, then returns a response with a status code (200, 301, 404...).
7. **Rendering**: the browser parses HTML into the DOM, loads CSS, JavaScript and images (more requests), builds the render tree, lays out and paints the page.

Mentioning caching (browser cache, CDN) and redirects is a bonus.`,
          d: 'hard',
          at: 'Zoho',
          tip: `Go layer by layer: DNS, TCP, TLS, HTTP, server, rendering. Structure matters more than every detail.`,
        },
        {
          q: `How should I explain my project in a Zoho technical interview?`,
          a: `Zoho interviewers tend to dig into what **you** built, so prepare a clear, honest walk-through:

1. **Problem**: one sentence. "[Your project] helps [users] do [task]."
2. **Your role**: what you personally wrote, especially if it was a team project.
3. **Design**: main modules or classes, the database tables and how data flows from input to output.
4. **One hard part**: a bug or design decision you struggled with and how you solved it.
5. **Trade-offs and improvements**: what you would change with more time (validation, performance, tests).

Expect follow-ups like "How would this work for 10 times more users?", "Why this table structure?" or "Write the function that does X now." If you used a framework or a tutorial, say so and explain what you added.

Never list technologies you cannot answer basic questions about. A small project you fully understand is much stronger than a big one you cannot explain.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `Design the classes for a simple library management system. What classes, fields and methods would you use?`,
          a: `Start from the nouns in the requirement: books, members, loans, the library.

\`\`\`text
Book:    book_id, title, author, total_copies, available_copies
Member:  member_id, name, max_books, borrowed (list of Loan)
Loan:    book, member, issue_date, due_date, return_date
Library: books (dict id -> Book), members (dict id -> Member), loans
         add_book(), register_member(), issue_book(member_id, book_id),
         return_book(member_id, book_id), search(title_or_author),
         overdue_loans(today)
\`\`\`

**Rules inside methods:**
- \`issue_book\` checks the book exists, \`available_copies > 0\` and the member is under \`max_books\`; then creates a \`Loan\`, decrements copies.
- \`return_book\` finds the open loan, sets \`return_date\`, increments copies and computes a fine if late.

**Design points to mention:**
- Keep business rules in \`Library\` (or a service class), not scattered in the menu code.
- Use dictionaries keyed by id for O(1) lookup.
- Extending: a \`StudentMember\` and \`StaffMember\` subclass with different \`max_books\` shows inheritance and polymorphism.

This is the same thinking Zoho's application design round expects.`,
          d: 'hard',
          at: 'Zoho',
          tip: `Name classes from nouns and methods from verbs in the problem statement, then state the rules each method checks.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Print the elements of an m × n matrix in spiral order.`,
          a: `**Approach:** keep four boundaries: \`top\`, \`bottom\`, \`left\`, \`right\`. Walk the top row left to right, the right column top to bottom, the bottom row right to left and the left column bottom to top, shrinking a boundary after each walk. Check the boundaries again before the last two walks so a single remaining row or column is not printed twice.

**Complexity:** O(m × n) time, O(1) extra space besides the output.

\`\`\`python
def spiral(m):
    res = []
    if not m:
        return res
    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        for j in range(left, right + 1):
            res.append(m[top][j])
        top += 1
        for i in range(top, bottom + 1):
            res.append(m[i][right])
        right -= 1
        if top <= bottom:
            for j in range(right, left - 1, -1):
                res.append(m[bottom][j])
            bottom -= 1
        if left <= right:
            for i in range(bottom, top - 1, -1):
                res.append(m[i][left])
            left += 1
    return res

print(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))  # [1, 2, 3, 6, 9, 8, 7, 4, 5]
\`\`\``,
          d: 'medium',
          at: 'Zoho',
          tip: `Test a 1 x 4 and a 4 x 1 matrix. Those catch the double-printing bug.`,
        },
        {
          q: `Compress a string by replacing each run of the same character with the character and its count. Example: "aaabbc" → "a3b2c1".`,
          a: `**Approach:** walk the string once, counting how many times the current character repeats. When the character changes (or the string ends), append the character and its count. Build the result in a list and join once, because repeated string concatenation creates many copies.

**Complexity:** O(n) time, O(n) space for the output.

\`\`\`python
def compress(s):
    if not s:
        return ""
    out = []
    count = 1
    for i in range(1, len(s) + 1):
        if i < len(s) and s[i] == s[i - 1]:
            count += 1
        else:
            out.append(s[i - 1] + str(count))
            count = 1
    return "".join(out)

print(compress("aaabbc"))      # a3b2c1
print(compress("abcd"))        # a1b1c1d1
print(compress("zzzzzzzzzzzz"))  # z12
\`\`\`

**Common variations:** omit the count when it is 1 ("a3b2c"), or return the original string if the compressed one is not shorter. Ask the evaluator which rule they want.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `Print a word in an X (cross) pattern. For "PROGRAM", row i has the letter at position i and at position n-1-i.`,
          a: `**Approach:** for each row \`i\` from 0 to n-1, start with a row of n spaces, put \`word[i]\` at column \`i\` and \`word[n-1-i]\` at column \`n-1-i\`. For odd lengths, the middle row has both positions equal, so one letter appears in the centre. Strip trailing spaces before printing.

**Complexity:** O(n²) time to print an n × n figure, O(n) extra space per row.

\`\`\`python
def x_pattern(word):
    n = len(word)
    for i in range(n):
        row = [" "] * n
        row[i] = word[i]
        row[n - 1 - i] = word[n - 1 - i]
        print("".join(row).rstrip())

x_pattern("PROGRAM")
\`\`\`

Output:
\`\`\`text
P     M
 R   A
  O R
   G
  O R
 R   A
P     M
\`\`\`

Pattern questions are about **index formulas**. Write down, for row i, which columns are filled, then the code follows directly.`,
          d: 'medium',
          at: 'Zoho',
          tip: `Draw the grid with row and column numbers first; the column formula becomes obvious.`,
        },
        {
          q: `Expand a compressed string where counts can have more than one digit. Example: "a12b3c1" → twelve a's, then "bbb", then "c".`,
          a: `**Approach:** read a character, then read **all** following digits to build the number (\`num = num * 10 + digit\`), then append the character repeated that many times. Reading digit by digit is what handles multi-digit counts like 12; reading only one digit is the most common bug. If a character has no count, treat it as 1.

**Complexity:** O(n + L) time, where L is the length of the expanded output.

\`\`\`python
def expand(s):
    out = []
    i = 0
    while i < len(s):
        ch = s[i]
        i += 1
        num = 0
        while i < len(s) and s[i].isdigit():
            num = num * 10 + int(s[i])
            i += 1
        out.append(ch * (num or 1))
    return "".join(out)

print(expand("a2b3c1"))   # aabbbc
print(expand("x10y"))     # xxxxxxxxxxy
\`\`\`

A follow-up may ask you to print the characters in sorted order of character, or to compress the expanded string back. Both reuse this loop.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `Rearrange an array so that it alternates largest, smallest, second largest, second smallest, and so on. Example: [1..7] → [7, 1, 6, 2, 5, 3, 4].`,
          a: `**Approach:** sort the array, then use two pointers: \`j\` at the end (largest) and \`i\` at the start (smallest). Take from \`j\`, then from \`i\`, moving the pointers inward until they cross.

**Complexity:** O(n log n) time for sorting, O(n) space for the result.

\`\`\`python
def max_min(arr):
    a = sorted(arr)
    i, j = 0, len(a) - 1
    out = []
    while i <= j:
        out.append(a[j])
        j -= 1
        if i <= j:
            out.append(a[i])
            i += 1
    return out

print(max_min([1, 2, 3, 4, 5, 6, 7]))  # [7, 1, 6, 2, 5, 3, 4]
print(max_min([4, 1, 3, 2]))           # [4, 1, 3, 2]
\`\`\`

The inner \`if i <= j\` check stops the middle element of an odd-length array from being added twice. If the evaluator asks you not to use \`sorted\`, write a simple sort (for example insertion sort) as a separate function and call it.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `Find the longest substring without repeating characters. Example: "abcabcbb" → "abc".`,
          a: `**Approach (sliding window):** keep a window \`[start, i]\` that has no repeats and a dictionary of the last index of each character. When the current character was already seen **inside** the window, move \`start\` just past its previous position. After each step, update the best window.

**Complexity:** O(n) time, O(k) space where k is the number of distinct characters.

\`\`\`python
def longest_unique(s):
    last = {}
    start = best = best_start = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        if i - start + 1 > best:
            best = i - start + 1
            best_start = start
    return s[best_start:best_start + best]

print(longest_unique("abcabcbb"))  # abc
print(longest_unique("pwwkew"))    # wke
print(longest_unique("abba"))      # ab
\`\`\`

The condition \`last[ch] >= start\` matters: in "abba", when the final "a" arrives, its old index 0 is already outside the window, so \`start\` must not move backwards. The brute-force approach checks every substring in O(n³).`,
          d: 'hard',
          at: 'Zoho',
          tip: `Explain the brute force first, then improve to the sliding window. Interviewers like seeing the progression.`,
        },
        {
          q: `Search for a word in a grid of letters in all 8 directions and report every starting cell and direction where it appears.`,
          a: `**Approach:** for every cell that matches the first letter, try each of the 8 directions \`(dr, dc)\`. Step k cells in that direction and compare with \`word[k]\`; stop at the edge of the grid or on a mismatch. If all letters matched, record the start and direction.

**Complexity:** O(R × C × 8 × L) time for an R × C grid and a word of length L; O(1) extra space besides the results.

\`\`\`python
DIRS = [(-1, -1), (-1, 0), (-1, 1), (0, -1),
        (0, 1), (1, -1), (1, 0), (1, 1)]

def find_word(grid, word):
    rows, cols = len(grid), len(grid[0])
    found = []
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != word[0]:
                continue
            for dr, dc in DIRS:
                k = 1
                while k < len(word):
                    nr, nc = r + dr * k, c + dc * k
                    if not (0 <= nr < rows and 0 <= nc < cols) or grid[nr][nc] != word[k]:
                        break
                    k += 1
                if k == len(word):
                    found.append((r, c, dr, dc))
    return found

g = ["ZOHO", "XAHX", "OHOZ"]
print(find_word(g, "ZOHO"))
\`\`\`

The bounds check comes **before** reading \`grid[nr][nc]\`, so negative indexes never wrap around in Python.`,
          d: 'hard',
          at: 'Zoho',
        },
        {
          q: `Write a mini taxi booking system: n taxis start at point A; points A–F are 15 km apart and one hour apart; allot the nearest free taxi (ties go to the taxi with lower earnings); fare is ₹100 for the first 5 km and ₹10 per km after that.`,
          a: `**Approach:** model a \`Taxi\` (position, time it becomes free, earnings, trips) and a \`Booking\` system. A taxi can take a booking if it can reach the pickup point by the pickup time. Among those, choose by (distance to pickup, earnings). After booking, move the taxi to the drop point and update its free time and earnings. This is a typical shape for Zoho's design round; the real spec in your drive may differ.

**Complexity:** O(n) per booking for n taxis.

\`\`\`python
class Taxi:
    def __init__(self, tid):
        self.id, self.point, self.free_at, self.earned = tid, "A", 0, 0
        self.trips = []

def fare(km):
    return 100 + max(0, km - 5) * 10

class Booking:
    def __init__(self, n):
        self.taxis = [Taxi(i + 1) for i in range(n)]

    def book(self, pickup, drop, hour):
        gap = lambda t: abs(ord(t.point) - ord(pickup))
        free = [t for t in self.taxis if t.free_at + gap(t) <= hour]
        if not free:
            return None
        taxi = min(free, key=lambda t: (gap(t), t.earned))
        hops = abs(ord(drop) - ord(pickup))
        cost = fare(hops * 15)
        taxi.trips.append((pickup, drop, hour, cost))
        taxi.point, taxi.free_at = drop, hour + hops
        taxi.earned += cost
        return taxi.id

b = Booking(2)
print(b.book("A", "C", 9))   # 1  (30 km, fare 350)
print(b.book("A", "B", 9))   # 2
\`\`\``,
          d: 'hard',
          at: 'Zoho',
          tip: `Keep rules in small methods (fare, availability) so new requirements in later stages are one-line changes.`,
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Tell me about yourself.`,
          a: `Keep it to about a minute and make it about **building things**, since Zoho values hands-on skill.

**Model answer:**
"I am [your name], a final-year [your branch] student at [your college]. I got into programming through [how you started], and since then I have mostly enjoyed building working applications rather than only solving exercises. My main project is [your project], a [one-line description] that I built in [language/stack]; the hardest part was [specific problem] and I solved it by [your approach]. I also practise problem solving regularly, around [number] problems on strings, arrays and matrices. Outside academics I [one genuine interest]. I am looking for a role at a product company where I can work on software used by real customers and grow as an engineer over the long term, which is why I applied to Zoho."

Avoid repeating your resume line by line. End with why you are in this room.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `Why do you want to join Zoho?`,
          a: `Give reasons that are **specific to Zoho** and true for you. Points that are publicly known about Zoho:

- It is a **product company** that builds a large suite of business software (CRM, Mail, Books, Creator and many more) in-house.
- It has grown largely **without outside investors** and has spoken publicly about long-term thinking.
- It states a strong position on **customer privacy** and does not run an advertising business on customer data.
- It invests in **talent from smaller towns**, with rural offices and Zoho Schools of Learning.

**Model answer:**
"I want to build products, not just deliver projects, and Zoho builds dozens of products end to end. I also like that skill is valued over background here; the rounds themselves test what you can build. I have used [a Zoho product you tried] and noticed [something specific]. Zoho's focus on privacy and long-term growth matches how I want to build my career: learning deeply in one place."

Do try a free Zoho product before the interview so your example is real.`,
          d: 'easy',
          at: 'Zoho',
          tip: `Mention one Zoho product you actually used and what you noticed. It instantly sets you apart.`,
        },
        {
          q: `Why do you prefer a product company over a service company?`,
          a: `This question checks that you understand the difference and are not just chasing a brand.

**Key differences (in general):**
- **Product company**: builds and owns its software, sells it to many customers, and keeps improving the same codebase for years. Engineers see long-term results of their decisions.
- **Service company**: builds or maintains software for clients; projects and technologies change with client needs.

**Model answer:**
"Both are valuable, but I am more motivated by owning something over time. In my [your project], the most interesting part was not finishing the first version but improving it after people used it: fixing [an issue] and adding [a feature]. In a product company I would get that cycle every day, with real users and feedback. I also want to go deep into the internals of how things work, such as [performance, design, a specific area], which long-lived products demand."

Avoid saying anything negative about service companies; just explain what fits you.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `Are you willing to relocate, including to a smaller town office?`,
          a: `Zoho's largest base has been in and around **Chennai**, and the company has also opened offices in several smaller towns and rural areas, such as Tenkasi in Tamil Nadu. Postings depend on the team and drive, so the interviewer wants to know whether you are flexible.

**Model answer (if you are flexible):**
"Yes. I am comfortable relocating to wherever the team needs me. I actually find the idea of working from a smaller-town office interesting: lower commute time, lower cost of living and more focus. What matters most to me is the work and the team I learn from."

**If you have a real constraint**, be honest and calm: "I am open to relocating. The only thing I would like to discuss is [genuine reason, for example a family health situation], and I can plan around it."

Never say yes now and plan to refuse later. It damages trust and is easy to see through.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `Tell me about a difficult bug or problem you solved.`,
          a: `Use **STAR** (Situation, Task, Action, Result), and choose a technical story, because Zoho interviewers like engineering detail.

**Model answer:**
"**Situation:** In [your project], users reported that [symptom, for example the report showed wrong totals] only sometimes.
**Task:** I had to find the cause before our demo in [time].
**Action:** I first reproduced it reliably by [steps]. Then I added logging around [module] and narrowed it to [specific function]. The cause was [root cause, for example a date comparison that ignored time zones, or a list modified while looping over it]. I fixed it by [fix] and added a test case for that input so it would not come back.
**Result:** The totals were correct in every case we tried, the demo went well, and I now always [lesson, for example write a failing test before fixing a bug]."

The interviewer is checking **how you debug**: reproduce, narrow down, fix the root cause, prevent it returning. Make those steps clear.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `Where do you see yourself in five years?`,
          a: `Show ambition in **skill and responsibility**, not just titles, and show you plan to stay and grow.

**Model answer:**
"In five years I see myself as a strong engineer who understands one product deeply, from how customers use it to how it performs underneath. I would like to own important features end to end, be someone juniors can come to for help, and have contributed to decisions about design and quality. I am also interested in [an area such as performance, security or developer tools], and I would like to have grown real depth there. I see Zoho as a place where I can do that over the long term because products here are built and improved in-house for many years."

Avoid answers like "I want to do an MBA" or "start my own company" unless you can explain why that still fits this job. Zoho is known to value people who grow with the company.`,
          d: 'easy',
          at: 'Zoho',
        },
        {
          q: `If you rebuilt your main project today, what would you change?`,
          a: `This tests **self-awareness and growth**. A good answer names real weaknesses and shows you know better now.

**Model answer:**
"If I rebuilt [your project] I would change three things.
First, **structure**: I put most logic in [one big file or the UI layer]; I would separate it into a data layer, business logic and interface so each part is testable.
Second, **data validation**: I trusted user input too much, which caused [a specific bug]. I would validate at the boundary.
Third, **testing**: I tested by clicking through screens. I would write unit tests for [the core calculation or module] so changes are safe.
If it had to scale, I would also add indexes on [frequently searched columns] and cache [repeated lookups]."

Do not say "nothing" or criticise teammates. Interviewers want proof that you learn from your own code, which matters a lot in a product company where code lives for years.`,
          d: 'medium',
          at: 'Zoho',
        },
        {
          q: `What will you do if you get a higher-paying offer from another company after joining Zoho?`,
          a: `This checks **commitment and honesty**. Do not claim money means nothing; show that you choose based on growth and that you keep your word.

**Model answer:**
"Salary matters to everyone, but it is not how I decide where to build my career. I applied to Zoho because I want to work on products, learn from strong engineers and grow in one place, and those reasons do not change if another company offers a little more. Early in a career, what I learn in the first few years is worth far more than a small difference in pay. I also believe in keeping commitments: if I accept an offer here, I intend to give it my full effort and grow with the team."

If you already hold another offer, be truthful if asked directly, and explain why Zoho is your preference. Being caught bluffing about offers is far worse than having one.`,
          d: 'hard',
          at: 'Zoho',
          tip: `Be honest about other offers if asked. Explain your preference with reasons tied to growth, not just pay.`,
        },
      ],
    },
  ],
};

export default book;
