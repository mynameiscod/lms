import { SeedBook, ALL_YEARS } from '../types';

/**
 * Wipro fresher interview preparation. Hiring details change every year, so chapter 1
 * describes typical patterns only and always points students to the official careers page.
 */
const book: SeedBook = {
  slug: 'wipro-interview',
  title: 'Wipro Interview Questions',
  kind: 'company',
  subject: 'Wipro',
  description: 'Prepare for Wipro fresher hiring: how the drive typically runs, test-style aptitude, technical and coding questions with Python solutions, and HR answers built on Wipro values.',
  color: '#7c3aed',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 102,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Wipro's fresher hiring process typically work?`,
          a: `Wipro hires most freshers through large campus and off-campus drives. In recent years the main fresher programme has been run under the **Elite National Talent Hunt (NTH)** name, but names and formats change, so always check the official Wipro careers page for the current drive.

A typical drive looks like this:

1. **Registration** on the careers portal with your academic details.
2. **Online assessment**: usually aptitude (quantitative, logical, verbal), a written communication task and a coding section.
3. **Technical interview**: CS fundamentals, one programming language and your project.
4. **HR interview**: communication, attitude, relocation and shift flexibility, and company fit.

In some drives the technical and HR rounds are combined into one conversation. Results and offer letters usually arrive by email, followed by onboarding and training.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Read the drive notification carefully: it lists the exact rounds, eligibility and test platform for that year.`,
        },
        {
          q: `What sections are usually part of Wipro's online assessment?`,
          a: `In recent drives the online assessment has typically had these parts (the exact mix and timing vary by year):

- **Quantitative aptitude**: percentages, profit and loss, time and work, time-speed-distance, ratios, simple and compound interest, probability.
- **Logical reasoning**: series, coding-decoding, blood relations, directions, seating arrangement, syllogisms.
- **Verbal ability**: reading comprehension, grammar and error spotting, synonyms and antonyms, sentence completion.
- **Written communication**: a short essay on a given topic, checked for grammar, structure and clarity.
- **Online coding**: usually a small number of programming problems solved in a language of your choice, scored on test cases.

Sections are often individually timed, so you cannot carry spare minutes from one section to the next. Practise each section under a timer rather than only solving untimed problems.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Practise mixed sets under a timer; speed and accuracy together matter more than knowing rare tricks.`,
        },
        {
          q: `How should I prepare for the written communication (essay) part?`,
          a: `The essay checks whether you can write clear, correct professional English, not whether you have deep knowledge of the topic. Topics are usually general: technology in daily life, remote work, education, the environment.

A simple structure that works:

1. **Introduction (2–3 lines)**: state the topic and your view.
2. **Body (2 short paragraphs)**: one point per paragraph with a reason or example.
3. **Conclusion (2 lines)**: summarise and end on a balanced note.

Tips:
- Stay within the word limit given on screen.
- Use short sentences; long sentences create grammar mistakes.
- Avoid SMS language, slang and spelling errors. Automated checkers usually penalise these.
- Keep 2 minutes at the end to reread for tense, articles (a/an/the) and subject-verb agreement.

Practise by writing one 200-word essay a day for two weeks and asking a friend or mentor to mark mistakes.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Do not copy memorised essays; a structured, simple and error-free answer scores better.`,
        },
        {
          q: `What does the Wipro technical interview usually check for freshers?`,
          a: `The technical interview checks whether your basics are solid and whether you can explain what you built. Expect questions from:

- **One programming language** you choose (Python, Java, C or C++): data types, loops, functions, strings, lists or arrays, exceptions.
- **OOP**: class, object, the four pillars, overloading vs overriding.
- **DBMS and SQL**: keys, normalization, joins, simple queries.
- **Operating systems**: process vs thread, scheduling, deadlock.
- **Networks**: OSI and TCP/IP layers, TCP vs UDP, what an IP address is.
- **Your project**: what problem it solves, your role, the tech stack and a challenge you faced.

Interviewers may ask you to write a short program on paper or in an editor. They care about clear logic and honesty: saying "I am not sure, but I think..." is better than guessing confidently.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Choose one language and know it well; the interviewer will follow your choice.`,
        },
        {
          q: `What eligibility rules and documents should I keep ready for a Wipro drive?`,
          a: `Eligibility is announced in each drive notification and usually covers your degree and branch, year of passing, a minimum academic percentage or CGPA, and rules about active backlogs and education gaps. Because these rules change, read the current notification rather than relying on seniors' advice.

Documents commonly asked for during the process or onboarding:

- Government photo ID (Aadhaar, PAN or passport)
- 10th and 12th (or diploma) mark sheets and certificates
- Semester-wise degree mark sheets, and the provisional or final degree certificate when available
- Recent passport-size photographs
- Updated resume
- Any certificate that supports a gap or name difference, if applicable

Keep scanned copies in one folder with clear file names, and make sure the name and date of birth match across all documents.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Mismatched names or dates across documents cause onboarding delays; fix them early.`,
        },
        {
          q: `Does Wipro have training and a service agreement for freshers?`,
          a: `Freshers usually go through an initial **training period** after joining, where they learn the technology stack for their assigned business unit and are assessed before moving to projects. The duration and format depend on the role and the year.

Wipro has also used a **service agreement** for some fresher roles in past drives, where leaving within a set period may involve repaying a training cost. Whether this applies, and the exact terms, are written in your offer letter and joining documents, and they can differ between drives and roles.

What to do:
- Read the offer letter fully before accepting.
- Note the training location, joining date, role, and any service agreement clause.
- If something is unclear, ask the HR contact named in the offer letter in writing.

In the HR round, if asked whether you are comfortable with a service agreement, answer honestly and calmly; it shows you plan to stay and grow.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Never rely on hearsay about bonds; the offer letter is the only source that binds you.`,
        },
        {
          q: `How should I approach the coding section of the Wipro online test?`,
          a: `Coding problems in service-company tests are usually about strings, arrays, numbers and simple patterns. A method that works under time pressure:

1. **Read the input and output format twice.** Many wrong answers come from printing extra text or spaces.
2. **Work one example by hand** before typing.
3. **Write the simplest correct solution first**, then improve it only if time allows.
4. **Test edge cases**: empty input, one element, negative numbers, repeated values, very large numbers.
5. **Use the language you are fastest in.** Python saves time on string and list problems.

Scoring is usually based on hidden test cases, so a solution that passes the sample but crashes on an empty input can lose marks. Avoid hard-coding the sample output; it never passes the hidden cases.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Print exactly the expected output, nothing more; no "Enter a number" prompts.`,
        },
        {
          q: `What does a good two-week preparation plan for a Wipro drive look like?`,
          a: `A focused plan for the last two weeks:

**Week 1**
- Days 1–3: Quantitative aptitude topics (percentages, ratios, time and work, speed, interest), 30 timed questions a day.
- Days 4–5: Logical reasoning and verbal ability, one timed set each day.
- Days 6–7: Two easy coding problems a day (strings, arrays, number logic) in your chosen language.

**Week 2**
- Days 8–9: Revise OOP, DBMS, OS and networks basics; prepare two-line definitions with one example each.
- Day 10: Prepare your project explanation: problem, your role, stack, challenge, result.
- Days 11–12: Take two full mock tests under exam timing, including an essay.
- Days 13–14: HR answers (introduction, why Wipro, relocation, shifts) spoken aloud; keep documents ready.

Track your mistakes in a notebook and revise that notebook the night before the test.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Full timed mocks reveal pacing problems that topic-wise practice never shows.`,
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `A train 240 m long passes a pole in 12 seconds. How long will it take to cross a platform 360 m long?

A) 25 s  B) 30 s  C) 32 s  D) 36 s`,
          a: `**Answer: B) 30 s**

Passing a pole means the train covers its own length.

- Speed = 240 m / 12 s = **20 m/s**.

Crossing a platform means the train covers its own length plus the platform length.

- Distance = 240 + 360 = **600 m**.
- Time = 600 / 20 = **30 s**.

Check: in 30 s at 20 m/s the train moves 600 m, which is exactly train plus platform.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Pole or person: distance = train length. Platform or bridge: train length + platform length.`,
        },
        {
          q: `A can finish a piece of work in 12 days and B can finish it in 18 days. In how many days can they finish it working together?

A) 7.2 days  B) 7.5 days  C) 6.8 days  D) 8 days`,
          a: `**Answer: A) 7.2 days**

Work per day:
- A does 1/12 of the work per day.
- B does 1/18 of the work per day.

Together: 1/12 + 1/18. The LCM of 12 and 18 is 36, so this is 3/36 + 2/36 = **5/36** of the work per day.

Days needed = 36/5 = **7.2 days**.

Check with the LCM method: total work = 36 units. A does 3 units a day, B does 2, together 5 units a day, so 36 / 5 = 7.2 days.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Take total work as the LCM of the days; it turns fractions into whole units.`,
        },
        {
          q: `Find the next number in the series: 3, 7, 15, 31, 63, ?

A) 125  B) 126  C) 127  D) 129`,
          a: `**Answer: C) 127**

Look at the pattern:
- 3 × 2 + 1 = 7
- 7 × 2 + 1 = 15
- 15 × 2 + 1 = 31
- 31 × 2 + 1 = 63
- 63 × 2 + 1 = **127**

Another way to see it: the differences are 4, 8, 16, 32, so the next difference is 64, and 63 + 64 = 127. Each term is also 2ⁿ − 1 (4 − 1, 8 − 1, 16 − 1, ...), and 128 − 1 = 127. All three views agree.`,
          d: 'easy',
          at: 'Wipro',
          tip: `When numbers roughly double, test "×2 + k" and look at the differences.`,
        },
        {
          q: `If MANGO is written as OCPIQ in a certain code, how is APPLE written in that code?

A) CRRNG  B) CQQNG  C) BQQMF  D) CRRMG`,
          a: `**Answer: A) CRRNG**

Find the rule from MANGO → OCPIQ:
- M → O (+2)
- A → C (+2)
- N → P (+2)
- G → I (+2)
- O → Q (+2)

Every letter moves 2 places forward. Apply it to APPLE:
- A → C
- P → R
- P → R
- L → N
- E → G

So APPLE becomes **CRRNG**. Option D gets L → M wrong (that is only +1).`,
          d: 'easy',
          at: 'Wipro',
          tip: `Write the alphabet positions (A=1 ... Z=26) on rough paper to check shifts quickly.`,
        },
        {
          q: `The price of sugar rises by 25%. By what percentage must a family reduce its consumption so that its expenditure on sugar stays the same?

A) 20%  B) 25%  C) 18%  D) 22%`,
          a: `**Answer: A) 20%**

Expenditure = price × quantity. If the price becomes 125% of the old price, the quantity must fall so that the product stays the same.

New quantity = 100 / 125 of the old quantity = **80%**.

Reduction = 100% − 80% = **20%**.

Formula: reduction = r / (100 + r) × 100 = 25 / 125 × 100 = 20%.

Check with numbers: old price ₹40/kg, 10 kg costs ₹400. New price ₹50/kg; ₹400 buys 8 kg. 10 kg → 8 kg is a 20% reduction.`,
          d: 'medium',
          at: 'Wipro',
          tip: `A 25% rise is undone by a 20% cut, not a 25% cut; the base changes.`,
        },
        {
          q: `Pointing to a man, Riya says, "He is the son of my grandfather's only son." How is the man related to Riya?

A) Cousin  B) Uncle  C) Brother  D) Father`,
          a: `**Answer: C) Brother**

Break it down from the inside:

1. "My grandfather's only son": the grandfather has exactly one son, and Riya is his grandchild through that son, so the only son is **Riya's father**.
2. "The son of my father" is **Riya's brother**.

He cannot be a cousin, because a cousin would be the child of the father's sibling, and the grandfather has only one son. (A daughter of the grandfather could have children, but they would be described as "the son of my grandfather's daughter", not of his only son.)`,
          d: 'medium',
          at: 'Wipro',
          tip: `Solve blood-relation sentences from the innermost phrase outward and draw a small family tree.`,
        },
        {
          q: `What is the difference between compound interest and simple interest on ₹10,000 for 2 years at 10% per annum, interest compounded annually?

A) ₹50  B) ₹100  C) ₹110  D) ₹200`,
          a: `**Answer: B) ₹100**

Simple interest for 2 years = 10,000 × 10 × 2 / 100 = **₹2,000**.

Compound interest:
- After year 1: 10,000 + 10% = ₹11,000
- After year 2: 11,000 + 10% = ₹12,100
- CI = 12,100 − 10,000 = **₹2,100**

Difference = 2,100 − 2,000 = **₹100**.

Shortcut for 2 years: difference = P × (r/100)² = 10,000 × (0.1)² = 10,000 × 0.01 = ₹100. The extra ₹100 is the interest earned in year 2 on year 1's ₹1,000 interest.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Remember CI − SI for 2 years = P(r/100)²; it saves a full calculation.`,
        },
        {
          q: `Pipe A can fill a tank in 20 minutes and pipe B in 30 minutes. Pipe C can empty the full tank in 15 minutes. If all three are opened together on an empty tank, how long will it take to fill it?

A) 40 min  B) 45 min  C) 60 min  D) 90 min`,
          a: `**Answer: C) 60 min**

Take the tank capacity as the LCM of 20, 30 and 15 = **60 units**.

- A fills 60/20 = 3 units per minute.
- B fills 60/30 = 2 units per minute.
- C empties 60/15 = 4 units per minute.

Net rate = 3 + 2 − 4 = **1 unit per minute**.

Time = 60 / 1 = **60 minutes**.

Check with fractions: 1/20 + 1/30 − 1/15 = 3/60 + 2/60 − 4/60 = 1/60 of the tank per minute, so 60 minutes. Both methods agree.`,
          d: 'hard',
          at: 'Wipro',
          tip: `Treat an emptying pipe as negative work and use the LCM as capacity.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `What are the four pillars of OOP? Explain each with a simple example.`,
          a: `1. **Encapsulation**: keeping data and the methods that work on it together in a class and controlling access to the data. Example: a \`BankAccount\` class keeps \`balance\` private and changes it only through \`deposit()\` and \`withdraw()\`, which can validate amounts.
2. **Abstraction**: showing only what the user needs and hiding the details. Example: you call \`send_email(to, body)\` without knowing how SMTP works inside.
3. **Inheritance**: a class reuses and extends another class. Example: \`SavingsAccount\` inherits from \`BankAccount\` and adds \`add_interest()\`.
4. **Polymorphism**: the same method name behaves differently for different objects. Example: \`area()\` returns πr² for a \`Circle\` and length × breadth for a \`Rectangle\`.

\`\`\`python
class Shape:
    def area(self):
        raise NotImplementedError

class Circle(Shape):
    def __init__(self, r):
        self.r = r
    def area(self):
        return 3.14159 * self.r * self.r
\`\`\``,
          d: 'easy',
          at: 'Wipro',
          tip: `Use one running example (like a bank account) for all four pillars; it sounds confident.`,
        },
        {
          q: `What is the difference between a primary key, a unique key and a foreign key?`,
          a: `- **Primary key**: uniquely identifies each row. It cannot be NULL, and a table has only one primary key (it may span several columns). Example: \`employee_id\` in \`employees\`.
- **Unique key**: values must be unique, but it is not the main identifier. A table can have several unique keys, and most databases allow NULL in a unique column (MySQL allows multiple NULLs). Example: \`email\` in \`employees\`.
- **Foreign key**: a column that refers to the primary (or unique) key of another table, enforcing referential integrity. Example: \`employees.dept_id\` refers to \`departments.id\`, so you cannot add an employee to a department that does not exist.

\`\`\`sql
CREATE TABLE employees (
  id INT PRIMARY KEY,
  email VARCHAR(100) UNIQUE,
  dept_id INT,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);
\`\`\``,
          d: 'easy',
          at: 'Wipro',
          tip: `Mention NULL rules and "how many per table"; those are the usual follow-ups.`,
        },
        {
          q: `What is the difference between method overloading and method overriding? How does Python handle them?`,
          a: `| | Overloading | Overriding |
|---|---|---|
| What | Same method name, different parameters, in the same class | Child class redefines a parent method with the same signature |
| Resolved | At compile time (in Java/C++) | At run time (dynamic dispatch) |
| Purpose | Convenience: one name for related actions | Change or specialise inherited behaviour |

**In Python**, defining a method twice with the same name simply replaces the first one, so true overloading does not exist. You get the same effect with default or variable arguments:

\`\`\`python
class Calculator:
    def add(self, a, b, c=0):
        return a + b + c

class Animal:
    def speak(self):
        return "..."

class Dog(Animal):
    def speak(self):          # overriding
        return "Woof"
\`\`\`

\`Calculator().add(2, 3)\` and \`add(2, 3, 4)\` both work, and \`Dog().speak()\` returns "Woof".`,
          d: 'easy',
          at: 'Wipro',
          tip: `If you choose Python, say clearly that it has no classic overloading and show default arguments.`,
        },
        {
          q: `What is the difference between a process and a thread?`,
          a: `- A **process** is a program in execution. It has its own memory space (code, data, heap, stack), its own resources such as open files, and is isolated from other processes by the OS.
- A **thread** is a unit of execution inside a process. Threads of the same process share the process's code, data and heap, but each thread has its own stack, registers and program counter.

| | Process | Thread |
|---|---|---|
| Memory | Separate | Shared within the process |
| Creation and switching | Heavier, slower | Lighter, faster |
| Communication | Needs IPC (pipes, sockets, shared memory) | Directly through shared variables |
| Failure | One crash does not affect others | A crashing thread can bring down the whole process |

Example: a browser may run each tab as a separate process for isolation, while one tab uses several threads for rendering, networking and scripts. Shared memory makes threads fast but needs locks to avoid race conditions.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Add the browser example; real examples make OS answers memorable.`,
        },
        {
          q: `What is normalization? Explain 1NF, 2NF and 3NF.`,
          a: `**Normalization** organises tables to reduce duplicate data and avoid insert, update and delete anomalies.

- **1NF**: every column holds atomic (single) values and there are no repeating groups. A \`phones\` column holding "98xxx, 97xxx" breaks 1NF; move phones to a separate table or row.
- **2NF**: 1NF, and every non-key column depends on the **whole** primary key, not part of it. In \`enrolments(student_id, course_id, student_name)\` with key (student_id, course_id), \`student_name\` depends only on \`student_id\`, so move it to a \`students\` table.
- **3NF**: 2NF, and no non-key column depends on another non-key column (no transitive dependency). In \`employees(id, dept_id, dept_name)\`, \`dept_name\` depends on \`dept_id\`, not on \`id\`, so move it to \`departments(dept_id, dept_name)\`.

The benefit: a department name is stored once, so renaming it updates one row, not hundreds.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Give one small table per normal form; definitions alone sound memorised.`,
        },
        {
          q: `What is the difference between TCP and UDP? Where is each used?`,
          a: `Both are transport-layer protocols.

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (three-way handshake: SYN, SYN-ACK, ACK) | Connectionless |
| Reliability | Guaranteed delivery with acknowledgements and retransmission | No guarantee; packets may be lost |
| Order | Delivers data in order | No ordering |
| Speed and overhead | Slower, larger header | Faster, smaller header |
| Flow and congestion control | Yes | No |

**TCP is used** where every byte matters: web pages (HTTP/HTTPS), email (SMTP, IMAP), file transfer (FTP, SFTP), SSH.

**UDP is used** where speed matters more than a lost packet: live video and voice calls, online games, DNS lookups, streaming. In a video call, a late packet is useless, so resending it (as TCP would) only adds delay.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Name the three-way handshake and one real app for each protocol.`,
        },
        {
          q: `What is a deadlock? What are its necessary conditions, and how can it be handled?`,
          a: `A **deadlock** is a situation where two or more processes wait forever, each holding a resource the other needs. Example: P1 holds the printer and waits for the scanner, while P2 holds the scanner and waits for the printer.

All four **Coffman conditions** must hold at the same time:
1. **Mutual exclusion**: a resource can be used by only one process at a time.
2. **Hold and wait**: a process holds one resource while waiting for another.
3. **No preemption**: a resource cannot be forcibly taken away.
4. **Circular wait**: a cycle of processes, each waiting for the next.

Handling strategies:
- **Prevention**: break one condition, for example request all resources at once, or always acquire resources in a fixed global order (breaks circular wait).
- **Avoidance**: grant a request only if the system stays in a safe state (Banker's algorithm).
- **Detection and recovery**: detect cycles in the resource-allocation graph, then kill or roll back a process.
- **Ignore**: many general-purpose OSs assume deadlocks are rare and leave them to applications.`,
          d: 'hard',
          at: 'Wipro',
          tip: `"Lock ordering" is the most practical prevention technique; mention it for bonus points.`,
        },
        {
          q: `"Explain your final-year project." How should I answer this in a Wipro technical interview?`,
          a: `Use a clear five-part structure and keep it to about two minutes:

1. **Problem**: "[your project] helps [users] to [solve problem], because [why it matters]."
2. **Your role**: what you personally built, for example "I built the backend APIs and database design."
3. **Tech stack and why**: "We used [language/framework] for [reason] and [database] because [reason]."
4. **A challenge and how you solved it**: "Searching was slow, so I added an index on [column] and the response time came down noticeably."
5. **Result and learning**: what works today, and what you would improve with more time.

Expect follow-ups such as: draw the architecture, explain one table, why this database, how you tested it, what happens if two users update the same record. Only mention technologies you can explain; interviewers often pick the one word you were least sure about.`,
          d: 'hard',
          at: 'Wipro',
          tip: `Practise drawing your project's architecture on paper in under a minute.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Write a program to check whether a string is a palindrome, ignoring case, spaces and punctuation.`,
          a: `**Approach**: keep only letters and digits, convert to lowercase, then compare characters from both ends moving inward with two pointers. Stop as soon as a pair differs.

**Complexity**: O(n) time, O(n) extra space for the cleaned characters.

\`\`\`python
def is_palindrome(s):
    cleaned = [ch.lower() for ch in s if ch.isalnum()]
    i, j = 0, len(cleaned) - 1
    while i < j:
        if cleaned[i] != cleaned[j]:
            return False
        i += 1
        j -= 1
    return True

print(is_palindrome("Madam, I'm Adam"))  # True
print(is_palindrome("Wipro"))            # False
\`\`\`

A shorter version is \`cleaned == cleaned[::-1]\`, but interviewers often ask for the two-pointer version to see that you can write the loop yourself.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Ask whether case and punctuation should be ignored before you start coding.`,
        },
        {
          q: `Write a program to check whether a number is an Armstrong number, and print all 3-digit Armstrong numbers.`,
          a: `An **Armstrong number** equals the sum of its digits each raised to the power of the number of digits. Example: 153 = 1³ + 5³ + 3³ = 1 + 125 + 27.

**Approach**: convert the number to a string to get its digits and their count k, sum each digit to the power k, and compare with the number.

**Complexity**: O(d) per number, where d is the number of digits.

\`\`\`python
def is_armstrong(n):
    digits = str(n)
    k = len(digits)
    return n == sum(int(d) ** k for d in digits)

print(is_armstrong(153))   # True
print(is_armstrong(123))   # False
print([x for x in range(100, 1000) if is_armstrong(x)])
# [153, 370, 371, 407]
\`\`\`

If the interviewer asks you not to use strings, extract digits with \`n % 10\` and \`n // 10\` in a loop, counting digits first.`,
          d: 'easy',
          at: 'Wipro',
          tip: `Know the four 3-digit Armstrong numbers; it lets you verify your output instantly.`,
        },
        {
          q: `Find the second largest distinct element in an array in a single pass.`,
          a: `**Approach**: keep two variables, \`first\` and \`second\`. For each value: if it is bigger than \`first\`, the old \`first\` becomes \`second\`; otherwise if it lies strictly between \`second\` and \`first\`, it becomes the new \`second\`. Duplicates of the largest value are skipped by the strict comparisons.

**Complexity**: O(n) time, O(1) space. Sorting would work too but costs O(n log n).

\`\`\`python
def second_largest(nums):
    first = second = float('-inf')
    for x in nums:
        if x > first:
            second, first = first, x
        elif first > x > second:
            second = x
    return None if second == float('-inf') else second

print(second_largest([10, 5, 10, 8, 3]))  # 8
print(second_largest([7, 7, 7]))          # None
\`\`\`

Return \`None\` (or a message the problem asks for) when there is no second distinct value.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Always test with duplicates of the maximum, like [10, 10, 8]; it is the classic trap.`,
        },
        {
          q: `Count the frequency of each character in a string and print them in order of first appearance.`,
          a: `**Approach**: walk through the string once and keep counts in a dictionary. In Python 3.7+ a \`dict\` keeps insertion order, so characters come out in the order they first appeared. Skip spaces if the problem asks for letters only.

**Complexity**: O(n) time, O(k) space where k is the number of distinct characters.

\`\`\`python
def char_frequency(s):
    counts = {}
    for ch in s:
        if ch != ' ':
            counts[ch] = counts.get(ch, 0) + 1
    return counts

for ch, c in char_frequency("banana").items():
    print(ch, c)
# b 1
# a 3
# n 2
\`\`\`

\`collections.Counter(s)\` does the same in one line, but writing the loop shows the interviewer you understand hashing. A common follow-up is "print the first non-repeating character": loop over the string again and return the first character whose count is 1.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Mention that dict order is guaranteed from Python 3.7; it justifies your output order.`,
        },
        {
          q: `Rotate an array to the right by k positions.`,
          a: `**Approach**: rotating right by k moves the last k elements to the front. First reduce k with \`k % n\`, because rotating by n gives the same array. Then join the last k elements with the first n − k.

**Complexity**: O(n) time, O(n) space for the new list.

\`\`\`python
def rotate_right(nums, k):
    n = len(nums)
    if n == 0:
        return []
    k %= n
    if k == 0:
        return nums[:]
    return nums[-k:] + nums[:-k]

print(rotate_right([1, 2, 3, 4, 5], 2))  # [4, 5, 1, 2, 3]
print(rotate_right([1, 2, 3], 7))        # [3, 1, 2]
\`\`\`

For O(1) extra space, use the **reversal method** in place: reverse the whole array, then reverse the first k elements, then reverse the remaining n − k. For [1,2,3,4,5], k=2: [5,4,3,2,1] → [4,5,3,2,1] → [4,5,1,2,3].`,
          d: 'medium',
          at: 'Wipro',
          tip: `Handle k larger than the array length with k % n; testers almost always include it.`,
        },
        {
          q: `Find the length of the longest substring without repeating characters.`,
          a: `**Approach (sliding window)**: keep a window \`[start, i]\` with no repeated characters and a dictionary of the last index where each character was seen. When the current character was already seen inside the window, move \`start\` just past its previous position. Update the best length at every step.

**Complexity**: O(n) time, O(k) space for the dictionary.

\`\`\`python
def longest_unique_substring(s):
    last = {}
    start = best = 0
    for i, ch in enumerate(s):
        if ch in last and last[ch] >= start:
            start = last[ch] + 1
        last[ch] = i
        best = max(best, i - start + 1)
    return best

print(longest_unique_substring("abcabcbb"))  # 3 ("abc")
print(longest_unique_substring("pwwkew"))    # 3 ("wke")
print(longest_unique_substring(""))          # 0
\`\`\`

The check \`last[ch] >= start\` matters: an old occurrence that is already outside the window must not move \`start\` backwards.`,
          d: 'hard',
          at: 'Wipro',
          tip: `Explain the window in words first; the code is short once the idea is clear.`,
        },
        {
          q: `Print the elements of a matrix in spiral order.`,
          a: `**Approach**: keep four boundaries: \`top\`, \`bottom\`, \`left\`, \`right\`. Repeatedly walk the top row left to right, the right column top to bottom, the bottom row right to left and the left column bottom to top, shrinking the matching boundary after each walk. The two inner checks stop a single remaining row or column from being printed twice.

**Complexity**: O(m × n) time, O(1) extra space apart from the output.

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

print(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
# [1, 2, 3, 6, 9, 8, 7, 4, 5]
\`\`\``,
          d: 'hard',
          at: 'Wipro',
          tip: `Test a non-square matrix like 3×4 too; missing boundary checks show up there.`,
        },
        {
          q: `Find the maximum sum of a contiguous subarray (Kadane's algorithm).`,
          a: `**Approach**: walk through the array keeping \`current\`, the best sum of a subarray that ends at the current element. At each element either extend the previous subarray or start fresh from this element, whichever is larger. Track the overall best.

**Complexity**: O(n) time, O(1) space. Checking every subarray would be O(n²).

\`\`\`python
def max_subarray_sum(nums):
    best = current = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best

print(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6  ([4, -1, 2, 1])
print(max_subarray_sum([-3, -1, -2]))                    # -1
\`\`\`

Starting with \`nums[0]\` instead of 0 makes the all-negative case correct: the answer is the largest single element, not 0.`,
          d: 'hard',
          at: 'Wipro',
          tip: `Always test an all-negative array; initialising best to 0 is the most common bug.`,
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Tell me about yourself.`,
          a: `Keep it to about one minute, professional, and in this order: present, past, future.

**Model answer**:
"Good morning. I am [your name], a final-year [your degree and branch] student at [your college]. I enjoy building practical software, and my strongest language is [your language].

During my course I built [your project], which [what it does]. I worked on [your part], and it taught me [one skill, such as designing a database or working in a team of four]. I have also completed [certification or internship] and practise coding problems regularly.

Outside academics, I [one genuine activity, such as organising a college tech event], which improved my communication and planning.

I am looking to start my career at a company like Wipro, where I can learn from large client projects and grow into a strong software engineer."

Avoid repeating your resume line by line or sharing personal details like family occupation unless asked.`,
          d: 'easy',
          at: 'Wipro',
          tip: `End with why you are here today; it gives the interviewer an easy next question.`,
        },
        {
          q: `Are you willing to relocate to any Wipro location?`,
          a: `Wipro has delivery centres in several Indian cities, and freshers are usually placed where the business needs them, so interviewers want to know that you are flexible.

**Model answer**:
"Yes, I am willing to relocate. As a fresher, my priority is learning and getting good project experience, and I understand that project needs decide the location. Moving to a new city will also help me become more independent and adaptable. I have stayed in a hostel during college, so I am comfortable adjusting to a new place."

If you have a genuine constraint (for example a medical reason in the family), be honest and polite, mention it briefly, and still show flexibility: "I would prefer [city] because of [reason], but I am open to other locations if the role needs it."

Do not say "yes" if you know you will refuse a posting later; that leads to problems at joining.`,
          d: 'easy',
          at: 'Wipro',
          tip: `A hostel or internship in another city is good evidence that you can adapt.`,
        },
        {
          q: `Why do you want to join Wipro?`,
          a: `Show that you know the company and connect it to your own goals. Use only facts you can stand behind.

**Model answer**:
"I want to join Wipro for three reasons.

First, Wipro is one of India's largest IT services companies and works with clients across many industries and countries. As a fresher, working on large client projects is the best way to learn how real software is built and supported.

Second, Wipro invests in training freshers, and I want a structured start where I can learn [technology you are interested in, such as cloud or testing] properly.

Third, Wipro's values, the Spirit of Wipro, especially integrity and respect for every person, match how I want to work. In [your project], I [an example of honesty or teamwork].

I see myself growing here from a strong developer into someone who can take ownership of modules and guide new joiners."

Read Wipro's latest news and careers page before the interview so you can mention one recent, specific detail.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Avoid "it is a big brand" alone; link the company to what you want to learn.`,
        },
        {
          q: `Are you comfortable working in rotational or night shifts?`,
          a: `Many IT services projects support clients in other time zones, so some roles involve rotational or night shifts, at least for a period.

**Model answer**:
"Yes, I am comfortable with shifts if the project needs it. I understand that Wipro serves clients in different time zones and support teams must be available when the client works. I will manage my routine, sleep and health to stay productive. I also see it as a chance to work directly with the client's team and learn faster."

If you genuinely cannot do night shifts for a reason such as a health condition, say it honestly and briefly, and show flexibility elsewhere: "I can work in general and early shifts and stay flexible during releases."

Interviewers mainly check two things: that you understand why shifts exist, and that you will not refuse an assignment after joining.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Explain why shifts exist (client time zones); it shows business understanding.`,
        },
        {
          q: `How do you feel about signing a service agreement with Wipro?`,
          a: `Some fresher offers have included a service agreement, and the interviewer may check that you are comfortable with it if it applies to your role. The real terms are always in the offer letter, so do not quote amounts you have heard from others.

**Model answer**:
"I am comfortable with it. A company invests time and money in training freshers, so it is fair to expect a commitment in return. I am not planning to join for a short time and leave; I want to build my career here for the next few years, learn on real projects and grow into more responsibility. I will read the terms in the offer letter carefully, and if anything is unclear I will clarify it with HR before signing."

This answer shows maturity: you understand the reason for the agreement, you plan to stay, and you are careful about what you sign.`,
          d: 'medium',
          at: 'Wipro',
          tip: `Never argue about the terms in the interview; clarify doubts with HR in writing later.`,
        },
        {
          q: `Wipro's values are called the Spirit of Wipro. Which value connects most with you, and why?`,
          a: `The Spirit of Wipro is publicly described through values such as **being passionate about clients' success, treating each person with respect, being global and responsible, and unyielding integrity in everything we do**. Check the official Wipro website for the current wording before your interview.

**Model answer** (integrity):
"The value I connect with most is unyielding integrity. In [your project], we found a bug in our module one day before the review. It would have been easy to hide it because the demo path did not touch it. I told our guide, explained the impact, and we fixed it that night. The review went well, and our guide trusted our updates more after that.

In client work, I think integrity matters even more, because a client relies on the team to report problems early. I want to be someone the team and the client can trust."

Pick the value that matches a real story; a genuine example matters more than the choice of value.`,
          d: 'medium',
          at: 'Wipro',
          tip: `One true story beats a list of all values recited from memory.`,
        },
        {
          q: `Tell me about a time you had a conflict with a team member and how you resolved it.`,
          a: `Use the **STAR** method: Situation, Task, Action, Result. Show calm communication and a focus on the work, not blame.

**Model answer**:
"**Situation**: In [your project], a teammate and I disagreed about the database. He wanted to store everything in one table to finish quickly; I felt it would cause duplicate data.

**Task**: We had to agree in two days to keep to the schedule.

**Action**: Instead of arguing, I suggested we each list pros and cons. I showed a small example of how one table would repeat customer details in every order and make updates error-prone. I also accepted his point about time and offered to write the extra tables and queries myself.

**Result**: We used a normalised design, finished on time, and later adding a new feature took less effort because the data was clean. We worked well together for the rest of the project."

Avoid stories where you were simply right and the other person was wrong; show listening and compromise.`,
          d: 'hard',
          at: 'Wipro',
          tip: `End the story with what you learned about working with people, not just the outcome.`,
        },
        {
          q: `If you are assigned a technology you have never used or did not want, such as testing or support, how will you react?`,
          a: `Interviewers ask this because freshers are allocated according to project needs, which may not match their preferred technology.

**Model answer**:
"I will accept it positively and start learning quickly. As a fresher, any real project teaches me how software is delivered to a client: requirements, quality, deadlines and communication. Testing teaches me to think about edge cases, and support teaches me how systems fail in production. Both make me a better developer.

My plan would be: understand the basics through the training and official documentation in the first weeks, ask my seniors for the most important parts of the project, and practise on small tasks. I have done this before: in [your example], I learnt [new tool or language] in about two weeks to complete [task].

Over time, if I perform well, I can discuss my long-term interests with my manager, but I would first focus on doing my current role well."

This shows adaptability, a learning plan and patience, which are exactly what the question checks.`,
          d: 'hard',
          at: 'Wipro',
          tip: `Back "I learn fast" with one real example of learning something new under a deadline.`,
        },
      ],
    },
  ],
};

export default book;
