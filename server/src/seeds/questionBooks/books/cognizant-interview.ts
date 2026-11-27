import { SeedBook, ALL_YEARS } from '../types';

/**
 * Cognizant fresher interview questions. Hiring details are phrased as typical patterns,
 * because drive formats, role names and eligibility change every year.
 */
const book: SeedBook = {
  slug: 'cognizant-interview',
  title: 'Cognizant Interview Questions',
  kind: 'company',
  subject: 'Cognizant',
  description: 'How Cognizant fresher drives usually run, test-style aptitude with worked solutions, technical and coding questions, and HR answers tailored to Cognizant.',
  color: '#0d9488',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 104,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Cognizant typically hire freshers?`,
          a: `Cognizant hires freshers in large numbers through **campus drives**, **off-campus drives** and registrations on its careers portal. In recent drives the process has typically looked like this:

1. **Registration** on the official careers or hiring portal.
2. **Online assessment**: aptitude (quantitative, logical, verbal) and, for some roles, a coding section.
3. Sometimes a **communication assessment** (spoken and written English).
4. **Technical interview**: CS fundamentals, one programming language and your project.
5. **HR interview**: background, attitude, relocation and shift flexibility. For some roles the technical and HR rounds are combined into one conversation.

The exact rounds, their order and whether a round is eliminating change from drive to drive. Always read the official drive notification and **check the Cognizant careers page** rather than relying on forum posts.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Read the drive notification line by line: it tells you which role you are applying for and which rounds to expect.`,
        },
        {
          q: `What are GenC, GenC Next and GenC Elevate/Pro at Cognizant?`,
          a: `In recent years Cognizant has used the **GenC** family of names for its fresher roles. Broadly:

- **GenC** is the standard entry-level programmer/analyst role, typically selected through aptitude plus interviews.
- **GenC Next** and **GenC Elevate / GenC Pro** have been used for higher tiers that expect stronger coding skills, so their tests usually include a harder coding section and the technical interview goes deeper.

What matters for preparation:

- If you aim for a higher tier, practise coding problems under time pressure, not only aptitude.
- Students sometimes get an offer for one tier and are later given a chance to move up through another assessment; this varies by year.

Role names, criteria and the difference in package between tiers **change every year**, so check the official careers page and your drive mail for the current structure. Do not assume a tier from a senior's experience.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Say which role you applied for if asked; it shows you understand the process.`,
        },
        {
          q: `What sections does the Cognizant online assessment usually have?`,
          a: `In recent drives the online test has typically included:

- **Quantitative aptitude**: percentages, profit and loss, time and work, time-speed-distance, ratios, interest, probability, number series.
- **Logical reasoning**: series, coding-decoding, blood relations, directions, seating arrangement, syllogisms, data sufficiency.
- **Verbal ability**: reading comprehension, sentence correction, fill in the blanks, synonyms and para-jumbles.
- **Coding** (mainly for higher-tier roles): one or more programming problems solved in an online editor with test cases.

Some drives add a separate **communication / English assessment**. Sections are usually timed separately, so you cannot borrow time from one section for another.

Number of questions, time per section and any cut-off are not published and change between drives, so practise for speed in every section instead of guessing which one matters most.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Practise timed mixed sets; sectional timers punish people who are slow in just one area.`,
        },
        {
          q: `What does the Cognizant technical interview check?`,
          a: `The technical interview for freshers is usually a 20–40 minute conversation. It typically checks:

- **Basics of one language** you list (C, Java or Python): data types, loops, functions, strings, OOP.
- **OOP concepts**: class, object, inheritance, polymorphism, encapsulation, abstraction.
- **DBMS and SQL**: keys, joins, normalization, a simple query such as the second highest salary.
- **Operating systems and networks** at a basic level: process vs thread, deadlock, OSI layers.
- **Your project**: what it does, your role, the technologies and one problem you solved.
- Sometimes a **small coding problem** on paper or in an editor.

Interviewers mostly ask from your resume, so everything you list must be something you can explain. Clear, honest answers matter more than perfect jargon; saying "I am not sure, but I think..." is better than bluffing.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Remove any skill from your resume that you cannot explain for two minutes.`,
        },
        {
          q: `How should I prepare for a Cognizant drive in about 30 days?`,
          a: `A practical 30-day plan:

- **Week 1 - Aptitude base**: percentages, ratios, profit and loss, time and work, speed. 20–30 timed questions a day.
- **Week 2 - Reasoning and verbal**: series, coding-decoding, blood relations, arrangements; one reading comprehension and grammar set daily.
- **Week 3 - Technical**: revise OOP, DBMS/SQL, OS and networks basics; solve 2 easy coding problems a day (strings, arrays, numbers) in your main language.
- **Week 4 - Mocks and interview**: take full timed mock tests, fix weak topics, prepare a 1-minute introduction and a clear project explanation, and practise HR answers aloud.

Throughout: keep a mistakes notebook and revisit it every few days. If you target a higher-tier role, double the coding practice and include medium problems such as sliding window and two pointers.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Track your accuracy, not just the number of questions solved.`,
        },
        {
          q: `What eligibility criteria does Cognizant usually set for freshers?`,
          a: `Eligibility is announced per drive, but it has typically covered:

- **Degree and branch**: commonly BE/BTech, ME/MTech, MCA and sometimes MSc or other graduates, depending on the role.
- **Academic record**: a minimum percentage or CGPA in 10th, 12th/diploma and graduation.
- **Backlogs**: usually no active backlogs at the time of joining.
- **Education gap**: limits on gaps in education, with valid reasons sometimes accepted.
- **Year of passing**: each drive targets specific graduating batches.

The exact percentages, number of allowed gaps and batches differ by drive and role, so **check the official notification**. Never misstate marks or gaps on the form; documents are verified later and a mismatch can cancel an offer.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Fill marks exactly as on your mark sheets, including the decimal format asked for.`,
        },
        {
          q: `Which documents should I keep ready for the Cognizant interview and onboarding?`,
          a: `Keep originals plus photocopies or clear scans of:

- **Resume** (a few printed copies) and recent passport-size photographs.
- **Government ID**: Aadhaar, PAN, passport if you have one.
- **Mark sheets and certificates**: 10th, 12th or diploma, every semester of graduation, provisional or degree certificate.
- **Interview call letter / admit card** or registration confirmation mail.
- **Gap certificate or affidavit** if you have an education gap.
- For onboarding later: address proof, bank details, and any documents listed in the joining mail.

Name, date of birth and marks should match across all documents. If there is a spelling difference (for example on Aadhaar), fix it early, because background verification checks these details and corrections can take weeks.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Keep a single folder, physical and on Drive, with every document in the order the form asks.`,
        },
        {
          q: `What usually happens after receiving a Cognizant offer?`,
          a: `After selection the typical sequence is:

1. **Offer / letter of intent** by mail, which you accept on the portal.
2. **Document submission and background verification**.
3. **Pre-joining learning**: Cognizant has often shared online courses or assessments before joining. Complete them seriously; they can affect your training.
4. **Joining date** communication. Joining dates can come months after the offer and depend on business demand, so stay patient and keep checking mail.
5. **Initial training** after joining, usually on a technology stack chosen for you, ending with assessments before you are moved to a project.

Terms such as service agreements, training assessments and location are written in your offer documents. Read them fully and **ask HR if something is unclear** rather than relying on what others heard.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Use the waiting period to learn the stack you are likely to be trained on.`,
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `A's salary is 25% more than B's. By what percent is B's salary less than A's?

A) 25%   B) 20%   C) 15%   D) 22.5%`,
          a: `**Answer: B) 20%**

Let B's salary = 100. Then A's salary = 125.

B is less than A by 125 - 100 = 25.

As a percentage of A: (25 / 125) x 100 = **20%**.

**Shortcut:** if A is r% more than B, then B is less than A by r / (100 + r) x 100 = 25 / 125 x 100 = 20%.

The common trap is answering 25%: the base changes from B to A, so the percentage changes too.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Always ask "percent of what?" The base is the value you compare against.`,
        },
        {
          q: `A train 240 m long passes a pole in 16 seconds. How long will it take to cross a platform 360 m long?

A) 24 s   B) 36 s   C) 40 s   D) 48 s`,
          a: `**Answer: C) 40 s**

Passing a pole means the train covers its own length.

Speed = 240 / 16 = **15 m/s**.

Crossing a platform means covering train length + platform length = 240 + 360 = **600 m**.

Time = 600 / 15 = **40 seconds**.

Check: 15 m/s x 40 s = 600 m. Correct.

Remember: pole or person = train length only; platform, bridge or another train = add both lengths.`,
          d: 'easy',
          at: 'Cognizant',
        },
        {
          q: `Find the next number: 3, 7, 15, 31, 63, ?

A) 125   B) 127   C) 126   D) 129`,
          a: `**Answer: B) 127**

Each term is (previous x 2) + 1:

- 3 x 2 + 1 = 7
- 7 x 2 + 1 = 15
- 15 x 2 + 1 = 31
- 31 x 2 + 1 = 63
- 63 x 2 + 1 = **127**

Another way to see it: the differences are 4, 8, 16, 32, so the next difference is 64 and 63 + 64 = 127. Each term is also 2^n - 1 (2^2 - 1 = 3, ..., 2^7 - 1 = 127).

When differences double, look for a "x2 + something" rule.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Check differences first; if they form a pattern, the series usually follows.`,
        },
        {
          q: `A can finish a job in 12 days and B in 18 days. They work together for 4 days, then A leaves and B finishes the rest. How many days does the whole job take?

A) 10   B) 11   C) 12   D) 14`,
          a: `**Answer: C) 12 days**

Take the total work as LCM(12, 18) = **36 units**.

- A's rate = 36 / 12 = 3 units/day
- B's rate = 36 / 18 = 2 units/day
- Together = 5 units/day

In 4 days together: 4 x 5 = 20 units done.

Remaining = 36 - 20 = 16 units. B alone needs 16 / 2 = **8 days**.

Total = 4 + 8 = **12 days**.

Check with fractions: together 1/12 + 1/18 = 5/36 per day; 4 days = 20/36; remaining 16/36 at 1/18 per day = 8 days. Same answer.`,
          d: 'hard',
          at: 'Cognizant',
          tip: `Use LCM as total work; it avoids messy fractions.`,
        },
        {
          q: `What is the difference between compound interest and simple interest on ₹10,000 for 2 years at 10% per annum?

A) ₹50   B) ₹100   C) ₹110   D) ₹210`,
          a: `**Answer: B) ₹100**

**Simple interest** = P x R x T / 100 = 10,000 x 10 x 2 / 100 = **₹2,000**.

**Compound interest** (annual): amount = 10,000 x (1.1)^2 = 10,000 x 1.21 = ₹12,100, so CI = **₹2,100**.

Difference = 2,100 - 2,000 = **₹100**.

**Shortcut for 2 years:** difference = P x (R/100)^2 = 10,000 x (0.1)^2 = ₹100.

The extra ₹100 is the interest earned in year 2 on year 1's interest (10% of ₹1,000).`,
          d: 'medium',
          at: 'Cognizant',
          tip: `For 2 years, CI - SI = P(R/100)^2. For 3 years it is P(R/100)^2 x (3 + R/100).`,
        },
        {
          q: `Pointing to a man, Riya says, "He is the son of my paternal grandfather's only son." How is the man related to Riya?

A) Cousin   B) Brother   C) Uncle   D) Nephew`,
          a: `**Answer: B) Brother**

Break it down from the inside:

1. Riya's **paternal grandfather** is her father's father.
2. His **only son** must be Riya's **father** (her father is his son, and there is only one).
3. The **son of Riya's father** is Riya's **brother**.

So the man is Riya's brother.

Why "paternal" matters: if it said just "grandfather", it could be her maternal grandfather, whose only son would be her maternal uncle, making the man her cousin. Test questions usually include such a word to remove the ambiguity, so read every word.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Solve blood relations from the innermost phrase outward, and draw a small family tree.`,
        },
        {
          q: `Two fair dice are thrown. What is the probability that the sum is 8?

A) 1/6   B) 5/36   C) 1/9   D) 7/36`,
          a: `**Answer: B) 5/36**

Total outcomes = 6 x 6 = **36**.

Pairs that add up to 8:

- (2, 6), (3, 5), (4, 4), (5, 3), (6, 2)

That is **5** favourable outcomes. (1 cannot appear because 1 + 7 is impossible.)

Probability = 5 / 36.

Quick reference for two dice: sums 2 to 7 have 1, 2, 3, 4, 5, 6 ways; sums 8 to 12 have 5, 4, 3, 2, 1 ways. Sum 7 is the most likely at 6/36 = 1/6, which is why option A is a trap.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Count ordered pairs: (3,5) and (5,3) are different outcomes.`,
        },
        {
          q: `What is the angle between the hour and minute hands of a clock at 3:40?

A) 120°   B) 130°   C) 140°   D) 150°`,
          a: `**Answer: B) 130°**

- The **minute hand** moves 6° per minute: 40 x 6 = **240°** from 12.
- The **hour hand** moves 30° per hour plus 0.5° per minute: 3 x 30 + 40 x 0.5 = 90 + 20 = **110°** from 12.

Angle = 240 - 110 = **130°**.

**Formula:** angle = |30H - 5.5M| = |30 x 3 - 5.5 x 40| = |90 - 220| = 130°.

If the result is more than 180°, subtract it from 360° to get the smaller angle. Here 130° is already the smaller angle.

The usual mistake is to keep the hour hand exactly on 3 (90°), which gives the wrong answer 150°.`,
          d: 'hard',
          at: 'Cognizant',
          tip: `Remember the hour hand keeps moving: 0.5° every minute.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `Explain the four pillars of OOP with simple examples.`,
          a: `1. **Encapsulation**: keep data and the methods that use it together, and hide the data. A \`BankAccount\` keeps \`balance\` private and exposes \`deposit()\` and \`withdraw()\`, so nobody can set a negative balance directly.
2. **Abstraction**: show what an object does, hide how. You call \`car.start()\` without knowing the ignition details. Achieved with abstract classes and interfaces.
3. **Inheritance**: a class reuses another class's members. \`SavingsAccount\` extends \`BankAccount\` and adds \`interest_rate\`.
4. **Polymorphism**: one interface, many forms. A \`Shape\` reference can call \`area()\` on a \`Circle\` or a \`Square\` and get the right result (runtime polymorphism); method overloading is the compile-time form in Java.

Benefits: reusable, easier to maintain and extend, and closer to how we model real-world entities.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Use one running example (like BankAccount) for all four; it sounds confident and connected.`,
        },
        {
          q: `What is the difference between method overloading and method overriding?`,
          a: `| | Overloading | Overriding |
|---|---|---|
| Where | Same class | Parent and child class |
| Signature | Same name, **different parameters** | Same name, **same parameters** |
| Resolved | Compile time (static polymorphism) | Runtime (dynamic polymorphism) |
| Purpose | Same action on different inputs | Child changes parent's behaviour |

Java example:

\`\`\`java
class Calc {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }   // overloading
}
class Animal { void sound() { System.out.println("..."); } }
class Dog extends Animal {
    @Override void sound() { System.out.println("Bark"); }  // overriding
}
\`\`\`

Changing only the return type is **not** valid overloading. Python does not support classic overloading (the last definition wins); default arguments are used instead, while overriding works normally.`,
          d: 'easy',
          at: 'Cognizant',
        },
        {
          q: `What is normalization? Explain 1NF, 2NF and 3NF.`,
          a: `**Normalization** organises tables to reduce redundancy and avoid insert, update and delete anomalies.

- **1NF**: every column holds atomic (single) values and there are no repeating groups. A \`phones\` column with "98..., 97..." breaks 1NF; move phones to separate rows or a separate table.
- **2NF**: 1NF + no **partial dependency**: every non-key column depends on the whole primary key. In \`enrolment(student_id, course_id, student_name)\`, \`student_name\` depends only on \`student_id\`, so move it to a \`students\` table.
- **3NF**: 2NF + no **transitive dependency**: non-key columns depend only on the key, not on other non-key columns. In \`employees(id, dept_id, dept_name)\`, \`dept_name\` depends on \`dept_id\`, so move it to \`departments\`.

**BCNF** is a stricter 3NF: every determinant must be a candidate key. In practice, systems sometimes denormalize on purpose for faster reads.`,
          d: 'hard',
          at: 'Cognizant',
          tip: `Give one bad table and fix it step by step; examples beat definitions.`,
        },
        {
          q: `Write a SQL query to find the second highest salary from an employees table.`,
          a: `Assume \`employees(id, name, salary)\`.

**Using a subquery** (works almost everywhere):

\`\`\`sql
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
\`\`\`

**Using DISTINCT with LIMIT/OFFSET** (MySQL, PostgreSQL):

\`\`\`sql
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
\`\`\`

**Using a window function** (generalises to the Nth highest):

\`\`\`sql
SELECT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) t
WHERE rnk = 2
LIMIT 1;
\`\`\`

\`DISTINCT\` and \`DENSE_RANK\` matter when two people share the top salary: without them you could return the highest salary again. The first query returns NULL if there is no second distinct salary.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Mention duplicates; it is the follow-up interviewers almost always ask.`,
        },
        {
          q: `What is the difference between a process and a thread?`,
          a: `- A **process** is a program in execution with its own memory space (code, data, heap, stack), file handles and resources.
- A **thread** is a unit of execution inside a process. Threads of the same process **share** code, data, heap and open files, but each has its **own stack, registers and program counter**.

| | Process | Thread |
|---|---|---|
| Memory | Separate | Shared within the process |
| Creation / switch cost | Higher | Lower |
| Communication | IPC (pipes, sockets, shared memory) | Directly through shared memory |
| Failure | Crash usually stays inside that process | One thread's crash can bring the whole process down |

Example: a browser may run each tab as a separate process for isolation, while one tab uses multiple threads for rendering and networking. Shared memory makes threads fast but needs synchronisation (locks) to avoid race conditions.`,
          d: 'medium',
          at: 'Cognizant',
        },
        {
          q: `What is a deadlock? What are the four necessary conditions and how can it be handled?`,
          a: `A **deadlock** happens when a set of processes wait forever, each holding a resource that another one in the set needs. Example: P1 holds the printer and waits for the scanner; P2 holds the scanner and waits for the printer.

**Coffman conditions** (all four must hold):

1. **Mutual exclusion**: a resource can be used by only one process at a time.
2. **Hold and wait**: a process holds resources while waiting for more.
3. **No preemption**: resources cannot be forcibly taken away.
4. **Circular wait**: a closed chain of processes, each waiting for the next.

**Handling:**

- **Prevention**: break one condition, for example request all resources at once or always acquire resources in a fixed order (breaks circular wait).
- **Avoidance**: grant requests only if the system stays in a safe state (Banker's algorithm).
- **Detection and recovery**: detect cycles in a wait-for graph, then kill or roll back a process.
- **Ignore**: many general-purpose OSes leave it to applications (the "ostrich" approach).`,
          d: 'hard',
          at: 'Cognizant',
          tip: `Lock ordering is the practical answer developers use; mention it.`,
        },
        {
          q: `Explain the OSI model layers and how they map to TCP/IP.`,
          a: `The **OSI model** has seven layers, from top to bottom:

7. **Application**: services for user apps (HTTP, FTP, SMTP, DNS).
6. **Presentation**: data format, encryption, compression (SSL/TLS is often placed here).
5. **Session**: opening, managing and closing sessions.
4. **Transport**: end-to-end delivery, ports, reliability (TCP, UDP).
3. **Network**: logical addressing and routing (IP, routers).
2. **Data link**: framing, MAC addresses, error detection (switches, Ethernet).
1. **Physical**: bits over cables, fibre or radio.

The **TCP/IP model** has four layers: **Application** (OSI 5–7), **Transport** (4), **Internet** (3) and **Network access / Link** (1–2).

OSI is a reference model for teaching and troubleshooting; TCP/IP is what the internet actually runs on. A memory aid from layer 1 up: "Please Do Not Throw Sausage Pizza Away".`,
          d: 'medium',
          at: 'Cognizant',
        },
        {
          q: `Explain your final-year project. What will the interviewer look for?`,
          a: `Structure your answer in about two minutes:

1. **Problem**: "[your project] helps [users] to [solve what problem]."
2. **Solution and tech stack**: "We built it with [frontend], [backend], [database]."
3. **Your role**: be specific: "I designed the database and wrote the login and search APIs."
4. **One challenge**: "Search was slow with [N] records, so I added an index and pagination, which made it noticeably faster."
5. **Result and learning**: what works today and what you would improve.

The interviewer checks whether you **really built it**: expect follow-ups on your tables, why you chose a framework, how data flows from the UI to the database, and how you tested it. Keep the code or screenshots handy if it is an online interview, and never claim a teammate's part as yours.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Prepare the database schema and one tricky bug story; both are asked often.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Check whether a string is a palindrome, ignoring case and non-alphanumeric characters.`,
          a: `**Approach:** keep only letters and digits, lowercase them, and compare with the reverse. "A man, a plan, a canal: Panama" becomes "amanaplanacanalpanama", which reads the same both ways.

**Complexity:** O(n) time, O(n) extra space. A two-pointer version (skip non-alphanumeric characters from both ends) uses O(1) extra space.

\`\`\`python
def is_palindrome(s):
    cleaned = [ch.lower() for ch in s if ch.isalnum()]
    return cleaned == cleaned[::-1]

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

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome_two_pointer("race a car"))          # False
\`\`\``,
          d: 'easy',
          at: 'Cognizant',
          tip: `Offer the two-pointer version as a follow-up; it shows you think about space.`,
        },
        {
          q: `Find the second largest distinct element in an array in a single pass.`,
          a: `**Approach:** track the largest (\`first\`) and second largest (\`second\`) values. When a new maximum appears, the old maximum becomes second. Skip values equal to \`first\` so duplicates of the maximum do not count.

**Complexity:** O(n) time, O(1) space. Sorting also works but costs O(n log n).

\`\`\`python
def second_largest(nums):
    first = second = None
    for x in nums:
        if first is None or x > first:
            first, second = x, first
        elif x != first and (second is None or x > second):
            second = x
    return second  # None when there is no second distinct value

print(second_largest([12, 35, 1, 10, 34, 1]))  # 34
print(second_largest([10, 10, 5]))             # 5
print(second_largest([7, 7]))                  # None
\`\`\`

Ask the interviewer what to return when all elements are equal; returning None or -1 are both common.`,
          d: 'easy',
          at: 'Cognizant',
        },
        {
          q: `Print the frequency of each character in a string, in order of first appearance (for example "programming" gives p1r2o1g2a1m2i1n1).`,
          a: `**Approach:** count characters in a dictionary. Python dictionaries keep insertion order (3.7+), so iterating over the dictionary gives characters in order of first appearance.

**Complexity:** O(n) time, O(k) space, where k is the number of distinct characters.

\`\`\`python
def char_frequency(s):
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    return ''.join(f'{ch}{n}' for ch, n in counts.items())

print(char_frequency("programming"))  # p1r2o1g2a1m2i1n1
print(char_frequency("aabbbc"))       # a2b3c1
\`\`\`

Variations asked in tests: ignore spaces (\`if ch != ' '\`), treat upper and lower case as the same (\`s.lower()\`), or print only characters that repeat. \`collections.Counter\` also works, but writing the loop yourself shows the logic.`,
          d: 'medium',
          at: 'Cognizant',
        },
        {
          q: `Rotate an array to the right by k positions.`,
          a: `**Approach:** rotating by k is the same as rotating by \`k % n\`. The result is the last k elements followed by the first n - k. For an in-place version, reverse the whole array, then reverse the first k elements and the remaining n - k.

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
    def reverse(i, j):
        while i < j:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
            j -= 1
    reverse(0, n - 1)
    reverse(0, k - 1)
    reverse(k, n - 1)

a = [1, 2, 3, 4, 5]
print(rotate_right(a, 2))  # [4, 5, 1, 2, 3]
rotate_in_place(a, 7)      # 7 % 5 = 2
print(a)                   # [4, 5, 1, 2, 3]
\`\`\``,
          d: 'medium',
          at: 'Cognizant',
          tip: `Always handle k larger than n with k % n.`,
        },
        {
          q: `Move all zeros in an array to the end while keeping the order of the other elements.`,
          a: `**Approach:** use a write pointer. Copy every non-zero value to the next write position, then fill the remaining positions with zeros. The relative order of non-zero values is preserved because they are written in the order they are read.

**Complexity:** O(n) time, O(1) extra space, done in place.

\`\`\`python
def move_zeros(nums):
    write = 0
    for x in nums:
        if x != 0:
            nums[write] = x
            write += 1
    for i in range(write, len(nums)):
        nums[i] = 0
    return nums

print(move_zeros([0, 1, 0, 3, 12]))  # [1, 3, 12, 0, 0]
print(move_zeros([0, 0, 1]))         # [1, 0, 0]
\`\`\`

The write pointer never passes the read position, so we only overwrite values we have already read. A one-liner like \`[x for x in nums if x] + [0] * nums.count(0)\` also works but uses extra space.`,
          d: 'medium',
          at: 'Cognizant',
        },
        {
          q: `Print all prime numbers up to n efficiently.`,
          a: `**Approach:** the **Sieve of Eratosthenes**. Start by marking every number from 2 as prime. For each prime p, mark its multiples from p x p onwards as not prime (smaller multiples were already marked by smaller primes). Stop when p x p > n.

**Complexity:** O(n log log n) time, O(n) space, much faster than checking each number by trial division.

\`\`\`python
def primes_up_to(n):
    if n < 2:
        return []
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for m in range(p * p, n + 1, p):
                is_prime[m] = False
        p += 1
    return [i for i, ok in enumerate(is_prime) if ok]

print(primes_up_to(30))  # [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
\`\`\`

To test a single number, trial division up to its square root (O(sqrt n)) is enough.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Explain why marking starts at p*p; it shows you understand the sieve.`,
        },
        {
          q: `Find the maximum sum of a contiguous subarray and return the subarray as well.`,
          a: `**Approach:** **Kadane's algorithm**. Keep \`cur\`, the best sum of a subarray ending at the current index. At each element either extend the previous subarray or start fresh from this element, whichever is larger. Track where the current run started and update the best answer when \`cur\` beats it.

**Complexity:** O(n) time, O(1) extra space. Works when all numbers are negative (it returns the largest single element).

\`\`\`python
def max_subarray(nums):
    best = cur = nums[0]
    start = best_start = best_end = 0
    for i in range(1, len(nums)):
        if cur + nums[i] < nums[i]:
            cur = nums[i]
            start = i
        else:
            cur += nums[i]
        if cur > best:
            best, best_start, best_end = cur, start, i
    return best, nums[best_start:best_end + 1]

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))  # (6, [4, -1, 2, 1])
print(max_subarray([-3, -1, -2]))                     # (-1, [-1])
\`\`\``,
          d: 'hard',
          at: 'Cognizant',
          tip: `Test with an all-negative array; many solutions wrongly return 0.`,
        },
        {
          q: `Find the longest substring without repeating characters.`,
          a: `**Approach:** a **sliding window** with a dictionary of the last index of each character. Move the right end one step at a time. If the character was already seen inside the current window, move the left end just past its previous position. Record the window whenever it is the longest so far.

**Complexity:** O(n) time, O(k) space for the dictionary (k = distinct characters).

\`\`\`python
def longest_unique_substring(s):
    last_seen = {}
    start = best_len = best_start = 0
    for i, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= start:
            start = last_seen[ch] + 1
        last_seen[ch] = i
        if i - start + 1 > best_len:
            best_len, best_start = i - start + 1, start
    return s[best_start:best_start + best_len]

print(longest_unique_substring("abcabcbb"))  # abc
print(longest_unique_substring("pwwkew"))    # wke
print(longest_unique_substring("bbbb"))      # b
\`\`\`

The check \`last_seen[ch] >= start\` matters: an old occurrence outside the window must not move the left end backwards.`,
          d: 'hard',
          at: 'Cognizant',
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Tell me about yourself.`,
          a: `Keep it to about one minute, in this order: **present, past, future**.

**Model answer:**

"I am [your name], a final-year [branch] student at [college], graduating in [year]. I enjoy building practical software; my strongest language is [language], and I am comfortable with SQL and the basics of [web framework / cloud].

For my final-year project I built [your project], which [what it does]. I handled [your part], and the most useful thing I learned was [one learning, for example writing clean APIs or working with a team on Git].

Outside academics I [one activity: hackathon, club, certification, internship at company].

I am looking to start my career in a company like Cognizant where I can work on real client projects, learn new technologies through structured training and grow into a strong developer."

Do not repeat your resume line by line, and do not start with family details unless asked.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Practise it aloud until it sounds natural, not memorised.`,
        },
        {
          q: `Why do you want to join Cognizant?`,
          a: `Show that you know the company and connect it to your goals.

**Model answer:**

"Cognizant is one of the large IT services companies working with clients in areas such as banking, healthcare, insurance and retail, so as a fresher I would get exposure to real business problems across industries. I also know Cognizant puts freshers through structured training before projects, which matters to me because I want a strong foundation in [technology you like].

I read that Cognizant describes its purpose as engineering modern businesses to improve everyday life, and it has been investing in areas like cloud, data and AI. My project on [your project] got me interested in [related area], so I would like to grow in that direction here.

Finally, the scale of Cognizant means many paths to grow, whether as a developer, tester or later in a specialised role."

Check the company's current website before the interview so your facts are recent.`,
          d: 'easy',
          at: 'Cognizant',
          tip: `Mention one specific thing you read on the official site; generic praise sounds memorised.`,
        },
        {
          q: `Are you willing to relocate to any Cognizant location in India?`,
          a: `Service companies place freshers based on project needs, so interviewers want a clear, positive answer.

**Model answer:**

"Yes, I am willing to relocate. At the start of my career I think learning and project exposure matter more than location, and I am comfortable living independently. Cognizant has large centres in cities such as Chennai, Bengaluru, Hyderabad, Pune and Kolkata, and I would be happy to work from wherever my team is."

If you genuinely have a constraint (for example a health issue in the family), be honest but flexible: "I am open to relocating; if there is a choice, I would prefer [city] because [reason], but it will not stop me from joining."

Never say yes in the interview if you plan to refuse later; it wastes an offer that could have gone to someone else.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Say yes clearly first; add any preference only after that.`,
        },
        {
          q: `Are you comfortable working in shifts, including night shifts?`,
          a: `Cognizant serves clients in many time zones, so some projects need early, late or rotational shifts.

**Model answer:**

"Yes. I understand that client projects in the US, UK or Australia may need overlap with their working hours, and support projects may have rotational shifts. I am comfortable adjusting my routine for that. In college I [example: managed late-night hackathons / balanced an internship with classes], so I know how to plan my sleep and stay productive.

I would just like to understand the shift pattern of the project when I am allocated, so I can plan for it."

This answer is honest and shows maturity. Avoid sounding reluctant ("only if there is no other option"). If you have a real medical reason, mention it politely; companies usually try to accommodate genuine needs.`,
          d: 'medium',
          at: 'Cognizant',
        },
        {
          q: `Will you work on any technology or domain we assign, even if it is not what you prepared for?`,
          a: `In service companies, freshers are often trained and allocated based on demand, not personal preference.

**Model answer:**

"Yes. I see my first role as a chance to build strong fundamentals, and good fundamentals transfer across technologies. My core skills are [language] and SQL, but I have picked up new tools quickly before: for [your project] I learned [new framework/tool] in about [time] by reading the documentation and building small examples.

If I am assigned to testing, support or a technology I have not used, I will learn it properly and do good work. Over time I would like to grow towards [area of interest, e.g. backend development or data], and I would show that through my performance and certifications."

This shows flexibility without losing your own direction, which is what managers want to hear.`,
          d: 'medium',
          at: 'Cognizant',
          tip: `Back "I learn fast" with one real example and a timeframe.`,
        },
        {
          q: `Where do you see yourself in five years?`,
          a: `Show ambition that fits the company, not a plan to leave.

**Model answer:**

"In five years I see myself as a strong, trusted engineer in my team: someone who understands the client's business well, delivers reliable code and helps new joiners. I would like to have deep skills in [area, e.g. Java backend or cloud], some relevant certifications, and to have started taking ownership of modules or leading small parts of a project.

Cognizant's size and range of clients would let me grow in that direction, whether that leads to a technical lead path or a specialised role in [area]."

Avoid answers like "I will be doing an MBA abroad" or "I want to start my own company"; they suggest you will leave soon. Also avoid naming a big title like "project manager in 2 years", which sounds unrealistic.`,
          d: 'medium',
          at: 'Cognizant',
        },
        {
          q: `Tell me about a time you had a conflict with a teammate. How did you handle it?`,
          a: `Use **STAR**: Situation, Task, Action, Result. Cognizant's published values talk about working as one team and doing the right thing, so show collaboration, not blame.

**Model answer:**

"**Situation:** In our final-year project, a teammate and I disagreed on the database: he wanted MongoDB and I wanted MySQL, and the argument delayed our work by a few days.

**Task:** As the person handling the backend, I had to get us to a decision without hurting the team.

**Action:** Instead of arguing, I suggested we list our actual requirements. Our data had clear relationships (students, courses, enrolments) and needed joins, so we each built a small prototype for one feature and compared. I also made sure his concern about flexible fields was handled with a JSON column.

**Result:** We agreed on MySQL within a day, finished the module on time, and he later led the reporting part. I learned that data settles disagreements faster than opinions."`,
          d: 'hard',
          at: 'Cognizant',
          tip: `Pick a real, small conflict that ended well, and never criticise the other person.`,
        },
        {
          q: `What will you do if you get another offer with a higher package after accepting ours?`,
          a: `This tests honesty and commitment. Do not pretend money does not matter, but show you value the decision you made.

**Model answer:**

"I have applied to Cognizant because the role, the training and the kind of client work fit what I want at the start of my career. Salary matters, but for a fresher the learning and stability matter more over the first few years. If I accept Cognizant's offer, I will honour that commitment and join.

If I ever had a serious decision to make, I would be transparent with HR rather than disappearing, because I think that is the professional way to handle it."

Avoid saying "I will definitely take the higher one" or "I am not applying anywhere else" if that is not true. Interviewers respect honesty, and offer terms such as notice or service conditions are in your offer documents, so read them before accepting.`,
          d: 'hard',
          at: 'Cognizant',
          tip: `Stay calm; the interviewer is checking maturity, not looking for a perfect line.`,
        },
      ],
    },
  ],
};

export default book;
