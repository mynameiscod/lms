# -*- coding: utf-8 -*-
"""
Wave 6 — PROMPT_ENGINEERING, 50 Golden Bank questions, all newly authored.

EVERY ITEM ASKS ABOUT A DEFECT, NEVER ABOUT QUALITY. "Which prompt is better" has four defensible
answers and measures taste. "Which of these could be satisfied in two different ways", "which part
of this prompt produced that output", "which single change would test the hypothesis" each have one
answer a reader can verify from the text in front of them. Any family that could only be settled
by preference was not written.

LENGTH NEVER CORRELATES WITH THE KEY. A student who learns that the longest option wins has
learned to measure reading stamina, so detailed prompts that miss the requirement appear as wrong
answers throughout, and brief prompts that meet it appear as right ones.

THE ITERATION FAMILY DELIBERATELY OFFERS A BETTER OUTPUT AS THE WRONG ANSWER. Rewriting several
parts at once usually does improve the result and leaves nobody any wiser about which change
mattered. That trade is the measurement, and an option that plainly produces a better answer is
the most attractive way to test it.

TWO STEMS HAVE NOTHING WRONG WITH THE PROMPT. The output was disappointing for a reason the prompt
could not have prevented. A diagnosis family where the prompt is always at fault teaches a reflex
rather than a diagnosis.
"""

Q = []


def q(qid, family, difficulty, prompt, correct, distractors, explanation,
      provenance='AUTHORED', source='', evidence=None, mode=None, hinge=None):
    assert len(distractors) == 3, qid
    it = {'id': qid, 'family': family, 'difficulty': difficulty, 'prompt': prompt,
          'correct': correct, 'distractors': list(distractors), 'explanation': explanation,
          'provenance': provenance, 'source': source}
    if evidence:
        it['evidence'] = evidence
    if mode:
        it['mode'] = mode
    if hinge:
        it['hinge'] = hinge
    Q.append(it)


# =========================================================================
# PE_FAM01_GOAL_PRESENCE — D1 x4, D2 x1
# =========================================================================
q('GB_PE_001', 'PE_FAM01_GOAL_PRESENCE', 'D1',
  'Which of these requests states what is actually to be done?',
  'Summarise this report in three sentences',
  ['Quarterly sales report', 'Something about quarterly sales',
   'This is the quarterly sales report, which covers the last three months and was compiled by '
   'the regional team'],
  'Only the first names an action. The longest option supplies plenty of information and never '
  'says what to do with it.')

q('GB_PE_002', 'PE_FAM01_GOAL_PRESENCE', 'D1',
  'A request reads: "Machine learning." What is missing?',
  'Any statement of what is to be done with the topic',
  ['Background about machine learning',
   'The audience for the answer',
   'Nothing; the topic implies an explanation is wanted'],
  'A topic is not a task, and there are many things that could be wanted about it. The responder '
  'has to guess, and may guess a different one each time.')

q('GB_PE_003', 'PE_FAM01_GOAL_PRESENCE', 'D1',
  'Which of these requests names a task?',
  'List the three main risks',
  ['The risks are considerable', 'Risk assessment', 'I have been thinking about risk'],
  'Naming a task means naming an action and its object, which the first does. The others state, '
  'label, or narrate.')

q('GB_PE_004', 'PE_FAM01_GOAL_PRESENCE', 'D1',
  'A request opens with a polite framing: "I would be grateful if you could help me with the '
  'budget." What has it asked for?',
  'Nothing specific; help with the budget could mean many different things',
  ['A budget summary', 'A revised budget', 'An explanation of the budget'],
  'Politeness is not an instruction, and each of the other three is a defensible guess at what '
  'was meant. That there are three of them is the problem.')

q('GB_PE_005', 'PE_FAM01_GOAL_PRESENCE', 'D2',
  'A long request describes a dataset in detail, names the columns, explains where it came from, '
  'and ends there. What is the fault?',
  'It supplies context and never states the task',
  ['It supplies too much context',
   'It fails to name an audience',
   'Nothing; the detail makes the task obvious'],
  'The context is genuinely useful and there is nothing to apply it to. Length and completeness '
  'in one part do not compensate for the absence of another.')

