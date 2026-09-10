# -*- coding: utf-8 -*-
"""
Wave 5 — RELATIONS_FUNCTIONS, 50 Golden Bank questions, all newly authored.

THE WHOLE SKILL TURNS ON ONE ASYMMETRY, AND MOST STUDENTS LEARN IT BACKWARDS. An input with two
outputs disqualifies a mapping; an output shared by two inputs does not. Every stem in the
function-test family therefore contains a shared output somewhere, so that the wrong rule is
always available to be applied and a student who holds it is always caught. The one-to-one family
then measures the mirror image, where a shared output is exactly what matters.

COMPOSITION IS ONLY MEASURED WHERE THE TWO ORDERS DISAGREE. A pair of steps that commute makes an
order question unanswerable — both routes give the key — so no stem here uses one. The diagnosis
item states the expected and the observed value, and the observed value is exactly what the
reversed order produces, so the diagnosis is checkable from the stem rather than plausible.

REVERSIBILITY IS ASKED ABOUT REAL THINGS THAT GENUINELY CANNOT BE REVERSED. Orders to months,
pupils to shared lockers, employees to reused payroll numbers. Each is a case where the forward
direction is perfectly well defined and the backward one is not, which is the point that a
question about abstract pairs tends to leave abstract.

THE LAST FAMILY USES NEITHER THE WORD FUNCTION NOR DOMAIN NOR RANGE. Recognising that a cloakroom
ticket and a payroll number are the same structure is what is being measured; naming it would
answer it.
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
# RF_FAM01_PAIR_ORDER — D1 x4, D2 x1
# =========================================================================
q('GB_RF_001', 'RF_FAM01_PAIR_ORDER', 'D1',
  'Paris is the capital of France. If the first position holds the city and the second the '
  'country, which ordered pair records that?',
  '(Paris, France)',
  ['(France, Paris)', '{Paris, France}', '(Paris, Paris)'],
  'The convention stated puts the city first, so (Paris, France) is the record. Swapping the two '
  'says that France is the capital of Paris, which is a different claim rather than the same one '
  'written differently.')

q('GB_RF_002', 'RF_FAM01_PAIR_ORDER', 'D1',
  'A record is written as (7, 2), where the first position holds a student number and the second '
  'holds a mark. What does the 7 stand for?',
  'The student number',
  ['The mark', 'Either one, since a pair carries no fixed order',
   'The number of students recorded'],
  'The positions were assigned meanings before anything was written, so the first value is the '
  'student number. Without that convention the record would say nothing at all.')

q('GB_RF_003', 'RF_FAM01_PAIR_ORDER', 'D1',
  'Does (3, 8) mean the same as (8, 3)?',
  'No, because the two positions carry different meanings',
  ['Yes, because both contain 3 and 8',
   'Yes, as long as the two values are of the same kind',
   'Only when the pair is written between braces instead'],
  'Order is the entire content of an ordered pair beyond the values themselves. Two collections '
  'containing 3 and 8 would be the same; two ordered pairs are not.')

q('GB_RF_004', 'RF_FAM01_PAIR_ORDER', 'D1',
  'A delivery log pairs a driver with the van they drove, driver first. Sunil drove van 12. '
  'Which pair records it?',
  '(Sunil, 12)',
  ['(12, Sunil)', '(Sunil, Sunil)', '(12, 12)'],
  'Driver first means (Sunil, 12). The reversed form would be read by anything using this log as '
  'a van having driven a person.')

q('GB_RF_005', 'RF_FAM01_PAIR_ORDER', 'D2',
  'A system stores pairs of the form (manager, report), manager first. A record reads (Anya, '
  'Ben), and a colleague reads it as meaning that Ben manages Anya. What has gone wrong?',
  'The positions were read in the wrong order, so the record actually says Anya manages Ben',
  ['Nothing; a record of this kind may be read in either direction',
   'The record itself is wrong and should have been written as (Ben, Anya)',
   'The record should have used braces rather than brackets'],
  'The data is correct and the reading is not. A convention that is not carried to the reader '
  'turns every record into two contradictory claims.')

# =========================================================================
# RF_FAM02_DOMAIN_RANGE_NAMING — D1 x3, D2 x1
# =========================================================================
q('GB_RF_006', 'RF_FAM02_DOMAIN_RANGE_NAMING', 'D1',
  'A mapping is given by the pairs (1, 5), (2, 7) and (3, 5). What is its domain?',
  '{1, 2, 3}',
  ['{5, 7}', '{1, 2, 3, 5, 7}', '{5, 7, 5}'],
  'The domain holds the values that go in, which are 1, 2 and 3. The values 5 and 7 are what '
  'comes out, and belong to the range.')

q('GB_RF_007', 'RF_FAM02_DOMAIN_RANGE_NAMING', 'D1',
  'A machine turns 10 into a, 20 into b, and 30 into a. Which values come out of it?',
  '{a, b}',
  ['{10, 20, 30}', '{a, b, a}', '{10, a, 20, b, 30}'],
  'Only a and b ever emerge, and a emerging twice does not make it two different outputs. The '
  'numbers going in are a separate collection entirely.')

q('GB_RF_008', 'RF_FAM02_DOMAIN_RANGE_NAMING', 'D1',
  'In a mapping, what is the domain?',
  'The values that go in',
  ['The values that come out', 'The pairs themselves', 'The number of pairs'],
  'The domain is the collection of inputs. The outputs form the range, and confusing the two '
  'reverses every question asked about the mapping.')

q('GB_RF_009', 'RF_FAM02_DOMAIN_RANGE_NAMING', 'D2',
  'A mapping sends 1 to 4, 2 to 4 and 3 to 9. A student gives its range as {4, 4, 9}. What is '
  'wrong?',
  'The range is a collection of the values produced, so 4 is listed once, giving {4, 9}',
  ['Nothing; the range really is {4, 4, 9}',
   'The range should have been given as {1, 2, 3}',
   'The range should have been given as {1, 2, 3, 4, 9}'],
  'Two inputs producing 4 does not put 4 into the range twice, because a collection of this kind '
  'records what belongs to it rather than how often.')

# =========================================================================
# RF_FAM03_RELATION_VS_FUNCTION — D1 x3, D2 x1
# =========================================================================
q('GB_RF_010', 'RF_FAM03_RELATION_VS_FUNCTION', 'D1',
  'A relation contains the pairs (1, 5), (2, 5) and (3, 8). Is it a function?',
  'Yes; every input appears once, and two inputs sharing an output is allowed',
  ['No, because 5 comes out of two different inputs',
   'No, because there are three pairs but only two different outputs',
   'It cannot be decided from the pairs alone'],
  'Each of 1, 2 and 3 has exactly one output, which is the whole requirement. That 1 and 2 both '
  'produce 5 breaks nothing.')

q('GB_RF_011', 'RF_FAM03_RELATION_VS_FUNCTION', 'D1',
  'Each student is recorded with a tutor. Riya appears twice, once with tutor Das and once with '
  'tutor Mehta. Does this record define a mapping from students to tutors?',
  'No, because one student has been given two different tutors',
  ['Yes, because every student named has a tutor',
   'No, because two students are not allowed to share a tutor',
   'Yes, because the two entries for Riya can simply be merged'],
  'One input with two outputs is exactly what a mapping forbids. Merging the entries is not '
  'available, since Das and Mehta are different tutors and the record does not say which is '
  'right.')

q('GB_RF_012', 'RF_FAM03_RELATION_VS_FUNCTION', 'D1',
  'Which situation stops a mapping from being a function?',
  'One input having two different outputs',
  ['Two inputs having the same output',
   'An output that is never produced',
   'Having more inputs than outputs'],
  'The requirement is one output per input, so only a repeated input with disagreeing outputs '
  'breaks it. The other three are all perfectly ordinary.')

q('GB_RF_013', 'RF_FAM03_RELATION_VS_FUNCTION', 'D2',
  'A student rejects the pairs (1, 7), (2, 7) and (3, 9) as not being a function, because 7 '
  'appears twice. What is wrong with that reasoning?',
  'A shared output is allowed; only a repeated input with different outputs disqualifies a '
  'mapping',
  ['Nothing; an output appearing twice does disqualify it',
   'It fails for a different reason, namely that 9 appears only once',
   'A collection of three pairs can never be a function'],
  'The student has applied the rule to the wrong side of the pair. Reading it correctly, no '
  'input repeats at all, so nothing here is in question.')

# =========================================================================
# RF_FAM04_FUNCTION_EVALUATION — D2 x1, D3 x1
# =========================================================================
q('GB_RF_014', 'RF_FAM04_FUNCTION_EVALUATION', 'D2',
  'A rule doubles its input and then adds 3. What comes out when 5 goes in?',
  '13',
  ['16', '11', '8'],
  'Doubling 5 gives 10 and adding 3 gives 13. Adding first and then doubling gives 16, which is '
  'what happens when the two steps are taken in the other order.')

q('GB_RF_015', 'RF_FAM04_FUNCTION_EVALUATION', 'D3',
  'A rule subtracts 2 from its input and then multiplies the result by 4. What comes out when 6 '
  'goes in?',
  '16',
  ['22', '10', '24'],
  'Six less 2 is 4, and 4 multiplied by 4 is 16. Multiplying first and subtracting afterwards '
  'gives 22 instead.')

# =========================================================================
# RF_FAM05_TABLE_LOOKUP — D2 x1, D3 x1
# =========================================================================
q('GB_RF_016', 'RF_FAM05_TABLE_LOOKUP', 'D2',
  'A mapping is given as a table: 1 goes to red, 2 goes to blue, 3 goes to red. What does 3 go '
  'to?',
  'red',
  ['blue', '1', 'Both red and blue'],
  'The row for 3 gives red. That red also appears in the row for 1 changes nothing about what 3 '
  'produces.')

q('GB_RF_017', 'RF_FAM05_TABLE_LOOKUP', 'D3',
  'A price table lists small at 40, medium at 60 and large at 90. A customer asks the price of '
  'an extra-large. What does the table give?',
  'Nothing, because extra-large is outside what the table covers',
  ['90, since it is the largest size listed',
   '130, by continuing the pattern of the sizes',
   '40, since the first row acts as a default'],
  'A mapping says nothing about an input it does not contain. Extending the pattern or reaching '
  'for a default is a decision someone would have to make, not something the table already '
  'says.')

# =========================================================================
# RF_FAM06_ONE_TO_ONE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_RF_018', 'RF_FAM06_ONE_TO_ONE', 'D2',
  'A mapping sends 1 to a, 2 to b and 3 to c. Is it one-to-one?',
  'Yes, because no two inputs share an output',
  ['No, because it contains three separate pairs',
   'Yes, because every input has exactly one output',
   'It cannot be decided without being told the range'],
  'Being one-to-one means no output is reached twice, and here a, b and c are all different. '
  'Every input having one output is true of every mapping and settles nothing.')

q('GB_RF_019', 'RF_FAM06_ONE_TO_ONE', 'D3',
  'A mapping sends 1 to 4, 2 to 9 and 3 to 4. Is it one-to-one, and what decides it?',
  'No; 1 and 3 both produce 4',
  ['Yes; every input still has exactly one output',
   'No; 2 produces 9 and nothing else produces 9',
   'It cannot be decided from only three pairs'],
  'Two different inputs arriving at 4 is precisely the failure. The pair that produces 9 uniquely '
  'is the part that works, not the part that breaks.')

q('GB_RF_020', 'RF_FAM06_ONE_TO_ONE', 'D4',
  'A membership scheme records each member against their home branch. No member is recorded '
  'against more than one branch, and two members who live near each other are both recorded '
  'against the same branch. A shared branch means two inputs producing the same output, which is '
  'not what disqualifies a function but is what disqualifies a one-to-one mapping. Which is '
  'true?',
  'It is a function but not one-to-one',
  ['It is neither a function nor one-to-one',
   'It is one-to-one but not a function',
   'It is both a function and one-to-one'],
  'One output per member makes it a function; two members reaching one branch stops it being '
  'one-to-one. The two conditions are about opposite sides of the pair, which is why a mapping '
  'can satisfy one and fail the other.',
  evidence='A shared branch means two inputs producing the same output')

# =========================================================================
# RF_FAM07_RANGE_VS_TARGET — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_RF_021', 'RF_FAM07_RANGE_VS_TARGET', 'D2',
  'A rule squares each value in the collection {-2, -1, 0, 1, 2}. Which values does it actually '
  'produce?',
  '{0, 1, 4}',
  ['{-2, -1, 0, 1, 2}', '{0, 1, 2, 4}', '{1, 4}'],
  'Squaring gives 4, 1, 0, 1 and 4, so the values produced are {0, 1, 4}. The inputs themselves '
  'are a different collection, and 2 never comes out at all.')

q('GB_RF_022', 'RF_FAM07_RANGE_VS_TARGET', 'D3',
  'A rule squares its input and is permitted to produce any whole number at all. Which of these '
  'can it never produce?',
  'A negative number',
  ['Zero', 'A very large number', 'An odd number'],
  'Squaring never yields a negative number, whatever the rule is permitted to produce. Being '
  'allowed to produce a value and actually producing it are different things, and this is the '
  'gap between them.')

q('GB_RF_023', 'RF_FAM07_RANGE_VS_TARGET', 'D4',
  'A grading rule is permitted to output any whole number from 0 to 100, and it works by '
  'multiplying a whole-number mark out of 20 by five. Because the input is a whole number out of '
  '20, only multiples of five ever come out, though every value from 0 to 100 is permitted. '
  'Which values does the rule actually produce?',
  'Only the multiples of five from 0 to 100',
  ['Every whole number from 0 to 100',
   'Every whole number from 0 to 20',
   'Only the even numbers from 0 to 100'],
  'Twenty-one inputs give twenty-one outputs, so most of the permitted values never appear. A '
  'report that quoted the permitted values as the possible results would be describing something '
  'the rule cannot do.',
  evidence='only multiples of five ever come out, though every value from 0 to 100 is permitted')

# =========================================================================
# RF_FAM08_COMPOSITION_ORDER — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_RF_024', 'RF_FAM08_COMPOSITION_ORDER', 'D2',
  'One machine adds 1 to whatever it is given, and a second machine doubles whatever it is '
  'given. The value 3 is fed to the first and its result to the second. What comes out?',
  '8',
  ['7', '6', '9'],
  'Three becomes 4, and 4 doubled is 8. Feeding the machines in the other order gives 7, which '
  'is why the order has to be stated.')

q('GB_RF_025', 'RF_FAM08_COMPOSITION_ORDER', 'D3',
  'A checkout takes 10 rupees off a price and then a service charge doubles whatever remains. A '
  'price of 50 is processed. What is charged?',
  '80',
  ['90', '100', '30'],
  'Fifty less 10 is 40, and doubling gives 80. Doubling before the deduction would give 90, so '
  'the customer pays 10 more for the same two operations.')

q('GB_RF_026', 'RF_FAM08_COMPOSITION_ORDER', 'D4',
  'A checkout should deduct 10 rupees and then double what remains. On a price of 50 the '
  'intended charge is 80, and the system reports 90. The two orders differ because the deduction '
  'is not being carried through the doubling. Which order is the system using?',
  'Doubling first, then deducting',
  ['Deducting first, then doubling',
   'Both operations applied to the original price separately',
   'Only the doubling, with the deduction never applied'],
  'Doubling 50 gives 100, and deducting 10 leaves the 90 that was reported. Applying only the '
  'doubling would have given 100, which rules that reading out.',
  evidence='the deduction is not being carried through the doubling')

# =========================================================================
# RF_FAM09_INVERSE_EXISTENCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_RF_027', 'RF_FAM09_INVERSE_EXISTENCE', 'D2',
  'A mapping sends 1 to a, 2 to b and 3 to c. Can it be reversed so that each output leads back '
  'to exactly one input?',
  'Yes, because no output is shared',
  ['No, because a mapping can never be run backwards',
   'No, because there are three inputs to account for',
   'Only if the outputs happen to be numbers'],
  'Each of a, b and c is reached by exactly one input, so each has somewhere unambiguous to '
  'return to. Reversal is possible precisely when that is true.')

q('GB_RF_028', 'RF_FAM09_INVERSE_EXISTENCE', 'D3',
  'A reading scheme puts Asha on shelf x, Boro on shelf y and Chen on shelf x. Can the scheme be '
  'run backwards, so that naming a shelf identifies one reader?',
  'No, because shelf x would have to identify both Asha and Chen',
  ['Yes, by writing each assignment the other way round',
   'Yes, so long as the readers are taken in alphabetical order',
   'No, because shelf y has been given to only one reader'],
  'Writing the assignments backwards is easy; getting a single reader out of shelf x is not. '
  'That shelf y behaves perfectly does not rescue the scheme, since the property has to hold '
  'everywhere.')

q('GB_RF_029', 'RF_FAM09_INVERSE_EXISTENCE', 'D4',
  'A system records each order against the month it was placed. Many orders share a month. Given '
  'only a month, no single order can be recovered, which is exactly the condition that stops a '
  'mapping being reversible in this sense. Can the mapping from orders to months be reversed so '
  'that a month leads back to one order?',
  'No, because a month cannot lead back to one order',
  ['Yes, by listing every order placed in that month',
   'Yes, because every order has exactly one month',
   'No, because months are not numbers and cannot be reversed'],
  'Listing every order for a month is a useful thing to do and is not a reversal, since it '
  'returns many answers where one was required. The forward direction being well defined is what '
  'makes the failure easy to miss.',
  evidence='Given only a month, no single order can be recovered')

# =========================================================================
# RF_FAM10_LOOKUP_AS_FUNCTION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_RF_030', 'RF_FAM10_LOOKUP_AS_FUNCTION', 'D2',
  'A lookup structure stores one value against each key, and a key may appear only once. Read as '
  'a mapping, what plays the part of the inputs?',
  'The keys',
  ['The values', 'Both the keys and the values together', 'The number of entries stored'],
  'A key is what is supplied and a value is what comes back, so the keys are the inputs. '
  'Reversing the two turns every question about the structure inside out.')

q('GB_RF_031', 'RF_FAM10_LOOKUP_AS_FUNCTION', 'D3',
  'A lookup stores the value 7 against key A and the same value 7 against key B. Read as a '
  'mapping, is it a function?',
  'Yes, because each key still leads to exactly one value',
  ['No, because the value 7 is stored twice',
   'No, because two keys are not permitted to share a value',
   'Only once the two keys have been merged into one'],
  'The requirement constrains keys, not values. Two keys arriving at the same value is the same '
  'situation as two inputs sharing an output, which has never been forbidden.')

q('GB_RF_032', 'RF_FAM10_LOOKUP_AS_FUNCTION', 'D4',
  'A store allows the same key to be written twice with different values, and a read returns '
  'whichever was written most recently. The same key can therefore produce two different values '
  'depending on when it is read, which is precisely what a mapping may not do. Read as a '
  'mapping, what is it?',
  'Not a function, because one input can give different outputs',
  ['A function, because a read always returns exactly one value',
   'A function, because the most recent write settles the matter',
   'Not a function, because two keys are able to share a value'],
  'A single read returning one value is not the same as the key having one value. Time is the '
  'second input here, and once it is admitted the structure stops being a mapping from keys '
  'alone.',
  evidence='The same key can therefore produce two different values depending on when it is read')

# =========================================================================
# RF_FAM11_DISQUALIFYING_PAIR — D3 x1, D4 x1
# =========================================================================
q('GB_RF_033', 'RF_FAM11_DISQUALIFYING_PAIR', 'D3',
  'A relation contains (1, 2), (2, 3), (3, 4), (2, 5) and (4, 3). Which pair stops it being a '
  'function?',
  '(2, 5), because 2 already appears with 3',
  ['(4, 3), because 3 appears as an output twice',
   '(3, 4), because it is the reverse of (4, 3)',
   '(1, 2), because 2 appears as both an input and an output'],
  'The input 2 leads to 3 in one pair and to 5 in another, which is the only conflict present. '
  'The other three pairs are unusual to look at and break nothing.')

q('GB_RF_034', 'RF_FAM11_DISQUALIFYING_PAIR', 'D4',
  'A register of 4,000 entries maps staff numbers to departments and turns out not to be a '
  'function. Exactly one staff number appears twice, once against Sales and once against '
  'Support; every other staff number appears once. One repeated input with two different '
  'departments is enough to disqualify the whole register however large it is. What needs '
  'fixing?',
  'The single staff number recorded against two departments',
  ['Every entry, since the register as a whole is now unreliable',
   'The department names, which need to be made unique',
   'Nothing; a register of this size is expected to contain repeats'],
  'Three thousand nine hundred and ninety-nine entries are correct. The property is all-or-'
  'nothing, which makes the register fail entirely and the repair very small.',
  evidence='One repeated input with two different departments is enough to disqualify the whole '
           'register')

# =========================================================================
# RF_FAM12_COMPOSITION_ERROR_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_RF_035', 'RF_FAM12_COMPOSITION_ERROR_DIAGNOSIS', 'D3',
  'Two steps should run in order: take away 5, then multiply by 3. For an input of 20 the '
  'expected result is 45, and the system reports 55. What explains it?',
  'The two steps ran in the other order',
  ['The multiplication used 4 rather than 3',
   'The input was 25 rather than 20',
   'The subtraction was applied twice over'],
  'Multiplying 20 by 3 gives 60, and taking away 5 leaves the 55 that was reported. No single '
  'wrong value produces that figure with the steps in the right order.')

q('GB_RF_036', 'RF_FAM12_COMPOSITION_ERROR_DIAGNOSIS', 'D4',
  'A pipeline should trim the spaces from a name and then take its first three characters. Given '
  'two spaces followed by Ravi, the expected result is Rav, but the system returns three '
  'characters beginning with two spaces. A result beginning with spaces shows the trimming had '
  'not happened when the characters were taken. What is wrong?',
  'The two steps are running in the wrong order',
  ['The trimming step is removing the wrong characters',
   'The system is taking four characters rather than three',
   'The input contains characters other than the ones described'],
  'Taking the first three characters first yields two spaces and an R, which is exactly what was '
  'observed. Trimming afterwards cannot put back what has already been discarded.',
  evidence='A result beginning with spaces shows the trimming had not happened')

# =========================================================================
# RF_FAM13_RELATION_PROPERTY_TEST — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_RF_037', 'RF_FAM13_RELATION_PROPERTY_TEST', 'D3',
  'On the collection {1, 2, 3}, a relation contains (1,1), (2,2) and (3,3) and nothing else. Is '
  'it reflexive?',
  'Yes, because every member is related to itself',
  ['No, because no member is related to any other member',
   'Yes, but only for the member 1',
   'It cannot be decided without seeing more pairs'],
  'Reflexivity asks only that each member relate to itself, and all three do. Whether anything '
  'else is present is a separate question about other properties.')

q('GB_RF_038', 'RF_FAM13_RELATION_PROPERTY_TEST', 'D4',
  'On the collection {1, 2, 3}, a relation contains (1,2), (2,1) and (1,3). Symmetry requires '
  'that whenever a pair is present its reverse is present too, and (3,1) is missing while (1,3) '
  'is there. Is the relation symmetric?',
  'No, because (1,3) is present without (3,1)',
  ['Yes, because (1,2) and (2,1) are both present',
   'Yes, because most of the pairs do have their reverse',
   'No, because the pair (2,2) is missing'],
  'One pair without its reverse settles it, whatever the others do. A missing self-pair would '
  'bear on reflexivity and says nothing about symmetry.',
  evidence='Symmetry requires that whenever a pair is present its reverse is present too')

q('GB_RF_039', 'RF_FAM13_RELATION_PROPERTY_TEST', 'D5',
  'On a collection of three members, a relation contains no pairs whatever. Symmetry and '
  'transitivity are demands made of pairs that are present, and there are none to violate, while '
  'reflexivity demands a pair for each of the three members. Which properties does this relation '
  'have?',
  'Symmetric and transitive, but not reflexive',
  ['None of the three', 'All three of them', 'Reflexive only'],
  'Two of the properties are satisfied because nothing can break them, and the third is not '
  'because it demands something be present. The empty case separates properties that forbid from '
  'properties that require.',
  mode='EDGE',
  hinge='there are none to violate, while reflexivity demands a pair for each of the three '
        'members')

q('GB_RF_040', 'RF_FAM13_RELATION_PROPERTY_TEST', 'D5',
  'A team models has worked on the same project as, over its staff. Everyone counts as having '
  'worked with themselves, and if A shares a project with B then B shares one with A. A shares a '
  'project with B, and B shares a different project with C, and A and C have never shared one. '
  'Which property fails?',
  'Transitivity',
  ['Reflexivity', 'Symmetry', 'None of them fails'],
  'The first two conditions are stated to hold. The third describes a chain that does not carry '
  'through, and being carried through a chain is exactly what transitivity demands.',
  mode='TRANSFER',
  hinge='B shares a different project with C, and A and C have never shared one')

q('GB_RF_041', 'RF_FAM13_RELATION_PROPERTY_TEST', 'D5',
  'A relation on four members is symmetric and transitive, and every member appears in at least '
  'one pair. A student concludes that it must therefore be reflexive. Every member appearing in '
  'some pair means each has a partner, and symmetry followed by transitivity then forces each '
  'member to be related to itself. Is the conclusion correct?',
  'Yes, and it follows from every member appearing in at least one pair',
  ['No; symmetry and transitivity together never yield reflexivity',
   'No, unless the relation also relates every member to every other',
   'Yes, but only for members appearing in two or more pairs'],
  'If A relates to B then symmetry gives B to A, and transitivity then gives A to A. The extra '
  'condition is what makes the argument work, and without it the empty relation is the '
  'counterexample.',
  mode='EDGE',
  hinge='each has a partner, and symmetry followed by transitivity then forces each member to be '
        'related to itself')

# =========================================================================
# RF_FAM14_MAPPING_DESIGN_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_RF_042', 'RF_FAM14_MAPPING_DESIGN_CHOICE', 'D4',
  'A booking reference must let staff recover exactly one booking. Two schemes are proposed: a '
  'reference built from the customer name, and a reference generated so that no two bookings '
  'share one. Names repeat across customers, so a name-based reference would not lead back to a '
  'single booking. Which scheme meets the requirement?',
  'The generated reference, because it belongs to one booking only',
  ['The name-based reference, because customers find it easier to remember',
   'Either scheme, since both identify a booking somehow',
   'The name-based reference, as long as the booking date is added to it'],
  'The requirement is recovery of exactly one booking, which the name scheme cannot promise. '
  'Adding a date narrows it without settling it, since one customer may book twice in a day.',
  evidence='Names repeat across customers, so a name-based reference would not lead back to a '
           'single booking')

q('GB_RF_043', 'RF_FAM14_MAPPING_DESIGN_CHOICE', 'D5',
  'A column may be made unique or left free to repeat. Making it unique guarantees that each '
  'value identifies one row, but every insert must then be checked against every existing value, '
  'and the table takes millions of inserts a day. The stated requirement is only that reports be '
  'grouped by this column. Which choice is right?',
  'Leave it free to repeat, since grouping needs no uniqueness and the check would be paid on '
  'every insert',
  ['Make it unique, because unique values are always preferable',
   'Make it unique, because grouping requires the values to be distinct',
   'Leave it free to repeat, because uniqueness cannot be enforced at that volume'],
  'Grouping gathers rows that share a value, so repetition is the point rather than a problem. '
  'Uniqueness can be enforced at that volume; it simply buys nothing here and is charged for '
  'continuously.',
  mode='TRADEOFF',
  hinge='every insert must then be checked against every existing value, and the table takes '
        'millions of inserts a day')

q('GB_RF_044', 'RF_FAM14_MAPPING_DESIGN_CHOICE', 'D5',
  'A feature maps each phrase in one language to a phrase in another, and users must be able to '
  'translate in both directions from the same stored data. Two different source phrases sometimes '
  'translate to the same target phrase, which means the target does not lead back to a single '
  'source. What follows for the design?',
  'The stored data cannot serve both directions as it stands, and the reverse direction needs '
  'data of its own',
  ['Nothing; any stored mapping can be read in both directions',
   'The duplicate target phrases should be deleted from the data',
   'Only phrases that translate uniquely should be stored at all'],
  'Reading the pairs backwards produces several candidates for some targets, which is not a '
  'translation. Deleting the duplicates would remove correct translations to preserve a property '
  'the data was never required to have.',
  mode='TRANSFER', hinge='the target does not lead back to a single source')

q('GB_RF_045', 'RF_FAM14_MAPPING_DESIGN_CHOICE', 'D5',
  'A mapping from user to email address is required to be reversible, so that an address '
  'identifies one user. The team finds that two users currently share one household address '
  'entry. Two users sharing one address means that address leads back to two users, which is '
  'what reversibility forbids. What must change?',
  'Either the address must be made unique per user, or reversibility must be dropped as a '
  'requirement',
  ['Nothing; a shared address is still a perfectly valid mapping',
   'The two users should be merged into a single account',
   'The mapping should be stored in the reverse direction only'],
  'The data and the requirement contradict each other, so one of them has to give. Merging the '
  'users destroys real information to satisfy a constraint that may not have been worth having.',
  mode='EDGE', hinge='Two users sharing one address means that address leads back to two users')

q('GB_RF_046', 'RF_FAM14_MAPPING_DESIGN_CHOICE', 'D5',
  'An identifier may be a short sequential number or a long random value. The sequential number '
  'is easy to read aloud and reveals roughly how many records exist; the random value reveals '
  'nothing and is awkward in support calls. The records are complaints, and the organisation '
  'treats their volume as confidential. Which fits?',
  'The random value, because the sequential one would disclose a volume the organisation treats '
  'as confidential',
  ['The sequential number, because support calls are the more frequent activity',
   'The sequential number, because a shorter identifier is always preferable',
   'Either, since both identify exactly one record'],
  'Both identify one record, so identification cannot decide it. What decides it is that one of '
  'them leaks a fact the organisation has chosen to protect, and awkwardness in support calls is '
  'the price of that.',
  mode='TRADEOFF', hinge='reveals roughly how many records exist')

# =========================================================================
# RF_FAM15_MAPPING_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_RF_047', 'RF_FAM15_MAPPING_TRANSFER', 'D4',
  'A cloakroom gives each coat a numbered ticket, and no number is used twice on the same day. '
  'At the end of the day a ticket is found on the floor. Because no number is used twice, the '
  'ticket number picks out exactly one coat. What can be recovered from the ticket alone?',
  'Exactly which coat it belongs to',
  ['Nothing, since the ticket does not record the owner',
   'Only the rough time at which the coat was left',
   'Every coat that was left that day'],
  'Uniqueness within the day is what makes the recovery possible. The ticket names no owner and '
  'does not need to, because it leads to one coat and the coat does the rest.',
  evidence='Because no number is used twice, the ticket number picks out exactly one coat')

q('GB_RF_048', 'RF_FAM15_MAPPING_TRANSFER', 'D5',
  'A school assigns every pupil a locker, and some lockers are shared by two pupils. Given a '
  'pupil the locker is determined; given a locker, there may be two pupils. A caretaker finds a '
  'book in a locker and wants to know whose it is. What can be concluded?',
  'The owner is one of the pupils assigned to that locker, and which one is not determined',
  ['The owner is determined exactly by the locker',
   'Nothing whatever can be concluded from the locker',
   'Any pupil in the school could be the owner'],
  'The backward direction narrows the answer to two without settling it, which is more than '
  'nothing and less than an answer. That is the characteristic result of running a shared '
  'assignment in reverse.',
  mode='TRANSFER', hinge='given a locker, there may be two pupils')

q('GB_RF_049', 'RF_FAM15_MAPPING_TRANSFER', 'D5',
  'Each employee has exactly one payroll number and each payroll number belongs to exactly one '
  'employee. An employee leaves, a new one joins, and the leaver payroll number is given to the '
  'newcomer. Reusing it means one number now corresponds to two people across time, though never '
  'to two at once. What has been lost?',
  'The ability to recover one person from a number once past records are included',
  ['Nothing, because only one person holds the number at any given moment',
   'The ability to give every employee a number of their own',
   'The ability to tell one current employee from another'],
  'Nothing about today has changed, which is why reuse looks free. What breaks is every question '
  'asked across time, and payroll records are almost entirely questions across time.',
  mode='EDGE',
  hinge='one number now corresponds to two people across time, though never to two at once')

q('GB_RF_050', 'RF_FAM15_MAPPING_TRANSFER', 'D5',
  'A system can identify a photograph by the filename the user chose or by a value it generates '
  'itself. Users choose the same filename often, so filenames do not pick out one photograph, '
  'while generated values mean nothing to a user browsing their library. The system must both '
  'show a name the user recognises and retrieve exactly one photograph. What should it do?',
  'Store both: generate a value for retrieval and keep the chosen filename for display',
  ['Use the filename only, since the user has to recognise it',
   'Use the generated value only, since retrieval is the harder of the two problems',
   'Refuse duplicate filenames, so that the filename can serve both purposes'],
  'The two requirements pull on different properties, and no single identifier has both. '
  'Refusing duplicates would work and imposes a restriction on users to save the system from '
  'storing a second value.',
  mode='TRADEOFF',
  hinge='filenames do not pick out one photograph, while generated values mean nothing to a user')
