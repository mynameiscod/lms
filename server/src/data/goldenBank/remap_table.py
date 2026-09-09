# -*- coding: utf-8 -*-
"""
Phase 2.5 — where each mis-filed Foundation question actually belongs.

ONE ENTRY PER CANDIDATE. A candidate is a Phase-2 REJECT or REWRITE whose review note said the
measurement does not belong to the skill it is filed under. Nothing else is touched.

THE FOUR ACTIONS, USED CONSISTENTLY
  REMAP_PRIMARY    the measurement belongs to another skill that IS in the Foundation blueprint,
                   and one named family accepts it.
  KEEP_CURRENT     do not remap. It duplicates a measurement already proposed or already kept,
                   so moving it would import the redundancy the blueprint forbids.
  OUT_OF_SCOPE     the measurement has no place in Foundation — either no canonical owner exists
                   anywhere in the committed taxonomy, or its owner is deliberately a later skill.
  BLUEPRINT_REVIEW it plausibly belongs in Foundation but no family accepts it. A human decides
                   whether to add a family, add a skill, or narrow the curriculum topic.

postDecision applies only to REMAP_PRIMARY: what the question becomes once it lands in the new
family. KEEP means it measures that family as written; REWRITE means the measurement is right but
the item needs work — usually because it sits below the family's difficulty range, or because its
distractors are absurd rather than plausible.
"""

T = {}


def add(ids, skill, concept, fact, family, action, conf, post, reason, *args):
    """args fill the %s placeholders in the reason template, in order."""
    for i in ids.split():
        T[i] = (skill, concept, fact, family, action, conf, post, reason, tuple(args))


R = {
    # -- remaps ------------------------------------------------------------
    'SERIES': 'Continues a numeric or letter series (%s). APTITUDE_REASONING_SERIES owns series; '
              'PATTERN_RECOGNITION owns repeating units, symmetry, transformations and grid movement. '
              'The two banks were filed the wrong way round.',
    'ANALOGY': 'Analogy completion in A:B::C:? form, which is AS_C02_ANALOGY. APTITUDE_REASONING_LOGIC '
               'measures inference from stated claims, not relational mapping.',
    'ORDERING': 'Transitive ordering from stated relations, which is AL_C06_ORDERING. There is no '
                'repeating unit or transformation here, so PATTERN_RECOGNITION does not own it.',
    'COND': 'Evaluates a condition and selects a branch (%s). CONDITIONALS_BASICS owns comparison, '
            'branching and boolean combination; PROGRAMMING_FUNDAMENTALS owns variables, types and '
            'expressions.',
    'EXPR': 'Measures %s, which is PROGRAMMING_FUNDAMENTALS.',
    'LOOP': 'Measures repetition (%s). LOOPS_BASICS owns iteration, accumulation, counting and '
            'termination.',
    'FN': 'Measures functions (%s). FUNCTIONS_BASICS owns reuse, parameters and return.',
    'IPO': 'Input-Process-Output labelling (%s), which is HCW_C01_IPO — the conceptual model of what '
           'a program does, not the variables-and-types blueprint of PROGRAMMING_FUNDAMENTALS.',
    'ARRAY': 'Measures working with a collection (%s). DSA_ARRAYS owns collections and traversal.',
    'DEBUG': 'Domain fault-spotting, not debugging methodology: %s. The blueprint gives DEBUGGING the '
             'method — reproduce, hypothesise, isolate, verify — precisely because every domain skill '
             'carries its own diagnosis family, so this belongs to %s.',
    'CCTRL': 'C control flow (%s). C_BASICS covers declarations, types, arithmetic and arrays; '
             'C_CONTROL_FLOW owns branching, loops and multi-way selection.',
    'HW': 'Names a hardware component or classifies a device by direction (%s). COMPUTER_ARCHITECTURE '
          'owns the machine; HOW_COMPUTERS_WORK owns the conceptual model above it.',
    'WEB': 'Measures %s, which belongs to %s rather than to the general model of how a computer works.',
    'OS': 'Measures %s. The committed Year-1 map puts this under T_FILES, "Files, Folders and the '
          'Command Line", whose only skill is OPERATING_SYSTEMS.',
    'PY': 'Measures %s rather than Python language mechanics, so %s owns it.',

    # -- do not remap ------------------------------------------------------
    'DUP': 'Do not remap: measures the same thing the same way as %s, already proposed for %s. '
           'Moving both would import into the Golden Bank exactly the cosmetic redundancy the '
           'blueprint forbids.',
    'STAY': 'Do not remap: it stays in %s. %s',

    # -- out of Foundation -------------------------------------------------
    'OOS_OWNED': 'Outside Foundation: %s The nearest canonical owner in the committed taxonomy is %s, '
                 'which is deliberately not a Foundation skill.',
    'OOS_NONE': 'Outside Foundation: %s No skill in the committed 91-skill taxonomy measures it.',

    # -- blueprint review --------------------------------------------------
    'REV_CURR': 'BLUEPRINT REVIEW — %s No %s family accepts it, but the committed Year-1 map does place '
                'this content there: %s So the gap is in the blueprint, not in the filing.',
    'REV_TAXONOMY': 'BLUEPRINT REVIEW — %s %s exists in the committed taxonomy but is absent from both '
                    'the Year-1 curriculum map and the Foundation blueprint, so a human must decide '
                    'whether Foundation should carry it.',
    'REV_NOWHERE': 'BLUEPRINT REVIEW — %s Checked against the committed sources rather than guessed: '
                   'no skill in the 91-skill taxonomy measures it, and no topic in the Year-1 '
                   'curriculum map covers it. %s',
}

