import { SeedBook, ALL_YEARS } from '../types';

/**
 * Deloitte (USI) fresher interview questions. Process details are hedged on purpose: the
 * pattern differs by role, business and drive, so students are pointed to official sources.
 */
const book: SeedBook = {
  slug: 'deloitte-interview',
  title: 'Deloitte Interview Questions',
  kind: 'company',
  subject: 'Deloitte',
  description: 'Prepare for Deloitte USI fresher roles: the usual hiring steps, aptitude practice, technical questions with SQL and cloud basics, coding problems and HR answers.',
  color: '#15803d',
  emblem: '🏢',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 111,
  chapters: [
    {
      title: 'Hiring process and preparation',
      questions: [
        {
          q: `How does Deloitte USI fresher hiring typically work?`,
          a: `**Deloitte USI** (US-India) is the part of Deloitte in India that mostly supports US member-firm clients, with offices in cities such as Hyderabad, Bengaluru, Mumbai and others. Freshers are hired through campus drives, off-campus drives and online applications.

A typical pattern reported in recent drives:

1. **Online assessment**: aptitude (quantitative, logical, verbal), and depending on the role, technical MCQs and/or a coding section.
2. **Group activity** in some drives: a group discussion or a short speaking round.
3. **Technical interview**: CS fundamentals, SQL, your projects, and sometimes basic cloud concepts.
4. **HR interview**: communication, fit, relocation and shift flexibility.

Sometimes the technical and HR rounds are combined into one interview. The pattern changes by business (for example consulting or risk advisory), role and year, so always read the instructions for your drive and check the official Deloitte careers page.`,
          d: 'easy',
          at: 'Deloitte',
          tip: `Ask your placement cell which business and role the drive is for; preparation differs between them.`,
        },
        {
          q: `What is usually in the Deloitte online assessment?`,
          a: `The assessment commonly has these parts, though the mix varies by drive:

- **Quantitative aptitude**: percentages, profit and loss, time and work, simple and compound interest, ratios, probability.
- **Logical reasoning**: syllogisms, blood relations, series, coding-decoding, seating arrangements, data interpretation.
- **Verbal ability**: reading comprehension, sentence correction, error spotting, vocabulary.
- **Technical MCQs** (for technology roles): programming output, DBMS and SQL, OS, networks, OOP.
- **Coding** (in some drives): one or two easy-to-medium problems on strings and arrays.

Tests are usually timed **section by section**, so you cannot spend extra time on a strong area. Some assessments are proctored online with webcam monitoring.

**Prepare** with timed mixed sets rather than topic-by-topic practice only, and get used to leaving a hard question and moving on.`,
          d: 'easy',
          at: 'Deloitte',
          tip: `Practise under section timers. Speed and question selection matter as much as accuracy.`,
        },
        {
          q: `What kinds of roles do freshers usually join at Deloitte USI?`,
          a: `Engineering freshers are commonly hired as **Analyst** level (titles vary) in areas such as:

- **Consulting / technology**: software development, testing, implementation of enterprise platforms (for example cloud, ERP or CRM systems), data and analytics.
- **Risk and advisory**: cyber security, technology risk, controls testing.
- **Audit and assurance or tax technology** support roles in some drives.

The business you join shapes your work: a technology consulting analyst may write code and configure platforms for client projects, while a risk analyst may review systems and controls. Many roles involve working with US-based teams.

In the interview, it helps to know **which business the drive is for** and to connect your skills to it, for example SQL and a project for a data role, or networking and security basics for a cyber role.

Role names and structures change, so read the job description shared for your drive rather than relying on older posts.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `What does the Deloitte technical interview check?`,
          a: `For technology roles, the technical interview usually checks whether your **fundamentals are solid and you can explain them clearly**, because consultants explain things to clients and teammates every day.

Commonly reported areas:
- **Your projects**: what you built, your role, design choices, challenges.
- **A programming language**: OOP concepts and small code snippets in Java, Python or C++.
- **DBMS and SQL**: joins, GROUP BY and HAVING, keys, normalization, writing a query on the spot.
- **Cloud basics**: what cloud computing is, IaaS/PaaS/SaaS, public vs private cloud.
- **SDLC**: Agile vs Waterfall, testing basics.
- **OS and networks** at a basic level.

Expect follow-up questions like "Why did you choose MySQL?" or "How would you deploy this?". If you do not know something, say so and explain how you would find out; bluffing is easy to spot.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `Be ready to write one SQL query live. It comes up often for technology roles.`,
        },
        {
          q: `Some Deloitte drives have a group discussion or speaking round. How should I handle it?`,
          a: `Where a group discussion or a short "just a minute" style round is used, it mainly checks **communication, structure and teamwork**, not deep knowledge.

**Do:**
- Open or join early with a clear point: "I think we should look at this from three angles: cost, people and technology."
- Support points with a simple example or fact you are sure of.
- Build on others: "Adding to what Priya said..." This shows collaboration, which matters in consulting.
- Invite a quiet member in, and if nobody does, offer a short summary at the end.

**Avoid:**
- Interrupting, shouting or repeating the same point.
- Long speeches; aim for 20–40 seconds per turn.
- Made-up statistics.

Practise by speaking for one minute on common topics (AI and jobs, remote work, digital payments) and recording yourself. Not every drive has this round, so check your drive details.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `How should I prepare for Deloitte in about four weeks?`,
          a: `**Week 1: aptitude.** 30–40 questions a day across quant, reasoning and verbal. Keep a sheet of formulas (percentages, interest, time and work) and of your mistakes.

**Week 2: technical basics.** OOP, DBMS, SQL and SDLC. Write SQL daily: joins, GROUP BY, HAVING, subqueries, second-highest salary. Learn cloud basics: service models, deployment models, regions and availability zones.

**Week 3: coding and projects.** Two easy-to-medium problems a day (strings, arrays, hashing). Prepare a two-minute walk-through of each project, including your role and one challenge.

**Week 4: mocks and HR.** Take two full timed mock tests. Practise HR answers aloud: tell me about yourself, why Deloitte, a teamwork story, relocation and shifts. Read about Deloitte's businesses and values on the official website.

Throughout, practise **speaking clearly**: in consulting, how you explain an answer matters almost as much as the answer itself.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `Record yourself answering three technical questions; listen for filler words and unclear structure.`,
        },
        {
          q: `What documents and background checks should I expect at Deloitte?`,
          a: `Large professional services firms, including Deloitte, usually run a **detailed background verification** after the offer. Commonly checked items include:

- Education: mark sheets, degree or provisional certificate, sometimes verified directly with the university.
- Identity and address: government ID such as PAN and Aadhaar, passport if you have one.
- Any previous employment or internships, if listed on your resume.
- Sometimes criminal record or database checks through an authorised agency.

Because Deloitte is also an audit firm, joiners may be asked to follow **independence and conflict-of-interest policies**, for example declaring certain financial interests. Follow the onboarding instructions exactly.

**What this means for you:** every detail on your resume must be accurate. Dates, marks, internships and certifications that do not match the documents can delay or cancel an offer. Keep scanned copies of all certificates ready before onboarding starts.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `Make sure resume dates and marks exactly match your certificates before you apply.`,
        },
        {
          q: `What about training, joining dates and bonds at Deloitte?`,
          a: `New analysts usually go through an **onboarding and training period** before joining a project, covering firm policies, tools and role-specific technical skills. The length and format (in person or virtual) depend on the business and the year.

**Joining dates** for campus hires can take time after the offer and are sometimes staggered. Stay in touch with HR, respond to onboarding emails quickly and keep your documents ready.

On **bonds or service agreements**, terms can differ by role and year, and forum posts are often outdated. The only reliable source is **your own offer letter and the documents you sign**. Read them fully and ask HR in writing if something is unclear.

While waiting to join, use the time well: strengthen SQL, learn the basics of one cloud platform (many offer free beginner certifications), and build or polish a small project. This also gives you something to talk about in your first weeks.`,
          d: 'easy',
          at: 'Deloitte',
        },
      ],
    },
    {
      title: 'Aptitude and reasoning (test style)',
      questions: [
        {
          q: `The price of an item is increased by 20% and then decreased by 20%. What is the net change?

A) No change  B) 4% decrease  C) 4% increase  D) 2% decrease`,
          a: `**Answer: B) 4% decrease**

