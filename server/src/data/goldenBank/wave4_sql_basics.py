# -*- coding: utf-8 -*-
"""
Wave 4 — SQL_BASICS, 50 Golden Bank questions, all newly authored.

MISSING VALUES AND ROW MULTIPLICATION ARE THE TWO FAULTS THAT MATTER. Both produce a number that
looks like an answer: an average taken over a divisor nobody checked, and a total inflated by a
join that had nothing to match on. Neither raises an error, and both are reported to somebody who
acts on them.

EVERY TABLE IS SMALL ENOUGH TO COUNT BY HAND. A question whose answer cannot be derived from the
rows shown is a recall question wearing a table.

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
# SQ_FAM01_COLUMN_SELECTION — D1 x4, D2 x1
# =========================================================================
q('GB_SQ_001', 'SQ_FAM01_COLUMN_SELECTION', 'D1',
  'A students table holds id, name, city and marks, and contains 5 rows. What does SELECT name, '
  'city FROM students return?',
  'Two columns, for all 5 rows',
  ['All four columns, for all 5 rows',
   'Two columns, for the rows that have a city recorded',
   'Two rows'],
  'Naming columns chooses what comes back across the width of the result and leaves the rows '
  'alone, so the query returns two columns, for all 5 rows. Nothing was asked that could remove a '
  'row.')

q('GB_SQ_002', 'SQ_FAM01_COLUMN_SELECTION', 'D1',
  'What does SELECT * FROM students return, for that same 5-row table?',
  'Every column, for all 5 rows',
  ['Every column, for the first row only',
   'Only the first column',
   'Nothing until a condition is added'],
  'The star stands for the whole width of the table, so the query returns every column, for all 5 '
  'rows. A query with no condition removes nothing.')

q('GB_SQ_003', 'SQ_FAM01_COLUMN_SELECTION', 'D1',
  'The table stores name before city. In what order do the columns arrive from SELECT city, name '
  'FROM students?',
  'city first, then name',
  ['name first, then city, as the table stores them',
   'In alphabetical order of the column names',
   'In an order that cannot be relied on'],
  'The result is laid out in the order the query asked for, giving city first, then name. How the '
  'table stores them does not reach the caller.')

q('GB_SQ_004', 'SQ_FAM01_COLUMN_SELECTION', 'D1',
  'How many rows does SELECT name FROM students return from that 5-row table?',
  'Five',
  ['One, containing all five names',
   'Five, only if every name is different',
   'None, until a condition is added'],
  'One row of the table becomes one row of the result, so five come back. Choosing a single column '
  'narrows the result rather than combining it.')

q('GB_SQ_005', 'SQ_FAM01_COLUMN_SELECTION', 'D2',
  'Changing a query from SELECT * to SELECT name, city changes which of the following?',
  'Only how many columns come back',
  ['Both how many columns and how many rows come back',
   'Only how many rows come back',
   'Neither, since the same table is read'],
  'The choice of columns and the choice of rows are made by different parts of a query, so this '
  'changes only how many columns come back. Removing rows takes a condition.')

# =========================================================================
# SQ_FAM02_CLAUSE_ORDER — D1 x3, D2 x1
# =========================================================================
q('GB_SQ_006', 'SQ_FAM02_CLAUSE_ORDER', 'D1',
  'Which query is written in a valid order?',
  'SELECT name FROM students WHERE marks > 50 ORDER BY name',
  ['SELECT name FROM students ORDER BY name WHERE marks > 50',
   'SELECT name WHERE marks > 50 FROM students ORDER BY name',
   'ORDER BY name SELECT name FROM students WHERE marks > 50'],
  'The parts of a query have a fixed written order: what to return, where from, which rows, then '
  'how to sort. Only SELECT name FROM students WHERE marks > 50 ORDER BY name follows it.')

q('GB_SQ_007', 'SQ_FAM02_CLAUSE_ORDER', 'D1',
  'Students scoring above 40 are to be counted city by city. Which query is written in a valid '
  'order?',
  'SELECT city, COUNT(*) FROM students WHERE marks > 40 GROUP BY city',
  ['SELECT city, COUNT(*) FROM students GROUP BY city WHERE marks > 40',
   'SELECT city, COUNT(*) GROUP BY city FROM students WHERE marks > 40',
   'GROUP BY city SELECT city, COUNT(*) FROM students WHERE marks > 40'],
  'Row filtering is written before grouping, so SELECT city, COUNT(*) FROM students WHERE marks > '
  '40 GROUP BY city is the one that will run. The others place the parts out of order.')

q('GB_SQ_008', 'SQ_FAM02_CLAUSE_ORDER', 'D1',
  'In a written query, which comes first: naming the table, or saying how to sort?',
  'Naming the table',
  ['Saying how to sort',
   'Either; the order of the two is free',
   'It depends on whether a condition is present'],
  'Naming the table comes first, because everything after it refers to that table. Sorting is '
  'written last of the two.')

q('GB_SQ_009', 'SQ_FAM02_CLAUSE_ORDER', 'D2',
  'A query is written with its sorting clause before its row condition. What happens when it is '
  'run?',
  'It does not run at all',
  ['It runs, sorting before filtering',
   'It runs, and the sorting is ignored',
   'It runs, and returns every row unsorted'],
  'The order the parts are written in is fixed, so a query with them swapped does not run at all. '
  'This is one of the few mistakes the database refuses outright rather than answering oddly.')

# =========================================================================
# SQ_FAM03_SIMPLE_FILTER — D1 x3, D2 x1
# =========================================================================
q('GB_SQ_010', 'SQ_FAM03_SIMPLE_FILTER', 'D1',
  'A scores table holds: Ana 40, Ben 55, Cara 40, Dan 70, Eve with no marks recorded. How many '
  'rows does WHERE marks > 40 return?',
  '2',
  ['3', '4', '1'],
  'Only Ben and Dan are above forty, giving 2 rows. The two rows at exactly forty are not above it.')

q('GB_SQ_011', 'SQ_FAM03_SIMPLE_FILTER', 'D1',
  'From the same scores table, how many rows does WHERE marks >= 40 return?',
  '4',
  ['2', '5', '3'],
  'Ana, Ben, Cara and Dan all reach forty or more, giving 4 rows. Eve has nothing recorded and so '
  'is not among them.')

q('GB_SQ_012', 'SQ_FAM03_SIMPLE_FILTER', 'D1',
  'From the same scores table, how many rows does WHERE name = \'Ana\' return?',
  '1',
  ['0, because text cannot be compared', '2', '5'],
  'One row carries that name, so 1 row comes back. Text is compared just as numbers are.')

q('GB_SQ_013', 'SQ_FAM03_SIMPLE_FILTER', 'D2',
  'From the same scores table, how many rows does WHERE marks < 60 return?',
  '3',
  ['4, counting the row with nothing recorded', '2', '5'],
  'Ana, Cara and Ben are below sixty, giving 3 rows. The row with nothing recorded is not below '
  'sixty, because there is no value there to compare.')

# =========================================================================
# SQ_FAM04_COMBINED_FILTER — D2, D3
# =========================================================================
q('GB_SQ_014', 'SQ_FAM04_COMBINED_FILTER', 'D2',
  'A table holds: Ana/Pune/40, Ben/Pune/70, Cara/Delhi/40, Dan/Delhi/70. How many rows does WHERE '
  'city = \'Pune\' AND marks > 50 return?',
  '1',
  ['2', '3', '0'],
  'Only Ben is both in Pune and above fifty, so 1 row comes back. Requiring both conditions is '
  'what makes it a single row rather than three.')

q('GB_SQ_015', 'SQ_FAM04_COMBINED_FILTER', 'D3',
  'From the same four rows, how many does WHERE city = \'Pune\' OR marks > 50 return?',
  '3',
  ['1', '4', '2'],
  'Ana and Ben qualify on the city and Dan qualifies on the marks, giving 3 rows. Ben satisfies '
  'both and is still counted once.')

# =========================================================================
# SQ_FAM05_ORDER_RESULT — D2, D3
# =========================================================================
q('GB_SQ_016', 'SQ_FAM05_ORDER_RESULT', 'D2',
  'A table holds Ana 70, Ben 50, Cara 70, Dan 60. In what sequence do the rows arrive from ORDER '
  'BY marks DESC?',
  'Ana and Cara in some order, then Dan, then Ben',
  ['Ben, then Dan, then Ana and Cara',
   'Ana, Cara, Ben, Dan, following the stored order',
   'Ana, Ben, Cara, Dan, by name'],
  'Sorting downwards puts the highest first, giving Ana and Cara in some order, then Dan, then '
  'Ben. The two seventies tie, and nothing in the query says which of them leads.')

q('GB_SQ_017', 'SQ_FAM05_ORDER_RESULT', 'D3',
  'Two rows hold the same value in the column being sorted on. Which of the two comes first?',
  'It is not guaranteed unless a further sorting column is given',
  ['Whichever was inserted first',
   'Whichever comes first alphabetically by name',
   'Whichever has the smaller identifier'],
  'The sort has nothing left to separate the tied rows, so it is not guaranteed unless a further '
  'sorting column is given. Relying on today\'s order is how a report changes for no visible '
  'reason.')

# =========================================================================
# SQ_FAM06_AGGREGATE_RESULT — D2, D3, D4
# =========================================================================
q('GB_SQ_018', 'SQ_FAM06_AGGREGATE_RESULT', 'D2',
  'A table holds Ana 40, Ben 60, Cara with no marks recorded, Dan 80. What does SELECT COUNT(*) '
  'return?',
  '4',
  ['3', '1', '180'],
  'Counting rows counts every row that exists, giving 4. Whether a particular column has a value '
  'in it does not come into this count.')

q('GB_SQ_019', 'SQ_FAM06_AGGREGATE_RESULT', 'D3',
  'From the same four rows, what does SELECT COUNT(marks) return?',
  '3',
  ['4', '1', '180'],
  'Counting a named column counts the values present in it, and Cara has none, so the answer is '
  '3. This is the one place the two ways of counting part company.')

q('GB_SQ_020', 'SQ_FAM06_AGGREGATE_RESULT', 'D4',
  'From the same four rows, one of which has no marks recorded, what does SELECT AVG(marks) '
  'return?',
  '60, because the missing row is left out of both the total and the divisor',
  ['45, because the missing row counts as a zero in the divisor',
   '180, which is the total rather than the average',
   '80, which is the largest value present'],
  'The total is one hundred and eighty over three values, giving 60, because the missing row is '
  'left out of both the total and the divisor. Treating the gap as a zero would give forty-five, '
  'which is what a hand calculation usually produces.',
  evidence='one of which has no marks recorded')

# =========================================================================
# SQ_FAM07_GROUP_RESULT — D2, D3, D4
# =========================================================================
q('GB_SQ_021', 'SQ_FAM07_GROUP_RESULT', 'D2',
  'A sales table holds Pune 10, Pune 20, Delhi 30, Delhi 5, Delhi 5. How many rows does SELECT '
  'city, SUM(amount) FROM sales GROUP BY city return?',
  '2',
  ['5, one per original row', '1, holding the overall total', '3'],
  'Grouping produces one row for each distinct value in the grouping column, and there are two '
  'cities, so 2 rows come back.')

q('GB_SQ_022', 'SQ_FAM07_GROUP_RESULT', 'D3',
  'What do those returned rows hold?',
  'Pune with 30 and Delhi with 40',
  ['Pune with 2 and Delhi with 3',
   'A single row holding 70',
   'Pune with 30, Delhi with 30, Delhi with 5 and Delhi with 5'],
  'Each group is collapsed to one row carrying its own total, giving Pune with 30 and Delhi with '
  '40. Counting the rows in each group instead would give two and three.')

q('GB_SQ_023', 'SQ_FAM07_GROUP_RESULT', 'D4',
  'A grouped query returns 3 rows, although the city column appears to hold only two different '
  'names when the table is read by eye. What is the likeliest cause?',
  'Two values that look alike differ as stored text, so they group separately',
  ['Grouping always adds an extra row holding the overall total',
   'The query grouped by the wrong column',
   'Rows with no amount recorded form a group of their own'],
  'Grouping compares the stored values rather than their appearance, so two values that look alike '
  'differ as stored text, so they group separately. A trailing space or a difference in case is '
  'enough.',
  evidence='although the city column appears to hold only two different names')

# =========================================================================
# SQ_FAM08_FILTER_STAGE — D2, D3, D4
# =========================================================================
q('GB_SQ_024', 'SQ_FAM08_FILTER_STAGE', 'D2',
  'Only sales above 10 are to be included in each city\'s total. Which stage does that condition '
  'belong to?',
  'The rows, before they are grouped',
  ['The groups, after they are formed',
   'Either stage; the result is the same',
   'The sorting, at the end'],
  'The condition is about individual sales, so it belongs to the rows, before they are grouped. '
  'Applying it later would test totals rather than sales.')

q('GB_SQ_025', 'SQ_FAM08_FILTER_STAGE', 'D3',
  'Two queries exist. One keeps rows whose amount is above 10 and then groups by city. The other '
  'groups by city and then keeps the groups holding more than two sales. Which answers the '
  'question "which cities made more than two sales?"',
  'The second',
  ['The first', 'Both, since they end with the same cities', 'Neither'],
  'The second is the one that answers it, because the question asks about a property of a whole '
  'city rather than of a single sale. The first can only ever discard individual sales.')

q('GB_SQ_026', 'SQ_FAM08_FILTER_STAGE', 'D4',
  'A query meant to list cities with more than two sales puts the count condition among the row '
  'conditions. The database refuses to run it. Why?',
  'A count does not exist until rows have been grouped, so it cannot be tested row by row',
  ['The count column was not also selected',
   'A count can only be compared using equals',
   'The table needs an index before it can be counted'],
  'Row conditions are decided one row at a time, and a count belongs to a set of rows: a count '
  'does not exist until rows have been grouped, so it cannot be tested row by row. The condition '
  'has to move to the stage after grouping.',
  evidence='The database refuses to run it')

# =========================================================================
# SQ_FAM09_DUPLICATE_HANDLING — D2, D3, D4
# =========================================================================
q('GB_SQ_027', 'SQ_FAM09_DUPLICATE_HANDLING', 'D2',
  'A table holds four rows: Pune/Pen, Pune/Pen, Pune/Book, Delhi/Pen. How many rows does SELECT '
  'city FROM that table return?',
  '4',
  ['2', '3', '1'],
  'Every row of the table produces a row of the result whether or not its value repeats, so 4 come '
  'back. Repeats are kept unless something asks for them to be removed.')

q('GB_SQ_028', 'SQ_FAM09_DUPLICATE_HANDLING', 'D3',
  'From those same four rows, how many does SELECT DISTINCT city return?',
  '2',
  ['4', '3', '1'],
  'Only two different cities appear, so 2 rows come back. Removing repeats is a request, not the '
  'default.')

q('GB_SQ_029', 'SQ_FAM09_DUPLICATE_HANDLING', 'D4',
  'From those same four rows, of which two are identical in both columns, how many does SELECT '
  'DISTINCT city, product return?',
  '3',
  ['2, one for each city', '4', '6'],
  'Repeats are judged on the whole returned row rather than on one column at a time, and only the '
  'two Pune pen rows are identical, so 3 rows come back.',
  evidence='of which two are identical in both columns')

# =========================================================================
# SQ_FAM10_MISSING_IN_CONDITIONS — D2, D3, D4
# =========================================================================
q('GB_SQ_030', 'SQ_FAM10_MISSING_IN_CONDITIONS', 'D2',
  'A contacts table holds Ana with phone 111, Ben with no phone recorded, Cara with phone 222, Dan '
  'with no phone recorded. How many rows does WHERE phone <> \'111\' return?',
  '1',
  ['3', '2', '0'],
  'Only Cara has a phone that is present and different, so 1 row comes back. The two rows with '
  'nothing recorded are not returned by a condition that compares against a value.')

q('GB_SQ_031', 'SQ_FAM10_MISSING_IN_CONDITIONS', 'D3',
  'Which condition returns the rows where no phone has been recorded?',
  'WHERE phone IS NULL',
  ['WHERE phone = NULL', 'WHERE phone = \'\'', 'WHERE NOT phone'],
  'A missing value cannot be compared with anything, including itself, so it takes a test of its '
  'own: WHERE phone IS NULL. Comparing with equals returns nothing at all, which looks like an '
  'empty table rather than a mistake.')

q('GB_SQ_032', 'SQ_FAM10_MISSING_IN_CONDITIONS', 'D4',
  'The contacts table has four rows. One row matches WHERE phone = \'111\' and one row matches '
  'WHERE phone <> \'111\'. Two rows are returned by neither. Why do the two counts not add up to '
  'four?',
  'A comparison against a missing value is neither true nor false, so those rows fall out of both',
  ['The two conditions overlap on one row',
   'The other two rows were removed from the table',
   'A missing value is treated as empty text, which happens to match neither'],
  'Both conditions ask something about a value that is not there, and the answer is neither yes '
  'nor no: a comparison against a missing value is neither true nor false, so those rows fall out '
  'of both. Missing rows have to be asked for separately.',
  evidence='Two rows are returned by neither')

# =========================================================================
# SQ_FAM11_COMBINATION_RESULT — D3, D4
# =========================================================================
q('GB_SQ_033', 'SQ_FAM11_COMBINATION_RESULT', 'D3',
  'customers holds 3 rows: 1 Ana, 2 Ben, 3 Cara. orders holds 4 rows, belonging to customers 1, 1, '
  '2 and 9. How many rows come back when the two are joined on the customer matching?',
  '3',
  ['7, the two row counts added', '12, every pairing', '4, one per order'],
  'Two of Ana\'s orders and one of Ben\'s find their customer, and the order belonging to customer '
  '9 finds nobody, so 3 rows come back. Cara has no order and so contributes nothing.')

q('GB_SQ_034', 'SQ_FAM11_COMBINATION_RESULT', 'D4',
  'The same two tables are combined with the matching condition left out, and the result has 12 '
  'rows. What has happened?',
  'Every customer has been paired with every order, because nothing said which rows correspond',
  ['Each table was read twice over',
   'The database duplicated rows to make the two tables the same size',
   'The two tables were read in full and placed one after the other'],
  'Three customers and four orders give twelve pairings, which is exactly what appears: every '
  'customer has been paired with every order, because nothing said which rows correspond. Placing '
  'the tables one after the other would have given seven rows.',
  evidence='with the matching condition left out, and the result has 12 rows')

# =========================================================================
# SQ_FAM12_QUERY_SELECTION — D3, D4
# =========================================================================
q('GB_SQ_035', 'SQ_FAM12_QUERY_SELECTION', 'D3',
  'Which query answers exactly the question "which students scored at least 50?"',
  'SELECT name FROM students WHERE marks >= 50',
  ['SELECT name FROM students WHERE marks > 50',
   'SELECT * FROM students WHERE marks >= 50',
   'SELECT name FROM students WHERE marks <= 50'],
  'At least fifty includes fifty itself and asks for the students rather than everything known '
  'about them, so SELECT name FROM students WHERE marks >= 50 is the exact answer. Two of the '
  'others run perfectly well and answer a slightly different question.')

q('GB_SQ_036', 'SQ_FAM12_QUERY_SELECTION', 'D4',
  'Which query answers exactly the question "which cities have more than one student?"',
  'SELECT city FROM students GROUP BY city HAVING COUNT(*) > 1',
  ['SELECT city FROM students WHERE COUNT(*) > 1',
   'SELECT city, COUNT(*) FROM students GROUP BY city',
   'SELECT DISTINCT city FROM students'],
  'The question tests a property of each city and asks only for the cities, so SELECT city FROM '
  'students GROUP BY city HAVING COUNT(*) > 1 answers it. One of the others will not run, and two '
  'run but answer a neighbouring question instead.',
  evidence='which cities have more than one student')

# =========================================================================
# SQ_FAM13_RESULT_DIAGNOSIS — D3, D4, D5 x3
# =========================================================================
q('GB_SQ_037', 'SQ_FAM13_RESULT_DIAGNOSIS', 'D3',
  'A report joins customers to orders and to addresses, then totals each customer\'s orders. Each '
  'customer appears once, and every total is several times too large. What is the fault?',
  'Each order is counted once per address, because the second join multiplies the rows',
  ['The amounts are stored in the wrong unit',
   'The row condition was applied after the grouping',
   'Some orders have no amount recorded'],
  'Grouping hides the multiplication, because the extra rows are folded back into one row per '
  'customer before anybody sees them: each order is counted once per address, because the second '
  'join multiplies the rows. A customer with three addresses reports three times the truth.')

q('GB_SQ_038', 'SQ_FAM13_RESULT_DIAGNOSIS', 'D4',
  'An average reported by a query is higher than the same average worked out by hand, in which '
  'blank entries were treated as zeroes. Nothing else differs between the two. What accounts for '
  'the gap?',
  'The query leaves the blank entries out of both the total and the divisor',
  ['The query rounds its result upwards',
   'A row condition removed the lowest values',
   'The average was taken over a different column'],
  'Both calculations use the same rows and the same column, and they differ only in what a blank '
  'entry contributes: the query leaves the blank entries out of both the total and the divisor. '
  'The hand calculation divides by a larger number and so reports less.',
  evidence='in which blank entries were treated as zeroes')

q('GB_SQ_039', 'SQ_FAM13_RESULT_DIAGNOSIS', 'D5',
  'Three faults can each make a reported total wrong: a join with nothing to match on, a condition '
  'applied at the wrong stage, and values that are not recorded. Which single check shows whether '
  'row multiplication is to blame?',
  'Count the rows the query produces before grouping and compare that with the number of source '
  'rows',
  ['Look at the average instead of the total',
   'Add a request to remove duplicate rows and see whether the total changes',
   'Run the query a second time'],
  'Multiplication is visible only before the grouping folds it away, so count the rows the query '
  'produces before grouping and compare that with the number of source rows. Removing duplicates '
  'would change the total without ever showing why.',
  mode='TRANSFER', hinge='a join with nothing to match on, a condition applied at the wrong stage')

q('GB_SQ_040', 'SQ_FAM13_RESULT_DIAGNOSIS', 'D5',
  'Adding a request to remove duplicate rows makes an inflated total come out right. What has that '
  'established?',
  'That rows were being multiplied; the join is still wrong and the symptom is now hidden',
  ['That the join was correct all along',
   'That the amounts themselves were wrong',
   'Nothing at all about the cause'],
  'The fix would do nothing unless duplicate rows existed, so rows were being multiplied; the join '
  'is still wrong and the symptom is now hidden. The next total that involves a genuinely repeated '
  'amount will be wrong in the other direction.',
  mode='TRANSFER', hinge='makes an inflated total come out right')

q('GB_SQ_041', 'SQ_FAM13_RESULT_DIAGNOSIS', 'D5',
  'A report is correct on the small sample a developer tested and wrong on the full data, where '
  'some customers have more than one address on file. What is the likeliest cause?',
  'The join multiplies rows only for customers who have more than one matching address',
  ['The full data is too large for the query to handle',
   'The sample was filtered differently from the full data',
   'The totals grow too large to be stored'],
  'The fault needs a customer with several matching rows before it can appear at all, which the '
  'sample happened not to contain: the join multiplies rows only for customers who have more than '
  'one matching address. Sample data that is too tidy hides this class of fault entirely.',
  mode='TRANSFER', hinge='where some customers have more than one address on file')

# =========================================================================
# SQ_FAM14_EMPTY_RESULT_BEHAVIOUR — D4, D5 x4
# =========================================================================
q('GB_SQ_042', 'SQ_FAM14_EMPTY_RESULT_BEHAVIOUR', 'D4',
  'No rows in the table satisfy the condition. The query asks for a count of the matching rows. '
  'What comes back?',
  'One row, holding 0',
  ['No rows at all', 'An error', 'One row, holding nothing'],
  'A count over nothing is a perfectly good answer, so one row, holding 0 comes back. An empty '
  'result is not a failure and nothing is raised.',
  evidence='No rows in the table satisfy the condition')

q('GB_SQ_043', 'SQ_FAM14_EMPTY_RESULT_BEHAVIOUR', 'D5',
  'Again no rows satisfy the condition, and this time the query asks for the average of a column. '
  'What comes back?',
  'One row, holding no value',
  ['One row, holding 0', 'No rows at all', 'An error'],
  'There is nothing to divide and nothing to divide by, so one row, holding no value comes back. '
  'A program that adds this to a running total without checking will produce nothing rather than '
  'the total it had.',
  mode='EDGE', hinge='the query asks for the average of a column')

q('GB_SQ_044', 'SQ_FAM14_EMPTY_RESULT_BEHAVIOUR', 'D5',
  'Why do a count and an average behave differently when nothing matches?',
  'Counting nothing has an answer, which is zero, and averaging nothing has none',
  ['A count is calculated more cheaply than an average',
   'An average also returns zero, and the difference is only in how it is displayed',
   'A count also returns nothing, and the difference is only in how it is displayed'],
  'The two summaries differ in whether the empty case has a sensible value at all: counting '
  'nothing has an answer, which is zero, and averaging nothing has none. Inventing a zero average '
  'would claim a measurement that was never made.',
  mode='TRANSFER', hinge='a count and an average behave differently when nothing matches')

q('GB_SQ_045', 'SQ_FAM14_EMPTY_RESULT_BEHAVIOUR', 'D5',
  'A grouped query is run over a table in which no rows satisfy the condition. How many rows come '
  'back?',
  'None, because groups are formed only out of rows that matched',
  ['One, holding a zero for the whole table',
   'One for each group that would have existed',
   'An error, because there is nothing to group'],
  'Grouping has nothing to work with once the condition has removed everything, so none come back, '
  'because groups are formed only out of rows that matched. This differs from an ungrouped count, '
  'which still answers with a single zero.',
  mode='EDGE', hinge='in which no rows satisfy the condition')

q('GB_SQ_046', 'SQ_FAM14_EMPTY_RESULT_BEHAVIOUR', 'D5',
  'An empty result can be handled by having the query substitute a zero, or by letting the program '
  'that reads the result treat no rows as zero. What does the substitution cost?',
  'The result can no longer distinguish nothing measured from a measurement of zero',
  ['Nothing; it is simply more convenient',
   'The query stops working on large tables',
   'The result comes back with a different number of columns'],
  'Substituting inside the query is convenient and loses information at the same moment: the '
  'result can no longer distinguish nothing measured from a measurement of zero. A report of zero '
  'sales and a report of no data are different claims.',
  mode='TRADEOFF', hinge='or by letting the program that reads the result treat no rows as zero')

# =========================================================================
# SQ_FAM15_QUERY_EQUIVALENCE — D4, D5 x3
# =========================================================================
q('GB_SQ_047', 'SQ_FAM15_QUERY_EQUIVALENCE', 'D4',
  'One query keeps rows above 50 and then groups them. Another groups first and keeps the groups '
  'whose largest value is above 50. They agree on the sample data, in which every group holds '
  'either all values above 50 or none. Are they equivalent?',
  'No; they part company as soon as one group holds values on both sides of 50',
  ['Yes; both end with the same groups',
   'No; the second one will not run',
   'Yes, as long as the data stays sorted'],
  'The sample cannot separate them because no group mixes the two kinds of row: they part company '
  'as soon as one group holds values on both sides of 50. The first then drops the low rows from '
  'its totals and the second keeps them.',
  evidence='in which every group holds either all values above 50 or none')

q('GB_SQ_048', 'SQ_FAM15_QUERY_EQUIVALENCE', 'D5',
  'Two conditions are written: WHERE phone <> \'111\' and WHERE NOT (phone = \'111\'). What data '
  'separates them?',
  'None; both leave out the rows where no phone is recorded',
  ['Rows with no phone recorded, which only the second returns',
   'Rows whose phone is exactly 111',
   'Rows whose phone is empty text'],
  'Both forms ask a question about a value that is not there and get no answer either way, so '
  'none; both leave out the rows where no phone is recorded. Negating a comparison does not turn '
  'an unanswerable comparison into a true one.',
  mode='EDGE', hinge='WHERE NOT (phone = \'111\')')

q('GB_SQ_049', 'SQ_FAM15_QUERY_EQUIVALENCE', 'D5',
  'Two queries count each customer\'s orders. One joins the two tables and counts the joined rows. '
  'The other keeps every customer and counts the orders that match. They agree on data in which '
  'every customer has at least one order. Are they equivalent?',
  'No; they differ for a customer with no orders, whom only the second reports',
  ['Yes; both count exactly the same orders',
   'No; the first will not run when a customer has no orders',
   'Yes, provided the two tables hold the same number of rows'],
  'A customer with no orders contributes no joined row at all, so they differ for a customer with '
  'no orders, whom only the second reports. The sample could not show it because no such customer '
  'was in it.',
  mode='TRANSFER', hinge='They agree on data in which every customer has at least one order')

q('GB_SQ_050', 'SQ_FAM15_QUERY_EQUIVALENCE', 'D5',
  'A query is rewritten to run faster and returns the same rows as the original on today\'s data. '
  'What would justify calling the rewrite safe?',
  'Showing the two agree on data containing unrecorded values and unmatched rows as well',
  ['Showing that the rewrite is measurably faster',
   'Showing that both return the same number of rows',
   'Showing that both read the same tables'],
  'Today\'s data is one sample and the rewrite has to hold for the data the table will contain, so '
  'the case rests on showing the two agree on data containing unrecorded values and unmatched rows '
  'as well. Those are the two places query rewrites usually part company.',
  mode='TRANSFER', hinge='returns the same rows as the original on today')
