import { SeedBook, ALL_YEARS } from '../types';

/**
 * Tech Mahindra fresher interview preparation. Hiring patterns change every year, so the
 * process chapter speaks in "typically" terms and points to the official careers page.
 */
const book: SeedBook = {
  slug: 'tech-mahindra-interview',
  title: 'Tech Mahindra Interview Questions',
  kind: 'company',
  subject: 'Tech Mahindra',
  description: 'Prepare for Tech Mahindra fresher hiring: the usual test and interview flow, essay tips, test-style aptitude with worked answers, technical and Python coding questions, and HR answers.',
  color: '#c2410c',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 107,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `What does the Tech Mahindra fresher hiring process typically look like?`,
          a: `Tech Mahindra hires freshers through **campus drives**, **off-campus drives** and hiring partners. The rounds are revised often, but in recent drives the flow has typically been:

1. **Registration** through your placement cell or the official careers portal.
2. **Online assessment**: aptitude (quantitative, logical, verbal), often a technical section, and in many drives an **essay writing** section and sometimes a coding section.
3. **Psychometric or personality assessment** in some drives, checking work style rather than knowledge.
4. **Technical interview**: CS fundamentals, a programming language, DBMS, networking basics and your project.
5. **HR interview**: communication, flexibility on location and shifts, documents.
6. **Offer letter**, then onboarding and training before project allocation.

Some drives combine the technical and HR rounds. Always confirm the pattern for your drive on the **official Tech Mahindra careers page** or with your placement officer, since the test platform, sections and timing change from year to year.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Clear English is checked in almost every round here, including the written essay. Practise speaking and writing.`,
        },
        {
          q: `What sections are usually in the Tech Mahindra online test, and how should you prepare?`,
          a: `Sections differ by drive and role, but a typical Tech Mahindra fresher test has included:

- **Quantitative aptitude**: percentages, ratios, mixtures, averages, time and work, boats and streams, clocks, probability, permutations.
- **Logical reasoning**: directions, blood relations, coding-decoding, series, seating arrangements, data sufficiency.
- **Verbal ability**: reading comprehension, grammar, sentence correction, spelling, vocabulary.
- **Essay writing** (in many drives): a short essay on a general or technology topic within a time limit.
- **Technical / coding** (in some drives): MCQs on programming, DBMS, OS and networks, plus easy-to-medium coding problems.
- **Psychometric test** (in some drives): statements you agree or disagree with.

**Preparation tips:**
- Solve timed quant and reasoning sets daily; learn shortcuts for clocks and mixtures.
- Write one 200-word essay every two days and review grammar.
- Practise string, array and number problems in one language.
- In psychometric tests, answer honestly and consistently; trying to "game" them often produces contradictions.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Do not neglect the essay. Many technically strong candidates lose marks on grammar and structure.`,
        },
        {
          q: `How do you write a good essay in the Tech Mahindra written English section?`,
          a: `The essay checks grammar, structure, vocabulary and clarity, not deep subject knowledge. Topics are usually general: technology in daily life, social media, remote work, artificial intelligence, education, the environment.

**A simple 4-paragraph structure (about 200 to 250 words):**
1. **Introduction**: define the topic and state your view in 2 or 3 sentences.
2. **Body paragraph 1**: one main point with an example.
3. **Body paragraph 2**: a second point, or the other side of the argument.
4. **Conclusion**: summarise and give a balanced closing thought.

**Do:**
- Write short, correct sentences; clarity beats fancy vocabulary.
- Use linking words: *however, for example, as a result, in conclusion*.
- Stay on topic and keep within the word limit if one is given.
- Leave a minute to proofread for spelling, tense and articles (a, an, the).

**Avoid:** SMS language, very long sentences, repeating the same point, and memorised essays that do not answer the given topic.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Practise typing essays against a timer; many candidates are slow at structured typing under pressure.`,
        },
        {
          q: `What does the Tech Mahindra technical interview check in a fresher?`,
          a: `The interviewer wants to know whether your basics are strong enough to be trained for a project. Typical areas:

- **Programming language** you list (C, C++, Java or Python): syntax, loops, functions, OOP, exceptions, and writing a small program.
- **OOP**: the four pillars, overloading vs overriding, abstract classes and interfaces.
- **DBMS and SQL**: keys, normalization, ACID, joins, writing a simple query.
- **Operating systems**: process vs thread, scheduling, deadlock, paging and virtual memory.
- **Computer networks**: OSI and TCP/IP models, TCP vs UDP, IP addressing, what happens when you open a website. Networking basics are worth extra attention because Tech Mahindra has a large communications (telecom) business.
- **Your project and internship**: your exact role, the tech stack and a challenge you solved.

Answer simply and honestly. If you do not know something, say so and reason aloud; interviewers value that over confident guessing. Everything on your resume can be questioned, so only list what you can explain.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Revise networking well. It is a natural follow-up topic given Tech Mahindra's telecom background.`,
        },
        {
          q: `Which documents should you carry for a Tech Mahindra interview and joining?`,
          a: `Keep originals, photocopies and scanned PDFs ready:

- **Updated resume**: two or three printed copies identical to the one you submitted.
- **Photo ID proof**: Aadhaar, PAN, passport or voter ID.
- **Academic records**: Class 10 and 12 (or diploma) mark sheets and all semester mark sheets of your degree, plus provisional or degree certificate if issued.
- **Interview call letter or registration email**, if the drive provided one.
- **Passport-size photographs**.
- **Internship or certification proofs** for anything on your resume.
- **Gap or backlog explanation** with supporting documents, if applicable.

During onboarding you may also be asked for address proof, bank details and background verification forms. Make sure your **name, date of birth and parents' names** are spelled identically everywhere; mismatches are a common reason for verification delays.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Check document name spellings against your Aadhaar now, not on joining day.`,
        },
        {
          q: `Does Tech Mahindra have a training period or service agreement for freshers?`,
          a: `Freshers at large IT services companies, including Tech Mahindra, typically go through a **training programme** after joining. It covers a technology stream, professional skills and assessments; clearing the assessments is usually needed before project deployment.

Some drives have included a **service agreement** (bond) that asks you to stay for a minimum period or pay an amount if you leave early. Whether it applies, and its duration and amount, have **differed between drives and roles**. So:

- Read your **offer letter and joining documents** line by line before accepting.
- Ask HR about anything unclear; this is a normal, professional question.
- Do not rely on terms posted online by candidates from other years.

If the interviewer asks whether you are comfortable with a service agreement, answer honestly. If you intend to build your career there, say so and explain why.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `The offer letter is the only reliable source of bond and training terms for your batch.`,
        },
        {
          q: `How should you plan 30 days of preparation for a Tech Mahindra drive?`,
          a: `**Week 1: Quant and reasoning basics**
- Percentages, ratios, mixtures, averages, time and work, boats and streams.
- Directions, blood relations, coding-decoding, series.
- One timed set daily.

**Week 2: Speed, verbal and essay**
- Clocks, probability, permutations and combinations.
- Grammar, sentence correction, reading comprehension.
- Write three timed essays this week; ask someone to check your grammar.
- Take two full mock tests and review every mistake.

**Week 3: Technical fundamentals**
- OOP, DBMS (keys, ACID, joins, normalization), OS (threads, deadlock, paging), networks (OSI, TCP/UDP, IP, DNS).
- Two coding problems daily: strings, arrays, numbers, stacks.

**Week 4: Interview practice**
- Finalise your resume and a 2-minute project explanation.
- Practise "Tell me about yourself", "Why Tech Mahindra" and shift/relocation answers aloud.
- Do one mock interview.

Keep an error notebook and revise it in the final three days.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Record yourself answering HR questions once. You will notice filler words and pace immediately.`,
        },
        {
          q: `How should you apply to Tech Mahindra off-campus, and how do you avoid job scams?`,
          a: `**Applying:**
- Use the **official Tech Mahindra careers website** and its campus or fresher section.
- Follow the company's official LinkedIn page for drive announcements.
- Keep a professional email address and an updated resume.

**Red flags of a fake offer:**
- Requests for **money** for registration, training, equipment, verification or a "refundable deposit". Genuine recruiters do not charge candidates.
- Emails from **free email domains** instead of the company's official domain.
- An "offer" without any test or interview.
- Urgent pressure to pay or accept within hours.
- Poor grammar, incorrect logos, or a process run only on WhatsApp or Telegram.

When in doubt, verify through the official careers site or your placement cell, and report fraud on the national cybercrime portal.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `If anyone asks you to pay for a job offer, stop and verify. Real employers pay you, not the other way round.`,
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `A boat's speed in still water is 12 km/h and the stream flows at 3 km/h. How long will it take to go 45 km downstream and come back?

A) 6 hours  B) 7 hours  C) 8 hours  D) 9 hours`,
          a: `**Answer: C) 8 hours**

- Downstream speed = boat + stream = 12 + 3 = **15 km/h**
- Upstream speed = boat − stream = 12 − 3 = **9 km/h**

Time downstream = 45 / 15 = **3 hours**
Time upstream = 45 / 9 = **5 hours**

Total = 3 + 5 = **8 hours**

**Check:** 15 × 3 = 45 km and 9 × 5 = 45 km. Both legs cover 45 km. Correct.

**Common mistake:** using the average speed 12 km/h for the whole 90 km (giving 7.5 hours). Average speed over equal distances is not the simple average of the two speeds, so always calculate each leg separately.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Downstream = boat + stream; upstream = boat − stream. Compute each leg on its own.`,
        },
        {
          q: `A 40-litre mixture contains milk and water in the ratio 3 : 1. How many litres of water must be added to make the ratio 3 : 2?

A) 10 litres  B) 5 litres  C) 8 litres  D) 12 litres`,
          a: `**Answer: A) 10 litres**

Current quantities:
- Milk = 3/4 × 40 = **30 litres**
- Water = 1/4 × 40 = **10 litres**

Adding water does not change the milk. Let w litres of water be added:

30 / (10 + w) = 3 / 2
60 = 3(10 + w)
60 = 30 + 3w
w = **10 litres**

**Check:** water becomes 20 litres, milk stays 30 litres. 30 : 20 = 3 : 2. Correct.

**Shortcut:** milk is 3 parts in both ratios, so 1 part = 10 litres. Water must go from 1 part to 2 parts, so add 1 part = **10 litres**.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `In mixture problems, find the quantity that does not change and build the equation around it.`,
        },
        {
          q: `The average of five numbers is 20. When one number is removed, the average of the remaining four becomes 18. Which number was removed?

A) 26  B) 28  C) 30  D) 32`,
          a: `**Answer: B) 28**

