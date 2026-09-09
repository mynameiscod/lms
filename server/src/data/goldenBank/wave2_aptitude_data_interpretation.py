# -*- coding: utf-8 -*-
"""
Wave 2 — APTITUDE_DATA_INTERPRETATION, 50 Golden Bank questions.

12 come from the existing bank (6 kept, 6 rewritten) and 38 are new.

SIX PHASE-2 KEEPS ARE REWRITTEN BECAUSE THEIR FAMILY ASKS FOR SOMETHING THE ITEM DID NOT SHOW.
AD_FAM01 requires a table with rows and columns, and the legacy items offered a flat list of four
labelled values, so there was no coordinate to read. AD_FAM04 requires a subtotal row, because the
trap it exists for is counting a subtotal twice. AD_FAM08 measures what follows from an average,
and one legacy item measured the range instead. Each keeps its subject and gains the structure its
family measures against.

EVERY TABLE AND CHART IS GIVEN IN THE STEM AS VALUES, never as an image, so the arithmetic is
checkable and nothing depends on estimating a length by eye. That is the blueprint's own note on
this skill.
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
# AD_FAM01_TABLE_LOOKUP — D1 x4 (2 legacy), D2 x1
# =========================================================================
q('GB_AD_001', 'AD_FAM01_TABLE_LOOKUP', 'D1',
  'A table gives marks by student and subject. Student P: Maths 70, Science 85. Student Q: Maths '
  '60, Science 90. What is Q\'s Maths mark?',
  '60',
  ['90', '70', '85'],
  'The value sits where the Q row meets the Maths column. Reading along the same row gives Q\'s '
  'Science mark, and reading down the same column gives P\'s Maths mark — both are values in the '
  'table, and neither is the one asked for.',
  provenance='LEGACY_REWRITE', source='bef9f7')

q('GB_AD_002', 'AD_FAM01_TABLE_LOOKUP', 'D1',
  'A table lists deliveries by week, with a Total row: Week 1 — 12, Week 2 — 9, Week 3 — 15, '
  'Total — 36. What figure is recorded for Week 2?',
  '9',
  ['36', '12', '15'],
  'Week 2 has its own row and its own value. The Total is computed from the three weeks and is '
  'not itself a week, which is why a total row must be read as a summary rather than as data.',
  provenance='LEGACY_REWRITE', source='c702c2')

q('GB_AD_003', 'AD_FAM01_TABLE_LOOKUP', 'D1',
  'A table gives rainfall in millimetres by month and city. City X: June 40, July 65. City Y: '
  'June 55, July 30. What was July\'s rainfall in City Y?',
  '30',
  ['65', '55', '40'],
  'The answer is where the City Y row meets the July column. The other three values are each one '
  'step away — along the row, down the column, or diagonally — which is exactly how a coordinate '
  'is misread.')

q('GB_AD_004', 'AD_FAM01_TABLE_LOOKUP', 'D1',
  'A table gives sales by product and quarter. Product A: Q1 200, Q2 150. Product B: Q1 180, Q2 '
  '210. Which cell holds 210?',
  'Product B in Q2',
  ['Product B in Q1', 'Product A in Q2', 'Product A in Q1'],
  'Locating a value works the same way as reading one: both a row and a column are needed. Naming '
  'only one of the two leaves three cells still possible.')

q('GB_AD_005', 'AD_FAM01_TABLE_LOOKUP', 'D2',
  'A table gives staff numbers by department and site. Support: London 12, Leeds 8. Sales: London '
  '15, Leeds 20. Someone reads "Sales in Leeds" as 15. What did they read instead?',
  'Sales in London, taking the correct row and the wrong column',
  ['Support in Leeds, taking the correct column and the wrong row',
   'The total for Leeds',
   'The total for Sales'],
  '15 sits in the Sales row under London, so the row was right and the column was not. Support in '
  'Leeds is 8, and neither total is 15 — so only one misreading produces the figure they gave.')

# =========================================================================
# AD_FAM02_UNIT_READING — D1 x3, D2 x1   (scale stated in the header and load-bearing)
# =========================================================================
q('GB_AD_006', 'AD_FAM02_UNIT_READING', 'D1',
  'A table is headed "Sales, in thousands of rupees". The entry for March reads 45. What were '
  'March\'s sales?',
  '45,000 rupees',
  ['45 rupees', '45,000,000 rupees', '4,500 rupees'],
  'The header says every entry is a count of thousands, so 45 means 45 thousand. Reading the '
  'number without applying the scale is the commonest slip; applying it twice gives millions.')

q('GB_AD_007', 'AD_FAM02_UNIT_READING', 'D1',
  'A table is headed "Downloads per month". The entry for a certain app reads 300. How many '
  'downloads would a year bring at that rate?',
  '3,600',
  ['300', '25', '36,000'],
  'The figure covers one month, so a year is twelve times it, giving 3,600. Treating a monthly '
  'figure as annual leaves it at 300, and dividing by twelve goes the wrong way.')

q('GB_AD_008', 'AD_FAM02_UNIT_READING', 'D1',
  'A table is headed "Distance, in kilometres". One entry reads 8. Another table headed '
  '"Distance, in metres" also reads 8. Are the two distances the same?',
  'No; one is a thousand times the other',
  ['Yes; both entries read 8',
   'No; one is a hundred times the other',
   'It cannot be said without knowing what was measured'],
  'The number is only half the value; the unit in the header is the other half. Two identical '
  'numbers under different units are different quantities, and how different is fixed by the '
  'units alone.')

q('GB_AD_009', 'AD_FAM02_UNIT_READING', 'D2',
  'A table headed "Revenue, in millions" shows 3.5 for one region and, in a footnote, "Region Z '
  'reported in thousands: 2,800". Which region earned more?',
  'The first, because 3.5 million exceeds 2.8 million',
  ['Region Z, because 2,800 is larger than 3.5',
   'They are equal once both are converted',
   'It cannot be decided, because the two use different units'],
  'Both figures can be put on the same footing: 3.5 million against 2,800 thousand, which is 2.8 '
  'million. Comparing the printed numbers without converting reverses the answer, and differing '
  'units are an obstacle to be removed rather than a reason to give up.')

# =========================================================================
# AD_FAM03_CHART_READING — D1 x3 (1 legacy), D2 x1 (legacy)
# =========================================================================
q('GB_AD_010', 'AD_FAM03_CHART_READING', 'D1',
  'A bar chart shows: Python 30, C 20, Java 25. Which is highest?',
  'Python',
  ['C', 'Java', 'They are equal'],
  'Thirty is the largest of the three values, so Python has the tallest bar. Java is the second '
  'largest, which is the answer a hurried reading produces.',
  provenance='LEGACY_KEEP', source='a7eea6')

q('GB_AD_011', 'AD_FAM03_CHART_READING', 'D1',
  'A bar chart shows monthly faults: April 14, May 9, June 11, July 6. Which month had the fewest?',
  'July',
  ['May', 'June', 'April'],
  'Six is the smallest of the four values, so the answer is July. May is the second smallest and '
  'is what a reader who stops at the first low bar tends to choose.')

q('GB_AD_012', 'AD_FAM03_CHART_READING', 'D1',
  'A chart shows cumulative sign-ups: after week 1, 20; after week 2, 35; after week 3, 50. How '
  'many signed up during week 2 alone?',
  '15',
  ['35', '50', '20'],
  'Each bar reports the running total, so week 2 alone is the difference between two bars: 15. '
  'Reading 35 takes the cumulative figure as though it stood for that week on its own.')

q('GB_AD_013', 'AD_FAM03_CHART_READING', 'D2',
  'A bar chart shows: Red 10, Blue 20, Green 20. Which are tied highest?',
  'Blue and Green',
  ['Red and Blue', 'Red and Green', 'All three'],
  'Both Blue and Green reach 20, and Red reaches only 10. A tie has to be read off the values '
  'rather than from adjacency on the chart.',
  provenance='LEGACY_KEEP', source='a61401')

# =========================================================================
# AD_FAM04_TOTAL_AND_DIFFERENCE — D2 (legacy), D3
# =========================================================================
q('GB_AD_014', 'AD_FAM04_TOTAL_AND_DIFFERENCE', 'D2',
  'A table lists: Mon 10, Tue 15, Wed 12, Subtotal 37, Thu 8. What is the total for the four days?',
  '45',
  ['82', '37', '30'],
  'The subtotal already accounts for Monday to Wednesday, so the total is that subtotal plus '
  'Thursday, which is 45. Adding every printed figure counts the first three days twice and gives '
  '82.',
  provenance='LEGACY_REWRITE', source='c7a0f9')

q('GB_AD_015', 'AD_FAM04_TOTAL_AND_DIFFERENCE', 'D3',
  'A table shows income 4,200 and costs 3,650 for one month, and income 3,900 and costs 4,100 for '
  'the next. By how much did the surplus fall between the two months?',
  '750',
  ['300', '450', '200'],
  'The first month\'s surplus is 550 and the second is -200, so the fall is 750. Comparing the '
  'incomes alone gives 300 and the costs alone 450; the surplus has to be worked out for each '
  'month before the two can be compared.')

# =========================================================================
# AD_FAM05_SHARE_OF_TOTAL — D2, D3
# =========================================================================
q('GB_AD_016', 'AD_FAM05_SHARE_OF_TOTAL', 'D2',
  'A table shows enrolments: Course A 30, Course B 50, Course C 20, giving 100 in all. What share '
  'of the total is Course B?',
  '50%',
  ['100%', '20%', '30%'],
  'Fifty out of one hundred is half. Each of the other options is a share belonging to a '
  'different course, or the whole rather than the part.')

q('GB_AD_017', 'AD_FAM05_SHARE_OF_TOTAL', 'D3',
  'A table shows two regions. North: Product A 20, Product B 30, row total 50. South: Product A '
  '10, Product B 40, row total 50. The grand total is 100. What share of all sales is Product A '
  'in the North?',
  '20%',
  ['40%', '50%', '10%'],
  'The question names the grand total of 100, so 20 out of 100 is 20%. Dividing by the North row '
  'total of 50 gives 40%, which answers a different and equally sensible question — which is why '
  'the whole has to be identified before dividing.')

# =========================================================================
# AD_FAM06_PERCENTAGE_CHANGE — D2 (legacy), D3, D4
# =========================================================================
q('GB_AD_018', 'AD_FAM06_PERCENTAGE_CHANGE', 'D2',
  'A chart shows Q1 at 100 and Q2 at 125. What is the percentage increase?',
  '25%',
  ['20%', '30%', '125%'],
  'The rise of 25 measured against the starting value of 100 is 25%. Measuring it against the '
  'later value of 125 would give 20%, and 125% is the second figure as a proportion of the first '
  'rather than the change.',
  provenance='LEGACY_KEEP', source='a575ca')

q('GB_AD_019', 'AD_FAM06_PERCENTAGE_CHANGE', 'D3',
  'A figure falls from 80 to 60. What is the percentage change?',
  'A fall of 25%',
  ['A fall of 20%', 'A fall of 33%', 'A fall of 20 percentage points, which is the same as 25%'],
  'The fall of 20 is measured against the starting value of 80, giving 25%. Measuring against the '
  'later value of 60 gives 33%, and a change of 20 units is not a change of 20% unless the base '
  'happens to be 100.')

q('GB_AD_020', 'AD_FAM06_PERCENTAGE_CHANGE', 'D4',
  'A price rises by 50% and then falls by 50%. Someone reports that it has returned to where it '
  'started. Starting from 100, where does it actually end, and why?',
  '75, because the fall is taken against the raised price rather than the original',
  ['100, because the two changes cancel',
   '50, because the two changes add to a fall of nothing and then halve it',
   '150, because a rise and a fall of the same size leave the rise standing'],
  'The rise takes 100 to 150, and half of 150 is 75. Each percentage is measured against whatever '
  'the value is at the time, so equal percentages in opposite directions do not cancel — the '
  'second acts on a larger base.',
  evidence='Someone reports that it has returned to where it started')

# =========================================================================
# AD_FAM07_RATIO_REASONING — D2 (legacy), D3, D4
# =========================================================================
q('GB_AD_021', 'AD_FAM07_RATIO_REASONING', 'D2',
  'Two quantities are in the ratio 2:3, and the first is 10. What is the second?',
  '15',
  ['18', '10', '12'],
  'Each part of the ratio is worth 5, so three parts are 15. The ratio fixes the relationship '
  'between the two quantities and nothing else about them.',
  provenance='LEGACY_KEEP', source='34bbc8')

q('GB_AD_022', 'AD_FAM07_RATIO_REASONING', 'D3',
  'A group of 40 people is split in the ratio 3:5. How many are in the smaller part?',
  '15',
  ['3', '24', '13'],
  'The ratio has eight parts in all, so each part is five people and three parts are 15. Treating '
  '3 as a share of the whole rather than as a number of parts is what produces the other answers.')

q('GB_AD_023', 'AD_FAM07_RATIO_REASONING', 'D4',
  'Team A passes tests in the ratio 4:1 against failures; Team B in the ratio 9:1. Someone '
  'concludes that Team B passed more tests. Team A ran 500 tests and Team B ran 50. What is wrong '
  'with the conclusion?',
  'A ratio says nothing about absolute size; Team A passed 400 and Team B only 45',
  ['Nothing; 9:1 is the better ratio and so the larger number',
   'The ratios cannot be compared, because they have different second parts',
   'Team B passed more, but only because it ran fewer tests'],
  'The two ratios are directly comparable and Team B\'s is genuinely better, which is what makes '
  'the conclusion tempting. But a proportion multiplied by a much smaller total gives a much '
  'smaller count, and the counts are what the claim was about.',
  evidence='Team A ran 500 tests and Team B ran 50')

# =========================================================================
# AD_FAM08_AVERAGE_REASONING — D2 (legacy), D3 (legacy), D4 (legacy)
# =========================================================================
q('GB_AD_024', 'AD_FAM08_AVERAGE_REASONING', 'D2',
  'Five values have an average of 20. A sixth value of 8 is added. What happens to the average?',
  'It falls, because the new value is below the old average',
  ['It stays at 20, because one value cannot move an average',
   'It rises, because adding a value increases the total',
   'It becomes 8, the most recent value'],
  'An average moves toward whatever is added to it, so a value below it pulls it down. The total '
  'does rise, but it is now divided among six rather than five.',
  provenance='LEGACY_REWRITE', source='83a6d6')

q('GB_AD_025', 'AD_FAM08_AVERAGE_REASONING', 'D3',
  'Which measure is most directly affected by one extremely large value in the data?',
  'The mean',
  ['The median', 'The mode', 'The count'],
  'The mean uses every value in its arithmetic, so an extreme one moves it. The median depends on '
  'position rather than size, the mode on which value appears most, and the count on how many '
  'there are.',
  provenance='LEGACY_KEEP', source='83089f')

q('GB_AD_026', 'AD_FAM08_AVERAGE_REASONING', 'D4',
  'A group of 4 has an average of 10 and a group of 16 has an average of 20. Someone reports the '
  'combined average as 15. What is it actually?',
  '18, because the larger group carries more weight',
  ['15, since 10 and 20 average to 15',
   '30, since the two averages add',
   'It cannot be found without every individual value'],
  'The totals are 40 and 320, giving 360 across 20 people, which is 18. Averaging two averages '
  'treats the groups as equal in size, and here one is four times the other.',
  provenance='LEGACY_REWRITE', source='aa6782',
  evidence='Someone reports the combined average as 15')

# =========================================================================
# AD_FAM09_TREND_READING — D2 (legacy), D3, D4
# =========================================================================
q('GB_AD_027', 'AD_FAM09_TREND_READING', 'D2',
  'Values over five days read 10, 14, 11, 17, 21. What is the overall trend, and what does it not '
  'tell you?',
  'Rising overall, though it does not mean every day was higher than the one before',
  ['Rising, which means every day was higher than the one before',
   'Falling, because one day fell',
   'No trend at all, because the values do not rise every day'],
  'A trend is the direction across the series, and this one climbs from 10 to 21. A single dip on '
  'the third day is entirely consistent with that, which is exactly what a trend does not rule '
  'out.',
  provenance='LEGACY_REWRITE', source='a4d793')

q('GB_AD_028', 'AD_FAM09_TREND_READING', 'D3',
  'Monthly figures read 50, 46, 52, 48, 55, 51. What can be said?',
  'The figures drift upward while alternating, so the trend is mildly rising',
  ['The figures are falling, because each rise is followed by a fall',
   'There is no trend, because the values go up and down',
   'The trend is flat, because the rises and falls are of similar size'],
  'The peaks climb from 52 to 55 and the troughs from 46 to 51, so the series is rising even '
  'though no two consecutive months both rise. Alternation and direction are separate features of '
  'the same data.')

q('GB_AD_029', 'AD_FAM09_TREND_READING', 'D4',
  'Sales over four quarters read 100, 120, 140, 160. Someone concludes that the next quarter will '
  'be 180. The data covers only these four quarters. What is wrong with the conclusion?',
  'The trend describes what happened and does not fix any future value',
  ['The arithmetic is wrong; the next value would be 170',
   'Nothing; four points establish the pattern',
   'The trend is actually falling once the rate of increase is considered'],
  'The rise of 20 each quarter is real and the extrapolation is arithmetically sound, which is why '
  'it convinces. What the data cannot supply is any reason the pattern continues — a trend is a '
  'description of a period, not a promise about the next one.',
  evidence='The data covers only these four quarters')

# =========================================================================
# AD_FAM10_RATE_COMPARISON — D2, D3, D4
# =========================================================================
q('GB_AD_030', 'AD_FAM10_RATE_COMPARISON', 'D2',
  'One shop sells 300 items a week; another sells 60 items a day. Which sells more, and what has '
  'to happen first?',
  'The second, once both are put on the same period: 60 a day is 420 a week',
  ['The first, because 300 is larger than 60',
   'They are equal once compared',
   'They cannot be compared, because the periods differ'],
  'Two rates can only be compared when their denominators match, and here they can be made to '
  'match. Comparing the printed numbers reverses the answer.')

q('GB_AD_031', 'AD_FAM10_RATE_COMPARISON', 'D3',
  'Department X reported 40 faults and Department Y reported 12. X handled 4,000 jobs and Y '
  'handled 400. Which had the higher fault rate?',
  'Y, at 3 per hundred jobs against X\'s 1 per hundred',
  ['X, because it reported more faults',
   'They are equal, because both figures are small',
   'It cannot be decided from counts alone'],
  'Dividing each count by its own workload gives 1% and 3%, so the smaller count comes from the '
  'worse rate. The counts alone answer a different question — how many faults there were, not how '
  'often they occurred.')

q('GB_AD_032', 'AD_FAM10_RATE_COMPARISON', 'D4',
  'A report states that Clinic A has a 90% success rate and Clinic B 75%, and concludes A is '
  'better. A treated 10 cases and B treated 2,000. What does the comparison overlook?',
  'A rate from 10 cases is far less settled than one from 2,000; a single further case moves A by '
  'ten points',
  ['Nothing; 90% is higher than 75% however many cases there were',
   'The rates cannot be compared, because the denominators differ',
   'B is better because it treated more cases'],
  'Both rates are correctly computed and directly comparable, which is what makes this look '
  'settled. What differs is how much each rests on: one more failure at A gives 82%, while one at '
  'B changes almost nothing.',
  evidence='A treated 10 cases and B treated 2,000')

# =========================================================================
# AD_FAM11_COMPOUND_PERCENTAGE — D3, D4
# =========================================================================
q('GB_AD_033', 'AD_FAM11_COMPOUND_PERCENTAGE', 'D3',
  'A value of 200 rises by 10% and then by a further 10%. What is it now?',
  '242',
  ['240', '220', '244'],
  'The first rise gives 220 and the second is taken on that, adding 22 to reach 242. Adding the '
  'two percentages to make 20% gives 240 and misses the rise on the rise.')

q('GB_AD_034', 'AD_FAM11_COMPOUND_PERCENTAGE', 'D4',
  'A price rises 20% then falls 10%. Another rises 10% then falls 20%. Someone says the order '
  'changes the outcome. Starting both from 100, what happens?',
  'Both end at 108; multiplying the same two factors in either order gives the same result',
  ['The first ends higher, because the larger rise comes first',
   'The second ends higher, because the larger fall comes last',
   'The first ends at 110 and the second at 88'],
  'Each change multiplies by a factor — 1.2 and 0.9 — and multiplication does not depend on '
  'order, so both give 108. The intuition that the bigger move should come first is exactly what '
  'the arithmetic does not support.',
  evidence='Someone says the order changes the outcome')

# =========================================================================
# AD_FAM12_DATA_QUALITY — D3 (legacy), D4
# =========================================================================
q('GB_AD_035', 'AD_FAM12_DATA_QUALITY', 'D3',
  'A column of ages reads 18, 19, 18, 250, 19. Which value most needs checking before the data is '
  'used?',
  '250',
  ['18', '19', 'All of them equally'],
  'An age of 250 is outside anything the column can plausibly record, so it points at a recording '
  'or entry fault. The other values are unremarkable and consistent with each other.',
  provenance='LEGACY_KEEP', source='bce8c8')

q('GB_AD_036', 'AD_FAM12_DATA_QUALITY', 'D4',
  'A table lists monthly totals of 120, 135 and 118, with an annual figure of 373 given as the '
  'sum. The individual months add to 373. A footnote adds that August\'s figure is missing. Why is '
  'the annual figure unreliable?',
  'It is labelled annual but covers only the months present, and one month is known to be absent',
  ['The three monthly figures do not add to 373',
   'The monthly figures are too close together to be genuine',
   'An annual figure should never be the sum of monthly ones'],
  'The arithmetic is correct, which is what makes the figure look sound. The defect is in what it '
  'claims to cover: a total described as annual, computed from data known to be incomplete, '
  'understates by an unknown amount.',
  evidence='The individual months add to 373')

# =========================================================================
# AD_FAM13_MISLEADING_PRESENTATION — D3, D4, D5 x3
# =========================================================================
q('GB_AD_037', 'AD_FAM13_MISLEADING_PRESENTATION', 'D3',
  'A headline reads "Cases up 200% this month". The figures behind it are two cases last month '
  'and six this month. Every number is correct. What makes the headline misleading?',
  'The percentage is accurate but the base is tiny, and the headline omits it',
  ['The percentage is miscalculated; it should be 300%',
   'The comparison should have used the same month last year',
   'Percentages should never be used for counts'],
  'Going from two to six is a rise of four on a base of two, which is 200%. Nothing is false; what '
  'misleads is presenting a proportional change without the numbers that would show how small a '
  'change it is.')

q('GB_AD_038', 'AD_FAM13_MISLEADING_PRESENTATION', 'D4',
  'A chart shows a company\'s revenue climbing steeply. Its vertical axis begins at 4,900 rather '
  'than 0, and the values run from 5,000 to 5,200. All the plotted values are correct. What makes '
  'the chart misleading?',
  'Beginning the axis near the data magnifies a 4% change into a dramatic climb',
  ['The values are wrong; revenue did not really rise',
   'A line chart is the wrong choice for revenue',
   'The chart covers too short a period to show anything'],
  'The plotted points are accurate and the rise is real, so nothing in the data is false. What '
  'misleads is the axis: cutting away everything below 4,900 makes a small proportional change '
  'fill the whole height of the chart.',
  evidence='All the plotted values are correct')

q('GB_AD_039', 'AD_FAM13_MISLEADING_PRESENTATION', 'D5',
  'A report compares this year\'s figures with 2019 rather than with last year, and every number '
  'it prints is correct. When is choosing that comparison legitimate, and when does it mislead?',
  'It is legitimate when the intervening years were disrupted and that is stated; it misleads when '
  'the year is chosen because it flatters the result',
  ['It always misleads, since the most recent year is the only fair comparison',
   'It is always legitimate, since the numbers are correct',
   'It misleads only if the intervening years were higher'],
  'A comparison period is a choice, and choices can be made for good reasons or convenient ones. '
  'What separates the two is whether the reader is told why that year was picked, not whether the '
  'arithmetic holds.',
  mode='TRANSFER', hinge='compares this year\'s figures with 2019 rather than with last year')

q('GB_AD_040', 'AD_FAM13_MISLEADING_PRESENTATION', 'D5',
  'Two charts show the same data. One plots absolute counts and one plots percentage change. A '
  'reader draws opposite conclusions from them. Can both charts be honest?',
  'Yes; they answer different questions, and a small base can make a large percentage from a small '
  'count',
  ['No; one of them must be plotting the data wrongly',
   'No; percentage change is always the more honest of the two',
   'Yes, but only if the underlying data was collected twice'],
  'Counts and proportions are different quantities computed from the same numbers, and they can '
  'point in different directions without either being wrong. The reader\'s task is to notice '
  'which question a chart answers before drawing a conclusion from it.',
  mode='TRANSFER', hinge='One plots absolute counts and one plots percentage change')

q('GB_AD_041', 'AD_FAM13_MISLEADING_PRESENTATION', 'D5',
  'A team must present a 3% fall to a board. One option shows the axis from zero, where the fall '
  'is barely visible; another begins the axis near the data, where it looks severe. Which should '
  'they choose, and on what grounds?',
  'Whichever matches how much the fall actually matters, stated alongside the figures so the '
  'reader can judge for themselves',
  ['The axis from zero, since it is always the honest choice',
   'The axis near the data, since it makes the change visible',
   'Neither; a 3% fall should not be charted at all'],
  'Both charts are accurate, so the choice is about what impression to create, and neither scale '
  'is honest in itself. What makes a presentation defensible is that the numbers accompany it, so '
  'the reader is not relying on the picture alone.',
  mode='TRADEOFF', hinge='One option shows the axis from zero')

# =========================================================================
# AD_FAM14_SUFFICIENCY — D4, D5 x4
# =========================================================================
q('GB_AD_042', 'AD_FAM14_SUFFICIENCY', 'D4',
  'A table gives the number of staff at each of three sites and the total salary bill for the '
  'company. Someone asks for the average salary at the largest site. The staff counts are '
  'complete and the total bill is correct. Can it be worked out?',
  'No; the salary bill is given only for the company as a whole, not per site',
  ['Yes; divide the total bill by the staff at that site',
   'Yes; divide the total bill by the total staff',
   'No; the staff counts would also be needed'],
  'Dividing the whole bill by one site\'s staff assumes every rupee was paid there, and dividing '
  'by all staff gives a company-wide average, not that site\'s. The data supports a different '
  'question perfectly well; it does not support this one.',
  evidence='The staff counts are complete and the total bill is correct')

q('GB_AD_043', 'AD_FAM14_SUFFICIENCY', 'D5',
  'A table gives each region\'s sales and each region\'s number of customers. What can be worked '
  'out, and what cannot?',
  'Sales per customer by region can be worked out; what any individual customer spent cannot',
  ['Both can be worked out from the two columns',
   'Neither can be worked out without a total row',
   'Sales per customer cannot be worked out, because customers may overlap between regions'],
  'Dividing one column by the other gives an average per customer within each region, which is '
  'genuinely available. Individual figures are not recoverable from an average — many different '
  'distributions produce the same one.',
  mode='TRANSFER', hinge='What can be worked out, and what cannot')

q('GB_AD_044', 'AD_FAM14_SUFFICIENCY', 'D5',
  'A table shows the percentage of respondents choosing each of four options, and nothing else. '
  'Someone asks how many people chose the first option. What is needed?',
  'The number of respondents; percentages alone fix proportions and not counts',
  ['Nothing further; the percentage is the answer',
   'The percentages for the other three options',
   'The order in which the options were listed'],
  'A percentage is a share of a whole, and without the whole no count follows from it. The other '
  'percentages are already implied by the first three and add nothing.',
  mode='TRANSFER', hinge='shows the percentage of respondents choosing each of four options')

q('GB_AD_045', 'AD_FAM14_SUFFICIENCY', 'D5',
  'A dataset covers every transaction in one branch for one week. A manager asks what the busiest '
  'hour is across the company. Is the data sufficient, and what would make it so?',
  'No; data from one branch and one week cannot speak for the company, and every branch over a '
  'longer period would be needed',
  ['Yes; one branch is representative of the others',
   'Yes; a week is long enough to establish an hourly pattern',
   'No; hourly timestamps would also be needed, which a transaction record lacks'],
  'The data is complete for what it covers, which is what makes it tempting to generalise from. '
  'The question asks about a population the data does not include, and no amount of analysis '
  'inside one branch reaches outside it.',
  mode='EDGE', hinge='covers every transaction in one branch for one week')

q('GB_AD_046', 'AD_FAM14_SUFFICIENCY', 'D5',
  'Data is insufficient to answer a question exactly. One person reports "cannot be determined"; '
  'another reports a best estimate with its assumptions stated. Which is more useful, and what '
  'does each risk?',
  'The estimate with its assumptions stated, provided the assumptions travel with it — stripped of '
  'them it becomes a figure nobody can check',
  ['"Cannot be determined", since any estimate is a guess',
   'The estimate, since a number is always more useful than a refusal',
   'They are equivalent, since neither answers the question'],
  'A refusal is safe and unhelpful; an estimate is helpful and dangerous once its conditions are '
  'lost. Which is better depends on whether the assumptions survive the journey to whoever acts '
  'on the number.',
  mode='TRADEOFF', hinge='another reports a best estimate with its assumptions stated')

# =========================================================================
# AD_FAM15_CLAIM_EVALUATION — D4, D5 x3
# =========================================================================
q('GB_AD_047', 'AD_FAM15_CLAIM_EVALUATION', 'D4',
  'A table shows that towns with more libraries also have higher exam results. A report claims '
  'that building libraries raises results. The correlation in the data is genuine and strong. What '
  'is wrong with the claim?',
  'The data shows the two occur together and cannot show that one produces the other',
  ['The correlation is too weak to support any claim',
   'The claim is fine; a strong correlation establishes the cause',
   'The claim should have been about exam results raising library numbers'],
  'Strength of association says nothing about direction or about a third factor driving both — '
  'wealthier towns may fund libraries and schooling alike. Reversing the claim has exactly the '
  'same problem, so it is no better.',
  evidence='The correlation in the data is genuine and strong')

q('GB_AD_048', 'AD_FAM15_CLAIM_EVALUATION', 'D5',
  'A survey of a company\'s own customers finds that 92% are satisfied with it. A report concludes '
  'that most people prefer this company. Where does the claim outrun its data?',
  'It moves from the company\'s customers to people in general, and the people most likely to be '
  'dissatisfied have already left',
  ['It should have reported the exact number rather than a percentage',
   'A survey can never support a claim about preference',
   'It overreaches only if fewer than half of customers replied'],
  'The figure may be perfectly accurate about the group it measured. Everyone in that group chose '
  'the company and stayed with it, so it cannot speak for those who did not — the claim quietly '
  'changes the population.',
  mode='TRANSFER', hinge='A survey of a company\'s own customers')

q('GB_AD_049', 'AD_FAM15_CLAIM_EVALUATION', 'D5',
  'Two years of monthly data show a rise every December. A claim states that December always '
  'brings a rise. What would it take to support that, and what would refute it?',
  'More years would strengthen it and any December without a rise would refute it, so the claim '
  'is stated more strongly than two years can carry',
  ['Nothing further; two consecutive years establish an annual pattern',
   'It cannot be supported or refuted, since the future is unknown',
   'Only an explanation of why December differs could support it'],
  'Two observations are consistent with a pattern and with a coincidence alike, and the word '
  '"always" claims far more than that. An explanation would help but is not what the claim rests '
  'on; a single counterexample settles it outright.',
  mode='TRANSFER', hinge='A claim states that December always brings a rise')

q('GB_AD_050', 'AD_FAM15_CLAIM_EVALUATION', 'D5',
  'A dataset supports a cautious claim and a bolder one. The cautious claim will be ignored; the '
  'bolder one will be acted on but goes slightly beyond the data. What is the defensible course?',
  'State the claim the data supports and say plainly what it would take to justify the bolder one',
  ['Make the bolder claim, since a claim nobody acts on is worthless',
   'Make the cautious claim and say nothing further',
   'Make the bolder claim and note in a footnote that it is unsupported'],
  'Being ignored is a real cost, and it does not make an unsupported claim true. Naming what '
  'further evidence would license the stronger claim keeps the analysis honest and gives whoever '
  'wants to act a route to getting there.',
  mode='TRADEOFF', hinge='The cautious claim will be ignored')
