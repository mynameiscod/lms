# -*- coding: utf-8 -*-
"""
Wave 3 — DSA_ARRAYS, 50 Golden Bank questions.

4 come from the existing bank, all remapped in from PROGRAMMING_FUNDAMENTALS and PYTHON_BASICS,
and 46 are new.

WORK IS MEASURED IN COUNTS AND IN WORDS, NEVER IN NOTATION. The blueprint says so: at Foundation
the point is that reading a position costs the same whatever the array's size while inserting at
the front does not, and that both being one line of code says nothing about either. Complexity
notation is not taught here and would let a student answer from a symbol rather than from the
work.

THE SORTING FAMILY DESCRIBES ITS METHOD IN THE STEM AND NAMES NO ALGORITHM, again by instruction.
A student who has memorised what the finished order looks like can answer a "sort this" question
without knowing what a pass does, so the items ask for the arrangement after one or two passes and
offer the fully sorted array as the distractor that catches exactly that.
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
# DA_FAM01_INDEX_RECOGNITION — D1 x4, D2 x1 (legacy)
# =========================================================================
q('GB_DA_001', 'DA_FAM01_INDEX_RECOGNITION', 'D1',
  'An array holds 40, 55, 62, 77. What value is at position 0?',
  '40',
  ['55', '77', 'There is no position 0'],
  'Positions are counted from zero, so position 0 holds the first value. Counting from one would '
  'give the second value instead.')

q('GB_DA_002', 'DA_FAM01_INDEX_RECOGNITION', 'D1',
  'An array holds red, green, blue, white, black. At what position is white?',
  '3',
  ['4', '2', '5'],
  'Counting red as position 0 puts white at position 3. Answering 4 counts from one, which is '
  'the commonest source of an off-by-one fault later.')

q('GB_DA_003', 'DA_FAM01_INDEX_RECOGNITION', 'D1',
  'An array holds 9, 4, 7, 1, 6. What value is at the last valid position?',
  '6',
  ['1', '5', 'There is no last position until the array is full'],
  'The last valid position holds the final value, which is 6. Answering 1 stops one position '
  'short, and 5 reports how many values there are rather than any of them.')

q('GB_DA_004', 'DA_FAM01_INDEX_RECOGNITION', 'D1',
  'An array holds 3 values. Which of these is a valid position?',
  '1',
  ['3', '4', '-2'],
  'Three values occupy positions 0, 1 and 2, so 1 is inside the array and 3 is one past the end. '
  'Using the count as a position is the single commonest array fault.')

q('GB_DA_005', 'DA_FAM01_INDEX_RECOGNITION', 'D2',
  'A collection holds 10, 20, 30, and a program reads the value at position 1. What does it get?',
  '20',
  ['10', '30', '1'],
  'Counting from zero makes position 1 the second value, which is 20. Answering 10 counts from '
  'one, and 1 reports the position rather than what is stored there.',
  provenance='LEGACY_REMAP', source='661b00')

# =========================================================================
# DA_FAM02_LENGTH_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_DA_006', 'DA_FAM02_LENGTH_RECOGNITION', 'D1',
  'An array holds 6 values. What is its last valid position?',
  '5',
  ['6', '7', '0'],
  'Six values occupy positions 0 to 5, so the last is one below the count. Treating the length as '
  'a position reads one past the end.')

q('GB_DA_007', 'DA_FAM02_LENGTH_RECOGNITION', 'D1',
  'An array occupies positions 0 to 8. How many values does it hold?',
  '9',
  ['8', '10', '7'],
  'Positions 0 to 8 inclusive is 9 positions, because the count includes both ends. Subtracting '
  'the two numbers gives 8 and forgets that both ends are occupied.')

q('GB_DA_008', 'DA_FAM02_LENGTH_RECOGNITION', 'D1',
  'An array holds no values at all. What is its length?',
  '0',
  ['1', 'Undefined', 'It cannot exist'],
  'An empty array is a perfectly ordinary array whose length is zero. It has no valid positions '
  'at all, which is different from having one.')

q('GB_DA_009', 'DA_FAM02_LENGTH_RECOGNITION', 'D2',
  'Someone says an array\'s length and its last valid position are the same number. When is that '
  'true?',
  'Never; the last position is always one below the length',
  ['Always; both count the items',
   'When the array holds exactly one item',
   'When the array is empty'],
  'Counting from zero puts the two exactly one apart for every array. A single item gives length '
  '1 and last position 0, and an empty array has length 0 and no valid position at all.')

# =========================================================================
# DA_FAM03_OPERATION_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_DA_010', 'DA_FAM03_OPERATION_RECOGNITION', 'D1',
  'A value already stored at a position is changed to a different value. What is the operation, '
  'and does the length change?',
  'Replacing, and the length does not change',
  ['Inserting, and the length increases by one',
   'Removing, and the length decreases by one',
   'Searching, and the length does not change'],
  'Replacing puts a new value where one already was, so nothing is added or lost. The length is '
  'what separates replacing from inserting.')

q('GB_DA_011', 'DA_FAM03_OPERATION_RECOGNITION', 'D1',
  'A new value is put into the middle of an array without any existing value being lost. What is '
  'the operation, and does the length change?',
  'Inserting, and the length increases by one',
  ['Replacing, and the length does not change',
   'Inserting, and the length does not change',
   'Removing, and the length decreases by one'],
  'Nothing being lost means nothing was overwritten, so the array must have grown. An insertion '
  'that did not change the length would have to have destroyed something.')

q('GB_DA_012', 'DA_FAM03_OPERATION_RECOGNITION', 'D1',
  'An array is examined to find whether a value is present. What happens to the array?',
  'Nothing; searching reads and does not change anything',
  ['The found value is removed',
   'The array is reordered so the value comes first',
   'The length decreases by one'],
  'A search reports where something is, or that it is absent, and leaves the data as it found it. '
  'An operation that changed the array while looking would make repeated searches unreliable.')

q('GB_DA_013', 'DA_FAM03_OPERATION_RECOGNITION', 'D2',
  'A value is removed from the middle of an array. What happens to the position it occupied?',
  'The later items move down to close the gap, and the length decreases by one',
  ['The position is left empty and the length is unchanged',
   'The position is filled with zero and the length is unchanged',
   'The later items keep their positions and the length decreases by one'],
  'An array holds its items in consecutive positions, so removing one means everything after it '
  'moves. A gap left behind would break the rule that positions run without interruption.')

# =========================================================================
# DA_FAM04_SHIFT_EFFECT — D2, D3
# =========================================================================
q('GB_DA_014', 'DA_FAM04_SHIFT_EFFECT', 'D2',
  'An array holds 5, 8, 12, 20. The value 9 is inserted at position 1. What does the array hold?',
  '5, 9, 8, 12, 20',
  ['5, 9, 12, 20', '9, 5, 8, 12, 20', '5, 8, 9, 12, 20'],
  'The new value takes position 1 and everything from there onward moves up one place, so nothing '
  'is lost. Overwriting the 8 would be replacing rather than inserting.')

q('GB_DA_015', 'DA_FAM04_SHIFT_EFFECT', 'D3',
  'An array holds 3, 7, 11, 15, 19. The value at position 1 is removed. Where is 15 afterwards?',
  'Position 2',
  ['Position 3, where it was', 'Position 4', 'Position 1'],
  'Removing an item moves everything after it down one place, so 15 falls from position 3 to '
  'position 2. Items keeping their old positions is what an array cannot do.')

# =========================================================================
# DA_FAM05_TRAVERSAL_RESULT — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_DA_016', 'DA_FAM05_TRAVERSAL_RESULT', 'D2',
  'A collection holds 4, 9, 2, 7, 5. A traversal counts how many values exceed 4. What is the '
  'result?',
  '3',
  ['21', '4', '2'],
  'The values 9, 7 and 5 exceed 4, so the count is 3. Answering 21 totals those values instead, '
  'and 4 counts the values that are 4 or more.',
  provenance='LEGACY_REMAP', source='1e5032')

q('GB_DA_017', 'DA_FAM05_TRAVERSAL_RESULT', 'D3',
  'A collection holds -8, -3, -12, -5. A traversal finds the largest value, starting from the '
  'first item. What is the result?',
  '-3',
  ['0', '-12', '-8'],
  'Comparing each value against the running largest gives -3, which is the greatest of the four. '
  'Answering 0 is what a traversal starting from zero rather than from the first item would '
  'report — a value that never appears in the data.',
  provenance='LEGACY_REMAP', source='1eee69')

# =========================================================================
# DA_FAM06_LINEAR_SEARCH_WORK — D2, D3, D4
# =========================================================================
q('GB_DA_018', 'DA_FAM06_LINEAR_SEARCH_WORK', 'D2',
  'An unsorted array holds 6, 2, 9, 4, 7. A search checks each item in turn for the value 9. How '
  'many comparisons does it make?',
  '3',
  ['1', '5', '2'],
  'The search checks 6, then 2, then 9, stopping when it matches, which is 3 comparisons. '
  'Answering 2 gives the position rather than the number of comparisons.')

q('GB_DA_019', 'DA_FAM06_LINEAR_SEARCH_WORK', 'D3',
  'An unsorted array of 20 items is searched for a value that is present as the very last item. '
  'How many comparisons does a check-each-in-turn search make?',
  '20',
  ['19', '1', '10'],
  'Every item is checked, including the last, so the count equals the length of 20. Answering 19 '
  'stops one short, and 10 assumes an average rather than this particular case.')

q('GB_DA_020', 'DA_FAM06_LINEAR_SEARCH_WORK', 'D4',
  'An unsorted array of 20 items is searched for a value that is not present at all. Someone says '
  'the search stops early because there is nothing to find. How many comparisons are made?',
  '20; every item must be checked before absence can be established',
  ['19, since the last item need not be checked',
   '1, since the search stops as soon as it fails',
   '0, since the value is not there to compare against'],
  'Absence can only be established by exhausting the array, so the absent case costs the most '
  'rather than the least. Nothing in an unsorted array allows an earlier conclusion.',
  evidence='Someone says the search stops early because there is nothing to find')

# =========================================================================
# DA_FAM07_HALVING_SEARCH — D2, D3, D4   (the precondition matters most)
# =========================================================================
q('GB_DA_021', 'DA_FAM07_HALVING_SEARCH', 'D2',
  'A sorted array holds 2, 5, 9, 14, 20, 27, 31. The middle value 14 is compared with a target of '
  '27. Which items remain in consideration?',
  '20, 27, 31',
  ['2, 5, 9', '2, 5, 9, 14', '20, 27'],
  'The target is larger than the middle, so everything at or below the middle is discarded and '
  'the upper part remains. Discarding from the wrong side would throw away the item being sought.')

q('GB_DA_022', 'DA_FAM07_HALVING_SEARCH', 'D3',
  'A sorted array holds 64 items. At most how many comparisons does a halving search need?',
  '7',
  ['32', '64', '8'],
  'Each comparison halves what remains — 64, 32, 16, 8, 4, 2, 1 — which is 7 steps to reach a '
  'single item. Halving the length once gives 32, which is what one halving leaves rather than '
  'the number of steps.')

q('GB_DA_023', 'DA_FAM07_HALVING_SEARCH', 'D4',
  'A halving search is applied to an unsorted array of 100 items and reports that a value is '
  'absent. The value is in fact present. The search itself was implemented correctly. What is '
  'wrong?',
  'The method requires the data to be in order, and discarding half of unsorted data discards it '
  'arbitrarily',
  ['The array is too large for a halving search',
   'The search should have made more comparisons',
   'The value must have been in a position the search cannot reach'],
  'Every step assumes that everything on the discarded side is smaller or larger, and unsorted '
  'data gives no such guarantee. A correct implementation of a method whose precondition fails is '
  'still wrong.',
  evidence='The search itself was implemented correctly')

# =========================================================================
# DA_FAM08_SORT_PASS_STATE — D2, D3, D4   (method described, no algorithm named)
# =========================================================================
q('GB_DA_024', 'DA_FAM08_SORT_PASS_STATE', 'D2',
  'An array holds 5, 1, 4, 2. A pass compares each adjacent pair from the left and swaps them when '
  'the left is larger. What does the array hold after one complete pass?',
  '1, 4, 2, 5',
  ['1, 2, 4, 5', '5, 4, 2, 1', '1, 4, 5, 2'],
  'The largest value is carried to the end by successive swaps while the rest move down one '
  'place. Answering the fully sorted array reports the eventual outcome rather than the state '
  'after one pass.')

q('GB_DA_025', 'DA_FAM08_SORT_PASS_STATE', 'D3',
  'Continuing from 1, 4, 2, 5, a second pass of the same method runs. What does the array hold '
  'afterwards?',
  '1, 2, 4, 5',
  ['1, 4, 2, 5', '1, 2, 5, 4', '2, 1, 4, 5'],
  'The second pass swaps 4 and 2 and leaves the rest, which happens to complete the ordering here. '
  'That it finishes early is a property of this data rather than of the method.')

q('GB_DA_026', 'DA_FAM08_SORT_PASS_STATE', 'D4',
  'After one pass of the same method over an array of 6 items, someone says nothing useful has '
  'been achieved because the array is still unsorted. What has in fact been guaranteed?',
  'The largest item is now in its final position at the end',
  ['The smallest item is now at the front',
   'The array is half sorted',
   'Nothing at all is guaranteed after a single pass'],
  'Each pass carries the largest remaining item all the way to the end, so one item is settled '
  'even when the rest look unchanged. That is exactly why later passes can examine one fewer item '
  'each time.',
  evidence='someone says nothing useful has been achieved because the array is still unsorted')

# =========================================================================
# DA_FAM09_WORK_COMPARISON — D2, D3, D4   (counts and words, never notation)
# =========================================================================
q('GB_DA_027', 'DA_FAM09_WORK_COMPARISON', 'D2',
  'Reading the value at a stated position in an array of 10 items, and doing the same in an array '
  'of 10,000. Which does more work?',
  'Neither; a position is reached directly, whatever the size',
  ['The larger array, since there is more to search through',
   'The smaller array, since it is held differently',
   'It cannot be said without knowing the values'],
  'An array reaches a position by calculation rather than by looking through the items, so the '
  'size does not enter into it. That is the property that makes an array worth using.')

q('GB_DA_028', 'DA_FAM09_WORK_COMPARISON', 'D3',
  'Inserting an item at the end of an array, and inserting one at the front. Which does more work '
  'as the array grows?',
  'At the front, because every existing item has to move up one place',
  ['At the end, because the array may have to grow',
   'Neither; both are a single operation',
   'At the front, but only for arrays of more than a hundred items'],
  'Inserting at the front shifts every item, so the work rises with the length; at the end nothing '
  'has to move. Both being one line of code is what makes the difference invisible in the source.')

q('GB_DA_029', 'DA_FAM09_WORK_COMPARISON', 'D4',
  'A program builds a list by inserting each new item at the front, and becomes dramatically '
  'slower as the list grows. Each insertion is a single statement and the code is unchanged '
  'throughout. What accounts for it?',
  'Each insertion moves every item already present, so the work per insertion grows with the list',
  ['The statement is being executed more slowly as memory fills',
   'The insertions are correct but the list has grown too large to hold',
   'Inserting is inherently slow regardless of position'],
  'Unchanging code that gets slower as the data grows points at work that depends on the data '
  'rather than at the statement. Inserting at the end would show no such effect, which is what '
  'makes the position the cause.',
  evidence='Each insertion is a single statement and the code is unchanged throughout')

# =========================================================================
# DA_FAM10_BOUNDS_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_DA_030', 'DA_FAM10_BOUNDS_BEHAVIOUR', 'D2',
  'A loop over an array of 5 items runs from position 0 up to and including position 5. What does '
  'the last pass do?',
  'It reads a position that is not part of the array',
  ['It reads the last item a second time',
   'It reads nothing and the loop ends',
   'It wraps around and reads the first item'],
  'Five items occupy positions 0 to 4, so position 5 is past the end. Nothing wraps around, and '
  'the pass does happen — which is why the fault is not simply an ignored extra step.')

q('GB_DA_031', 'DA_FAM10_BOUNDS_BEHAVIOUR', 'D3',
  'The same loop bound is used in two languages: one reports an error on the last pass and the '
  'other returns whatever is in that memory. What does that difference reflect?',
  'Whether the language checks the position before using it',
  ['Whether the array was declared with a fixed size',
   'Whether the loop counts from zero',
   'Whether the array holds numbers or text'],
  'The fault is identical in both; what differs is whether anything is watching for it. A checked '
  'language turns a silent wrong answer into a stopped program, which is a difference in what '
  'happens rather than in what was written.')

q('GB_DA_032', 'DA_FAM10_BOUNDS_BEHAVIOUR', 'D4',
  'A total computed over an array is slightly too large, and the amount by which it is wrong '
  'changes between runs. Every value in the array is correct and the addition is correct. What is '
  'wrong?',
  'The loop reads one position past the end and adds whatever happens to be there',
  ['One of the values is being added twice',
   'The total is not initialised before the loop',
   'The array has grown since it was created'],
  'A varying error with correct data and correct arithmetic points at something outside the array '
  'being included. An uninitialised total would give an error that varies too, but it would '
  'rarely be slight, and adding a value twice would give the same error every run.',
  evidence='Every value in the array is correct and the addition is correct')

# =========================================================================
# DA_FAM11_TWO_POSITION_TRACE — D3, D4
# =========================================================================
q('GB_DA_033', 'DA_FAM11_TWO_POSITION_TRACE', 'D3',
  'An array holds A, B, C, D, E. One position starts at the front and one at the back; they swap '
  'their values and then move toward each other. What does the array hold after two swaps?',
  'E, D, C, B, A',
  ['E, B, C, D, A', 'A, D, C, B, E', 'E, D, C, A, B'],
  'The first swap exchanges the ends and the second exchanges the pair inside them, leaving the '
  'middle alone. Two swaps is enough to reverse five items, because the middle item has nowhere '
  'to go.')

q('GB_DA_034', 'DA_FAM11_TWO_POSITION_TRACE', 'D4',
  'A reversal using two positions moving toward each other is run on an array of 6 items and the '
  'array comes back exactly as it started. The swap itself is correct and both positions do move. '
  'What is wrong?',
  'The positions continue past each other, so every swap is performed a second time and undone',
  ['The swap is being applied to the same position twice',
   'The array has an even number of items, which the method cannot handle',
   'The positions are moving in the same direction'],
  'Every pair being swapped twice returns the array to its original state, which is what running '
  'past the crossing point produces. An even count is handled perfectly well when the loop stops '
  'at the crossing.',
  evidence='The swap itself is correct and both positions do move')

# =========================================================================
# DA_FAM12_APPROACH_SELECTION — D3 (legacy), D4
# =========================================================================
q('GB_DA_035', 'DA_FAM12_APPROACH_SELECTION', 'D3',
  'Marks for 60 students must be stored so that any one of them can be reached by its position. '
  'Which arrangement fits?',
  'One array of 60 values, reached by position',
  ['Sixty separate variables, one per student',
   'One value holding all sixty marks together',
   'One array holding only the highest mark'],
  'Reaching a value by position is exactly what an array offers, and it works whatever the count. '
  'Sixty separate names cannot be reached by a computed position and would have to be written out '
  'individually.',
  provenance='LEGACY_REMAP', source='1db1fb')

q('GB_DA_036', 'DA_FAM12_APPROACH_SELECTION', 'D4',
  'A value must be found once in an unsorted array of 1,000 items. Someone proposes sorting the '
  'array first and then using a halving search. The proposal would give the correct answer. Is it '
  'a good choice?',
  'No; sorting costs far more than the single traversal it saves, and the array is used only once',
  ['Yes; a halving search is always faster than checking each item',
   'Yes; sorted data is always preferable',
   'No; a halving search cannot be used on data that was sorted afterwards'],
  'The proposal is correct and the question is cost. Sorting a thousand items to save one '
  'traversal of a thousand items loses; had many searches been needed, the same proposal would '
  'win.',
  evidence='The proposal would give the correct answer')

# =========================================================================
# DA_FAM13_ARRAY_FAULT_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_DA_037', 'DA_FAM13_ARRAY_FAULT_DIAGNOSIS', 'D3',
  'A traversal reports a total that is always short by exactly the first value. What is the fault?',
  'The loop begins at position 1 rather than position 0',
  ['The loop ends one position early',
   'The total is initialised inside the loop',
   'The values are being read in reverse'],
  'Being short by exactly the first item points at where the loop starts. Ending early would omit '
  'the last item instead, and initialising inside the loop would leave only the final value.')

q('GB_DA_038', 'DA_FAM13_ARRAY_FAULT_DIAGNOSIS', 'D4',
  'A traversal reports a total short by exactly the last value. The loop starts at position 0 and '
  'the addition is correct. What is the fault?',
  'The loop stops one position before the end',
  ['The loop starts one position too late',
   'The last value is being read as zero',
   'The total is initialised to the first value'],
  'Which end the missing value came from identifies which bound is wrong, and the stem rules the '
  'start out. Initialising to the first value would give a total that is too large rather than '
  'too small.',
  evidence='The loop starts at position 0 and the addition is correct')

q('GB_DA_039', 'DA_FAM13_ARRAY_FAULT_DIAGNOSIS', 'D5',
  'A traversal finding the largest value reports 0 for an array in which every value is negative, '
  'and reports correctly for every array containing a positive value. What is the fault, and why '
  'did it survive testing?',
  'The running largest starts at 0, which no negative value beats; every test array happened to '
  'contain something positive',
  ['The comparison is reversed, and the test arrays were sorted',
   'The loop skips negative values, and the test arrays had none',
   'The array cannot hold negative values, and the tests avoided them'],
  'A value appears in the output that is not in the data, which places the fault in the starting '
  'value rather than in the comparison. Testing found nothing because a single positive value in '
  'an array hides the fault completely.',
  mode='TRANSFER', hinge='reports 0 for an array in which every value is negative')

q('GB_DA_040', 'DA_FAM13_ARRAY_FAULT_DIAGNOSIS', 'D5',
  'Two candidate starting values for a largest-value traversal are proposed: zero, and the first '
  'item of the array. Which is correct, and what does the other require?',
  'The first item; starting from zero is only safe if the data is guaranteed to contain a '
  'positive value',
  ['Zero, because it is smaller than any value that could appear',
   'Either; both give the same answer on any array',
   'Zero, provided the array is checked for negatives first'],
  'A starting value taken from the data can never be beaten by the data being unusual, which is '
  'why it needs no guarantee. Zero imposes a condition on the input that nothing in the code '
  'states or checks.',
  mode='TRANSFER', hinge='zero, and the first item of the array')

q('GB_DA_041', 'DA_FAM13_ARRAY_FAULT_DIAGNOSIS', 'D5',
  'An array fault produces a slightly wrong total, and another produces a wildly wrong one. Which '
  'is more likely to reach production, and why?',
  'The slight one, because a plausible total passes the informal checks people actually make',
  ['The wild one, because large numbers are harder to notice',
   'They are equally likely, since both are faults',
   'The slight one, because small errors are harder to fix'],
  'What keeps a fault alive is not its size but whether anybody questions the output. A total that '
  'looks about right is accepted; one that is obviously absurd is investigated the first time it '
  'appears.',
  mode='TRADEOFF', hinge='another produces a wildly wrong one')

# =========================================================================
# DA_FAM14_EDGE_DATA_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_DA_042', 'DA_FAM14_EDGE_DATA_BEHAVIOUR', 'D4',
  'An approach compares each item with the one after it. It behaves correctly on every array of '
  'two or more items that it has been given. Which input breaks it?',
  'An array of exactly one item, where there is no following item to compare with',
  ['An array of two items, where only one comparison is possible',
   'An array with repeated values',
   'An array in reverse order'],
  'Reading ahead by one needs a successor to exist, and only a single item leaves none. Two items '
  'give exactly one comparison, which is the smallest case that works rather than the smallest '
  'that fails.',
  evidence='It behaves correctly on every array of two or more items that it has been given')

q('GB_DA_043', 'DA_FAM14_EDGE_DATA_BEHAVIOUR', 'D5',
  'An approach compares each item with the one after it. What does it produce for an empty array?',
  'Nothing, and correctly so; there are no pairs and the loop runs zero times',
  ['A failure, because there is no first item to read',
   'A single comparison against nothing',
   'The same result as for a single item'],
  'With no items there is nothing to start from either, so the loop never begins and no access is '
  'attempted. Empty and single-item input fail in different ways here, which is why both are worth '
  'trying.',
  mode='EDGE', hinge='What does it produce for an empty array')

q('GB_DA_044', 'DA_FAM14_EDGE_DATA_BEHAVIOUR', 'D5',
  'A search reports the position of a value. What should it report when the value is absent, and '
  'why not simply zero?',
  'Something no valid position can be, since zero is itself a valid position and would be '
  'indistinguishable from a match at the front',
  ['Zero, which is the natural empty answer',
   'The length of the array, which is always safe',
   'Nothing; it should stop with an error instead'],
  'Counting from zero means the first position and the "not found" answer would collide, so the '
  'value has to lie outside the range of positions. Being absent is an expected outcome rather '
  'than a fault, so stopping is too strong.',
  mode='TRANSFER', hinge='What should it report when the value is absent')

q('GB_DA_045', 'DA_FAM14_EDGE_DATA_BEHAVIOUR', 'D5',
  'A reversal using two positions moving toward each other is run on an array of exactly one '
  'item. What happens?',
  'Nothing; the two positions already meet, so no swap is performed and the array is correct',
  ['The item is swapped with itself and lost',
   'The method fails, because there is no pair to swap',
   'The positions cross immediately and the loop runs endlessly'],
  'The stopping condition is already satisfied before any swap, so the loop does no work — and '
  'doing no work is exactly right for reversing one item. An edge case that needs no special '
  'handling is worth recognising as such.',
  mode='EDGE', hinge='run on an array of exactly one item')

q('GB_DA_046', 'DA_FAM14_EDGE_DATA_BEHAVIOUR', 'D5',
  'An approach is correct for arrays of two or more items and wrong for one item. Two fixes are '
  'proposed: add a special case for a single item, or change the loop bound so the single-item '
  'case falls out correctly. Which is preferable?',
  'Changing the bound where it works, since a special case is another path that must stay correct '
  'as the code changes',
  ['The special case, because it leaves the working behaviour untouched',
   'Either; both produce the right answer',
   'The special case, because loop bounds are harder to reason about'],
  'Both fix the symptom and they leave different things behind. A bound that handles every size '
  'needs no upkeep; a special case has to be remembered by everyone who edits the code afterwards.',
  mode='TRADEOFF', hinge='add a special case for a single item, or change the loop bound')

# =========================================================================
# DA_FAM15_COST_TRADEOFF — D4, D5 x3
# =========================================================================
q('GB_DA_047', 'DA_FAM15_COST_TRADEOFF', 'D4',
  'A collection is searched thousands of times a day and added to twice a day. Both keeping it '
  'sorted and leaving it unsorted would work. Which arrangement suits it?',
  'Keep it sorted, since the cost falls on the rare operation and the frequent one becomes much '
  'cheaper',
  ['Leave it unsorted, since sorting costs more than searching',
   'Leave it unsorted, since insertions must stay fast',
   'Either; the usage pattern does not affect the choice'],
  'The usage decides it: sorting is paid twice a day and repaid thousands of times. The same two '
  'arrangements would be ranked the other way round if the frequencies were reversed.',
  evidence='searched thousands of times a day and added to twice a day')

q('GB_DA_048', 'DA_FAM15_COST_TRADEOFF', 'D5',
  'A collection is added to constantly and searched once a week. Which arrangement suits it, and '
  'what does the choice cost?',
  'Leave it unsorted; the weekly search costs a full traversal, which is far less than keeping '
  'every insertion in order',
  ['Keep it sorted, so the weekly search is fast',
   'Keep it sorted, since sorted data is always preferable',
   'Either; a weekly search is too rare to matter'],
  'Reversing the frequencies reverses the answer, which is the point: the cost of order is paid on '
  'every insertion, and here insertions are what dominate. The weekly traversal is a real cost and '
  'a small one.',
  mode='TRANSFER', hinge='added to constantly and searched once a week')

q('GB_DA_049', 'DA_FAM15_COST_TRADEOFF', 'D5',
  'A collection is both added to and searched constantly, in roughly equal measure. What follows '
  'about the choice between sorted and unsorted?',
  'Neither arrangement is clearly better, and the answer depends on measuring the two costs rather '
  'than reasoning about them',
  ['Sorted, since searching is the more important operation',
   'Unsorted, since insertion is the more frequent operation',
   'Sorted, since a tie should be broken in favour of order'],
  'The rule that decides the two lopsided cases gives no answer when neither dominates, and '
  'inventing a tiebreak dresses a guess as a principle. Recognising where a rule stops applying is '
  'part of using it.',
  mode='TRADEOFF', hinge='in roughly equal measure')

q('GB_DA_050', 'DA_FAM15_COST_TRADEOFF', 'D5',
  'A team keeps a collection sorted so that searches are fast, and later discovers that almost all '
  'the searches are for the most recently added item. What does that change?',
  'The ordering buys much less than expected, since the newest item could be found immediately '
  'without it',
  ['Nothing; sorted data is faster to search whatever is being sought',
   'The ordering becomes more valuable, since recent items are at one end',
   'The collection should be sorted in the opposite direction'],
  'A cost decision rests on what the operations actually are, and "search" turned out to mean '
  'something narrower than assumed. Sorting by value does not put the newest item anywhere in '
  'particular, so reversing the order does not help either.',
  mode='TRANSFER', hinge='almost all the searches are for the most recently added item')
