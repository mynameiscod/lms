// Infosys fresher interview questions: hiring process, online-test-style reasoning and pseudocode, technical, coding and HR rounds.
import { SeedBook, ALL_YEARS } from '../types';

const book: SeedBook = {
  slug: 'infosys-interview',
  title: 'Infosys Interview Questions',
  kind: 'company',
  subject: 'Infosys',
  emblem: '🏢',
  color: '#0369a1',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 101,
  description: `Prepare for Infosys fresher hiring: how the online test and interviews usually work, reasoning and pseudocode practice with solutions, technical, coding and HR questions.`,
  chapters: [
    {
      title: `Hiring process and preparation`,
      questions: [
        {
          q: `What does the Infosys fresher hiring process typically look like?`,
          a: `In recent drives, Infosys fresher hiring has usually followed these steps:

1. **Application** through campus placement or the official Infosys careers portal for off-campus drives.
2. **Online test** covering reasoning, mathematical ability, verbal ability and, in many drives, pseudocode; higher roles typically add coding.
3. **Interview**: for the standard role this is often a single sitting that combines **technical and HR** questions; higher roles usually have a deeper technical interview.
4. **Offer letter**, document verification and background check.
5. **Joining and training**. Infosys is well known for its foundation training for freshers; many batches have trained at its Mysuru campus, though location and format (in person or virtual) vary by batch.

The pattern, number of rounds and timelines change from year to year, so read the drive notification and the official Infosys careers page for your batch.`,
          d: 'easy',
          at: 'Infosys',
          tip: `Infosys training includes assessments too; preparing well for the test also prepares you for the first months after joining.`,
        },
        {
          q: `Which sections does the Infosys online test usually contain, and what does each check?`,
          a: `In recent drives the Infosys online test has typically included:

- **Reasoning ability:** syllogisms, seating and arrangement puzzles, data sufficiency, coding–decoding, blood relations. Infosys is known for reasoning questions that take careful reading.
- **Mathematical ability:** percentages, ratios, time and work, speed and distance, number system (remainders, unit digits), probability and permutations.
- **Verbal ability:** reading comprehension, sentence correction, para-jumbles, vocabulary in context.
- **Pseudocode:** reading short code in a language-neutral style and predicting the output; loops, recursion, arrays and bitwise operators are common.
- **Puzzle solving** and **coding** for some roles, especially the higher ones.

Sections are usually timed separately. The number of questions, timing and any sectional cut-offs vary by drive, so check the current pattern rather than relying on old papers.`,
          d: 'easy',
          at: 'Infosys',
          tip: `Pseudocode is the section most students skip in preparation and the easiest one to improve quickly.`,
        },
        {
          q: `What are the Systems Engineer, Digital Specialist Engineer and Specialist Programmer roles?`,
          a: `Infosys has commonly hired freshers into roles at different levels:

- **Systems Engineer (SE):** the standard entry-level role with the largest number of hires. Interviews focus on fundamentals, a programming language, SQL and your project.
- **Digital Specialist Engineer (DSE):** a higher role for candidates with stronger coding and problem-solving skills.
- **Specialist Programmer (SP):** a further role for strong programmers, with harder coding questions (data structures, algorithms, dynamic programming) in the test and interview.

In recent years, candidates have typically been considered for higher roles based on stronger coding performance, either in a dedicated test or contest, followed by a tougher technical interview.

Role names, eligibility routes and compensation change across years. Treat your offer letter and the official drive notification as the only reliable sources, not salary figures shared online.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `What are InfyTQ and HackWithInfy, and do they lead to Infosys jobs?`,
          a: `Both have been routes into Infosys in past years, but how they are used changes, so check the official pages before planning around them.

- **InfyTQ** has been an Infosys learning platform with courses on programming, databases and other fundamentals. In earlier years, its certification exam was used as a way for students to get interview opportunities. Whether it is currently a hiring route, and for which roles, depends on the year.
- **HackWithInfy** is a coding contest Infosys has run for engineering students. In editions so far, strong performers have been offered interview opportunities, often for the higher roles such as SP and DSE, and sometimes prizes. The format and benefits are announced per edition.

**Practical advice:** even when these are not direct hiring routes, the courses and contest problems are useful practice for the Infosys test and coding rounds. Register only through official Infosys websites and ignore anyone charging money to "guarantee" a selection.`,
          d: 'medium',
          at: 'Infosys',
          tip: `Infosys does not charge candidates for hiring; treat any paid "placement guarantee" message as a scam.`,
        },
        {
          q: `What do Infosys technical and HR interviews usually check?`,
          a: `**Technical part (standard role):**
- One programming language in depth (whatever you listed: Java, Python, C or C++).
- OOP concepts, DBMS and SQL queries, basics of OS and networks.
- **Your project**: what you built, why you chose those tools, and the code of your module.
- Sometimes writing a short program or query, or tracing a pseudocode-style snippet.

For **higher roles**, expect data structures and algorithms questions, optimising a solution, and discussing time complexity.

**HR part:**
- Communication and attitude.
- Why Infosys, willingness to **relocate** and work in **shifts**.
- Understanding of the training period and joining terms.
- Situational questions about teamwork, pressure and learning.

For the standard role, technical and HR questions are often asked by the same panel in one conversation, so stay ready to switch.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `What eligibility criteria does Infosys commonly apply to freshers?`,
          a: `Each drive notification lists its own criteria. Points that have **commonly** appeared include:

- Eligible **degrees and branches** (for example B.E./B.Tech, M.E./M.Tech, MCA, M.Sc in some disciplines) and specific **passing years**.
- A **minimum academic record** through 10th, 12th/diploma and graduation, as stated in the notification.
- **No pending backlogs** by the time of joining.
- Limits on **education gaps**, which must be declared.

**What to do:**
- Check the criteria of the exact drive you are applying to; do not rely on a friend's batch.
- Fill your marks and gaps honestly and exactly as on your documents, because they are verified later.
- If you are unsure, confirm with your placement cell or the official Infosys careers page.

Do not apply with false details hoping they will not be checked; background verification typically happens before or after joining.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `What documents and steps follow an Infosys offer?`,
          a: `**After the offer**, freshers typically:

1. **Accept the offer** within the time given in the email.
2. Complete **onboarding forms** on the portal mentioned in the email.
3. Submit **documents** for verification. Commonly asked: 10th, 12th/diploma and all semester marksheets, degree or provisional certificate, photo ID (Aadhaar, PAN or passport), photographs, and a gap declaration if applicable. The official checklist in your onboarding email is final.
4. Go through a **background check**.
5. Receive a **joining letter** with date, location and training details.
6. Attend **foundation training**, which covers programming, databases, software engineering and soft skills, usually with assessments you must clear.

Joining dates can take time after the offer; keep your email and phone number active and check spam folders regularly.`,
          d: 'easy',
          at: 'Infosys',
          tip: `Take the training assessments seriously; prepare your programming and SQL basics before you join.`,
        },
        {
          q: `How should you prepare for the Infosys online test and interview in 4 to 6 weeks?`,
          a: `**Weeks 1–2: reasoning and maths**
- Daily: one set each of syllogisms, seating arrangements and data sufficiency.
- Maths: number system (unit digits, remainders), percentages, time and work, speed and distance, permutations and probability.
- Verbal: reading comprehension and sentence correction for 20 minutes daily.

**Weeks 3–4: pseudocode and coding**
- Trace 10 pseudocode snippets a day on paper: loops, nested loops, recursion, arrays, bitwise operators.
- Solve string and array coding problems; for higher roles add stacks, hashing, sorting-based problems and basic dynamic programming.

**Weeks 5–6: mocks and interview**
- Full timed mock tests with sectional timing.
- Revise OOP, DBMS/SQL, OS, networks and your language.
- Prepare your project explanation and HR answers (why Infosys, relocation, shifts, training).

Review every wrong answer and write down why you got it wrong; patterns repeat.`,
          d: 'medium',
          at: 'Infosys',
        },
      ],
    },
    {
      title: `Aptitude and reasoning (test style)`,
      questions: [
        {
          q: `Statements: All pens are books. Some books are bags.
Conclusions: I. Some pens are bags. II. Some bags are books.

A) Only I follows  B) Only II follows  C) Both follow  D) Neither follows`,
          a: `**Answer: B) Only II follows**

