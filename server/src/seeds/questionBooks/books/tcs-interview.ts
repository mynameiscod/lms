// TCS fresher interview questions: hiring process, NQT-style aptitude, technical, coding and HR rounds.
import { SeedBook, ALL_YEARS } from '../types';

const book: SeedBook = {
  slug: 'tcs-interview',
  title: 'TCS Interview Questions',
  kind: 'company',
  subject: 'TCS',
  emblem: '🏢',
  color: '#1e293b',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 100,
  description: `Prepare for TCS fresher hiring: how the NQT and interview rounds usually work, NQT-style aptitude with worked solutions, technical and coding questions, and HR answers.`,
  chapters: [
    {
      title: `Hiring process and preparation`,
      questions: [
        {
          q: `What does the TCS fresher hiring process typically look like?`,
          a: `In recent drives, TCS fresher hiring has usually followed this path:

1. **Registration** on the TCS NextStep portal and applying for the drive (on-campus or off-campus).
2. **Online test**, usually the **TCS NQT** (National Qualifier Test).
3. **Interview**, which typically covers three areas: **Technical (TR)**, **Managerial (MR)** and **HR**. Sometimes these are separate rounds, sometimes one panel covers all three in a single sitting.
4. **Offer letter**, document verification and background check.
5. **Joining** and the **Initial Learning Program (ILP)**, TCS's training for new joiners.

The exact order, number of rounds and timelines change from year to year and between campus and off-campus drives, so always read the drive notification and the official TCS careers page.`,
          d: 'easy',
          at: 'TCS',
          tip: `Treat every stage as eliminatory: a strong test score does not carry you through a weak interview.`,
        },
        {
          q: `What is TCS NQT and what sections does it usually contain?`,
          a: `**TCS NQT (National Qualifier Test)** is the online test TCS uses to shortlist freshers. In recent years its score has also been accepted by some other companies, which is why many students take it.

In recent patterns the test has typically been split into two parts:

- **Foundation section:** numerical ability, verbal ability (English) and reasoning ability. This checks whether you meet the basic bar.
- **Advanced section:** advanced quantitative and reasoning ability, plus **coding** problems. Performance here usually matters for higher roles.

Things that tend to stay the same year to year: questions are timed per section, you cannot freely jump between sections, and coding is done in an online editor that reads from standard input.

The number of questions, timing and marking can change between drives, so check the latest pattern on the official NQT page before your test rather than trusting a year-old blog.`,
          d: 'easy',
          at: 'TCS',
          tip: `Practise with a timer per section; running out of time is a more common failure than not knowing the topic.`,
        },
        {
          q: `What are the TCS Ninja, Digital and Prime roles, and how are you considered for each?`,
          a: `TCS has commonly hired freshers into tiered profiles:

- **Ninja**: the standard entry-level role, with the largest number of hires.
- **Digital**: a higher profile for candidates who show stronger coding and problem-solving skills.
- **Prime**: a further tier that has been offered in recent years to top performers.

In recent drives, the tier you are considered for has generally depended on your **NQT performance, especially the Advanced section and coding**, followed by the interview. A Digital or Prime interview usually goes deeper into DSA, projects and problem solving than a Ninja interview.

Role names, the number of tiers and the compensation for each change across years, so check the drive notification for what is on offer. Do not rely on salary numbers you see online; your offer letter is the only source that counts.`,
          d: 'easy',
          at: 'TCS',
          tip: `Solving the coding questions fully, not partially, is the clearest way to stand out for higher tiers.`,
        },
        {
          q: `How do you register for a TCS drive, and what is the reference number?`,
          a: `Registration usually happens on the **TCS NextStep portal**:

1. Create an account and choose the right category. Freshers typically register under the **IT** category.
2. Fill the **application form** completely: personal details, 10th/12th/graduation marks, any gaps and backlogs.
3. Submit it. You receive a **reference number** (commonly shown with a CT or DT prefix). Keep it safe; it is used for test admission, interviews and joining.
4. **Apply for the specific drive** shown in the portal. Creating a profile alone is not the same as applying.

**Common mistakes:** marks entered differently from the marksheet, an incomplete form, or a wrong email address. Mismatches can cause problems later in document verification.

The portal layout and steps may change, so follow the instructions on the official TCS careers and NextStep pages for your drive.`,
          d: 'easy',
          at: 'TCS',
          tip: `Fill marks exactly as on your marksheets (percentage or CGPA as printed) to avoid verification issues later.`,
        },
        {
          q: `What does each TCS interview round (TR, MR, HR) usually check?`,
          a: `- **Technical round (TR):** your basics in the language you put on your resume (often C, Java or Python), OOP, DBMS and SQL, operating systems, networks, and above all **your project**. You may be asked to write a small program or SQL query on paper or in a shared editor. Digital and Prime interviews go deeper into data structures and algorithms.
- **Managerial round (MR):** how you think and behave at work: handling pressure, teamwork, situational questions ("what would you do if a deadline is missed?"), sometimes a puzzle, and your understanding of TCS and the IT industry.
- **HR round:** communication, attitude, willingness to **relocate** and work **shifts**, understanding of the **service agreement** and joining terms, and document checks.

In many drives these are covered by one panel in a single conversation, so be ready to switch between technical and behavioural questions.`,
          d: 'medium',
          at: 'TCS',
          tip: `Be able to explain every line of your resume; panels often pick a skill you listed and ask you to prove it.`,
        },
        {
          q: `What eligibility criteria does TCS commonly apply to freshers?`,
          a: `TCS publishes eligibility in each drive notification. Criteria that have **commonly** appeared in recent drives include:

- A **minimum aggregate in 10th, 12th/diploma and graduation**. The percentage required is stated in the notification, so check it rather than relying on hearsay.
- **No active backlogs** at the time of joining. Past backlogs that are cleared may be allowed, within limits stated in the drive.
- **Limits on education gaps**. Gaps usually have to be declared honestly with a reason.
- Eligible **degrees and passing years** (for example B.E./B.Tech, M.E./M.Tech, MCA, M.Sc, and in some drives B.Sc/BCA for specific roles).

**What to do:**
- Read the criteria of the exact drive you apply to.
- Declare gaps and backlogs truthfully in the form; a mismatch found during background verification is worse than the gap itself.

When unsure, check the official TCS careers page or ask your placement cell.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `What documents should you keep ready, and what happens after you get the offer?`,
          a: `**Documents commonly asked for** (the official checklist in your joining email is final):

- 10th, 12th/diploma and graduation **marksheets and certificates** (all semesters).
- **Provisional/degree certificate** or college letter if results are pending.
- **Photo ID** (Aadhaar, PAN, passport) and passport-size photos.
- **Gap declaration** or affidavit if you had an education gap.
- Bank details and any other forms listed by TCS.

**After the offer**, freshers typically go through document verification and a background check, receive a **joining letter** with date and location, and then attend the **Initial Learning Program (ILP)**, where new joiners are trained on technical and professional skills before being assigned to projects. The training location, duration and format vary by batch.

Keep scanned copies in one folder and originals together; joining emails often give short deadlines.`,
          d: 'easy',
          at: 'TCS',
          tip: `Check that your name and date of birth match across every document; mismatches delay joining.`,
        },
        {
          q: `How should you prepare for TCS NQT and interviews in 4 to 6 weeks?`,
          a: `**Weeks 1–2: aptitude foundation**
- Daily: 30 quant problems (percentages, profit and loss, time and work, time–speed–distance, ratio, probability, number series).
- Reasoning: series, coding–decoding, blood relations, seating, data interpretation.
- Verbal: reading comprehension, sentence completion, error spotting, 15 minutes of English reading daily.

**Weeks 3–4: coding**
- Pick one language and solve string, array and number problems that read input from stdin (palindromes, primes, frequency counts, rotations, subarray sums).
- Practise writing full programs, including input parsing, in a plain online editor without autocomplete.

**Weeks 5–6: mocks and interview**
- Take full timed mock tests; review every mistake.
- Revise OOP, DBMS/SQL, OS and networks basics.
- Prepare your project story, "tell me about yourself", and answers on relocation, shifts and the service agreement.

Speed matters as much as accuracy, so always practise against the clock.`,
          d: 'medium',
          at: 'TCS',
        },
      ],
    },
    {
      title: `Aptitude and reasoning (test style)`,
      questions: [
        {
          q: `A train 240 m long crosses a pole in 12 seconds. How long will it take to cross a platform 360 m long?

A) 24 s  B) 30 s  C) 36 s  D) 40 s`,
          a: `**Answer: B) 30 s**

