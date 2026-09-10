# -*- coding: utf-8 -*-
"""
Wave 8 — PYTHON_STRINGS, 50 Golden Bank questions, all newly authored.

THIS SKILL IS LITERALS AND FORMATTING, AND NOTHING ELSE. Indexing, slicing, searching, splitting,
joining and immutability are all banked under DSA_STRINGS, which was authored as the language-level
text skill despite its name. Re-asking any of them here would produce wording variants of fifteen
existing families, so this file goes to the one substantial area neither DSA_STRINGS nor
PYTHON_BASICS touches: how text is written down in a program and how values are placed into it.

WHAT THAT COVERS. Quote forms and the clash when a literal contains its own quote; escape
sequences and the paths they silently mangle; raw literals and the one thing they cannot express;
triple quotes and the indentation they keep; interpolation and what a non-text value becomes;
width and precision, and the fact that formatting changes the text and never the value; adjacent
literals joining silently, which is how a list quietly loses an item.

THE FORMATTING FAMILY TURNS ON A CONSEQUENCE RATHER THAN A SYNTAX. Rounding for display leaves the
value alone, so a column of displayed figures need not add up to the displayed total. That is a
real reporting problem and it is what makes the distinction worth measuring.

EVERY LITERAL IS SHOWN AS WRITTEN, WITH ITS INDENTATION EXPLICIT WHERE THAT MATTERS. Nothing here
depends on recalling a method name or a format specification from memory.
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
# PT_FAM01_QUOTE_FORMS — D1 x4, D2 x1
# =========================================================================
q('GB_PT_001', 'PT_FAM01_QUOTE_FORMS', 'D1',
  'Text can be written between single quotes or between double quotes. How do the two differ?',
  'Only in which quote character they can contain without escaping',
  ['Single quotes hold text and double quotes hold formatted text',
   'Double quotes allow longer text',
   'Single quotes are faster to process'],
  'The two produce identical text. Which one is chosen matters only when the text itself contains '
  'a quote.')

q('GB_PT_002', 'PT_FAM01_QUOTE_FORMS', 'D1',
  'Which of these is a valid way to write text?',
  'Opening and closing with the same quote character',
  ['Opening with a single quote and closing with a double',
   'Opening with a double quote and closing with a single',
   'Opening and closing with no quote at all'],
  'The closing quote has to match the opening one. Mismatched quotes leave the literal unterminated.')

q('GB_PT_003', 'PT_FAM01_QUOTE_FORMS', 'D1',
  'Two pieces of text are written identically except that one uses single quotes and the other '
  'double. Are the resulting values the same?',
  'Yes; the quote form is not part of the text',
  ['No; the quote characters are included in the value',
   'No; one is longer than the other',
   'Only if the text contains no letters'],
  'Quotes mark where the text begins and ends and do not become part of it. The two values '
  'compare equal.')

q('GB_PT_004', 'PT_FAM01_QUOTE_FORMS', 'D1',
  'What decides which quote form to use for a piece of text?',
  'What quote characters the text itself contains',
  ['The length of the text',
   'Whether the text contains numbers',
   'Personal preference alone, in every case'],
  'Choosing the form the text does not contain avoids escaping altogether. Where the text '
  'contains neither, preference genuinely does decide.')

q('GB_PT_005', 'PT_FAM01_QUOTE_FORMS', 'D2',
  'A piece of text contains both a single quote and a double quote. What follows about writing it '
  'with ordinary quotes?',
  'Whichever form is chosen, one of the two characters will need escaping',
  ['It cannot be written at all',
   'It must be split into two separate pieces',
   'Single quotes will work without escaping'],
  'Containing both removes the option of picking the form the text avoids. A triple-quoted form is '
  'the other way out.')

# =========================================================================
# PT_FAM02_ESCAPE_MEANING — D1 x3, D2 x1
# =========================================================================
q('GB_PT_006', 'PT_FAM02_ESCAPE_MEANING', 'D1',
  'A backslash followed by the letter n appears inside a piece of text. What does that pair '
  'produce?',
  'A single line break character',
  ['The two characters, a backslash and an n',
   'A backslash only',
   'An instruction that is removed with no character produced'],
  'The pair stands together for one character that is neither of the two written. That is the '
  'whole purpose of an escape.')

q('GB_PT_007', 'PT_FAM02_ESCAPE_MEANING', 'D1',
  'How many characters does an escape sequence of a backslash and one letter produce?',
  'One',
  ['Two', 'None', 'It depends on the letter'],
  'One character results, though two were written: the written form and the value differ in '
  'length.')

q('GB_PT_008', 'PT_FAM02_ESCAPE_MEANING', 'D1',
  'How is a literal backslash written inside ordinary text?',
  'As two backslashes',
  ['As one backslash', 'As a backslash followed by a space',
   'A backslash cannot appear in text'],
  'A single backslash begins an escape, so producing one requires escaping the backslash itself. '
  'The written form is twice the length of the result.')

q('GB_PT_009', 'PT_FAM02_ESCAPE_MEANING', 'D2',
  'A student writes text containing a backslash and one letter, expecting to see both characters, '
  'and something else appears. What has happened?',
  'The pair was read as an escape sequence and produced a different single character',
  ['The backslash was removed and the letter kept',
   'The text was truncated at the backslash',
   'The letter was removed and the backslash kept'],
  'Only some letters form an escape, which is why this surprises people unevenly. Doubling the '
  'backslash produces the two characters intended.')

# =========================================================================
# PT_FAM03_INTERPOLATION_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_PT_010', 'PT_FAM03_INTERPOLATION_RECOGNITION', 'D1',
  'Two literals are written identically except that one carries a marker before its opening quote '
  'indicating interpolation. Both contain braces around a name. What differs?',
  'The marked one replaces the braced section with a value; the unmarked one contains the braces '
  'as text',
  ['Nothing; braces always interpolate',
   'The unmarked one produces an error',
   'The marked one is longer'],
  'Interpolation happens only when the literal is marked for it. Without the marker the braces are '
  'ordinary characters.')

q('GB_PT_011', 'PT_FAM03_INTERPOLATION_RECOGNITION', 'D1',
  'An unmarked literal contains braces around the word total. What does it produce?',
  'The braces and the word total, as written',
  ['The value of a variable called total',
   'An error, since total is not defined',
   'An empty piece of text'],
  'Without the interpolation marker nothing is substituted. The braces are characters like any '
  'others.')

q('GB_PT_012', 'PT_FAM03_INTERPOLATION_RECOGNITION', 'D1',
  'What makes a literal interpolate the values named inside it?',
  'A marker on the literal itself',
  ['The presence of braces',
   'The names inside being defined',
   'The literal being assigned to a variable'],
  'The marker is what turns braces into substitution points. Defined names and braces alone change '
  'nothing.')

q('GB_PT_013', 'PT_FAM03_INTERPOLATION_RECOGNITION', 'D2',
  'A developer builds a message by joining two literals together with an operator, and the second '
  'literal is marked for interpolation while the first is not. What happens to braces in the first?',
  'They remain as literal braces, since the marker applies to one literal only',
  ['They interpolate, since the two are joined',
   'The join fails because the two forms differ',
   'They are removed from the result'],
  'Marking is a property of each literal rather than of the expression. Joining them does not '
  'spread the marker.')

# =========================================================================
# PT_FAM04_INTERPOLATION_RESULT — D2 x1, D3 x1
# =========================================================================
q('GB_PT_014', 'PT_FAM04_INTERPOLATION_RESULT', 'D2',
  'A name holds the value 7. An interpolating literal reads: Total: followed by braces around '
  'that name. What text is produced?',
  'Total: 7',
  ['Total: name', 'Total: {7}', 'Total: "7"'],
  'The braced section is replaced by the value written out, and the surrounding text is kept. No '
  'quotes are added around a number.')

q('GB_PT_015', 'PT_FAM04_INTERPOLATION_RESULT', 'D3',
  'A name holds a piece of text that was written between quotes in the source. When that name is '
  'substituted into an interpolating literal, does the output show the quotes?',
  'No; the quotes marked where the text began and ended and were never part of it',
  ['Yes; text values are always written out with their quotes',
   'Yes, but single quotes only',
   'Only when the text contains a space'],
  'Quotes delimit a literal in the source and do not survive into the value. Substitution writes '
  'out what the value holds, which never included them.')

# =========================================================================
# PT_FAM05_RAW_EFFECT — D2 x1, D3 x1
# =========================================================================
q('GB_PT_016', 'PT_FAM05_RAW_EFFECT', 'D2',
  'A literal is marked raw. What does that change?',
  'Backslashes are kept as backslashes rather than beginning escape sequences',
  ['The text is displayed differently',
   'The text cannot be changed afterwards',
   'Interpolation is disabled'],
  'A raw literal changes what the written characters mean and not how the result is used. Every '
  'backslash stands for itself.')

q('GB_PT_017', 'PT_FAM05_RAW_EFFECT', 'D3',
  'A Windows-style path with single backslashes is written as an ordinary literal and again as a '
  'raw one. How do the two results differ?',
  'The ordinary one has some backslash pairs converted to other characters; the raw one is as '
  'written',
  ['They are identical, since paths contain no escapes',
   'The raw one has its backslashes doubled',
   'The ordinary one removes the backslashes entirely'],
  'Only the pairs that form escapes are converted, so the ordinary literal is right in some places '
  'and wrong in others. That unevenness is what makes the fault confusing.')

# =========================================================================
# PT_FAM06_MULTILINE_CONTENT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PT_018', 'PT_FAM06_MULTILINE_CONTENT', 'D2',
  'A triple-quoted literal spans three lines of text. What does it contain?',
  'The three lines including the line breaks between them',
  ['The three lines joined with spaces',
   'The first line only',
   'The three lines with the breaks removed'],
  'Line breaks inside a triple-quoted literal are part of the text. That is the reason for using '
  'the form.')

q('GB_PT_019', 'PT_FAM06_MULTILINE_CONTENT', 'D3',
  'A triple-quoted literal opens, then a line break, then the word Hello. What does the value '
  'begin with?',
  'A line break, before the word Hello',
  ['The word Hello, with the break discarded',
   'A space, then the word Hello',
   'Nothing; the literal is empty until the second line'],
  'The break immediately after the opening quotes is inside the literal like any other. Ending the '
  'first line with a backslash is the usual way to suppress it.')

q('GB_PT_020', 'PT_FAM06_MULTILINE_CONTENT', 'D4',
  'A triple-quoted literal is written inside an indented function, so every line after the first '
  'begins with eight spaces of indentation. A triple-quoted literal keeps every character between '
  'its quotes, including leading spaces. What does the value contain?',
  'Eight spaces at the start of each of those lines',
  ['No leading spaces, since indentation is stripped',
   'Eight spaces on the first line only',
   'A single space at the start of each line'],
  'The indentation that makes the code readable becomes part of the text. Output that is '
  'mysteriously shifted to the right is the usual symptom.',
  evidence='A triple-quoted literal keeps every character between its quotes, including leading '
           'spaces')

# =========================================================================
# PT_FAM07_FORMAT_SPEC_RESULT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PT_021', 'PT_FAM07_FORMAT_SPEC_RESULT', 'D2',
  'A value of 3.14159 is placed into a literal with a format asking for two decimal places. What '
  'text appears?',
  '3.14',
  ['3.14159', '3.1', '3'],
  'The format controls how many decimal places are written out. The remaining digits are not '
  'shown.')

q('GB_PT_022', 'PT_FAM07_FORMAT_SPEC_RESULT', 'D3',
  'Two values, 2.567 and 2.561, are each written out with a format asking for two decimal '
  'places. What do the two produce?',
  '2.57 and 2.56',
  ['2.56 and 2.56', '2.57 and 2.57', '2.6 and 2.6'],
  'A precision rounds rather than cutting digits off, so the two go in different directions and '
  'give 2.57 and 2.56. Truncating both would have produced the same pair of digits twice.')

q('GB_PT_023', 'PT_FAM07_FORMAT_SPEC_RESULT', 'D4',
  'A value of 12 is placed into a literal with a format asking for a width of five. A width pads '
  'a value that is shorter than the width and does not shorten one that is longer. What text '
  'appears?',
  'The digits 12 padded out to five characters',
  ['The digits 12, unchanged',
   'The digits 12 truncated to fit',
   'Five copies of the digits 12'],
  'A width states a minimum rather than a maximum. A value longer than the width is written out '
  'in full.',
  evidence='A width pads a value that is shorter than the width and does not shorten one that is '
           'longer')

# =========================================================================
# PT_FAM08_OPERATOR_RESULT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PT_024', 'PT_FAM08_OPERATOR_RESULT', 'D2',
  'The text "ab" is added to the text "cd". What is produced?',
  'abcd',
  ['ab cd', 'The two kept separate', 'An error'],
  'Adding text joins the two with nothing between them. No separator is inserted.')

q('GB_PT_025', 'PT_FAM08_OPERATOR_RESULT', 'D3',
  'The text "12" is added to the text "3". What is produced?',
  '123',
  ['15', '"12" and "3" as separate values', 'An error'],
  'Both operands are text, so they are joined rather than summed. Looking like numbers changes '
  'nothing about what they are.')

q('GB_PT_026', 'PT_FAM08_OPERATOR_RESULT', 'D4',
  'A program reads two values typed by a user and adds them, producing 57 where 12 was expected. '
  'Values read from a user arrive as text, and adding text joins it rather than summing it. What '
  'were the two values?',
  '5 and 7, arriving as text and joined rather than summed',
  ['50 and 7, summed correctly',
   '5 and 7, summed incorrectly by the language',
   '57 and 0, entered as one value'],
  'Joining "5" and "7" gives "57", which is exactly what was seen. Converting each to a number '
  'before adding is the fix.',
  evidence='Values read from a user arrive as text, and adding text joins it rather than summing '
           'it')

# =========================================================================
# PT_FAM09_ADJACENT_LITERALS — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PT_027', 'PT_FAM09_ADJACENT_LITERALS', 'D2',
  'Two quoted pieces of text are written next to each other with nothing between them. What '
  'results?',
  'One piece of text, being the two joined',
  ['Two separate pieces of text',
   'An error, since no operator was given',
   'The first piece only'],
  'Adjacent literals join automatically with no operator needed. This is deliberate and useful for '
  'splitting a long piece of text across lines.')

q('GB_PT_028', 'PT_FAM09_ADJACENT_LITERALS', 'D3',
  'A long message is written across three lines as three adjacent quoted pieces, each ending in a '
  'space. What results?',
  'One message with a space between each part',
  ['Three separate messages',
   'One message with no spaces between the parts',
   'One message with a line break between the parts'],
  'The pieces join exactly as written, so the trailing spaces survive and the line breaks in the '
  'source do not. Forgetting those spaces is how words run together.')

q('GB_PT_029', 'PT_FAM09_ADJACENT_LITERALS', 'D4',
  'A list is written with four quoted items and a comma is accidentally omitted between the '
  'second and third. Two quoted pieces with nothing between them join into one, and no comma '
  'separates the second and third items. How many items does the list hold?',
  'Three, with the second and third joined into one',
  ['Four, since all four are still written',
   'Two, since the missing comma splits the list',
   'None; the list is invalid'],
  'The join is silent and produces a perfectly valid list one item shorter than intended. Nothing '
  'reports an error, which is what makes this hard to spot.',
  evidence='Two quoted pieces with nothing between them join into one')

# =========================================================================
# PT_FAM10_NON_TEXT_SUBSTITUTION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PT_030', 'PT_FAM10_NON_TEXT_SUBSTITUTION', 'D2',
  'A name holds a list of three numbers. It is placed into an interpolating literal. What appears?',
  'The list written out, including its brackets and separators',
  ['The three numbers with spaces between them',
   'The number of items in the list',
   'An error, since a list is not text'],
  'Any value is written out in its usual form when substituted. The brackets are part of how a '
  'list is written.')

q('GB_PT_031', 'PT_FAM10_NON_TEXT_SUBSTITUTION', 'D3',
  'A name holds the value representing absence of a value. It is placed into an interpolating '
  'literal. What appears?',
  'The word that names that absence, written out as text',
  ['Nothing, leaving a gap',
   'An empty pair of braces',
   'An error, since there is no value to write'],
  'The absence is itself a value with a written form, so it appears as a word in the output. A '
  'report reading "Owner: None" is the usual and confusing symptom.')

q('GB_PT_032', 'PT_FAM10_NON_TEXT_SUBSTITUTION', 'D4',
  'A report is generated for every record and one field is sometimes unset. The output for those '
  'records reads oddly, with a word appearing where a name should be. Substituting an unset value '
  'writes out the word naming that absence rather than producing nothing. What is happening?',
  'The unset value is being written out as a word rather than leaving a blank',
  ['The field is being read from the wrong record',
   'The literal is missing its interpolation marker',
   'The report is truncating the field'],
  'Nothing fails, so every record generates a report and some of them contain a word no reader '
  'expects. Checking for the unset case and substituting a blank is the fix.',
  evidence='Substituting an unset value writes out the word naming that absence rather than '
           'producing nothing')

# =========================================================================
# PT_FAM11_QUOTE_CLASH_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_PT_033', 'PT_FAM11_QUOTE_CLASH_DIAGNOSIS', 'D3',
  'A literal is opened with a single quote and contains an apostrophe partway through. Where does '
  'the literal end?',
  'At the apostrophe, since it matches the opening quote',
  ['At the closing quote at the end of the line',
   'At the end of the line, wherever that falls',
   'It does not end, and the file is truncated'],
  'The apostrophe is indistinguishable from a closing quote, so the literal ends there. Everything '
  'after it is read as something else entirely.')

q('GB_PT_034', 'PT_FAM11_QUOTE_CLASH_DIAGNOSIS', 'D4',
  'A developer writes a sentence containing an apostrophe inside single quotes and the file will '
  'not run. The apostrophe matches the opening quote and ends the literal early. What are the two '
  'ways to fix it?',
  'Use double quotes around the whole sentence, or escape the apostrophe',
  ['Remove the apostrophe, or shorten the sentence',
   'Use double quotes, or move the sentence to its own line',
   'Escape the apostrophe, or remove the surrounding quotes'],
  'Either choosing a quote form the text does not contain, or escaping the offending character, '
  'resolves it. Removing the apostrophe changes the text rather than fixing the code.',
  evidence='The apostrophe matches the opening quote and ends the literal early')

# =========================================================================
# PT_FAM12_ACCIDENTAL_ESCAPE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_PT_035', 'PT_FAM12_ACCIDENTAL_ESCAPE_DIAGNOSIS', 'D3',
  'A path written with single backslashes behaves wrongly, and inspecting it shows a line break '
  'where a backslash and the letter n were written. What happened?',
  'That pair formed an escape sequence and became a line break',
  ['The path was truncated at the backslash',
   'The backslash was removed entirely',
   'The whole path was converted to a different form'],
  'Only that pair was converted; the rest of the path is as written. A raw literal or doubled '
  'backslashes would have kept it intact.')

q('GB_PT_036', 'PT_FAM12_ACCIDENTAL_ESCAPE_DIAGNOSIS', 'D4',
  'Two paths written the same way behave differently: one works and one does not. Only some '
  'backslash-and-letter pairs form an escape sequence, and the two paths use different letters '
  'after their backslashes. Why do they differ?',
  'One path happens to contain a pair that forms an escape and the other does not',
  ['One path is longer than the other',
   'One path points at a file that does not exist',
   'The two were written with different quote forms'],
  'The behaviour depends on which letters follow the backslashes, which varies from path to path. '
  'That unevenness is why the fault appears to come and go.',
  evidence='Only some backslash-and-letter pairs form an escape sequence')

# =========================================================================
# PT_FAM13_FORMAT_SCOPE_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_PT_037', 'PT_FAM13_FORMAT_SCOPE_REASONING', 'D3',
  'A value is displayed rounded to two decimal places and then used in a later calculation. Which '
  'value does the calculation use?',
  'The original unrounded value',
  ['The rounded value that was displayed',
   'Whichever was used most recently',
   'An average of the two'],
  'Formatting produces text and leaves the value untouched. Rounding the value itself is a '
  'separate operation.')

q('GB_PT_038', 'PT_FAM13_FORMAT_SCOPE_REASONING', 'D4',
  'Three amounts are each displayed rounded to two decimal places, and their total is computed '
  'from the unrounded values and displayed the same way. A reader adds the three displayed figures '
  'and gets a different answer. The three displayed figures are rounded individually while the '
  'total is computed from the unrounded values. Why do they disagree?',
  'The rounding of each figure is lost from the total, which was computed before any rounding',
  ['One of the three figures was displayed incorrectly',
   'The total was computed from the wrong values',
   'The rounding was applied twice to the total'],
  'Everything here is correct and the displayed figures cannot be expected to add up. Rounding '
  'each value before summing is what makes the report internally consistent.',
  evidence='The three displayed figures are rounded individually while the total is computed from '
           'the unrounded values')

q('GB_PT_039', 'PT_FAM13_FORMAT_SCOPE_REASONING', 'D5',
  'A team fixes a report that did not add up by rounding each value before summing. An auditor '
  'objects that the total is now wrong. Rounding before summing makes the report add up and moves '
  'the total away from the exact figure. Who is right?',
  'Both; the report is now internally consistent and its total no longer matches the exact figure',
  ['The team; a report that adds up is correct',
   'The auditor; the total must always be exact',
   'Neither; the two totals are identical'],
  'The two requirements genuinely conflict and only one can be satisfied. Which matters depends on '
  'whether the report is read by people adding columns or fed into something needing the exact '
  'figure.',
  mode='TRADEOFF',
  hinge='Rounding before summing makes the report add up and moves the total away from the exact '
        'figure')

q('GB_PT_040', 'PT_FAM13_FORMAT_SCOPE_REASONING', 'D5',
  'A value is stored, displayed rounded, read back from the display by another system, and stored '
  'again. The value stored the second time came from the rounded text rather than from the '
  'original value. What has happened to the precision?',
  'It has been lost permanently, since the rounding became the stored value',
  ['Nothing; formatting never changes a value',
   'It is recoverable from the original store',
   'It is halved with each round trip'],
  'Formatting leaves the value alone right up until the formatted text is read back as data. That '
  'round trip is where display rounding becomes real.',
  mode='EDGE',
  hinge='The value stored the second time came from the rounded text rather than from the '
        'original value')

q('GB_PT_041', 'PT_FAM13_FORMAT_SCOPE_REASONING', 'D5',
  'A developer displays a value with no format at all and finds it shows many more decimal places '
  'than expected. Displaying without a format writes out the value as it is actually held rather '
  'than as it was typed. What does that reveal?',
  'What the value actually holds, which differs from what was typed in',
  ['A fault in the display',
   'That the value has been corrupted',
   'That a format is required for every value'],
  'The unformatted display is the honest one and the surprise is about how such values are stored. '
  'A format hides the difference rather than removing it.',
  mode='TRANSFER',
  hinge='Displaying without a format writes out the value as it is actually held')

# =========================================================================
# PT_FAM14_LITERAL_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_PT_042', 'PT_FAM14_LITERAL_CHOICE', 'D4',
  'A piece of text contains several single quotes and no double quotes. The text contains single '
  'quotes and no double quotes, and choosing the form the text avoids removes the need to escape '
  'anything. Which form fits?',
  'Double quotes, with nothing escaped',
  ['Single quotes, with each internal quote escaped',
   'Single quotes, with the internal quotes removed',
   'Triple single quotes, with each internal quote escaped'],
  'Choosing the form the text does not contain is the simplest route and needs no escaping. '
  'Escaping works and produces a harder literal to read.',
  evidence='The text contains single quotes and no double quotes')

q('GB_PT_043', 'PT_FAM14_LITERAL_CHOICE', 'D5',
  'A piece of text is a Windows path ending in a backslash. A developer proposes a raw literal to '
  'avoid escaping. A raw literal cannot end in a single backslash, because that backslash would '
  'escape the closing quote. What follows?',
  'A raw literal will not work here, so the backslashes must be doubled in an ordinary literal',
  ['A raw literal works and is the right choice',
   'The path cannot be written in any form',
   'A triple-quoted raw literal solves it'],
  'This is the one thing a raw literal cannot express, and it is exactly the case paths run into. '
  'Doubling the backslashes in an ordinary literal is the way out.',
  mode='EDGE', hinge='A raw literal cannot end in a single backslash')

q('GB_PT_044', 'PT_FAM14_LITERAL_CHOICE', 'D5',
  'A message spans four lines and must preserve the line breaks. A developer proposes a '
  'triple-quoted literal placed inside a deeply indented block. A triple-quoted literal keeps the '
  'indentation of the lines it contains, and the block is deeply indented. What should they '
  'consider?',
  'That the indentation will become part of the text and has to be removed or avoided',
  ['Nothing; indentation is stripped automatically',
   'That triple quotes cannot be used inside an indented block',
   'That the line breaks will be lost'],
  'The form is right for the requirement and brings the indentation with it. Dedenting afterwards, '
  'or writing the literal unindented, both address it.',
  mode='TRANSFER',
  hinge='A triple-quoted literal keeps the indentation of the lines it contains')

q('GB_PT_045', 'PT_FAM14_LITERAL_CHOICE', 'D5',
  'A message is built from a fixed sentence and one value. A developer can use interpolation or '
  'join the parts with an operator. The value is a number and joining with an operator requires '
  'converting it to text first, while interpolation writes it out directly. Which fits?',
  'Interpolation, since it writes the value out without a separate conversion',
  ['Joining, since it is more explicit',
   'Joining, since interpolation is slower',
   'Either; the two require the same amount of code'],
  'Joining a number to text without converting it is an error, so the operator route carries an '
  'extra step. Both produce identical text once that step is taken.',
  mode='TRADEOFF',
  hinge='joining with an operator requires converting it to text first')

q('GB_PT_046', 'PT_FAM14_LITERAL_CHOICE', 'D5',
  'A long piece of text must be written across several source lines without introducing line '
  'breaks into the value. Adjacent quoted pieces join with nothing between them, and a '
  'triple-quoted literal keeps every line break. Which form fits?',
  'Several adjacent quoted pieces, one per source line',
  ['A triple-quoted literal spanning the lines',
   'A triple-quoted raw literal spanning the lines',
   'One very long line, since no other form works'],
  'Adjacency joins the pieces and the source line breaks are not part of any literal. A '
  'triple-quoted form would put every one of those breaks into the value.',
  mode='TRADEOFF', hinge='a triple-quoted literal keeps every line break')

# =========================================================================
# PT_FAM15_LITERAL_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_PT_047', 'PT_FAM15_LITERAL_TRANSFER', 'D4',
  'A language is documented as follows: text is written between backticks; a backslash before any '
  'character produces that character literally; there is no interpolation. A literal is written '
  'containing a backslash followed by the letter n. The rules state that a backslash produces the '
  'following character literally, and there is no special meaning for any letter. What does the '
  'literal contain?',
  'The letter n',
  ['A line break', 'A backslash and the letter n', 'Nothing; the escape is invalid'],
  'These rules differ from the ones this skill has been using, and the stated rules are what '
  'govern. Assuming a line break would be importing a convention the description rules out.',
  evidence='The rules state that a backslash produces the following character literally')

q('GB_PT_048', 'PT_FAM15_LITERAL_TRANSFER', 'D5',
  'A configuration format is documented as treating every value as literal text with no escape '
  'processing whatsoever. A developer writes a path containing backslashes into it. No escape '
  'processing occurs, so every character stands for itself. What does the value contain?',
  'Exactly the characters written, backslashes included',
  ['The path with escape sequences converted',
   'The path with backslashes doubled',
   'An error, since backslashes must be escaped'],
  'A format with no escape processing behaves like a raw literal everywhere. That also means there '
  'is no way to write a character the format uses structurally.',
  mode='TRANSFER', hinge='No escape processing occurs, so every character stands for itself')

q('GB_PT_049', 'PT_FAM15_LITERAL_TRANSFER', 'D5',
  'A template system is documented as substituting anything between double braces and leaving '
  'single braces alone. A developer writes a message containing a literal double brace they do '
  'not want substituted. Double braces are always substituted and the documentation describes no '
  'way to escape them. What follows?',
  'The message cannot express a literal double brace, so the format has to be extended or avoided',
  ['Single braces should be used instead, which produce the same output',
   'The double brace will be left alone since no name follows it',
   'The system will report an error and leave the text unchanged'],
  'A format that reserves a sequence and offers no escape cannot express that sequence. '
  'Recognising the gap is the point; working around it is a separate decision.',
  mode='EDGE',
  hinge='Double braces are always substituted and the documentation describes no way to escape '
        'them')

q('GB_PT_050', 'PT_FAM15_LITERAL_TRANSFER', 'D5',
  'A team must choose between a message format that substitutes values automatically and one that '
  'requires every value to be inserted explicitly. Messages sometimes contain characters the '
  'substituting format treats as structural. A format that substitutes automatically will act on '
  'those characters wherever they appear in the message. Which fits messages containing arbitrary '
  'user text?',
  'The explicit form, since arbitrary text will otherwise collide with the structural characters',
  ['The substituting form, since it is more convenient',
   'The substituting form, since users rarely type such characters',
   'Either, since both produce the same messages'],
  'Automatic substitution is convenient right up until the content contains what the format '
  'reserves. Arbitrary user text is precisely the case where that stops being rare.',
  mode='TRADEOFF',
  hinge='A format that substitutes automatically will act on those characters wherever they '
        'appear')
