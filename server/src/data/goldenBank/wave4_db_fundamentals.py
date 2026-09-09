# -*- coding: utf-8 -*-
"""
Wave 4 — DB_FUNDAMENTALS, 50 Golden Bank questions, all newly authored.

THIS SKILL IS ABOUT DESIGN CONSEQUENCE, NOT QUERY RESULT. SQL_BASICS asks what a query returns;
this asks what a table can and cannot be asked later. The families are deliberately framed around
recording, splitting and keys so that the two skills do not measure the same reasoning twice.

THE KEY QUESTION IS THE SHARPEST ONE IN THE SKILL: every real-world value that is unique today —
an email address, a phone number, a name — is a value somebody is entitled to change tomorrow, and
the cost of that change lands on every row that referred to it.

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
# DB_FAM01_TABLE_ANATOMY — D1 x4, D2 x1
# =========================================================================
q('GB_DB_001', 'DB_FAM01_TABLE_ANATOMY', 'D1',
  'An employees table has the headings emp_id, full_name, department, joined_on and holds three '
  'employees. What is one employee\'s entry across all four headings called?',
  'A row',
  ['A column', 'A heading', 'A table'],
  'One employee\'s entry across the whole width of the table is a row. It runs across the '
  'headings rather than down one of them.')

q('GB_DB_002', 'DB_FAM01_TABLE_ANATOMY', 'D1',
  'In that same table, department taken all the way down the table is what?',
  'A column',
  ['A row', 'A single value', 'A key'],
  'A heading together with everything stored under it is a column. It runs down the table rather '
  'than across one employee.')

q('GB_DB_003', 'DB_FAM01_TABLE_ANATOMY', 'D1',
  'Printed on paper the employees table shows a line of headings and then three employees. How '
  'many rows of data does it hold?',
  'Three',
  ['Four, counting the headings', 'One', 'Twelve, one per value'],
  'The headings name the columns and are not data, so the table holds three rows. Each employee '
  'contributes one.')

q('GB_DB_004', 'DB_FAM01_TABLE_ANATOMY', 'D1',
  'The department column holds Sales, Sales and Support. What has to be true of the values in any '
  'one column?',
  'They are all the same kind of thing',
  ['They are all different from each other',
   'They are always text',
   'They are stored in alphabetical order'],
  'A column records one kind of thing about every row, so the values are all the same kind of '
  'thing. They may repeat, and they are not kept in any particular order.')

q('GB_DB_005', 'DB_FAM01_TABLE_ANATOMY', 'D2',
  'Where in the table is one particular employee\'s department found?',
  'Where that employee\'s row meets the department column',
  ['Anywhere in the department column',
   'In the line of headings',
   'In a separate table, since a department is not an employee'],
  'A single stored value sits where a row and a column cross, so it is found where that employee\'s '
  'row meets the department column. Knowing only the column narrows it to a list of departments '
  'and not to one.')

# =========================================================================
# DB_FAM02_KEY_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_DB_006', 'DB_FAM02_KEY_RECOGNITION', 'D1',
  'A table holds emp_id, full_name, email and date_of_birth. Which column is intended to serve as '
  'the key?',
  'emp_id',
  ['full_name', 'date_of_birth', 'email'],
  'The identifier column exists for exactly this purpose, so emp_id is the key. The others '
  'describe the employee rather than identify the row.')

q('GB_DB_007', 'DB_FAM02_KEY_RECOGNITION', 'D1',
  'Two different employees are both recorded as Ana Kumar. What does that show about full_name?',
  'It cannot be relied on to identify one row',
  ['It can, as long as the two work in different departments',
   'It can, because the two rows have different identifiers',
   'It can, once one of the two names is corrected'],
  'A value that appears twice picks out two rows rather than one, so the name cannot be relied on '
  'to identify one row. Nothing about the rest of the row repairs that.')

q('GB_DB_008', 'DB_FAM02_KEY_RECOGNITION', 'D1',
  'What does a column have to do before it can be used as a key?',
  'Pick out exactly one row, every time and forever',
  ['Hold numbers rather than text',
   'Be the first column in the table',
   'Be kept in sorted order'],
  'A key has one job, which is to pick out exactly one row, every time and forever. Its type and '
  'its position in the table are irrelevant to that.')

q('GB_DB_009', 'DB_FAM02_KEY_RECOGNITION', 'D2',
  'In a table of forty employees, every value in date_of_birth happens to be different. Does that '
  'make it a key?',
  'No; being different today does not make a column different in principle',
  ['Yes; all the values being different is what a key needs',
   'Yes, as long as the column is never left blank',
   'No; a key has to be a number'],
  'The fortieth employee hired tomorrow may share a birthday with somebody already there, so being '
  'different today does not make a column different in principle. A key has to be guaranteed, not '
  'observed.')

# =========================================================================
# DB_FAM03_COLUMN_TYPE_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_DB_010', 'DB_FAM03_COLUMN_TYPE_RECOGNITION', 'D1',
  'A column holds values such as 9876543210 and 0801234567. What type should it be given?',
  'Text, so that a leading zero survives',
  ['A whole number, since the values are digits',
   'A decimal number',
   'A date, since it is a fixed length'],
  'These are labels made of digits rather than quantities, and nothing is ever added to them, so '
  'the column should be text, so that a leading zero survives. Stored as a number the second value '
  'comes back shorter than it went in.')

q('GB_DB_011', 'DB_FAM03_COLUMN_TYPE_RECOGNITION', 'D1',
  'A column holds values such as 2026-04-01 and 2025-11-30. What type should it be given?',
  'A date type',
  ['Text, since it contains dashes',
   'A whole number, with the dashes removed',
   'A decimal number'],
  'Stored as a date type the values can be compared and ordered as dates and invalid ones are '
  'refused. Stored as text, 2026-04-01 and 01/04/2026 would both be accepted and would not compare '
  'sensibly.')

q('GB_DB_012', 'DB_FAM03_COLUMN_TYPE_RECOGNITION', 'D1',
  'A column records whether an employee is currently active. What type should it be given?',
  'A true or false type',
  ['Free text, so any wording can be used',
   'A whole number counting the days active',
   'A date type'],
  'There are exactly two states to record, so a true or false type fits. Free text lets Yes, yes, '
  'Y and Active all mean the same thing and none of them compare equal.')

q('GB_DB_013', 'DB_FAM03_COLUMN_TYPE_RECOGNITION', 'D2',
  'A phone column was given a whole-number type. The value 0801234 was stored and reads back as '
  '801234. What happened?',
  'A number has no leading zero to keep, so it was never stored',
  ['The column was declared too short for the value',
   'The leading zero was a typing mistake by the operator',
   'Numbers are rounded when they are stored'],
  'Eight hundred and one thousand two hundred and thirty-four is the same quantity however it is '
  'written, so a number has no leading zero to keep, so it was never stored. The type was chosen '
  'because the value looked numeric rather than because it was a quantity.')

# =========================================================================
# DB_FAM04_DUPLICATION_CONSEQUENCE — D2, D3
# =========================================================================
q('GB_DB_014', 'DB_FAM04_DUPLICATION_CONSEQUENCE', 'D2',
  'A table records the customer\'s address on every one of their orders. The customer moves, and '
  'the address is corrected on some of their orders but not all. What is the consequence?',
  'The table now gives two different answers to the same question',
  ['The table takes up more space than it needs to',
   'Nothing goes wrong until the older orders are read',
   'The database refuses the correction'],
  'Two stored copies now disagree, so the table now gives two different answers to the same '
  'question, and nothing in the data says which is right. Space is a side issue next to that.')

q('GB_DB_015', 'DB_FAM04_DUPLICATION_CONSEQUENCE', 'D3',
  'While all the copies of that address still agree, why is recording it on every order already a '
  'problem?',
  'Every future change has to reach every copy, and nothing makes sure it does',
  ['It is not a problem while the copies agree',
   'It makes the table slower to read',
   'It uses storage that could be saved'],
  'The fault is designed in before it appears, because every future change has to reach every '
  'copy, and nothing makes sure it does. Today\'s agreement is luck rather than a guarantee.')

# =========================================================================
# DB_FAM05_REFERENCE_READING — D2, D3
# =========================================================================
q('GB_DB_016', 'DB_FAM05_REFERENCE_READING', 'D2',
  'authors holds 1 Rao, 2 Bose, 3 Iyer. books holds 10 Tides with author 2, 11 Reef with author 1, '
  '12 Dunes with author 7. Who wrote Tides?',
  'Bose',
  ['Rao', 'Iyer', 'It cannot be told from these two tables'],
  'Tides carries the identifier 2, and the author with identifier 2 is Bose. The reference is '
  'followed from the book to the author rather than the other way round.')

q('GB_DB_017', 'DB_FAM05_REFERENCE_READING', 'D3',
  'In those same tables, Dunes refers to author 7 and no author carries that identifier. What does '
  'that tell us?',
  'The reference points at a row that does not exist',
  ['It refers to the seventh author in the list',
   'It records that the author is unknown',
   'It refers to the first author, as a default'],
  'A reference means only the row carrying that identifier, and there is no such row, so the '
  'reference points at a row that does not exist. It is not a position in the table and not a way '
  'of saying unknown.')

# =========================================================================
# DB_FAM06_RELATIONSHIP_SHAPE — D2, D3, D4
# =========================================================================
q('GB_DB_018', 'DB_FAM06_RELATIONSHIP_SHAPE', 'D2',
  'One author may write many books, and each book has exactly one author. Which side carries the '
  'reference to the other?',
  'Each book carries the identifier of its author',
  ['Each author carries the identifiers of their books',
   'Both sides carry a reference to the other',
   'Neither; the two are matched on the author\'s name'],
  'A reference can hold one value, so it belongs on the side that has one thing to point at: each '
  'book carries the identifier of its author. Putting it on the author would need room for an '
  'unknown number of books.')

q('GB_DB_019', 'DB_FAM06_RELATIONSHIP_SHAPE', 'D3',
  'A student may enrol on many courses, and a course may hold many students. What shape is that '
  'relationship?',
  'Many on both sides',
  ['One student to many courses',
   'One course to many students',
   'One student to one course'],
  'Neither side is limited to one, so the relationship is many on both sides. Describing it in one '
  'direction only leaves out half of what is true.')

q('GB_DB_020', 'DB_FAM06_RELATIONSHIP_SHAPE', 'D4',
  'A designer tries to record that enrolment by adding a course column to the student row. What '
  'breaks?',
  'A student on three courses needs three values where there is room for one',
  ['Course names would be repeated across students',
   'Nothing; a list of courses can be kept in the column',
   'The student table becomes too wide to print'],
  'A single column holds one value per row, and the relationship allows many, so a student on '
  'three courses needs three values where there is room for one. Recording the pairs in a table of '
  'their own is what fits the shape.',
  evidence='adding a course column to the student row')

# =========================================================================
# DB_FAM07_SPLIT_DECISION — D2, D3, D4
# =========================================================================
q('GB_DB_021', 'DB_FAM07_SPLIT_DECISION', 'D2',
  'An orders table repeats the customer\'s name and address on every order. Which split records '
  'each fact once?',
  'A customers table, with each order referring to a customer',
  ['An addresses table keyed on the address text, with orders referring to it',
   'One orders table for each city',
   'No split; the repeated values are identical anyway'],
  'The repeated facts are facts about a customer, so they belong in a customers table, with each '
  'order referring to a customer. Splitting on the address alone keeps two people at one address '
  'sharing a row they should not share.')

q('GB_DB_022', 'DB_FAM07_SPLIT_DECISION', 'D3',
  'After that split, in how many places is one customer\'s address recorded?',
  'In one place, on that customer\'s row',
  ['In one place per order, as before',
   'In both tables, so either can be read on its own',
   'Nowhere; it has to be worked out from the orders'],
  'The point of the split is that the fact is stored once, in one place, on that customer\'s row. '
  'Every order reaches it through the reference rather than keeping a copy.')

q('GB_DB_023', 'DB_FAM07_SPLIT_DECISION', 'D4',
  'A designer goes further and splits the address into separate street, city, state and country '
  'tables, each with its own identifier. Every answer the system gives stays correct. What does it '
  'cost?',
  'A question as simple as where a customer lives now needs several tables combined',
  ['Nothing; more tables is always the better design',
   'Addresses can no longer be corrected',
   'The duplication comes back in a different form'],
  'Correctness is not what suffers, which is why the stem says the answers stay right: a question '
  'as simple as where a customer lives now needs several tables combined. Splitting stops paying '
  'once the fact being separated is not independently repeated.',
  evidence='Every answer the system gives stays correct')

# =========================================================================
# DB_FAM08_MISSING_VALUE_BEHAVIOUR — D2, D3, D4
# =========================================================================
q('GB_DB_024', 'DB_FAM08_MISSING_VALUE_BEHAVIOUR', 'D2',
  'A bonus column is left blank both for employees who received no bonus and for employees whose '
  'bonus has not been decided yet. What has been lost?',
  'The difference between a bonus of nothing and a bonus not yet known',
  ['Nothing; both cases mean the same in the end',
   'The total, which can no longer be worked out',
   'The order in which the rows were added'],
  'Two different situations were written down the same way, so what is lost is the difference '
  'between a bonus of nothing and a bonus not yet known. A recorded zero and a blank say different '
  'things and should not be merged.')

q('GB_DB_025', 'DB_FAM08_MISSING_VALUE_BEHAVIOUR', 'D3',
  'Two rows both have nothing recorded in the same column. Are those two blanks equal to each '
  'other?',
  'No; a blank is not equal to anything, itself included',
  ['Yes; both are empty and so both are the same',
   'Yes, as long as the column holds text',
   'Only when the two rows were added at the same time'],
  'A blank stands for a value nobody knows, and two unknowns cannot be declared the same, so a '
  'blank is not equal to anything, itself included. This is why blanks have to be asked for '
  'specially rather than compared.')

q('GB_DB_026', 'DB_FAM08_MISSING_VALUE_BEHAVIOUR', 'D4',
  'A manager checks a bonus report and says the reported average should equal the reported total '
  'divided by the number of employees. It does not. Both figures come from the same column, in '
  'which some rows are blank. Why do they disagree?',
  'The average divides by the number of recorded bonuses, not by the number of employees',
  ['The average is rounded and the total is not',
   'The total skips blanks while the average counts them as zero',
   'The two figures are taken over different sets of rows'],
  'Both figures skip the blanks, and they differ in what the average then divides by: the average '
  'divides by the number of recorded bonuses, not by the number of employees. The manager\'s '
  'arithmetic silently treats every blank as a zero.',
  evidence='the reported average should equal the reported total divided by the number of '
           'employees')

# =========================================================================
# DB_FAM09_CONSTRAINT_EFFECT — D2, D3, D4
# =========================================================================
q('GB_DB_027', 'DB_FAM09_CONSTRAINT_EFFECT', 'D2',
  'The employees table declares emp_id as its key. A new row is offered carrying an emp_id that '
  'already exists. What happens?',
  'It is refused, because the key has to be unique',
  ['It is accepted, replacing the existing row',
   'It is accepted, and a fresh identifier is assigned to it',
   'It is accepted, and both rows are kept'],
  'A key that appeared twice would identify two rows and stop being a key, so the row is refused, '
  'because the key has to be unique. Nothing is overwritten and nothing is renumbered.')

q('GB_DB_028', 'DB_FAM09_CONSTRAINT_EFFECT', 'D3',
  'The same table declares that department_id must refer to an existing department. A new row is '
  'offered with department_id 99, and no department carries that identifier. What happens?',
  'It is refused, because the reference points at nothing',
  ['It is accepted, and department 99 is created',
   'It is accepted, with the reference left blank',
   'It is accepted, and matched to the nearest existing department'],
  'The constraint exists to stop exactly this row from being stored, so it is refused, because the '
  'reference points at nothing. A database does not invent the row that was referred to.')

q('GB_DB_029', 'DB_FAM09_CONSTRAINT_EFFECT', 'D4',
  'The same table also declares that full_name may not be blank. A row is offered with a fresh '
  'emp_id, a department that exists, and full_name left blank. What happens?',
  'It is refused, because full_name may not be blank',
  ['It is accepted, since only keys and references are enforced',
   'It is refused, because its blank duplicates another row\'s blank',
   'It is accepted, and the blank is stored as empty text'],
  'The first two constraints are satisfied and the third is not, so the row is refused, because '
  'full_name may not be blank. Two blanks never count as duplicates of each other, so the key '
  'constraint is not what stops it.',
  evidence='a fresh emp_id, a department that exists, and full_name left blank')

# =========================================================================
# DB_FAM10_ORDER_REASONING — D2, D3, D4
# =========================================================================
q('GB_DB_030', 'DB_FAM10_ORDER_REASONING', 'D2',
  'Rows were added to a table in a known order. Does reading the table back return them in that '
  'order?',
  'Not unless the reading asks for an order',
  ['Yes, always',
   'Yes, unless a row has been deleted since',
   'Yes, provided the table has a key'],
  'A table is a set of rows and keeps no arrival order, so the rows come back in a known order '
  'only unless the reading asks for an order. Seeing them arrive in order proves nothing about the '
  'next read.')

q('GB_DB_031', 'DB_FAM10_ORDER_REASONING', 'D3',
  'A report read the table twice and got the rows in the same order both times. Is that order now '
  'guaranteed?',
  'No; an order that was observed is not an order that was promised',
  ['Yes; two identical reads establish it',
   'Yes, until the next row is added',
   'Yes, as long as the key is numeric'],
  'Nothing about reading a table twice creates a rule, so an order that was observed is not an '
  'order that was promised. The same read can come back differently after maintenance, a new index '
  'or a change in size.')

q('GB_DB_032', 'DB_FAM10_ORDER_REASONING', 'D4',
  'A program takes the first row it reads to be the oldest record. It is right for eight months '
  'and then wrong, and nothing about the program changed in that time. What happened?',
  'The stored order changed, and it had never guaranteed anything about age',
  ['A row was deleted from the table',
   'The identifier column ran out of values',
   'The table grew too large to read in one go'],
  'The program depended on something that was true by accident, so the stored order changed, and '
  'it had never guaranteed anything about age. Asking for the oldest by date is what makes the '
  'answer stable.',
  evidence='nothing about the program changed in that time')

# =========================================================================
# DB_FAM11_COMBINED_RESULT — D3, D4
# =========================================================================
q('GB_DB_033', 'DB_FAM11_COMBINED_RESULT', 'D3',
  'authors holds four rows: Rao, Bose, Iyer and Nair. books holds five rows: two written by Rao, '
  'one by Bose, one by Iyer, and one referring to an author identifier that appears nowhere. '
  'Matching the two tables on the author reference gives how many rows?',
  'Four',
  ['Five, one for each book', 'Nine, the two tables added', 'Twenty, every possible pairing'],
  'Each of the four books whose author exists produces one row, and the fifth matches nothing, so '
  'four rows come back. Rao contributes two of them because Rao wrote two books.')

q('GB_DB_034', 'DB_FAM11_COMBINED_RESULT', 'D4',
  'Nair appears nowhere in that matched result, although Nair is in the authors table. Why?',
  'Nair has written no book, and matching keeps only rows that pair up',
  ['Nair was removed by a condition on the result',
   'Nair\'s row is missing its identifier',
   'The matching dropped the last row of the authors table'],
  'Matching produces a row only where the two sides correspond, so Nair has written no book, and '
  'matching keeps only rows that pair up. An author with no books and a book with no author drop '
  'out for the same reason.',
  evidence='although Nair is in the authors table')

# =========================================================================
# DB_FAM12_DATA_FAULT_DIAGNOSIS — D3, D4
# =========================================================================
q('GB_DB_035', 'DB_FAM12_DATA_FAULT_DIAGNOSIS', 'D3',
  'A report counts employees for each department and the counts add up to more than the number of '
  'employees. Every employee belongs to exactly one department. What explains it?',
  'Something else joined into the report repeats each employee across several rows',
  ['Some employees have no department recorded',
   'The line of headings is being counted as a row',
   'Each department is being counted twice'],
  'The stem rules out an employee belonging to two departments, so the extra rows come from '
  'elsewhere: something else joined into the report repeats each employee across several rows. An '
  'employee with three recorded skills is counted three times.')

q('GB_DB_036', 'DB_FAM12_DATA_FAULT_DIAGNOSIS', 'D4',
  'A similar report totals fewer employees than the table holds. The report keeps only rows where '
  'the department reference matches a department row. What explains the shortfall?',
  'Some employees refer to a department that no longer exists and so match nothing',
  ['Some employees are counted twice and the total was corrected',
   'The count is being rounded down',
   'The departments table holds more rows than it should'],
  'Rows that fail to match are left out entirely rather than reported as unmatched, so some '
  'employees refer to a department that no longer exists and so match nothing. Missing employees '
  'and repeated employees are opposite symptoms of two different faults.',
  evidence='The report keeps only rows where the department reference matches a department row')

# =========================================================================
# DB_FAM13_DESIGN_CONSEQUENCE — D3, D4, D5 x3
# =========================================================================
q('GB_DB_037', 'DB_FAM13_DESIGN_CONSEQUENCE', 'D3',
  'A design records only each customer\'s current balance. Somebody later asks how much that '
  'customer spent last month. Can the design answer?',
  'No; the individual amounts were never written down',
  ['Yes, by subtracting last month\'s balance from this month\'s',
   'Yes, if the balance carries the date it was last changed',
   'Yes, from the customers table alone'],
  'Only the running figure was kept and every amount that changed it was discarded, so no; the '
  'individual amounts were never written down. Last month\'s balance is not stored either, which '
  'is why the subtraction has nothing to work from.')

q('GB_DB_038', 'DB_FAM13_DESIGN_CONSEQUENCE', 'D4',
  'A design stores a customer\'s several phone numbers in one column, separated by commas. Every '
  'screen in the system displays them correctly. What can the design not do?',
  'Answer a question about one number, such as which customers share a number',
  ['Show the numbers to a user',
   'Hold more than two numbers in the column',
   'Be read by a program at all'],
  'Display works because the whole column is shown at once, which is why nothing looks wrong: what '
  'it cannot do is answer a question about one number, such as which customers share a number. The '
  'database sees one piece of text rather than several values.',
  evidence='Every screen in the system displays them correctly')

q('GB_DB_039', 'DB_FAM13_DESIGN_CONSEQUENCE', 'D5',
  'What kind of question can a design never answer, when it records only the state a thing is in '
  'now?',
  'Any question about how that state was arrived at, or what it was before',
  ['Any question about the present state',
   'Questions that need more than one table',
   'Questions that need a total rather than a list'],
  'The present is exactly what such a design keeps, and everything else has been thrown away, so '
  'it can never answer any question about how that state was arrived at, or what it was before. '
  'The question usually arrives long after the design is in use.',
  mode='TRANSFER', hinge='when it records only the state a thing is in')

q('GB_DB_040', 'DB_FAM13_DESIGN_CONSEQUENCE', 'D5',
  'Recording every change as it happens, as well as the value it produced, answers a wider range '
  'of later questions. What does it cost?',
  'Many more rows, and the current value now has to be worked out or kept in step separately',
  ['Nothing; it is the better design in every respect',
   'The current value becomes impossible to find',
   'The table can no longer have a key'],
  'The extra questions are paid for with many more rows, and the current value now has to be '
  'worked out or kept in step separately. That second copy is itself a duplication that has to be '
  'maintained.',
  mode='TRADEOFF', hinge='Recording every change as it happens')

q('GB_DB_041', 'DB_FAM13_DESIGN_CONSEQUENCE', 'D5',
  'A design is being settled while the questions it will have to answer are still unknown. What is '
  'the safer default?',
  'Record the facts as they happen, and work summaries out from them later',
  ['Record the summaries, since those are what people actually ask for',
   'Record both the facts and the summaries in the same column',
   'Postpone the design until the questions are known'],
  'A summary can always be produced from the facts and the facts can never be recovered from a '
  'summary, so record the facts as they happen, and work summaries out from them later. The '
  'asymmetry is what makes this the default rather than a preference.',
  mode='TRANSFER', hinge='while the questions it will have to answer are still unknown')

# =========================================================================
# DB_FAM14_EDGE_DATA_REASONING — D4, D5 x4
# =========================================================================
q('GB_DB_042', 'DB_FAM14_EDGE_DATA_REASONING', 'D4',
  'A monthly report totals the sales for a month in which no sale was made. The report shows a '
  'blank where the total should be, and does not fail. What is the reason?',
  'A total over no rows has no value to report, unless the report supplies one',
  ['The report failed and printed nothing',
   'The whole sales table is empty',
   'That month was left out of the report'],
  'There was nothing to add, and adding nothing yields no figure at all: a total over no rows has '
  'no value to report, unless the report supplies one. The absence of a failure is the clue that '
  'this is normal behaviour rather than a fault.',
  evidence='The report shows a blank where the total should be, and does not fail')

q('GB_DB_043', 'DB_FAM14_EDGE_DATA_REASONING', 'D5',
  'For that same empty month the report shows a count of 0 next to a blank total, and both figures '
  'are correct. What should the reader take from the pair?',
  'That no sale was recorded at all, rather than sales that came to nothing',
  ['That the report is inconsistent with itself',
   'That the total failed while the count succeeded',
   'That the count is wrong and should also be blank'],
  'The two figures answer different questions and agree with each other: no sale was recorded at '
  'all, rather than sales that came to nothing. A zero total would have been the wrong claim to '
  'print.',
  mode='EDGE', hinge='a count of 0 next to a blank total')

q('GB_DB_044', 'DB_FAM14_EDGE_DATA_REASONING', 'D5',
  'A list of departments with the number of employees in each leaves out one department entirely. '
  'That department currently has nobody in it. Why is it missing?',
  'Matching produces no row at all for a department with nobody to match',
  ['It was removed by a condition somewhere in the report',
   'Its identifier is missing from the departments table',
   'Counts of zero are dropped when the report is formatted'],
  'The report is built by pairing departments with employees, and matching produces no row at all '
  'for a department with nobody to match. The department is absent rather than shown as zero.',
  mode='EDGE', hinge='That department currently has nobody in it')

q('GB_DB_045', 'DB_FAM14_EDGE_DATA_REASONING', 'D5',
  'How is that empty department made to appear in the list, showing a count of zero?',
  'Keep every department, and count only the employees that match each one',
  ['Add a placeholder employee to the empty department',
   'Count the rows of the departments table instead',
   'Remove the condition that limits which employees are counted'],
  'The department has to survive the matching before it can be counted, so keep every department, '
  'and count only the employees that match each one. The count then comes out as zero rather than '
  'as a missing line.',
  mode='TRANSFER', hinge='made to appear in the list, showing a count of zero')

q('GB_DB_046', 'DB_FAM14_EDGE_DATA_REASONING', 'D5',
  'Rather than change the report, somebody adds one placeholder employee to each empty department '
  'so that every department appears. The list now looks right. What does that cost?',
  'The employees table now holds rows describing nobody, and every count of employees is wrong',
  ['Nothing; the placeholders are ignored by everything else',
   'The report becomes slower to produce',
   'The departments table has to be given new identifiers'],
  'The fix is applied to the data rather than to the report, so the employees table now holds rows '
  'describing nobody, and every count of employees is wrong. Every future reader has to know about '
  'the placeholders, and eventually one will not.',
  mode='TRADEOFF', hinge='adds one placeholder employee to each empty department')

# =========================================================================
# DB_FAM15_KEY_CHOICE_TRANSFER — D4, D5 x3
# =========================================================================
q('GB_DB_047', 'DB_FAM15_KEY_CHOICE_TRANSFER', 'D4',
  'Four columns are proposed as the key of a customers table: the email address, the phone number, '
  'the full name, and a number the system assigns. All four hold different values in today\'s '
  'data. Which should be chosen?',
  'The number the system assigns, because nothing outside the system can change it',
  ['The email address, which is unique and already known',
   'The phone number, which is unique and shorter',
   'The full name, combined with the city to make it unique'],
  'Uniqueness today is the one thing all four have, so the choice turns on what happens next: the '
  'number the system assigns, because nothing outside the system can change it. The other three '
  'belong to the customer, who is entitled to change them.',
  evidence='All four hold different values in today\'s data')

q('GB_DB_048', 'DB_FAM15_KEY_CHOICE_TRANSFER', 'D5',
  'The email address was chosen as the key, and a customer now changes their email address. What '
  'has to happen?',
  'Every row anywhere that refers to that customer by email has to be found and changed too',
  ['Nothing; the change affects only the customer\'s own row',
   'The customer has to be recorded again as a new customer',
   'The old address has to be kept forever alongside the new one'],
  'A key is copied into every row that refers to the customer, so every row anywhere that refers '
  'to that customer by email has to be found and changed too. Missing one of them silently '
  'detaches part of the customer\'s history.',
  mode='TRANSFER', hinge='a customer now changes their email address')

q('GB_DB_049', 'DB_FAM15_KEY_CHOICE_TRANSFER', 'D5',
  'The phone number was chosen as the key, and two people in one household share a landline. What '
  'happens when the second person is recorded?',
  'The second row is refused, and the two people cannot both be held in the table',
  ['Both rows are stored and the key stops being enforced',
   'The second row replaces the first',
   'The number is stored twice and a warning is issued'],
  'The key constraint does exactly what it was declared to do, so the second row is refused, and '
  'the two people cannot both be held in the table. A value that is unique for most people is not '
  'a key.',
  mode='EDGE', hinge='two people in one household share a landline')

q('GB_DB_050', 'DB_FAM15_KEY_CHOICE_TRANSFER', 'D5',
  'Why is a system-assigned key preferred, even though it stores a value that means nothing to '
  'anybody outside the system?',
  'It is never asked to change, which is the one property a key needs and real values lack',
  ['It takes up less room than an address or a name',
   'It can be sorted more quickly than text',
   'It prevents the same person being recorded twice'],
  'Meaning is not what a key is for: it is never asked to change, which is the one property a key '
  'needs and real values lack. It does nothing at all to stop the same person being entered twice, '
  'which is a separate problem.',
  mode='TRADEOFF', hinge='it stores a value that means nothing to anybody')