# =========================================================================
# PE_FAM02_MISSING_CONTEXT — D1 x3, D2 x1
# =========================================================================
q('GB_PE_006', 'PE_FAM02_MISSING_CONTEXT', 'D1',
  'A request reads: "Rewrite this to be shorter." What would the responder have to guess?',
  'What the text being referred to is',
  ['How much shorter is wanted', 'Whether to keep the meaning', 'The tone to use'],
  'Nothing has been supplied to rewrite. The other three are matters of degree; this one leaves '
  'the responder with no material at all.')

q('GB_PE_007', 'PE_FAM02_MISSING_CONTEXT', 'D1',
  'A request asks for a fix to "the error in the login function" with no code supplied. What is '
  'missing?',
  'The function itself and the error',
  ['The name of the programming language',
   'Whether the fix should include tests',
   'The version of the framework in use'],
  'The responder cannot see the code and has not been told what the error is. The other three '
  'would refine an answer; without the code there is nothing to refine.')

q('GB_PE_008', 'PE_FAM02_MISSING_CONTEXT', 'D1',
  'A request asks for advice on which database to choose, stating only that the application is a '
  'website. What most needs supplying?',
  'What the application does with data and at what scale',
  ['The developer preferred programming language',
   'The name of the hosting provider',
   'Whether the website has a logo'],
  'Choosing a database turns on the shape and volume of the data and on what must be guaranteed '
  'about it. Being a website narrows almost nothing.')

q('GB_PE_009', 'PE_FAM02_MISSING_CONTEXT', 'D2',
  'A request asks: "Is this fast enough?" and supplies a timing of 200 milliseconds. What has '
  'been left out?',
  'What the requirement is, since 200 milliseconds is fast for some purposes and slow for others',
  ['The hardware the measurement was taken on',
   'How many times the measurement was repeated',
   'Nothing; 200 milliseconds is a clear figure'],
  'The figure is precise and the standard it is being judged against is absent. The other two '
  'would refine the measurement rather than supply the missing comparison.')

# =========================================================================
# PE_FAM03_FORMAT_REQUEST — D1 x3, D2 x1
# =========================================================================
q('GB_PE_010', 'PE_FAM03_FORMAT_REQUEST', 'D1',
  'In the request "Explain the causes of the delay as a numbered list", which part constrains the '
  'shape of the answer?',
  'As a numbered list',
  ['Explain', 'The causes of the delay', 'The word the'],
  'A numbered list describes the form the answer must take. Explaining and the subject matter '
  'describe what it must contain.')

q('GB_PE_011', 'PE_FAM03_FORMAT_REQUEST', 'D1',
  'Which of these instructions is about the shape of the answer rather than its content?',
  'One sentence per item, with no preamble',
  ['Cover the security implications', 'Focus on the last quarter',
   'Assume the reader knows the background'],
  'Only the first says how the answer should be laid out. The others narrow what it should '
  'discuss or who it is for.')

q('GB_PE_012', 'PE_FAM03_FORMAT_REQUEST', 'D1',
  'A request ends "keep it brief". Is that a statement about the shape of the answer?',
  'Loosely; it constrains length without saying what form the answer takes',
  ['Yes, and it fully specifies the form',
   'No, it is entirely about content',
   'No, it is about the audience'],
  'Brevity is a constraint and a vague one. It does not say whether prose, a list or a table is '
  'wanted, and two brief answers can differ entirely in form.')

q('GB_PE_013', 'PE_FAM03_FORMAT_REQUEST', 'D2',
  'Two requests ask for the same analysis. One says "keep it short" and the other says "at most '
  'five bullet points, each under fifteen words". Which difference matters?',
  'The second can be checked mechanically and the first cannot',
  ['The second is longer and therefore more thorough',
   'The first is more flexible and therefore better',
   'There is no meaningful difference between them'],
  'A specification precise enough to check is worth more than one that has to be judged. Whether '
  'the flexibility is wanted is a separate decision from whether the instruction can be verified.')

