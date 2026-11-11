import { SeedBook, ALL_YEARS } from '../types';

/**
 * HCLTech fresher interview preparation. Hiring patterns change every year, so the
 * process chapter speaks in "typically" terms and points to the official careers page.
 */
const book: SeedBook = {
  slug: 'hcltech-interview',
  title: 'HCLTech Interview Questions',
  kind: 'company',
  subject: 'HCLTech',
  description: 'Prepare for HCLTech fresher hiring: how the drive usually runs, test-style aptitude with worked answers, technical and coding questions in Python, and HR answers.',
  color: '#15803d',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 106,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `What does the HCLTech fresher hiring process typically look like?`,
          a: `HCLTech hires freshers through **campus drives**, **off-campus/pool drives** and its early-career programmes. The exact rounds change from drive to drive, but in recent drives the flow has typically been:

1. **Registration** on the careers portal or through your college placement cell.
2. **Online assessment**: aptitude (quantitative, logical reasoning, verbal English), often with a technical MCQ and/or coding section.
3. **Technical interview**: CS fundamentals, one programming language, SQL basics and your project.
4. **HR interview**: communication, attitude, relocation and shift flexibility, documents.
5. **Offer letter**, followed by onboarding and a training period before project allocation.

Some drives merge the technical and HR rounds into one conversation, and some add a communication or versant-style English check.

Always confirm the pattern for your drive on the **official HCLTech careers page** or with your placement officer, because the test vendor, sections and timing are revised every year.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Treat every round as an elimination round. Clear communication matters in all of them, not just HR.`,
        },
        {
          q: `What sections are usually in the HCLTech online assessment, and how should you prepare for each?`,
          a: `The sections vary by year and by role, but a typical HCLTech fresher test has covered:

- **Quantitative aptitude**: percentages, profit and loss, time and work, time-speed-distance, simple and compound interest, ratios, averages, number series.
- **Logical reasoning**: coding-decoding, blood relations, directions, seating arrangement, syllogisms, series completion.
- **Verbal ability**: reading comprehension, sentence correction, fill in the blanks, synonyms and antonyms.
- **Technical MCQs / coding** (in many drives): C/Java/Python output questions, OOP, DBMS, OS basics, and one or two easy-to-medium coding problems.

**How to prepare:**
- Learn the shortcut method for each quant topic, then solve timed sets of 20 questions.
- For reasoning, practise drawing diagrams quickly (family trees, direction arrows).
- Read one editorial article a day for comprehension speed.
- For coding, master string and array problems in one language.

Sectional time limits are common, so do not get stuck on one question. Check whether your drive has negative marking before the test.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Practise under a timer. Most candidates know the methods but run out of time in the quant section.`,
        },
        {
          q: `What does the HCLTech technical interview check in a fresher?`,
          a: `The technical interview checks whether you can be trained into a project quickly. Interviewers usually look at:

- **One programming language you claim well** (C, C++, Java or Python): data types, loops, functions, OOP, exceptions, and writing a short program on paper or a shared screen.
- **OOP concepts**: classes, objects, inheritance, polymorphism, abstraction, encapsulation, with real examples.
- **DBMS and SQL**: keys, normalization, joins, a simple query such as "second highest salary".
- **OS and networks basics**: process vs thread, deadlock, memory management, TCP vs UDP, OSI layers.
- **Your project and internship**: what you built, your exact role, the tech stack, and a problem you solved.

They are not expecting expert depth. They expect honest, clear answers and the ability to reason when you do not know something. Saying "I have not used that, but I think it works like this because..." is far better than guessing confidently.

Everything on your resume is fair game, so remove any skill you cannot explain for five minutes.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Prepare a 2-minute project explanation: problem, your role, tech stack, one challenge, result.`,
        },
        {
          q: `What is HCLTech TechBee, and who is it meant for?`,
          a: `**HCL TechBee** is HCLTech's early-career programme aimed at students who have just finished **Class 12** (typically with Mathematics), rather than graduates. In broad terms:

- Selected students go through a structured **training period** in IT skills.
- After training they can be placed in **entry-level roles** at HCLTech.
- The programme has offered a route to continue **higher education** (a degree) alongside the job through university tie-ups.

Selection has typically involved an online test and an interview. Eligibility rules (passing year, marks, subjects), training fees or scholarships, and stipend details change between batches, so read them on the **official TechBee page** rather than relying on social media posts.

For engineering graduates, TechBee is usually not the relevant route; graduates apply through campus drives or the graduate hiring section of the careers site.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `If a younger sibling or friend is in Class 12, this is worth knowing about. Graduates should use the regular fresher route.`,
        },
        {
          q: `Which documents should you keep ready for an HCLTech interview and onboarding?`,
          a: `Keep both originals and photocopies (and scanned PDFs for online verification):

- **Resume**: two or three printed copies, matching what you submitted online.
- **Government photo ID**: Aadhaar, PAN, passport or voter ID.
- **Mark sheets and certificates**: Class 10, Class 12 (or diploma) and every semester of your degree, plus provisional or degree certificate if available.
- **Admit card / interview call letter** or the registration email, if the drive issued one.
- **Passport-size photographs**.
- **Gap or backlog explanation**, if applicable, with supporting documents.
- **Internship or experience letters**, if you mention them on your resume.

At onboarding you may also be asked for bank details, address proof and a background verification form. Make sure your **name and date of birth are identical** across all documents; mismatches are a common cause of delays in background verification.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Put all documents in one folder the night before. Do not let paperwork add stress on interview day.`,
        },
        {
          q: `Does HCLTech have a service agreement or training period for freshers?`,
          a: `Freshers at large IT services companies, including HCLTech, usually go through a **training period** after joining. It covers a technology stream (for example Java, .NET, testing or infrastructure), soft skills and process training, often with assessments that must be cleared before project allocation.

Some HCLTech drives have also included a **service agreement** (often called a bond) requiring you to stay for a minimum period or pay an amount if you leave early. Whether it applies, how long it is and the amount have **varied by drive and role**, so:

- Read the **offer letter and joining documents** carefully before signing.
- Ask HR directly if anything is unclear; it is a normal, professional question.
- Never assume a friend's terms from an earlier year apply to you.

In the interview, if asked "Are you okay with a service agreement?", answer honestly. If you plan to stay and grow, say so and explain why.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Do not quote bond terms from social media. Only your own offer letter is authoritative.`,
        },
        {
          q: `How should you plan 30 days of preparation for an HCLTech drive?`,
          a: `A simple, realistic plan:

**Week 1: Aptitude foundations**
- Quant: percentages, profit and loss, ratios, averages, time and work.
- Reasoning: series, coding-decoding, blood relations.
- 1 timed mixed set daily.

**Week 2: Aptitude speed + verbal**
- Quant: time-speed-distance, interest, probability, permutations.
- Verbal: reading comprehension, sentence correction.
- 2 full-length mock tests this week, then review every wrong answer.

**Week 3: Technical fundamentals**
- OOP, DBMS (keys, normalization, joins, SQL queries), OS (process, thread, deadlock, memory), networks (OSI, TCP/UDP).
- Write 2 coding problems daily: strings, arrays, numbers.

**Week 4: Interview readiness**
- Polish your resume and a 2-minute project explanation.
- Practise "Tell me about yourself", "Why HCLTech" and relocation answers aloud.
- Do one mock interview with a friend or mentor.

Keep a mistakes notebook throughout; revising it in the last 3 days is worth more than new topics.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Consistency beats intensity: 2 focused hours every day is better than a 10-hour weekend.`,
        },
        {
          q: `How do you apply to HCLTech off-campus, and how do you spot a fake job offer?`,
          a: `**Applying off-campus:**
- Use the **official HCLTech careers website** and its fresher or early-career section.
- Follow HCLTech's official LinkedIn page for drive announcements.
- Keep your profile, resume and email address professional and current.

**Warning signs of a fake offer:**
- Anyone asking for **money** for registration, training, a laptop, a "security deposit" or to "confirm" your offer. Genuine recruiters do not charge candidates.
- Offer letters sent from **free email domains** (gmail, yahoo) instead of the company domain.
- An offer **without any test or interview**.
- Pressure to pay or decide "within 2 hours".
- Spelling errors, wrong logos, or a WhatsApp-only process.

If you are unsure, verify through the official careers site, your placement cell, or the company's published contact channels. Report fraud attempts to the cybercrime portal.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Rule of thumb: if you are asked to pay to get a job, it is not a real job offer.`,
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `A train 360 m long, running at 54 km/h, crosses a platform 240 m long. How long does it take?

A) 36 s  B) 40 s  C) 44 s  D) 48 s`,
          a: `**Answer: B) 40 s**

To cross a platform completely, the train covers **its own length + the platform length**.

- Distance = 360 + 240 = **600 m**
- Speed = 54 km/h. Convert to m/s by multiplying by 5/18: 54 × 5/18 = **15 m/s**
- Time = Distance / Speed = 600 / 15 = **40 s**

**Check:** in 40 s at 15 m/s the train covers 15 × 40 = 600 m, which equals 360 + 240. Correct.

Common mistake: using only the platform length (240/15 = 16 s) or only the train length (360/15 = 24 s). A train crossing a pole or a person uses only its own length; a train crossing a platform or bridge uses both.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `km/h to m/s: multiply by 5/18. m/s to km/h: multiply by 18/5.`,
        },
        {
          q: `What is the difference between compound interest and simple interest on ₹10,000 at 10% per annum for 2 years?

A) ₹100  B) ₹50  C) ₹150  D) ₹200`,
          a: `**Answer: A) ₹100**

