# -*- coding: utf-8 -*-
"""
Wave 2 — APTITUDE_REASONING_LOGIC, 50 Golden Bank questions.

11 come from the existing bank (4 kept, 6 rewritten, 1 remapped from PATTERN_RECOGNITION) and 39
are new.

THE ODD-ONE-OUT FAMILY IS REBUILT AROUND THE RULE, NOT THE ITEM. AL_FAM10's objective is to state
the property that separates the odd item, and all three legacy items merely asked which item
differs — answerable by a lucky guess among four. Each now shows the odd item and asks what
property separates it, which is what the family exists to measure.

REAL-WORLD TRUTH IS MADE IRRELEVANT WHEREVER THE BLUEPRINT ASKS FOR IT. AL_FAM04 requires at
least one distractor that is plainly true and still does not follow, because a student who answers
from what they know about the world rather than from the statements given has not reasoned at all.
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
# AL_FAM01_CLAIM_SCOPE — D1 x4, D2 x1
# =========================================================================
q('GB_AL_001', 'AL_FAM01_CLAIM_SCOPE', 'D1',
  'The statement "Some laptops have a touchscreen" is about which part of the group?',
  'At least one laptop, and possibly all of them',
  ['Every laptop', 'Exactly half the laptops', 'Most laptops but not all'],
  '"Some" claims that at least one exists and stops there; it neither promises the rest do not '
  'nor fixes how many do. Reading it as "some but not all" adds a claim the statement never made.')

q('GB_AL_002', 'AL_FAM01_CLAIM_SCOPE', 'D1',
  'The statement "All servers in this room are switched on" is about which part of the group?',
  'Every server in the room, without exception',
  ['Most of the servers in the room',
   'At least one server in the room',
   'The servers in the room and in every other room'],
  '"All" covers each member of the named group and no more. It is stronger than "some" and '
  'narrower than a claim about servers everywhere.')

q('GB_AL_003', 'AL_FAM01_CLAIM_SCOPE', 'D1',
  'The statement "No tablet in the store has a keyboard" is about which part of the group?',
  'Every tablet in the store, each of which lacks a keyboard',
  ['At least one tablet in the store lacks a keyboard',
   'Most tablets in the store lack a keyboard',
   'Tablets everywhere lack keyboards'],
  'A "none" claim is as sweeping as an "all" claim, applied to the absence rather than the '
  'presence. Weakening it to "at least one" loses exactly what it asserts.')

q('GB_AL_004', 'AL_FAM01_CLAIM_SCOPE', 'D1',
  'Which of these statements is the weakest — that is, claims the least?',
  'Some of the machines are new',
  ['All of the machines are new', 'None of the machines are new',
   'All but one of the machines are new'],
  'A claim is weaker when fewer situations would make it false, and "some" is satisfied by a '
  'single new machine. Each of the others rules out many more possibilities.')

q('GB_AL_005', 'AL_FAM01_CLAIM_SCOPE', 'D2',
  'A report says "Some of the tests failed". A reader concludes that some of the tests passed. Is '
  'that conclusion warranted?',
  'No; "some failed" leaves open that all of them failed',
  ['Yes; "some" always means "some but not all"',
   'Yes; a test that did not fail must have passed',
   'No; nothing at all follows about the tests'],
  'The word "some" guarantees at least one and says nothing about the rest, so every test failing '
  'is consistent with it. Something does follow — at least one failure — so it is not true that '
  'nothing follows.')

# =========================================================================
# AL_FAM02_NEGATION_FORM — D1 x3, D2 x1
# =========================================================================
q('GB_AL_006', 'AL_FAM02_NEGATION_FORM', 'D1',
  'What exactly denies the claim "All the files were copied"?',
  'At least one file was not copied',
  ['No files were copied', 'Most of the files were not copied',
   'All the files were deleted'],
  'To deny that every file was copied, one exception is enough. Claiming none were copied is far '
  'stronger than the denial requires, and would itself be a new claim needing its own support.')

q('GB_AL_007', 'AL_FAM02_NEGATION_FORM', 'D1',
  'What exactly denies the claim "No student passed"?',
  'At least one student passed',
  ['All students passed', 'Most students passed', 'Some students did not pass'],
  'A "none" claim is denied by a single case to the contrary. Asserting that all passed overshoots '
  'the denial, and "some did not pass" is consistent with the original rather than opposed to it.')

q('GB_AL_008', 'AL_FAM02_NEGATION_FORM', 'D1',
  'What exactly denies the claim "Some of the readings are above the limit"?',
  'No reading is above the limit',
  ['Some of the readings are below the limit',
   'Not all of the readings are above the limit',
   'Most of the readings are below the limit'],
  'Denying that at least one exists means asserting none do. The other options are all consistent '
  'with the original claim, so none of them contradicts it.')

q('GB_AL_009', 'AL_FAM02_NEGATION_FORM', 'D2',
  'Someone claims "All the sensors are working". A colleague replies "That is false". What has the '
  'colleague committed themselves to?',
  'That at least one sensor is not working',
  ['That no sensor is working',
   'That most sensors are not working',
   'That the sensors cannot be checked'],
  'Calling a universal claim false commits you to one exception and nothing more. Taking on the '
  'stronger position — that none work — would need separate evidence, and is a common way an '
  'argument becomes harder to defend than it had to be.')

# =========================================================================
# AL_FAM03_OVERLAP_RECOGNITION — D1 x3, D2 x1 (legacy)
# =========================================================================
q('GB_AL_010', 'AL_FAM03_OVERLAP_RECOGNITION', 'D1',
  'Given only "Some programmers are designers", what is settled about the two groups?',
  'They overlap at least partly; nothing more is settled',
  ['They overlap completely',
   'Some programmers are definitely not designers',
   'The two groups have nothing else in common'],
  'The statement guarantees an overlap and fixes neither its size nor whether anything lies '
  'outside it. Every programmer being a designer is consistent with it, and so is almost none.')

q('GB_AL_011', 'AL_FAM03_OVERLAP_RECOGNITION', 'D1',
  'Given only "All tablets are devices", what is settled about the two groups?',
  'Every tablet lies inside the group of devices; some devices may not be tablets',
  ['The two groups are the same group',
   'Every device is a tablet',
   'Some tablets lie outside the group of devices'],
  'An "all" claim places one group entirely inside another and says nothing about what else the '
  'larger group holds. Reading it in both directions is what turns a valid statement into an '
  'invalid one.')

q('GB_AL_012', 'AL_FAM03_OVERLAP_RECOGNITION', 'D1',
  'Given only "No laptop in the batch is faulty", what is settled about the two groups?',
  'The two groups do not overlap at all',
  ['They overlap partly', 'Every faulty item is something other than a laptop',
   'The batch contains no laptops'],
  'A "none" statement is exactly a claim of no overlap between the two groups named. It says '
  'nothing about faulty items elsewhere, and it does not imply the batch is empty.')

q('GB_AL_013', 'AL_FAM03_OVERLAP_RECOGNITION', 'D2',
  'Students taking Python are A, B and C. Students taking C are B, C and D. Who takes both?',
  'B and C',
  ['A and D', 'A, B, C and D', 'Only D'],
  'The overlap is exactly those appearing in both lists. Combining the lists gives everyone taking '
  'either subject, which is a different group.',
  provenance='LEGACY_KEEP', source='3b9516')

# =========================================================================
# AL_FAM04_SINGLE_INFERENCE — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_AL_014', 'AL_FAM04_SINGLE_INFERENCE', 'D2',
  'All laptops are computers. This device is a laptop. What follows?',
  'This device is a computer',
  ['This device is not a computer',
   'All computers are laptops',
   'Nothing follows without knowing the make'],
  'Membership passes from the smaller group to the larger one, so the conclusion is immediate. '
  'Reading the first statement backwards gives a claim about all computers, which nothing here '
  'supports.',
  provenance='LEGACY_KEEP', source='cca121')

q('GB_AL_015', 'AL_FAM04_SINGLE_INFERENCE', 'D3',
  'All prime numbers greater than 2 are odd. 13 is prime and greater than 2. What follows?',
  '13 is odd',
  ['All odd numbers are prime', '13 is even', '2 is odd'],
  'The two statements combine to place 13 in the group of odd numbers. That all odd numbers are '
  'prime is a separate claim, plainly false, and it is what reversing the first statement would '
  'give — which is why it has to be rejected on its shape rather than on its content.',
  provenance='LEGACY_KEEP', source='ca2845')

# =========================================================================
# AL_FAM05_MEMBERSHIP_CHAIN — D2, D3
# =========================================================================
q('GB_AL_016', 'AL_FAM05_MEMBERSHIP_CHAIN', 'D2',
  'All sparrows are birds. All birds are animals. What follows about sparrows?',
  'All sparrows are animals',
  ['All animals are sparrows', 'Some sparrows are not animals',
   'Nothing, because three groups are involved'],
  'Membership passes along a chain of "all" claims however long the chain is. Following it '
  'backwards gives a claim about animals that neither statement supports.')

q('GB_AL_017', 'AL_FAM05_MEMBERSHIP_CHAIN', 'D3',
  'Some engineers are managers. All managers attend the review. What follows about engineers?',
  'Some engineers attend the review',
  ['All engineers attend the review',
   'No engineer attends the review',
   'Nothing follows about engineers'],
  'The first statement puts at least one engineer among the managers, and every manager attends, '
  'so at least one engineer does. The chain carries "some" through as "some" — it does not '
  'strengthen it to "all", and it does not break.')

# =========================================================================
# AL_FAM06_TWO_PREMISE_INFERENCE — D2, D3, D4
# =========================================================================
q('GB_AL_018', 'AL_FAM06_TWO_PREMISE_INFERENCE', 'D2',
  'The build fails whenever a test fails. A test has failed. What do the two statements jointly '
  'support?',
  'The build has failed',
  ['A test has failed, which the first statement already told us',
   'Every build failure is caused by a test failure',
   'The build will pass once the test is fixed'],
  'The two together give the conclusion; neither alone does. Reading the first backwards would '
  'make every build failure a test failure, and the third option needs a further assumption about '
  'what else might break.')

q('GB_AL_019', 'AL_FAM06_TWO_PREMISE_INFERENCE', 'D3',
  'Every file in the archive is compressed. No compressed file can be edited directly. What do '
  'the two support about files in the archive?',
  'No file in the archive can be edited directly',
  ['Some files in the archive can be edited directly',
   'Every file that cannot be edited directly is in the archive',
   'Nothing, since the two statements are about different properties'],
  'The first places archive files inside the compressed group and the second excludes that whole '
  'group from being editable, so the exclusion reaches the archive. The properties differ, which '
  'is precisely what lets two statements chain.')

q('GB_AL_020', 'AL_FAM06_TWO_PREMISE_INFERENCE', 'D4',
  'All members have a card. Some cardholders are visitors. Someone concludes that some members '
  'are visitors. Both statements are true. Why does the conclusion not follow?',
  'The visitors who hold cards need not be the cardholders who are members',
  ['The first statement should have said "some members"',
   'The second statement is about cards rather than people',
   'It does follow; two true statements cannot give a false conclusion'],
  'Members are inside the cardholders, and visitors overlap the cardholders, but the two need not '
  'meet — the overlap could lie entirely among cardholders who are not members. True premises '
  'guarantee nothing when the step between them is invalid.',
  evidence='Both statements are true')

# =========================================================================
# AL_FAM07_INVALID_STEP_DETECTION — D2, D3, D4
# =========================================================================
q('GB_AL_021', 'AL_FAM07_INVALID_STEP_DETECTION', 'D2',
  'An argument runs: "Every experienced developer writes tests. Priya writes tests. So Priya is an '
  'experienced developer." Which step is not warranted?',
  'Concluding that Priya is experienced from the fact that she writes tests',
  ['Claiming that every experienced developer writes tests',
   'Claiming that Priya writes tests',
   'No step is unwarranted; the conclusion holds'],
  'The first statement puts experienced developers inside the test-writers, so a test-writer may '
  'sit outside that inner group. The conclusion is plausible and may well be true, which is what '
  'makes the shape of the step worth checking rather than the outcome.')

q('GB_AL_022', 'AL_FAM07_INVALID_STEP_DETECTION', 'D3',
  'An argument runs: "The three servers we checked were all patched. So every server in the estate '
  'is patched." Which step is not warranted?',
  'Generalising from three cases to the whole estate',
  ['Checking only three servers',
   'Assuming a patched server stays patched',
   'No step is unwarranted, since all three were patched'],
  'The observation is correct and the conclusion may be true; what is missing is any reason those '
  'three represent the rest. Checking few is a practical limitation rather than a logical error — '
  'the error is in what is concluded from it.')

q('GB_AL_023', 'AL_FAM07_INVALID_STEP_DETECTION', 'D4',
  'An argument runs: "If the cache is stale, the page shows old content. The page shows old '
  'content. So the cache is stale." The conclusion turned out to be correct. Which step is still '
  'not warranted?',
  'Reasoning from the effect back to that cause, when other causes could produce the same effect',
  ['Claiming that a stale cache shows old content',
   'Observing that the page shows old content',
   'None; the conclusion being correct shows the reasoning was sound'],
  'A conditional runs one way, so seeing the consequence leaves the antecedent open — the server '
  'might simply be serving old data. That the conclusion happened to be right does not repair the '
  'step, which is exactly why a correct answer is not evidence of correct reasoning.',
  evidence='The conclusion turned out to be correct')

# =========================================================================
# AL_FAM08_CONDITIONAL_REASONING — D2 (legacy), D3, D4
# =========================================================================
q('GB_AL_024', 'AL_FAM08_CONDITIONAL_REASONING', 'D2',
  'If the server is down, the app cannot fetch new data. The server is down. What follows?',
  'The app cannot fetch new data',
  ['The app can definitely fetch new data',
   'Nothing follows, because a conditional works only in the other direction',
   'The server must have been down because the app could not fetch'],
  'Given the condition and the fact that it holds, the consequence follows directly. The last '
  'option reverses the conditional, which is the step that never follows.',
  provenance='LEGACY_REWRITE', source='d0f4a2')

q('GB_AL_025', 'AL_FAM08_CONDITIONAL_REASONING', 'D3',
  'If the licence has expired, the software refuses to start. The software started normally. What '
  'follows?',
  'The licence has not expired',
  ['The licence has expired', 'Nothing follows about the licence',
   'The licence will expire soon'],
  'Denying the consequence denies the antecedent, so a successful start rules the expiry out. '
  'This is the one direction other than the straightforward one in which a conditional does yield '
  'a conclusion.')

q('GB_AL_026', 'AL_FAM08_CONDITIONAL_REASONING', 'D4',
  'If the disk is full, saving fails. Saving failed. A colleague concludes the disk is full, and '
  'the disk does turn out to be full. What follows from the two statements alone?',
  'Nothing about the disk; saving could fail for other reasons',
  ['The disk is full, as the colleague concluded',
   'The disk is not full',
   'Saving will fail again next time'],
  'The conditional guarantees only that a full disk produces a failure, not that a failure '
  'requires one — permissions or a missing folder would do it too. The colleague turned out to be '
  'right, which changes nothing about whether the statements supported them.',
  evidence='the disk does turn out to be full')

# =========================================================================
# AL_FAM09_ORDERING_CONSTRAINTS — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_AL_027', 'AL_FAM09_ORDERING_CONSTRAINTS', 'D2',
  'Task B can start only after Task A finishes. Task C has no constraints. Which order is '
  'impossible?',
  'B, A, C',
  ['A, B, C', 'C, A, B', 'A, C, B'],
  'The single constraint fixes only that A comes before B, and one of the four orders breaks it. '
  'C may sit anywhere, so its position never decides the answer.',
  provenance='LEGACY_REWRITE', source='ce88b7')

q('GB_AL_028', 'AL_FAM09_ORDERING_CONSTRAINTS', 'D3',
  'A is to the left of B. B is to the left of C. What follows about A and C?',
  'A is to the left of C',
  ['C is to the left of A', 'A and C are in the same position',
   'Nothing follows about A and C'],
  'The relation carries along the chain, so being left of something left of C places A left of C. '
  'Two constraints that share a middle item are exactly what makes a third relation deducible.',
  provenance='LEGACY_REMAP', source='d418a6')

q('GB_AL_029', 'AL_FAM09_ORDERING_CONSTRAINTS', 'D4',
  'Four talks run in some order. P is before Q. R is after Q. S is before P. Someone says the '
  'order cannot be determined. Which position is in fact fixed for S?',
  'First, because P, Q and R must all follow it',
  ['Second, because only P comes before it',
   'Last, because nothing constrains what follows it',
   'It genuinely cannot be determined'],
  'Chaining the constraints gives S before P before Q before R, which fixes the whole order and '
  'puts S at the front. "Cannot be determined" is the right answer to many such questions and the '
  'wrong one here, which is why the chain has to be followed rather than assumed incomplete.',
  evidence='Someone says the order cannot be determined')

# =========================================================================
# AL_FAM10_GROUPING_RULE — D2, D3, D4 (all legacy, rebuilt to ask for the rule)
# =========================================================================
q('GB_AL_030', 'AL_FAM10_GROUPING_RULE', 'D2',
  'Keyboard, Mouse, Monitor, Python. Python is the odd one out. What property separates it?',
  'The other three are physical devices; Python is software',
  ['The other three are input devices',
   'The other three are attached by cable',
   'Python is the only one whose name is a word'],
  'Naming the property is what shows the grouping was understood. Calling the other three input '
  'devices fails, because a monitor is an output device — a rule has to fit every member of the '
  'group, not most of it.',
  provenance='LEGACY_REWRITE', source='ae2b3c')

q('GB_AL_031', 'AL_FAM10_GROUPING_RULE', 'D3',
  'Chrome, Firefox, Edge, Linux. Linux is the odd one out. What property separates it?',
  'The other three are programs for browsing the web; Linux manages the machine they run on',
  ['The other three are free to download and Linux is not',
   'Linux is older than the other three',
   'The other three run only on Windows'],
  'The three browsers share a purpose, and Linux belongs to a different layer entirely. The other '
  'properties offered are either false or true of some members and not others, so none of them '
  'separates the group cleanly.',
  provenance='LEGACY_REWRITE', source='fef403')

q('GB_AL_032', 'AL_FAM10_GROUPING_RULE', 'D4',
  'KB, MB, GB, GHz. Someone picks GHz as the odd one out, giving the reason that it is the only '
  'one whose letters are not in alphabetical sequence. Their answer is right and their reason is '
  'wrong. What is the property that actually separates it?',
  'The other three measure amounts of stored data; GHz measures a frequency',
  ['The other three are larger units than GHz',
   'GHz is the only one used to describe processors',
   'The other three are abbreviations and GHz is not'],
  'Reaching the right item by an accidental route leaves the grouping unexplained, and only the '
  'stated property survives being applied to every member. Units of data and units of frequency '
  'cannot be compared for size at all, which is why the first alternative is not merely wrong but '
  'meaningless.',
  provenance='LEGACY_REWRITE', source='fd195e',
  evidence='Their answer is right and their reason is wrong')

# =========================================================================
# AL_FAM11_ARRANGEMENT_TESTING — D3 (legacy), D4
# =========================================================================
q('GB_AL_033', 'AL_FAM11_ARRANGEMENT_TESTING', 'D3',
  'A meeting must start after 2 pm and before 4 pm. Which proposed time satisfies both '
  'constraints?',
  '3 pm',
  ['2 pm', '1 pm', '5 pm'],
  'The time has to be strictly later than 2 and strictly earlier than 4. Two o\'clock itself fails '
  'the first constraint, which is where a boundary quietly slips past an inattentive check.',
  provenance='LEGACY_KEEP', source='d72fb9')

q('GB_AL_034', 'AL_FAM11_ARRANGEMENT_TESTING', 'D4',
  'Constraints: the review is before the demo; the demo is before lunch; the retrospective is '
  'after lunch. A proposed schedule runs review, demo, retrospective, lunch. It satisfies two of '
  'the three constraints. Which one does it break?',
  'The retrospective must be after lunch, and here it is before',
  ['The review must be before the demo, and here it is after',
   'The demo must be before lunch, and here it is after',
   'It breaks none; the schedule is valid'],
  'Checking each constraint against the proposal in turn is what settles it: the first two hold '
  'and only the third fails. Naming which constraint fails is a different task from noticing that '
  'something is wrong.',
  evidence='It satisfies two of the three constraints')

# =========================================================================
# AL_FAM12_SUFFICIENT_VS_NECESSARY — D3 (legacy), D4
# =========================================================================
q('GB_AL_035', 'AL_FAM12_SUFFICIENT_VS_NECESSARY', 'D3',
  'A rule states that scoring above 80 guarantees a distinction. A student scored 72 and received '
  'a distinction. Is that consistent with the rule?',
  'Yes; scoring above 80 is enough for a distinction but need not be the only route to one',
  ['No; the rule means only scores above 80 receive a distinction',
   'No; the score must have been recorded wrongly',
   'Yes, but only if the rule was changed afterwards'],
  'A guarantee makes a condition sufficient and says nothing about what else might also suffice. '
  'Reading it as the only route turns it into a requirement, which is a different and stronger '
  'claim.',
  provenance='LEGACY_REWRITE', source='b4faad')

q('GB_AL_036', 'AL_FAM12_SUFFICIENT_VS_NECESSARY', 'D4',
  'Entry requires a pass in the entrance test. A candidate passed the test and was refused entry. '
  'Both the rule and the refusal are correct as stated. What does that show about the condition?',
  'It is necessary but not sufficient; passing is required and something further is also demanded',
  ['It is sufficient but not necessary; the refusal must have been a mistake',
   'It is both necessary and sufficient, and the rule was misapplied',
   'It is neither, since the refusal contradicts the rule'],
  '"Requires" makes the pass necessary, so nobody enters without it — and nothing in the word '
  'promises that a pass is enough. A refusal after a pass is therefore consistent with the rule '
  'rather than a contradiction of it.',
  evidence='Both the rule and the refusal are correct as stated')

# =========================================================================
# AL_FAM13_HIDDEN_ASSUMPTION — D3, D4, D5 x3
# =========================================================================
q('GB_AL_037', 'AL_FAM13_HIDDEN_ASSUMPTION', 'D3',
  'An argument runs: "Our new page loads faster, so more visitors will complete a purchase." What '
  'does it assume without stating?',
  'That load speed is among the things holding visitors back from purchasing',
  ['That the page loads faster than before',
   'That visitors want to make purchases',
   'That faster pages are generally preferred'],
  'The argument needs speed to be a cause of the outcome it predicts, and that link is never '
  'stated. The first option is a premise the argument does supply, and the others are true '
  'enough without being what the step depends on.')

q('GB_AL_038', 'AL_FAM13_HIDDEN_ASSUMPTION', 'D4',
  'An argument runs: "Sales rose after we changed the packaging, so the packaging change worked." '
  'Every fact in it is correct. What must be assumed for the conclusion to follow?',
  'That nothing else capable of raising sales changed at the same time',
  ['That sales rose',
   'That the packaging was changed',
   'That packaging can influence buyers in general'],
  'Both facts are given and neither is in doubt; what carries the argument is the unstated claim '
  'that the packaging is what made the difference. That packaging can matter in general is not '
  'enough — it has to be what mattered here.',
  evidence='Every fact in it is correct')

q('GB_AL_039', 'AL_FAM13_HIDDEN_ASSUMPTION', 'D5',
  'An argument runs: "Every complaint we received last month was about delivery, so delivery is '
  'our biggest problem." What does it assume, and how could you test that assumption?',
  'That people complain about the problems that matter most; ask customers who did not complain',
  ['That complaints were received, which the argument states',
   'That delivery can be improved, which is a separate question',
   'That last month was typical, which more months would settle'],
  'The argument moves from what was reported to what is worst, and that move needs complaints to '
  'be a fair sample of problems. People often abandon a service rather than complain, so the '
  'people who never complained are exactly where the assumption can be checked.',
  mode='TRANSFER', hinge='Every complaint we received last month was about delivery')

q('GB_AL_040', 'AL_FAM13_HIDDEN_ASSUMPTION', 'D5',
  'Two arguments reach the same conclusion. One states its assumption openly; the other leaves it '
  'unstated. Which is stronger, and why does the distinction matter?',
  'Neither is stronger in what it proves, but the stated one can be checked, and an unstated '
  'assumption cannot be argued against',
  ['The one stating its assumption, since stating something makes it true',
   'The one leaving it unstated, since fewer claims are easier to defend',
   'They are identical, since both rest on the same assumption'],
  'The logical content is the same either way, so neither proves more. What differs is whether a '
  'reader can locate the weak point — an argument whose assumption is buried survives scrutiny by '
  'being hard to examine rather than by being sound.',
  mode='TRADEOFF', hinge='One states its assumption openly; the other leaves it unstated')

q('GB_AL_041', 'AL_FAM13_HIDDEN_ASSUMPTION', 'D5',
  'An argument assumes something that happens to be true. Does that make the argument sound?',
  'It removes one objection, but the argument is only sound if every step also follows',
  ['Yes; an argument with true assumptions is sound',
   'No; an argument that relies on an unstated assumption is never sound',
   'Yes, provided the conclusion is also true'],
  'Soundness needs both true premises and valid steps, and a true assumption supplies only the '
  'first. An argument can rest on nothing but facts and still reason invalidly from them, and a '
  'true conclusion does not repair that either.',
  mode='TRANSFER', hinge='An argument assumes something that happens to be true')

# =========================================================================
# AL_FAM14_CONCLUSION_STRENGTH — D4, D5 x4
# =========================================================================
q('GB_AL_042', 'AL_FAM14_CONCLUSION_STRENGTH', 'D4',
  'Evidence: of 200 users surveyed after a redesign, 150 said the site was easier to navigate. '
  'The survey covered users who had used both versions. Which conclusion is the strongest the '
  'evidence supports?',
  'Most of the surveyed users found the new version easier to navigate',
  ['The new version is easier to navigate than the old one',
   'Most users of the site find the new version easier',
   'Some users answered the survey'],
  'The evidence is about the 200 people asked, and the strongest warranted claim stays with them. '
  'Extending it to all users assumes the sample represents them, and asserting the site is easier '
  'treats an opinion as a measurement. That some answered is true and far weaker than the '
  'evidence allows.',
  evidence='The survey covered users who had used both versions')

q('GB_AL_043', 'AL_FAM14_CONCLUSION_STRENGTH', 'D5',
  'Evidence: every one of the twelve servers checked was running the latest version. Which is the '
  'strongest conclusion this supports?',
  'All twelve servers checked were up to date',
  ['All servers in the estate are up to date',
   'Most servers in the estate are up to date',
   'At least one server is up to date'],
  'The evidence covers the twelve examined and settles them completely. Any claim about the '
  'estate needs to know how those twelve were chosen, and "at least one" throws away almost '
  'everything the evidence gives.',
  mode='TRANSFER', hinge='every one of the twelve servers checked was running the latest version')

q('GB_AL_044', 'AL_FAM14_CONCLUSION_STRENGTH', 'D5',
  'Evidence: a fault appeared in every one of the five tests that used a large file, and in none '
  'of the twenty that used a small one. Which conclusion is strongest without overreaching?',
  'File size is associated with the fault in these tests, and it is the obvious thing to '
  'investigate next',
  ['Large files cause the fault',
   'The fault has nothing to do with file size',
   'The fault will appear on any large file'],
  'A clean split across twenty-five tests is strong evidence of an association and stops short of '
  'establishing a cause — something else may travel with file size. Naming the next step is '
  'exactly as far as the evidence reaches.',
  mode='TRANSFER', hinge='in every one of the five tests that used a large file')

q('GB_AL_045', 'AL_FAM14_CONCLUSION_STRENGTH', 'D5',
  'A conclusion is stated so cautiously that nobody disputes it and nobody acts on it. A stronger '
  'version would be acted on and goes slightly past the evidence. How should the strength be '
  'chosen?',
  'By what the evidence supports, with the gap to the stronger claim named so others can decide '
  'whether to close it',
  ['By what will be acted on, since an unused conclusion helps nobody',
   'By the most cautious version available, since caution is never wrong',
   'By whichever the audience expects'],
  'Strength is not a matter of taste: a claim either outruns its evidence or it does not. Naming '
  'what further evidence would justify the stronger claim gives the audience a real choice, which '
  'quietly overstating does not.',
  mode='TRADEOFF', hinge='A stronger version would be acted on and goes slightly past the evidence')

q('GB_AL_046', 'AL_FAM14_CONCLUSION_STRENGTH', 'D5',
  'Two conclusions are both supported by the same evidence. One is narrow and certain; the other '
  'is broad and probable. Is one of them wrong?',
  'No; evidence can support claims of different reach, and which to use depends on what is being '
  'decided',
  ['Yes; only the narrow one is genuinely supported',
   'Yes; only the broad one is useful and therefore correct',
   'No, but the broad one should never be stated'],
  'Support is not a single yes or no — a body of evidence backs a narrow claim firmly and a wider '
  'one less firmly, and both can be honestly stated if their standing is clear. What matters is '
  'that the reader knows which they are being given.',
  mode='TRANSFER', hinge='One is narrow and certain; the other is broad and probable')

# =========================================================================
# AL_FAM15_WEAKENING_EVIDENCE — D4, D5 x3
# =========================================================================
q('GB_AL_047', 'AL_FAM15_WEAKENING_EVIDENCE', 'D4',
  'An argument runs: "Our tutorial works, because students who completed it scored higher than '
  'those who did not." The scores quoted are accurate. Which further fact most undermines it?',
  'Students chose whether to complete the tutorial, and the more motivated ones did',
  ['A few students who completed it scored poorly',
   'The tutorial took longer than expected to write',
   'Another company\'s tutorial produced similar results'],
  'The argument needs the two groups to be comparable, and self-selection breaks exactly that, '
  'leaving the scores intact but the inference broken. A handful of poor scores is consistent '
  'with the claim, and the other facts touch nothing the argument rests on.',
  evidence='The scores quoted are accurate')

q('GB_AL_048', 'AL_FAM15_WEAKENING_EVIDENCE', 'D5',
  'An argument runs: "Response times improved after we added a second server, so the extra server '
  'is what did it." Which fact would most weaken it without contradicting the improvement?',
  'Traffic fell sharply in the same week for unrelated reasons',
  ['Response times are still slower than a competitor\'s',
   'The second server cost more than expected',
   'Response times improved by less than the team hoped'],
  'Weakening means removing the reason to believe the link, not denying the outcome. A drop in '
  'traffic explains the improvement without the server, while the other facts leave the causal '
  'story untouched and merely make it less pleasing.',
  mode='TRANSFER', hinge='Which fact would most weaken it without contradicting the improvement')

q('GB_AL_049', 'AL_FAM15_WEAKENING_EVIDENCE', 'D5',
  'Someone attacks an argument by showing its conclusion is false. Someone else attacks it by '
  'showing an assumption is unwarranted. What is the difference in what each establishes?',
  'The first shows the conclusion is wrong; the second shows the argument does not establish it, '
  'leaving the conclusion open',
  ['They establish the same thing by different routes',
   'The first is weaker, since a conclusion can be false by accident',
   'The second establishes that the conclusion is false'],
  'An argument can be bad and its conclusion still true, which is why undermining the reasoning '
  'settles less than refuting the claim. Confusing the two leads to treating a defeated argument '
  'as a refuted position.',
  mode='TRANSFER', hinge='Someone attacks an argument by showing its conclusion is false')

q('GB_AL_050', 'AL_FAM15_WEAKENING_EVIDENCE', 'D5',
  'An argument rests on one assumption. A critic can either dispute that assumption or gather '
  'evidence against the conclusion. Which is the more efficient line of attack, and when does the '
  'other become necessary?',
  'Disputing the assumption, since the whole argument depends on it; evidence against the '
  'conclusion is needed when the assumption turns out to hold',
  ['Gathering evidence, since evidence always outweighs argument',
   'Disputing the assumption, since an argument with a disputed assumption is refuted',
   'Neither; a single-assumption argument cannot be attacked'],
  'One assumption carrying an argument is its narrowest point, so pressing there costs least. But '
  'disputing an assumption only removes the support — if it holds after all, the conclusion is '
  'still standing and has to be met on its own terms.',
  mode='TRADEOFF', hinge='either dispute that assumption or gather evidence against the conclusion')
