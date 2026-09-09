# -*- coding: utf-8 -*-
"""
Phase 2 classification table for the 366 existing Foundation questions.

Each entry: shortId -> (conceptId, factId, familyId, proposedDifficulty,
proposedCognitiveLevel, goldenDecision, noteCode[, noteArg])

An empty family means no blueprint family legitimately fits. Per the brief such
questions are normally REJECT, and the note says whether the item itself is sound.

Note codes are expanded to full reviewNotes text by the generator, so the reason
for every decision is stated in the artifact rather than implied by the code.
"""

# ── note code -> template ────────────────────────────────────────────────────
NOTES = {
 'KEEP_STRONG':      'Strong item. Correct, unambiguous, and the distractors are the real misconceptions the family targets.',
 'KEEP_BOUNDARY':    'Strong item: the value sits on the boundary, which is exactly where this family discriminates. Keep as authored.',
 'KEEP_OK':          'Correct and clear, fits the family without rewriting. Distractors are adequate though not the strongest available.',
 'KEEP_ONLY_OF_KIND':'Correct and clear, and the only item in the bank measuring this particular form. Keep.',
 'RW_DISTRACTORS':   'Underlying measurement is right for this family, but at least two options are implausible (unrelated hardware, absurd actions), so the item is answerable by elimination. Rewrite the distractors as the misconceptions named in the family.',
 'RW_TWO_REAL':      'Only two of the four options are plausible, so the effective guess rate is 50%. Rewrite the two filler options into real misconceptions.',
 'RW_TOO_SHALLOW':   'Fits the family but sits below the difficulty the family is meant to carry; as written it does not exercise what makes the family meaningful. Deepen the stem rather than the wording.',
 'RW_NEEDS_RULE':    'The family asks for the RULE that separates the items, not merely the odd one out; as written a lucky guess scores. Rewrite to ask for the discriminating property.',
 'RW_KEY_WRONG':     'ANSWER KEY IS WRONG. The stored key is option A ("HI") but the correct output is "hi" (option B), and the stored explanation itself says "gives hi". Stem and options are otherwise sound: correct the key. This question is live in the bank and currently marks correct answers wrong.',
 'RW_ADVICE_SHAPE':  'The measurement the family wants is real, but as written the item asks for agreement with obvious good practice rather than for a judgement derived from the stem. Rewrite so the stated situation decides the answer.',
 'RW_NEEDS_DIP':     'Fits the family, but the data is monotonic, so the trend can be read without reasoning. The family requires data that rises overall while falling somewhere.',
 'RW_GRAMMAR_ONLY':  'Only one option is fluent English, so the item is answerable without reading the technical content. Rewrite so every option is well formed and they differ in what they omit.',
 'RJ_REDUNDANT':     'REDUNDANT: measures the same fact the same way as %s. The scenario differs; the reasoning does not. This is the cosmetic-variant pattern the blueprint forbids.',
 'RJ_NO_FAMILY':     'No %s blueprint family covers this measurement. The item itself is sound and belongs to %s under a different skill. Remapping is deliberately out of scope for Phase 2.',
 'RJ_NO_FAMILY_GAP': 'No %s blueprint family covers this. The item is sound and this looks like a BLUEPRINT GAP rather than a question defect: %s',
 'RJ_TRIVIA':        'Trivia: measures recall of a name or symbol rather than any capability the curriculum teaches. No blueprint family accepts it.',
 'RJ_COMPUTATION':   'Bare computation with no data to interpret. The blueprint measures arithmetic only where it is applied to a table, chart or rate, so no family fits.',
 'RJ_ADVICE':        'Measures agreement with obvious advice, not a capability. Every distractor is something no one would choose, so the item discriminates nothing.',
 'RJ_AMBIGUOUS':     'Ambiguous as written: the stem admits more than one reading, so a correct answer cannot be determined from it.',
 'RJ_TAUTOLOGY':     'Tautological: the conclusion restates the premise, so no inference is required.',
 'RJ_OUT_OF_SCOPE':  'Outside the skill it is filed under and outside the blueprint: %s',
}

# ── the table ────────────────────────────────────────────────────────────────
T = {}

def add(ids, concept, fact, family, d, cog, dec, note, *args):
    # args fill the %s placeholders in the note template, in order.
    for i in ids.split():
        T[i] = (concept, fact, family, d, cog, dec, note, tuple(args))

