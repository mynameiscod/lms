# -*- coding: utf-8 -*-
"""
Wave 3 — C_BASICS, 50 Golden Bank questions.

6 come from the existing bank (1 kept, 4 rewritten, 1 remapped from DEBUGGING) and 44 are new.

THIS SKILL EXISTS TO MEASURE WHERE C DIFFERS FROM THE LANGUAGE TAUGHT FIRST, and the blueprint
says so family by family: a declaration needs a type, a whole-number division truncates rather
than rounding, an out-of-range array access is not reported at all. Items therefore turn on those
differences rather than on C syntax for its own sake.

OPERANDS ARE CHOSEN TO AVOID THE OTHER DIVISION FAMILIES IN THE BANK. PROGRAMMING_FUNDAMENTALS,
PYTHON_BASICS and this skill each carry a division family, so the same numbers in two of them
would be one question counted twice. The legacy item here used 10 and 3, which PYTHON_BASICS
already uses, so it is rewritten with different operands and a stem that turns on truncation
against rounding — which its original numbers could not distinguish.
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
# CC_FAM01_DECLARATION_RECOGNITION — D1 x4, D2 x1 (legacy)
# =========================================================================
q('GB_CC_001', 'CC_FAM01_DECLARATION_RECOGNITION', 'D1',
  'Which of these is a well-formed C declaration?',
  'int count;',
  ['count;', 'count = 0;', 'var count;'],
  'A C declaration states a type before the name. A bare name, or an assignment with no type, is '
  'valid in some other languages and not here.')

q('GB_CC_002', 'CC_FAM01_DECLARATION_RECOGNITION', 'D1',
  'A C program contains: int total = 5; total = 2.7; What type does total hold afterwards?',
  'int, still; the fractional part is discarded on assignment',
  ['double, because a fractional value was assigned',
   'int, and the program refuses to compile',
   'Whichever type the most recent assignment used'],
  'A name\'s type is fixed at its declaration and no assignment changes it. The value is converted '
  'to fit, silently losing the fraction, which is why nothing is reported.')

q('GB_CC_003', 'CC_FAM01_DECLARATION_RECOGNITION', 'D1',
  'What does the declaration int a, b; do?',
  'Declares two variables, both of type int',
  ['Declares one variable whose name is a, b',
   'Declares a as int and leaves b untyped',
   'Is not valid; each name needs its own declaration'],
  'One type may introduce several names separated by commas, and every name takes that type. '
  'Neither leaving one untyped nor requiring separate lines is the rule.')

q('GB_CC_004', 'CC_FAM01_DECLARATION_RECOGNITION', 'D1',
  'A C program uses the name total without any declaration of it anywhere. What happens?',
  'The program does not compile; C requires a declaration before use',
  ['The program runs and total starts at zero',
   'The program runs and total holds an unpredictable value',
   'The compiler infers the type from the first assignment'],
  'A missing declaration is caught before the program runs at all. That is different from a '
  'declared variable never assigned to, which does compile and does hold an unpredictable value.')

q('GB_CC_005', 'CC_FAM01_DECLARATION_RECOGNITION', 'D2',
  'A C program contains printf("%d", x) with no declaration of x. What is the problem?',
  'x must be declared, with a type, before it can be used',
  ['printf cannot print whole numbers',
   'The specifier should be %s for a variable',
   'Nothing; x is created by being used'],
  'Every name in C needs a declaration that fixes its type before any use of it. Being created on '
  'first use is how some other languages work and is exactly the habit this catches.',
  provenance='LEGACY_REMAP', source='bf982e')

# =========================================================================
# CC_FAM02_TYPE_CAPABILITY — D1 x3, D2 x1
# =========================================================================
q('GB_CC_006', 'CC_FAM02_TYPE_CAPABILITY', 'D1',
  'A variable is declared as int. Which value can it hold exactly?',
  '-40',
  ['2.5', '"hello"', "'a' and 'b' together"],
  'A whole-number type holds whole numbers, negative ones included. A fraction loses its '
  'fractional part, and text is a different kind of thing entirely.')

q('GB_CC_007', 'CC_FAM02_TYPE_CAPABILITY', 'D1',
  'A variable is declared as char. What can it hold?',
  'A single character',
  ['A word of any length', 'A whole number of any size', 'A fractional value'],
  'A char holds one character. Storing a word needs an array of them, which is why text in C is '
  'handled differently from a single letter.')

q('GB_CC_008', 'CC_FAM02_TYPE_CAPABILITY', 'D1',
  'A variable declared as int is given the value 3.9. What does it hold?',
  '3',
  ['3.9', '4', 'Nothing; the assignment is refused'],
  'Conversion into a whole-number type discards the fraction rather than rounding it, so 3.9 '
  'becomes 3. Nothing is reported, which is what makes the loss easy to miss.')

q('GB_CC_009', 'CC_FAM02_TYPE_CAPABILITY', 'D2',
  'A whole-number type is given a value far beyond the largest it can represent. What happens?',
  'The value wraps to something within range, and nothing is reported',
  ['The program stops with an error',
   'The type grows to accommodate the value',
   'The value is stored exactly, since whole numbers have no limit'],
  'A C whole-number type has a fixed size and therefore a fixed range, and exceeding it produces '
  'a value inside the range rather than a complaint. Assuming such types are unbounded is a habit '
  'brought from languages where they are.')

# =========================================================================
# CC_FAM03_OUTPUT_SPECIFIER — D1 x3 (2 legacy), D2 x1
# =========================================================================
q('GB_CC_010', 'CC_FAM03_OUTPUT_SPECIFIER', 'D1',
  'Which specifier prints a value declared as int?',
  '%d',
  ['%f', '%c', '%s'],
  'Each specifier names a type, and %d is the one for a whole number. Using the wrong one does '
  'not convert the value; it reads the same bytes as though they were a different type.',
  provenance='LEGACY_REWRITE', source='95dee9')

q('GB_CC_011', 'CC_FAM03_OUTPUT_SPECIFIER', 'D1',
  'A program declares int x = 5 and then calls printf("%f", x). What happens?',
  'It compiles and prints something meaningless; the mismatch is not corrected',
  ['It prints 5.000000, converting automatically',
   'It refuses to compile because the types differ',
   'It prints 5 and ignores the specifier'],
  'The specifier decides how the bytes are read, and nothing converts the value to match it. That '
  'a mismatch produces nonsense rather than an error is what makes it hard for a beginner to '
  'explain.',
  provenance='LEGACY_REWRITE', source='9540b2')

q('GB_CC_012', 'CC_FAM03_OUTPUT_SPECIFIER', 'D1',
  'Which of these pairs a value with a specifier that matches it?',
  'a double printed with %f',
  ['an int printed with %f', 'a char printed with %s', 'a double printed with %d'],
  'A specifier has to name the type it is given. %s expects text ending in a terminator rather '
  'than a single character, and the two remaining pairs each read a value as though it were a '
  'different type.')

q('GB_CC_013', 'CC_FAM03_OUTPUT_SPECIFIER', 'D2',
  'A program prints a double using %d and the output is a large unrelated number. The value stored '
  'is correct. What happened?',
  'The specifier read the value as though it were a whole number, so the bytes were interpreted '
  'wrongly',
  ['The value was corrupted when it was assigned',
   'The value was rounded to the nearest whole number',
   'printf converted the value and lost precision'],
  'The stored value is fine and the reading of it is not — a specifier is an instruction about '
  'interpretation, not a request to convert. Rounding would have produced a plausible number '
  'rather than an unrelated one.')

# =========================================================================
# CC_FAM04_UNINITIALISED_BEHAVIOUR — D2, D3
# =========================================================================
q('GB_CC_014', 'CC_FAM04_UNINITIALISED_BEHAVIOUR', 'D2',
  'A C program declares int total; and prints it without assigning anything. What is printed?',
  'Whatever happened to be in that memory — an unpredictable value',
  ['0', 'Nothing', 'An error message about an unassigned variable'],
  'Declaring reserves space and does not clear it, so the variable holds whatever was there. '
  'Assuming zero is the belief that makes accumulator faults invisible.')

q('GB_CC_015', 'CC_FAM04_UNINITIALISED_BEHAVIOUR', 'D3',
  'A program that sums values into an undeclared starting total gives a different answer on '
  'different runs. What accounts for that?',
  'The total began at whatever was in memory, which differs from run to run',
  ['The values being summed differ from run to run',
   'The addition is unreliable in C',
   'The compiler optimises the loop differently each time'],
  'An unassigned variable does not merely hold a wrong value; it holds an unpredictable one, so '
  'the same data gives different answers. That variability is the signature of an initialisation '
  'fault rather than an arithmetic one.')

# =========================================================================
# CC_FAM05_INTEGER_DIVISION — D2 (legacy), D3
# =========================================================================
q('GB_CC_016', 'CC_FAM05_INTEGER_DIVISION', 'D2',
  'A C program prints the result of 17 / 5, where both values are whole numbers. What is printed?',
  '3',
  ['3.4', '4', '2'],
  'Dividing two whole numbers gives a whole number with the remainder discarded, so 3.4 becomes '
  '3. Rounding would give 4, which is why an operand pair whose fraction exceeds a half is what '
  'separates the two rules.',
  provenance='LEGACY_REWRITE', source='8fb0c3')

q('GB_CC_017', 'CC_FAM05_INTEGER_DIVISION', 'D3',
  'A C program computes 9 / 2 and stores the result in a double. What does the double hold?',
  '4.0, because the division truncated before the value was stored',
  ['4.5, because the destination is a fractional type',
   '4, and the type of the destination is irrelevant',
   '5.0, because the result is rounded on conversion'],
  'The division happens first, between two whole numbers, and produces 4; storing that in a '
  'fractional type gives 4.0. What is lost before the assignment cannot be recovered by the '
  'assignment.')

# =========================================================================
# CC_FAM06_MIXED_ARITHMETIC — D2, D3, D4
# =========================================================================
q('GB_CC_018', 'CC_FAM06_MIXED_ARITHMETIC', 'D2',
  'A C program computes 7 / 2.0. What is the result and its type?',
  '3.5, a fractional value',
  ['3, a whole number', '4, a whole number', '3.5, but stored as a whole number'],
  'Because one operand is fractional, the other is converted before the division, so nothing is '
  'truncated. Writing 2 rather than 2.0 is the whole difference.')

q('GB_CC_019', 'CC_FAM06_MIXED_ARITHMETIC', 'D3',
  'A C program computes 1 + 7 / 2, with all values written as whole numbers. What is the result?',
  '4',
  ['4.5', '5', '3.5'],
  'The division runs first and truncates to 3, and adding 1 gives 4. Working the expression out '
  'in fractions throughout and then truncating would give 4 as well by coincidence here — but '
  'answering 4.5 shows the truncation was not applied at all.')

q('GB_CC_020', 'CC_FAM06_MIXED_ARITHMETIC', 'D4',
  'A C program computes (double)(sum / count), where sum and count are both whole numbers, and the '
  'result is always a whole number however the values are chosen. The conversion to double is '
  'present and correct. Why does it not help?',
  'The division has already truncated by the time the conversion happens',
  ['The conversion should be applied to the result of the assignment instead',
   'A double cannot represent the fractional part of a division',
   'sum and count should be declared as long rather than int'],
  'The brackets place the conversion after the division, so it converts a value from which the '
  'fraction has already gone. Converting one operand before dividing is what changes the '
  'arithmetic.',
  evidence='The conversion to double is present and correct')

# =========================================================================
# CC_FAM07_INPUT_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_CC_021', 'CC_FAM07_INPUT_BEHAVIOUR', 'D2',
  'A C read must be told two things about where the value goes. What are they?',
  'What type to expect, and the location to put it in',
  ['What type to expect, and how many characters to read',
   'The location to put it in, and a default value',
   'Only the location; the type is worked out from the input'],
  'A read has to know how to interpret what arrives and where to place the result, and neither '
  'can be inferred. Nothing about the typed characters tells the program what type was intended.')

q('GB_CC_022', 'CC_FAM07_INPUT_BEHAVIOUR', 'D3',
  'A C read expecting a whole number is given text that is not a number. What happens to the '
  'variable?',
  'It is left as it was; the read does not store anything',
  ['It is set to zero',
   'The program stops with an error',
   'The text is converted to the number of characters it contains'],
  'A failed read reports its failure and leaves the destination untouched, so the variable keeps '
  'whatever it had — which may be unpredictable if it was never assigned. Nothing halts, which is '
  'why the failure has to be checked for.')

q('GB_CC_023', 'CC_FAM07_INPUT_BEHAVIOUR', 'D4',
  'A program reads a number and then behaves as though a completely different value had been '
  'typed. The read itself reports success, and the variable was declared but never assigned '
  'before the read. What is the likely fault?',
  'The read was given the variable rather than its location, so the value went somewhere else',
  ['The variable was declared with the wrong type',
   'The input contained characters that could not be converted',
   'The value was correct and the later arithmetic is wrong'],
  'A read reporting success while the variable holds something unrelated points at where the '
  'value was sent rather than at what was read. The variable never having been assigned is what '
  'makes the leftover value look like a plausible reading.',
  evidence='The read itself reports success, and the variable was declared but never assigned '
           'before the read')

# =========================================================================
# CC_FAM08_ARRAY_BOUNDS — D2 (legacy), D3, D4
# =========================================================================
q('GB_CC_024', 'CC_FAM08_ARRAY_BOUNDS', 'D2',
  'A C program declares int a[3] = {10, 20, 30} and prints a[1]. What is printed?',
  '20',
  ['10', '30', '1'],
  'Positions run from zero, so a[1] is the second item and 20 is printed. Reading a[0] would give '
  'the first item, which is what counting from one produces.',
  provenance='LEGACY_KEEP', source='93660d')

q('GB_CC_025', 'CC_FAM08_ARRAY_BOUNDS', 'D3',
  'An array is declared with size 8. Which positions are valid?',
  '0 to 7',
  ['1 to 8', '0 to 8', '1 to 7'],
  'A declared size of 8 gives eight positions beginning at zero, so the last is 7. Using the size '
  'itself as a position is the single commonest way to run past the end.')

q('GB_CC_026', 'CC_FAM08_ARRAY_BOUNDS', 'D4',
  'A loop over an array declared with size 5 runs from 0 to 5 inclusive and the program produces '
  'a wrong total. It compiles without complaint and runs to completion. What is wrong?',
  'The loop reads one position past the end, adding whatever happens to be there',
  ['The array should have been declared with size 6',
   'The loop should start at 1 rather than 0',
   'The total was not initialised before the loop'],
  'Compiling and completing rules out anything the compiler would catch, and the extra pass reads '
  'memory beyond the array. Enlarging the array would remove the symptom while leaving the loop '
  'wrong for every other array.',
  evidence='It compiles without complaint and runs to completion')

# =========================================================================
# CC_FAM09_OUT_OF_BOUNDS_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_CC_027', 'CC_FAM09_OUT_OF_BOUNDS_BEHAVIOUR', 'D2',
  'A C program reads a position beyond the end of an array. What does it do?',
  'It reads whatever is in that memory and carries on',
  ['It stops with an out-of-range error',
   'It returns zero for any position beyond the end',
   'It refuses to compile'],
  'Nothing checks the position, so the read succeeds and produces meaningless data. The absence '
  'of a check is exactly what distinguishes C from languages that report this.')

q('GB_CC_028', 'CC_FAM09_OUT_OF_BOUNDS_BEHAVIOUR', 'D3',
  'A program with an out-of-range array read appears to work correctly for weeks and then '
  'produces nonsense. What explains both?',
  'The memory beyond the array happened to hold harmless values, until something else was placed '
  'there',
  ['The array grew over time and eventually ran out of space',
   'The fault appears only when the program runs for a long time',
   'The compiler removed the check and later restored it'],
  'An unchecked read produces whatever is in that memory, and that depends on what else the '
  'program is doing. Appearing to work is not evidence the access is valid, which is what makes '
  'this class of fault so long-lived.')

q('GB_CC_029', 'CC_FAM09_OUT_OF_BOUNDS_BEHAVIOUR', 'D4',
  'A program writes one position beyond an array and a different, unrelated variable changes '
  'value. The write reports nothing and the program continues. What happened?',
  'The write went into memory belonging to something else, which is not detected',
  ['The two variables were declared with the same name',
   'The compiler placed the two variables in the same location deliberately',
   'The array automatically grew into the neighbouring variable'],
  'Writing past the end puts data wherever that position lands, and neighbouring variables are '
  'often exactly what is there. Nothing reports it, which is why the symptom appears somewhere '
  'entirely unrelated to the fault.',
  evidence='The write reports nothing and the program continues')

# =========================================================================
# CC_FAM10_STRING_STORAGE — D2, D3, D4
# =========================================================================
q('GB_CC_030', 'CC_FAM10_STRING_STORAGE', 'D2',
  'How many positions are needed to store the text "cat" in C?',
  '4',
  ['3', '5', 'It depends on the machine'],
  'Three characters need three positions, and the terminator that marks the end needs one more. '
  'Forgetting it is what produces text that runs on past its end.')

q('GB_CC_031', 'CC_FAM10_STRING_STORAGE', 'D3',
  'An array is declared with size 5 and the text "hello" is copied into it. What is the problem?',
  'There is no room for the terminator, so the text has no end marker',
  ['There is no problem; five characters fit in five positions',
   'The text is one character too long and will be truncated',
   'The array will grow by one position automatically'],
  'The five letters fill every position and leave nowhere for the terminator. Nothing truncates '
  'and nothing grows — the terminator is simply written past the end, or omitted, and the text '
  'has no recognised end.')

q('GB_CC_032', 'CC_FAM10_STRING_STORAGE', 'D4',
  'A program prints a piece of text and produces the expected characters followed by a run of '
  'meaningless ones. The characters themselves were copied correctly. What is wrong?',
  'The terminator is missing, so printing continues past the end of the text',
  ['The array is too large, so the extra positions are printed',
   'The wrong specifier was used to print it',
   'The characters were copied one position too far along'],
  'Correct characters followed by rubbish is the signature of a missing end marker: printing '
  'stops at a terminator and there is none. An oversized array is harmless, because the '
  'terminator would still stop the printing.',
  evidence='The characters themselves were copied correctly')

# =========================================================================
# CC_FAM11_TYPED_TRACE — D3 (legacy), D4
# =========================================================================
q('GB_CC_033', 'CC_FAM11_TYPED_TRACE', 'D3',
  'A C program runs: int x = 10; double y = x / 4; printf("%f", y); What is printed?',
  '2.000000',
  ['2.500000', '2', '3.000000'],
  'Both operands of the division are whole numbers, so the fraction is discarded before y is '
  'assigned and 2.000000 is printed. Declaring y as a fractional type changes how the value is '
  'stored and shown, not how it was computed.',
  provenance='LEGACY_REWRITE', source='92c7d6')

q('GB_CC_034', 'CC_FAM11_TYPED_TRACE', 'D4',
  'Two fragments differ only in one declaration: one has int a = 7, double b = 2; the other has '
  'double a = 7, int b = 2. Both compute a / b. Both compile and both produce the same answer. '
  'Why?',
  'Either declaration makes one operand fractional, so the other is converted before the division',
  ['Because 7 divides by 2 exactly, so the types make no difference',
   'Because the compiler chooses the fractional type in both cases regardless',
   'Because the result is stored in the same type in both fragments'],
  'Conversion happens when the two operands differ, and which of the two is fractional does not '
  'matter. Had both been whole numbers the answer would differ, which is what makes the '
  'declaration the thing being measured.',
  evidence='Both compile and both produce the same answer')

# =========================================================================
# CC_FAM12_SILENT_FAULT_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_CC_035', 'CC_FAM12_SILENT_FAULT_DIAGNOSIS', 'D3',
  'A C program compiles without warnings, runs to completion, and prints a wrong total. What does '
  'the absence of any error message tell you?',
  'Nothing about correctness; a C program can be entirely legal and produce the wrong answer',
  ['That the fault must be in the input rather than the program',
   'That the fault must be a truncation, since nothing else is silent',
   'That the compiler failed to check the program properly'],
  'Compiling checks that the program is well formed and says nothing about what it computes. '
  'Truncation is one silent cause among several, so the absence of a message narrows nothing.')

q('GB_CC_036', 'CC_FAM12_SILENT_FAULT_DIAGNOSIS', 'D4',
  'A program sums an array and prints a total far larger than any plausible sum. The array values '
  'and the loop bounds are both correct. Which silent fault fits?',
  'The running total was never assigned a starting value, so the sum began from rubbish',
  ['A truncation lost part of each value',
   'The array was declared too small',
   'The output specifier did not match the type'],
  'A total far too large points at a starting value that was never set, since truncation can only '
  'lose value and correct bounds rule out reading extra items. Distinguishing the two silent '
  'causes is what the symptom is for.',
  evidence='The array values and the loop bounds are both correct')

# =========================================================================
# CC_FAM13_TRUNCATION_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_CC_037', 'CC_FAM13_TRUNCATION_DIAGNOSIS', 'D3',
  'A C program averages whole-number marks and always reports a whole number. Where is the '
  'precision lost?',
  'In the division, because both the total and the count are whole numbers',
  ['In the printing, because the specifier is for whole numbers',
   'In the addition, because whole numbers cannot hold fractions',
   'In the declaration of the marks, which should be fractional'],
  'Addition of whole numbers loses nothing, and printing cannot restore what is gone. The '
  'division is where a fraction would first arise and is where it is discarded.')

q('GB_CC_038', 'CC_FAM13_TRUNCATION_DIAGNOSIS', 'D4',
  'A programmer changes the average variable from int to double and the answer is still a whole '
  'number. The change was made correctly and the program recompiled. Why did it not work?',
  'The division still has two whole-number operands, so the fraction is gone before the '
  'assignment',
  ['double cannot hold the fractional part of an average',
   'The variable needs to be declared before the marks are read',
   'The output specifier still prints whole numbers'],
  'Changing where a value is stored does nothing about how it was computed. The fraction has to '
  'survive the division to be worth storing, which means converting an operand rather than the '
  'result.',
  evidence='The change was made correctly and the program recompiled')

q('GB_CC_039', 'CC_FAM13_TRUNCATION_DIAGNOSIS', 'D5',
  'Three fixes are proposed for a whole-number average: store the result in a double, print it '
  'with a fractional specifier, or convert one operand before dividing. Which works, and why do '
  'the others not?',
  'Converting an operand before dividing; the other two act after the fraction has already been '
  'discarded',
  ['Storing in a double; the destination type governs the arithmetic',
   'Printing with a fractional specifier; the value was always fractional',
   'All three work, since each involves a fractional type'],
  'The order of events settles it: the division happens first, and only something that changes '
  'what the division sees can preserve the fraction. Both other fixes involve a fractional type '
  'and arrive too late to matter.',
  mode='TRANSFER', hinge='store the result in a double, print it with a fractional specifier, or '
                         'convert one operand before dividing')

q('GB_CC_040', 'CC_FAM13_TRUNCATION_DIAGNOSIS', 'D5',
  'A calculation divides by 100 early and multiplies by 100 later, using whole numbers throughout. '
  'The final answer is wrong even though the two operations should cancel. Why?',
  'The division discarded the fraction, and multiplying afterwards cannot restore what is no '
  'longer there',
  ['The multiplication overflowed the type',
   'Dividing and multiplying by the same value never cancel in C',
   'The operations were applied in the wrong order'],
  'The two operations do cancel in arithmetic and not in whole-number arithmetic, because the '
  'first loses information. Reordering them — multiplying first — would keep the value intact, '
  'which is why the order is worth noticing.',
  mode='TRANSFER', hinge='divides by 100 early and multiplies by 100 later')

q('GB_CC_041', 'CC_FAM13_TRUNCATION_DIAGNOSIS', 'D5',
  'Whole-number arithmetic is faster and truncates; fractional arithmetic keeps the fraction and '
  'costs more. When is the whole-number choice wrong?',
  'Whenever the discarded fraction affects the answer that is actually needed — a count of items '
  'is fine, an average is not',
  ['Never; whole numbers are always preferable when the inputs are whole',
   'Always; fractional types should be used throughout',
   'Whenever the values are large, since large values lose more'],
  'The choice depends on what the result means rather than on what the inputs are. Counting '
  'produces a whole number by nature; averaging produces one only by accident, and the size of '
  'the values has nothing to do with it.',
  mode='TRADEOFF', hinge='Whole-number arithmetic is faster and truncates')

# =========================================================================
# CC_FAM14_TYPE_LIMIT_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_CC_042', 'CC_FAM14_TYPE_LIMIT_BEHAVIOUR', 'D4',
  'A C program computes -7 / 2 with whole numbers and prints -3. A programmer expected -4. The '
  'same program prints 3 for 7 / 2, which they expected. What rule is in force?',
  'Whole-number division discards the fraction, moving toward zero in both directions',
  ['Whole-number division rounds to the nearest value',
   'Whole-number division moves down to the next lower whole number',
   'Negative division is undefined and the result cannot be relied on'],
  'Discarding the fraction from -3.5 gives -3, and from 3.5 gives 3 — both toward zero. Moving '
  'down would give -4, which is what some other languages do, and is exactly why the positive '
  'case alone cannot reveal the rule.',
  evidence='The same program prints 3 for 7 / 2, which they expected')

q('GB_CC_043', 'CC_FAM14_TYPE_LIMIT_BEHAVIOUR', 'D5',
  'A whole-number counter increases past the largest value its type can hold. What happens next?',
  'It wraps around to a large negative value, silently',
  ['It stops increasing and stays at the maximum',
   'The program stops with an overflow error',
   'The type widens automatically to hold the value'],
  'A fixed-size type has no room beyond its maximum, and the next increase produces a value at '
  'the other end of the range. Nothing reports it, so a counter can become negative while the '
  'program carries on as though nothing happened.',
  mode='EDGE', hinge='increases past the largest value its type can hold')

q('GB_CC_044', 'CC_FAM14_TYPE_LIMIT_BEHAVIOUR', 'D5',
  'A C program divides by a value read from input. What should be checked before the division, '
  'and what happens if it is not?',
  'That the value is not zero; dividing by zero is not caught by the compiler and stops the '
  'program at run time',
  ['That the value is positive; a negative divisor gives an unpredictable result',
   'Nothing; C returns zero when dividing by zero',
   'That the value fits the type; the compiler checks the rest'],
  'A zero divisor is the one case the arithmetic cannot produce an answer for, and nothing before '
  'the program runs can know the input. Negative divisors are perfectly well defined, and no '
  'value is quietly returned.',
  mode='EDGE', hinge='divides by a value read from input')

q('GB_CC_045', 'CC_FAM14_TYPE_LIMIT_BEHAVIOUR', 'D5',
  'Two C faults behave differently: dividing by zero stops the program, while writing past an '
  'array does not. Which is more dangerous in a program that runs unattended, and why?',
  'The array write, because the program carries on producing results that are quietly wrong',
  ['The division, because a stopped program produces nothing at all',
   'They are equally dangerous, since both are faults',
   'The array write, because it is harder to find in the code'],
  'A program that stops announces its own failure and whoever reads the log finds out. A silent '
  'wrong write leaves plausible output that is acted on, which is the more costly outcome even '
  'though it looks like the milder one.',
  mode='TRADEOFF', hinge='dividing by zero stops the program, while writing past an array does not')

q('GB_CC_046', 'CC_FAM14_TYPE_LIMIT_BEHAVIOUR', 'D5',
  'A program works correctly for every input it has been tested with, all of them small positive '
  'whole numbers. Which untested inputs are most likely to expose a type limit?',
  'Zero, negative values, and values near the largest the type can hold',
  ['Values in the middle of the tested range',
   'Repeated values, since repetition accumulates error',
   'Values with many digits, since long numbers are harder to store'],
  'Type limits show at the boundaries of what a type can represent and at the values arithmetic '
  'treats specially. Repetition and digit count are not what a fixed-size whole-number type is '
  'sensitive to.',
  mode='TRANSFER', hinge='all of them small positive whole numbers')

# =========================================================================
# CC_FAM15_CROSS_LANGUAGE_TRANSFER — D4, D5 x3
# =========================================================================
q('GB_CC_047', 'CC_FAM15_CROSS_LANGUAGE_TRANSFER', 'D4',
  'The same averaging algorithm is written in C and in Python. Both are correct transcriptions of '
  'each other. On whole-number input they disagree. Why?',
  'C truncates the division of two whole numbers; Python\'s single slash produces a fractional '
  'result',
  ['C is faster, so it rounds differently under time pressure',
   'Python stores whole numbers with more precision',
   'The transcription must be wrong, since correct transcriptions agree'],
  'The difference is in what the division operator means for two whole numbers, which is a '
  'property of the language rather than of the algorithm. A faithful transcription can still '
  'behave differently when the two languages define an operator differently.',
  evidence='Both are correct transcriptions of each other')

q('GB_CC_048', 'CC_FAM15_CROSS_LANGUAGE_TRANSFER', 'D5',
  'The same loop reads one position past the end of a collection, in C and in Python. What '
  'happens in each?',
  'C reads whatever is there and carries on; Python stops with an error',
  ['Both stop with an error', 'Both read whatever is there and carry on',
   'C stops with an error; Python returns an empty value'],
  'Python checks the position and refuses; C does not check at all. The same mistake is therefore '
  'loud in one language and silent in the other, which is the difference most worth carrying '
  'between them.',
  mode='TRANSFER', hinge='reads one position past the end of a collection, in C and in Python')

q('GB_CC_049', 'CC_FAM15_CROSS_LANGUAGE_TRANSFER', 'D5',
  'A whole-number counter is increased far beyond a few billion, in C and in Python. Where do the '
  'two disagree?',
  'C wraps once the type\'s range is exceeded; Python holds whole numbers of any size',
  ['Both wrap at the same point', 'Both hold whole numbers of any size',
   'C holds any size; Python wraps at a fixed limit'],
  'A C whole-number type has a fixed size, while Python\'s grows as needed. A program transcribed '
  'from Python can therefore be correct there and quietly wrong in C on exactly the inputs that '
  'exceed the type.',
  mode='TRANSFER', hinge='increased far beyond a few billion, in C and in Python')

q('GB_CC_050', 'CC_FAM15_CROSS_LANGUAGE_TRANSFER', 'D5',
  'A team must choose whether to prototype in Python and rewrite in C, or write in C from the '
  'start. What does the first route buy, and what does it risk?',
  'It buys a working algorithm sooner, and risks a transcription that is faithful and behaves '
  'differently on division, array bounds and large values',
  ['It buys nothing; a rewrite doubles the work',
   'It risks nothing; a faithful transcription behaves identically',
   'It buys speed, since Python code runs faster once rewritten'],
  'Getting the algorithm right first is a genuine gain, and the risk is precisely the places '
  'where a faithful transcription is not an equivalent program. Knowing which three places those '
  'are is what makes the route usable rather than dangerous.',
  mode='TRADEOFF', hinge='prototype in Python and rewrite in C, or write in C from the start')
