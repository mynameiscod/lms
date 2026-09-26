/**
 * T3_CODE_REVIEW_DEPTH and T3_DOCUMENTATION — seven units. Year 3. Finishes S05.
 *
 * ── THESE TWO TOPICS ARE ABOUT OTHER PEOPLE ───────────────────────────────────────────────
 *
 * Which makes them the two most commonly skipped in a technical curriculum, and two of the
 * three or four things that most visibly separate a competent graduate from an employable one.
 *
 * Code review is taught here as a social act with a technical subject, because that is what it
 * is. The order — correctness, then design, then names — exists because reviewers reliably
 * invert it: style comments are easy to write and a wrong business rule is hard to see, so
 * without an explicit order the review finds the cheap things and misses the expensive one.
 *
 * WORDING_A_COMMENT attributes to TECHNICAL_COMMUNICATION rather than CODE_REVIEW, and that is
 * the right call: the skill in it is getting a change made by somebody who does not have to
 * agree with you, and that skill is not about code.
 *
 * RECEIVING_REVIEW exists because silent compliance is taught by accident. A student who
 * learns that the correct response to every comment is "done" becomes an engineer who ships
 * things they know are wrong, and the unit says so directly.
 *
 * Documentation is written against the one failure that matters: recording what, when only why
 * is unrecoverable. The code already says what. Nothing but a person can say why, and when that
 * person leaves, the reason leaves with them — and then somebody removes the strange-looking
 * line and reintroduces the incident it was there to prevent.
 *
 * Attribution: T3_CODE_REVIEW_DEPTH defaults to CODE_REVIEW with WORDING_A_COMMENT overridden.
 * T3_DOCUMENTATION is single-skill (TECHNICAL_WRITING) and derived.
 */

import { PilotBundle } from './pilotUnitContent';

const mcq = (
  question: string, options: [string, boolean][], explanation: string,
) => ({ question, options: options.map(([text, isCorrect]) => ({ text, isCorrect })), explanation });