**Step 1: find the speed.** Crossing a pole means the train covers its own length.
Speed = 240 m ÷ 12 s = **20 m/s**.

**Step 2: distance to cross the platform.** The train must cover its own length plus the platform:
240 + 360 = **600 m**.

**Step 3: time.** 600 ÷ 20 = **30 s**.

**Check:** in 30 s at 20 m/s the train covers 600 m, which is exactly train + platform. ✔

**Rule to remember:** pole or person (negligible length) → distance = train length; platform or another train → add both lengths.`,
          d: 'easy',
          at: 'TCS',
          tip: `If speed is given in km/h, multiply by 5/18 to get m/s before using lengths in metres.`,
        },
        {
          q: `A shopkeeper marks an article 25% above its cost price and then gives a discount of 10% on the marked price. What is his profit percentage?

A) 10%  B) 12.5%  C) 15%  D) 11.25%`,
          a: `**Answer: B) 12.5%**

Let the cost price be **₹100**.

- Marked price = 100 + 25% of 100 = **₹125**.
- Discount = 10% of 125 = ₹12.50, so selling price = **₹112.50**.
- Profit = 112.50 − 100 = ₹12.50 on a cost of ₹100 → **12.5%**.

**Shortcut:** net multiplier = 1.25 × 0.90 = 1.125 → 12.5% profit.

