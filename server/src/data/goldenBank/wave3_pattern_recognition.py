# -*- coding: utf-8 -*-
"""
Wave 3 — PATTERN_RECOGNITION, 50 Golden Bank questions.

2 come from the existing bank and 48 are new.

THIS SKILL SENT FIFTEEN QUESTIONS AWAY AND KEPT THREE. Phase 2.5 found that most of what was
filed here was numeric and letter series, which belongs to APTITUDE_REASONING_SERIES; what remains
here is repeating units, symmetry, transformations of an arrangement, movement on a grid and
structure shared across different content. Two of the three survivors fit a slot.

EVERY ARRANGEMENT IS WRITTEN OUT, never drawn. A grid is given as occupied coordinates and a
sequence as characters, because an item that depends on estimating a picture cannot be answered
reliably from text and cannot be checked afterwards.
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
# PR_FAM01_REPEAT_UNIT — D1 x4, D2 x1   (shortest unit is what makes one answer correct)
# =========================================================================
q('GB_PR_001', 'PR_FAM01_REPEAT_UNIT', 'D1',
  'A sequence reads x y x y x y. What is the shortest unit that repeats?',
  'x y',
  ['x y x y', 'x', 'x y x'],
  'Two symbols repeat three times, and no shorter unit does. The four-symbol unit repeats too, '
  'which is why the question asks for the shortest.')

q('GB_PR_002', 'PR_FAM01_REPEAT_UNIT', 'D1',
  'A sequence reads p q r p q r p q r. Which unit, repeated, produces it, taken as short as '
  'possible?',
  'p q r',
  ['p q r p q r', 'p q', 'p'],
  'Three symbols repeat throughout. A two-symbol unit fits the opening and then fails, which is '
  'the shape of a unit inferred from the start alone.')

q('GB_PR_003', 'PR_FAM01_REPEAT_UNIT', 'D1',
  'This sequence is built by repeating a single unit: a a b a a b a a b. Taken as short as it '
  'can be, what is that unit?',
  'a a b',
  ['a b', 'a a', 'a a b a a b'],
  'The unit a a b is three symbols long and includes the doubled opening symbol. Taking a b '
  'instead would produce a b a b, which is not what is shown.')

q('GB_PR_004', 'PR_FAM01_REPEAT_UNIT', 'D1',
  'A sequence reads m n n m n n m n n. How long is the shortest repeating unit?',
  'Three symbols',
  ['Two symbols', 'Six symbols', 'One symbol'],
  'The sequence is built from m n n repeated three times, so the shortest unit is Three symbols '
  'long. Six symbols also repeat, being twice the shortest unit rather than the unit itself.')

q('GB_PR_005', 'PR_FAM01_REPEAT_UNIT', 'D2',
  'A sequence reads d e d e d e d. Does it have a repeating unit, and if so what is it?',
  'Yes, d e; the sequence stops part way through a repetition',
  ['No; the sequence does not divide evenly into units',
   'Yes, d e d; the last symbol proves the unit is three long',
   'Yes, d; every symbol is either d or e'],
  'A pattern may be cut short without ceasing to be a pattern, so ending mid-unit changes '
  'nothing. Reading the trailing d as evidence of a three-symbol unit contradicts the rest of the '
  'sequence.')

# =========================================================================
# PR_FAM02_SYMMETRY_RECOGNITION — D1 x3, D2 x1
# =========================================================================
q('GB_PR_006', 'PR_FAM02_SYMMETRY_RECOGNITION', 'D1',
  'Is the arrangement a b c b a symmetric, and about what?',
  'Yes, about its middle symbol',
  ['No; the symbols are not all the same',
   'Yes, about its first symbol',
   'No; a symmetric arrangement must have an even number of symbols'],
  'Reading it from either end gives the same sequence, with c at the centre. An odd count is '
  'perfectly compatible with symmetry — it simply leaves one symbol in the middle.')

q('GB_PR_007', 'PR_FAM02_SYMMETRY_RECOGNITION', 'D1',
  'Is the arrangement p q p q symmetric?',
  'No; reading it backwards gives q p q p',
  ['Yes; it repeats regularly',
   'Yes; it is symmetric about the gap in the middle',
   'Yes; both halves contain the same symbols'],
  'Repetition and symmetry are different properties, and this arrangement has the first without '
  'the second. Containing the same symbols in each half is not the same as reading alike in both '
  'directions.')

q('GB_PR_008', 'PR_FAM02_SYMMETRY_RECOGNITION', 'D1',
  'Is the arrangement w x y x w symmetric?',
  'Yes; the first and last match, and so do the second and fourth',
  ['No; the middle symbol has no partner',
   'No; five symbols cannot be symmetric',
   'Yes; every symbol appears twice'],
  'Symmetry requires each symbol to match its partner counting inward from the ends, and the '
  'middle symbol needs none. The symbol y appears once, which is exactly what a centre looks '
  'like.')

q('GB_PR_009', 'PR_FAM02_SYMMETRY_RECOGNITION', 'D2',
  'An arrangement reads r s t s r except that one position has been changed, giving r s t r r. Is '
  'it still symmetric?',
  'No; the fourth position no longer matches the second',
  ['Yes; the ends still match',
   'Yes; only one position changed',
   'No; symmetry requires all symbols to differ'],
  'Symmetry has to hold at every pair, so a single mismatched position breaks it however much of '
  'the rest survives. The ends matching is necessary and not sufficient.')

# =========================================================================
# PR_FAM03_TRANSFORMATION_NAMING — D1 x3, D2 x1   (input deliberately not symmetric)
# =========================================================================
q('GB_PR_010', 'PR_FAM03_TRANSFORMATION_NAMING', 'D1',
  'An arrangement a b c becomes c b a. Which transformation is that?',
  'A mirror',
  ['A shift', 'A repetition', 'No transformation; the two are the same'],
  'A mirror is what reverses the order. A shift would move every symbol along and bring one '
  'round to the other end, which gives a different result.')

q('GB_PR_011', 'PR_FAM03_TRANSFORMATION_NAMING', 'D1',
  'An arrangement a b c d becomes d a b c. Which transformation is that?',
  'A shift, with the last symbol brought to the front',
  ['A mirror', 'A swap of the two ends', 'A sort into reverse order'],
  'Every symbol has moved one place along and the one that fell off the end has come round. '
  'Mirroring would have given d c b a, which is not what is shown.')

q('GB_PR_012', 'PR_FAM03_TRANSFORMATION_NAMING', 'D1',
  'An arrangement a b c d becomes a c b d. Which transformation is that?',
  'A swap of the two middle symbols',
  ['A mirror', 'A shift', 'A half-turn'],
  'A swap of the two middle symbols is all that has happened: only those two moved, and they '
  'exchanged places. A mirror or a shift would have moved the outer symbols too.')

q('GB_PR_013', 'PR_FAM03_TRANSFORMATION_NAMING', 'D2',
  'Someone says an arrangement was mirrored, and someone else says it was given a half-turn. The '
  'arrangement is a b b a and both descriptions produce it. What follows?',
  'The two cannot be told apart on this input, because it is symmetric',
  ['One of the two must be wrong',
   'A mirror and a half-turn are the same transformation',
   'The arrangement was not transformed at all'],
  'Two different transformations agree on an input that is already symmetric, so this input '
  'cannot distinguish them. Testing on an arrangement that is not symmetric is what would settle '
  'it.')

# =========================================================================
# PR_FAM04_POSITION_PREDICTION — D2 (legacy), D3
# =========================================================================
q('GB_PR_014', 'PR_FAM04_POSITION_PREDICTION', 'D2',
  'A sequence repeats the unit triangle circle, beginning triangle circle triangle circle '
  'triangle. What comes next?',
  'circle',
  ['triangle', 'square', 'The sequence ends here'],
  'Five symbols have been shown and the unit is two long, so the sixth completes the third '
  'repetition. Nothing new enters a repeating sequence.',
  provenance='LEGACY_KEEP', source='58366e')

q('GB_PR_015', 'PR_FAM04_POSITION_PREDICTION', 'D3',
  'A sequence repeats the unit a b c. What is at position 10, counting the first symbol as '
  'position 0?',
  'b',
  ['a', 'c', 'It cannot be found without writing the sequence out'],
  'Position 10 divided by the unit length of 3 leaves a remainder of 1, and the symbol at that '
  'place in the unit is b . Counting from one instead would give a, which is the neighbouring '
  'answer.')

# =========================================================================
# PR_FAM05_STRUCTURAL_ODD_ONE — D2, D3   (content varies throughout)
# =========================================================================
q('GB_PR_016', 'PR_FAM05_STRUCTURAL_ODD_ONE', 'D2',
  'Four arrangements: a a b, m m n, p p q, r s s. Which has a different structure?',
  'r s s',
  ['a a b', 'm m n', 'p p q'],
  'Three of them double the first symbol and end with a different one; the fourth doubles the '
  'second. The letters differ throughout, so only the structure can decide it.')

q('GB_PR_017', 'PR_FAM05_STRUCTURAL_ODD_ONE', 'D3',
  'Four arrangements: x y x, k l k, d e d, f g h. Which has a different structure?',
  'f g h',
  ['x y x', 'k l k', 'd e d'],
  'Three arrangements return to their opening symbol and one does not. Every arrangement uses '
  'different letters, so content cannot be the discriminator.')

# =========================================================================
# PR_FAM06_ROTATION_RESULT — D2, D3, D4   (grid given as coordinates)
# =========================================================================
q('GB_PR_018', 'PR_FAM06_ROTATION_RESULT', 'D2',
  'On a two-by-two grid with positions named top-left, top-right, bottom-right, bottom-left, one '
  'mark sits at top-left. After a quarter turn clockwise, where is it?',
  'Top-right',
  ['Bottom-left', 'Bottom-right', 'Top-left, unchanged'],
  'A quarter turn clockwise moves each corner to the next one round in that direction. Answering '
  'bottom-left turns it the other way.')

q('GB_PR_019', 'PR_FAM06_ROTATION_RESULT', 'D3',
  'On the same grid, marks sit at top-left and bottom-right. After a quarter turn clockwise, where '
  'are they?',
  'Top-right and bottom-left',
  ['Top-left and bottom-right, unchanged',
   'Bottom-left and top-right, which is a quarter turn the other way',
   'Top-left and bottom-left'],
  'Each mark moves to the next corner clockwise, so the pair moves from one diagonal to the '
  'other. The second and third options name the same pair of corners, which is why the direction '
  'has to be reasoned about rather than recognised.')

q('GB_PR_020', 'PR_FAM06_ROTATION_RESULT', 'D4',
  'A mark at top-left is given a quarter turn clockwise, then another, then another. Someone says '
  'three quarter turns leave it where it started. Where is it in fact?',
  'Bottom-left',
  ['Top-left, as they said', 'Top-right', 'Bottom-right'],
  'Three quarter turns is a three-quarter turn, which lands one corner short of a full circle. '
  'Four would return it to the start, which is what the claim confuses it with.',
  evidence='Someone says three quarter turns leave it where it started')

# =========================================================================
# PR_FAM07_REFLECTION_RESULT — D2, D3, D4
# =========================================================================
q('GB_PR_021', 'PR_FAM07_REFLECTION_RESULT', 'D2',
  'A row reads a b c d. It is mirrored about a vertical line down its middle. What does it read '
  'afterwards?',
  'd c b a',
  ['a b c d, unchanged', 'b a d c', 'd a b c'],
  'Mirroring about a vertical line exchanges the ends and works inward, reversing the order to '
  'give d c b a . Exchanging only adjacent pairs would give b a d c.')

q('GB_PR_022', 'PR_FAM07_REFLECTION_RESULT', 'D3',
  'On a two-by-two grid a mark sits at top-left. It is mirrored about a vertical line down the '
  'middle. Where is it?',
  'Top-right',
  ['Bottom-left', 'Bottom-right', 'Top-left, unchanged'],
  'A vertical mirror exchanges left and right and leaves top and bottom alone. Answering '
  'bottom-left mirrors about a horizontal line instead.')

q('GB_PR_023', 'PR_FAM07_REFLECTION_RESULT', 'D4',
  'An arrangement is mirrored about a vertical line, and the result is mirrored about the same '
  'line again. Someone expects a different arrangement each time. What is the final result?',
  'The original arrangement, unchanged',
  ['The mirrored arrangement',
   'An arrangement mirrored about a horizontal line',
   'An arrangement turned by a quarter'],
  'Mirroring twice about the same line undoes itself, whatever the arrangement was. Expecting '
  'each transformation to change things again treats the operations as accumulating when they '
  'cancel.',
  evidence='Someone expects a different arrangement each time')

# =========================================================================
# PR_FAM08_MOVEMENT_TRACKING — D2 (legacy), D3, D4
# =========================================================================
q('GB_PR_024', 'PR_FAM08_MOVEMENT_TRACKING', 'D2',
  'Facing north, a person turns right. Which direction are they now facing?',
  'East',
  ['West', 'South', 'North'],
  'A right turn from north faces east. Answering west turns the other way, and south would need '
  'two turns.',
  provenance='LEGACY_KEEP', source='d2dc38')

q('GB_PR_025', 'PR_FAM08_MOVEMENT_TRACKING', 'D3',
  'Starting at a point, a marker moves 3 steps east and then 2 steps west. Where is it relative to '
  'where it began?',
  '1 step east',
  ['5 steps east', '1 step west', 'Back where it began'],
  'Movements in opposite directions partly cancel, leaving the difference. Adding both distances '
  'together ignores the directions entirely.')

q('GB_PR_026', 'PR_FAM08_MOVEMENT_TRACKING', 'D4',
  'Facing north, a marker moves 2 steps forward, turns right, and moves 2 steps forward. Someone '
  'says it has moved 4 steps north. The turn happens between the two moves. Where is it?',
  '2 steps north and 2 steps east of where it began',
  ['4 steps north', '4 steps east', 'Back where it began'],
  'The turn changes what "forward" means, so the two moves go in different directions. Summing '
  'the distances without accounting for the turn is exactly the error the claim makes.',
  evidence='The turn happens between the two moves')

# =========================================================================
# PR_FAM09_NESTED_PATTERN — D2, D3, D4
# =========================================================================
q('GB_PR_027', 'PR_FAM09_NESTED_PATTERN', 'D2',
  'A sequence reads a a b b a a b b. It has an inner pattern of doubled symbols and an outer '
  'pattern alternating between a and b. What comes next?',
  'a',
  ['b', 'a a', 'b b'],
  'The doubled b has just completed, so the outer pattern moves on to a and its first copy comes '
  'next. Answering b continues the inner doubling one step too far.')

q('GB_PR_028', 'PR_FAM09_NESTED_PATTERN', 'D3',
  'A sequence reads x y y x y y x. The outer pattern places an x and the inner pattern follows it '
  'with two y symbols. What are the next two?',
  'y y',
  ['x y', 'y x', 'x x'],
  'An x has just been placed, so the inner pattern supplies its two y symbols before the outer '
  'pattern comes round again. Continuing the outer pattern first applies the two rules in the '
  'wrong order.')

q('GB_PR_029', 'PR_FAM09_NESTED_PATTERN', 'D4',
  'A sequence reads p q q r p q q r. Someone continues it as p q q r p q q r p, which continues '
  'the outer pattern. The question asks what comes next at the inner level. What is the answer?',
  'q, because the inner pattern follows each p with two q symbols',
  ['p, continuing the outer pattern',
   'r, because the unit ends with r',
   'Nothing; the inner pattern has no next element'],
  'Two patterns are running at once, and the question names which one it is asking about. '
  'Continuing the outer pattern is a correct answer to a different question, which is what makes '
  'reading the question part of the work.',
  evidence='The question asks what comes next at the inner level')

# =========================================================================
# PR_FAM10_STRUCTURE_STATEMENT — D2, D3, D4
# =========================================================================
q('GB_PR_030', 'PR_FAM10_STRUCTURE_STATEMENT', 'D2',
  'Three arrangements: a b a, c d c, e f e. What structural rule do they all satisfy?',
  'The first and third symbols are the same and the middle one differs',
  ['They all contain the letters a, b and c',
   'They are all three symbols long',
   'They all begin with a vowel'],
  'The rule has to hold for every arrangement and describe the arrangement rather than its '
  'contents. Being three symbols long is true and too weak to distinguish them from anything '
  'else of that length.')

q('GB_PR_031', 'PR_FAM10_STRUCTURE_STATEMENT', 'D3',
  'Three arrangements: m m n p, k k l q, r r s t. What structural rule do they all satisfy?',
  'The first symbol is doubled, and the remaining two differ from it and from each other',
  ['They all begin with a consonant',
   'The first two symbols are the same',
   'They are all four symbols long'],
  'Saying only that the first two match is true and misses that the last two are distinct, which '
  'is also common to all three. A rule that is true and incomplete describes more arrangements '
  'than the ones shown.')

q('GB_PR_032', 'PR_FAM10_STRUCTURE_STATEMENT', 'D4',
  'Three arrangements: a b b a, m n n m, x y y x. Someone states the rule as "the first and last '
  'symbols match". That is true of all three. Why is it not the best statement of the rule?',
  'It is weaker than the arrangements support; the middle pair also matches, and the arrangements '
  'are fully symmetric',
  ['It is false for one of the three',
   'It is stronger than the arrangements support',
   'It describes the content rather than the structure'],
  'The proposed rule holds and admits arrangements the examples do not include, such as a b c a. '
  'Stating the strongest rule the examples support is what makes it a description of these '
  'arrangements rather than of a wider family.',
  evidence='That is true of all three')

# =========================================================================
# PR_FAM11_MULTI_ATTRIBUTE_PATTERN — D3, D4
# =========================================================================
q('GB_PR_033', 'PR_FAM11_MULTI_ATTRIBUTE_PATTERN', 'D3',
  'Items are described by shape and size: small circle, large circle, small square, large square, '
  'small circle. What comes next?',
  'Large circle',
  ['Small square', 'Large square', 'Small circle'],
  'The size alternates small and large on every item while the shape changes every two items, and '
  'the sequence has just returned to its start. Each wrong option continues one attribute and '
  'freezes or misreads the other.')

q('GB_PR_034', 'PR_FAM11_MULTI_ATTRIBUTE_PATTERN', 'D4',
  'Items vary in colour and count: one red, two blue, three red, four blue, five red. Someone '
  'answers six red, continuing the count and freezing the colour. Both attributes follow their own '
  'rule. What comes next?',
  'Six blue',
  ['Six red', 'Five blue', 'Seven blue'],
  'The count rises by one each time and the colour alternates, so both move together. Freezing '
  'one attribute while advancing the other is the commonest way a two-attribute pattern is '
  'misread.',
  evidence='Both attributes follow their own rule')

# =========================================================================
# PR_FAM12_GROWTH_COUNTING — D3, D4
# =========================================================================
q('GB_PR_035', 'PR_FAM12_GROWTH_COUNTING', 'D3',
  'A growing arrangement has 1 element at stage 1, 3 at stage 2, 5 at stage 3 and 7 at stage 4. '
  'How many at stage 10?',
  '19',
  ['9', '17', '20'],
  'Each stage adds two, so the count is twice the stage number less one, giving 19 at stage 10. '
  'Answering 9 reports the stage-5 count, and 17 stops one stage short.')

q('GB_PR_036', 'PR_FAM12_GROWTH_COUNTING', 'D4',
  'A growing arrangement has 2 elements at stage 1, 6 at stage 2, 12 at stage 3 and 20 at stage 4. '
  'Someone continues by adding the last increment of 8 again. The increments are 4, 6 and 8, which '
  'themselves grow. How many elements at stage 6?',
  '42',
  ['28', '36', '30'],
  'The increments rise by two each time, so stage 5 adds 10 and stage 6 adds 12, giving 30 and '
  'then 42. Reusing the last increment gives 28, which is what continuing by the difference '
  'rather than by the rule produces.',
  evidence='The increments are 4, 6 and 8, which themselves grow')

# =========================================================================
# PR_FAM13_BREAK_LOCATION — D3, D4, D5 x3
# =========================================================================
q('GB_PR_037', 'PR_FAM13_BREAK_LOCATION', 'D3',
  'A sequence built from the unit a b c reads a b c a b c a c c a b c. Where is the break, and '
  'what should be there?',
  'The eighth symbol, which should be b rather than c',
  ['The ninth symbol, which should be b',
   'The seventh symbol, which should be b',
   'The last symbol, which should be a'],
  'The unit repeats cleanly except in the third repetition, where the middle symbol is wrong. '
  'Naming the position after the break is the commonest slip, because that is where the sequence '
  'first looks unfamiliar.')

q('GB_PR_038', 'PR_FAM13_BREAK_LOCATION', 'D4',
  'A sequence reads m n m n m m m n m n. Someone identifies the last symbol as the break, on the '
  'grounds that it is where they stopped reading. The rule is inferable from the unbroken part '
  'alone. Where is the break?',
  'The sixth symbol, which should be n rather than m',
  ['The last symbol, as they said',
   'The fifth symbol, which should be n',
   'The seventh symbol, which should be n'],
  'The unit m n repeats throughout except for one extra m in the middle, and the sequence resumes '
  'correctly afterwards. Suspecting the end by default is a habit worth resisting, since the '
  'closing symbols here fit perfectly.',
  evidence='The rule is inferable from the unbroken part alone')

q('GB_PR_039', 'PR_FAM13_BREAK_LOCATION', 'D5',
  'A sequence contains exactly one break. Two different rules each fit the unbroken part, and they '
  'disagree about which symbol is the break. What follows?',
  'The break cannot be located until the rule is settled, and the sequence shown does not settle '
  'it',
  ['Whichever rule is simpler identifies the true break',
   'Both breaks are genuine, since both rules fit',
   'The sequence contains no break after all'],
  'A break is a deviation from a rule, so it has no location until the rule is fixed. Two rules '
  'fitting equally well is exactly the situation where more of the sequence is needed rather than '
  'a preference between them.',
  mode='TRANSFER', hinge='Two different rules each fit the unbroken part')

q('GB_PR_040', 'PR_FAM13_BREAK_LOCATION', 'D5',
  'A sequence has a break at its very first symbol. Why is that harder to detect than a break in '
  'the middle?',
  'The rule is inferred from what is read first, so a wrong opening symbol is taken as part of the '
  'rule',
  ['A break at the start is not a break at all',
   'The first symbol has no predecessor to compare with',
   'It is not harder; every position is equally visible'],
  'Reading a sequence builds an expectation from its opening, so a fault there is absorbed into '
  'the expectation rather than measured against it. The lack of a predecessor is a real point and '
  'not the reason — a break in the second symbol has a predecessor and is also easy to absorb.',
  mode='TRANSFER', hinge='a break at its very first symbol')

q('GB_PR_041', 'PR_FAM13_BREAK_LOCATION', 'D5',
  'A long sequence contains one break. Checking every position takes time; checking only where the '
  'sequence "looks wrong" is quick. What does the quick approach risk?',
  'Missing a break that the reader\'s own expectation has absorbed, and stopping at a position that '
  'merely follows the break',
  ['Nothing; a break is always visible where it occurs',
   'Finding too many breaks rather than too few',
   'Taking longer than checking every position'],
  'Where a sequence looks wrong is often one position after where it went wrong, and a break the '
  'reader has already fitted into their rule never looks wrong at all. The quick approach is '
  'often right and its failures are systematic rather than random.',
  mode='TRADEOFF', hinge='checking only where the sequence "looks wrong" is quick')

# =========================================================================
# PR_FAM14_STRUCTURE_TRANSFER — D4, D5 x4   (content differs completely)
# =========================================================================
q('GB_PR_042', 'PR_FAM14_STRUCTURE_TRANSFER', 'D4',
  'An arrangement of letters reads a b b a. Which arrangement of numbers shares its structure? The '
  'content shares nothing with the original.',
  '7 4 4 7',
  ['7 4 7 4', '7 7 4 4', '7 4 4 9'],
  'The structure is first and last matching with a matched pair inside, and only one option has '
  'it. Each other option is a plausible four-item arrangement with a different structure.',
  evidence='The content shares nothing with the original')

q('GB_PR_043', 'PR_FAM14_STRUCTURE_TRANSFER', 'D5',
  'A sequence of colours reads red red blue. Which sequence of words shares its structure?',
  'up up down',
  ['up down down', 'up down up', 'up up up'],
  'The structure is a doubled first item followed by a different one, and only one option matches '
  'it. Recognising a structure across entirely different content is what makes it a structure '
  'rather than a description of the items.',
  mode='TRANSFER', hinge='Which sequence of words shares its structure')

q('GB_PR_044', 'PR_FAM14_STRUCTURE_TRANSFER', 'D5',
  'A sequence of sizes reads small large small large. Which of these shares its structure?',
  'A sequence of numbers reading 2 9 2 9',
  ['A sequence of numbers reading 2 9 9 2',
   'A sequence of numbers reading 2 2 9 9',
   'A sequence of sizes reading small small large large'],
  'The structure is two items alternating, and only one option alternates. The last option shares '
  'the original\'s content entirely and has a different structure, which is exactly the trap.',
  mode='TRANSFER', hinge='Which of these shares its structure')

q('GB_PR_045', 'PR_FAM14_STRUCTURE_TRANSFER', 'D5',
  'Two arrangements share a structure. Does that mean they will behave the same way when the same '
  'rule is applied to each?',
  'Yes for any rule that depends only on the structure, and not for one that depends on the '
  'content',
  ['Yes, in every case',
   'No; sharing a structure says nothing about behaviour',
   'Yes, provided the two use the same kind of item'],
  'A rule about positions and repetitions sees only the structure and treats the two identically. '
  'A rule that asks which item is larger, or which comes first alphabetically, reaches past the '
  'structure into the content.',
  mode='TRANSFER', hinge='when the same rule is applied to each')

q('GB_PR_046', 'PR_FAM14_STRUCTURE_TRANSFER', 'D5',
  'Recognising structure across different content is useful and can mislead. When does it mislead?',
  'When the shared structure is superficial and the content is what the problem actually turns on',
  ['Never; shared structure always means shared behaviour',
   'Whenever the two contents are of different kinds',
   'Whenever the arrangements have different lengths'],
  'Seeing that two problems have the same shape is what lets a solution transfer, and it fails '
  'exactly when the shape was not the important thing. Different kinds of content and different '
  'lengths are not themselves obstacles.',
  mode='TRADEOFF', hinge='Recognising structure across different content is useful and can mislead')

# =========================================================================
# PR_FAM15_COMPETING_STRUCTURE — D4, D5 x3
# =========================================================================
q('GB_PR_047', 'PR_FAM15_COMPETING_STRUCTURE', 'D4',
  'A sequence reads a b a b. It fits both "a and b alternating" and "the unit a b repeated". '
  'Someone says the two are different structures that happen to agree. What would distinguish '
  'them?',
  'Nothing; on this kind of sequence the two descriptions are the same structure in different '
  'words',
  ['A longer sequence would separate them',
   'A sequence starting with b would separate them',
   'The two disagree from the fifth symbol onward'],
  'Alternating two symbols and repeating a two-symbol unit describe identical sequences, so no '
  'continuation can separate them. Recognising that two descriptions are one structure is as '
  'useful as separating two that genuinely differ.',
  evidence='Someone says the two are different structures that happen to agree')

q('GB_PR_048', 'PR_FAM15_COMPETING_STRUCTURE', 'D5',
  'A sequence reads a b b a. It fits both "symmetric about its middle" and "the unit a b followed '
  'by that unit mirrored". What continuation would distinguish the two?',
  'A longer sequence: symmetry constrains the whole arrangement, while a mirrored-unit rule '
  'predicts a b b a a b b a',
  ['No continuation can distinguish them',
   'A shorter sequence would distinguish them',
   'Changing the letters would distinguish them'],
  'The two agree on what has been shown and make different predictions about what follows, so the '
  'continuation is where they part. Changing the content leaves both structures intact and '
  'settles nothing.',
  mode='TRANSFER', hinge='What continuation would distinguish the two')

q('GB_PR_049', 'PR_FAM15_COMPETING_STRUCTURE', 'D5',
  'Two structures fit an arrangement, and one is much simpler to state. Is simplicity a reason to '
  'prefer it?',
  'It is a practical preference and not evidence; only an observation the two disagree about '
  'settles it',
  ['Yes; the simpler structure is always the real one',
   'No; the more detailed structure explains more and is better',
   'Yes; a simpler structure is easier to test'],
  'Simplicity makes a structure easier to state and to use, and neither of those makes it the one '
  'behind the arrangement. What decides between two structures is a case they predict '
  'differently.',
  mode='TRADEOFF', hinge='one is much simpler to state')

q('GB_PR_050', 'PR_FAM15_COMPETING_STRUCTURE', 'D5',
  'Someone proposes extending an arrangement to test which of two structures holds, and chooses an '
  'extension both structures predict. What has the test achieved?',
  'Nothing; an observation both structures predict cannot tell them apart',
  ['It has confirmed both structures',
   'It has confirmed the simpler structure',
   'It has ruled out any third structure'],
  'A test is informative only where the competing explanations disagree, and this one was chosen '
  'where they agree. It is the same reasoning as choosing a test input that a correct and a '
  'faulty program would answer identically.',
  mode='TRANSFER', hinge='chooses an extension both structures predict')
