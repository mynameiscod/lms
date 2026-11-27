import { SeedBook, ALL_YEARS } from '../types';

/**
 * Capgemini fresher interview questions. Hiring details are phrased as typical patterns,
 * because test sections, role names and eligibility change from drive to drive.
 */
const book: SeedBook = {
  slug: 'capgemini-interview',
  title: 'Capgemini Interview Questions',
  kind: 'company',
  subject: 'Capgemini',
  description: 'How Capgemini fresher drives usually run, pseudo-code and aptitude practice with worked solutions, technical and coding questions, and HR answers built on Capgemini values.',
  color: '#0369a1',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 105,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Capgemini typically hire freshers?`,
          a: `Capgemini hires freshers through **campus drives**, **off-campus drives** and applications on its careers portal. In recent drives the process has typically been:

1. **Registration** on the official careers or hiring portal.
2. **Online assessment**, which has often included pseudo-code, English communication, a game-based aptitude section and a behavioural or personality section. Some drives also include a coding section, especially for higher roles.
3. **Technical interview**: programming basics, OOP, DBMS, your project.
4. **HR interview**: communication, flexibility, relocation, attitude. In some drives the technical and HR rounds are combined.

Which sections appear, their order and whether each one eliminates candidates **can change from drive to drive**. Read the drive notification carefully and **check the Capgemini careers page** for the current pattern.`,
          d: 'easy',
          at: 'Capgemini',
          tip: `Confirm the test platform and sections from your drive mail before you start preparing.`,
        },
        {
          q: `What is the pseudo-code section in the Capgemini test and how should I prepare for it?`,
          a: `Capgemini tests have often included a **pseudo-code** section: short programs written in a language-neutral style, and you pick the output or find the error. Questions typically test:

- Loops and nested loops (how many times a statement runs)
- Recursion (tracing return values)
- Operators: \`mod\`, integer division, bitwise \`&\`, \`|\`, \`^\`, shifts
- Arrays and strings, conditions, and sometimes basic data structures

**How to prepare:**

- Revise C-style operator precedence and integer division rules.
- **Trace on paper** with a small table of variable values per step; do not guess.
- Practise recursion with small inputs until you can trace it quickly.
- Solve timed sets daily, because the section is usually time-bound.

Since the pseudo-code syntax is not a real language, read the first line of each question carefully for how variables and loops are written.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Write a variable table for every loop; most mistakes come from tracing in your head.`,
        },
        {
          q: `What is the game-based aptitude section and how should I approach it?`,
          a: `Some recent Capgemini drives have used **game-based aptitude**: short interactive puzzles instead of standard multiple-choice questions. Reported formats have included things like memory games, pattern or grid puzzles, deductive reasoning and quick decision tasks. The exact games vary and may change, so treat any list you see online as an example, not a guarantee.

**How to approach it:**

- **Read the instructions** of each game fully; scoring rules differ (some reward accuracy, some speed, some both).
- Start carefully; most games get harder as you go.
- Do not panic after a mistake; keep focus on the next item.
- Take the test in a quiet place with a stable internet connection and a working mouse.
- Practise general logical puzzles, memory games and pattern recognition in the weeks before.

These games are designed to measure cognitive ability, so steady attention matters more than tricks.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Sleep well before the test; game-based sections measure focus and memory directly.`,
        },
        {
          q: `What does the English communication section check?`,
          a: `Capgemini drives have commonly included an **English** or **communication** section, because freshers work with clients and teams across countries. It typically checks:

- **Grammar**: sentence correction, error spotting, tenses, articles, prepositions
- **Vocabulary**: synonyms, antonyms, fill in the blanks
- **Reading comprehension**: short passages with questions
- **Sentence ordering** (para-jumbles)

Some drives also include spoken or written tasks, such as repeating sentences, answering a question aloud or writing a short email.

**Preparation:** read one English article daily, note new words, practise 20 grammar questions a day, and speak in English with a friend for 10 minutes. For email tasks, use a clear structure: greeting, purpose, details, polite closing.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `What is the behavioural competency or personality section in Capgemini tests?`,
          a: `Some Capgemini drives have included a **behavioural competency** or **personality** section. It presents statements or workplace situations and asks how you would respond or how much you agree.

There is usually **no single right answer**; it looks for consistency and traits that fit a professional team, such as teamwork, ownership, honesty and adaptability.

**Tips:**

- Answer honestly and consistently; similar statements may appear more than once in different words.
- Think as a professional at work, not as a student in college.
- Avoid extreme answers on every item; pick what you would genuinely do.
- Do not overthink; such sections are often timed.

Capgemini publicly lists values such as honesty, team spirit and trust, so being yourself while keeping those in mind is a sensible approach.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `What fresher roles does Capgemini usually hire for?`,
          a: `In recent drives Capgemini has hired freshers into roles with names such as **Analyst** and **Senior Analyst**, and sometimes other titles for specific programmes. Typically:

- The **standard role** is reached through the regular online assessment and interviews.
- A **higher role** often needs good performance in an additional or harder section, such as coding, and a stronger technical interview.

Role names, which sections decide each role and the package for each **change from year to year**, so do not rely on a senior's offer letter. Check the official drive mail and careers page.

For preparation, aim for the higher role: practise coding as well as pseudo-code, so you are not limited to the standard role by a weak section.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Ask in the drive briefing which sections decide which role.`,
        },
        {
          q: `How do I prepare for the Capgemini technical interview?`,
          a: `The technical interview usually stays close to your resume and core subjects:

- **One programming language** (C, Java or Python): data types, loops, strings, arrays, functions, exceptions.
- **OOP**: class and object, inheritance, polymorphism, abstraction, encapsulation, abstract class vs interface.
- **DBMS/SQL**: keys, joins, normalization, ACID, simple queries.
- **OS and networks basics**: process vs thread, paging, TCP vs UDP.
- **SDLC and Agile**: Capgemini works heavily on client delivery, so knowing the basics of Agile and Scrum helps.
- **Your project**: purpose, your role, tech stack, one challenge.

Practise writing small programs by hand (reverse a string, prime check, Fibonacci), because some interviewers ask you to write code on paper or share your screen.`,
          d: 'easy',
          at: 'Capgemini',
          tip: `Prepare two projects deeply rather than listing five you cannot explain.`,
        },
        {
          q: `What eligibility, documents and onboarding steps should I expect at Capgemini?`,
          a: `**Eligibility** is set per drive and has typically included the degree and branch (BE/BTech, MCA, sometimes others), minimum academic percentages, no active backlogs at joining, limits on education gaps and specific passing years. Check the exact numbers in the official notification.

**Documents** to keep ready: resume, photographs, government ID (Aadhaar, PAN), all mark sheets and certificates, the interview mail, and a gap affidavit if needed. Names and dates must match across documents.

**After the offer**, the usual sequence is: accepting the offer on the portal, document submission and background verification, possibly some pre-joining learning, a joining date (which may come months later depending on demand) and **initial training** before project allocation.

Terms such as any service agreement, training rules and location are written in your offer documents; read them fully and ask HR about anything unclear.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Keep scans of every document in one folder; onboarding portals ask for them in a hurry.`,
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `What is the output of this pseudo-code?

\`\`\`
Integer x = 10, y = 0
while (x > 0)
    y = y + (x mod 3)
    x = x - 2
end while
print y
\`\`\`

A) 5   B) 6   C) 7   D) 8`,
          a: `**Answer: B) 6**

Trace each iteration:

| x before | x mod 3 | y after | x after |
|---|---|---|---|
| 10 | 1 | 1 | 8 |
| 8 | 2 | 3 | 6 |
| 6 | 0 | 3 | 4 |
| 4 | 1 | 4 | 2 |
| 2 | 2 | 6 | 0 |

When x becomes 0 the condition \`x > 0\` is false, so the loop stops. y = 1 + 2 + 0 + 1 + 2 = **6**.

The common mistake is running one extra iteration with x = 0 (which would add 0 anyway here) or forgetting that 6 mod 3 is 0.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Use a table for loops: one row per iteration, one column per variable.`,
        },
        {
          q: `What does this pseudo-code print?

\`\`\`
Integer fun(Integer n)
    if (n <= 1)
        return 1
    return n + fun(n - 2)
end function

print fun(7)
\`\`\`

A) 15   B) 16   C) 28   D) 13`,
          a: `**Answer: B) 16**

Expand the recursion:

- fun(7) = 7 + fun(5)
- fun(5) = 5 + fun(3)
- fun(3) = 3 + fun(1)
- fun(1) = 1 (base case, since 1 <= 1)

Now return upwards:

- fun(3) = 3 + 1 = 4
- fun(5) = 5 + 4 = 9
- fun(7) = 7 + 9 = **16**

So it adds the odd numbers 7 + 5 + 3 + 1 = 16.

Why the traps: 28 is 7+6+5+4+3+2+1 (if it decreased by 1), and 15 forgets the base case value 1. Always write down the base case value explicitly.`,
          d: 'hard',
          at: 'Capgemini',
          tip: `For recursion, write the calls going down, then fill in the values coming back up.`,
        },
        {
          q: `What is the output of this pseudo-code?

\`\`\`
Integer a = 12, b = 10
print (a & b) + (a ^ b)
\`\`\`

(& is bitwise AND, ^ is bitwise XOR)

A) 12   B) 14   C) 22   D) 8`,
          a: `**Answer: B) 14**

Write both numbers in binary:

- 12 = 1100
- 10 = 1010

**a & b** (1 only where both bits are 1): 1100 & 1010 = 1000 = **8**

**a ^ b** (1 where bits differ): 1100 ^ 1010 = 0110 = **6**

Sum = 8 + 6 = **14**.

**Useful identity:** (a & b) + (a ^ b) = a | b, because AND keeps the shared bits and XOR keeps the bits that only one number has, and they never overlap. Here 1100 | 1010 = 1110 = 14, which confirms the answer.

Another related identity: a + b = (a ^ b) + 2 x (a & b) = 6 + 16 = 22.`,
          d: 'hard',
          at: 'Capgemini',
          tip: `Convert small numbers to 4-bit binary and line them up; bitwise questions become quick.`,
        },
        {
          q: `Find the next number: 2, 6, 12, 20, 30, ?

A) 40   B) 42   C) 44   D) 36`,
          a: `**Answer: B) 42**

**Method 1 - differences:** 6 - 2 = 4, 12 - 6 = 6, 20 - 12 = 8, 30 - 20 = 10. The differences increase by 2, so the next difference is 12, and 30 + 12 = **42**.

**Method 2 - formula:** each term is n x (n + 1):

- 1 x 2 = 2
- 2 x 3 = 6
- 3 x 4 = 12
- 4 x 5 = 20
- 5 x 6 = 30
- 6 x 7 = **42**

Both methods agree. When differences grow by a constant amount, the series is quadratic, and n(n + 1) or n^2 plus a constant are the usual forms.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `A number is first increased by 20% and then decreased by 20%. What is the net change?

A) No change   B) 4% increase   C) 4% decrease   D) 2% decrease`,
          a: `**Answer: C) 4% decrease**