**Simple interest:** SI = P × R × T / 100 = 10,000 × 10 × 2 / 100 = **₹2,000**

**Compound interest (annual):**
Amount = P × (1 + R/100)² = 10,000 × 1.1 × 1.1 = **₹12,100**
CI = 12,100 − 10,000 = **₹2,100**

Difference = 2,100 − 2,000 = **₹100**

**Shortcut for 2 years:** Difference = P × (R/100)² = 10,000 × (0.1)² = 10,000 × 0.01 = **₹100**. Same result.

The extra ₹100 is the interest earned in year 2 on the first year's interest of ₹1,000 (10% of ₹1,000 = ₹100).`,
          d: 'medium',
          at: 'HCLTech',
          tip: `For 2 years, CI − SI = P(R/100)². For 3 years, it is P(R/100)²(3 + R/100).`,
        },
        {
          q: `A can finish a job in 12 days and B can finish it in 18 days. Working together, how many days will they take?

A) 7 days  B) 7.5 days  C) 7.2 days  D) 8 days`,
          a: `**Answer: C) 7.2 days**

Use work per day:
- A does 1/12 of the job per day.
- B does 1/18 of the job per day.

Together: 1/12 + 1/18. LCM of 12 and 18 is 36, so 3/36 + 2/36 = **5/36** of the job per day.

Days = 1 ÷ (5/36) = 36/5 = **7.2 days**

**LCM method (faster in the test):** take total work = 36 units. A does 36/12 = 3 units/day, B does 36/18 = 2 units/day. Together 5 units/day, so 36/5 = 7.2 days.

**Check:** in 7.2 days A does 3 × 7.2 = 21.6 units and B does 2 × 7.2 = 14.4 units. Total 36 units. Correct.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Assume total work = LCM of the days. It turns fractions into whole numbers.`,
        },
        {
          q: `Find the next number in the series: 2, 6, 12, 20, 30, ?

A) 40  B) 42  C) 44  D) 48`,
          a: `**Answer: B) 42**

Look at the differences between consecutive terms:
6 − 2 = 4, 12 − 6 = 6, 20 − 12 = 8, 30 − 20 = 10.

The differences increase by 2 each time, so the next difference is **12**, and the next term is 30 + 12 = **42**.

**Second way to see it:** each term is n × (n + 1):
- 1 × 2 = 2
- 2 × 3 = 6
- 3 × 4 = 12
- 4 × 5 = 20
- 5 × 6 = 30
- 6 × 7 = **42**

Both methods agree, so the answer is 42.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `For any series, first write the differences. If they are not constant, look at differences of differences.`,
        },
        {
          q: `In a certain code, CAT is written as DBU. How is DOG written in that code?

A) EPH  B) ENH  C) FPH  D) EPG`,
          a: `**Answer: A) EPH**