# =========================================================================
# PE_FAM04_AMBIGUITY_DETECTION — D2 x1, D3 x1
# =========================================================================
q('GB_PE_014', 'PE_FAM04_AMBIGUITY_DETECTION', 'D2',
  'Which of these requests could reasonably be answered in two different ways?',
  'Translate the comments in this file',
  ['Translate this file into French',
   'Delete the comments in this file',
   'Count the comments in this file'],
  'Translating the comments could mean rendering them in another language or explaining what they '
  'mean, and both readings are natural. The others admit only one reading.')

q('GB_PE_015', 'PE_FAM04_AMBIGUITY_DETECTION', 'D3',
  'A request reads: "Find the average response time for the last month." Where is the ambiguity?',
  'Whether the last month means the previous calendar month or the last thirty days',
  ['Whether response time is measured in milliseconds or seconds',
   'Whether the average should be shown as a decimal',
   'There is no ambiguity in the request'],
  'The two readings pick out different sets of days and give different answers. Units and '
  'presentation would change how the answer is shown rather than which answer it is.')

# =========================================================================
# PE_FAM05_CONSTRAINT_READING — D2 x1, D3 x1
# =========================================================================
q('GB_PE_016', 'PE_FAM05_CONSTRAINT_READING', 'D2',
  'A request asks for suggestions and adds: "nothing that requires new hardware". Which suggestion '
  'does that rule out?',
  'Adding a second server to share the load',
  ['Rewriting the slowest function',
   'Caching results that are requested repeatedly',
   'Removing a step that is no longer needed'],
  'Only one of the four needs equipment that does not exist yet. The other three are changes to '
  'what already runs.')

q('GB_PE_017', 'PE_FAM05_CONSTRAINT_READING', 'D3',
  'A request asks for a recommendation and adds: "it must be something a single developer can '
  'finish in a week". A responder proposes a change that takes a week of work from three people. '
  'Has the constraint been met?',
  'No; the constraint is about one person for a week, not about a week of elapsed time',
  ['Yes, since the work finishes within a week',
   'Yes, provided the three developers are available',
   'It cannot be decided from the constraint as stated'],
  'The constraint names both a duration and an amount of effort. Reading it as elapsed time alone '
  'admits proposals costing three times what was allowed.')

# =========================================================================
# PE_FAM06_EXAMPLE_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PE_018', 'PE_FAM06_EXAMPLE_EFFECT', 'D2',
  'A request asks for product descriptions and includes one worked example. What does the example '
  'mainly convey?',
  'The shape and length the answers should take',
  ['The exact wording to reuse',
   'The product that should be described',
   'Nothing; examples are decorative'],
  'An example demonstrates a form rather than supplying content. What carries over is the '
  'structure, the register and roughly the length.')

q('GB_PE_019', 'PE_FAM06_EXAMPLE_EFFECT', 'D3',
  'A request includes one example whose answer happens to be a single word. The requester wanted '
  'answers of about a sentence. What is likely to happen?',
  'The answers will follow the example rather than the unstated intention',
  ['The answers will be about a sentence, since that is what was wanted',
   'The example will be ignored entirely',
   'The answers will vary randomly in length'],
  'The example is the clearest statement of form in the request, and it says one word. An '
  'intention that was never written down cannot compete with it.')

q('GB_PE_020', 'PE_FAM06_EXAMPLE_EFFECT', 'D4',
  'A request supplies one example: an input of "12 apples" and an output of "12". The requester '
  'wants the quantity extracted from any phrase. A single example is consistent with extracting '
  'the number and with extracting the first word, and nothing in the request separates the two. '
  'What is the risk?',
  'The pattern is under-determined, so the wrong rule may be applied to later inputs',
  ['There is no risk; one example is enough to fix the pattern',
   'The example is wrong and should be corrected',
   'The output should have been "apples"'],
  'Both readings reproduce the example exactly, so the example cannot distinguish them. A second '
  'example with a phrase beginning in a word rather than a number would settle it.',
  evidence='A single example is consistent with extracting the number and with extracting the '
           'first word')