export const REVIEW_DOCS_BUNDLES: PilotBundle[] = [
  /* ══ T3_CODE_REVIEW_DEPTH ═══════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_CODE_REVIEW_DEPTH_UNDERSTAND_FIRST',
    notes: `A review that opens by hunting for something to say finds a naming inconsistency and
misses that the discount is applied before tax instead of after.

**The first job of a review is to understand the change.** Only then is there anything worth
saying about it.

## Before the diff

Read the description and the ticket. If you cannot say **what problem this solves** in one
sentence, you cannot review it — and that itself is the first comment: *"I can't tell from the
description what this is fixing. Can you add a line?"*

That comment is not pedantry. If the reviewer cannot tell, neither can the person reading the
commit in two years, and this is the cheapest moment to fix it.

## Reading a diff is not reading code

A diff shows you changed lines and hides the code they sit in. That is the wrong shape for
understanding, and it is why review comments skew towards the local and the cosmetic — those
are the only things visible in a narrow window.

**Open the file.** Read the function the change lives in, whole. Read its callers if the
signature moved. For anything non-trivial, **check the branch out and run it** — you will
understand more in two minutes than in twenty of reading, and you will occasionally find that
it does not work at all.

## Four questions, in order

1. **What is this trying to do?** From the description and the ticket.
2. **Does it do that?** Trace one realistic case through the new code by hand.
3. **What else does it do?** Side effects, other callers, things touched incidentally.
4. **What happens when it goes wrong?** Empty input, the network down, two at once.

Only after all four is there anything useful to say about naming.

## Ask before asserting

You are missing context that the author has. They have been in this code for two days; you have
been in it for ten minutes.

> "This looks like it would double-charge if the callback arrives twice. Is there something
> upstream that prevents that?"

If there is, you have learned something and cost them one sentence. If there is not, you have
found a real bug and they will fix it without having been told they were careless. **The
question form is strictly better in both branches**, which is unusual for a piece of advice.

## What a review is not for

- **Not a place to redesign.** If the whole approach is wrong, that is a conversation, not
  fourteen comments on a pull request.
- **Not a style argument.** Formatting belongs to a formatter, and if you are arguing about it
  in a review, the missing thing is a tool.
- **Not a demonstration.** Comments written to show what you know cost the author time and
  teach them nothing.

## Size, which is the thing nobody controls

**Beyond about 400 lines, review quality falls off sharply.** People skim, approve, and believe
a review happened — which is worse than no review, because everyone is now relying on it.

If you are handed a 2,000-line change, saying *"I can't review this properly — can we split it,
or shall we walk through it together?"* is the correct professional response, and it is far more
useful than an approval you do not mean.`,
    mcqs: [
      mcq('The first job of a code review is to:',
        [['Understand what the change is doing', true],
          ['Check the change against the style guide', false],
          ['Verify the tests cover the new code', false],
          ['Find at least one thing to improve', false]],
        'A review that opens by hunting for something to say finds naming and misses the rule.'),
      mcq('Review comments skew cosmetic partly because:',
        [['A diff hides the code the changed lines sit in', true],
          ['Style issues are the most common defects', false],
          ['Reviewers avoid commenting on logic', false],
          ['Automated tools already check correctness', false]],
        'The narrow window makes local things the only visible ones. Open the file.'),
      mcq('Asking "is there something upstream that prevents that?" is better because:',
        [['It is the stronger move whether or not you are right', true],
          ['It softens criticism the author may resent', false],
          ['It avoids committing to a claim you cannot support', false],
          ['It invites the author to explain their design', false]],
        'Right: a real bug, found politely. Wrong: you learned something, at a cost of one sentence.'),
      mcq('Being handed a 2,000-line change, the correct response is:',
        [['Say you cannot review it properly and propose a way forward', true],
          ['Review the most important files and approve', false],
          ['Approve it and follow up with issues later', false],
          ['Read it over several sessions to stay accurate', false]],
        'An approval you do not mean is worse than none, because people rely on it.'),
    ],
    checkpoint: [
      mcq('"I cannot tell what this is fixing" as a first comment is:',
        [['Legitimate, and the cheapest moment to fix it', true],
          ['Pedantic, unless the change is large', false],
          ['A matter for the ticket rather than the review', false],
          ['Better raised privately with the author', false]],
        'If the reviewer cannot tell, neither can whoever reads the commit in two years.'),
      mcq('If the whole approach seems wrong, you should:',
        [['Have a conversation rather than write many comments', true],
          ['Write one blocking comment explaining why', false],
          ['Approve it and raise a follow-up ticket', false],
          ['Comment on each place the approach shows', false]],
        'A review is not the place to redesign, and fourteen comments is not a discussion.'),
      mcq('Arguing about formatting in a review indicates:',
        [['A missing tool', true],
          ['A disagreement about the style guide', false],
          ['A reviewer with too little to say', false],
          ['A codebase without conventions', false]],
        'Formatting belongs to a formatter; the argument is a symptom.'),
    ],
  },

  {
    unitCode: 'T3_CODE_REVIEW_DEPTH_WHAT_TO_LOOK_AT_FIRST',
    notes: `Reviewers invert the order without meaning to. Style comments are easy to write and
a wrong business rule is hard to see, so a review without a deliberate order finds the cheap
things and misses the expensive one.

**A well-formatted wrong answer is still wrong.**

## The order

### 1. Correctness

Does it do what it claims? Trace a realistic case by hand. Then the ones nobody thought about:
empty, one, many, wrong, concurrent, the second time.

Then ask the questions the author was too close to ask:

- What happens if this runs twice? Retries, double-clicks, redelivered messages.
- What happens if it fails halfway? Is anything left inconsistent?
- What if the input comes from a user who is trying to break it?

### 2. Design

Is this in the right place? Does it fit what is already there, or is it a second way of doing
something that already had one?

**The most valuable design comment is usually "we already have this"** — a duplicated helper is
invisible to the author, who searched for the wrong word, and obvious to a reviewer who
remembers it.

### 3. Tests

Do they test the behaviour or the implementation? A test that asserts the internal call sequence
breaks on every refactor and catches nothing.

**Would the tests fail if the change were wrong?** That is the only question that matters here,
and you can check it: pick one assertion and imagine the bug it is meant to catch.

### 4. Readability

Will somebody understand this in a year? Names that say what, comments where the *why* is not
obvious, nesting that does not need to be there.

### 5. Style

The formatter's job. If you are commenting on it, fix the tooling instead.

## Weight your comments

Say which kind each one is, so the author can triage:

- **Blocking** — I believe this is wrong, and it should not merge as it is.
- **Suggestion** — I think this would be better; your call.
- **Question** — I do not understand this; educate me.
- **Nit** — trivial, take it or leave it. Label it, and mean it.

**An unweighted review is a wall of equal-looking comments**, and the author either does all of
them or guesses which you meant.

## Approving

**Approve when it is better than what is there, not when it is perfect.** A change that improves
the codebase and has three non-blocking suggestions should be approved with the suggestions
attached. Holding it for perfection teaches the team to make bigger changes less often, which
is the opposite of what you want.

The exception is the one you must not waive: **if you cannot tell whether it is correct, do not
approve it.** Say so. That is not an obstruction, it is the only honest option.`,
    mcqs: [
      mcq('The review order is correctness, then design, then tests, then:',
        [['Readability, and style last', true],
          ['Style, and readability last', false],
          ['Performance, then readability', false],
          ['Naming, then documentation', false]],
        'Style is the formatter’s job; if you are commenting on it, fix the tooling.'),
      mcq('The most valuable design comment is usually:',
        [['We already have something that does this', true],
          ['This should live in a different layer', false],
          ['This class is taking on too much', false],
          ['This could be simplified considerably', false]],
        'Invisible to an author who searched for the wrong word; obvious to whoever remembers it.'),
      mcq('The only question that matters about a test in review is:',
        [['Would it fail if the change were wrong', true],
          ['Does it cover every branch of the code', false],
          ['Is it readable by someone unfamiliar', false],
          ['Does it run quickly enough to keep', false]],
        'Pick an assertion and imagine the bug it is meant to catch.'),
      mcq('Comments should be weighted because:',
        [['Otherwise the author cannot tell which matter', true],
          ['It reduces the number of comments needed', false],
          ['It makes the review faster to write', false],
          ['It records the reviewer’s confidence', false]],
        'An unweighted review is a wall of equal-looking comments.'),
    ],
    checkpoint: [
      mcq('You should approve a change when:',
        [['It is better than what is there now', true],
          ['Every comment has been addressed', false],
          ['It meets the team’s quality standard', false],
          ['The tests cover all the new lines', false]],
        'Holding for perfection teaches the team to make bigger changes less often.'),
      mcq('If you cannot tell whether a change is correct, you should:',
        [['Say so, and not approve it', true],
          ['Approve it and note your uncertainty', false],
          ['Ask another reviewer to take it instead', false],
          ['Approve it if the tests are thorough', false]],
        'The one exception that cannot be waived; it is the only honest option.'),
      mcq('A test asserting the internal call sequence:',
        [['Breaks on every refactor and catches nothing', true],
          ['Verifies the implementation is as designed', false],
          ['Is acceptable for integration-level tests', false],
          ['Catches regressions in the call ordering', false]],
        'Behaviour, not implementation — which is the test-design topic’s central line.'),
    ],
  },

  {
    unitCode: 'T3_CODE_REVIEW_DEPTH_WORDING_A_COMMENT',
    notes: `A review comment has one job: **the problem gets fixed, and the author is willing to
send you the next change.** Both halves. A comment that gets the fix and costs you the
relationship has failed, because there are a hundred more changes coming.

This is a writing skill, not a code skill, and it is learnable in an afternoon.

## Say what and why, not just what

> "Use a set here."

The author does not know why, so they either comply without understanding or push back with
nothing to push against.

> "This is a list, so the \`in\` check is O(n) inside a loop over n. A set would make it constant
> — at 50,000 users that is the difference between fast and minutes."

Same instruction, now actionable, arguable and educational. **If the author disagrees, they can
disagree with something**, which is the point.

## The question form

> "Is there a reason this doesn't use the existing \`normalise_email\` helper?"

Better than "use the existing helper" whichever way it turns out. If there is a reason, you have
learned it. If there is not, they will use it — and they were not told they had missed
something obvious.

**Use it genuinely.** A rhetorical question that everyone can tell is an instruction —
*"Did you consider testing this at all?"* — is worse than the instruction, because it is an
instruction plus sarcasm.

## Comment on the code, not the person

- "This function is confusing" — the code.
- "You've written this confusingly" — the person.

They land very differently and cost the same to write. Prefer "this" and "the code" to "you",
and it happens by itself.

## Label the weight

> **nit:** trailing whitespace here.
> **suggestion:** a parameter object might read better; your call.
> **blocking:** this will double-charge on a retry.

Three words of prefix, and the author knows exactly what to do with each.

## Praise specifically

> "The fallback here is nice — I wouldn't have thought of the timeout case."

This is not politeness. **Reviews where the only signal is negative teach people to fear
sending changes**, and that is how you end up with big infrequent ones. One specific
observation per review is enough, and it must be specific — "nice work" reads as filler.

## Three that go wrong

**The essay.** Six paragraphs on a design philosophy, attached to a four-line change. If it
takes six paragraphs, it is a conversation.

**The drive-by.** Forty comments, all trivial, all at once. However correct each one is, the
effect is that the author dreads your name on a review.

**The stale objection.** Restating a point the team settled last month. If you lost that
argument, this is not where to reopen it.

## When you are wrong

> "Ah, I see — the retry is handled by the queue. Ignore me."

Say it explicitly and quickly. Silently withdrawing leaves the author unsure whether they have
satisfied you, and an unresolved comment blocks merges in most tools. **It costs one line and
it is the single cheapest thing you can do for your reputation as a reviewer.**`,
    mcqs: [
      mcq('A review comment has two jobs: the fix happens, and:',
        [['The author is willing to send you the next change', true],
          ['The reasoning is recorded for future readers', false],
          ['The author learns something from it', false],
          ['The team standard is applied consistently', false]],
        'There are a hundred more changes coming; a comment that costs the relationship failed.'),
      mcq('"Use a set here" is a weak comment because:',
        [['The author cannot agree or disagree with anything', true],
          ['It does not say where in the file to change', false],
          ['It is phrased as an instruction', false],
          ['It assumes the author knows the reason', false]],
        'They comply without understanding, or push back with nothing to push against.'),
      mcq('A rhetorical question in a review is:',
        [['Worse than the plain instruction', true],
          ['A softer way to raise a serious issue', false],
          ['Acceptable when the point is obvious', false],
          ['Equivalent to asking genuinely', false]],
        'It is an instruction plus sarcasm, and everyone can tell.'),
      mcq('Specific praise in reviews matters because:',
        [['Only-negative signal teaches people to fear sending changes', true],
          ['It balances the tone of the review', false],
          ['It confirms the reviewer read the whole change', false],
          ['It encourages the author to review others', false]],
        'And that is how you end up with big, infrequent changes.'),
    ],
    checkpoint: [
      mcq('"This function is confusing" is better than "you have written this confusingly" because:',
        [['One is about the code and one is about the person', true],
          ['It is shorter and easier to read', false],
          ['It avoids assigning blame for the change', false],
          ['It leaves room for the author to disagree', false]],
        'They land very differently and cost the same to write.'),
      mcq('Forty trivial comments at once is a problem because:',
        [['The author comes to dread your name on a review', true],
          ['Most of them will not be addressed', false],
          ['It takes too long for the author to read', false],
          ['It obscures the one important comment', false]],
        'However correct each one is individually.'),
      mcq('When you realise your review comment was wrong, you should:',
        [['Say so explicitly, in one line', true],
          ['Resolve the thread without comment', false],
          ['Leave it, since the author can ignore it', false],
          ['Explain what led you to the wrong reading', false]],
        'Silent withdrawal leaves them unsure, and unresolved comments block merges.'),
    ],
  },

  {
    unitCode: 'T3_CODE_REVIEW_DEPTH_RECEIVING_REVIEW',
    notes: `Receiving review well is a separate skill from giving it, and it is the one nobody
is taught. The default a student picks up is **silent compliance** — every comment gets "done"
and the change gets made — and that default produces engineers who ship things they know are
wrong.

## Compliance is a failure mode

If you disagree and change it anyway without saying so, three things happen:

1. **The code gets worse**, by your own assessment.
2. **The reviewer learns nothing.** They will make the same comment next week, believing it was
   right both times.
3. **You have transferred responsibility for a decision you understood better.**

**"They're more senior, so they must be right" is not a reason.** They are more senior and they
have spent ten minutes on this; you have spent two days. Seniority is a prior, not a proof.

## Disagreeing usefully

> "I did consider that, but the callback can arrive before the record is committed, so the
> lookup would miss. That's why it's ordered this way. Happy to add a comment explaining it —
> would that help?"

The shape is: **acknowledge, give the reason, propose a way forward.**

- **Acknowledge** — shows you read it rather than defended reflexively.
- **The reason** — the actual technical content, which they lacked.
- **A way forward** — very often the right resolution is neither your version nor theirs but a
  comment in the code, because the reviewer's confusion is real evidence that the code is
  confusing.

**That last point is worth pausing on.** A reviewer who misreads your code has demonstrated
something true about the code. Even when you are right about the logic, you may be wrong about
its clarity, and the comment they prompted is the fix.

## When you do not know who is right

Say that. *"I'm not sure — I think mine handles the retry case but I might be wrong. Can we look
at it together for five minutes?"*

Five minutes of conversation beats four rounds of comments, and neither of you has to be right
in writing first.

## What not to do

**Do not argue in the thread past two exchanges.** If two rounds have not resolved it, the
medium is wrong. Talk.

**Do not take it personally**, and notice that this is easier to say than to do. A comment on
your code is not a comment on you — but your first reaction may not know that, and the
practical technique is simply: read all the comments, then wait. Reply after the reaction has
passed rather than during it.

**Do not silently ignore comments.** Every one gets a response, even if it is "good point, but
I'm leaving it for now because X". An ignored comment is worse than a rejected one — the
reviewer cannot tell whether you disagreed or did not read it.

## The signal you are doing it right

**The reviewer occasionally says "ah, I see — you're right".** If that never happens, one of
two things is true: you are always wrong, which is unlikely, or you are complying silently,
which is the failure this unit is about.`,
    mcqs: [
      mcq('Silently complying with a comment you disagree with:',
        [['Makes the code worse and teaches the reviewer nothing', true],
          ['Is acceptable when the reviewer is more senior', false],
          ['Saves time that a discussion would consume', false],
          ['Is the right default for a junior engineer', false]],
        'And it transfers a decision you understood better than they did.'),
      mcq('"They are more senior so they must be right" fails because:',
        [['Seniority is a prior, not a proof', true],
          ['Senior engineers make more assumptions', false],
          ['Reviews should be judged on content alone', false],
          ['It discourages junior engineers from learning', false]],
        'They have spent ten minutes on this; you have spent two days.'),
      mcq('The shape of a useful disagreement is:',
        [['Acknowledge, give the reason, propose a way forward', true],
          ['Explain, defend, and ask for a second opinion', false],
          ['Concede the point and raise a follow-up ticket', false],
          ['Restate the requirement the code satisfies', false]],
        'And the way forward is often a comment in the code rather than either version.'),
      mcq('A reviewer misreading your correct code demonstrates:',
        [['Something true about the code’s clarity', true],
          ['That the reviewer lacked context', false],
          ['That the change needed a better description', false],
          ['That the logic should be simplified', false]],
        'You may be right about the logic and wrong about how it reads.'),
    ],
    checkpoint: [
      mcq('Past two exchanges in a review thread, you should:',
        [['Move to a conversation', true],
          ['Escalate to a third reviewer', false],
          ['Accept the reviewer’s position', false],
          ['Summarise both positions in writing', false]],
        'If two rounds have not resolved it, the medium is wrong.'),
      mcq('An ignored comment is worse than a rejected one because:',
        [['The reviewer cannot tell if you disagreed or did not read it', true],
          ['It leaves the thread unresolved in the tool', false],
          ['It suggests the review was not valued', false],
          ['The same comment will be made again later', false]],
        'Every comment gets a response, even "leaving it for now because X".'),
      mcq('The signal that you are receiving review well is:',
        [['The reviewer sometimes says you were right', true],
          ['You address every comment before merging', false],
          ['Reviews come back with fewer comments over time', false],
          ['You agree with most of what is raised', false]],
        'If it never happens, you are probably complying silently.'),
    ],
  },

  /* ══ T3_DOCUMENTATION ═══════════════════════════════════════════════════════════════ */
  {
    unitCode: 'T3_DOCUMENTATION_WHY_NOT_WHAT',
    notes: `The code already says what it does, accurately, and it stays accurate because it is
the thing that runs.

**Only a person can say why.** And when that person leaves, the reason leaves with them —
unless it was written down.

## The comment that adds nothing

    # increment the counter
    counter += 1

    # loop through the users
    for user in users:

These are not neutral. They cost reading time, they drift out of date, and they train readers to
skip comments — so the one comment in the file that matters gets skipped too.

## The comment that saves a week

    # Round half-up rather than banker's rounding.
    # Finance reconciliation fails against the payment provider otherwise: they
    # round half-up, and the 0.005 cases diverged by ~£40/month. See INC-2291.
    return decimal.Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)

Without it, the next engineer sees a non-default rounding mode, "fixes" it to the language
default, and reintroduces an incident that took a week to diagnose.

**The test for whether a comment is worth writing:** could somebody remove this line, in good
faith, believing they are improving things? If yes, say why it is there.

## Four kinds worth writing

**1. Why this and not the obvious thing.** Any time the code deviates from what a reader would
expect, the deviation needs a reason attached — otherwise it looks like a mistake and will be
corrected.

**2. Constraints from outside the code.** *"The vendor's API rejects batches over 500, despite
what their documentation says."* Nothing in your codebase can tell anyone this.

**3. Non-obvious consequences.** *"Changing this order breaks the audit log, which assumes the
write happens before the notification."*

**4. Genuinely tricky logic.** Rare, and often a sign the code should be clearer — but a
bit-manipulation trick or a subtle algorithm earns a sentence.

## The three that go stale, and what to do instead

**Describing what the code does.** It will drift, and then it is worse than nothing because
readers believe it.

**Duplicating a signature.** The types are in the signature. Say what the function is *for*, or
say nothing.

**Commented-out code.** Delete it. It is in version control. Commented-out code is a message
nobody can interpret: is it broken, is it coming back, is it an example? Nobody will ever dare
remove it either, so it stays for years.

## Where a comment belongs is not always a comment

- **A name.** A well-named function needs no comment saying what it does. That is the first
  option, and it does not go stale.
- **A test.** "This handles the empty case" is better as a test called
  \`test_empty_list_returns_zero\`, which fails if it stops being true.
- **A commit message.** Why this change was made, at this time, belongs there.
- **A decision record.** Anything bigger than a function — that is the next unit.

**A comment is the right home when the why is local to these lines and has to be seen by
whoever edits them.** That is a narrow case, and it is exactly the case where a comment is worth
a great deal.`,
    mcqs: [
      mcq('The test for whether a comment is worth writing is:',
        [['Could somebody remove this line in good faith, thinking they are improving it', true],
          ['Would a new engineer understand the line without it', false],
          ['Is the logic more than a few lines long', false],
          ['Does the line use an unusual language feature', false]],
        'If yes, say why it is there — otherwise it looks like a mistake and gets corrected.'),
      mcq('"# increment the counter" is harmful, not merely useless, because:',
        [['It trains readers to skip comments, including the one that matters', true],
          ['It will become inaccurate as the code changes', false],
          ['It suggests the code is hard to understand', false],
          ['It adds to the length of the file', false]],
        'The cost is paid on the one comment in the file that is load-bearing.'),
      mcq('Commented-out code should be deleted because:',
        [['Nobody can tell what it means, so nobody removes it', true],
          ['It slows the file down when parsed', false],
          ['It confuses automated tooling', false],
          ['It may be executed accidentally later', false]],
        'Broken? Coming back? An example? It stays for years because nobody dares.'),
      mcq('"This handles the empty case" is better expressed as:',
        [['A test that fails if it stops being true', true],
          ['A comment above the relevant branch', false],
          ['A line in the function docstring', false],
          ['An assertion at the top of the function', false]],
        'A comment describes; a test enforces.'),
    ],
    checkpoint: [
      mcq('A comment is the right home for a "why" when:',
        [['It is local to those lines and must be seen by whoever edits them', true],
          ['It is too short to justify a decision record', false],
          ['The reasoning may change in future', false],
          ['No test could reasonably capture it', false]],
        'A narrow case, and exactly where a comment is worth a great deal.'),
      mcq('Which is the first option to consider before writing a comment?',
        [['A better name, which cannot go stale', true],
          ['A docstring on the enclosing function', false],
          ['A line in the project README', false],
          ['A note in the commit message', false]],
        'It carries the same information and stays accurate for free.'),
      mcq('"The vendor rejects batches over 500 despite their docs" belongs in a comment because:',
        [['Nothing in the codebase could tell anyone this', true],
          ['It documents an external dependency version', false],
          ['It explains a constant that looks arbitrary', false],
          ['It records a limitation that may be lifted', false]],
        'Constraints from outside the code are the clearest case for writing one.'),
    ],
  },

  {
    unitCode: 'T3_DOCUMENTATION_DECISION_RECORDS',
    notes: `Some decisions are bigger than a comment. "We chose Postgres over DynamoDB" does not
belong above a line of code, and it is exactly the thing somebody will question in eighteen
months.

A **decision record** is a short document — half a page — capturing one decision at the moment
it was made.

## The format

**Title.** The decision, as a statement. *"Use Postgres for the primary store."* Not "Database
choice", which tells a future reader nothing from an index.

**Status.** Proposed, accepted, or superseded by a later record. **Never edit an accepted
record** — write a new one that supersedes it. The old reasoning stays visible, and that matters
because the reasoning is the point.

**Context.** What was true when this was decided. Team size, expected load, deadlines,
constraints, what you knew and did not.

**This is the most valuable section and the one people skip.** A future reader's real question
is not "what did they choose" — they can see that — but *"would they choose it again?"* Only
the context answers that, and only the context lets them see which assumptions have since
changed.

**Decision.** What you are doing.

**Consequences.** What follows — good and bad. **The bad ones especially.** A record listing
only benefits is marketing, and a reader who hits a cost that was never acknowledged stops
trusting the whole file.

## An example, compressed

> **Use Postgres for the primary store.** *Accepted, 2024-03.*
>
> **Context.** Four engineers, all of whom know SQL and none of whom has run a distributed
> store. Expected load under 1,000 writes/second for at least a year. Reporting requirements
> are unclear and likely to involve ad-hoc joins.
>
> **Decision.** Postgres, single instance, managed.
>
> **Consequences.** Ad-hoc reporting stays easy. Scaling writes beyond a single instance will
> need work we have not planned. We are accepting a single point of failure until we add a
> replica. Team velocity is higher than a new-technology option in the first year.

Eight sentences. In two years, somebody asks "why not DynamoDB?" and the answer is there — along
with the load assumption they can check against reality.

## When to write one

**One-way doors, and anything you would have to explain twice.**

- A significant technology choice.
- An architectural boundary.
- A convention everyone must follow.
- A deliberate deviation from the obvious thing.
- **A decision you argued about.** If the team disagreed, write it down — the disagreement will
  recur otherwise.

**Do not write one for a two-way door.** A record about a folder structure will be wrong in a
month, nobody will delete it, and writing them for everything is how a team learns to ignore the
whole practice.

## Keeping them

In the repository, next to the code, in version control. \`docs/decisions/0007-use-postgres.md\`.
Numbered, so they order. In the repo rather than a wiki, because a wiki is somewhere else and
"somewhere else" is where documentation goes to become wrong.

**And they are short on purpose.** A half-page record gets written and gets read. A four-page
one gets neither.`,
    mcqs: [
      mcq('The most valuable section of a decision record is:',
        [['Context, because it says whether you would choose it again', true],
          ['Decision, because it states what was chosen', false],
          ['Consequences, because it lists the trade-offs', false],
          ['Status, because it shows whether it still applies', false]],
        'And it is the section people skip.'),
      mcq('An accepted decision record should be:',
        [['Superseded by a new one, never edited', true],
          ['Updated when the reasoning changes', false],
          ['Deleted once it no longer applies', false],
          ['Revised to reflect what actually happened', false]],
        'The old reasoning stays visible, and the reasoning is the point.'),
      mcq('A record listing only benefits:',
        [['Reads as marketing and costs the file its credibility', true],
          ['Is acceptable if the costs were minor', false],
          ['Should be supplemented by a later record', false],
          ['Is the normal form for an accepted decision', false]],
        'A reader who hits an unacknowledged cost stops trusting the whole set.'),
      mcq('Decision records belong in the repository rather than a wiki because:',
        [['Somewhere else is where documentation goes to become wrong', true],
          ['Wikis lack version control entirely', false],
          ['Engineers cannot access the wiki easily', false],
          ['They need to be reviewed alongside code', false]],
        'Next to the code, numbered, in version control.'),
    ],
    checkpoint: [
      mcq('A decision the team argued about should be recorded because:',
        [['The disagreement will otherwise recur', true],
          ['It documents who was responsible', false],
          ['Contested decisions are more likely wrong', false],
          ['It shows the process was followed', false]],
        'Which is one of the clearest triggers for writing one.'),
      mcq('The title of a decision record should be:',
        [['The decision, stated', true],
          ['The area it concerns', false],
          ['The question being answered', false],
          ['The date and the author', false]],
        '"Database choice" tells a future reader nothing from an index.'),
      mcq('Records are kept short because:',
        [['A half-page gets written and gets read', true],
          ['Long records take too long to review', false],
          ['Detail belongs in the code comments', false],
          ['They must fit the standard template', false]],
        'A four-page one gets neither.'),
    ],
  },

  {
    unitCode: 'T3_DOCUMENTATION_README_THAT_WORKS',
    notes: `A README has exactly one job: **get somebody from nothing to a running system.**

Most READMEs fail it. They describe the architecture beautifully and never say how to start the
thing.

## The order

**1. What is this, in one or two sentences.** Someone arrives from a search result with no
context. *"An API for scheduling and delivering customer notifications. Used by the web app and
the mobile client."*

**2. How to run it.** The actual commands, in order, copy-pasteable:

    git clone ...
    cp .env.example .env      # fill in DATABASE_URL and API_KEY
    docker compose up -d
    npm install
    npm run migrate
    npm run dev               # http://localhost:3000

**3. How to run the tests.** \`npm test\`. One line, and it is the thing a new contributor needs
second.

**4. How to verify it is working.** *"Visit http://localhost:3000/health — you should see
\`{"status":"ok"}\`."* Without this, a new joiner has a running process and no idea whether it
is right.

**5. Everything else, or a link to it.** Architecture, deployment, contribution guidelines.
Below the fold or in another file.

## Why "how to run it" comes second

Because that is what the reader is here for. Architecture before setup is written for the author
— it is the interesting part — and it costs every new joiner the time it takes to scroll past.

## The rules that keep it true

**Prerequisites must be explicit, with versions.** "Node 20+, Docker, Postgres 15". "You'll need
Node" produces an hour of debugging on Node 14.

**Every command must be copy-pasteable.** No \`<your-username>\` placeholders in the middle of a
command line, no "then configure the database" as a step. If a value is needed, say where it
comes from.

**Say what should happen.** After each significant command, one line on the expected result.
Silence after \`npm run migrate\` is indistinguishable from a hang.

**Test it on a clean machine.** This is the only rule that matters and it is the one nobody
follows. Everything works on the machine where it was written, because that machine has three
things installed that nobody remembers installing.

## The test that finds every bug in it

**Hand it to somebody who has never seen the project and watch them, silently.**

Every place they hesitate is a defect. Every question they ask is a missing line. Do not help —
write down where they got stuck, and fix those places.

Fifteen minutes of this is worth more than an hour of rewriting, and the result is a README that
actually does its one job.

## The staleness problem

A README goes wrong the moment setup changes and nobody updates it — and nobody updates it
because nobody runs it. Two things help:

- **Someone new does the setup from the README on their first day**, and fixes what they find.
  It is the best possible use of their first morning and it is self-correcting.
- **Put the setup in CI where you can.** A CI job that follows the documented steps fails when
  they stop working, which is the only mechanism here that does not depend on somebody
  remembering.`,
    mcqs: [
      mcq('The one job of a README is to:',
        [['Get somebody from nothing to a running system', true],
          ['Explain what the project does and why', false],
          ['Document the architecture for contributors', false],
          ['List the dependencies and their versions', false]],
        'Most READMEs describe the architecture beautifully and never say how to start it.'),
      mcq('Architecture before setup is a problem because:',
        [['It is written for the author, not the reader', true],
          ['It is usually out of date', false],
          ['It assumes knowledge a new joiner lacks', false],
          ['It belongs in a separate document', false]],
        'It is the interesting part, and it costs every new joiner the scroll.'),
      mcq('The single most effective way to find defects in a README is:',
        [['Watch somebody new follow it, silently', true],
          ['Re-read it after every release', false],
          ['Ask a reviewer to check it with the code', false],
          ['Compare it against the deployment scripts', false]],
        'Every hesitation is a defect; every question is a missing line.'),
      mcq('"You will need Node" is inadequate because:',
        [['Without a version it produces an hour of debugging', true],
          ['It does not say how to install it', false],
          ['Not every platform has Node available', false],
          ['The version is implied by the lockfile', false]],
        'Prerequisites must be explicit, with versions.'),
    ],
    checkpoint: [
      mcq('After a significant command, the README should state:',
        [['What should happen', true],
          ['How long it usually takes', false],
          ['What to do if it fails', false],
          ['Which files it will change', false]],
        'Silence after a migration is indistinguishable from a hang.'),
      mcq('The mechanism that keeps a README true without relying on memory is:',
        [['A CI job that follows the documented steps', true],
          ['A review checklist item for every change', false],
          ['A scheduled reminder to re-read it', false],
          ['An owner assigned to the document', false]],
        'It fails when the steps stop working, which nothing else here does.'),
      mcq('The best use of a new joiner’s first morning is:',
        [['Setting up from the README and fixing what they find', true],
          ['Reading the architecture documentation', false],
          ['Being walked through the setup by a colleague', false],
          ['Making a small first change to the code', false]],
        'Self-correcting, and they are the only person who can see the gaps.'),
    ],
  },
];
