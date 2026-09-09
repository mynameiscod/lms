# -*- coding: utf-8 -*-
"""
Wave 1 — PSEUDOCODE_FLOWCHARTS, 50 Golden Bank questions.

10 come from the existing bank (4 kept, 2 rewritten, 4 remapped from DEBUGGING) and 40 are new.

THE ONE PLACE A GAP IN A STEM IS LEGITIMATE. The brief forbids fill-in-the-blank definition
questions, and PF_FAM12 nonetheless presents an algorithm with a step missing. The blueprint draws
that line itself: a gap in an algorithm whose intended behaviour is stated has exactly one correct
filling and is recovered by reasoning about what the output would otherwise be. A blank in a
sentence is recovered by recognising a word. Nothing here blanks a sentence.

FRAMING KEEPS THIS SKILL APART FROM LOOPS_BASICS AND CONDITIONALS_BASICS. All three can trace a
loop or a branch, so these items work in pseudocode and flowchart terms — symbols, arrows, state
tables, the two forms of one algorithm — and use different values throughout. The cross-skill
similarity check covers all 350 for exactly this reason.
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
# PF_FAM01_SYMBOL_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_PF_001', 'PF_FAM01_SYMBOL_RECOGNITION', 'D1',
  'In a flowchart, which symbol represents reading a value typed in by the person using the '
  'program?',
  'The input/output symbol',
  ['The process symbol', 'The decision symbol', 'The terminator symbol'],
  'Bringing a value in from outside is input, and one symbol covers both bringing values in and '
  'reporting them out. A process symbol holds work done on values already present, and a '
  'terminator only marks where the algorithm starts and stops.')

q('GB_PF_002', 'PF_FAM01_SYMBOL_RECOGNITION', 'D1',
  'In a flowchart, which symbol represents working out a total from two values already held?',
  'The process symbol',
  ['The input/output symbol', 'The decision symbol', 'The terminator symbol'],
  'Calculation on values the algorithm already has is a process step. Nothing enters or leaves '
  'the algorithm here, and nothing is being chosen between.')

q('GB_PF_003', 'PF_FAM01_SYMBOL_RECOGNITION', 'D1',
  'How many arrows leave a decision symbol in a flowchart?',
  'One for each outcome, so at least two',
  ['Exactly one, like every other symbol',
   'None; a decision ends that path',
   'As many as there are variables being compared'],
  'A decision exists in order to send the flow one way or another, so it needs a route for each '
  'outcome. A symbol with a single exit could not change anything about what happens next.')

q('GB_PF_004', 'PF_FAM01_SYMBOL_RECOGNITION', 'D1',
  'A flowchart begins with a step that reads a mark from the keyboard. Which symbol is that step '
  'drawn in?',
  'The input/output symbol',
  ['The terminator symbol, because it is the first step',
   'The process symbol, because reading is something the algorithm does',
   'The decision symbol, because the mark will later be compared'],
  'What the step does decides the symbol, not where it sits or what happens to the value later. '
  'The terminator marks the start of the algorithm; the first step after it can be anything.')

q('GB_PF_005', 'PF_FAM01_SYMBOL_RECOGNITION', 'D2',
  'A flowchart step reports a computed average on screen. Which symbol is it drawn in, and why is '
  'that not the process symbol?',
  'The input/output symbol, because reporting a value sends it out of the algorithm',
  ['The process symbol, because computing the average was work',
   'The terminator symbol, because reporting is usually the last step',
   'The decision symbol, because a value is being examined'],
  'The computing and the reporting are two different steps, and only the first is a process. '
  'Reporting moves a value across the boundary of the algorithm, which is what the input/output '
  'symbol marks.')

# =========================================================================
# PF_FAM02_CONTROL_FLOW_READING — D2, D3
# =========================================================================
q('GB_PF_006', 'PF_FAM02_CONTROL_FLOW_READING', 'D2',
  'A flowchart has a decision with two arrows leaving it, one labelled Yes and one labelled No. '
  'For a given input, how many of those arrows are followed?',
  'One',
  ['Both, in the order they are drawn',
   'Neither, until the decision is reached a second time',
   'It depends on which arrow is drawn higher on the page'],
  'A decision has one outcome for any given input, so exactly one route is taken. Position on the '
  'page is a matter of drawing rather than of order.')

q('GB_PF_007', 'PF_FAM02_CONTROL_FLOW_READING', 'D3',
  'A flowchart runs step P, then step Q, then a decision. The No arrow from that decision leads '
  'back up to step Q. Which steps can run more than once?',
  'Q and the decision',
  ['Only Q', 'P, Q and the decision', 'None; a flowchart runs each step once'],
  'The arrow leads back to Q, so Q and everything after it up to the decision run again each time '
  'the answer is No. P is above the point the arrow returns to and is never revisited. Following '
  'the arrows rather than reading down the page is the whole measurement.')

# =========================================================================
# PF_FAM03_ASSIGNMENT_EFFECT — D2 x2 (1 legacy)
# =========================================================================
q('GB_PF_008', 'PF_FAM03_ASSIGNMENT_EFFECT', 'D2',
  'An algorithm reads: X = 10, then X = X + 3, then PRINT X. What is printed?',
  '13',
  ['10', '3', '30'],
  'The second step works out 10 plus 3 and stores 13 back in X, replacing the 10. Answering 10 '
  'treats the first step as fixing the value permanently.',
  provenance='LEGACY_KEEP', source='8266a3')

q('GB_PF_009', 'PF_FAM03_ASSIGNMENT_EFFECT', 'D2',
  'An algorithm reads: P = 4, then Q = 9, then P = Q, then Q = P. What do P and Q hold at the '
  'end?',
  'P holds 9 and Q holds 9',
  ['P holds 9 and Q holds 4', 'P holds 4 and Q holds 9', 'P holds 4 and Q holds 4'],
  'The third step overwrites P with 9, so the original 4 no longer exists anywhere; the fourth '
  'step then copies that same 9 back. Exchanging the two would need the first value stored '
  'somewhere before it is overwritten.')

# =========================================================================
# PF_FAM04_IO_STEP_EFFECT — D1 x3
# =========================================================================
q('GB_PF_010', 'PF_FAM04_IO_STEP_EFFECT', 'D1',
  'An algorithm contains the step READ age. What does that step do?',
  'Brings a value in from outside and stores it in age',
  ['Displays the value currently held in age',
   'Checks whether age holds a sensible value',
   'Sets age to zero ready for use'],
  'Reading takes a value from outside the algorithm and puts it somewhere. It neither displays '
  'anything nor examines what arrives.')

q('GB_PF_011', 'PF_FAM04_IO_STEP_EFFECT', 'D1',
  'An algorithm contains the step PRINT total. What does that step change?',
  'Nothing; it reports the value and leaves total as it was',
  ['It empties total, since the value has now been used',
   'It stores the reported text back into total',
   'It converts total into text for the rest of the algorithm'],
  'Reporting a value is a one-way step: it makes the value visible and alters nothing. The same '
  'variable can be reported repeatedly and still hold the same value.')

q('GB_PF_012', 'PF_FAM04_IO_STEP_EFFECT', 'D1',
  'Which pair of steps changes what a variable holds?',
  'READ mark changes mark; PRINT mark does not',
  ['PRINT mark changes mark; READ mark does not',
   'Both change mark',
   'Neither changes mark'],
  'Reading places a new value into the variable; reporting only looks at it. Confusing the two '
  'directions is what makes an algorithm appear to lose or gain values for no reason.')

# =========================================================================
# PF_FAM05_BRANCH_SELECTION — D2 x2 (1 legacy), D3 (legacy)
# =========================================================================
q('GB_PF_013', 'PF_FAM05_BRANCH_SELECTION', 'D2',
  'An algorithm reads: READ age; IF age >= 18 PRINT "Adult" ELSE PRINT "Minor". The age read is '
  '17. What is printed?',
  'Minor',
  ['Adult', 'Both Adult and Minor', 'Nothing, because 17 is below the threshold'],
  '17 fails the condition, so the else branch runs and the other is skipped entirely. Exactly one '
  'of the two branches runs, and one of them always does.',
  provenance='LEGACY_REWRITE', source='83a311')

q('GB_PF_014', 'PF_FAM05_BRANCH_SELECTION', 'D2',
  'An algorithm reads: IF score >= 50 PRINT "Pass" ELSE PRINT "Fail". The score is exactly 50. '
  'What is printed?',
  'Pass',
  ['Fail', 'Both Pass and Fail', 'Nothing, because 50 sits on the boundary'],
  'The condition includes equality, so a score exactly at the threshold satisfies it. A value on '
  'the boundary is always sent one way or the other, never left undecided.')

q('GB_PF_015', 'PF_FAM05_BRANCH_SELECTION', 'D3',
  'An algorithm reads: N = 6; IF N MOD 2 = 0 PRINT "Even" ELSE PRINT "Odd". What is printed?',
  'Even',
  ['Odd', 'Both Even and Odd', 'Nothing, because the remainder is zero'],
  'Dividing 6 by 2 leaves no remainder, so the condition holds and the first branch runs. A '
  'remainder of zero is what "even" means here, not a reason for the algorithm to stop.',
  provenance='LEGACY_REWRITE', source='7830d4')

# =========================================================================
# PF_FAM06_CONDITION_SELECTION — D3, D4   (boundary is the discriminator)
# =========================================================================
q('GB_PF_016', 'PF_FAM06_CONDITION_SELECTION', 'D3',
  'A rule states: a parcel is oversized when its length is more than 60 cm. Which condition '
  'implements it exactly?',
  'length > 60',
  ['length >= 60', 'length < 60', 'length >= 61'],
  '"More than" excludes the value itself, so a parcel of exactly 60 cm is not oversized. The '
  'inclusive form would flag it, and the version at 61 happens to agree for whole centimetres but '
  'not for a length measured more finely.')

q('GB_PF_017', 'PF_FAM06_CONDITION_SELECTION', 'D4',
  'A rule states: a reading is acceptable when it is at least 5 and no more than 20. An algorithm '
  'accepts 5, 12 and 20 correctly, and also accepts 21. Which condition was written?',
  'reading >= 5, with the upper limit never checked',
  ['reading >= 5 AND reading <= 20, which matches the rule',
   'reading > 5 AND reading <= 20, which is strict at the lower end',
   'reading >= 5 AND reading < 20, which is strict at the upper end'],
  'Accepting 5 shows the lower limit includes its boundary; accepting 20 shows the upper limit '
  'would include its own; accepting 21 shows there is no upper limit at all. A strict comparison '
  'at either end would have rejected 5 or 20.',
  evidence='An algorithm accepts 5, 12 and 20 correctly, and also accepts 21')

# =========================================================================
# PF_FAM07_ITERATION_COUNT — D2, D3, D4   (include a loop that never runs)
# =========================================================================
q('GB_PF_018', 'PF_FAM07_ITERATION_COUNT', 'D2',
  'An algorithm sets K = 1 and then repeats, while K <= 4, a body that increases K by 1. How many '
  'times does the body run?',
  '4',
  ['3', '5', 'Endlessly, because K is compared each time'],
  'The body runs with K holding 1, 2, 3 and 4, and stops when K reaches 5. The body itself is '
  'what makes the condition eventually fail.')

q('GB_PF_019', 'PF_FAM07_ITERATION_COUNT', 'D3',
  'An algorithm checks its condition before each pass, not after. It sets COUNT to 7 and then '
  'repeats, while COUNT < 5, a body that increases COUNT by 1. How many passes happen?',
  '0',
  ['1', '2', 'Endlessly, because K only grows'],
  'The condition is already false when it is first checked, so no pass happens at all. A loop is '
  'not guaranteed one pass, which is exactly what separates checking the condition first from '
  'checking it last.')

q('GB_PF_020', 'PF_FAM07_ITERATION_COUNT', 'D4',
  'An algorithm repeats a body while K <= 10, increasing K by 3 each time from a start of 1. '
  'Someone predicts 10 passes and the real number is smaller. How many are there?',
  '4',
  ['10, because the limit is 10', '3, because 10 divided by 3 leaves 3',
   '5, because K takes 1, 4, 7, 10 and 13'],
  'K takes 1, 4, 7 and 10, and the pass at 13 never happens because the condition is checked '
  'first. Predicting 10 counts the limit rather than the passes, and counting 13 as a pass adds '
  'one that the condition excludes.',
  evidence='Someone predicts 10 passes and the real number is smaller')

# =========================================================================
# PF_FAM08_COUNTER_ACCUMULATOR_ROLE — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_PF_021', 'PF_FAM08_COUNTER_ACCUMULATOR_ROLE', 'D2',
  'An algorithm reads: COUNT = 0; REPEAT 4 TIMES, COUNT = COUNT + 1; PRINT COUNT. What is '
  'printed?',
  '4',
  ['0', '1', '5'],
  'The variable rises by one on each of four passes, ending at 4. Starting it at 1 instead of 0 '
  'is what would give 5.',
  provenance='LEGACY_KEEP', source='857db6')

q('GB_PF_022', 'PF_FAM08_COUNTER_ACCUMULATOR_ROLE', 'D3',
  'An algorithm reads: TOTAL = 0; FOR i = 1 TO 3, TOTAL = TOTAL + i; PRINT TOTAL. What is '
  'printed?',
  '6',
  ['3', '9', '0'],
  'Each pass adds the current value of i, so the total becomes 1, then 3, then 6. Answering 3 '
  'reports the last value added rather than the accumulated result.',
  provenance='LEGACY_KEEP', source='844148')

q('GB_PF_023', 'PF_FAM08_COUNTER_ACCUMULATOR_ROLE', 'D4',
  'An algorithm keeps two variables while reading marks: one rises by 1 each time and one rises '
  'by the mark just read. For the marks 20, 30 and 40 it reports 3 and 90. Which is which, and '
  'what would an average require?',
  'Three is the count and ninety the accumulated total; the average is the total divided by the '
  'count',
  ['Three is the total and ninety the count; the average is the count divided by the total',
   'Both are counts, and an average needs a third variable',
   'Both are totals, and the average is their difference'],
  'A variable rising by a fixed step counts occurrences; one rising by the value read builds a '
  'sum. The two numbers reported make it unmistakable: three marks were read and they add to '
  'ninety.',
  evidence='For the marks 20, 30 and 40 it reports 3 and 90')

# =========================================================================
# PF_FAM09_OUTPUT_PREDICTION — D2 (legacy), D3 x2, D4
# =========================================================================
q('GB_PF_024', 'PF_FAM09_OUTPUT_PREDICTION', 'D2',
  'An algorithm reads: READ A; READ B; C = A + B; PRINT C. With A as 8 and B as 5, what is '
  'printed?',
  '13',
  ['8', '5', '40'],
  'The third step works out the sum, 13, and stores it in C, which the fourth step then reports. '
  'Answering 40 multiplies where the algorithm adds.',
  provenance='LEGACY_KEEP', source='81c86c')

q('GB_PF_025', 'PF_FAM09_OUTPUT_PREDICTION', 'D3',
  'An algorithm reads: T = 0; FOR i = 1 TO 4, T = T + i, PRINT T. The report is inside the '
  'repeated part. What is printed?',
  '1 3 6 10',
  ['10', '1 2 3 4', '0 1 3 6'],
  'Reporting inside the repetition shows the running total after each addition, so the four lines '
  '1 3 6 10 appear rather than a single figure. Answering 10 assumes the report sits after the '
  'repetition; the others report the values added, or the total before each addition.')

q('GB_PF_026', 'PF_FAM09_OUTPUT_PREDICTION', 'D3',
  'An algorithm reads: X = 20; WHILE X > 5, X = X - 6; PRINT X. What is printed?',
  '2',
  ['5', '-4', '8'],
  'X takes 14, then 8, then 2, at which point the condition fails and the report happens. '
  'Answering 8 stops one pass early, and -4 runs one pass too many.')

q('GB_PF_027', 'PF_FAM09_OUTPUT_PREDICTION', 'D4',
  'An algorithm is meant to report the total of the marks 5, 9 and 6, and it reports 6. It runs '
  'without failing, the marks are read correctly, and the addition step is correct. Which step is '
  'misplaced?',
  'The step setting the total to zero, which sits inside the repetition',
  ['The addition step, which sits after the report',
   'The report step, which sits inside the repetition',
   'The step reading the marks, which sits after the addition'],
  'Reporting the last mark rather than the sum is what a total reset on every pass produces. A '
  'report inside the repetition would produce three lines rather than one, and reading after '
  'adding would fail rather than report a plausible number.',
  evidence='the marks are read correctly, and the addition step is correct')

# =========================================================================
# PF_FAM10_STATE_TABLE_TRACE — D3, D4   (a middle iteration, not the last)
# =========================================================================
q('GB_PF_028', 'PF_FAM10_STATE_TABLE_TRACE', 'D3',
  'An algorithm sets S = 0 and N = 1, then repeats four times: S = S + N, then N = N + 2. What '
  'does S hold immediately after the second pass finishes?',
  '4',
  ['1', '9', '3'],
  'The first pass adds 1 and leaves N at 3; the second adds that 3, so S holds 4. Answering 9 '
  'reads a later pass, and 3 reports N rather than S at that point.')

q('GB_PF_029', 'PF_FAM10_STATE_TABLE_TRACE', 'D4',
  'The same algorithm — S = 0, N = 1, repeating S = S + N then N = N + 2 — is being traced. '
  'Someone writes down that after the third pass S holds 9 and N holds 5. One of those two is '
  'wrong. Which, and what should it be?',
  'N is wrong; after the third pass it holds 7, because it is increased once per pass',
  ['S is wrong; it holds 6 after the third pass',
   'S is wrong; it holds 12 after the third pass',
   'Both are wrong; S holds 6 and N holds 7'],
  'The three passes add 1, 3 and 5, so S does reach 9; N starts at 1 and is increased three times '
  'by 2, reaching 7. Writing 5 for N reports its value one pass earlier, which is the commonest '
  'slip when the update comes after the use.',
  evidence='Someone writes down that after the third pass S holds 9 and N holds 5')

# =========================================================================
# PF_FAM11_FORM_TRANSLATION — D3, D4
# =========================================================================
q('GB_PF_030', 'PF_FAM11_FORM_TRANSLATION', 'D3',
  'A flowchart has a decision on x > 0 whose Yes arrow reaches a step printing "up" and whose No '
  'arrow reaches a step printing "down", after which both rejoin. Which pseudocode behaves '
  'identically?',
  'IF x > 0 PRINT "up" ELSE PRINT "down"',
  ['IF x > 0 PRINT "down" ELSE PRINT "up"',
   'IF x > 0 PRINT "up"; PRINT "down"',
   'IF x > 0 PRINT "up" ELSE IF x < 0 PRINT "down"'],
  'The Yes route carries the branch taken when the condition holds, and the two routes rejoin, '
  'which is exactly an if with an else. The third option prints "down" every time, and the fourth '
  'leaves zero handled by neither branch.')

q('GB_PF_031', 'PF_FAM11_FORM_TRANSLATION', 'D4',
  'Two flowcharts both repeat a step while a condition holds. In one, the decision comes before '
  'the step; in the other, after it. They behave the same on every input tried. On what input do '
  'they differ?',
  'An input for which the condition is false from the start; one runs the step zero times and the '
  'other once',
  ['An input for which the condition never becomes false',
   'An input for which the condition becomes false on the last pass',
   'They never differ; the two forms are interchangeable'],
  'Once the loop runs at least once, checking before or after gives the same passes. The only '
  'separating case is the one where it should not run at all, and checking afterwards guarantees '
  'a pass that was not wanted.',
  evidence='They behave the same on every input tried')

# =========================================================================
# PF_FAM12_MISSING_STEP_SELECTION — D3 (legacy), D4, D5 x3
# =========================================================================
q('GB_PF_032', 'PF_FAM12_MISSING_STEP_SELECTION', 'D3',
  'An algorithm is meant to report the larger of two values A and B, but it reports A every time. '
  'Which step is missing?',
  'A comparison of A with B, choosing which to report',
  ['A step printing both A and B',
   'A step reading a third value',
   'A step adding A and B together'],
  'Reporting A regardless of B means nothing ever examines B, so what is absent is the comparison '
  'that would let B win. Printing both would answer a different question, and adding them answers '
  'none.',
  provenance='LEGACY_REMAP', source='eaca0e')

q('GB_PF_033', 'PF_FAM12_MISSING_STEP_SELECTION', 'D4',
  'An algorithm counts how many marks are at least 40. It reads each mark and compares it, but '
  'reports 0 every time, even on data with many high marks. The comparison itself is correct. '
  'What step is missing?',
  'A step increasing the counter when the comparison succeeds',
  ['A step setting the counter to zero before the repetition',
   'A step reporting the counter after the repetition',
   'A step reading the next mark on each pass'],
  'Reporting 0 rather than failing shows the counter exists and is reported, so it was set up and '
  'shown; the comparison is stated to be right. What is left is that nothing acts on the '
  'comparison\'s result.',
  evidence='reports 0 every time, even on data with many high marks')

q('GB_PF_034', 'PF_FAM12_MISSING_STEP_SELECTION', 'D5',
  'An algorithm reports an average and is missing exactly one step. It correctly totals the '
  'values and correctly counts them, and reports the total instead of the average. Where must the '
  'missing step go, and why does its position matter?',
  'A division of the total by the count, placed after the repetition — inside it, the division '
  'would use a partial count',
  ['A division of the total by the count, placed inside the repetition so it stays current',
   'A division of the count by the total, placed after the repetition',
   'A second counter, placed before the repetition'],
  'The missing work is the division, and where it goes changes the answer rather than merely the '
  'tidiness: run on each pass it would divide by however many values had been seen so far. '
  'Choosing the step and choosing its position are one decision.',
  mode='TRANSFER', hinge='reports the total instead of the average')

q('GB_PF_035', 'PF_FAM12_MISSING_STEP_SELECTION', 'D5',
  'An algorithm searching a list for a value reports "not found" correctly, and reports "found" '
  'correctly, but continues examining every remaining item after a match. One step would stop '
  'that. What does adding it change, and what does it not?',
  'It changes how much work is done and nothing about the answer, since no later item can '
  'contradict a match',
  ['It changes the answer, since later matches would otherwise overwrite the first',
   'It changes nothing at all, since the remaining items are examined either way',
   'It changes the answer for lists containing the value more than once'],
  'The result is already correct, so the step cannot improve it; what it saves is the examination '
  'of items whose outcome cannot matter. Recognising that a result is already settled is what '
  'makes early exit safe here.',
  mode='TRADEOFF', hinge='continues examining every remaining item after a match')

q('GB_PF_036', 'PF_FAM12_MISSING_STEP_SELECTION', 'D5',
  'An algorithm finds the largest of a list. It is missing the step that sets the running largest '
  'before the repetition begins. Two fillings are proposed: set it to zero, or set it to the '
  'first item. Are they equivalent?',
  'No; zero is wrong whenever every value is negative, while the first item is always a real '
  'member of the list',
  ['Yes; both give the right answer on any list',
   'No; the first item is wrong when the list has one item',
   'No; zero is wrong only when the list is empty'],
  'Both work on data containing something positive, which is why the difference hides. A starting '
  'value taken from the data cannot be beaten by the data being wrong, whereas an invented zero '
  'quietly wins against every negative reading.',
  mode='EDGE', hinge='set it to zero, or set it to the first item')

# =========================================================================
# PF_FAM13_LOGIC_ERROR_DIAGNOSIS — D4 (legacy), D5 x4 (2 legacy)
# =========================================================================
q('GB_PF_037', 'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'D4',
  'An algorithm reads A and B, sets C to A - B, and reports C. It is meant to report their sum. '
  'For A as 9 and B as 4 it reports 5, and it does not fail. Which step is at fault?',
  'The step computing C, which subtracts where it should add',
  ['The report step, which shows the wrong variable',
   'The two reading steps, which took the values in the wrong order',
   'None; 5 is the correct result for those values'],
  'The algorithm runs and produces a number, so nothing is malformed; 5 is exactly 9 minus 4, '
  'which identifies the arithmetic rather than the reading or reporting. Swapping the reads would '
  'give -5, not 5.',
  provenance='LEGACY_REMAP', source='f69514',
  evidence='For A as 9 and B as 4 it reports 5, and it does not fail')

q('GB_PF_038', 'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'D5',
  'An algorithm averages three numbers by adding them and dividing by 2. For 3, 4 and 5 it '
  'reports 6 instead of 4. The addition is correct. Which statement about the fix is right?',
  'Divide by 3 rather than 2; the reported value is always half as large again as it should be, '
  'for every input',
  ['Divide by 3 rather than 2; the fault shows only for numbers that do not divide evenly',
   'Multiply by 3 rather than dividing, since dividing was the wrong operation',
   'Add a fourth number, so that dividing by 2 becomes correct'],
  'Dividing by 2 instead of 3 scales every answer by the same factor, so no input escapes it — '
  'the fault is systematic rather than occasional. That distinction matters: a fault present on '
  'all inputs would have been caught by any single test.',
  provenance='LEGACY_REMAP', source='eb6845',
  mode='TRANSFER', hinge='adding them and dividing by 2')

q('GB_PF_039', 'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'D5',
  'An algorithm reports whether a number is even by testing whether the remainder on division by '
  '3 is zero. On which values does it happen to give the right answer, and what does that show?',
  'On multiples of 6, and on values divisible by neither 2 nor 3 — about half of all values, '
  'which is enough to look plausible',
  ['On every value, since both 2 and 3 test divisibility',
   'On multiples of 3 only',
   'On no value at all, since the wrong divisor is used'],
  'The two tests agree when a number is divisible by both or by neither, which covers roughly '
  'half the whole numbers. A fault that is right half the time survives casual checking far '
  'better than one that is always wrong.',
  provenance='LEGACY_REMAP', source='ec067c',
  mode='TRANSFER', hinge='testing whether the remainder on division by 3 is zero')

q('GB_PF_040', 'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'D5',
  'An algorithm reports a running total after each pass but updates the total after reporting it. '
  'The final line of output is always one value short of the true total. Which change fixes it, '
  'and what else does that change?',
  'Move the update above the report; every reported line shifts by one as well, not only the last',
  ['Add the missing value once after the repetition ends; nothing else changes',
   'Report the total again after the repetition; the earlier lines stay wrong',
   'Start the total at the first value instead of zero; nothing else changes'],
  'Reporting before updating means every line lags by one pass, so the last line is merely the '
  'most visible symptom. Patching the final value leaves all the earlier lines wrong, which is '
  'the difference between fixing a fault and hiding it.',
  mode='TRANSFER', hinge='updates the total after reporting it')

q('GB_PF_041', 'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'D5',
  'One algorithm stops with an error on bad input; another runs to the end and reports a wrong '
  'number. Both are equally wrong. Which is worse to have in a report generated overnight, and '
  'why?',
  'The one that reports a wrong number, because nothing marks the output as untrustworthy',
  ['The one that stops, because no report is produced at all',
   'They are equally bad, since both are incorrect',
   'The one that reports a wrong number, because it is harder to locate in the algorithm'],
  'A failure announces itself and whoever reads the log knows to look. A plausible wrong number '
  'arrives looking exactly like a right one, is acted on, and may never be questioned. Being hard '
  'to locate is a separate matter from being hard to notice.',
  mode='TRADEOFF', hinge='another runs to the end and reports a wrong number')

# =========================================================================
# PF_FAM14_EDGE_CASE_TRACE — D4 x2, D5 x3
# =========================================================================
q('GB_PF_042', 'PF_FAM14_EDGE_CASE_TRACE', 'D4',
  'An algorithm totals a list and reports the total. Given a list with no items it reports 0 and '
  'does not fail. Given the same empty list, a companion algorithm that averages the values does '
  'fail. What accounts for the difference?',
  'Totalling nothing leaves the total at its starting value; averaging then divides that by a '
  'count of zero',
  ['The totalling algorithm ran once on the empty list and read nothing',
   'The averaging algorithm cannot take the length of an empty list',
   'The two were given different lists despite appearances'],
  'Both repetitions run zero times, so both totals stay at zero; only one of them then divides. '
  'An empty list has a perfectly well defined length, and its being zero is the whole problem.',
  evidence='Given a list with no items it reports 0 and does not fail')

q('GB_PF_043', 'PF_FAM14_EDGE_CASE_TRACE', 'D4',
  'An algorithm reports the largest reading. It has been correct for years. Given a day\'s data '
  'in which every reading is below zero it reports 0, without failing and without any reading of '
  '0 being present. What does that show?',
  'The running largest was started at zero, and no negative reading could beat it',
  ['The repetition ran zero times, so nothing was examined',
   'The comparison is reversed and it is reporting the smallest',
   'Negative readings cannot be compared with each other'],
  'A value appears that is not in the data, so it came from the algorithm rather than the '
  'readings — which is the signature of an invented starting value. The comparison itself works '
  'fine; nothing simply ever beat zero.',
  evidence='every reading is below zero it reports 0, without failing and without any reading of '
           '0 being present')

q('GB_PF_044', 'PF_FAM14_EDGE_CASE_TRACE', 'D5',
  'An algorithm reports the largest reading, starting from the first item and comparing the rest. '
  'What does it do on a list holding exactly one item?',
  'It reports that item, having made no comparisons at all',
  ['It fails, because there is nothing to compare against',
   'It reports zero, since no comparison succeeded',
   'It reports the item twice, once as the start and once as the result'],
  'The starting value is already a real member of the list, and a list of one leaves nothing to '
  'compare it with — so the answer is right with no work done. Single-item input is where an '
  'algorithm often succeeds for a reason it will not repeat.',
  mode='EDGE', hinge='on a list holding exactly one item')

q('GB_PF_045', 'PF_FAM14_EDGE_CASE_TRACE', 'D5',
  'An algorithm reports how many readings exceed a threshold. On a list with no items it reports '
  '0. Is a guard against the empty case needed?',
  'No; the repetition runs zero times and the counter keeps the zero it was given, which is the '
  'right answer',
  ['Yes; without one the algorithm reports a value it never computed',
   'Yes; a counter that is never increased holds nothing rather than zero',
   'No, but only because the threshold happens not to be used'],
  'The counter was set before the repetition and nothing changed it, so zero is both what it '
  'holds and what is correct: none of nothing exceeds anything. Adding a guard would be extra '
  'code that can itself be wrong.',
  mode='EDGE', hinge='On a list with no items it reports 0')

q('GB_PF_046', 'PF_FAM14_EDGE_CASE_TRACE', 'D5',
  'An algorithm is to run unattended each night on data that is usually present and occasionally '
  'absent. One version stops when the data is empty; another reports zero and carries on. Which '
  'is preferable, and what does the choice cost?',
  'Reporting the emptiness explicitly and carrying on, because an empty night is expected — a '
  'bare zero is indistinguishable from a real result',
  ['Stopping, because failing loudly always beats continuing',
   'Reporting zero silently, because a nightly run must never stop',
   'Either; an empty night produces no useful output whichever is chosen'],
  'An input the program is expected to meet is not an error, so stopping turns an ordinary night '
  'into an incident. But zero is a value that could genuinely have been measured, so reporting it '
  'without saying the data was absent loses the very thing the reader needs to know.',
  mode='TRADEOFF', hinge='data that is usually present and occasionally absent')

# =========================================================================
# PF_FAM15_VARIABLE_ROLE_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_PF_047', 'PF_FAM15_VARIABLE_ROLE_RECOGNITION', 'D1',
  'Inside a repetition, a variable is updated by the step C = C + 1. What job is C doing?',
  'Counting how many times something happened',
  ['Building up a total of the values being read',
   'Holding the value most recently read',
   'Deciding when the repetition should stop'],
  'A fixed step of one, regardless of the data, records occurrences rather than amounts. What is '
  'added is the whole distinction between the two jobs.')

q('GB_PF_048', 'PF_FAM15_VARIABLE_ROLE_RECOGNITION', 'D1',
  'Inside a repetition, a variable is updated by the step T = T + mark. What job is T doing?',
  'Building up a running total of the values read',
  ['Counting how many marks were read',
   'Holding the largest mark seen so far',
   'Holding the mark most recently read'],
  'What is added is the value just read, so the variable grows by the data rather than by a fixed '
  'step. Adding one each time would count instead.')

q('GB_PF_049', 'PF_FAM15_VARIABLE_ROLE_RECOGNITION', 'D1',
  'Two variables are updated inside the same repetition: one by adding 1, the other by adding the '
  'value just read. What is the difference in their jobs?',
  'The first counts occurrences; the second accumulates amounts',
  ['The first accumulates amounts; the second counts occurrences',
   'Both count, but at different speeds',
   'Both accumulate, but one starts from a different value'],
  'Adding a fixed step counts, and adding the data accumulates. The two are often needed together '
  '— an average requires exactly one of each — which is why telling them apart matters.')

q('GB_PF_050', 'PF_FAM15_VARIABLE_ROLE_RECOGNITION', 'D2',
  'A variable inside a repetition is updated by the step S = S + 2. Is it counting or '
  'accumulating?',
  'Counting, in twos: the step is fixed and owes nothing to the data',
  ['Accumulating, because the amount added is more than one',
   'Accumulating, because the value grows faster than the number of passes',
   'Neither; a step of 2 is not a recognised update'],
  'What decides the job is whether the step depends on the data, not how large it is. A fixed '
  'step of two still records how many passes happened, just scaled — the values read never affect '
  'it.')