# =========================================================================
# PE_FAM07_SPECIFICITY_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PE_021', 'PE_FAM07_SPECIFICITY_EFFECT', 'D2',
  'A request for "ideas to reduce cost" is changed to "ideas to reduce cost that do not affect '
  'staffing". What has changed?',
  'The range of acceptable answers has narrowed',
  ['The range of acceptable answers has widened',
   'Nothing, since the topic is the same',
   'The answers will be longer'],
  'Adding a condition removes answers that would otherwise have qualified. Whether the removed '
  'ones were wanted is exactly what the requester has decided.')

q('GB_PE_022', 'PE_FAM07_SPECIFICITY_EFFECT', 'D3',
  'A request for "a summary" is changed to "a summary of exactly 40 words covering only the '
  'financial findings". The requester is disappointed that an important operational risk is '
  'missing. What happened?',
  'The added detail excluded it, which is what the added detail was for',
  ['The responder overlooked the risk',
   'The word limit was too short to include it',
   'The request should have been longer still'],
  'The instruction to cover only the financial findings ruled the risk out. Narrowing works and '
  'the requester narrowed past something they wanted.')

q('GB_PE_023', 'PE_FAM07_SPECIFICITY_EFFECT', 'D4',
  'A team keeps adding conditions to a request, and the answers get steadily worse. The latest '
  'version runs to two pages of conditions. Each condition removes some acceptable answers, and '
  'enough conditions can leave very few acceptable answers remaining. What is the likely cause?',
  'The conditions together have left almost nothing that satisfies all of them',
  ['The request is too long to be read carefully',
   'The conditions contradict the topic',
   'Detail always improves an answer, so something else is wrong'],
  'Each condition was reasonable and their conjunction is not. Removing conditions one at a time '
  'to see which restores a usable answer is the way out.',
  evidence='Each condition removes some acceptable answers')

# =========================================================================
# PE_FAM08_CHECKABLE_FORMAT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PE_024', 'PE_FAM08_CHECKABLE_FORMAT', 'D2',
  'An answer will be pasted directly into a spreadsheet column. Which format instruction fits?',
  'One value per line, with nothing else',
  ['Present the values clearly',
   'Give the values in a readable way',
   'Provide the values with a short explanation of each'],
  'The downstream use accepts one value per line and nothing else. Explanations and framing text '
  'have to be stripped out by hand.')

q('GB_PE_025', 'PE_FAM08_CHECKABLE_FORMAT', 'D3',
  'An answer will be read by a program that expects a specific structure. A request asks for the '
  'answer "in a structured format". What is the weakness?',
  'Structured describes many different formats, so what arrives may not be the expected one',
  ['Nothing; structured is a precise instruction',
   'The program should be changed to accept any format',
   'The answer will be too long'],
  'Several formats are structured and they are not interchangeable to a program. Naming the one '
  'expected removes the guess.')

q('GB_PE_026', 'PE_FAM08_CHECKABLE_FORMAT', 'D4',
  'A request specifies an output format so tightly that there is nowhere to report that a value '
  'could not be determined. The format leaves no place to say a value is unknown, and some inputs '
  'genuinely have no value. What will happen?',
  'Unknown values will be filled with something invented, because the format allows nothing else',
  ['The unknown values will be left blank, which the format permits',
   'The answer will refuse to use the format',
   'The format will be adapted automatically'],
  'A format with no way to express absence forces something into the space. Adding an explicit '
  'marker for unknown is the fix, and it has to be specified.',
  evidence='The format leaves no place to say a value is unknown')

# =========================================================================
# PE_FAM09_DECOMPOSITION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PE_027', 'PE_FAM09_DECOMPOSITION', 'D2',
  'A request asks for a design, an implementation and a test plan in one answer. What is the '
  'likely result?',
  'One of the three will be developed and the others treated briefly',
  ['All three will be developed equally',
   'The request will be refused',
   'Only the first will be attempted'],
  'A single answer has finite room and three substantial tasks compete for it. Which one gets the '
  'attention is not predictable.')