**Method 1: assume 100.**
After a 20% increase: 100 × 1.2 = 120.
After a 20% decrease: 120 × 0.8 = 96.
Net change: 96 − 100 = −4, a **4% decrease**.

**Method 2: successive change formula.**
Net % = a + b + (a × b)/100 = 20 + (−20) + (20 × −20)/100 = 0 − 4 = **−4%**.

The decrease is applied to a larger number (120) than the increase was (100), which is why the result is not zero. Option A is the most common wrong answer.`,
          d: 'easy',
          at: 'Deloitte',
          tip: `For any equal % rise then fall, the net is a loss of x squared over 100 percent.`,
        },
        {
          q: `A can finish a job in 12 days and B can finish it in 18 days. How long will they take working together?

A) 7 days  B) 7.2 days  C) 7.5 days  D) 8 days`,
          a: `**Answer: B) 7.2 days**

**Work per day:**
A does 1/12 of the job per day; B does 1/18.

**Together:**
1/12 + 1/18 = 3/36 + 2/36 = **5/36** of the job per day.

**Time:** 36/5 = **7.2 days**.

**Shortcut (LCM method):** take total work = LCM(12, 18) = 36 units. A does 3 units/day, B does 2 units/day, together 5 units/day. Time = 36 / 5 = 7.2 days.

**Check:** in 7.2 days A does 7.2 × 3 = 21.6 units and B does 14.4 units; total 36 units. Correct.

Also useful: for two workers, together time = (a × b) / (a + b) = (12 × 18) / 30 = 216 / 30 = 7.2.`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `What is the difference between compound interest and simple interest on ₹10,000 at 10% per annum for 2 years (compounded annually)?

