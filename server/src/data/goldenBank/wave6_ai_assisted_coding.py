# -*- coding: utf-8 -*-
"""
Wave 6 — AI_ASSISTED_CODING, 50 Golden Bank questions, all newly authored.

THE FAULT IS ALWAYS HYPOTHESISED, NEVER OBSERVED. That single rule is what keeps this skill off
the banked debugging skill, which measures what to do once something has visibly failed. Here
nothing has failed yet: the student is handed code somebody else produced and asked what would
have to be true for it to be trusted. Which test would expose the doubt, what did it assume
silently, does the call it uses exist, what does a passing run establish. A stem that opened with
an error message would belong to the other skill.

EVERY API NAME IS INVENTED FOR THE QUESTION. A stem that rewarded recognising a real library
function would measure recall of that library, and would be wrong within two releases. The names
here are plausible and fictional, and the measurement is whether a student notices that
plausibility is not evidence.

TWO STEMS HAND OVER CODE THAT IS ENTIRELY CORRECT. A family where suspicion always pays teaches
suspicion rather than judgement, and a student who rejects every suggestion is as unemployable as
one who accepts every suggestion. The partial-correctness family and the acceptance family each
contain a case where the right answer is that nothing is wrong.

"ASK IT WHETHER IT IS SURE" IS OFFERED THROUGHOUT AS THE MOST ATTRACTIVE WRONG ANSWER. It is what
students actually do, it feels like verification, and it produces a second unverified claim by the
same process as the first.
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
# AC_FAM01_SUGGESTION_STATUS — D1 x4, D2 x1
# =========================================================================
q('GB_AC_001', 'AC_FAM01_SUGGESTION_STATUS', 'D1',
  'A generated suggestion compiles without complaint. What does that establish?',
  'That it is well formed, and nothing about whether it does the right thing',
  ['That it works correctly',
   'That it matches what was asked for',
   'That it has been checked'],
  'Compiling is a statement about form. Code that computes entirely the wrong answer compiles '
  'just as readily as code that computes the right one.')

q('GB_AC_002', 'AC_FAM01_SUGGESTION_STATUS', 'D1',
  'A suggestion arrives with a clear explanation of how it works. What has the explanation '
  'established?',
  'Nothing on its own; it was produced the same way the code was',
  ['That the author understood the problem',
   'That the code matches the explanation',
   'That the code has been tested'],
  'The explanation is another piece of generated text rather than a report on the code. Whether '
  'the two agree is something a reader has to check.')

q('GB_AC_003', 'AC_FAM01_SUGGESTION_STATUS', 'D1',
  'What is the status of a generated suggestion before anyone has examined it?',
  'A proposal that has not been checked',
  ['A working solution', 'A draft that is probably wrong',
   'A solution that works for the common case'],
  'It is neither established as right nor established as wrong. Assuming either without looking '
  'is what the review exists to prevent.')

q('GB_AC_004', 'AC_FAM01_SUGGESTION_STATUS', 'D1',
  'A developer accepts a suggestion without reading it, reasoning that it can be reverted if it '
  'turns out to be wrong. What does that reasoning overlook?',
  'That a wrong result may not announce itself, so there may be nothing prompting a revert',
  ['That reverting is technically difficult',
   'That the suggestion cannot be reverted once accepted',
   'Nothing; reverting is a sufficient safeguard'],
  'Reverting answers the case where the fault is noticed. The suggestions worth worrying about '
  'are the ones that produce plausible wrong answers quietly.')

q('GB_AC_005', 'AC_FAM01_SUGGESTION_STATUS', 'D2',
  'A developer refuses to use generated suggestions at all, on the grounds that they cannot be '
  'trusted. What is wrong with that position?',
  'Unverified is not the same as wrong; the suggestion needs checking rather than refusing',
  ['Nothing; generated code should never be used',
   'Generated suggestions are correct often enough to accept without checking',
   'The position is right for code and wrong for tests'],
  'Blanket refusal and blanket acceptance are the same error with the sign reversed: both replace '
  'looking at the code with a policy about where it came from.')

# =========================================================================
# AC_FAM02_REQUIREMENT_MATCH — D1 x3, D2 x1
# =========================================================================
q('GB_AC_006', 'AC_FAM02_REQUIREMENT_MATCH', 'D1',
  'A developer asks for a function returning the second largest value in a list. The suggestion '
  'sorts the list and returns the second element. Does it meet the requirement?',
  'No; it returns the second smallest',
  ['Yes, sorting then taking the second is correct',
   'Yes, provided the list has no duplicates',
   'It cannot be decided without running it'],
  'Sorting puts the smallest first, so the second element is the second smallest. The code is '
  'well written and answers a different question.')

q('GB_AC_007', 'AC_FAM02_REQUIREMENT_MATCH', 'D1',
  'A developer asks for a function that removes duplicates while keeping the original order. The '
  'suggestion removes duplicates and returns the values sorted. Does it meet the requirement?',
  'No; the ordering requirement was not met',
  ['Yes, since the duplicates were removed',
   'Yes, since sorting is a reasonable ordering',
   'It depends on whether the input was already sorted'],
  'Half the requirement was met and the other half was replaced with something else. Sorted is an '
  'order and not the order that was asked for.')

q('GB_AC_008', 'AC_FAM02_REQUIREMENT_MATCH', 'D1',
  'A suggestion is well written, clearly named and correctly indented, and computes a total that '
  'includes tax where the requirement said to exclude it. Should it be accepted?',
  'No; the style is good and the behaviour is wrong',
  ['Yes, since the style shows it was carefully produced',
   'Yes, with a comment noting the difference',
   'It cannot be decided without seeing the tax rate'],
  'Presentation and behaviour are independent. Well-written code that computes the wrong figure '
  'is harder to reject precisely because it looks finished.')

q('GB_AC_009', 'AC_FAM02_REQUIREMENT_MATCH', 'D2',
  'A reviewer rejects a suggestion because it uses a loop where the team usually uses a built-in '
  'operation. The behaviour is exactly what was requested. Is the rejection about the requirement?',
  'No; it is about house style, which is a separate matter from meeting the requirement',
  ['Yes; using the wrong construct means the requirement was not met',
   'Yes; house style is part of every requirement',
   'No, and style objections should never be raised'],
  'The style point may well be worth making and is not a requirement failure. Confusing the two '
  'makes review feedback impossible to prioritise.')

# =========================================================================
# AC_FAM03_INVENTED_REFERENCE — D1 x3, D2 x1
# =========================================================================
q('GB_AC_010', 'AC_FAM03_INVENTED_REFERENCE', 'D1',
  'A suggestion calls a method named parseFlexibleDate on a date library. Which part of the '
  'suggestion most needs checking before use?',
  'Whether that method exists in the library',
  ['Whether the variable names follow house style',
   'Whether the indentation is consistent',
   'Whether the call is on its own line'],
  'A plausible method name is exactly what generation produces, and one that does not exist fails '
  'only when the code runs. Layout can be checked at a glance and costs nothing if wrong.')

q('GB_AC_011', 'AC_FAM03_INVENTED_REFERENCE', 'D1',
  'A suggestion reads naturally and uses a helper called ensureSortedUnique that nobody on the '
  'team recognises. What follows?',
  'It has to be looked up, since reading naturally is not evidence that it exists',
  ['It exists, since the code would not have been produced otherwise',
   'It does not exist, since nobody recognises it',
   'It exists but has been renamed'],
  'Neither conclusion follows from recognition. The name is plausible whether or not there is '
  'anything behind it, which is the whole difficulty.')

q('GB_AC_012', 'AC_FAM03_INVENTED_REFERENCE', 'D1',
  'Why is a fabricated function name particularly easy to miss when reading a suggestion?',
  'Because it is named the way a real one would be',
  ['Because it is usually hidden in a comment',
   'Because it is usually spelled unusually',
   'Because it appears only in rarely executed branches'],
  'Naming things plausibly is what the process is good at. A fabricated name looks exactly like '
  'the name the library ought to have had.')

q('GB_AC_013', 'AC_FAM03_INVENTED_REFERENCE', 'D2',
  'A suggestion uses a method that turns out not to exist. A developer asks the generator whether '
  'the method exists, and is told that it does. What has been established?',
  'Nothing; the second answer was produced the same way as the first',
  ['That the method exists and the documentation is incomplete',
   'That the method exists in a newer version',
   'That the developer searched incorrectly'],
  'Confirming a claim by the process that produced it is not a check. The library documentation '
  'or the code itself is what settles the question.')

# =========================================================================
# AC_FAM04_ASSUMPTION_SPOTTING — D2 x1, D3 x1
# =========================================================================
q('GB_AC_014', 'AC_FAM04_ASSUMPTION_SPOTTING', 'D2',
  'A developer asks for a function that returns the average of a list of numbers. The suggestion '
  'divides the total by the count. What did it decide that the request did not specify?',
  'What to do when the list is empty',
  ['Which arithmetic operation to use for an average',
   'Whether the numbers are whole or fractional',
   'Whether to name the function average'],
  'An empty list makes the count zero, and the request never said what should happen. The '
  'suggestion has taken a position on it without saying so.')

q('GB_AC_015', 'AC_FAM04_ASSUMPTION_SPOTTING', 'D3',
  'A developer asks for a function that finds a user by email address. The suggestion compares the '
  'addresses exactly as given. What has it decided silently?',
  'That the comparison should distinguish upper and lower case',
  ['That the function should return one user rather than several',
   'That email addresses are strings',
   'That the search should be fast'],
  'Email addresses are commonly treated as case-insensitive, and the request did not say. Taking '
  'the simpler comparison is a decision that will show up as users not being found.')

# =========================================================================
# AC_FAM05_EDGE_OMISSION — D2 x1, D3 x1
# =========================================================================
q('GB_AC_016', 'AC_FAM05_EDGE_OMISSION', 'D2',
  'A suggestion returns the first item of a list that matches a condition. Which input would it '
  'not handle correctly?',
  'A list where nothing matches',
  ['A list where everything matches',
   'A list with exactly one item',
   'A list already in order'],
  'With nothing matching there is no first item to return, and the request never said what should '
  'happen. The other three all have a clear first match.')

q('GB_AC_017', 'AC_FAM05_EDGE_OMISSION', 'D3',
  'A suggestion splits a full name into a first and last name by taking the text before and after '
  'the first space. Which input would it handle wrongly?',
  'A name with three parts, where the middle part joins the surname',
  ['A name with two parts',
   'A name written in capitals',
   'A name with a hyphen in the surname'],
  'Three parts leave the middle name attached to the surname, which is silently wrong. A hyphen '
  'contains no space and is handled correctly.')

# =========================================================================
# AC_FAM06_TEST_SELECTION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AC_018', 'AC_FAM06_TEST_SELECTION', 'D2',
  'A reviewer suspects a suggestion mishandles an empty list. Which test settles it?',
  'Call it with an empty list and see what happens',
  ['Call it with a list of one item',
   'Call it with a long list',
   'Read the code again more carefully'],
  'The doubt names a specific input, so that input is the test. The other calls would pass '
  'whether or not the doubt is justified.')

q('GB_AC_019', 'AC_FAM06_TEST_SELECTION', 'D3',
  'A reviewer suspects a suggestion returns the second smallest value rather than the second '
  'largest. Which test distinguishes the two?',
  'A list whose second smallest and second largest values differ',
  ['A list of two identical values',
   'A list already sorted in increasing order',
   'A list of five identical values'],
  'The test has to be an input where the two behaviours give different answers. Identical values '
  'make the two indistinguishable, which is exactly what a test must not do.')

q('GB_AC_020', 'AC_FAM06_TEST_SELECTION', 'D4',
  'A reviewer suspects a suggestion treats email addresses as case-sensitive when it should not. '
  'A test using two addresses that differ in case would behave differently depending on whether '
  'the suspicion is right, and one using identical addresses would not. Which test settles it?',
  'Search for an address recorded in one case using the other case',
  ['Search for an address using exactly the case it was recorded in',
   'Search for an address that is not in the records at all',
   'Search for two different addresses in turn'],
  'Only the first produces different results under the two behaviours. Searching in the recorded '
  'case succeeds either way and would be read as evidence that nothing is wrong.',
  evidence='A test using two addresses that differ in case would behave differently depending on '
           'whether the suspicion is right')

# =========================================================================
# AC_FAM07_PARTIAL_CORRECTNESS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AC_021', 'AC_FAM07_PARTIAL_CORRECTNESS', 'D2',
  'A developer asks for a function that doubles every number in a list, giving the example [1, 2, '
  '3] to [2, 4, 6]. The suggestion adds each number to itself and matches the example. Is it '
  'correct in general?',
  'Yes; adding a number to itself is doubling it for every number',
  ['No; it only works for the example given',
   'No; it will fail for negative numbers',
   'It cannot be decided without more examples'],
  'The method is different from the obvious one and is equivalent for every number, including '
  'negatives and zero. Not every unexpected approach is a fault.')

q('GB_AC_022', 'AC_FAM07_PARTIAL_CORRECTNESS', 'D3',
  'A developer asks for a function that reports whether a year is a leap year, giving 2024 as an '
  'example. The suggestion returns true whenever the year divides by four, and is right about '
  '2024. Is it correct in general?',
  'No; years divisible by 100 but not by 400 are exceptions it gets wrong',
  ['Yes; divisibility by four is the rule',
   'No; it will be wrong for every year after 2100',
   'Yes, for any year in the current century'],
  'The example is one of the many years the simple rule handles correctly. The rule fails on 1900 '
  'and 2100, which the example could never have revealed.')

q('GB_AC_023', 'AC_FAM07_PARTIAL_CORRECTNESS', 'D4',
  'A developer asks for a function returning the largest value in a list, with the example [3, 9, '
  '4] giving 9. The suggestion returns the last value after sorting, and matches the example. '
  'Sorting places the largest value last, so the method is equivalent to taking the largest for '
  'every list. What follows?',
  'It is correct in general, though it does more work than necessary',
  ['It is correct only for the example given',
   'It is wrong, since it sorts rather than searching',
   'It is wrong for lists containing duplicates'],
  'The approach is inefficient and correct, and those are separate findings. Rejecting it for '
  'correctness would be a wrong review comment on working code.',
  evidence='Sorting places the largest value last, so the method is equivalent to taking the '
           'largest for every list')

# =========================================================================
# AC_FAM08_CONTEXT_MISMATCH — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AC_024', 'AC_FAM08_CONTEXT_MISMATCH', 'D2',
  'A team stores all money as whole numbers of the smallest currency unit. A suggestion introduces '
  'a fractional value to hold a price. What is the problem?',
  'It uses a representation the rest of the codebase does not, so values will not combine '
  'correctly',
  ['Fractional values are always wrong for money',
   'The suggestion is too slow',
   'Nothing; the two representations are interchangeable'],
  'The suggestion is sound in isolation and inconsistent here. Mixing the two representations is '
  'where the errors arrive.')

q('GB_AC_025', 'AC_FAM08_CONTEXT_MISMATCH', 'D3',
  'A team handles every failure by returning a result object describing what went wrong. A '
  'suggestion raises an exception instead. What is the difficulty?',
  'Callers in this codebase inspect returned results and will not be handling exceptions',
  ['Exceptions are always the wrong approach',
   'The suggestion will not compile',
   'Nothing; both approaches signal failure'],
  'Both are legitimate ways of reporting failure and the surrounding code only handles one. The '
  'exception will travel further than anyone expects.')

q('GB_AC_026', 'AC_FAM08_CONTEXT_MISMATCH', 'D4',
  'A suggestion is technically correct and uses a naming style unlike the rest of the file. A '
  'reviewer wants to know how seriously to take this. The naming differs from the file and the '
  'behaviour matches the requirement exactly. How should it be recorded?',
  'As a style point worth fixing, kept separate from whether the code is correct',
  ['As a correctness problem, since consistency is a requirement',
   'As nothing at all, since naming does not affect behaviour',
   'As grounds for rejecting the suggestion entirely'],
  'Naming matters and does not make the code wrong. Grading every observation as a defect makes '
  'the genuinely broken things harder to see.',
  evidence='The naming differs from the file and the behaviour matches the requirement exactly')

# =========================================================================
# AC_FAM09_EXPLANATION_CHECK — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AC_027', 'AC_FAM09_EXPLANATION_CHECK', 'D2',
  'A suggestion arrives with the note "this handles the empty case by returning zero". The code '
  'contains no check for an empty input. What follows?',
  'The explanation describes something the code does not do',
  ['The code handles it implicitly, as the note says',
   'The note refers to a different version of the code',
   'The note is correct and the code should be trusted'],
  'The note and the code disagree, and the code is what runs. That the note sounds reassuring is '
  'why the disagreement is worth looking for.')

q('GB_AC_028', 'AC_FAM09_EXPLANATION_CHECK', 'D3',
  'A suggestion is described as "sorting the list in place to avoid allocating a copy". The code '
  'produces a new sorted list and leaves the original untouched. What is the consequence?',
  'The original is unchanged, so any caller relying on the described behaviour will be wrong',
  ['No consequence; both approaches sort the list',
   'The code is faster than described',
   'The code will fail to compile'],
  'A caller who believed the note would expect the original to be sorted afterwards, and it is '
  'not. The code may be preferable and it is not what was advertised.')

q('GB_AC_029', 'AC_FAM09_EXPLANATION_CHECK', 'D4',
  'A suggestion is accompanied by a clear, plausible and internally consistent explanation. The '
  'code does exactly what the explanation says. The explanation and the code agree with each '
  'other, and neither has been compared against the stated requirement. What has been '
  'established?',
  'That the two agree; nothing yet about whether either meets the requirement',
  ['That the code is correct',
   'That the code meets the requirement',
   'That the explanation was written by someone who understood the task'],
  'Agreement between the two rules out one class of fault and not the one that matters most. Both '
  'can describe the same wrong behaviour perfectly.',
  evidence='The explanation and the code agree with each other, and neither has been compared '
           'against the stated requirement')

# =========================================================================
# AC_FAM10_ACCEPTANCE_CONDITION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_AC_030', 'AC_FAM10_ACCEPTANCE_CONDITION', 'D2',
  'A suggestion adds a line to a script that runs once, prints a report, and is read by the person '
  'who ran it. What most needs establishing before accepting?',
  'That the printed figures are right, which the reader will see immediately',
  ['That the code follows the team naming conventions',
   'That the code would work at a much larger scale',
   'That every branch has a test'],
  'The consequence of an error here is a wrong number in front of someone who is looking at it. '
  'The checks worth making are the ones proportionate to that.')

q('GB_AC_031', 'AC_FAM10_ACCEPTANCE_CONDITION', 'D3',
  'A suggestion changes how refunds are calculated in a system that issues thousands of refunds a '
  'day with nobody reviewing them individually. What most needs establishing?',
  'That the calculation is right for the awkward cases, since nobody will notice if it is not',
  ['That the code is readable',
   'That the change is small',
   'That the code runs quickly enough'],
  'Volume and the absence of a reader are what raise the stakes here. A wrong refund calculation '
  'will be applied thousands of times before anyone notices.')

q('GB_AC_032', 'AC_FAM10_ACCEPTANCE_CONDITION', 'D4',
  'Two suggestions are up for acceptance. One changes a log message. One changes how a customer '
  'balance is computed. Both are equally well written and equally short. One of the two would '
  'produce wrong figures for customers if it were incorrect, and the other would produce a '
  'confusing log line. How should the checking effort be divided?',
  'Overwhelmingly onto the balance calculation, because of what a wrong result would cost',
  ['Equally, since both are equally short',
   'Equally, since both are equally well written',
   'Onto the log message, since logs are read more often'],
  'Length and quality of writing say nothing about consequence. What a mistake would cost is what '
  'decides how much checking is worth doing.',
  evidence='One of the two would produce wrong figures for customers if it were incorrect')

# =========================================================================
# AC_FAM11_PLAUSIBLE_FAULT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_AC_033', 'AC_FAM11_PLAUSIBLE_FAULT_DIAGNOSIS', 'D3',
  'A suggestion computes a running total. '
  'Line 1: set total to zero. '
  'Line 2: for each item in the list. '
  'Line 3: set total to the item price. '
  'Line 4: return total. '
  'It returns the price of the last item rather than the sum. Which line is responsible?',
  'Line 3, which replaces the total instead of adding to it',
  ['Line 1, which starts the total at zero',
   'Line 4, where the wrong value is returned',
   'Line 2, which visits the items in the wrong order'],
  'Replacing rather than adding is the whole fault, and it reads almost identically to the '
  'correct version. Line 4 is where the wrong value becomes visible rather than where it arises.')

q('GB_AC_034', 'AC_FAM11_PLAUSIBLE_FAULT_DIAGNOSIS', 'D4',
  'A suggestion filters a list and reports the count. '
  'Line 1: set matches to an empty list. '
  'Line 2: for each item in the input. '
  'Line 3: if the item is active, add it to matches. '
  'Line 4: return the length of the input. '
  'The count returned is always the size of the whole input. The returned length is taken from '
  'the input rather than from the list that was built. Which line is responsible?',
  'Line 4, which measures the wrong list',
  ['Line 3, where the condition is wrong',
   'Line 1, which starts with an empty list',
   'Line 2, which visits every item rather than only the active ones'],
  'Everything up to the last line is correct and the result is discarded. The fault reads '
  'naturally because both lists are in scope and either name would look reasonable there.',
  evidence='The returned length is taken from the input rather than from the list that was built')

# =========================================================================
# AC_FAM12_SILENT_CHANGE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_AC_035', 'AC_FAM12_SILENT_CHANGE_DIAGNOSIS', 'D3',
  'A developer asks for a function to be made faster. The rewrite is faster and now returns '
  'results in sorted order, where the original preserved input order. What has changed beyond the '
  'request?',
  'The order of the results, which nobody asked to change',
  ['Nothing; the function is simply faster',
   'The speed, which was what was requested',
   'The names of the variables'],
  'Speed was requested and ordering was not. Any caller depending on the original order is now '
  'broken by a change that was described as an optimisation.')

q('GB_AC_036', 'AC_FAM12_SILENT_CHANGE_DIAGNOSIS', 'D4',
  'A developer asks for a function to be tidied. The rewrite is shorter, clearer, and now raises '
  'an error for negative input where the original returned zero. The request was to tidy the '
  'function, and the behaviour for negative input has changed as well. How should this be judged?',
  'The change to negative-input behaviour is unrequested and has to be decided deliberately',
  ['It is an improvement and should be accepted',
   'It is irrelevant, since tidying often changes details',
   'It is a fault in the rewrite and should be reverted without discussion'],
  'Raising on negative input may well be better than returning zero, and that is a decision '
  'nobody made. Improvements smuggled into a tidying change are the hardest to argue against and '
  'the easiest to miss.',
  evidence='The request was to tidy the function, and the behaviour for negative input has '
           'changed as well')

# =========================================================================
# AC_FAM13_VERIFICATION_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_AC_037', 'AC_FAM13_VERIFICATION_REASONING', 'D3',
  'A suggestion is run once with a typical input and produces the right answer. What does that '
  'establish?',
  'That it is right for that input',
  ['That it is right in general',
   'That it is right for every typical input',
   'Nothing at all'],
  'One passing run is real evidence about exactly one input. Extending it to inputs nobody tried '
  'is the step that has to be resisted.')

q('GB_AC_038', 'AC_FAM13_VERIFICATION_REASONING', 'D4',
  'A suggestion passes every test in an existing suite. The suite was written before the feature '
  'the suggestion implements. The suite contains no test exercising the new behaviour. What does '
  'passing establish?',
  'That the suggestion has not broken what was already covered; nothing about the new behaviour',
  ['That the suggestion is correct',
   'That the suite is inadequate and should be rewritten',
   'That the new behaviour works, since nothing failed'],
  'Passing an unrelated suite is a genuine and narrow result: no regression. The new behaviour '
  'has not been examined by anything.',
  evidence='The suite contains no test exercising the new behaviour')

q('GB_AC_039', 'AC_FAM13_VERIFICATION_REASONING', 'D5',
  'A developer asks the generator to write tests for its own suggestion, and every test passes. '
  'The tests were produced from the same understanding of the task as the code, so a '
  'misunderstanding would appear in both. What has been established?',
  'Little; a misunderstanding in the code would be reproduced in the tests',
  ['That the code is correct, since the tests pass',
   'That the tests are correct, since they pass',
   'Nothing whatever, so generated tests are worthless'],
  'Generated tests do catch careless slips and cannot catch a wrong reading of the requirement. '
  'Tests written from the requirement by someone else are what close that gap.',
  mode='EDGE',
  hinge='The tests were produced from the same understanding of the task as the code')

q('GB_AC_040', 'AC_FAM13_VERIFICATION_REASONING', 'D5',
  'A team accepts suggestions only when a reviewer can state what the code does without reading '
  'the accompanying explanation. Stating what the code does without the explanation requires '
  'reading the code itself rather than a description of it. What does this rule achieve?',
  'It forces the reviewer to read the code rather than the description of it',
  ['It slows review down without adding anything',
   'It guarantees the code is correct',
   'It replaces the need for tests'],
  'The rule targets the specific failure of reviewing the explanation instead of the code. It '
  'guarantees nothing about correctness and it removes one way of being fooled.',
  mode='TRANSFER',
  hinge='Stating what the code does without the explanation requires reading the code itself')

q('GB_AC_041', 'AC_FAM13_VERIFICATION_REASONING', 'D5',
  'A suggestion has been read, tested on three inputs including the awkward ones, and checked '
  'against the requirement. A developer says it is now proven correct. Testing three inputs '
  'establishes the behaviour on those three and leaves every other input unexamined. Is that '
  'right?',
  'No; it is well evidenced rather than proven, and the distinction matters for what comes next',
  ['Yes; reading, testing and checking together constitute proof',
   'No; nothing short of exhaustive testing is evidence',
   'Yes, provided the three inputs were well chosen'],
  'The work done is substantial and proportionate, and it is not proof. Treating it as proof is '
  'what stops anyone adding a test when a new case appears later.',
  mode='EDGE',
  hinge='Testing three inputs establishes the behaviour on those three')

# =========================================================================
# AC_FAM14_DELEGATION_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_AC_042', 'AC_FAM14_DELEGATION_CHOICE', 'D4',
  'Four tasks are candidates for generation. Converting a data file between two formats where the '
  'output can be compared against the input; naming variables in a private script; choosing an '
  'encryption scheme; estimating a project timeline. One of these produces a result that can be '
  'checked mechanically against something already known. Which is safest to delegate?',
  'Converting the data file, since the result can be compared against the input',
  ['Choosing the encryption scheme, since it is well-documented territory',
   'Estimating the timeline, since estimates are approximate anyway',
   'Naming the variables, since names cannot be wrong'],
  'Checkability rather than difficulty is what decides. An encryption choice that is subtly wrong '
  'is both consequential and hard for a beginner to detect.',
  evidence='One of these produces a result that can be checked mechanically against something '
           'already known')

q('GB_AC_043', 'AC_FAM14_DELEGATION_CHOICE', 'D5',
  'A student is learning to write loops and asks a generator to write the loops in their '
  'coursework. The coursework exists to demonstrate that the student can write loops, and a '
  'generated loop demonstrates nothing about the student. What is wrong?',
  'The generator has supplied the very thing the work exists to demonstrate',
  ['Nothing; using available tools is sensible',
   'The loops will be wrong and will need correcting',
   'The generator is unsuitable for loops specifically'],
  'The same request would be entirely reasonable in a job where the loops are a means to an end. '
  'What the work is for is what settles it.',
  mode='TRANSFER',
  hinge='The coursework exists to demonstrate that the student can write loops')

q('GB_AC_044', 'AC_FAM14_DELEGATION_CHOICE', 'D5',
  'A developer delegates a task they could not do themselves and could not check. The result '
  'looks reasonable. Neither producing the result nor evaluating it is within the developer '
  'reach, so nothing about it can be confirmed. What is the position?',
  'Nothing has been gained that can be relied on, since the result cannot be evaluated',
  ['A great deal has been gained, since the task is now done',
   'The result should be accepted and monitored in use',
   'The result is probably wrong and should be discarded'],
  'This is the case where delegation is most tempting and least defensible. Learning enough to '
  'evaluate it, or asking someone who can, is what turns the output into something usable.',
  mode='EDGE',
  hinge='Neither producing the result nor evaluating it is within the developer reach')

q('GB_AC_045', 'AC_FAM14_DELEGATION_CHOICE', 'D5',
  'A team can generate a first draft of a migration script in two minutes and would spend two '
  'hours writing it. Reviewing the generated draft carefully takes ninety minutes. The migration '
  'runs once against production data and cannot be undone. Reviewing takes ninety minutes against '
  'two hours of writing, and the migration cannot be undone. What follows?',
  'Generating still saves time, provided the ninety-minute review actually happens',
  ['Generating saves two hours, since the draft arrives in two minutes',
   'Generating saves nothing, since reviewing takes nearly as long',
   'The script should be written by hand because the stakes are high'],
  'The saving is thirty minutes rather than two hours, and it is real. It becomes a loss the '
  'moment the review is skipped because the draft looked fine.',
  mode='TRADEOFF',
  hinge='Reviewing takes ninety minutes against two hours of writing')

q('GB_AC_046', 'AC_FAM14_DELEGATION_CHOICE', 'D5',
  'A team forbids generated code in one repository and permits it in another. The forbidden one '
  'holds safety-critical control code reviewed line by line by two engineers. The permitted one '
  'holds internal reporting scripts. Both repositories are reviewed, and only one of them has '
  'consequences that a review might not catch. Is the distinction reasonable?',
  'Yes; the two differ in what an undetected error would cost',
  ['No; if review is trusted in one place it should be trusted in both',
   'No; generated code should be forbidden everywhere',
   'Yes, because reporting scripts are not really code'],
  'Both are reviewed and review is not perfect, which is why the residual risk differs. Applying '
  'one policy to both would either over-restrict the reports or under-protect the control code.',
  mode='TRADEOFF',
  hinge='only one of them has consequences that a review might not catch')

# =========================================================================
# AC_FAM15_UNFAMILIAR_SUGGESTION_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_AC_047', 'AC_FAM15_UNFAMILIAR_SUGGESTION_TRANSFER', 'D4',
  'A developer receives a suggestion in a language they cannot read. They can run it and they know '
  'exactly what the correct output is for several inputs. The developer cannot read the code and '
  'can determine the correct output independently for several inputs. What is the most useful step?',
  'Run it on those inputs and compare against the outputs they already know',
  ['Ask the generator to confirm that the code is correct',
   'Accept it, since it cannot be reviewed',
   'Reject it, since it cannot be reviewed'],
  'Not being able to read the code removes one form of checking and leaves another intact. '
  'Knowing the right answers independently is what makes the run informative.',
  evidence='The developer cannot read the code and can determine the correct output '
           'independently for several inputs')

q('GB_AC_048', 'AC_FAM15_UNFAMILIAR_SUGGESTION_TRANSFER', 'D5',
  'A developer cannot read a suggestion and cannot determine the correct output for any input. '
  'They ask the generator to explain the code and find the explanation convincing. The '
  'explanation was produced by the same process as the code and is not evidence about it. What '
  'has been established?',
  'Nothing; a convincing explanation from the same source is not a check',
  ['That the code does what the explanation says',
   'That the code is correct, since the explanation is coherent',
   'That the developer now understands the code'],
  'This is the single most attractive wrong move in the whole skill, because it feels exactly '
  'like verification. Finding a person who can read the language is what actually helps.',
  mode='EDGE',
  hinge='The explanation was produced by the same process as the code')

q('GB_AC_049', 'AC_FAM15_UNFAMILIAR_SUGGESTION_TRANSFER', 'D5',
  'A developer working in unfamiliar territory receives a suggestion using three constructs they '
  'do not recognise. They have time to investigate one. The three constructs differ in what a '
  'misunderstanding of each would cost if it were wrong. Which should they investigate?',
  'The one whose being wrong would matter most',
  ['The first one that appears in the code',
   'The one that looks most unusual',
   'The shortest one, since it can be checked quickest'],
  'Limited time is spent where the consequence is greatest rather than where curiosity points. '
  'Looking unusual is not correlated with mattering.',
  mode='TRANSFER',
  hinge='The three constructs differ in what a misunderstanding of each would cost')

q('GB_AC_050', 'AC_FAM15_UNFAMILIAR_SUGGESTION_TRANSFER', 'D5',
  'A team adopts a rule that any generated code touching money must be reproduced independently '
  'by a second person before acceptance, while other generated code needs one reviewer. '
  'Reproducing the work independently catches a misunderstanding that a reviewer reading the same '
  'code might share. What does the stricter rule buy?',
  'Protection against a shared misreading, which reviewing the same code cannot provide',
  ['Nothing beyond what careful review already provides',
   'A guarantee that the money code is correct',
   'Faster review, since two people work in parallel'],
  'A reviewer reading the code can be led down the same path its author was. Independent '
  'reproduction is the only one of these that does not share that starting point.',
  mode='TRADEOFF',
  hinge='Reproducing the work independently catches a misunderstanding that a reviewer reading '
        'the same code might share')