# =========================================================================
# PATTERN_RECOGNITION -> APTITUDE_REASONING_SERIES  (the swapped banks, half one)
# =========================================================================
add('81cc31', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F01_A_SERIES_HAS_A_STEP',
    'AS_FAM01_CONSTANT_STEP', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES', 'constant step of +3')
add('826a68', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F01_A_SERIES_HAS_A_STEP',
    'AS_FAM01_CONSTANT_STEP', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES', 'constant step of +2')

add('5f02cb', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F04_THE_STEP_CAN_CHANGE',
    'AS_FAM04_CHANGING_STEP', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'the differences 2, 4, 8 themselves double')
add('808fc3', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F04_THE_STEP_CAN_CHANGE',
    'AS_FAM04_CHANGING_STEP', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'perfect squares, whose differences 3, 5, 7 rise by two')
add('5e6494', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F04_THE_STEP_CAN_CHANGE',
    'AS_FAM04_CHANGING_STEP', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'the step grows by one each term: -1, -2, -3')
add('5d2826', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F04_THE_STEP_CAN_CHANGE',
    'AS_FAM04_CHANGING_STEP', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'n(n+1), whose differences 4, 6, 8 rise by two')
add('5dc65d', 'APTITUDE_REASONING_SERIES', 'AS_C01_STEP', 'AS_F04_THE_STEP_CAN_CHANGE',
    'AS_FAM04_CHANGING_STEP', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'SERIES',
    'Fibonacci — note that no AS family names a two-term recurrence explicitly, so FAM04 is the '
    'closest fit rather than an exact one')

add('5fa102', 'APTITUDE_REASONING_SERIES', 'AS_C05_MULTIPLICATIVE', 'AS_F08_SERIES_CAN_MULTIPLY',
    'AS_FAM08_MULTIPLICATIVE_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES', 'each term is halved')
add('812dfa', 'APTITUDE_REASONING_SERIES', 'AS_C05_MULTIPLICATIVE', 'AS_F08_SERIES_CAN_MULTIPLY',
    'AS_FAM08_MULTIPLICATIVE_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES', 'each term doubles')
add('5c89ef', 'APTITUDE_REASONING_SERIES', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    '812dfa (each term doubles)', 'AS_FAM08_MULTIPLICATIVE_SERIES')

add('603f39', 'APTITUDE_REASONING_SERIES', 'AS_C06_POSITIONAL', 'AS_F09_POSITION_CAN_CARRY_THE_RULE',
    'AS_FAM09_POSITIONAL_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES', 'every second letter forward')
add('56fa00', 'APTITUDE_REASONING_SERIES', 'AS_C06_POSITIONAL', 'AS_F09_POSITION_CAN_CARRY_THE_RULE',
    'AS_FAM09_POSITIONAL_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES', 'every second letter backward')
add('579837', 'APTITUDE_REASONING_SERIES', 'AS_C06_POSITIONAL', 'AS_F09_POSITION_CAN_CARRY_THE_RULE',
    'AS_FAM09_POSITIONAL_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'overlapping letter pairs advancing one place')

add('b4f799', 'APTITUDE_REASONING_SERIES', 'AS_C03_ALTERNATION', 'AS_F10_TWO_ATTRIBUTES_CAN_VARY',
    'AS_FAM10_TWO_ATTRIBUTE_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'a letter advancing by two and a number advancing by two, each on its own rule')
add('b31cf4', 'APTITUDE_REASONING_SERIES', 'AS_C03_ALTERNATION', 'AS_F10_TWO_ATTRIBUTES_CAN_VARY',
    'AS_FAM10_TWO_ATTRIBUTE_SERIES', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'SERIES',
    'a number and a letter each advancing by one, independently')

add('d418a6', 'APTITUDE_REASONING_LOGIC', 'AL_C06_ORDERING', 'AL_F09_CONSTRAINTS_LIMIT_ARRANGEMENTS',
    'AL_FAM09_ORDERING_CONSTRAINTS', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'ORDERING')

# =========================================================================
# APTITUDE_REASONING_LOGIC -> APTITUDE_REASONING_SERIES  (the swapped banks, half two)
# =========================================================================
add('b1424f b45962 aec973 b1e086 b27ebd', 'APTITUDE_REASONING_SERIES', 'AS_C02_ANALOGY',
    'AS_F05_ANALOGIES_ARE_COMPLETED_BY_RELATION', 'AS_FAM05_ANALOGY_COMPLETION',
    'REMAP_PRIMARY', 'HIGH', 'KEEP', 'ANALOGY')
add('b0a418', 'APTITUDE_REASONING_SERIES', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    'b1424f (an agent and the action it performs)', 'AS_FAM05_ANALOGY_COMPLETION')

# =========================================================================
# PROGRAMMING_FUNDAMENTALS -> the skill that actually owns each measurement
# =========================================================================
add('4bebab', 'CONDITIONALS_BASICS', 'CB_C03_IF_STRUCTURE', 'CB_F03_ONE_BRANCH_RUNS',
    'CB_FAM05_BRANCH_SELECTION', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'COND',
    'age 20 against a threshold of 18')
add('451f4e', 'CONDITIONALS_BASICS', 'CB_C03_IF_STRUCTURE', 'CB_F03_ONE_BRANCH_RUNS',
    'CB_FAM05_BRANCH_SELECTION', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'COND',
    'marks 39 against a threshold of 40 — the else branch, which 4bebab does not exercise')
add('45bd85', 'CONDITIONALS_BASICS', 'CB_C01_COMPARISON', 'CB_F04_CONDITION_EVALUATION',
    'CB_FAM04_CONDITION_EVALUATION', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'COND',
    'a comparison between two named variables rather than against a literal')
add('6258c5', 'CONDITIONALS_BASICS', 'CB_C07_BOUNDARIES', 'CB_F08_BOUNDARY_DECIDES_INCLUSION',
    'CB_FAM09_BOUNDARY_BEHAVIOUR', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'COND',
    'the value exactly at the boundary of a strict comparison, where 0 is not less than 0')
add('61ba8e', 'CONDITIONALS_BASICS', 'CB_C05_CHAINS', 'CB_F06_CHAIN_ORDER_MATTERS',
    'CB_FAM07_CHAIN_ORDER', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'COND',
    'which arm of a three-way chain a value reaches')
add('607e20', 'CONDITIONALS_BASICS', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT',
    'CB_FAM08_BOOLEAN_COMBINATION', 'REMAP_PRIMARY', 'MEDIUM', 'KEEP', 'COND',
    'OR with one operand true')
add('43e2e0', 'CONDITIONALS_BASICS', 'CB_C06_BOOLEAN_LOGIC', 'CB_F07_AND_OR_NOT',
    'CB_FAM08_BOOLEAN_COMBINATION', 'REMAP_PRIMARY', 'MEDIUM', 'KEEP', 'COND',
    'AND with one operand false')

add('674a7d', 'LOOPS_BASICS', 'LP_C05_ACCUMULATION', 'LP_F05_ACCUMULATOR_BUILDS_RESULT',
    'LP_FAM06_ACCUMULATOR_RESULT', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'LOOP',
    'the value a running total holds after a stated number of additions')
add('62f6fc', 'LOOPS_BASICS', '', '', '', 'KEEP_CURRENT', 'MEDIUM', '', 'DUP',
    '674a7d (a running total built by repetition)', 'LP_FAM06_ACCUMULATOR_RESULT')
add('64d1a1', 'LOOPS_BASICS', 'LP_C05_ACCUMULATION', 'LP_F06_COUNTER_COUNTS_EVENTS',
    'LP_FAM07_COUNTER_RESULT', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'LOOP',
    'the value a counter holds after counting a stated number of events')
add('660e0f', 'LOOPS_BASICS', 'LP_C06_TERMINATION', 'LP_F07_CONDITION_MUST_BECOME_FALSE',
    'LP_FAM08_TERMINATION_REASONING', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'LOOP',
    'that a loop whose condition never changes does not terminate')
add('64336a', 'LOOPS_BASICS', 'LP_C06_TERMINATION', 'LP_F07_CONDITION_MUST_BECOME_FALSE',
    'LP_FAM08_TERMINATION_REASONING', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'LOOP',
    'what makes a loop stop — the same fact as 660e0f approached from the terminating side, so it '
    'needs the stem deepened to measure independently')
add('656fd8', 'LOOPS_BASICS', 'LP_C01_PURPOSE', 'LP_F01_LOOP_REPEATS',
    'LP_FAM01_LOOP_PURPOSE', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'LOOP',
    'recognising that examining every item calls for repetition — but three of its four options are '
    'absurd, so the item discriminates little as written')
add('639533', 'LOOPS_BASICS', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    '656fd8 (recognising that a repeated task calls for a loop)', 'LP_FAM01_LOOP_PURPOSE')

add('1bd756', 'FUNCTIONS_BASICS', 'FN_C01_PURPOSE', 'FN_F01_FUNCTION_NAMES_A_STEP',
    'FN_FAM01_FUNCTION_PURPOSE', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'FN',
    'what defining one reusable calculation gives you that copying it twenty times does not')
add('195e7a', 'FUNCTIONS_BASICS', 'FN_C01_PURPOSE', 'FN_F01_FUNCTION_NAMES_A_STEP',
    'FN_FAM01_FUNCTION_PURPOSE', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'FN',
    'choosing which of several tasks is worth making reusable — a different shape from 1bd756, but '
    'its three wrong options are absurd rather than plausible')
add('1c758d 9549de 97c2ba', 'FUNCTIONS_BASICS', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    '1bd756 (why reusable logic is worth naming)', 'FN_FAM01_FUNCTION_PURPOSE')
add('18220c', 'FUNCTIONS_BASICS', 'FN_C03_PARAMETERS', 'FN_F03_PARAMETER_VS_ARGUMENT',
    'FN_FAM03_PARAMETER_VS_ARGUMENT', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'FN',
    'that a value a reusable operation needs is supplied to it as an argument')
add('18c043', 'FUNCTIONS_BASICS', 'FN_C04_RETURN', 'FN_F06_RETURN_SENDS_VALUE_BACK',
    'FN_FAM06_RETURN_VALUE_USE', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'FN',
    'that the value a function sends back is its result')

add('4aaf3d', 'HOW_COMPUTERS_WORK', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL',
    'HCW_FAM01_IPO_LABELLING', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'IPO', 'identifying the inputs')
add('48d498', 'HOW_COMPUTERS_WORK', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL',
    'HCW_FAM01_IPO_LABELLING', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'IPO', 'identifying the output')
add('4972cf', 'HOW_COMPUTERS_WORK', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL',
    'HCW_FAM01_IPO_LABELLING', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'IPO',
    'identifying the processing step, which the other five do not ask for')
add('4b4d74', 'HOW_COMPUTERS_WORK', 'HCW_C01_IPO', 'HCW_F01_IPO_MODEL',
    'HCW_FAM01_IPO_LABELLING', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'IPO',
    'naming the model itself rather than applying it — recall, so it needs a stem that makes the '
    'student label a described task')
add('4c89e2', 'HOW_COMPUTERS_WORK', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    '4aaf3d (identifying the inputs of a described task)', 'HCW_FAM01_IPO_LABELLING')
add('4d2819', 'HOW_COMPUTERS_WORK', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    '48d498 (identifying the output of a described task)', 'HCW_FAM01_IPO_LABELLING')

add('1db1fb', 'DSA_ARRAYS', 'DA_C09_SELECTION', 'DA_F12_APPROACH_DEPENDS_ON_THE_DATA',
    'DA_FAM12_APPROACH_SELECTION', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'ARRAY',
    'choosing one collection over sixty separate values — the right measurement for FAM12, but far '
    'below its D3 floor and with absurd distractors')
add('1eee69', 'DSA_ARRAYS', 'DA_C03_TRAVERSAL', 'DA_F05_TRAVERSAL_VISITS_EACH_ITEM',
    'DA_FAM05_TRAVERSAL_RESULT', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'ARRAY',
    'that finding a maximum requires comparing while traversing — the family wants the result of the '
    'traversal over stated data, which this stem does not supply')
add('1e5032', 'DSA_ARRAYS', 'DA_C03_TRAVERSAL', 'DA_F05_TRAVERSAL_VISITS_EACH_ITEM',
    'DA_FAM05_TRAVERSAL_RESULT', 'REMAP_PRIMARY', 'LOW', 'REWRITE', 'ARRAY',
    'that every item must be visited — but it asks for the approach in words where the family asks '
    'for a computed result, so the fit is weak')
add('1b391f', 'DSA_ARRAYS', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    '1db1fb (why related values are grouped into one collection)', 'DA_FAM12_APPROACH_SELECTION')

# =========================================================================
# DEBUGGING -> the domain skill whose diagnosis family owns the fault
# =========================================================================
add('eca4b3', 'LOOPS_BASICS', 'LP_C10_DIAGNOSIS', 'LP_F13_OFF_BY_ONE',
    'LP_FAM14_OFF_BY_ONE_DIAGNOSIS', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'DEBUG',
    'a loop bound one short of its goal', 'LOOPS_BASICS')
add('f86fb9', 'LOOPS_BASICS', 'LP_C10_DIAGNOSIS', 'LP_F12_INFINITE_LOOP_CAUSE',
    'LP_FAM13_INFINITE_LOOP_DIAGNOSIS', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'DEBUG',
    'a control variable that is never updated', 'LOOPS_BASICS')
add('c03665', 'LOOPS_BASICS', '', '', '', 'KEEP_CURRENT', 'HIGH', '', 'DUP',
    'f86fb9 (a loop whose control variable is never updated)', 'LP_FAM13_INFINITE_LOOP_DIAGNOSIS')
add('ed42ea', 'CONDITIONALS_BASICS', 'CB_C10_DIAGNOSIS', 'CB_F11_WRONG_BRANCH_SYMPTOM',
    'CB_FAM12_LOGIC_ERROR_DIAGNOSIS', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'DEBUG',
    'OR used where both operands must hold', 'CONDITIONALS_BASICS')
add('ea2bd7', 'CONDITIONALS_BASICS', 'CB_C07_BOUNDARIES', 'CB_F08_BOUNDARY_DECIDES_INCLUSION',
    'CB_FAM09_BOUNDARY_BEHAVIOUR', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'DEBUG',
    'a strict comparison that excludes the boundary value it should include', 'CONDITIONALS_BASICS')
add('eaca0e', 'PSEUDOCODE_FLOWCHARTS', 'PF_C08_COMPLETION', 'PF_F12_MISSING_STEP',
    'PF_FAM12_MISSING_STEP_SELECTION', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'DEBUG',
    'an algorithm missing the comparison its goal requires', 'PSEUDOCODE_FLOWCHARTS')
add('f69514', 'PSEUDOCODE_FLOWCHARTS', 'PF_C09_LOGIC_ERRORS', 'PF_F13_LOGIC_ERROR_FROM_SYMPTOM',
    'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'REMAP_PRIMARY', 'HIGH', 'REWRITE', 'DEBUG',
    'a pseudocode step using subtraction where the goal states addition', 'PSEUDOCODE_FLOWCHARTS')
add('eb6845', 'PSEUDOCODE_FLOWCHARTS', 'PF_C09_LOGIC_ERRORS', 'PF_F13_LOGIC_ERROR_FROM_SYMPTOM',
    'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'DEBUG',
    'an average divided by the wrong count', 'PSEUDOCODE_FLOWCHARTS')
add('ec067c', 'PSEUDOCODE_FLOWCHARTS', 'PF_C09_LOGIC_ERRORS', 'PF_F13_LOGIC_ERROR_FROM_SYMPTOM',
    'PF_FAM13_LOGIC_ERROR_DIAGNOSIS', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'DEBUG',
    'a parity test using the wrong modulus', 'PSEUDOCODE_FLOWCHARTS')
add('be5bc0', 'FUNCTIONS_BASICS', 'FN_C04_RETURN', 'FN_F07_NO_RETURN_GIVES_NOTHING',
    'FN_FAM07_MISSING_RETURN', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'DEBUG',
    'a function that computes a value and neither returns nor prints it', 'FUNCTIONS_BASICS')
add('bf982e', 'C_BASICS', 'CC_C01_TYPES', 'CC_F01_VARIABLES_ARE_DECLARED_WITH_A_TYPE',
    'CC_FAM01_DECLARATION_RECOGNITION', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'DEBUG',
    'a C variable used without a declaration', 'C_BASICS')
add('c0d49c', 'PROGRAMMING_FUNDAMENTALS', 'PGF_C07_ERRORS', 'PGF_F09_ERROR_KINDS_DIFFER',
    'PGF_FAM11_ERROR_CLASSIFICATION', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'DEBUG',
    'assignment written where comparison was meant', 'PROGRAMMING_FUNDAMENTALS')

# =========================================================================
# C_BASICS -> C_CONTROL_FLOW
# =========================================================================
add('90ed31', 'C_CONTROL_FLOW', 'CF_C06_ACCUMULATION', 'CF_F08_ACCUMULATOR_NEEDS_INITIALISING',
    'CF_FAM08_ACCUMULATOR_IN_C', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'CCTRL',
    'a total accumulated across a counted loop')
add('918b68', 'C_CONTROL_FLOW', 'CF_C05_COUNTED_LOOPS', 'CF_F06_COUNTED_LOOP_HAS_THREE_PARTS',
    'CF_FAM06_COUNTED_LOOP_COUNT', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'CCTRL',
    'the values a counted loop produces from its start, condition and step')
add('8f128c', 'C_CONTROL_FLOW', 'CF_C08_MULTIWAY', 'CF_F10_CASES_FALL_THROUGH',
    'CF_FAM10_FALL_THROUGH', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'CCTRL',
    'multi-way selection — though every case here breaks, so removing one break is what would make '
    'it exercise the family\'s actual fact')
add('92299f', 'C_CONTROL_FLOW', 'CF_C02_CONDITIONS', 'CF_F02_CONDITIONS_ARE_NUMERIC',
    'CF_FAM02_CONDITION_TRUTH', 'REMAP_PRIMARY', 'MEDIUM', 'KEEP', 'CCTRL',
    'whether a numeric condition is satisfied, read off which branch printed')

# =========================================================================
# HOW_COMPUTERS_WORK -> COMPUTER_ARCHITECTURE / OPERATING_SYSTEMS / web skills
# =========================================================================
add('3d6bf6', 'COMPUTER_ARCHITECTURE', 'CA_C01_PROCESSOR', 'CA_F01_CPU_ROLE',
    'CA_FAM01_CPU_ROLE_SELECT', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'HW',
    'which component executes instructions')
add('376b2e', 'COMPUTER_ARCHITECTURE', 'CA_C03_IO_AND_BUSES', 'CA_F08_IO_DIRECTION',
    'CA_FAM08_IO_CLASSIFICATION', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'HW',
    'classifying named devices by the direction the data travels')
add('c22bba', 'OPERATING_SYSTEMS', 'OS_C05_FILESYSTEM', 'OS_F07_FILESYSTEM_ORGANISES',
    'OS_FAM07_PATH_REASONING', 'REMAP_PRIMARY', 'LOW', 'REWRITE', 'OS',
    'what names a file\'s location inside folders — recall of the term "path" rather than reasoning '
    'about one, so it needs a stem that makes the student resolve a path')
add('dec6fa', 'BROWSER_FUNDAMENTALS', 'BR_C02_URLS', 'BR_F02_URL_HAS_PARTS',
    'BR_FAM02_URL_PARTS', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'WEB',
    'what a web address is', 'BROWSER_FUNDAMENTALS')
add('dbafe7', 'BROWSER_FUNDAMENTALS', '', '', '', 'KEEP_CURRENT', 'MEDIUM', '', 'DUP',
    'dec6fa (what a web address identifies)', 'BR_FAM02_URL_PARTS')
add('dc4e1e', 'HTTP', 'HP_C07_SECURITY', 'HP_F10_ENCRYPTION_PROTECTS_TRANSIT_ONLY',
    'HP_FAM10_TRANSPORT_SECURITY', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'WEB',
    'what a secure connection does and does not guarantee — its distractor "the website is always '
    'truthful" is exactly the misconception the family names', 'HTTP')

# =========================================================================
# PYTHON_BASICS -> the skill the fragment actually exercises
# =========================================================================
add('6ec202', 'FUNCTIONS_BASICS', 'FN_C04_RETURN', 'FN_F06_RETURN_SENDS_VALUE_BACK',
    'FN_FAM06_RETURN_VALUE_USE', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'PY',
    'defining a function, calling it and using what it returns', 'FUNCTIONS_BASICS')
add('67f5a5', 'DSA_STRINGS', 'DS_C01_STRUCTURE', 'DS_F02_LENGTH_COUNTS_EVERYTHING',
    'DS_FAM02_LENGTH_COUNTING', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'PY',
    'the length of a piece of text', 'DSA_STRINGS')
add('661b00', 'DSA_ARRAYS', 'DA_C01_STRUCTURE', 'DA_F01_ARRAY_IS_INDEXED_SEQUENCE',
    'DA_FAM01_INDEX_RECOGNITION', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'PY',
    'reading the value at a stated position in an indexed collection', 'DSA_ARRAYS')

# =========================================================================
# APTITUDE_DATA_INTERPRETATION / APTITUDE_REASONING_LOGIC -> PROGRAMMING_FUNDAMENTALS
# =========================================================================
add('094b60', 'PROGRAMMING_FUNDAMENTALS', 'PGF_C04_EXPRESSIONS', 'PGF_F05_PRECEDENCE_DECIDES_ORDER',
    'PGF_FAM06_PRECEDENCE_REASONING', 'REMAP_PRIMARY', 'MEDIUM', 'REWRITE', 'EXPR',
    'operator precedence, which decides the value of an expression — there is no data to interpret '
    'here, so APTITUDE_DATA_INTERPRETATION does not own it, and the stem needs to be shown as code')
add('b2af2f', 'PROGRAMMING_FUNDAMENTALS', 'PGF_C01_VARIABLES', 'PGF_F01_ASSIGNMENT_STORES_VALUE',
    'PGF_FAM04_VARIABLE_STATE_TRACE', 'REMAP_PRIMARY', 'HIGH', 'KEEP', 'EXPR',
    'assignment rather than algebra: "a = a - 4" is the fact that a name is rebound to a value '
    'computed from its own old value, which is the hardest idea in PGF_C01_VARIABLES')

# =========================================================================
# STAYS PUT
# =========================================================================
add('b005e1', 'APTITUDE_REASONING_LOGIC', 'AL_C07_CLASSIFICATION', 'AL_F10_A_GROUPING_IMPLIES_A_RULE',
    'AL_FAM10_GROUPING_RULE', 'KEEP_CURRENT', 'MEDIUM', '', 'STAY', 'APTITUDE_REASONING_LOGIC',
    'Everyday category membership is the reasoning AL_FAM10 is for. As written it asks only which '
    'item differs, where the family asks for the property that separates them, so it needs that '
    'rewrite — but it does not need a different skill.')

# =========================================================================
# OUT OF FOUNDATION
# =========================================================================
add('4e0e04', 'C_POINTERS', '', '', '', 'OUT_OF_SCOPE', 'HIGH', '', 'OOS_OWNED',
    'the item dereferences a pointer, and the Foundation C blueprint deliberately stops at arrays '
    'and strings.', 'C_POINTERS')
add('b3eb9d b489d4 b5280b b5c642 003071', 'APTITUDE_QUANT_ARITHMETIC', '', '', '',
    'OUT_OF_SCOPE', 'HIGH', '', 'OOS_OWNED',
    'it asks for recall of a number-theory definition — even, prime, factor, multiple — and no '
    'Foundation skill measures that.', 'APTITUDE_QUANT_ARITHMETIC')
add('fe55cc', '', '', '', '', 'OUT_OF_SCOPE', 'HIGH', '', 'OOS_NONE',
    'the discriminating property is a geometric definition, not a reasoning step.')
add('1b1ceb', 'APTITUDE_VERBAL_GRAMMAR', '', '', '', 'OUT_OF_SCOPE', 'MEDIUM', '', 'OOS_OWNED',
    'three of its four options are ungrammatical word order, so it measures grammar rather than the '
    'precision TC_FAM09 is for — that family compares phrasings of the same requirement, all of them '
    'grammatical.', 'APTITUDE_VERBAL_GRAMMAR')

# =========================================================================
# BLUEPRINT REVIEW — the curriculum places it here, the blueprint has no family
# =========================================================================
add('84e344 39ba71 3a58a8', 'APTITUDE_DATA_INTERPRETATION', '', '', '',
    'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_CURR',
    'elementary probability.', 'APTITUDE_DATA_INTERPRETATION',
    'module M10_MATHS topic T_STATS, "Statistics Foundations", whose only skill is '
    'APTITUDE_DATA_INTERPRETATION.')
add('3c334d 3cd184 3d6fbb 3e0df2 3af6df', 'APTITUDE_REASONING_LOGIC', '', '', '',
    'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_CURR',
    'set notation — cardinality, membership, union, intersection, difference.', 'APTITUDE_REASONING_LOGIC',
    'module M10_MATHS topic T_LOGIC_MATH, "Logic and Discrete Maths", whose skills are '
    'APTITUDE_REASONING_LOGIC and APTITUDE_REASONING_SERIES — and AL_C02_SETS already exists as a '
    'concept, carrying only the two families about overlap and membership chains.')
add('c4065f c36828', 'OPERATING_SYSTEMS', '', '', '', 'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_CURR',
    'what copying and moving a file actually do.', 'OPERATING_SYSTEMS',
    'module M01_CS_FUNDAMENTALS topic T_FILES, "Files, Folders and the Command Line", whose only '
    'skill is OPERATING_SYSTEMS — but OS_FAM07 measures path resolution and OS_FAM16 file-versus-'
    'directory, and neither covers file operations.')
add('1a9ae8', 'DSA_ARRAYS', '', '', '', 'BLUEPRINT_REVIEW', 'MEDIUM', '', 'REV_CURR',
    'whether a collection may hold duplicate values.', 'DSA_ARRAYS',
    'module M07_DSA topic T_ARRAYS, "Arrays and Strings" — but the DA blueprint measures indexed '
    'behaviour and says nothing about which structures admit duplicates.')
add('cb64b3 cc02ea 589e1b 593c52 526ff5 57ffe4 513387 51d1be', 'PROBLEM_SOLVING', '', '', '',
    'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_CURR',
    'prerequisite ordering: put steps in the order their dependencies require.', 'PROBLEM_SOLVING',
    'module M02_COMPUTATIONAL_THINKING topic T_DECOMPOSITION, "Breaking Problems Down", whose only '
    'skill is PROBLEM_SOLVING. PS_FAM06 measures whether a breakdown covers the problem, not the '
    'order its parts must run in, so a new family is needed. These eight are the entire '
    'APTITUDE_REASONING_SERIES bank, and not one of them is a series.')
add('b281d1 b0a72c b3be3f b1e39a b14563 af6abe b32008', 'APTITUDE_QUANT_ARITHMETIC', '', '', '',
    'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_TAXONOMY',
    'algebraic manipulation — solve for x, evaluate f(x), translate words into an expression.',
    'APTITUDE_QUANT_ARITHMETIC')
add('6b477b 6be5b2 651955 6aa944 1a7eb4', 'COMMUNICATION', '', '', '',
    'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_TAXONOMY',
    'professional conduct — owning a mistake, receiving feedback, flagging a slipping deadline, '
    'disagreeing respectfully, choosing a professional register.', 'COMMUNICATION')
add('90770f 911546 92efeb 938e22 942c59 8fd8d8', '', '', '', '',
    'BLUEPRINT_REVIEW', 'HIGH', '', 'REV_NOWHERE',
    'digital safety — password strength, OTP sharing, phishing links, public Wi-Fi, why updates '
    'matter, what not to post.',
    'The nearest thing is COMPUTER_NETWORKS under M09_LINUX topic T_NETWORKING, but that topic is '
    'categorised DIRECTION and applies only to CLOUD_DEVOPS and CYBERSECURITY students, so it is not '
    'a universal Foundation home. These six carry the tag "Digital Safety | Passwords Phishing '
    'Privacy | Core" — which is where the Phase 2 note\'s claim that a Year-1 module is named '
    '"Internet, Networks and Digital Safety" actually came from. That was the questions\' own tag, '
    'not the curriculum. Owning this content needs a new canonical skill, not a new family.')