Let the number be 100.

- After a 20% increase: 100 x 1.2 = 120
- After a 20% decrease: 120 x 0.8 = **96**

Net change = 96 - 100 = -4, a **4% decrease**.

**Shortcut** for successive changes of x% and y%: net = x + y + (x x y) / 100. With x = +20 and y = -20: 20 - 20 + (20 x -20) / 100 = **-4%**.

The decrease is applied to a bigger base (120), so it removes more than the increase added. That is why "no change" is the trap.`,
          d: 'easy',
          at: 'Capgemini',
          tip: `Equal percentage up and down always gives a net loss of x²/100 percent.`,
        },
        {
          q: `A man travels to his office at 40 km/h and returns along the same route at 60 km/h. What is his average speed for the whole journey?

A) 50 km/h   B) 48 km/h   C) 45 km/h   D) 52 km/h`,
          a: `**Answer: B) 48 km/h**

Average speed = total distance / total time, not the average of the two speeds.

Let the one-way distance be 120 km (LCM of 40 and 60):

- Time going = 120 / 40 = 3 hours
- Time returning = 120 / 60 = 2 hours
- Total distance = 240 km, total time = 5 hours

Average speed = 240 / 5 = **48 km/h**.

**Shortcut** for equal distances: 2xy / (x + y) = (2 x 40 x 60) / 100 = 4800 / 100 = 48 km/h.

