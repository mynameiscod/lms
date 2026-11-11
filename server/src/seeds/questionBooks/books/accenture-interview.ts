import { SeedBook, ALL_YEARS } from '../types';

/**
 * Accenture fresher interview preparation. Hiring details change every year, so chapter 1
 * describes typical patterns only and always points students to the official careers page.
 */
const book: SeedBook = {
  slug: 'accenture-interview',
  title: 'Accenture Interview Questions',
  kind: 'company',
  subject: 'Accenture',
  description: 'Prepare for Accenture fresher hiring: the typical assessment flow, cognitive and pseudocode practice, technical and coding questions with Python solutions, and HR answers.',
  color: '#be123c',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 103,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Accenture's fresher hiring process typically work?`,
          a: `Accenture hires freshers through campus and off-campus drives, usually for entry-level roles such as Associate Software Engineer. The format changes from year to year, so always confirm the current process on the official Accenture careers page and in your drive email.

In recent drives, the flow has typically looked like this:

1. **Application** on the careers portal.
2. **Cognitive and technical assessment**: aptitude-style reasoning, English and basic technical knowledge.
3. **Coding assessment**: a small number of programming problems.
4. **Communication assessment**: in many drives, a spoken English test taken online.
5. **Interview**: often one round that mixes technical and HR questions.

Some rounds may be elimination rounds, meaning you must clear one to reach the next. Results and offers are usually shared by email, followed by onboarding steps on Accenture's portals.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Use the same email and phone number everywhere; all updates arrive there.`,
        },
        {
          q: `What does the cognitive and technical assessment usually cover?`,
          a: `In recent drives this assessment has typically been split into a cognitive part and a technical part. The exact sections vary, but commonly reported areas are:

**Cognitive**
- **English ability**: grammar, error spotting, sentence completion, reading comprehension, vocabulary.
- **Critical reasoning and problem solving**: syllogisms, seating arrangements, data interpretation, logical deductions.
- **Abstract reasoning**: number and letter series, pattern and figure series.

**Technical**
- **Common applications**: basics of office tools (for example spreadsheet functions and shortcuts).
- **Pseudocode**: reading short code and predicting the output.
- **Networking, security and cloud fundamentals**: basic concepts and terms.

Questions are usually multiple choice and sections may be timed separately. Pseudocode questions reward careful tracing, so practise writing out variable values line by line.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Pseudocode is pure tracing practice; do 10 questions a day for a week before the test.`,
        },
        {
          q: `What is the communication assessment, and how should I prepare for it?`,
          a: `In many recent drives Accenture has included an online **communication assessment** that checks spoken English. It has commonly been reported to include tasks such as repeating sentences you hear, reading text aloud, answering short questions and speaking on a topic, but the format can change, so follow the instructions shown on screen.

What it is likely to measure: pronunciation clarity, fluency, grammar, vocabulary and listening comprehension. It does not reward accent; clear and steady speech matters most.

How to prepare:
- Read an English news article aloud for 10 minutes daily.
- Record yourself answering simple questions ("Describe your college") for 45 seconds, then listen for fillers like "umm" and long pauses.
- Practise repeating sentences after hearing them once.

On test day, use a quiet room, a working headset with a microphone, and test your audio before starting. Speak at a natural pace and finish sentences instead of restarting them.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Record and replay yourself; you will spot fillers and unclear words immediately.`,
        },
        {
          q: `How does the Accenture coding assessment usually work?`,
          a: `In recent drives the coding assessment has typically had a small number of problems, solved in one of several allowed languages (commonly C, C++, Java, Python and others). Problems have often been of easy to medium level: strings, arrays, number logic and simple conditions.

A common format is **function completion**: you are given a function signature and must fill in the body and return the result rather than reading input yourself. Read the template carefully before you start.

How to approach it:
1. Read the problem and the function signature; note what must be returned, not printed.
2. Work one example by hand.
3. Write a simple correct solution, then check edge cases: empty array, single element, zeros, negatives.
4. Run the sample tests and check that you return the right type.

Many candidates lose marks by printing inside the function instead of returning, or by changing the given function name.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Never rename the given function or its parameters; the hidden tests call it by that name.`,
        },
        {
          q: `What does the Accenture interview round usually check?`,
          a: `The interview is often a single conversation that covers both technical and HR topics, though some drives use separate rounds.

**Technical side**
- Your resume and project: problem, your role, tech stack, challenges.
- One programming language: basics, OOP, strings and lists, exceptions.
- DBMS and SQL basics, simple queries and joins.
- Basic cloud, networking and security concepts, since these appear in the assessment too.

**HR side**
- Introduction, strengths and weaknesses.
- Why Accenture, relocation and shift flexibility.
- Teamwork, handling pressure and learning new things.

Interviewers look for clarity, honesty and willingness to learn. If you do not know something, say so and explain how you would find out. Speak in short, structured answers; long, wandering answers hide your good points.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Every word on your resume is a possible question; remove anything you cannot explain.`,
        },
        {
          q: `What eligibility rules and documents should I keep ready for an Accenture drive?`,
          a: `Eligibility is stated in each drive notification. It usually covers your degree and branch, year of passing, minimum academic percentage or CGPA, and rules on backlogs and education gaps. These rules change, so read the current notification instead of relying on older posts.

Documents commonly needed during the process or onboarding:

- Government photo ID (Aadhaar, PAN or passport)
- 10th and 12th (or diploma) mark sheets and certificates
- Semester-wise degree mark sheets and the provisional or final degree certificate when available
- Recent passport-size photographs
- Updated resume
- Supporting documents for any education gap or name change

Make sure your name and date of birth match across documents, and keep clear scans ready, because onboarding is largely done online.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Keep a single folder of clearly named scans; online onboarding moves fast once it starts.`,
        },
        {
          q: `What roles do freshers usually join Accenture in, and what happens after joining?`,
          a: `Engineering freshers have commonly joined as **Associate Software Engineer (ASE)**, and in some drives stronger performers have been considered for a higher-level role (names such as Advanced ASE have been used). Role names, eligibility and packages differ by drive, so rely only on your offer letter.

After joining, freshers typically go through:
- **Onboarding**: documentation, policies and tools.
- **Training**: learning a technology area chosen according to business needs, with assessments along the way.
- **Project allocation**: assignment to a project team, which may be in development, testing, support or other areas.

What helps you during training:
- Treat assessments seriously; they can influence your allocation.
- Keep learning beyond the syllabus through official learning platforms the company provides.
- Build good relationships with your trainers and batchmates.

Check your offer letter for location, joining date and any conditions before accepting.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Training assessments matter; treat them like the selection test, not like a formality.`,
        },
        {
          q: `What does a good two-week preparation plan for an Accenture drive look like?`,
          a: `**Week 1: assessment skills**
- Days 1–2: English grammar and error spotting, one timed set daily; read aloud for 10 minutes.
- Days 3–4: Critical reasoning (syllogisms, seating arrangement) and abstract reasoning (series).
- Day 5: Pseudocode tracing: 15 output-prediction questions.
- Days 6–7: Technical basics: office tools, networking terms, security and cloud fundamentals.

**Week 2: coding, communication and interview**
- Days 8–10: Two coding problems a day in function format (strings, arrays, number logic).
- Day 11: Communication practice: record yourself repeating sentences and speaking on topics.
- Day 12: One full mock assessment under time limits.
- Day 13: Project explanation and core subjects (OOP, DBMS, OS, networks).
- Day 14: HR answers aloud, documents ready, test your headset and internet.

Keep an error notebook and revise it the evening before each round.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Practise speaking every day of the plan, not just the day before the communication test.`,
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `Find the next number in the series: 2, 6, 12, 20, 30, ?

A) 40  B) 42  C) 44  D) 36`,
          a: `**Answer: B) 42**

Look at the differences: 6 − 2 = 4, 12 − 6 = 6, 20 − 12 = 8, 30 − 20 = 10. The differences increase by 2, so the next difference is 12, and 30 + 12 = **42**.

Another view: each term is n × (n + 1):
- 1 × 2 = 2
- 2 × 3 = 6
- 3 × 4 = 12
- 4 × 5 = 20
- 5 × 6 = 30
- 6 × 7 = **42**

Both methods give 42.`,
          d: 'easy',
          at: 'Accenture',
          tip: `If first differences look irregular, check second differences or n(n+1) patterns.`,
        },
        {
          q: `Find the next letter in the series: A, C, F, J, O, ?

A) T  B) U  C) V  D) S`,
          a: `**Answer: B) U**

Convert letters to alphabet positions: A = 1, C = 3, F = 6, J = 10, O = 15.

Differences: +2, +3, +4, +5. The next difference is +6, so 15 + 6 = **21**, which is **U**.

Check: A(1) +2 → C(3) +3 → F(6) +4 → J(10) +5 → O(15) +6 → U(21).

If a series ever goes past Z (26), wrap around by subtracting 26: for example position 28 is B.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Memorise E=5, J=10, O=15, T=20, Y=25 to convert letters quickly.`,
        },
        {
          q: `Identify the part of the sentence that has an error: "Each of the students (A) / have submitted (B) / their assignment (C) / on time (D)."

A) Each of the students  B) have submitted  C) their assignment  D) on time`,
          a: `**Answer: B) have submitted**

The subject of the sentence is **"Each"**, not "students". "Each" is singular, so the verb must be singular: **"has submitted"**.

Corrected sentence: "Each of the students **has** submitted their assignment on time."

Note on part C: using "their" for a singular person of unspecified gender is widely accepted in modern English, and the test treats the verb as the clear error. If you see options where both a verb and a pronoun look wrong, fix the subject-verb agreement first; it is the more common tested rule.`,
          d: 'easy',
          at: 'Accenture',
          tip: `"Each", "every", "either", "neither" take singular verbs even when followed by "of the + plural".`,
        },
        {
          q: `What is the output of this pseudocode?

\`\`\`
Integer a = 5, b = 3
for i from 1 to 3
    a = a + b
    b = a - b
end for
print a
\`\`\`

A) 21  B) 34  C) 13  D) 18`,
          a: `**Answer: A) 21**

Trace the values after each iteration. Note that \`b = a - b\` uses the **new** value of \`a\`.

| i | a = a + b | b = a − b |
|---|---|---|
| start | 5 | 3 |
| 1 | 5 + 3 = 8 | 8 − 3 = 5 |
| 2 | 8 + 5 = 13 | 13 − 5 = 8 |
| 3 | 13 + 8 = 21 | 21 − 8 = 13 |

After the loop, \`a = 21\`, so the output is **21**.

Notice that \`b\` always becomes the old \`a\`, so the pair moves like Fibonacci numbers: (5, 3) → (8, 5) → (13, 8) → (21, 13).`,
          d: 'medium',
          at: 'Accenture',
          tip: `Draw a table with one column per variable; never trace pseudocode in your head.`,
        },
        {
          q: `What is the output of this pseudocode?

\`\`\`
Integer x = 0
for i from 1 to 10
    if (i mod 3 == 0)
        continue
    end if
    x = x + i
end for
print x
\`\`\`

A) 37  B) 55  C) 18  D) 40`,
          a: `**Answer: A) 37**

\`continue\` skips the rest of the loop body for that iteration, so multiples of 3 are **not** added.

- Sum of 1 to 10 = 10 × 11 / 2 = **55**.
- Multiples of 3 in the range: 3, 6, 9, whose sum is **18**.
- x = 55 − 18 = **37**.

Direct check: 1 + 2 + 4 + 5 + 7 + 8 + 10 = 37.

Option C (18) is the sum of the skipped numbers, and option B (55) ignores the \`continue\`; both are typical traps.`,
          d: 'medium',
          at: 'Accenture',
          tip: `"continue" skips one iteration; "break" ends the loop. Testers love mixing them up.`,
        },
        {
          q: `Statements: All servers are computers. Some computers are laptops.

Conclusions: I. Some servers are laptops. II. Some laptops are computers.

A) Only I follows  B) Only II follows  C) Both follow  D) Neither follows`,
          a: `**Answer: B) Only II follows**

**Conclusion II**: "Some computers are laptops" can be reversed to "Some laptops are computers". A "some" statement is always reversible, so II definitely follows.

**Conclusion I**: All servers sit inside the computers circle, and some computers are laptops, but the laptop part of computers may lie completely outside the servers. Draw it:

- A big circle "computers" containing a smaller circle "servers".
- A "laptops" circle overlapping "computers" only in the area outside "servers".

This diagram satisfies both statements, yet no server is a laptop. Since I is not true in every possible diagram, it does **not** follow.`,
          d: 'medium',
          at: 'Accenture',
          tip: `A conclusion follows only if it is true in every valid Venn diagram, not just one.`,
        },
        {
          q: `Five friends P, Q, R, S and T sit in a row facing north. R is in the middle. P is at the extreme left. Q is to the immediate right of R. T is not next to P. Who sits second from the left?

A) T  B) Q  C) S  D) R`,
          a: `**Answer: C) S**

Number the seats 1 to 5 from left to right (facing north, your left is the row's left).

1. P is at the extreme left: **P = 1**.
2. R is in the middle: **R = 3**.
3. Q is immediately right of R: **Q = 4**.
4. Seats 2 and 5 remain for S and T.
5. T is not next to P, so T cannot be in seat 2: **T = 5**, which leaves **S = 2**.

Final order: P, S, R, Q, T. Second from the left is **S**.

Check every clue: R middle (yes), P extreme left (yes), Q right of R (yes), T next to Q only, not P (yes).`,
          d: 'medium',
          at: 'Accenture',
          tip: `Place the fixed clues first (ends, middle), then use the "not" clues to settle the rest.`,
        },
        {
          q: `What is the output of this pseudocode?

\`\`\`
Integer fun(Integer n)
    if (n <= 1)
        return 1
    end if
    return n * fun(n - 2)
end function

print fun(7)
\`\`\`

A) 105  B) 5040  C) 48  D) 35`,
          a: `**Answer: A) 105**

Each call multiplies \`n\` by the result for \`n − 2\` until \`n\` is 1 or less.

- fun(7) = 7 × fun(5)
- fun(5) = 5 × fun(3)
- fun(3) = 3 × fun(1)
- fun(1) = 1 (base case)

Now unwind: fun(3) = 3 × 1 = 3, fun(5) = 5 × 3 = 15, fun(7) = 7 × 15 = **105**.

This is the double factorial 7!! = 7 × 5 × 3 × 1. Option B (5040) is 7!, which you would get if the call were \`fun(n - 1)\`, so read the step size carefully.`,
          d: 'hard',
          at: 'Accenture',
          tip: `For recursion, write the chain of calls down, then multiply back up from the base case.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `What is the difference between a class and an object? Explain with an example.`,
          a: `- A **class** is a blueprint or template. It defines what data (attributes) and behaviour (methods) its objects will have, but it does not hold actual data for any one thing.
- An **object** is an instance of a class: a real thing created from the blueprint, with its own values stored in memory.

Example: \`Employee\` is a class that says every employee has a name and an ID and can \`introduce()\` themselves. Two employees, Asha and Ravi, are two separate objects of that class.

\`\`\`python
class Employee:
    def __init__(self, name, emp_id):
        self.name = name
        self.emp_id = emp_id

    def introduce(self):
        return f"I am {self.name}, ID {self.emp_id}"

asha = Employee("Asha", 101)
ravi = Employee("Ravi", 102)
print(asha.introduce())   # I am Asha, ID 101
\`\`\`

One class can create many objects; changing \`asha.name\` does not affect \`ravi\`.`,
          d: 'easy',
          at: 'Accenture',
          tip: `The "house blueprint vs houses built from it" analogy is simple and interviewers like it.`,
        },
        {
          q: `What are IaaS, PaaS and SaaS? Give an example of each.`,
          a: `These are the three main **cloud service models**. They differ in how much the provider manages for you.

| Model | Provider manages | You manage | Examples |
|---|---|---|---|
| **IaaS** (Infrastructure as a Service) | Physical servers, storage, networking, virtualisation | OS, runtime, apps, data | AWS EC2, Azure Virtual Machines, Google Compute Engine |
| **PaaS** (Platform as a Service) | Everything in IaaS plus OS and runtime | Your application code and data | AWS Elastic Beanstalk, Azure App Service, Google App Engine |
| **SaaS** (Software as a Service) | The entire application | Only your usage and data | Gmail, Microsoft 365, Salesforce |

Easy way to remember: IaaS is renting an empty flat, PaaS is a furnished flat where you only bring your clothes, and SaaS is a hotel room.

Benefits of cloud in general: pay for what you use, scale up or down quickly and avoid buying hardware upfront.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Name one real product per model; examples prove you are not reciting definitions.`,
        },
        {
          q: `In a spreadsheet such as Excel, what is the difference between COUNT, COUNTA and COUNTIF? What does VLOOKUP do?`,
          a: `Common-application questions often test basic spreadsheet functions.

- **COUNT(range)**: counts cells that contain **numbers**.
- **COUNTA(range)**: counts cells that are **not empty**, whatever they contain (numbers, text, errors).
- **COUNTIF(range, criteria)**: counts cells that meet a **condition**, for example \`=COUNTIF(B2:B50, ">=60")\` counts scores of 60 or more.

**VLOOKUP(lookup_value, table, col_index, [range_lookup])** searches for a value in the **first column** of a table and returns the value from another column in the same row.

\`=VLOOKUP(101, A2:C50, 3, FALSE)\` finds employee ID 101 in column A and returns the matching value from the 3rd column (C). \`FALSE\` means exact match; leaving it out may give an approximate match.

Newer Excel versions also offer **XLOOKUP**, which can look left as well as right and defaults to exact match.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Remember VLOOKUP only searches the first column of the range; that is a common trick question.`,
        },
        {
          q: `What is the difference between symmetric and asymmetric encryption? How does HTTPS use them?`,
          a: `- **Symmetric encryption** uses **one shared key** to encrypt and decrypt. It is fast and good for large data. Example: AES. The problem is sharing the key safely.
- **Asymmetric encryption** uses a **key pair**: a public key that anyone can have, and a private key kept secret. Data encrypted with the public key can only be decrypted with the private key. Examples: RSA, elliptic-curve cryptography. It is slower, so it is used for small data like key exchange and digital signatures.

**How HTTPS combines them (simplified)**:
1. The browser connects and the server sends its **certificate**, which contains its public key and is signed by a trusted certificate authority.
2. The browser verifies the certificate.
3. Using asymmetric cryptography (key exchange), both sides agree on a **shared session key**.
4. All further data is encrypted with that symmetric session key, because it is fast.

So asymmetric crypto solves the key-sharing problem and symmetric crypto does the heavy lifting.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Say "asymmetric to agree the key, symmetric for the data"; it is the core of the answer.`,
        },
        {
          q: `Explain the types of SQL joins with an example.`,
          a: `Take \`employees(id, name, dept_id)\` and \`departments(id, name)\`.

- **INNER JOIN**: only rows with a match in both tables. Employees without a department, and departments without employees, are left out.
- **LEFT JOIN**: all rows from the left table, with matching right rows or NULL. Shows every employee, even one without a department.
- **RIGHT JOIN**: all rows from the right table, with matching left rows or NULL. Shows every department, even an empty one.
- **FULL OUTER JOIN**: all rows from both sides, NULLs where there is no match (MySQL does not support it directly; combine LEFT and RIGHT joins with UNION).
- **CROSS JOIN**: every combination of rows (a Cartesian product).
- **SELF JOIN**: a table joined with itself, for example employees with their managers.

\`\`\`sql
SELECT e.name, d.name AS department
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
\`\`\`

To find employees with no department: add \`WHERE d.id IS NULL\` to the LEFT JOIN.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Be ready to write "employees with no department" using LEFT JOIN ... IS NULL.`,
        },
        {
          q: `What is the difference between a stack and a queue? Where is each used?`,
          a: `- **Stack**: **LIFO** (Last In, First Out). Insert with \`push\` and remove with \`pop\`, both at the same end (the top).
- **Queue**: **FIFO** (First In, First Out). Insert at the rear (\`enqueue\`) and remove from the front (\`dequeue\`).

**Stack uses**: function call stack, undo in editors, browser back button, checking balanced brackets, evaluating expressions.

**Queue uses**: print jobs, CPU task scheduling, handling requests on a server, breadth-first search, message queues between services.

\`\`\`python
from collections import deque

stack = []
stack.append(1); stack.append(2)
print(stack.pop())       # 2 (last in, first out)

queue = deque()
queue.append(1); queue.append(2)
print(queue.popleft())   # 1 (first in, first out)
\`\`\`

Use \`deque\` for queues in Python: \`list.pop(0)\` is O(n) because it shifts every element, while \`deque.popleft()\` is O(1).`,
          d: 'medium',
          at: 'Accenture',
          tip: `Give a real-life example for each: a pile of plates (stack) and a ticket line (queue).`,
        },
        {
          q: `What are ACID properties? Explain them with a bank transfer example.`,
          a: `A **transaction** is a group of database operations that must be treated as one unit. ACID describes what a reliable transaction guarantees. Example: transfer ₹1,000 from account A to account B, which is two updates: debit A and credit B.

- **Atomicity**: all or nothing. If the debit succeeds but the credit fails, the whole transaction rolls back, so money never disappears.
- **Consistency**: the database moves from one valid state to another. Rules such as "balance cannot be negative" and "total money stays the same" still hold after the transfer.
- **Isolation**: concurrent transactions do not see each other's half-finished work. If someone checks balances mid-transfer, they will not see A debited and B not yet credited. Isolation levels (read committed, repeatable read, serializable) control how strictly this is applied.
- **Durability**: once committed, the change survives a crash or power failure, because it is written to the log on disk.

\`\`\`sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 1000 WHERE id = 'A';
UPDATE accounts SET balance = balance + 1000 WHERE id = 'B';
COMMIT;
\`\`\``,
          d: 'hard',
          at: 'Accenture',
          tip: `Use the bank transfer for all four letters; one example makes the answer easy to follow.`,
        },
        {
          q: `"If you had to rebuild your project today, what would you change?" How do I answer this well?`,
          a: `This question checks self-awareness and whether you understand your own project's weaknesses. A strong answer admits a real limitation, explains why it matters and shows how you would fix it.

**Structure**:
1. **One-line recap**: "[your project] lets [users] [do something]."
2. **What worked**: one thing you would keep, briefly.
3. **What you would change (1–2 points)**, with reasons. Good examples:
   - "I stored passwords with a simple hash; today I would use a proper password-hashing library such as bcrypt."
   - "All logic was in one file; I would separate routes, services and database code so it is easier to test."
   - "We tested manually; I would add automated tests for the main flows."
   - "Search scanned the whole table; I would add an index on [column]."
4. **What you learned**: how this changes the way you build software now.

Avoid saying "nothing", and avoid criticising teammates. Pick changes you can discuss in depth, because the interviewer will follow up on them.`,
          d: 'hard',
          at: 'Accenture',
          tip: `Security, testing and code structure are safe, honest improvement areas for most student projects.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Write a function that returns the number of vowels and consonants in a string.`,
          a: `**Approach**: loop over each character. Ignore anything that is not a letter (digits, spaces, symbols). For letters, check membership in a set of vowels; otherwise count it as a consonant.

**Complexity**: O(n) time, O(1) extra space.

\`\`\`python
def count_letters(s):
    vowels = set('aeiouAEIOU')
    v = c = 0
    for ch in s:
        if ch.isalpha():
            if ch in vowels:
                v += 1
            else:
                c += 1
    return v, c

print(count_letters("Accenture 2026"))  # (4, 5)
print(count_letters(""))                # (0, 0)
\`\`\`

"Accenture" has vowels A, e, u, e (4) and consonants c, c, n, t, r (5); the digits and space are ignored. In function-completion tests, **return** the result in the format asked rather than printing it.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Using a set for vowels gives O(1) lookups and handles upper and lower case together.`,
        },
        {
          q: `Reverse the order of words in a sentence.`,
          a: `**Approach**: split the sentence into words, reverse the list and join with single spaces. \`split()\` with no argument also removes extra spaces at the ends and between words.

**Complexity**: O(n) time and space.

\`\`\`python
def reverse_words(sentence):
    words = sentence.split()
    return " ".join(reversed(words))

print(reverse_words("I love coding"))         # coding love I
print(reverse_words("  hello   world  "))     # world hello
\`\`\`

If the interviewer asks you to do it without built-ins, walk the string from the end, collect characters of each word, and add each completed word to the result:

\`\`\`python
def reverse_words_manual(s):
    result, word = [], ""
    for ch in reversed(s):
        if ch == " ":
            if word:
                result.append(word[::-1])
                word = ""
        else:
            word += ch
    if word:
        result.append(word[::-1])
    return " ".join(result)
\`\`\``,
          d: 'easy',
          at: 'Accenture',
          tip: `Clarify whether extra spaces must be kept; split() removes them.`,
        },
        {
          q: `Remove duplicates from a list while keeping the original order.`,
          a: `**Approach**: walk through the list, keep a set of values already seen and add a value to the result only the first time it appears. A set gives O(1) average lookups.

**Complexity**: O(n) time, O(n) space.

\`\`\`python
def remove_duplicates(nums):
    seen = set()
    result = []
    for x in nums:
        if x not in seen:
            seen.add(x)
            result.append(x)
    return result

print(remove_duplicates([4, 2, 4, 1, 2, 5]))  # [4, 2, 1, 5]
print(remove_duplicates([]))                  # []
\`\`\`

\`list(set(nums))\` is shorter but **does not keep order**, which is usually what the problem asks for. A one-line order-preserving alternative is \`list(dict.fromkeys(nums))\`, since dictionaries keep insertion order in Python 3.7+.

Checking \`x not in result\` on a list instead of a set also works but is O(n²) overall.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Explain why list(set(...)) is wrong here; it shows you understand order and hashing.`,
        },
        {
          q: `An array contains n − 1 distinct numbers from 1 to n with one missing. Find the missing number.`,
          a: `**Approach**: the sum of 1 to n is n × (n + 1) / 2. Subtract the actual sum of the array; the difference is the missing number. Here n is the array length plus one.

**Complexity**: O(n) time, O(1) space.

\`\`\`python
def missing_number(nums):
    n = len(nums) + 1
    expected = n * (n + 1) // 2
    return expected - sum(nums)

print(missing_number([1, 2, 4, 5, 6]))  # 3
print(missing_number([2]))              # 1
\`\`\`

Check the first example: n = 6, expected = 21, actual sum = 18, missing = 3.

**XOR alternative** (avoids large sums in languages with fixed-size integers): XOR all numbers from 1 to n and all array elements; pairs cancel out and only the missing number remains.

\`\`\`python
def missing_number_xor(nums):
    x = 0
    for i in range(1, len(nums) + 2):
        x ^= i
    for v in nums:
        x ^= v
    return x
\`\`\``,
          d: 'medium',
          at: 'Accenture',
          tip: `Mention integer overflow in C/Java as the reason the XOR version exists.`,
        },
        {
          q: `Move all zeros in an array to the end while keeping the order of the non-zero elements.`,
          a: `**Approach (two pointers)**: \`pos\` marks where the next non-zero element should go. Scan the array; whenever you see a non-zero value, swap it into \`pos\` and move \`pos\` forward. Non-zero values keep their relative order, and zeros collect at the end.

**Complexity**: O(n) time, O(1) extra space (in place).

\`\`\`python
def move_zeros(nums):
    pos = 0
    for i in range(len(nums)):
        if nums[i] != 0:
            nums[pos], nums[i] = nums[i], nums[pos]
            pos += 1
    return nums

print(move_zeros([0, 1, 0, 3, 12]))  # [1, 3, 12, 0, 0]
print(move_zeros([0, 0, 1]))         # [1, 0, 0]
\`\`\`

Trace for [0, 1, 0, 3, 12]: i=1 swaps 1 to index 0 → [1, 0, 0, 3, 12]; i=3 swaps 3 to index 1 → [1, 3, 0, 0, 12]; i=4 swaps 12 to index 2 → [1, 3, 12, 0, 0].

A simpler version builds a new list of non-zeros and appends the right number of zeros, but uses O(n) extra space.`,
          d: 'medium',
          at: 'Accenture',
          tip: `If asked "in place", the swap version is expected; mention the extra-space version as a fallback.`,
        },
        {
          q: `Check whether a string of brackets ( ) [ ] { } is balanced.`,
          a: `**Approach (stack)**: push every opening bracket. For every closing bracket, the stack must be non-empty and its top must be the matching opening bracket; pop it. At the end the stack must be empty, otherwise some brackets were never closed.

**Complexity**: O(n) time, O(n) space in the worst case.

\`\`\`python
def is_balanced(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

print(is_balanced("{[()]}"))   # True
print(is_balanced("([)]"))     # False
print(is_balanced("(("))       # False
print(is_balanced(""))         # True
\`\`\`

The three ways to fail are: a closing bracket with an empty stack, a closing bracket that does not match the top, and leftover opening brackets at the end. Characters other than brackets are ignored, so the function also works on expressions like \`"a*(b+c)"\`.`,
          d: 'hard',
          at: 'Accenture',
          tip: `Name the three failure cases out loud; it shows you thought about edge cases.`,
        },
        {
          q: `Find the longest palindromic substring in a string.`,
          a: `**Approach (expand around centre)**: every palindrome has a centre: a single character (odd length) or a gap between two characters (even length). For each of these 2n − 1 centres, expand outwards while the characters on both sides match, and remember the longest window found.

**Complexity**: O(n²) time, O(1) extra space. Checking every substring separately would be O(n³).

\`\`\`python
def longest_palindrome(s):
    if not s:
        return ""
    start, end = 0, 0
    for center in range(len(s)):
        for lo, hi in ((center, center), (center, center + 1)):
            while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
                lo -= 1
                hi += 1
            if hi - lo - 1 > end - start:
                start, end = lo + 1, hi
    return s[start:end]

print(longest_palindrome("forgeeksskeegfor"))  # geeksskeeg
print(longest_palindrome("babad"))             # bab
\`\`\`

When the loop stops, \`lo\` and \`hi\` are one step past the palindrome, so it is \`s[lo + 1 : hi]\` with length \`hi − lo − 1\`. For "babad", "aba" is equally correct; the code returns the first longest one found.`,
          d: 'hard',
          at: 'Accenture',
          tip: `Do not forget even-length centres; "abba" has no single middle character.`,
        },
        {
          q: `Given coin denominations and an amount, find the minimum number of coins needed to make the amount (return -1 if impossible).`,
          a: `**Approach (dynamic programming)**: let \`dp[a]\` be the fewest coins that make amount \`a\`. \`dp[0] = 0\`. For each amount from 1 upward, try every coin \`c ≤ a\`: using it costs \`dp[a − c] + 1\`. Keep the minimum. Start every other entry at an "infinity" value larger than any possible answer.

A greedy "take the biggest coin first" approach fails for some coin sets: with coins [1, 3, 4] and amount 6, greedy picks 4 + 1 + 1 (3 coins), but 3 + 3 (2 coins) is better.

**Complexity**: O(amount × number of coins) time, O(amount) space.

\`\`\`python
def min_coins(coins, amount):
    INF = amount + 1
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1

print(min_coins([1, 2, 5], 11))  # 3  (5 + 5 + 1)
print(min_coins([1, 3, 4], 6))   # 2  (3 + 3)
print(min_coins([2], 3))         # -1
\`\`\``,
          d: 'hard',
          at: 'Accenture',
          tip: `Show the greedy counter-example first; it proves why DP is needed.`,
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Introduce yourself.`,
          a: `Aim for about one minute and follow present, past, future.

**Model answer**:
"Hello, I am [your name], a final-year [your degree and branch] student at [your college]. I enjoy solving problems with technology, and I am most comfortable in [your language].

In my final-year project, [your project], we built [what it does] for [users]. I handled [your part], which taught me [skill, such as designing APIs or testing carefully]. I have also completed [certification or internship], where I [one result].

Outside the classroom, I [one genuine activity, such as leading the coding club], which improved my communication and teamwork.

I am excited about Accenture because I want to work with global clients on modern technology like cloud, and to keep learning as I grow."

Keep your tone natural; do not recite it like a memorised paragraph. Practise until you can say it in your own words each time.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Mention one specific result from your project; numbers or outcomes stick in memory.`,
        },
        {
          q: `Are you open to relocation and to working in different shifts?`,
          a: `Accenture works with clients around the world from many offices, so project needs can decide your location and working hours.

**Model answer**:
"Yes. I understand that projects are assigned based on business needs, and clients may be in different time zones. As a fresher, my focus is learning and contributing, and I am flexible about the city and shift. I lived away from home during college, so I can adjust to a new place, and I will plan my routine to stay healthy and productive in any shift."

If you have a genuine constraint, mention it honestly and briefly, then show flexibility: "Due to [reason], I would prefer [city], but I am open to other locations if the project requires it."

Do not agree to something you know you will refuse at joining; it creates problems for you and the company later.`,
          d: 'easy',
          at: 'Accenture',
          tip: `Link flexibility to client time zones; it shows you understand how services companies work.`,
        },
        {
          q: `Why do you want to join Accenture?`,
          a: `Connect what Accenture is publicly known for with your own goals, and give one personal reason.

**Model answer**:
"There are three reasons.

First, Accenture works with clients across many industries and countries, combining consulting with technology delivery. I want to understand not only how software is built but why a business needs it, and Accenture's projects give that exposure.

Second, Accenture is known for working with modern technologies such as cloud, data and AI, and for investing in employees' learning. I want to build strong skills in [area you are interested in] from the start of my career.

Third, I value Accenture's culture of inclusion and its core values, especially respect for the individual and integrity. In [your project or activity], I worked with people from different backgrounds and saw how much better the outcome was when everyone was heard.

I see myself growing here into someone clients and teammates rely on."

Read the latest Accenture news on the official website before your interview so you can mention something recent.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Add one specific, recent detail from Accenture's own website; it shows real interest.`,
        },
        {
          q: `Accenture's core values include Client Value Creation, One Global Network, Respect for the Individual, Best People, Integrity and Stewardship. Which one means the most to you?`,
          a: `Accenture publicly lists core values such as these; check the official website for the current wording before your interview. Pick the value that matches a true story from your life.

**Model answer** (Respect for the Individual):
"Respect for the Individual means the most to me. In [your project], one teammate was quiet in meetings, and we were moving ahead without her ideas. I started asking each person for input at the end of our calls and gave her the database design, which she was good at. Her design caught a problem we had all missed, and she became one of the most active members of the team.

I learnt that good work comes from making everyone comfortable to speak. In a global company like Accenture, where teams span different cultures and locations, I think this value is essential."

Keep the story short, show what you did and end with what you learned. A genuine example matters more than which value you choose.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Name the value, tell one short true story, then link it back to working at Accenture.`,
        },
        {
          q: `How would you work in a team spread across countries and time zones?`,
          a: `Interviewers ask this because many Accenture projects involve distributed teams.

**Model answer**:
"I would focus on four things.

**Clear written communication**: since we may not overlap much in working hours, I would write updates that someone can understand without a call: what I did, what is blocked and what I need.

**Respect for time zones**: I would schedule meetings in the overlap window, avoid expecting instant replies at night for someone else, and be flexible when the project needs me to adjust.

**Using shared tools well**: keeping tasks and documents updated in the project's tracking and collaboration tools so everyone sees the same picture.

**Cultural awareness**: being polite, patient and open, and asking when I am unsure instead of assuming.

During [your project or internship], our team worked remotely, and a short written summary at the end of each day kept everyone aligned even when we could not meet."`,
          d: 'medium',
          at: 'Accenture',
          tip: `"Write updates that need no follow-up call" is a strong, practical point to include.`,
        },
        {
          q: `Why should we hire you?`,
          a: `Connect your strengths to what an entry-level engineer at Accenture needs: learning speed, teamwork, communication and reliability. Back each claim with evidence.

**Model answer**:
"I think I fit the role for three reasons.

First, I have solid fundamentals. I am comfortable in [your language], SQL and core CS subjects, and I have applied them in [your project], where I built [your part].

Second, I learn quickly. When [your example], I learnt [new tool or technology] in about [time] and used it to finish [task] on time.

Third, I work well with people. I [led / coordinated / contributed to] [activity or team], which taught me to communicate clearly and meet deadlines.

I may not know every technology Accenture uses yet, but I am ready to learn whatever the project needs and give my best from day one."

Avoid generic claims like "I am hardworking" without proof, and never criticise other candidates.`,
          d: 'medium',
          at: 'Accenture',
          tip: `Three strengths, each with proof, is a structure that works for almost any company.`,
        },
        {
          q: `Tell me about a time you missed a deadline or were about to. What did you do?`,
          a: `Use **STAR** (Situation, Task, Action, Result). Be honest; the interviewer wants to see ownership and early communication, not a perfect record.

**Model answer**:
"**Situation**: In [your project], I was responsible for the login and payment module, due before our mid-semester review.

**Task**: Two days before the deadline, I realised the payment integration was taking much longer than planned because the test API kept failing.

**Action**: I told my team and guide immediately instead of hoping to catch up. I explained what was done, what was blocked and a realistic new estimate. We agreed I would demo login fully and show payments with a mock response, while I kept working on the real integration. I also asked a senior who had used the same API, and he pointed out a configuration mistake.

**Result**: The review went well, and the real integration was finished three days later. Since then, I break work into smaller tasks and flag risks as soon as I see them."`,
          d: 'hard',
          at: 'Accenture',
          tip: `The key word is "early"; raising a risk early is what managers value most.`,
        },
        {
          q: `Your manager gives you feedback that you disagree with. How do you handle it?`,
          a: `This checks maturity, openness to feedback and respectful communication.

**Model answer**:
"First, I would listen fully without interrupting and make sure I understand the feedback, maybe by asking for a specific example. Often the feedback is valid even if it feels uncomfortable at first.

If I still disagreed after thinking about it, I would ask for a short conversation, explain my view with facts, and stay open to being wrong. For example: 'I understood that the report was too long. I included the test details because the client asked for them last time. Should I move them to an appendix?'

Once a decision is made, I would follow it fully, even if it is not what I suggested.

In [your example, such as an internship or project review], my guide said my code was hard to read. I felt it was fine, but when I asked a classmate to review it, I saw the point. I started using clearer names and smaller functions, and my later reviews improved."`,
          d: 'hard',
          at: 'Accenture',
          tip: `Show that you can disagree respectfully and still commit to the final decision.`,
        },
      ],
    },
  ],
};

export default book;