Compare each letter of CAT with DBU:
- C → D (+1)
- A → B (+1)
- T → U (+1)

Every letter is shifted **one position forward** in the alphabet.

Apply the same rule to DOG:
- D → **E**
- O → **P**
- G → **H**

So DOG is written as **EPH**.

**Why the others are wrong:** ENH shifts O backwards; FPH shifts D by two; EPG does not shift G. Only EPH applies +1 to all three letters.

Memorise letter positions (A=1, E=5, J=10, O=15, T=20, Y=25) to do these quickly.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Remember EJOTY: E=5, J=10, O=15, T=20, Y=25. It makes letter shifts fast.`,
        },
        {
          q: `Pointing to a man, Riya says, "He is the son of my grandfather's only son." How is the man related to Riya?

A) Cousin  B) Uncle  C) Father  D) Brother`,
          a: `**Answer: D) Brother**

Break the sentence from the inside out:

1. **My grandfather's only son**: Riya's grandfather has only one son, and Riya is his grandchild through that son. So the only son is **Riya's father**.
2. **The son of my father**: a son of Riya's father is **Riya's brother** (Riya herself is female, so the son is not Riya).

So the man is Riya's **brother**.

**Why not cousin?** A cousin would be the child of the grandfather's *other* son or daughter, but the grandfather has only one son, and we are told the man is that son's son.

Drawing a quick family tree (grandfather at top, his son below, two children below him) makes this unambiguous.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Solve blood relations from the end of the sentence backwards, and draw the tree.`,
        },
        {
          q: `A shopkeeper buys an article for ₹800 and sells it for ₹920. What is his profit percentage?

A) 12%  B) 13.5%  C) 15%  D) 18%`,
          a: `**Answer: C) 15%**

- Cost price (CP) = ₹800
- Selling price (SP) = ₹920
- Profit = SP − CP = 920 − 800 = **₹120**

Profit % is always calculated on the **cost price**:

Profit % = (Profit / CP) × 100 = (120 / 800) × 100 = **15%**

**Check:** 15% of 800 = 120, and 800 + 120 = 920. Correct.

**Trap option:** 120/920 × 100 ≈ 13.04% uses the selling price as the base, which is wrong unless the question explicitly asks for profit as a percentage of SP.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Profit and loss percentages are on cost price unless the question says otherwise.`,
        },
        {
          q: `The ratio of the present ages of A and B is 4 : 5. After 6 years, the ratio will be 5 : 6. What is A's present age?

A) 18 years  B) 20 years  C) 30 years  D) 24 years`,
          a: `**Answer: D) 24 years**

Let the present ages be **4x** and **5x**.

After 6 years: (4x + 6) / (5x + 6) = 5 / 6

Cross-multiply:
6(4x + 6) = 5(5x + 6)
24x + 36 = 25x + 30
x = **6**

