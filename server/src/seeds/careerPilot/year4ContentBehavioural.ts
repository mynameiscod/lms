/**
 * T4_HR_STAR, T4_HR_QUESTIONS, T4_COMM_PRESENT and T4_COMM_WRITTEN — seventeen units. Module P20.
 *
 * ── THE ROUND THAT ELIMINATES PEOPLE WHO PASSED THE TECHNICAL ONES ────────────────────────
 *
 * Candidates treat the HR round as a formality and it is not. It is where an offer is withdrawn
 * from somebody who cleared every technical round, and the reasons are usually not mysterious:
 * an answer with no event in it, a failure story that was really a boast, a conflict story that
 * blamed somebody, or ninety seconds of biography when the question wanted ninety seconds of
 * work.
 *
 * ── WHY STAR, AND WHY NOT AS A FORMULA ────────────────────────────────────────────────────
 *
 * The structure is not the point. What the structure enforces is: an actual situation, an actual
 * action by you, and an actual result. A candidate reciting "situation, task, action, result" in
 * a monotone has the form and not the substance, and it is audibly worse than an unstructured
 * answer that contains a real event.
 *
 * So these units teach the structure as a CHECK rather than as a template — if you cannot name
 * the week it happened, it is not a story.
 *
 * ── THE WRITTEN HALF ──────────────────────────────────────────────────────────────────────
 *
 * T4_COMM_WRITTEN is the unit students are most inclined to skip and the one their first
 * fortnight at work will test immediately. Nobody at a company teaches email; they assume it, and
 * a graduate whose first status update hides a delay has spent credibility they did not know they
 * had.
 *
 * Attribution: T4_HR_STAR and T4_HR_QUESTIONS default to BEHAVIORAL_INTERVIEW with the
 * introduction unit on COMMUNICATION; T4_COMM_PRESENT on TECHNICAL_EXPLANATION; T4_COMM_WRITTEN
 * on WRITTEN_COMMUNICATION.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const BEHAVIOURAL_BUNDLES: PilotBundle[] = [
  /* ══ T4_HR_STAR ═════════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_HR_STAR_WHAT_STAR_IS_FOR',
    notes: `**Not a formula to recite: a way of making sure an answer contains an actual event and
an actual outcome.**

## The failure it prevents

**An answer with no event in it.**

"I work well under pressure and I am good at managing my time."

**That is a sentiment. It contains no week, no person, no deadline and no outcome**, and the
interviewer cannot distinguish it from the same sentence said by somebody for whom it is untrue.

**Every candidate says it. It carries no information, which is why it scores none.**

## The four parts, as a check rather than a template

**Situation.** When and where. **If you cannot name roughly when it happened, it is not a story** —
that single test catches most invented answers, including the ones the candidate has half-convinced
themselves of.

**Task.** What you specifically had to do. Not what the team had to do.

**Action.** What you did. **In the first person, singular**, because "we decided" is where
individual contribution disappears.

**Result.** What happened, ideally with a number or an observable change. **"It worked out" is not a
result.**

## Why reciting it is worse than not using it

**A candidate announcing "so, the situation was…" in a flat sequence has the form and not the
substance**, and it is audibly worse than an unstructured answer containing a real event.

**The structure is scaffolding you build the answer on and then remove.** The listener should hear
a story that happens to be complete, not a template being filled.

## The length

**Ninety seconds to two minutes.** Under a minute is usually missing the result; over three is
usually missing the edit.

## The part candidates cut and should not

**The result.** It is the answer to the question that was actually asked — what happened — and it is
the part most often trailed off rather than stated.`,
    mcqs: [
      mcq('"I work well under pressure and I am good at managing my time" scores nothing because it:',
        [['Contains no week, no person, no deadline and no outcome', true],
         ['Is a claim the interviewer cannot verify later', false],
         ['Answers a question that was not asked', false],
         ['Uses language that sounds rehearsed', false]],
        'Every candidate can say it truthfully or otherwise, so it carries no information that distinguishes them.'),
      mcq('"If you cannot name roughly when it happened, it is not a story" is useful because that single test catches:',
        [['Most invented answers', true],
         ['Stories that are too old to be relevant', false],
         ['Answers that omit the result', false],
         ['Situations the candidate was not present for', false]],
        'A fabricated event has no position in time, so the check fails immediately even when the candidate has half-convinced themselves.'),
    ],
    checkpoint: [
      mcq('The structure is described as scaffolding you build the answer on and then remove, so the listener should hear:',
        [['A story that happens to be complete', true],
         ['Four clearly delineated sections', false],
         ['A summary followed by the detail', false],
         ['The result stated before the situation', false]],
        'Announcing the parts produces form without substance, which is audibly worse than an unstructured answer with a real event in it.'),
      mcq('Actions are stated in the first person singular because "we decided" is where:',
        [['Individual contribution disappears', true],
         ['The answer becomes too long', false],
         ['Credit is shared appropriately', false],
         ['The timeline becomes unclear', false]],
        'The round assesses what this candidate did, and a collective verb removes exactly the information being sought.'),
    ],
  },
  {
    unitCode: 'T4_HR_STAR_BUILDING_YOUR_STORIES',
    notes: `**Building a small set of real events from your own three years, each usable for
several questions.**

## Why six, and not twenty

**Because the questions overlap far more than they appear to.**

"Tell me about a difficult problem", "a time you were stuck", "something you are proud of" and "a
time you learned something quickly" can all be answered from one good debugging story with a
different emphasis each time.

**Six well-chosen events cover the standard set.** Twenty half-remembered ones cover it worse,
because none of them is available in detail under pressure.

## The six to build

**A hard technical problem you solved.** The workhorse — it answers difficulty, persistence,
learning and pride.

**A time you failed or got something wrong.** **Must be a real failure with a real consequence**;
the requirements are covered in the next topic.

**A disagreement with somebody.** Technical for preference, resolved without either party being
the villain.

**Something you learned fast because you had to.** A library, a tool, a subject, under a deadline.

**A time you helped somebody else.** Frequently the weakest one people have, and it is asked
regularly.

**Something you shipped end to end.** Small is fine; finished is the point.

## Writing them down

**Four bullets each: when, what you had to do, what you did, what happened.**

**Written, not remembered.** The act of writing finds the ones with no result attached, which under
pressure is exactly where an answer collapses.

## Where they come from if the list feels empty

**Coursework, the club, the group project, the internship, the thing you built for yourself.** **A
story does not require employment**, and an interviewer asking a final-year student for a conflict
story is not expecting a workplace one.

## The re-use rule

**One story per question in a single interview.** Reusing the same event twice makes three years
sound like one week, and interviewers notice it immediately — which is the real reason six is the
number rather than three.`,
    mcqs: [
      mcq('Six well-chosen events beat twenty half-remembered ones because none of the twenty is:',
        [['Available in detail under pressure', true],
         ['Recent enough to be relevant', false],
         ['Suitable for more than one question', false],
         ['Free of a negative outcome', false]],
        'Detail is what makes an answer specific, and it survives an interview only for events that were prepared properly.'),
      mcq('Writing the stories down rather than remembering them finds:',
        [['The ones with no result attached', true],
         ['Events that happened too long ago', false],
         ['Stories that overlap with each other', false],
         ['Situations better told by a teammate', false]],
        'The missing fourth bullet is visible on paper and invisible in recollection, and it is where an answer collapses under pressure.'),
    ],
    checkpoint: [
      mcq('One story per question in a single interview matters because reusing an event:',
        [['Makes three years sound like one week', true],
         ['Confuses the interviewer about the timeline', false],
         ['Wastes time already spent on the detail', false],
         ['Suggests the first answer was incomplete', false]],
        'Repetition implies a narrow base of experience, which is the real reason the prepared set needs six rather than three.'),
      mcq('The hard technical problem is called the workhorse because it answers difficulty, persistence, learning and:',
        [['Pride', true],
         ['Conflict with a teammate', false],
         ['Working to a deadline', false],
         ['Helping somebody else', false]],
        'The same event supports several standard questions with a different emphasis, which is what makes a small prepared set sufficient.'),
    ],
  },
  {
    unitCode: 'T4_HR_STAR_PRACTICE',
    notes: `**Questions you have not seen, answered from stories you have.**

## The drill

**Twenty minutes, ten questions, somebody asking.** They pick from a standard list and do not tell
you which in advance.

**That is the condition being practised** — matching an unseen question to a prepared story is the
actual skill, and it is not exercised by rehearsing prepared answers.

## The ten questions

**A difficult problem. A failure. A disagreement. Something learned quickly. Helping somebody.
Something you shipped. Working to a deadline. Something you are proud of. A time you were wrong.
Feedback you received.**

## What the listener records

**Whether the answer contained a when.** **Whether it contained a result.** **Whether "I" or "we"
was used for the actions.** **The length.** **And whether any story was used twice.**

**Five observations, none requiring technical knowledge.**

## The matching exercise, done first

**Before the drill, take your six stories and the ten questions and mark which story answers
which.** **Most will answer three or four**, and seeing that on paper is what makes the matching
fast under pressure.

**A question that no story answers is the finding** — and the remedy is a story, not a better
answer.

## What usually comes out

**Results trailing off.** "…and then it worked, yeah." The result is the answer to the question and
it is the part most often abandoned.

**And "we" throughout**, in candidates who worked in teams and are being modest. **Modesty costs
marks in this round specifically**, because the interviewer is trying to establish what you did and
you have made that impossible.

## Frequency

**Twice.** The first finds the gaps in the story set; the second confirms the matching is fast.
Beyond that the drill repeats itself, because the question set is small and fixed.`,
    mcqs: [
      mcq('The partner does not say which question is coming because matching an unseen question to a prepared story is the actual skill, which is not exercised by:',
        [['Rehearsing prepared answers', true],
         ['Writing the stories down first', false],
         ['Practising with a technical listener', false],
         ['Using the same story more than once', false]],
        'Rehearsal trains delivery of a known pairing, where the round requires selecting the story after hearing the question.'),
      mcq('Modesty costs marks in this round specifically because the interviewer is trying to establish what you did and "we" throughout:',
        [['Makes that impossible', true],
         ['Suggests the work was not difficult', false],
         ['Implies the team was poorly organised', false],
         ['Sounds less confident than it should', false]],
        'The collective pronoun removes the individual attribution that the entire round exists to determine.'),
    ],
    checkpoint: [
      mcq('A question that none of your six stories answers is the finding, and the remedy is:',
        [['A story, not a better answer', true],
         ['Adapting the closest existing story', false],
         ['Preparing a general response for it', false],
         ['Accepting that some questions cannot be covered', false]],
        'The gap is in the prepared set rather than in the delivery, so filling it means finding a real event that fits.'),
      mcq('Results trailing off is a common finding, and it matters because the result is:',
        [['The answer to the question', true],
         ['The part interviewers remember longest', false],
         ['Where a number can be introduced', false],
         ['The shortest section to deliver', false]],
        'The question asks what happened, so abandoning the outcome leaves the actual question unanswered.'),
    ],
  },
  {
    unitCode: 'T4_HR_STAR_INTERVIEW_QUESTION',
    notes: `**"Tell me about a time you faced a difficult problem."**

## What is actually being assessed

**Not whether the problem was hard.** Whether you can describe a real event, what you personally did
in it, and what came of it — and whether you are the kind of person who processed the experience
afterwards.

## The answer, ninety seconds

**"Last semester our group project had a bug where the report totals were wrong, but only
sometimes.** Two days before the deadline, and nobody could reproduce it.

**I was the one who had written the aggregation, so I took it.** I could not reproduce it either,
so I started logging what went in and what came out on every run. **On about the twentieth run it
happened, and the input had a duplicate row in it.**

**The import was running twice when the upload was retried**, which nobody had noticed because it
usually succeeded first time.

**I made the import idempotent by keying on the file, and added a test that imports the same file
twice. It has not recurred, and I have used the same test since on anything that ingests
something."**

## Why that answer works

**It has a when.** Last semester, two days before a deadline.

**It has a specific action in the first person.** Logging every run rather than "investigating".

**It has a mechanism.** Not "there was a bug" — a duplicate row from a retried import.

**It has a result and a generalisation.** The fix, and the habit that came out of it.

## The follow-ups

**"Why did nobody notice?"** Because it usually succeeded first time. Honest.

**"What would you do differently?"** Log before trying to reproduce, rather than after.

**"How did the team react?"** A relationship question wearing a technical one.

## What loses it

**"We had a bug and we fixed it."** No when, no mechanism, no first person, no result — and it is
what most candidates say, which is why a specific answer stands out more than its difficulty
warrants.`,
    mcqs: [
      mcq('What is being assessed is not whether the problem was hard, but whether you can describe a real event, what you personally did, what came of it, and whether:',
        [['You processed the experience afterwards', true],
         ['The problem was appropriate to your level', false],
         ['Others recognised your contribution', false],
         ['The solution was technically elegant', false]],
        'The reflection is what turns an event into learning, and the round is looking for evidence that it happened.'),
      mcq('"Logging what went in and what came out on every run" is stronger than "investigating" because it is:',
        [['A specific action in the first person', true],
         ['A technique the interviewer will recognise', false],
         ['Shorter to describe in the answer', false],
         ['Evidence of systematic training', false]],
        'A named concrete action can only be given by somebody who performed it, where the general verb is available to anyone.'),
    ],
    checkpoint: [
      mcq('The answer ends with a habit carried forward, which supplies:',
        [['A result and a generalisation', true],
         ['Evidence the fix was permanent', false],
         ['Context for the follow-up questions', false],
         ['A way to extend the answer if needed', false]],
        'Stating the fix and the practice that came out of it shows both the outcome and that the experience changed subsequent work.'),
      mcq('"We had a bug and we fixed it" is what most candidates say, which is why a specific answer:',
        [['Stands out more than its difficulty warrants', true],
         ['Takes longer to deliver than expected', false],
         ['Invites more aggressive follow-ups', false],
         ['Needs a technically impressive problem', false]],
        'Against a field of generic answers, specificity alone distinguishes a candidate regardless of how hard the problem actually was.'),
    ],
  },

  /* ══ T4_HR_QUESTIONS ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_HR_QUESTIONS_TELL_ME_ABOUT_YOURSELF',
    notes: `**The question that is always first and is almost always answered badly.**

## Why it is asked

**To set the frame.** The interviewer has your resume and is not asking for it read aloud; they are
giving you ninety seconds to say what you want the conversation to be about.

**It is the only question where you choose the subject**, and most candidates waste it.

## The three common failures

**The biography.** "I was born in Coimbatore, I did my schooling at…" **Nobody asked, and it spends
the round's only free ninety seconds on information the interviewer cannot use.**

**The resume read aloud.** They have it.

**The apology.** "I do not have much experience, but…" **Opening with a deficit frames everything
afterwards against it.**

## The structure that works

**Now, how you got here, what you are looking for. Three parts, thirty seconds each.**

**"I am a final-year computer science student, and most of my work has been backend — APIs and
databases.**

**I got into it through a group project in second year where I ended up owning the server side, and
I liked that the problems had definite answers. Since then I have built three services, the largest
being an attendance system that a hundred and fifty people actually used.**

**I am looking for a backend role where I will have somebody more experienced reviewing my code,
because I know the gap between working and good is where I need the most help."**

## What that does

**It names a direction**, so the interviewer knows which questions are worth asking.

**It contains one concrete thing** — a hundred and fifty users — that invites a follow-up you are
prepared for.

**And the last sentence is honest about a gap without apologising for it**, which reads as
self-awareness rather than as weakness.

## Preparing it

**Write it, say it aloud, cut it to ninety seconds.** **It is the only answer worth rehearsing
close to verbatim**, because it is asked every single time and because the first ninety seconds set
how everything after is heard.

## The thing to avoid in the rehearsal

**Sounding rehearsed.** Rehearse until the shape is automatic, not until the words are.`,
    mcqs: [
      mcq('This is the only question where you choose the subject, which is why the biography answer:',
        [['Spends the round’s only free ninety seconds on unusable information', true],
         ['Takes longer than the interviewer allowed', false],
         ['Repeats what the resume already states', false],
         ['Sounds unprofessional to most interviewers', false]],
        'The opening sets what the conversation will be about, and personal history gives the interviewer nothing to follow up on.'),
      mcq('Opening with "I do not have much experience, but…" is a failure because a deficit:',
        [['Frames everything afterwards against it', true],
         ['Is usually untrue at this stage', false],
         ['Invites questions about what is missing', false],
         ['Sounds less confident than intended', false]],
        'The first statement establishes the lens, and every subsequent answer is then heard as evidence for or against that limitation.'),
    ],
    checkpoint: [
      mcq('The closing sentence about wanting code review is honest about a gap without apologising, which reads as:',
        [['Self-awareness rather than weakness', true],
         ['Modesty appropriate to the level', false],
         ['A request the company may not meet', false],
         ['An invitation to probe the gap further', false]],
        'Naming what you need in order to improve is a statement about direction, where an apology is a statement about inadequacy.'),
      mcq('This is the only answer worth rehearsing close to verbatim, but the rehearsal should continue until:',
        [['The shape is automatic, not the words', true],
         ['It fits reliably inside ninety seconds', false],
         ['Every sentence can be delivered without pause', false],
         ['It can be adapted to different companies', false]],
        'Memorised wording sounds rehearsed, where a familiar structure allows the delivery to stay natural.'),
    ],
  },
  {
    unitCode: 'T4_HR_QUESTIONS_FAILURE_AND_CONFLICT',
    notes: `**Two questions with a wrong kind of answer: the humble brag, and the colleague who was
simply wrong.**

## The failure question

**"Tell me about a time you failed."**

**The humble brag is the wrong answer.** "I worked too hard and burnt out." "I was such a
perfectionist that I missed the deadline."

**Interviewers hear these constantly and they read as evasion**, because the question asked for a
failure and received a concealed strength.

## What a real answer needs

**A real consequence.** Something was late, broken, wrong, or somebody else had to fix it.

**Your responsibility, stated without hedging.** Not "the requirements were unclear" — if they were,
you could have asked.

**What changed afterwards.** **This is the part the question is actually for**; the failure is the
setup and the change is the answer.

"I did not test the import with a large file. It worked on twenty rows and timed out on eight
thousand, on the day of the demo. I now test with a realistic size before I call something done,
which sounds obvious and I had not been doing it."

## The conflict question

**"Tell me about a disagreement."**

**The wrong answer is the colleague who was simply wrong** and eventually came round. It answers a
question about conflict with a story about being right, and **the interviewer is assessing whether
you can work with somebody who disagrees with you** — a story where the other person had no point
demonstrates the opposite.

## What a real answer needs

**Both positions, stated fairly.** Including theirs, at its strongest.

**How it was resolved**, which is frequently neither person's original position.

**And no villain.** A named person who was unreasonable makes the interviewer wonder how you will
describe this team.

"We disagreed about validating on the client or the server. He wanted client-side for the feedback
speed, I wanted server-side because the client can be bypassed. We did both — his for the
experience, mine for the guarantee — which I initially thought was duplication and now think was
just correct."

## What both questions share

**They are asked to see whether you can examine your own work honestly.** A candidate who cannot
produce a real failure is either inexperienced or not looking, and both are worth knowing.`,
    mcqs: [
      mcq('"I worked too hard and burnt out" reads as evasion because the question asked for a failure and received:',
        [['A concealed strength', true],
         ['An answer that was too brief', false],
         ['A situation outside the candidate’s control', false],
         ['A personal rather than a professional example', false]],
        'The form of a failure story is used to deliver a positive trait, which answers a different question than the one asked.'),
      mcq('A conflict story where the other person was simply wrong demonstrates the opposite of what is assessed, because the interviewer wants to know whether you can:',
        [['Work with somebody who disagrees with you', true],
         ['Defend a technical position under pressure', false],
         ['Recognise when you are correct', false],
         ['Escalate a disagreement appropriately', false]],
        'A story where the other position had no merit never exercises the capability the question exists to probe.'),
    ],
    checkpoint: [
      mcq('"What changed afterwards" is the part the failure question is actually for, which makes the failure:',
        [['The setup, and the change the answer', true],
         ['Less important than its consequences', false],
         ['Something to describe as briefly as possible', false],
         ['Only relevant if it was serious enough', false]],
        'The round is assessing whether experience produces change, so the failure establishes the context for the thing being measured.'),
      mcq('Naming a person who was unreasonable makes the interviewer wonder:',
        [['How you will describe this team', true],
         ['Whether the disagreement was resolved', false],
         ['If the technical issue was understood', false],
         ['Why the situation escalated that far', false]],
        'The way former colleagues are characterised predicts how current ones will be, which the interviewer is listening for.'),
    ],
  },
  {
    unitCode: 'T4_HR_QUESTIONS_WHY_THIS_ROLE',
    notes: `**Motivation questions, answered from something specific rather than from the company
website.**

## The questions

**"Why do you want this role?"** **"Why our company?"** **"Where do you see yourself in five
years?"**

**All three are asking one thing: have you thought about this, or are you applying everywhere.**

## Why the website answer fails

**"You are a leader in innovative solutions with a great culture."**

**That sentence fits four hundred companies**, and the interviewer has heard it from most of the
candidates before you. It demonstrates that you read the homepage, which takes ninety seconds and
is therefore not evidence of anything.

## What a specific answer looks like

**Something only you could have said.** It can be small.

"You work on payments infrastructure, and the thing I have found most interesting in my own
projects is the cases where something has to be exactly right rather than approximately right —
idempotency, retries, reconciliation. That is a small overlap but it is a real one."

**Or, about the role rather than the company:** "The posting says code review is part of the
process. I have never had my code properly reviewed and I think that is the biggest gap between
where I am and where I want to be."

**Both are checkable, both are true, and neither could have come from the homepage.**

## The five-year question

**Not a prediction, and interviewers know that.** **They are checking that the direction is
plausible and that this job is on the path.**

"Still writing code, but trusted with larger pieces, and able to design something rather than
implement somebody else's design."

**Honest, reasonable, and it says the role is a step rather than a placeholder.**

## The honest version when the answer is "I need a job"

**Which is true for most final-year students, and saying it bluntly is not the move.**

**Find the smallest true thing.** The technology, the domain, the team size, the fact that they
take graduates seriously. **A small true reason beats a large invented one**, because the large one
collapses on the follow-up: "what specifically about our culture?"`,
    mcqs: [
      mcq('"You are a leader in innovative solutions with a great culture" fails because the sentence:',
        [['Fits four hundred companies', true],
         ['Overstates what the candidate knows', false],
         ['Repeats the company’s own marketing', false],
         ['Avoids mentioning the specific role', false]],
        'An answer that is not specific to this company is not evidence of having considered it, which is what the question asks.'),
      mcq('The five-year question is not a prediction, and interviewers are checking that the direction is plausible and that:',
        [['This job is on the path', true],
         ['The candidate intends to stay', false],
         ['The ambition matches the role level', false],
         ['A promotion timeline has been considered', false]],
        'The question tests whether the application is considered, which means whether this role advances the stated direction.'),
    ],
    checkpoint: [
      mcq('A small true reason beats a large invented one because the large one collapses on:',
        [['The follow-up asking what specifically', true],
         ['Comparison with the other candidates', false],
         ['A later question about the same topic', false],
         ['Any request for supporting evidence', false]],
        'An invented motivation has no detail behind it, and the immediate request for specifics finds that emptiness.'),
      mcq('Reading the homepage takes ninety seconds and is therefore:',
        [['Not evidence of anything', true],
         ['A reasonable minimum level of preparation', false],
         ['Better than having no answer at all', false],
         ['Sufficient for a first-round conversation', false]],
        'The question distinguishes considered applications from scattered ones, and an effort available to everyone does not make that distinction.'),
    ],
  },
  {
    unitCode: 'T4_HR_QUESTIONS_PRACTICE',
    notes: `**The standard set, asked in the order an HR round asks them.**

## The drill

**Twenty-five minutes, the standard set, in order, with follow-ups.**

**In order matters**, because a real round has a shape: the introduction, then motivation, then
behavioural, then your questions — and a candidate who has only practised individual answers has
not practised the transitions or the accumulating fatigue of talking about themselves for
twenty-five minutes.

## The set

**Tell me about yourself. Why this role. Why our company. A difficult problem. A failure. A
disagreement. Something you are proud of. A weakness. Where in five years. Do you have any
questions.**

## The last one, which candidates fumble

**"Do you have any questions for us?"**

**"No, I think you covered everything" is a wasted opportunity and reads as disinterest.**

**Two prepared questions, about the work rather than the perks.** "What does the first three months
look like for a graduate?" "How does code review work here?" **Both are about doing the job, which
is the impression the question exists to create.**

## What the listener records

**The length of the opener.** **Whether any answer had no event in it.** **Whether "we" replaced
"I".** **Whether the failure was real.** **Whether the conflict had a villain.** **Whether the
questions at the end were prepared.**

## The specific thing to practise

**Sounding unrehearsed while being prepared.** Record it and listen — the difference is audible, and
it is almost always in the opener, which is the one answer people memorise word for word.

## What usually comes out

**The motivation questions.** They are the least practised and the most obviously generic, and they
arrive early enough to colour everything afterwards.

## Frequency

**Twice, a week apart.** The second one after acting on the first, rather than immediately, because
the changes are to prepared material and the material needs rewriting rather than re-delivering.`,
    mcqs: [
      mcq('Practising in order matters because a candidate who has only practised individual answers has not practised the transitions or:',
        [['The accumulating fatigue of talking about themselves', true],
         ['The interviewer’s likely follow-up questions', false],
         ['How long the whole round actually takes', false],
         ['Which stories to hold back for later', false]],
        'Sustained self-description for twenty-five minutes is its own demand, and isolated answers never expose it.'),
      mcq('"No, I think you covered everything" is a wasted opportunity and reads as:',
        [['Disinterest', true],
         ['Confidence in the information given', false],
         ['Respect for the interviewer’s time', false],
         ['An absence of preparation only', false]],
        'The question invites engagement with the role, so declining it suggests there was none to express.'),
    ],
    checkpoint: [
      mcq('Recording the round and listening exposes the difference between sounding rehearsed and being prepared, which is almost always in:',
        [['The opener, the one answer people memorise word for word', true],
         ['The failure story, which is delivered cautiously', false],
         ['The motivation answers, which are generic', false],
         ['The closing questions, which are read out', false]],
        'Verbatim memorisation produces a flatness that is audible, and the introduction is the answer most likely to be learned that way.'),
      mcq('The second session is scheduled a week later rather than immediately because the changes are to prepared material and the material needs:',
        [['Rewriting rather than re-delivering', true],
         ['Time to become familiar again', false],
         ['Review by a different listener', false],
         ['Testing against different questions', false]],
        'The findings are gaps in the stories and the motivation answers, which are fixed on paper before another delivery is useful.'),
    ],
  },
  {
    unitCode: 'T4_HR_QUESTIONS_INTERVIEW_QUESTION',
    notes: `**"What is your greatest weakness?"** — the most gamed question in the set, and the one
where the game is transparent.

## Why it is still asked

**Because the answers sort candidates cleanly**, though not in the way the question appears to.

**It is not testing the weakness. It is testing self-knowledge and honesty**, and most answers fail
on both while attempting to succeed on neither.

## The three failing answers

**The disguised strength.** "I am a perfectionist." "I care too much." **Every interviewer has heard
these hundreds of times and they register as an unwillingness to answer**, which is worse than any
real weakness could be.

**The disqualifying one.** "I find it hard to meet deadlines." True perhaps, and it names a
requirement of the job.

**The denial.** "I cannot think of one." **Which answers the question — just not the way intended.**

## The answer that works

**A real weakness, in a defined area, with what you are doing about it.**

"I am slow at reading code I did not write. I can work through it but it takes me longer than it
should, and I notice it most when I am joining something midway. I have been deliberately picking
up issues in unfamiliar parts of the project rather than the parts I know, which is
uncomfortable and is helping."

**Three parts: the weakness, where it shows, the action.** The third is what stops it being a
confession and makes it an assessment.

## Choosing one safely

**It should be real, it should not be a core requirement of the job, and it should be something you
have actually acted on.**

**"I do not know enough about X" is a good class of answer** for a graduate, because the expectation
is that there is a great deal you do not know and being precise about which part is exactly the
self-knowledge being asked for.

## The follow-up

**"What are you doing about it?"** — which is why the third part belongs in the original answer, and
why an invented weakness fails here: there is no action to describe because there was no weakness.`,
    mcqs: [
      mcq('The question is not testing the weakness but self-knowledge and honesty, and the disguised strength registers as:',
        [['An unwillingness to answer', true],
         ['A lack of self-awareness', false],
         ['An attempt to seem impressive', false],
         ['Preparation from a generic source', false]],
        'The candidate has understood the question and declined it, which is itself the information the interviewer receives.'),
      mcq('An invented weakness fails on the follow-up asking what you are doing about it because:',
        [['There is no action, since there was no weakness', true],
         ['The answer would contradict the original claim', false],
         ['Interviewers recognise the common inventions', false],
         ['It requires details the candidate did not prepare', false]],
        'The remedial action is a real history that only exists if the weakness did, so the follow-up has nothing to draw on.'),
    ],
    checkpoint: [
      mcq('"I cannot think of one" is described as answering the question, just not the way intended, because it demonstrates:',
        [['An absence of the self-knowledge being asked for', true],
         ['That the candidate is unprepared for the round', false],
         ['Confidence that the interviewer may discount', false],
         ['Unwillingness to appear vulnerable', false]],
        'The inability to name any limitation is itself a finding about how closely the candidate has examined their own work.'),
      mcq('"I do not know enough about X" is a good class of answer for a graduate because the expectation is that there is a great deal you do not know, so being precise about which part is:',
        [['Exactly the self-knowledge being asked for', true],
         ['Safer than naming a behavioural trait', false],
         ['Easier to support with an action', false],
         ['Less likely to disqualify the candidate', false]],
        'Locating the gap specifically, rather than acknowledging it generally, is the demonstration the question is designed to elicit.'),
    ],
  },

  /* ══ T4_COMM_PRESENT ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_COMM_PRESENT_STRUCTURING_A_TALK',
    notes: `**What goes in the first thirty seconds, what can be cut, and the ending that is not
"so yeah".**

## The first thirty seconds

**What it is, why it matters, what you will cover.**

**Not the background.** Not the history of the problem space. **Not "before I start, a bit of
context"** — the context goes where it is needed, not in a block at the front where the audience
has not yet been given a reason to care about it.

"I built an attendance system for a club of a hundred and fifty people. It replaced a spreadsheet
that three people were editing simultaneously and losing each other's changes. I will cover the
data model, the one hard part, and what I would change."

**Three sentences, and the audience now knows whether to listen.**

## The middle

**Two or three points. Not seven.**

**A five-minute talk holds about three ideas**, and a speaker with seven delivers all of them
badly. **Cutting is the work** — choosing the two that matter is harder and more valuable than
covering everything.

## What to cut first

**Anything the audience can read.** Configuration, library versions, the interface tour.

**The chronology.** "First I tried X, then Y, then Z" is how you experienced it, not how it is best
heard. **Lead with what worked and mention the dead end only if it taught something.**

## The ending

**"So yeah" is how most student talks end**, and it undoes the last minute.

**Three options, all better:** the summary ("so: the data model, the race condition, and what I
would change"), the forward look ("next I want to add X"), or the direct invitation ("happy to take
questions on any of it").

**Preparing the last sentence specifically is worth more than the effort suggests**, because it is
the part the audience hears last and the part speakers reliably improvise worst.

## The length discipline

**A five-minute talk is about six hundred spoken words.** **Write it and count.** Almost every
first draft is double, and finding that on paper is cheaper than finding it in the room.`,
    mcqs: [
      mcq('"Before I start, a bit of context" is discouraged because the context belongs:',
        [['Where it is needed, not in a block at the front', true],
         ['In the written material rather than the talk', false],
         ['After the two or three main points', false],
         ['Only if the audience asks for it', false]],
        'Delivered up front, it arrives before the audience has a reason to care about it, and much of it is never needed at all.'),
      mcq('The chronology is cut because "first I tried X, then Y, then Z" is:',
        [['How you experienced it, not how it is best heard', true],
         ['Too long for a five-minute talk', false],
         ['Information the audience can read instead', false],
         ['A sequence the audience cannot follow', false]],
        'The order of discovery is rarely the clearest order of explanation, so leading with what worked serves the listener better.'),
    ],
    checkpoint: [
      mcq('Preparing the last sentence specifically is worth more than the effort suggests because it is the part the audience hears last and the part speakers:',
        [['Reliably improvise worst', true],
         ['Are most likely to forget entirely', false],
         ['Deliver with the least confidence', false],
         ['Use to introduce the questions', false]],
        'Improvised endings trail off, and its position means that weakness colours the impression of everything preceding it.'),
      mcq('Writing the talk and counting the words is recommended because almost every first draft is double, and finding that on paper is:',
        [['Cheaper than finding it in the room', true],
         ['The only way to estimate the timing', false],
         ['Required before rehearsing aloud', false],
         ['Faster than rehearsing with a clock', false]],
        'An overrun discovered live forces cuts under pressure, where the same discovery on paper allows them to be chosen.'),
    ],
  },
  {
    unitCode: 'T4_COMM_PRESENT_TAKING_QUESTIONS',
    notes: `**The three honest responses, and why "I do not know, but here is how I would find out"
is one of them.**

## Why this is the part that decides the impression

**The talk was prepared and the questions are not**, so the questions are where the audience
learns whether the understanding is real.

**Which means the question period is worth preparing even though its content cannot be.**

## The three honest responses

**You know it.** Answer, briefly. **Briefly is the discipline** — a question is not an invitation to
deliver the section you cut.

**You partly know it.** Say which part. "I know the write path handles that; I have not checked what
happens on the read side." **That is a complete and honest answer**, and it is far better than
extending the known part to cover the unknown one.

**You do not know it.** **"I do not know, and here is how I would find out."**

**This is a real answer and it is the one people are most reluctant to give.** It demonstrates
knowing the boundary of your own knowledge, which is a harder thing to demonstrate than the
knowledge itself.

## The fourth response, which is not honest

**Bluffing.** It is detected more often than the bluffer believes, and **once detected it
retroactively devalues the prepared talk**, because the audience now has no way to tell which parts
were solid.

## The mechanics

**Let them finish.** Answering a question you have predicted from its first half is frequently
answering a different question.

**Repeat it if the room is large**, which also buys a few seconds.

**Check you answered it.** "Does that cover it?" — one short sentence, and it catches the
misunderstanding immediately rather than after the session.

## The hostile-sounding question

**Usually not hostile.** "Why did you not just use X?" is almost always curiosity in a blunt form,
and the answer is the trade-off: what X would have given, what it would have cost, why the other
choice was made.

**Defensiveness is the failure here**, and it is the more common one.`,
    mcqs: [
      mcq('The question period is worth preparing even though its content cannot be, because the talk was prepared and the questions are:',
        [['Where the audience learns whether the understanding is real', true],
         ['Usually about the material that was cut', false],
         ['The part the speaker controls least', false],
         ['Harder to answer than to anticipate', false]],
        'Unprepared responses reveal the depth behind the prepared material, which is what makes them decisive for the impression.'),
      mcq('Saying which part you know — "I know the write path; I have not checked the read side" — is far better than:',
        [['Extending the known part to cover the unknown one', true],
         ['Deferring the question until afterwards', false],
         ['Asking the questioner to be more specific', false],
         ['Admitting no knowledge of the area at all', false]],
        'The extension is a bluff in gentler form, where the precise boundary is both honest and more informative.'),
    ],
    checkpoint: [
      mcq('Bluffing, once detected, retroactively devalues the prepared talk because the audience now has no way to tell:',
        [['Which parts were solid', true],
         ['Whether the work was the speaker’s own', false],
         ['How much of it had been rehearsed', false],
         ['Which questions were anticipated', false]],
        'A demonstrated willingness to assert without knowing removes the basis for trusting any other confident statement.'),
      mcq('"Why did you not just use X?" is almost always curiosity in a blunt form, and the failure here is:',
        [['Defensiveness', true],
         ['Answering at too much length', false],
         ['Conceding the point too readily', false],
         ['Asking what X would have offered', false]],
        'Treating the question as an attack forfeits the trade-off answer it was actually inviting, and it is the more common reaction.'),
    ],
  },
  {
    unitCode: 'T4_COMM_PRESENT_PRACTICE',
    notes: `**Five minutes on your own work, and the questions afterwards.**

## The drill

**Five minutes, a timer, at least one listener, and five minutes of questions.**

**The questions are half the drill** and are routinely skipped, which is why candidates who have
presented before still handle questions badly.

## The listener's job

**Record when they stopped following.** **Not whether the talk was good** — the specific moment at
which they lost the thread, which is almost always a term used before it was defined or a jump
between two points with no bridge.

**Then ask five questions**, at least one of which they expect you cannot answer.

## What to record

**The time.** **Where they lost you.** **Whether the first thirty seconds said what it was and why
it mattered.** **How the ending landed.** **And how the unanswerable question was handled.**

## Running it without a listener

**Record it.** Markedly less useful for the questions, and still useful for the timing, the fillers
and the ending — all three of which are audible on playback and invisible while speaking.

## The finding that usually comes out

**Overrunning.** A five-minute talk delivered in eight, because the cutting was not done.

**And an ending that trailed off**, which is the single easiest thing on this list to fix and the
one most reliably left unfixed.

## The specific improvement to chase

**The first thirty seconds.** If the listener cannot say what the talk was about after thirty
seconds, nothing later recovers it — the audience spends the rest of the talk assembling the frame
instead of following the content.

## Frequency

**Twice on the same talk**, acting on the first. Then once on a different subject, because the
improvement should be to how you present rather than to one prepared five minutes.`,
    mcqs: [
      mcq('The listener records the specific moment they lost the thread rather than whether the talk was good, and that moment is almost always:',
        [['A term used before it was defined, or an unbridged jump', true],
         ['A point delivered too quickly to follow', false],
         ['The transition into the technical detail', false],
         ['Where the speaker lost their own place', false]],
        'Comprehension breaks at a specific identifiable cause, and naming it gives the speaker something actionable rather than an impression.'),
      mcq('If the listener cannot say what the talk was about after thirty seconds, nothing later recovers it because the audience spends the rest:',
        [['Assembling the frame instead of following the content', true],
         ['Waiting for the speaker to return to the point', false],
         ['Unable to judge which details matter', false],
         ['Forming an impression of the delivery instead', false]],
        'Without a frame, each new piece of information has nowhere to attach, so attention goes to construction rather than comprehension.'),
    ],
    checkpoint: [
      mcq('The question period is described as half the drill and routinely skipped, which is why candidates who have presented before:',
        [['Still handle questions badly', true],
         ['Overrun on the prepared section', false],
         ['Prepare more material than they need', false],
         ['Find the format unfamiliar under pressure', false]],
        'Presenting experience trains the prepared half only, leaving the unprepared half untrained regardless of how often talks are given.'),
      mcq('The trailing ending is described as the single easiest thing on the list to fix and the one most reliably:',
        [['Left unfixed', true],
         ['Noticed by the listener afterwards', false],
         ['Caused by running out of time', false],
         ['Improved by additional rehearsal', false]],
        'One prepared sentence resolves it entirely, yet speakers continue to improvise the moment they are least equipped to improvise.'),
    ],
  },
  {
    unitCode: 'T4_COMM_PRESENT_INTERVIEW_QUESTION',
    notes: `**"Explain your project to somebody non-technical."**

## Why this is asked in technical interviews

**Because explaining to a non-expert requires understanding that explaining to an expert does
not.**

**Jargon can carry an explanation between two people who share it**, and both may be relying on the
word rather than the idea. Removing the jargon removes that possibility, which is precisely why the
question works.

**It is also a job requirement.** Engineers explain things to product managers, to clients and to
the person paying, and a graduate who can only explain to other engineers is limited in a way that
will be noticed.

## The move that does most of the work

**An analogy to something they already know.**

"A cache is like keeping the tools you use most on the bench instead of walking to the cupboard
each time. It is faster, and occasionally the one on the bench is the old version."

**The second sentence is the important half** — an analogy that omits the cost teaches the wrong
thing, and the cost is usually the interesting part.

## What to strip

**Every technology name.** They carry nothing to somebody who does not know them.

**Every acronym.**

**The implementation.** **What it does for somebody, not how it is built.**

## The structure

**The problem somebody had, what the thing does about it, and why it was not trivial.**

"Three people were editing one attendance spreadsheet and overwriting each other. I built something
where everybody works on the same records and nobody's change disappears. The hard part was two
people editing the same row at the same time — deciding who wins, and telling the other person."

**No technology, no jargon, and the difficulty is still visible.**

## The failure

**Simplifying until the difficulty disappears.** "I made a website where people mark attendance"
is accessible and it has thrown away the content — the round is assessing whether you can preserve
the substance while removing the vocabulary, and a version with nothing hard left in it has failed
the second half.`,
    mcqs: [
      mcq('Explaining to a non-expert requires understanding that explaining to an expert does not, because jargon can carry an explanation between two people who share it while both:',
        [['Rely on the word rather than the idea', true],
         ['Omit the details the other already knows', false],
         ['Assume a shared level of experience', false],
         ['Use the term with slightly different meanings', false]],
        'The shared vocabulary substitutes for the concept, so the explanation succeeds without either party holding the underlying idea.'),
      mcq('In the cache analogy, the sentence about the bench copy occasionally being the old version is the important half because an analogy that omits the cost:',
        [['Teaches the wrong thing', true],
         ['Is harder to remember afterwards', false],
         ['Suggests the speaker simplified carelessly', false],
         ['Leaves the listener with no follow-up', false]],
        'The cost is usually the interesting part, and an analogy conveying only the benefit misrepresents what the thing actually is.'),
    ],
    checkpoint: [
      mcq('"I made a website where people mark attendance" is accessible and has thrown away the content, failing the second half of what the round assesses, which is preserving:',
        [['The substance while removing the vocabulary', true],
         ['The technical accuracy of the description', false],
         ['Enough detail to invite follow-up questions', false],
         ['The candidate’s specific contribution', false]],
        'Both halves are required: the explanation must become accessible without the difficulty disappearing from it.'),
      mcq('The structure is the problem somebody had, what the thing does about it, and:',
        [['Why it was not trivial', true],
         ['How long it took to build', false],
         ['Which parts you wrote yourself', false],
         ['What you would improve next', false]],
        'The difficulty is what makes the work worth describing, and it must survive the removal of the technical vocabulary.'),
    ],
  },

  /* ══ T4_COMM_WRITTEN ════════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T4_COMM_WRITTEN_PROFESSIONAL_EMAIL',
    notes: `**Subject, ask, context, in that order — and the length beyond which nobody reads it.**

## The order is the whole unit

**Most people write context, then reasoning, then the ask.** That is the order they thought of it
in.

**The reader wants the opposite**, because they are deciding whether this needs them at all, and
that decision is made in the first line.

## The subject line

**Specific enough to answer without opening.** "Question about the deadline for the internship
form" beats "Query" and beats "Hi sir".

**And it is what the message is findable by three weeks later**, which is a real cost that is paid
by the reader rather than the writer.

## The first line

**The ask.** "Could you confirm whether the deadline is the 15th or the 20th?"

**Then the context**, in as few lines as it takes. **Then anything optional.**

**A reader who stops after the first line still knows what you want**, which is the entire design
goal.

## Length

**Five to six lines for a routine message.** Beyond about ten, the reply rate drops and the reply
quality drops further, because the reader skims and answers the part they noticed.

**If it genuinely needs more, the structure changes**: a one-line summary, then headings or bullets,
and the ask still first.

## The things that cost you

**"Dear Respected Sir/Madam, I hope this email finds you well"** — a whole line before any content,
and it dates the writer.

**"Kindly do the needful."** It means nothing specific, which is the problem with it.

**No greeting and no sign-off at all**, which reads as abrupt in exactly the contexts where you have
the least credit.

**Sending it from an address like \`coolguy_99@\`.** It is the first thing seen and it is free to
fix.

## The check before sending

**Read the first line alone. Does it say what you want?** If it does not, the message is in the
wrong order — and reordering takes fifteen seconds.`,
    mcqs: [
      mcq('Most people write context, reasoning, then the ask — the order they thought of it in — where the reader wants the opposite because they are deciding:',
        [['Whether this needs them at all', true],
         ['How much time to allocate to it', false],
         ['Whether the reasoning is sound', false],
         ['If somebody else should handle it', false]],
        'That decision is made in the first line, so an ask arriving last is read only by somebody who has already chosen to engage.'),
      mcq('Beyond about ten lines the reply rate drops and the reply quality drops further because the reader:',
        [['Skims and answers the part they noticed', true],
         ['Defers the message until later', false],
         ['Loses track of the original question', false],
         ['Assumes no response is needed', false]],
        'A skimmed message produces a partial reply, which is worse than a delayed one because it appears to have been answered.'),
    ],
    checkpoint: [
      mcq('The check before sending is to read the first line alone and ask whether it says what you want, because if it does not:',
        [['The message is in the wrong order', true],
         ['The subject line needs rewriting', false],
         ['The message is too long overall', false],
         ['The ask was not clearly decided', false]],
        'The test isolates the ordering problem directly, and reordering to fix it takes about fifteen seconds.'),
      mcq('A specific subject line also matters because it is what the message is:',
        [['Findable by three weeks later', true],
         ['Sorted by in most email clients', false],
         ['Judged by before the sender is known', false],
         ['Forwarded with when it is escalated', false]],
        'The search cost is paid by the reader rather than the writer, which is why a vague subject is a cost transferred rather than saved.'),
    ],
  },
  {
    unitCode: 'T4_COMM_WRITTEN_STATUS_AND_FOLLOWUP',
    notes: `**Saying where something is without hiding that it is late, and chasing without
irritating.**

## The status update

**Three lines: what is done, what is next, what is blocked.**

**The third line is the one that matters** and it is the one people omit, because saying you are
blocked feels like admitting you failed.

**It is the opposite.** A blocker raised on Tuesday costs somebody ten minutes; the same blocker
discovered on Friday costs the deadline, and everybody involved knows which they would rather have
had.

## Being late

**Say it early, say by how much, say what you need.**

"The import is not going to be ready by Thursday. Realistically Monday. The delay is the duplicate
handling, which is more involved than I estimated. If it would help, I can ship it without the
duplicate check and add that after."

**Four sentences: the fact, the new date, the reason, an option.**

**The option is what turns a problem into a decision somebody can make**, and it is the part
candidates leave out.

## What destroys credibility

**Silence, then a missed deadline.** **It is not the lateness — it is that nobody could plan around
it**, and that is a reputation that is expensive to rebuild because the next estimate is no longer
believed.

**And optimism repeated.** "Almost done" three days running teaches the reader to discount
everything you say about timing.

## Following up

**Once, after a reasonable interval.** Three to five working days for a non-urgent thing.

**Reply to your own message** rather than writing a fresh one, so the context travels with it.

**And make it easy:** "Following up on this — happy to resend anything if it is easier." **No
reproach.** Assume it was missed, because it usually was.

**Twice is the maximum before the channel changes.** A third email will not work and the fourth will
not either; a different person, a different medium, or a decision to let it go.

## The tone that works for a graduate

**Direct and brief, without deference and without informality.** Both extremes are noticed, and
neither costs as much as being unclear does.`,
    mcqs: [
      mcq('The blocked line is the one people omit, and raising a blocker on Tuesday costs somebody ten minutes where discovering it on Friday:',
        [['Costs the deadline', true],
         ['Requires a longer explanation', false],
         ['Makes the delay appear larger', false],
         ['Removes the chance to reprioritise', false]],
        'Time remaining is what converts a small obstacle into a missed commitment, which is why early disclosure is cheaper for everyone.'),
      mcq('In a late-delivery message, the option offered at the end is what turns a problem into:',
        [['A decision somebody can make', true],
         ['A shared responsibility for the delay', false],
         ['An opportunity to renegotiate scope', false],
         ['A smaller inconvenience than it was', false]],
        'Without an alternative the recipient can only absorb the news, where a choice lets them act on it.'),
    ],
    checkpoint: [
      mcq('What destroys credibility is not the lateness but that:',
        [['Nobody could plan around it', true],
         ['The estimate was wrong to begin with', false],
         ['The reason was not explained properly', false],
         ['The work was not reprioritised in time', false]],
        'The cost falls on everyone whose own work depended on the date, and rebuilding it is slow because later estimates are discounted.'),
      mcq('Twice is the maximum follow-up before the channel changes because a third email:',
        [['Will not work, and the fourth will not either', true],
         ['Reads as pressure rather than a reminder', false],
         ['Should be escalated to a manager instead', false],
         ['Is usually filtered out automatically', false]],
        'Two unanswered messages establish that this route is not producing a response, so repetition of it is not the remedy.'),
    ],
  },
  {
    unitCode: 'T4_COMM_WRITTEN_PRACTICE',
    notes: `**The three messages you will write in your first fortnight, written now.**

## The three

**A question to somebody senior.** You are stuck, you have tried things, you need ten minutes.

**A status update including a delay.** Something is late and you are saying so before you are asked.

**A follow-up on something unanswered.** A week has passed and you still need the answer.

**These three cover most of what a graduate writes in their first month**, and all three are
written badly by default — the first apologises too much, the second buries the delay, the third
either nags or never gets sent.

## Writing the first one properly

**What you are trying to do, what you have already tried, the specific question.**

**The middle part is what earns the ten minutes.** "I have checked the logs and the config and it
only happens on the staging environment" tells the reader you are not asking them to do the first
three steps for you.

**And it frequently answers the question while you write it**, which is a cost-free benefit of
writing it out.

## The check for each

**First line names the ask.** **Under six lines.** **Subject answerable without opening.** **No
apology beyond one short clause.** **A specific next step.**

**Five checks, applied to each of the three.**

## The review

**Give them to somebody and ask one question: what do I want?**

**If they have to read past the first line, it is in the wrong order** — which is the same finding
almost every time and the reason the order is the thing being drilled rather than the wording.

## The rewrite

**Cut each message by a third without losing the ask.** **Almost always possible**, and doing it
once calibrates what the natural length actually is.

## Keeping them

**Keep the three.** They become templates, and the second month's versions are written in ninety
seconds because the shape is already decided.`,
    mcqs: [
      mcq('In the question to somebody senior, the account of what you have already tried is what earns the ten minutes because it tells the reader:',
        [['You are not asking them to do the first three steps', true],
         ['How urgent the problem has become', false],
         ['That the issue is genuinely difficult', false],
         ['Which area of expertise is needed', false]],
        'The prior work establishes that their time is being asked for at the point where it is actually required.'),
      mcq('Writing out what you have tried frequently answers the question while you write it, which is:',
        [['A cost-free benefit of writing it out', true],
         ['A reason to delay sending for a day', false],
         ['Evidence the question was premature', false],
         ['Why the message should be drafted twice', false]],
        'The articulation forces the problem into order, and no additional effort was spent to obtain that outcome.'),
    ],
    checkpoint: [
      mcq('The reviewer is asked only "what do I want?", and if they have to read past the first line the message is in the wrong order — which is the same finding almost every time, and the reason:',
        [['The order is drilled rather than the wording', true],
         ['A second reviewer is usually needed', false],
         ['The messages should be shorter overall', false],
         ['The subject line matters more than the body', false]],
        'A consistently recurring defect is structural, so the practice targets the structure rather than the phrasing.'),
      mcq('Keeping the three messages is recommended because they become templates and the second month’s versions are written in ninety seconds, since:',
        [['The shape is already decided', true],
         ['The recipients are already familiar', false],
         ['The wording can be reused directly', false],
         ['The checks no longer need applying', false]],
        'Most of the cost is in choosing the structure, which does not have to be paid again once a working version exists.'),
    ],
  },
  {
    unitCode: 'T4_COMM_WRITTEN_CHECKPOINT',
    notes: `**Whether the spoken and written standard is there, measured rather than felt.**

## The bar

**Spoken:** a five-minute talk on your own work, timed. **The first thirty seconds say what it is
and why it matters.** **The listener can follow throughout.** **It ends deliberately.** **And one
question you cannot answer is handled honestly rather than bluffed.**

**Written:** three messages. **The ask in the first line.** **Under six lines.** **A delay stated
rather than buried.** **A follow-up with no reproach in it.**

**Behavioural:** two unseen questions answered with a real event, a first-person action and a
stated result.

## What a weak result means

**Overran the talk**: cutting was not done. Write it and count the words.

**Listener lost the thread**: a term used before it was defined, almost always. It is a specific
fixable moment rather than a general quality.

**Bluffed a question**: **the most costly single item on this list**, because it retroactively
devalues everything that was prepared.

**Ask buried in the email**: the order. Fifteen seconds to fix, and it is the most common finding
in the written half.

**Delay buried**: the habit that damages credibility fastest in a first job, and the one nobody is
told about until they have already done it.

**Answer with no event in it**: the story set is thin. Six events, written down.

## Why this checkpoint sits where it does

**Because everything after it is performance.** The mocks, the simulation and the capstone defence
all assume this standard is in place, and a candidate arriving at mock 9 without it spends the
debrief on things that should have been settled here.

## What this feeds

**Mock 9**, **P23's HR round**, **the capstone defence**, and **the first fortnight of the job** —
which is the only item on this list that is not an interview and is the one it matters most for.`,
    checkpoint: [
      mcq('Bluffing a question is the most costly single item on the list because it:',
        [['Retroactively devalues everything that was prepared', true],
         ['Is remembered longer than a weak answer', false],
         ['Suggests the work was not the speaker’s own', false],
         ['Cannot be corrected later in the session', false]],
        'Once a confident assertion is shown to be unfounded, the listener has no way to tell which other confident statements were solid.'),
      mcq('The listener losing the thread is described as a specific fixable moment rather than a general quality because it is almost always:',
        [['A term used before it was defined', true],
         ['A section delivered too quickly', false],
         ['The point at which the talk overran', false],
         ['An effect of nervousness in delivery', false]],
        'Comprehension breaks at an identifiable cause, which means the remedy is a single edit rather than a change in presenting ability.'),
      mcq('Burying a delay is described as the habit that damages credibility fastest in a first job, and the one nobody is told about until:',
        [['They have already done it', true],
         ['A deadline has been missed twice', false],
         ['Their manager raises it directly', false],
         ['It affects somebody else’s work', false]],
        'Workplaces assume the standard rather than teaching it, so the lesson usually arrives as a consequence rather than as instruction.'),
      mcq('This checkpoint sits before the mocks because everything after it is performance, and a candidate arriving at mock 9 without this standard:',
        [['Spends the debrief on things that should have been settled here', true],
         ['Is unlikely to complete the round at all', false],
         ['Performs worse on the technical mocks too', false],
         ['Has to repeat the earlier communication units', false]],
        'The mocks exist to find performance gaps, so occupying them with unmet prerequisites wastes the feedback they were meant to produce.'),
    ],
  },
];
