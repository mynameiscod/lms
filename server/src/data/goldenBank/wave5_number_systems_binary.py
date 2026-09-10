# -*- coding: utf-8 -*-
"""
Wave 5 — NUMBER_SYSTEMS_BINARY, 50 Golden Bank questions, all newly authored.

THE ARITHMETIC IS DELIBERATELY TINY AND THE REASONING IS NOT. Every conversion here is four to
nine bits, every addition is at most five columns, and every widths question uses a number a
student can hold in their head. A question that is hard because the sum is long measures
patience; this skill is worth measuring because students carry two specific wrong models — that
the count of values a width holds is its largest value, and that Boolean-looking digits obey
arithmetic they have already learned.

TWO FAMILIES WOULD MEASURE NOTHING IF THEIR STEMS WERE CARELESS. A binary-to-decimal item whose
stem happens to be a palindrome cannot catch a student reading the weights backwards, so no stem
in that family is one. A binary addition with no column where both numbers hold a 1 agrees with a
plain bitwise OR, so every addition stem has at least one such column and OR is offered as an
option throughout.

THE POWER-OF-TWO BOUNDARY IS WHERE THIS SKILL IS DECIDED. "0 to 256 inclusive" needs nine bits,
not eight, and "1 to 16" needs five unless the stored value is offset. Both appear, because a
student who has learned 2^n as a slogan gets them wrong and a student who understands the range
does not.
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
# NS_FAM01_LEGAL_DIGITS — D1 x4, D2 x1
# =========================================================================
q('GB_NS_001', 'NS_FAM01_LEGAL_DIGITS', 'D1',
  'A number is written as 1021 with no base stated. Which base can it certainly not be in?',
  'Base 2',
  ['Base 8', 'Base 10', 'Base 16'],
  'Base 2 allows only the digits 0 and 1, and this number contains a 2. Every digit here is '
  'below 8, so the other three bases all allow it.')

q('GB_NS_002', 'NS_FAM01_LEGAL_DIGITS', 'D1',
  'A number is written as 892. Which base can it certainly not be in?',
  'Base 8',
  ['Base 10', 'Base 12', 'Base 16'],
  'Base 8 allows the digits 0 to 7 only, and this number contains both an 8 and a 9. Bases 10, '
  '12 and 16 all allow digits that large.')

q('GB_NS_003', 'NS_FAM01_LEGAL_DIGITS', 'D1',
  'A value is written as 3F2. Which base is it in?',
  'Base 16',
  ['Base 10', 'Base 8', 'Base 2'],
  'Only base 16 needs digits beyond 9, and it writes them as the letters A to F. A letter '
  'appearing as a digit is what identifies the base here.')

q('GB_NS_004', 'NS_FAM01_LEGAL_DIGITS', 'D1',
  'Which of these is a valid binary number?',
  '10011',
  ['10211', '1A01', '1092'],
  'A binary number may contain nothing but 0 and 1. The other three each contain a digit or '
  'letter that base 2 has no room for.')

q('GB_NS_005', 'NS_FAM01_LEGAL_DIGITS', 'D2',
  'A configuration value is recorded as 778 and labelled as octal. What is wrong?',
  'Octal has no digit 8, so the value cannot be octal as labelled',
  ['Nothing is wrong; 778 is a valid octal value',
   'Octal values may not be three digits long',
   'Octal has no digit 7, so the first two digits are the problem'],
  'Base 8 runs from 0 to 7. The two sevens are perfectly legal; the 8 is not, which means the '
  'label and the value disagree.')

# =========================================================================
# NS_FAM02_PLACE_VALUE — D1 x3, D2 x1
# =========================================================================
q('GB_NS_006', 'NS_FAM02_PLACE_VALUE', 'D1',
  'Positions in a binary number are counted from the right starting at zero. What is the weight '
  'of position 3?',
  '8',
  ['4', '16', '3'],
  'The weight of a position is two raised to the position number, so position 3 is worth 8. '
  'Position 2 is worth 4 and position 4 is worth 16.')

q('GB_NS_007', 'NS_FAM02_PLACE_VALUE', 'D1',
  'What is the weight of the rightmost position of a binary number?',
  '1',
  ['0', '2', '10'],
  'The rightmost position is position zero, and two raised to the power zero is one. It is the '
  'only position whose weight does not depend on the length of the number.')

q('GB_NS_008', 'NS_FAM02_PLACE_VALUE', 'D1',
  'In the binary number 10000, positions are counted from the right starting at zero. Which '
  'position holds the single 1?',
  'Position 4',
  ['Position 5', 'Position 1', 'Position 0'],
  'There are four zeros to the right of the 1, occupying positions 0 to 3, so the 1 sits at '
  'position 4. Counting the digits rather than the positions gives 5 and is the usual slip.')

q('GB_NS_009', 'NS_FAM02_PLACE_VALUE', 'D2',
  'A student says the leftmost digit of the binary number 1001 has a weight of 3, because it '
  'sits in the fourth position. What has gone wrong?',
  'Positions are numbered from zero and each weight is a power of two, so the leftmost digit '
  'here is worth 8',
  ['Nothing; the leftmost weight really is 3',
   'The positions should be counted from the left, which gives a weight of 1',
   'The leftmost digit has no weight of its own because it is a 1'],
  'Two errors compound: the position is 3 rather than 4, and a position number is not a weight. '
  'The weight is two raised to the position, which is 8.')

# =========================================================================
# NS_FAM03_BIT_BYTE_UNITS — D1 x3, D2 x1
# =========================================================================
q('GB_NS_010', 'NS_FAM03_BIT_BYTE_UNITS', 'D1',
  'How many different values can be distinguished using 3 bits?',
  '8',
  ['6', '7', '9'],
  'Each bit doubles the number of values, so three bits give two times two times two, which is '
  'eight. Multiplying three by two gives six and is the commonest wrong route.')

q('GB_NS_011', 'NS_FAM03_BIT_BYTE_UNITS', 'D1',
  'A single character is stored in one byte. How much space does it occupy?',
  '8 bits',
  ['1 bit', '16 bits', '4 bits'],
  'A byte is eight bits by definition, so one byte of storage is eight bits of storage.')

q('GB_NS_012', 'NS_FAM03_BIT_BYTE_UNITS', 'D1',
  'A field is 4 bits wide. How many distinct values can it hold?',
  '16',
  ['8', '4', '15'],
  'Four bits give two to the fourth power, which is sixteen. Fifteen is the largest value the '
  'field can hold, which is one fewer than the number of values.')

q('GB_NS_013', 'NS_FAM03_BIT_BYTE_UNITS', 'D2',
  'A student says that 5 bits can distinguish 10 different values. What is the mistake?',
  'Each extra bit doubles the count rather than adding two, so 5 bits give 32 values',
  ['Nothing; 5 bits do give 10 values',
   'Each bit adds one value, so the answer should be 6',
   'The answer should be 25, since bits are squared'],
  'Doubling five times gives 32. Multiplying the width by two gives 10 and squaring it gives 25; '
  'both treat the width as though it scaled the count directly.')

# =========================================================================
# NS_FAM04_BINARY_TO_DECIMAL — D2 x1, D3 x1
# =========================================================================
q('GB_NS_014', 'NS_FAM04_BINARY_TO_DECIMAL', 'D2',
  'What is the decimal value of the binary number 1011?',
  '11',
  ['13', '3', '23'],
  'The positions holding a 1 are worth 8, 2 and 1, which total 11. Reading the digits from the '
  'other end gives 1101, which is 13.')

q('GB_NS_015', 'NS_FAM04_BINARY_TO_DECIMAL', 'D3',
  'What is the decimal value of the binary number 101100?',
  '44',
  ['13', '22', '45'],
  'The positions holding a 1 are worth 32, 8 and 4, which total 44. Reading the digits in the '
  'reverse order gives 001101, which is 13, and is the error this number is chosen to expose.')

# =========================================================================
# NS_FAM05_DECIMAL_TO_BINARY — D2 x1, D3 x1
# =========================================================================
q('GB_NS_016', 'NS_FAM05_DECIMAL_TO_BINARY', 'D2',
  'What is 13 written in binary?',
  '1101',
  ['1011', '1110', '1001'],
  'Thirteen is 8 plus 4 plus 1, giving 1101. Writing the division remainders in the order they '
  'were produced rather than reversing them gives 1011.')

q('GB_NS_017', 'NS_FAM05_DECIMAL_TO_BINARY', 'D3',
  'What is 37 written in binary?',
  '100101',
  ['101001', '100111', '110010'],
  'Thirty-seven is 32 plus 4 plus 1, giving 100101. The remainders taken in the order produced '
  'rather than reversed give 101001, which is 41.')

# =========================================================================
# NS_FAM06_HEX_GROUPING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_NS_018', 'NS_FAM06_HEX_GROUPING', 'D2',
  'The hex value 2F is written out in binary as eight bits. What is it?',
  '00101111',
  ['00100110', '11110010', '01001111'],
  'Each hex digit becomes exactly four bits: 2 becomes 0010 and F, which is fifteen, becomes '
  '1111. Joining them in the same order gives 00101111.')

q('GB_NS_019', 'NS_FAM06_HEX_GROUPING', 'D3',
  'The binary string 110101101 is written in hex by grouping its bits in fours from the right. '
  'What is the result?',
  '1AD',
  ['D61', '1AB', '35D'],
  'Padded to twelve bits the string is 0001 1010 1101, whose four-bit groups read as 1AD. '
  'Grouping from the left instead splits it as 1101 0110 1 and produces D61.')

q('GB_NS_020', 'NS_FAM06_HEX_GROUPING', 'D4',
  'A student converts the eight-bit string 10110110 to hex and correctly gets B6. They then '
  'convert the seven-bit string 1011011 the same way and get B3. On the seven-bit string the '
  'bits were grouped from the left rather than from the right, which is the only difference '
  'between the two attempts. What is the correct hex value of the seven-bit string?',
  '5B',
  ['B3', '5D', 'BB'],
  'Grouping from the right and padding on the left gives 0101 1011, which is 5B. The eight-bit '
  'string worked either way because its length is already a multiple of four, which is exactly '
  'why the fault stayed hidden until the length was odd.',
  evidence='grouped from the left rather than from the right')

# =========================================================================
# NS_FAM07_OCTAL_GROUPING — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_NS_021', 'NS_FAM07_OCTAL_GROUPING', 'D2',
  'The octal value 27 is written out in binary as six bits. What is it?',
  '010111',
  ['011111', '001111', '100111'],
  'Each octal digit becomes exactly three bits: 2 becomes 010 and 7 becomes 111. Joining them '
  'in order gives 010111.')

q('GB_NS_022', 'NS_FAM07_OCTAL_GROUPING', 'D3',
  'The binary string 11010110 is written in octal by grouping its bits in threes from the '
  'right. What is the result?',
  '326',
  ['652', 'D6', '324'],
  'From the right the groups are 11, 010 and 110, which read as 326. Grouping from the left '
  'gives 110, 101 and 10, producing 652; grouping in fours produces the hex value D6 instead.')

q('GB_NS_023', 'NS_FAM07_OCTAL_GROUPING', 'D4',
  'Two students convert the binary string 1011010 to octal. One reports 132 and the other 550. '
  'Only one of them grouped the bits in threes starting from the rightmost bit, which is what '
  'octal requires. Which answer is correct?',
  '132',
  ['550', '272', '1320'],
  'From the right the groups are 1, 011 and 010, giving 132. Starting from the left splits the '
  'string as 101, 101 and 0, which produces 550 and silently pads the wrong end.',
  evidence='grouped the bits in threes starting from the rightmost bit')

# =========================================================================
# NS_FAM08_BINARY_ADDITION — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_NS_024', 'NS_FAM08_BINARY_ADDITION', 'D2',
  'What is 101 + 011 in binary?',
  '1000',
  ['111', '110', '100'],
  'Five plus three is eight, which is 1000. Combining the numbers bit by bit without carrying '
  'gives 111, which is what an OR would produce rather than an addition.')

q('GB_NS_025', 'NS_FAM08_BINARY_ADDITION', 'D3',
  'What is 1011 + 0110 in binary?',
  '10001',
  ['1111', '1101', '10101'],
  'Eleven plus six is seventeen, which is 10001. The answer 1111 is what results from combining '
  'the bits without ever carrying.')

q('GB_NS_026', 'NS_FAM08_BINARY_ADDITION', 'D4',
  'A student adds the binary numbers 1101 and 1111 and writes 1111. The two numbers have a 1 in '
  'the same column three times over, and every one of those columns must produce a carry. What '
  'is the correct sum?',
  '11100',
  ['1111', '10100', '11110'],
  'Thirteen plus fifteen is twenty-eight, which is 11100. The answer written down is what the '
  'two numbers give when each column is combined without carrying, which is why it is never '
  'longer than the longer input.',
  evidence='have a 1 in the same column three times over')

# =========================================================================
# NS_FAM09_RANGE_FROM_WIDTH — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_NS_027', 'NS_FAM09_RANGE_FROM_WIDTH', 'D2',
  'What is the largest value an unsigned 4-bit field can hold?',
  '15',
  ['16', '14', '8'],
  'Four bits hold sixteen different values, and because the smallest is zero the largest is '
  'fifteen. Sixteen is the count of values, not the largest of them.')

q('GB_NS_028', 'NS_FAM09_RANGE_FROM_WIDTH', 'D3',
  'A counter must store values from 0 up to 1000. What is the smallest number of bits that will '
  'hold it?',
  '10',
  ['9', '11', '1000'],
  'Nine bits reach 511, which is short, and ten bits reach 1023, which is enough. Each extra '
  'bit roughly doubles the reach, so the answer grows very slowly as the limit rises.')

q('GB_NS_029', 'NS_FAM09_RANGE_FROM_WIDTH', 'D4',
  'A field must store the values 0 to 256 inclusive. A student chooses 8 bits, reasoning that 8 '
  'bits hold 256 values. The stated range contains 257 distinct values, one more than the '
  'student counted. How many bits are needed?',
  '9',
  ['8', '10', '16'],
  'Eight bits cover 0 to 255. Including 256 needs one more value than that, and there is no '
  'half a bit, so the width goes to nine. Ranges quoted inclusively on a power of two are where '
  'this error almost always happens.',
  evidence='contains 257 distinct values, one more than the student counted')

# =========================================================================
# NS_FAM10_SHIFT_EFFECT — D2 x1, D3 x1, D4 x1
# =========================================================================
q('GB_NS_030', 'NS_FAM10_SHIFT_EFFECT', 'D2',
  'The binary value 0011 is shifted one place to the left. What is the result?',
  '0110',
  ['0001', '1100', '0011'],
  'Shifting left moves every bit one position up in weight, which doubles the value: three '
  'becomes six. Shifting right instead would have halved it.')

q('GB_NS_031', 'NS_FAM10_SHIFT_EFFECT', 'D3',
  'The value 13 is shifted one place to the right, and the bit that falls off the end is '
  'discarded. What is the result?',
  '6',
  ['6.5', '7', '26'],
  'Thirteen is 1101; dropping the rightmost bit leaves 110, which is six. The discarded bit is '
  'lost rather than rounded, so the half is gone rather than carried into the answer.')

q('GB_NS_032', 'NS_FAM10_SHIFT_EFFECT', 'D4',
  'A student shifts the value 9 one place to the right and reports 5, having rounded the result '
  'up. The bit that falls off the end is discarded rather than rounded, and 9 is odd so a bit '
  'does fall off. What is the result?',
  '4',
  ['5', '4.5', '18'],
  'Nine is 1001; dropping the rightmost bit leaves 100, which is four. Shifting right is only '
  'the same as halving when the value is even, which is what makes odd values the case worth '
  'asking about.',
  evidence='discarded rather than rounded, and 9 is odd so a bit does fall off')

# =========================================================================
# NS_FAM11_CONVERSION_ERROR_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_NS_033', 'NS_FAM11_CONVERSION_ERROR_DIAGNOSIS', 'D3',
  'A student converts 22 to binary by repeated division by two. '
  'Step 1: 22 divided by 2 is 11, remainder 0. '
  'Step 2: 11 divided by 2 is 5, remainder 1. '
  'Step 3: 5 divided by 2 is 2, remainder 0. '
  'Step 4: 2 divided by 2 is 1, remainder 0. '
  'Step 5: 1 divided by 2 is 0, remainder 1. '
  'Step 6: reading the remainders from the last to the first gives 10010. '
  'At which step was the error made?',
  'Step 3',
  ['Step 6', 'Step 4', 'Step 5'],
  'Five divided by two leaves a remainder of 1, not 0. Every later step is carried out correctly '
  'on the wrong value, so step 6 is where the wrong answer appears rather than where it was '
  'made.')

q('GB_NS_034', 'NS_FAM11_CONVERSION_ERROR_DIAGNOSIS', 'D4',
  'A student converts the hex value 4C to binary. '
  'Step 1: 4 becomes 0100. '
  'Step 2: C becomes 1010. '
  'Step 3: joining them gives 01001010. '
  'Each hex digit expands to exactly four bits, and the value of C is twelve, which is not what '
  'step 2 produced. At which step was the error made?',
  'Step 2',
  ['Step 1', 'Step 3', 'No step is wrong'],
  'Twelve is 1100, not 1010, which is ten, so Step 2 is where the expansion goes wrong. The '
  'join that follows is carried out correctly and simply passes the mistake on.',
  evidence='the value of C is twelve, which is not what step 2 produced')

# =========================================================================
# NS_FAM12_BASE_AMBIGUITY_DIAGNOSIS — D3 x1, D4 x1
# =========================================================================
q('GB_NS_035', 'NS_FAM12_BASE_AMBIGUITY_DIAGNOSIS', 'D3',
  'A configuration file records a value as 20. One program reads it as decimal and another as '
  'hex, and the two disagree about what the setting means. Which explanation fits?',
  'The digits 20 are legal in both bases and mean different values, so the file is ambiguous '
  'without a stated base',
  ['One of the two programs has an arithmetic fault',
   'The value 20 is not valid in hex, so that program is simply wrong',
   'Both programs should read it as decimal, so the second one is misconfigured'],
  'Twenty in decimal and 20 in hex are different numbers, and nothing in the file distinguishes '
  'them. Neither program is computing anything incorrectly; the file does not say what it means.')

q('GB_NS_036', 'NS_FAM12_BASE_AMBIGUITY_DIAGNOSIS', 'D4',
  'A field is expected to hold seventeen. A program reads the stored characters 11 and reports '
  'three. The characters 11 are legal in binary, octal, decimal and hex, and only one of those '
  'four bases gives the value that was reported. Which base did the program assume?',
  'Binary',
  ['Octal', 'Decimal', 'Hexadecimal'],
  'In binary 11 is three, which is what was reported. The other three give nine, eleven and '
  'seventeen — and the last of those is the value that was actually wanted, which is what makes '
  'the stored characters so misleading.',
  evidence='only one of those four bases gives the value that was reported')

# =========================================================================
# NS_FAM13_OVERFLOW_REASONING — D3 x1, D4 x1, D5 x3
# =========================================================================
q('GB_NS_037', 'NS_FAM13_OVERFLOW_REASONING', 'D3',
  'An unsigned 4-bit field currently holds 15. One is added, and any bit that does not fit is '
  'discarded. What does the field hold now?',
  '0',
  ['16', '15', '1'],
  'Sixteen needs a fifth bit, and the field has only four. The four bits that remain are all '
  'zero, so the field wraps to nothing rather than growing or stopping at its maximum.')

q('GB_NS_038', 'NS_FAM13_OVERFLOW_REASONING', 'D4',
  'An unsigned 8-bit counter holds 250 and ten is added. The field keeps only the lowest eight '
  'bits of the result and the ninth bit is discarded rather than the value stopping at its '
  'maximum. What does the counter hold?',
  '4',
  ['260', '255', '0'],
  'Two hundred and sixty is 100000100; the lowest eight bits are 00000100, which is 4. '
  'Stopping at 255 is a real behaviour in some hardware, which is why it has to be ruled out by '
  'the question rather than by intuition.',
  evidence='keeps only the lowest eight bits of the result')

q('GB_NS_039', 'NS_FAM13_OVERFLOW_REASONING', 'D5',
  'A sensor adds a reading to a running total once a second. The readings average about 40, and '
  'the total is an unsigned 16-bit field that keeps only its lowest sixteen bits when it '
  'exceeds them. Roughly how long until the total first comes out smaller than it was a second '
  'earlier?',
  'After about 27 minutes',
  ['After about 27 hours',
   'Never, because a running total only grows',
   'After about 65,536 seconds'],
  'Sixteen bits reach 65,535, and at 40 per second that takes roughly 1,600 seconds, which is a '
  'little under half an hour. The wrap is not an error the program will notice — the total '
  'simply becomes wrong and stays wrong.',
  mode='TRANSFER', hinge='keeps only its lowest sixteen bits when it exceeds them')

q('GB_NS_040', 'NS_FAM13_OVERFLOW_REASONING', 'D5',
  'An unsigned 8-bit field holds 0 and one is subtracted. The field keeps only the lowest eight '
  'bits of the result, exactly as it does when a value grows too large. What does the field '
  'hold?',
  '255',
  ['0', 'Minus 1', '1'],
  'The wrap works in both directions: going below zero lands at the top of the range just as '
  'going above the maximum lands at the bottom. An unsigned field has nowhere to record a '
  'negative value, so it does not.',
  mode='EDGE',
  hinge='keeps only the lowest eight bits of the result, exactly as it does when a value grows '
        'too large')

q('GB_NS_041', 'NS_FAM13_OVERFLOW_REASONING', 'D5',
  'A running total that will reach about 70,000 is being stored. Widening its field from sixteen '
  'bits to thirty-two removes any risk of wrapping, but doubles the space every record occupies, '
  'and there are several million records. Which choice is defensible?',
  'Widen the field, because a wrapped total is silently wrong and no saving in space repairs '
  'that',
  ['Keep sixteen bits, because the space saved across several million records outweighs a rare '
   'wrap',
   'Keep sixteen bits, and check after each update whether the total has decreased',
   'Widen to sixty-four bits, since the cost of widening is being paid anyway'],
  'Seventy thousand does not fit in sixteen bits at all, so the wrap is certain rather than '
  'rare. Detecting it afterwards salvages nothing, because by then the total that was meant to '
  'be recorded is gone.',
  mode='TRADEOFF',
  hinge='doubles the space every record occupies, and there are several million records')

# =========================================================================
# NS_FAM14_REPRESENTATION_CHOICE — D4 x1, D5 x4
# =========================================================================
q('GB_NS_042', 'NS_FAM14_REPRESENTATION_CHOICE', 'D4',
  'A field must hold a count that is at most 900 today and is expected to roughly double over '
  'the next two years. The narrowest width that will still hold the expected value is wanted. '
  'Allowing for the doubling means the field must accommodate about 1,800 rather than 900. Which '
  'width should be chosen?',
  '11 bits',
  ['10 bits', '16 bits', '12 bits'],
  'Ten bits reach 1,023, which covers today and not the expectation; eleven reach 2,047, which '
  'covers both. Sixteen would also work but is wider than the requirement asks for.',
  evidence='must accommodate about 1,800 rather than 900')

q('GB_NS_043', 'NS_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A value that will never exceed 200 must be stored in a message that is sent millions of times '
  'a day over a metered link, so every extra byte has a running cost. One engineer proposes 8 '
  'bits and another proposes 32 for safety. Which is the better choice?',
  'Eight bits, because the stated maximum of 200 already fits and the extra bytes are paid for '
  'on every message',
  ['Thirty-two bits, because it is safer and the difference is only three bytes',
   'Thirty-two bits, because 200 is uncomfortably close to the eight-bit limit',
   'Eight bits, because thirty-two-bit values are harder for a reader to interpret'],
  'Safety margin is worth buying when the cost is paid once; here it is paid on every message. '
  'The limit of 200 is stated rather than estimated, so the margin is guarding against nothing.',
  mode='TRADEOFF', hinge='sent millions of times a day over a metered link')

q('GB_NS_044', 'NS_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A diagnostic log must let a human reader find a single wrong bit in each byte. Hex is more '
  'compact than binary, but a hex digit hides which of its four bits differ. Which '
  'representation should the log use?',
  'Binary, because the reader is looking for one wrong bit and hex would conceal which bit it is',
  ['Hex, because it is more compact and the reader can convert as needed',
   'Decimal, because it is the representation most readers are fluent in',
   'Octal, as a compromise between compactness and readability'],
  'The log has one job, and compactness is not it. Asking the reader to convert reintroduces by '
  'hand exactly the step the representation was supposed to remove.',
  mode='TRADEOFF', hinge='a hex digit hides which of its four bits differ')

q('GB_NS_045', 'NS_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A field is specified as holding a value from 1 to 16. A student chooses 4 bits, reasoning '
  'that 4 bits hold 16 values. The range starts at 1 rather than 0, so the value 16 must be '
  'representable as well. Is 4 bits enough?',
  'No, because 16 cannot be represented in 4 bits unless the stored value is offset by one',
  ['Yes, because 4 bits hold exactly 16 values',
   'No, because 4 bits hold only 15 values',
   'Yes, because the range contains 16 values and 4 bits hold 16'],
  'The count is right and the range is not: four bits hold 0 to 15, and the value wanted at the '
  'top is 16. Storing the value minus one is the standard repair and is what makes four bits '
  'workable after all.',
  mode='EDGE',
  hinge='range starts at 1 rather than 0, so the value 16 must be representable')

q('GB_NS_046', 'NS_FAM14_REPRESENTATION_CHOICE', 'D5',
  'A version number is packed into a single 16-bit value as three fields: 4 bits for major, 6 '
  'for minor and 6 for patch. Patch numbers must now reach 100. The whole packed value is fixed '
  'at 16 bits, so any widening must come from another field. What follows?',
  'The patch field must gain at least one bit, taken from major or minor, since 6 bits stop at '
  '63',
  ['Nothing needs to change, because 6 bits reach 100',
   'The packed value must grow beyond 16 bits',
   'The patch field must gain four bits to reach 100'],
  'Six bits reach 63 and seven reach 127, so one extra bit is enough. The total is fixed, which '
  'turns this from a question about patch numbers into a question about which other field can '
  'afford to shrink.',
  mode='TRANSFER',
  hinge='whole packed value is fixed at 16 bits, so any widening must come from another field')

# =========================================================================
# NS_FAM15_ENCODING_TRANSFER — D4 x1, D5 x3
# =========================================================================
q('GB_NS_047', 'NS_FAM15_ENCODING_TRANSFER', 'D4',
  'A device reports its state in one byte where each bit is an independent flag: bit 0 means '
  'powered, bit 1 means connected, bit 2 means error, and the remaining bits are unused. The '
  'byte read back is 00000101. Each bit is independent, so a bit set to 1 means its flag is on '
  'regardless of the others. Which flags are on?',
  'Powered and error',
  ['Connected only',
   'Powered and connected',
   'None; the byte holds the number five rather than a set of flags'],
  'Bits 0 and 2 are set, which are powered and error. The byte does also equal five as a number, '
  'but reading it that way discards the only structure it has.',
  evidence='a bit set to 1 means its flag is on regardless of the others')

q('GB_NS_048', 'NS_FAM15_ENCODING_TRANSFER', 'D5',
  'A permission byte uses bit 2 for read, bit 1 for write and bit 0 for execute, with bit 2 the '
  'leftmost of the three. A file must allow read and execute but not write. The three bits are '
  'independent and their order is exactly as stated, so the pattern is determined. What are the '
  'three bits, from bit 2 down to bit 0?',
  '101',
  ['110', '011', '111'],
  'Read is on, write is off and execute is on, which written from bit 2 downwards is 101. '
  'Reading the bits in the opposite order gives the same pattern here only by accident of '
  'symmetry, which is why the order is stated rather than assumed.',
  mode='TRANSFER',
  hinge='three bits are independent and their order is exactly as stated')

q('GB_NS_049', 'NS_FAM15_ENCODING_TRANSFER', 'D5',
  'A status byte uses each of its eight bits as an independent flag. A reader converts the byte '
  'to decimal, gets 0, and concludes that the device is off. A decimal value of 0 means every '
  'one of the eight flags is clear, which is not the same claim as any single flag being off. '
  'What has the reader actually established?',
  'That all eight flags are clear, which is a stronger claim than the device being off and may '
  'not mean it',
  ['That the device is off',
   'That the powered flag is clear and the other seven are unknown',
   'Nothing, because zero is not a meaningful value for a status byte'],
  'Zero is the one value that settles every flag at once. Whether "all flags clear" means the '
  'device is off depends on what the flags were defined to mean, and the reader has not '
  'consulted that.',
  mode='EDGE', hinge='means every one of the eight flags is clear')

q('GB_NS_050', 'NS_FAM15_ENCODING_TRANSFER', 'D5',
  'Eight independent yes-or-no settings must be stored. One design gives each a separate byte; '
  'another packs all eight into the bits of a single byte. The packed form uses one eighth of '
  'the space, but every read and write must isolate a single bit rather than handle a whole '
  'field. The settings are read once at start-up. Which design is preferable?',
  'The eight separate fields, because the space saved is negligible here and the bit handling is '
  'a permanent cost',
  ['The packed byte, because using one eighth of the space is always worth having',
   'The packed byte, because the settings are read rarely so the extra handling costs little',
   'Neither; eight settings should be stored as text so they can be read directly'],
  'Packing earns its cost where the volume is large or the space is constrained, and one '
  'start-up read is neither. The saving is seven bytes once; the bit handling is in every piece '
  'of code that touches the settings from now on.',
  mode='TRADEOFF',
  hinge='every read and write must isolate a single bit rather than handle a whole field')
