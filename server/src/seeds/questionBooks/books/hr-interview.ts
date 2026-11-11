// HR interview questions for freshers: model answers they can adapt, plus what the interviewer is checking.
import { SeedBook, ALL_YEARS } from '../types';

const book: SeedBook = {
  slug: 'hr-interview',
  title: 'HR Interview Questions',
  kind: 'topic',
  subject: 'HR',
  emblem: '💬',
  color: '#be123c',
  audience: 'all',
  stages: ALL_YEARS,
  tracks: [],
  order: 10,
  description: `The 40 HR questions freshers face most: self-introduction, strengths, STAR stories, salary, relocation, bonds, gaps and tricky situations, with sample answers you can adapt.`,
  chapters: [
    {
      title: `Introducing yourself`,
      questions: [
        {
          q: `Tell me about yourself.`,
          a: `**Sample answer:**
"Good morning. I am [your name] from [your city]. I recently completed my **B.Tech in [your branch]** from [your college] with [your CGPA]. During college I got interested in software development, so I learned **[Java / Python]** and **SQL**, and built [your project], which [one line on what it does]. I also completed an internship at [company] where I worked on [task]. Outside academics, I [hobby or activity, e.g. coordinated our tech fest]. I am now looking for a role where I can **apply my coding skills, learn from experienced people and grow as a developer**."

**Keep it to 60–90 seconds.** Follow the order: who you are → education → skills and projects → what you want next.

**What they check:** communication, confidence and whether you can summarise yourself clearly. **Avoid** repeating your resume line by line or talking about family details at length.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Accenture',
          tip: `Practise it aloud 10 times and record yourself. It is the one answer you can fully prepare.`,
        },
        {
          q: `Walk me through your resume.`,
          a: `**Sample answer:**
"Sure. I start with my education: I did my **[degree] in [branch]** from [college], graduating in [year] with [CGPA]. Next are my **skills**: I am comfortable with [language], [framework] and [database]. My main project is **[your project]**, where I [what you built and your part in it]. I also did [internship / certification], where I learned [specific thing]. Finally, I have listed [achievements or activities], such as [one example]."

Move **top to bottom**, but spend most time on **projects and internships**, since that is where you prove skills.

**What they check:** that you actually know everything written on your resume. **Avoid** listing any skill or project you cannot explain in detail; interviewers love to pick those.`,
          d: 'easy',
          at: 'Cognizant, Capgemini',
        },
        {
          q: `How would your friends or classmates describe you?`,
          a: `**Sample answer:**
"My friends would say I am **dependable and calm**. During our final-year project, when a teammate fell sick before the review, I took over his module and we still submitted on time. They also say I am the person they come to when they are **stuck on a coding problem**, because I explain things patiently."

Pick **two qualities** that suit a workplace and back each one with a **small real example**.

**What they check:** self-awareness and how you behave in a team. **Avoid** one-word answers like "friendly" with no proof, or traits like "funny" that do not connect to work.`,
          d: 'easy',
        },
        {
          q: `Why did you choose engineering, and why your branch?`,
          a: `**Sample answer:**
"I always enjoyed **maths and solving problems**, so engineering felt natural. I chose [your branch] because [honest reason, e.g. I was curious about how circuits and systems work]. In my second year, I took a programming subject and realised I enjoy **building things with code** even more, so I started learning [language] on my own and built [your project]."

It is fine if a parent or ranking influenced your choice. Be honest but **end on what you genuinely enjoy now**.

**What they check:** whether your choices show curiosity and ownership. **Avoid** saying "my parents forced me" or "I had no other option" without showing what you did after that.`,
          d: 'easy',
        },
        {
          q: `Why do you want to move to IT when your branch is not Computer Science?`,
          a: `**Sample answer:**
"My branch is [Mechanical / ECE / Civil], and it taught me **logical thinking and structured problem solving**. In my [second] year I wrote my first program and really enjoyed it. Since then I have **put in real effort**: I learned [Java / Python], solved [number] problems on [platform], completed [course / certification] and built [your project]. IT also has wide opportunities, and I want to grow in software long-term. My core background will help me understand domains like [manufacturing / telecom] better when I build software for them."

**Show proof of effort**, not just interest.

**What they check:** whether this is a serious decision or a fallback. **Avoid** saying "core jobs pay less" or "there are no jobs in my branch" as your main reason.`,
          d: 'medium',
          at: 'TCS, Infosys, Wipro, HCLTech',
          tip: `Courses, projects and coding practice are your evidence. Mention at least two.`,
        },
        {
          q: `Tell me about your final-year project.`,
          a: `**Sample answer:**
"Our project was **[your project]**, which solves [problem] for [users]. We were a team of [number] and I handled **[your part, e.g. the backend APIs and database design]**. We used [technologies]. The biggest challenge was [challenge, e.g. slow search results], and I fixed it by [what you did, e.g. adding indexes]. In the end, [result, e.g. response time came down from 4 seconds to under 1 second]. I learned [one lesson]."

Use this flow: **problem → your role → tech → challenge → result → learning**.

**What they check:** your real contribution and depth. **Avoid** saying "we did everything together"; say clearly what **you** did. Be ready for "why did you choose this technology?"`,
          d: 'medium',
          at: 'Infosys, Accenture, Cognizant',
        },
        {
          q: `What do you do in your free time? What are your hobbies?`,
          a: `**Sample answer:**
"I enjoy **playing cricket** on weekends with friends; it keeps me active and I like the team spirit. I also **read tech blogs and watch tutorials** on [topic], and recently I have been [small learning activity, e.g. building a small expense tracker app for practice]. Sometimes I [another hobby, e.g. cook or sketch] to relax."

Mention **one or two genuine hobbies**, and if possible one that shows **learning or teamwork**.

**What they check:** that you are a balanced, real person, and sometimes they ask follow-up questions on your hobby. **Avoid** claiming hobbies you cannot talk about, or answers like "watching movies and sleeping".`,
          d: 'easy',
        },
        {
          q: `What is the one thing that is not on your resume that you want us to know?`,
          a: `**Sample answer:**
"Something not on my resume is that I **paid part of my college fees by giving tuition** to school students for two years. It taught me **time management and patience**, because I had to balance classes, my own studies and teaching. It is also why I enjoy explaining technical ideas simply to others."

Choose a story that shows a **quality useful at work**: responsibility, persistence, leadership or learning.

**What they check:** something personal that makes you memorable, and whether you can pick a relevant point. **Avoid** repeating something already on your resume or sharing very private matters.`,
          d: 'medium',
        },
      ],
    },
    {
      title: `Strengths, weaknesses and goals`,
      questions: [
        {
          q: `What are your strengths?`,
          a: `**Sample answer:**
"One of my main strengths is that **I learn new things quickly**. For example, for [your project] I had to use [new technology], which I had never used before. I learned the basics in about a week from the documentation and finished my module on time. My second strength is **consistency**: I have practised coding for [number] months almost every day."

Give **two strengths with one example each**. Pick strengths that matter for the job: learning ability, problem solving, teamwork, ownership.

**What they check:** self-awareness and proof. **Avoid** a long list of adjectives ("hardworking, honest, punctual, sincere...") with no examples.`,
          d: 'easy',
          at: 'TCS, Wipro, Capgemini',
        },
        {
          q: `What is your greatest weakness?`,
          a: `**Sample answer:**
"I sometimes **find it hard to say no** when people ask for help, and earlier this affected my own deadlines. During my [project / internship], I took on extra tasks and had to work late to finish my own work. Since then, I **plan my day with a to-do list** and check my time before agreeing to something extra. It has helped me stay helpful without missing my commitments."

Use the formula: **real weakness → example → what you are doing to improve**.

**What they check:** honesty and a growth mindset. **Avoid** fake weaknesses like "I am a perfectionist" or "I work too hard", and avoid weaknesses that are core to the job, like "I do not like coding".`,
          d: 'medium',
          at: 'Infosys, Accenture, Cognizant',
          tip: `Always spend more time on how you are fixing it than on the weakness itself.`,
        },
        {
          q: `Where do you see yourself in five years?`,
          a: `**Sample answer:**
"In five years, I see myself as a **skilled and trusted developer** who has worked on real client projects. In the first couple of years I want to build **strong fundamentals** in [technology] and understand how large projects work. After that, I would like to take more responsibility, such as **guiding new joiners or leading a small module**. I would like to grow within this organisation."

Keep it **realistic and connected to this company**.

**What they check:** ambition, stability and whether you plan to stay. **Avoid** "I want to do an MBA", "I will start my own company" or "I want your job"; these signal you may leave soon.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, HCLTech',
        },
        {
          q: `What are your short-term and long-term goals?`,
          a: `**Sample answer:**
"My **short-term goal** is to join a good organisation like yours, complete the training well and become a **productive member of my team** within my first year. I also want to earn a certification in [cloud / your technology]. My **long-term goal** is to become an **expert in [area, e.g. backend development]** and eventually lead a team that delivers quality software."

Short-term = **next 1–2 years**, long-term = **5+ years**. Both should sound like they fit in this company.

**What they check:** clarity of thought and alignment with the role. **Avoid** vague goals like "to be successful" or goals unrelated to IT.`,
          d: 'easy',
        },
        {
          q: `What motivates you?`,
          a: `**Sample answer:**
"I feel most motivated when I **solve a problem I was stuck on**. For example, in [your project], a bug took me two days to find, and the feeling when it finally worked was great. I am also motivated by **learning something new** and by seeing that my work is actually used by people, like when my [college app / project] was used by [number] students."

Give an honest motivator **linked to the work itself**, with an example.

**What they check:** what will keep you engaged on difficult days. **Avoid** saying only "money" or "promotions", even if they matter; they are fine to mention briefly but not as the only answer.`,
          d: 'easy',
        },
        {
          q: `Rate yourself out of 10 in your main programming language.`,
          a: `**Sample answer:**
"I would rate myself **6 or 7 out of 10 in [Java / Python]**. I am comfortable with **[OOP, collections, exception handling]** and I have used them in [your project]. I still need to get better at [advanced topics, e.g. multithreading and design patterns], and I am working on that through [course / practice]."

A **6–7** is the safe, honest range for a fresher. Always explain **what you know and what you are still learning**.

**What they check:** self-assessment and honesty. **Avoid** 9 or 10: the interviewer will then ask very hard questions. Avoid very low numbers too; they suggest low confidence.`,
          d: 'medium',
          at: 'TCS, Infosys, Wipro',
          tip: `Whatever number you give, expect technical follow-up questions to test it.`,
        },
        {
          q: `What is your biggest achievement so far?`,
          a: `**Sample answer:**
"My biggest achievement is **[achievement, e.g. our team reaching the finals of a state-level hackathon]**. We had 24 hours to build [what you built]. I worked on [your part]. Halfway through, our main feature broke, and I suggested a simpler approach that we could finish in time. We came **[position]** out of [number] teams. It taught me how to **stay calm under pressure and work as a team**."

It does not have to be huge. A **personal achievement with effort behind it** works well: clearing a tough subject, a certification, a project used by real people.

**What they check:** what you value and how you work towards it. **Avoid** achievements with no story, like only "I got 85% in 12th".`,
          d: 'hard',
        },
        {
          q: `What is one skill you are currently working to improve?`,
          a: `**Sample answer:**
"Right now I am improving my **data structures and problem solving**. I noticed I was slow with problems on trees and graphs, so I made a plan to solve **two problems every day** on [platform]. Over the last [two months], I have solved [number] problems, and I can now solve most medium-level problems in under 30 minutes. I am also working on my **spoken English** by practising mock interviews with friends."

Show a **specific skill, a specific plan and some progress**.

**What they check:** that you take responsibility for your growth. **Avoid** answers like "everything" or "nothing much"; both sound unprepared.`,
          d: 'hard',
        },
      ],
    },
    {
      title: `Behavioural (STAR) questions`,
      questions: [
        {
          q: `Tell me about a time you worked in a team.`,
          a: `**Sample answer (STAR):**
- **Situation:** "In my [semester] we had to build [project] in a team of four."
- **Task:** "I was responsible for [your part, e.g. the database and login module]."
- **Action:** "I set up a shared GitHub repo, suggested weekly check-ins and helped a teammate who was new to [technology]."
- **Result:** "We finished a week early and got [grade / appreciation]."

**STAR = Situation, Task, Action, Result.** Spend most of your time on the **Action** part, and say "I", not just "we".

**What they check:** whether you can collaborate, communicate and contribute. **Avoid** complaining about teammates or taking credit for everything.`,
          d: 'easy',
          at: 'Accenture, Cognizant, Capgemini',
          tip: `Prepare 4–5 STAR stories. One good story can answer several different questions.`,
        },
        {
          q: `Describe a situation where you had a conflict with a teammate. How did you handle it?`,
          a: `**Sample answer:**
"During our [project], a teammate and I **disagreed on the technology**: he wanted [option A] and I wanted [option B]. It started affecting our progress. I **suggested we each list the pros and cons** and discuss with our guide. We realised [option A] was better for our timeline, so I agreed and helped set it up. We finished on time, and we still work well together."

Show that you **listened, stayed respectful and focused on the goal**, not on winning.

**What they check:** maturity and how you handle disagreement. **Avoid** saying "I never had a conflict" (sounds unreal) or blaming the other person.`,
          d: 'medium',
          at: 'Infosys, Accenture',
        },
        {
          q: `Tell me about a time you failed. What did you learn?`,
          a: `**Sample answer:**
"In my [second] year, I **cleared the first round of a coding contest but failed the second round** because I had not practised timed problems. I felt bad, but I looked at where I lost time and realised I was weak in [topic]. I made a practice schedule, solved timed problems every weekend, and in the next contest I **reached the final round**. I learned that **preparation must match the real conditions**."

Choose a **real but not disastrous** failure, own it, and show **what changed afterwards**.

**What they check:** honesty, resilience and learning ability. **Avoid** blaming others or turning it into a hidden success with no real failure.`,
          d: 'medium',
          at: 'TCS, Infosys',
        },
        {
          q: `Describe a time when you had to meet a tight deadline.`,
          a: `**Sample answer:**
"Two days before our project submission, we found that our [module] was not working with the rest of the system. **I listed what was essential and what could wait**, and we agreed to drop one extra feature. I split the remaining work among the team, worked on the integration myself and tested it the night before. We **submitted on time** with all core features working. I learned to **prioritise** and to start integration earlier next time."

Show **planning, prioritising and calm action**, not just "I stayed up all night".

**What they check:** how you handle pressure. **Avoid** stories where you missed the deadline with no lesson.`,
          d: 'medium',
        },
        {
          q: `Tell me about a time you showed leadership.`,
          a: `**Sample answer:**
"I was the **coordinator for the coding event at our college tech fest**. We had [number] volunteers and two weeks to prepare. I divided work into problem setting, registrations and venue, held short daily updates and stepped in when the registration form broke a day before the event. Over **[number] students participated**, which was our highest ever."

Leadership does not need a title. **Taking initiative**, organising people or guiding a teammate all count.

**What they check:** ownership and ability to influence others. **Avoid** describing leadership as "I told everyone what to do"; show how you **helped the team succeed**.`,
          d: 'medium',
          at: 'Accenture, Deloitte',
        },
        {
          q: `Tell me about a time you had to learn something new very quickly.`,
          a: `**Sample answer:**
"During my internship at [company], I was asked to fix a feature written in **[technology], which I had never used**. I had three days. I went through the **official documentation**, watched a short tutorial, and read the existing code to understand the patterns. I also asked a senior one focused question when I was stuck instead of waiting. I **fixed the issue in two days** and my mentor appreciated it."

Mention **how** you learned: documentation, small experiments, asking good questions.

**What they check:** learnability, which matters a lot for freshers since technologies change. **Avoid** vague answers like "I learn fast" with no example.`,
          d: 'hard',
        },
        {
          q: `Describe a situation where you made a mistake at work or in a project. How did you handle it?`,
          a: `**Sample answer:**
"In my internship, I **accidentally pushed code that broke the login page** on the testing server. As soon as I noticed, I **informed my mentor immediately**, rolled back my change and then found the bug: I had not tested one case. I fixed it, added a test for that case and started **running all tests before every push**. My mentor said informing early was the right thing."

The key is: **admit quickly → fix it → prevent it next time**.

**What they check:** honesty and accountability, which matter more than the mistake. **Avoid** hiding the mistake in your story or blaming tools or others.`,
          d: 'hard',
          at: 'Infosys, Cognizant',
          tip: `Interviewers trust people who admit mistakes early. Make that the centre of your answer.`,
        },
        {
          q: `Tell me about a time you went beyond what was expected of you.`,
          a: `**Sample answer:**
"In our [project], my task was only to build the [module]. While testing, I noticed that our app was **very slow on mobile phones**, which no one had been asked to check. On my own time, I found the cause, [e.g. large images loading on every page], and fixed it. **Load time dropped by half**, and our guide mentioned it in the review."

Pick a story where you **noticed a problem nobody asked you to solve** and acted on it.

**What they check:** ownership and initiative. **Avoid** stories where going "beyond" means ignoring your own assigned work, or where the extra effort had no visible result.`,
          d: 'hard',
        },
      ],
    },
    {
      title: `Company, role and offer`,
      questions: [
        {
          q: `Why do you want to join our company?`,
          a: `**Sample answer:**
"I have read that [company] works with **clients across [industries / countries]**, so freshers get exposure to real, large projects. I am also impressed by your **training programme** for new joiners and your work in [area, e.g. cloud and digital services]. I want to start my career at a place where I can **learn properly and grow over the long term**, and [company] fits that."

**Research before the interview:** the company website, what it does, recent news, its values. Mention **two specific points**.

**What they check:** genuine interest and preparation. **Avoid** "it is a big company", "good salary" or "my friend works here" as your only reasons.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Accenture',
          tip: `Spend 20 minutes on the company website the day before. Note two facts you can mention.`,
        },
        {
          q: `Why should we hire you?`,
          a: `**Sample answer:**
"As a fresher, I bring **strong fundamentals in [language, DBMS, DSA]**, which I have applied in [your project]. I have shown that I can **learn quickly**, for example when I picked up [technology] during my internship. I am a good team player and I take ownership of my work. I am eager to learn and ready to put in the effort, so I believe I can **become productive quickly** and grow with your team."

Connect **your skills + proof + attitude** to what the role needs.

**What they check:** whether you can sell yourself confidently. **Avoid** comparing yourself to other candidates ("I am better than others") or saying "because I need a job".`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Cognizant',
        },
        {
          q: `What do you know about our company?`,
          a: `**Sample answer:**
"[Company] is a **[type, e.g. global IT services and consulting]** company, founded in [year], with headquarters in [city]. It serves clients in areas like [banking, retail, healthcare] and offers services such as [application development, cloud, testing]. Recently I read about [recent news, e.g. a new client deal or AI initiative]. I also know the company values [one value] and invests a lot in training freshers."

Cover: **what they do, size or reach, key services, one recent update, values**.

**What they check:** how serious you are about this company. **Avoid** reciting numbers you are unsure of; a wrong figure looks worse than a general statement.`,
          d: 'easy',
        },
        {
          q: `What are your salary expectations?`,
          a: `**Sample answer:**
"As a fresher, my main focus is on **learning and building a strong career**. I am sure the company has a **standard package for freshers in this role**, and I am comfortable with that. If you would like a figure, I have seen that freshers in similar roles typically get around **[the range you have researched for this role]**, and I would be happy with something in that range."

For **mass recruiters** (service companies), the package is usually fixed for freshers, so accepting the company standard is the best answer. For **product or startup roles**, research the role on job sites first.

**What they check:** whether your expectations are realistic. **Avoid** quoting a very high number without reason, or saying "anything is fine" in a way that sounds desperate.`,
          d: 'medium',
          at: 'TCS, Infosys, Wipro, Capgemini',
          tip: `Know the role's package before the interview. Most mass-recruiter offers are fixed, so do not negotiate there.`,
        },
        {
          q: `Are you willing to relocate to any of our locations?`,
          a: `**Sample answer:**
"Yes, I am **willing to relocate** to any location. I see it as a chance to **experience a new city and work culture**, and I am comfortable living independently. My family is also supportive of this."

If you truly have a constraint, be honest but flexible: "I am open to relocating. If there is an option, I would prefer [city] because [reason], but it will not stop me from joining."

**What they check:** flexibility. Service companies post freshers wherever projects need them. **Avoid** saying yes now and refusing later; it can cost you the offer. **Avoid** a flat "no" unless it is truly a deal-breaker for you.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, HCLTech, Cognizant',
        },
        {
          q: `Are you comfortable signing a bond or service agreement?`,
          a: `**Sample answer:**
"Yes, I am comfortable with it. I understand that the company **invests a lot in training freshers**, and a service agreement protects that investment. Since I am looking for a **long-term career** here, it is not a concern for me. Could you tell me the **duration and the terms**, so I understand it clearly?"

It is completely fine, and smart, to **ask for the details** (how long, what happens if you leave early). Read the agreement carefully before signing.

**What they check:** commitment and stability. **Avoid** reacting negatively or saying "I will leave if I get something better". Also, never hand over original certificates without understanding the terms in writing.`,
          d: 'medium',
          at: 'Wipro, HCLTech, Capgemini',
          tip: `Asking for the bond duration and terms is professional, not rude.`,
        },
        {
          q: `Are you ready to work in night shifts or rotational shifts?`,
          a: `**Sample answer:**
"Yes, I am open to working in shifts. I understand that IT companies serve **clients in different time zones**, and some projects need support at night or on rotation. I can **adjust my routine** for it. If possible, I would like to know what kind of shifts this role usually has, so I can plan."

If you have a genuine reason you cannot (health, safety, family responsibility), say it **politely and honestly** rather than agreeing and backing out later.

**What they check:** flexibility, especially for support, testing and infrastructure roles. **Avoid** an immediate "no" without a reason, or agreeing without meaning it.`,
          d: 'easy',
          at: 'TCS, Infosys, Wipro, Accenture',
        },
        {
          q: `Do you have any questions for us?`,
          a: `**Sample answer:**
"Yes, thank you. I have a couple of questions:
- **What does the training look like** for freshers in this role?
- What kind of **projects or technologies** would someone in my position usually start on?
- What qualities do your **most successful freshers** usually have?"

**Always ask one or two questions.** Saying "no questions" can look like low interest.

**What they check:** curiosity and interest in the role. **Avoid** asking about salary hikes, leave or work-from-home as your first question, and avoid questions already answered on the company website or earlier in the interview.`,
          d: 'medium',
          at: 'Accenture, Deloitte, Cognizant',
          tip: `Write three questions before the interview; at least one will still be unanswered at the end.`,
        },
      ],
    },
    {
      title: `Tricky and situational questions`,
      questions: [
        {
          q: `Can you explain the gap in your education or after graduation?`,
          a: `**Sample answer:**
"After graduating in [year], I took [duration] to **[honest reason, e.g. prepare for a government exam / handle a family responsibility / recover from an illness]**. During that time I also **kept building my skills**: I learned [language / framework], completed [course or certification] and built [your project]. Now I am fully focused on starting my career in IT."

Be **honest and brief**, then quickly move to **what you did to stay productive**.

**What they check:** that the gap was used reasonably and you are now committed. **Avoid** lying (background checks can find it), long emotional explanations, or saying "I was just sitting at home".`,
          d: 'medium',
          at: 'TCS, Infosys, Wipro',
          tip: `Explain the gap in two sentences, then talk about what you learned during it.`,
        },
        {
          q: `You had backlogs during your degree. Why, and how did you clear them?`,
          a: `**Sample answer:**
"Yes, in my [second] year I had a backlog in [subject]. At that time I **did not manage my time well** between [reason, e.g. hostel adjustment and too many activities]. I took it seriously, made a study plan, took help from a senior and **cleared it in the next attempt**. Since then, I have had **no backlogs** and my scores improved to [CGPA]."

**Own it, explain briefly, show you fixed it**, and point to your improvement after that.

**What they check:** honesty and whether it was a one-time issue. **Avoid** hiding it (it shows on marksheets) or blaming teachers. Check the company's eligibility rule on active backlogs before applying.`,
          d: 'medium',
          at: 'TCS, Wipro, Cognizant',
        },
        {
          q: `If you get a better offer after joining us, will you leave?`,
          a: `**Sample answer:**
"For me, a good offer is not only about salary. I am looking for a place where I can **learn, get good projects and grow over the long term**. If I join [company], I will **give my full commitment**, and I believe the growth here will matter more to me than a small salary difference elsewhere."

Stay **calm and positive**; this is a loyalty test.

**What they check:** commitment and honesty. **Avoid** "yes, of course I will leave" and also avoid an over-dramatic "I will never leave in my life", which sounds fake. Focus on **why you value this opportunity**.`,
          d: 'medium',
        },
        {
          q: `What would you do if your manager gave you a task you do not know how to do?`,
          a: `**Sample answer:**
"First, I would **make sure I understand the task clearly**, including the expected output and the deadline. Then I would **try to learn it myself** through documentation, internal resources or similar code in the project. If I am still stuck after a reasonable time, I would **ask a teammate or my manager a specific question**, showing what I have already tried. I would also keep my manager updated if it might affect the deadline."

Show the balance: **try on your own first, but do not stay stuck silently**.

**What they check:** problem solving and communication. **Avoid** "I would tell the manager I cannot do it" or "I would figure it out alone no matter how long it takes".`,
          d: 'medium',
          at: 'Infosys, Accenture',
        },
        {
          q: `What if you are placed in a technology or role you did not choose, like testing or support instead of development?`,
          a: `**Sample answer:**
"I would **accept it positively and give my best**. Every role teaches important skills: testing teaches me how software breaks, and support teaches how real users use it. These will make me a **better engineer** in the long run. While doing well in that role, I would keep improving my [development] skills and, over time, discuss growth opportunities with my manager."

**What they check:** flexibility and attitude. Freshers in large companies are often assigned based on project needs. **Avoid** saying "I will only do development" or showing disappointment; it can lead to rejection.`,
          d: 'hard',
          at: 'TCS, Infosys, Wipro, HCLTech',
          tip: `Say you are flexible now and ambitious later. Both can be true.`,
        },
        {
          q: `Why are you not placed yet when many of your classmates are?`,
          a: `**Sample answer:**
"In the early placement drives, I realised my **[aptitude speed / coding skills / communication]** was not strong enough. Instead of feeling discouraged, I **worked on it seriously**: I practised [specific activity] daily and built [your project]. Each interview has helped me improve, and I now feel **much better prepared**. I would rather join the right company than just any company."

Be honest, **do not compare yourself with friends**, and show **what you have improved**.

**What they check:** self-awareness and resilience after rejection. **Avoid** blaming the college, the companies or luck.`,
          d: 'hard',
        },
        {
          q: `Do you have any other offers? Are you interviewing elsewhere?`,
          a: `**Sample answer (if yes):**
"Yes, I have an offer from [company type, e.g. another IT services company] and I am in process with one more. But [this company] is **one of my top choices** because of [specific reason, e.g. your training and the domain of this role]."

**Sample answer (if no):**
"I am currently **in process with a few companies**, but I am very interested in this role because [reason]."

**Be honest**; you do not need to share every detail or names.

**What they check:** your market value and how serious you are about them. **Avoid** inventing fake offers to create pressure; it can easily backfire if they ask for details.`,
          d: 'easy',
        },
        {
          q: `If your manager asked you to do something you felt was wrong or unethical, what would you do?`,
          a: `**Sample answer:**
"First, I would **make sure I understood the request correctly**, because sometimes there is context I may not know. If it still seemed wrong, I would **respectfully raise my concern** with my manager and explain why I am uncomfortable. If it was clearly against company policy or the law, I would **not do it**, and I would follow the company's proper channel, like HR or the ethics helpline, to report it."

Show **respect for authority but firmness on integrity**.

**What they check:** your values and judgement. **Avoid** "I would do whatever my manager says", and also avoid jumping straight to complaining without first clarifying and talking.`,
          d: 'hard',
          at: 'Deloitte, Accenture',
        },
      ],
    },
  ],
};

export default book;