So A = 4 × 6 = **24 years** and B = 5 × 6 = 30 years.

**Check:** after 6 years, A = 30 and B = 36. 30 : 36 = 5 : 6. Correct.

**Option-testing shortcut:** A's age must be a multiple of 4. Try 24: B = 30, after 6 years 30 : 36 = 5 : 6. It works immediately. Testing options is a valid time-saver in the test when the algebra is long.`,
          d: 'hard',
          at: 'HCLTech',
          tip: `When options are given, plugging them back in is often faster than solving the equation.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `What are the four pillars of OOP? Explain each with an example.`,
          a: `1. **Encapsulation**: bundling data and the methods that work on it inside a class, and restricting direct access. Example: a \`BankAccount\` keeps \`balance\` private and exposes \`deposit()\` and \`withdraw()\`, which validate the amount.
2. **Abstraction**: showing only what an object does, hiding how. Example: you call \`car.start()\` without knowing the ignition details. In Java this is done with abstract classes and interfaces.
3. **Inheritance**: a class reuses and extends another class. Example: \`SavingsAccount\` extends \`BankAccount\` and adds \`addInterest()\`.
4. **Polymorphism**: one interface, many forms. Example: \`shape.area()\` calls the right formula for a \`Circle\` or a \`Rectangle\`. Compile-time polymorphism is method overloading; run-time polymorphism is method overriding.

\`\`\`python
class Shape:
    def area(self): raise NotImplementedError
class Circle(Shape):
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r ** 2
class Square(Shape):
    def __init__(self, s): self.s = s
    def area(self): return self.s ** 2
for sh in (Circle(1), Square(2)):
    print(sh.area())
\`\`\``,
          d: 'easy',
          at: 'HCLTech',
          tip: `Give a real-world example for each pillar. Definitions alone sound memorised.`,
        },
        {
          q: `What is the difference between an abstract class and an interface in Java?`,
          a: `| | Abstract class | Interface |
|---|---|---|
| Keyword | \`abstract class\` | \`interface\` |
| Methods | Abstract and concrete methods | Abstract methods; since Java 8 also \`default\` and \`static\` methods, since Java 9 \`private\` methods |
| Variables | Any kind: instance, static, final | Only \`public static final\` constants |
| Constructors | Can have constructors | Cannot have constructors |
| Inheritance | A class can extend **only one** | A class can implement **many** |
| Access modifiers | Any | Methods are \`public\` by default |

**When to use which:**
- Use an **abstract class** when related classes share state and some common code, for example \`abstract class Employee\` with a \`name\` field and \`calculateSalary()\` left abstract.
- Use an **interface** to define a capability that unrelated classes can have, for example \`Comparable\`, \`Runnable\` or \`Payable\`.

\`\`\`java
interface Payable { double pay(); }
abstract class Employee implements Payable {
    protected String name;
    Employee(String name) { this.name = name; }
}
class Intern extends Employee {
    Intern(String n) { super(n); }
    public double pay() { return 100.0; }
}
\`\`\``,
          d: 'medium',
          at: 'HCLTech',
          tip: `Mention Java 8 default methods; it shows you know interfaces are no longer purely abstract.`,
        },
        {
          q: `What is normalization? Explain 1NF, 2NF and 3NF with an example.`,
          a: `**Normalization** organises tables to reduce duplicate data and avoid insert, update and delete anomalies.

- **1NF (First Normal Form):** every column holds atomic (single) values and there are no repeating groups. A \`phone\` column holding "98xxx, 97xxx" breaks 1NF; store one phone per row or in a separate table.
- **2NF:** in 1NF, and every non-key column depends on the **whole** primary key, not part of it. In \`enrolment(student_id, course_id, student_name, grade)\` with key (student_id, course_id), \`student_name\` depends only on \`student_id\`, so move it to a \`students\` table.
- **3NF:** in 2NF, and no non-key column depends on another non-key column (no **transitive dependency**). In \`students(id, name, dept_id, dept_name)\`, \`dept_name\` depends on \`dept_id\`, so move it to a \`departments\` table.

Result: \`students(id, name, dept_id)\`, \`departments(dept_id, dept_name)\`, \`enrolment(student_id, course_id, grade)\`. Changing a department name now touches one row.

**BCNF** is a stricter 3NF: every determinant must be a candidate key.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Use one running example across 1NF, 2NF and 3NF; it is much easier to follow than three separate ones.`,
        },
        {
          q: `Explain INNER JOIN, LEFT JOIN, RIGHT JOIN and FULL OUTER JOIN.`,
          a: `Take \`employees(id, name, dept_id)\` and \`departments(id, name)\`.

- **INNER JOIN**: only rows with a match in both tables. Employees without a department and departments without employees are excluded.
- **LEFT JOIN**: all rows from the left table, plus matching rows from the right; NULLs where there is no match. Use it to list every employee with their department, including unassigned ones.
- **RIGHT JOIN**: all rows from the right table, plus matches from the left. Lists every department, including empty ones.
- **FULL OUTER JOIN**: all rows from both sides, NULLs where either side has no match. MySQL does not support it directly; combine a LEFT JOIN and a RIGHT JOIN with \`UNION\`.

\`\`\`sql
SELECT e.name, d.name AS dept
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;

-- departments with no employees
SELECT d.name
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;
\`\`\`

A **CROSS JOIN** returns every combination (rows × rows), and a **SELF JOIN** joins a table to itself, for example employee to manager.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Be ready to write the "departments with no employees" query; it tests whether you really understand LEFT JOIN.`,
        },
        {
          q: `What is the difference between a process and a thread?`,
          a: `| | Process | Thread |
|---|---|---|
| Definition | A program in execution | The smallest unit of execution inside a process |
| Memory | Own address space (code, data, heap) | Shares the process's code, data and heap; has its own stack and registers |
| Creation cost | Heavy | Light |
| Communication | Needs IPC: pipes, sockets, shared memory | Direct, through shared memory |
| Context switch | Slower | Faster |
| Failure | A crash usually affects only that process | A crash in one thread can bring down the whole process |

**Example:** a web browser may run each tab as a separate **process** (so one crashing tab does not kill the others), while inside a tab, separate **threads** handle rendering, network requests and JavaScript.

Because threads share memory, they need **synchronisation** (locks, mutexes, semaphores) to avoid race conditions when two threads update the same data.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Close with the browser-tab example; interviewers like a concrete picture.`,
        },
        {
          q: `What is a deadlock? What are the four necessary conditions, and how can it be prevented?`,
          a: `A **deadlock** is a situation where two or more processes wait forever, each holding a resource the other needs. Example: P1 holds the printer and waits for the scanner; P2 holds the scanner and waits for the printer.

**Coffman's four necessary conditions** (all four must hold at once):
1. **Mutual exclusion**: a resource can be held by only one process at a time.
2. **Hold and wait**: a process holds one resource while waiting for another.
3. **No preemption**: a resource cannot be forcibly taken away.
4. **Circular wait**: a cycle of processes, each waiting for the next.

**Handling deadlocks:**
- **Prevention**: break one condition. Common: impose a global **order** on resources and always acquire them in that order (breaks circular wait), or request all resources at once (breaks hold and wait).
- **Avoidance**: grant a request only if the system stays in a safe state, for example the **Banker's algorithm**.
- **Detection and recovery**: allow deadlocks, detect cycles in a wait-for graph, then kill or roll back a process.
- **Ignore it** (the ostrich approach), used by many general-purpose OSes because deadlocks are rare.`,
          d: 'hard',
          at: 'HCLTech',
          tip: `Name all four conditions, then say "prevention breaks one of them". That structure scores well.`,
        },
        {
          q: `What is the difference between TCP and UDP?`,
          a: `Both are **transport layer** protocols.

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (3-way handshake: SYN, SYN-ACK, ACK) | Connectionless |
| Reliability | Guaranteed delivery with acknowledgements and retransmission | No guarantee; packets can be lost |
| Ordering | Delivers data in order | No ordering |
| Flow/congestion control | Yes | No |
| Header size | 20 bytes minimum | 8 bytes |
| Speed | Slower, more overhead | Faster, lightweight |
| Used by | HTTP/HTTPS, email (SMTP), file transfer (FTP), SSH | DNS queries, video streaming, online gaming, VoIP |

**Rule of thumb:** use TCP when every byte must arrive correctly (a bank transaction, a web page); use UDP when speed matters more than a few lost packets (a live video call, where a late packet is useless anyway).`,
          d: 'easy',
          at: 'HCLTech',
          tip: `Mention the 3-way handshake and one real application for each protocol.`,
        },
        {
          q: `"Explain your final-year project." How should a fresher answer this at HCLTech?`,
          a: `This is often the longest part of the technical round. Use a clear structure and keep it to about two minutes, then let the interviewer dig in:

1. **Problem**: "[your project] solves [problem] for [users]."
2. **Your role**: be specific. "I built the backend APIs and database schema" is better than "we did everything".
3. **Tech stack and why**: "[language/framework] because [reason]; [database] because [reason]."
4. **Architecture in one line**: "A React front end calls REST APIs in [backend], which store data in [database]."
5. **One challenge and how you solved it**: for example a slow query you fixed with an index.
6. **Result**: what works, any measurable outcome, what you would improve.

**Expect follow-ups** like: How is login secured? What tables did you design? What happens if two users update the same record? How would it scale to 10,000 users?

Never claim work you did not do. If a teammate built a module, say so and explain how it connects to yours.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Rehearse aloud with a timer. Rambling for 6 minutes is the most common mistake here.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Check whether a string is a palindrome, ignoring case and non-alphanumeric characters.`,
          a: `**Approach:** keep only letters and digits, lowercase them, and compare the result with its reverse. A two-pointer scan from both ends avoids building a reversed copy, but the slicing version is clear and acceptable in most rounds.

**Complexity:** O(n) time, O(n) extra space for the cleaned list.

\`\`\`python
def is_palindrome(s):
    cleaned = [ch.lower() for ch in s if ch.isalnum()]
    return cleaned == cleaned[::-1]

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome("HCLTech"))                         # False
\`\`\`

**Two-pointer version (O(1) extra space):**

\`\`\`python
def is_palindrome_two_pointer(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        elif s[i].lower() != s[j].lower():
            return False
        else:
            i += 1
            j -= 1
    return True
\`\`\``,
          d: 'easy',
          at: 'HCLTech',
          tip: `Ask whether spaces and case should be ignored before you code; clarifying requirements is part of the test.`,
        },
        {
          q: `Find the second largest distinct element in an array without sorting.`,
          a: `**Approach:** scan once, tracking the largest (\`first\`) and second largest (\`second\`). When a new maximum appears, the old maximum becomes the second. Skip values equal to the maximum so duplicates do not count twice. Return \`None\` if no second distinct value exists.

**Complexity:** O(n) time, O(1) space. Sorting would be O(n log n).

\`\`\`python
def second_largest(nums):
    first = second = None
    for x in nums:
        if first is None or x > first:
            first, second = x, first
        elif x != first and (second is None or x > second):
            second = x
    return second

print(second_largest([12, 35, 1, 10, 34, 1]))  # 34
print(second_largest([7, 7]))                  # None
print(second_largest([5, 3, 5]))               # 3
\`\`\`

**Edge cases to mention:** empty array, all elements equal, negative numbers (starting with \`None\` instead of 0 handles negatives correctly).`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Initialising with 0 breaks for all-negative arrays. Using None (or -infinity) is the safe choice.`,
        },
        {
          q: `An array contains n − 1 distinct numbers from 1 to n. Find the missing number.`,
          a: `**Approach 1 (sum formula):** the sum of 1..n is n(n + 1)/2. Subtract the sum of the array; the difference is the missing number.

**Approach 2 (XOR):** XOR all numbers 1..n and all array elements. Pairs cancel (a ^ a = 0), leaving the missing number. This avoids large sums in languages with fixed-size integers.

**Complexity:** O(n) time, O(1) space for both.

\`\`\`python
def missing_number(nums, n):
    return n * (n + 1) // 2 - sum(nums)

def missing_number_xor(nums, n):
    result = 0
    for i in range(1, n + 1):
        result ^= i
    for x in nums:
        result ^= x
    return result

print(missing_number([1, 2, 4, 5, 6], 6))      # 3
print(missing_number_xor([1, 2, 4, 5, 6], 6))  # 3
\`\`\`

**Check:** 1 + 2 + ... + 6 = 21; array sum = 18; 21 − 18 = 3.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Give the sum formula first, then mention XOR as the overflow-safe alternative. It shows depth.`,
        },
        {
          q: `Find the first non-repeating character in a string.`,
          a: `**Approach:** two passes. First count every character with a dictionary (or \`Counter\`). Then scan the string again in its original order and return the first character whose count is 1. The second pass over the string, not over the dictionary, guarantees "first" in the original order.

**Complexity:** O(n) time, O(k) space where k is the number of distinct characters.

\`\`\`python
from collections import Counter

def first_unique(s):
    counts = Counter(s)
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None

print(first_unique("swiss"))     # w
print(first_unique("aabbcc"))    # None
print(first_unique("hcltech"))   # l
\`\`\`

**Check "hcltech":** h appears twice, c twice, l once, so the answer is **l**.

A nested-loop solution that counts each character separately is O(n²); mention why the dictionary is better.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Without Counter, a plain dict with counts.get(ch, 0) + 1 works the same way.`,
        },
        {
          q: `Print all 3-digit Armstrong numbers (numbers equal to the sum of their digits each raised to the number of digits).`,
          a: `**Approach:** for each number, find its digit count k, raise each digit to the power k, add them, and compare with the number. Example: 153 = 1³ + 5³ + 3³ = 1 + 125 + 27 = 153.

**Complexity:** O(d) per number, where d is the number of digits; O(n·d) for a range of n numbers.

\`\`\`python
def is_armstrong(n):
    digits = str(n)
    k = len(digits)
    return n == sum(int(d) ** k for d in digits)

print([n for n in range(100, 1000) if is_armstrong(n)])
# [153, 370, 371, 407]
\`\`\`

**Without converting to a string** (interviewers sometimes ask):

\`\`\`python
def is_armstrong_math(n):
    k, temp = len(str(n)), n
    total = 0
    while temp > 0:
        total += (temp % 10) ** k
        temp //= 10
    return total == n
\`\`\`

\`temp % 10\` gives the last digit and \`temp //= 10\` removes it.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Know the four 3-digit Armstrong numbers by heart: 153, 370, 371, 407. Useful for checking your output.`,
        },
        {
          q: `Rotate an array to the right by k positions.`,
          a: `**Approach:** rotating by the array length brings it back to the start, so first reduce k with \`k %= n\`. The last k elements move to the front: \`nums[-k:] + nums[:-k]\`.

For an **in-place** O(1)-space version, use the reversal trick: reverse the whole array, then reverse the first k elements, then reverse the rest.

**Complexity:** O(n) time. Slicing uses O(n) extra space; the reversal method uses O(1).

\`\`\`python
def rotate_right(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    k %= n
    return nums[-k:] + nums[:-k] if k else nums[:]

def rotate_in_place(nums, k):
    n = len(nums)
    if n == 0:
        return
    k %= n
    nums.reverse()
    nums[:k] = reversed(nums[:k])
    nums[k:] = reversed(nums[k:])

print(rotate_right([1, 2, 3, 4, 5], 2))  # [4, 5, 1, 2, 3]
arr = [1, 2, 3, 4, 5]
rotate_in_place(arr, 7)
print(arr)                               # [4, 5, 1, 2, 3]
\`\`\`

k = 7 on 5 elements is the same as k = 2.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Always handle k larger than n with k %= n. Forgetting it is the most common bug here.`,
        },
        {
          q: `Find the length of the longest substring without repeating characters.`,
          a: `**Approach (sliding window):** keep a window \`[start, i]\` with no repeats and a dictionary of each character's last index. When the current character was seen inside the window, move \`start\` just past its previous position. Update the best length at every step.

**Complexity:** O(n) time, O(k) space for the dictionary. Checking every substring would be O(n³).

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

print(longest_unique_substring("abcabcbb"))  # 3  ("abc")
print(longest_unique_substring("pwwkew"))    # 3  ("wke")
print(longest_unique_substring("bbbb"))      # 1
print(longest_unique_substring(""))          # 0
\`\`\`

The condition \`last[ch] >= start\` matters: a character seen *before* the window began is not a repeat inside the current window.`,
          d: 'hard',
          at: 'HCLTech',
          tip: `Explain the window idea in words before coding; interviewers grade the reasoning as much as the code.`,
        },
        {
          q: `Find the maximum sum of a contiguous subarray (Kadane's algorithm).`,
          a: `**Approach:** walk through the array keeping \`current\`, the best sum of a subarray ending at this position. At each element, either extend the previous subarray (\`current + x\`) or start fresh at \`x\`, whichever is larger. Track the best value of \`current\` seen so far.

Starting from \`nums[0]\` (not 0) makes the function correct when every number is negative.

**Complexity:** O(n) time, O(1) space. Trying all subarrays would be O(n²).

\`\`\`python
def max_subarray_sum(nums):
    best = current = nums[0]
    for x in nums[1:]:
        current = max(x, current + x)
        best = max(best, current)
    return best

print(max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # 6  ([4, -1, 2, 1])
print(max_subarray_sum([-3, -1, -2]))                     # -1
\`\`\`

**Follow-up:** to return the subarray itself, record the start index whenever you restart at \`x\` and the end index whenever \`best\` improves.`,
          d: 'hard',
          at: 'HCLTech',
          tip: `Test with an all-negative array out loud; it proves you thought about the initial value.`,
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Tell me about yourself.`,
          a: `Keep it to 60 to 90 seconds and follow **present, past, future**, linking everything to the role:

**Model answer:**
"I am [your name], a final-year [your branch] student at [your college]. I enjoy building software that solves practical problems. My strongest skills are [language] and SQL, and I have been practising data structures regularly.

For my final-year project I built [your project], where I handled [your role, for example the backend and database]. One challenge was [challenge], which I solved by [solution]. I also completed [internship/certification], which taught me [skill].

Outside academics, I [activity that shows teamwork or discipline, for example coordinated the college tech fest].

I am now looking to start my career at a company like HCLTech, where I can learn enterprise technologies, work with global clients and grow into a strong engineer."

**Avoid:** repeating your resume line by line, family details that are not relevant, and memorised lines delivered without expression.`,
          d: 'easy',
          at: 'HCLTech',
          tip: `End on why you want this role. It hands the interviewer a natural next question.`,
        },
        {
          q: `Why do you want to join HCLTech?`,
          a: `Show that you know the company and connect it to your goals. Speak about what is publicly known, without exaggerating:

**Model answer:**
"HCLTech is one of India's largest IT services companies, working with global clients across areas like digital engineering, cloud, infrastructure and software products. For a fresher, that breadth means exposure to real enterprise systems and many possible career paths.

I have also read about HCLTech's long-standing **'Employees First'** philosophy, the idea that empowering employees leads to better outcomes for customers. As someone starting out, a culture that invests in people and encourages ideas from every level matters a lot to me.

My strengths are [your skills], and I see myself contributing in [area, for example application development or cloud]. The structured training for freshers will help me become productive quickly, and I want to grow with the company over the long term."

Before the interview, read the company's latest news or annual highlights so you can mention one recent, real development.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `One specific, accurate fact about the company beats five generic compliments.`,
        },
        {
          q: `What does HCLTech's "Employees First" idea mean to you, and how would you live it?`,
          a: `"Employees First, Customers Second" is a philosophy closely associated with HCLTech: when employees are trusted, empowered and supported, they serve customers better. It also implies that employees take **ownership** and speak up with ideas.

**Model answer:**
"To me it means two things. First, the company trusts its people and invests in their growth. Second, and just as important, it expects employees to act like owners rather than wait for instructions.

As a fresher, I would live it by taking my training seriously, asking questions early instead of hiding problems, and sharing ideas when I see a better way to do something. For example, in [your project] I suggested [an improvement, for example automating our test data setup], which saved the team time each week.

I would also help teammates where I can, because a team where people support each other naturally delivers better work for the customer."

This question checks whether you understand culture as responsibility, not just perks.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Frame the culture as ownership plus support. Do not make it sound like "the company should do things for me".`,
        },
        {
          q: `Are you willing to relocate and work in shifts?`,
          a: `HCLTech has delivery centres in many Indian cities and serves clients across time zones, so this question is common. Answer honestly and positively.

**Model answer:**
"Yes. I understand that project locations depend on business needs, and I am open to relocating to any HCLTech centre. Moving to a new city early in my career is also a chance to become more independent.

I am also comfortable with shifts. Many clients are in other time zones, and support or delivery work sometimes needs overlapping hours. I would plan my routine around it, for example keeping fixed sleep hours.

If I had a genuine constraint, I would mention it now rather than later, but at this point I do not have any."

**If you do have a real constraint** (a medical condition, a dependent family member), state it calmly and briefly, and show flexibility in other ways. Saying "yes" now and refusing after joining damages trust.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `A flat "no" to both often ends the conversation. If you have a constraint, explain it and offer alternatives.`,
        },
        {
          q: `If you are placed in testing, support or a technology you did not choose, how will you react?`,
          a: `Interviewers ask this because project allocation depends on business needs, not only on preferences.

**Model answer:**
"I would accept it and give it my best. Every role in a delivery team teaches something valuable. Testing teaches you to think about edge cases and how real users break software. Support teaches you how production systems behave and how to troubleshoot under pressure. Both make you a better developer later.

I would learn the technology quickly through the training material and by asking seniors, and aim to become someone the team relies on. At the same time I would keep building my development skills in my own time, and when internal opportunities come up, I would discuss my interests with my manager through the proper process.

In [your project/internship], I was assigned [an unexpected task, for example documentation and testing] and ended up finding [a real bug or improvement], which showed me that no task is small if you take ownership."`,
          d: 'hard',
          at: 'HCLTech',
          tip: `Never sound disappointed. Show flexibility now and a long-term growth plan.`,
        },
        {
          q: `Tell me about a time you failed. What did you learn?`,
          a: `Use **STAR** (Situation, Task, Action, Result) and choose a real, moderate failure where you clearly learned something. Do not pick a disaster or a fake failure like "I work too hard".

**Model answer:**
"**Situation:** In my third year, our team entered [hackathon/competition] with [your project idea].
**Task:** I was responsible for the backend and integration.
**Action:** I spent most of the time adding extra features and left integration testing for the last few hours. At the demo, the front end could not connect to my API because of a configuration error, and we could not show the full flow.
**Result:** We did not qualify for the final round.

**What I learned:** get a minimal working version end to end first, then add features. Since then I integrate early and test continuously. In [your final-year project] we had a working demo in the second week, and that habit helped us finish on time."

Spend about 30% on the failure and 70% on what you changed.`,
          d: 'hard',
          at: 'HCLTech',
          tip: `The learning must show up in a later example. That is what makes the answer believable.`,
        },
        {
          q: `You have another offer from a competitor. Why should you choose HCLTech, and why should we choose you?`,
          a: `Be honest that you have an offer if asked directly, but stay respectful about other companies and focused on fit.

**Model answer:**
"Yes, I have an offer from [company], and I respect it. But HCLTech is my preferred choice because of [specific reason, for example the range of engineering and cloud work, or the people-first culture], which matches where I want my career to go. If selected, I am ready to commit.

As for why you should choose me: I bring a solid base in [language/skills], proven through [your project], where I [specific contribution]. I learn quickly; I picked up [new tool or technology] in [time] for [purpose]. And I am dependable: I [example of reliability, such as consistent attendance, meeting deadlines in a team project or leading an event].

I may not know every technology on day one, but I will be someone who learns fast and can be trusted with responsibility."

Never use one offer to pressure the interviewer; it comes across as arrogant.`,
          d: 'hard',
          at: 'HCLTech',
          tip: `Back every claim about yourself with one concrete example. Adjectives without evidence do not persuade.`,
        },
        {
          q: `Where do you see yourself in five years?`,
          a: `Show ambition that fits **inside** the company and a realistic growth path. Avoid "I want to do an MBA abroad" or "start my own company" as your main answer.

**Model answer:**
"In five years, I see myself as a strong technical professional at HCLTech who is trusted with important parts of a project. In the first year or two, I want to master [technology area, for example Java backend development or cloud], earn a relevant certification and become fully productive on client work.

After that, I would like to take on more responsibility, such as designing modules, mentoring new joiners and working directly with clients on requirements. Long term I am interested in [technical lead, solution architect or domain specialist], depending on where I can add the most value.

I know this depends on performance, so my focus right now is learning fast and delivering well."

Asking a thoughtful question at the end, for example "What does growth look like for freshers in this team?", leaves a good impression.`,
          d: 'medium',
          at: 'HCLTech',
          tip: `Show a growth path within the company. Mentioning leaving for higher studies soon raises retention concerns.`,
        },
      ],
    },
  ],
};

export default book;
