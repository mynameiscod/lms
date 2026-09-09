# -*- coding: utf-8 -*-
"""
Wave 1 — LOOPS_BASICS, 50 Golden Bank questions.

12 come from the existing bank (4 kept, 1 rewritten, 7 remapped from other skills) and 38 are new.

THE FOUR LEGACY KEEPS ARE USED AS THEY STAND. Unusually for this bank, all four are numeric traces
whose wrong options are genuine slips — one iteration too many, one too few, the last value rather
than the total — so there was nothing to repair.

SEVEN REMAPS ARRIVE FROM PROGRAMMING_FUNDAMENTALS AND DEBUGGING, AND SIX OF THEM NEEDED THEIR
OPTIONS REBUILT. They came with distractors like "It becomes a database" and "Need more RAM",
which leave two real choices out of four. Each now carries what the blueprint names instead: a
loop believed to stop on its own, an update sitting inside a branch that never runs, a body
assumed to run once.

TWO OF THOSE REMAPS ARE DEEPENED RATHER THAN REPAIRED. f7334b asked what "may happen" if a
condition never becomes false, which is answerable from the words alone; it is rebuilt around a
loop that hangs for some inputs and not others, so the reasoning is what locates the branch.
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
# LP_FAM01_LOOP_PURPOSE — D1 x4, D2 x1 (legacy)
# =========================================================================
q('GB_LP_001', 'LP_FAM01_LOOP_PURPOSE', 'D1',
  'A program must display the same message once for each of forty records. Which approach fits?',
  'A loop whose body displays the message, repeated once per record',
  ['Forty display statements written out one after another',
   'One conditional that examines all forty records at once',
   'A single display statement, since a loop runs its body once'],
  'Repetition of the same work is exactly what a loop replaces. Writing the statement out forty '
  'times gives the same output and has to be edited forty times over, and a conditional chooses '
  'between paths rather than repeating anything.')

q('GB_LP_002', 'LP_FAM01_LOOP_PURPOSE', 'D1',
  'Which of these tasks does not need a loop?',
  'Swapping the values held by two variables',
  ['Adding up every value in a list',
   'Displaying each character of a word in turn',
   'Asking for input until a valid answer is given'],
  'A swap is a fixed, short sequence of distinct steps, so nothing repeats. The other three each '
  'apply the same step to item after item, or repeat until something becomes true.')

q('GB_LP_003', 'LP_FAM01_LOOP_PURPOSE', 'D1',
  'How many times does the body of a loop run?',
  'As many times as the loop\'s condition or count allows, which may be none',
  ['Exactly once, like any other block of code',
   'Exactly twice, since repeating means doing something again',
   'Endlessly, unless something stops it from outside'],
  'The count is decided by the loop itself, and there is nothing special about one or two. A loop '
  'whose condition is false at the start runs its body zero times, which is a perfectly ordinary '
  'outcome rather than a fault.')

q('GB_LP_004', 'LP_FAM01_LOOP_PURPOSE', 'D1',
  'A program repeats one instruction six times. What is the advantage of writing that as a loop '
  'rather than six copies?',
  'The instruction exists once, so changing it changes every repetition',
  ['The loop runs faster than six separate copies would',
   'Six copies would not be allowed by the language',
   'The loop uses less storage on the disk'],
  'Six copies behave identically; what differs is that each would have to be found and edited '
  'separately, and one missed copy is a bug. Speed and legality are not what separates them.')

q('GB_LP_005', 'LP_FAM01_LOOP_PURPOSE', 'D2',
  'A program must examine every mark in a list, however many marks there are. Which general '
  'strategy fits?',
  'Repeat the same examination once for each mark in turn',
  ['Examine only the first mark, since the rest follow the same pattern',
   'Examine all the marks together in a single comparison',
   'Write out one examination for each mark, once the number of marks is known'],
  'The number of marks is not fixed in advance, so the code cannot name them individually; a loop '
  'applies one examination to each in turn regardless of how many arrive. Checking only the first '
  'examines one mark, not every mark.',
  provenance='LEGACY_REMAP', source='656fd8')

# =========================================================================
# LP_FAM02_RANGE_VALUES — D1 x3, D2 x1   (inclusion of the end is the whole measurement)
# =========================================================================
q('GB_LP_006', 'LP_FAM02_RANGE_VALUES', 'D1',
  'Which values does range(5) produce?',
  '0, 1, 2, 3, 4',
  ['1, 2, 3, 4, 5', '0, 1, 2, 3, 4, 5', '1, 2, 3, 4'],
  'Counting starts at 0 and stops before the number given, so five values appear and 5 itself is '
  'not among them. The count is right; it is where the counting starts and stops that has to be '
  'read carefully.')

q('GB_LP_007', 'LP_FAM02_RANGE_VALUES', 'D1',
  'How many values does range(8) produce?',
  '8',
  ['7', '9', 'It depends on where the loop starts'],
  'Starting at 0 and stopping before 8 gives 0 up to 7, which is eight values. The number given '
  'is the count of values, even though it is never itself one of them.')

q('GB_LP_008', 'LP_FAM02_RANGE_VALUES', 'D1',
  'A loop is written as for i in range(2, 6). Which of these values does i never take?',
  '6',
  ['2', '3', '5'],
  'Counting begins at the first number and is included; it stops at the second, which is not. So '
  'i takes 2, 3, 4 and 5, and never 6. That asymmetry makes the count the difference between the '
  'two numbers.')

q('GB_LP_009', 'LP_FAM02_RANGE_VALUES', 'D2',
  'A loop should visit the whole numbers 1 to 10 inclusive. Which range does that?',
  'range(1, 11)',
  ['range(1, 10)', 'range(0, 10)', 'range(10)'],
  'To include 10 the stopping point has to be one beyond it. Stopping at 10 leaves it out, and '
  'the two forms beginning at 0 shift every value down by one.')

# =========================================================================
# LP_FAM03_LOOP_KIND_SELECTION — D1 x3, D2 x1
# =========================================================================
q('GB_LP_010', 'LP_FAM03_LOOP_KIND_SELECTION', 'D1',
  'A program must display a message exactly twelve times. Which loop form fits?',
  'A counted loop, because the number of repetitions is known in advance',
  ['A conditional loop, because every loop repeats until something changes',
   'Either, since the two forms are interchangeable in all cases',
   'Neither; a fixed number of repetitions needs no loop'],
  'A count that is known before the loop starts is exactly what a counted loop expresses. A '
  'conditional loop could be made to do it, but only by counting by hand, which is the counted '
  'loop written out the long way.')

q('GB_LP_011', 'LP_FAM03_LOOP_KIND_SELECTION', 'D1',
  'A program must keep asking for a password until the right one is typed. Which loop form fits?',
  'A conditional loop, because the number of attempts is not known in advance',
  ['A counted loop set to three attempts, since that is the usual limit',
   'A counted loop, because each attempt is one repetition',
   'Neither; input cannot be repeated'],
  'Nothing before the loop can say how many attempts there will be, so the repetition has to be '
  'governed by whether the password matched. Fixing a count invents a limit the requirement '
  'never stated.')

q('GB_LP_012', 'LP_FAM03_LOOP_KIND_SELECTION', 'D1',
  'What decides whether a counted loop or a conditional loop suits a task?',
  'Whether the number of repetitions is known before the loop begins',
  ['Whether the body of the loop is long or short',
   'Whether the values being processed are numbers or text',
   'Whether the program is meant to be fast or easy to read'],
  'The distinction is about what governs the repetition: a known count, or a condition that must '
  'become false. Nothing about the size of the body or the type of the data bears on it.')

q('GB_LP_013', 'LP_FAM03_LOOP_KIND_SELECTION', 'D2',
  'A program must read values from a file until it reaches the end, and nobody knows in advance '
  'how many values the file holds. Which loop form fits, and why?',
  'A conditional loop, because the stopping point is discovered while reading rather than known '
  'beforehand',
  ['A counted loop, using the size of the file in bytes as the count',
   'A counted loop, because reading a file is a fixed sequence of steps',
   'Either, because the file has a definite length even if nobody knows it'],
  'What matters is whether the count is available to the code before it starts, not whether one '
  'exists in principle. The number of values is only learned by reading, so the condition has to '
  'be checked as the loop runs.')

# =========================================================================
# LP_FAM04_ITERATION_COUNT — D2 x2 (1 legacy), D3
# =========================================================================
q('GB_LP_014', 'LP_FAM04_ITERATION_COUNT', 'D2',
  'A fragment reads: REPEAT 5 TIMES PRINT "Hi". How many times is Hi printed?',
  '5',
  ['1', '4', '6'],
  'The count states the number of repetitions directly, so the body runs five times and prints '
  'five lines. Answers of four and six are the two ways of being one out.',
  provenance='LEGACY_KEEP', source='f37e01')

q('GB_LP_015', 'LP_FAM04_ITERATION_COUNT', 'D2',
  'How many times does the body run in a loop written as for i in range(3, 9)?',
  '6',
  ['7', '5', '9'],
  'Counting from 3 and stopping before 9 covers 3, 4, 5, 6, 7 and 8, which is the difference '
  'between the two numbers. Including the stopping point would give seven.')

q('GB_LP_016', 'LP_FAM04_ITERATION_COUNT', 'D3',
  'A loop is written as for i in range(1, 10, 3), so it advances in steps rather than singly. Its '
  'body runs fewer times than the gap between the two bounds suggests. How many times does it '
  'run?',
  '3',
  ['4', '9', '10'],
  'Stepping by 3 from 1 gives 1, 4 and 7, so the body runs 3 times; the following value would be '
  '10, which is not below the stopping point. Once a step is involved the count is no longer the '
  'gap between the bounds, which is where a fourth pass is wrongly imagined.')

# =========================================================================
# LP_FAM05_LOOP_VARIABLE_TRACE — D2 x2 (1 legacy), D3
# =========================================================================
q('GB_LP_017', 'LP_FAM05_LOOP_VARIABLE_TRACE', 'D2',
  'A fragment reads: FOR i = 1 TO 3, PRINT i. What sequence is printed?',
  '1 2 3',
  ['0 1 2', '1 2 3 4', '3 2 1'],
  'The loop variable takes each value from the start to the end in turn, and printing it each '
  'time reports them in that order. Nothing here counts from zero or runs backwards.',
  provenance='LEGACY_KEEP', source='ef2a80')

q('GB_LP_018', 'LP_FAM05_LOOP_VARIABLE_TRACE', 'D2',
  'A loop runs for i in range(4). What value does i hold during the third pass through the body?',
  '2',
  ['3', '4', '1'],
  'The values are 0, 1, 2 and 3, so the third of them is 2. Counting the passes from one while '
  'the values count from zero is what makes this worth checking.')

q('GB_LP_019', 'LP_FAM05_LOOP_VARIABLE_TRACE', 'D3',
  'A loop runs for i in range(1, 5) and a line after the loop displays i. What is displayed?',
  '4',
  ['5', '1', 'Nothing, because i does not exist after the loop'],
  'The last value the loop variable took was 4, since counting stopped before 5, and it still '
  'holds that value once the loop is finished. The stopping point is never taken, so it is never '
  'what remains.')

# =========================================================================
# LP_FAM06_ACCUMULATOR_RESULT — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_LP_020', 'LP_FAM06_ACCUMULATOR_RESULT', 'D2',
  'A running total starts at 0 and has 2 added to it four times. What is the total at the end?',
  '8',
  ['2', '4', '6'],
  'Four additions of 2 accumulate to 8. Answering 2 is what happens if the total is reset each '
  'time round, so only the last addition survives, and the other answers stop one or two '
  'additions short.',
  provenance='LEGACY_REMAP', source='674a7d')

q('GB_LP_021', 'LP_FAM06_ACCUMULATOR_RESULT', 'D3',
  'A fragment reads: TOTAL = 0, then FOR i = 1 TO 4, TOTAL = TOTAL + i. What is the final total?',
  '10',
  ['4', '6', '16'],
  'The values 1, 2, 3 and 4 accumulate to 10. Answering 4 reports the last value added rather '
  'than the total, and 6 stops one pass early.',
  provenance='LEGACY_KEEP', source='f2dfca')

q('GB_LP_022', 'LP_FAM06_ACCUMULATOR_RESULT', 'D4',
  'A fragment totals the values 3, 8 and 5, and displays 5. The list is correct and the addition '
  'line is correct. What is wrong?',
  'The total is set to zero inside the loop, so each pass discards what came before',
  ['The loop stops one pass early, missing the first two values',
   'The values are being joined as text rather than added',
   'The total is displayed inside the loop rather than after it'],
  'Displaying the last value rather than the sum is the signature of a total reset every time '
  'round. Stopping early would give a partial sum rather than the final value, and joining as '
  'text would show all three digits.',
  evidence='The list is correct and the addition line is correct')

# =========================================================================
# LP_FAM07_COUNTER_RESULT — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_LP_023', 'LP_FAM07_COUNTER_RESULT', 'D2',
  'A counter starts at 0 and increases by 1 once for each of five records. What does it hold at '
  'the end?',
  '5',
  ['0', '1', '6'],
  'One increase per record, over five records, leaves the counter at 5. Starting the counter at 1 '
  'instead of 0 is what produces 6.',
  provenance='LEGACY_REMAP', source='64d1a1')

q('GB_LP_024', 'LP_FAM07_COUNTER_RESULT', 'D3',
  'A fragment reads: COUNT = 1, then REPEAT 3 TIMES, COUNT = COUNT + 2. What is the final value '
  'of COUNT?',
  '7',
  ['3', '5', '9'],
  'Three increases of 2 from a starting value of 1 give 3, then 5, then 7. Answering 5 stops one '
  'pass early and 9 adds one pass too many.',
  provenance='LEGACY_KEEP', source='efc8b7')

q('GB_LP_025', 'LP_FAM07_COUNTER_RESULT', 'D4',
  'A loop over the values 4, 9, 2 and 7 keeps a counter and a running total, adding to both only '
  'when a value exceeds 3. It reports an average of 20. The list and the comparison are both '
  'correct. What is wrong?',
  'The total is being divided by the wrong thing, or not divided at all; 20 is the total of the '
  'matching values',
  ['The counter is counting values that do not match',
   'The comparison should have been at least 3 rather than more than 3',
   'The total is accumulating the counter rather than the values'],
  '4, 9 and 7 exceed 3 and add to 20, and 20 is exactly what was reported, so the summing is '
  'right and the dividing is what is missing. A counter fault would change the divisor rather '
  'than produce the raw total, and the comparison already includes every value above 3.',
  evidence='The list and the comparison are both correct')

# =========================================================================
# LP_FAM08_TERMINATION_REASONING — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_LP_026', 'LP_FAM08_TERMINATION_REASONING', 'D2',
  'A loop repeats while a condition holds, and nothing in its body changes anything that '
  'condition tests. What follows?',
  'It never stops, because the condition can never become false',
  ['It stops after a fixed number of turns anyway',
   'It runs its body once and then stops',
   'It stops the second time the condition is checked'],
  'A conditional loop ends only when the condition becomes false, and only the body can make that '
  'happen. Nothing counts the turns on the loop\'s behalf or intervenes after a while.',
  provenance='LEGACY_REMAP', source='660e0f')

q('GB_LP_027', 'LP_FAM08_TERMINATION_REASONING', 'D3',
  'A loop repeats until a typed password matches. Inside the body the password is read again only '
  'when a separate check succeeds, and on some runs that check never succeeds. What happens on '
  'those runs?',
  'It never stops, because the only line that could change the condition is not reached',
  ['It stops, because the condition is tested again each time round',
   'It stops after the body has run once',
   'It fails with an error once the body has repeated too many times'],
  'Testing the condition repeatedly achieves nothing if what it tests never changes, and here the '
  'line that would change it sits behind a check that never passes. Nothing counts repetitions or '
  'intervenes.',
  provenance='LEGACY_REMAP', source='64336a')

q('GB_LP_028', 'LP_FAM08_TERMINATION_REASONING', 'D4',
  'A loop repeats while a balance is above zero and subtracts a fee each time round. For most '
  'starting balances it ends, but for one it runs endlessly. That balance is a positive number '
  'and the subtraction line does run. What is the likely cause?',
  'The fee is zero for that case, so the balance is changed by nothing and never falls',
  ['The balance is too large, so the loop would end eventually but takes too long',
   'The condition should test whether the balance is at least zero',
   'Subtraction cannot make a positive number reach zero'],
  'The subtraction running rules out an unreached line, and a positive balance rules out a '
  'condition that was false to begin with. What is left is a subtraction that changes nothing, '
  'which leaves the condition exactly as it was.',
  evidence='That balance is a positive number and the subtraction line does run')

# =========================================================================
# LP_FAM09_ZERO_ITERATION — D3, D4
# =========================================================================
q('GB_LP_029', 'LP_FAM09_ZERO_ITERATION', 'D3',
  'A fragment sets total to 0, then runs a loop while total > 10 that adds 1 to total, then '
  'displays total. What is displayed?',
  '0',
  ['1', '11', 'Nothing, because the loop never ran'],
  'The condition is already false when the loop is reached, so the body never runs and the total '
  'keeps the value it was given beforehand. A loop that runs zero times leaves everything exactly '
  'as it found it, and the display after the loop still happens.')

q('GB_LP_030', 'LP_FAM09_ZERO_ITERATION', 'D4',
  'A program reports a maximum of 0 for a list of measurements, all of which are negative. It '
  'reports no error and the comparison inside the loop is correct. What happened?',
  'The running maximum was set to 0 before the loop, and no negative value ever exceeded it',
  ['The loop ran zero times, because the list was treated as empty',
   'The comparison should have been for the smallest value rather than the largest',
   'Negative values cannot be compared against a starting value'],
  'The loop did run — it examined every value — but nothing beat the starting value, so that '
  'starting value was reported. Choosing zero as a starting maximum quietly assumes the data '
  'contains something positive.',
  evidence='It reports no error and the comparison inside the loop is correct')

# =========================================================================
# LP_FAM10_NESTED_COUNT — D3, D4
# =========================================================================
q('GB_LP_031', 'LP_FAM10_NESTED_COUNT', 'D3',
  'An outer loop runs 4 times and an inner loop runs 3 times for each pass of the outer one. How '
  'many times does the inner body run in total?',
  '12',
  ['7', '4', '3'],
  'The inner loop runs fully once per outer pass, so four passes of three give 12: the counts '
  'multiply rather than add. Answering 7 adds them, and answering 3 counts the inner loop once.')

q('GB_LP_032', 'LP_FAM10_NESTED_COUNT', 'D4',
  'An outer loop runs for i in range(4), and inside it an inner loop runs for j in range(i). '
  'Someone predicts 16 inner passes and the actual number is different. How many are there, and '
  'why?',
  '6, because the inner count changes with i and is 0, 1, 2 and 3 on the four passes',
  ['16, because four passes of four each is the correct reading',
   '12, because the inner loop runs three times on each of four passes',
   '4, because the inner loop runs once for each outer pass'],
  'The inner bound is not fixed; it takes the outer variable\'s current value, so the passes are '
  '0, 1, 2 and 3 and their total is 6. Predicting 16 treats a dependent bound as though it were '
  'the outer bound repeated.',
  evidence='Someone predicts 16 inner passes and the actual number is different')

# =========================================================================
# LP_FAM11_BREAK_EFFECT — D3, D4
# =========================================================================
q('GB_LP_033', 'LP_FAM11_BREAK_EFFECT', 'D3',
  'A loop runs over 1, 2, 3, 4, 5. It displays each value, and immediately after the display it '
  'leaves the loop when the value reaches 3. What is displayed?',
  '1 2 3',
  ['1 2', '1 2 4 5', '1 2 3 4 5'],
  'The display happens before the exit on the pass where the value is 3, so 3 does appear, and '
  'nothing after that pass runs at all. Skipping only the one value and continuing is what a '
  'different instruction would do.')

q('GB_LP_034', 'LP_FAM11_BREAK_EFFECT', 'D4',
  'A search loop over a list is meant to stop at the first match, and it does display the right '
  'item. A counter placed after the exit, inside the loop body, always reads 0. What does that '
  'show?',
  'Nothing after the exit runs on the pass that matches, so the counter is never reached',
  ['The counter was initialised inside the loop and reset each time',
   'The exit leaves only the current pass, so later passes should still have counted',
   'The match was found on the first pass, so there was nothing to count'],
  'The right item being displayed shows the loop reached the match; the counter reading zero '
  'shows nothing after the exit ran on that pass, and the exit ended the loop entirely so no '
  'later pass reached it either.',
  evidence='A counter placed after the exit, inside the loop body, always reads 0')

# =========================================================================
# LP_FAM12_CONTINUE_EFFECT — D3, D4
# =========================================================================
q('GB_LP_035', 'LP_FAM12_CONTINUE_EFFECT', 'D3',
  'A loop runs over 1, 2, 3, 4. When a value is even it abandons the rest of that pass and starts '
  'the next; otherwise it displays the value. What is displayed?',
  '1 3',
  ['1 2 3 4', '1', '2 4'],
  'Abandoning a pass skips only what remains of that pass, and the loop carries on with the next '
  'value, so what appears is 1 3. Leaving the loop entirely at the first even value would display '
  'only 1.')

q('GB_LP_036', 'LP_FAM12_CONTINUE_EFFECT', 'D4',
  'A loop is meant to count how many values it examined. When a value fails a check the loop '
  'abandons the rest of that pass, and the counter sits after that point in the body. The loop '
  'examines twelve values and the counter reports 5. What does that show?',
  'The counter is only reached on passes that were not abandoned, so it counts passing values '
  'rather than examined ones',
  ['The loop stopped after five values',
   'The counter is reset whenever a value fails the check',
   'Seven of the values were never examined at all'],
  'All twelve values were examined — each was checked — but the counter sits past the point where '
  'a failing pass is abandoned, so only the five that passed ever reached it. Moving the counter '
  'above the check is what would count examinations.',
  evidence='The loop examines twelve values and the counter reports 5')

# =========================================================================
# LP_FAM13_INFINITE_LOOP_DIAGNOSIS — D3 (legacy), D4 (legacy), D5 x3
# =========================================================================
q('GB_LP_037', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'D3',
  'A loop is meant to display 1 to 5. It sets i to 1, displays i while i is at most 5, and never '
  'changes i anywhere in the body. What is the fault?',
  'Nothing in the body changes i, so the condition can never become false',
  ['The comparison should exclude 5 rather than include it',
   'The starting value should be 0 rather than 1',
   'The display should come after the condition rather than before it'],
  'The condition tests i and only the body could change it, so a body that leaves i alone leaves '
  'the condition permanently true. Adjusting the bound or the starting value would change which '
  'values appear, not whether the loop ends.',
  provenance='LEGACY_REMAP', source='f86fb9')

q('GB_LP_038', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'D4',
  'A loop increases a counter, but the increase sits inside a conditional branch within the body. '
  'The loop finishes normally for some inputs and runs endlessly for others. What is the fault?',
  'For some inputs the branch holding the increase is never taken, so nothing changes the '
  'condition',
  ['The loop condition is written the wrong way round',
   'The counter starts at a value that is too high',
   'A loop that displays output can never end'],
  'That it ends for some inputs proves the condition and the counter are capable of working '
  'together; what varies between the inputs is whether the branch runs at all. A fault in the '
  'condition or the starting value would behave the same way for every input.',
  provenance='LEGACY_REWRITE', source='f7334b',
  evidence='The loop finishes normally for some inputs and runs endlessly for others')

q('GB_LP_039', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'D5',
  'A loop repeats while a value is not equal to 10, and the value increases by 3 each time '
  'starting from 0. Does it end?',
  'No; the value takes 0, 3, 6, 9, 12 and beyond, stepping over 10 without ever equalling it',
  ['Yes; the value passes 10 and the condition becomes false',
   'Yes; the value reaches exactly 10 on the fourth pass',
   'No; the value never changes, so the condition stays true'],
  'Testing for equality with a single value only ends the loop if the sequence lands on it '
  'exactly, and a step of 3 from 0 never does. Testing whether the value has reached 10 or more '
  'would end it, which is why an inequality is the safer condition here.',
  mode='EDGE', hinge='repeats while a value is not equal to 10')

q('GB_LP_040', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'D5',
  'A loop repeats while a total is below a target and adds a value read from the data each time '
  'round. Every value in the data is a whole number and none is negative. Under what condition '
  'does the loop fail to end?',
  'When the values being read are zero, since the total is updated but not changed',
  ['When the values being read are large, since the total overshoots the target',
   'Never, since adding a whole number always increases a total',
   'When the target is zero, since the loop cannot start'],
  'The update runs and is reachable, yet leaves the total where it was, so the condition never '
  'becomes false. Zero is a whole number and not negative, which is exactly why it slips past the '
  'assumption that any addition makes progress.',
  mode='TRANSFER', hinge='Every value in the data is a whole number and none is negative')

q('GB_LP_041', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'D5',
  'A loop that runs endlessly could be guarded either by adding a maximum number of passes or by '
  'fixing the update that fails to change the condition. What does the guard buy, and what does '
  'it cost?',
  'It stops the program hanging, but leaves the real fault in place and hides it behind a limit '
  'that will look arbitrary later',
  ['It fixes the fault, since the loop now ends',
   'It costs nothing, since a limit large enough is never reached',
   'It buys nothing, since a loop cannot be limited from outside its condition'],
  'A cap converts a hang into a wrong answer delivered on time, which is sometimes the right '
  'trade in code that must not stop responding — but the loop still does not do what it was meant '
  'to. Naming what the guard does and does not fix is the whole decision.',
  mode='TRADEOFF', hinge='adding a maximum number of passes or by fixing the update')

# =========================================================================
# LP_FAM14_OFF_BY_ONE_DIAGNOSIS — D4 (legacy), D5 x4
# =========================================================================
q('GB_LP_042', 'LP_FAM14_OFF_BY_ONE_DIAGNOSIS', 'D4',
  'A loop should total the values 1 to 5 but totals only 1 to 4, giving 10 instead of 15. The '
  'addition line and the starting total are both correct. What should change?',
  'The upper bound, which stops the loop one value short',
  ['The starting total, which should begin at 1 rather than 0',
   'The addition, which should add the loop variable twice on the final pass',
   'The starting value of the loop variable, which should be 0 rather than 1'],
  'A total short by exactly the missing value points at how far the loop went, not at what it did '
  'each time. Starting the total at 1 would give 11, and starting the loop variable at 0 would '
  'add a harmless zero without recovering the 5.',
  provenance='LEGACY_REMAP', source='eca4b3',
  evidence='The addition line and the starting total are both correct')

q('GB_LP_043', 'LP_FAM14_OFF_BY_ONE_DIAGNOSIS', 'D5',
  'A loop reads positions 0 up to and including the length of a list. It works on every list '
  'except that it fails on the final pass, every time. Which change fixes it without dropping any '
  'item?',
  'Stop one position before the length, since the last valid position is one below it',
  ['Start at position 1 instead of position 0',
   'Stop two positions before the length, to be safe',
   'Start at position 1 and stop one before the length'],
  'The failure on the last pass places the fault at the upper end, and the first position is '
  'valid, so moving the start would silently drop an item while appearing to fix things. Stopping '
  'two short would drop one as well.',
  mode='TRANSFER', hinge='It works on every list except that it fails on the final pass')

q('GB_LP_044', 'LP_FAM14_OFF_BY_ONE_DIAGNOSIS', 'D5',
  'A loop counting from 1 to n reports one fewer item than expected for every n. Two changes are '
  'proposed: start at 0 instead of 1, or stop at n + 1 instead of n. Both restore the count. Are '
  'they equally correct?',
  'No; both give the right count, but starting at 0 adds an item that does not belong and '
  'stopping later adds the one that was missing',
  ['Yes; a count that comes out right means the loop is right',
   'No; only starting at 0 is correct, since counting always begins there',
   'No; only stopping at n + 1 is correct, since the start must never change'],
  'Two changes can agree on how many items are handled and disagree completely on which. Checking '
  'the count alone cannot separate them, which is why the values processed have to be checked as '
  'well.',
  mode='TRADEOFF', hinge='start at 0 instead of 1, or stop at n + 1 instead of n')

q('GB_LP_045', 'LP_FAM14_OFF_BY_ONE_DIAGNOSIS', 'D5',
  'A loop that processes a list one item at a time is correct. The same loop is then used on a '
  'list where each pass must compare an item with the one after it. Where does it now go wrong?',
  'On the final pass, where there is no following item to compare against',
  ['On the first pass, where there is no preceding item',
   'Nowhere; comparing pairs needs no change to the bounds',
   'On every pass, since two items cannot be read at once'],
  'Reading ahead by one shortens how far the loop may safely go: with n items there are only '
  'n - 1 adjacent pairs. Nothing goes wrong at the start, because the first item does have a '
  'successor.',
  mode='TRANSFER', hinge='each pass must compare an item with the one after it')

q('GB_LP_046', 'LP_FAM14_OFF_BY_ONE_DIAGNOSIS', 'D5',
  'A loop is one out at its upper bound. On a list of a thousand items the symptom is a single '
  'missing item; on a list of two items it is half the data. Which list is the better test case, '
  'and why?',
  'The two-item list, because the same fault produces a proportionally larger and more visible '
  'symptom',
  ['The thousand-item list, because it exercises the loop more thoroughly',
   'Neither; the fault appears identically on both',
   'The thousand-item list, because small lists are special cases rather than tests'],
  'The fault is the same in both, but on a large list one missing item can pass unnoticed among '
  'the rest, while on a tiny list it is unmistakable. Small inputs make boundary faults loud, '
  'which is what makes them worth testing first rather than last.',
  mode='TRADEOFF', hinge='On a list of a thousand items the symptom is a single missing item')

# =========================================================================
# LP_FAM15_LOOP_EDGE_TRACE — D4, D5 x3
# =========================================================================
q('GB_LP_047', 'LP_FAM15_LOOP_EDGE_TRACE', 'D4',
  'A loop that finds the largest value works on every list it has been given. Given a list with '
  'exactly one item it returns that item, and given an empty list it returns the value it started '
  'from rather than failing. What does the second result show?',
  'The starting value was chosen in the code, so an empty list simply leaves it untouched',
  ['The loop ran once on the empty list and read something that was not there',
   'An empty list is treated as a list containing zero',
   'The single-item case and the empty case are the same case'],
  'Nothing failed because nothing was attempted: the body never ran, so whatever the running '
  'maximum was initialised to is what came back. A single item behaves correctly precisely '
  'because the body does run once.',
  evidence='given an empty list it returns the value it started from rather than failing')

q('GB_LP_048', 'LP_FAM15_LOOP_EDGE_TRACE', 'D5',
  'A loop joins the words of a list with a comma placed before each word except the first. What '
  'does it produce for a list holding exactly one word?',
  'That word alone, with no comma',
  ['That word preceded by a comma',
   'An empty result, because there is no pair to join',
   'A failure, because the first-word case has no preceding word'],
  'The rule places a separator only between words, and one word has nothing before or after it, '
  'so no separator is placed. Working out what a rule does at its smallest input is often easier '
  'than working out what it does in general.',
  mode='EDGE', hinge='for a list holding exactly one word')

q('GB_LP_049', 'LP_FAM15_LOOP_EDGE_TRACE', 'D5',
  'A loop computes an average by totalling values and dividing by how many there were. One '
  'version checks for an empty list first; the other lets the division happen. On an empty list, '
  'which behaviour is preferable for a program that processes files unattended overnight?',
  'The check, because an empty file is a real case and a nightly run should record it rather than '
  'stop',
  ['The division, because failing loudly always beats continuing',
   'The division, because an average of an empty list is meaningfully zero',
   'Neither; an empty file should never be produced in the first place'],
  'Whether to guard depends on whether the case is expected, and a program left running overnight '
  'will meet an empty file eventually. An average of nothing is not zero — it does not exist — so '
  'the guard has to report the absence rather than invent a value.',
  mode='TRADEOFF', hinge='a program that processes files unattended overnight')

q('GB_LP_050', 'LP_FAM15_LOOP_EDGE_TRACE', 'D5',
  'A loop finds the largest value with a running maximum that starts at zero. It has been correct '
  'for years on data that has always been positive. The data now includes readings below zero. '
  'What happens, and would it be noticed?',
  'It reports zero whenever every reading is negative, and nothing signals a problem',
  ['It fails as soon as a negative reading is met',
   'It reports the largest negative reading correctly, since comparison still works',
   'It reports zero, and the program stops because zero is not in the data'],
  'The comparison still works perfectly; what fails is the starting value, which no negative '
  'reading can beat. The result is a plausible-looking number that never appeared in the data, '
  'and nothing about it announces itself.',
  mode='TRANSFER', hinge='The data now includes readings below zero')
