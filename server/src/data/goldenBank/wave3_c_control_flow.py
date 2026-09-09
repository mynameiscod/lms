# -*- coding: utf-8 -*-
"""
Wave 3 — C_CONTROL_FLOW, 50 Golden Bank questions.

4 come from the existing bank, all remapped in from C_BASICS, and 46 are new.

THE FAMILIES HERE MEASURE WHAT BRACES AND SEMICOLONS DO, which is exactly what a student arriving
from an indentation-based language has never had to think about. The blueprint asks for misleading
indentation deliberately — a line indented as though it belonged to a conditional and left outside
the braces — because indentation carries no meaning in C and trusting it is the trap.

THE OTHER C-SPECIFIC FACT IS THAT A CONDITION IS A NUMBER. Anything non-zero is satisfied, an
assignment inside a condition both assigns and yields a value, and a stray semicolon after a
condition terminates the body without any complaint. None of these exist in the first language
taught, and each has its own family.
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
# CF_FAM01_BLOCK_RECOGNITION — D1 x4, D2 x1   (misleading indentation shown)
# =========================================================================
q('GB_CF_001', 'CF_FAM01_BLOCK_RECOGNITION', 'D1',
  'A C fragment reads: if (x > 0) printf("A"); printf("B"); with both prints written on '
  'separate, equally indented lines. Which of them is controlled by the condition?',
  'Only the first',
  ['Both, because they are indented together',
   'Neither, because there are no braces',
   'Only the second'],
  'Without braces a conditional governs exactly one statement, which is the first. Indentation is '
  'invisible to the compiler, so lining the two up changes nothing about which is controlled.')

q('GB_CF_002', 'CF_FAM01_BLOCK_RECOGNITION', 'D1',
  'A C fragment reads: if (x > 0) { printf("A"); printf("B"); } How many statements are controlled '
  'by the condition?',
  'Two',
  ['One, the first only', 'None, because braces separate them from the condition',
   'Two, but only if they are indented'],
  'Braces group statements into one block, and the whole block is what the condition governs. '
  'Indentation plays no part in either direction.')

q('GB_CF_003', 'CF_FAM01_BLOCK_RECOGNITION', 'D1',
  'Are braces compulsory after a C conditional?',
  'No; without them the conditional governs the single statement that follows',
  ['Yes; a conditional without braces does not compile',
   'Yes, unless the body is on the same line',
   'No; without them the conditional governs everything until the next blank line'],
  'One statement needs no braces, which is precisely why adding a second line later is such a '
  'common way to break working code. Blank lines mean nothing to the compiler.')

q('GB_CF_004', 'CF_FAM01_BLOCK_RECOGNITION', 'D1',
  'A C fragment reads: if (x > 0); printf("A"); What does the condition control?',
  'Nothing; the semicolon is an empty statement and is the whole body',
  ['The print, which runs only when x is positive',
   'Nothing, and the fragment does not compile',
   'The print, which runs regardless of x'],
  'A semicolon on its own is a complete, empty statement, and the conditional takes it as its '
  'body. The print then sits outside the conditional and runs every time — legal, silent and '
  'almost never what was meant.')

q('GB_CF_005', 'CF_FAM01_BLOCK_RECOGNITION', 'D2',
  'A C fragment reads: while (i < 5); { total += i; i++; } The program never finishes and never '
  'prints anything. Why?',
  'The semicolon makes the loop body empty, so nothing ever changes i',
  ['The braces are in the wrong place and the program does not compile',
   'The increment is inside the braces and so never runs',
   'The condition should have used <= rather than <'],
  'The loop repeats an empty statement forever, because nothing inside it can make the condition '
  'false. The braced block is a separate block that is never reached, which is why nothing prints '
  'either.')

# =========================================================================
# CF_FAM02_CONDITION_TRUTH — D1 x3, D2 x1 (legacy)
# =========================================================================
q('GB_CF_006', 'CF_FAM02_CONDITION_TRUTH', 'D1',
  'In C, is the condition if (3) satisfied?',
  'Yes; any value other than zero counts as true',
  ['No; only the value 1 counts as true',
   'No; a condition must be a comparison',
   'It does not compile; 3 is not a condition'],
  'A C condition is a number, and every non-zero value is treated as true. Requiring a comparison '
  'is a rule from other languages that C does not impose.')

q('GB_CF_007', 'CF_FAM02_CONDITION_TRUTH', 'D1',
  'A variable holds the result of 2 - 6. Used directly as a C condition, is it satisfied?',
  'Yes; the result is -4, which is not zero, so it counts as true',
  ['No; a negative result counts as false',
   'No; only a positive result counts as true',
   'It cannot be used as a condition without a comparison'],
  'What matters is only whether the value differs from zero, so a negative result satisfies the '
  'test. Reading "true" as "positive" is the natural but wrong reading of a numeric condition.')

q('GB_CF_008', 'CF_FAM02_CONDITION_TRUTH', 'D1',
  'In C, is the condition if (0) satisfied?',
  'No; zero is the only value that counts as false',
  ['Yes; zero is a valid value',
   'No; and the compiler warns about it',
   'It depends on whether the zero is written or computed'],
  'Zero is false and everything else is true, whether the zero was written down or produced by a '
  'calculation. Nothing warns about it, which is why a computed zero can quietly disable a branch.')

q('GB_CF_009', 'CF_FAM02_CONDITION_TRUTH', 'D2',
  'A C fragment reads: int x = 7; if (x > 5) printf("A"); else printf("B"); What is printed?',
  'A',
  ['B', '7', 'Nothing, since the condition is not stored anywhere'],
  'The comparison produces a non-zero value, so the first branch runs and the second is skipped. '
  'A condition does not need to be stored to be acted on.',
  provenance='LEGACY_REMAP', source='92299f')

# =========================================================================
# CF_FAM03_LOOP_FORM_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_CF_010', 'CF_FAM03_LOOP_FORM_RECOGNITION', 'D1',
  'Which C loop form always executes its body at least once?',
  'do ... while',
  ['while', 'for', 'None of them; every loop tests before running'],
  'The do form tests after the body, so the body has already run by the time the condition is '
  'examined. Both other forms test first and may run zero times.')

q('GB_CF_011', 'CF_FAM03_LOOP_FORM_RECOGNITION', 'D1',
  'A C while loop is reached with its condition already false. How many times does the body run?',
  'None',
  ['Once, and then the condition is checked',
   'Once, because a loop always runs its body',
   'It does not compile'],
  'A while loop checks before it runs, so a condition false at entry means the body is skipped '
  'entirely. Running once regardless is what the do form would do.')

q('GB_CF_012', 'CF_FAM03_LOOP_FORM_RECOGNITION', 'D1',
  'A menu must be shown and then repeated until the user chooses to quit. Which loop form fits '
  'most naturally?',
  'do ... while, because the menu should appear before any choice exists to test',
  ['while, because the choice must be tested first',
   'for, because the number of repetitions is known',
   'Any of them; the forms are interchangeable'],
  'There is nothing to test until the menu has been shown once, which is exactly the situation '
  'the test-after form exists for. A test-first loop would need a value invented before the first '
  'display.')

q('GB_CF_013', 'CF_FAM03_LOOP_FORM_RECOGNITION', 'D2',
  'A while loop and a do ... while loop have identical bodies and identical conditions. On what '
  'input do they behave differently?',
  'Input for which the condition is false at entry: one runs the body zero times and the other '
  'once',
  ['Input for which the condition never becomes false',
   'Input for which the body runs many times',
   'They never behave differently'],
  'Once the body has run at all, the two forms proceed identically. Their only difference is what '
  'happens before the first test, which is visible only when the condition starts out false.')

# =========================================================================
# CF_FAM04_ASSIGNMENT_IN_CONDITION — D2, D3
# =========================================================================
q('GB_CF_014', 'CF_FAM04_ASSIGNMENT_IN_CONDITION', 'D2',
  'A C fragment reads: int x = 0; if (x = 5) printf("A"); What happens, and what does x hold '
  'afterwards?',
  'A is printed, and x holds 5',
  ['Nothing is printed, and x holds 0',
   'Nothing is printed, and x holds 5',
   'The fragment does not compile'],
  'A single equals assigns and then yields the value assigned, which is non-zero and so satisfies '
  'the condition. Both effects happen, which is why answering only one of them misses half of '
  'what the line does.')

q('GB_CF_015', 'CF_FAM04_ASSIGNMENT_IN_CONDITION', 'D3',
  'A loop is written as: int n = 3; while (n = 0) { n--; } How many times does the body run, and '
  'what does n hold at the end?',
  'Zero times, and n holds 0',
  ['Three times, and n holds 0',
   'Zero times, and n holds 3',
   'Endlessly, because n is set to 0 every time round'],
  'The assignment stores 0 in n and yields 0, which is false, so the loop never enters its body. '
  'The variable is changed all the same — a comparison would have run the body three times, which '
  'is what a single equals silently costs here.')

# =========================================================================
# CF_FAM05_ELSE_BINDING — D2, D3   (indentation contradicts the binding)
# =========================================================================
q('GB_CF_016', 'CF_FAM05_ELSE_BINDING', 'D2',
  'A C fragment reads: if (a > 0) if (b > 0) printf("X"); else printf("Y"); with the else '
  'indented to line up with the first if. Which if does the else belong to?',
  'The inner one, on b',
  ['The outer one, on a, as the indentation shows',
   'Both, since neither has braces',
   'Neither; the fragment does not compile'],
  'An else attaches to the nearest unmatched if, and indentation has no bearing on it. Lining the '
  'else up with the outer if makes the code read as something it is not.')

q('GB_CF_017', 'CF_FAM05_ELSE_BINDING', 'D3',
  'The same fragment runs with a = -1 and b = 5. What is printed?',
  'Nothing',
  ['Y, because a is not positive', 'X, because b is positive', 'Both X and Y'],
  'The outer condition fails, so everything inside it is skipped — including the else, which '
  'belongs to the inner if. A reader who binds the else to the outer if expects Y, which is '
  'exactly what the misleading indentation invites.')

# =========================================================================
# CF_FAM06_COUNTED_LOOP_COUNT — D2 (legacy), D3, D4
# =========================================================================
q('GB_CF_018', 'CF_FAM06_COUNTED_LOOP_COUNT', 'D2',
  'A C fragment reads: for (int i = 0; i < 3; i++) printf("%d ", i); What is printed?',
  '0 1 2',
  ['1 2 3', '0 1 2 3', '3'],
  'The counter starts at 0 and the loop stops before 3, so 0 1 2 appears. Reading the condition '
  'as inclusive adds a fourth value that never occurs.',
  provenance='LEGACY_REMAP', source='918b68')

q('GB_CF_019', 'CF_FAM06_COUNTED_LOOP_COUNT', 'D3',
  'How many times does the body run in: for (int i = 2; i <= 11; i += 3)?',
  '4',
  ['3', '9', '10'],
  'The counter takes 2, 5, 8 and 11, and the last of those satisfies the inclusive condition, so '
  'the body runs 4 times. With a step other than one the count is not the difference between the '
  'bounds, which is where 9 comes from.')

q('GB_CF_020', 'CF_FAM06_COUNTED_LOOP_COUNT', 'D4',
  'A C fragment reads: for (int i = 10; i > 0; i++) and the program never finishes. The condition '
  'and the starting value are both sensible on their own. What is wrong?',
  'The step moves away from the bound, so the condition can never become false',
  ['The starting value should be 0',
   'The condition should be i >= 0',
   'A for loop cannot count downwards'],
  'A counted loop only ends if its step drives the counter toward the bound, and here it drives '
  'it away. Both the start and the condition are perfectly reasonable — it is the relationship '
  'between the three parts that fails.',
  evidence='The condition and the starting value are both sensible on their own')

# =========================================================================
# CF_FAM07_LOOP_VARIABLE_AFTER — D2, D3, D4
# =========================================================================
q('GB_CF_021', 'CF_FAM07_LOOP_VARIABLE_AFTER', 'D2',
  'A counter declared outside a loop runs: for (i = 0; i < 4; i++). What does i hold immediately '
  'after the loop?',
  '4',
  ['3', '0', '5'],
  'The loop ends when the condition first fails, which happens once i has reached 4. The last '
  'value used inside the body was 3, which is one less.')

q('GB_CF_022', 'CF_FAM07_LOOP_VARIABLE_AFTER', 'D3',
  'A counter declared outside a loop runs: for (i = 1; i <= 6; i += 2). What does i hold '
  'immediately after the loop?',
  '7',
  ['5', '6', '9'],
  'The counter takes 1, 3 and 5 inside the body, and the step then makes it 7, which fails the '
  'condition. The bound itself is never reached, because the step passes over it.')

q('GB_CF_023', 'CF_FAM07_LOOP_VARIABLE_AFTER', 'D4',
  'A program uses the counter after the loop to report how many items were processed, and the '
  'figure is always one too high. Each item was processed exactly once. What is wrong?',
  'The counter holds the value that failed the condition, which is one past the last item',
  ['The loop processes one item too many',
   'The counter should have started at 1',
   'The counter is being incremented twice per pass'],
  'Every item being processed once rules out an extra pass, so the count is wrong rather than the '
  'work. The counter necessarily ends one beyond the last value it used, which is exactly the '
  'discrepancy reported.',
  evidence='Each item was processed exactly once')

# =========================================================================
# CF_FAM08_ACCUMULATOR_IN_C — D2, D3 (legacy), D4
# =========================================================================
q('GB_CF_024', 'CF_FAM08_ACCUMULATOR_IN_C', 'D2',
  'A C fragment declares int sum; without assigning it, then adds three values to it in a loop. '
  'What does sum hold at the end?',
  'The three values added to whatever was already in that memory',
  ['The sum of the three values',
   'Zero, because sum was declared',
   'Nothing; the program does not compile'],
  'Declaring reserves space without clearing it, so the loop adds to rubbish. The program compiles '
  'and runs, which is what makes the wrong total so hard to account for.')

q('GB_CF_025', 'CF_FAM08_ACCUMULATOR_IN_C', 'D3',
  'A C function sets a running total to zero, then adds each whole number from 1 to 3 inclusive to '
  'it, then reports the total. What does it report?',
  '6',
  ['3', '9', '0'],
  'The values 1, 2 and 3 accumulate to 6. Answering 3 reports the last value added rather than '
  'the accumulated result, and 0 reports the starting value.',
  provenance='LEGACY_REMAP', source='90ed31')

q('GB_CF_026', 'CF_FAM08_ACCUMULATOR_IN_C', 'D4',
  'A C program sums an array and prints a plausible but wrong total, and prints a different wrong '
  'total each time it runs. The array and the loop bounds are correct. What is wrong?',
  'The running total was never initialised, so each run starts from whatever was in that memory',
  ['The total is being initialised inside the loop',
   'The array is being read one item past its end',
   'The total is declared with too small a type'],
  'A different answer on each run is the signature of an unset starting value, since the code and '
  'the data are identical between runs. Initialising inside the loop would give the same wrong '
  'answer every time.',
  evidence='prints a different wrong total each time it runs')

# =========================================================================
# CF_FAM09_BREAK_SCOPE — D2, D3, D4   (nested loops required)
# =========================================================================
q('GB_CF_027', 'CF_FAM09_BREAK_SCOPE', 'D2',
  'A break is reached inside the inner of two nested C loops. Where does execution continue?',
  'Immediately after the inner loop, still inside the outer one',
  ['Immediately after the outer loop',
   'At the next iteration of the inner loop',
   'At the start of the outer loop'],
  'A break leaves exactly one enclosing structure, which is the innermost. Skipping one iteration '
  'is what a different instruction does, and leaving both loops needs something more than a plain '
  'break.')

q('GB_CF_028', 'CF_FAM09_BREAK_SCOPE', 'D3',
  'A search examines each row of a table, and within each row it abandons the row as soon as its '
  'second entry has been checked. The table has 3 rows of 4 entries. How many entries are '
  'checked?',
  '6',
  ['12', '2', '3'],
  'Two entries are checked in each row, because the pass that abandons the row has already '
  'examined that entry, and all 3 rows are still visited — 6 entries in all. Abandoning a row ends '
  'only the inner structure, so the outer traversal continues.')

q('GB_CF_029', 'CF_FAM09_BREAK_SCOPE', 'D4',
  'A search over a two-dimensional array is meant to stop entirely once a value is found, and it '
  'keeps searching later rows. The break is present and does execute. What is wrong?',
  'The break leaves only the inner loop, so the outer loop begins the next row',
  ['The break is inside a conditional and never runs',
   'The comparison never matches, so the break is not reached',
   'The break should have been placed after the inner loop'],
  'The break executing rules out it being unreached, and later rows still being searched shows '
  'only one structure was left. Stopping both needs a flag the outer loop tests, or a return.',
  evidence='The break is present and does execute')

# =========================================================================
# CF_FAM10_FALL_THROUGH — D2 (legacy), D3, D4
# =========================================================================
q('GB_CF_030', 'CF_FAM10_FALL_THROUGH', 'D2',
  'A multi-way selection on a value has a case for 1 and a case for 2, each ending with a break, '
  'and no default. The value is 2. Which cases run?',
  'Only the case for 2',
  ['Only the case for 1', 'Both cases, in the order written',
   'None, because no default is present'],
  'Execution enters at the matching case, and the break there leaves the structure before any '
  'other case is reached. A missing default is not an error; it means only that an unmatched '
  'value would do nothing.',
  provenance='LEGACY_REMAP', source='8f128c')

q('GB_CF_031', 'CF_FAM10_FALL_THROUGH', 'D3',
  'A multi-way selection is written with three cases and the first of them has no break: int x = '
  '1; switch (x) { case 1: printf("A"); case 2: printf("B"); break; case 3: printf("C"); break; } '
  'What appears?',
  'A then B',
  ['A', 'A, B then C', 'B'],
  'Execution enters at the matching case and continues until a break, so the missing break after '
  'the first case lets the second run too. It stops at the break before the third.')

q('GB_CF_032', 'CF_FAM10_FALL_THROUGH', 'D4',
  'A multi-way selection is meant to handle three values separately, and two of them produce the '
  'output of the next case as well. The third behaves correctly. What is wrong?',
  'The first two cases have no break, so execution continues into the following case',
  ['The values being matched are wrong',
   'The default case is missing',
   'The cases are written in the wrong order'],
  'One case behaving correctly shows the structure and the matching work, and the other two '
  'producing extra output is exactly what falling through the end of a case does. Order does not '
  'affect which case is entered.',
  evidence='The third behaves correctly')

# =========================================================================
# CF_FAM11_NESTED_LOOP_TRACE — D3, D4
# =========================================================================
q('GB_CF_033', 'CF_FAM11_NESTED_LOOP_TRACE', 'D3',
  'A nested C pair prints i then j on each inner pass: for (i = 0; i < 2; i++) for (j = 0; j < 2; '
  'j++) printf("%d%d ", i, j); What is printed?',
  '00 01 10 11',
  ['00 11', '00 01 11', '01 10'],
  'The inner loop runs fully for each value of i, so the pairs come out in the order 00 01 10 11. '
  'Answering 00 11 advances both counters together, which is what treating the pair as a single '
  'loop would do.')

q('GB_CF_034', 'CF_FAM11_NESTED_LOOP_TRACE', 'D4',
  'An inner counter is declared outside both loops and is not reset at the start of each outer '
  'pass. The outer loop runs 3 times and the inner condition is j < 4. The inner body runs 4 times '
  'in total rather than 12. Why?',
  'The counter kept its value from the first pass, so the inner condition was already false '
  'afterwards',
  ['The outer loop ran only once',
   'The inner loop breaks on its fourth pass',
   'The inner bound should have been 12'],
  'A counter left at 4 fails the condition immediately on every later outer pass, so the inner '
  'body never runs again. Declaring the counter inside the loop, or resetting it, is what makes '
  'the counts multiply.',
  evidence='The inner body runs 4 times in total rather than 12')

# =========================================================================
# CF_FAM12_RETURN_FROM_LOOP — D3, D4
# =========================================================================
q('GB_CF_035', 'CF_FAM12_RETURN_FROM_LOOP', 'D3',
  'A C function loops over an array and contains a return inside the loop body, not inside any '
  'conditional. How many items does it examine?',
  'One; the return ends the function on the first pass',
  ['All of them; the loop finishes first',
   'All of them; a return inside a loop acts as a break',
   'None; the return is reached before the loop begins'],
  'A return leaves the function immediately, so nothing after it runs and no later pass happens. '
  'It is stronger than a break, which leaves only the loop.')

q('GB_CF_036', 'CF_FAM12_RETURN_FROM_LOOP', 'D4',
  'A C function is meant to return the largest value in an array. It returns the first value every '
  'time. The comparison inside the loop is correct and the loop bounds are correct. What is wrong?',
  'The return sits inside the loop body rather than after it',
  ['The comparison is the wrong way round',
   'The running maximum starts at zero',
   'The loop examines only the first item because of its bounds'],
  'Correct bounds and a correct comparison leave only where the value is handed back. Returning '
  'on the first pass gives the first value whatever the rest of the array holds, which is exactly '
  'the symptom.',
  evidence='The comparison inside the loop is correct and the loop bounds are correct')

# =========================================================================
# CF_FAM13_SILENT_CONTROL_FAULT — D3, D4, D5 x3
# =========================================================================
q('GB_CF_037', 'CF_FAM13_SILENT_CONTROL_FAULT', 'D3',
  'A C loop is written as: for (int i = 0; i < 5; i++); { printf("%d", i); } It compiles, runs, '
  'and prints nothing about the loop. What is wrong?',
  'The semicolon ends the loop body, so the braced block runs once, outside the loop',
  ['The loop condition is never true',
   'The braces are not allowed after a for statement',
   'The printf uses the wrong specifier'],
  'The loop repeats an empty statement five times and then the block runs once on its own. It is '
  'entirely legal, which is why nothing is reported.')

q('GB_CF_038', 'CF_FAM13_SILENT_CONTROL_FAULT', 'D4',
  'A C loop is meant to run a two-statement body and only the first statement repeats. It '
  'compiles cleanly and the two statements are indented identically. What is wrong?',
  'There are no braces, so the loop governs only the first statement',
  ['A semicolon after the condition ended the body',
   'The second statement is placed before the loop',
   'The loop condition becomes false after one pass'],
  'Only the first statement repeating points at what the loop governs, and without braces that is '
  'exactly one statement. A semicolon after the condition would have made neither statement '
  'repeat.',
  evidence='It compiles cleanly and the two statements are indented identically')

q('GB_CF_039', 'CF_FAM13_SILENT_CONTROL_FAULT', 'D5',
  'Three C faults are all silent: a semicolon after a loop condition, missing braces around a '
  'two-statement body, and an else bound to the wrong if. What do they have in common, and why is '
  'that dangerous?',
  'Each produces a valid program with a different meaning, so the compiler has nothing to report '
  'and the code reads as intended',
  ['Each produces a compiler warning that is easy to ignore',
   'Each causes the program to stop at run time',
   'Each is caught by testing the ordinary cases'],
  'All three are legal C that means something other than what the layout suggests, which is why '
  'nothing complains and why reading the code does not reveal them. Testing may not catch them '
  'either, since the ordinary case can happen to give the right answer.',
  mode='TRANSFER', hinge='Three C faults are all silent')

q('GB_CF_040', 'CF_FAM13_SILENT_CONTROL_FAULT', 'D5',
  'A team adopts a rule that braces are always written, even around a single statement. What does '
  'that prevent, and what does it cost?',
  'It prevents a later added line from silently falling outside the structure; it costs two lines '
  'of text per conditional',
  ['It prevents the semicolon fault, and costs nothing',
   'It prevents nothing, since a single statement needs no braces',
   'It costs performance, since braces create a block'],
  'The danger is not the code as first written but the line somebody adds to it later, which '
  'joins the block if braces are there and does not if they are not. Braces are free at run time; '
  'the cost is purely in text.',
  mode='TRADEOFF', hinge='braces are always written, even around a single statement')

q('GB_CF_041', 'CF_FAM13_SILENT_CONTROL_FAULT', 'D5',
  'A C program behaves correctly on every test and contains a missing pair of braces around a '
  'two-statement conditional body. How can both be true?',
  'The tests never exercised a case where the second statement should have been skipped',
  ['The compiler inserted the braces automatically',
   'Missing braces have no effect when the body is short',
   'The tests are wrong, since the program cannot be correct'],
  'The second statement runs unconditionally, which is only visible on input where the condition '
  'is false. If every test satisfies the condition, the fault and the correct code behave '
  'identically.',
  mode='TRANSFER', hinge='behaves correctly on every test and contains a missing pair of braces')

# =========================================================================
# CF_FAM14_LOOP_EDGE_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_CF_042', 'CF_FAM14_LOOP_EDGE_BEHAVIOUR', 'D4',
  'A C fragment declares int total; then runs a for loop whose condition is false at entry, then '
  'prints total. It prints a large unrelated number. The loop body is correct. What happened?',
  'The loop ran zero times, so total kept the rubbish it was declared with',
  ['The loop ran once before the condition was checked',
   'The loop ran and the body produced a wrong total',
   'The program printed the loop counter rather than the total'],
  'Two facts combine: a test-first loop can run zero times, and a declared variable holds rubbish '
  'until assigned. Either alone would be harmless, and together they print a plausible-looking '
  'number that came from nowhere.',
  evidence='The loop body is correct')

q('GB_CF_043', 'CF_FAM14_LOOP_EDGE_BEHAVIOUR', 'D5',
  'A do ... while loop is given input for which its condition is false from the very start. What '
  'does it produce?',
  'One pass of the body, since the condition is tested only afterwards',
  ['No passes, like a while loop', 'An error, since the condition was never true',
   'Endless passes, since the condition was never true'],
  'The test-after form has already run its body by the time the condition is examined. That '
  'single guaranteed pass is the whole difference between the two forms, and it appears only at '
  'this boundary.',
  mode='EDGE', hinge='its condition is false from the very start')

q('GB_CF_044', 'CF_FAM14_LOOP_EDGE_BEHAVIOUR', 'D5',
  'A loop summing an array is given an array of size zero. The total was initialised to 0 before '
  'the loop. What is printed?',
  '0, which is correct and needs no special case',
  ['An unpredictable value, since the loop never ran',
   'An error, since an array cannot have size zero',
   'The value of the loop counter'],
  'The loop runs zero times and the total keeps the value it was given, which is the right answer '
  'for summing nothing. The initialisation is what makes the empty case safe — without it the '
  'same loop would print rubbish.',
  mode='EDGE', hinge='The total was initialised to 0 before the loop')

q('GB_CF_045', 'CF_FAM14_LOOP_EDGE_BEHAVIOUR', 'D5',
  'A loop is meant to run a number of times read from input. What should be checked before it '
  'runs, and which loop form makes the check more urgent?',
  'That the count is not zero or negative; the test-after form, which runs once regardless',
  ['That the count is not zero; the test-first form, which would loop endlessly',
   'Nothing; a loop handles any count correctly',
   'That the count is not too large; either form is equally affected'],
  'A test-first loop handles a count of zero correctly by running nothing, so it needs no guard '
  'for that case. A test-after loop runs once whatever the count says, which is wrong for zero '
  'and worse for a negative value.',
  mode='TRANSFER', hinge='which loop form makes the check more urgent')

q('GB_CF_046', 'CF_FAM14_LOOP_EDGE_BEHAVIOUR', 'D5',
  'Two C loops differ only in that one initialises its accumulator and one does not. On ordinary '
  'input they agree. Where do they part company?',
  'On input that makes the loop run zero times, where one prints its starting value and the other '
  'prints rubbish',
  ['On large input, where the uninitialised one overflows',
   'On negative input, where the uninitialised one wraps',
   'Nowhere; the first pass assigns the accumulator either way'],
  'Once the loop runs at least once and the accumulator is assigned before being read, the two '
  'behave identically — which is why ordinary testing finds nothing. Only zero iterations leave '
  'the starting value visible.',
  mode='EDGE', hinge='one initialises its accumulator and one does not')

# =========================================================================
# CF_FAM15_CONTROL_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_CF_047', 'CF_FAM15_CONTROL_EQUIVALENCE', 'D4',
  'A while loop is rewritten as a do ... while loop with the same body and condition. They agree '
  'on every input the program has been given. Are they equivalent?',
  'No; they differ on input for which the condition is false at entry',
  ['Yes; the two forms are interchangeable',
   'No; they differ whenever the loop runs more than once',
   'No; they differ on input for which the loop never ends'],
  'Every input tested happened to satisfy the condition at least once, which is where the two '
  'forms agree. The separating case is the one the testing never produced.',
  evidence='They agree on every input the program has been given')

q('GB_CF_048', 'CF_FAM15_CONTROL_EQUIVALENCE', 'D5',
  'A chain of else-if branches is rewritten as three separate if statements with the same '
  'conditions and bodies. Are the two equivalent?',
  'No; where two conditions both hold, the chain runs one branch and the separate statements run '
  'both',
  ['Yes; the same conditions select the same branches',
   'No; separate statements cannot use the same conditions',
   'Yes, provided the conditions are written in the same order'],
  'A chain stops at its first true condition and separate statements each test independently, so '
  'the two agree exactly when no two conditions can hold together. With disjoint conditions they '
  'are genuinely equivalent, which is what makes this worth checking rather than assuming.',
  mode='TRANSFER', hinge='rewritten as three separate if statements')

q('GB_CF_049', 'CF_FAM15_CONTROL_EQUIVALENCE', 'D5',
  'A for loop is rewritten as a while loop with the initialisation before it and the step at the '
  'end of the body. Are they equivalent?',
  'Yes for an ordinary body, but not if the body contains a continue, which skips the step in the '
  'while version',
  ['Yes, in every case',
   'No; a for loop can never be written as a while loop',
   'No; the counter is scoped differently, which changes the result'],
  'The two forms run the same three parts in the same order until something jumps to the next '
  'pass. A continue in the for version still performs the step, and in the rewritten version it '
  'skips it, which turns a terminating loop into an endless one.',
  mode='EDGE', hinge='the step at the end of the body')

q('GB_CF_050', 'CF_FAM15_CONTROL_EQUIVALENCE', 'D5',
  'Two fragments are equivalent for every input. One uses a multi-way selection and one uses a '
  'chain of conditionals. On what grounds should the choice be made?',
  'On which states the intent more directly, since behaviour no longer separates them',
  ['On the multi-way selection, which is always faster',
   'On the chain, which is always clearer',
   'On neither; equivalent fragments are interchangeable in every respect'],
  'Equivalence settles correctness and leaves everything else open, so what remains is whether '
  'the next reader can see the structure of the decision. Neither form is universally clearer — a '
  'multi-way selection suits matching one value, a chain suits ranges.',
  mode='TRADEOFF', hinge='One uses a multi-way selection and one uses a chain of conditionals')