# ═══ LOOPS_BASICS (7) ═══
add('f2dfca', 'LP_C05_ACCUMULATION', 'LP_F05_ACCUMULATOR_BUILDS_RESULT', 'LP_FAM06_ACCUMULATOR_RESULT', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('f10525', 'LP_C05_ACCUMULATION', 'LP_F05_ACCUMULATOR_BUILDS_RESULT', 'LP_FAM06_ACCUMULATOR_RESULT', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'f2dfca')
add('efc8b7', 'LP_C05_ACCUMULATION', 'LP_F06_COUNTER_COUNTS_EVENTS', 'LP_FAM07_COUNTER_RESULT', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('f066ee', 'LP_C05_ACCUMULATION', 'LP_F05_ACCUMULATOR_BUILDS_RESULT', 'LP_FAM06_ACCUMULATOR_RESULT', 'D3', 'APPLY', 'KEEP', 'KEEP_ONLY_OF_KIND')
add('f37e01', 'LP_C02_RANGE', 'LP_F02_RANGE_EXCLUDES_END', 'LP_FAM04_ITERATION_COUNT', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('ef2a80', 'LP_C04_LOOP_VARIABLE', 'LP_F04_LOOP_VARIABLE_CHANGES', 'LP_FAM05_LOOP_VARIABLE_TRACE', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('f7334b', 'LP_C10_DIAGNOSIS', 'LP_F12_INFINITE_LOOP_CAUSE', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'D3', 'ANALYZE', 'REWRITE', 'RW_DISTRACTORS')

# ═══ COMPUTER_ARCHITECTURE (8) ═══
add('b66479 ae5bae', 'CA_C05_DATA_REPRESENTATION', 'CA_F12_EVERYTHING_IS_BINARY', 'CA_FAM12_REPRESENTATION_REASONING', 'D2', 'APPLY', 'REWRITE', 'RW_TOO_SHALLOW')
add('ad1f40', 'CA_C05_DATA_REPRESENTATION', 'CA_F12_EVERYTHING_IS_BINARY', 'CA_FAM12_REPRESENTATION_REASONING', 'D2', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('adbd77', 'CA_C05_DATA_REPRESENTATION', 'CA_F12_EVERYTHING_IS_BINARY', 'CA_FAM12_REPRESENTATION_REASONING', 'D2', 'REMEMBER', 'REWRITE', 'RW_TOO_SHALLOW')
add('b3eb9d b489d4 b5280b b5c642', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_OUT_OF_SCOPE',
    'even numbers, primes, factors and multiples are number theory, not computer architecture. Nothing in the CA blueprint measures arithmetic.')

# ═══ APTITUDE_REASONING_SERIES (8) — all procedural ordering, none is a series ═══
add('593c52 589e1b 57ffe4 526ff5 51d1be 513387 cb64b3 cc02ea', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY_GAP',
    'APTITUDE_REASONING_SERIES',
    'all eight questions in this skill are step-ordering items ("put these actions in a logical order"), which is procedural sequencing rather than series or analogy reasoning. No AS family covers it, and the eight are also near-identical to each other.')

# ═══ PSEUDOCODE_FLOWCHARTS (10) ═══
add('84df7f', 'PF_C02_SEQUENCE_ASSIGNMENT', 'PF_F03_ASSIGNMENT_REPLACES_VALUE', 'PF_FAM03_ASSIGNMENT_EFFECT', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('8266a3', 'PF_C02_SEQUENCE_ASSIGNMENT', 'PF_F03_ASSIGNMENT_REPLACES_VALUE', 'PF_FAM03_ASSIGNMENT_EFFECT', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('81c86c', 'PF_C06_TRACING', 'PF_F09_TRACE_TO_OUTPUT', 'PF_FAM09_OUTPUT_PREDICTION', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('8304da', 'PF_C06_TRACING', 'PF_F09_TRACE_TO_OUTPUT', 'PF_FAM09_OUTPUT_PREDICTION', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', '81c86c')
add('844148', 'PF_C05_ITERATION', 'PF_F08_COUNTER_AND_ACCUMULATOR', 'PF_FAM08_COUNTER_ACCUMULATOR_ROLE', 'D3', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('78cf0b', 'PF_C05_ITERATION', 'PF_F08_COUNTER_AND_ACCUMULATOR', 'PF_FAM08_COUNTER_ACCUMULATOR_ROLE', 'D3', 'ANALYZE', 'REJECT', 'RJ_REDUNDANT', '844148')
add('857db6', 'PF_C05_ITERATION', 'PF_F08_COUNTER_AND_ACCUMULATOR', 'PF_FAM08_COUNTER_ACCUMULATOR_ROLE', 'D2', 'APPLY', 'KEEP', 'KEEP_ONLY_OF_KIND')
add('83a311', 'PF_C04_CONDITIONS', 'PF_F05_CONDITION_SELECTS_BRANCH', 'PF_FAM05_BRANCH_SELECTION', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('7a0b79', 'PF_C04_CONDITIONS', 'PF_F05_CONDITION_SELECTS_BRANCH', 'PF_FAM05_BRANCH_SELECTION', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', '83a311')
add('7830d4', 'PF_C04_CONDITIONS', 'PF_F05_CONDITION_SELECTS_BRANCH', 'PF_FAM05_BRANCH_SELECTION', 'D3', 'APPLY', 'KEEP', 'KEEP_OK')

# ═══ PYTHON_BASICS (12) ═══
add('940444', 'PY_C01_VALUES', 'PY_F01_LITERAL_TYPES', 'PY_FAM01_LITERAL_TYPE', 'D2', 'REMEMBER', 'KEEP', 'KEEP_STRONG')
add('999d5f', 'PY_C02_OUTPUT', 'PY_F02_PRINT_SHOWS_VALUE', 'PY_FAM02_PRINT_OUTPUT', 'D1', 'UNDERSTAND', 'KEEP', 'KEEP_OK')
add('6893dc', 'PY_C07_OPERATORS', 'PY_F10_DIVISION_OPERATORS_DIFFER', 'PY_FAM10_DIVISION_OPERATORS', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('6f6039', 'PY_C04_STRINGS', 'PY_F06_STRING_METHODS_RETURN_NEW', 'PY_FAM06_STRING_METHOD_RESULT', 'D2', 'UNDERSTAND', 'REWRITE', 'RW_KEY_WRONG')
add('66b937', 'PY_C05_LISTS', 'PY_F07_LISTS_ARE_MUTABLE', 'PY_FAM07_LIST_MUTATION', 'D3', 'ANALYZE', 'KEEP', 'KEEP_OK')
add('6d8594', 'PY_C10_TRACING', 'PY_F13_MULTI_STEP_BEHAVIOUR', 'PY_FAM13_MULTI_STEP_TRACE', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('67576e 693213', 'PY_C10_TRACING', 'PY_F13_MULTI_STEP_BEHAVIOUR', 'PY_FAM13_MULTI_STEP_TRACE', 'D3', 'APPLY', 'REWRITE', 'RW_TOO_SHALLOW')
add('6a6e81', 'PY_C03_ASSIGNMENT', 'PY_F04_ASSIGNMENT_REBINDS', 'PY_FAM04_ASSIGNMENT_TRACE', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('67f5a5', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PYTHON_BASICS', 'DS_FAM02_LENGTH_COUNTING under DSA_STRINGS')
add('661b00', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PYTHON_BASICS', 'DA_FAM01_INDEX_RECOGNITION under DSA_ARRAYS (PY_FAM05 is string-specific)')
add('6ec202', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PYTHON_BASICS', 'FN_FAM06_RETURN_VALUE_USE under FUNCTIONS_BASICS')

# ═══ C_BASICS (12) ═══
add('8fb0c3', 'CC_C04_ARITHMETIC', 'CC_F05_INTEGER_DIVISION_TRUNCATES', 'CC_FAM05_INTEGER_DIVISION', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('93660d', 'CC_C06_ARRAYS', 'CC_F08_ARRAYS_HAVE_FIXED_SIZE', 'CC_FAM08_ARRAY_BOUNDS', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('95dee9 9540b2', 'CC_C02_OUTPUT', 'CC_F03_OUTPUT_NEEDS_A_MATCHING_SPECIFIER', 'CC_FAM03_OUTPUT_SPECIFIER', 'D1', 'REMEMBER', 'REWRITE', 'RW_TOO_SHALLOW')
add('92c7d6', 'CC_C08_TRACING', 'CC_F11_DECLARED_TYPES_AFFECT_THE_TRACE', 'CC_FAM11_TYPED_TRACE', 'D3', 'APPLY', 'REWRITE', 'RW_TOO_SHALLOW')
add('92299f 918b68', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'C_BASICS', 'CF_FAM05_ELSE_BINDING / CF_FAM06_COUNTED_LOOP_COUNT under C_CONTROL_FLOW')
add('8f128c', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'C_BASICS', 'CF_FAM10_FALL_THROUGH under C_CONTROL_FLOW')
add('90ed31', '', '', '', 'D3', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'C_BASICS', 'CF_FAM08_ACCUMULATOR_IN_C under C_CONTROL_FLOW')
add('4e0e04', '', '', '', 'D3', 'APPLY', 'REJECT', 'RJ_NO_FAMILY_GAP', 'C_BASICS',
    'pointers are deliberately outside the Foundation blueprint, which stops at arrays and strings. Either the blueprint gains a pointer family or this question moves to a later stage.')
add('4fe8a9 4f4a72', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')

# ═══ CONDITIONALS_BASICS (18) ═══
add('0483f2', 'CB_C07_BOUNDARIES', 'CB_F08_BOUNDARY_DECIDES_INCLUSION', 'CB_FAM09_BOUNDARY_BEHAVIOUR', 'D3', 'ANALYZE', 'KEEP', 'KEEP_BOUNDARY')
add('77929d', 'CB_C07_BOUNDARIES', 'CB_F08_BOUNDARY_DECIDES_INCLUSION', 'CB_FAM09_BOUNDARY_BEHAVIOUR', 'D3', 'ANALYZE', 'KEEP', 'KEEP_BOUNDARY')
add('76562f', 'CB_C05_CHAINS', 'CB_F06_CHAIN_ORDER_MATTERS', 'CB_FAM07_CHAIN_ORDER', 'D3', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('7519c1', 'CB_C05_CHAINS', 'CB_F06_CHAIN_ORDER_MATTERS', 'CB_FAM07_CHAIN_ORDER', 'D3', 'ANALYZE', 'KEEP', 'KEEP_ONLY_OF_KIND')
add('76f466', 'CB_C03_IF_STRUCTURE', 'CB_F03_ONE_BRANCH_RUNS', 'CB_FAM05_BRANCH_SELECTION', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('747b8a', 'CB_C03_IF_STRUCTURE', 'CB_F03_ONE_BRANCH_RUNS', 'CB_FAM05_BRANCH_SELECTION', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('fdb795', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT', 'CB_FAM08_BOOLEAN_COMBINATION', 'D2', 'APPLY', 'REWRITE', 'RW_TWO_REAL')
add('fbdcf0', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT', 'CB_FAM08_BOOLEAN_COMBINATION', 'D2', 'APPLY', 'REWRITE', 'RW_TWO_REAL')
add('052229', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT', 'CB_FAM08_BOOLEAN_COMBINATION', 'D3', 'APPLY', 'REWRITE', 'RW_TWO_REAL')
add('fc7b27 034784 558708 75b7f8', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT', 'CB_FAM08_BOOLEAN_COMBINATION', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'fdb795 (AND with one operand false)')
add('56c376 59da89 733f1c', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT', 'CB_FAM08_BOOLEAN_COMBINATION', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'fbdcf0 (OR with one operand true)')
add('56253f f1a35c', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT', 'CB_FAM08_BOOLEAN_COMBINATION', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', '052229 (NOT applied to a true value)')

# ═══ DEBUGGING (13) — bank measures domain fault-spotting; blueprint measures method ═══
_DGN = ('DEBUGGING', 'the domain diagnosis family of the skill the fault lives in. The DEBUGGING blueprint deliberately measures METHOD '
        '(reproduce, hypothesise, isolate, verify) because twenty-four other skills already carry a diagnosis family')
add('f69514 eb6845 ec067c', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'PF_FAM13_LOGIC_ERROR_DIAGNOSIS')
add('f86fb9', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS')
add('c03665', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_REDUNDANT', 'f86fb9 (a loop whose control variable is never updated) — and neither fits the DEBUGGING blueprint')
add('ea2bd7', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'CB_FAM09_BOUNDARY_BEHAVIOUR (a genuinely strong boundary item, filed under the wrong skill)')
add('eaca0e', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'PF_FAM12_MISSING_STEP_SELECTION')
add('eca4b3', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'LP_FAM14_OFF_BY_ONE_DIAGNOSIS')
add('ed42ea', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'CB_FAM12_LOGIC_ERROR_DIAGNOSIS')
add('c0d49c', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'PGF_FAM11_ERROR_CLASSIFICATION')
add('bf982e', '', '', '', 'D2', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'CC_FAM04_UNINITIALISED_BEHAVIOUR under C_BASICS')
add('be5bc0', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', _DGN[0], 'FN_FAM07_MISSING_RETURN under FUNCTIONS_BASICS (a strong item, wrong skill)')
add('c172d3', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')

# ═══ PROBLEM_SOLVING (22) ═══
add('7047a3', 'PS_C02_CONSTRAINTS', 'PS_F04_CONSTRAINT_EFFECT', 'PS_FAM17_CONSTRAINT_RECOGNITION', 'D1', 'UNDERSTAND', 'REWRITE', 'RW_DISTRACTORS')
add('808bfe', 'PS_C02_CONSTRAINTS', 'PS_F04_CONSTRAINT_EFFECT', 'PS_FAM04_CONSTRAINT_REASONING', 'D3', 'ANALYZE', 'REWRITE', 'RW_DISTRACTORS')
add('6d3090', 'PS_C01_INTERPRETATION', 'PS_F02_INPUT_IDENTIFICATION', 'PS_FAM02_INPUT_IDENTIFICATION', 'D1', 'UNDERSTAND', 'REWRITE', 'RW_DISTRACTORS')
add('6dcec7 6fa96c', 'PS_C01_INTERPRETATION', 'PS_F02_INPUT_IDENTIFICATION', 'PS_FAM02_INPUT_IDENTIFICATION', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_REDUNDANT', '6d3090')
add('70e5da', 'PS_C01_INTERPRETATION', 'PS_F03_OUTPUT_IDENTIFICATION', 'PS_FAM03_OUTPUT_IDENTIFICATION', 'D1', 'UNDERSTAND', 'REWRITE', 'RW_DISTRACTORS')
add('718411', 'PS_C01_INTERPRETATION', 'PS_F03_OUTPUT_IDENTIFICATION', 'PS_FAM03_OUTPUT_IDENTIFICATION', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_REDUNDANT', '70e5da')
add('722248', 'PS_C03_DECOMPOSITION', 'PS_F06_DECOMPOSITION_INTO_STEPS', 'PS_FAM06_DECOMPOSITION', 'D3', 'APPLY', 'REWRITE', 'RW_DISTRACTORS')
add('73fced e32093 e2825c e1e425', 'PS_C03_DECOMPOSITION', 'PS_F06_DECOMPOSITION_INTO_STEPS', 'PS_FAM06_DECOMPOSITION', 'D3', 'APPLY', 'REJECT', 'RJ_REDUNDANT', '722248')
add('e00980', 'PS_C06_ALGORITHM_PLANNING', 'PS_F10_ALGORITHM_SELECTION', 'PS_FAM10_ALGORITHM_SELECTION', 'D3', 'EVALUATE', 'REWRITE', 'RW_DISTRACTORS')
add('e94eb9 e8124b e0a7b7', 'PS_C06_ALGORITHM_PLANNING', 'PS_F10_ALGORITHM_SELECTION', 'PS_FAM10_ALGORITHM_SELECTION', 'D3', 'EVALUATE', 'REJECT', 'RJ_REDUNDANT', 'e00980')
add('7fedc7 e8b082', '', '', '', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_ADVICE')
add('735eb6 e3beca e145ee 812a35', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_ADVICE')

# ═══ PATTERN_RECOGNITION (21) — bank is almost entirely numeric/letter series ═══
add('58366e', 'PR_C01_REPETITION', 'PR_F04_THE_UNIT_PREDICTS_A_POSITION', 'PR_FAM04_POSITION_PREDICTION', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('d55514', 'PR_C05_GRID_MOVEMENT', 'PR_F08_MOVEMENT_ACCUMULATES', 'PR_FAM08_MOVEMENT_TRACKING', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('d2dc38', 'PR_C05_GRID_MOVEMENT', 'PR_F08_MOVEMENT_ACCUMULATES', 'PR_FAM08_MOVEMENT_TRACKING', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('d4b6dd', 'PR_C05_GRID_MOVEMENT', 'PR_F08_MOVEMENT_ACCUMULATES', 'PR_FAM08_MOVEMENT_TRACKING', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'd2dc38 (a single quarter turn from a stated facing)')
add('826a68 81cc31 5d2826 5e6494', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PATTERN_RECOGNITION', 'AS_FAM01_CONSTANT_STEP / AS_FAM04_CHANGING_STEP under APTITUDE_REASONING_SERIES')
add('812dfa 5c89ef 5fa102', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PATTERN_RECOGNITION', 'AS_FAM08_MULTIPLICATIVE_SERIES under APTITUDE_REASONING_SERIES')
add('808fc3 5dc65d 5f02cb', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', 'PATTERN_RECOGNITION', 'AS_FAM04_CHANGING_STEP under APTITUDE_REASONING_SERIES')
add('603f39 56fa00 579837', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PATTERN_RECOGNITION', 'AS_FAM09_POSITIONAL_SERIES under APTITUDE_REASONING_SERIES')
add('b31cf4 b4f799', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', 'PATTERN_RECOGNITION', 'AS_FAM10_TWO_ATTRIBUTE_SERIES under APTITUDE_REASONING_SERIES')
add('d418a6', '', '', '', 'D2', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', 'PATTERN_RECOGNITION', 'AL_FAM05_MEMBERSHIP_CHAIN under APTITUDE_REASONING_LOGIC')
add('d5f34b', '', '', '', 'D2', 'ANALYZE', 'REJECT', 'RJ_AMBIGUOUS')

# ═══ TECHNICAL_COMMUNICATION (30) ═══
add('97a686', 'TC_C02_INSTRUCTIONS', 'TC_F04_INSTRUCTIONS_PRODUCE_AN_OUTCOME', 'TC_FAM04_INSTRUCTION_OUTCOME', 'D3', 'APPLY', 'KEEP', 'KEEP_BOUNDARY')
add('9844bd', 'TC_C02_INSTRUCTIONS', 'TC_F04_INSTRUCTIONS_PRODUCE_AN_OUTCOME', 'TC_FAM04_INSTRUCTION_OUTCOME', 'D2', 'APPLY', 'KEEP', 'KEEP_BOUNDARY')
add('95cbe1', 'TC_C02_INSTRUCTIONS', 'TC_F04_INSTRUCTIONS_PRODUCE_AN_OUTCOME', 'TC_FAM04_INSTRUCTION_OUTCOME', 'D2', 'APPLY', 'KEEP', 'KEEP_BOUNDARY')
add('93f13c', 'TC_C02_INSTRUCTIONS', 'TC_F02_INSTRUCTIONS_HAVE_AN_ORDER_AND_A_SCOPE', 'TC_FAM02_INSTRUCTION_READING', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_STRONG')
add('948f73 966a18', 'TC_C02_INSTRUCTIONS', 'TC_F04_INSTRUCTIONS_PRODUCE_AN_OUTCOME', 'TC_FAM04_INSTRUCTION_OUTCOME', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_REDUNDANT', '95cbe1, and neither carries a boundary')
add('194246', 'TC_C01_VOCABULARY', 'TC_F01_TERMS_HAVE_PRECISE_MEANINGS', 'TC_FAM01_TERM_MEANING', 'D1', 'REMEMBER', 'KEEP', 'KEEP_STRONG')
add('18a40f', 'TC_C01_VOCABULARY', 'TC_F01_TERMS_HAVE_PRECISE_MEANINGS', 'TC_FAM01_TERM_MEANING', 'D1', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('1c5959', 'TC_C01_VOCABULARY', 'TC_F01_TERMS_HAVE_PRECISE_MEANINGS', 'TC_FAM01_TERM_MEANING', 'D1', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('1bbb22', 'TC_C01_VOCABULARY', 'TC_F01_TERMS_HAVE_PRECISE_MEANINGS', 'TC_FAM01_TERM_MEANING', 'D2', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('1805d8', 'TC_C01_VOCABULARY', 'TC_F01_TERMS_HAVE_PRECISE_MEANINGS', 'TC_FAM01_TERM_MEANING', 'D1', 'REMEMBER', 'REWRITE', 'RW_DISTRACTORS')
add('935305', 'TC_C04_READING', 'TC_F05_A_PASSAGE_ANSWERS_SOME_QUESTIONS_AND_NOT_OTHERS', 'TC_FAM05_READING_FOR_FACT', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_STRONG')
add('952daa', 'TC_C04_READING', 'TC_F05_A_PASSAGE_ANSWERS_SOME_QUESTIONS_AND_NOT_OTHERS', 'TC_FAM05_READING_FOR_FACT', 'D2', 'UNDERSTAND', 'REWRITE', 'RW_DISTRACTORS')
add('c09e12 b89547 b7f710 b9d1b5 917860 921697', 'TC_C04_READING', 'TC_F05_A_PASSAGE_ANSWERS_SOME_QUESTIONS_AND_NOT_OTHERS', 'TC_FAM05_READING_FOR_FACT', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_REDUNDANT', '935305 (short passage, single stated fact restated as the answer)')
add('14eec5', 'TC_C06_COMPLETENESS', 'TC_F07_A_REPORT_CAN_OMIT_WHAT_IS_NEEDED', 'TC_FAM07_MISSING_INFORMATION', 'D3', 'ANALYZE', 'REWRITE', 'RW_GRAMMAR_ONLY')
add('14508e', 'TC_C06_COMPLETENESS', 'TC_F07_A_REPORT_CAN_OMIT_WHAT_IS_NEEDED', 'TC_FAM07_MISSING_INFORMATION', 'D3', 'ANALYZE', 'REWRITE', 'RW_GRAMMAR_ONLY')
add('13b257 647b1e', 'TC_C09_ASKING', 'TC_F11_A_QUESTION_MUST_BE_ANSWERABLE', 'TC_FAM11_QUESTION_ANSWERABILITY', 'D3', 'EVALUATE', 'REWRITE', 'RW_GRAMMAR_ONLY')
add('49e41c', 'TC_C07_AUDIENCE', 'TC_F08_A_MESSAGE_ASSUMES_KNOWLEDGE', 'TC_FAM08_ASSUMED_KNOWLEDGE', 'D3', 'ANALYZE', 'REWRITE', 'RW_ADVICE_SHAPE')
add('1b1ceb', '', '', '', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_OUT_OF_SCOPE', 'the three wrong options are ungrammatical word salad, so the item measures English word order rather than technical communication.')
add('1a7eb4 651955 6aa944 6b477b 6be5b2', '', '', '', 'D2', 'EVALUATE', 'REJECT', 'RJ_NO_FAMILY_GAP', 'TECHNICAL_COMMUNICATION',
    'these measure professional conduct and tone. The TC blueprint deliberately frames feedback and messaging around ACTIONABILITY rather than politeness, so no family accepts a tone-only judgement.')

# ═══ APTITUDE_REASONING_LOGIC (41) ═══
add('cca121', 'AL_C03_INFERENCE', 'AL_F04_ONE_STEP_FOLLOWS_OR_DOES_NOT', 'AL_FAM04_SINGLE_INFERENCE', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('c8ebd7', 'AL_C03_INFERENCE', 'AL_F04_ONE_STEP_FOLLOWS_OR_DOES_NOT', 'AL_FAM04_SINGLE_INFERENCE', 'D2', 'APPLY', 'KEEP', 'KEEP_ONLY_OF_KIND')
add('ca2845', 'AL_C03_INFERENCE', 'AL_F04_ONE_STEP_FOLLOWS_OR_DOES_NOT', 'AL_FAM04_SINGLE_INFERENCE', 'D3', 'APPLY', 'KEEP', 'KEEP_OK')
add('c84da0 c98a0e d0566b', 'AL_C03_INFERENCE', 'AL_F04_ONE_STEP_FOLLOWS_OR_DOES_NOT', 'AL_FAM04_SINGLE_INFERENCE', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'cca121 (universal claim plus a named member)')
add('d0f4a2', 'AL_C05_CONDITIONALS', 'AL_F08_CONDITIONAL_DIRECTION_MATTERS', 'AL_FAM08_CONDITIONAL_REASONING', 'D2', 'APPLY', 'KEEP', 'KEEP_ONLY_OF_KIND')
add('cfb834', '', '', '', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_TAUTOLOGY')
add('d72fb9', 'AL_C06_ORDERING', 'AL_F11_ARRANGEMENTS_CAN_BE_TESTED', 'AL_FAM11_ARRANGEMENT_TESTING', 'D3', 'APPLY', 'KEEP', 'KEEP_BOUNDARY')
add('6f0b35', 'AL_C06_ORDERING', 'AL_F11_ARRANGEMENTS_CAN_BE_TESTED', 'AL_FAM11_ARRANGEMENT_TESTING', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('b4faad', 'AL_C05_CONDITIONALS', 'AL_F12_SUFFICIENT_IS_NOT_NECESSARY', 'AL_FAM12_SUFFICIENT_VS_NECESSARY', 'D3', 'ANALYZE', 'KEEP', 'KEEP_OK')
add('d69182 cfc525', 'AL_C06_ORDERING', 'AL_F11_ARRANGEMENTS_CAN_BE_TESTED', 'AL_FAM11_ARRANGEMENT_TESTING', 'D3', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'd72fb9 (a single numeric range with the endpoints offered as traps)')
add('cdea80', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')
add('ce88b7', 'AL_C06_ORDERING', 'AL_F09_CONSTRAINTS_LIMIT_ARRANGEMENTS', 'AL_FAM09_ORDERING_CONSTRAINTS', 'D2', 'ANALYZE', 'KEEP', 'KEEP_ONLY_OF_KIND')
add('3b9516', 'AL_C02_SETS', 'AL_F03_GROUPS_CAN_OVERLAP', 'AL_FAM03_OVERLAP_RECOGNITION', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_STRONG')
add('fef403 fd195e', 'AL_C07_CLASSIFICATION', 'AL_F10_A_GROUPING_IMPLIES_A_RULE', 'AL_FAM10_GROUPING_RULE', 'D2', 'ANALYZE', 'REWRITE', 'RW_NEEDS_RULE')
add('ae2b3c', 'AL_C07_CLASSIFICATION', 'AL_F10_A_GROUPING_IMPLIES_A_RULE', 'AL_FAM10_GROUPING_RULE', 'D2', 'ANALYZE', 'REWRITE', 'RW_NEEDS_RULE')
add('b005e1 fe55cc 003071', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_OUT_OF_SCOPE',
    'the discriminating property is botany, geometry or arithmetic rather than any reasoning the curriculum teaches.')
add('b45962 b27ebd b1e086 aec973 b1424f b0a418', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'APTITUDE_REASONING_LOGIC',
    'AS_FAM03_RELATION_NAMING / AS_FAM05_ANALOGY_COMPLETION under APTITUDE_REASONING_SERIES')
add('af6abe b14563 b0a72c b281d1 b1e39a b3be3f b32008 b2af2f', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY_GAP', 'APTITUDE_REASONING_LOGIC',
    'these are algebraic manipulation. No AL family covers algebra, and the blueprint places numeric work under APTITUDE_DATA_INTERPRETATION only where it is applied to data.')
add('3e0df2 3d6fbb 3af6df 3cd184 3c334d', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_NO_FAMILY_GAP', 'APTITUDE_REASONING_LOGIC',
    'set-notation recall and counting. AL_FAM03 measures overlap reasoning stated in words, deliberately not notation, so no family accepts these.')

# ═══ HOW_COMPUTERS_WORK (45) ═══
add('391875', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL', 'HCW_FAM01_IPO_LABELLING', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_STRONG')
add('3af31a', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL', 'HCW_FAM01_IPO_LABELLING', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_OK')
add('387a3e', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL', 'HCW_FAM01_IPO_LABELLING', 'D1', 'REMEMBER', 'REJECT', 'RJ_REDUNDANT', '391875')
add('39b6ac', 'HCW_C02_HARDWARE_SOFTWARE', 'HCW_F02_HARDWARE_VS_SOFTWARE', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D1', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('3ed5c2', 'HCW_C02_HARDWARE_SOFTWARE', 'HCW_F02_HARDWARE_VS_SOFTWARE', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D1', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('3f73f9', 'HCW_C02_HARDWARE_SOFTWARE', 'HCW_F02_HARDWARE_VS_SOFTWARE', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D2', 'REMEMBER', 'KEEP', 'KEEP_STRONG')
add('3a54e3 c7bba9 dd8a8c 3ccdbf', 'HCW_C02_HARDWARE_SOFTWARE', 'HCW_F02_HARDWARE_VS_SOFTWARE', 'HCW_FAM02_HW_SW_CLASSIFICATION', 'D1', 'REMEMBER', 'REJECT', 'RJ_REDUNDANT', '39b6ac / 3ed5c2 (naming one item of a given category)')
add('c67f3b', 'HCW_C05_OS_AND_APPS', 'HCW_F08_OS_MEDIATES', 'HCW_FAM08_OS_ROLE_IN_STACK', 'D2', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('3e378b', 'HCW_C05_OS_AND_APPS', 'HCW_F09_APPLICATION_PURPOSE', 'HCW_FAM09_APP_VS_OS_SELECTION', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_OK')
add('3945d3', 'HCW_C04_DATA_AND_FILES', 'HCW_F07_FILES_PERSIST', 'HCW_FAM07_PERSISTENCE_REASONING', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('39e40a', 'HCW_C03_PROGRAM_VS_PROCESS', 'HCW_F05_WORKING_MEMORY_ROLE', 'HCW_FAM05_WORKING_MEMORY_EFFECT', 'D2', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('38a79c', 'HCW_C03_PROGRAM_VS_PROCESS', 'HCW_F05_WORKING_MEMORY_ROLE', 'HCW_FAM05_WORKING_MEMORY_EFFECT', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('380965', 'HCW_C04_DATA_AND_FILES', 'HCW_F07_FILES_PERSIST', 'HCW_FAM07_PERSISTENCE_REASONING', 'D2', 'APPLY', 'REWRITE', 'RW_DISTRACTORS')
add('e456e9', 'HCW_C07_NETWORKS', 'HCW_F11_NETWORK_IS_CONNECTED_MACHINES', 'HCW_FAM11_NETWORK_SCOPE', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_STRONG')
add('e31a7b', 'HCW_C07_NETWORKS', 'HCW_F12_CLIENT_SERVER', 'HCW_FAM12_CLIENT_SERVER_ROLES', 'D2', 'ANALYZE', 'KEEP', 'KEEP_OK')
add('e27c44', 'HCW_C07_NETWORKS', 'HCW_F12_CLIENT_SERVER', 'HCW_FAM12_CLIENT_SERVER_ROLES', 'D2', 'ANALYZE', 'REJECT', 'RJ_REDUNDANT', 'e31a7b')
add('36ccf7 c5e104 c4a496 df6531 db11b0 dcec55 c542cd 3b9151 3c2f88', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')
add('362ec0 c2c9f1 c0ef4c 4242fe', '', '', '', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_ADVICE')
add('c36828 c4065f c22bba', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'HOW_COMPUTERS_WORK', 'OS_FAM07_PATH_REASONING / OS_FAM16_FILE_VS_DIRECTORY under OPERATING_SYSTEMS')
add('dec6fa dbafe7', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'HOW_COMPUTERS_WORK', 'BR_FAM02_URL_PARTS under BROWSER_FUNDAMENTALS')
add('dc4e1e', '', '', '', 'D2', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', 'HOW_COMPUTERS_WORK', 'HP_FAM10_TRANSPORT_SECURITY under HTTP')
add('376b2e 3d6bf6', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'HOW_COMPUTERS_WORK', 'CA_FAM08_IO_CLASSIFICATION / CA_FAM01_CPU_ROLE_SELECT under COMPUTER_ARCHITECTURE')
add('92efeb 938e22 942c59 8fd8d8 90770f 911546', '', '', '', 'D2', 'EVALUATE', 'REJECT', 'RJ_NO_FAMILY_GAP', 'HOW_COMPUTERS_WORK',
    'six sound digital-safety items (password strength, OTP sharing, phishing links, updates, public Wi-Fi). The HCW blueprint has NO digital-safety family, although the Year-1 curriculum module is named "Internet, Networks and Digital Safety". This is the clearest blueprint gap Phase 2 found.')

# ═══ PROGRAMMING_FUNDAMENTALS (53) ═══
add('7a7c52', 'PGF_C08_MULTI_VARIABLE', 'PGF_F11_VARIABLES_ARE_INDEPENDENT', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('73aff5', 'PGF_C08_MULTI_VARIABLE', 'PGF_F11_VARIABLES_ARE_INDEPENDENT', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('727387', 'PGF_C08_MULTI_VARIABLE', 'PGF_F11_VARIABLES_ARE_INDEPENDENT', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D3', 'APPLY', 'KEEP', 'KEEP_OK')
add('7311be', 'PGF_C08_MULTI_VARIABLE', 'PGF_F11_VARIABLES_ARE_INDEPENDENT', 'PGF_FAM13_MULTI_VARIABLE_TRACE', 'D3', 'APPLY', 'REJECT', 'RJ_REDUNDANT', '73aff5 (mirror image of the same copy-then-change trace)')
add('71d550', 'PGF_C01_VARIABLES', 'PGF_F01_ASSIGNMENT_STORES_VALUE', 'PGF_FAM01_ASSIGNMENT_DIRECTION', 'D2', 'REMEMBER', 'KEEP', 'KEEP_STRONG')
add('7b1a89', 'PGF_C01_VARIABLES', 'PGF_F01_ASSIGNMENT_STORES_VALUE', 'PGF_FAM04_VARIABLE_STATE_TRACE', 'D3', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('79de1b', 'PGF_C01_VARIABLES', 'PGF_F01_ASSIGNMENT_STORES_VALUE', 'PGF_FAM04_VARIABLE_STATE_TRACE', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('ede121 ee7f58 ef1d8f efbbc6 758a9a 74ec63 744e2c', 'PGF_C01_VARIABLES', 'PGF_F01_ASSIGNMENT_STORES_VALUE', 'PGF_FAM04_VARIABLE_STATE_TRACE', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT',
    '7b1a89 / 79de1b — seven further single-variable arithmetic traces of the identical shape (variable holds n, apply one operation, give the new value). Only the operator and the numbers differ')
add('4aaf3d 48d498 4972cf 4c89e2 4d2819 4b4d74', '', '', '', 'D1', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'HCW_FAM01_IPO_LABELLING under HOW_COMPUTERS_WORK')
add('4bebab 451f4e 45bd85 6258c5', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'CB_FAM05_BRANCH_SELECTION under CONDITIONALS_BASICS')
add('43e2e0 607e20', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'CB_FAM08_BOOLEAN_COMBINATION under CONDITIONALS_BASICS')
add('61ba8e', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'CB_FAM07_CHAIN_ORDER under CONDITIONALS_BASICS')
add('674a7d 64d1a1', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'LP_FAM06_ACCUMULATOR_RESULT / LP_FAM07_COUNTER_RESULT under LOOPS_BASICS')
add('660e0f 64336a', '', '', '', 'D3', 'ANALYZE', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'LP_FAM08_TERMINATION_REASONING under LOOPS_BASICS')
add('639533 62f6fc 656fd8', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'LP_FAM01_LOOP_PURPOSE under LOOPS_BASICS')
add('1db1fb 1e5032 1eee69 1a9ae8 1b391f', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'DA_FAM03_OPERATION_RECOGNITION / DA_FAM05_TRAVERSAL_RESULT under DSA_ARRAYS')
add('1bd756 1c758d 18220c 18c043 195e7a 9549de 97c2ba', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_NO_FAMILY', 'PROGRAMMING_FUNDAMENTALS', 'FN_FAM01_FUNCTION_PURPOSE / FN_FAM03_PARAMETER_VS_ARGUMENT / FN_FAM06_RETURN_VALUE_USE under FUNCTIONS_BASICS')
add('94aba7 940d70 9860f1 972483 96864c 9ad9cd 9a3b96', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')

# ═══ APTITUDE_DATA_INTERPRETATION (66) ═══
add('a61401', 'AD_C02_CHARTS', 'AD_F03_A_CHART_ENCODES_VALUES', 'AD_FAM03_CHART_READING', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_STRONG')
add('bef9f7', 'AD_C01_READING', 'AD_F01_A_TABLE_HAS_COORDINATES', 'AD_FAM01_TABLE_LOOKUP', 'D1', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('c702c2', 'AD_C01_READING', 'AD_F01_A_TABLE_HAS_COORDINATES', 'AD_FAM01_TABLE_LOOKUP', 'D1', 'REMEMBER', 'KEEP', 'KEEP_OK')
add('a7eea6', 'AD_C02_CHARTS', 'AD_F03_A_CHART_ENCODES_VALUES', 'AD_FAM03_CHART_READING', 'D1', 'UNDERSTAND', 'KEEP', 'KEEP_OK')
add('a92b14 487124 490f5b 4734b6', 'AD_C01_READING', 'AD_F01_A_TABLE_HAS_COORDINATES', 'AD_FAM01_TABLE_LOOKUP', 'D1', 'REMEMBER', 'REJECT', 'RJ_REDUNDANT', 'bef9f7 / c702c2 (pick the largest or smallest labelled value)')
add('a88cdd', 'AD_C03_AGGREGATION', 'AD_F04_TOTALS_AND_DIFFERENCES', 'AD_FAM04_TOTAL_AND_DIFFERENCE', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('c7a0f9', 'AD_C03_AGGREGATION', 'AD_F04_TOTALS_AND_DIFFERENCES', 'AD_FAM04_TOTAL_AND_DIFFERENCE', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('a9c94b a6b238 c5c654 a7506f', 'AD_C03_AGGREGATION', 'AD_F04_TOTALS_AND_DIFFERENCES', 'AD_FAM04_TOTAL_AND_DIFFERENCE', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT', 'a88cdd / c7a0f9')
add('a575ca', 'AD_C05_CHANGE', 'AD_F06_CHANGE_IS_RELATIVE_TO_THE_START', 'AD_FAM06_PERCENTAGE_CHANGE', 'D2', 'APPLY', 'KEEP', 'KEEP_STRONG')
add('34bbc8', 'AD_C04_PROPORTION', 'AD_F07_RATIOS_COMPARE_WITHOUT_TOTALS', 'AD_FAM07_RATIO_REASONING', 'D2', 'APPLY', 'KEEP', 'KEEP_OK')
add('3559ff 387112 390f49 3734a4 37d2db', 'AD_C04_PROPORTION', 'AD_F07_RATIOS_COMPARE_WITHOUT_TOTALS', 'AD_FAM07_RATIO_REASONING', 'D2', 'APPLY', 'REJECT', 'RJ_REDUNDANT',
    '34bbc8 — five further copies of one template with only the numbers changed, which is precisely the arbitrary-numbers pattern the blueprint forbids')
add('83089f', 'AD_C06_AVERAGES', 'AD_F08_AN_AVERAGE_HIDES_ITS_SPREAD', 'AD_FAM08_AVERAGE_REASONING', 'D3', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('41a4c7', 'AD_C06_AVERAGES', 'AD_F08_AN_AVERAGE_HIDES_ITS_SPREAD', 'AD_FAM08_AVERAGE_REASONING', 'D3', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('83a6d6', 'AD_C06_AVERAGES', 'AD_F08_AN_AVERAGE_HIDES_ITS_SPREAD', 'AD_FAM08_AVERAGE_REASONING', 'D2', 'UNDERSTAND', 'KEEP', 'KEEP_OK')
add('aa6782', 'AD_C06_AVERAGES', 'AD_F08_AN_AVERAGE_HIDES_ITS_SPREAD', 'AD_FAM08_AVERAGE_REASONING', 'D2', 'APPLY', 'REWRITE', 'RW_TOO_SHALLOW')
add('49ad92 31067e 31a4b5 2fca10 ae2e50 b008f5 861fb2', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_COMPUTATION')
add('a4d793', 'AD_C05_CHANGE', 'AD_F09_A_TREND_IS_A_DIRECTION_NOT_A_VALUE', 'AD_FAM09_TREND_READING', 'D2', 'ANALYZE', 'REWRITE', 'RW_NEEDS_DIP')
add('46967f 47d2ed', 'AD_C05_CHANGE', 'AD_F09_A_TREND_IS_A_DIRECTION_NOT_A_VALUE', 'AD_FAM09_TREND_READING', 'D2', 'ANALYZE', 'REJECT', 'RJ_REDUNDANT', 'a4d793 (a strictly monotonic series read as its own direction)')
add('bce8c8', 'AD_C08_QUALITY', 'AD_F12_DATA_CAN_BE_INCOMPLETE_OR_INCONSISTENT', 'AD_FAM12_DATA_QUALITY', 'D3', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('bf61a4', 'AD_C08_QUALITY', 'AD_F12_DATA_CAN_BE_INCOMPLETE_OR_INCONSISTENT', 'AD_FAM12_DATA_QUALITY', 'D3', 'ANALYZE', 'KEEP', 'KEEP_STRONG')
add('bec36d', 'AD_C08_QUALITY', 'AD_F12_DATA_CAN_BE_INCOMPLETE_OR_INCONSISTENT', 'AD_FAM12_DATA_QUALITY', 'D3', 'ANALYZE', 'REJECT', 'RJ_REDUNDANT', 'bce8c8 (an out-of-range value that needs verification)')
add('be2536 bfffdb', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')
add('c13c49', '', '', '', 'D2', 'UNDERSTAND', 'REJECT', 'RJ_ADVICE')
add('91b37d 8d5ffc 8dfe33 8e9c6a 0a87ce 09e997 0d9ee1 0d00aa 0c6273 0bc43c 1017bd 0f7986 0edb4f 36966d 84450d 4a4bc9 410690 387e03 391c3a', '', '', '', 'D1', 'APPLY', 'REJECT', 'RJ_COMPUTATION')
add('094b60', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY', 'APTITUDE_DATA_INTERPRETATION', 'PGF_FAM06_PRECEDENCE_REASONING under PROGRAMMING_FUNDAMENTALS')
add('85817b', '', '', '', 'D1', 'REMEMBER', 'REJECT', 'RJ_TRIVIA')
add('84e344 3a58a8 39ba71', '', '', '', 'D2', 'APPLY', 'REJECT', 'RJ_NO_FAMILY_GAP', 'APTITUDE_DATA_INTERPRETATION',
    'three sound elementary probability items. The AD blueprint has no probability family, although the source skill map lists "Probability and Statistics" under this skill. A gap to settle before authoring.')
