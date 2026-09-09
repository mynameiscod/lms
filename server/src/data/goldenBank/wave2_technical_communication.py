# -*- coding: utf-8 -*-
"""
Wave 2 — TECHNICAL_COMMUNICATION, 50 Golden Bank questions.

15 come from the existing bank (7 kept, 8 rewritten) and 35 are new.

THIS SKILL IS MEASURABLE ONLY BECAUSE THE BLUEPRINT REFUSES TASTE QUESTIONS, and the rewrites are
where that shows. Four legacy items asked which message was "clearest", which is a preference
dressed as a question — the answer was whichever option was not deliberately broken English. Their
families ask something checkable instead: which piece is missing that prevents anyone acting,
which of two readings an instruction permits, which request can be answered as written. Every
option in the rewritten items is civil and grammatical, so tone and grammar cannot decide them.

THE READER IS ALWAYS NAMED WHERE THE FAMILY DEPENDS ON ONE. TC_FAM08 asks what a reader would not
understand, which has no answer until the reader is described; the legacy item asked what to do
when "the listener seems confused", which is advice rather than measurement.
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
# TC_FAM01_TERM_MEANING — D1 x4 (legacy), D2 x1 (legacy)
# =========================================================================
q('GB_TC_001', 'TC_FAM01_TERM_MEANING', 'D1',
  'In "the program executes the instructions", what does executes mean?',
  'Carries them out',
  ['Deletes them', 'Prints them', 'Stores them permanently'],
  'To execute an instruction is to perform it. The everyday sense of the word suggests removal, '
  'which is close to the opposite of what the technical term means.',
  provenance='LEGACY_KEEP', source='194246')

q('GB_TC_002', 'TC_FAM01_TERM_MEANING', 'D1',
  'In "verify the result", what does verify mean?',
  'Check that it is correct',
  ['Record it for later', 'Accept it as given', 'Produce it again'],
  'Verification is a check against what was expected. Recording or repeating something are things '
  'one might do around a check without being the check itself.',
  provenance='LEGACY_KEEP', source='18a40f')

q('GB_TC_003', 'TC_FAM01_TERM_MEANING', 'D1',
  'In "an efficient solution", what does efficient mean?',
  'It uses little time or few resources for what it achieves',
  ['It is short to write', 'It is correct', 'It is easy to understand'],
  'Efficiency is about the resources consumed, not about length, correctness or clarity — all of '
  'which are real virtues and separate ones. A long, hard-to-read solution can be the efficient '
  'one.',
  provenance='LEGACY_KEEP', source='1c5959')

q('GB_TC_004', 'TC_FAM01_TERM_MEANING', 'D1',
  'In "the system is reliable", what does reliable mean?',
  'It behaves as expected consistently over time',
  ['It is fast', 'It is secure', 'It recovers quickly when it fails'],
  'Reliability is about behaving as expected again and again. Speed, security and quick recovery '
  'are each desirable and each a different property — a system can recover quickly precisely '
  'because it fails often.',
  provenance='LEGACY_REWRITE', source='1805d8')

q('GB_TC_005', 'TC_FAM01_TERM_MEANING', 'D2',
  'In "the data is consistent", what does consistent mean?',
  'It follows the same rule or format throughout',
  ['It is correct', 'It is complete', 'It has been checked'],
  'Consistency is about internal agreement, so data can be consistently wrong — every entry in '
  'the same wrong format. Correctness, completeness and having been checked are three further '
  'properties, none implied by this one.',
  provenance='LEGACY_REWRITE', source='1bbb22')

# =========================================================================
# TC_FAM02_INSTRUCTION_READING — D1 x3, D2 x1 (legacy)
# =========================================================================
q('GB_TC_006', 'TC_FAM02_INSTRUCTION_READING', 'D1',
  'A procedure reads: 1. Copy the folder. 2. Rename the copy. 3. Delete the original. What does '
  'step 2 act on?',
  'The copy made in step 1',
  ['The original folder', 'Both the original and the copy', 'Whichever folder is open'],
  'Step 2 names the copy, and step 1 is what produced it. Applying it to the original would leave '
  'the copy unnamed and rename the thing step 3 then deletes.',
  provenance='LEGACY_KEEP', source='93f13c')

q('GB_TC_007', 'TC_FAM02_INSTRUCTION_READING', 'D1',
  'A procedure reads: 1. Open the report. 2. Update the totals. 3. Save the report as a new file. '
  'What does step 3 act on?',
  'The report as it stands after step 2',
  ['The report as it was before step 2',
   'A new empty file',
   'Both the original report and a new file'],
  'Steps run in order, so what step 3 saves includes the change step 2 made. Saving the earlier '
  'state would require the procedure to have kept it, which nothing here does.')

q('GB_TC_008', 'TC_FAM02_INSTRUCTION_READING', 'D1',
  'A procedure reads: 1. Enter your name. 2. Enter your email address. 3. Check both entries. '
  'What does step 3 act on?',
  'The name and the email address',
  ['Only the email address, being the most recent',
   'Only the name, being the first entered',
   'Anything else on the form as well'],
  'The instruction names both, and its scope is exactly what it names. Reading it as applying to '
  'the last thing done, or to the whole form, changes what is checked.')

q('GB_TC_009', 'TC_FAM02_INSTRUCTION_READING', 'D2',
  'An instruction reads: "Upload one PDF under 5 MB." Which submission satisfies it?',
  'One PDF of 4 MB',
  ['One PDF of 6 MB', 'One document file of 4 MB', 'Two PDFs of 2 MB each'],
  'Three conditions are stated together — one file, PDF format, under the size limit — and a '
  'submission has to meet all three. Each wrong option satisfies two of them and fails the third.')

# =========================================================================
# TC_FAM03_PURPOSE_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_TC_010', 'TC_FAM03_PURPOSE_RECOGNITION', 'D1',
  'A message reads: "The nightly job finished at 03:12 and processed 4,200 records." What is its '
  'purpose?',
  'To report what happened',
  ['To request that something be done',
   'To ask a question',
   'To announce a decision that has been taken'],
  'The message states facts and asks for nothing. Reading a report as a request is what leaves '
  'everybody unsure whether action was expected of them.')

q('GB_TC_011', 'TC_FAM03_PURPOSE_RECOGNITION', 'D1',
  'A message reads: "Could you send me the sample file before Thursday?" What is its purpose?',
  'To request that something be done',
  ['To report what happened',
   'To announce a decision',
   'To offer an opinion about the file'],
  'The message asks for an action with a deadline, which is a request whatever its politeness. '
  'Nothing is being reported and nothing is being settled.')

q('GB_TC_012', 'TC_FAM03_PURPOSE_RECOGNITION', 'D1',
  'A message reads: "We will use the second approach; I have updated the plan accordingly." What '
  'is its purpose?',
  'To announce a decision that has been taken',
  ['To ask which approach to use',
   'To request that the plan be updated',
   'To report a fault'],
  'The choice has already been made and the message says so, so nothing remains open. A message '
  'proposing the same approach would be a different thing entirely.')

q('GB_TC_013', 'TC_FAM03_PURPOSE_RECOGNITION', 'D2',
  'A message reads: "I think the second approach is better, but it is your call." A reader treats '
  'it as a decision and stops discussing it. What went wrong?',
  'The message offered an opinion and explicitly left the decision open; it was read as settling '
  'the matter',
  ['The message was a decision and the reader was right to stop',
   'The message was a request and the reader should have acted',
   'The message was a report and required no response'],
  'Its second half hands the choice to somebody else, which is exactly what a decision does not '
  'do. Purpose decides what a message obliges the reader to do, and here the obligation was to '
  'decide.')

# =========================================================================
# TC_FAM04_INSTRUCTION_OUTCOME — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_TC_014', 'TC_FAM04_INSTRUCTION_OUTCOME', 'D2',
  'An instruction reads: "Enter a positive integer from 1 to 100." Which entry does it exclude?',
  '0',
  ['1', '50', '100'],
  'The excluded entry is 0, which is neither positive nor within the stated range and so fails on '
  'both counts. Both endpoints are included, because the instruction says from 1 to 100 rather '
  'than between them.',
  provenance='LEGACY_KEEP', source='95cbe1')

q('GB_TC_015', 'TC_FAM04_INSTRUCTION_OUTCOME', 'D3',
  'An instruction reads: "Submit before 5 pm." Which submission time definitely satisfies it?',
  '4:30 pm',
  ['5:00 pm', '5:30 pm', 'Any time on the day'],
  '"Before" excludes the time named, so five o\'clock itself is too late. The boundary word is '
  'what decides it, and reading it as "by" would admit a submission the instruction rejects.',
  provenance='LEGACY_KEEP', source='97a686')

# =========================================================================
# TC_FAM05_READING_FOR_FACT — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_TC_016', 'TC_FAM05_READING_FOR_FACT', 'D2',
  'A passage states: "A strong password is usually long and unique. Reusing the same password '
  'across many services increases risk." According to the passage, what increases risk?',
  'Reusing the same password across services',
  ['Using a password that is too long',
   'Using a different password for each service',
   'Changing passwords too rarely'],
  'The passage says reuse increases risk and says nothing about how often passwords are changed. '
  'Changing them rarely may well be risky, and the question asks what this passage states.',
  provenance='LEGACY_KEEP', source='935305')

q('GB_TC_017', 'TC_FAM05_READING_FOR_FACT', 'D3',
  'A passage states: "Version control records changes to files over time and lets developers '
  'compare versions or work on the same project together." Which of these does the passage '
  'actually claim?',
  'That it keeps a record of changes made over time',
  ['That it prevents developers from making mistakes',
   'That it is required for any project with more than one developer',
   'That it makes projects finish faster'],
  'Only the first is stated. The others are plausible and widely believed, and a passage saying '
  'something useful is not the same as a passage saying that particular thing.',
  provenance='LEGACY_REWRITE', source='952daa')

# =========================================================================
# TC_FAM06_AMBIGUITY_DETECTION — D2, D3, D4   (both readings must be nameable)
# =========================================================================
q('GB_TC_018', 'TC_FAM06_AMBIGUITY_DETECTION', 'D2',
  'Which instruction permits two different actions?',
  '"Delete the old files and folders."',
  ['"Delete every file created before January."',
   '"Delete the file named report.txt."',
   '"Delete all files in the archive folder."'],
  'The first can mean old files together with all folders, or old files and old folders — two '
  'different sets. Each of the others names exactly what to act on, whatever else might be '
  'unclear about them.')

q('GB_TC_019', 'TC_FAM06_AMBIGUITY_DETECTION', 'D3',
  'An instruction reads: "Send the report to the manager and the team lead if it is complete." '
  'What are the two readings?',
  'The condition applies to both recipients, or only to the team lead',
  ['The report is complete, or the manager is complete',
   'Send it now, or send it later',
   'Send one copy, or send two copies'],
  'Whether the closing condition governs the whole instruction or only its nearest part changes '
  'who receives the report when it is incomplete. Naming both readings is what shows the '
  'ambiguity was located rather than sensed.')

q('GB_TC_020', 'TC_FAM06_AMBIGUITY_DETECTION', 'D4',
  'An instruction reads: "Back up the database weekly and the log files." A reader backs up the '
  'logs once and never again, which the writer had not intended. The instruction is brief but not '
  'ungrammatical, and the reader followed it. Which wording permitted that?',
  '"Weekly" sits between the two items, so it can be read as applying only to the first',
  ['"Back up" is vague about what a backup is',
   '"The log files" does not say which log files',
   '"And" should have been "as well as"'],
  'The reader\'s action is the evidence, and it is exactly what the instruction says under one of '
  'its two readings. The other objections are real imprecisions that would not have produced this '
  'particular behaviour.',
  evidence='The instruction is brief but not ungrammatical, and the reader followed it')

# =========================================================================
# TC_FAM07_MISSING_INFORMATION — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_TC_021', 'TC_FAM07_MISSING_INFORMATION', 'D2',
  'A report reads: "The export failed this morning. I was using the usual settings." What missing '
  'piece most prevents anyone acting on it?',
  'What the failure looked like — the message shown or what happened instead',
  ['The exact time it happened',
   'Which version of the software was in use',
   'Whether it had worked the day before'],
  'Without knowing what happened, nobody can tell one failure from another or judge whether they '
  'have reproduced it. The other three would each help and none of them blocks a first step.',
  provenance='LEGACY_REWRITE', source='14508e')

q('GB_TC_022', 'TC_FAM07_MISSING_INFORMATION', 'D3',
  'A report reads: "When I click Submit on the registration page, the application closes '
  'immediately. It happens every time." What missing piece most prevents anyone acting on it?',
  'What was entered on the form before Submit was clicked',
  ['What the reporter expected to happen instead',
   'Which page the problem occurs on',
   'Whether the problem happens more than once'],
  'The report already gives the page, the action and the fact that it repeats, and what happens '
  'is unmistakable. What nobody can reproduce without is the input — the failure may depend '
  'entirely on what was typed.',
  provenance='LEGACY_REWRITE', source='14eec5')

q('GB_TC_023', 'TC_FAM07_MISSING_INFORMATION', 'D4',
  'A report gives the page, the exact steps, the input used and the message shown. A developer '
  'follows it exactly and the problem does not occur. Everything the report states is accurate. '
  'What was most likely omitted?',
  'Something about the reporter\'s own situation — their account, settings or data — that the '
  'steps do not carry',
  ['The steps, which must have been incomplete',
   'The message, which must have been misquoted',
   'Nothing; the problem must have been fixed in between'],
  'Accurate steps that do not reproduce the problem point at a difference between the two '
  'environments rather than at the description. A report can be complete about what was done and '
  'silent about who did it and with what data.',
  evidence='Everything the report states is accurate')

# =========================================================================
# TC_FAM08_ASSUMED_KNOWLEDGE — D2, D3 (legacy), D4   (reader described specifically)
# =========================================================================
q('GB_TC_024', 'TC_FAM08_ASSUMED_KNOWLEDGE', 'D2',
  'A message to a customer who has never written code reads: "Your request failed validation '
  'because the payload was malformed." Which word would that reader most likely not understand?',
  'payload',
  ['request', 'failed', 'because'],
  'A payload is a technical term for the body of a message, and it has no everyday meaning that '
  'would carry the reader through. The other three words are ordinary English used ordinarily.')

q('GB_TC_025', 'TC_FAM08_ASSUMED_KNOWLEDGE', 'D3',
  'An explanation written for a first-year student reads: "The function is idempotent, so '
  'retrying is safe." Which part assumes knowledge the reader will not have, and what follows?',
  '"Idempotent"; without it the reader cannot see why retrying is safe, which is the whole point '
  'of the sentence',
  ['"Function", which a first-year student would not have met',
   '"Retrying", which needs a definition',
   'Nothing; the sentence explains itself'],
  'The unfamiliar term is carrying the reasoning, so not knowing it leaves the reader with a '
  'conclusion and no route to it. A term the reader cannot follow matters most when the argument '
  'runs through it.',
  provenance='LEGACY_REWRITE', source='49e41c')

q('GB_TC_026', 'TC_FAM08_ASSUMED_KNOWLEDGE', 'D4',
  'A message to a new team member reads: "Push to your branch, then open a request against main '
  'once the checks are green." The reader has used version control before but is new to this '
  'team. Which part assumes knowledge they cannot have?',
  '"Main" and "the checks" refer to this team\'s particular arrangement, which no prior experience '
  'supplies',
  ['"Push", which is a technical term',
   '"Branch", which requires knowing version control',
   'Nothing; a reader with version control experience will follow all of it'],
  'The reader\'s stated experience covers the general vocabulary and cannot cover what this team '
  'happens to call things or which checks it runs. Naming the reader precisely is what makes the '
  'answer derivable rather than a matter of opinion.',
  evidence='The reader has used version control before but is new to this team')

# =========================================================================
# TC_FAM09_PRECISION_COMPARISON — D2, D3, D4
# =========================================================================
q('GB_TC_027', 'TC_FAM09_PRECISION_COMPARISON', 'D2',
  'A rule admits entries of exactly 10 and above. Which phrasing cannot be misread?',
  '"10 or more"',
  ['"More than 10"', '"Around 10 and above"', '"10 upwards, roughly"'],
  'Only "10 or more" states unambiguously that 10 itself qualifies. "More than 10" excludes it, '
  'and the two hedged phrasings leave the boundary undecided.')

q('GB_TC_028', 'TC_FAM09_PRECISION_COMPARISON', 'D3',
  'A limit is meant to reject anything heavier than 20 kg while accepting exactly 20. Which '
  'phrasing says that?',
  '"Up to and including 20 kg"',
  ['"Under 20 kg"', '"Up to 20 kg"', '"Around 20 kg or less"'],
  '"Up to" is used both ways in ordinary speech, so it does not settle the boundary, and "under" '
  'plainly excludes it. Spelling out that the value itself is included is what removes the second '
  'reading.')

q('GB_TC_029', 'TC_FAM09_PRECISION_COMPARISON', 'D4',
  'Two phrasings of one requirement are offered. One is a single short sentence and one is three '
  'sentences. The short one turned out to admit two readings and the long one admits only the '
  'intended reading. Which should be used, and what does the choice cost?',
  'The longer one, since a phrasing that can be followed two ways is not a requirement; the cost '
  'is that it takes longer to read',
  ['The shorter one, since brevity aids understanding',
   'The shorter one, with a note explaining the intended reading',
   'Either; both describe the same requirement'],
  'A requirement exists to fix what must happen, so admitting two readings defeats its purpose '
  'however elegant it is. A note explaining the intended reading is an admission that the wording '
  'failed, and it will be separated from the wording eventually.',
  evidence='The short one turned out to admit two readings')

# =========================================================================
# TC_FAM10_INFORMATION_PLACEMENT — D2, D3, D4
# =========================================================================
q('GB_TC_030', 'TC_FAM10_INFORMATION_PLACEMENT', 'D2',
  'A guide has sections called Requirements, Installation, Usage and Troubleshooting. Where does '
  '"you will need an account before starting" belong?',
  'Requirements',
  ['Installation', 'Usage', 'Troubleshooting'],
  'Something needed before anything else begins belongs under Requirements, where a reader looks '
  'before beginning. Placed under Installation it is found only after the reader has started and '
  'failed.')

q('GB_TC_031', 'TC_FAM10_INFORMATION_PLACEMENT', 'D3',
  'The same guide is being written. Where does "the import ignores rows with an empty date column" '
  'belong?',
  'Usage, where the import is described, since it changes what the reader should expect from a '
  'normal run',
  ['Troubleshooting, since a reader will notice it only when rows go missing',
   'Requirements, since the data must have dates',
   'Installation, since it is a property of the software'],
  'A reader following the usage section needs to know this before running the import, not after '
  'wondering where their rows went. Placing a known behaviour under troubleshooting guarantees it '
  'is read too late.')

q('GB_TC_032', 'TC_FAM10_INFORMATION_PLACEMENT', 'D4',
  'A known limitation is currently described in the Troubleshooting section, and readers keep '
  'meeting it and reporting it as a fault. The description itself is accurate and clear. What '
  'should change?',
  'Its position: a limitation readers meet in normal use belongs where they read before using, '
  'not where they look after trouble',
  ['Its wording, which must be unclear',
   'Nothing; readers should read the whole guide',
   'The software, since a limitation readers keep meeting should be removed'],
  'Accurate and clear text producing repeated confusion points at where it sits rather than what '
  'it says. Troubleshooting is read after something has gone wrong, so anything placed there is '
  'by definition found late.',
  evidence='The description itself is accurate and clear')

# =========================================================================
# TC_FAM11_QUESTION_ANSWERABILITY — D3 (legacy), D4 (legacy)
# =========================================================================
q('GB_TC_033', 'TC_FAM11_QUESTION_ANSWERABILITY', 'D3',
  'Four help requests are received. Which can be answered as written?',
  '"Running the import with the sample file gives the message \'column not found\'; I expected it '
  'to load 20 rows. What should I check?"',
  ['"Could you please help me with the import when you have a moment? Thank you."',
   '"The import gives an error. I have tried several times."',
   '"I expected the import to load 20 rows and it did not. What should I check?"'],
  'Only the first states what was tried, what happened and what was expected, which is what makes '
  'an answer possible. The last is close and omits what actually happened, so nobody can tell '
  'which failure it is. Politeness is not the criterion; all four are civil.',
  provenance='LEGACY_REWRITE', source='13b257')

q('GB_TC_034', 'TC_FAM11_QUESTION_ANSWERABILITY', 'D4',
  'A request states what was tried and what happened, in detail, and has gone unanswered for two '
  'days. Nothing about it is impolite and its detail is accurate. What is it most likely missing?',
  'What the sender expected instead, without which nobody can tell whether the behaviour is even '
  'wrong',
  ['More detail about what was tried',
   'A polite opening and closing',
   'A deadline by which an answer is needed'],
  'A precise account of behaviour is not yet a question if the reader cannot see what would count '
  'as an answer. Adding detail to a report that is already detailed does not supply the one thing '
  'that is absent.',
  provenance='LEGACY_REWRITE', source='647b1e',
  evidence='Nothing about it is impolite and its detail is accurate')

# =========================================================================
# TC_FAM12_FEEDBACK_ACTIONABILITY — D3, D4   (every option civil)
# =========================================================================
q('GB_TC_035', 'TC_FAM12_FEEDBACK_ACTIONABILITY', 'D3',
  'Four comments are made on the same piece of work. Which one tells the author what to change?',
  '"The function name says it validates, but it also saves — consider splitting the two."',
  ['"This function is doing a bit much, I think."',
   '"Good effort overall, though it could be tidier."',
   '"I would have written this differently."'],
  'Only the first names what is wrong and what to do about it. The other three are polite and '
  'leave the author guessing, which is what makes actionability rather than tone the criterion.')

q('GB_TC_036', 'TC_FAM12_FEEDBACK_ACTIONABILITY', 'D4',
  'A reviewer writes: "Rename this variable to itemCount." The author does so and the reviewer '
  'then objects that the underlying problem remains. The instruction was followed exactly. What '
  'was wrong with the feedback?',
  'It gave a direction without its reason, so the author could not tell what the change was meant '
  'to achieve',
  ['It was too blunt in tone',
   'It named a specific variable rather than describing the pattern',
   'Nothing; the author should have asked what was meant'],
  'The change was made exactly as asked and did not achieve what the reviewer wanted, which means '
  'the instruction and the intent had come apart. Feedback carrying its reason lets an author '
  'reach the intent even when the specific instruction is imperfect.',
  evidence='The instruction was followed exactly')

# =========================================================================
# TC_FAM13_MISUNDERSTANDING_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_TC_037', 'TC_FAM13_MISUNDERSTANDING_DIAGNOSIS', 'D3',
  'Instructions read: "Clear the cache and restart the service." A reader restarted the service '
  'without clearing anything. Which wording permitted that?',
  'Nothing did; the reader skipped a step the instruction states plainly',
  ['"Clear", which could mean several things',
   '"The cache", which is not identified',
   '"And", which could join two alternatives'],
  'Both steps are stated and neither is optional, so this is a reader error rather than a text '
  'one. Being able to say that the text is not at fault is as much part of the skill as locating '
  'a fault when there is one.')

q('GB_TC_038', 'TC_FAM13_MISUNDERSTANDING_DIAGNOSIS', 'D4',
  'Instructions read: "Copy the configuration file into the application directory and edit it to '
  'add your key." A reader edited the original file instead of the copy. Every step in the '
  'instruction is present and in the right order. Which wording permitted that?',
  '"It" does not say which of the two files, and the original was the last one clearly named',
  ['"Copy", which could mean move',
   '"The application directory", which is not identified',
   '"Your key", which is not explained'],
  'The reader\'s action is a reasonable reading of the pronoun, which is the only part of the '
  'sentence that leaves two candidates. The other imprecisions are real and would have produced '
  'different mistakes.',
  evidence='Every step in the instruction is present and in the right order')

q('GB_TC_039', 'TC_FAM13_MISUNDERSTANDING_DIAGNOSIS', 'D5',
  'Six readers follow the same instruction and four of them do the same unintended thing. What '
  'does the pattern tell you, and what does it not?',
  'That the wording permits their reading; it does not tell you which words, and it does not show '
  'the readers were careless',
  ['That the four readers were careless',
   'That the instruction is grammatically incorrect',
   'That the two who got it right misread it'],
  'Several people independently reaching the same wrong reading is strong evidence that the '
  'reading is available in the text. Which words permit it still has to be found, and that a '
  'minority read it as intended shows only that the text admits both.',
  mode='TRANSFER', hinge='four of them do the same unintended thing')

q('GB_TC_040', 'TC_FAM13_MISUNDERSTANDING_DIAGNOSIS', 'D5',
  'An instruction has been followed wrongly once in two years. Rewriting it would take an hour '
  'and would need every translated version updated. Should it be rewritten?',
  'It depends on the cost of the wrong action; a single rare misreading of something harmless is '
  'not worth the cascade, and one that loses data is',
  ['Yes; any wording that has ever been misread should be rewritten',
   'No; one misreading in two years is within tolerance',
   'Yes; clarity is always worth an hour'],
  'Whether to repair wording is not settled by how often it misleads alone — what matters is what '
  'happens when it does. A rule that fires on any single misreading ignores the cost of changing '
  'things that many people depend on.',
  mode='TRADEOFF', hinge='would need every translated version updated')

q('GB_TC_041', 'TC_FAM13_MISUNDERSTANDING_DIAGNOSIS', 'D5',
  'A writer says their instruction is fine because it is technically correct, and readers are '
  'getting it wrong. Is technical correctness a defence?',
  'No; an instruction exists to produce an action, so one that reliably produces the wrong action '
  'has failed whatever it technically says',
  ['Yes; a correct instruction cannot be at fault',
   'No; instructions are never technically correct',
   'Yes, provided the readers were not the intended audience'],
  'Correctness settles what the words mean and not whether they work. Text that is defensible '
  'word by word and reliably misread is a failure of the same kind as a program that is legal and '
  'does the wrong thing.',
  mode='TRANSFER', hinge='their instruction is fine because it is technically correct')

# =========================================================================
# TC_FAM14_MESSAGE_REPAIR — D4, D5 x4   (the defect is named in the stem)
# =========================================================================
q('GB_TC_042', 'TC_FAM14_MESSAGE_REPAIR', 'D4',
  'A message reads: "The report is late." The named defect is that it does not say what is needed '
  'from the reader. The message is short, civil and accurate. Which rewrite removes that defect?',
  '"The report is late; could you send me the figures today so I can finish it?"',
  ['"Unfortunately the report is running late, and I apologise for the delay."',
   '"The report is late because the figures have not arrived."',
   '"The report is late. This has happened twice this month."'],
  'Only the first says what the reader should do. The second improves tone, the third supplies a '
  'cause and the fourth adds context — all genuine improvements that leave the named defect '
  'exactly where it was.',
  evidence='The message is short, civil and accurate')

q('GB_TC_043', 'TC_FAM14_MESSAGE_REPAIR', 'D5',
  'A message reads: "Please review this when you can." The named defect is that it gives no '
  'deadline. Which rewrite removes that defect and introduces no new one?',
  '"Please review this by Thursday; let me know if that is not possible."',
  ['"Please review this urgently."',
   '"Please review this as soon as possible."',
   '"Please review this by Thursday or I will have to escalate."'],
  'A date is what a deadline is, and offering a route to say no keeps the request civil. "Urgently" '
  'and "as soon as possible" are as unfixed as the original, and the fourth attaches a threat, '
  'which is a new defect.',
  mode='TRANSFER', hinge='The named defect is that it gives no deadline')

q('GB_TC_044', 'TC_FAM14_MESSAGE_REPAIR', 'D5',
  'A message reads: "The change broke the build." The named defect is that it names no change and '
  'no failure. Which rewrite removes exactly that defect?',
  '"The change to the date parser broke the build: the timezone tests now fail."',
  ['"Someone\'s change broke the build and it needs fixing quickly."',
   '"The build is broken; please look into it when you can."',
   '"The change to the date parser broke the build."'],
  'Both halves of the defect have to go, and only the first supplies the change and the failure. '
  'The last option repairs one half and leaves the other, which is the most tempting wrong answer '
  'because it plainly improves the message.',
  mode='TRANSFER', hinge='The named defect is that it names no change and no failure')

q('GB_TC_045', 'TC_FAM14_MESSAGE_REPAIR', 'D5',
  'A message has two defects: it is ambiguous about which file, and it is curt. Only one rewrite '
  'is possible before the message must be sent. Which defect should be repaired?',
  'The ambiguity, because it can cause the wrong action, whereas curtness costs goodwill',
  ['The curtness, because tone affects whether the message is acted on at all',
   'Neither; a message with two defects should not be sent',
   'Both are equally serious, so either choice is defensible'],
  'One defect risks the wrong file being touched and the other risks mild offence, and only the '
  'first has a consequence the message exists to prevent. Ranking defects by what they cause is '
  'what makes a single repair a decision rather than a guess.',
  mode='TRADEOFF', hinge='Only one rewrite is possible before the message must be sent')

q('GB_TC_046', 'TC_FAM14_MESSAGE_REPAIR', 'D5',
  'A rewrite removes the named defect and makes the message twice as long. When is that a bad '
  'trade?',
  'When the length puts the essential part where a hurried reader will not reach it',
  ['Always; a longer message is always worse',
   'Never; removing a defect is always worth any length',
   'When the original was already grammatical'],
  'Length matters only through its effect on whether the message is read and acted on, so the '
  'question is where the important part now sits. A longer message that leads with what matters '
  'costs almost nothing.',
  mode='TRADEOFF', hinge='makes the message twice as long')

# =========================================================================
# TC_FAM15_FORM_SELECTION — D4, D5 x3   (constraints stated explicitly)
# =========================================================================
q('GB_TC_047', 'TC_FAM15_FORM_SELECTION', 'D4',
  'A decision must be recorded so that people who join later can find it, and it must reach four '
  'named people today. A written record is required and immediacy is not. Which form fits?',
  'A written note in the shared document, with a message pointing the four people at it',
  ['A call with the four people',
   'A message to the four people only',
   'A note in the shared document only'],
  'Both constraints have to be met, and each single-channel option meets one. A call leaves no '
  'record, a message reaches the four and is unfindable later, and a document alone does not '
  'reach them today.',
  evidence='A written record is required and immediacy is not')

q('GB_TC_048', 'TC_FAM15_FORM_SELECTION', 'D5',
  'A production system is failing now, three people must act within minutes, and a record is '
  'wanted afterwards. Which form fits, and in what order?',
  'Reach the three immediately by whatever is fastest, then write the record once the failure is '
  'handled',
  ['Write the record first, so nothing is forgotten',
   'Write the record only, since it reaches everyone eventually',
   'Reach the three immediately, and treat the messages as the record'],
  'Both needs are real and one of them is urgent, so they are met in sequence rather than traded '
  'off. Treating the scattered messages as the record satisfies the letter of the requirement and '
  'leaves nothing anybody can find.',
  mode='TRANSFER', hinge='three people must act within minutes, and a record is wanted afterwards')

q('GB_TC_049', 'TC_FAM15_FORM_SELECTION', 'D5',
  'A question needs an answer from one person, and the answer will matter to a team of twenty '
  'later. Asking privately is faster. What does each choice cost?',
  'Privately is faster and the answer reaches nobody else; publicly is slower and the answer is '
  'there when the next person asks',
  ['Privately costs nothing, since the answer can be shared afterwards',
   'Publicly costs nothing, since it reaches everyone',
   'They are equivalent, since one person answers either way'],
  'The two differ in what happens after the answer arrives. Sharing afterwards is possible and '
  'usually does not happen, which is the cost the private route actually carries.',
  mode='TRADEOFF', hinge='the answer will matter to a team of twenty later')

q('GB_TC_050', 'TC_FAM15_FORM_SELECTION', 'D5',
  'A message must reach someone who is unavailable for two days, and the matter cannot wait that '
  'long. What follows about the form?',
  'The form cannot solve it; the choice is to escalate to somebody available or to accept the '
  'delay, and that decision has to be made explicitly',
  ['Send it by every channel at once, so it arrives as soon as they return',
   'Send it and wait, since the message has been delivered',
   'Send it to the whole team, so somebody sees it'],
  'When no channel meets the constraints, choosing a channel is not the decision to be made. '
  'Sending and waiting satisfies the form and not the need, and broadcasting to everyone is an '
  'escalation made without deciding to escalate.',
  mode='EDGE', hinge='unavailable for two days, and the matter cannot wait that long')