q('GB_PE_028', 'PE_FAM09_DECOMPOSITION', 'D3',
  'A compound request asks for an analysis and then a recommendation based on it. A colleague '
  'proposes splitting it into two separate requests. What is lost?',
  'Nothing, provided the analysis is carried into the second request',
  ['The connection between the two, which cannot be restored',
   'The recommendation, which depends on reasoning that will be discarded',
   'Nothing at all, since the two are independent'],
  'The dependency is real and is satisfied by supplying the first answer as input to the second. '
  'That is a stronger arrangement, because the analysis can be checked before anything is built '
  'on it.')

q('GB_PE_029', 'PE_FAM09_DECOMPOSITION', 'D4',
  'A request asks for twenty items to be classified and for a summary of the pattern across them. '
  'A team splits it so that the classification and the summary are requested separately, without '
  'passing the classifications to the second request. The summary depends on the classifications '
  'and the second request never receives them. What goes wrong?',
  'The summary describes classifications it cannot see, so it is unconnected to the first answer',
  ['Nothing; splitting is always safe',
   'The classification will be less accurate when requested alone',
   'The two answers will be identical'],
  'The split was along a real dependency and the dependency was not carried across. Splitting is '
  'right here and the output of the first has to become the input of the second.',
  evidence='The summary depends on the classifications and the second request never receives them')

# =========================================================================
# PE_FAM10_AUDIENCE_STATEMENT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PE_030', 'PE_FAM10_AUDIENCE_STATEMENT', 'D2',
  'A request asks for an explanation of a technical fault "for the customer support team, who are '
  'not engineers". Which answer fits?',
  'One that says what customers will notice and what to tell them',
  ['One that names the component and the line at fault',
   'One that lists the internal error codes involved',
   'One that describes the fix in implementation detail'],
  'The audience needs to handle customer conversations rather than to repair anything. The other '
  'three are correct and are addressed to a different reader.')

q('GB_PE_031', 'PE_FAM10_AUDIENCE_STATEMENT', 'D3',
  'A request names its audience as "the board, deciding whether to fund this". What most shapes '
  'the answer?',
  'What the decision turns on, in terms the board can weigh',
  ['The technical architecture in full detail',
   'A shorter version of the engineering summary',
   'The names of the team members involved'],
  'Naming an audience states what the answer is for. Shortening an engineering summary produces '
  'something briefer and still addressed to engineers.')

q('GB_PE_032', 'PE_FAM10_AUDIENCE_STATEMENT', 'D4',
  'Two answers to one question are compared. One is half the length of the other and uses no '
  'technical terms. The audience is a specialist who needs to reproduce the work. The audience '
  'must reproduce the work, which requires the detail rather than a plainer telling of it. Which '
  'fits?',
  'The longer one, since the audience needs detail rather than simplicity',
  ['The shorter one, since simpler writing is always better',
   'The shorter one, since it uses no jargon',
   'Either, since both describe the same work'],
  'Simplicity is a virtue relative to an audience and this audience needs the specifics. Judging '
  'writing without reference to who reads it is what the family exists to interrupt.',
  evidence='The audience must reproduce the work, which requires the detail')

# =========================================================================
# PE_FAM11_OUTPUT_FAULT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_PE_033', 'PE_FAM11_OUTPUT_FAULT_DIAGNOSIS', 'D3',
  'A request asks for "a short report on the incident" and the answer covers the wrong incident '
  'entirely. Two incidents occurred that week and neither was identified. What in the request '
  'caused it?',
  'The incident was never identified, so one had to be chosen',
  ['The word short, which cut the relevant material',
   'The word report, which is too formal',
   'Nothing in the request; the answer is simply wrong'],
  'With two candidates and no identification, picking the wrong one was always possible. The '
  'length instruction was obeyed and is not the fault.')

