# -*- coding: utf-8 -*-
"""
Wave 5 — PROBABILITY_STATISTICS, 50 Golden Bank questions, all newly authored.

THIS SKILL READS NO CHARTS AND NO TABLES OF FIGURES. That is what keeps it out of the banked data
interpretation skill, which is about extracting a value from a display. Everything here is a
sample space, a rule that combines events, or a question about what a summary number does and
does not tell you — and the strongest items are the ones where the arithmetic is trivial and the
reasoning is not.

EVERY COMPARISON OF SPREAD HOLDS THE MEAN EQUAL BETWEEN THE TWO SETS. A student who reads "larger
mean" as "more spread out" is right often enough by accident that a family allowing it would
report competence it had not measured. Holding the centre fixed forces the reasoning onto the
thing being asked about.

THE MEDIAN FAMILY PRESENTS EVERY LIST UNSORTED, because taking the middle of the list as written
is the dominant error and a pre-sorted list makes it impossible to commit.

INDEPENDENCE IS ALWAYS SETTLED IN THE STEM BY SAYING WHETHER THE BALL GOES BACK. And the fallacy
family contains one case where the same-sounding claim is correct: cards dealt without
replacement really do make a fifth ace impossible. A family that always answered "no, trials have
no memory" would teach a reflex rather than the distinction.

REJECTING EVERY SMALL SAMPLE IS NOT REASONING EITHER. The inference family separates sample size
from selection, and one item has a large random sample being wrongly rejected, so that blanket
scepticism scores no better than blanket credulity.
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
# PB_FAM01_SAMPLE_SPACE — D1 x4, D2 x1
# =========================================================================
q('GB_PB_001', 'PB_FAM01_SAMPLE_SPACE', 'D1',
  'A fair coin is tossed once. What outcomes could it produce?',
  'Heads and tails',
  ['Heads only', 'Heads, tails and neither', 'The number of times it was tossed'],
  'A single toss produces heads or tails, and those two possibilities are the whole of what could '
  'happen. Nothing else belongs on the list.')

q('GB_PB_002', 'PB_FAM01_SAMPLE_SPACE', 'D1',
  'An ordinary six-sided die is rolled once. How many different outcomes are possible?',
  '6',
  ['1', '12', '36'],
  'Each face is one outcome and there are six faces, so the answer is 6. Twelve and thirty-six '
  'belong to two dice rather than one.')

q('GB_PB_003', 'PB_FAM01_SAMPLE_SPACE', 'D1',
  'A bag holds one red, one blue and one green ball, and a single ball is taken out. What could '
  'the result be?',
  'Red, blue or green',
  ['Red or blue only', 'Red, blue, green, or no ball at all',
   'The number of balls left in the bag'],
  'Three balls give three possible results, one for each colour. Drawing nothing is not among '
  'them, because a ball is taken.')

q('GB_PB_004', 'PB_FAM01_SAMPLE_SPACE', 'D1',
  'What does a sample space set out?',
  'Every outcome that could occur, each appearing once',
  ['Only the outcomes that are reasonably likely',
   'Only the outcomes somebody is interested in',
   'The probability attached to each outcome'],
  'Completeness is the point: leaving out an unlikely outcome makes every probability computed '
  'from the list wrong. The probabilities themselves are a separate matter.')

q('GB_PB_005', 'PB_FAM01_SAMPLE_SPACE', 'D2',
  'Two coins are tossed. A student says there are three possible results: two heads, two tails, '
  'and one of each. What has been missed?',
  'One of each can happen in two distinct ways, so there are four results rather than three',
  ['Nothing; there really are three possible results',
   'The result where neither coin lands at all',
   'Nothing, since the order of the two coins does not matter'],
  'Head-then-tail and tail-then-head are different results even when nobody cares which coin did '
  'which. Collapsing them makes one of each look as likely as two heads, and it is twice as '
  'likely.')

# =========================================================================
# PB_FAM02_EVENT_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_PB_006', 'PB_FAM02_EVENT_RECOGNITION', 'D1',
  'An ordinary die is rolled. Which results make up the event described as an even number?',
  '2, 4 and 6',
  ['1, 3 and 5', '2 and 4', 'Every result from 1 to 6'],
  'Three of the six faces are even, so the event covers 2, 4 and 6. An event may hold several '
  'results at once, and this one holds three.')

q('GB_PB_007', 'PB_FAM02_EVENT_RECOGNITION', 'D1',
  'A card is taken from a pack holding only the numbers 1 to 10. The event of interest is '
  'described as more than 7. Which numbers does it cover?',
  '8, 9 and 10',
  ['7, 8, 9 and 10', '9 and 10', '1 to 7'],
  'More than 7 leaves 7 itself out and takes everything above it, giving 8, 9 and 10. The '
  'boundary value is where this kind of description is most often misread.')

q('GB_PB_008', 'PB_FAM02_EVENT_RECOGNITION', 'D1',
  'How many results can a single event cover?',
  'Any number, from none of them up to all of them',
  ['Exactly one', 'At least two', 'At most half of what could happen'],
  'An event is simply a group of results, and a group may be empty, may hold one, or may hold '
  'everything. Nothing restricts its size.')

q('GB_PB_009', 'PB_FAM02_EVENT_RECOGNITION', 'D2',
  'A die is rolled and the event is described as at least 3. A student lists 4, 5 and 6. What is '
  'wrong?',
  'At least 3 takes in 3 itself, so the event is 3, 4, 5 and 6',
  ['Nothing; at least 3 does mean above 3',
   'The event should have been listed as 1, 2 and 3',
   'At least 3 means exactly 3 and nothing else'],
  'At least includes the value named, and more than excludes it. One face is the whole of the '
  'difference, and it changes the probability from a half to two thirds.')

# =========================================================================
# PB_FAM03_VALID_PROBABILITY — D1 x3, D2 x1
# =========================================================================
q('GB_PB_010', 'PB_FAM03_VALID_PROBABILITY', 'D1',
  'Which of these could not be a probability?',
  '1.4',
  ['0', '0.5', '1'],
  'Nothing can be more certain than certain, and 1 is certainty, so 1.4 is impossible. Zero and '
  'one are both perfectly ordinary probabilities.')

q('GB_PB_011', 'PB_FAM03_VALID_PROBABILITY', 'D1',
  'The probabilities of all the possible results of a trial are added up. What must the total '
  'come to?',
  '1',
  ['0', '100', 'The number of possible results'],
  'Something must happen, and the results cover everything that could, so the total is 1. A '
  'percentage is the same figure differently written.')

q('GB_PB_012', 'PB_FAM03_VALID_PROBABILITY', 'D1',
  'A trial has three possible results, with probabilities given as 0.5, 0.3 and 0.1. Can that be '
  'right?',
  'No, because they total 0.9 rather than 1',
  ['Yes, because each one lies between 0 and 1',
   'Yes, because there are three results and three figures',
   'No, because three results cannot have three different probabilities'],
  'Every figure is individually plausible and together they leave a tenth unaccounted for. '
  'Checking each value in isolation is exactly what lets this through.')

q('GB_PB_013', 'PB_FAM03_VALID_PROBABILITY', 'D2',
  'A student defends a probability of 120 percent, saying percentages are allowed to exceed 100. '
  'What is wrong?',
  'A probability can never pass the certainty of 1, however it happens to be written',
  ['Nothing; percentages above 100 are perfectly normal',
   'It should have been written as a fraction instead',
   'Percentages may not be used for probabilities at all'],
  'Percentages above 100 are fine for growth and for comparisons, and a probability is neither. '
  'The limit belongs to the quantity, not to the notation.')

# =========================================================================
# PB_FAM04_SIMPLE_PROBABILITY — D2 x1, D3 x1
# =========================================================================
q('GB_PB_014', 'PB_FAM04_SIMPLE_PROBABILITY', 'D2',
  'An ordinary die is rolled once. What is the probability of an even number?',
  '1/2',
  ['1/3', '1/6', '2/3'],
  'Three of the six faces are even, and 3 out of 6 is 1/2. Dividing the three favourable faces '
  'by the three unfavourable ones would give odds rather than a probability.')

q('GB_PB_015', 'PB_FAM04_SIMPLE_PROBABILITY', 'D3',
  'A bag holds 3 red and 5 blue balls, each equally likely to be picked. What is the probability '
  'of picking a red one?',
  '3/8',
  ['3/5', '5/8', '1/3'],
  'There are eight balls altogether and three of them are red, giving 3/8. Dividing the reds by '
  'the blues gives 3/5, which counts against the wrong total.')

# =========================================================================
# PB_FAM05_COMPLEMENT_RULE — D2 x1, D3 x1
# =========================================================================
q('GB_PB_016', 'PB_FAM05_COMPLEMENT_RULE', 'D2',
  'The probability that a train is late is 0.2. What is the probability that it is not late?',
  '0.8',
  ['0.2', '1.2', '5'],
  'The two possibilities together must come to 1, so the other is 0.8. Subtracting from 1 is the '
  'whole of the rule.')

q('GB_PB_017', 'PB_FAM05_COMPLEMENT_RULE', 'D3',
  'Two dice are rolled. Counting the ways of getting at least one six is awkward, but the '
  'probability of getting no six at all is known to be 25/36. What is the probability of at '
  'least one six?',
  '11/36',
  ['25/36', '1/36', '1/6'],
  'At least one six is everything that is not no six, so it is 1 less 25/36, which is 11/36. The '
  'rule earns its keep exactly where the direct count is the harder one.')

# =========================================================================
# PB_FAM06_MEAN — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PB_018', 'PB_FAM06_MEAN', 'D2',
  'Five values are recorded: 4, 8, 6, 2 and 10. What is their mean?',
  '6',
  ['30', '7.5', '5'],
  'The five total 30, and 30 shared among five is 6. Dividing by four instead would give 7.5.')

q('GB_PB_019', 'PB_FAM06_MEAN', 'D3',
  'Six values add up to 48 in total. What is their mean?',
  '8',
  ['48', '6', '7'],
  'Sharing 48 among six gives 8. The individual values are not needed, because the mean depends '
  'on the total and the count and on nothing else about them.')

q('GB_PB_020', 'PB_FAM06_MEAN', 'D4',
  'A set of five values has a mean of 10. One of the values is increased by 20 and nothing else '
  'changes. The total rises by 20 and is still shared among the same five values, so the mean '
  'rises by 20 divided by 5. What is the new mean?',
  '14',
  ['30', '10', '12'],
  'The mean climbs by four, from 10 to 14. Adding the whole 20 to the mean would be treating the '
  'change as though it happened to every value rather than to one.',
  evidence='The total rises by 20 and is still shared among the same five values')

# =========================================================================
# PB_FAM07_MEDIAN_AND_MODE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PB_021', 'PB_FAM07_MEDIAN_AND_MODE', 'D2',
  'The values 7, 2, 9, 4 and 5 are recorded in that order. What is their median?',
  '5',
  ['9', '4', '7'],
  'Sorted they run 2, 4, 5, 7, 9, and the middle one is 5. Taking the middle of the list as '
  'written would have given 9, which is the largest value of the five.')

q('GB_PB_022', 'PB_FAM07_MEDIAN_AND_MODE', 'D3',
  'Four readings are taken, in this order: 6, 1, 8 and 3. What is the median?',
  '4.5',
  ['3', '6', '8'],
  'Sorted they run 1, 3, 6, 8, and with an even count the median is halfway between the two '
  'middle values, giving 4.5. Picking either middle value on its own is the usual shortcut.')

q('GB_PB_023', 'PB_FAM07_MEDIAN_AND_MODE', 'D4',
  'The values 5, 2, 9, 2 and 7 are recorded in that order, and a student reports the median as 9 '
  'by taking the middle of the list as it stands. The median is the middle value once the list '
  'has been sorted, and this list is not in order. What is the median?',
  '5',
  ['9', '2', '4.6'],
  'Sorted the values run 2, 2, 5, 7, 9, so the middle one is 5. The figure 4.6 is the mean, '
  'which answers a different question about the same values.',
  evidence='The median is the middle value once the list has been sorted, and this list is not '
           'in order')

# =========================================================================
# PB_FAM08_SPREAD — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PB_024', 'PB_FAM08_SPREAD', 'D2',
  'Two groups of five values have the same mean. The first is 9, 10, 10, 10, 11 and the second '
  'is 2, 6, 10, 14, 18. Which is more spread out?',
  'The second',
  ['The first', 'Neither; an equal mean means an equal spread',
   'It cannot be told from what is given'],
  'Both average 10, and the second reaches from 2 to 18 where the first barely leaves 10. The '
  'shared mean is precisely what makes the difference here visible as spread.')

q('GB_PB_025', 'PB_FAM08_SPREAD', 'D3',
  'Two groups each have a mean of 20. One runs from 19 to 21 and the other from 5 to 35. What '
  'does the mean on its own tell you about how varied they are?',
  'Nothing; the mean is identical while the variation is entirely different',
  ['That the two are equally varied', 'That the first is the more varied of the two',
   'That the second contains more values than the first'],
  'A centre says where values sit and says nothing about how far they scatter around it. Any '
  'question about variation needs a figure that measures variation.')

q('GB_PB_026', 'PB_FAM08_SPREAD', 'D4',
  'Two delivery teams report the same mean time of 30 minutes. One delivers between 28 and 32 '
  'minutes and the other between 5 and 55. A customer wants to know whether a delivery might '
  'take an hour, and the mean is identical for the two teams while their longest times are not. '
  'Which figure answers the customer?',
  'A figure describing the spread, since the means cannot tell the two teams apart',
  ['The mean, since it summarises both teams in one number',
   'The number of deliveries each team has made',
   'Neither; the question cannot be answered from figures like these'],
  'The customer is asking about the far end of the range, and the two teams differ entirely '
  'there while agreeing exactly at the centre. Reporting only the mean would answer a question '
  'nobody asked.',
  evidence='the mean is identical for the two teams while their longest times are not')

# =========================================================================
# PB_FAM09_ADDITION_RULE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PB_027', 'PB_FAM09_ADDITION_RULE', 'D2',
  'A die is rolled. The probability of a 1 is 1/6 and of a 2 is 1/6, and the two cannot both '
  'happen on one roll. What is the probability of a 1 or a 2?',
  '1/3',
  ['1/36', '1/6', '2/3'],
  'Results that cannot both occur simply add, giving 2/6, which is 1/3. Multiplying them would '
  'answer a question about two rolls rather than one.')

q('GB_PB_028', 'PB_FAM09_ADDITION_RULE', 'D3',
  'In a group, the probability that someone plays cricket is 0.6 and that they play football is '
  '0.5. A student adds the two and reports 1.1. What is wrong?',
  'The two can both be true of one person, so adding counts those who play both twice',
  ['Nothing; 1.1 is a perfectly valid probability',
   'The two figures should have been multiplied rather than added',
   'The two figures given must themselves be wrong'],
  'A total above 1 is the visible symptom, and the cause is that adding assumes the two cannot '
  'happen together. Here they plainly can.')

q('GB_PB_029', 'PB_FAM09_ADDITION_RULE', 'D4',
  'The probability that a customer buys tea is 0.4, that they buy coffee is 0.3, and that they '
  'buy both is 0.1. Adding 0.4 and 0.3 counts the 0.1 who buy both once in each figure, so one '
  'copy of them has to come off. What is the probability that a customer buys at least one of '
  'the two?',
  '0.6',
  ['0.7', '0.12', '0.1'],
  'Seven tenths less one tenth leaves 0.6. Multiplying the two figures would give 0.12 and '
  'answers a question about independence, which nothing here has claimed.',
  evidence='counts the 0.1 who buy both once in each figure')

# =========================================================================
# PB_FAM10_INDEPENDENCE — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_PB_030', 'PB_FAM10_INDEPENDENCE', 'D2',
  'A coin is tossed twice, and neither toss affects the other. What is the probability of two '
  'heads?',
  '1/4',
  ['1/2', '1', '3/4'],
  'Two independent halves multiply, giving 1/4. Adding the two instead would make two heads '
  'certain, which no pair of coin tosses is.')

q('GB_PB_031', 'PB_FAM10_INDEPENDENCE', 'D3',
  'A bag holds 4 red and 6 blue balls. One ball is drawn and put back, and then a second is '
  'drawn. Are the two draws independent of each other?',
  'Yes, because replacing the ball restores the bag to how it started',
  ['No, because the same bag is used on both occasions',
   'No, because the first draw changes what is left',
   'Only when the two balls drawn are the same colour'],
  'Replacement is what makes the second draw face exactly the situation the first did. Without '
  'it the counts would have changed and the draws would not be independent.')

q('GB_PB_032', 'PB_FAM10_INDEPENDENCE', 'D4',
  'A bag holds 3 red and 7 blue balls, and two are drawn without replacement. A student computes '
  'the probability of two reds as 3/10 times 3/10. The first ball is not put back, so by the '
  'second draw the bag holds 9 balls of which at most 2 are red. What is the correct '
  'probability?',
  '1/15',
  ['9/100', '3/10', '1/5'],
  'The second draw faces 2 reds among 9, so the answer is 3/10 times 2/9, which is 1/15. '
  'Multiplying is right and the second figure is not.',
  evidence='by the second draw the bag holds 9 balls of which at most 2 are red')

# =========================================================================
# PB_FAM11_OUTLIER_EFFECT — D3 x1, D4 x1
# =========================================================================
q('GB_PB_033', 'PB_FAM11_OUTLIER_EFFECT', 'D3',
  'Nine people earn 20,000 each and one earns 500,000. Which summary better describes what a '
  'typical person earns?',
  'The median, because one enormous value drags the mean away from everybody',
  ['The mean, because it takes every earner into account',
   'Neither; the two give the same answer here',
   'The largest value, since it is the most striking figure'],
  'The mean comes out near 68,000, which nobody earns. The median stays at 20,000, which nine of '
  'the ten actually earn.')

q('GB_PB_034', 'PB_FAM11_OUTLIER_EFFECT', 'D4',
  'A set of values has a mean of 12 and a median of 11. One further value of 300 is added to it. '
  'A single value far above the rest moves the mean substantially and shifts the median by at '
  'most one position. What happens to the two summaries?',
  'The mean rises sharply and the median barely moves',
  ['Both of them rise sharply',
   'The median rises sharply and the mean barely moves',
   'Neither changes, since one extra value cannot matter'],
  'The mean absorbs the whole of the 300 and shares it out; the median only steps along the '
  'sorted list by one place. That difference is what makes the median the safer summary for '
  'skewed data.',
  evidence='moves the mean substantially and shifts the median by at most one position')

# =========================================================================
# PB_FAM12_INDEPENDENCE_FALLACY — D3 x1, D4 x1
# =========================================================================
q('GB_PB_035', 'PB_FAM12_INDEPENDENCE_FALLACY', 'D3',
  'A fair coin has landed heads six times running. A gambler says tails is now due. Is that '
  'right?',
  'No; the coin has no memory and the next toss is still an even chance',
  ['Yes, because results have to balance out in the end',
   'Yes, because a run of six is very unlikely to continue',
   'It depends on how carefully the coin is being tossed'],
  'Six heads in a row is unlikely in advance and has already happened, which changes nothing '
  'about the seventh toss. The coin carries no record of what it did before.')

q('GB_PB_036', 'PB_FAM12_INDEPENDENCE_FALLACY', 'D4',
  'Cards are dealt from a single pack without replacement, and all four aces have already '
  'appeared. A player says a further ace is now less likely. Because the cards are not put back, '
  'every ace dealt is one fewer ace remaining in the pack. Is the player right?',
  'Yes; with no aces left the probability is now zero, because the deals are not independent',
  ['No; each deal is independent of the ones before it',
   'No; the probability of an ace never changes',
   'Yes, but only because the pack is reshuffled between deals'],
  'This is the case where the same-sounding claim is correct, and what makes it correct is that '
  'the cards are not replaced. A coin would have been a different matter entirely.',
  evidence='every ace dealt is one fewer ace remaining in the pack')

# =========================================================================
# PB_FAM13_SUMMARY_HIDES_SHAPE — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_PB_037', 'PB_FAM13_SUMMARY_HIDES_SHAPE', 'D3',
  'Two collections of values turn out to have the same mean. What follows about the individual '
  'values in them?',
  'Very little; the two may look entirely unlike each other',
  ['They must contain the same values as each other',
   'They must contain the same number of values',
   'At least one value must appear in both'],
  'A mean constrains the total and leaves everything else free. Two collections sharing one can '
  'differ in size, in spread and in every individual value.')

q('GB_PB_038', 'PB_FAM13_SUMMARY_HIDES_SHAPE', 'D4',
  'A class has a mean mark of 50, and a student concludes that somebody must have scored close '
  'to 50. A mean of 50 can be produced by marks of 0 and 100 alone, with nobody anywhere near '
  'the middle. Is the conclusion sound?',
  'No; the mean need not be close to any individual value',
  ['Yes; the mean is always near at least one of the values',
   'Yes, provided the class is reasonably large',
   'No, but only when the class has an even number of students'],
  'The mean is where the values balance, not where any of them sits. A class split between two '
  'extremes has a mean nobody scored.',
  evidence='can be produced by marks of 0 and 100 alone, with nobody anywhere near the middle')

q('GB_PB_039', 'PB_FAM13_SUMMARY_HIDES_SHAPE', 'D5',
  'Two collections of five values share both a mean of 10 and a median of 10, and a team '
  'concludes that the two must be identical. Sharing a centre and a middle value still leaves '
  'the values on either side free to be anything at all. Is the conclusion right?',
  'No; two very different collections can share both figures',
  ['Yes; a shared mean and median together fix the values',
   'Yes, provided both collections hold five values',
   'No, but only if the two collections are of different sizes'],
  'The set 10, 10, 10, 10, 10 and the set 0, 5, 10, 15, 20 agree on both figures and agree on '
  'nothing else. Two summaries pin down two things, and five values need more than two.',
  mode='EDGE',
  hinge='still leaves the values on either side free to be anything at all')

q('GB_PB_040', 'PB_FAM13_SUMMARY_HIDES_SHAPE', 'D5',
  'A dashboard reports one average response time of 200 milliseconds, and users complain of long '
  'waits. The average covers every request, and a small fraction of very slow requests barely '
  'moves an average taken over a great many fast ones. What should be reported instead?',
  'A figure describing the slow end, such as the worst few percent',
  ['The same average, recomputed more frequently',
   'The total number of requests handled',
   'The fastest response time on record'],
  'The complaints are about the tail and the average is dominated by the body. Reporting the '
  'worst few percent measures the thing users are actually experiencing.',
  mode='TRANSFER',
  hinge='a small fraction of very slow requests barely moves an average taken over a great many '
        'fast ones')

q('GB_PB_041', 'PB_FAM13_SUMMARY_HIDES_SHAPE', 'D5',
  'A report states that the mean number of children per family is 2.3, and a reader objects that '
  'no family has 2.3 children. A mean is a total shared out and need not be a value any '
  'individual could take. Is the objection sound?',
  'No; a mean need not be a value that any individual could have',
  ['Yes; the figure should have been rounded to 2',
   'Yes; a mean is not a valid summary for things that are counted',
   'No, though the median would suffer from the same problem'],
  'The figure describes the group rather than any family in it, and rounding it would lose real '
  'information about the group. The median here would be a whole number, which is exactly why it '
  'does not have this problem.',
  mode='EDGE', hinge='A mean is a total shared out and need not be a value any individual could '
                     'take')

# =========================================================================
# PB_FAM14_MEASURE_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_PB_042', 'PB_FAM14_MEASURE_CHOICE', 'D4',
  'A town reports house prices. Most houses sell for between 20 and 40 lakh and three sell for '
  'over 500 lakh. Someone asks what a typical house costs, and the three very expensive sales '
  'pull the mean well above anything most buyers will see. Which summary should be reported?',
  'The median, because it is not dragged upwards by the three extreme sales',
  ['The mean, because it takes every sale into account',
   'The mode, because it names the price that came up most often',
   'The highest price, since it shows how far the market reaches'],
  'Every option is correctly computed and only one answers the question asked. Typical is what '
  'the median is for, and skew is exactly when the two summaries part company.',
  evidence='the three very expensive sales pull the mean well above anything most buyers will '
           'see')

q('GB_PB_043', 'PB_FAM14_MEASURE_CHOICE', 'D5',
  'A hospital must publish a summary of waiting times. The mean is easy to explain to the '
  'public; the worst few percent is what determines whether anyone waits dangerously long. Both '
  'figures are correct. Which should lead the report?',
  'The worst few percent, because the decision the report informs is about dangerous waits',
  ['The mean, because the public will understand it more readily',
   'The mean, because it takes every waiting time into account',
   'Neither; the raw waiting times should be published without any summary'],
  'What the report is for decides which figure leads. Understandability matters and cannot '
  'outrank answering the question the report exists to answer.',
  mode='TRADEOFF', hinge='what determines whether anyone waits dangerously long')

q('GB_PB_044', 'PB_FAM14_MEASURE_CHOICE', 'D5',
  'A shop wants to know which shirt size to stock most heavily, and has the size of every sale. '
  'The question is about the single size that comes up most often rather than about a centre or '
  'a spread. Which summary answers it?',
  'The mode',
  ['The mean', 'The median', 'The range'],
  'Stocking is decided by what sells most, which is what the mode reports. A mean of the sizes '
  'could easily name a size nobody buys.',
  mode='TRANSFER',
  hinge='The question is about the single size that comes up most often rather than about a '
        'centre or a spread')

q('GB_PB_045', 'PB_FAM14_MEASURE_CHOICE', 'D5',
  'A team reports the mode of a set of times, each measured to the nearest thousandth of a '
  'second. Almost no two of the values repeat, and the mode turns out to be a value that '
  'happened to occur twice. What is wrong with reporting it?',
  'A mode means little where values hardly ever repeat, and this one is a coincidence',
  ['Nothing; the mode is always a valid thing to report',
   'The values should have been rounded before the mode was taken',
   'A mean should never be used for measurements of time'],
  'A mode is informative when repetition is meaningful, and at that precision it is not. '
  'Rounding first would produce a mode worth reporting and is a different decision that has to '
  'be made deliberately.',
  mode='EDGE',
  hinge='Almost no two of the values repeat, and the mode turns out to be a value that happened '
        'to occur twice')

q('GB_PB_046', 'PB_FAM14_MEASURE_CHOICE', 'D5',
  'A monthly report can carry one summary figure or three. One fits the front page and hides how '
  'varied the month was; three fill a section that few readers will study. The report is read by '
  'managers who act on it the same day. What is the reasonable choice?',
  'A centre and a spread together, since one figure alone would hide what the managers must act '
  'on',
  ['One figure, because managers have no time to study three',
   'Three figures, because more information is always better',
   'One figure, provided that the figure chosen is the mean'],
  'Two figures answer both where the month sat and how varied it was, which is what acting on it '
  'requires. More is not automatically better, and neither is less.',
  mode='TRADEOFF', hinge='hides how varied the month was')

# =========================================================================
# PB_FAM15_INFERENCE_LIMIT — D4 x1, D5 x3
# =========================================================================
q('GB_PB_047', 'PB_FAM15_INFERENCE_LIMIT', 'D4',
  'A survey of 12 students in one class finds that 75 percent prefer online classes, and the '
  'result is reported as the view of the university. All twelve come from a single class, and '
  'nothing about that class was chosen to resemble the university as a whole. Is the conclusion '
  'warranted?',
  'No, because the students surveyed were not chosen to represent the university',
  ['Yes, because 75 percent is a clear majority',
   'Yes, because the arithmetic behind the percentage is correct',
   'No, purely because twelve students is too small a number'],
  'Selection is the fault here rather than size. Twelve students chosen at random from across '
  'the university would support a weak conclusion; twelve from one class support none.',
  evidence='nothing about that class was chosen to resemble the university as a whole')

q('GB_PB_048', 'PB_FAM15_INFERENCE_LIMIT', 'D5',
  'A website invites visitors to rate it, and 90 percent of those who respond rate it highly. '
  'The team reports that 90 percent of visitors are satisfied. Only visitors who chose to '
  'respond are counted, and whether someone chooses to respond may itself depend on how '
  'satisfied they are. What is wrong?',
  'The respondents selected themselves, so they need not resemble visitors as a whole',
  ['Nothing; 90 percent of respondents is 90 percent of visitors',
   'The number of respondents is too small to report',
   'The rating scale must have been designed badly'],
  'The people who answer are a group shaped by the very thing being measured. The figure is a '
  'true statement about respondents and an unsupported one about visitors.',
  mode='TRANSFER',
  hinge='whether someone chooses to respond may itself depend on how satisfied they are')

q('GB_PB_049', 'PB_FAM15_INFERENCE_LIMIT', 'D5',
  'A trial of a new process runs on 2,000 randomly chosen orders and shows a small improvement. '
  'A reviewer rejects the finding on the grounds that all sampling is unreliable. The sample is '
  'large and was chosen at random, which is precisely the situation in which a sample does '
  'support a conclusion. Is the rejection reasonable?',
  'No; a large random sample is exactly what makes a conclusion supportable',
  ['Yes; no sample can support a conclusion about the whole',
   'Yes, unless every order was included in the trial',
   'No, but only if the improvement had been larger'],
  'Rejecting every sample is as unreasoning as accepting every one. This sample has both of the '
  'properties that make sampling work, and the reviewer has engaged with neither.',
  mode='EDGE', hinge='The sample is large and was chosen at random')

q('GB_PB_050', 'PB_FAM15_INFERENCE_LIMIT', 'D5',
  'A team can survey 100 people chosen at random at real cost, or 10,000 volunteers reached '
  'through a link at almost none. The larger group is not chosen at random and the smaller one '
  'is, and the question is what the whole population thinks. Which is the better basis?',
  'The 100 chosen at random, because size cannot repair a group that was never chosen to '
  'represent',
  ['The 10,000, because a larger sample is always the more reliable',
   'The 10,000, because the money saved can fund further surveys',
   'Either, since both are samples drawn from the same population'],
  'A bigger unrepresentative sample measures its own bias more precisely and gets no closer to '
  'the population. Random selection is what buys the link to the whole, and nothing else '
  'substitutes for it.',
  mode='TRADEOFF', hinge='The larger group is not chosen at random and the smaller one is')