A) ₹50  B) ₹100  C) ₹121  D) ₹200`,
          a: `**Answer: B) ₹100**

**Simple interest:** SI = P × R × T / 100 = 10,000 × 10 × 2 / 100 = **₹2,000**.

**Compound interest:**
Amount = 10,000 × (1.1)² = 10,000 × 1.21 = ₹12,100.
CI = 12,100 − 10,000 = **₹2,100**.

**Difference:** 2,100 − 2,000 = **₹100**.

**Shortcut for 2 years:** CI − SI = P × (R/100)² = 10,000 × (0.1)² = 10,000 × 0.01 = ₹100.

Why: in year 2, compound interest also earns interest on year 1's interest (₹1,000 × 10% = ₹100), which simple interest does not. Option C comes from mistaking the 1.21 multiplier for the answer.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `Memorise CI - SI = P(R/100)^2 for 2 years. It turns a multi-step question into one line.`,
        },
        {
          q: `A shopkeeper marks goods 40% above cost price and gives a 10% discount on the marked price. What is the profit percentage?

A) 30%  B) 26%  C) 24%  D) 36%`,
          a: `**Answer: B) 26%**

**Assume cost price = ₹100.**

**Marked price** = 100 + 40% of 100 = ₹140.

**Selling price** after a 10% discount on the marked price = 140 − 14 = ₹126.

**Profit** = 126 − 100 = ₹26 on a cost of ₹100, so **26%**.

**Formula check:** multiplier = 1.40 × 0.90 = 1.26, which is a 26% gain.

The trap is to subtract the percentages directly (40 − 10 = 30%, option A). The discount is taken on the **marked price**, not on the cost, so it is 10% of 140 = 14, not 10% of 100.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Pointing to a man, Riya says, "He is the son of my grandfather's only son." How is the man related to Riya?

A) Cousin  B) Uncle  C) Brother  D) Father`,
          a: `**Answer: C) Brother**

Break the sentence from the inside out:

1. **"My grandfather's only son"**: the grandfather has only one son. Since Riya is his grandchild through that line, that only son must be **Riya's father**.
2. **"The son of my father"**: the man is a son of Riya's father.
3. A son of your father, who is not you (Riya is female here and the man is male), is your **brother**.

Why the other options fail:
- **Cousin** would need the father to be a different son of the grandfather, but he is the *only* son.
- **Uncle** would be the grandfather's son himself, not his son's son.
- **Father** is the grandfather's only son, not the son of that person.

Draw a small family tree for these questions; it avoids errors.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Statements: All analysts are graduates. Some graduates are engineers.
Conclusions: I. Some analysts are engineers. II. Some engineers are graduates.

A) Only I follows  B) Only II follows  C) Both follow  D) Neither follows`,
          a: `**Answer: B) Only II follows**

**Conclusion II:** "Some graduates are engineers" can be reversed (converted): if some graduates are engineers, then some engineers are graduates. **II definitely follows.**

**Conclusion I:** we know all analysts are inside the "graduates" set, and some graduates are engineers. But the engineers that are graduates might be **entirely outside** the analysts. Draw it:

- A big circle: Graduates.
- A smaller circle inside it: Analysts.
- An Engineers circle that overlaps Graduates but not Analysts.

This drawing matches both statements, yet no analyst is an engineer. Since a valid picture exists where I is false, **I does not definitely follow**.

**Rule:** "All A are B" + "Some B are C" gives no definite conclusion between A and C. Only a conclusion that must be true in every possible diagram follows.`,
          d: 'hard',
          at: 'Deloitte',
          tip: `Try to draw a diagram where the conclusion is false. If you can, it does not follow.`,
        },
        {
          q: `Find the part of the sentence that has an error: "Neither the manager (A) / nor the analysts (B) / was aware (C) / of the change. (D)"

A) Neither the manager  B) nor the analysts  C) was aware  D) of the change`,
          a: `**Answer: C) was aware**

With **"neither ... nor"** and **"either ... or"**, the verb agrees with the **subject closest to it**.

Here the nearer subject is **"the analysts"**, which is plural, so the verb must be plural: **"were aware"**.

Correct sentence: "Neither the manager nor the analysts **were** aware of the change."

Compare: "Neither the analysts nor the manager **was** aware of the change." Now the nearer subject is "the manager" (singular), so "was" is correct.

A good style tip that examiners also accept: when one subject is singular and one is plural, put the plural one second so the plural verb sounds natural.

Other common agreement traps in Deloitte-style verbal sections: "each of the students **is**", "one of the reasons **is**", and "the team **has**" (collective noun as one unit).`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `Two fair dice are thrown. What is the probability that the sum is a prime number?

A) 1/3  B) 5/12  C) 7/18  D) 1/2`,
          a: `**Answer: B) 5/12**

Total outcomes: 6 × 6 = **36**.

Possible prime sums between 2 and 12: **2, 3, 5, 7, 11**.

Count the ways for each:
| Sum | Pairs | Ways |
|---|---|---|
| 2 | (1,1) | 1 |
| 3 | (1,2), (2,1) | 2 |
| 5 | (1,4), (4,1), (2,3), (3,2) | 4 |
| 7 | (1,6), (6,1), (2,5), (5,2), (3,4), (4,3) | 6 |
| 11 | (5,6), (6,5) | 2 |

Favourable = 1 + 2 + 4 + 6 + 2 = **15**.

Probability = 15/36 = **5/12**.

The usual mistakes are forgetting that 2 is prime, or counting (1,2) and (2,1) as one outcome. With two dice, ordered pairs are the equally likely outcomes, so both orders count.`,
          d: 'hard',
          at: 'Deloitte',
          tip: `The number of ways to get sum s with two dice is 6 - |s - 7|. It saves time.`,
        },
      ],
    },
    {
      title: 'Technical interview',
      questions: [
        {
          q: `Explain the four pillars of OOP with real-world examples.`,
          a: `- **Encapsulation**: bundle data with the methods that use it and restrict direct access. A \`BankAccount\` keeps \`balance\` private; you can only change it through \`deposit()\` and \`withdraw()\`, which enforce rules.
- **Abstraction**: expose what something does, hide how. When you use a payment gateway's \`pay(amount)\` method, you do not see the bank network calls behind it.
- **Inheritance**: a class reuses another class's features. \`Manager\` extends \`Employee\` and adds \`approve_leave()\`.
- **Polymorphism**: one interface, different behaviour. \`shape.area()\` calculates differently for \`Circle\` and \`Rectangle\` (overriding); method overloading is the compile-time form in languages like Java.

\`\`\`python
class Employee:
    def __init__(self, name, salary):
        self.name, self._salary = name, salary
    def bonus(self):
        return self._salary * 0.05

class Manager(Employee):
    def bonus(self):
        return self._salary * 0.10
\`\`\`

Interviewers often follow up with "Where did you use these in your project?", so prepare one example from your own code.`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `Explain the types of SQL joins with an example.`,
          a: `Use two tables: \`employees(id, name, dept_id)\` and \`departments(id, name)\`.

- **INNER JOIN**: only rows with a match in both tables. Employees without a department and departments without employees are left out.
- **LEFT JOIN**: all rows from the left table, with matching right rows or \`NULL\`. Lists every employee, even those with no department.
- **RIGHT JOIN**: all rows from the right table. Lists every department, even empty ones.
- **FULL OUTER JOIN**: all rows from both sides (MySQL does not support it directly; combine a LEFT and a RIGHT join with \`UNION\`).
- **CROSS JOIN**: every combination (rows × rows).
- **SELF JOIN**: a table joined to itself, for example employees with their managers.

\`\`\`sql
SELECT e.name, d.name AS dept
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id;
\`\`\`

A useful follow-up: find departments with no employees: \`LEFT JOIN\` from departments and filter \`WHERE e.id IS NULL\`.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `Sketch two small tables with a missing match on each side. It explains every join type in seconds.`,
        },
        {
          q: `What is the difference between WHERE and HAVING? Write a query for departments with more than 5 employees.`,
          a: `- **WHERE** filters **rows before** grouping. It cannot use aggregate functions like \`COUNT()\` or \`SUM()\`.
- **HAVING** filters **groups after** \`GROUP BY\` has run, so it can use aggregates.

Logical order of a query: \`FROM\` → \`WHERE\` → \`GROUP BY\` → \`HAVING\` → \`SELECT\` → \`ORDER BY\` → \`LIMIT\`.

\`\`\`sql
SELECT dept_id, COUNT(*) AS headcount, AVG(salary) AS avg_salary
FROM employees
WHERE hired_on >= '2020-01-01'      -- row filter
GROUP BY dept_id
HAVING COUNT(*) > 5                 -- group filter
ORDER BY headcount DESC;
\`\`\`

This counts only employees hired from 2020, groups them by department, and keeps departments with more than 5 such employees.

Rule of thumb: if the condition is about individual rows, use WHERE (it is also faster because fewer rows are grouped). If it is about a group's total, count or average, use HAVING.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Write a SQL query to find the second highest salary. How would you find the Nth highest per department?`,
          a: `Table: \`employees(id, name, dept_id, salary)\`.

**Second highest (distinct) salary:**
\`\`\`sql
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
\`\`\`
This returns \`NULL\` if there is no second distinct salary.

**Alternative with LIMIT/OFFSET:**
\`\`\`sql
SELECT DISTINCT salary FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;
\`\`\`

**Nth highest per department with a window function (MySQL 8+, PostgreSQL, SQL Server):**
\`\`\`sql
SELECT dept_id, name, salary
FROM (
  SELECT dept_id, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2;
\`\`\`

**Why DENSE_RANK:** with salaries 90, 90, 80, \`DENSE_RANK\` gives 1, 1, 2, so the second highest is 80. \`RANK\` gives 1, 1, 3 (no rank 2), and \`ROW_NUMBER\` gives 1, 2, 3 and wrongly treats the second 90 as second highest.`,
          d: 'hard',
          at: 'Deloitte',
          tip: `Always mention how ties are handled. Choosing DENSE_RANK over RANK and ROW_NUMBER shows real understanding.`,
        },
        {
          q: `What is cloud computing? Explain IaaS, PaaS and SaaS with examples.`,
          a: `**Cloud computing** means renting computing resources (servers, storage, databases, software) over the internet **on demand**, paying for what you use, instead of buying and running your own hardware. Key benefits: no upfront hardware cost, quick scaling up or down, and global availability.

**Service models** (from most control to least):

| Model | You manage | Provider manages | Examples |
|---|---|---|---|
| **IaaS** (Infrastructure) | OS, runtime, app, data | Hardware, network, virtualisation | AWS EC2, Azure Virtual Machines, Google Compute Engine |
| **PaaS** (Platform) | Your app and data | OS, runtime, scaling too | Azure App Service, Google App Engine, AWS Elastic Beanstalk |
| **SaaS** (Software) | Just your use and data | Everything | Gmail, Microsoft 365, Salesforce |

**Simple analogy:** IaaS is renting an empty flat (you furnish it), PaaS is a furnished flat (you just move in), SaaS is a hotel room (everything is provided).

Serverless (for example AWS Lambda, Azure Functions) is often described as going even further than PaaS: you upload functions and pay per execution.`,
          d: 'easy',
          at: 'Deloitte',
          tip: `Give one real product for each model; examples prove you understand the difference.`,
        },
        {
          q: `What are public, private and hybrid clouds? What are regions and availability zones?`,
          a: `**Deployment models:**
- **Public cloud**: infrastructure owned by a provider (AWS, Azure, Google Cloud) and shared by many customers, with each customer's resources isolated. Cheapest to start, highly scalable.
- **Private cloud**: cloud infrastructure dedicated to one organisation, on its own premises or hosted. More control, often chosen for strict compliance needs; costlier.
- **Hybrid cloud**: a mix, for example sensitive data in a private data centre and customer-facing apps in the public cloud, connected securely.
- **Multi-cloud**: using services from more than one public provider.

**Regions and availability zones:**
- A **region** is a geographic area (for example a provider's Mumbai region) with multiple data centres.
- An **availability zone (AZ)** is one or more isolated data centres within a region, with separate power and networking.

Deploying an application across **multiple AZs** keeps it running if one data centre fails (high availability). Choosing a region close to users reduces latency and can help with data residency rules. Consulting clients often ask exactly these questions when moving to the cloud.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `What is the difference between the Waterfall and Agile models? What is Scrum?`,
          a: `**Waterfall** runs phases in a fixed sequence: requirements → design → development → testing → deployment → maintenance. Each phase finishes before the next starts. It suits projects with stable, well-understood requirements, but changes late in the project are expensive and users see working software only near the end.

**Agile** delivers software in **short iterations**, gathering feedback after each one. Requirements can evolve, and working software is shown early and often.

**Scrum** is a popular Agile framework:
- **Sprints** of usually 1–4 weeks, each producing a usable increment.
- **Roles**: Product Owner (owns and prioritises the backlog), Scrum Master (removes blockers, guards the process), Developers (build the increment).
- **Events**: sprint planning, daily stand-up, sprint review (demo to stakeholders), retrospective (improve the process).
- **Artifacts**: product backlog, sprint backlog, increment.

Many client projects at consulting firms use Agile or a hybrid. If you used sprints or a task board in a college project, mention it.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Walk me through your project. How would you deploy it on the cloud?`,
          a: `**Walk-through structure (about two minutes):**
1. **Problem and users**: "[Your project] helps [users] to [task]."
2. **Your role**: what you personally built.
3. **Architecture**: front end, back end, database, and how a request flows through them.
4. **One challenge** and how you solved it.
5. **Result**: who used it or what you measured.

**Deploying it on the cloud (example for a web app with a database):**
- **Front end**: static files on object storage with a CDN (for example Amazon S3 + CloudFront, or Azure Storage static website).
- **Back end**: a PaaS service (Azure App Service, AWS Elastic Beanstalk) or containers, running at least two instances across **availability zones** behind a load balancer.
- **Database**: a managed database (Amazon RDS, Azure SQL) with automated backups; credentials kept in a secrets manager, not in code.
- **Security**: HTTPS, least-privilege access roles, database not exposed to the internet.
- **Operations**: logs and alerts (CloudWatch, Azure Monitor), and a CI/CD pipeline that deploys on every merge.

Mention cost too: auto-scaling down at night and choosing the smallest instance that meets the load.`,
          d: 'hard',
          at: 'Deloitte',
          tip: `Use one cloud provider consistently in your answer instead of mixing service names randomly.`,
        },
      ],
    },
    {
      title: 'Coding round',
      questions: [
        {
          q: `Reverse the order of words in a sentence. Example: "I love Deloitte" → "Deloitte love I".`,
          a: `**Approach:** split the sentence into words on whitespace, reverse the list and join with single spaces. \`split()\` with no argument also removes extra spaces at the ends and between words. If asked not to use built-ins, walk the string from the end, collecting characters into words.

**Complexity:** O(n) time and O(n) space.

\`\`\`python
def reverse_words(s):
    return " ".join(s.split()[::-1])

def reverse_words_manual(s):
    words, word = [], ""
    for ch in s:
        if ch == " ":
            if word:
                words.append(word)
                word = ""
        else:
            word += ch
    if word:
        words.append(word)
    out = []
    for i in range(len(words) - 1, -1, -1):
        out.append(words[i])
    return " ".join(out)

print(reverse_words("I love Deloitte"))            # Deloitte love I
print(reverse_words_manual("  cloud   and data "))  # data and cloud
\`\`\``,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `Check whether a string is a palindrome, ignoring case, spaces and punctuation. Example: "A man, a plan, a canal: Panama" → True.`,
          a: `**Approach:** use two pointers, one from each end. Skip characters that are not letters or digits, compare the rest in lowercase, and move inward. This avoids building a cleaned copy of the string.

**Complexity:** O(n) time, O(1) extra space.

\`\`\`python
def is_palindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        else:
            if s[i].lower() != s[j].lower():
                return False
            i += 1
            j -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome("race a car"))                      # False
print(is_palindrome(""))                                # True
\`\`\`

A shorter version is \`t = [c.lower() for c in s if c.isalnum()]\` followed by \`t == t[::-1]\`, which uses O(n) extra space. Mention both and the trade-off.`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `Find the first non-repeating character in a string. Example: "swiss" → "w".`,
          a: `**Approach:** two passes. First count every character with a dictionary. Then walk the string again in its original order and return the first character whose count is 1. A single pass is not enough, because you only know a character is unique after seeing the whole string.

**Complexity:** O(n) time, O(k) space for k distinct characters.

\`\`\`python
def first_unique(s):
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None

print(first_unique("swiss"))     # w
print(first_unique("deloitte"))  # d
print(first_unique("aabb"))      # None
\`\`\`

\`collections.Counter(s)\` can replace the first loop. A common wrong answer loops over the **dictionary** in the second pass; it works in modern Python because dictionaries keep insertion order, but looping over the string makes the intent clearer and works in every language.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Find the second largest distinct number in an array without sorting.`,
          a: `**Approach:** keep two variables, \`first\` and \`second\`, starting at negative infinity. For each number:
- If it is greater than \`first\`, the old \`first\` becomes \`second\`, and the number becomes \`first\`.
- Else if it is between them (greater than \`second\` and **not equal** to \`first\`), it becomes \`second\`.

The "not equal" check handles duplicates of the maximum, such as \`[5, 5, 3]\` where the answer is 3.

**Complexity:** O(n) time, O(1) space, one pass. Sorting would be O(n log n).

\`\`\`python
def second_largest(nums):
    first = second = float("-inf")
    for x in nums:
        if x > first:
            second, first = first, x
        elif first > x > second:
            second = x
    return None if second == float("-inf") else second

print(second_largest([12, 35, 1, 10, 34, 1]))  # 34
print(second_largest([5, 5, 3]))               # 3
print(second_largest([7, 7]))                  # None
\`\`\`

Always ask what to return when there is no second distinct value; returning \`None\` is a clear choice.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `Test with duplicates of the maximum and with all-equal arrays; those break most first attempts.`,
        },
        {
          q: `Group a list of words into anagram groups. Example: ["eat", "tea", "tan", "ate", "nat", "bat"].`,
          a: `**Approach:** anagrams have the same letters, so they have the same **sorted form**. Use a dictionary where the key is the sorted word and the value is the list of words with that key. Words in the same group share a key.

**Complexity:** O(n × k log k) time for n words of length up to k (sorting each word); O(n × k) space.

\`\`\`python
def group_anagrams(words):
    groups = {}
    for w in words:
        key = "".join(sorted(w))
        groups.setdefault(key, []).append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
# [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
\`\`\`

**Faster key for lowercase letters:** count each letter into a 26-length tuple and use the tuple as the key. That is O(n × k) time, because counting is linear while sorting is not.

\`\`\`python
def key_of(w):
    counts = [0] * 26
    for ch in w:
        counts[ord(ch) - ord("a")] += 1
    return tuple(counts)
\`\`\`

A simpler warm-up question is to check whether two strings are anagrams: compare \`sorted(a) == sorted(b)\`.`,
          d: 'hard',
          at: 'Deloitte',
        },
        {
          q: `Move all zeros in an array to the end while keeping the order of the other elements. Do it in place.`,
          a: `**Approach:** keep a write pointer \`pos\`. Walk through the array; whenever you see a non-zero value, copy it to \`nums[pos]\` and move \`pos\` forward. After the loop, every position from \`pos\` to the end is filled with zeros. Non-zero values keep their relative order because they are copied in the order they appear.

**Complexity:** O(n) time, O(1) extra space.

\`\`\`python
def move_zeros(nums):
    pos = 0
    for x in nums:
        if x != 0:
            nums[pos] = x
            pos += 1
    for i in range(pos, len(nums)):
        nums[i] = 0
    return nums

print(move_zeros([0, 1, 0, 3, 12]))  # [1, 3, 12, 0, 0]
print(move_zeros([0, 0, 1]))         # [1, 0, 0]
print(move_zeros([4, 5]))            # [4, 5]
\`\`\`

A swap version (\`nums[pos], nums[i] = nums[i], nums[pos]\`) does it in one loop. Avoid creating a new list with comprehensions when the question says "in place".`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Given an array of integers and a target, return the indices of two numbers that add up to the target.`,
          a: `**Approach:** a brute force checks every pair in O(n²). Better: walk the array once, storing each value's index in a dictionary. For each number \`x\`, check whether \`target - x\` was already seen; if so, you have the pair.

**Complexity:** O(n) time, O(n) space.

\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

print(two_sum([2, 7, 11, 15], 9))  # [0, 1]
print(two_sum([3, 2, 4], 6))       # [1, 2]
print(two_sum([3, 3], 6))          # [0, 1]
\`\`\`

**Why check before storing:** in \`[3, 2, 4]\` with target 6, checking first means 3 does not pair with itself. In \`[3, 3]\`, the second 3 finds the first one's index, which is correct.

If the array is **sorted**, a two-pointer approach (left and right ends, move inward) solves it in O(n) time and O(1) space. Mention it as a follow-up.`,
          d: 'medium',
          at: 'Deloitte',
          tip: `State the brute force and its cost first, then improve. Interviewers want to see the reasoning, not just the trick.`,
        },
        {
          q: `Merge overlapping intervals. Example: [[1,3],[2,6],[8,10],[15,18]] → [[1,6],[8,10],[15,18]].`,
          a: `**Approach:** sort intervals by start. Walk through them, keeping a result list. If the current interval starts **at or before** the end of the last merged interval, they overlap: extend the last interval's end to the larger of the two ends. Otherwise, append the current interval as a new one.

**Complexity:** O(n log n) time for sorting, O(n) space for the result.

\`\`\`python
def merge(intervals):
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda iv: iv[0])
    merged = [list(intervals[0])]
    for start, end in intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged

print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]))  # [[1, 6], [8, 10], [15, 18]]
print(merge([[1, 4], [4, 5]]))                     # [[1, 5]]
print(merge([[1, 10], [2, 3]]))                    # [[1, 10]]
\`\`\`

The \`max\` matters for nested intervals like \`[1,10]\` and \`[2,3]\`; without it the end would wrongly shrink to 3. Real uses: merging meeting slots or booked time ranges.`,
          d: 'hard',
          at: 'Deloitte',
        },
      ],
    },
    {
      title: 'HR and managerial round',
      questions: [
        {
          q: `Tell me about yourself.`,
          a: `Keep it around a minute, structured, and connected to the role. Consulting firms value **clear communication**, so this answer is also a communication test.

**Model answer:**
"I am [your name], a final-year [your branch] student at [your college]. I enjoy solving problems with technology and explaining them to others. My main project is [your project], where I [what you built] using [technologies]; the most valuable part was [a challenge and what you learned]. I have also worked on [SQL, cloud basics or a certification you genuinely have], and I took part in [team activity, club, hackathon, internship], where I [specific contribution]. I am looking to start my career in a role where I work with clients and teams on real business problems, which is why the [business or role name] role at Deloitte interests me."

Avoid personal details unrelated to work and do not read out your resume. End by linking to the role.`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `Why do you want to join Deloitte?`,
          a: `Make the answer specific and honest. Publicly known points you can draw on:

- Deloitte is one of the **Big Four** professional services firms, working across consulting, audit, tax and risk advisory for large clients in many industries.
- At Deloitte USI you would work with **global teams and clients**, which builds both technical and client-facing skills early.
- Deloitte publicly states its purpose as making **"an impact that matters"** and lists shared values such as leading the way, serving with integrity, taking care of each other, fostering inclusion and collaborating for measurable impact.

**Model answer:**
"I want to start my career where I learn both technology and how businesses use it. At Deloitte I would work on problems for different clients and industries, which would grow me faster than one narrow area. The value of serving with integrity matters to me, as I showed when [brief example]. I have also read about Deloitte's work in [an area relevant to your role, such as cloud or cyber], and that is the direction I want to grow in."`,
          d: 'easy',
          at: 'Deloitte',
          tip: `Name the business or service area the role belongs to; it shows you researched beyond the brand name.`,
        },
        {
          q: `Are you comfortable with relocation and working hours that overlap with US clients?`,
          a: `Deloitte USI supports US-based teams and clients, so some roles involve meetings that overlap with US business hours, which can mean late evening calls in India. Locations are assigned based on business needs. The interviewer wants to know you are flexible and realistic.

**Model answer:**
"Yes. I understand that working with US clients can mean some evening calls, and I am comfortable adjusting my schedule when the project needs it. I am also open to working from any of Deloitte's offices; I see relocation as part of starting a career, and it is a chance to learn to work independently."

**If you have a genuine constraint**, mention it honestly and briefly: "I am open to relocating. If possible I would prefer [city] because of [real reason], but I am flexible if the role requires otherwise."

Do not agree to everything now if you know you will refuse later. Interviewers value honesty, and saying one thing and doing another hurts trust early.`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `Tell me about a time you worked in a team and faced a disagreement.`,
          a: `Use **STAR** and show that you resolved the disagreement through communication and data, not ego. Collaboration is one of Deloitte's stated values.

**Model answer:**
"**Situation:** In our final-year project [your project], two of us disagreed on [the issue, for example whether to build a mobile app or a web app] with only [time] left.
**Task:** As the person handling [your part], I needed us to decide quickly without hurting the team.
**Action:** I suggested we list what the client (our guide) actually needed and score both options on time, skills in the team and user reach. I listened to my teammate's reasons first, and we found that [a key fact]. We agreed on [decision], and I offered to [support the other person's idea in some way, such as making the web app responsive for mobile].
**Result:** We delivered on time, the guide appreciated [specific outcome], and the teammate and I worked together well for the rest of the project."

Avoid stories where you were simply right and the other person was wrong.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `A client changes the requirements late in the project. How would you handle it?`,
          a: `This is a typical **consulting scenario** question. Show calm, client focus and process.

**Model answer:**
"First, I would **understand the change fully**: what the client needs and why, because sometimes the underlying need can be met in a simpler way. I would ask clarifying questions and write down the new requirement.

Second, I would **assess the impact** with my team: effort, timeline, cost, risk to work already done, and testing needed.

Third, I would **raise it with my manager** rather than agreeing or refusing on my own, because scope, timelines and contracts are decided at that level. Together we would present the client clear options, for example including it now with a revised date, delivering it in a later phase, or swapping it for a lower-priority feature.

Finally, once agreed, I would **document the decision** and update the plan and test cases.

The aim is to keep the client's trust: never say yes to something we cannot deliver, and never dismiss what they need."

If you have a college example of changed requirements, add it briefly.`,
          d: 'hard',
          at: 'Deloitte',
          tip: `Show you would escalate scope changes to your manager instead of promising or refusing alone.`,
        },
        {
          q: `Tell me about a mistake you made and what you learned from it.`,
          a: `Pick a **real but recoverable** mistake, take ownership, and focus on what changed afterwards.

**Model answer:**
"**Situation:** During [your project or internship], I was responsible for [task, for example preparing the database for a demo].
**Mistake:** I tested my queries only on a small sample, and during the review the report took far too long on the full data and showed a duplicate count.
**Action:** I told my team lead immediately instead of hiding it. I found the cause, a join that created duplicate rows and a missing index on [column], fixed both and re-ran the report on the full dataset that evening.
**Result:** The corrected report was ready the next morning. Since then I always test with realistic data volumes and double-check row counts after joins."

Avoid fake mistakes like "I work too hard" and avoid blaming others. Interviewers in client-facing firms look for **integrity and accountability**: raising a problem early is valued more than never making one.`,
          d: 'medium',
          at: 'Deloitte',
        },
        {
          q: `Where do you see yourself in five years?`,
          a: `Show growth in **skills and responsibility** that fits a consulting career path, and avoid sounding like you will leave soon.

**Model answer:**
"In five years, I see myself as a trusted team member who understands both the technology and the client's business. I would like to have deep skills in [an area such as cloud, data engineering or cyber security], ideally backed by relevant certifications, and to have worked across a few different client projects. I would also like to be leading small pieces of work, guiding new analysts and handling client conversations confidently. Deloitte's range of clients and industries is a big reason I think this growth is possible here."

Keep it realistic: avoid naming a specific senior title or saying you plan to move abroad or study further unless you can connect it to the role. The interviewer is checking ambition, direction and whether you intend to grow with the firm.`,
          d: 'easy',
          at: 'Deloitte',
        },
        {
          q: `A friend asks you to share some client data from your project for their college assignment. It is "just numbers". What do you do?`,
          a: `This is an **integrity and confidentiality** question. Professional services firms handle sensitive client information and treat confidentiality as non-negotiable, and integrity is one of Deloitte's stated values.

**Model answer:**
"I would politely but clearly refuse. Client data belongs to the client and I would only use it for the work I am assigned, regardless of whether it looks harmless. Even 'just numbers' can reveal business information or personal data, and sharing it would break the client's trust, the firm's policies and possibly data protection law.

I would explain this to my friend without making it awkward and suggest public datasets they could use instead, for example open government data portals.

If I felt any pressure, or if I noticed someone else sharing client data, I would raise it with my manager or use the firm's ethics and compliance channels."

The key points: **no exceptions**, explain why, offer an alternative, and know how to escalate.`,
          d: 'hard',
          at: 'Deloitte',
          tip: `Answer firmly without hesitation. Ethics questions are about clear lines, not clever compromises.`,
        },
      ],
    },
  ],
};

export default book;