q('GB_PE_034', 'PE_FAM11_OUTPUT_FAULT_DIAGNOSIS', 'D4',
  'A request states the task, the audience, the format and the constraints, and supplies the '
  'document in full. The answer is accurate, well formatted and describes the document as being '
  'about a topic it does not cover. Every part of the request was followed and the document was '
  'supplied complete. What is the fault?',
  'Not in the request; the content is wrong despite the request being complete',
  ['The task was not stated clearly enough',
   'The format instruction distracted from the content',
   'The document should have been summarised before being supplied'],
  'A complete request does not guarantee a correct answer, and treating every bad output as a '
  'prompting failure hides that. The remedy here is checking the content rather than rewriting '
  'the request.',
  evidence='Every part of the request was followed and the document was supplied complete')

# =========================================================================
# PE_FAM12_OVERCONSTRAINT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_PE_035', 'PE_FAM12_OVERCONSTRAINT_DIAGNOSIS', 'D3',
  'A request asks for a summary of at most twenty words that covers eight separate findings, each '
  'with its figure. Which pair of conditions cannot both be met?',
  'The word limit and the requirement to cover eight findings with figures',
  ['The word limit and the request for a summary',
   'The eight findings and the requirement for figures',
   'All three can be met together'],
  'Eight findings with figures need considerably more than twenty words. Either the limit rises '
  'or the coverage falls, and the request has to choose.')

q('GB_PE_036', 'PE_FAM12_OVERCONSTRAINT_DIAGNOSIS', 'D4',
  'A request asks for a recommendation that is evidence-based, mentions no source by name, and '
  'can be independently verified by the reader. A reader cannot verify a claim independently '
  'without being told what to check it against. Which pair conflicts?',
  'Forbidding named sources and requiring independent verification',
  ['Being evidence-based and being verifiable',
   'Being evidence-based and forbidding named sources',
   'None of the three conflict'],
  'Evidence can be described without naming a source, so those two coexist. Verification needs '
  'something to check against, which is precisely what has been forbidden.',
  evidence='A reader cannot verify a claim independently without being told what to check it '
           'against')

# =========================================================================
# PE_FAM13_ITERATION_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_PE_037', 'PE_FAM13_ITERATION_REASONING', 'D3',
  'A team suspects the answers are too long because the request never states a length. What single '
  'change tests that?',
  'Add a length limit and change nothing else',
  ['Rewrite the request more clearly and add a length limit',
   'Add a length limit and an example of a short answer',
   'Start again with a shorter request'],
  'Only the first isolates the suspected cause. Each of the others changes two things, so a '
  'better result afterwards would not say which one produced it.')

q('GB_PE_038', 'PE_FAM13_ITERATION_REASONING', 'D4',
  'Four revisions are proposed. One rewrites the whole request and reliably produces a better '
  'answer. The other three each change one thing. The team wants to know why the original failed. '
  'The aim is to identify the cause rather than to obtain a better answer on this occasion. Which '
  'revision should be tried?',
  'One of the single changes, since only those can attribute the improvement',
  ['The full rewrite, since it produces the best answer',
   'The full rewrite, followed by the single changes',
   'All four at once, comparing the results'],
  'The full rewrite is the most attractive option and answers a different question. Getting a '
  'good answer today and understanding the failure are different aims and this stem states which '
  'one is wanted.',
  evidence='The aim is to identify the cause rather than to obtain a better answer on this '
           'occasion')

q('GB_PE_039', 'PE_FAM13_ITERATION_REASONING', 'D5',
  'A team changes one word in a request and the answer improves markedly. They conclude that word '
  'was the problem. The answers vary between runs even when the request is unchanged, so a single '
  'comparison cannot separate the change from the variation. What should they do before '
  'concluding?',
  'Run both versions several times, since a single pair of answers cannot separate the change '
  'from ordinary variation',
  ['Accept the conclusion, since only one word differed',
   'Change a second word to confirm',
   'Conclude nothing, since prompt changes never matter'],
  'Single-change discipline is necessary and not sufficient when the process itself varies. '
  'Repetition is what turns one observation into evidence.',
  mode='EDGE',
  hinge='The answers vary between runs even when the request is unchanged')