**Check with another cost:** CP ₹200 → MP ₹250 → SP ₹225 → profit ₹25 = 12.5% of 200. ✔

**Common trap:** doing 25 − 10 = 15% (option C). Successive percentage changes multiply; they do not simply subtract.`,
          d: 'easy',
          at: 'TCS',
        },
        {
          q: `Find the next number in the series: 2, 6, 12, 20, 30, 42, ?

A) 52  B) 54  C) 56  D) 60`,
          a: `**Answer: C) 56**

**Method 1: differences.**
6 − 2 = 4, 12 − 6 = 6, 20 − 12 = 8, 30 − 20 = 10, 42 − 30 = 12.
The differences rise by 2, so the next difference is **14**: 42 + 14 = **56**.

**Method 2: pattern n × (n + 1).**
1×2 = 2, 2×3 = 6, 3×4 = 12, 4×5 = 20, 5×6 = 30, 6×7 = 42, so the next term is **7×8 = 56**.

Both methods agree. ✔

**Approach for series questions:** first check differences; if they are not constant, check the differences of differences, then multiplication patterns (×2, ×2+1), squares/cubes, and alternating series.`,
          d: 'easy',
          at: 'TCS',
        },
        {
          q: `A can finish a piece of work in 12 days and B in 18 days. They work together for 4 days, after which A leaves. In how many more days will B finish the remaining work?

A) 6  B) 7  C) 8  D) 9`,
          a: `**Answer: C) 8**

**LCM method:** take total work = LCM(12, 18) = **36 units**.
- A's rate = 36 ÷ 12 = 3 units/day.
- B's rate = 36 ÷ 18 = 2 units/day.

**Together for 4 days:** (3 + 2) × 4 = **20 units**.
**Remaining:** 36 − 20 = **16 units**.
**B alone:** 16 ÷ 2 = **8 days**.

**Check with fractions:** together per day = 1/12 + 1/18 = 5/36. In 4 days: 20/36 = 5/9. Remaining 4/9. B needs (4/9) × 18 = 8 days. ✔

Using LCM as total work avoids fractions and is faster under time pressure.`,
          d: 'medium',
          at: 'TCS',
          tip: `Take total work as the LCM of the given days so every rate becomes a whole number.`,
        },
        {
          q: `Two fair dice are thrown together. What is the probability that the sum of the numbers is 8?

A) 1/6  B) 5/36  C) 7/36  D) 1/9`,
          a: `**Answer: B) 5/36**

**Total outcomes:** each die has 6 faces, so 6 × 6 = **36** equally likely outcomes.

**Favourable outcomes (sum = 8):**
(2, 6), (3, 5), (4, 4), (5, 3), (6, 2) → **5** outcomes.
(1 cannot be used because 1 + 7 needs a 7.)

**Probability** = 5 / 36.

**Check:** sums 2 to 12 have 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1 outcomes respectively, which add up to 36. Sum 8 is the 7th value, which is 5. ✔