The trap answer is 50 km/h. He spends more time at the slower speed, so the average is pulled below 50.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `Statements: All pens are books. Some books are tables.
Conclusions: I. Some pens are tables. II. Some tables are books.

A) Only I follows   B) Only II follows   C) Both follow   D) Neither follows`,
          a: `**Answer: B) Only II follows**

**Conclusion I - Some pens are tables:** the pens circle sits fully inside books. The tables circle overlaps books, but it may overlap the part of books that has no pens. Nothing forces pens and tables to meet, so I is only a possibility and **does not follow**.

**Conclusion II - Some tables are books:** this is just the reverse of the statement "Some books are tables". A "some" statement can always be reversed ("some A are B" means "some B are A"), so II **definitely follows**.

Drawing Venn diagrams helps: try to draw a case where the conclusion is false. If you can, the conclusion does not follow.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `For every conclusion, try to draw a diagram that breaks it.`,
        },
        {
          q: `A and B together can finish a work in 8 days. A alone can finish it in 12 days. In how many days can B alone finish it?

A) 20   B) 24   C) 16   D) 18`,
          a: `**Answer: B) 24 days**

Take total work = LCM(8, 12) = **24 units**.

- A + B together = 24 / 8 = 3 units/day
- A alone = 24 / 12 = 2 units/day
- So B alone = 3 - 2 = 1 unit/day

B's time = 24 / 1 = **24 days**.

Check with fractions: 1/8 - 1/12 = 3/24 - 2/24 = 1/24, so B does 1/24 of the work per day and needs 24 days.