q('GB_PE_040', 'PE_FAM13_ITERATION_REASONING', 'D5',
  'A team is tuning a request used thousands of times a day. They have a set of twenty inputs with '
  'known correct answers. Twenty inputs with known answers allow every candidate request to be '
  'measured against the same standard. How should they proceed?',
  'Try each candidate request against all twenty and compare the scores',
  ['Try each candidate on one input and pick the best answer',
   'Ask the model which request it prefers',
   'Rewrite the request until an answer looks right'],
  'A fixed set with known answers turns tuning from an impression into a measurement. Judging by '
  'eye on one input is how a request gets fitted to that input.',
  mode='TRANSFER',
  hinge='Twenty inputs with known answers allow every candidate request to be measured against '
        'the same standard')

q('GB_PE_041', 'PE_FAM13_ITERATION_REASONING', 'D5',
  'After many revisions a request performs excellently on the five examples the team has been '
  'testing with, and poorly on new inputs. The five examples guided every revision, so the '
  'request has been shaped to them specifically. What has happened?',
  'The request has been fitted to those five examples rather than to the task',
  ['The new inputs are harder than the five',
   'The revisions were made in the wrong order',
   'The request has become too long to follow'],
  'This is the same failure as tuning a system against the data used to measure it. Holding back '
  'inputs that never guide a revision is the remedy.',
  mode='EDGE',
  hinge='The five examples guided every revision, so the request has been shaped to them '
        'specifically')

# =========================================================================
# PE_FAM14_PROMPT_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_PE_042', 'PE_FAM14_PROMPT_CHOICE', 'D4',
  'The requirement is a list of email addresses extracted from a document, ready to paste into a '
  'mailing tool. The output will be pasted directly into a tool that accepts one address per line '
  'and nothing else. Which request fits?',
  'Extract every email address and give one per line with no other text',
  ['Find the email addresses in this document and explain where each appears',
   'Please carefully identify all of the email addresses contained anywhere within the attached '
   'document and present them clearly',
   'List the contacts mentioned in this document'],
  'Only the first produces something usable without editing. The longest option is polite and '
  'thorough and specifies no format at all.',
  evidence='The output will be pasted directly into a tool that accepts one address per line and '
           'nothing else')

q('GB_PE_043', 'PE_FAM14_PROMPT_CHOICE', 'D5',
  'The requirement is three genuinely different approaches to a problem, for a person to choose '
  'between. Three approaches that differ from one another is the requirement, and asking for the '
  'best one produces a single answer rather than a choice. Which request fits?',
  'Propose three approaches that differ in their trade-offs, and state each trade-off',
  ['Propose the best approach to this problem',
   'Propose three approaches to this problem',
   'Explain how this problem is usually solved'],
  'Asking for three without asking them to differ often produces three versions of one idea. '
  'Naming the trade-offs is what forces them apart.',
  mode='TRANSFER',
  hinge='Three approaches that differ from one another is the requirement')

q('GB_PE_044', 'PE_FAM14_PROMPT_CHOICE', 'D5',
  'A request will be reused across many documents of varying length, some very short. One '
  'candidate demands exactly ten findings. Some documents will not contain ten findings, and a '
  'request that demands ten will get ten. What is wrong with that candidate?',
  'It will produce invented findings for documents that do not have ten',
  ['It will refuse to answer for short documents',
   'It will produce fewer than ten and report the shortfall',
   'Nothing; a fixed count makes results comparable'],
  'A fixed count is comfortable to work with and forces the count to be met. Asking for up to ten '
  'keeps the comparability without demanding what is not there.',
  mode='EDGE', hinge='Some documents will not contain ten findings')

