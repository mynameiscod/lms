# -*- coding: utf-8 -*-
"""
Wave 1 — FUNCTIONS_BASICS, 50 Golden Bank questions.

6 come from the existing bank, all of them remapped in from other skills, and 44 are new.

THIS SKILL HAD NO QUESTIONS OF ITS OWN. Every legacy item here was filed under
PROGRAMMING_FUNDAMENTALS, PYTHON_BASICS or DEBUGGING; not one was filed under functions. Five of
the six arrived with an absurd option among their four — a keyboard, a folder, a battery — so
their measurements are kept and their options rebuilt around what the blueprint names: a function
believed to run when it is defined, a printed value believed to be returned, arguments believed
to bind by name.

THE PRINT-VERSUS-RETURN CONFUSION CARRIES TWO FAMILIES, not one, and deliberately so. One asks
what the caller receives; the other asks which of two functions can have its result used further
on. A student can predict the first correctly and still choose wrongly on the second.
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
# FN_FAM01_FUNCTION_PURPOSE — D1 x4 (1 legacy), D2 x1 (legacy)
# =========================================================================
q('GB_FN_001', 'FN_FAM01_FUNCTION_PURPOSE', 'D1',
  'Which of these is the best candidate to be made into a function?',
  'Checking that an email address is well formed, which several different forms all need',
  ['A single line that appears exactly once in the whole program',
   'A comment describing what the program does',
   'A variable holding the title shown at the top of the screen'],
  'Work that is needed in more than one place is what a function saves from being written out '
  'repeatedly. A line used once gains nothing from being named, and a comment or a variable is '
  'not work at all.',
  provenance='LEGACY_REMAP', source='195e7a')

q('GB_FN_002', 'FN_FAM01_FUNCTION_PURPOSE', 'D1',
  'What does giving a piece of work a name as a function provide?',
  'One place where that work is written, which every use of it shares',
  ['Faster execution than writing the same lines out',
   'Protection against the work being changed later',
   'A guarantee that the work is correct'],
  'The gain is that the work exists once rather than in many copies, so a change reaches every '
  'use. Nothing about naming makes code faster, safer from edits, or correct.')

q('GB_FN_003', 'FN_FAM01_FUNCTION_PURPOSE', 'D1',
  'A program defines a function and never calls it. What does that function do?',
  'Nothing; a definition describes work without performing it',
  ['It runs once, at the point where it is defined',
   'It runs at the end of the program',
   'It causes the program to refuse to start'],
  'Defining is describing; the body only runs when something calls it. An unused function is '
  'harmless rather than an error, which is exactly why an uncalled function can sit unnoticed.')

q('GB_FN_004', 'FN_FAM01_FUNCTION_PURPOSE', 'D1',
  'Two programs behave identically. One writes the same eight lines in four places; the other '
  'defines them once as a function and calls it four times. What differs?',
  'How many places have to be edited when those eight lines need to change',
  ['How quickly the program runs',
   'How much output the program produces',
   'Whether the program is allowed to run at all'],
  'The behaviour is stated to be identical, so output and legality are settled; what a function '
  'changes is the cost of the next change. Four copies means four edits and one chance to miss '
  'one.')

q('GB_FN_005', 'FN_FAM01_FUNCTION_PURPOSE', 'D2',
  'The same tax calculation is needed in twenty places. What does defining it once as a function '
  'give you?',
  'A single place to correct when the tax rule changes',
  ['A calculation that runs faster than twenty copies would',
   'A calculation that runs by itself wherever it is needed',
   'Compliance with a language rule forbidding repeated code'],
  'Twenty copies all work until the rule changes, and then nineteen of them are wrong until '
  'someone finds them. A function still has to be called at each of the twenty places; what it '
  'removes is twenty copies of the logic.',
  provenance='LEGACY_REMAP', source='1bd756')

# =========================================================================
# FN_FAM02_DEFINITION_VS_CALL — D1 x3, D2 x1
# =========================================================================
q('GB_FN_006', 'FN_FAM02_DEFINITION_VS_CALL', 'D1',
  'A fragment defines a function whose body prints "hello", and the fragment contains nothing '
  'else. What is printed?',
  'Nothing',
  ['hello, once', 'hello, twice', 'An error message about the function never being used'],
  'The body belongs to the definition and runs only when the function is called, and nothing here '
  'calls it. A function that is never used is not an error.')

q('GB_FN_007', 'FN_FAM02_DEFINITION_VS_CALL', 'D1',
  'A fragment defines a function that prints a greeting, and below the definition it contains one '
  'call to that function. How many greetings appear?',
  'One',
  ['Two: one where it is defined and one where it is called',
   'None, because defining it and calling it cancel out',
   'One, appearing before the definition is reached'],
  'Only the call performs the work, so a single call yields a single greeting. Counting the '
  'definition as a run would predict two where the code produces one.')

q('GB_FN_008', 'FN_FAM02_DEFINITION_VS_CALL', 'D1',
  'When does the body of a function run?',
  'Each time the function is called',
  ['Once, when the function is defined',
   'Once at the definition and again at each call',
   'Automatically at the end of the program'],
  'A definition names work and a call performs it, so the number of runs is the number of calls — '
  'which may be none. Nothing runs a function on the program\'s behalf.')

q('GB_FN_009', 'FN_FAM02_DEFINITION_VS_CALL', 'D2',
  'A fragment defines a function that prints a line, then calls it, then calls it again. How many '
  'lines are printed?',
  'Two',
  ['Three, counting the definition', 'One, since the body exists only once',
   'None, because the second call reuses the first result'],
  'Each call runs the body once, so two calls print two lines. The body existing once is about '
  'where the code lives, not how often it runs, and nothing is reused between calls.')

# =========================================================================
# FN_FAM03_PARAMETER_VS_ARGUMENT — D1 x3, D2 x1 (legacy)
# =========================================================================
q('GB_FN_010', 'FN_FAM03_PARAMETER_VS_ARGUMENT', 'D1',
  'A function is defined as def greet(name): and later called as greet("Sam"). Which is the '
  'parameter?',
  'name',
  ['"Sam"', 'greet', 'The value the function sends back'],
  'The parameter is the name written in the definition, standing for whatever will be supplied. '
  'The value supplied at the call is the argument, and the function\'s own name is neither.')

q('GB_FN_011', 'FN_FAM03_PARAMETER_VS_ARGUMENT', 'D1',
  'A function is defined as def area(width, height): and called as area(3, 7). Which are the '
  'arguments?',
  '3 and 7',
  ['width and height', 'area, width and height', 'The value area sends back'],
  'Arguments are the values handed over at the call, so here they are 3 and 7; width and height '
  'are the names waiting to receive them. The returned value travels the other way.')

q('GB_FN_012', 'FN_FAM03_PARAMETER_VS_ARGUMENT', 'D1',
  'How many parameters does a function defined as def total(a, b, c): have?',
  'Three',
  ['One, since they are written in a single pair of brackets',
   'None, until the function is called',
   'Four, counting the function name'],
  'Each name inside the brackets is a parameter, so there are three regardless of whether the '
  'function has ever been called. Parameters exist in the definition; arguments appear at a call.')

q('GB_FN_013', 'FN_FAM03_PARAMETER_VS_ARGUMENT', 'D2',
  'A function is defined as def price_with_tax(price): and called as price_with_tax(250). Which '
  'statement is correct?',
  'price is the parameter and 250 is the argument',
  ['250 is the parameter and price is the argument',
   'Both are parameters, since both stand for the same value',
   'price is the parameter and the returned value is the argument'],
  'The definition names what it expects and the call supplies it, so the name is the parameter '
  'and the supplied value the argument. Every later error message uses these two words to mean '
  'exactly these two things.',
  provenance='LEGACY_REMAP', source='18220c')

# =========================================================================
# FN_FAM04_CALL_ORDER_TRACE — D2 x2, D3
# =========================================================================
q('GB_FN_014', 'FN_FAM04_CALL_ORDER_TRACE', 'D2',
  'A fragment defines a function that prints "inside". Below the definition it prints "before", '
  'then calls the function, then prints "after". In what order does the output appear?',
  'before, inside, after',
  ['inside, before, after', 'before, after, inside', 'inside, after, before'],
  'The definition produces no output where it stands, and the call runs the body at the point the '
  'call is reached, after which the caller carries on. Output follows the order things run, not '
  'the order they are written.')

q('GB_FN_015', 'FN_FAM04_CALL_ORDER_TRACE', 'D2',
  'A function prints "start" and then "end". A program prints "A", calls that function, and '
  'prints "B". In what order does the output appear?',
  'A, start, end, B',
  ['A, B, start, end', 'start, end, A, B', 'A, start, B, end'],
  'The call runs the whole body before the caller resumes, so both of the function\'s lines '
  'appear together between the caller\'s two. The caller is suspended, not run alongside.')

q('GB_FN_016', 'FN_FAM04_CALL_ORDER_TRACE', 'D3',
  'A function prints "in". A program prints "1", calls the function, prints "2", calls the '
  'function again, and prints "3". In what order does the output appear?',
  '1, in, 2, in, 3',
  ['1, 2, 3, in, in', 'in, in, 1, 2, 3', '1, in, in, 2, 3'],
  'Each call runs the body at the point it is reached, and control returns to the caller '
  'immediately afterwards. The two calls are therefore separated by whatever the caller does '
  'between them.')

# =========================================================================
# FN_FAM05_ARGUMENT_BINDING — D2 x2, D3   (non-commutative bodies only)
# =========================================================================
q('GB_FN_017', 'FN_FAM05_ARGUMENT_BINDING', 'D2',
  'A function is defined as def difference(a, b): return a - b. What does difference(10, 4) '
  'produce?',
  '6',
  ['-6', '14', 'An error, because the order of the values is not stated'],
  'Values are matched to names by position, so a takes 10 and b takes 4. Reversing that binding '
  'gives -6, which is exactly why the order of the arguments matters here and would not for '
  'addition.')

q('GB_FN_018', 'FN_FAM05_ARGUMENT_BINDING', 'D2',
  'With the same definition, def difference(a, b): return a - b, what does difference(4, 10) '
  'produce?',
  '-6',
  ['6', '14', 'The same as difference(10, 4), since the same two values are supplied'],
  'The first value goes to the first name whatever the values are, so a takes 4 and b takes 10. '
  'Supplying the same pair in the other order genuinely changes the answer.')

q('GB_FN_019', 'FN_FAM05_ARGUMENT_BINDING', 'D3',
  'A function is defined as def share(total, people): return total / people. A call is written as '
  'share(4, 100), intending 100 shared among 4. What is produced, and why?',
  '0.04, because 4 was bound to total and 100 to people',
  ['25, because the function works out which value is the total',
   '25, because the larger value is always the total',
   'An error, because the values are in the wrong order'],
  'Binding is by position alone; nothing inspects the values to work out what was meant. The call '
  'is perfectly valid and quietly computes the wrong thing, which is why a wrong order produces a '
  'wrong answer rather than a complaint.')

# =========================================================================
# FN_FAM06_RETURN_VALUE_USE — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_FN_020', 'FN_FAM06_RETURN_VALUE_USE', 'D2',
  'A function works out the square of a number and returns the result. What does a call to it '
  'evaluate to?',
  'The squared value, which the caller can store or use further',
  ['Nothing; the value exists only inside the function',
   'The number that was passed in',
   'The text of the calculation that was performed'],
  'A returned value is handed back to whatever made the call and can be assigned, printed or fed '
  'into another calculation. Without a return the value would indeed be trapped inside.',
  provenance='LEGACY_REMAP', source='18c043')

q('GB_FN_021', 'FN_FAM06_RETURN_VALUE_USE', 'D3',
  'A fragment defines def add(a, b): return a + b, and then runs print(add(2, 4)). What is '
  'printed?',
  '6',
  ['2', '4', '24'],
  'The call is worked out first and evaluates to the returned sum, 6, which is what print then '
  'displays. Answering 24 would be the two arguments joined as text, which addition of numbers '
  'does not do.',
  provenance='LEGACY_REMAP', source='6ec202')

q('GB_FN_022', 'FN_FAM06_RETURN_VALUE_USE', 'D4',
  'A function is meant to add every value in a list and return the total. It returns the first '
  'value instead. The addition line is correct and the loop covers every item. What is wrong?',
  'The return sits inside the loop, so the function ends on the first pass',
  ['The total is initialised inside the loop rather than before it',
   'The return sends back the loop variable rather than the total',
   'The loop stops after one pass because the list has one item'],
  'A return ends the function immediately, so placing it inside the loop means later passes never '
  'happen — which is why exactly one value comes back. Initialising inside the loop would return '
  'the last value rather than the first.',
  evidence='The addition line is correct and the loop covers every item')

# =========================================================================
# FN_FAM07_MISSING_RETURN — D2, D3 (legacy), D4
# =========================================================================
q('GB_FN_023', 'FN_FAM07_MISSING_RETURN', 'D2',
  'A function prints a value but has no return. What does the caller receive?',
  'Nothing usable, even though the value appeared on screen',
  ['The value that was printed',
   'The last value assigned inside the function',
   'An error, raised when the function is defined'],
  'Printing sends a value to the screen and returning sends it to the caller; they are separate '
  'destinations. Seeing the value is exactly what makes this confusing — it was displayed, but '
  'never handed back.')

q('GB_FN_024', 'FN_FAM07_MISSING_RETURN', 'D3',
  'A function works out a value that the caller needs, but neither returns it nor prints it. What '
  'is the problem?',
  'The value never leaves the function, so the caller receives nothing',
  ['The value is sent back automatically as the last thing computed',
   'The caller has to print the function in order to see the value',
   'The function needs a second parameter through which to send the value back'],
  'Work done inside a function stays there unless something is returned, and nothing is returned '
  'by default. Parameters carry values in, not out.',
  provenance='LEGACY_REMAP', source='be5bc0')

q('GB_FN_025', 'FN_FAM07_MISSING_RETURN', 'D4',
  'A function prints a correct total. The caller stores the call\'s result and tries to add 10 to '
  'it, and the program fails at that line. The total appeared on screen correctly just beforehand. '
  'What is wrong?',
  'The function prints the total without returning it, so the caller stored nothing usable',
  ['The total was printed as text, so it must be converted before adding',
   'The addition should have been done inside the function',
   'The caller stored the result before the function had finished'],
  'The correct total on screen proves the arithmetic inside the function is fine, and the failure '
  'at the addition shows what came back is not a number. Printing puts a value on the screen and '
  'nowhere else.',
  evidence='The total appeared on screen correctly just beforehand')

# =========================================================================
# FN_FAM08_CALL_INDEPENDENCE — D2, D3, D4
# =========================================================================
q('GB_FN_026', 'FN_FAM08_CALL_INDEPENDENCE', 'D2',
  'A function creates a counter set to 0, adds 1 to it, and returns it. It is called twice. What '
  'do the two calls return?',
  '1 and 1',
  ['1 and 2', '0 and 1', '1, and then an error on the second call'],
  'Each call starts the body afresh, so the counter is created and set to 0 again every time. '
  'Nothing from the first call survives into the second.')

q('GB_FN_027', 'FN_FAM08_CALL_INDEPENDENCE', 'D3',
  'A function takes a number, adds 5 to it and returns the result. It is called with 10, and then '
  'called with 10 again. What do the two calls return?',
  '15 and 15',
  ['15 and 20', '15, and then nothing on the second call',
   '15 and 15, but only if the result of the first call was stored'],
  'The same arguments give the same result, because a call does not remember what an earlier one '
  'produced. Accumulation across calls only happens if something outside the function keeps the '
  'value.')

q('GB_FN_028', 'FN_FAM08_CALL_INDEPENDENCE', 'D4',
  'A function is meant to accumulate a running total across several calls, and it returns the '
  'same value every time. Its arithmetic is correct and it is genuinely being called repeatedly. '
  'What is wrong?',
  'The total is created inside the function, so each call starts it again from its initial value',
  ['The function returns before the addition happens',
   'The calls are being made with the same argument each time',
   'The total is being printed rather than returned'],
  'That the arithmetic works and the calls happen leaves only where the total lives. A value that '
  'must survive between calls has to be held outside the function or passed in and out; created '
  'inside, it is new every time.',
  evidence='Its arithmetic is correct and it is genuinely being called repeatedly')

# =========================================================================
# FN_FAM09_LOCAL_SCOPE — D3 x2, D4
# =========================================================================
q('GB_FN_029', 'FN_FAM09_LOCAL_SCOPE', 'D3',
  'A function creates a variable called temp inside its body. After the function returns, the '
  'program tries to display temp. What happens?',
  'It fails, because temp existed only while the function was running',
  ['It displays the value temp held when the function ended',
   'It displays nothing and carries on',
   'It displays 0, the value an unset variable takes'],
  'A name created inside a function is gone once the function ends, so using it outside refers to '
  'nothing at all. No default value appears in its place.')

q('GB_FN_030', 'FN_FAM09_LOCAL_SCOPE', 'D3',
  'A function reads a variable that was created outside it and never assigns to anything of that '
  'name. Can it see the outer value?',
  'Yes; reading a name it has not created of its own reaches the outer one',
  ['No; a function can only see the values passed to it as arguments',
   'No; reading an outer name from inside a function fails',
   'Yes, but only if the name is also listed as a parameter'],
  'Reading reaches outwards when nothing of that name exists locally, which is why a function can '
  'quietly depend on something it was never given. Relying on that rather than on a parameter is '
  'what makes such a function hard to reuse.')

q('GB_FN_031', 'FN_FAM09_LOCAL_SCOPE', 'D4',
  'A function works correctly when run in one program and fails when the same function is copied '
  'into another. Its parameters and its body are unchanged, and it is called with the same '
  'arguments. What is the likely cause?',
  'It reads a variable it never received as an argument, and that variable exists only in the '
  'first program',
  ['The second program calls it before it is defined',
   'The function returns a value the second program does not use',
   'Copying a function between programs is not permitted'],
  'Identical code and identical arguments producing different results points at something the '
  'function uses but was not given. A dependency on an outer name travels invisibly, which is '
  'exactly why it survives the copy and the value does not.',
  evidence='Its parameters and its body are unchanged, and it is called with the same arguments')

# =========================================================================
# FN_FAM10_SHADOWING — D3, D4
# =========================================================================
q('GB_FN_032', 'FN_FAM10_SHADOWING', 'D3',
  'A program sets count to 10. A function has a parameter also called count, and its body sets '
  'count to 99. After the call, what does the program\'s count hold?',
  '10',
  ['99', '109', 'Nothing, because the name was used twice'],
  'The parameter is a separate variable that happens to share a name, so assigning to it leaves '
  'the outer one alone. Reusing a name is legal and silent, which is what makes the effect easy '
  'to misjudge.')

q('GB_FN_033', 'FN_FAM10_SHADOWING', 'D4',
  'A function is meant to update a total held by the program. It assigns to a name matching that '
  'total, and the function itself computes the right value. After the call the program\'s total '
  'is unchanged. What is wrong?',
  'The assignment created a separate variable inside the function, leaving the outer total '
  'untouched',
  ['The function was never actually called',
   'The total was assigned before the function ran and then overwritten',
   'Two variables cannot share a name, so the assignment was ignored'],
  'The right value being computed rules out the arithmetic, and the outer total being unchanged '
  'rules out the call not happening — a call that did nothing would still have run. Assigning '
  'inside a function creates something local unless a value is returned and stored.',
  evidence='the function itself computes the right value')

# =========================================================================
# FN_FAM11_RETURN_VS_PRINT — D3, D4 x2
# =========================================================================
q('GB_FN_034', 'FN_FAM11_RETURN_VS_PRINT', 'D3',
  'Two functions differ only in their last line: one prints the total it computed, the other '
  'returns it. Which can have its result used in a further calculation?',
  'Only the one that returns',
  ['Only the one that prints, since its value is visible',
   'Both, since both produce the total',
   'Neither, without storing the total in an outer variable first'],
  'A further calculation needs the value handed back to the caller, which is what returning does '
  'and printing does not. Being visible on screen puts a value where a person can read it and '
  'nowhere the program can.')

q('GB_FN_035', 'FN_FAM11_RETURN_VS_PRINT', 'D4',
  'A function that prints its result is used in ten places. Nine of them only need the value '
  'displayed and work perfectly; the tenth needs to add it to another figure and fails. What is '
  'the smallest change that serves all ten?',
  'Make the function return the value, and let each caller print it if it needs to',
  ['Add a return alongside the print, so the function does both',
   'Give the tenth caller its own copy of the function that returns instead',
   'Have the tenth caller read the value back from the screen'],
  'Nine callers working shows printing meets a need, and one failing shows printing alone cannot '
  'meet every need. Returning serves both, since a caller that wants it displayed can print what '
  'it receives, whereas a function that prints leaves the choice to nobody.',
  evidence='Nine of them only need the value displayed and work perfectly')

q('GB_FN_036', 'FN_FAM11_RETURN_VS_PRINT', 'D4',
  'A function both prints its result and returns it. A caller stores the returned value and uses '
  'it correctly, but unwanted output appears on screen every time. What does that show?',
  'Returning and printing are independent, and the function is doing both',
  ['The return is what produced the output',
   'The caller must have printed the stored value itself',
   'A function cannot both print and return, so one of the two is being ignored'],
  'The stored value being correct shows the return worked, and the output appearing shows the '
  'print did too. They are separate destinations, and a function can send a value to both — which '
  'is convenient until a caller wants only one.',
  evidence='A caller stores the returned value and uses it correctly, but unwanted output appears '
           'on screen every time')

# =========================================================================
# FN_FAM12_DECOMPOSITION_CHOICE — D3, D4, D5 x3
# =========================================================================
q('GB_FN_037', 'FN_FAM12_DECOMPOSITION_CHOICE', 'D3',
  'A program reads marks, works out an average, and displays a grade. Which split into functions '
  'is best?',
  'One function to read the marks, one to compute the average, one to decide the grade',
  ['One function containing all three steps, called once',
   'One function for the first half of the lines and one for the second half',
   'One function per line of the original program'],
  'Each of the three steps is one nameable piece of work with its own input and result, which is '
  'what makes them separable. Splitting on how many lines there are cuts across the work rather '
  'than along it.')

q('GB_FN_038', 'FN_FAM12_DECOMPOSITION_CHOICE', 'D4',
  'A program is split into two functions. Each of them works correctly when tested on its own, '
  'but the first must be called before the second or the second gives a wrong answer, and nothing '
  'passes between them. What does that show about the split?',
  'The two share hidden state, so they are not as separate as their definitions suggest',
  ['The split is correct; order of calls always matters',
   'The second function has a fault that only appears in combination',
   'The two should be merged, since any dependency means a split is wrong'],
  'Nothing passing between them, yet order mattering, means something is being communicated '
  'invisibly. A dependency is not itself wrong — but one carried by hidden state rather than by '
  'arguments and results is what makes each function untestable in isolation.',
  evidence='the first must be called before the second or the second gives a wrong answer, and '
           'nothing passes between them')

q('GB_FN_039', 'FN_FAM12_DECOMPOSITION_CHOICE', 'D5',
  'A single function does three things: it reads a file, filters the records, and writes a '
  'report. A new requirement asks for the same filtering applied to records arriving over a '
  'network instead. What does the existing structure cost?',
  'The filtering cannot be reused without also taking the file reading, so it has to be copied or '
  'the function split',
  ['Nothing; the function can be called with a different file',
   'Nothing; filtering is a small part of the work',
   'The report writing must be rewritten as well'],
  'Work bundled together can only be reused together. The new requirement wants one of the three '
  'pieces, and the bundle offers no way to take it alone — which is what "does one thing" is '
  'protecting against.',
  mode='TRANSFER', hinge='the same filtering applied to records arriving over a network instead')

q('GB_FN_040', 'FN_FAM12_DECOMPOSITION_CHOICE', 'D5',
  'A twenty-line program could be left as one function or split into five of four lines each. On '
  'what grounds should the choice be made?',
  'On whether each part does something nameable in its own right, not on how many lines result',
  ['On the line count, since shorter functions are always better',
   'On the line count, since fewer functions are always simpler',
   'On which version runs faster'],
  'Splitting by length produces parts that have names but no meaning, and joining unrelated work '
  'produces a function that cannot be described in a sentence. Whether a part can be named '
  'honestly is the test; the line count is a symptom at best.',
  mode='TRADEOFF', hinge='left as one function or split into five of four lines each')

q('GB_FN_041', 'FN_FAM12_DECOMPOSITION_CHOICE', 'D5',
  'A function is split into two so that each can be tested separately. The two are then only ever '
  'called one immediately after the other, and neither is used anywhere else. Was the split worth '
  'making?',
  'It may be, if each half can now be checked on its own — but the reuse it usually buys is not '
  'available here',
  ['Yes, unconditionally; more functions is always better structure',
   'No; a split that produces no reuse is always waste',
   'No; two functions always called together are equivalent to one'],
  'Splitting buys two different things — reuse and testability — and here only the second is on '
  'offer. Judging the split means naming which benefit applies, rather than treating the split '
  'itself as the goal.',
  mode='TRADEOFF', hinge='only ever called one immediately after the other, and neither is used '
                         'anywhere else')

# =========================================================================
# FN_FAM13_FUNCTION_BUG_DIAGNOSIS — D4, D5 x4
# =========================================================================
q('GB_FN_042', 'FN_FAM13_FUNCTION_BUG_DIAGNOSIS', 'D4',
  'A function should return the largest value in a list. It returns the correct answer whenever '
  'the largest value happens to be first, and a wrong one otherwise. What is the fault?',
  'It returns during the first pass of the loop instead of after the loop finishes',
  ['The comparison is the wrong way round, so it finds the smallest',
   'The running maximum starts at zero rather than at the first item',
   'The list is being read in reverse'],
  'Being right exactly when the answer is first is the signature of returning too early: only the '
  'first item is ever considered. A reversed comparison would be right when the largest is last, '
  'and a zero starting value would fail only on all-negative data.',
  evidence='It returns the correct answer whenever the largest value happens to be first')

q('GB_FN_043', 'FN_FAM13_FUNCTION_BUG_DIAGNOSIS', 'D5',
  'A function returns the right answer for every list of exactly one item, and the wrong answer '
  'for longer lists. Which fault fits that pattern, and why does the single-item case hide it?',
  'A return placed inside the loop; with one item, ending after the first pass is indistinguishable '
  'from ending after the loop',
  ['A missing return; a single item happens to be returned by default',
   'A shadowed name; single-item lists do not use the shadowed variable',
   'An uninitialised total; one item needs no starting value'],
  'The two behaviours — stopping after one pass and completing the loop — agree exactly when the '
  'loop has one pass. That is what makes a single-item test useless here and a two-item test '
  'decisive.',
  mode='TRANSFER', hinge='the right answer for every list of exactly one item')

q('GB_FN_044', 'FN_FAM13_FUNCTION_BUG_DIAGNOSIS', 'D5',
  'A function computes correctly and the caller receives None. Which fault produces exactly that, '
  'and how does it differ from a function that fails outright?',
  'The function has no return, so it hands back nothing; a fault inside the body would have '
  'stopped it instead',
  ['The return sends back a variable that was never assigned',
   'The caller stored the result before the function finished',
   'The function returns inside a branch that is never taken, which is the same thing'],
  'Receiving nothing rather than failing means the function ran to the end and simply had nothing '
  'to hand over. The last option is close and genuinely different: a return in an unreached '
  'branch also gives nothing back, but the function contains a return, so the fault is in the '
  'condition rather than in its absence.',
  mode='TRANSFER', hinge='the caller receives None')

q('GB_FN_045', 'FN_FAM13_FUNCTION_BUG_DIAGNOSIS', 'D5',
  'A function has two faults: it returns nothing, and its arithmetic is wrong. Which shows up '
  'first when the caller tries to use the result, and what does that mean for finding the other?',
  'The missing return, because the caller fails before any value could be checked; the arithmetic '
  'fault stays hidden until that is fixed',
  ['The arithmetic, because it is the more serious of the two',
   'Both at once, since the caller sees the result of both',
   'Neither, because two faults cancel each other out'],
  'A fault that prevents a value existing masks any fault in what the value would have been. '
  'Fixing one fault revealing another is normal rather than a sign of a new problem, and it is '
  'why "the bug is fixed" and "the test passes" are different claims.',
  mode='TRADEOFF', hinge='it returns nothing, and its arithmetic is wrong')

q('GB_FN_046', 'FN_FAM13_FUNCTION_BUG_DIAGNOSIS', 'D5',
  'A function gives the right answer when called once and a wrong one when called a second time '
  'with the same arguments. What must be true of it?',
  'Something it uses survives between calls, so the second call does not start from the same state',
  ['Its arithmetic is wrong, and the first answer was a coincidence',
   'The arguments are being bound in a different order the second time',
   'A function cannot behave differently on identical arguments, so the observation is mistaken'],
  'Identical inputs giving different outputs means the inputs are not the only thing the function '
  'depends on. Something outside it — or something inside it that outlives a call — is part of '
  'the input without appearing in the argument list.',
  mode='TRANSFER', hinge='a wrong one when called a second time with the same arguments')

# =========================================================================
# FN_FAM14_FUNCTION_EDGE_BEHAVIOUR — D4, D5 x3
# =========================================================================
q('GB_FN_047', 'FN_FAM14_FUNCTION_EDGE_BEHAVIOUR', 'D4',
  'A function returns the average of a list. Given an empty list it stops with an error, while a '
  'companion function that totals the same list returns 0 without complaint. What accounts for '
  'the difference?',
  'The average divides by a count of zero; totalling nothing simply adds nothing',
  ['The average reads the first item, which does not exist',
   'The totalling function silently returns nothing rather than 0',
   'An empty list cannot have its length taken'],
  'Both loops run zero times and both totals stay at their starting value; only one of the two '
  'then divides by that count. The length of an empty list is perfectly well defined, and being '
  'zero is precisely the problem.',
  evidence='a companion function that totals the same list returns 0 without complaint')

q('GB_FN_048', 'FN_FAM14_FUNCTION_EDGE_BEHAVIOUR', 'D5',
  'A function returns the first item of a list that matches a condition. What should it return '
  'when no item matches, and why does the choice matter?',
  'Something the caller can recognise as "nothing found", since returning a plausible value would '
  'be indistinguishable from a real match',
  ['Zero, because that is the natural empty answer',
   'The first item of the list, as the closest available match',
   'Nothing at all, and it should fail instead, since no answer exists'],
  'The caller has to be able to tell absence from a real result, and any ordinary value could '
  'itself have been a match. Failing is defensible for a genuine error, but finding no match is '
  'an expected outcome rather than a fault.',
  mode='TRANSFER', hinge='What should it return when no item matches')

q('GB_FN_049', 'FN_FAM14_FUNCTION_EDGE_BEHAVIOUR', 'D5',
  'A function counts how many items of a list exceed a threshold. What does it return for an '
  'empty list?',
  '0, which is correct and needs no special handling',
  ['Nothing, because there is no item to compare',
   'An error, because the threshold is never used',
   'The threshold itself, as no count was made'],
  'The loop runs zero times and the counter keeps the value it was given beforehand, which is the '
  'right answer: none of nothing exceeds anything. Adding a guard here would be extra code that '
  'can itself be wrong.',
  mode='EDGE', hinge='What does it return for an empty list')

q('GB_FN_050', 'FN_FAM14_FUNCTION_EDGE_BEHAVIOUR', 'D5',
  'A function is correct for every ordinary argument and wrong for one boundary argument. One '
  'proposal adds a special case for that argument; another changes the general rule so the '
  'boundary falls out of it correctly. Which is preferable, and what does each cost?',
  'Changing the general rule, where possible, since a special case is one more path that has to '
  'stay correct as the function changes',
  ['The special case, since it leaves the working behaviour untouched',
   'Either; they are equivalent once both give the right answer',
   'The special case, since general rules are harder to reason about'],
  'Both fix the symptom, and they differ in what they leave behind. A rule that handles the '
  'boundary needs no upkeep; a special case has to be remembered by everyone who edits the '
  'function afterwards. Where the rule genuinely cannot cover it, the special case is right — but '
  'that is a finding, not a default.',
  mode='TRADEOFF', hinge='One proposal adds a special case for that argument')