Convert averages to totals:
- Sum of 5 numbers = 5 × 20 = **100**
- Sum of the remaining 4 numbers = 4 × 18 = **72**

Removed number = 100 − 72 = **28**

**Check:** if the four numbers total 72 and we add back 28, the total is 100, and 100 / 5 = 20. Correct.

**Quick reasoning method:** each of the 4 remaining numbers is on average 2 below the old average of 20, a total shortfall of 4 × 2 = 8. The removed number must make up that shortfall, so it is 20 + 8 = **28**.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `For average questions, convert to totals first: total = average × count.`,
        },
        {
          q: `What is the angle between the hour and minute hands of a clock at 3:40?

A) 120°  B) 125°  C) 140°  D) 130°`,
          a: `**Answer: D) 130°**

**Formula:** angle = |30H − 5.5M|, where H is the hour and M is the minutes.

- 30 × 3 = 90
- 5.5 × 40 = 220
- |90 − 220| = **130°**

**Why the formula works:**
- The minute hand moves 6° per minute: 40 × 6 = **240°** from 12.
- The hour hand moves 30° per hour plus 0.5° per minute: 3 × 30 + 40 × 0.5 = 90 + 20 = **110°** from 12.
- Difference = 240 − 110 = **130°**

Both methods give 130°. If the result is over 180°, subtract it from 360° to get the smaller angle; here 130° is already the smaller angle.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Angle = |30H − 5.5M|. If the answer exceeds 180°, take 360° minus it.`,
        },
        {
          q: `Two fair dice are thrown together. What is the probability that the sum is 8?

A) 1/6  B) 5/36  C) 7/36  D) 1/9`,
          a: `**Answer: B) 5/36**

Total outcomes when two dice are thrown = 6 × 6 = **36**.

Favourable outcomes (sum = 8), as ordered pairs:
(2, 6), (3, 5), (4, 4), (5, 3), (6, 2) = **5 outcomes**

(1 cannot appear, because 1 + 7 needs a 7.)

Probability = 5 / 36

**Check by counting pattern:** the number of ways to get sum s with two dice is s − 1 for s from 2 to 7, and 13 − s for s from 8 to 12. For s = 8: 13 − 8 = **5**. Correct.

**Common mistake:** counting (3, 5) and (5, 3) as one outcome. With two dice, each ordered pair is a separate outcome.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Ways to get sum s with two dice: s − 1 up to 7, then 13 − s. Sum 7 is the most likely (6 ways).`,
        },
        {
          q: `Ravi walks 10 m north, turns right and walks 6 m, then turns right again and walks 18 m. How far is he from his starting point?

A) 10 m  B) 8 m  C) 12 m  D) 14 m`,
          a: `**Answer: A) 10 m**

Place the start at (0, 0):
1. 10 m **north** → (0, 10)
2. Turn right (now facing **east**), walk 6 m → (6, 10)
3. Turn right again (now facing **south**), walk 18 m → (6, −8)

Distance from start = √(6² + 8²) = √(36 + 64) = √100 = **10 m**

He is 10 m away, towards the **south-east** of the starting point.

**Check:** net east displacement = 6 m; net north-south displacement = 10 − 18 = −8 m (8 m south). The 6-8-10 right triangle confirms 10 m.

Always draw the path; turning "right" from north is east, and right again is south.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Remember Pythagorean triples (3-4-5, 6-8-10, 5-12-13). They appear constantly in direction problems.`,
        },
        {
          q: `Choose the correctly spelt word.

A) Accomodate  B) Acommodate  C) Accommodate  D) Acomodate`,
          a: `**Answer: C) Accommodate**

The correct spelling has a **double c** and a **double m**: ac-com-mo-date.

- A) *Accomodate*: missing one m. This is the most common misspelling.
- B) *Acommodate*: missing one c.
- D) *Acomodate*: missing one c and one m.

**Memory trick:** the word is large enough to *accommodate* two c's and two m's.

Other words often tested in spelling questions: *occurrence* (double c, double r), *embarrass* (double r, double s), *necessary* (one c, double s), *separate* (a in the middle), *definitely* (no a), *committee* (double m, double t, double e).

The same skill helps in the essay section, where spelling errors cost marks.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Keep a list of commonly misspelt words and revise it before the test; these are easy marks.`,
        },
        {
          q: `In how many different ways can the letters of the word LEADER be arranged?

A) 720  B) 180  C) 120  D) 360`,
          a: `**Answer: D) 360**

LEADER has **6 letters**: L, E, A, D, E, R. The letter **E appears twice**; every other letter appears once.

If all letters were different, the arrangements would be 6! = 720. But swapping the two E's produces the same word, so every arrangement has been counted twice. Divide by 2! for the repeated E:

Arrangements = 6! / 2! = 720 / 2 = **360**

**General rule:** for n letters where one letter repeats p times, another q times, and so on:
arrangements = n! / (p! × q! × ...)

**Check with a smaller case:** "EEA" has 3! / 2! = 3 arrangements: EEA, EAE, AEE. Listing them confirms the rule.

**Trap:** answering 720 ignores the repeated letter.`,
          d: 'hard',
          at: 'Tech Mahindra',
          tip: `Always count repeated letters first. Divide n! by the factorial of each repeat count.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `Explain the seven layers of the OSI model with one example of each.`,
          a: `The **OSI model** describes network communication in seven layers, from the physical signal up to the application. Memory aid (top to bottom): **All People Seem To Need Data Processing**.

| # | Layer | Job | Example |
|---|---|---|---|
| 7 | Application | Network services for applications | HTTP, FTP, SMTP, DNS |
| 6 | Presentation | Format, encryption, compression | TLS encryption, JPEG, character encoding |
| 5 | Session | Opens, manages and closes sessions | Session setup, checkpoints |
| 4 | Transport | End-to-end delivery, ports, reliability | TCP, UDP |
| 3 | Network | Logical addressing and routing | IP, ICMP, routers |
| 2 | Data Link | Frames, MAC addressing, error detection on a link | Ethernet, Wi-Fi (802.11), switches |
| 1 | Physical | Bits as electrical, optical or radio signals | Cables, fibre, hubs, radio |

The practical **TCP/IP model** has four layers: Application (OSI 5 to 7), Transport, Internet and Network Access (OSI 1 and 2).

When data moves down the layers, each layer adds its own header (**encapsulation**); the receiver strips them in reverse order.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Name a device per layer: hub (1), switch (2), router (3). It is a favourite follow-up.`,
        },
        {
          q: `What happens when you type a URL such as www.example.com into a browser and press Enter?`,
          a: `1. **URL parsing**: the browser identifies the protocol (https), domain and path.
2. **DNS resolution**: the domain is converted to an IP address. The browser checks its cache, then the OS cache, then asks a DNS resolver, which may query root, TLD (.com) and authoritative name servers.
3. **TCP connection**: the browser opens a connection to the server's IP on port 443 (HTTPS) with the 3-way handshake (SYN, SYN-ACK, ACK).
4. **TLS handshake**: browser and server agree on encryption, the server presents its certificate, and session keys are created.
5. **HTTP request**: the browser sends \`GET /\` with headers such as Host, cookies and User-Agent.
6. **Server processing**: a web server or load balancer passes the request to the application, which may query a database and builds a response.
7. **HTTP response**: status code (200, 301, 404...) plus HTML.
8. **Rendering**: the browser parses HTML into the DOM and CSS into the CSSOM, fetches further resources (CSS, JS, images), runs JavaScript, and paints the page.

Each step maps to OSI layers: DNS and HTTP at application, TCP at transport, IP routing at network.`,
          d: 'hard',
          at: 'Tech Mahindra',
          tip: `Go in order and mention DNS, TCP handshake, TLS, HTTP and rendering. Missing DNS is the most common gap.`,
        },
        {
          q: `What are the differences between IPv4 and IPv6?`,
          a: `| | IPv4 | IPv6 |
|---|---|---|
| Address size | 32 bits | 128 bits |
| Number of addresses | About 4.3 billion (2³²) | About 3.4 × 10³⁸ (2¹²⁸) |
| Format | Dotted decimal: \`192.168.1.10\` | Hexadecimal groups with colons: \`2001:db8::1\` |
| Header | Variable length, with options and checksum | Fixed 40-byte header, no header checksum, simpler for routers |
| Address configuration | Manual or DHCP | Stateless auto-configuration (SLAAC) or DHCPv6 |
| NAT | Widely used because addresses are scarce | Not needed in principle; enough addresses for every device |
| Broadcast | Supported | Replaced by multicast and anycast |
| Security | IPsec optional | IPsec designed in (support was originally mandatory) |

**Why IPv6 exists:** IPv4 addresses ran out as phones, laptops and IoT devices multiplied. Telecom networks, especially mobile networks, are among the biggest adopters of IPv6.

Both versions are used side by side today (**dual stack**), with transition techniques such as tunnelling.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Start with "32-bit vs 128-bit" and the reason IPv6 exists, then add 2 or 3 differences.`,
        },
        {
          q: `What are ACID properties in a database? Explain with an example.`,
          a: `**ACID** guarantees that database transactions are processed reliably. Example: transferring ₹500 from account A to account B, which is two updates: debit A, credit B.

- **Atomicity**: all or nothing. If the credit to B fails, the debit from A is rolled back. Money never disappears.
- **Consistency**: a transaction moves the database from one valid state to another, respecting all rules and constraints (for example, balance cannot go negative; total money stays the same).
- **Isolation**: concurrent transactions do not interfere. If two transfers run at the same time, the result is as if they ran one after the other. Databases offer isolation levels: read uncommitted, read committed, repeatable read, serializable.
- **Durability**: once committed, the change survives crashes and power failures, because it is written to persistent storage or a log.

\`\`\`sql
START TRANSACTION;
UPDATE accounts SET balance = balance - 500 WHERE id = 'A';
UPDATE accounts SET balance = balance + 500 WHERE id = 'B';
COMMIT;   -- or ROLLBACK if anything failed
\`\`\``,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Use the bank-transfer example for all four properties; it makes each one easy to explain.`,
        },
        {
          q: `What is the difference between a stack and a queue? Give real-world uses.`,
          a: `| | Stack | Queue |
|---|---|---|
| Order | **LIFO**: last in, first out | **FIFO**: first in, first out |
| Insert | \`push\` at the top | \`enqueue\` at the rear |
| Remove | \`pop\` from the top | \`dequeue\` from the front |
| Analogy | A pile of plates | A line at a ticket counter |

**Stack uses:** function calls (the call stack), undo/redo in editors, browser back button, checking balanced brackets, evaluating expressions.

**Queue uses:** CPU and printer scheduling, handling requests on a server, breadth-first search, message queues between services, buffering in network routers.

\`\`\`python
from collections import deque

stack = []
stack.append(1); stack.append(2)
print(stack.pop())       # 2  (last in, first out)

queue = deque()
queue.append(1); queue.append(2)
print(queue.popleft())   # 1  (first in, first out)
\`\`\`

Using a Python list as a queue with \`pop(0)\` is O(n); \`deque.popleft()\` is O(1).`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Give one software example each: undo for a stack, print jobs or request handling for a queue.`,
        },
        {
          q: `What is the difference between method overloading and method overriding?`,
          a: `| | Overloading | Overriding |
|---|---|---|
| Type of polymorphism | Compile-time (static) | Run-time (dynamic) |
| Where | Same class | Parent and child classes |
| Method signature | Same name, **different parameters** (number, type or order) | Same name and **same parameters** |
| Return type | Can differ (but parameters must differ) | Same, or a subtype (covariant return) |
| Decided by | Compiler, from the arguments | JVM, from the actual object type |
| Example | \`add(int, int)\` and \`add(double, double)\` | \`Dog.sound()\` replacing \`Animal.sound()\` |

\`\`\`java
class Calculator {
    int add(int a, int b) { return a + b; }
    double add(double a, double b) { return a + b; }   // overloading
}
class Animal { void sound() { System.out.println("Some sound"); } }
class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }       // overriding
}
// Animal a = new Dog(); a.sound();  prints "Bark"
\`\`\`

Static, private and final methods cannot be overridden. Python has no traditional overloading; default arguments or \`*args\` are used instead.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Show "Animal a = new Dog()" calling the Dog version; it demonstrates run-time polymorphism clearly.`,
        },
        {
          q: `What are paging and virtual memory?`,
          a: `**Virtual memory** lets each process behave as if it has a large, private, contiguous memory space, even when physical RAM is smaller. Parts of a process that are not in use can stay on disk and be loaded when needed.

**Paging** is the common way to implement it:
- Virtual memory is divided into fixed-size blocks called **pages**; physical RAM into blocks of the same size called **frames** (often 4 KB).
- A **page table** per process maps page numbers to frame numbers.
- A **TLB** (translation lookaside buffer) caches recent mappings to speed up translation.
- If a process accesses a page that is not in RAM, a **page fault** occurs; the OS loads the page from disk, evicting another page if RAM is full, using a replacement algorithm such as **FIFO**, **LRU** or **Optimal**.

**Benefits:** no external fragmentation, processes are isolated from each other, programs larger than RAM can run.

**Thrashing** happens when the system spends more time swapping pages than executing, usually because too many processes compete for too little RAM.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Explain page fault and one replacement algorithm (LRU). Interviewers often follow up with thrashing.`,
        },
        {
          q: `What is cloud computing? Explain IaaS, PaaS and SaaS.`,
          a: `**Cloud computing** means renting computing resources (servers, storage, databases, software) over the internet on demand, paying for what you use, instead of buying and maintaining your own hardware. Major providers include AWS, Microsoft Azure and Google Cloud.

**Service models**, from most control to least:
- **IaaS (Infrastructure as a Service)**: you rent virtual machines, storage and networks, and manage the OS and software yourself. Example: AWS EC2, Azure Virtual Machines.
- **PaaS (Platform as a Service)**: the provider manages servers and OS; you deploy your code. Example: Google App Engine, Azure App Service, Heroku.
- **SaaS (Software as a Service)**: ready-to-use software in the browser. Example: Gmail, Microsoft 365, Salesforce.

**Deployment models:** public, private, hybrid and multi-cloud.

**Key benefits:** scalability (add servers in minutes), lower upfront cost, high availability across regions, and faster delivery.

IT services companies like Tech Mahindra help clients migrate to and manage cloud systems, so this basic awareness is useful for freshers.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Use the pizza analogy if it helps: IaaS = make at home with rented kitchen, PaaS = takeaway, SaaS = dine in.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Convert a decimal number to binary without using the built-in bin() function.`,
          a: `**Approach:** repeatedly divide by 2 and record the remainder. The remainders read in reverse order give the binary representation. Handle 0 separately because the loop would not run.

**Complexity:** O(log n) time and space, since the number halves each step.

\`\`\`python
def to_binary(n):
    if n == 0:
        return "0"
    bits = []
    while n > 0:
        bits.append(str(n % 2))
        n //= 2
    return "".join(reversed(bits))

print(to_binary(10))   # 1010
print(to_binary(0))    # 0
print(to_binary(255))  # 11111111
\`\`\`

**Trace for 10:** 10 % 2 = 0, 5 % 2 = 1, 2 % 2 = 0, 1 % 2 = 1. Remainders 0, 1, 0, 1 reversed give **1010**.

**Reverse direction (binary to decimal):** multiply the running result by 2 and add each bit: \`result = result * 2 + int(bit)\`. Python's \`int("1010", 2)\` also does it, but interviewers usually want the manual method.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Handle n = 0 explicitly; it is the edge case interviewers check first.`,
        },
        {
          q: `Move all zeros in an array to the end while keeping the order of the other elements.`,
          a: `**Approach (two pointers, in place):** \`pos\` marks where the next non-zero element should go. Scan with \`i\`; whenever \`nums[i]\` is non-zero, swap it into \`nums[pos]\` and advance \`pos\`. Non-zero elements keep their relative order, and zeros collect at the end.

**Complexity:** O(n) time, O(1) extra space.

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
print(move_zeros([4, 5]))            # [4, 5]
\`\`\`

**Trace for [0, 1, 0, 3, 12]:** i=1 swaps 1 to index 0; i=3 swaps 3 to index 1; i=4 swaps 12 to index 2. Result: [1, 3, 12, 0, 0].

A simpler version builds a new list: \`[x for x in nums if x != 0] + [0] * nums.count(0)\`, but it uses O(n) extra space.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Mention both the simple list version and the in-place version; then code the in-place one.`,
        },
        {
          q: `Print all prime numbers up to n using the Sieve of Eratosthenes.`,
          a: `**Approach:** assume every number from 2 to n is prime. For each prime p, starting at 2, mark all its multiples from p² onwards as not prime. Smaller multiples were already marked by smaller primes. Stop when p² exceeds n.

**Complexity:** O(n log log n) time, O(n) space. Checking each number by trial division would be about O(n√n).

\`\`\`python
def primes_up_to(n):
    if n < 2:
        return []
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1
    return [i for i, flag in enumerate(is_prime) if flag]

print(primes_up_to(30))
# [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
print(primes_up_to(1))   # []
\`\`\`

**Single number check:** to test whether one number is prime, trial division up to √n is enough, because any factor larger than √n pairs with one smaller than √n.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Explain why marking starts at p squared; it shows you understand the algorithm, not just the code.`,
        },
        {
          q: `Compress a string by replacing runs of the same character with the character and its count, for example "aaabbc" becomes "a3b2c1".`,
          a: `**Approach:** walk through the string comparing each character with the previous one. While they match, increase the count. When the character changes, append the previous character and its count to the result and reset the count. After the loop, append the final run.

Build the result in a list and join it once at the end; repeated string concatenation can be slow.

**Complexity:** O(n) time, O(n) space for the output.

\`\`\`python
def compress(s):
    if not s:
        return ""
    out = []
    count = 1
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            count += 1
        else:
            out.append(s[i - 1] + str(count))
            count = 1
    out.append(s[-1] + str(count))
    return "".join(out)

print(compress("aaabbc"))   # a3b2c1
print(compress("abcd"))     # a1b1c1d1
print(compress("zzzzzz"))   # z6
print(compress(""))         # (empty string)
\`\`\`

**Common bug:** forgetting to append the last run after the loop, which drops "c1" in the first example.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Ask whether single characters should show "1" or be left alone; clarifying the format is part of the task.`,
        },
        {
          q: `Given an array and a target, find the indices of two numbers that add up to the target.`,
          a: `**Approach (hash map):** scan the array once. For each number \`x\`, the partner needed is \`target − x\`. If that partner was seen earlier, return both indices. Otherwise store \`x\` with its index and continue.

Checking every pair with two loops works but is O(n²). Sorting with two pointers is O(n log n) but loses the original indices unless you track them.

**Complexity:** O(n) time, O(n) space.

\`\`\`python
def find_pair(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return seen[target - x], i
        seen[x] = i
    return None

print(find_pair([2, 7, 11, 15], 9))   # (0, 1)
print(find_pair([3, 2, 4], 6))        # (1, 2)
print(find_pair([3, 3], 6))           # (0, 1)
print(find_pair([1, 2], 10))          # None
\`\`\`

Checking for the partner **before** storing \`x\` prevents pairing an element with itself, while still handling duplicates like [3, 3] correctly.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `State the O(n²) brute force first, then improve it. Showing the optimisation step is what earns marks.`,
        },
        {
          q: `Check whether a string of brackets ()[]{} is balanced.`,
          a: `**Approach (stack):** push every opening bracket. For every closing bracket, the stack must not be empty and its top must be the matching opening bracket; pop it. At the end, the stack must be empty (no unclosed brackets).

**Complexity:** O(n) time, O(n) space in the worst case.

\`\`\`python
def is_balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

print(is_balanced("{[()]}"))   # True
print(is_balanced("([)]"))     # False  (wrong nesting)
print(is_balanced("(("))       # False  (unclosed)
print(is_balanced("())"))      # False  (extra closing)
print(is_balanced("a(b)c"))    # True   (other characters ignored)
\`\`\`

**Why counting is not enough:** "([)]" has equal counts of each bracket type but is not balanced. Only a stack captures the nesting order.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Cover the three failure cases aloud: wrong type, extra closing bracket, unclosed opening bracket.`,
        },
        {
          q: `Print the elements of a matrix in spiral order.`,
          a: `**Approach (shrinking boundaries):** keep four boundaries: \`top\`, \`bottom\`, \`left\`, \`right\`. Repeat: read the top row left to right, then the right column top to bottom, then the bottom row right to left, then the left column bottom to top, shrinking the matching boundary after each side. The two \`if\` checks stop a single remaining row or column from being read twice.

**Complexity:** O(rows × cols) time, O(1) extra space apart from the output.

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
          at: 'Tech Mahindra',
          tip: `Test with a single row and a single column; that is where most spiral solutions break.`,
        },
        {
          q: `Find the longest palindromic substring in a string.`,
          a: `**Approach (expand around centre):** every palindrome is symmetric around a centre. A centre is either one character (odd length, "aba") or the gap between two characters (even length, "abba"). For each of the 2n − 1 centres, expand outwards while the characters on both sides match, and keep the longest span found.

**Complexity:** O(n²) time, O(1) extra space. Checking every substring separately would be O(n³).

\`\`\`python
def longest_palindrome(s):
    if not s:
        return ""
    start, end = 0, 0

    def expand(lo, hi):
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
            lo -= 1
            hi += 1
        return lo + 1, hi - 1

    for i in range(len(s)):
        for lo, hi in (expand(i, i), expand(i, i + 1)):
            if hi - lo > end - start:
                start, end = lo, hi
    return s[start:end + 1]

print(longest_palindrome("babad"))    # bab  ("aba" is equally valid)
print(longest_palindrome("cbbd"))     # bb
print(longest_palindrome("forgeeksskeegfor"))  # geeksskeeg
\`\`\`

The loop stops one step past the palindrome, so \`expand\` returns \`lo + 1, hi - 1\`.`,
          d: 'hard',
          at: 'Tech Mahindra',
          tip: `Remember the even-length centre. Solutions that only expand around single characters miss "abba".`,
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Introduce yourself in one minute.`,
          a: `Structure it as **present, past, future** and keep it relevant to the job.

**Model answer:**
"Good morning. I am [your name], a final-year [your branch] student from [your college]. I enjoy problem solving and building software, and my strongest skills are [language], SQL and networking basics.

My final-year project is [your project], where I [your role, for example designed the database and built the REST APIs]. The biggest challenge was [challenge], which I solved by [solution]. I have also completed [internship/certification] in [area].

Beyond academics, I [activity showing teamwork or communication, for example led our department's technical club or volunteered for an NSS programme], which improved my communication and planning.

I am excited about starting my career at Tech Mahindra, where I can work on large technology programmes for global clients and keep learning new technologies."

**Tips:** speak at a steady pace, make eye contact, and do not recite your resume word for word.`,
          d: 'easy',
          at: 'Tech Mahindra',
          tip: `Practise until it sounds natural, not memorised. A conversational tone makes a better first impression.`,
        },
        {
          q: `Why do you want to join Tech Mahindra?`,
          a: `Show genuine, accurate knowledge of the company and tie it to your goals.

**Model answer:**
"Tech Mahindra is part of the Mahindra Group, one of India's most respected business groups, and it serves clients worldwide across many industries. It is especially well known for its strength in the **communications and telecom** sector, which interests me because of [your reason, for example my networking coursework or interest in 5G and connected devices].

I also relate to the Mahindra Group's **'Rise'** philosophy, which is about driving positive change and enabling people to rise. As a fresher, I want to grow in a company that values both performance and responsibility towards society.

My strengths in [your skills] and my project on [your project] give me a good base, and the structured fresher training would help me contribute to client projects quickly. I see Tech Mahindra as a place to build a long-term career."

Read one recent piece of company news before the interview and mention it briefly if it fits.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Mention the telecom strength and the Mahindra Group link; both are well known and show you did your homework.`,
        },
        {
          q: `The Mahindra Group talks about "Rise". What does it mean to you, and how would you show it at work?`,
          a: `**Rise** is the Mahindra Group's core philosophy. It is commonly described through three ideas: **accepting no limits**, **alternative thinking**, and **driving positive change**.

**Model answer:**
"To me, Rise means not being satisfied with 'good enough' and looking for better ways to do things, while making a positive difference to the people around me.

As a fresher, accepting no limits would mean learning beyond my training syllabus, for example picking up [cloud/automation/a new tool] on my own. Alternative thinking would mean questioning manual, repetitive work. In [your project], I wrote [a small script or tool] that automated [a task], which saved our team time. Driving positive change could mean helping a teammate who is struggling, or taking part in the company's CSR and volunteering activities.

I think these ideas fit well with how I want to work: curious, practical and helpful."

The interviewer is checking whether you have read about the company and can connect its values to real behaviour.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Give one real example from your project for "alternative thinking". Values without examples sound rehearsed.`,
        },
        {
          q: `Are you comfortable with night shifts and relocation to any location?`,
          a: `Tech Mahindra serves clients across many time zones, and telecom and support projects often need extended or rotational shifts. Delivery centres are spread across India, so both questions are common.

**Model answer:**
"Yes. I understand that client projects run across time zones, especially in areas like telecom operations and support, so shifts are part of the job. I would adjust my routine with fixed sleep hours and good health habits so that my work quality stays consistent.

I am also open to relocating to any Tech Mahindra location. Starting my career in a new city would help me become more independent and adaptable, and I am comfortable managing on my own.

If I ever had a genuine constraint, I would tell you openly now, but at the moment I have none."

**If you do have a real constraint**, mention it briefly and honestly, and show flexibility elsewhere. Agreeing now and refusing after joining harms your credibility.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Do not just say "yes". Add how you will manage it; that makes the answer believable.`,
        },
        {
          q: `Why are you interested in the telecom domain, and would you work on a telecom project?`,
          a: `Tech Mahindra has a large communications business, so interviewers sometimes check whether you are open to it.

**Model answer:**
"Yes, I would be glad to. Telecom is the backbone of everything digital: every app, video call and online payment depends on networks. Areas like **5G**, network automation, cloud-based network functions and IoT are changing quickly, so a fresher can learn a lot of modern technology in this domain.

In college I studied [computer networks / data communication], and I enjoyed topics like [TCP/IP, routing, wireless networks]. I also [any related work, for example built a small network simulation or a chat application using sockets].

Even if I start in testing, support or development for a telecom client, I would treat it as a chance to learn both the domain and the technology, which is a valuable combination over a career."

If you have no telecom background at all, say so honestly and show willingness to learn; enthusiasm plus fundamentals is enough for a fresher.`,
          d: 'medium',
          at: 'Tech Mahindra',
          tip: `Connect telecom to something you studied (networking). It shows the interest is real, not invented.`,
        },
        {
          q: `Tell me about a time you had a conflict with a team member. How did you handle it?`,
          a: `Use **STAR** and show that you resolved the conflict calmly and focused on the work, not the person.

**Model answer:**
"**Situation:** In my final-year project, [teammate] and I disagreed about the database. I wanted [option A], and they wanted [option B]. The discussion was becoming tense and delaying our work.
**Task:** As the backend owner, I needed us to decide quickly without damaging the relationship.
**Action:** I suggested we each list the pros and cons against our actual requirements instead of arguing preferences. I also asked our guide for a short review. We realised [option B] suited our [requirement, for example structured reports] better, so I agreed and adapted my design.
**Result:** We finished the integration on schedule, and the teammate and I worked well together for the rest of the project.

**What I learned:** decide with data and requirements, listen fully before defending my view, and be willing to change my mind."

Avoid stories where you blame the other person or where the conflict was never resolved.`,
          d: 'hard',
          at: 'Tech Mahindra',
          tip: `Showing you changed your mind when the facts supported it is a strength, not a weakness.`,
        },
        {
          q: `Why should we hire you?`,
          a: `Match your strengths to what a fresher role at Tech Mahindra needs: solid basics, quick learning, communication and reliability. Support each claim with evidence.

**Model answer:**
"Three reasons.

First, **strong fundamentals**: I am comfortable with [language], SQL, OOP and networking basics, and I applied them in [your project], where I [specific contribution].

Second, **I learn quickly**: when our project needed [new technology], I learned it in [time frame] and implemented [feature]. Since IT projects keep changing technologies, this matters a lot.

Third, **communication and reliability**: I [example, for example presented our project to external judges, or coordinated a team of 20 volunteers for our college fest], and I am known among my peers for meeting deadlines.

I may not know every tool on day one, but I will be someone the team can depend on and who keeps improving."

Avoid comparing yourself negatively with other candidates; focus on what you bring.`,
          d: 'hard',
          at: 'Tech Mahindra',
          tip: `Three strengths, each with one example, delivered in under a minute. Structure makes the answer memorable.`,
        },
        {
          q: `Do you plan to pursue higher studies, and are you comfortable with a service agreement?`,
          a: `This question checks your commitment. Answer honestly, without saying things you do not mean.

**Model answer:**
"My priority right now is to start my career and build strong industry experience. I believe a few years of real project work will teach me far more than going straight into a master's degree.

If I study further in the future, I would prefer options that I can do alongside my job, such as certifications in [cloud, networking or a technology], or a part-time or executive programme later, so that learning supports my work instead of interrupting it.

Regarding a service agreement, I would read the terms carefully in my offer letter. Since I am planning to build my career here and grow over the long term, I do not see a commitment period as a problem."

**If you genuinely plan to leave soon for higher studies**, it is better not to make promises you will break; instead, focus on what you can contribute during your time and read the agreement terms carefully before signing.`,
          d: 'hard',
          at: 'Tech Mahindra',
          tip: `Talk about learning alongside work. It shows ambition without raising concerns about leaving early.`,
        },
      ],
    },
  ],
};

export default book;