q('GB_PE_045', 'PE_FAM14_PROMPT_CHOICE', 'D5',
  'Two requests produce equally good answers. One is three lines and one is two pages. The '
  'request will be maintained by a rotating team and adjusted as the requirement changes. The '
  'answers are equally good, so quality cannot decide between them, and the request will be '
  'edited repeatedly by different people. Which should be adopted?',
  'The three-line one, since it will be edited repeatedly and quality does not separate them',
  ['The two-page one, since detail guards against future ambiguity',
   'The two-page one, since more instruction is more reliable',
   'Either, since the answers are equally good'],
  'With output quality equal, the cost that remains is maintenance. Two pages of instruction is '
  'two pages for each new maintainer to understand before changing anything.',
  mode='TRADEOFF', hinge='The answers are equally good, so quality cannot decide between them')

q('GB_PE_046', 'PE_FAM14_PROMPT_CHOICE', 'D5',
  'A request must work for both expert and novice readers, who need different levels of detail. '
  'One request cannot produce two different levels of detail at once, and both audiences must be '
  'served. What is the reasonable approach?',
  'Use two requests, one per audience, rather than one compromise',
  ['Write one request aimed between the two levels',
   'Write one request aimed at the expert, since novices can ask follow-ups',
   'Write one request and let the reader skip what they do not need'],
  'A compromise between two audiences typically serves neither. Two requests cost little and each '
  'can be judged against a real reader.',
  mode='TRADEOFF', hinge='One request cannot produce two different levels of detail at once')

# =========================================================================
# PE_FAM15_PROMPT_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_PE_047', 'PE_FAM15_PROMPT_TRANSFER', 'D4',
  'A request is needed for a domain the requester knows nothing about: grading the ripeness of '
  'stored grain from inspector notes. The requester does not know the domain, so any context the '
  'domain requires must come from someone who does. What should the request contain?',
  'The task, the format, and whatever grading criteria the requester can obtain from an inspector',
  ['A detailed explanation of grain storage, written by the requester',
   'The task alone, since the responder will know the domain',
   'A request for the responder to explain grain storage first'],
  'The requester can supply the task and the format without domain knowledge, and the criteria '
  'have to come from somewhere. Assuming the responder knows leaves the criteria unstated.',
  evidence='The requester does not know the domain, so any context the domain requires must come '
           'from someone who does')

q('GB_PE_048', 'PE_FAM15_PROMPT_TRANSFER', 'D5',
  'A request must be written for classifying support tickets into categories that have not yet '
  'been decided. The categories do not exist yet, so no request can classify into them. What '
  'should be done first?',
  'Settle the categories, since a classification request cannot be written without them',
  ['Write the request and leave the categories to be inferred',
   'Ask for the tickets to be grouped and use the groups as categories',
   'Write a request for each plausible set of categories'],
  'Asking for groups is a real and different task and produces groups nobody agreed to. The '
  'request cannot be written before the thing it classifies into exists.',
  mode='TRANSFER', hinge='The categories do not exist yet, so no request can classify into them')

q('GB_PE_049', 'PE_FAM15_PROMPT_TRANSFER', 'D5',
  'A team writes a request for a task where the correct answer is genuinely contested among '
  'experts. The experts disagree, so there is no single correct answer for any request to '
  'produce. What should the request ask for?',
  'The competing positions and what separates them, rather than a single answer',
  ['The single best answer, stated confidently',
   'The answer most experts hold',
   'Nothing; the task should be abandoned'],
  'Asking for one answer where none exists produces one anyway, and it will read as settled. '
  'Setting out the disagreement is both honest and more useful to whoever must decide.',
  mode='EDGE', hinge='The experts disagree, so there is no single correct answer')

q('GB_PE_050', 'PE_FAM15_PROMPT_TRANSFER', 'D5',
  'A request that works well in one language is translated word for word into another and works '
  'poorly. The format instruction and the examples were translated along with everything else, '
  'and the examples now demonstrate a form nobody wanted. What is the likely cause?',
  'The examples were translated, so they now demonstrate the wrong form',
  ['Requests only work in the language they were written in',
   'The task itself does not transfer between languages',
   'The translation was inaccurate and should be redone'],
  'Parts of a request play different roles, and examples demonstrate rather than instruct. They '
  'have to be rewritten in the new language rather than translated from the old.',
  mode='TRANSFER',
  hinge='the examples now demonstrate a form nobody wanted')
