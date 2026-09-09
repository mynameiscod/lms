# -*- coding: utf-8 -*-
"""
Wave 4 — JS_BASICS, 50 Golden Bank questions, all newly authored.

THE TWO EMPTY VALUES, TRUTHINESS AND SHARED REFERENCES CARRY THE SKILL. They are where a student
who has learned another language first is confidently wrong, and where the wrong belief keeps
producing right answers until it doesn't. An empty array being truthy, a constant array being
mutable, and a total that joins instead of adding are all the same shape of surprise: the code
ran, nothing complained, and the result is wrong.

EVERY EXPLANATION STATES ITS OWN ANSWER in the words the key holds.
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
# JS_FAM01_VALUE_TYPE_RECOGNITION — D1 x4, D2 x1
# =========================================================================
q('GB_JS_001', 'JS_FAM01_VALUE_TYPE_RECOGNITION', 'D1',
  'What kind of value is "42", written with the quotes shown?',
  'A string',
  ['A number', 'A boolean', 'An empty value'],
  'A string is what quotes produce, whatever is between them. Digits inside quotes are text and '
  'will not behave arithmetically until they are converted.')

q('GB_JS_002', 'JS_FAM01_VALUE_TYPE_RECOGNITION', 'D1',
  'What kind of value is [1, 2, 3]?',
  'An array',
  ['A plain object with no particular kind', 'A string', 'Three separate numbers'],
  'An array is an ordered list written in square brackets and reached by position. It is one '
  'value, not three.')

q('GB_JS_003', 'JS_FAM01_VALUE_TYPE_RECOGNITION', 'D1',
  'What kind of value is true, written without quotes?',
  'A boolean',
  ['A string', 'A number', 'A name that has not been declared'],
  'A boolean is one of the two truth values written bare. Putting quotes around it would make the '
  'word into text instead.')

q('GB_JS_004', 'JS_FAM01_VALUE_TYPE_RECOGNITION', 'D1',
  'A name is declared with let and nothing is assigned to it. What value does it hold?',
  'undefined',
  ['null', '0', 'An empty string'],
  'undefined is what a declared name holds before anything is put in it. The other empty-looking '
  'values all have to be assigned deliberately.')

q('GB_JS_005', 'JS_FAM01_VALUE_TYPE_RECOGNITION', 'D2',
  'One property is deliberately set to null and one name was declared without being assigned. Do '
  'the two hold the same value?',
  'No; null was put there on purpose and undefined means nothing was ever put there',
  ['Yes; both simply mean empty',
   'No; null means zero and undefined means empty text',
   'Yes; null is only how undefined is printed'],
  'The two are separate values with separate meanings, which is the distinction the pair exists to '
  'draw: null was put there on purpose and undefined means nothing was ever put there. Treating '
  'them as interchangeable loses the information that somebody chose the emptiness.')

# =========================================================================
# JS_FAM02_DECLARATION_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_JS_006', 'JS_FAM02_DECLARATION_RECOGNITION', 'D1',
  'A name is declared with let and given 5. A later line assigns 9 to the same name. Is that '
  'allowed?',
  'Yes; a name declared with let can be assigned again',
  ['No; a name can only be assigned once',
   'Yes, but only inside the same line',
   'No; the second assignment silently does nothing'],
  'Reassignment is exactly what let permits, so a name declared with let can be assigned again. '
  'Only a declaration that fixes the binding refuses it.')

q('GB_JS_007', 'JS_FAM02_DECLARATION_RECOGNITION', 'D1',
  'A name is declared with const and given 5. A later line assigns 9 to the same name. What '
  'happens?',
  'It fails with an error',
  ['It succeeds and the name becomes 9',
   'It silently does nothing and the name stays 5',
   'It succeeds but only until the next line'],
  'It fails with an error, because const fixes what the name refers to for as long as the name '
  'exists. Nothing is assigned and nothing is silently ignored.')

q('GB_JS_008', 'JS_FAM02_DECLARATION_RECOGNITION', 'D1',
  'Which declaration keyword prevents the name being pointed at a different value later?',
  'const',
  ['let', 'var', 'No keyword does this'],
  'const is the declaration that fixes what a name refers to. The others allow the name to be '
  'reassigned freely.')

q('GB_JS_009', 'JS_FAM02_DECLARATION_RECOGNITION', 'D2',
  'An array is declared with const. A later line pushes a new item onto it. Does that work?',
  'Yes; const fixes what the name points at, not the contents of what it points at',
  ['No; a const array cannot be changed at all',
   'Yes, but the change is discarded at the end of the line',
   'No; push replaces the array, which const forbids'],
  'The array itself is not frozen by the declaration, so pushing succeeds: const fixes what the '
  'name points at, not the contents of what it points at. Only assigning a different array to the '
  'name would fail.')

# =========================================================================
# JS_FAM03_LOG_OUTPUT — D1 x3, D2 x1
# =========================================================================
q('GB_JS_010', 'JS_FAM03_LOG_OUTPUT', 'D1',
  'let x = 5; console.log(x); What is printed?',
  '5',
  ['x', 'let x = 5', 'undefined'],
  'The name is replaced by the value it holds before anything is printed, so 5 appears. Printing '
  'the name itself would need it in quotes.')

q('GB_JS_011', 'JS_FAM03_LOG_OUTPUT', 'D1',
  'let total = 3 + 4; console.log(total); What is printed?',
  '7',
  ['3 + 4', 'total', '34'],
  'The arithmetic is done at the moment of assignment, so the name holds 7 and 7 is printed. The '
  'expression itself is gone by then.')

q('GB_JS_012', 'JS_FAM03_LOG_OUTPUT', 'D1',
  'console.log("Score:", 8); What is printed?',
  'Score: 8',
  ['Score:', '8', 'Score:, 8'],
  'Score: 8 appears. Quoted text is shown exactly as written, and the comma separates a second '
  'thing to show rather than becoming part of what is shown.')

q('GB_JS_013', 'JS_FAM03_LOG_OUTPUT', 'D2',
  'let n = 1; console.log(n); n = 2; console.log(n); What is printed, in order?',
  '1 then 2',
  ['2 then 2', '1 then 1', '2 then 1'],
  'Each print shows the value held at the moment it runs, giving 1 then 2. A later assignment '
  'cannot reach back and change what was already printed.')

# =========================================================================
# JS_FAM04_PLUS_BEHAVIOUR — D2, D3
# =========================================================================
q('GB_JS_014', 'JS_FAM04_PLUS_BEHAVIOUR', 'D2',
  'What does 5 + "5" produce?',
  'The string 55',
  ['The number 10', 'The number 55', 'An error, because the types differ'],
  'The string 55 is produced, because plus joins as soon as either side is text. Nothing fails; '
  'the result is simply text rather than a number.')

q('GB_JS_015', 'JS_FAM04_PLUS_BEHAVIOUR', 'D3',
  'What does "3" + 4 - 1 produce?',
  'The number 33',
  ['The number 6', 'The string 33', 'An error, because the first step gave text'],
  'The number 33 is produced. Plus joins first, giving the text 34, and minus has no joining '
  'meaning at all, so it converts that text and subtracts, leaving a number.')

# =========================================================================
# JS_FAM05_EQUALITY_COMPARISON — D2, D3
# =========================================================================
q('GB_JS_016', 'JS_FAM05_EQUALITY_COMPARISON', 'D2',
  'Consider 5 == "5" and 5 === "5". What are the two results?',
  'The first is true and the second is false',
  ['Both are true', 'Both are false', 'The first is false and the second is true'],
  'The converting form matches after making the types agree and the strict form refuses to convert '
  'at all, so the first is true and the second is false. That is the whole difference between them.')

q('GB_JS_017', 'JS_FAM05_EQUALITY_COMPARISON', 'D3',
  'Consider null == undefined and null === undefined. Which of the two comparisons holds?',
  'The first holds and the second does not',
  ['Neither holds', 'Both hold', 'The first does not hold and the second does'],
  'The converting form treats the two empty values as matching each other, while the strict form '
  'sees two different values, so the first holds and the second does not. Neither comparison '
  'fails or errors.')

# =========================================================================
# JS_FAM06_TRUTHINESS — D2, D3, D4
# =========================================================================
q('GB_JS_018', 'JS_FAM06_TRUTHINESS', 'D2',
  'A condition is written as if ([]) with an empty array inside. Does the body run?',
  'Yes; an empty array counts as true',
  ['No; an empty array counts as false',
   'It fails, because an array is not a condition',
   'It runs only once the array has items'],
  'Every object, including an empty array, counts as true in a condition, so the body runs. '
  'Emptiness of a list is something that has to be checked by its length.')

q('GB_JS_019', 'JS_FAM06_TRUTHINESS', 'D3',
  'Two conditions are written: if (0) and if ("0"). Which bodies run?',
  'The first is skipped and the second runs',
  ['Both run', 'Both are skipped', 'The first runs and the second is skipped'],
  'Zero counts as false, while a string containing a zero character is a non-empty string and '
  'counts as true, so the first is skipped and the second runs. The quotes are the whole '
  'difference.')

q('GB_JS_020', 'JS_FAM06_TRUTHINESS', 'D4',
  'A check written as if (count) is meant to run whenever a count was supplied. It runs for every '
  'supplied count except when the supplied count is 0. What is the cause?',
  'Zero counts as false, so a supplied 0 is treated the same as nothing supplied',
  ['count was never declared',
   'The check should have used the strict form of equality',
   'A number cannot be used as a condition at all'],
  'The stem rules out the check being broken in general, since every other supplied count works. '
  'Zero counts as false, so a supplied 0 is treated the same as nothing supplied, which is why '
  'this kind of check is written against undefined instead.',
  evidence='It runs for every supplied count except when the supplied count is 0')

# =========================================================================
# JS_FAM07_ARRAY_ACCESS — D2, D3, D4
# =========================================================================
q('GB_JS_021', 'JS_FAM07_ARRAY_ACCESS', 'D2',
  'const a = [10, 20, 30]; What is a[1]?',
  '20',
  ['10', '30', 'An error, because positions start at 1'],
  'Positions are counted from zero, so a[1] is the second item, 20. Counting from one would give '
  'the first item instead.')

q('GB_JS_022', 'JS_FAM07_ARRAY_ACCESS', 'D3',
  'const a = ["x", "y"]; a.push("z"); What are a.length and a[a.length - 1]?',
  '3 and z',
  ['2 and y', '3 and undefined', '4 and z'],
  'Pushing adds one item, so the length becomes 3 and z is the last item. The length is one more '
  'than the last position, which is why one is subtracted to reach it.')

q('GB_JS_023', 'JS_FAM07_ARRAY_ACCESS', 'D4',
  'const a = [1, 2]; console.log(a[5]); The program keeps running and prints one line. What is '
  'printed?',
  'undefined',
  ['An error message', '0', 'Nothing at all'],
  'Reading a position that does not exist gives undefined rather than failing, which is why the '
  'program keeps running. A language that raised an error here would have stopped instead.',
  evidence='The program keeps running and prints one line')

# =========================================================================
# JS_FAM08_FUNCTION_RESULT — D2, D3, D4
# =========================================================================
q('GB_JS_024', 'JS_FAM08_FUNCTION_RESULT', 'D2',
  'function double(n) { return n * 2; } What does double(4) produce?',
  '8',
  ['4', '2', 'undefined'],
  'The argument is multiplied and handed back, giving 8. Nothing is printed unless the caller '
  'prints it.')

q('GB_JS_025', 'JS_FAM08_FUNCTION_RESULT', 'D3',
  'function show(n) { console.log(n); } const r = show(3); What is printed, and what does r hold?',
  '3 is printed, and r holds undefined',
  ['3 is printed, and r holds 3',
   'Nothing is printed, and r holds 3',
   '3 is printed, and r holds 0'],
  'Printing a value and returning it are separate acts, so 3 is printed, and r holds undefined. A '
  'function with no return hands back nothing.')

q('GB_JS_026', 'JS_FAM08_FUNCTION_RESULT', 'D4',
  'function f() { return 1; console.log("here"); } The call hands back 1 and here is never '
  'printed. Why not?',
  'The return ends the call, so the line after it never runs',
  ['Printing is not allowed after a return',
   'The printing happened but was not shown',
   'The function stopped because it had no arguments'],
  'Reaching a return leaves the function immediately, so the line after it never runs. Code placed '
  'after an unconditional return can never execute at all.',
  evidence='The call hands back 1 and here is never printed')

# =========================================================================
# JS_FAM09_OBJECT_ACCESS — D2, D3, D4
# =========================================================================
q('GB_JS_027', 'JS_FAM09_OBJECT_ACCESS', 'D2',
  'const u = { name: "Ana", age: 30 }; What is u.name?',
  'Ana',
  ['name', '30', 'undefined'],
  'The dot reaches the property of that name and gives what is stored there, Ana. The word before '
  'the dot names the object, not the property.')

q('GB_JS_028', 'JS_FAM09_OBJECT_ACCESS', 'D3',
  'const u = { name: "Ana" }; What does u.email give, and does the program continue?',
  'undefined, and the program continues',
  ['An error, and the program stops',
   'An empty string, and the program continues',
   'null, and the program continues'],
  'Reading a property that was never set gives undefined, and the program continues. Failing here '
  'would make optional properties impossible to test for.')

q('GB_JS_029', 'JS_FAM09_OBJECT_ACCESS', 'D4',
  'const u = {}; console.log(u.address.city); The program stops at this line instead of printing '
  'anything. Why does this fail when reading a single missing property does not?',
  'u.address is undefined, and reading a property of undefined is not allowed',
  ['city is a reserved word',
   'An empty object cannot be read from at all',
   'Two dots in one expression are not permitted'],
  'The first step succeeds and gives undefined; the second step then tries to read from that, and '
  'reading a property of undefined is not allowed. One missing level is safe and two is not.',
  evidence='The program stops at this line instead of printing anything')

# =========================================================================
# JS_FAM10_REFERENCE_SHARING — D2, D3, D4
# =========================================================================
q('GB_JS_030', 'JS_FAM10_REFERENCE_SHARING', 'D2',
  'const a = [1, 2]; const b = a; b.push(3); What do a and b contain?',
  'Both contain 1, 2, 3',
  ['a contains 1, 2 and b contains 1, 2, 3',
   'Both contain 1, 2',
   'It fails, because a was declared with const'],
  'Assigning an array to a second name copies the reference and not the contents, so both contain '
  '1, 2, 3. There is only one array here with two names for it.')

q('GB_JS_031', 'JS_FAM10_REFERENCE_SHARING', 'D3',
  'let x = 1; let y = x; y = 5; What do x and y hold?',
  'x holds 1 and y holds 5',
  ['Both hold 5', 'Both hold 1', 'x holds 5 and y holds 1'],
  'A number is copied when it is assigned rather than shared, so x holds 1 and y holds 5. This is '
  'where numbers behave unlike arrays and objects.')

q('GB_JS_032', 'JS_FAM10_REFERENCE_SHARING', 'D4',
  'const settings = { theme: "dark" }; settings.theme = "light"; The assignment succeeds and the '
  'theme becomes light. Why did const not prevent it?',
  'const fixes what the name points at, not the contents of what it points at',
  ['const only restricts numbers and strings',
   'The object was copied before the assignment',
   'const is only enforced when the file first loads'],
  'The name still points at the same object afterwards, so nothing const guards has changed: it '
  'fixes what the name points at, not the contents of what it points at. Assigning a different '
  'object to settings would fail.',
  evidence='The assignment succeeds and the theme becomes light')

# =========================================================================
# JS_FAM11_FRAGMENT_TRACE — D3, D4
# =========================================================================
q('GB_JS_033', 'JS_FAM11_FRAGMENT_TRACE', 'D3',
  'let total = 0; for (let i = 1; i <= 4; i++) { if (i % 2 === 0) total += i; } console.log(total); '
  'What is printed?',
  '6',
  ['10', '4', '2'],
  'Only the even values 2 and 4 are added, giving 6. Adding every value would give ten and adding '
  'the odd ones would give four.')

q('GB_JS_034', 'JS_FAM11_FRAGMENT_TRACE', 'D4',
  'A loop builds text with s = s + i, starting from an empty s. It is meant to produce 123 and '
  'produces 012 instead. The loop header is for (let i = 0; i < 3; i++). Which single change fixes '
  'it?',
  'Start i at 1 and continue while i is not above 3',
  ['Change s = s + i to s += i',
   'Keep i starting at 0 and continue while i is not above 3',
   'Move the printing inside the loop'],
  'The body is right and the range is wrong, so it has to start one later and end one later: start '
  'i at 1 and continue while i is not above 3. Changing only the end would give 0123.',
  evidence='It is meant to produce 123 and produces 012 instead')

# =========================================================================
# JS_FAM12_FAILURE_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_JS_035', 'JS_FAM12_FAILURE_DIAGNOSIS', 'D3',
  'function avg(nums) { let t = 0; for (const n of nums) t += n; return nums.length / t; } The call '
  'avg([2, 4]) gives about 0.33 rather than 3. What is wrong?',
  'The division is the wrong way round; the total should be divided by the count',
  ['The loop never runs',
   'The total should start at 1 rather than 0',
   'The values were added as text'],
  'Six divided by two is three, and two divided by six is what was seen, so the division is the '
  'wrong way round; the total should be divided by the count. The loop itself is correct.')

q('GB_JS_036', 'JS_FAM12_FAILURE_DIAGNOSIS', 'D4',
  'Three things happen while a program runs: one value prints as undefined, one line throws an '
  'error, and one total comes out quietly wrong. Which of them stops the program where it '
  'happens?',
  'Only the line that throws',
  ['Only the value that prints as undefined',
   'Only the total that is quietly wrong',
   'All three of them'],
  'A value that prints as undefined and a total that is wrong both let the program continue, which '
  'is what makes them hard to notice. Only the line that throws halts it at that point.',
  evidence='one line throws an error, and one total comes out quietly wrong')

# =========================================================================
# JS_FAM13_CONVERSION_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_JS_037', 'JS_FAM13_CONVERSION_DIAGNOSIS', 'D3',
  'Two values read from input fields are added. Entering 10 and 5 produces 105 rather than 15. '
  'Where does the fault lie?',
  'The values arrived as text, so plus joined them instead of adding',
  ['The addition operator was written incorrectly',
   'The values were too large to add',
   'One of the fields was left empty'],
  'Joining is what plus does when either side is text, and the result is the two entries end to '
  'end: the values arrived as text, so plus joined them instead of adding. Converting each value '
  'before adding fixes it.')

q('GB_JS_038', 'JS_FAM13_CONVERSION_DIAGNOSIS', 'D4',
  'A loop adds each number in a list to a running total. Every value in the list is a number, and '
  'the final total is text. The running total was started as an empty string. What happened?',
  'The total began as text, so every addition joined rather than added',
  ['One of the values in the list was text after all',
   'The values were never converted before being added',
   'The loop ran one time too many'],
  'The stem says every value is a number, so the text can only have come from the starting value: '
  'the total began as text, so every addition joined rather than added. Starting it at 0 fixes it.',
  evidence='The running total was started as an empty string')

q('GB_JS_039', 'JS_FAM13_CONVERSION_DIAGNOSIS', 'D5',
  'A total came out joined rather than added, because the running total began as text. Which '
  'single check would have caught it earliest?',
  'Printing the type of the running total before the loop starts',
  ['Printing the final total',
   'Comparing the final total against the expected number',
   'Converting the final total to a number at the end'],
  'The fault exists before the first addition, so it is visible before the loop: printing the type '
  'of the running total before the loop starts finds it immediately. Every other check waits until '
  'the damage is complete and then only shows that something is wrong.',
  mode='TRANSFER', hinge='because the running total began as text')

q('GB_JS_040', 'JS_FAM13_CONVERSION_DIAGNOSIS', 'D5',
  'Every entry in a list is converted with Number() before being added. One entry is an empty '
  'string. What does that entry contribute to the total?',
  '0, because an empty string converts to zero',
  ['Nothing, because it is skipped',
   'It makes the whole total not a number',
   'It is joined onto the total as text'],
  'An empty string converts cleanly rather than failing, so it contributes 0, because an empty '
  'string converts to zero. A value such as "abc" is the one that would spoil the total instead.',
  mode='EDGE', hinge='One entry is an empty string')

q('GB_JS_041', 'JS_FAM13_CONVERSION_DIAGNOSIS', 'D5',
  'Values can be converted to numbers as soon as they arrive, or only at the point where '
  'arithmetic happens. What does converting on arrival cost?',
  'It forces a decision at the boundary about what an unconvertible value means',
  ['Nothing; it is better in every way',
   'It makes the program noticeably slower',
   'It makes the original text impossible to keep'],
  'Converting on arrival gains one place to check and one kind of value inside the program, and '
  'the price is paid at that boundary: it forces a decision about what an unconvertible value '
  'means, right where the program may not yet know what to do about it.',
  mode='TRADEOFF', hinge='or only at the point where arithmetic happens')

# =========================================================================
# JS_FAM14_EMPTY_VALUE_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_JS_042', 'JS_FAM14_EMPTY_VALUE_BEHAVIOUR', 'D4',
  'function sum(nums) { let t = 0; for (const n of nums) t += n; return t; } The call sum([]) '
  'finishes without an error. What does it return?',
  '0',
  ['undefined', 'An empty array', 'Nothing at all'],
  'The loop body never runs, so the starting value is handed back untouched and the call returns '
  '0. That is why a sum needs no special case for an empty list.',
  evidence='The call sum([]) finishes without an error')

q('GB_JS_043', 'JS_FAM14_EMPTY_VALUE_BEHAVIOUR', 'D5',
  'The same summing function is changed into an average by dividing by nums.length before '
  'returning. What does an empty list now produce?',
  'Not a number, because zero is divided by zero',
  ['0, exactly as the sum did',
   'An error that stops the program',
   'undefined'],
  'Both the total and the count are zero for an empty list, so the result is not a number, because '
  'zero is divided by zero. The sum survived the empty list and the average does not, which is why '
  'the division is the line that needs guarding.',
  mode='EDGE', hinge='by dividing by nums.length before')

q('GB_JS_044', 'JS_FAM14_EMPTY_VALUE_BEHAVIOUR', 'D5',
  'A greeting is built from user.name. It is called with an object that has no name property, and '
  'nothing crashes. What appears in the greeting?',
  'The word undefined, where the name should be',
  ['The greeting is skipped entirely',
   'An empty gap, with nothing where the name should be',
   'An error message in place of the name'],
  'A missing property reads as undefined rather than failing, and joining that into text spells it '
  'out, so the word undefined appears where the name should be. This is why a missing value often '
  'reaches the user rather than the developer.',
  mode='EDGE', hinge='called with an object that has no name property')

q('GB_JS_045', 'JS_FAM14_EMPTY_VALUE_BEHAVIOUR', 'D5',
  'Two operations are applied to the same list: summing it, and finding its largest value. Which '
  'of the two needs a decision made about the empty case?',
  'Finding the largest, because there is no value to hand back',
  ['Summing, because there is nothing to start from',
   'Both, in exactly the same way',
   'Neither; both are defined for an empty list'],
  'A sum has a natural answer for an empty list, which is zero, and a largest value has none, so '
  'it is finding the largest, because there is no value to hand back, that needs the decision. '
  'The author has to choose between an error and a stand-in value.',
  mode='TRANSFER', hinge='summing it, and finding its largest value')

q('GB_JS_046', 'JS_FAM14_EMPTY_VALUE_BEHAVIOUR', 'D5',
  'An empty list can be handled by returning early at the top of the function, or by letting the '
  'ordinary code run and produce the right answer by itself. What does the early return cost?',
  'A second path through the function that has to stay correct as the first one changes',
  ['Nothing; an early return is always the safer choice',
   'Noticeably slower running on long lists',
   'The ability to handle non-empty lists in the same function'],
  'Where the ordinary code already gives the right answer, the guard adds a second path through '
  'the function that has to stay correct as the first one changes. The guard earns its place only '
  'when the ordinary code would be wrong.',
  mode='TRADEOFF', hinge='or by letting the ordinary code run')

# =========================================================================
# JS_FAM15_FRAGMENT_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_JS_047', 'JS_FAM15_FRAGMENT_EQUIVALENCE', 'D4',
  'One fragment tests if (x) and another tests if (x !== undefined). They behaved identically on '
  'every value tried, all of which were non-empty strings. Are they equivalent?',
  'No; they part company on 0, on the empty string and on null',
  ['Yes; both ask whether x has a value',
   'No; the second one fails when x is a number',
   'Yes; undefined is the only value that counts as false'],
  'Every value tried counts as true and is also not undefined, so the trials could not separate '
  'them. They part company on 0, on the empty string and on null, each of which is present but '
  'counts as false.',
  evidence='all of which were non-empty strings')

q('GB_JS_048', 'JS_FAM15_FRAGMENT_EQUIVALENCE', 'D5',
  'Two checks are written: x == null and x === null. Which input separates them?',
  'undefined, which the first matches and the second does not',
  ['null, which only the second matches',
   '0, which only the first matches',
   'No input separates them'],
  'The converting form treats the two empty values as equal, so undefined, which the first matches '
  'and the second does not, is the separating input. Every other value is treated the same way by '
  'both.',
  mode='EDGE', hinge='x == null and x === null')

q('GB_JS_049', 'JS_FAM15_FRAGMENT_EQUIVALENCE', 'D5',
  'Two fragments differ only in that one computes a + b and the other computes Number(a) + '
  'Number(b). They agreed on every pair of numbers tried. Are they equivalent?',
  'No; they differ as soon as either value arrives as text',
  ['Yes; converting a number changes nothing about it',
   'No; the second one fails when given numbers',
   'Yes, since both give a number in every case'],
  'Converting a number leaves it alone, which is why the trials agreed, but they differ as soon as '
  'either value arrives as text: one joins and the other adds. Numbers were the only inputs that '
  'could not tell them apart.',
  mode='TRANSFER', hinge='They agreed on every pair of numbers tried')

q('GB_JS_050', 'JS_FAM15_FRAGMENT_EQUIVALENCE', 'D5',
  'A colleague says two fragments are interchangeable because the tests pass. What would make the '
  'claim stronger?',
  'Naming the inputs that could separate them and showing the two agree on those',
  ['Adding more tests of the same kind',
   'Showing the two produce identical output for one typical input',
   'Showing the two are the same length'],
  'Passing tests only shows the inputs tried did not separate them, and the interesting inputs are '
  'the ones nobody thought to try. Naming the inputs that could separate them and showing the two '
  'agree on those turns a hope into an argument.',
  mode='TRANSFER', hinge='interchangeable because the tests pass')