**Remember:** (3, 5) and (5, 3) are different outcomes because the dice are distinct, but (4, 4) is counted once.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `What is the difference between compound interest and simple interest on ₹10,000 for 2 years at 10% per annum (compounded annually)?

A) ₹100  B) ₹110  C) ₹121  D) ₹200`,
          a: `**Answer: A) ₹100**

**Simple interest:** SI = P × R × T / 100 = 10,000 × 10 × 2 / 100 = **₹2,000**.

**Compound interest:**
Amount = 10,000 × (1.10)² = 10,000 × 1.21 = ₹12,100.
CI = 12,100 − 10,000 = **₹2,100**.

**Difference:** 2,100 − 2,000 = **₹100**.

**Shortcut for 2 years:** CI − SI = P × (R/100)² = 10,000 × (0.1)² = ₹100. ✔

**Why:** in year 2, compound interest also earns interest on the first year's ₹1,000 of interest, and 10% of ₹1,000 is ₹100.

(For 3 years the formula becomes P × (R/100)² × (3 + R/100).)`,
          d: 'medium',
          at: 'TCS',
          tip: `Memorise CI − SI = P(R/100)² for 2 years; it turns a 1-minute problem into a 10-second one.`,
        },
        {
          q: `The ratio of the present ages of A and B is 4 : 5. After 6 years, the ratio will be 5 : 6. What is A's present age?

A) 20 years  B) 24 years  C) 28 years  D) 30 years`,
          a: `**Answer: B) 24 years**

Let present ages be **4x** and **5x**.

After 6 years: (4x + 6) / (5x + 6) = 5 / 6

Cross-multiply:
6(4x + 6) = 5(5x + 6)
24x + 36 = 25x + 30
**x = 6**

So A = 4 × 6 = **24 years** and B = 5 × 6 = 30 years.

**Check:** after 6 years, A = 30 and B = 36. 30 : 36 = 5 : 6. ✔

**Faster option check:** A must be a multiple of 4 → 20, 24 or 28. Try 24: B = 30, after 6 years 30 : 36 = 5 : 6. Works immediately.`,
          d: 'medium',
          at: 'TCS',
          tip: `With options given, plugging them in is often faster than solving the equation.`,
        },
        {
          q: `At what time between 4 o'clock and 5 o'clock will the hour and minute hands of a clock be together (overlap)?

A) 4:20  B) 4:21 9/11  C) 4:22  D) 4:21 3/11`,
          a: `**Answer: B) 4 : 21 9/11 (21 and 9/11 minutes past 4)**

**Speeds:**
- Minute hand: 360° in 60 min = **6° per minute**.
- Hour hand: 30° in 60 min = **0.5° per minute**.
- The minute hand gains **5.5° per minute**.

**At 4:00** the hour hand is at 4 × 30 = **120°** and the minute hand at 0°. To overlap, the minute hand must gain 120°.

Time = 120 ÷ 5.5 = 240/11 = **21 9/11 minutes**.

**Check:** after 240/11 min, minute hand = 6 × 240/11 = 1440/11 ≈ 130.9°. Hour hand = 120 + 0.5 × 240/11 = 120 + 120/11 = 1440/11 ≈ 130.9°. Equal. ✔

**General formula:** hands overlap between h and h+1 o'clock at (60h/11) minutes past h.`,
          d: 'hard',
          at: 'TCS',
        },
      ],
    },
    {
      title: `Technical interview`,
      questions: [
        {
          q: `What are the four pillars of object-oriented programming? Explain with simple examples.`,
          a: `1. **Encapsulation:** bundling data and the methods that use it inside a class, and hiding internal details. Example: a \`BankAccount\` keeps \`balance\` private and exposes \`deposit()\` and \`withdraw()\`, so balance cannot be set to a negative value directly.
2. **Abstraction:** showing only what is needed and hiding how it works. Example: you call \`car.start()\` without knowing the ignition logic. In Java this is done with abstract classes and interfaces.
3. **Inheritance:** a class reuses and extends another class. Example: \`SavingsAccount extends BankAccount\` gets deposit/withdraw and adds \`addInterest()\`.
4. **Polymorphism:** the same call behaves differently based on the object. Example: \`shape.area()\` gives a different result for \`Circle\` and \`Rectangle\`.

\`\`\`python
class Shape:
    def area(self): return 0

class Circle(Shape):
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r * self.r
\`\`\``,
          d: 'easy',
          at: 'TCS',
          tip: `Use one running example (like a bank account) for all four pillars; it sounds clearer than four unrelated ones.`,
        },
        {
          q: `What is the difference between method overloading and method overriding?`,
          a: `| | Overloading | Overriding |
|---|---|---|
| Where | Same class | Parent and child class |
| Signature | Same name, **different parameters** | Same name, **same parameters** |
| Resolved | At **compile time** (static polymorphism) | At **run time** (dynamic polymorphism) |
| Purpose | One operation for different inputs | Child changes the parent's behaviour |

\`\`\`java
class Calculator {
    int add(int a, int b) { return a + b; }            // overloading
    double add(double a, double b) { return a + b; }
}

class Animal { void sound() { System.out.println("..."); } }
class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }      // overriding
}
\`\`\`

Note: Python does not support classic overloading (a later definition replaces the earlier one); default arguments or \`*args\` are used instead. Overriding works in Python as in Java.`,
          d: 'easy',
          at: 'TCS',
        },
        {
          q: `Explain primary key, foreign key and normalization (1NF, 2NF, 3NF).`,
          a: `- **Primary key:** uniquely identifies each row; cannot be NULL or repeat. Example: \`student_id\`.
- **Foreign key:** a column that refers to the primary key of another table, keeping the data consistent. Example: \`enrolments.student_id\` references \`students.student_id\`.

**Normalization** organises tables to reduce duplicate data and update problems:

- **1NF:** every column holds a single (atomic) value; no lists like "Java, SQL" in one cell.
- **2NF:** 1NF + every non-key column depends on the **whole** primary key, not part of a composite key. Example: in \`(student_id, course_id, student_name)\`, \`student_name\` depends only on \`student_id\`, so move it to the students table.
- **3NF:** 2NF + no non-key column depends on another non-key column (no **transitive dependency**). Example: if a table has \`pincode\` and \`city\`, and city depends on pincode, move city to a pincode table.

Normalization reduces redundancy; sometimes tables are deliberately denormalized for faster reads.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `Write an SQL query to find the second highest salary from an employees table.`,
          a: `**Method 1: subquery (works in almost every database)**
\`\`\`sql
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
\`\`\`
It takes the highest salary that is less than the maximum. If every employee has the same salary, it returns NULL.

**Method 2: LIMIT with OFFSET (MySQL/PostgreSQL)**
\`\`\`sql
SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
\`\`\`
\`DISTINCT\` matters: without it, two people sharing the top salary would make the "second" row the same top value.

**Method 3: window function (for Nth highest)**
\`\`\`sql
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) t
WHERE rnk = 2;
\`\`\``,
          d: 'medium',
          at: 'TCS',
          tip: `Mention how your query handles duplicate top salaries; that is the follow-up interviewers usually ask.`,
        },
        {
          q: `What is the difference between a process and a thread?`,
          a: `- A **process** is a program in execution. It has its **own memory space** (code, data, heap, stack), file handles and resources. Example: two browser windows running as separate processes.
- A **thread** is a unit of execution **inside** a process. Threads of the same process **share** code, data and heap, but each has its own **stack, registers and program counter**.

| | Process | Thread |
|---|---|---|
| Memory | Separate | Shared within the process |
| Creation cost | Heavy | Light |
| Communication | Needs IPC (pipes, sockets, shared memory) | Direct through shared memory |
| Failure | One crashing does not usually affect others | One crashing can bring down the whole process |
| Context switch | Slower | Faster |

**Example:** a word processor is one process; one thread handles typing, another does spell check, another auto-saves.

Because threads share memory, they need synchronization (locks, semaphores) to avoid race conditions.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `What is a deadlock? What are the four necessary conditions and how can deadlocks be handled?`,
          a: `A **deadlock** is a situation where two or more processes wait forever, each holding a resource the other needs. Example: P1 holds the printer and waits for the scanner; P2 holds the scanner and waits for the printer.

**Four necessary conditions (Coffman conditions)**, all must hold together:
1. **Mutual exclusion:** a resource can be used by only one process at a time.
2. **Hold and wait:** a process holds one resource while waiting for another.
3. **No preemption:** a resource cannot be forcibly taken away.
4. **Circular wait:** a cycle of processes, each waiting for the next.

**Handling methods:**
- **Prevention:** break one condition, e.g. request all resources at once (no hold and wait) or acquire resources in a fixed global order (no circular wait).
- **Avoidance:** grant a request only if the system stays in a safe state, e.g. **Banker's algorithm**.
- **Detection and recovery:** allow deadlocks, detect cycles in a resource allocation graph, then kill or roll back a process.
- **Ignore:** many general-purpose OSs largely ignore it because it is rare (the "ostrich" approach).`,
          d: 'hard',
          at: 'TCS',
        },
        {
          q: `What happens when you type a URL like www.example.com in the browser and press Enter?`,
          a: `1. **URL parsing:** the browser identifies the protocol (\`https\`), domain and path.
2. **DNS resolution:** the domain is converted to an IP address, checking the browser cache, OS cache, router and then DNS servers (recursive resolver → root → TLD → authoritative server).
3. **TCP connection:** the browser opens a TCP connection to the server's IP on port 443 (HTTPS) or 80 (HTTP) using the **three-way handshake** (SYN, SYN-ACK, ACK).
4. **TLS handshake (HTTPS):** browser and server agree on encryption, the server's certificate is verified, and session keys are created.
5. **HTTP request:** the browser sends \`GET / HTTP/1.1\` with headers such as Host, cookies and User-Agent.
6. **Server processing:** a web server or application server builds the response, possibly querying a database.
7. **HTTP response:** status code (200, 301, 404...), headers and the HTML body.
8. **Rendering:** the browser parses HTML into the DOM, CSS into the CSSOM, runs JavaScript, fetches images/scripts with more requests, and paints the page.

This question tests networks end to end; mention DNS, TCP, TLS and HTTP at minimum.`,
          d: 'hard',
          at: 'TCS',
          tip: `Relate each step to an OSI/TCP-IP layer if asked; it shows you understand networks, not just the steps.`,
        },
        {
          q: `Explain your final-year project. What follow-up questions should you expect?`,
          a: `**Structure your explanation (2 minutes):**
"My project is **[your project]**. It solves **[problem]** for **[users]**. We were a team of [n], and I built **[your part]**. We used **[technologies]** because [reason]. The hardest part was **[challenge]**, which I solved by **[what you did]**. The result was **[outcome]**."

**Follow-ups TCS panels commonly ask:**
- Why did you choose this technology over alternatives?
- Draw the architecture or the database tables.
- Explain the code of the module you wrote; how does [specific feature] work?
- What would you improve if you had more time?
- How did you test it? What happens if [input is invalid / the server is down]?
- What was your exact contribution versus your teammates'?

**Prepare by:** revising your own code, keeping a simple diagram ready, and knowing the SQL tables you used. Be honest about what you did; claiming a teammate's module usually falls apart under two follow-up questions.`,
          d: 'medium',
          at: 'TCS',
          tip: `Interviewers often spend most of the technical round on your project; it is the topic you can control best.`,
        },
      ],
    },
    {
      title: `Coding round`,
      questions: [
        {
          q: `Check whether a given integer is a palindrome (reads the same forwards and backwards) without converting it to a string.`,
          a: `**Approach:** reverse the number digit by digit. Take the last digit with \`n % 10\`, append it to the reversed number with \`rev * 10 + digit\`, and drop it with \`n // 10\`. Compare the reversed number with the original. Negative numbers are not palindromes because of the minus sign.

**Complexity:** O(d) time, where d is the number of digits; O(1) space.

\`\`\`python
def is_palindrome_number(n):
    if n < 0:
        return False
    original, rev = n, 0
    while n > 0:
        rev = rev * 10 + n % 10
        n //= 10
    return rev == original

n = int(input())
print("Palindrome" if is_palindrome_number(n) else "Not Palindrome")
\`\`\`

**Examples:** 121 → Palindrome, 123 → Not Palindrome, 0 → Palindrome (the loop does not run and 0 == 0).`,
          d: 'easy',
          at: 'TCS',
          tip: `NQT-style problems read from stdin and expect exact output text; match the required format character for character.`,
        },
        {
          q: `Given an array of integers, find the second largest distinct element. Print -1 if it does not exist.`,
          a: `**Approach:** one pass with two variables. When a value is bigger than \`first\`, the old \`first\` becomes \`second\`. When a value is between them (and not equal to \`first\`), it becomes \`second\`. Sorting also works but costs O(n log n) and needs care with duplicates.

**Complexity:** O(n) time, O(1) space.

\`\`\`python
def second_largest(nums):
    first = second = None
    for x in nums:
        if first is None or x > first:
            first, second = x, first
        elif x != first and (second is None or x > second):
            second = x
    return second

nums = list(map(int, input().split()))
ans = second_largest(nums)
print(ans if ans is not None else -1)
\`\`\`

**Examples:** \`10 5 20 20\` → 10; \`7 7 7\` → -1; \`3 5\` → 3.`,
          d: 'easy',
          at: 'TCS',
        },
        {
          q: `Check whether two strings are anagrams of each other, ignoring case and spaces.`,
          a: `**Approach:** two strings are anagrams if they contain the same characters with the same counts. Normalise both (lowercase, remove spaces), then compare character counts with \`collections.Counter\`. Sorting both strings and comparing also works.

**Complexity:** O(n) with Counter (O(n log n) with sorting); O(k) extra space for k distinct characters.

\`\`\`python
from collections import Counter

def are_anagrams(a, b):
    a = a.replace(" ", "").lower()
    b = b.replace(" ", "").lower()
    return Counter(a) == Counter(b)

s1 = input()
s2 = input()
print("Yes" if are_anagrams(s1, s2) else "No")
\`\`\`

**Examples:** "Listen" / "Silent" → Yes; "Dormitory" / "Dirty room" → Yes; "abc" / "abd" → No.

If asked to do it without libraries, use a 26-length count array: increment for the first string, decrement for the second, and check all counts are zero (valid for lowercase letters only).`,
          d: 'easy',
          at: 'TCS',
        },
        {
          q: `Print all prime numbers between two integers a and b (inclusive).`,
          a: `**Approach:** for a range, the **Sieve of Eratosthenes** is much faster than testing each number. Mark every number as prime, then for each i from 2 while i × i ≤ b, mark multiples of i (starting at i × i) as not prime. Finally print the unmarked numbers from max(a, 2) to b.

**Complexity:** O(b log log b) time, O(b) space. Testing each number up to its square root would be O((b − a) √b).

\`\`\`python
def primes_in_range(a, b):
    if b < 2:
        return []
    sieve = [True] * (b + 1)
    sieve[0] = sieve[1] = False
    i = 2
    while i * i <= b:
        if sieve[i]:
            for j in range(i * i, b + 1, i):
                sieve[j] = False
        i += 1
    return [x for x in range(max(a, 2), b + 1) if sieve[x]]

a, b = map(int, input().split())
print(*primes_in_range(a, b))
\`\`\`

**Example:** input \`10 30\` → \`11 13 17 19 23 29\`. Note 1 is not prime and 2 is the only even prime.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `Find the first non-repeating character in a string. Print -1 if every character repeats.`,
          a: `**Approach:** two passes. First count every character with a dictionary (or Counter). Then scan the string again in order and return the first character whose count is 1. The second pass preserves the original order, which a plain count alone would not.

**Complexity:** O(n) time, O(k) space for k distinct characters.

\`\`\`python
from collections import Counter

def first_non_repeating(s):
    counts = Counter(s)
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None

s = input().strip()
ans = first_non_repeating(s)
print(ans if ans is not None else -1)
\`\`\`

**Examples:** "swiss" → w; "aabbcc" → -1; "programming" → p.

A common mistake is using nested loops (compare each character with every other), which is O(n²) and can time out on long inputs.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `Rotate an array to the right by k positions.`,
          a: `**Approach:** rotating n elements by n positions gives the same array, so first take \`k % n\`. The last k elements move to the front: the result is \`nums[n-k:] + nums[:n-k]\`.

For an in-place answer (often asked as a follow-up), use the **reversal trick**: reverse the whole array, then reverse the first k elements, then reverse the rest.

**Complexity:** O(n) time; O(n) extra space for slicing, O(1) for the reversal method.

\`\`\`python
def rotate_right(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    k %= n
    return nums[n - k:] + nums[:n - k]

def rotate_in_place(nums, k):
    n = len(nums)
    if n == 0:
        return
    k %= n
    nums.reverse()
    nums[:k] = reversed(nums[:k])
    nums[k:] = reversed(nums[k:])

nums = list(map(int, input().split()))
k = int(input())
print(*rotate_right(nums, k))
\`\`\`

**Example:** \`1 2 3 4 5\`, k = 2 → \`4 5 1 2 3\`.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `Find the contiguous subarray with the maximum sum, and print both the sum and the subarray (Kadane's algorithm).`,
          a: `**Approach (Kadane):** walk through the array keeping \`cur\`, the best sum of a subarray ending at the current index. At each element, either extend the previous subarray or start fresh here, whichever is larger. Track where the current run starts, and save the start and end whenever \`cur\` beats the best so far. Starting from the first element (not 0) handles all-negative arrays.

**Complexity:** O(n) time, O(1) extra space.

\`\`\`python
def max_subarray(nums):
    best = cur = nums[0]
    start = best_l = best_r = 0
    for i in range(1, len(nums)):
        if cur + nums[i] < nums[i]:
            cur = nums[i]
            start = i
        else:
            cur += nums[i]
        if cur > best:
            best, best_l, best_r = cur, start, i
    return best, nums[best_l:best_r + 1]

nums = list(map(int, input().split()))
total, sub = max_subarray(nums)
print(total)
print(*sub)
\`\`\`

**Example:** \`-2 1 -3 4 -1 2 1 -5 4\` → sum 6, subarray \`4 -1 2 1\`. For \`-3 -1 -2\` → sum -1, subarray \`-1\`.`,
          d: 'hard',
          at: 'TCS',
          tip: `Brute force over all subarrays is O(n²); mention it first, then improve to Kadane to show your thinking.`,
        },
        {
          q: `Find the length of the longest substring without repeating characters.`,
          a: `**Approach (sliding window):** keep a window \`[left, right]\` with no repeated characters and a dictionary of each character's last index. When the character at \`right\` was already seen **inside** the window, move \`left\` to one position after that earlier occurrence. Update the best length at every step.

**Complexity:** O(n) time (each index is visited once), O(k) space for k distinct characters.

\`\`\`python
def longest_unique_substring(s):
    last = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1
        last[ch] = right
        best = max(best, right - left + 1)
    return best

s = input()
print(longest_unique_substring(s))
\`\`\`

**Examples:** "abcabcbb" → 3 ("abc"); "bbbbb" → 1; "pwwkew" → 3 ("wke"); "" → 0.

The check \`last[ch] >= left\` is essential: in "abba", when the second "a" arrives, its earlier index 0 is already outside the window, so \`left\` must not move back.`,
          d: 'hard',
          at: 'TCS',
        },
      ],
    },
    {
      title: `HR and managerial round`,
      questions: [
        {
          q: `Tell me about yourself. (TCS HR or MR round)`,
          a: `**Sample answer:**
"Good morning. I am [your name] from [your city]. I completed my **[degree] in [branch]** from [your college] with [your CGPA]. I enjoy programming, mainly in **[Java / Python]**, and I am comfortable with **SQL** and the basics of [web development / data structures]. My final-year project was **[your project]**, where I built [your part] using [technologies]. I also [internship / certification / coding practice, e.g. solved 200 problems on a coding platform]. Outside studies I [one activity that shows teamwork or responsibility]. I am looking to start my career at TCS because I want to **learn on large real projects and grow as a developer**."

**Keep it to about a minute.** Order: background → skills → project → what you want.

**What they check:** clarity, confidence and whether your story matches your resume. Do not recite your marks for every year or spend long on family details.`,
          d: 'easy',
          at: 'TCS',
          tip: `End with why TCS; it leads naturally into the next question you will probably be asked.`,
        },
        {
          q: `Why do you want to join TCS?`,
          a: `**Sample answer:**
"TCS is one of India's largest IT services companies and part of the Tata group, which is widely respected for its ethics. Three things attract me. First, **learning**: TCS trains freshers through its Initial Learning Program, and I will get to work on projects for global clients across many domains. Second, **growth**: a company of this size offers chances to move across technologies and roles as I grow. Third, **values**: TCS talks about values like **integrity, excellence and learning and sharing**, and these match how I worked on [your project], where [one example, e.g. I documented our code so juniors could use it]. I want to build my career somewhere I can learn steadily and contribute for the long term."

**Tips:** read the TCS website and recent news before the interview, and mention one thing you genuinely found interesting. Avoid answers based only on salary or "job security".`,
          d: 'easy',
          at: 'TCS',
        },
        {
          q: `Are you willing to relocate to any TCS location in India?`,
          a: `**Sample answer:**
"Yes, I am willing to relocate. I understand that TCS assigns locations based on project needs, and at the start of my career I am more focused on learning and getting good project experience than on a specific city. I have [lived in a hostel / moved for college], so I am used to adjusting to new places. If I get a choice later, I would mention my preference, but it will not be a condition for me."

**Why this works:** it is a clear yes, shows you understand how service companies allocate projects, and gives evidence (hostel, college move) that you can adapt.

**What they check:** flexibility. Panels often hear "yes" and then a list of conditions; a hesitant answer can count against you.

If you have a **genuine constraint** (for example a family medical situation), be honest and polite about it rather than agreeing now and refusing later.`,
          d: 'easy',
          at: 'TCS',
          tip: `Only say yes if you mean it; refusing a location after joining creates far bigger problems than an honest answer now.`,
        },
        {
          q: `Are you comfortable working in night shifts or rotational shifts?`,
          a: `**Sample answer:**
"Yes. TCS works with clients in many time zones, so I understand that some projects need support or overlap hours outside the normal day. I am comfortable with shifts when the project needs it. I would keep a disciplined routine for sleep and health so my work quality does not drop. During [your project / exams / an event], I worked late hours for [number] weeks and still delivered on time."

**What they check:** whether you understand how IT services work (clients in the US, UK and Europe) and whether you will be reliable.

**Avoid:**
- Saying "only day shift" without a strong reason.
- Over-promising ("I can work 24/7"); it sounds unrealistic.

Not every project has shifts; many run on regular hours. The question is about flexibility, not a promise that you will always work nights.`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `Are you okay with signing a service agreement (bond)?`,
          a: `Some TCS offer letters in past years have included a **service agreement** or similar terms. Whether one applies, its duration and its conditions are stated in your own offer documents, so read them carefully and ask HR if anything is unclear. Do not rely on what seniors or websites say about amounts or periods.

**Sample answer:**
"Yes. I see it as a commitment from both sides: TCS invests in training me through the ILP and in my first projects, and I plan to stay, learn and contribute for the long term anyway. I would like to understand the terms clearly, but I am comfortable with it."

**What they check:** your intention to stay. Companies spend significant effort training freshers, and frequent early exits are costly.

**Avoid** negotiating or arguing about the agreement in the interview. If you have serious concerns (for example, planning higher studies within a year), think it through before accepting the offer, not after.`,
          d: 'medium',
          at: 'TCS',
          tip: `Ask "could you explain the terms?" if unsure; that is a reasonable question, while refusing outright usually is not.`,
        },
        {
          q: `Where do you see yourself in five years?`,
          a: `**Sample answer:**
"In five years, I see myself as a **strong developer with deep knowledge of [an area, e.g. Java backend / cloud / data engineering]**, someone my team relies on for difficult parts of the project. I want to have worked with real clients, understood at least one business domain such as banking or retail, and earned a relevant certification. I would also like to start **guiding new joiners**, the way trainers and seniors will guide me in my first year. I see TCS as a place where I can grow into that, because it offers many projects and technologies to move across."

**What they check:** ambition that is realistic and **aligned with staying in the company**.

**Avoid:**
- "I will be doing an MBA / preparing for government exams."
- "I want your job" type answers, or naming a big title (project manager in 5 years) without explaining how.
- Saying "I have not thought about it."`,
          d: 'medium',
          at: 'TCS',
        },
        {
          q: `If you get a better offer from another company after joining TCS, will you leave?`,
          a: `This is a **loyalty and maturity** question; there is no need to pretend money does not matter.

**Sample answer:**
"For me, the first years of a career are about **learning and building a foundation**, not jumping for a small difference in salary. TCS offers structured training, large projects and the chance to move across technologies, which is what I need right now. I would rather grow inside TCS by performing well and taking on new skills. I believe that if I keep improving, the growth will come in the same company. So no, I do not plan to leave for a slightly better offer."

**What they check:** whether you will stay after TCS invests in your training, and whether you think beyond the next salary.

**Avoid:**
- "It depends on the package." (honest, but it signals you will leave)
- Over-the-top promises ("I will never leave TCS in my life").`,
          d: 'hard',
          at: 'TCS',
        },
        {
          q: `Tell me about a time you had a disagreement or conflict in a team. How did you handle it? (managerial round)`,
          a: `Use **STAR**: Situation, Task, Action, Result.

**Sample answer:**
"**Situation:** in our final-year project, [teammate] and I disagreed on the database: he wanted to store everything in one table to finish quickly, while I felt that would cause duplicate data.
**Task:** we had to decide quickly because the review was two weeks away.
**Action:** instead of arguing, I made a small sample of both designs and showed how updating a student's details would work in each. I also agreed with his concern about time and offered to write the extra queries myself.
**Result:** the team chose the normalized design, we finished on time, and in the review the guide specifically appreciated the clean schema. My teammate and I still work together on [activity]."

**What they check:** respect for others, focus on the goal, and communication rather than ego. **Avoid** stories where you "won" and the other person was simply wrong, or where nothing was resolved.`,
          d: 'hard',
          at: 'TCS',
          tip: `Keep the conflict about work, show you listened, and end with a measurable result.`,
        },
      ],
    },
  ],
};

export default book;
