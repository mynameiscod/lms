# -*- coding: utf-8 -*-
"""
Wave 5 — SET_THEORY, 50 Golden Bank questions, all newly authored.

EVERYDAY "AND" IS THE PRODUCTIVE TRAP AND IS USED DELIBERATELY. "Students taking maths and
physics" names an intersection, while the word "and" pulls a student towards a union; several
families here are built on that collision because it is the error that survives into working
queries. The naming family uses it three times over, and the diagnosis families show it after it
has already shipped.

THE COUNTING FAMILIES ARE ABOUT METHOD, NEVER ARITHMETIC. Every number is small enough to hold in
the head, and the wrong answers are wrong methods rather than wrong sums — the plain total that
double counts, the overlap subtracted twice, the two exclusive parts added without the middle.

"IT CANNOT BE DETERMINED" IS SOMETIMES THE KEY AND SOMETIMES A WRONG ANSWER. A family that only
ever rewards caution teaches a reflex rather than a judgement, so the underdetermined family
contains stems that genuinely are settled and stems that genuinely are not.

NO STEM IN THE LAST FAMILY USES THE WORDS UNION, INTERSECTION OR SET. Recognising that a
situation has this structure at all is the thing being measured there; naming the operation in
the question would hand it over.
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
# ST_FAM01_SET_IDENTITY — D1 x4, D2 x1
# =========================================================================
q('GB_ST_001', 'ST_FAM01_SET_IDENTITY', 'D1',
  'Which of the following denotes the same collection as {3, 5, 7}?',
  '{7, 5, 3}',
  ['{3, 5}', '{3, 5, 7, 9}', '{3, 7}'],
  'A collection of this kind is fixed by which things belong to it, so writing the same three '
  'things in another order denotes {7, 5, 3} and nothing different. The other options each add '
  'or drop a member.')

q('GB_ST_002', 'ST_FAM01_SET_IDENTITY', 'D1',
  'A collection is written as {2, 4, 4, 6}. How many members does it have?',
  '3',
  ['4', '2', '6'],
  'Writing 4 twice does not put it in twice, so the members are 2, 4 and 6, giving 3 members in '
  'all. Counting the written symbols rather than the members gives 4.')

q('GB_ST_003', 'ST_FAM01_SET_IDENTITY', 'D1',
  'Do {a, b} and {b, a} denote the same thing?',
  'Yes, because membership is what fixes it and the order of writing does not',
  ['No, because the two elements appear in a different order',
   'No, because a and b occupy different positions',
   'Only if a happens to come before b alphabetically'],
  'Both contain a and b and nothing else, so they are the same. Position carries meaning in a '
  'list and carries none here, which is the difference between the two ideas.')

q('GB_ST_004', 'ST_FAM01_SET_IDENTITY', 'D1',
  'Which statement is true?',
  'Writing a member twice does not put it in twice',
  ['Reordering the members produces a different collection',
   'The members must be listed in increasing order',
   'A collection with three members written twice has six members'],
  'Repetition and order are both invisible here. That is precisely what distinguishes this kind '
  'of collection from a list, where both matter.')

q('GB_ST_005', 'ST_FAM01_SET_IDENTITY', 'D2',
  'A student is told that two sets are equal and concludes that they must have been written down '
  'identically. What is wrong with that conclusion?',
  'Two sets are equal when they have the same members, however they happen to be written',
  ['Nothing; equal sets are always written identically',
   'Sets are equal only when their members appear in the same order',
   'Sets can never be equal unless they are literally the same collection'],
  'Equality is decided by membership alone. {1, 2, 2, 3} and {3, 2, 1} look nothing alike on the '
  'page and are the same set.')

# =========================================================================
# ST_FAM02_OPERATION_NAMING — D1 x3, D2 x1
# =========================================================================
q('GB_ST_006', 'ST_FAM02_OPERATION_NAMING', 'D1',
  'A club needs the people who belong to both the chess group and the debate group. Which '
  'operation gives them?',
  'Intersection',
  ['Union', 'Difference', 'Complement'],
  'Membership of both groups at once is exactly what an intersection selects. A union would '
  'return anyone in either group, which is a much larger set.')

q('GB_ST_007', 'ST_FAM02_OPERATION_NAMING', 'D1',
  'A mailing list must reach everyone who signed up for at least one of the two newsletters, '
  'including those who signed up for both. Which operation gives that list?',
  'Union',
  ['Intersection', 'Difference', 'Complement'],
  'At least one, with those on both included once, is a union. Those on both are not counted '
  'twice, because a member appears once however many ways it qualifies.')

q('GB_ST_008', 'ST_FAM02_OPERATION_NAMING', 'D1',
  'A report needs the customers who bought last year but not this year. Which operation gives '
  'them?',
  'Difference',
  ['Union', 'Intersection', 'Complement'],
  'Taking one group and removing the members of another is a difference. The direction matters: '
  'the customers who bought this year but not last year are a different group entirely.')

q('GB_ST_009', 'ST_FAM02_OPERATION_NAMING', 'D2',
  'A manager asks for the students taking maths and physics, and is handed everyone taking at '
  'least one of the two subjects. What went wrong?',
  'The everyday word and was read as a union, but the request names students in both groups, '
  'which is an intersection',
  ['Nothing; in this context and does mean union',
   'The request was for a difference and was answered with a union',
   'The request is ambiguous, so either answer is defensible'],
  'Ordinary speech uses and to join the two subject names, not the two groups of students. The '
  'group being described is the one where both statements are true of the same student.')

# =========================================================================
# ST_FAM03_MEMBER_VS_SUBSET — D1 x3, D2 x1
# =========================================================================
q('GB_ST_010', 'ST_FAM03_MEMBER_VS_SUBSET', 'D1',
  'Let S be the collection {1, 2, 3}. Which one of the following belongs to S as a member?',
  '2',
  ['{2}', '{1, 2}', '{}'],
  'The members of S are the numbers 1, 2 and 3. The option {2} is a collection containing 2, '
  'which is a different thing from the number 2 itself.')

q('GB_ST_011', 'ST_FAM03_MEMBER_VS_SUBSET', 'D1',
  'Take the collection {1, 2, 3}. Which of the following is contained in it as a subset?',
  '{1, 2}',
  ['1', '4', '{1, 4}'],
  'Every member of {1, 2} is also in {1, 2, 3}, which is what containment requires. The bare '
  'number 1 is a member rather than a subset, and 4 is neither.')

q('GB_ST_012', 'ST_FAM03_MEMBER_VS_SUBSET', 'D1',
  'Is the empty collection contained in {5, 6}?',
  'Yes, the empty collection is contained in every collection',
  ['No, because it shares no members with {5, 6}',
   'No, because it is not written between the braces of {5, 6}',
   'Only when the other collection is also empty'],
  'Containment asks whether every member of the first is also in the second. The empty '
  'collection has no member that could fail the test, so it passes for every collection there '
  'is.')

q('GB_ST_013', 'ST_FAM03_MEMBER_VS_SUBSET', 'D2',
  'Let T = {1, {2, 3}}, so that T has exactly two members. Is {2, 3} a member of T, a subset of '
  'T, or both?',
  'A member, because it is one of the two things listed inside T',
  ['A subset, because 2 and 3 can be found inside T',
   'Both a member and a subset of T',
   'Neither a member nor a subset of T'],
  'T contains two things: the number 1, and the collection {2, 3}. For {2, 3} to be a subset, '
  'the numbers 2 and 3 would have to be members of T in their own right, and they are not.')

# =========================================================================
# ST_FAM04_OPERATION_RESULT — D2 x1, D3 x1
# =========================================================================
q('GB_ST_014', 'ST_FAM04_OPERATION_RESULT', 'D2',
  'A = {1, 2, 3} and B = {3, 4}. What is the union of A and B?',
  '{1, 2, 3, 4}',
  ['{3}', '{1, 2, 4}', '{1, 2, 3, 3, 4}'],
  'Everything in either collection appears, and the 3 that is in both appears once. Listing it '
  'twice would not be wrong so much as meaningless, since repetition changes nothing.')

q('GB_ST_015', 'ST_FAM04_OPERATION_RESULT', 'D3',
  'A = {2, 4, 6, 8} and B = {4, 8, 12}. What is the intersection of A and B?',
  '{4, 8}',
  ['{2, 4, 6, 8, 12}', '{2, 6, 12}', '{4, 8, 12}'],
  'Only 4 and 8 appear in both. The value 12 is in B alone, which is why including it turns the '
  'answer into something closer to B itself.')

# =========================================================================
# ST_FAM05_DIFFERENCE_DIRECTION — D2 x1, D3 x1
# =========================================================================
q('GB_ST_016', 'ST_FAM05_DIFFERENCE_DIRECTION', 'D2',
  'P = {5, 6, 7, 8} and Q = {7, 8, 9}. Which members are left when everything in Q is taken out '
  'of P?',
  '{5, 6}',
  ['{9}', '{5, 6, 9}', '{7, 8}'],
  'Taking 7 and 8 out of P leaves {5, 6}. The value 9 was never in P at all, so no removal can '
  'put it there; that answer is what comes of taking P out of Q instead.')

q('GB_ST_017', 'ST_FAM05_DIFFERENCE_DIRECTION', 'D3',
  'A = {a, b, c} and B = {b, c, d, e}. Which of these is B with the members of A removed?',
  '{d, e}',
  ['{a}', '{a, d, e}', '{b, c}'],
  'Taking b and c out of B leaves {d, e}. Doing it the other way round leaves {a} instead, and '
  'the two answers have no member in common, which is what makes the direction worth stating.')

# =========================================================================
# ST_FAM06_COMPLEMENT_AND_UNIVERSE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ST_018', 'ST_FAM06_COMPLEMENT_AND_UNIVERSE', 'D2',
  'Everything under discussion is {1, 2, 3, 4, 5}, and A = {2, 4}. What is the complement of A?',
  '{1, 3, 5}',
  ['{2, 4}', '{1, 2, 3, 4, 5}', '{}'],
  'The complement holds everything under discussion that is not in A, which here is 1, 3 and 5. '
  'It never includes members of A itself.')

q('GB_ST_019', 'ST_FAM06_COMPLEMENT_AND_UNIVERSE', 'D3',
  'A = {2, 4}. In one question everything under discussion is {1, 2, 3, 4, 5}; in another it is '
  'the whole numbers from 1 to 10. What does that change?',
  'The complement of A, which is different in the two cases because a complement is taken '
  'against whatever is under discussion',
  ['Nothing, since the complement of A is fixed by A alone',
   'The collection A itself, which grows in the second case',
   'Only the number of members of A'],
  'A is the same both times and its complement is not: three members in the first case and eight '
  'in the second. A complement is a statement about what surrounds a collection as much as about '
  'the collection.')

q('GB_ST_020', 'ST_FAM06_COMPLEMENT_AND_UNIVERSE', 'D4',
  'A report asks for all products not currently in stock. One team answers it against the '
  'products this warehouse carries and another against the full catalogue, and the two reports '
  'disagree. Every product in the catalogue that this warehouse never carries falls into one '
  'answer and not the other. Why do they disagree?',
  'Because a complement is defined only against what is taken to be under discussion, and the '
  'two teams took different things',
  ['Because one of the two teams has made a counting error',
   'Because not currently in stock is not a well-defined condition',
   'Because a complement is never unique, whatever is under discussion'],
  'Both teams computed correctly. The request did not say which range of products it was about, '
  'and that omission is the whole of the disagreement.',
  evidence='Every product in the catalogue that this warehouse never carries falls into one '
           'answer and not the other')

# =========================================================================
# ST_FAM07_REGION_SELECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ST_021', 'ST_FAM07_REGION_SELECT', 'D2',
  'Two groups A and B may overlap. Which expression denotes the things that are in A and not '
  'also in B?',
  'A with the members of B removed',
  ['A together with B',
   'The things in both A and B',
   'B with the members of A removed'],
  'Removing from A everything that B also contains leaves exactly the part of A that B does not '
  'reach. Doing it the other way round describes the opposite region.')

q('GB_ST_022', 'ST_FAM07_REGION_SELECT', 'D3',
  'A newsletter system has three overlapping mailing lists: news, offers and events. Which '
  'description picks out the subscribers who receive news only, appearing on neither of the '
  'other two lists?',
  'The news list, with everyone on offers and everyone on events taken out',
  ['The news list, with everyone on offers taken out',
   'The news list, with the people on both offers and events taken out',
   'The subscribers who appear on all three lists'],
  'Receiving news only means failing to appear on offers and failing to appear on events, so '
  'both have to come out. Taking out offers alone leaves the subscribers that events still '
  'overlaps.')

q('GB_ST_023', 'ST_FAM07_REGION_SELECT', 'D4',
  'A query is meant to return people in group A who are in neither B nor C. It is written as A '
  'with the members of B removed. Anyone who is in both A and C but not in B is returned by this '
  'query, and should not be. What is wrong with it?',
  'It removes only B, so members of A who are in C are still returned',
  ['It removes too much, since it also excludes people who are in A alone',
   'It should have removed the people who are in both B and C',
   'Nothing; removing B already excludes anyone in C'],
  'The query does half the job. Removing those in both B and C would be weaker still, since it '
  'would keep anyone in C alone as well as anyone in B alone.',
  evidence='Anyone who is in both A and C but not in B is returned by this query')

# =========================================================================
# ST_FAM08_UNION_CARDINALITY — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ST_024', 'ST_FAM08_UNION_CARDINALITY', 'D2',
  'Twelve students study maths and nine study physics. Four study both. How many study at least '
  'one of the two?',
  '17',
  ['21', '13', '25'],
  'Twelve plus nine is twenty-one, but the four who study both have been counted in each figure, '
  'so one copy of them comes off: seventeen. Leaving them in gives twenty-one.')

q('GB_ST_025', 'ST_FAM08_UNION_CARDINALITY', 'D3',
  'In a club, twenty play cricket, fifteen play football and six play both. How many play at '
  'least one of the two sports?',
  '29',
  ['35', '23', '41'],
  'Twenty plus fifteen is thirty-five, and the six counted twice come off once, leaving '
  'twenty-nine. Subtracting the six twice would give twenty-three, which removes them from the '
  'answer altogether.')

q('GB_ST_026', 'ST_FAM08_UNION_CARDINALITY', 'D4',
  'A survey reports forty people who use the app, thirty who use the website, ten who use both, '
  'and sixty who use at least one. Adding forty and thirty gives seventy, which is ten more than '
  'the stated total, and ten is exactly the number reported as using both. Are the figures '
  'consistent?',
  'Yes, because the ten who use both are counted in each of the first two figures and come off '
  'once',
  ['No, because forty plus thirty is seventy rather than sixty',
   'No, because the overlap should have been added rather than subtracted',
   'It cannot be decided without knowing how many people were surveyed'],
  'The excess is exactly the overlap, which is what consistency looks like here. The total '
  'number surveyed is irrelevant, since nobody outside the two groups affects either figure.',
  evidence='Adding forty and thirty gives seventy, which is ten more than the stated total')

# =========================================================================
# ST_FAM09_OVERLAP_UNDERDETERMINED — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ST_027', 'ST_FAM09_OVERLAP_UNDERDETERMINED', 'D2',
  'Eighteen people own a bicycle and twelve own a car. Nothing is said about how many own both. '
  'How many own at least one of the two?',
  'It cannot be determined from what has been given',
  ['Thirty', 'Eighteen', 'Six'],
  'The answer is thirty only if nobody owns both, and eighteen only if every car owner also owns '
  'a bicycle. Both are possible, and nothing given rules either out.')

q('GB_ST_028', 'ST_FAM09_OVERLAP_UNDERDETERMINED', 'D3',
  'Collection A has ten members and collection B has six. What is the largest the overlap '
  'between them could be?',
  '6',
  ['10', '16', '0'],
  'The overlap is part of both, so it can be no bigger than the smaller of the two. Six is '
  'reached when every member of B is also in A.')

q('GB_ST_029', 'ST_FAM09_OVERLAP_UNDERDETERMINED', 'D4',
  'A team is told that twenty-five customers bought product X and twenty-five bought product Y, '
  'and is asked how many bought at least one. Nothing is said about customers who bought both, '
  'and the overlap could be anything from zero to twenty-five. What is the honest answer?',
  'Somewhere between twenty-five and fifty, and it cannot be pinned down without the overlap',
  ['Exactly fifty', 'Exactly twenty-five',
   'Nothing at all can be said about the number'],
  'The two extremes of the overlap give the two ends of the range, so the question is not '
  'unanswerable — it is answerable only as a range, which is a different and more useful thing '
  'to report.',
  evidence='the overlap could be anything from zero to twenty-five')

# =========================================================================
# ST_FAM10_FILTER_AS_SET_OPERATION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_ST_030', 'ST_FAM10_FILTER_AS_SET_OPERATION', 'D2',
  'A list is filtered to show rows that are marked urgent and also assigned to Priya. Which rows '
  'appear?',
  'Only rows that satisfy both conditions at once',
  ['Rows that satisfy either condition',
   'Rows that satisfy neither condition',
   'Every row, since two filters applied together cancel out'],
  'Requiring both conditions of the same row selects the overlap between the two groups of rows, '
  'which is never larger than either group on its own.')

q('GB_ST_031', 'ST_FAM10_FILTER_AS_SET_OPERATION', 'D3',
  'A report should list orders that are overdue or flagged, including those that are both. A '
  'colleague instead applies the two filters one after the other, so only rows surviving both '
  'remain. What has changed?',
  'The report now shows only orders that are overdue and flagged, which is far fewer than '
  'intended',
  ['Nothing; applying the filters in turn gives the same rows',
   'The report now shows every order in the system',
   'The report now shows the orders that are neither overdue nor flagged'],
  'Applying filters in sequence keeps only what survives all of them, which is an overlap. The '
  'requirement asked for everything in either group, which is strictly larger.')

q('GB_ST_032', 'ST_FAM10_FILTER_AS_SET_OPERATION', 'D4',
  'A filter should exclude cancelled orders from the orders placed this month. It is written so '
  'that the negation applies only to the first of the two conditions rather than to the pair. '
  'Orders placed in an earlier month that were not cancelled are now appearing. What is the '
  'fault?',
  'The negation covers only one condition, so the restriction to this month is no longer being '
  'applied',
  ['The two conditions have been joined the wrong way round',
   'Cancelled orders are still being included in the results',
   'Nothing is wrong; the filter behaves exactly as written'],
  'Where the negation stops is the whole of the fault. Orders from other months slipping in is '
  'the visible symptom, and it points at the month condition rather than at the cancellation '
  'condition.',
  evidence='the negation applies only to the first of the two conditions rather than to the pair')

# =========================================================================
# ST_FAM11_DOUBLE_COUNT_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_ST_033', 'ST_FAM11_DOUBLE_COUNT_DIAGNOSIS', 'D3',
  'A club has thirty members. A report states that twenty-two play chess, fifteen play bridge, '
  'and every member plays at least one of the two. What does that tell you?',
  'At least seven members play both, since the two figures together exceed the membership',
  ['The figures must be wrong, since they add to more than thirty',
   'No member plays both games',
   'Thirty-seven people are involved in the club altogether'],
  'Twenty-two plus fifteen is thirty-seven, which is seven more than the thirty members '
  'available. Those seven are not extra people; they are people counted in both figures.')

q('GB_ST_034', 'ST_FAM11_DOUBLE_COUNT_DIAGNOSIS', 'D4',
  'An attendance total is reported as forty-eight for an event that only forty people attended. '
  'Everyone was recorded once for each session they joined, and eight people joined two '
  'sessions. The excess of eight is exactly the number of people recorded twice. What explains '
  'the figure?',
  'Attendances were counted rather than people, so those who joined two sessions contributed two '
  'each',
  ['Eight people who never attended were recorded in error',
   'The stated attendance of forty must itself be wrong',
   'The event exceeded its capacity by eight places'],
  'Nothing is wrong with either number once it is clear what each counts. The two figures answer '
  'different questions, and only one of them is the number of people.',
  evidence='The excess of eight is exactly the number of people recorded twice')

# =========================================================================
# ST_FAM12_OPERATION_MISCHOICE_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_ST_035', 'ST_FAM12_OPERATION_MISCHOICE_DIAGNOSIS', 'D3',
  'A requirement asks for staff who have completed training A and have not completed training B. '
  'A query returns everyone who has completed training A, ignoring B entirely. What is missing?',
  'The removal of those who have completed B',
  ['The addition of those who have completed B',
   'The overlap between those who completed A and those who completed B',
   'The complement of the staff who completed A'],
  'The query answers only the first half of the requirement. Adding B or returning the overlap '
  'would move the result further from what was asked, not closer.')

q('GB_ST_036', 'ST_FAM12_OPERATION_MISCHOICE_DIAGNOSIS', 'D4',
  'A requirement asks for accounts that are active and verified. The query returns accounts that '
  'are active or verified. On the sample data every verified account happened to be active as '
  'well, so the two queries returned the same rows and nobody noticed. What is wrong?',
  'The wrong operation was used, and it will include active but unverified accounts as soon as '
  'one exists',
  ['Nothing is wrong; the two queries returned the same rows',
   'The requirement should have asked for either condition rather than both',
   'The sample data is invalid and should be replaced'],
  'Agreement on one sample is not equivalence. The sample happened to contain no account that '
  'distinguishes the two queries, which is why the fault reached production intact.',
  evidence='every verified account happened to be active as well, so the two queries returned '
           'the same rows')

# =========================================================================
# ST_FAM13_UNIVERSAL_CLAIM_TEST — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_ST_037', 'ST_FAM13_UNIVERSAL_CLAIM_TEST', 'D3',
  'Someone claims that for all collections A and B, removing B from A gives the same result as '
  'removing A from B. What would settle the claim?',
  'A single pair for which the two results differ',
  ['Several pairs for which the two results agree',
   'A demonstration that it holds whenever A and B share no members',
   'Checking that it holds when A and B are the same collection'],
  'One failing case is enough to refute a claim about all pairs, and no number of successes '
  'establishes one. The two suggested special cases are exactly where the claim does hold, which '
  'is why testing only there proves nothing.')

q('GB_ST_038', 'ST_FAM13_UNIVERSAL_CLAIM_TEST', 'D4',
  'Someone claims that for all collections A and B, putting them together always yields more '
  'members than A has. Taking B to be contained in A leaves the combination equal to A, which '
  'has exactly as many members as A rather than more. Is the claim true?',
  'No, and that case refutes it',
  ['Yes, because combining can only ever add members',
   'Yes, unless B happens to be empty',
   'It cannot be decided without knowing the sizes of A and B'],
  'The empty B is one such case but far from the only one; any B already inside A does the same. '
  'Combining never loses members, which is a weaker claim and a true one.',
  evidence='Taking B to be contained in A leaves the combination equal to A')

q('GB_ST_039', 'ST_FAM13_UNIVERSAL_CLAIM_TEST', 'D5',
  'A student tests the claim that two collections always share at least one member by trying '
  'twenty pairs, and it holds every time. Every pair they chose shared at least one member '
  'already, and the claim concerns all pairs including those that share none. What has the '
  'testing established?',
  'Nothing about the claim, because the cases that could refute it were never tried',
  ['That the claim is true, since twenty pairs is a reasonable sample',
   'That the claim holds for collections of the sizes tested',
   'That the claim is probably true, though not proven'],
  'The sample was drawn from the cases the claim gets right. Testing that does not weakly support '
  'the claim — it carries no information about it at all.',
  mode='EDGE', hinge='Every pair they chose shared at least one member already')

q('GB_ST_040', 'ST_FAM13_UNIVERSAL_CLAIM_TEST', 'D5',
  'A claim states that whenever every member of A is also in B, A must have fewer members than '
  'B. A team wants to rely on it. The case where A and B contain exactly the same members '
  'satisfies the condition and makes the two counts equal rather than one smaller. Can the claim '
  'be relied on?',
  'No, because equal collections satisfy the condition and refute the conclusion',
  ['Yes, since containment always leaves something out',
   'Yes, provided neither collection is empty',
   'It depends on how the two collections are stored'],
  'Containment allows equality, and the claim quietly assumes it does not. The repair is to say '
  'fewer than or equal to, which is true and is what containment actually gives.',
  mode='TRANSFER',
  hinge='contain exactly the same members satisfies the condition and makes the two counts equal')

q('GB_ST_041', 'ST_FAM13_UNIVERSAL_CLAIM_TEST', 'D5',
  'A claim states that taking the complement of a collection twice returns the original. A '
  'student objects that this fails for the empty collection. The empty collection has everything '
  'under discussion as its complement, and the complement of everything under discussion is '
  'empty again, which is where the student started. Is the objection correct?',
  'No, the claim holds for the empty collection as well',
  ['Yes, the empty collection is the one exception',
   'Yes, because the empty collection has no complement',
   'The claim is false, but for a different reason'],
  'The empty case is worth checking and it passes. A claim about all collections is refuted by an '
  'example that fails, and this one does not fail.',
  mode='EDGE',
  hinge='the complement of everything under discussion is empty again, which is where the '
        'student started')

# =========================================================================
# ST_FAM14_REQUIREMENT_TO_EXPRESSION — D4 x1, D5 x4
# =========================================================================
q('GB_ST_042', 'ST_FAM14_REQUIREMENT_TO_EXPRESSION', 'D4',
  'A bursary is for students who are in their first year and are not receiving another '
  'scholarship. First-year students who already hold a scholarship must be excluded, and '
  'students in later years must be excluded whether or not they hold one. Which expression '
  'selects the right group?',
  'First-year students, with those receiving another scholarship removed',
  ['First-year students, together with those not receiving another scholarship',
   'Everyone not receiving another scholarship',
   'First-year students, together with those receiving another scholarship'],
  'Starting from first-year students and removing the scholarship holders meets both '
  'conditions. Combining the two groups instead admits every later-year student who holds no '
  'scholarship.',
  evidence='students in later years must be excluded whether or not they hold one')

q('GB_ST_043', 'ST_FAM14_REQUIREMENT_TO_EXPRESSION', 'D5',
  'A discount applies to customers who hold a membership or a voucher, but not to those who hold '
  'both. Customers holding both must be excluded even though each condition taken on its own '
  'would admit them. Which expression selects the right group?',
  'Everyone in either group, with those in both removed',
  ['Everyone in either group',
   'Only those in both groups',
   'Members, with voucher holders removed'],
  'Each condition alone admits the both-holders, so neither can be used unmodified. Combining '
  'the two groups and then removing the overlap is the only one of these that excludes exactly '
  'them.',
  mode='EDGE',
  hinge='Customers holding both must be excluded even though each condition taken on its own '
        'would admit them')

q('GB_ST_044', 'ST_FAM14_REQUIREMENT_TO_EXPRESSION', 'D5',
  'An alert should fire for servers that are unreachable and not already under maintenance. A '
  'server under maintenance must never alert, and a reachable server must never alert regardless '
  'of its maintenance state. Which expression selects the servers to alert on?',
  'Unreachable servers, with those under maintenance removed',
  ['Unreachable servers, together with those under maintenance',
   'Every server not under maintenance',
   'Unreachable servers, with the reachable ones removed'],
  'Both conditions must hold of the same server, so one group is taken and the other removed '
  'from it. Alerting on everything not under maintenance would page for every healthy server in '
  'the estate.',
  mode='TRANSFER',
  hinge='a reachable server must never alert regardless of its maintenance state')

q('GB_ST_045', 'ST_FAM14_REQUIREMENT_TO_EXPRESSION', 'D5',
  'A list must contain everyone in group A except those who are in B and C at the same time. '
  'Someone in B but not C must remain on the list, and someone in both B and C must be removed. '
  'Which expression is correct?',
  'A, with the people who are in both B and C removed',
  ['A, with everyone in B or C removed',
   'A, with everyone in B removed and then everyone in C removed',
   'The people who are in all three of A, B and C'],
  'Only the overlap of B and C is excluded, so someone in B alone survives. Removing B and then '
  'C, or removing everyone in either, takes out far more than the requirement asks for — and '
  'those two do the same thing as each other.',
  mode='EDGE', hinge='Someone in B but not C must remain on the list')

q('GB_ST_046', 'ST_FAM14_REQUIREMENT_TO_EXPRESSION', 'D5',
  'A requirement can be written as A with everyone in either B or C removed, or as A with B '
  'removed and then C removed. The two select exactly the same members, and one will be read '
  'once by a reviewer while the other will be maintained by a team for years. What should decide '
  'between them?',
  'Either is correct, so the choice turns on which states the requirement more plainly to a '
  'future reader',
  ['The first, because performing fewer removals is always faster',
   'The second, because removing one group at a time is always clearer',
   'Neither; a requirement with two exclusions should be split into two separate lists'],
  'Correctness does not separate them, so nothing about the mathematics can settle it. Claiming '
  'one is always faster or always clearer replaces a judgement about this requirement with a '
  'rule that does not hold generally.',
  mode='TRADEOFF',
  hinge='select exactly the same members, and one will be read once by a reviewer while the '
        'other will be maintained')

# =========================================================================
# ST_FAM15_SET_MODEL_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_ST_047', 'ST_FAM15_SET_MODEL_TRANSFER', 'D4',
  'A shop knows how many customers bought online and how many bought in person this month, and '
  'how many did both. It wants the number who used only one of the two channels. The customers '
  'who did both are counted in each channel total, and must be left out of the answer entirely. '
  'How is the answer found?',
  'Add the two channel totals and subtract twice the number who used both',
  ['Add the two channel totals and subtract the number who used both',
   'Add the two channel totals',
   'Subtract the number who used both from the larger channel total'],
  'Subtracting the both-customers once would merely stop counting them twice and would still '
  'leave them in. Subtracting twice removes the copy in each total, which takes them out '
  'altogether.',
  evidence='counted in each channel total, and must be left out of the answer entirely')

q('GB_ST_048', 'ST_FAM15_SET_MODEL_TRANSFER', 'D5',
  'A library has a record of which readers borrowed fiction last year and which borrowed '
  'non-fiction. A report is wanted on readers who tried fiction and never tried non-fiction. '
  'Readers who borrowed both belong in neither this report nor its non-fiction counterpart. How '
  'should the two records be combined?',
  'Take the fiction borrowers and remove every one of them who also appears among the '
  'non-fiction borrowers',
  ['Combine the two lists of borrowers and remove the duplicates',
   'Take the readers who appear in both lists',
   'Take the non-fiction borrowers and remove the fiction borrowers'],
  'The report is about one group with part of it taken away, and the direction matters: the last '
  'option produces the counterpart report rather than this one.',
  mode='TRANSFER',
  hinge='Readers who borrowed both belong in neither this report nor its non-fiction counterpart')

q('GB_ST_049', 'ST_FAM15_SET_MODEL_TRANSFER', 'D5',
  'A team counts the students who attended at least one of two workshops by adding the two '
  'registers and subtracting those on both. This year everyone who attended the first workshop '
  'also attended the second, so the number on both registers equals the whole of the first '
  'register. What does the calculation give?',
  'The number on the second register, which is the right answer',
  ['Twice the number on the second register',
   'Zero, because everything cancels',
   'A number smaller than the second register, which would be wrong'],
  'The first register is added and then subtracted again in full, leaving the second. The method '
  'has not broken in this special case; it has quietly done the right thing.',
  mode='EDGE', hinge='the number on both registers equals the whole of the first register')

q('GB_ST_050', 'ST_FAM15_SET_MODEL_TRANSFER', 'D5',
  'A festival needs the people who bought a ticket for Saturday but not for Sunday. The two '
  'ticket lists overlap, and someone appearing on both must not be in the answer even though '
  'they do appear on the Saturday list. Which combination gives the answer?',
  'The Saturday list, with everyone who also appears on the Sunday list removed',
  ['The Saturday list and the Sunday list combined',
   'The people appearing on both lists',
   'The Sunday list, with everyone on the Saturday list removed'],
  'Appearing on the Saturday list is necessary but not sufficient, so the Sunday names are taken '
  'out of it. Reversing the two produces the people who came on Sunday only, which is a '
  'different group with no members in common.',
  mode='TRANSFER',
  hinge='someone appearing on both must not be in the answer even though they do appear on the '
        'Saturday list')