**Conclusion I (Some pens are bags):** the pens circle lies inside the books circle. The bags circle overlaps books, but it may overlap only the part of books that has no pens. Since this is only *possible* and not *certain*, **I does not follow**.

**Conclusion II (Some bags are books):** "Some books are bags" can be reversed directly: if some books are bags, then some bags are books. **II follows**.

**Check with an example:** pens = {p}, books = {p, b1}, bags = {b1}. All pens are books ✔, some books are bags ✔. Is any pen a bag? No → I fails. Is some bag a book? Yes (b1) → II holds. ✔

**Rules:** "Some A are B" ⇄ "Some B are A" is always valid. "All A are B" only converts to "Some B are A".`,
          d: 'easy',
          at: 'Infosys',
          tip: `Draw the least-overlap Venn diagram; a conclusion follows only if it is true in every possible diagram.`,
        },
        {
          q: `What is the output of this pseudocode?

\`\`\`
set x = 5, y = 0
while (x > 0)
    y = y + x
    x = x - 2
end while
print y
\`\`\`

A) 9  B) 15  C) 8  D) 6`,
          a: `**Answer: A) 9**

Trace the loop step by step:

| Iteration | x before | y = y + x | x = x − 2 |
|---|---|---|---|
| 1 | 5 | 0 + 5 = 5 | 3 |
| 2 | 3 | 5 + 3 = 8 | 1 |
| 3 | 1 | 8 + 1 = 9 | −1 |

Now x = −1, so \`x > 0\` is false and the loop ends. It prints **9**.

**Check:** the loop adds the odd numbers 5 + 3 + 1 = 9. ✔

**Traps:** option B (15) is 5+4+3+2+1, which you get if you misread the step as \`x - 1\`. Option C (8) comes from stopping one iteration early. Always write a table for loops instead of tracing in your head.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `A man travels from home to office at 40 km/h and returns along the same route at 60 km/h. What is his average speed for the whole journey?

