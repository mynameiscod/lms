# -*- coding: utf-8 -*-
"""
Wave 2 — APTITUDE_REASONING_SERIES, 50 Golden Bank questions.

13 come from the existing bank, every one of them remapped in from another skill, and 37 are new.

THIS SKILL RECEIVES ITS ENTIRE LEGACY POOL FROM ELSEWHERE. Phase 2.5 found that the eight
questions filed here were all step-ordering items and not one was a series, while fifteen genuine
series sat under PATTERN_RECOGNITION and five analogies under APTITUDE_REASONING_LOGIC. The two
banks had been filed the wrong way round. Thirteen of those remapped items fit a slot here; the
rest had no room left in the families they belong to.

THE HONEST FAMILY IS AS_FAM15. Two terms are consistent with infinitely many rules, so a
next-term question with too little to go on has no determinate answer — and the blueprint requires
items that ARE determined alongside it, so the family teaches discrimination rather than
scepticism. Most series questions in circulation quietly get this wrong.
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
# AS_FAM01_CONSTANT_STEP — D1 x4 (1 legacy), D2 x1 (legacy)
# =========================================================================
q('GB_AS_001', 'AS_FAM01_CONSTANT_STEP', 'D1',
  'What comes next: 3, 6, 9, 12, ?',
  '15',
  ['13', '18', '24'],
  'Each term is three more than the one before, so the next is 15. Adding one gives 13, and 18 '
  'skips a term by applying the step twice.',
  provenance='LEGACY_REMAP', source='81cc31')

q('GB_AS_002', 'AS_FAM01_CONSTANT_STEP', 'D1',
  'What comes next: 40, 35, 30, 25, ?',
  '20',
  ['30', '15', '21'],
  'The step is five downward, so the next term is 20. Answering 30 applies the step in the wrong '
  'direction, and 15 applies it twice.')

q('GB_AS_003', 'AS_FAM01_CONSTANT_STEP', 'D1',
  'What comes next: 7, 14, 21, 28, ?',
  '35',
  ['42', '29', '32'],
  'Seven is added each time, giving 35. Answering 42 goes one term too far, and 29 adds one '
  'rather than the step.')

q('GB_AS_004', 'AS_FAM01_CONSTANT_STEP', 'D1',
  'What comes next: 100, 88, 76, 64, ?',
  '52',
  ['56', '40', '76'],
  'Each term is twelve below the one before, so the next is 52. The step has to be read from the '
  'differences rather than guessed; taking it as eight would give 56.')

q('GB_AS_005', 'AS_FAM01_CONSTANT_STEP', 'D2',
  'What comes next: 2, 4, 6, 8, ?',
  '10',
  ['12', '16', '9'],
  'The step of two is constant, so the next term is 10. Answering 16 treats the series as '
  'doubling, which fits the first two terms and fails at the third.',
  provenance='LEGACY_REMAP', source='826a68')

# =========================================================================
# AS_FAM02_STEP_NAMING — D1 x3, D2 x1   (naming the rule, not continuing it)
# =========================================================================
q('GB_AS_006', 'AS_FAM02_STEP_NAMING', 'D1',
  'State the rule relating each term to the previous one in: 5, 10, 15, 20.',
  'Add 5 to the previous term',
  ['Multiply the previous term by 2',
   'Add the position number to the previous term',
   'Add 5, then add 10, then add 15'],
  'The differences are 5, 5 and 5, so one rule covers every step. Doubling fits the first pair '
  'only and fails at 15, which is what makes checking every term necessary.')

q('GB_AS_007', 'AS_FAM02_STEP_NAMING', 'D1',
  'State the rule relating each term to the previous one in: 3, 9, 27, 81.',
  'Multiply the previous term by 3',
  ['Add 6 to the previous term',
   'Add three times the position number',
   'Multiply by 3, then by 4, then by 5'],
  'Each term is three times the one before it throughout. Adding 6 works between 3 and 9 and '
  'nowhere else — an additive rule fitted to a multiplicative series always breaks at the third '
  'term.')

q('GB_AS_008', 'AS_FAM02_STEP_NAMING', 'D1',
  'State the rule relating each term to the previous one in: 64, 32, 16, 8.',
  'Halve the previous term',
  ['Subtract 32 from the previous term',
   'Subtract 32, then 16, then 8',
   'Divide by 2, then by 3, then by 4'],
  'Halving covers every step with one rule. The second option describes what happens between the '
  'first two terms only, and the third merely lists the differences without stating a rule at '
  'all.')

q('GB_AS_009', 'AS_FAM02_STEP_NAMING', 'D2',
  'Two rules are proposed for the series 1, 2, 4: "double the previous term" and "add the '
  'position number minus one". Both fit. Which is the better statement of the rule?',
  'Neither yet; three terms fitting two rules means more terms are needed to choose',
  ['Doubling, because it is simpler',
   'The position rule, because it uses the position',
   'Doubling, because it is the usual pattern in such questions'],
  'Both rules genuinely produce 1, 2, 4 — doubling gives 8 next while the other gives 7. '
  'Simplicity is a preference rather than evidence, and the honest answer is that the terms shown '
  'do not yet separate them.')

# =========================================================================
# AS_FAM03_RELATION_NAMING — D1 x3, D2 x1   (computing pairs, not general knowledge)
# =========================================================================
q('GB_AS_010', 'AS_FAM03_RELATION_NAMING', 'D1',
  'What is the relation between the pair "compiler" and "source code"?',
  'The first takes the second as its input',
  ['The second takes the first as its input',
   'Both are kinds of program',
   'The first is stored inside the second'],
  'A compiler reads source code and produces something else, so the relation runs in one '
  'direction. Both being programs is true of each separately and says nothing about the relation '
  'between them.')

q('GB_AS_011', 'AS_FAM03_RELATION_NAMING', 'D1',
  'What is the relation between the pair "file" and "folder"?',
  'The first is contained by the second',
  ['The second is contained by the first',
   'Both are stored on a disk',
   'The first is a kind of the second'],
  'A folder holds files, so containment runs from folder to file. Both living on a disk is a '
  'property each has on its own, and neither is a kind of the other.')

q('GB_AS_012', 'AS_FAM03_RELATION_NAMING', 'D1',
  'What is the relation between the pair "keyboard" and "input"?',
  'The first performs the function named by the second',
  ['The second is a kind of the first',
   'Both are parts of a computer',
   'The first is made of the second'],
  'The pair links a device to what it does. Reading it as a category relation loses the function, '
  'which is exactly what an analogy built on this pair would be preserving.')

q('GB_AS_013', 'AS_FAM03_RELATION_NAMING', 'D2',
  'The pair "backup" and "data loss" is offered as an analogy. What relation does it assert?',
  'The first is a precaution against the second',
  ['The first is a cause of the second',
   'The first is a kind of the second',
   'Both happen to storage devices'],
  'One exists to guard against the other, which is a relation of purpose rather than of cause or '
  'category. Completing an analogy on this pair means finding another precaution-and-risk pair, '
  'not another pair about storage.')

# =========================================================================
# AS_FAM04_CHANGING_STEP — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_AS_014', 'AS_FAM04_CHANGING_STEP', 'D2',
  'What comes next: 2, 6, 12, 20, ?',
  '30',
  ['28', '32', '40'],
  'The differences are 4, 6 and 8, rising by two each time, so the next difference is 10 and the '
  'next term is 30. Reusing the last difference of 8 gives 28.',
  provenance='LEGACY_REMAP', source='5d2826')

q('GB_AS_015', 'AS_FAM04_CHANGING_STEP', 'D3',
  'What comes next: 1, 4, 9, 16, ?',
  '25',
  ['23', '27', '32'],
  'The differences are 3, 5 and 7, rising by two, so the next difference is 9 and the term is 25. '
  'Reusing the last difference of 7 gives 23, and doubling the last term gives 32.',
  provenance='LEGACY_REMAP', source='808fc3')

# =========================================================================
# AS_FAM05_ANALOGY_COMPLETION — D2 (legacy), D3 (legacy)
# =========================================================================
q('GB_AS_016', 'AS_FAM05_ANALOGY_COMPLETION', 'D2',
  'Keyboard is to input as monitor is to what?',
  'Output',
  ['Storage', 'Screen', 'Program'],
  'The relation is device to function, so applying it again gives Output: a monitor sends '
  'information out. "Screen" is closely associated with a monitor and preserves no relation at '
  'all, which is the trap association sets.',
  provenance='LEGACY_REMAP', source='b45962')

q('GB_AS_017', 'AS_FAM05_ANALOGY_COMPLETION', 'D3',
  'Bird is to fly as fish is to what?',
  'Swim',
  ['Water', 'Scales', 'Ocean'],
  'The relation pairs a creature with how it moves, and applying it again gives Swim. Water, '
  'scales and ocean are all associated with fish and none of them is a way of moving.',
  provenance='LEGACY_REMAP', source='b1424f')

# =========================================================================
# AS_FAM06_ALTERNATING_SERIES — D2, D3, D4
# =========================================================================
q('GB_AS_018', 'AS_FAM06_ALTERNATING_SERIES', 'D2',
  'What comes next: 1, 10, 2, 20, 3, ?',
  '30',
  ['4', '40', '6'],
  'Two patterns are interleaved: the odd positions count 1, 2, 3 and the even ones count 10, 20, '
  '30. The next term sits in an even position, so it continues the second pattern.')

q('GB_AS_019', 'AS_FAM06_ALTERNATING_SERIES', 'D3',
  'What comes next: 5, 100, 10, 90, 15, ?',
  '80',
  ['20', '85', '75'],
  'One pattern rises by five and the other falls by ten, taking alternate positions, so the next '
  'term is 80. Answering 20 continues the wrong one of the two, which is what happens when the '
  'interleaving is missed.')

q('GB_AS_020', 'AS_FAM06_ALTERNATING_SERIES', 'D4',
  'A series reads 2, 3, 4, 9, 8, 27, 16, ?. Someone tries to fit a single rule and reports that '
  'the series is irregular. What is the next term?',
  '81',
  ['32', '64', '48'],
  'Two patterns are interleaved: one doubles — 2, 4, 8, 16 — and the other triples — 3, 9, 27. '
  'The next position belongs to the tripling pattern. Under a single-rule reading the series does '
  'look irregular, which is exactly the assumption being tested.',
  evidence='Someone tries to fit a single rule and reports that the series is irregular')

# =========================================================================
# AS_FAM07_MISSING_MIDDLE — D2, D3, D4   (both sides must be needed)
# =========================================================================
q('GB_AS_021', 'AS_FAM07_MISSING_MIDDLE', 'D2',
  'What is the missing term: 4, 8, ?, 16, 20',
  '12',
  ['10', '14', '24'],
  'The step is four throughout, and the gap sits between 8 and 16. Only 12 is consistent with '
  'both sides; 10 fits neither, and 14 would fit if the series ran in twos from a different '
  'start.')

q('GB_AS_022', 'AS_FAM07_MISSING_MIDDLE', 'D3',
  'What is the missing term: 3, 6, ?, 24, 48',
  '12',
  ['9', '18', '15'],
  'The series doubles, so the gap is twice 6 and half 24 — both sides agree on 12. Answering 9 '
  'fits an additive reading of the left side alone and collides with the right.')

q('GB_AS_023', 'AS_FAM07_MISSING_MIDDLE', 'D4',
  'What is the missing term: 2, 5, ?, 17, 26. Someone answers 10, having read the left side as '
  'rising in threes. Their answer is consistent with the left side and not with the right.',
  '10 is wrong; the term is 10 only under their rule, and the differences 3, 5, 7, 9 give 10',
  ['10, since the left side settles it',
   '11, since the differences are 3, 4, 5, 6',
   '12, since the series doubles and subtracts'],
  'The differences rise by two — 3, 5, 7, 9 — which gives 2, 5, 10, 17, 26 and fits both sides. '
  'Their answer happens to be right and their reasoning is not, which only checking against the '
  'right-hand side reveals.',
  evidence='Their answer is consistent with the left side and not with the right')

# =========================================================================
# AS_FAM08_MULTIPLICATIVE_SERIES — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_AS_024', 'AS_FAM08_MULTIPLICATIVE_SERIES', 'D2',
  'What comes next: 2, 4, 8, 16, ?',
  '32',
  ['24', '64', '18'],
  'Each term is double the one before, so the next is 32. Reusing the last difference of 8 gives '
  '24, and doubling twice gives 64.',
  provenance='LEGACY_REMAP', source='812dfa')

q('GB_AS_025', 'AS_FAM08_MULTIPLICATIVE_SERIES', 'D3',
  'What comes next: 100, 50, 25, 12.5, ?',
  '6.25',
  ['6.5', '0.125', '12.5'],
  'Each term is half the one before, so the next is 6.25. The series never reaches zero, however '
  'far it runs — halving always leaves something.',
  provenance='LEGACY_REMAP', source='5fa102')

q('GB_AS_026', 'AS_FAM08_MULTIPLICATIVE_SERIES', 'D4',
  'A series begins 3, 6. Someone continues it as 9, 12 and someone else as 12, 24. Both readings '
  'fit the two terms given. A third term of 12 is then revealed. Which reading survives?',
  'The doubling reading, since adding three would have given 9',
  ['The adding reading, since 12 is three more than 9',
   'Both, since 12 appears in each continuation',
   'Neither, since 12 is inconsistent with a series starting 3, 6'],
  'Two terms cannot separate an additive rule from a multiplicative one when the first step is '
  'the same size as the first factor. The third term is what discriminates, and 12 is what '
  'doubling produces.',
  evidence='Both readings fit the two terms given')

# =========================================================================
# AS_FAM09_POSITIONAL_SERIES — D2, D3, D4 (all legacy)
# =========================================================================
q('GB_AS_027', 'AS_FAM09_POSITIONAL_SERIES', 'D2',
  'What comes next: A, C, E, G, ?',
  'I',
  ['H', 'J', 'K'],
  'Each letter is two places further along the alphabet, so G is followed by I. Answering H moves '
  'one place instead of two.',
  provenance='LEGACY_REMAP', source='603f39')

q('GB_AS_028', 'AS_FAM09_POSITIONAL_SERIES', 'D3',
  'What comes next: Z, X, V, T, ?',
  'R',
  ['S', 'Q', 'U'],
  'The letters move two places backwards each time, so T is followed by R. Answering S moves one '
  'place, and U moves the wrong way.',
  provenance='LEGACY_REMAP', source='56fa00')

q('GB_AS_029', 'AS_FAM09_POSITIONAL_SERIES', 'D4',
  'What comes next: AB, BC, CD, DE, ? Someone answers FG, reasoning that each pair advances by '
  'one letter. Their rule is right and their answer is wrong.',
  'EF',
  ['FG', 'DF', 'EG'],
  'Each pair does advance by one letter, so the pair after DE begins with E and the answer is EF. '
  'Answering FG applies the correct rule one step too far, which a correct rule does not protect '
  'against.',
  provenance='LEGACY_REMAP', source='579837',
  evidence='Their rule is right and their answer is wrong')

# =========================================================================
# AS_FAM10_TWO_ATTRIBUTE_SERIES — D2 (legacy), D3 (legacy), D4
# =========================================================================
q('GB_AS_030', 'AS_FAM10_TWO_ATTRIBUTE_SERIES', 'D2',
  'What comes next: A1, C3, E5, G7, ?',
  'I9',
  ['H8', 'I8', 'G9'],
  'The letter advances by two and the number advances by two, each on its own rule, giving I9. '
  'Answering H8 advances both by one, and I8 gets the letter right while freezing the step of '
  'the number.',
  provenance='LEGACY_REMAP', source='b4f799')

q('GB_AS_031', 'AS_FAM10_TWO_ATTRIBUTE_SERIES', 'D3',
  'What comes next: 1A, 2B, 3C, 4D, ?',
  '5E',
  ['4E', '5D', '6F'],
  'The number and the letter each advance by one, independently. The two wrong middle options '
  'each advance one attribute and freeze the other, which is the commonest way a two-attribute '
  'series is misread.',
  provenance='LEGACY_REMAP', source='b31cf4')

q('GB_AS_032', 'AS_FAM10_TWO_ATTRIBUTE_SERIES', 'D4',
  'A series reads P2, R4, T8, V16, ?. Someone answers X18, advancing both attributes by the same '
  'kind of step. The letters and the numbers do not follow the same kind of rule. What is the '
  'next term?',
  'X32',
  ['X18', 'W32', 'X20'],
  'The letter advances two places each time, giving X, while the number doubles, giving 32. '
  'Assuming both attributes follow the same kind of rule is exactly the error — one is additive '
  'and one is multiplicative.',
  evidence='The letters and the numbers do not follow the same kind of rule')

# =========================================================================
# AS_FAM11_RULE_FITS_ALL — D3, D4
# =========================================================================
q('GB_AS_033', 'AS_FAM11_RULE_FITS_ALL', 'D3',
  'Which rule is consistent with every term of 2, 4, 8, 14, 22?',
  'The difference rises by two each time',
  ['Each term is double the previous one',
   'Each term is the previous one plus four',
   'Each term is the sum of the two before it'],
  'The differences are 2, 4, 6 and 8, rising by two throughout. Doubling holds for the first '
  'three terms and fails at 14, which is precisely why a rule has to be checked to the end.')

q('GB_AS_034', 'AS_FAM11_RULE_FITS_ALL', 'D4',
  'For the series 1, 2, 4, 8, 15, someone proposes "each term is double the previous". That rule '
  'fits every term except the last. What rule fits all five?',
  'Each term adds one more than the previous difference did, giving differences 1, 2, 4, 7',
  ['Doubling, and 15 is a misprint for 16',
   'Each term is the sum of all the terms before it',
   'Each term is the previous one plus the position number'],
  'The differences are 1, 2, 4 and 7, each rising by one more than the last. Doubling is the '
  'obvious reading and fails at exactly one term, and deciding the series is wrong rather than '
  'the rule is what the family exists to catch. Summing all previous terms would give 1, 2, 4, 8, '
  '16 — the same trap by another route.',
  evidence='That rule fits every term except the last')

# =========================================================================
# AS_FAM12_ODD_TERM — D3, D4
# =========================================================================
q('GB_AS_035', 'AS_FAM12_ODD_TERM', 'D3',
  'One term breaks the rule in 3, 6, 9, 13, 15, 18. Which is it, and what should it be?',
  '13, which should be 12',
  ['15, which should be 16', '18, which should be 21', '9, which should be 10'],
  'Every other term is a multiple of three, so 13 is the break and 12 restores it. Suspecting the '
  'last term by default is a habit worth resisting, since 18 fits perfectly.')

q('GB_AS_036', 'AS_FAM12_ODD_TERM', 'D4',
  'One term breaks the rule in 2, 4, 8, 16, 30, 64. Someone identifies 64 as the break, because '
  'it is the last term. The rule is inferable from the remaining terms alone. Which term actually '
  'breaks it?',
  '30, which should be 32',
  ['64, which should be 60', '16, which should be 12', '8, which should be 6'],
  'Five of the six terms double, so the rule is clear from them and 30 is the one that does not '
  'fit. The last term is the default suspicion and here it is entirely correct, which is what '
  'makes checking against the rule rather than the position necessary.',
  evidence='The rule is inferable from the remaining terms alone')

# =========================================================================
# AS_FAM13_COMPETING_RULES — D3, D4, D5 x3
# =========================================================================
q('GB_AS_037', 'AS_FAM13_COMPETING_RULES', 'D3',
  'The terms 1, 2, 4 fit both "double the previous" and "add one more each time". Which further '
  'term would separate the two rules?',
  'The fourth term: doubling gives 8, the other rule gives 7',
  ['The fourth term, because both rules give 8',
   'The first term, because the rules start differently',
   'No term separates them; the rules are the same'],
  'The two rules agree on everything shown and disagree from the fourth term onward, so that is '
  'where a test has to be made. A term both rules produce would tell you nothing.')

q('GB_AS_038', 'AS_FAM13_COMPETING_RULES', 'D4',
  'The terms 2, 4 are consistent with doubling and with adding two. Someone proposes revealing '
  'the fifth term to settle it. Both rules were already going to differ at the third term. What '
  'is wrong with waiting until the fifth?',
  'Nothing is wrong with it, but the third term already separates them, so four terms of '
  'information are being spent to learn what one would have shown',
  ['The fifth term is consistent with both rules, so it settles nothing',
   'The fifth term separates a third rule rather than these two',
   'Waiting is necessary, because two rules need several terms to separate'],
  'The fifth term does distinguish them, so the proposal works — it is merely wasteful. Choosing '
  'the earliest discriminating observation is what makes a test efficient rather than merely '
  'valid.',
  evidence='Both rules were already going to differ at the third term')

q('GB_AS_039', 'AS_FAM13_COMPETING_RULES', 'D5',
  'A series of four terms fits two different rules. A fifth term is revealed and fits both. What '
  'has been learned?',
  'Nothing about which rule holds; a term both rules predict cannot discriminate between them',
  ['That both rules are correct',
   'That the first rule is more likely, since it was proposed first',
   'That neither rule is correct, since neither was ruled out'],
  'An observation is informative only when the competing explanations disagree about it. A term '
  'both predict leaves the question exactly where it was, which is the same reason a test that '
  'passes under a correct and a faulty version tells you nothing.',
  mode='TRANSFER', hinge='A fifth term is revealed and fits both')

q('GB_AS_040', 'AS_FAM13_COMPETING_RULES', 'D5',
  'Two rules fit a series equally well. One is simple and one is elaborate. Is simplicity a '
  'reason to prefer the first?',
  'It is a practical preference and not evidence; only a term on which they disagree settles it',
  ['Yes; the simpler rule is always the correct one',
   'No; the elaborate rule fits more cases and is therefore better',
   'Yes; an elaborate rule that fits must have been designed to fit'],
  'Simplicity makes a rule easier to state and to use, and neither of those makes it true of the '
  'series. What decides between two rules is a term they predict differently, and until one is '
  'seen the question is genuinely open.',
  mode='TRADEOFF', hinge='One is simple and one is elaborate')

q('GB_AS_041', 'AS_FAM13_COMPETING_RULES', 'D5',
  'A series is generated by a rule nobody has stated. Three candidate rules all fit the six terms '
  'shown. How many further terms are needed to identify the true rule?',
  'It cannot be said in advance; enough terms to make every wrong candidate disagree, and a fourth '
  'rule may still fit',
  ['One, since one term rules out two of the three',
   'Two, since each term halves the candidates',
   'None; three rules fitting six terms means all three are the same rule'],
  'How many terms are needed depends on where the candidates diverge, which is not known before '
  'they are compared — and no number of terms proves a rule, since another rule can always agree '
  'so far and differ later.',
  mode='TRANSFER', hinge='Three candidate rules all fit the six terms shown')

# =========================================================================
# AS_FAM14_RULE_TRANSFER — D4, D5 x4
# =========================================================================
q('GB_AS_042', 'AS_FAM14_RULE_TRANSFER', 'D4',
  'A series runs 3, 7, 15, 31, where each term is double the previous plus one. Someone continues '
  'that series instead of applying its rule elsewhere. Starting from 5 and using the same rule, '
  'what is the third term?',
  '23',
  ['63', '11', '21'],
  'From 5 the rule gives 11 and then 23. Answering 63 continues the original series rather than '
  'applying its rule to the new start, and 11 stops at the second term.',
  evidence='Someone continues that series instead of applying its rule elsewhere')

q('GB_AS_043', 'AS_FAM14_RULE_TRANSFER', 'D5',
  'A series runs 2, 6, 18, 54. Applying the same rule to a first term of 5, what is the fourth '
  'term?',
  '135',
  ['162', '20', '45'],
  'The rule is to triple, so from 5 the terms are 5, 15, 45 and 135. Answering 45 stops at the '
  'third term, and 162 continues the original series.',
  mode='TRANSFER', hinge='Applying the same rule to a first term of 5')

q('GB_AS_044', 'AS_FAM14_RULE_TRANSFER', 'D5',
  'A series runs 10, 8, 6, 4. Applying the same rule to a first term of 3, what are the next two '
  'terms?',
  '1 and -1',
  ['1 and 0', '5 and 7', '1, and then the series stops'],
  'The rule subtracts two each time and nothing about it stops at zero, so from 3 the series goes '
  '1 and then -1. Assuming a rule halts when it would leave familiar territory is an assumption '
  'the rule never made.',
  mode='EDGE', hinge='Applying the same rule to a first term of 3')

q('GB_AS_045', 'AS_FAM14_RULE_TRANSFER', 'D5',
  'A rule inferred from a series of whole numbers is applied to a first term of 0.5. Does the '
  'rule still work?',
  'It depends on the rule: adding or multiplying works, but a rule that referred to properties of '
  'whole numbers may not',
  ['Yes; a rule works on any starting value',
   'No; rules inferred from whole numbers apply only to whole numbers',
   'Yes, but the results must be rounded to whole numbers'],
  'A rule stated as arithmetic transfers to any number the arithmetic accepts. A rule stated in '
  'terms like "the next prime" or "add the number of digits" has no meaning for a fraction, so '
  'what transfers depends on how the rule was expressed.',
  mode='TRANSFER', hinge='is applied to a first term of 0.5')

q('GB_AS_046', 'AS_FAM14_RULE_TRANSFER', 'D5',
  'Two people infer different rules from the same series and both apply their rule to a new '
  'starting term, getting different answers. Both rules fit the original series exactly. Who is '
  'right?',
  'Neither is established; the original series never settled which rule generated it',
  ['The one whose rule is simpler',
   'The one whose answer is a whole number',
   'Both, since both rules fit the original series'],
  'Fitting the terms shown is a much weaker claim than being the rule behind them, and transfer '
  'is exactly where two rules that agreed part company. The disagreement reveals the ambiguity '
  'rather than creating it.',
  mode='TRANSFER', hinge='Both rules fit the original series exactly')

# =========================================================================
# AS_FAM15_UNDERDETERMINED — D4, D5 x3   (some series ARE determined)
# =========================================================================
q('GB_AS_047', 'AS_FAM15_UNDERDETERMINED', 'D4',
  'A question shows only the terms 1, 2 and asks for the next. Someone answers 3 with confidence. '
  'Only two terms are given. Is the next term determined?',
  'No; 1, 2 is consistent with adding one, with doubling, and with many other rules',
  ['Yes; 3, because the step is one',
   'Yes; 4, because the series doubles',
   'No, because the terms given are too small to reveal a pattern'],
  'Two terms fix one difference and one ratio at once, so they cannot distinguish an additive rule '
  'from a multiplicative one. Confidence here comes from a convention about what such questions '
  'usually mean, not from the terms.',
  evidence='Only two terms are given')

q('GB_AS_048', 'AS_FAM15_UNDERDETERMINED', 'D5',
  'A question shows 4, 8, 12, 16 and asks for the next term. Is it determined?',
  'It is determined under any rule consistent with all four terms, and every plausible one gives 20',
  ['No; four terms can never determine a fifth',
   'Yes; four terms always determine the next',
   'No; the terms are consistent with doubling as well'],
  'Doubling fails immediately at the third term, and the constant step of four fits throughout, so '
  'the reading is not seriously in doubt. Enough terms can settle a series in practice — which is '
  'why the honest answer is not always that nothing is determined.',
  mode='EDGE', hinge='A question shows 4, 8, 12, 16 and asks for the next term')

q('GB_AS_049', 'AS_FAM15_UNDERDETERMINED', 'D5',
  'Someone argues that no series question has a determinate answer, since some rule can always be '
  'found to give any next term. Is the argument sound?',
  'It is technically true and practically useless; the question is which rule the terms make '
  'reasonable, not which is conceivable',
  ['Yes; therefore all such questions are unanswerable',
   'No; only one rule can ever fit a given set of terms',
   'No; a rule fitted after the fact is not a real rule'],
  'A rule can indeed be constructed to produce any continuation, so strictly nothing is forced. '
  'What the terms do is make some rules simple and consistent and others contrived, and that is '
  'the judgement such a question actually asks for.',
  mode='TRANSFER', hinge='no series question has a determinate answer')

q('GB_AS_050', 'AS_FAM15_UNDERDETERMINED', 'D5',
  'A test writer must choose between a series of three terms and the same series shown with six. '
  'The three-term version is quicker to read. What does each choice cost?',
  'Three terms may admit several rules and make the item ambiguous; six take longer and leave the '
  'intended rule genuinely determined',
  ['Three terms are always sufficient, so the longer version wastes the reader\'s time',
   'Six terms are always necessary, so the shorter version is never acceptable',
   'Neither costs anything; the answer is the same either way'],
  'Brevity and determinacy pull against each other here. Enough terms to exclude the rival '
  'readings is what makes the item answerable, and how many that takes depends on which rules the '
  'early terms happen to admit.',
  mode='TRADEOFF', hinge='a series of three terms and the same series shown with six')
