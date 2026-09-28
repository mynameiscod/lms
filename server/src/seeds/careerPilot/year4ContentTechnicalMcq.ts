/**
 * T4_MCQ_PROGRAMMING, T4_MCQ_CORE_CS and T4_MCQ_ENGINEERING — sixteen units. Module P17.
 *
 * ── THE ROUND NOBODY PREPARES FOR SPECIFICALLY ────────────────────────────────────────────
 *
 * The written technical round is broad, fast and unforgiving of anything half-remembered. It sits
 * between aptitude and coding in most drives, and it eliminates candidates who would have passed
 * both — because it asks about twelve subjects at a depth where a vague memory produces a
 * confident wrong answer.
 *
 * Students prepare for coding rounds and for interviews. Very few prepare for this one, which
 * makes it disproportionately worth the hours.
 *
 * ── WHY IT IS ANSWERED FROM UNDERSTANDING RATHER THAN RECALL ──────────────────────────────
 *
 * The surface is too large to memorise. Twelve subjects, any of which might supply five questions,
 * and the questions are frequently about consequences rather than definitions: what this code
 * prints, what happens when this fails, which of these is not true.
 *
 * So the units below are built around working an answer out in twenty seconds rather than
 * retrieving it. A candidate who can derive what a process does from what a process IS will
 * outperform one who memorised a definition list, and the derivation is faster than it sounds.
 *
 * Attribution: T4_MCQ_PROGRAMMING defaults to PROGRAMMING_FUNDAMENTALS with the OOP unit on
 * OOP_CONCEPTS; T4_MCQ_CORE_CS to OPERATING_SYSTEMS with networking on COMPUTER_NETWORKS, DBMS on
 * DBMS_CONCEPTS and the timed set on COMPUTER_NETWORKS; T4_MCQ_ENGINEERING to GIT_FUNDAMENTALS
 * with the git-and-testing unit on TESTING_FUNDAMENTALS, SQL and security on SECURITY_FUNDAMENTALS
 * and the timed set on SQL_BASICS.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const TECHNICAL_MCQ_BUNDLES: PilotBundle[] = [
  /* ══ T4_MCQ_PROGRAMMING ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MCQ_PROGRAMMING_OUTPUT_PREDICTION',
    notes: `**Reading code the way the interpreter does**, including the parts that are easy to
skim.

## The discipline

**Trace it, do not read it.** Write the variables down and update them line by line. **Reading
produces what you expected the code to do**, which is the same failure as reviewing your own work,
and these questions are built on it.

**Twenty seconds of tracing beats five seconds of reading and being wrong.**

## What the questions are actually testing

**Mutability.** A list passed to a function and modified — does the caller see it? **Yes**, and the
question exists because people expect otherwise.

**Reference against copy.** \`b = a\` on a list is an alias. A slice is a copy. **Shallow copies
share their nested contents**, which is the harder version.

**Evaluation order and short-circuiting.** \`a and b\` does not evaluate \`b\` when \`a\` is false, and
questions exploit a side effect in \`b\` that therefore never happens.

**Default arguments.** A mutable default is created once at definition, shared across every call
that omits it. **It is the most-asked single trick in this family.**

**Scope.** Assigning to a name inside a function makes it local for the whole function, including
before the assignment line.

**Integer and string interning.** Small integers and some strings are cached, so identity
comparison sometimes succeeds and sometimes does not. **The lesson the question wants is that
identity and equality are different**, not the caching detail.

## The elimination technique

**Options that differ in one line tell you where to look.** If three options agree on the first
two lines and differ on the third, trace only the third.

**That turns a full trace into a partial one** and is the main speed gain available.`,
    mcqs: [
      mcq('A mutable default argument is created once at definition and shared across every call that omits it, which is described as:',
        [['The most-asked single trick in this family', true],
         ['A behaviour that varies between versions', false],
         ['Only relevant for recursive functions', false],
         ['Avoided by most modern style guides', false]],
        'It produces surprising accumulation across calls, which makes it a reliable way to distinguish tracing from assuming.'),
      mcq('If three options agree on the first two output lines and differ on the third, the efficient approach is to:',
        [['Trace only the third line', true],
         ['Trace the whole program carefully', false],
         ['Eliminate the option that differs most', false],
         ['Check the first two lines for correctness', false]],
        'The agreement establishes those lines are not in dispute, so the work reduces to whichever step the options disagree about.'),
    ],
    checkpoint: [
      mcq('Reading rather than tracing produces what you expected the code to do, which is described as the same failure as:',
        [['Reviewing your own work', true],
         ['Estimating how long a task will take', false],
         ['Testing only the paths you built', false],
         ['Debugging without a reproduction first', false]],
        'In both cases the mental model substitutes for what is actually written, so the discrepancy the question depends on stays invisible.'),
      mcq('For interning questions, the lesson the question wants is that identity and equality:',
        [['Are different', true],
         ['Coincide for all small values', false],
         ['Depend on the language version used', false],
         ['Should never be compared directly', false]],
        'The caching detail varies and is not the point; the transferable idea is that testing sameness and testing equal value are distinct operations.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_PROGRAMMING_OOP_MCQS',
    notes: `**Overriding, overloading, static, and the inheritance question everybody gets wrong
once.**

## Overriding against overloading

**Overriding** replaces a parent's method in a child. Same name, same signature, resolved at
runtime by the object's actual type.

**Overloading** is several methods with the same name and different parameters, resolved at
compile time by the arguments. **Python does not have it**, which is itself a question — a second
definition simply replaces the first.

**Confusing the two is the most common error on this topic**, and the distinguishing question is
when the resolution happens.

## The constructor chain

**A child's constructor runs the parent's first**, explicitly or implicitly. Questions present a
chain of three and ask the order of output, and the answer is parent-first on the way in.

## Static and instance

**A static method belongs to the class and receives no instance.** It cannot touch instance state,
which is the point.

**A class attribute is shared by every instance** — the same trap as the mutable default, one level
up, and it appears constantly.

## Polymorphism, concretely

**The same call producing different behaviour depending on the actual object.** Questions give a
parent-typed variable holding a child instance and ask which method runs. **The child's**, because
resolution is by the runtime type.

## The inheritance question everybody gets wrong once

**A method calling another method that the child has overridden.** The parent's code calls
\`self.process()\`, and the child's version runs — not the parent's — because the lookup starts from
the actual object.

**That is what makes inheritance couple a child to the parent's internals**, and the question is
really about that.

## Abstract and interface

**An abstract class cannot be instantiated and may hold implementation.** An interface is a
contract with none. Questions ask which can do what, and the answers follow directly from those
two sentences.`,
    mcqs: [
      mcq('Overriding and overloading are distinguished by when the resolution happens, namely:',
        [['Runtime for overriding, compile time for overloading', true],
         ['Compile time for both, by the declared type', false],
         ['Runtime for both, by the arguments supplied', false],
         ['Compile time for overriding, runtime for overloading', false]],
        'Overriding selects by the object’s actual type while executing; overloading selects by the argument types before execution.'),
      mcq('A parent method calling `self.process()` where the child has overridden it runs:',
        [['The child’s version, because lookup starts from the object', true],
         ['The parent’s version, since the call is in the parent', false],
         ['Both versions, parent first and then the child', false],
         ['Neither, raising an ambiguity error at runtime', false]],
        'Attribute lookup begins at the actual object’s type, so the override applies even to calls made from inherited code.'),
    ],
    checkpoint: [
      mcq('A class attribute shared by every instance is described as the same trap as the mutable default:',
        [['One level up', true],
         ['In a different language feature', false],
         ['Only when the attribute is a list', false],
         ['Except that it is resolved at compile time', false]],
        'Both create one object at definition time that every subsequent use shares, producing accumulation nobody intended.'),
      mcq('An abstract class differs from an interface in that an abstract class:',
        [['May hold implementation', true],
         ['Can be instantiated when it is complete', false],
         ['Cannot declare any abstract methods at all', false],
         ['Is resolved at runtime rather than compile time', false]],
        'Both cannot be instantiated, and the distinction is that an abstract class may provide code where an interface is a contract only.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_PROGRAMMING_TIMED_SET',
    notes: `**Thirty programming and OOP questions, twenty minutes.**

## Forty seconds each

**Which is enough to trace a short fragment and not enough to trace a long one.**

**So the first decision on every question is whether to trace or to eliminate**, and making it
quickly is most of the skill.

## When to eliminate rather than trace

**When two options are logically impossible.** An output claiming a variable is unchanged when the
code plainly assigns to it.

**When the options differ in one place.** Trace that place only.

**When the question is about a known trick.** Mutable default, class attribute, aliasing — recognise
it and answer without tracing, which takes five seconds instead of forty.

## The trap questions

**Code that looks like it has an error and does not**, where the correct answer is the ordinary
output and candidates select "error" because something felt wrong.

**Code that raises**, where the answer is the exception type and candidates trace to the end rather
than stopping at the line that throws.

**Read to the end before deciding** — a question with a \`finally\` or a caught exception behaves
differently from what the first half suggests.

## The marking

**Check whether there is negative marking before you start.** With four options and no
elimination, a pure guess is neutral at best; with one option ruled out it becomes worth taking.

## After the set

**Separate "did not know" from "knew and traced wrongly".**

**The first needs the material; the second needs the discipline of writing variables down**, and
they are different problems that students routinely treat as one.`,
    mcqs: [
      mcq('Recognising a known trick such as a mutable default and answering without tracing takes:',
        [['Five seconds instead of forty', true],
         ['The same time as a careful trace', false],
         ['Longer, but with greater reliability', false],
         ['Twenty seconds, half of the budget', false]],
        'The behaviour is known in advance, so the question reduces to identifying which trick is present rather than following the execution.'),
      mcq('Candidates select "error" on code that looks wrong and is not because:',
        [['Something felt wrong without being traced', true],
         ['The option is listed first in most papers', false],
         ['Error options are correct more often', false],
         ['The code uses unfamiliar syntax constructs', false]],
        'An impression of irregularity substitutes for verification, which is exactly the habit the question is constructed to detect.'),
    ],
    checkpoint: [
      mcq('Separating "did not know" from "knew and traced wrongly" matters because the second needs:',
        [['The discipline of writing variables down', true],
         ['More exposure to the same question types', false],
         ['A slower pace through the whole section', false],
         ['Revision of the underlying language rules', false]],
        'The knowledge is present and the execution failed, so the remedy is procedural rather than requiring the material to be relearned.'),
      mcq('For code that raises an exception, candidates commonly err by:',
        [['Tracing to the end rather than stopping at the throw', true],
         ['Selecting the exception type without tracing', false],
         ['Assuming the exception is always caught', false],
         ['Ignoring the lines before the failure point', false]],
        'Execution stops at the raising line unless it is caught, so continuing past it produces output the program never reaches.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_PROGRAMMING_INTERVIEW_QUESTION',
    notes: `**"What does this print?"** — asked verbally, with the code on a screen.

## Why it is asked in interviews too

**Because it is a fast, cheap check on whether somebody reads code carefully**, and it takes ninety
seconds.

**The written round wants the answer. The interview wants the trace.**

## The approach

**Say you are going to trace it**, then do so aloud. "After line one, x is 5. After line two, y
points at the same list as x."

**Narrating the trace is the answer**, and an interviewer will frequently stop you once the
reasoning is clear — which is a good outcome rather than an interruption.

## When you spot the trick immediately

**Say what it is.** "This is the mutable default argument, so the second call sees the first
call's list." **Naming it is worth more than the output alone**, because it demonstrates the
category is recognised rather than the instance worked out.

## When you are unsure

**Trace it properly and say where you are uncertain.** "I believe the closure captures the variable
rather than its value, so it prints three threes — but I would check that."

**That is a strong answer.** Stating uncertainty precisely is more useful than a confident wrong
one and considerably more useful than silence.

## The follow-ups

**"Why does it do that?"** The mechanism, not the observation. **This is the actual question**, and
the output was the route to it.

**"How would you fix it?"** For the classic traps there is a standard fix — a \`None\` default and a
fresh list inside, a default argument to capture the loop variable. Knowing them is expected.

## What loses marks

**Guessing without tracing.** It is visible, it is frequently wrong, and it answers a question about
carefulness in the negative.`,
    mcqs: [
      mcq('The written round wants the answer, where the interview wants:',
        [['The trace', true],
         ['A faster response to the question', false],
         ['The name of the language feature involved', false],
         ['A fix for the behaviour being shown', false]],
        'The verbal format allows the reasoning to be observed, which is what the question is being used to assess.'),
      mcq('Naming a recognised trick is worth more than the output alone because it demonstrates:',
        [['The category is recognised rather than the instance worked out', true],
         ['Familiarity with the language documentation', false],
         ['That the trace was performed correctly', false],
         ['Preparation specifically for this question', false]],
        'Recognising the class of behaviour transfers to other instances, where deriving one output does not.'),
    ],
    checkpoint: [
      mcq('Stating uncertainty precisely — "I believe the closure captures the variable, but I would check" — is described as:',
        [['A strong answer', true],
         ['Acceptable when time is short', false],
         ['Weaker than committing to an answer', false],
         ['An admission that costs marks overall', false]],
        'It conveys the reasoning and its limits accurately, which is more useful to the interviewer than a confident wrong answer or silence.'),
      mcq('"Why does it do that?" is described as the actual question, with the output being:',
        [['The route to it', true],
         ['A separate part of the assessment', false],
         ['The part most candidates get wrong', false],
         ['Sufficient on its own for full marks', false]],
        'The behaviour is a prompt for explaining the mechanism, which is what distinguishes understanding from having memorised the case.'),
    ],
  },

  /* ══ T4_MCQ_CORE_CS ═════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MCQ_CORE_CS_OS_QUESTIONS',
    notes: `**Operating systems at written-round depth** — what is actually asked, and how far.

## Process against thread

**A process has its own memory; threads within one share it.** That single sentence answers most
questions on the topic, including why threads are cheaper to create and why they can corrupt each
other.

**Context switching between processes is more expensive** because the memory mapping changes.

## Scheduling

**The algorithms by name and by property.** First-come-first-served is simple and suffers convoy
effects. Shortest-job-first is optimal for average waiting time and needs knowledge of the future.
Round-robin is fair and its quantum decides the trade between responsiveness and overhead.

**Questions ask which minimises average waiting time** — shortest-job-first — or **ask you to
compute it** for a small set, which is arithmetic rather than theory.

## Deadlock

**The four conditions: mutual exclusion, hold and wait, no preemption, circular wait.** All four
must hold, which is why preventing any one prevents deadlock.

**The commonest question names three and asks which is missing.**

## Memory

**Paging divides memory into fixed blocks and removes external fragmentation.** Segmentation uses
variable sizes and does not.

**Virtual memory lets a process address more than physically exists**, with pages swapped as
needed, and **thrashing is when swapping dominates useful work.**

**Page replacement algorithms**: FIFO, LRU, optimal. **Belady's anomaly** — more frames producing
more faults — applies to FIFO and not to LRU, and it is a favourite because it is counterintuitive.

## Synchronisation

**A race condition is unsynchronised access to shared state.** A mutex provides mutual exclusion;
a semaphore counts.

**Questions frequently ask what goes wrong rather than for a definition**, which is why
understanding beats memorising here.`,
    mcqs: [
      mcq('Context switching between processes is more expensive than between threads because:',
        [['The memory mapping has to change', true],
         ['Processes have larger stacks to save', false],
         ['The scheduler runs a different algorithm', false],
         ['Threads do not require a context switch', false]],
        'Threads share an address space, so switching between them leaves the mapping intact while switching processes must replace it.'),
      mcq('Belady’s anomaly — more frames producing more page faults — applies to:',
        [['FIFO but not to LRU', true],
         ['LRU but not to FIFO replacement', false],
         ['Both FIFO and LRU equally often', false],
         ['Optimal replacement in rare cases', false]],
        'FIFO lacks the stack property, so a larger frame count can evict differently and produce more faults, which LRU cannot.'),
    ],
    checkpoint: [
      mcq('All four deadlock conditions must hold, which is why:',
        [['Preventing any one prevents deadlock', true],
         ['Deadlock is rare in practice overall', false],
         ['Detection is preferred to prevention', false],
         ['Circular wait is the most important one', false]],
        'They are jointly necessary, so removing a single condition is sufficient to make deadlock impossible.'),
      mcq('Thrashing is described as:',
        [['Swapping dominating useful work', true],
         ['A process exceeding its memory limit', false],
         ['Pages being replaced in the wrong order', false],
         ['Two processes contending for one page', false]],
        'The system spends its time moving pages between memory and disk rather than executing, so throughput collapses.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_CORE_CS_NETWORKING_QUESTIONS',
    notes: `**Networking at written-round depth**, including the question every paper contains.

## The layers

**Know the order and what each does.** Physical, data link, network, transport, application — the
four in the middle are what questions are about.

**Which layer does X** is the commonest question form. Routing is network. Reliable delivery is
transport. MAC addresses are data link. Anything about the content is application.

## TCP against UDP

**TCP is reliable, ordered, connection-oriented and slower.** UDP is none of those and faster.

**Questions ask which suits a use case.** Video streaming and DNS are UDP; file transfer and web
pages are TCP. **The reasoning is whether losing a packet matters more than the delay of
retransmitting it**, and that framing answers any example.

## The handshake

**Three-way to open: SYN, SYN-ACK, ACK.** Four-way to close, because each direction closes
independently.

**Asked constantly**, and the reason for the difference between three and four is worth knowing:
closing is one-directional and opening is not.

## What happens when you type a URL

**DNS resolves the name. TCP connects. TLS negotiates if HTTPS. The request is sent. The response
returns. The browser renders and fetches sub-resources.**

**It is the single most asked networking question in any format**, and knowing the sequence is
expected.

## Addressing

**IP identifies a host; a port identifies a service on it.** NAT lets many private addresses share
one public one, and **DHCP assigns addresses automatically** — three facts that cover most of what
is asked.

## HTTP specifics

**Status code families.** Methods and which are safe or idempotent. **GET is safe, PUT and DELETE
are idempotent, POST is neither**, and that distinction appears in both networking and API
questions.`,
    mcqs: [
      mcq('Choosing between TCP and UDP for a use case turns on whether:',
        [['Losing a packet matters more than retransmission delay', true],
         ['The data is larger than a single packet', false],
         ['The connection crosses a public network', false],
         ['The application is interactive or batch', false]],
        'Reliability costs latency, so the decision is which of the two the application can least afford to lose.'),
      mcq('Closing a TCP connection takes four steps where opening takes three because closing is:',
        [['One-directional, so each side closes separately', true],
         ['Less reliable and needs an extra confirmation', false],
         ['Optional, which requires a negotiation first', false],
         ['Performed after the data has been acknowledged', false]],
        'Each direction is shut down independently, so the exchange requires a separate FIN and ACK for each rather than a combined step.'),
    ],
    checkpoint: [
      mcq('Among HTTP methods, GET is safe and PUT and DELETE are idempotent, while POST is:',
        [['Neither', true],
         ['Safe but not idempotent', false],
         ['Idempotent but not safe', false],
         ['Both safe and idempotent', false]],
        'POST creates a new result on each call, so repeating it changes state further rather than converging on the same outcome.'),
      mcq('"Which layer does X" is the commonest question form, and reliable delivery belongs to:',
        [['Transport', true],
         ['Network, alongside routing', false],
         ['Data link, with error detection', false],
         ['Application, where the content is', false]],
        'Retransmission and ordering are transport responsibilities, where the network layer concerns itself with reaching the destination at all.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_CORE_CS_DBMS_QUESTIONS',
    notes: `**DBMS at written-round depth, and the normalisation question that always appears.**

## Normal forms

**First: atomic values, no repeating groups.** **Second: no partial dependency on part of a
composite key.** **Third: no transitive dependency — no non-key attribute determining another.**

**The question gives a table and asks which form it satisfies**, and the method is mechanical:
check atomicity, then partial dependencies, then transitive ones, in that order. **Stopping at the
first failure gives the answer.**

**BCNF** is a stricter third normal form where every determinant is a candidate key. It appears
less often and is worth recognising.

## Keys

**A candidate key uniquely identifies a row; the primary key is the chosen one.** A foreign key
references another table's primary key. **A composite key uses more than one column**, and partial
dependency is only possible when one exists — which is why a table with a single-column key is
automatically in second normal form if it is in first.

## ACID

**Atomicity, consistency, isolation, durability.** Questions ask which property a scenario violates,
and the mapping is direct: a half-completed transaction is atomicity, a dirty read is isolation,
data lost after a commit is durability.

## Isolation levels and their anomalies

**Dirty read, non-repeatable read, phantom read**, in increasing order of isolation required to
prevent them. **The table of which level prevents which is worth memorising** because the questions
are drawn straight from it.

## Indexes and joins

**An index speeds reads and costs writes.** A clustered index determines physical order and there is
one per table.

**Join types by what they keep.** Inner keeps matches; left keeps all of the left. **A question
showing two small tables and asking the row count of a join is arithmetic**, and the trap is
duplicate keys multiplying rows.`,
    mcqs: [
      mcq('A table with a single-column primary key that is in first normal form is automatically in second normal form because partial dependency requires:',
        [['A composite key to be partial against', true],
         ['A transitive relationship between attributes', false],
         ['More than one candidate key to exist', false],
         ['A foreign key referencing another table', false]],
        'Partial dependency means depending on part of the key, which is impossible when the key has only one column.'),
      mcq('Data lost after a commit violates:',
        [['Durability', true],
         ['Atomicity of the transaction', false],
         ['Isolation from other transactions', false],
         ['Consistency of the database state', false]],
        'Durability guarantees that a committed change survives failure, so losing it afterwards is precisely that property failing.'),
    ],
    checkpoint: [
      mcq('The method for identifying normal form is mechanical — atomicity, then partial dependencies, then transitive — and the answer is given by:',
        [['Stopping at the first failure', true],
         ['Checking all three and taking the highest', false],
         ['Identifying the candidate keys first', false],
         ['Counting how many dependencies exist', false]],
        'The forms are cumulative, so the first condition that fails determines the highest form the table satisfies.'),
      mcq('In a question asking the row count of a join between two small tables, the trap is:',
        [['Duplicate keys multiplying the rows', true],
         ['Null values being excluded silently', false],
         ['The join type being left rather than inner', false],
         ['Columns appearing in both of the tables', false]],
        'Each matching pair produces a row, so a key appearing twice on one side doubles the rows contributed by its match.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_CORE_CS_TIMED_SET',
    notes: `**Thirty core CS questions across three subjects, twenty-five minutes.**

## The breadth problem

**Three subjects, any of which might supply a third of the paper**, and the distribution varies by
company.

**So preparing one thoroughly and ignoring the others is a worse strategy than covering all three
adequately**, which is the opposite of how students naturally revise.

## The derivation habit

**Most questions are answerable from a small number of facts plus reasoning.**

**A process has its own memory; threads share it.** From that: why threads are cheaper, why they
need synchronisation, why a process crash does not kill another process.

**TCP is reliable and ordered; UDP is not.** From that: every use-case question.

**The normal forms are cumulative.** From that: the identification method.

**Eight or ten such sentences cover most of what is asked**, and deriving is faster than recalling
a longer list under pressure.

## Question selection

**Answer what you know immediately, mark what needs derivation, skip what you do not know.**

**And do not derive for more than forty seconds** — a derivation that is not converging means the
underlying fact is missing, and no amount of reasoning supplies it.

## The calculation questions

**Average waiting time, page faults, join row counts, subnet ranges.** These are arithmetic and
reliably worth attempting, because they do not depend on remembering anything — only on doing the
procedure.

**They are also where careless errors concentrate**, so the working is worth writing down.

## After the set

**Score by subject.** A weakness in one subject is invisible in a combined score and is exactly
what needs the next session.`,
    mcqs: [
      mcq('Preparing one core CS subject thoroughly and ignoring the others is a worse strategy than covering all three adequately because:',
        [['The distribution varies by company', true],
         ['Each subject is equally likely to be tested', false],
         ['Deep knowledge is rarely required here', false],
         ['The subjects overlap substantially anyway', false]],
        'With an unknown split, a gap in one subject risks a third of the paper, where adequate coverage of all three bounds the loss.'),
      mcq('A derivation that is not converging within forty seconds indicates:',
        [['The underlying fact is missing', true],
         ['The question is unusually difficult', false],
         ['A calculation error was made earlier', false],
         ['The reasoning approach is inefficient', false]],
        'Derivation works from known facts, so failure to converge means the required fact is absent rather than the reasoning being slow.'),
    ],
    checkpoint: [
      mcq('Calculation questions such as average waiting time and page faults are reliably worth attempting because they:',
        [['Depend only on doing the procedure', true],
         ['Appear more frequently than theory questions', false],
         ['Carry more marks than the other types', false],
         ['Can be answered by estimation quickly', false]],
        'No recall is required beyond the method, so they are available to anybody who practises the procedure regardless of memory.'),
      mcq('Scoring by subject rather than in aggregate matters because a weakness in one subject is:',
        [['Invisible in a combined score', true],
         ['Unlikely to affect the overall result', false],
         ['Compensated by strength in the others', false],
         ['Best addressed after the other two', false]],
        'An aggregate can look adequate while one subject is failing entirely, which is exactly the gap the next session should target.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_CORE_CS_INTERVIEW_QUESTION',
    notes: `**"Explain what happens when you type a URL into a browser."**

## Why this specific question

**Because it can be answered in thirty seconds or thirty minutes**, and the interviewer controls
which by how far they push. It is a depth probe disguised as a standard question.

## The answer, at the level to start

**DNS resolves the name to an address. A TCP connection is opened. TLS is negotiated if HTTPS. The
HTTP request is sent. The server responds. The browser parses the HTML and requests the
sub-resources. It renders.**

**Seven steps, about forty-five seconds.** Then stop and let them choose where to go deeper.

## Where they will push

**"How does DNS actually resolve?"** Cache, then resolver, then root, then top-level, then
authoritative.

**"What is in the TCP handshake?"** Three-way, and why.

**"What does TLS negotiate?"** A shared key, using the certificate to establish trust. **Knowing it
is asymmetric to exchange and symmetric thereafter is the depth marker**, and the reason is speed.

**"What happens if the server is slow?"** Timeouts, and what the browser shows.

**"How does the browser know what to render first?"** Parsing, the render-blocking resources, and
why script placement matters.

## The technique

**Give the outline, then go deeper only where asked.** A candidate who begins with DNS packet
structure has misjudged the level and will spend the whole answer in one step.

## What this question is really assessing

**Breadth with available depth.** Whether you know that each step is a whole subject and can enter
any of them. **Saying "each of these is a large topic — where would you like me to go?" is a
legitimate and good move** after the outline.`,
    mcqs: [
      mcq('This question is described as a depth probe disguised as a standard question because it can be answered in thirty seconds or thirty minutes and the interviewer controls which by:',
        [['How far they push', true],
         ['The time allotted to the round', false],
         ['Which layer they ask about first', false],
         ['Whether they specify HTTPS or HTTP', false]],
        'The outline is short and every step opens into a subject, so the depth reached is chosen by the follow-ups rather than by the candidate.'),
      mcq('A candidate who begins with DNS packet structure has:',
        [['Misjudged the level and will stay in one step', true],
         ['Demonstrated unusual depth of knowledge', false],
         ['Answered the question more thoroughly', false],
         ['Chosen a reasonable place to start from', false]],
        'Opening at maximum depth consumes the answer on the first step and never reaches the breadth the question is primarily assessing.'),
    ],
    checkpoint: [
      mcq('The TLS depth marker is knowing that the exchange is asymmetric and thereafter symmetric, and the reason is:',
        [['Speed', true],
         ['Certificate validation requirements', false],
         ['Compatibility with older clients', false],
         ['The key length that is supported', false]],
        'Asymmetric operations are computationally expensive, so they are used only to establish a shared key for the faster symmetric encryption.'),
      mcq('Saying "each of these is a large topic — where would you like me to go?" after the outline is described as:',
        [['A legitimate and good move', true],
         ['A way of avoiding the harder details', false],
         ['Acceptable only if time is running short', false],
         ['Something that shifts the work to the interviewer', false]],
        'It demonstrates awareness that each step has depth available and lets the interviewer direct the probe efficiently.'),
    ],
  },

  /* ══ T4_MCQ_ENGINEERING ═════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_MCQ_ENGINEERING_GIT_AND_TESTING_MCQS',
    notes: `**What merge, rebase and reset actually do, and what the test pyramid is for.**

## The three Git commands questions are about

**Merge** creates a commit with two parents and preserves both histories.

**Rebase** replays your commits on top of another branch, producing a linear history and **new
commits with different hashes** — which is why rebasing shared branches is discouraged and why
that is the most-asked question on the topic.

**Reset** moves the branch pointer. **Soft keeps the changes staged, mixed keeps them unstaged,
hard discards them** — and the three-way distinction is asked directly and constantly.

## The others worth knowing

**Fetch downloads without merging; pull does both.** **Cherry-pick applies one commit elsewhere.**
**Revert creates a new commit undoing an old one**, which is the safe alternative to reset on a
shared branch because it does not rewrite history.

**Stash sets uncommitted work aside.** **Reflog records where HEAD has been**, which is what makes
most mistakes recoverable.

## The test pyramid

**Many unit tests, fewer integration tests, very few end-to-end.**

**The reason is cost and speed**, and questions ask which layer a given test belongs to or why the
shape is that way. **An inverted pyramid — mostly end-to-end — is slow and fragile**, which is the
answer to "what is wrong with this test suite".

## Testing terms

**A stub returns a canned value; a mock also asserts it was called.** **A fixture is the prepared
state.** **Regression testing checks that what worked still works.**

**Coverage measures lines executed, not behaviour verified** — and that distinction appears as a
question, with the correct answer being that full coverage does not imply correctness.

## Test-driven development

**Red, green, refactor.** Questions ask the order, and the answer is that the failing test comes
first.`,
    mcqs: [
      mcq('Rebasing produces new commits with different hashes, which is why:',
        [['Rebasing shared branches is discouraged', true],
         ['The history becomes harder to read afterwards', false],
         ['Merge conflicts occur more frequently', false],
         ['The original commits cannot be recovered', false]],
        'Collaborators hold the original commits, so replacing them causes divergence that each has to resolve manually.'),
      mcq('Reset with soft, mixed and hard differ in that soft keeps changes staged, mixed keeps them unstaged, and hard:',
        [['Discards them', true],
         ['Stashes them automatically first', false],
         ['Commits them to the new position', false],
         ['Leaves the working directory untouched', false]],
        'Hard resets the working directory as well as the index, so uncommitted work is lost rather than preserved in either state.'),
    ],
    checkpoint: [
      mcq('Revert is the safe alternative to reset on a shared branch because it:',
        [['Does not rewrite history', true],
         ['Preserves the original commit message', false],
         ['Can be applied to several commits at once', false],
         ['Automatically resolves any conflicts found', false]],
        'It adds a new commit undoing the change, so collaborators’ existing history remains valid rather than diverging.'),
      mcq('Coverage measures lines executed rather than behaviour verified, and the correct answer to the question this raises is that:',
        [['Full coverage does not imply correctness', true],
         ['Coverage should always be maximised anyway', false],
         ['Uncovered lines are the only real risk', false],
         ['Coverage and correctness are closely related', false]],
        'A test can execute every line and assert nothing, so the metric records reach rather than whether anything was checked.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_ENGINEERING_SQL_AND_SECURITY_MCQS',
    notes: `**Join semantics, aggregate behaviour, and the vulnerability names every paper
expects.**

## The SQL questions

**Join row counts.** Two small tables and a join — the answer is arithmetic, and duplicates
multiply.

**NULL handling, which is the most common trap.** \`NULL = NULL\` is not true. \`WHERE x != 'a'\`
excludes rows where x is NULL. \`COUNT(column)\` skips NULLs where \`COUNT(*)\` does not.

**Aggregates and GROUP BY.** Every selected column must be grouped or aggregated. **HAVING filters
groups; WHERE filters rows**, and which runs first is asked directly — WHERE first, then grouping,
then HAVING.

**The execution order** is worth knowing because several questions depend on it: FROM, WHERE, GROUP
BY, HAVING, SELECT, ORDER BY. **Which is why an alias defined in SELECT cannot be used in WHERE.**

**DELETE against TRUNCATE against DROP.** Rows, all rows quickly without logging each, and the
table itself.

## The security questions

**The names and what each is.** SQL injection — untrusted input becoming part of a query.
Cross-site scripting — untrusted input rendered as markup. Cross-site request forgery — a request
issued from another site using the victim's credentials. **Broken access control — the most common
in practice** and the least often listed.

**The mitigations, which is what distinguishes the question from trivia.** Parameterised queries,
not escaping. Output encoding by context. A token for forgery. Server-side authorisation, always.

**Hashing against encryption.** Passwords are hashed with a slow algorithm; encryption is
reversible and therefore wrong for passwords. **This appears in almost every paper.**

**HTTPS provides confidentiality and integrity in transit** and says nothing about the application
being secure, which is a distinction questions probe.`,
    mcqs: [
      mcq('An alias defined in SELECT cannot be used in WHERE because the execution order is:',
        [['FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY', true],
         ['SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY', false],
         ['FROM, SELECT, WHERE, GROUP BY, HAVING, ORDER BY', false],
         ['WHERE, FROM, SELECT, GROUP BY, ORDER BY, HAVING', false]],
        'WHERE is evaluated before SELECT, so the alias does not yet exist when the filter is applied.'),
      mcq('Passwords are hashed with a slow algorithm rather than encrypted because encryption is:',
        [['Reversible, so a key compromise exposes them', true],
         ['Slower than hashing for the same input', false],
         ['Unable to handle inputs of variable length', false],
         ['Not available in most database systems', false]],
        'A key that can decrypt them exists, so obtaining it reveals every password, where a hash has no such key.'),
    ],
    checkpoint: [
      mcq('Among the named vulnerabilities, the one described as most common in practice and least often listed is:',
        [['Broken access control', true],
         ['Cross-site request forgery', false],
         ['SQL injection of user input', false],
         ['Cross-site scripting in rendered output', false]],
        'Failures to check ownership are widespread in real systems while receiving less attention than the injection classes.'),
      mcq('HTTPS provides confidentiality and integrity in transit and says nothing about:',
        [['The application being secure', true],
         ['The identity of the server involved', false],
         ['Whether the data is tampered with', false],
         ['The encryption of the connection itself', false]],
        'It protects the channel, so an application with broken authorisation is equally exploitable over an encrypted connection.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_ENGINEERING_TIMED_SET',
    notes: `**Twenty-five engineering questions, twenty minutes.**

## What this section rewards

**Practical familiarity over study.** A candidate who has actually used Git, written tests and
written queries answers most of these from experience; one who revised them from a list is slower
and less reliable.

**Which is a reason to treat the engineering build in P03 as preparation for this**, rather than as
unrelated work.

## The question mix

**Git commands and their effects. Testing terminology and the pyramid. SQL semantics, particularly
NULL and grouping. Security names and mitigations.**

**The SQL questions are the most computational** and the most worth slowing down for, because the
arithmetic of a join or the behaviour of a NULL is deterministic and gettable.

## The trap questions

**"Which of these is NOT true"**, which inverts the usual reading. **Read the stem twice** — this
phrasing accounts for a noticeable share of wrong answers among candidates who knew the material.

**Options that are true statements but do not answer the question asked.** Common in the security
questions, where a correct fact about a different vulnerability is offered.

## Where marks are cheapest

**The mitigation questions.** Parameterised queries, output encoding, tokens, server-side checks —
**four answers that cover most of the security section** and are memorable because each is tied to
a specific attack.

## After the set

**Any question you got wrong on something you have actually used is worth a note**, because it
means the practical familiarity has a gap the daily work did not expose — and those are the ones
that recur.`,
    mcqs: [
      mcq('This section rewards practical familiarity over study, which is a reason to treat the engineering build in P03 as:',
        [['Preparation for this section', true],
         ['A separate area of the curriculum', false],
         ['Less relevant than dedicated revision', false],
         ['Useful only for the interview rounds', false]],
        'Questions about Git, testing and SQL are answered fastest from having used them, so the build work directly supplies the familiarity.'),
      mcq('"Which of these is NOT true" accounts for a noticeable share of wrong answers among candidates who:',
        [['Knew the material', true],
         ['Were running short of time', false],
         ['Had revised from a summary list', false],
         ['Guessed without reading the options', false]],
        'The inverted phrasing is misread rather than misunderstood, so the knowledge is present and the answer is still wrong.'),
    ],
    checkpoint: [
      mcq('The cheapest marks in this section are described as the mitigation questions because four answers cover most of the security section and each is:',
        [['Tied to a specific attack', true],
         ['Repeated across several questions', false],
         ['Shorter than the alternatives offered', false],
         ['Listed in the same order each time', false]],
        'The association between an attack and its correct defence is small, memorable and directly asked, which makes it high return per minute revised.'),
      mcq('A wrong answer on something you have actually used is worth a note because it means the practical familiarity:',
        [['Has a gap the daily work did not expose', true],
         ['Was acquired too recently to be reliable', false],
         ['Is less useful than formal study would be', false],
         ['Applies to a different tool than was asked', false]],
        'Routine use exercises a subset of the behaviour, so the untouched parts remain unknown and recur as errors.'),
    ],
  },
  {
    unitCode: 'T4_MCQ_ENGINEERING_CHECKPOINT',
    notes: `**Whether the written technical round is survivable.**

## The bar

**Across the three topics: thirty questions in twenty-five minutes, at least twenty-two
correct**, with the calculation questions attempted and the derivable ones derived rather than
guessed.

## What a weak result means

**Programming wrong**: tracing, not knowledge. Write the variables down. **It is a procedural fix.**

**Core CS wrong, in one subject**: that subject. The aggregate hides it, which is why the timed
set scores by subject.

**Core CS wrong, across all three**: the derivation sentences are missing. **Eight or ten facts,
learned properly, cover most of what is asked** — and that is a short list rather than three
syllabuses.

**Engineering wrong**: usually practical exposure rather than revision. The fix is using the tools,
which is what P03 and P14 provide anyway.

## Why this module is worth the hours

**Because almost nobody prepares for this round specifically.** Students prepare for coding and for
interviews, and the written technical round eliminates people who would have passed both.

**It is the highest-return preparation in the placement module per hour**, on the straightforward
grounds that the competition has not done it.

## What this feeds

**The written round of most drives**, which sits between aptitude and coding and is where a
surprising proportion of eliminations happen.

**P23's simulation**, whose second round is this.

**And, incidentally, the technical interview** — every fact here is a fact an interviewer may ask
about conversationally, where the same understanding answers a differently-shaped question.`,
    checkpoint: [
      mcq('Core CS wrong across all three subjects indicates the derivation sentences are missing, which is described as:',
        [['A short list rather than three syllabuses', true],
         ['A reason to revise each subject fully', false],
         ['Best addressed one subject at a time', false],
         ['Less serious than a single-subject gap', false]],
        'Eight or ten facts support most of what is asked, so the remedy is bounded rather than requiring the whole of three subjects.'),
      mcq('This module is described as the highest-return preparation in the placement module per hour on the grounds that:',
        [['The competition has not done it', true],
         ['The questions are easier than elsewhere', false],
         ['It carries more weight in the scoring', false],
         ['The material overlaps with other rounds', false]],
        'Students prepare for coding and interviews, so effort here produces separation that the same effort elsewhere would not.'),
      mcq('Programming questions answered wrongly indicate tracing rather than knowledge, which is:',
        [['A procedural fix', true],
         ['A gap requiring language revision', false],
         ['Addressed by attempting more questions', false],
         ['Usually caused by insufficient time', false]],
        'The behaviour is understood and the execution was not followed, so writing the variables down resolves it without new learning.'),
      mcq('The written technical round sits between aptitude and coding and is where:',
        [['A surprising proportion of eliminations happen', true],
         ['The scoring weight is lowest overall', false],
         ['Candidates are given the most time', false],
         ['Only core CS knowledge is assessed', false]],
        'It eliminates candidates who would have passed both neighbouring rounds, because its breadth exposes anything half-remembered.'),
    ],
  },
];