Final check: A (1/12) + B (1/24) = 2/24 + 1/24 = 3/24 = 1/8 per day, matching the given 8 days.`,
          d: 'medium',
          at: 'Capgemini',
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `What is the difference between a class and an object? What is a constructor?`,
          a: `- A **class** is a blueprint that defines data (attributes) and behaviour (methods). It takes no memory for data by itself.
- An **object** is an instance of a class created at runtime, with its own values for the attributes.

Example: \`Car\` is a class; \`my_car = Car("Red", "Swift")\` is an object.

A **constructor** is a special method that runs automatically when an object is created, used to initialise its attributes. In Java it has the same name as the class and no return type; in Python it is \`__init__\`.

\`\`\`python
class Car:
    def __init__(self, colour, model):   # constructor
        self.colour = colour
        self.model = model

    def describe(self):
        return f"{self.colour} {self.model}"

my_car = Car("Red", "Swift")
print(my_car.describe())  # Red Swift
\`\`\`

Java also has a default (no-argument) constructor if you write none, and supports constructor overloading.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `What is the difference between an abstract class and an interface in Java?`,
          a: `| | Abstract class | Interface |
|---|---|---|
| Methods | Abstract and concrete methods | Abstract methods; \`default\` and \`static\` methods since Java 8, \`private\` since Java 9 |
| Variables | Any kind, including instance fields | Only \`public static final\` constants |
| Constructors | Yes | No |
| Inheritance | A class extends **one** abstract class | A class implements **many** interfaces |
| Use it when | Classes share state and common code ("is-a") | Unrelated classes share a capability ("can-do") |

\`\`\`java
abstract class Shape {
    abstract double area();
    void print() { System.out.println("Area: " + area()); }
}
interface Drawable { void draw(); }
class Circle extends Shape implements Drawable {
    double r = 2;
    double area() { return Math.PI * r * r; }
    public void draw() { System.out.println("Drawing circle"); }
}
\`\`\`

Neither can be instantiated directly. Interfaces are Java's way to get multiple inheritance of type without the diamond problem of state.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Mention Java 8 default methods; it shows you know modern Java.`,
        },
        {
          q: `What is exception handling? Explain checked and unchecked exceptions.`,
          a: `**Exception handling** lets a program respond to runtime errors instead of crashing. In Java you use \`try\`, \`catch\`, \`finally\`, \`throw\` and \`throws\`.

\`\`\`java
try {
    int result = 10 / divisor;
} catch (ArithmeticException e) {
    System.out.println("Cannot divide by zero");
} finally {
    System.out.println("Always runs");  // cleanup, e.g. closing a file
}
\`\`\`

- **Checked exceptions** are checked at compile time; you must catch them or declare them with \`throws\`. Examples: \`IOException\`, \`SQLException\`. They represent recoverable conditions outside your code's control.
- **Unchecked exceptions** extend \`RuntimeException\` and are not checked at compile time. Examples: \`NullPointerException\`, \`ArrayIndexOutOfBoundsException\`, \`ArithmeticException\`. They usually signal programming bugs.
- **Errors** (\`OutOfMemoryError\`) are serious JVM problems you normally do not catch.

Python has only unchecked-style exceptions, handled with \`try / except / else / finally\`.`,
          d: 'medium',
          at: 'Capgemini',
        },
        {
          q: `Explain the types of SQL joins with an example.`,
          a: `Assume \`employees(id, name, dept_id)\` and \`departments(id, name)\`.

- **INNER JOIN**: only rows with a match in both tables (employees who have a valid department).
- **LEFT JOIN**: all rows from the left table, with NULLs where the right table has no match (all employees, even without a department).
- **RIGHT JOIN**: all rows from the right table (all departments, even with no employees).
- **FULL OUTER JOIN**: all rows from both sides. MySQL lacks it; combine LEFT and RIGHT joins with \`UNION\`.
- **CROSS JOIN**: every combination of rows (m x n rows).
- **SELF JOIN**: a table joined with itself, for example employees with their managers.

\`\`\`sql
SELECT e.name, d.name AS department
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
\`\`\`

To find employees with no department: add \`WHERE d.id IS NULL\` to the LEFT JOIN.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Draw two overlapping circles while explaining; interviewers like the visual.`,
        },
        {
          q: `What are ACID properties? Explain with a bank transfer example and mention isolation levels.`,
          a: `ACID properties make database transactions reliable. Take a transfer of ₹1,000 from account A to account B (debit A, credit B):

- **Atomicity**: both steps happen or neither does. If the credit fails, the debit is rolled back.
- **Consistency**: the transaction moves the database from one valid state to another; total money and constraints (no negative balance) are preserved.
- **Isolation**: concurrent transactions do not see each other's half-finished work. Another query should not see A debited but B not yet credited.
- **Durability**: once committed, the change survives crashes, because it is written to logs or disk.

**Isolation levels** (weakest to strongest): **Read Uncommitted** (dirty reads possible), **Read Committed** (no dirty reads), **Repeatable Read** (same row reads give the same value; MySQL InnoDB's default), **Serializable** (transactions behave as if run one by one). Stronger isolation means fewer anomalies but less concurrency.`,
          d: 'hard',
          at: 'Capgemini',
          tip: `The bank-transfer example is expected; know which anomaly each isolation level prevents.`,
        },
        {
          q: `What is the difference between TCP and UDP?`,
          a: `| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (3-way handshake) | Connectionless |
| Reliability | Guaranteed delivery, retransmits lost data | No guarantee |
| Order | Delivers in order | May arrive out of order |
| Speed / overhead | Slower, larger header (20+ bytes) | Faster, 8-byte header |
| Flow and congestion control | Yes | No |
| Used for | Web (HTTP/HTTPS), email, file transfer, SSH | Video calls, live streaming, online games, DNS queries |

The **3-way handshake**: client sends SYN, server replies SYN-ACK, client sends ACK, and the connection is open.

Choose TCP when every byte must arrive correctly, and UDP when speed matters more than an occasional lost packet, for example in a live video call where an old frame is useless anyway.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `What is the difference between the Waterfall model and Agile? What is Scrum?`,
          a: `- **Waterfall** runs phases in sequence: requirements, design, development, testing, deployment. Each phase finishes before the next starts. It suits projects with fixed, well-understood requirements, but changes late in the project are costly and the customer sees working software only at the end.
- **Agile** builds software in short iterations, delivering small working pieces often, taking feedback and adapting. Requirements can change between iterations.

**Scrum** is a popular Agile framework:

- **Roles**: Product Owner (owns the backlog and priorities), Scrum Master (removes blockers, guards the process), Development Team.
- **Events**: Sprint (usually 1–4 weeks), Sprint Planning, Daily Stand-up, Sprint Review, Sprint Retrospective.
- **Artifacts**: Product Backlog, Sprint Backlog, Increment.

Many client projects at IT services companies like Capgemini follow Agile or a hybrid, so freshers often attend daily stand-ups from their first project.`,
          d: 'medium',
          at: 'Capgemini',
        },
        {
          q: `What is paging and virtual memory? What is a page fault?`,
          a: `**Paging** divides a process's logical memory into fixed-size **pages** and physical memory into frames of the same size. A **page table** maps each page to a frame, so a process does not need one continuous block of RAM. This removes external fragmentation (some internal fragmentation remains in the last page).

**Virtual memory** lets a process use more memory than physically available. Only the pages currently needed stay in RAM; the rest live on disk (swap space). The CPU uses virtual addresses, and the MMU translates them, with a **TLB** caching recent translations for speed.

A **page fault** occurs when a process accesses a page not in RAM. The OS pauses the process, loads the page from disk (evicting another if memory is full) and resumes it.

**Page replacement algorithms:** FIFO, LRU (least recently used), Optimal (theoretical best). If the system spends more time swapping pages than running work, it is called **thrashing**.`,
          d: 'hard',
          at: 'Capgemini',
          tip: `Mention thrashing and LRU; they are the usual follow-ups.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Reverse the order of words in a sentence (for example "I love coding" becomes "coding love I").`,
          a: `**Approach:** split the sentence into words, reverse the list and join with single spaces. \`split()\` without arguments also removes extra spaces. If the interviewer forbids built-ins, collect words manually and build the result from the end.

**Complexity:** O(n) time and O(n) space, where n is the sentence length.

\`\`\`python
def reverse_words(sentence):
    return ' '.join(sentence.split()[::-1])

def reverse_words_manual(sentence):
    words, current = [], ''
    for ch in sentence:
        if ch == ' ':
            if current:
                words.append(current)
                current = ''
        else:
            current += ch
    if current:
        words.append(current)
    result = ''
    for i in range(len(words) - 1, -1, -1):
        result += words[i] + (' ' if i > 0 else '')
    return result

print(reverse_words("I love coding"))            # coding love I
print(reverse_words_manual("  Hello   World  "))  # World Hello
\`\`\``,
          d: 'easy',
          at: 'Capgemini',
          tip: `Ask whether extra spaces must be kept; it changes the solution.`,
        },
        {
          q: `Check whether a number is an Armstrong number (for example 153 = 1³ + 5³ + 3³).`,
          a: `**Approach:** an Armstrong number equals the sum of its digits, each raised to the power of the number of digits. Count the digits, then add each digit to that power and compare with the original.

**Complexity:** O(d) time, where d is the number of digits.

\`\`\`python
def is_armstrong(n):
    digits = str(n)
    power = len(digits)
    return n == sum(int(d) ** power for d in digits)

def is_armstrong_math(n):
    power = len(str(n))
    total, temp = 0, n
    while temp > 0:
        total += (temp % 10) ** power
        temp //= 10
    return total == n

print(is_armstrong(153))        # True  (1 + 125 + 27)
print(is_armstrong(9474))       # True  (4-digit: 6561 + 256 + 2401 + 256)
print(is_armstrong_math(123))   # False
print([n for n in range(100, 1000) if is_armstrong(n)])  # [153, 370, 371, 407]
\`\`\`

Note the power is the **digit count**, not always 3; 9474 uses power 4.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `Find the first non-repeating character in a string.`,
          a: `**Approach:** two passes. First count every character; then scan the string again in order and return the first character whose count is 1. The second pass over the string (not the dictionary) guarantees we return the earliest one.

**Complexity:** O(n) time, O(k) space for the counts.

\`\`\`python
from collections import Counter

def first_non_repeating(s):
    counts = Counter(s)
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None

print(first_non_repeating("swiss"))      # w
print(first_non_repeating("aabbcdd"))    # c
print(first_non_repeating("aabb"))       # None
\`\`\`

Without \`Counter\`, build the counts with a plain dictionary: \`counts[ch] = counts.get(ch, 0) + 1\`. A nested loop that counts each character separately is O(n²) and may time out on long inputs, so mention why the dictionary is better.`,
          d: 'medium',
          at: 'Capgemini',
        },
        {
          q: `Find the GCD and LCM of all numbers in an array.`,
          a: `**Approach:** use the **Euclidean algorithm**: gcd(a, b) = gcd(b, a mod b) until b is 0. Fold it over the array. For LCM use lcm(a, b) = a x b / gcd(a, b), also folded over the array. Divide before multiplying when possible to keep numbers small.

**Complexity:** O(n log m) time, where m is the largest number; O(1) extra space.

\`\`\`python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def gcd_lcm(nums):
    g = l = nums[0]
    for x in nums[1:]:
        g = gcd(g, x)
        l = l // gcd(l, x) * x
    return g, l

print(gcd_lcm([12, 18, 24]))  # (6, 72)
print(gcd_lcm([4, 6, 8]))     # (2, 24)
\`\`\`

Python's \`math.gcd\` and (from 3.9) \`math.lcm\` do the same, but writing Euclid's algorithm yourself is what the test usually expects.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Explain why Euclid works: gcd(a, b) also divides a mod b.`,
        },
        {
          q: `Convert a decimal number to binary and a binary string back to decimal without built-in functions.`,
          a: `**Approach:**

- **Decimal to binary:** repeatedly divide by 2 and collect remainders; the remainders read in reverse are the binary digits.
- **Binary to decimal:** scan bits left to right; at each step multiply the running value by 2 and add the bit (Horner's method).

**Complexity:** O(log n) for decimal to binary, O(L) for a binary string of length L.

\`\`\`python
def to_binary(n):
    if n == 0:
        return '0'
    bits = []
    while n > 0:
        bits.append(str(n % 2))
        n //= 2
    return ''.join(reversed(bits))

def to_decimal(b):
    value = 0
    for bit in b:
        value = value * 2 + int(bit)
    return value

print(to_binary(13))       # 1101
print(to_decimal('1101'))  # 13
print(to_binary(0))        # 0
\`\`\`

Check 13: 13/2 = 6 r1, 6/2 = 3 r0, 3/2 = 1 r1, 1/2 = 0 r1, read upwards: 1101. Built-ins \`bin(13)\` and \`int('1101', 2)\` exist, but tests often ask for the manual logic.`,
          d: 'medium',
          at: 'Capgemini',
        },
        {
          q: `Compress a string by replacing runs of the same character with the character and its count (for example "aaabbc" becomes "a3b2c1").`,
          a: `**Approach:** walk through the string, counting how many times the current character repeats consecutively. When the character changes, append the previous character and its count, then reset the count. Remember to append the last run after the loop.

**Complexity:** O(n) time, O(n) space for the output. Building a list and joining once avoids repeated string concatenation.

\`\`\`python
def compress(s):
    if not s:
        return ''
    out = []
    count = 1
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            count += 1
        else:
            out.append(f'{s[i - 1]}{count}')
            count = 1
    out.append(f'{s[-1]}{count}')
    return ''.join(out)

print(compress("aaabbc"))   # a3b2c1
print(compress("abc"))      # a1b1c1
print(compress("aabaa"))    # a2b1a2
\`\`\`

Note "aabaa" gives a2b1a2, not a4b1: this counts **consecutive** runs. If the question asks for total counts, use a frequency dictionary instead. Some variants return the original string when the compressed one is not shorter.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `The missed last run is the most common bug; test with a string ending in a repeat.`,
        },
        {
          q: `Print the elements of a matrix in spiral order.`,
          a: `**Approach:** keep four boundaries: \`top\`, \`bottom\`, \`left\`, \`right\`. Go right along the top row, down the right column, left along the bottom row, and up the left column, shrinking the matching boundary after each side. The two checks inside the loop stop a single remaining row or column from being printed twice.

**Complexity:** O(rows x cols) time, O(1) extra space besides the output.

\`\`\`python
def spiral(matrix):
    result = []
    if not matrix:
        return result
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            result.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            result.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                result.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                result.append(matrix[r][left])
            left += 1
    return result

print(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))  # [1, 2, 3, 6, 9, 8, 7, 4, 5]
print(spiral([[1, 2, 3, 4], [5, 6, 7, 8]]))       # [1, 2, 3, 4, 8, 7, 6, 5]
\`\`\``,
          d: 'hard',
          at: 'Capgemini',
          tip: `Test a single row and a single column matrix; that is where boundary bugs show.`,
        },
        {
          q: `Find the longest palindromic substring in a string.`,
          a: `**Approach:** **expand around the centre**. Every palindrome has a centre: one character (odd length) or the gap between two characters (even length). For each of the 2n - 1 centres, expand outwards while the characters on both sides match, and keep the longest span found.

**Complexity:** O(n²) time, O(1) extra space. (Manacher's algorithm does it in O(n) but is rarely expected in a service-company test.)

\`\`\`python
def longest_palindrome(s):
    if not s:
        return ''
    start, end = 0, 0
    for center in range(len(s)):
        for lo, hi in ((center, center), (center, center + 1)):
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                lo -= 1
                hi += 1
            if hi - lo - 1 > end - start + 1:
                start, end = lo + 1, hi - 1
    return s[start:end + 1]

print(longest_palindrome("babad"))    # bab
print(longest_palindrome("cbbd"))     # bb
print(longest_palindrome("forgeeksskeegfor"))  # geeksskeeg
\`\`\`

After the while loop, \`lo\` and \`hi\` have gone one step too far, so the palindrome is \`s[lo + 1 : hi]\` with length \`hi - lo - 1\`.`,
          d: 'hard',
          at: 'Capgemini',
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Why do you want to join Capgemini?`,
          a: `Show you know the company and connect it to your goals.

**Model answer:**

"Capgemini is a global consulting and technology services company with a long history and clients in many countries, so as a fresher I would work on real projects for international clients and learn how large systems are delivered. Its work in areas like cloud, data, AI and digital engineering matches the direction I want to grow in, especially [area related to your project or interest].

I also like that Capgemini talks openly about its values, such as honesty, team spirit and trust. In my final-year project [your project], what made us succeed was good teamwork, so a culture that values that matters to me.

And the structured training for freshers would help me build a solid base in [technology] before I start on a project."

Check Capgemini's current website before the interview so your facts are up to date.`,
          d: 'easy',
          at: 'Capgemini',
          tip: `Name one specific service area or value you read about on the official site.`,
        },
        {
          q: `Capgemini has seven core values. Which one do you relate to most, and why?`,
          a: `Capgemini's publicly stated values are **Honesty, Boldness, Trust, Freedom, Team Spirit, Modesty and Fun**. Pick one you can back with a real example.

**Model answer (Honesty):**

"I relate most to **honesty**. During our final-year project, I realised two days before the review that a feature I owned, [feature], had a bug that broke the report for large inputs. I could have hidden it in the demo, but I told my guide and team, explained what was wrong and asked for one extra day. I fixed it by [your fix], and the guide appreciated that we were upfront.

At work, I think honesty matters even more: if a client or manager knows the real status early, the team can plan around problems instead of being surprised."

You can do the same with **Team Spirit** (helping a struggling teammate) or **Boldness** (taking on something new, like a hackathon). Avoid listing all seven without an example.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Learn all seven values; interviewers sometimes ask you to name them first.`,
        },
        {
          q: `Are you willing to relocate and work in shifts if the project needs it?`,
          a: `Capgemini serves clients in many countries and time zones, so placement location and working hours depend on the project.

**Model answer:**

"Yes, I am willing to relocate to any Capgemini location in India. Early in my career, project exposure matters more to me than the city, and I am comfortable living on my own. Capgemini has large centres in cities such as Bengaluru, Mumbai, Pune, Hyderabad, Chennai and Noida, and I would be happy in any of them.

I am also comfortable with shifts. Client projects in Europe or the US can need overlap with their working hours, and I can adjust my routine for that."

If you have a genuine constraint, say yes first and then mention it politely as a preference. Do not agree in the interview if you already know you will refuse later.`,
          d: 'easy',
          at: 'Capgemini',
        },
        {
          q: `Tell me about a time you worked successfully in a team.`,
          a: `Use **STAR** (Situation, Task, Action, Result). Team spirit is one of Capgemini's stated values, so this question is common.

**Model answer:**

"**Situation:** In a 24-hour college hackathon, our team of four built [project idea]. Ten hours in, our frontend developer was stuck and the demo looked incomplete.

**Task:** I was handling the backend APIs, which were nearly done, and my job was to make sure the team had a working demo.

**Action:** I finished my remaining API, wrote simple API documentation so the frontend could connect without asking me each time, and then paired with my teammate on the two screens that were blocking him. We also agreed to cut one non-essential feature so we could finish properly.

**Result:** We delivered a working demo on time and [came second / got a special mention]. I learned that communicating clearly and cutting scope early is better than everyone working alone until the last hour."

Focus on **your** actions while giving credit to the team.`,
          d: 'medium',
          at: 'Capgemini',
          tip: `Use "I" for your actions and "we" for the outcome.`,
        },
        {
          q: `Are you comfortable working on any technology, including testing or support, after training?`,
          a: `Service companies allocate freshers based on project needs after training, so flexibility is important.

**Model answer:**

"Yes. I see my first role as the place to build strong fundamentals, and they carry across technologies. My main skills are [language] and SQL, but I learn new tools quickly: for [your project] I learned [new tool/framework] in about [time] by building small examples from the documentation.

If I am trained on a different stack or placed in testing or support, I will treat it seriously. Testing teaches you how systems fail, and support teaches you how real users use software; both make you a better developer later. Over time I would like to grow towards [interest], and I would show that through good work and certifications."

This answer is flexible without sounding like you have no interests of your own.`,
          d: 'medium',
          at: 'Capgemini',
        },
        {
          q: `What are your strengths and weaknesses?`,
          a: `Give strengths with evidence, and a real weakness with what you are doing about it.

**Model answer:**

"**Strengths:** I am consistent and I finish what I start. For example, I solved [number] coding problems over [months] by practising daily, and I completed [your project] on schedule even when our team shrank. I also explain things clearly; classmates often asked me to help them debug before exams.

**Weakness:** I used to hesitate to speak in large groups, which meant my ideas were sometimes not heard in team discussions. To work on it, I started presenting our project updates in class and joined [club or activity]. I am much more comfortable now, and I keep practising by volunteering to present."

Avoid fake weaknesses like "I am a perfectionist" or "I work too hard". Also avoid weaknesses that are core to the job, such as "I do not like coding".`,
          d: 'easy',
          at: 'Capgemini',
          tip: `Every weakness should end with the steps you are taking to improve it.`,
        },
        {
          q: `Tell me about a failure and what you learned from it.`,
          a: `This tests honesty and modesty, two of Capgemini's stated values. Choose a real failure, own it, and show the change it caused.

**Model answer:**

"**Situation:** In my third year I applied for an internship at [company] and cleared the online test, but I failed the technical interview.

**What went wrong:** I had listed [technology] on my resume after only watching tutorials. When the interviewer asked me to explain how my project handled [specific concept], I could not answer properly. That was my fault, not bad luck.

**What I did:** I removed anything from my resume that I could not explain, rebuilt [your project] myself from scratch, and started explaining my code aloud to a friend every week. I also began solving problems daily instead of only before tests.

**Result:** In my next interview, at [company or college event], I was able to explain every line of my project and [got the internship / received good feedback]. I learned that real understanding beats a long resume."

Do not choose a failure that was someone else's fault.`,
          d: 'hard',
          at: 'Capgemini',
          tip: `Take responsibility clearly; blaming others is the fastest way to fail this question.`,
        },
        {
          q: `Do you plan to go for higher studies? Are you comfortable with any service agreement or training commitment?`,
          a: `The interviewer wants to know whether you will stay and complete training and early projects.

**Model answer:**

"Right now my priority is to start working, learn how real software is built and grow in the industry. I may consider further studies or a part-time certification in the future, but only if it helps my work, and I would aim to do it alongside my job rather than leaving early. Many professionals at companies like Capgemini grow through internal training and certifications, and that path suits me.

Regarding any agreement or training rules, I will read the terms in the offer letter carefully. If I accept the offer, I will honour what I have agreed to."

Do not say you are joining only until your GATE, CAT or GRE result. Whether a service agreement exists and its terms vary by year and role, so **check your offer documents** rather than assuming.`,
          d: 'hard',
          at: 'Capgemini',
          tip: `Be honest; if you have firm study plans, it is better to say so than to break a commitment later.`,
        },
      ],
    },
  ],
};

export default book;
