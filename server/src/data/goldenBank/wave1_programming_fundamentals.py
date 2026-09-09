# -*- coding: utf-8 -*-
"""
Wave 1 — PROGRAMMING_FUNDAMENTALS, 50 Golden Bank questions.

6 come from the existing bank (2 kept, 2 rewritten, 2 remapped from other skills) and 44 are new.
Every item names a family and difficulty that the frozen blueprint allocates.

TWO PHASE-2 KEEPS ARE REWRITTEN HERE, NOT USED AS THEY STAND. 71d550 and 73aff5 measure the right
facts, but each offered a value and two numbers nobody would pick. Asking instead what BOTH
variables hold turns all three wrong options into the misconceptions the blueprint names — read
right to left, both names changed, the values exchanged. The measurement is unchanged; the item
now discriminates.
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
# PGF_FAM01_ASSIGNMENT_DIRECTION — D1 x4, D2 x1(legacy)
# =========================================================================
q('GB_PGF_001', 'PGF_FAM01_ASSIGNMENT_DIRECTION', 'D1',
  'A program contains the single line: count = 7. Which name changes, and what does it hold '
  'afterwards?',
  'count changes, and it holds 7',
  ['7 changes, and it holds count',
   'Both count and 7 change',
   'Nothing changes; the line states that count and 7 are equal'],
  'Assignment stores the value on the right into the name on the left, so only count changes. '
  'The line is an instruction to store something, not a claim that two things are equal.')

q('GB_PGF_002', 'PGF_FAM01_ASSIGNMENT_DIRECTION', 'D1',
  'A program contains the single line: total = price. What is true immediately afterwards?',
  'total holds whatever value price held',
  ['price holds whatever value total held',
   'total and price are linked, so changing either one changes the other',
   'The line is only correct if total and price already held the same value'],
  'The value travels from the right-hand name into the left-hand one, and the copy is finished '
  'the moment the line ends. Nothing links the two afterwards, and nothing about the line has to '
  'be true beforehand.')

q('GB_PGF_003', 'PGF_FAM01_ASSIGNMENT_DIRECTION', 'D1',
  'A program contains the line: n = n + 1. How can such a line be valid?',
  'The value in n is read, one is added to it, and the result is stored back into n',
  ['It cannot be valid, because a value cannot equal itself plus one',
   'It sets n to 1',
   'It creates a second variable, also called n'],
  'The right-hand side is worked out first, using the value n holds at that moment; only then is '
  'the result stored back. Read as a claim of equality the line would indeed be impossible, which '
  'is exactly why the difference matters.')

q('GB_PGF_004', 'PGF_FAM01_ASSIGNMENT_DIRECTION', 'D1',
  'A program runs x = 2 and then x = 9. What does x hold, and what became of the 2?',
  'x holds 9, and the 2 was replaced',
  ['x holds 2, and the second line was ignored',
   'x holds both 2 and 9',
   'x holds 11, because the two values were combined'],
  'A name holds one value at a time, and storing a new one discards what was there. Nothing '
  'accumulates and nothing is kept alongside.')

q('GB_PGF_005', 'PGF_FAM01_ASSIGNMENT_DIRECTION', 'D2',
  'A program runs three lines in order: A = 1, then B = 2, then A = B. What do A and B hold at '
  'the end?',
  'A holds 2 and B holds 2',
  ['A holds 1 and B holds 1',
   'A holds 1 and B holds 2',
   'A holds 2 and B holds 1'],
  'The third line copies B into A, so A becomes 2 and B is untouched. Reading it right to left '
  'would give the opposite, treating it as an exchange would swap them, and treating it as a '
  'statement about equality would leave both alone.',
  provenance='LEGACY_REWRITE', source='71d550')

# =========================================================================
# PGF_FAM02_LITERAL_TYPE — D1 x3, D2 x1
# =========================================================================
q('GB_PGF_006', 'PGF_FAM02_LITERAL_TYPE', 'D1',
  'In a program, a value is written as "5", with the quotation marks. What type of value is it?',
  'Text',
  ['A whole number', 'A decimal number', 'A true-or-false value'],
  'The quotation marks are what make it text; the character between them happens to be a digit, '
  'which changes nothing. Written as 5 without quotes it would be a whole number.')

q('GB_PGF_007', 'PGF_FAM02_LITERAL_TYPE', 'D1',
  'Which of these values is written as text?',
  '"42"',
  ['42', '42.0', 'True'],
  'Only the quoted one is text. The other three are a whole number, a decimal number and a '
  'true-or-false value — different types from each other, but none of them text.')

q('GB_PGF_008', 'PGF_FAM02_LITERAL_TYPE', 'D1',
  'Which of these values is not a number?',
  '"7"',
  ['7', '7.0', '-7'],
  'Digits inside quotation marks are text, and text cannot be used in arithmetic without being '
  'converted first. A whole number, a decimal number and a negative number are all still numbers.')

q('GB_PGF_009', 'PGF_FAM02_LITERAL_TYPE', 'D2',
  'A program runs x = "5" and y = 5. Which statement is correct?',
  'x holds text and y holds a number, so the two are different types',
  ['Both hold the number 5',
   'Both hold text',
   'x holds 5 and y holds "5", because the quotation marks are removed when a value is stored'],
  'What is written decides the type, and the quotation marks are part of what is written, not '
  'punctuation that gets stripped away. The two names hold values that look alike and behave '
  'completely differently.')

# =========================================================================
# PGF_FAM03_SINGLE_OUTPUT — D1 x3, D2 x1
# =========================================================================
q('GB_PGF_010', 'PGF_FAM03_SINGLE_OUTPUT', 'D1',
  'A program runs label = "ready" and then print(label). What appears?',
  'ready',
  ['label', '"ready"', 'Nothing, because label was only stored and not calculated'],
  'The name is replaced by the value it holds, and the quotation marks are part of how the text '
  'was written rather than part of the text. Printing the name itself would need it quoted.')

q('GB_PGF_011', 'PGF_FAM03_SINGLE_OUTPUT', 'D1',
  'A program runs x = 4, then x = 9, then print(x). What appears?',
  '9',
  ['4', '13', '49'],
  'Printing shows what the name holds at the moment the line runs, which is the most recent value '
  'stored in it. Earlier values are gone, not remembered or combined.')

q('GB_PGF_012', 'PGF_FAM03_SINGLE_OUTPUT', 'D1',
  'A program runs print("total"). What appears?',
  'total',
  ['The value stored in a variable called total',
   '"total"',
   'Nothing, because total was never given a value'],
  'Quotation marks mean the text itself is being printed, so no variable is involved and none '
  'needs to exist. Without the quotes the line would print the value of a variable named total.')

q('GB_PGF_013', 'PGF_FAM03_SINGLE_OUTPUT', 'D2',
  'A line prints the value a variable holds. What else does that line change?',
  'Nothing; printing displays a value and leaves everything as it was',
  ['It clears the variable, since the value has now been used',
   'It stores the printed text back into the variable',
   'It converts the variable to text permanently'],
  'Output is a one-way operation: it reports what is there and alters nothing. A variable can be '
  'printed any number of times and still hold the same value afterwards.')

# =========================================================================
# PGF_FAM05_EXPRESSION_EVALUATION — D2, D3
# =========================================================================
q('GB_PGF_014', 'PGF_FAM05_EXPRESSION_EVALUATION', 'D2',
  'A program runs x = 7 / 2. What does x hold?',
  'The decimal number 3.5',
  ['The whole number 3',
   'The text "3.5"',
   'The expression 7 / 2, worked out only when x is printed'],
  'The right-hand side is worked out immediately and the single value it produces is what gets '
  'stored. Ordinary division keeps the fractional part, and the result is a number rather than '
  'text.')

q('GB_PGF_015', 'PGF_FAM05_EXPRESSION_EVALUATION', 'D3',
  'A program runs print(4 + 5.0). What is produced, and of what type?',
  '9.0, a decimal number',
  ['9, a whole number',
   '"45", text',
   'A failure, because a whole number and a decimal number cannot be added'],
  'Mixing a whole number with a decimal one is allowed, and the result carries the decimal type '
  'so that no part of the value can be lost. Addition on numbers never joins them as text.')

# =========================================================================
# PGF_FAM06_PRECEDENCE_REASONING — D2(legacy), D3, D4
# =========================================================================
q('GB_PGF_016', 'PGF_FAM06_PRECEDENCE_REASONING', 'D2',
  'A program runs print(6 + 2 * 2). What is produced?',
  '10',
  ['16', '8', '12'],
  'Multiplication is carried out before addition, so 2 * 2 is worked out first and 6 is added to '
  'it, giving 10. Working strictly left to right would give 16, which is the answer that shows '
  'precedence has not been applied.',
  provenance='LEGACY_REMAP', source='094b60')

q('GB_PGF_017', 'PGF_FAM06_PRECEDENCE_REASONING', 'D3',
  'A program runs print(10 - 2 * 3). What is produced?',
  '4',
  ['24', '30', '6'],
  'The multiplication happens first, and subtracting its result from 10 leaves 4. Working left to '
  'right would subtract before multiplying and give 24 instead.')

q('GB_PGF_018', 'PGF_FAM06_PRECEDENCE_REASONING', 'D4',
  'A programmer wants the sum of 2 and 3, doubled. They write print(2 + 3 * 2), and it produces 8 '
  'rather than 10. What single change gives the intended result?',
  'Bracket the addition, as (2 + 3) * 2',
  ['Bracket the multiplication, as 2 + (3 * 2)',
   'Write 3 + 2 * 2 instead',
   'Replace the multiplication with another addition'],
  'The output of 8 is the giveaway: 3 was doubled and 2 added, so the multiplication ran first. '
  'Brackets are what override that order. Bracketing the multiplication changes nothing, since '
  'that is already what happens.',
  evidence='it produces 8 rather than 10')

# =========================================================================
# PGF_FAM07_TYPE_DRIVEN_OPERATOR — D2, D3, D4
# =========================================================================
q('GB_PGF_019', 'PGF_FAM07_TYPE_DRIVEN_OPERATOR', 'D2',
  'A program runs print("5" + "5"). What is produced?',
  '55',
  ['10', 'A failure, because text cannot be added', '5 5'],
  'Both values are text, and the same symbol that adds numbers joins text end to end. No space is '
  'inserted, and nothing about the operation is illegal — which is what makes the result easy to '
  'miss.')

q('GB_PGF_020', 'PGF_FAM07_TYPE_DRIVEN_OPERATOR', 'D3',
  'A program runs a = 5, then b = "5", then print(a + b). What happens?',
  'It fails, because a number and a piece of text cannot be added together',
  ['It produces 10', 'It produces 55', 'It produces 5 5'],
  'Joining two pieces of text works and adding two numbers works, but combining one of each has '
  'no agreed meaning, so the program stops. Converting one of them first is what makes the line '
  'valid, and which conversion is chosen decides whether 10 or 55 comes out.')

q('GB_PGF_021', 'PGF_FAM07_TYPE_DRIVEN_OPERATOR', 'D4',
  'In one program a line using + produces 6, and in another a line using + produces 33. Both '
  'lines combine two values that are written with the digit 3. What distinguishes them?',
  'One added two numbers; the other joined two pieces of text',
  ['One used decimal numbers and the other whole numbers',
   'The second contains a fault that repeated the value',
   'The second converted its result to text after adding'],
  'The same symbol does different work depending on the types it is given, and 33 is the '
  'signature of text being joined rather than numbers being added. Nothing is broken in the '
  'second line; it is doing exactly what its types call for.',
  evidence='a line using + produces 6, and in another a line using + produces 33')

# =========================================================================
# PGF_FAM08_INPUT_CONVERSION — D2, D3, D4
# =========================================================================
q('GB_PGF_022', 'PGF_FAM08_INPUT_CONVERSION', 'D2',
  'A program reads a value typed in by the person using it. Before that value can be used in '
  'arithmetic, what has to happen?',
  'It has to be converted from text into a number',
  ['Nothing; typed digits arrive as numbers already',
   'It has to be printed first',
   'It has to be copied into a second variable'],
  'Whatever is typed arrives as text, digits included, because the program cannot know in advance '
  'what kind of thing was meant. Until it is converted, arithmetic on it either fails or does '
  'something quite different from what was intended.')

q('GB_PGF_023', 'PGF_FAM08_INPUT_CONVERSION', 'D3',
  'A program reads two values typed by the person and combines them with + without converting '
  'either. The person types 2 and then 3. What is produced?',
  '23',
  ['5', 'A failure, because the values were not converted', '2 3'],
  'Both values are text, so + joins them rather than adding them. Nothing illegal has happened, '
  'which is why the program runs happily and produces a result that is simply wrong.')

q('GB_PGF_024', 'PGF_FAM08_INPUT_CONVERSION', 'D4',
  'A program is meant to add two numbers typed by the person. Given 2 and 3 it produces 23, and '
  'it does not stop or report anything. Where is the fault?',
  'The values were never converted from text, so + joined them instead of adding them',
  ['The wrong arithmetic operator was used',
   'The values were printed before they were added',
   'Only one of the two values was actually read'],
  'That it produces something rather than failing is the clue that rules out a missing value or a '
  'broken operator: the line ran successfully. Joining two pieces of text is the one behaviour '
  'that turns 2 and 3 into 23.',
  evidence='Given 2 and 3 it produces 23, and it does not stop or report anything')

# =========================================================================
# PGF_FAM09_STATEMENT_ORDER — D2, D3, D4
# =========================================================================
q('GB_PGF_025', 'PGF_FAM09_STATEMENT_ORDER', 'D2',
  'Compare x = 5 followed by print(x) with print(x) followed by x = 5. Do the two orders behave '
  'the same?',
  'No; the second fails, because x has no value at the moment it is printed',
  ['Yes; both store 5 in x and print it',
   'No; the second prints 0',
   'Yes, provided x is used again later'],
  'Lines run in the order they are written, and a name cannot be read before anything has been '
  'stored in it. Nothing supplies a starting value of zero on the programmer\'s behalf.')

q('GB_PGF_026', 'PGF_FAM09_STATEMENT_ORDER', 'D3',
  'Compare a = 1 followed by b = 2 with b = 2 followed by a = 1. Do the two orders behave the '
  'same?',
  'Yes; neither line depends on the other',
  ['No; whichever variable is assigned first takes priority',
   'No; a has to exist before b can',
   'Only if a and b end up holding the same value'],
  'Order matters when one line uses something an earlier line produced, and here neither does. '
  'Recognising when reordering is harmless is as much part of the skill as recognising when it '
  'is not.')

q('GB_PGF_027', 'PGF_FAM09_STATEMENT_ORDER', 'D4',
  'A program sets a total to zero, adds several values to it, then prints it, and the answer is '
  'right. Moving the print above the additions makes it print 0 instead of failing. What does '
  'that tell you?',
  'The total already existed with a starting value of zero, so printing early shows that starting '
  'value',
  ['Printing a number that has not been used yet always shows 0',
   'The additions still ran, but their result arrived too late to be printed',
   'The two orders are equivalent, and the 0 is unrelated to the move'],
  'Printing early would fail outright if the name held nothing, so the fact that it printed at '
  'all shows a value was already there. What the move changed is when the value was read, not '
  'whether the additions happened.',
  evidence='Moving the print above the additions makes it print 0 instead of failing')

# =========================================================================
# PGF_FAM10_DIVISION_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_PGF_028', 'PGF_FAM10_DIVISION_BEHAVIOUR', 'D2',
  'A program runs print(7 / 2). What is produced?',
  '3.5',
  ['3', '1', '4'],
  'Ordinary division keeps the fractional part, so the result is 3.5. Discarding that part is '
  'what a separate whole-number division operator does, and 1 is what is left over rather than '
  'the result of dividing.')

q('GB_PGF_029', 'PGF_FAM10_DIVISION_BEHAVIOUR', 'D3',
  'A program runs print(7 // 2) and then print(7 % 2). What is produced by the two lines, in '
  'order?',
  '3 then 1',
  ['3.5 then 1', '1 then 3', '3 then 3.5'],
  'Whole-number division gives how many times 2 fits into 7, discarding what is left; the '
  'remainder operator gives what is left. They answer different questions about the same pair of '
  'numbers.')

q('GB_PGF_030', 'PGF_FAM10_DIVISION_BEHAVIOUR', 'D4',
  'A program splits a total into whole units with //. For 7 and 2 it gives 3, which is intended. '
  'For -7 and 2 it gives -4 rather than -3. What accounts for that?',
  'Whole-number division moves down to the next whole number below the exact answer, which for a '
  'negative result means further from zero',
  ['Whole-number division is undefined for negative values, so the result is meaningless',
   'The minus sign was applied after the division was carried out',
   'Whole-number division rounds to the nearest whole number, and -3.5 rounds to -4'],
  'The exact answer is -3.5, and the rule is to move down rather than towards zero, so the result '
  'is -4. Rounding to nearest would be a different rule that happens to agree here and disagree '
  'elsewhere, which is why the positive case alone cannot tell them apart.',
  evidence='For -7 and 2 it gives -4 rather than -3')

# =========================================================================
# PGF_FAM11_ERROR_CLASSIFICATION — D3(legacy), D4
# =========================================================================
q('GB_PGF_031', 'PGF_FAM11_ERROR_CLASSIFICATION', 'D3',
  'A program contains the line: if x = 5: print(x). In a language where a condition must be a '
  'comparison, what kind of failure is this, and when is it noticed?',
  'The program refuses to start; the mistake is caught before anything runs',
  ['The program runs and prints the wrong value; the mistake shows only in the output',
   'The program starts and then stops partway; the mistake is caught while it is running',
   'There is no failure; the line stores 5 in x and then treats that as the condition'],
  'A single = stores a value where the language requires a comparison, so the text of the program '
  'is not valid and nothing executes at all. The last option describes what some other languages '
  'genuinely do, which is what makes this worth distinguishing rather than memorising.',
  provenance='LEGACY_REMAP', source='c0d49c')

q('GB_PGF_032', 'PGF_FAM11_ERROR_CLASSIFICATION', 'D4',
  'A program runs from start to finish and prints an average of 0 for a list of positive numbers. '
  'Nothing is reported as an error. What kind of failure is this?',
  'A logic error: the program is wrong, but nothing about it is illegal',
  ['A syntax error, caught before the program ran',
   'A runtime error that was quietly dealt with',
   'Not a failure at all; a program that finishes and prints has done its job'],
  'Reaching the end and printing rules out both a program that could not start and one that '
  'stopped partway. What is left is code that is perfectly legal and does the wrong thing — the '
  'kind of failure nothing will report for you.',
  evidence='prints an average of 0 for a list of positive numbers. Nothing is reported as an error')

# =========================================================================
# PGF_FAM12_INITIALISATION_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_PGF_033', 'PGF_FAM12_INITIALISATION_DIAGNOSIS', 'D3',
  'A program adds up a list of values, but the line that sets the total to zero sits inside the '
  'repeated part rather than before it. What is printed at the end?',
  'Only the last value, because the total is reset on every pass',
  ['The correct total',
   'Zero, because the reset is the last thing to happen',
   'A failure, because the total is assigned more than once'],
  'Resetting inside the repetition throws away everything gathered so far, so each pass starts '
  'again and only the final addition survives. Assigning a variable repeatedly is entirely legal, '
  'which is why nothing complains.')

q('GB_PGF_034', 'PGF_FAM12_INITIALISATION_DIAGNOSIS', 'D4',
  'A program is meant to sum a list but prints the last value instead. The addition line is '
  'correct and the list is correct. What is wrong?',
  'The running total is set to zero inside the repeated part instead of before it',
  ['The addition should have been a multiplication',
   'The list is being read one item at a time',
   'The print happens inside the repeated part rather than after it'],
  'With the arithmetic and the data both eliminated, what is left is when the total is set up. '
  'Printing inside the repetition would show every intermediate value rather than one, so that '
  'does not fit the symptom either.',
  evidence='The addition line is correct and the list is correct')

# =========================================================================
# PGF_FAM13_MULTI_VARIABLE_TRACE — D3(legacy), D4, D5 x3
# =========================================================================
q('GB_PGF_035', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D3',
  'A program runs A = 5, then B = A, then A = 10. What do A and B hold at the end?',
  'A holds 10 and B holds 5',
  ['A holds 10 and B holds 10',
   'A holds 5 and B holds 5',
   'A holds 5 and B holds 10'],
  'The second line copies the value 5 into B, and the copy is finished as soon as that line ends. '
  'Changing A afterwards has no route back to B, because the two were never connected — only the '
  'value moved.',
  provenance='LEGACY_REWRITE', source='73aff5')

q('GB_PGF_036', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D4',
  'An attempt to exchange two values is written as a = b followed by b = a. Starting from a = 1 '
  'and b = 2, what results and why?',
  'Both hold 2; the first line overwrote a before its value had been saved anywhere',
  ['a holds 2 and b holds 1; the exchange worked',
   'Both hold 1; the second line overwrote b',
   'It fails, because a variable cannot be assigned twice'],
  'After the first line the original 1 exists nowhere, so the second line copies back the value '
  'that has just arrived. That is why an exchange needs somewhere to put the first value before '
  'it is overwritten.',
  evidence='Starting from a = 1 and b = 2')

q('GB_PGF_037', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D5',
  'Three variables hold a = 4, b = 6 and c = 9. The lines a = b, then b = c, then c = a run in '
  'that order. What do they hold at the end?',
  'a holds 6, b holds 9, c holds 6',
  ['a holds 6, b holds 9, c holds 4',
   'a holds 4, b holds 6, c holds 9',
   'a holds 9, b holds 4, c holds 6'],
  'Each line uses the values as they stand when it runs, not as they were at the start. By the '
  'time the last line reads a, a has already become 6, so the original 4 is lost and c ends up '
  'duplicating a rather than completing a rotation.',
  mode='TRANSFER', hinge='The lines a = b, then b = c, then c = a run in that order')

q('GB_PGF_038', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D5',
  'Two values are exchanged correctly using a third variable to hold one of them. What happens if '
  'that same code runs when both variables already hold the same value?',
  'It completes, and both still hold that value; exchanging two equal values changes nothing',
  ['It fails, because the third variable is never needed',
   'Both variables end up empty',
   'The value is lost, because the third variable overwrites both'],
  'The code does not inspect the values it moves, so it performs the same three copies regardless '
  'and the result happens to be indistinguishable from the start. An edge case that leaves the '
  'answer correct is worth recognising as such, rather than assumed to be a problem.',
  mode='EDGE', hinge='when both variables already hold the same value')

q('GB_PGF_039', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D5',
  'Two values must be exchanged, but no third variable may be used. Someone proposes a = a + b, '
  'then b = a - b, then a = a - b. Does it work, and what does it cost?',
  'It works for numbers, but only for numbers, and it depends on the intermediate sum being a '
  'value the type can hold',
  ['It works for values of any type, and costs nothing',
   'It does not work; the first line destroys a',
   'It works, and is always preferable to using a third variable'],
  'Arithmetic is what recovers each original value, so the trick is unavailable for anything that '
  'cannot be added and subtracted, and the combined value has to be representable along the way. '
  'The first line does not destroy a — it stores something from which both originals can still '
  'be recovered.',
  mode='TRADEOFF', hinge='but no third variable may be used')

# =========================================================================
# PGF_FAM14_EDGE_INPUT_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_PGF_040', 'PGF_FAM14_EDGE_INPUT_BEHAVIOUR', 'D4',
  'A program works out an average by dividing a total by a count. It behaved correctly on every '
  'list it was tried on, and then failed on one. Which input is the likely cause?',
  'A list with no items, making the count zero',
  ['A list with exactly one item',
   'A list containing a negative number',
   'A list whose values are all the same'],
  'Dividing by a count is safe until the count reaches zero, and a list with nothing in it is the '
  'only one of these that produces a zero count. One item, negatives and repeated values all '
  'divide perfectly well.',
  evidence='It behaved correctly on every list it was tried on, and then failed on one')

q('GB_PGF_041', 'PGF_FAM14_EDGE_INPUT_BEHAVIOUR', 'D5',
  'A program finds the largest value in a list by taking the first item and comparing it with the '
  'rest. What does it do when the list has no items at all?',
  'It fails at the point where it tries to take a first item that is not there',
  ['It prints zero',
   'It prints nothing and finishes normally',
   'It prints the smallest value the machine can represent'],
  'The approach assumes a starting value exists, and with nothing to start from there is nothing '
  'to compare or return. Neither zero nor a smallest possible value appears from anywhere; they '
  'would have to be written into the code deliberately.',
  mode='EDGE', hinge='when the list has no items at all')

q('GB_PGF_042', 'PGF_FAM14_EDGE_INPUT_BEHAVIOUR', 'D5',
  'A discount is applied by computing price - price * rate. What does this produce when the price '
  'is zero?',
  'Zero, which is correct and needs no special handling',
  ['A failure, because a discount cannot be applied to nothing',
   'A negative value',
   'The rate on its own'],
  'Both terms become zero, so the result is zero and the code is right without any extra case. '
  'Not every boundary value breaks something, and adding a special case here would only be code '
  'that can itself be wrong.',
  mode='EDGE', hinge='when the price is zero')

q('GB_PGF_043', 'PGF_FAM14_EDGE_INPUT_BEHAVIOUR', 'D5',
  'A count of items is divided by a number of groups, and that number of groups is itself worked '
  'out from the data rather than fixed. Ordinary data behaves. When does this break, and would '
  'anyone notice?',
  'When the computed number of groups comes out as zero; the program stops there, so it is noticed',
  ['When the count is zero; the answer is quietly wrong',
   'Never; division always produces some value',
   'When the count is smaller than the number of groups; the answer is quietly zero'],
  'A zero that is computed rather than written is the dangerous kind, because no one thought to '
  'guard against it — but dividing by it stops the program loudly. A count of zero divides '
  'perfectly well and gives zero, and whole-number division of a small count does give zero '
  'quietly, which is a wrong answer but not a break.',
  mode='EDGE', hinge='that number of groups is itself worked out from the data rather than fixed')

q('GB_PGF_044', 'PGF_FAM14_EDGE_INPUT_BEHAVIOUR', 'D5',
  'Given an input it was never designed for, one fragment stops immediately while another returns '
  'a wrong answer and keeps going. Which outcome is more dangerous, and on what grounds?',
  'The wrong answer, because nothing signals that anything went wrong and the value travels onwards',
  ['Stopping, because the program cannot continue at all',
   'They are equally serious, since both are incorrect',
   'The wrong answer, because it is harder to locate in the code'],
  'A program that stops announces its own limit, and whoever runs it finds out immediately. A '
  'wrong value announces nothing, gets used by whatever comes next, and may be discovered long '
  'after it has been acted on.',
  mode='TRADEOFF',
  hinge='one fragment stops immediately while another returns a wrong answer and keeps going')

# =========================================================================
# PGF_FAM15_FRAGMENT_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_PGF_045', 'PGF_FAM15_FRAGMENT_EQUIVALENCE', 'D4',
  'Two fragments both total a list. One starts from zero and adds every item; the other starts '
  'from the first item and adds the rest. They agreed on every list they were tried on. On what '
  'input do they differ?',
  'A list with no items; the second has no first item to start from',
  ['A list with exactly one item',
   'A list that contains a zero',
   'They never differ; the two are equivalent'],
  'Both approaches are sound on ordinary data and even agree on a single item, which is why '
  'testing did not separate them. The difference appears only where one of them assumes something '
  'the other does not — that at least one item exists.',
  evidence='They agreed on every list they were tried on')

q('GB_PGF_046', 'PGF_FAM15_FRAGMENT_EQUIVALENCE', 'D5',
  'One fragment tests x > 0 and another tests x >= 1. The values involved are whole numbers. Are '
  'the two equivalent?',
  'For whole numbers yes, but not once fractions are allowed, where a value such as 0.5 separates '
  'them',
  ['Yes, for every possible value',
   'No; they disagree when x is 1',
   'No; they disagree when x is 0'],
  'On whole numbers there is nothing between 0 and 1, so the two conditions select exactly the '
  'same values. Widen the type and the gap opens: 0.5 satisfies the first and fails the second. '
  'Equivalence is a claim about a set of inputs, not about the code alone.',
  mode='EDGE', hinge='The values involved are whole numbers')

q('GB_PGF_047', 'PGF_FAM15_FRAGMENT_EQUIVALENCE', 'D5',
  'One fragment doubles a value by writing x * 2, and another by writing x + x. Do they always '
  'agree?',
  'For numbers they agree, but where + joins text the second repeats the text while the first may '
  'not be allowed at all',
  ['Yes, always',
   'No; they disagree for negative numbers',
   'No; they disagree when the value is zero'],
  'Both fragments are about the operators, not the arithmetic, and the operators behave '
  'differently once the type changes. Negatives and zero are handled identically by both, which '
  'is exactly why testing with numbers alone would never reveal the difference.',
  mode='TRANSFER', hinge='another by writing x + x')

q('GB_PGF_048', 'PGF_FAM15_FRAGMENT_EQUIVALENCE', 'D5',
  'Two fragments give the same answer for every possible input, but one reads through the data '
  'twice and the other only once. Which is preferable, and on what grounds?',
  'The one that reads once, because when results are identical the remaining differences are what '
  'decide',
  ['The one that reads twice, because reading again confirms the result',
   'Neither; fragments that always agree are interchangeable in every respect',
   'The one that reads twice, because it is easier to follow'],
  'Equivalence settles correctness and nothing else, so cost becomes the deciding factor. Reading '
  'the same unchanged data a second time confirms nothing, and treating equivalent fragments as '
  'identical ignores everything that is not the answer.',
  mode='TRADEOFF', hinge='one reads through the data twice and the other only once')

# =========================================================================
# legacy items used as they stand
# =========================================================================
q('GB_PGF_049', 'PGF_FAM04_VARIABLE_STATE_TRACE', 'D2',
  'A program runs TOTAL = 10, then ADD = 5, then TOTAL = TOTAL + ADD. What is the final value of '
  'TOTAL?',
  '15',
  ['5', '10', '50'],
  'The last line reads the 10 that TOTAL holds, adds the 5 that ADD holds, and stores 15 back '
  'into TOTAL. Answering 10 stops one line early, answering 5 reports the wrong variable, and 50 '
  'combines them with the wrong operation.',
  provenance='LEGACY_KEEP', source='79de1b')

q('GB_PGF_050', 'PGF_FAM04_VARIABLE_STATE_TRACE', 'D3',
  'A program runs X = 7, then X = X + 1, then X = X + 1. What is the final value of X?',
  '9',
  ['7', '8', '10'],
  'Each of the two lines adds one to whatever X holds at that moment, so 7 becomes 8 and then 9. '
  'Answering 8 applies only the first, and 10 applies one increment too many.',
  provenance='LEGACY_KEEP', source='7b1a89')
