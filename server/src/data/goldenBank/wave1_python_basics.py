# -*- coding: utf-8 -*-
"""
Wave 1 — PYTHON_BASICS, 50 Golden Bank questions.

9 come from the existing bank (5 kept, 4 rewritten) and 41 are new.

THE WRONG ANSWER KEY IS CORRECTED HERE. 6f6039 asks the output of x = 'Hi'; print(x.lower()) and
its stored key pointed at "HI" while its own stored explanation said "gives hi". It reappears as
GB_PY_017 with the key on "hi" where it always belonged. Its family is the one place in the bank
where case IS the answer, which is why nothing in this pipeline folds case when comparing options.

TWO REWRITES ARE DEEPENED RATHER THAN REWORDED. 693213 and 67576e were classified as sitting
below the difficulty their family carries: one traced a single condition, the other a bare
three-iteration loop. Rewording either would have left the reasoning identical. They are rebuilt
as a diagnosis and a transfer, which is what those slots are for.

DIVISION AND INPUT DELIBERATELY USE DIFFERENT OPERANDS FROM PROGRAMMING_FUNDAMENTALS. Both skills
carry a division family and an input family, and the same numbers in both would be one question
counted twice across two skills.
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
# PY_FAM01_LITERAL_TYPE — D1 x4, D2 x1 (legacy)
# =========================================================================
q('GB_PY_001', 'PY_FAM01_LITERAL_TYPE', 'D1',
  'In Python, what is the type of the literal 5.0?',
  'float',
  ['int', 'str', 'bool'],
  'The decimal point is what makes it a float, even though the value it represents is a whole '
  'number. Written as 5 it would be an int, and the two behave differently in division.')

q('GB_PY_002', 'PY_FAM01_LITERAL_TYPE', 'D1',
  'In Python, what is the type of the literal "5"?',
  'str',
  ['int', 'float', 'bool'],
  'Quotation marks make it a string, and the fact that the character inside is a digit changes '
  'nothing. It cannot take part in arithmetic until it is converted.')

q('GB_PY_003', 'PY_FAM01_LITERAL_TYPE', 'D1',
  'In Python, what is the type of the literal True?',
  'bool',
  ['str', 'int', 'float'],
  'Written without quotes and with a capital letter, True is a bool. Written as "True" it would '
  'be a string that merely looks like one.')

q('GB_PY_004', 'PY_FAM01_LITERAL_TYPE', 'D1',
  'Which of these four literals has a type different from the other three: 5, 5.0, "5", -5?',
  '"5"',
  ['5', '5.0', '-5'],
  'The quoted one, "5", is a string; the rest are numbers. Among the numbers 5.0 is a float and '
  'the others ints, but that difference is smaller than the one between numbers and text.')

q('GB_PY_005', 'PY_FAM01_LITERAL_TYPE', 'D2',
  'Which of these Python values is a bool?',
  'True',
  ['"True"', '1.0', '[True]'],
  'Written bare and capitalised, True is a bool. Quoting it makes a string, 1.0 is a float that '
  'behaves as true in a condition without being one, and putting it in brackets makes a list that '
  'happens to contain a bool.',
  provenance='LEGACY_KEEP', source='940444')

# =========================================================================
# PY_FAM02_PRINT_OUTPUT — D1 x3, D2 x1
# =========================================================================
q('GB_PY_006', 'PY_FAM02_PRINT_OUTPUT', 'D1',
  'These two lines run in order: x = 5 and print(x). What is displayed?',
  '5',
  ['x', '"5"', 'Nothing is displayed'],
  'The name is replaced by the value it holds, so what appears is 5. Displaying the letter x '
  'would require it to be quoted, and no quotation marks are shown around a number.',
  provenance='LEGACY_REWRITE', source='999d5f')

q('GB_PY_007', 'PY_FAM02_PRINT_OUTPUT', 'D1',
  'A program runs word = "hello" and then print(word). What is the output?',
  'hello',
  ['"hello"', 'word', 'h e l l o'],
  'print shows the value of the string without the quotation marks, because the quotes are part '
  'of how the literal was written rather than part of its contents.')

q('GB_PY_008', 'PY_FAM02_PRINT_OUTPUT', 'D1',
  'A program runs print("a") and then print("b"), as two separate statements. What is the output?',
  'a on one line and b on the next',
  ['ab on one line', 'a b on one line', '"a" and "b" on two lines'],
  'Each print statement finishes its own line, so two statements produce two lines. Joining them '
  'onto one would need a single print or an instruction not to end the line.')

q('GB_PY_009', 'PY_FAM02_PRINT_OUTPUT', 'D2',
  'Two lines are written as n = 3 and print("n"). What appears when the second of them runs?',
  'n',
  ['3', '"n"', 'Nothing, because n holds a number rather than text'],
  'Quoting the name turns it into a piece of text, so what appears is the letter n itself and the '
  'variable is never consulted. Removing the quotation marks is what would display the 3.')

# =========================================================================
# PY_FAM03_IDENTIFIER_VALIDITY — D1 x3, D2 x1
# =========================================================================
q('GB_PY_010', 'PY_FAM03_IDENTIFIER_VALIDITY', 'D1',
  'Which of these is a valid Python variable name?',
  'total_marks',
  ['2nd_mark', 'total-marks', 'total marks'],
  'Letters, digits and underscores are allowed, but a name cannot begin with a digit, a hyphen '
  'is read as subtraction, and a space separates two things rather than joining them.')

q('GB_PY_011', 'PY_FAM03_IDENTIFIER_VALIDITY', 'D1',
  'Which of these Python variable names would the language refuse?',
  '1count',
  ['count1', '_count', 'countOne'],
  'A digit may appear anywhere in a name except at the start, since a leading digit would make '
  'the name unreadable as a name. An underscore at the start is perfectly ordinary.')

q('GB_PY_012', 'PY_FAM03_IDENTIFIER_VALIDITY', 'D1',
  'A program assigns to Total and then reads total. What happens?',
  'They are two different names, so reading total fails unless it was assigned separately',
  ['They are the same name, so the value assigned is read back',
   'The program refuses to run, because two names differ only in case',
   'Python matches the name ignoring case and warns about it'],
  'Names are case-sensitive, so a capital letter makes a genuinely different name. Nothing warns '
  'about it, which is why this produces real bugs rather than a refusal to start.')

q('GB_PY_013', 'PY_FAM03_IDENTIFIER_VALIDITY', 'D2',
  'A program uses the names score, Score and SCORE. How many distinct variables are these?',
  'Three',
  ['One', 'Two', 'None; Python refuses names that differ only in case'],
  'Case is part of the name, so each spelling refers to its own variable. Assigning to one and '
  'reading another is legal and silent, which is exactly what makes the mistake hard to find.')

# =========================================================================
# PY_FAM04_ASSIGNMENT_TRACE — D2 (legacy), D3
# =========================================================================
q('GB_PY_014', 'PY_FAM04_ASSIGNMENT_TRACE', 'D2',
  'A program runs x = 5, then y = 2, then print(x + y). What is the output?',
  '7',
  ['3', '10', '52'],
  'Both names hold numbers, so + adds them and 7 is displayed. Subtracting would give 3, '
  'multiplying 10, and joining them as text 52 — but text is what quotation marks would have '
  'produced, and there are none.',
  provenance='LEGACY_KEEP', source='6a6e81')

q('GB_PY_015', 'PY_FAM04_ASSIGNMENT_TRACE', 'D3',
  'A program runs value = 10, then value = "ten", then print(value). What is the output?',
  'ten',
  ['10', 'An error, because a name cannot change from a number to text',
   '10ten'],
  'Assigning to a name again simply replaces what it refers to, and Python places no restriction '
  'on the new value being a different type. Nothing is combined and nothing is refused.')

# =========================================================================
# PY_FAM05_STRING_INDEXING — D2, D3
# =========================================================================
q('GB_PY_016', 'PY_FAM05_STRING_INDEXING', 'D2',
  'A program runs s = "python" and then print(s[0]). What is the output?',
  'p',
  ['y', 'n', 'python'],
  'Positions are counted from zero, so position 0 is the first character. Counting from one would '
  'give the second character instead.')

q('GB_PY_017', 'PY_FAM05_STRING_INDEXING', 'D3',
  'A program runs s = "python" and then print(s[1:4]). What is the output?',
  'yth',
  ['ytho', 'pyth', 'yt'],
  'A slice starts at the first position and stops before the second, so positions 1, 2 and 3 are '
  'taken and position 4 is not. Treating the end as included would give one character too many.')

# =========================================================================
# PY_FAM06_STRING_METHOD_RESULT — D2 (legacy, key corrected), D3
# =========================================================================
q('GB_PY_018', 'PY_FAM06_STRING_METHOD_RESULT', 'D2',
  'A program runs x = "Hi" and then print(x.lower()). What is the output?',
  'hi',
  ['HI', 'Hi', 'An error, because a string cannot be changed'],
  'The method returns a new string with every letter in lower case, so the output is hi. Nothing '
  'is changed in place — x still holds "Hi" afterwards — and asking for lower case cannot produce '
  'upper case.',
  provenance='LEGACY_REWRITE', source='6f6039')

q('GB_PY_019', 'PY_FAM06_STRING_METHOD_RESULT', 'D3',
  'A program runs name = "Ada", then name.upper(), then print(name). What is the output?',
  'Ada',
  ['ADA', 'ada', 'An error, because the result of upper was not stored'],
  'The method builds and returns a new string, and here that new string is discarded because '
  'nothing was assigned to. The original is untouched, which is the whole point: calling a string '
  'method without keeping its result changes nothing.')

# =========================================================================
# PY_FAM07_LIST_MUTATION — D2, D3 (legacy), D4
# =========================================================================
q('GB_PY_020', 'PY_FAM07_LIST_MUTATION', 'D2',
  'A program runs nums = [4, 5, 6] and then nums[0] = 9, then print(nums). What is the output?',
  '[9, 5, 6]',
  ['[4, 5, 9]', '[9, 4, 5, 6]', 'An error, because a list cannot be changed after it is created'],
  'Position 0 is the first item, and assigning to it replaces that item in place without changing '
  'the length. Lists are designed to be changed this way.')

q('GB_PY_021', 'PY_FAM07_LIST_MUTATION', 'D3',
  'A program runs x = [1, 2], then x.append(3), then print(len(x)). What is the output?',
  '3',
  ['2', '4', '6'],
  'Appending adds one item, so a list of two becomes a list of three and its length reports 3. '
  'Answering 2 reports the length before the append.',
  provenance='LEGACY_KEEP', source='66b937')

q('GB_PY_022', 'PY_FAM07_LIST_MUTATION', 'D4',
  'A program runs a = [1, 2, 3], then b = a, then b.append(4), then print(a). The list a was '
  'never appended to directly. What is the output?',
  '[1, 2, 3, 4]',
  ['[1, 2, 3]', '[4, 1, 2, 3]', 'An error, because a was not the list that was changed'],
  'Assigning a list to a second name does not copy it; both names refer to the same list, so a '
  'change made through one is visible through the other. That a was never touched directly is '
  'exactly why this surprises people.',
  evidence='The list a was never appended to directly')

# =========================================================================
# PY_FAM08_INPUT_TYPE — D2, D3, D4
# =========================================================================
q('GB_PY_023', 'PY_FAM08_INPUT_TYPE', 'D2',
  'A program runs age = input() and the person types 30. What type does age hold?',
  'str',
  ['int', 'float', 'It depends on what was typed'],
  'input always hands back a string, whatever was typed into it, because the program has no way '
  'of knowing what kind of value was intended. Converting it is a separate step.')

q('GB_PY_024', 'PY_FAM08_INPUT_TYPE', 'D3',
  'A program runs a = input(), then b = input(), then print(a + b). The person types 10 and then '
  '5. What is the output?',
  '105',
  ['15', '5', 'An error, because the values were not converted'],
  'Both values are strings, so + joins them end to end rather than adding them. Nothing illegal '
  'happens, which is why the program runs and quietly gives an answer nobody wanted.')

q('GB_PY_025', 'PY_FAM08_INPUT_TYPE', 'D4',
  'A program compares a typed value against a number with age > 18 and stops with an error, '
  'although the person typed 25 and the program never reached the comparison with anything empty. '
  'What is wrong?',
  'The typed value is a string, and a string cannot be compared with a number using >',
  ['25 is not greater than 18, so the comparison failed',
   'input reads only whole numbers, and 25 was rejected',
   'The comparison needs brackets around it'],
  'That something was typed and the value is not empty rules out a missing input; what is left is '
  'the type. Ordering a string against a number has no defined meaning in Python, so it refuses '
  'rather than guessing.',
  evidence='the person typed 25 and the program never reached the comparison with anything empty')

# =========================================================================
# PY_FAM09_CONVERSION_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_PY_026', 'PY_FAM09_CONVERSION_BEHAVIOUR', 'D2',
  'What does int("42") produce?',
  'The number 42',
  ['The string "42", unchanged', 'The number 42.0', 'An error, because quotes cannot be removed'],
  'The text spells a whole number, so the conversion succeeds and produces an int. Converting is '
  'reading the text as a number, not stripping the quotation marks.')

q('GB_PY_027', 'PY_FAM09_CONVERSION_BEHAVIOUR', 'D3',
  'What does int("3.5") produce?',
  'An error, because the text does not spell a whole number',
  ['3, with the fractional part discarded', '4, rounded to the nearest whole number', '3.5'],
  'An error, because the text does not spell a whole number: int reads text spelling a whole '
  'number and refuses anything else, a decimal point included. Truncation happens when a float '
  'is converted, not when text containing a point is read — float("3.5") passed to int gives 3.')

q('GB_PY_028', 'PY_FAM09_CONVERSION_BEHAVIOUR', 'D4',
  'A program converts typed values with int and works for months, then stops with an error one '
  'day. The input file it was given that day is not empty and contains no letters. What is the '
  'most likely cause?',
  'A value written with a decimal point, which int refuses even though it spells a number',
  ['A value that is too large for an int',
   'A value of zero, which int cannot represent',
   'A negative value, which int refuses without a sign being declared'],
  'Emptiness and letters are ruled out by the stem, so what remains is text that looks numeric '
  'and still is not a whole number. Zero and negatives convert perfectly well, and Python places '
  'no small ceiling on an int.',
  evidence='The input file it was given that day is not empty and contains no letters')

# =========================================================================
# PY_FAM10_DIVISION_OPERATORS — D2 (legacy), D3, D4
# =========================================================================
q('GB_PY_029', 'PY_FAM10_DIVISION_OPERATORS', 'D2',
  'A program runs print(10 // 3). What is the output?',
  '3',
  ['3.33', '1', '0'],
  'Whole-number division reports how many times 3 fits into 10 and discards what is left over. '
  'The 1 that remains is what the remainder operator would give instead.',
  provenance='LEGACY_KEEP', source='6893dc')

q('GB_PY_030', 'PY_FAM10_DIVISION_OPERATORS', 'D3',
  'A program runs print(9 / 2) and then print(9 % 2). What do the two lines produce, in order, '
  'and of what types?',
  '4.5 as a float, then 1 as an int',
  ['4 as an int, then 1 as an int',
   '4.5 as a float, then 0.5 as a float',
   '4 as an int, then 4.5 as a float'],
  'In Python a single slash always produces a float, even when the division comes out even, and '
  'the remainder of two ints is an int. Expecting a whole number from / is the habit brought '
  'across from languages where it truncates.')

q('GB_PY_031', 'PY_FAM10_DIVISION_OPERATORS', 'D4',
  'A program uses // to work out how many full groups a total makes. For 9 and 4 it gives 2, as '
  'expected. For -9 and 4 it gives -3 rather than -2. What accounts for this?',
  '// always moves down to the next whole number below the exact result, which for a negative '
  'result is further from zero',
  ['// is not defined for negative values, so the result cannot be relied on',
   'The minus sign was applied after the division rather than before',
   '// rounds to the nearest whole number, and -2.25 rounds to -3'],
  'The exact result is -2.25, and moving down gives -3. Rounding to nearest would give -2, so the '
  'two rules disagree here while agreeing on the positive case — which is why only the negative '
  'case reveals which rule is in force.',
  evidence='For -9 and 4 it gives -3 rather than -2')

# =========================================================================
# PY_FAM11_TRUTHINESS — D3, D4
# =========================================================================
q('GB_PY_032', 'PY_FAM11_TRUTHINESS', 'D3',
  'A program runs items = [] and then tests if items:. Does the body run?',
  'No, because an empty list counts as false in a condition',
  ['Yes, because items exists and has been assigned',
   'No, because testing a list rather than a comparison is an error',
   'Yes, because a list is always true once it has been created'],
  'Emptiness is what decides truth for a sequence, not whether the name exists. Testing a '
  'non-boolean is entirely legal, which is what makes this a habit worth having.')

q('GB_PY_033', 'PY_FAM11_TRUTHINESS', 'D4',
  'A program guards a calculation with if count: and the calculation is skipped for one record. '
  'The variable count was definitely assigned, and no error was reported. What was its value?',
  'Zero, which counts as false even though the name holds a value',
  ['An empty string, which is the only value that can be skipped this way',
   'The text "False", which Python reads as false',
   'It was never assigned, whatever the stem says'],
  'The stem rules out both a missing name, which would have raised an error, and any failure. '
  'Zero is false while still being a perfectly good value. The string "False" is non-empty and '
  'therefore true, which is the trap in reading text as though it were a bool.',
  evidence='The variable count was definitely assigned, and no error was reported')

# =========================================================================
# PY_FAM12_INDEX_ERROR_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_PY_034', 'PY_FAM12_INDEX_ERROR_DIAGNOSIS', 'D3',
  'A list holds 5 items. A program reads position 5 from it and fails. What was the largest '
  'position it could have read?',
  '4',
  ['5', '6', 'It depends on what the items are'],
  'Positions run from 0, so a list of 5 items occupies positions 0 to 4 and position 5 is one '
  'past the end. Using the length itself as a position is the commonest way to run off a '
  'sequence.')

q('GB_PY_035', 'PY_FAM12_INDEX_ERROR_DIAGNOSIS', 'D4',
  'A loop reads every position of a list and fails on the very last pass. The list is not empty '
  'and every item in it is valid. What is wrong?',
  'The loop runs one pass too many, reaching the position equal to the length',
  ['One of the items is of a type that cannot be read',
   'The list changed length while the loop was running',
   'The loop starts at position 1 instead of 0'],
  'Failing only on the last pass, with the data itself sound, points at the bound rather than the '
  'contents. Starting at 1 would fail immediately or skip an item rather than overrun, and a '
  'sound list rules out a bad value.',
  evidence='The list is not empty and every item in it is valid')

# =========================================================================
# PY_FAM13_MULTI_STEP_TRACE — D3 (legacy), D4 (legacy, deepened), D5 x3
# =========================================================================
q('GB_PY_036', 'PY_FAM13_MULTI_STEP_TRACE', 'D3',
  'A program runs total = 0, then for n in [2, 3, 4]: total += n, then print(total). What is the '
  'output?',
  '9',
  ['4', '7', '24'],
  'Each pass adds the next value to the running total, so 0 becomes 2, then 5, then 9. Answering '
  '4 reports the last value rather than the total, and 24 multiplies where the code adds.',
  provenance='LEGACY_KEEP', source='6d8594')

q('GB_PY_037', 'PY_FAM13_MULTI_STEP_TRACE', 'D4',
  'A program runs count = 0, then for n in [4, 7, 2, 9]: if n > 4: count += 1, then print(count). '
  'It outputs 2, but the intention was to count values of 4 or more. The list and the increment '
  'are both correct. What is wrong?',
  'The comparison excludes 4 itself, so one qualifying value is not counted',
  ['The counter is increased in the wrong place',
   'The counter should have started at 1',
   'The list is being read in the wrong order'],
  'Two of the four values exceed 4 and three are 4 or more, so an output of 2 is exactly what a '
  'strict comparison produces. With the data and the increment ruled out, the boundary in the '
  'condition is what remains.',
  provenance='LEGACY_REWRITE', source='693213',
  evidence='The list and the increment are both correct')

q('GB_PY_038', 'PY_FAM13_MULTI_STEP_TRACE', 'D5',
  'A program runs for i in range(2, 9, 3): print(i). The three arguments give a start, a stop and '
  'a step. What is the output?',
  '2, then 5, then 8',
  ['2, then 5, then 8, then 11', '2, then 4, then 6, then 8', '3, then 6, then 9'],
  'Counting from 2 in steps of 3 gives 2, 5 and 8; the next would be 11, which is not below the '
  'stop and so never appears. The stop is a limit that is not itself reached, exactly as with a '
  'single argument.',
  provenance='LEGACY_REWRITE', source='67576e',
  mode='TRANSFER', hinge='The three arguments give a start, a stop and a step')

q('GB_PY_039', 'PY_FAM13_MULTI_STEP_TRACE', 'D5',
  'A program runs total = 0, then for n in [5, 0, 3]: if n: total += 10 // n, then print(total). '
  'What is the output?',
  '5',
  ['An error, because of the division by zero', '8', '13'],
  'The condition treats 0 as false, so the middle value is skipped and never divides. Two passes '
  'contribute 2 and 3, giving 5. The guard is what keeps a division by zero from ever happening.',
  mode='EDGE', hinge='for n in [5, 0, 3]: if n: total += 10 // n')

q('GB_PY_040', 'PY_FAM13_MULTI_STEP_TRACE', 'D5',
  'A program runs found = False, then for n in [3, 8, 5]: if n > 6: found = True, then '
  'print(found). Would replacing the loop with one that stops as soon as it sets found change the '
  'printed result, and what would it change?',
  'The printed result would be the same; only the number of values examined would fall',
  ['The printed result would become False, because stopping early misses later values',
   'The printed result would be the same and nothing at all would change',
   'The program would fail, because a loop cannot be stopped part way'],
  'Once found has been set, no later value can unset it, so the answer is already settled and the '
  'remaining passes only cost time. Recognising when early exit is safe is a different question '
  'from whether it is possible.',
  mode='TRADEOFF', hinge='replacing the loop with one that stops as soon as it sets found')

# =========================================================================
# PY_FAM14_EMPTY_SEQUENCE — D4 x2, D5 x4
# =========================================================================
q('GB_PY_041', 'PY_FAM14_EMPTY_SEQUENCE', 'D4',
  'A program sums a list and prints the total. Given an empty list it prints 0 and reports '
  'nothing. Is that a failure?',
  'No; the loop runs zero times and the total keeps the value it was given before the loop',
  ['Yes; summing nothing should have raised an error',
   'Yes; the total was never assigned, so 0 came from nowhere',
   'No; Python substitutes 0 whenever a loop has nothing to work on'],
  'A loop over an empty sequence simply does not run, so whatever the total was initialised to is '
  'what gets printed. Nothing is substituted on the programmer\'s behalf; the 0 was written into '
  'the code.',
  evidence='Given an empty list it prints 0 and reports nothing')

q('GB_PY_042', 'PY_FAM14_EMPTY_SEQUENCE', 'D4',
  'A program averages a list by dividing its total by its length. Given an empty list it stops '
  'with an error, while the summing program given the same list finished quietly. What accounts '
  'for the difference?',
  'The average divides by a length of zero, which fails, whereas summing nothing simply adds '
  'nothing',
  ['The average reads the first item, which does not exist',
   'An empty list cannot have its length taken',
   'The two programs were given different lists despite appearances'],
  'Both loops run zero times, so both totals are 0; only one of them then divides by 0. The '
  'length of an empty list is perfectly well defined — it is 0, which is exactly the problem.',
  evidence='the summing program given the same list finished quietly')

q('GB_PY_043', 'PY_FAM14_EMPTY_SEQUENCE', 'D5',
  'A program finds the largest value by setting best to the first item and comparing the rest '
  'against it. What happens when the list is empty?',
  'It fails at the point where it takes the first item',
  ['It prints 0', 'It prints nothing and ends normally',
   'It prints the smallest number Python can represent'],
  'The approach needs something to start from, and an empty list offers nothing. No default '
  'appears from anywhere — a starting value would have to be written into the code deliberately, '
  'and choosing one is its own decision.',
  mode='EDGE', hinge='What happens when the list is empty')

q('GB_PY_044', 'PY_FAM14_EMPTY_SEQUENCE', 'D5',
  'A program counts how many items of a list are longer than three characters. What does it '
  'produce for an empty list?',
  '0, which is correct and needs no special case',
  ['An error, because there is nothing to measure',
   'Nothing at all, because the print is inside the loop',
   'An error, because the counter was never used'],
  'Counting nothing gives zero, and the counter was initialised before the loop, so the answer is '
  'right without any extra handling. Not every empty-input case needs a guard, and adding one '
  'here would only be more code to get wrong.',
  mode='EDGE', hinge='What does it produce for an empty list')

q('GB_PY_045', 'PY_FAM14_EMPTY_SEQUENCE', 'D5',
  'A program joins the items of a list into one string separated by commas. On an empty list, '
  'which outcome would you expect and why?',
  'An empty string, because there is nothing to place between separators',
  ['A single comma, because one separator is always written',
   'An error, because a separator needs something on both sides',
   'The word None, because nothing was produced'],
  'Separators go between items, so a list of nothing needs none and the result is simply empty. '
  'The rule generalises: one item gives no separators, two give one, and none give none.',
  mode='TRANSFER', hinge='joins the items of a list into one string separated by commas')

q('GB_PY_046', 'PY_FAM14_EMPTY_SEQUENCE', 'D5',
  'A program will be given lists that are usually full but occasionally empty. One version guards '
  'against emptiness before doing anything; another lets the empty case fall through and fails '
  'when it does. Which is preferable, and what does the choice cost?',
  'The guarded version, because an empty list is a real case rather than a fault, and the cost is '
  'one check on every call',
  ['The unguarded version, because failing loudly is always better than continuing',
   'Neither; the two behave identically on the lists that actually arrive',
   'The unguarded version, because a guard hides a problem that should be fixed upstream'],
  'An input the program is expected to receive is not an error, and treating it as one turns '
  'ordinary data into a crash. The guard costs a comparison each time, which is the price of '
  'handling a case that will certainly arrive.',
  mode='TRADEOFF', hinge='lists that are usually full but occasionally empty')

# =========================================================================
# PY_FAM15_EXPRESSION_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_PY_047', 'PY_FAM15_EXPRESSION_EQUIVALENCE', 'D4',
  'Two expressions, x / 2 and x // 2, were tried on several even positive values and agreed every '
  'time in what they displayed. Are they equivalent?',
  'No; they produce different types, and they differ in value as soon as x is odd',
  ['Yes; both halve the value',
   'No; they differ only when x is negative',
   'Yes for whole numbers, and the type is not a difference'],
  'Even positive values hide both differences at once: the quotient is exact, so truncation does '
  'nothing, and a float that prints as a round number looks like an int. An odd value separates '
  'them in value, and the type differs even when the value does not.',
  evidence='were tried on several even positive values and agreed every time')

q('GB_PY_048', 'PY_FAM15_EXPRESSION_EQUIVALENCE', 'D5',
  'Are the conditions x != 0 and x tested as a truth value equivalent for every possible x?',
  'No; they agree for numbers, but an empty string or empty list is false while also being '
  'different from 0',
  ['Yes; both ask whether x holds something',
   'No; they differ for negative numbers',
   'Yes for every value except None'],
  'For numbers the two coincide exactly. Widen the type and they part company: an empty container '
  'is not equal to 0, so the first says true, while emptiness makes the second say false. '
  'Equivalence is always a claim about a range of inputs.',
  mode='TRANSFER', hinge='equivalent for every possible x')

q('GB_PY_049', 'PY_FAM15_EXPRESSION_EQUIVALENCE', 'D5',
  'Are the expressions x * 0.5 and x // 2 equivalent when x is a non-negative whole number?',
  'No; for odd values the first keeps the half and the second discards it',
  ['Yes; both halve a whole number',
   'No; they differ only when x is zero',
   'Yes; the results differ in type but never in value'],
  'For even values both give the same number, which is why casual testing agrees. An odd value '
  'separates them: one produces a value ending in .5 and the other moves down to a whole number. '
  'Zero is the one value where absolutely nothing distinguishes them.',
  mode='EDGE', hinge='when x is a non-negative whole number')

q('GB_PY_050', 'PY_FAM15_EXPRESSION_EQUIVALENCE', 'D5',
  'Two expressions agree for every input a program will ever be given, but one calls a function '
  'three times and the other stores that function\'s result and reuses it. On what grounds should '
  'the choice be made?',
  'On cost and on whether the function could give a different answer each time it is called',
  ['On neither; agreeing on every input makes them interchangeable',
   'On which is shorter to write',
   'On calling three times, since repeating the call guards against a wrong result'],
  'Equal results settle correctness and leave everything else open. Repetition costs time, and '
  'reuse is only safe if the function would answer identically each time — a function reading a '
  'clock or a file would not, and there the two are not equivalent at all.',
  mode='TRADEOFF', hinge='one calls a function three times and the other stores that function\'s '
                         'result and reuses it')