A) 50 km/h  B) 48 km/h  C) 45 km/h  D) 52 km/h`,
          a: `**Answer: B) 48 km/h**

Average speed = total distance ÷ total time, **not** the average of the two speeds.

**Take a convenient distance:** let one way = 120 km (LCM of 40 and 60).
- Time going = 120 ÷ 40 = 3 h.
- Time returning = 120 ÷ 60 = 2 h.
- Total distance = 240 km, total time = 5 h.
- Average speed = 240 ÷ 5 = **48 km/h**.

**Formula for equal distances:** 2ab / (a + b) = 2 × 40 × 60 / 100 = 4800 / 100 = **48**. ✔

**Trap:** (40 + 60) / 2 = 50 (option A) is wrong because he spends more time at the slower speed, which pulls the average below 50.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `Question: What is the value of x?
Statement 1: x² = 16
Statement 2: x > 0

A) Statement 1 alone is sufficient
B) Statement 2 alone is sufficient
C) Both statements together are sufficient, but neither alone
D) Both statements together are not sufficient`,
          a: `**Answer: C) Both together are sufficient, but neither alone**

**Statement 1 alone:** x² = 16 gives x = 4 or x = −4. Two values, so **not sufficient**.

**Statement 2 alone:** x > 0 allows any positive number. **Not sufficient**.

**Both together:** from x = 4 or −4, the condition x > 0 leaves only **x = 4**. A single value, so together they are **sufficient**.

**Data sufficiency method:**
1. Test statement 1 alone.
2. Test statement 2 alone.
3. Only if both fail, combine them.

You do **not** need to find the actual value in a data sufficiency question, only decide whether a unique answer is possible. A common mistake is treating x² = 16 as x = 4 and choosing A.`,
          d: 'medium',
          at: 'Infosys',
          tip: `Square roots, absolute values and "integer or not" are the usual traps in data sufficiency.`,
        },
        {
          q: `What is printed by this pseudocode?

\`\`\`
function f(n)
    if (n <= 1)
        return 1
    return n * f(n - 2)
end function

print f(7)
\`\`\`

A) 105  B) 5040  C) 48  D) 35`,
          a: `**Answer: A) 105**

Expand the recursion:
- f(7) = 7 × f(5)
- f(5) = 5 × f(3)
- f(3) = 3 × f(1)
- f(1) = 1 (base case, since 1 ≤ 1)

Now unwind: f(3) = 3 × 1 = 3, f(5) = 5 × 3 = 15, f(7) = 7 × 15 = **105**.

This is the **double factorial** 7!! = 7 × 5 × 3 × 1.

**Check the traps:**
- 5040 = 7! (you get it if you misread the step as \`n - 1\`).
- 35 = 7 × 5 (stopping after two calls).
- 48 = 6 × 4 × 2, which is f(6), not f(7); you get it by starting from the wrong value.

Writing each call on a new line, then multiplying back up, is the safest way to trace recursion.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `What is the unit digit of 7^95?

A) 1  B) 3  C) 7  D) 9`,
          a: `**Answer: B) 3**

Unit digits of powers of 7 repeat in a **cycle of 4**:
- 7¹ → 7
- 7² = 49 → 9
- 7³ = 343 → 3
- 7⁴ = 2401 → 1
- 7⁵ → 7 again

**Find the position in the cycle:** 95 ÷ 4 = 23 remainder **3**.
Remainder 3 → third value in the cycle → **3**.

**Check:** 7⁹⁵ = (7⁴)²³ × 7³. (7⁴)²³ ends in 1, and 7³ ends in 3, so the product ends in 1 × 3 = 3. ✔

