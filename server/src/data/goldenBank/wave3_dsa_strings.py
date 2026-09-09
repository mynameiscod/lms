# -*- coding: utf-8 -*-
"""
Wave 3 — DSA_STRINGS, 50 Golden Bank questions.

1 comes from the existing bank, remapped in from PYTHON_BASICS, and 49 are new.

SPACES ARE THE SUBJECT, NOT THE SETTING. Three separate families turn on them, because a space is
a character that looks like nothing: it is counted by a length, occupies a position, and makes two
pieces of text that look identical fail to match. The blueprint requires text with a space in the
middle in the position family and a visible description of the space in the whitespace family,
and both instructions are followed here.

CASE IS PRESERVED EXACTLY IN EVERY OPTION OF THE COMPARISON FAMILY, for the same reason it is
never folded anywhere in this pipeline: in DS_FAM03 the case is the content, and an option list
compared case-insensitively would collapse the right answer into a wrong one.
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
# DS_FAM01_CHARACTER_POSITION — D1 x4, D2 x1   (text with a space in the middle)
# =========================================================================
q('GB_DS_001', 'DS_FAM01_CHARACTER_POSITION', 'D1',
  'The text is "my code". What character is at position 0?',
  'm',
  ['y', 'c', 'There is no position 0'],
  'Positions are counted from zero, so the first character sits at position 0. Counting from one '
  'would give the second character instead.')

q('GB_DS_002', 'DS_FAM01_CHARACTER_POSITION', 'D1',
  'The text is "my code". What character is at position 2?',
  'A space',
  ['c', 'y', 'o'],
  'A space is a character like any other and occupies its own position, so it sits between the '
  'two words at position 2. Skipping it shifts every later position by one.')

q('GB_DS_003', 'DS_FAM01_CHARACTER_POSITION', 'D1',
  'The text is "my code". At what position is the letter c?',
  '3',
  ['2', '4', '1'],
  'Counting m as 0, y as 1 and the space as 2 puts c at position 3. Answering 2 is what ignoring '
  'the space produces.')

q('GB_DS_004', 'DS_FAM01_CHARACTER_POSITION', 'D1',
  'The text is "go now". What is at the last valid position?',
  'w',
  ['o', 'A space', 'There is none until the text is complete'],
  'The last valid position holds the final character, which is w. Answering o stops one short, '
  'which is what treating the length as the last position and then correcting twice produces.')

q('GB_DS_005', 'DS_FAM01_CHARACTER_POSITION', 'D2',
  'The text is "a b c", with single spaces between the letters. How many positions does it '
  'occupy, and what is at position 1?',
  'Five positions, and position 1 holds a space',
  ['Three positions, and position 1 holds b',
   'Five positions, and position 1 holds b',
   'Three positions, and position 1 holds a space'],
  'Three letters and two spaces occupy five positions in all, and the first space follows the '
  'first letter. Counting only the letters gives three and moves every later character.')

# =========================================================================
# DS_FAM02_LENGTH_COUNTING — D1 x3, D2 x1 (legacy)
# =========================================================================
q('GB_DS_006', 'DS_FAM02_LENGTH_COUNTING', 'D1',
  'What is the length of the text "data set"?',
  '8',
  ['7', '2', '9'],
  'Seven letters and one space make a length of 8. Answering 7 omits the space, and 2 counts the '
  'words rather than the characters.')

q('GB_DS_007', 'DS_FAM02_LENGTH_COUNTING', 'D1',
  'What is the length of the text "hi " — the two letters followed by a single trailing space?',
  '3',
  ['2', '4', '1'],
  'A trailing space is a character and is counted, so the length is three. It is invisible when '
  'the text is displayed, which is exactly why it is missed.')

q('GB_DS_008', 'DS_FAM02_LENGTH_COUNTING', 'D1',
  'What is the length of text containing no characters at all?',
  '0',
  ['1', 'Undefined', 'It cannot exist'],
  'Empty text is ordinary text whose length is zero, and it has no valid positions. That is '
  'different from text containing a single space, whose length is one.')

q('GB_DS_009', 'DS_FAM02_LENGTH_COUNTING', 'D2',
  'A program holds the text "career" and reports its length. What is reported?',
  '6',
  ['5', '7', 'career'],
  'Six characters give a length of 6. Answering 5 or 7 is off by one at an end, and reporting the '
  'text itself answers a different question.',
  provenance='LEGACY_REMAP', source='67f5a5')

# =========================================================================
# DS_FAM03_CASE_COMPARISON — D1 x3, D2 x1   (case preserved exactly in every option)
# =========================================================================
q('GB_DS_010', 'DS_FAM03_CASE_COMPARISON', 'D1',
  'Do the two pieces of text "Yes" and "yes" compare as equal?',
  'No; the first characters differ',
  ['Yes; they spell the same word',
   'Yes; comparison ignores case',
   'It cannot be decided without knowing the language'],
  'A comparison examines the characters, and an upper-case letter is a different character from '
  'its lower-case form. Spelling the same word is not the same as being the same text.')

q('GB_DS_011', 'DS_FAM03_CASE_COMPARISON', 'D1',
  'Do the two pieces of text "OK" and "OK" compare as equal?',
  'Yes; every character matches',
  ['No; identical text never compares equal',
   'Yes, but only if the two are stored in the same place',
   'It depends on how the text was created'],
  'Comparison is about the characters and nothing else, so identical characters compare equal '
  'however each piece of text came to exist.')

q('GB_DS_012', 'DS_FAM03_CASE_COMPARISON', 'D1',
  'Do the two pieces of text " ok" and "ok" compare as equal — the first with a single leading '
  'space?',
  'No; the first has an extra character at the front',
  ['Yes; a leading space is ignored',
   'Yes; both contain the same letters',
   'No; the two have the same length but differ in case'],
  'A leading space is a character, so the two pieces differ in both length and content. Nothing '
  'strips spaces on the way into a comparison.')

q('GB_DS_013', 'DS_FAM03_CASE_COMPARISON', 'D2',
  'A program compares a typed answer with the stored answer "Blue" and rejects "blue" as wrong. '
  'What change would accept both?',
  'Convert both to the same case before comparing',
  ['Compare the lengths instead of the characters',
   'Store the answer in lower case only',
   'Nothing; the two are genuinely different answers'],
  'Bringing both sides to a common case removes the distinction before the comparison sees it. '
  'Storing the answer in lower case alone would still reject a capitalised entry.')

# =========================================================================
# DS_FAM04_RANGE_EXTRACTION — D2, D3
# =========================================================================
q('GB_DS_014', 'DS_FAM04_RANGE_EXTRACTION', 'D2',
  'The text is "abcdef". A range starts at position 1 and stops before position 4. What does it '
  'produce?',
  'bcd',
  ['bcde', 'abcd', 'bc'],
  'Positions 1, 2 and 3 are taken and position 4 is not, because the range stops before it. '
  'Including the end gives one character too many.')

q('GB_DS_015', 'DS_FAM04_RANGE_EXTRACTION', 'D3',
  'The text is "network". A range starts at position 3 and stops before position 3. What does it '
  'produce?',
  'Nothing; the range is empty',
  ['w', 'wo', 'The whole text'],
  'A range that starts where it stops contains no positions at all, so the result is empty. That '
  'is a legitimate outcome rather than an error, and it is what an off-by-one in the wrong '
  'direction quietly produces.')

# =========================================================================
# DS_FAM05_ORIGINAL_UNCHANGED — D2, D3
# =========================================================================
q('GB_DS_016', 'DS_FAM05_ORIGINAL_UNCHANGED', 'D2',
  'A variable holds "Report". An operation converting it to upper case is performed, and its '
  'result is not stored anywhere. What does the variable hold afterwards?',
  'Report',
  ['REPORT', 'report', 'Nothing; the value was consumed'],
  'The operation builds new text and hands it back, leaving the original untouched. Discarding '
  'the result therefore changes nothing at all.')

q('GB_DS_017', 'DS_FAM05_ORIGINAL_UNCHANGED', 'D3',
  'A variable holds " total " with a space at each end. A trimming operation is applied and its '
  'result is assigned to a second variable. What do the two variables hold?',
  'The first still holds " total " and the second holds "total"',
  ['Both hold "total"',
   'The first holds "total" and the second holds " total "',
   'Both hold " total "'],
  'Trimming produces new text and the original is unchanged, so the two variables differ. '
  'Assigning the result is what makes the trimmed version available at all.')

# =========================================================================
# DS_FAM06_SEARCH_RESULT — D2, D3, D4
# =========================================================================
q('GB_DS_018', 'DS_FAM06_SEARCH_RESULT', 'D2',
  'The text is "banana". A search for "an" reports the position of the first match. What does it '
  'report?',
  '1',
  ['3', '2', '0'],
  'The first "an" begins at position 1, counting b as 0. Position 3 is where the second match '
  'begins, which is what reporting the last match would give.')

q('GB_DS_019', 'DS_FAM06_SEARCH_RESULT', 'D3',
  'The text is "banana". A search for "xy" is performed. What should the result be?',
  'A value that is not a valid position, marking absence',
  ['0, since nothing was found',
   'The length of the text',
   'An error, since the search failed'],
  'Zero is a perfectly valid position and would be indistinguishable from a match at the front, '
  'so absence has to be reported by something outside the range of positions. Not finding '
  'something is an ordinary outcome rather than a failure.')

q('GB_DS_020', 'DS_FAM06_SEARCH_RESULT', 'D4',
  'A program treats a search result of 0 as meaning "not found" and reports that a value is '
  'missing when it is actually the first thing in the text. The search itself returns the correct '
  'position. What is wrong?',
  'Zero is a real position, so it cannot also stand for absence',
  ['The search is returning the wrong position',
   'The value being searched for is empty',
   'The text has a leading space, shifting the position'],
  'The search is stated to be correct, so the fault is in how its answer is read. A match at the '
  'very front is the one case where a valid position collides with the marker chosen for '
  'absence.',
  evidence='The search itself returns the correct position')

# =========================================================================
# DS_FAM07_SPLIT_RESULT — D2, D3, D4
# =========================================================================
q('GB_DS_021', 'DS_FAM07_SPLIT_RESULT', 'D2',
  'The text "red,green,blue" is split on the comma. How many pieces result?',
  '3',
  ['2', '4', '1'],
  'Two separators divide the text into three pieces. The count of pieces is always one more than '
  'the count of separators when none of them sit at an end.')

q('GB_DS_022', 'DS_FAM07_SPLIT_RESULT', 'D3',
  'A line ends with the separator it uses: "north;south;" split on the semicolon. What is the '
  'final piece?',
  'An empty piece, following the last semicolon',
  ['south, because a trailing separator is ignored',
   'A semicolon, because the separator is kept',
   'There is no final piece; the split yields two'],
  'A separator at the end still separates, so something follows it and that something is empty. '
  'The separator itself never appears inside any piece.')

q('GB_DS_023', 'DS_FAM07_SPLIT_RESULT', 'D4',
  'The text "a,,b" is split on the comma and a program reports two pieces. It expects one piece '
  'per value and the two commas are genuinely present in the data. What has it done wrong?',
  'It has discarded the empty piece between the two commas, which the split produces',
  ['It has treated the two commas as one separator, which is correct',
   'It has included the comma in one of the pieces',
   'It has split on the wrong character'],
  'Consecutive separators produce an empty piece between them, so the split gives three. A '
  'program reporting two has dropped it, which loses the information that a value was missing '
  'there.',
  evidence='the two commas are genuinely present in the data')

# =========================================================================
# DS_FAM08_JOIN_RESULT — D2, D3, D4
# =========================================================================
q('GB_DS_024', 'DS_FAM08_JOIN_RESULT', 'D2',
  'The pieces red, green and blue are joined with a comma between them. What is produced?',
  'red,green,blue',
  ['red,green,blue,', ',red,green,blue', 'redgreenblue'],
  'Separators go between pieces, so three pieces need two separators and none at either end. A '
  'trailing separator is what building the text piece by piece without care produces.')

q('GB_DS_025', 'DS_FAM08_JOIN_RESULT', 'D3',
  'Five pieces are joined with a separator between them. How many separators appear?',
  '4',
  ['5', '6', '3'],
  'Separators sit in the gaps between pieces, and five pieces have 4 gaps. Answering 5 places one '
  'after the last piece as well.')

q('GB_DS_026', 'DS_FAM08_JOIN_RESULT', 'D4',
  'A program builds a list by adding each value followed by a comma, and the result always ends '
  'with a stray comma. Every value is present and in the right order. What is the smallest change '
  'that fixes it?',
  'Put the separator before each value except the first, rather than after each value',
  ['Remove the last value as well as the comma',
   'Add the values in reverse order',
   'Use a different separator character'],
  'Every value being correct places the fault in where the separator goes rather than in the '
  'data. Moving it to precede each value except the first gives exactly one separator per gap and '
  'none at either end.',
  evidence='Every value is present and in the right order')

# =========================================================================
# DS_FAM09_WHITESPACE_EFFECT — D2, D3, D4
# =========================================================================
q('GB_DS_027', 'DS_FAM09_WHITESPACE_EFFECT', 'D2',
  'Two entries display as "cat" and "cat", and a comparison reports them as different. The second '
  'has a trailing space. Why do they not match?',
  'The second contains one more character than the first',
  ['The two differ in case',
   'The two have the same length and differ in content',
   'A comparison cannot be relied on for text'],
  'A trailing space is a character that shows as nothing, so the two pieces differ in length '
  'while looking identical. Nothing about the comparison is unreliable.')

q('GB_DS_028', 'DS_FAM09_WHITESPACE_EFFECT', 'D3',
  'Two entries both display as "no data" and both are seven characters long, yet they do not '
  'match. One uses a single space and the other uses a different invisible character of the same '
  'width. What is the cause?',
  'The invisible characters differ, so the two are different text of the same length',
  ['One of them has a trailing space',
   'The two differ in case somewhere',
   'Equal-length text always matches, so the report is wrong'],
  'Equal length rules out a missing or extra character, and identical appearance rules out a '
  'visible difference — which leaves a character that is invisible and not the one expected. '
  'Length is a weaker check than it looks.')

q('GB_DS_029', 'DS_FAM09_WHITESPACE_EFFECT', 'D4',
  'A lookup fails for entries typed by hand and succeeds for the same entries loaded from a file. '
  'The values look identical in both cases and the lookup itself is correct. What is the likely '
  'cause?',
  'The typed entries carry leading or trailing spaces that the file entries do not',
  ['The typed entries differ in case',
   'The lookup is case-sensitive and the file is not',
   'The file entries were converted to a different format'],
  'Identical appearance with different behaviour, split cleanly by how the value arrived, points '
  'at something invisible that typing adds. Case would be visible in the comparison, and the '
  'lookup is stated to be correct.',
  evidence='The values look identical in both cases and the lookup itself is correct')

# =========================================================================
# DS_FAM10_CHARACTER_TRAVERSAL — D2, D3, D4
# =========================================================================
q('GB_DS_030', 'DS_FAM10_CHARACTER_TRAVERSAL', 'D2',
  'A traversal counts the vowels in "open air". How many does it find?',
  '4',
  ['3', '5', '8'],
  'The vowels are o, e, a and i, giving a count of 4. The space is not a vowel and the consonants '
  'are not counted, so 8 reports the length instead.')

q('GB_DS_031', 'DS_FAM10_CHARACTER_TRAVERSAL', 'D3',
  'A traversal counts characters in "go on" that are not spaces. How many does it find?',
  '4',
  ['5', '3', '2'],
  'Five positions hold four letters and one space, so the count excluding spaces is 4. Answering '
  '5 counts everything, which is the length rather than the count asked for.')

q('GB_DS_032', 'DS_FAM10_CHARACTER_TRAVERSAL', 'D4',
  'A traversal building a reversed copy of "abc" produces "cba" correctly, and on "ab c" it '
  'produces "c ba". The traversal visits every position exactly once. Is that correct?',
  'Yes; reversing includes the space, and "c ba" is the reverse of "ab c"',
  ['No; the space should have stayed where it was',
   'No; the space should have been removed',
   'No; the words should have been reversed rather than the characters'],
  'Reversing the characters moves every one of them, the space included, and the result is '
  'exactly what that gives. Expecting the space to stay put confuses reversing the characters '
  'with reversing the words.',
  evidence='The traversal visits every position exactly once')

# =========================================================================
# DS_FAM11_SYMMETRY_CHECK — D3, D4   (case and spaces specified in the stem)
# =========================================================================
q('GB_DS_033', 'DS_FAM11_SYMMETRY_CHECK', 'D3',
  'A check compares the first character with the last, the second with the second-last, and so '
  'on, treating case as significant and spaces as characters. Does "Level" pass?',
  'No; the first character is upper case and the last is lower case',
  ['Yes; the letters read the same in both directions',
   'No; the text has an odd number of characters',
   'Yes; case is ignored in a symmetry check'],
  'The stem states that case is significant, and L does not match l. Reading the word as '
  'symmetric requires ignoring exactly the thing the check is told to respect.')

q('GB_DS_034', 'DS_FAM11_SYMMETRY_CHECK', 'D4',
  'The same check is applied to "abcba", comparing from both ends inward. It reports success '
  'after 2 comparisons. Someone expects 5. Why is 2 correct?',
  'Each comparison settles two characters, and the middle character needs none',
  ['The check stops as soon as it finds one match',
   'The check compares only the outermost pair',
   'The count should be 5; the report is wrong'],
  'Five characters form two pairs with one left in the middle, and a character compared with '
  'itself proves nothing. Expecting one comparison per character double-counts every pair.',
  evidence='It reports success after 2 comparisons')

# =========================================================================
# DS_FAM12_BUILD_COST — D3, D4
# =========================================================================
q('GB_DS_035', 'DS_FAM12_BUILD_COST', 'D3',
  'Text is built by repeatedly adding one character to the end of existing text, producing new '
  'text each time. What happens to the work as the text grows?',
  'It rises, because each addition copies everything built so far',
  ['It stays the same, since one character is added each time',
   'It falls, since the text is already partly built',
   'It stays the same, since the code is one line either way'],
  'Each addition produces new text containing everything that came before, so the copying grows '
  'with the length. That both approaches are one line of code is exactly why the difference is '
  'invisible in the source.')

q('GB_DS_036', 'DS_FAM12_BUILD_COST', 'D4',
  'Two methods build the same text and produce identical results. One adds to existing text '
  'repeatedly and the other collects the pieces and joins them once at the end. Which does more '
  'work, and why?',
  'The repeated addition, because every step copies what has already been built',
  ['The join, because it must examine every piece at the end',
   'Neither; identical results mean identical work',
   'The repeated addition, because it uses more lines of code'],
  'Identical results settle correctness and say nothing about cost. Collecting and joining once '
  'copies each piece a single time, while repeated addition copies the growing result again at '
  'every step.',
  evidence='Two methods build the same text and produce identical results')

# =========================================================================
# DS_FAM13_TEXT_FAULT_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_DS_037', 'DS_FAM13_TEXT_FAULT_DIAGNOSIS', 'D3',
  'A traversal over text produces output missing its final character. What is the fault?',
  'The loop stops one position before the end',
  ['The loop starts one position too late',
   'The output is being built in reverse',
   'The final character is a space and was skipped'],
  'Which end the missing character came from identifies which bound is wrong. Starting late would '
  'drop the first character instead.')

q('GB_DS_038', 'DS_FAM13_TEXT_FAULT_DIAGNOSIS', 'D4',
  'A program builds a comma-separated list and the output ends with a comma but is otherwise '
  'correct. Every value appears exactly once and in order. What is the fault?',
  'A separator is added after every value, including the last',
  ['A separator is added before every value, including the first',
   'The final value is missing and only its separator remains',
   'The values are being joined in the wrong order'],
  'A trailing separator with every value present places the fault at the end rather than in the '
  'data. Adding the separator before each value would have produced a leading one instead, which '
  'is a distinguishable symptom.',
  evidence='Every value appears exactly once and in order')

q('GB_DS_039', 'DS_FAM13_TEXT_FAULT_DIAGNOSIS', 'D5',
  'Two faults produce similar-looking output: one drops the last character of the text, and one '
  'adds a trailing separator. How can they be told apart from the output alone?',
  'One output is shorter than it should be and the other longer, and only the second ends in a '
  'separator',
  ['They cannot be told apart from the output alone',
   'Only the first changes the length of the output',
   'Only the second affects the order of the values'],
  'Each fault leaves its own signature: a missing character shortens the result, and a stray '
  'separator lengthens it and is visible at the end. Reading the output carefully is what '
  'separates two faults that both look like an off-by-one.',
  mode='TRANSFER', hinge='one drops the last character of the text, and one adds a trailing '
                         'separator')

q('GB_DS_040', 'DS_FAM13_TEXT_FAULT_DIAGNOSIS', 'D5',
  'A program strips spaces from the ends of every entry and a lookup still fails for one of them. '
  'What is the next thing to check, and why?',
  'Whether the entry contains an invisible character that is not a space, since stripping removes '
  'only what it recognises',
  ['Whether the lookup is case-sensitive, since stripping does not affect case',
   'Whether the entry is longer than the others, since length affects matching',
   'Whether stripping was applied to both sides of the comparison'],
  'Stripping handles the spaces it knows about and leaves anything else, so an entry that still '
  'fails after stripping points at a character that looks like a space and is not. Case is worth '
  'checking too and would not have been masked by the stripping.',
  mode='TRANSFER', hinge='strips spaces from the ends of every entry and a lookup still fails')

q('GB_DS_041', 'DS_FAM13_TEXT_FAULT_DIAGNOSIS', 'D5',
  'A text fault produces output that is obviously mangled, and another produces output that looks '
  'right and is subtly wrong. Which costs more, and why?',
  'The subtle one, because mangled output is noticed immediately while plausible output is used',
  ['The mangled one, because more of the output is affected',
   'They cost the same, since both are faults',
   'The subtle one, because it is harder to reproduce'],
  'What limits the damage a fault does is whether anyone notices it. Obviously broken output is '
  'investigated the first time it appears; output that reads correctly travels onward and is '
  'acted on.',
  mode='TRADEOFF', hinge='another produces output that looks right and is subtly wrong')

# =========================================================================
# DS_FAM14_EDGE_TEXT_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_DS_042', 'DS_FAM14_EDGE_TEXT_BEHAVIOUR', 'D4',
  'A symmetry check comparing from both ends inward is given empty text. It reports success '
  'without making any comparison. Is that correct?',
  'Yes; empty text is trivially symmetric and there is nothing to compare',
  ['No; it should have failed, since there is nothing to check',
   'No; it should have stopped with an error',
   'Yes, but only because the check does not handle empty text'],
  'The check reports failure only when a pair disagrees, and with no pairs there is no '
  'disagreement. Reporting success is the right answer rather than an accident of how the loop is '
  'written.',
  evidence='It reports success without making any comparison')

q('GB_DS_043', 'DS_FAM14_EDGE_TEXT_BEHAVIOUR', 'D5',
  'A traversal counting vowels is given empty text. What does it produce?',
  '0, which is correct and needs no special case',
  ['A failure, because there is nothing to examine',
   'Nothing at all, because the loop never runs',
   'An error, because the counter was never used'],
  'The loop runs zero times and the counter keeps the zero it started at, which is the right '
  'answer for counting nothing. The initialisation is what makes the empty case safe.',
  mode='EDGE', hinge='counting vowels is given empty text')

q('GB_DS_044', 'DS_FAM14_EDGE_TEXT_BEHAVIOUR', 'D5',
  'An approach reads the first character of text in order to decide something. What does it do on '
  'empty text?',
  'It fails, because there is no first character to read',
  ['It reads an empty character and continues',
   'It returns without doing anything',
   'It reads a space, which stands in for the missing character'],
  'Reading position 0 requires a character to be there, and empty text has none. Nothing '
  'substitutes a blank on the program\'s behalf, which is why this case has to be handled '
  'deliberately.',
  mode='EDGE', hinge='reads the first character of text in order to decide something')

q('GB_DS_045', 'DS_FAM14_EDGE_TEXT_BEHAVIOUR', 'D5',
  'Splitting empty text on a comma produces how many pieces?',
  'One, which is itself empty',
  ['None', 'Two, both empty', 'It fails, since there is nothing to split'],
  'A split always produces one more piece than the separators it finds, and finding none gives '
  'one piece — the whole of the input, which happens to be empty. Answering none confuses an '
  'empty piece with no piece.',
  mode='EDGE', hinge='Splitting empty text on a comma')

q('GB_DS_046', 'DS_FAM14_EDGE_TEXT_BEHAVIOUR', 'D5',
  'An approach works for text of two characters or more and fails for one character. Two fixes '
  'are proposed: a special case for single-character text, or a change to the loop bound. Which '
  'is preferable?',
  'The bound, where it can be made to cover the case, since a special case is another path to '
  'keep correct',
  ['The special case, because it leaves working behaviour untouched',
   'Either; both give the right answer',
   'The special case, because bounds are harder to reason about'],
  'Both remove the symptom and they leave different things behind. A bound that handles every '
  'length needs no upkeep; a special case has to be remembered by everyone who edits the code '
  'afterwards.',
  mode='TRADEOFF', hinge='a special case for single-character text, or a change to the loop bound')

# =========================================================================
# DS_FAM15_APPROACH_SELECTION — D4, D5 x3   (the awkward input is stated)
# =========================================================================
q('GB_DS_047', 'DS_FAM15_APPROACH_SELECTION', 'D4',
  'Values must be extracted from lines where fields are separated by commas, and some fields are '
  'empty so consecutive commas occur. Which approach handles it?',
  'Split on the comma and keep every piece, empty ones included',
  ['Split on the comma and discard empty pieces',
   'Split on runs of commas, treating consecutive ones as one separator',
   'Search for each field by position within the line'],
  'Empty fields have to survive, or later fields shift into the wrong positions. Both of the '
  'discarding approaches work on tidy data and silently corrupt exactly the lines the stem '
  'describes.',
  evidence='some fields are empty so consecutive commas occur')

q('GB_DS_048', 'DS_FAM15_APPROACH_SELECTION', 'D5',
  'Words must be counted in a line where words may be separated by more than one space. Which '
  'approach handles it?',
  'Split on runs of spaces, so that consecutive spaces produce no empty words',
  ['Split on a single space and count the pieces',
   'Count the spaces and add one',
   'Count the characters and divide by the average word length'],
  'Runs of spaces have to collapse here, which is the opposite of what the comma case needed — '
  'the awkward input decides which behaviour is wanted. Splitting on a single space would count '
  'an empty piece for each extra space.',
  mode='TRANSFER', hinge='words may be separated by more than one space')

q('GB_DS_049', 'DS_FAM15_APPROACH_SELECTION', 'D5',
  'Two text tasks look alike: one must preserve empty pieces between separators, and one must '
  'ignore them. What does that show about choosing an approach?',
  'The right behaviour is decided by the task rather than by the operation, so the same split can '
  'be right in one and wrong in the other',
  ['One of the two tasks must have been described wrongly',
   'The same approach should be used for both, for consistency',
   'Empty pieces should always be discarded, since they carry no data'],
  'An empty field between two commas carries real information — that a value was missing — while '
  'an extra space between words carries none. The operation is identical and the requirement is '
  'not.',
  mode='TRANSFER', hinge='one must preserve empty pieces between separators, and one must ignore '
                         'them')

q('GB_DS_050', 'DS_FAM15_APPROACH_SELECTION', 'D5',
  'A text task can be done with one traversal that does everything, or with three simple '
  'traversals in sequence. Both are correct. On what grounds should the choice be made?',
  'On whether reading the data three times costs enough to matter, weighed against three simpler '
  'pieces of code',
  ['On the single traversal, since fewer passes is always better',
   'On the three traversals, since simpler code is always better',
   'On neither; correct approaches are interchangeable'],
  'Correctness no longer separates them, so the remaining differences are cost and clarity, and '
  'which dominates depends on the size of the data. Neither "fewer passes" nor "simpler code" is '
  'a rule that holds without knowing that.',
  mode='TRADEOFF', hinge='one traversal that does everything, or with three simple traversals')
