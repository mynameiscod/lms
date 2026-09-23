/**
 * T2_DIRECTION and T2_COMMUNICATION — eleven units. Year 2.
 *
 * ── WHERE THE TRACK CHOICE HAPPENS ────────────────────────────────────────────────────────
 *
 * T2_DIRECTION is short on purpose. Five units, ending in a checkpoint, and then the student is on
 * one of seven tracks for the rest of the year. Year 1 explored; this chooses, and the difference
 * is that the evidence now exists.
 *
 * T2_COMMUNICATION is the topic students skip and employers weigh most heavily. A second-year who
 * can explain a decision, ask a question well and write a message somebody can act on is more
 * useful on a team than one who is a little faster at writing code, and every hiring manager says
 * so in almost those words.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const DIRECTION_BUNDLES: PilotBundle[] = [
  /* ── T2_DIRECTION ───────────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_DIRECTION_WHAT_CHANGED',
    notes: `You now have something you did not have a year ago: evidence about yourself. This unit is
about reading it rather than guessing.

**What counts as evidence:**

- **Where your skill records are strongest**, and where practice was repeatedly scheduled
- **Which units you finished quickly**, and which you avoided
- **What you built when nobody set the brief** — the independent project is unusually informative
- **What you kept doing after the assignment was submitted**
- **Which bugs you enjoyed chasing**, which is a stranger and more reliable signal than it sounds

**What does not count:** what you are supposed to enjoy, what pays best, what your friends chose,
and what you said in month one before you had tried any of it.

**Write down four things, with an example for each:**

1. **What came easily.** Not what you liked — what you found straightforward while others did not.
2. **What was hard and got better.** This is often where the real aptitude is, because you have
   proved you can build capability there.
3. **What was hard and stayed hard.** Note it honestly; it is information, not a verdict.
4. **What you did voluntarily.** The strongest signal in the list.

**Enjoyment and aptitude usually agree, and not always.** People tend to enjoy what they are good at
because competence is pleasant. When they genuinely diverge — you are good at something you dislike,
or slow at something that fascinates you — interest usually wins over a year, because interest
generates the hours.

**Beware two misreadings.** The first unit of a topic being hard means very little; every topic is
hard at the start. And a topic taught badly, or met while you were ill or busy, tells you about the
circumstances rather than about you.

**You are choosing a starting direction, not a career.** People move between these tracks
constantly, and the skills transfer heavily. This choice decides the next several months, not the
next several decades.`,
    mcqs: [
      mcq('The strongest signal about your own direction is usually:',
        [['What you built when nobody set the brief', true],
          ['Which topics you scored highest in overall', false],
          ['Which subject your friends enjoyed most', false],
          ['Which direction pays best for graduates', false]],
        'Voluntary work is the one nobody can talk themselves into.'),
      mcq('"Hard, and got better" is worth noting because:',
        [['It proves you can build capability in that area', true],
          ['It shows the material was taught badly', false],
          ['It means the topic will always be effortful', false],
          ['It balances out the topics that came easily', false]],
        'Often where the real aptitude is hiding.'),
      mcq('When interest and aptitude genuinely diverge, interest usually wins because:',
        [['Interest generates the hours that build the skill', true],
          ['Aptitude tests measure the wrong things', false],
          ['Employers hire on enthusiasm', false],
          ['Skill gaps close without practice', false]],
        'Over a year, the hours decide more than the starting point did.'),
      mcq('Finding the first unit of a topic hard tells you:',
        [['Very little — every topic is hard at the start', true],
          ['That the topic is a poor fit', false],
          ['That prerequisites are missing', false],
          ['That more practice is needed there', false]],
        'Judge a topic by the middle, not by its opening.'),
    ],
    checkpoint: [
      mcq('Choosing a track decides:',
        [['The next several months, not a whole career', true],
          ['The kind of work you will do for years', false],
          ['Which employers will consider you', false],
          ['Which further study is available later', false]],
        'People move between these constantly, and the skills transfer heavily.'),
      mcq('A topic met while you were ill or overloaded tells you about:',
        [['The circumstances rather than about you', true],
          ['Your resilience under pressure', false],
          ['Your genuine aptitude for it', false],
          ['How the topic is normally experienced', false]],
        'Discount it, or revisit it before deciding.'),
    ],
  },

  {
    unitCode: 'T2_DIRECTION_ROLES_IN_DEPTH',
    notes: `Job titles tell you almost nothing. What matters is what the work is actually like on an
ordinary Tuesday, and the seven directions differ enormously on that.

**Backend.** Designing endpoints, writing queries, debugging why something is slow, reviewing
changes, deciding how data should be stored. Mostly invisible work; the reward is a system that
holds up. Suits people who like correctness and systems that fit together.

**Frontend.** Building interfaces, making them work on every screen and for every user, handling
loading and error states, arguing about behaviour with designers. Immediate feedback — you see what
you made. Suits people who like visible results and care how things feel to use.

**Data analysis.** Cleaning data that arrived wrong, answering questions with SQL, building charts,
explaining to somebody non-technical what a number does and does not mean. Half the job is
communication. Suits people who like finding out what is true.

**Machine learning.** Preparing data, training models, evaluating them honestly, discovering the
result was too good because something leaked. Far more data preparation than modelling, which
surprises most people. Suits people comfortable with uncertainty and statistics.

**Mobile.** Building screens, handling a phone that loses connection and gets interrupted, dealing
with app store processes and two platforms. Constrained and tangible. Suits people who like
polishing something people hold in their hand.

**Cloud and operations.** Deploying, automating pipelines, monitoring, being the person who fixes it
when it breaks at an inconvenient hour. High leverage, and some on-call. Suits people who like
automating away their own work.

**Security.** Reviewing systems for weaknesses, testing with permission, responding to incidents,
explaining risk to people who would rather not hear it. Adversarial and detail-heavy. Suits people
who enjoy thinking about how things fail.

**Two things every one of them shares:** more reading of existing code than writing of new code, and
more time spent in conversation than students expect.

**The best way to check any of this** is to find somebody doing the job and ask what their last week
actually contained. Descriptions are written by recruiters; weeks are not.`,
    mcqs: [
      mcq('The part of machine learning work that surprises most people is:',
        [['How much of it is data preparation rather than modelling', true],
          ['How much mathematics is required daily', false],
          ['How rarely models are retrained', false],
          ['How little code is involved overall', false]],
        'Along with discovering a flattering result came from a leak.'),
      mcq('Roughly half of a data analyst\'s job is:',
        [['Communicating what a number means and does not mean', true],
          ['Writing increasingly advanced SQL queries', false],
          ['Building dashboards for other teams', false],
          ['Maintaining the data pipelines themselves', false]],
        'Which is why the communication topic matters for that track particularly.'),
      mcq('What every one of the seven directions shares is:',
        [['More reading of existing code than writing new code', true],
          ['A similar amount of mathematics', false],
          ['The same tools and frameworks', false],
          ['An equal amount of on-call work', false]],
        'And more conversation than students expect.'),
      mcq('The most reliable way to learn what a role is really like is to:',
        [['Ask somebody doing it what their last week contained', true],
          ['Read several job descriptions for it', false],
          ['Follow practitioners on social media', false],
          ['Compare starting salaries across the roles', false]],
        'Descriptions are written by recruiters; weeks are not.'),
    ],
    checkpoint: [
      mcq('Cloud and operations work is characterised by:',
        [['High leverage automation, and some on-call', true],
          ['Mostly writing application features', false],
          ['Little interaction with other teams', false],
          ['Predictable hours with no interruptions', false]],
        'Suits people who like automating away their own work.'),
      mcq('Frontend work differs from backend most obviously in:',
        [['The immediacy of seeing what you made', true],
          ['The amount of testing required', false],
          ['The need to handle errors', false],
          ['The importance of performance', false]],
        'Backend work is mostly invisible; the reward is a system that holds.'),
    ],
  },

  {
    unitCode: 'T2_DIRECTION_MARKET',
    notes: `Interest tells you what you would enjoy. The market tells you what you can actually get
as a second-year, and those are different questions that both deserve an answer.

**How to find out, rather than assume:**

1. **Search real openings** on job sites for internships and junior roles, filtered to where you can
   actually work.
2. **Count them per direction.** Not impressions — counts, from a real search, on a real day.
3. **Read what they ask for**, and note how often each skill appears.
4. **Note the entry level.** Some directions hire juniors readily; others mostly do not.

**What you will generally find in India**, and you should verify rather than take this on trust:

- **Backend and full-stack** have the most junior openings by a wide margin
- **Frontend** is close behind, and often the easiest to demonstrate with a portfolio
- **Data analysis** has good entry-level demand, frequently outside technology companies
- **Machine learning** advertises heavily and hires few juniors — most postings want a master's
  degree or experience
- **Mobile** is steady, and smaller
- **Cloud and DevOps** rarely hire true juniors; it is commonly a second role after backend
- **Security** similarly prefers some experience first, with a few graduate schemes

**Read that honestly.** A direction that hires few juniors is not closed to you, but it needs a plan:
enter through an adjacent role, or build unusually strong evidence, and expect it to take longer.

**Location matters.** Openings concentrate in a few cities, and remote junior roles are less common
than remote senior ones.

**Demand moves**, but slowly enough that a year-long plan is reasonable to make on current data.

**Do not choose purely on the count.** A direction you find dull, entered because it advertises well,
produces somebody who interviews without enthusiasm and leaves within two years. Use the market to
inform the choice and to plan the route, not to make the decision for you.`,
    mcqs: [
      mcq('The right way to assess demand for a direction is to:',
        [['Count real openings from a real search on a real day', true],
          ['Read industry reports on hiring trends', false],
          ['Ask which direction sounds most in demand', false],
          ['Compare the salaries advertised for each', false]],
        'Impressions about hiring are unusually unreliable.'),
      mcq('Machine learning is described as advertising heavily and hiring few juniors, which means:',
        [['Entry usually needs a plan, not just interest', true],
          ['The direction should be avoided entirely', false],
          ['The advertised roles are not genuine', false],
          ['A portfolio is enough to compensate', false]],
        'An adjacent entry, or unusually strong evidence, and more time.'),
      mcq('Cloud and DevOps roles are commonly reached:',
        [['As a second role, after backend experience', true],
          ['Directly from a graduate programme', false],
          ['Through certification alone', false],
          ['Only at large companies', false]],
        'Security is similar, with a few graduate schemes.'),
      mcq('Choosing a direction purely on the number of openings produces:',
        [['Somebody who interviews without enthusiasm and leaves early', true],
          ['The fastest route to employment', false],
          ['A safe choice with no downside', false],
          ['The best long-term earnings', false]],
        'Use the market to plan the route, not to make the decision.'),
    ],
    checkpoint: [
      mcq('Junior openings are concentrated:',
        [['In a few cities, with little remote work', true],
          ['Evenly across the country', false],
          ['Mostly in remote positions', false],
          ['In technology companies only', false]],
        'Location is part of the plan, not a detail.'),
      mcq('Frontend is described as often easiest to demonstrate because:',
        [['A portfolio shows the work directly', true],
          ['The interviews are less technical', false],
          ['The skills are quicker to learn', false],
          ['Employers ask for fewer requirements', false]],
        'Visible work is easier evidence than invisible work.'),
    ],
  },

  {
    unitCode: 'T2_DIRECTION_COMPARING',
    notes: `You have narrowed it to two. This unit is about comparing them on the same terms rather
than on whichever considerations happen to come to mind.

**Score each on the same six**, one to five, with a note explaining the number:

| | Direction A | Direction B |
|---|---|---|
| **Interest** — would I do this on a Saturday? | | |
| **Evidence** — what does my record actually show? | | |
| **Opportunity** — junior openings I could reach | | |
| **Effort to competence** — how far from employable | | |
| **The daily work** — having read what a Tuesday looks like | | |
| **Where it leads** — what it opens in three years | | |

**Write the note, not just the number.** "Interest: 4 — I kept building API things after the
assignment was submitted" is evidence. A bare 4 is a feeling with a number attached.

**Do not average them.** The scores are there to make the comparison visible, not to produce a
verdict. A direction that scores 5 on interest and 2 on opportunity is a real option with a real
plan attached, and averaging hides exactly that.

**Test each with a small piece of work.** Spend a weekend on something from each direction and
notice: which one did you want to keep working on when it got frustrating? That is worth more than
another week of comparison, and it is the step most people skip.

**Ask somebody in each.** "What do you wish you had known before starting?" and "what does a
frustrating week look like?" — two questions, and people answer them generously.

**Common traps:**

- **Prestige** — choosing what sounds impressive to people who will never see your work
- **Avoidance** — choosing to escape a topic you found hard, which follows you anyway
- **One good day** — one enjoyable project is not a career signal on its own
- **Somebody else's success** — their path included circumstances you do not have

**When it is genuinely close**, choose the one with better evidence behind it. You will be
interviewing on that evidence in a few months, and a close call resolved by what you can actually
demonstrate is resolved sensibly.`,
    mcqs: [
      mcq('Scores in the comparison table should not be averaged because:',
        [['Averaging hides the trade-off you are trying to see', true],
          ['The criteria are not equally weighted', false],
          ['Scores are too subjective to combine', false],
          ['Six criteria is too many to average', false]],
        'A 5 on interest and 2 on opportunity is an option with a plan, not a mediocre score.'),
      mcq('A note beside each score matters because:',
        [['A bare number is a feeling with a number attached', true],
          ['Assessors require the reasoning', false],
          ['Notes make the scores comparable', false],
          ['It slows the decision down usefully', false]],
        '"I kept building API things afterwards" is evidence.'),
      mcq('The step most people skip when comparing directions is:',
        [['Spending a weekend on real work from each', true],
          ['Reading the job descriptions carefully', false],
          ['Scoring the criteria honestly', false],
          ['Asking somebody in the field', false]],
        'Which one you wanted to continue when frustrated is the answer.'),
      mcq('Choosing a direction to escape a topic you found hard:',
        [['Tends to follow you into the new direction anyway', true],
          ['Is a sensible use of self-knowledge', false],
          ['Works if the topic is genuinely unrelated', false],
          ['Is the most common successful reason', false]],
        'Avoidance is one of the four traps in this unit.'),
    ],
    checkpoint: [
      mcq('When two directions are genuinely close, the tiebreaker is:',
        [['Which has better evidence behind it already', true],
          ['Which pays more at entry level', false],
          ['Which has more openings advertised', false],
          ['Which your mentors recommend', false]],
        'You will be interviewing on that evidence within months.'),
      mcq('Two useful questions to ask somebody already in a direction are:',
        [['What they wish they had known, and what a bad week looks like', true],
          ['What they earn, and how long they took to get hired', false],
          ['Which tools to learn, and which to avoid', false],
          ['Whether they would choose it again, and why', false]],
        'People answer both generously and specifically.'),
    ],
  },

  {
    unitCode: 'T2_DIRECTION_CHOOSING',
    notes: `Choose. This unit exists because the comparison can continue indefinitely, and at some
point continuing to compare costs more than choosing slightly wrong.

**What the choice commits you to:** the track units for the rest of this year, your track project,
the direction assessment, and the shape of the portfolio you will apply with. That is real, and it is
also recoverable.

**What it does not commit you to:** your career. People move between these directions routinely, and
the fundamentals — the core and systems topics you have just spent months on — transfer entirely. A
backend developer moving to data analysis in year three loses very little.

**Write this down, in four lines:**

1. **The direction**, plainly.
2. **Why**, in two sentences, with evidence rather than feeling.
3. **What you are giving up**, and why that is acceptable.
4. **When you would reconsider**, and on what basis.

That fourth line prevents both of the failure modes: abandoning a choice at the first hard week, and
staying in one long after the evidence turned against it. "I will reconsider if I still dislike the
work after the track project, and I will revisit it at the direction assessment" is a decision with a
review date, which is how sensible decisions are made.

**On the doubt you are feeling:** it is normal and it is not information. Every choice of this kind
is made on incomplete evidence, and waiting for certainty means waiting for something that is not
coming. The people who chose confidently in month one were not better informed; most of them simply
had not thought about it.

**Commit properly.** Half-committing to a track — doing the units without the project, keeping an eye
on another direction — produces a year of shallow work in two areas and evidence in neither. Depth is
what employers can see.

**And revisit deliberately at the direction assessment.** By then you will have built something real
in this track, which is far better evidence than anything available to you today.`,
    mcqs: [
      mcq('Writing down when you would reconsider prevents:',
        [['Both abandoning too early and staying too long', true],
          ['The choice being made emotionally', false],
          ['Having to justify it to others', false],
          ['A poor result in the assessment', false]],
        'A decision with a review date is a sensible decision.'),
      mcq('Doubt at the moment of choosing is:',
        [['Normal, and not information about the choice', true],
          ['A sign the comparison was incomplete', false],
          ['A reason to delay until it resolves', false],
          ['Evidence the other option is better', false]],
        'Waiting for certainty is waiting for something not coming.'),
      mcq('Half-committing to a track produces:',
        [['Shallow work in two areas and evidence in neither', true],
          ['A useful breadth of experience', false],
          ['A safer position if the choice was wrong', false],
          ['More options at application time', false]],
        'Depth is what employers can actually see.'),
      mcq('A backend developer moving to data analysis later:',
        [['Loses very little, since the fundamentals transfer', true],
          ['Starts again from the beginning', false],
          ['Must retake equivalent training', false],
          ['Is at a disadvantage against direct entrants', false]],
        'The core and systems topics transfer entirely.'),
    ],
    checkpoint: [
      mcq('The right time to deliberately revisit the choice is:',
        [['At the direction assessment, with work behind you', true],
          ['At the first difficult week of the track', false],
          ['Once applications begin', false],
          ['Only if the assessment goes badly', false]],
        'By then the evidence is much better than it is today.'),
      mcq('The decision record should include what you are giving up because:',
        [['Naming the cost stops it resurfacing as regret', true],
          ['It is required for the assessment', false],
          ['It helps compare with classmates', false],
          ['It shortens the reconsideration later', false]],
        'An acknowledged trade-off is a decision; an unacknowledged one is a doubt.'),
    ],
  },

  /* ── T2_COMMUNICATION ───────────────────────────────────────────────────────────────── */
  {
    unitCode: 'T2_COMMUNICATION_EXPLAINING',
    notes: `Explaining something technical to somebody who is not technical is a skill you will use in
every interview and most weeks of your working life.

**Start from what they know**, not from where the subject starts.

    "An API is an interface exposing endpoints that accept requests and return JSON."

    "It is a way for two programs to talk. Like a waiter: you ask for something
     in a format the kitchen understands, and they bring it back."

**Analogies work and have limits.** Use one, then say where it breaks: "unlike a waiter, it can serve
thousands of people at once and never gets an order wrong — but it also cannot improvise."

**Lead with why it matters to them.** A manager does not want to know what caching is; they want to
know the page will load in one second instead of six, and what that costs.

**Cut the jargon, or define it once.** Not "we need to refactor the auth middleware", but "the part
that checks who is logged in is tangled up with other things, which makes it risky to change — I want
to untangle it before we add the new login."

**Check rather than ask.** "Does that make sense?" gets a yes from everybody. "What would you want to
know next?" or "how would you explain that to your team?" finds out whether it landed.

**Three levels, and pick deliberately:**

| Audience | Pitch |
|---|---|
| Non-technical | Outcome and cost, no mechanism |
| Technically adjacent | Mechanism at a high level, named concepts |
| Engineer | Full detail, assumptions stated |

**Pitching too high is condescending; pitching too low wastes everyone's time.** Ask what they
already know if you are not sure — it takes five seconds and is not a weakness.

**Practise the hardest version:** explain your final project to a family member who does not code. If
they can say back what it does and why it is useful, you can explain it to anybody.`,
    mcqs: [
      mcq('An explanation should start from:',
        [['What the listener already knows', true],
          ['The foundations of the subject', false],
          ['The problem you were solving', false],
          ['The technology you used', false]],
        'Where the subject starts is rarely where they are.'),
      mcq('After using an analogy, the useful next step is to:',
        [['Say where the analogy breaks down', true],
          ['Offer a second, similar analogy', false],
          ['Repeat it with technical terms added', false],
          ['Ask whether they liked it', false]],
        'Every analogy is wrong somewhere, and unmarked it misleads.'),
      mcq('"Does that make sense?" is a poor check because:',
        [['Everybody says yes to it', true],
          ['It sounds condescending', false],
          ['It invites a long answer', false],
          ['It implies the explanation was complex', false]],
        '"What would you want to know next?" finds out whether it landed.'),
      mcq('A manager hearing about caching mainly wants to know:',
        [['The outcome and what it costs', true],
          ['How caching works internally', false],
          ['Which library you will use', false],
          ['Whether it is industry standard', false]],
        'Outcome and cost, no mechanism.'),
    ],
    checkpoint: [
      mcq('Asking somebody what they already know is:',
        [['A five-second step, not a weakness', true],
          ['Something to avoid in interviews', false],
          ['Only appropriate with colleagues', false],
          ['A sign of an unprepared explanation', false]],
        'Pitching too high is condescending; too low wastes time.'),
      mcq('The hardest practice version of this skill is explaining your project to:',
        [['A family member who does not code', true],
          ['An interviewer in the same field', false],
          ['A classmate on another track', false],
          ['A mentor who knows the codebase', false]],
        'If they can say back what it does, you can explain it to anybody.'),
    ],
  },

  {
    unitCode: 'T2_COMMUNICATION_ASKING',
    notes: `How you ask for help determines how quickly you get it, and how people come to regard
you. Both matter more than students expect.

**A question that wastes everyone's time:**

    "my code isn't working, can someone help"

**One that gets answered in minutes:**

    "I'm getting a 401 from our orders API when calling it from the background job,
     but the same request works from the web app. I've checked the token is being
     set (printed it, it's there and not expired) and compared the headers — they
     look the same. Am I missing something about how the job authenticates?"

**The four parts:**

1. **What you are trying to do** — the goal, not just the error
2. **What you tried**, specifically
3. **What happened**, exactly, with the message
4. **What you expected**, and why

**Try first, genuinely.** Read the error properly, search it, check the documentation, look at the
code again. Fifteen minutes. Not three hours — that is the other failure, and it is more common than
you think.

**The fifteen-minute rule is not about the clock.** It is about whether you have new information. If
you have learned nothing in the last ten minutes, you are stuck rather than working, and asking is the
right move.

**Include a way to reproduce it** when there is one: the exact input, the exact command, the code as a
small example.

**Ask in public where you can** — a team channel rather than a direct message. Somebody else has the
same question, and the answer becomes searchable.

**Explaining the problem often solves it.** Writing out all four parts forces you to state your
assumptions, and the wrong one frequently becomes obvious mid-sentence. That is a real phenomenon,
it happens constantly, and it is worth doing even when nobody is available.

**Close the loop.** When you get the answer, say what worked. Nobody enjoys helping somebody who
disappears, and the next person searching for that error will find your resolution.`,
    mcqs: [
      mcq('The four parts of a good question are:',
        [['The goal, what you tried, what happened, what you expected', true],
          ['The error, the code, the version, the deadline', false],
          ['The problem, the urgency, the impact, the request', false],
          ['The symptom, the cause, the fix, the test', false]],
        'Together they let somebody answer without a round of questions.'),
      mcq('The fifteen-minute rule is really about:',
        [['Whether you have learned anything new recently', true],
          ['Respecting other people\'s time', false],
          ['Meeting a team expectation', false],
          ['Avoiding interruption during focus time', false]],
        'If you have learned nothing in ten minutes, you are stuck rather than working.'),
      mcq('Writing out the full question often solves the problem because:',
        [['Stating your assumptions exposes the wrong one', true],
          ['The act of typing slows you down usefully', false],
          ['It forces you to re-read the code', false],
          ['It creates a record for later', false]],
        'A real phenomenon, and worth doing even with nobody available.'),
      mcq('Asking in a team channel rather than a direct message:',
        [['Helps others with the same question and stays searchable', true],
          ['Gets a faster response in every case', false],
          ['Avoids interrupting one person', false],
          ['Is expected only in remote teams', false]],
        'The answer becomes an asset rather than a private exchange.'),
    ],
    checkpoint: [
      mcq('Struggling alone for three hours before asking is:',
        [['The other failure, and a common one', true],
          ['Appropriate diligence before asking', false],
          ['Expected of a junior developer', false],
          ['Better than asking a poor question', false]],
        'Fifteen minutes of genuine effort, then ask.'),
      mcq('Saying what worked after receiving help matters because:',
        [['The next person with that error finds it', true],
          ['It is required by most team norms', false],
          ['It proves you understood the answer', false],
          ['It closes the support ticket', false]],
        'And nobody enjoys helping somebody who disappears.'),
    ],
  },

  {
    unitCode: 'T2_COMMUNICATION_WRITING',
    notes: `Most technical communication is written, most of it is read quickly, and almost all of it
is longer than it needs to be.

**Put the point first.** People read the first line and decide whether to continue:

    "Following up on our discussion about the reporting module, I have been
     looking into several options and considering the trade-offs, and..."

    "We should delay the reporting module by a week. The export API is slower
     than documented and we need to cache results. Details below."

**Short paragraphs, and a list when there is a list.** A wall of text will be skimmed, and skimming
loses the important sentence in the middle.

**Say what you want.** "Can you review this by Thursday?" not "let me know your thoughts when you
get a chance". Vagueness produces no action and then a follow-up.

**A status update has three parts**, and nothing else is needed:

    Done: login endpoint, with tests
    Next: password reset flow
    Blocked: need the mail service credentials from Ravi

**An issue report has four:**

    What happened: order 4821 shows a total of 0
    Expected: 1,240 (sum of its three line items)
    Steps: open /orders/4821 as an admin
    Notes: started after yesterday's pricing deploy; two other orders affected

**Write for somebody who was not in the meeting.** They do not have the context, and in six months
neither will you.

**Read it once before sending**, and cut the first sentence if it only clears your throat. That
single habit improves most messages.

**On tone:** written text loses everything except the words. Something terse reads as annoyed,
something blunt reads as rude. A sentence of context costs you nothing: "quick question, no rush" is
four words that prevent a misreading.

**Length is not thoroughness.** A short message that says exactly what is needed is more work to
write and much more likely to be acted on.`,
    mcqs: [
      mcq('The most important structural rule for a technical message is:',
        [['Put the conclusion in the first line', true],
          ['Include all relevant background first', false],
          ['Keep it under two paragraphs', false],
          ['Use headings for each section', false]],
        'People read the first line and decide whether to continue.'),
      mcq('"Let me know your thoughts when you get a chance" fails because:',
        [['It does not say what action is wanted by when', true],
          ['It is too informal for work', false],
          ['It implies the work is not urgent', false],
          ['It invites a long response', false]],
        'Vagueness produces no action and then a follow-up.'),
      mcq('A status update needs:',
        [['Done, next, and blocked', true],
          ['A summary, details, and next steps', false],
          ['Progress, risks, and a timeline', false],
          ['What changed and why it changed', false]],
        'Nothing else is needed, and more gets skimmed.'),
      mcq('Terse writing often reads as annoyed because:',
        [['Written text loses everything except the words', true],
          ['Short messages imply urgency', false],
          ['Readers assume the worst by default', false],
          ['Tone markers are considered unprofessional', false]],
        '"Quick question, no rush" is four words that prevent a misreading.'),
    ],
    checkpoint: [
      mcq('An issue report should contain:',
        [['What happened, expected, steps, and notes', true],
          ['Severity, owner, deadline, and impact', false],
          ['The error message and the stack trace', false],
          ['A description and a screenshot', false]],
        'Enough that somebody can reproduce it without asking you.'),
      mcq('Writing for somebody who was not in the meeting matters because:',
        [['In six months you will not have it either', true],
          ['Meetings are rarely recorded', false],
          ['Others may be copied on the message', false],
          ['It keeps the message formal', false]],
        'Context that lives only in your head is context that is lost.'),
    ],
  },

  {
    unitCode: 'T2_COMMUNICATION_DESIGN_DECISIONS',
    notes: `"Why did you build it that way?" is the question that separates candidates in interviews
and engineers on teams. It is also entirely learnable.

**The structure of a good answer**, and it is always the same four parts:

1. **The decision** — what you chose
2. **The alternatives** — what else you considered
3. **The reason** — why this one, in these circumstances
4. **The trade-off** — what it costs, because everything costs something

**In practice:**

    "I stored the price on the order line rather than joining to the product.
     The alternative was a join, which keeps one source of truth. But the price
     paid is a historical fact — if we reprice tomorrow, old invoices must not
     change. The cost is that it looks like duplication, so I documented why."

That answer would satisfy any interviewer, and it is not a clever answer. It is an ordinary decision,
explained completely.

**Naming the trade-off is what makes it credible.** An engineer who says their choice has no downside
has either not thought about it or is not telling you. Every decision costs something, and saying so
demonstrates that you understand what you did.

**"I don't know" and "I would do it differently now" are strong answers**, not weak ones, when they
come with reasoning: "I used a background thread; I would use a proper queue now, because restarting
the service loses in-flight work — I did not think about restarts at the time."

**Have an answer for the obvious questions** about anything you will present: why this database, why
this structure, what happens at ten times the scale, what breaks first, what you would change.

**Keep a decision log while you build.** Reconstructing reasons afterwards produces vague answers to
specific questions, and interviewers can tell the difference immediately.

**Decisions made for time are legitimate.** "I hardcoded it because the deadline was Friday and this
was not the risk worth spending the day on" is a professional answer. Pretending it was a technical
judgement is not.`,
    mcqs: [
      mcq('A complete design answer contains:',
        [['The decision, alternatives, reason, and trade-off', true],
          ['The problem, the solution, and the result', false],
          ['The requirement, the design, and the test', false],
          ['The context, the choice, and the outcome', false]],
        'The trade-off is the part most people leave out.'),
      mcq('Claiming a decision has no downside suggests:',
        [['You have not thought about it, or are not saying', true],
          ['The design was unusually well chosen', false],
          ['The trade-off was resolved in testing', false],
          ['The alternatives were clearly worse', false]],
        'Everything costs something, and saying so is what makes it credible.'),
      mcq('"I would do it differently now" is a strong answer when:',
        [['It comes with the reasoning for the change', true],
          ['The original decision was defensible', false],
          ['It is offered before being asked', false],
          ['The interviewer disagreed with the choice', false]],
        'Reasoning is what turns an admission into evidence of judgement.'),
      mcq('Reconstructing decisions after the fact produces:',
        [['Vague answers that interviewers recognise immediately', true],
          ['Cleaner explanations than a contemporaneous log', false],
          ['An accurate record with enough effort', false],
          ['The same result as keeping a log', false]],
        'Which is why the log is kept while building.'),
    ],
    checkpoint: [
      mcq('"I hardcoded it because the deadline was Friday" is:',
        [['A professional answer, if stated as what it was', true],
          ['An admission best avoided in interviews', false],
          ['Acceptable only for small projects', false],
          ['A sign of poor planning', false]],
        'Pretending it was a technical judgement is the thing that is not.'),
      mcq('Before presenting any project, you should have answers ready for:',
        [['Why this design, and what breaks first', true],
          ['How long it took and what you learned', false],
          ['Which technologies are most in demand', false],
          ['How it compares to similar products', false]],
        'Those questions follow every project presentation.'),
    ],
  },

  {
    unitCode: 'T2_COMMUNICATION_PRESENTING',
    notes: `Five minutes to show what you built. Most people spend four of them on setup and one on
the thing that matters.

**The structure that works:**

1. **The problem** (30 seconds) — what and for whom, concretely
2. **The demonstration** (2 minutes) — it working, not slides about it working
3. **How it works** (1 minute) — the architecture at a level they can follow
4. **The interesting part** (1 minute) — the hardest problem and how you solved it
5. **What is next** (30 seconds) — limitations and what you would add

**Demonstrate, do not describe.** A working thing on screen is worth ten slides about it. Have it
running before you start, with data already loaded.

**Show the happy path.** A demonstration is not the place to explore edge cases; mention them in the
architecture section.

**Rehearse against a clock**, at least twice, out loud. Silently in your head is not rehearsal, and
everything takes longer when spoken.

**Prepare for the demonstration failing**, because it sometimes will. A recorded backup and
screenshots cost ten minutes and save the presentation. Somebody whose demonstration breaks and who
continues calmly with a recording looks more competent than somebody whose demonstration simply
worked.

**Lead with the outcome**, not the process. "This turns a two-hour manual report into thirty
seconds" beats "I built a Flask application with a Postgres database".

**The interesting part is what people remember.** One real problem, explained well — the race
condition you found, the query you made forty times faster, the edge case that changed the design.
That is the section that makes you memorable, and it is the one most often cut for time.

**Take questions properly.** Repeat the question, answer what was asked, and say "I don't know, but I
would find out by..." when you do not. Bluffing is transparent to anybody who knows the subject, and
they are the ones asking.`,
    mcqs: [
      mcq('Most of a five-minute presentation should be:',
        [['The thing actually working on screen', true],
          ['Slides explaining the architecture', false],
          ['Background about the problem area', false],
          ['A walkthrough of the code', false]],
        'A working demonstration is worth ten slides about one.'),
      mcq('Preparing a recorded backup of the demonstration is worthwhile because:',
        [['Recovering calmly looks better than a demo that just worked', true],
          ['Recordings are usually clearer', false],
          ['It saves setup time on the day', false],
          ['Live demonstrations are discouraged', false]],
        'Ten minutes of preparation that saves the presentation.'),
      mcq('The section most often cut for time, and most worth keeping, is:',
        [['The hardest problem and how you solved it', true],
          ['The list of technologies used', false],
          ['The future roadmap', false],
          ['The background to the problem', false]],
        'It is what makes you memorable.'),
      mcq('Rehearsing silently in your head is inadequate because:',
        [['Everything takes longer when actually spoken', true],
          ['You skip the demonstration', false],
          ['Nerves are not simulated', false],
          ['You cannot time it accurately at all', false]],
        'Out loud, against a clock, at least twice.'),
    ],
    checkpoint: [
      mcq('Opening with "this turns a two-hour report into thirty seconds" is better than listing the stack because:',
        [['It leads with the outcome rather than the process', true],
          ['It avoids technical terms', false],
          ['It is shorter to say', false],
          ['The audience may not know the technologies', false]],
        'The outcome is what the audience came for.'),
      mcq('When you do not know the answer to a question, the right response is:',
        [['Say so, and say how you would find out', true],
          ['Give your best guess confidently', false],
          ['Offer to follow up afterwards only', false],
          ['Redirect to something you do know', false]],
        'Bluffing is transparent to the people asking.'),
    ],
  },

  {
    unitCode: 'T2_COMMUNICATION_PRACTICE',
    notes: `No new ideas. Explain, write and present repeatedly, with feedback, until it is not
frightening.

**Do these, with a real audience wherever possible:**

1. **Explain your project three ways** — to a non-technical person, to a student on another track,
   and to an engineer. Note what changed between the three, and what each one asked about.
2. **Write five questions** for real problems you have had, using the four parts. Ask at least two of
   them somewhere public.
3. **Rewrite three bad messages.** Take vague or rambling ones you have sent or received, and cut
   them to the point.
4. **Defend five decisions** from your own projects in writing, using the four-part structure.
   Choose ones you are least sure about.
5. **Present in five minutes**, recorded. Watch it back. This is uncomfortable and it is the single
   fastest way to improve.
6. **Present in two minutes**, the same project. Cutting forces you to find what actually matters.
7. **Explain unfamiliar code**, on demand: have somebody show you a file you have never seen, read it
   for five minutes, and explain it out loud.
8. **Take hostile questions.** Have somebody challenge your decisions and practise answering without
   defensiveness.

**Get feedback on each, and the useful question is not "was that good?"** It is "what would you have
wanted me to say more about?" and "where did you lose the thread?"

**Record for each:** what you planned to say, what you actually said, and what you would change.

**The point of the recording exercise:** everybody hates it, everybody improves from it, and it
catches the things nobody will tell you — the filler words, the rushing, the part where you lost the
audience and did not notice.`,
    mcqs: [
      mcq('Explaining the same project to three audiences shows you:',
        [['What changes between levels, and what each asks about', true],
          ['Which audience is hardest to satisfy', false],
          ['Whether the project is interesting', false],
          ['How long each explanation takes', false]],
        'The differences are the lesson, not the repetitions.'),
      mcq('Cutting a five-minute presentation to two minutes forces you to:',
        [['Find what actually matters in it', true],
          ['Speak more quickly and clearly', false],
          ['Remove the demonstration', false],
          ['Simplify the technical content', false]],
        'Constraint is what produces the priority.'),
      mcq('Watching a recording of yourself presenting catches:',
        [['Filler words, rushing, and losing the audience', true],
          ['Technical errors in the content', false],
          ['Whether the structure was correct', false],
          ['Whether the demonstration worked', false]],
        'Things nobody will tell you unprompted.'),
      mcq('The most useful feedback question is:',
        [['Where did you lose the thread?', true],
          ['Was that a good explanation?', false],
          ['Did I speak clearly enough?', false],
          ['Was the length about right?', false]],
        '"Was that good?" gets a polite yes from everybody.'),
      mcq('Practising hostile questions is included so that you can:',
        [['Answer a challenge without becoming defensive', true],
          ['Predict what interviewers will ask', false],
          ['Defend decisions you know are weak', false],
          ['Practise saying you do not know', false]],
        'Defensiveness is what turns a fair question into a bad impression.'),
    ],
    checkpoint: [
      mcq('Explaining unfamiliar code after five minutes of reading practises:',
        [['A skill used in every new codebase', true],
          ['Speed reading of source files', false],
          ['Reviewing code for defects', false],
          ['Documenting somebody else\'s work', false]],
        'Both of those situations are common and rarely rehearsed.'),
      mcq('Choosing decisions you are least sure about for the defence exercise:',
        [['Practises the case hardest in an interview', true],
          ['Makes the exercise quicker', false],
          ['Reveals which decisions were wrong', false],
          ['Avoids repeating obvious answers', false]],
        'The comfortable ones need no practice.'),
    ],
  },
];