**Rule:** if the remainder is 0, use the 4th value of the cycle (for 7 that is 1). Digits 2, 3, 7, 8 have cycle length 4; 4 and 9 have cycle length 2; 0, 1, 5, 6 always end in themselves.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `Five people A, B, C, D and E sit in a row facing north. C sits in the middle. A sits immediately to the right of C. B sits at one of the ends but not next to A. D sits somewhere to the left of E. Who sits at the extreme right end?

A) A  B) D  C) E  D) B`,
          a: `**Answer: C) E**

Number the seats 1 to 5 from **left to right** (facing north, your right is the higher number).

1. **C in the middle** → C = seat 3.
2. **A immediately right of C** → A = seat 4.
3. **B at an end, not next to A.** The ends are 1 and 5. Seat 5 is next to A (seat 4), so **B = seat 1**.
4. Seats 2 and 5 are left for D and E. **D is to the left of E** → **D = 2, E = 5**.

Final arrangement (left → right): **B, D, C, A, E**.

**Verify every clue:** C is 3rd of 5 (middle) ✔; A is directly right of C ✔; B is at the left end and not next to A ✔; D (2) is left of E (5) ✔.

The person at the extreme right is **E**.`,
          d: 'hard',
          at: 'Infosys',
          tip: `Fix the most certain clue first (here, C in the middle), then the clues that depend on it.`,
        },
        {
          q: `What is the output of this pseudocode? (& is bitwise AND, ^ is bitwise XOR)

\`\`\`
set a = 12, b = 10
set p = a & b
set q = a ^ b
print p + q
\`\`\`

A) 14  B) 22  C) 8  D) 2`,
          a: `**Answer: A) 14**

**Convert to binary:**
- a = 12 = **1100**
- b = 10 = **1010**

**AND (1 only where both bits are 1):**
1100 & 1010 = **1000** = 8 → p = 8

**XOR (1 where the bits differ):**
1100 ^ 1010 = **0110** = 6 → q = 6

p + q = 8 + 6 = **14**.

**Check with an identity:** (a & b) + (a ^ b) always equals (a | b), because AND covers the bits set in both and XOR covers bits set in exactly one, with no overlap. 1100 | 1010 = 1110 = 14. ✔

**Trap:** option B (22) is a + b; you get it if you treat the operators as ordinary arithmetic. The related identity a + b = (a ^ b) + 2 × (a & b) gives 6 + 16 = 22, which confirms the binary work.`,
          d: 'hard',
          at: 'Infosys',
        },
      ],
    },
    {
      title: `Technical interview`,
      questions: [
        {
          q: `What is the difference between an abstract class and an interface?`,
          a: `Both are used for **abstraction**: they define what a class must do without fixing every detail.

| | Abstract class (Java) | Interface (Java) |
|---|---|---|
| Methods | Abstract and concrete | Abstract by default; \`default\` and \`static\` methods allowed since Java 8 |
| Variables | Any kind, including instance fields | Only \`public static final\` constants |
| Constructor | Yes | No |
| Inheritance | A class can extend **one** | A class can implement **many** |
| Use when | Related classes share code and state | Unrelated classes share a capability |

\`\`\`java
abstract class Vehicle {
    abstract void start();
    void stop() { System.out.println("Stopped"); }
}
interface Chargeable { void charge(); }

class ElectricCar extends Vehicle implements Chargeable {
    void start() { System.out.println("Silent start"); }
    public void charge() { System.out.println("Charging"); }
}
\`\`\`

In Python, abstract classes come from the \`abc\` module; Python has no separate interface keyword.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `What is the difference between a list and a tuple in Python?`,
          a: `| | List | Tuple |
|---|---|---|
| Syntax | \`[1, 2, 3]\` | \`(1, 2, 3)\` |
| Mutable | **Yes**: add, remove, change items | **No**: fixed after creation |
| Methods | Many (\`append\`, \`remove\`, \`sort\`...) | Only \`count\` and \`index\` |
| Hashable | No, cannot be a dict key | Yes, if all items are hashable |
| Speed and memory | Slightly more memory | Slightly faster and lighter |
| Use for | Collections that change | Fixed records, e.g. coordinates |

\`\`\`python
marks = [80, 75]
marks.append(90)          # fine

point = (3, 4)
# point[0] = 5            # TypeError: tuple does not support item assignment

locations = {(12.97, 77.59): "Bengaluru"}   # tuple as a dict key
\`\`\`

**Follow-up:** a tuple containing a list, such as \`(1, [2, 3])\`, cannot have its slots reassigned, but the inner list itself can still change.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `What are ACID properties in a database? Explain with a bank transfer example.`,
          a: `ACID properties make **transactions** reliable. Example: transfer ₹1,000 from account A to account B, which needs two updates.

- **Atomicity:** all or nothing. If the debit from A succeeds but the credit to B fails, the whole transaction is rolled back, so money is never lost.
- **Consistency:** the database moves from one valid state to another. Rules such as "balance cannot be negative" and "total money stays the same" hold before and after.
- **Isolation:** concurrent transactions do not interfere. If someone checks balances during the transfer, they do not see A debited but B not yet credited. Isolation levels (read committed, repeatable read, serializable) control how strict this is.
- **Durability:** once committed, the change survives crashes or power failures, because it is written to logs and disk.

\`\`\`sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 1000 WHERE id = 'A';
UPDATE accounts SET balance = balance + 1000 WHERE id = 'B';
COMMIT;   -- or ROLLBACK if anything failed
\`\`\``,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `Explain the different types of SQL joins with an example.`,
          a: `Tables: \`students(id, name)\` and \`results(student_id, marks)\`.

- **INNER JOIN:** only rows that match in both tables (students who have results).
- **LEFT JOIN:** all students, with marks or NULL if no result.
- **RIGHT JOIN:** all results, with name or NULL if the student row is missing.
- **FULL OUTER JOIN:** all rows from both, NULLs where there is no match. MySQL does not support it directly; combine a LEFT and a RIGHT JOIN with \`UNION\`.
- **CROSS JOIN:** every combination (rows of A × rows of B).
- **SELF JOIN:** a table joined with itself, e.g. employees with their managers.

\`\`\`sql
SELECT s.name, r.marks
FROM students s
LEFT JOIN results r ON r.student_id = s.id;

-- students with no result at all
SELECT s.name
FROM students s
LEFT JOIN results r ON r.student_id = s.id
WHERE r.student_id IS NULL;
\`\`\`

The second query, "find rows with no match", is a very common follow-up.`,
          d: 'medium',
          at: 'Infosys',
          tip: `Draw two overlapping circles while explaining joins; it makes LEFT vs INNER obvious.`,
        },
        {
          q: `What is the difference between a stack and a queue? Give real uses of each.`,
          a: `- A **stack** is **LIFO** (last in, first out). You add (\`push\`) and remove (\`pop\`) at the same end, the top.
- A **queue** is **FIFO** (first in, first out). You add at the rear (\`enqueue\`) and remove from the front (\`dequeue\`).

Both operations are O(1) in a proper implementation.

**Uses of a stack:** function call stack and recursion, undo in editors, browser back button, checking balanced brackets, evaluating expressions.

**Uses of a queue:** printer job queue, CPU scheduling, handling requests on a server, breadth-first search (BFS), message queues between services.

\`\`\`python
from collections import deque

stack = []
stack.append(1); stack.append(2)
print(stack.pop())        # 2

queue = deque()
queue.append(1); queue.append(2)
print(queue.popleft())    # 1
\`\`\`

Use \`deque\` for queues in Python; \`list.pop(0)\` is O(n) because every remaining element shifts.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `What is the SDLC? Compare the Waterfall and Agile models.`,
          a: `The **Software Development Life Cycle (SDLC)** is the set of stages used to build software: **requirements → design → development → testing → deployment → maintenance**.

| | Waterfall | Agile |
|---|---|---|
| Flow | One stage after another, once | Short repeated cycles (sprints, often 1–4 weeks) |
| Requirements | Fixed at the start | Can change between sprints |
| Customer sees product | Near the end | After every sprint |
| Testing | A separate phase after development | Continuous, inside each sprint |
| Suits | Stable, well-understood requirements | Changing requirements, fast feedback |

**Agile terms worth knowing:** Scrum, sprint, product backlog, daily stand-up, sprint review, retrospective, Scrum Master, product owner.

Most IT services projects today use Agile or a mix, so be ready to say how your college project could have been run in sprints. Infosys, like most large IT companies, uses Agile on many client projects.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `What is virtual memory? Explain paging and page faults.`,
          a: `**Virtual memory** lets a process use more memory than is physically available by keeping only the needed parts in RAM and the rest on disk. Each process gets its own **virtual address space**, which also isolates processes from each other.

**Paging:**
- Virtual memory is split into fixed-size blocks called **pages**; physical memory into **frames** of the same size.
- A **page table** maps each page to a frame. The CPU's MMU translates virtual addresses to physical ones; a **TLB** caches recent translations for speed.
- Paging avoids external fragmentation because any free frame can hold any page.

**Page fault:** the process accesses a page that is not in RAM. The OS pauses the process, loads the page from disk into a free frame (evicting another page if needed), updates the page table, and resumes the process.

**Page replacement algorithms:** FIFO, **LRU** (least recently used) and Optimal (theoretical best).

**Thrashing:** when too many page faults occur, the system spends more time swapping pages than doing useful work.`,
          d: 'hard',
          at: 'Infosys',
        },
        {
          q: `How do you explain your project to an Infosys panel, and how do you answer "what would you improve"?`,
          a: `**Explain in this order (about 2 minutes):**
1. **Problem:** "[your project] helps [users] to [solve problem]."
2. **Your role:** "In a team of [n], I built [your part]."
3. **Technology and why:** "[stack], because [reason]."
4. **Architecture:** a simple flow, such as user → frontend → API → database.
5. **Challenge:** "[issue], solved by [action]."
6. **Result:** "[measurable outcome]."

**"What would you improve?"** is a favourite question. Give 2–3 specific, honest improvements:
- "Add input validation and proper error handling; right now a wrong date format crashes [module]."
- "Add indexes on [column], because search slows down as data grows."
- "Write automated tests; we tested manually."
- "Deploy it on a cloud service so others can use it."

**Why it matters:** it shows you understand your own work's limits and think like an engineer. Saying "nothing, it is complete" suggests you have not looked at it critically.`,
          d: 'hard',
          at: 'Infosys',
          tip: `Keep your project code open and revise it the night before; panels often ask about a specific function.`,
        },
      ],
    },
    {
      title: `Coding round`,
      questions: [
        {
          q: `Reverse the order of words in a sentence, removing extra spaces.`,
          a: `**Approach:** \`split()\` with no argument splits on any run of whitespace and drops leading/trailing spaces. Reverse the list of words and join them with a single space.

Without built-ins (a common follow-up), scan the string, collect characters into words, and build the result from the end.

**Complexity:** O(n) time, O(n) space.

\`\`\`python
def reverse_words(sentence):
    return " ".join(reversed(sentence.split()))

def reverse_words_manual(sentence):
    words, current = [], ""
    for ch in sentence:
        if ch == " ":
            if current:
                words.append(current)
                current = ""
        else:
            current += ch
    if current:
        words.append(current)
    result = []
    for i in range(len(words) - 1, -1, -1):
        result.append(words[i])
    return " ".join(result)

s = input()
print(reverse_words(s))
\`\`\`

**Example:** \`"  Infosys   hires freshers "\` → \`"freshers hires Infosys"\`.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `Check whether a number is an Armstrong number.`,
          a: `An **Armstrong number** equals the sum of its digits, each raised to the power of the number of digits. Examples: 153 = 1³ + 5³ + 3³ = 1 + 125 + 27; 9474 = 9⁴ + 4⁴ + 7⁴ + 4⁴.

**Approach:** count the digits (k), then add each digit to the power k and compare with the original number.

**Complexity:** O(d) time for d digits, O(1) extra space.

\`\`\`python
def is_armstrong(n):
    if n < 0:
        return False
    k = len(str(n))
    total, temp = 0, n
    while temp > 0:
        digit = temp % 10
        total += digit ** k
        temp //= 10
    return total == n

n = int(input())
print("Armstrong" if is_armstrong(n) else "Not Armstrong")
\`\`\`

**Examples:** 153 → Armstrong; 370 → Armstrong (27 + 343 + 0); 123 → Not Armstrong (1 + 8 + 27 = 36). Every single-digit number is an Armstrong number (including 0).

A common follow-up is printing all Armstrong numbers in a range; just call the function in a loop.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `Find the longest common prefix among a list of strings.`,
          a: `**Approach:** start with the first word as the prefix. For each next word, shorten the prefix from the end until the word starts with it. If the prefix becomes empty, there is no common prefix. The loop always stops because every string starts with the empty string.

**Complexity:** O(S) time in the typical case, where S is the total number of characters; O(1) extra space apart from the prefix.

\`\`\`python
def longest_common_prefix(words):
    if not words:
        return ""
    prefix = words[0]
    for w in words[1:]:
        while not w.startswith(prefix):
            prefix = prefix[:-1]
        if not prefix:
            break
    return prefix

words = input().split()
print(longest_common_prefix(words))
\`\`\`

**Examples:** \`flower flow flight\` → \`fl\`; \`dog racecar car\` → empty line; \`infosys\` alone → \`infosys\`.

**Alternative:** sort the words; the common prefix of the whole list equals the common prefix of the first and last words after sorting.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `Given an array of integers and a target, return the indices of two numbers that add up to the target.`,
          a: `**Approach:** the brute force checks every pair in O(n²). Instead, use a dictionary of values already seen and their indices. For each number x, check whether \`target - x\` is already in the dictionary; if so, the pair is found. Otherwise store x. Checking before storing prevents using the same element twice.

**Complexity:** O(n) time, O(n) space.

\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return seen[need], i
        seen[x] = i
    return None

nums = list(map(int, input().split()))
target = int(input())
ans = two_sum(nums, target)
if ans:
    print(ans[0], ans[1])
else:
    print(-1)
\`\`\`

**Examples:** \`2 7 11 15\`, target 9 → \`0 1\`; \`3 3\`, target 6 → \`0 1\`; \`1 2 3\`, target 10 → \`-1\`.

If the array is **sorted**, a two-pointer approach (one at each end, move inward) gives O(1) extra space.`,
          d: 'medium',
          at: 'Infosys',
          tip: `State the brute-force solution first, then improve it; interviewers want to see the reasoning, not just the trick.`,
        },
        {
          q: `Check whether a string of brackets ( ), { }, [ ] is balanced.`,
          a: `**Approach:** use a **stack**. Push every opening bracket. For a closing bracket, the stack must be non-empty and its top must be the matching opening bracket; pop it. At the end the stack must be empty (no unclosed brackets).

**Complexity:** O(n) time, O(n) space in the worst case.

\`\`\`python
def is_balanced(s):
    pairs = {')': '(', '}': '{', ']': '['}
    stack = []
    for ch in s:
        if ch in '({[':
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return not stack

s = input().strip()
print("Balanced" if is_balanced(s) else "Not Balanced")
\`\`\`

**Examples:**
- \`{[()]}\` → Balanced
- \`([)]\` → Not Balanced (\`)\` arrives while the top is \`[\`)
- \`((\` → Not Balanced (stack not empty at the end)
- \`)(\` → Not Balanced (closing bracket with an empty stack)

Simply counting brackets is not enough; \`([)]\` has equal counts but wrong order.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `Merge all overlapping intervals in a list of [start, end] pairs.`,
          a: `**Approach:** sort the intervals by start. Walk through them, keeping a result list. If the current interval starts at or before the end of the last merged interval, they overlap: extend the last interval's end to the larger end. Otherwise, append the current interval as a new one.

**Complexity:** O(n log n) for sorting, O(n) for the scan; O(n) space for the output.

\`\`\`python
def merge_intervals(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [list(intervals[0])]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

n = int(input())
intervals = [list(map(int, input().split())) for _ in range(n)]
for s, e in merge_intervals(intervals):
    print(s, e)
\`\`\`

**Example:** \`[1,3] [2,6] [8,10] [15,18]\` → \`[1,6] [8,10] [15,18]\`; \`[1,4] [4,5]\` → \`[1,5]\` (touching intervals merge because of \`<=\`).

Using \`max\` matters: for \`[1,10] [2,3]\`, the end must stay 10.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `Given coin denominations and an amount, find the minimum number of coins needed to make the amount (unlimited coins of each type). Return -1 if impossible.`,
          a: `**Approach (dynamic programming):** let \`dp[a]\` be the fewest coins that make amount a. \`dp[0] = 0\`. For each amount a from 1 upwards, try every coin c ≤ a: \`dp[a] = min(dp[a], dp[a - c] + 1)\`. Start every other entry at "infinity" (amount + 1 works, since no answer can need more coins than the amount).

Greedy (always take the largest coin) fails for some coin sets: coins {1, 3, 4}, amount 6 → greedy gives 4+1+1 (3 coins), but 3+3 needs 2.

**Complexity:** O(amount × number of coins) time, O(amount) space.

\`\`\`python
def min_coins(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1

coins = list(map(int, input().split()))
amount = int(input())
print(min_coins(coins, amount))
\`\`\`

**Examples:** coins \`1 2 5\`, amount 11 → 3 (5+5+1); coins \`2\`, amount 3 → -1; any coins, amount 0 → 0.`,
          d: 'hard',
          at: 'Infosys',
          tip: `Problems like this are more typical of higher-role tests; standard-role tests usually stay with strings and arrays.`,
        },
        {
          q: `Find the length of the longest strictly increasing subsequence in an array.`,
          a: `A **subsequence** keeps the original order but may skip elements.

**DP approach, O(n²):** \`dp[i]\` = length of the longest increasing subsequence ending at i = 1 + max(\`dp[j]\`) over j < i with \`nums[j] < nums[i]\`.

**Optimal approach, O(n log n):** keep a list \`tails\`, where \`tails[k]\` is the smallest possible last value of an increasing subsequence of length k + 1. For each number, binary search the first position in \`tails\` with a value ≥ the number: replace it, or append if the number is larger than everything. The length of \`tails\` is the answer. (\`tails\` itself is not necessarily a real subsequence; only its length is meaningful.)

**Complexity:** O(n log n) time, O(n) space.

\`\`\`python
from bisect import bisect_left

def lis_length(nums):
    tails = []
    for x in nums:
        i = bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x
    return len(tails)

nums = list(map(int, input().split()))
print(lis_length(nums))
\`\`\`

**Example:** \`10 9 2 5 3 7 101 18\` → 4 (e.g. 2, 3, 7, 18). \`bisect_left\` keeps it strictly increasing: \`7 7 7\` → 1.`,
          d: 'hard',
          at: 'Infosys',
        },
      ],
    },
    {
      title: `HR and managerial round`,
      questions: [
        {
          q: `Why do you want to join Infosys?`,
          a: `**Sample answer:**
"Infosys is one of the companies that built India's IT industry, and it is known for how seriously it trains freshers. Three things draw me. First, **learning**: the foundation training gives a strong base before the first project, and I want to start my career with solid fundamentals. Second, **variety**: Infosys works with clients across banking, retail, manufacturing and more, so I can explore domains and technologies. Third, **values**: Infosys describes its values as **C-LIFE: client value, leadership by example, integrity and transparency, fairness, and excellence**. Integrity and excellence matter to me; in [your project] I [example, e.g. reported a bug in my own module before the review instead of hiding it]. I want to grow in a company that cares about doing things the right way."

**Tip:** mention something specific you read on the Infosys website or in recent news. Avoid answers based only on salary or brand name.`,
          d: 'easy',
          at: 'Infosys',
          tip: `Knowing C-LIFE and linking one value to your own example is a simple way to stand out.`,
        },
        {
          q: `Tell me about yourself. (Infosys interview)`,
          a: `**Sample answer:**
"Hello, I am [your name] from [your city]. I have completed my **[degree] in [branch]** at [your college] with [your CGPA]. I mainly code in **[Java / Python]** and I am comfortable with **SQL** and [another skill, e.g. basic HTML/CSS or data structures]. For my final-year project I built **[your project]**, where I handled [your part] using [technologies]. I also [certification / internship / contest, e.g. completed an online course on databases and solved problems regularly on a coding platform]. Outside academics, I [activity showing responsibility, e.g. coordinated our department's technical fest]. I am excited about starting my career at Infosys because of its strong training and the chance to work on real client projects."

**Length:** about one minute.

**What they check:** structured communication, confidence and consistency with your resume. Anything you mention (a course, a contest) can become the next question, so mention only what you can discuss.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `Are you willing to relocate anywhere in India after training?`,
          a: `**Sample answer:**
"Yes, I am open to relocating. I understand that project locations at Infosys depend on client and business needs, and at this stage my priority is learning and good project experience rather than a particular city. I have already [stayed in a hostel / moved cities for college], so adjusting to a new place is not a problem for me."

**Why this works:** a clear yes, a reason that shows you understand how IT services work, and evidence that you can adapt.

**What they check:** flexibility. Freshers are often placed wherever projects need people, and the training location may itself be away from home.

If you have a **genuine constraint**, such as caring for a family member, say so honestly and calmly. It is better to be clear now than to refuse a posting later.`,
          d: 'easy',
          at: 'Infosys',
        },
        {
          q: `Are you comfortable with shift work and the long training period with assessments?`,
          a: `**Sample answer:**
"Yes. Infosys serves clients in many time zones, so some projects need early, late or rotational hours, and I am comfortable with that when the project needs it. I will keep a steady routine so my work quality stays the same.

For training, I see it as a big advantage. I know the foundation training has regular assessments that freshers must clear, so I have already started revising **[programming language], SQL and basic software engineering** to be ready. During my final year I managed [project + exams + another commitment] at the same time, so I am used to steady, structured study."

**What they check:** realistic expectations and commitment. Training assessments are taken seriously at Infosys, and panels like candidates who are prepared for them.

**Avoid** saying "day shift only" without a real reason, or treating training as an easy break before work.`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `What do you know about Infosys? Mention something recent.`,
          a: `Prepare a short, accurate answer from the **official Infosys website and annual report** and recent reliable news. A good structure:

- **What it is:** a large Indian multinational IT services and consulting company, headquartered in Bengaluru, founded in 1981 by N. R. Narayana Murthy and co-founders.
- **What it does:** digital services, consulting, application development and maintenance, cloud, data and AI, for clients across many industries and countries.
- **Values:** C-LIFE (client value, leadership by example, integrity and transparency, fairness, excellence).
- **Training:** known for its large-scale fresher training.
- **Something recent:** one development you read about yourself, such as a new platform, a large client partnership or a sustainability initiative. Check the date and details before quoting it.

**Sample closing line:** "What stands out to me is how much Infosys invests in training freshers, which is exactly what I want at the start of my career."

**Avoid** quoting revenue, headcount or share price figures unless you are sure they are current.`,
          d: 'medium',
          at: 'Infosys',
          tip: `One accurate recent fact beats five half-remembered numbers.`,
        },
        {
          q: `What are your strengths and weaknesses?`,
          a: `**Sample answer:**
"**Strength:** I am a **quick and steady learner**. When our project needed [a technology I had not used, e.g. React], I learned the basics in a week from documentation and built the [module] myself. I also stay calm under deadlines.

**Weakness:** I used to **hesitate to ask for help**, and spend too long stuck on a problem alone. During [your project] it delayed one module by two days. Since then, I give myself a time limit, around an hour, and if I am still stuck I ask a teammate or mentor with what I have tried so far. It has made me faster and I learn more from others."

**Structure:** strength + proof; weakness + real example + what you are doing about it.

**What they check:** self-awareness and honesty. **Avoid** fake weaknesses like "I work too hard" or "I am a perfectionist", and weaknesses that are core to the job, such as "I do not like coding".`,
          d: 'medium',
          at: 'Infosys',
        },
        {
          q: `Describe a time you failed at something. What did you learn? (STAR)`,
          a: `**Sample answer (STAR):**
"**Situation:** in my third year, I entered a coding contest with two friends, [contest name].
**Task:** I was responsible for the problems involving arrays and strings.
**Action:** I did not practise under time pressure beforehand, so I spent 40 minutes on one problem and kept submitting small fixes instead of rethinking my approach. We solved only two problems and did not qualify.
**Result and learning:** I realised that knowing concepts is not enough without timed practice. After that, I practised [number] problems with a timer every week and set a rule: if an approach fails twice, step back and rethink. In the next contest, our team [result, e.g. reached the second round], and it also helped me in the Infosys online test."

**What they check:** honesty, ownership (no blaming others) and real change. Choose a **genuine but recoverable** failure, not something serious like academic misconduct.`,
          d: 'hard',
          at: 'Infosys',
        },
        {
          q: `Your manager gives you a task in a technology you have never used, with a tight deadline. What will you do?`,
          a: `This **situational question** checks learning attitude, honesty and communication.

**Sample answer:**
"First, I would **clarify the task**: the expected output, the deadline and what matters most. Then I would **tell my manager honestly** that I am new to this technology, without making it sound like an excuse, and share my plan.

Next, I would **learn just enough to start**: the official documentation, internal knowledge base, and existing code in the project that uses the same technology. I would build a small working piece early instead of trying to learn everything first.

I would ask a **teammate who knows it** specific questions, after trying things myself first. And I would **update my manager regularly**, so that if the deadline is at risk, they hear it early along with options, for example delivering the core part first.

In [your project], I learned [technology] in [time] the same way and delivered [result]."

**Avoid** "I will work all night and never tell anyone" or "I will ask to be given something else."`,
          d: 'hard',
          at: 'Infosys',
          tip: `Honesty plus early updates is what managers want; hiding a risk until the deadline is the worst choice.`,
        },
      ],
    },
  ],
};

export default book;
