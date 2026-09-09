/**
 * How each skill's fifty approved questions are spread across its families.
 *
 * WHY THIS IS A SEPARATE FILE. Allocation is a different decision from design, changes on a
 * different rhythm, and has an arithmetic constraint the blueprint rows themselves cannot
 * express: every skill must total exactly fifty, ten at each difficulty. Keeping it apart means
 * the numbers can be re-planned without touching a single measurement objective, and reviewed as
 * a block rather than hunted for across seventy rows.
 *
 * THE ALLOCATION IS DELIBERATELY UNEVEN. A recognition family can carry four D1 questions
 * because there are four genuinely different things to recognise; a transfer family carries three
 * or four D5 questions because there are only a handful of situations worth transferring to.
 * Spreading fifty evenly over fifteen families would produce three of everything and force
 * wording variants to fill the gaps, which is the failure mode this whole exercise exists to
 * avoid.
 *
 * A FAMILY MAY RECEIVE ZERO AT A LEVEL INSIDE ITS OWN RANGE. Being able to be asked at D2 is not
 * a reason to be asked at D2 — the ten D2 questions go where they measure most, and a family
 * whose D2 form duplicates a neighbour's gets none.
 *
 * THE BINDING CONSTRAINT IS THE ENDS, NOT THE MIDDLE. D1 needs enough recognition-level families
 * to spread ten questions without piling them on one, and D5 needs enough transfer-level ones.
 * Batch 1 was authored before this rule existed and had to gain recognition families for
 * OPERATING_SYSTEMS and PROBLEM_SOLVING, and transfer families for COMPUTER_ARCHITECTURE and
 * HOW_COMPUTERS_WORK, because the honest allocation was otherwise impossible.
 */

import { allocateByTemplate, Allocation } from './allocationTemplate';

export type { Allocation };

export const FAMILY_ALLOCATION: Record<string, Allocation> = {
  /* ── COMPUTER_ARCHITECTURE ── D1 from 3 families, D5 from 4 ── */
  CA_FAM01_CPU_ROLE_SELECT: [4, 1, 0, 0, 0],
  CA_FAM02_OPERATION_ROUTING: [0, 1, 1, 0, 0],
  CA_FAM03_CONTROL_VS_COMPUTE: [0, 1, 1, 0, 0],
  CA_FAM04_REGISTER_PLACEMENT: [0, 1, 1, 0, 0],
  CA_FAM05_RAM_PURPOSE: [3, 1, 0, 0, 0],
  CA_FAM06_STORAGE_SELECTION: [0, 1, 1, 0, 0],
  CA_FAM07_HIERARCHY_ORDERING: [0, 1, 1, 2, 0],
  // Three D1 questions and no D2: its D2 form would repeat CA_FAM01's.
  CA_FAM08_IO_CLASSIFICATION: [3, 0, 0, 0, 0],
  CA_FAM09_COMPONENT_COMMUNICATION: [0, 1, 1, 0, 0],
  CA_FAM10_CYCLE_ORDERING: [0, 1, 1, 0, 0],
  CA_FAM11_DATA_FLOW_TRACE: [0, 0, 1, 2, 2],
  CA_FAM12_REPRESENTATION_REASONING: [0, 1, 1, 0, 0],
  CA_FAM13_BOTTLENECK_DIAGNOSIS: [0, 0, 1, 2, 3],
  CA_FAM14_TRADEOFF_DECISION: [0, 0, 0, 2, 3],
  CA_FAM15_HIERARCHY_TRANSFER: [0, 0, 0, 2, 2],

  /* ── HOW_COMPUTERS_WORK ── */
  HCW_FAM01_IPO_LABELLING: [4, 1, 0, 0, 0],
  HCW_FAM02_HW_SW_CLASSIFICATION: [3, 0, 0, 0, 0],
  HCW_FAM03_PROGRAM_NATURE: [0, 1, 1, 0, 0],
  HCW_FAM04_PROGRAM_PROCESS_DISTINCTION: [0, 1, 1, 1, 0],
  HCW_FAM05_WORKING_MEMORY_EFFECT: [0, 1, 1, 0, 0],
  HCW_FAM06_DIGITAL_REPRESENTATION_RECOGNITION: [3, 0, 0, 0, 0],
  HCW_FAM07_PERSISTENCE_REASONING: [0, 1, 1, 0, 0],
  HCW_FAM08_OS_ROLE_IN_STACK: [0, 1, 1, 1, 0],
  HCW_FAM09_APP_VS_OS_SELECTION: [0, 1, 1, 0, 0],
  HCW_FAM10_BOOT_ORDERING: [0, 1, 1, 0, 0],
  HCW_FAM11_NETWORK_SCOPE: [0, 1, 1, 0, 0],
  HCW_FAM12_CLIENT_SERVER_ROLES: [0, 1, 0, 2, 0],
  HCW_FAM13_ABSTRACTION_RECOGNITION: [0, 0, 1, 2, 3],
  HCW_FAM14_MODEL_DIAGNOSIS: [0, 0, 1, 2, 3],
  HCW_FAM15_LAYER_OWNERSHIP_TRANSFER: [0, 0, 0, 1, 2],
  HCW_FAM16_STACK_TRACE_TRANSFER: [0, 0, 0, 1, 2],

  /* ── OPERATING_SYSTEMS ── the skill that needed recognition families added ── */
  OS_FAM01_RESPONSIBILITY_IDENTIFICATION: [3, 0, 0, 0, 0],
  OS_FAM02_RESOURCE_ALLOCATION: [0, 1, 1, 1, 0],
  OS_FAM03_PROCESS_COMPARISON: [0, 1, 1, 1, 0],
  OS_FAM04_MULTITASKING_MECHANISM: [0, 1, 1, 0, 0],
  OS_FAM05_SCHEDULING_REASONING: [0, 0, 1, 1, 3],
  OS_FAM06_MEMORY_ISOLATION: [0, 1, 1, 1, 0],
  OS_FAM07_PATH_REASONING: [0, 1, 1, 1, 0],
  OS_FAM08_PERMISSION_DIAGNOSIS: [0, 0, 1, 1, 3],
  OS_FAM09_DEVICE_INTERACTION: [0, 1, 0, 1, 0],
  OS_FAM10_PRIVILEGE_BOUNDARY: [0, 0, 1, 1, 2],
  OS_FAM11_STARTUP_DEPENDENCY: [0, 1, 0, 0, 0],
  OS_FAM12_EXHAUSTION_DIAGNOSIS: [0, 0, 1, 2, 2],
  OS_FAM13_INTERFACE_EQUIVALENCE: [0, 1, 1, 0, 0],
  OS_FAM14_OS_RECOGNITION: [3, 1, 0, 0, 0],
  OS_FAM15_PROCESS_TERM_RECOGNITION: [2, 1, 0, 0, 0],
  OS_FAM16_FILE_VS_DIRECTORY: [2, 0, 0, 0, 0],

  /* ── PROBLEM_SOLVING ── */
  PS_FAM01_REQUIREMENT_EXTRACTION: [0, 2, 1, 0, 0],
  PS_FAM02_INPUT_IDENTIFICATION: [3, 1, 0, 0, 0],
  PS_FAM03_OUTPUT_IDENTIFICATION: [3, 1, 0, 0, 0],
  PS_FAM04_CONSTRAINT_REASONING: [0, 0, 1, 1, 0],
  PS_FAM05_ASSUMPTION_CHECKING: [0, 0, 1, 0, 1],
  PS_FAM06_DECOMPOSITION: [0, 0, 1, 1, 0],
  PS_FAM07_EXAMPLE_EVALUATION: [0, 2, 0, 1, 0],
  PS_FAM08_COUNTEREXAMPLE_SELECTION: [0, 0, 1, 0, 2],
  PS_FAM09_PATTERN_INFERENCE: [0, 0, 1, 1, 0],
  PS_FAM10_ALGORITHM_SELECTION: [0, 0, 1, 0, 2],
  PS_FAM11_STATE_TRACING: [0, 2, 0, 1, 0],
  PS_FAM12_EDGE_CASE_DISCOVERY: [0, 0, 1, 1, 1],
  PS_FAM13_BUG_DIAGNOSIS: [0, 0, 1, 1, 2],
  PS_FAM14_SOLUTION_COMPARISON: [0, 0, 0, 2, 1],
  PS_FAM15_TEST_SELECTION: [0, 0, 1, 1, 1],
  PS_FAM16_REQUIREMENT_VS_METHOD: [2, 1, 0, 0, 0],
  PS_FAM17_CONSTRAINT_RECOGNITION: [2, 1, 0, 0, 0],

  /* ── PSEUDOCODE_FLOWCHARTS ── */
  PF_FAM01_SYMBOL_RECOGNITION: [4, 1, 0, 0, 0],
  PF_FAM02_CONTROL_FLOW_READING: [0, 1, 1, 0, 0],
  PF_FAM03_ASSIGNMENT_EFFECT: [0, 2, 0, 0, 0],
  PF_FAM04_IO_STEP_EFFECT: [3, 0, 0, 0, 0],
  PF_FAM05_BRANCH_SELECTION: [0, 2, 1, 0, 0],
  PF_FAM06_CONDITION_SELECTION: [0, 0, 1, 1, 0],
  PF_FAM07_ITERATION_COUNT: [0, 1, 1, 1, 0],
  PF_FAM08_COUNTER_ACCUMULATOR_ROLE: [0, 1, 1, 1, 0],
  PF_FAM09_OUTPUT_PREDICTION: [0, 1, 2, 1, 0],
  PF_FAM10_STATE_TABLE_TRACE: [0, 0, 1, 1, 0],
  PF_FAM11_FORM_TRANSLATION: [0, 0, 1, 1, 0],
  PF_FAM12_MISSING_STEP_SELECTION: [0, 0, 1, 1, 3],
  PF_FAM13_LOGIC_ERROR_DIAGNOSIS: [0, 0, 0, 1, 4],
  PF_FAM14_EDGE_CASE_TRACE: [0, 0, 0, 2, 3],
  PF_FAM15_VARIABLE_ROLE_RECOGNITION: [3, 1, 0, 0, 0],

  /* ── PROGRAMMING_FUNDAMENTALS ── */
  PGF_FAM01_ASSIGNMENT_DIRECTION: [4, 1, 0, 0, 0],
  PGF_FAM02_LITERAL_TYPE: [3, 1, 0, 0, 0],
  PGF_FAM03_SINGLE_OUTPUT: [3, 1, 0, 0, 0],
  PGF_FAM04_VARIABLE_STATE_TRACE: [0, 1, 1, 0, 0],
  PGF_FAM05_EXPRESSION_EVALUATION: [0, 1, 1, 0, 0],
  PGF_FAM06_PRECEDENCE_REASONING: [0, 1, 1, 1, 0],
  PGF_FAM07_TYPE_DRIVEN_OPERATOR: [0, 1, 1, 1, 0],
  PGF_FAM08_INPUT_CONVERSION: [0, 1, 1, 1, 0],
  PGF_FAM09_STATEMENT_ORDER: [0, 1, 1, 1, 0],
  PGF_FAM10_DIVISION_BEHAVIOUR: [0, 1, 1, 1, 0],
  PGF_FAM11_ERROR_CLASSIFICATION: [0, 0, 1, 1, 0],
  PGF_FAM12_INITIALISATION_DIAGNOSIS: [0, 0, 1, 1, 0],
  PGF_FAM13_MULTI_VARIABLE_TRACE: [0, 0, 1, 1, 3],
  PGF_FAM14_EDGE_INPUT_BEHAVIOUR: [0, 0, 0, 1, 4],
  PGF_FAM15_FRAGMENT_EQUIVALENCE: [0, 0, 0, 1, 3],

  /* ── PYTHON_BASICS ── */
  PY_FAM01_LITERAL_TYPE: [4, 1, 0, 0, 0],
  PY_FAM02_PRINT_OUTPUT: [3, 1, 0, 0, 0],
  PY_FAM03_IDENTIFIER_VALIDITY: [3, 1, 0, 0, 0],
  PY_FAM04_ASSIGNMENT_TRACE: [0, 1, 1, 0, 0],
  PY_FAM05_STRING_INDEXING: [0, 1, 1, 0, 0],
  PY_FAM06_STRING_METHOD_RESULT: [0, 1, 1, 0, 0],
  PY_FAM07_LIST_MUTATION: [0, 1, 1, 1, 0],
  PY_FAM08_INPUT_TYPE: [0, 1, 1, 1, 0],
  PY_FAM09_CONVERSION_BEHAVIOUR: [0, 1, 1, 1, 0],
  PY_FAM10_DIVISION_OPERATORS: [0, 1, 1, 1, 0],
  PY_FAM11_TRUTHINESS: [0, 0, 1, 1, 0],
  PY_FAM12_INDEX_ERROR_DIAGNOSIS: [0, 0, 1, 1, 0],
  PY_FAM13_MULTI_STEP_TRACE: [0, 0, 1, 1, 3],
  PY_FAM14_EMPTY_SEQUENCE: [0, 0, 0, 2, 4],
  PY_FAM15_EXPRESSION_EQUIVALENCE: [0, 0, 0, 1, 3],

  /* ── CONDITIONALS_BASICS ── */
  CB_FAM01_OPERATOR_MEANING: [4, 1, 0, 0, 0],
  CB_FAM02_BOOLEAN_RECOGNITION: [3, 1, 0, 0, 0],
  CB_FAM03_STRUCTURE_RECOGNITION: [3, 1, 0, 0, 0],
  CB_FAM04_CONDITION_EVALUATION: [0, 2, 1, 0, 0],
  CB_FAM05_BRANCH_SELECTION: [0, 2, 1, 0, 0],
  CB_FAM06_ELSE_BEHAVIOUR: [0, 1, 1, 0, 0],
  CB_FAM07_CHAIN_ORDER: [0, 1, 1, 1, 0],
  CB_FAM08_BOOLEAN_COMBINATION: [0, 1, 1, 1, 0],
  CB_FAM09_BOUNDARY_BEHAVIOUR: [0, 0, 2, 1, 0],
  CB_FAM10_NESTED_TRACE: [0, 0, 1, 2, 0],
  CB_FAM11_CONDITION_SELECTION: [0, 0, 1, 2, 0],
  CB_FAM12_LOGIC_ERROR_DIAGNOSIS: [0, 0, 1, 1, 3],
  CB_FAM13_UNREACHABLE_BRANCH: [0, 0, 0, 1, 4],
  CB_FAM14_CONDITION_EQUIVALENCE: [0, 0, 0, 1, 3],

  /* ── LOOPS_BASICS ── */
  LP_FAM01_LOOP_PURPOSE: [4, 1, 0, 0, 0],
  LP_FAM02_RANGE_VALUES: [3, 1, 0, 0, 0],
  LP_FAM03_LOOP_KIND_SELECTION: [3, 1, 0, 0, 0],
  LP_FAM04_ITERATION_COUNT: [0, 2, 1, 0, 0],
  LP_FAM05_LOOP_VARIABLE_TRACE: [0, 2, 1, 0, 0],
  LP_FAM06_ACCUMULATOR_RESULT: [0, 1, 1, 1, 0],
  LP_FAM07_COUNTER_RESULT: [0, 1, 1, 1, 0],
  LP_FAM08_TERMINATION_REASONING: [0, 1, 1, 1, 0],
  LP_FAM09_ZERO_ITERATION: [0, 0, 1, 1, 0],
  LP_FAM10_NESTED_COUNT: [0, 0, 1, 1, 0],
  LP_FAM11_BREAK_EFFECT: [0, 0, 1, 1, 0],
  LP_FAM12_CONTINUE_EFFECT: [0, 0, 1, 1, 0],
  LP_FAM13_INFINITE_LOOP_DIAGNOSIS: [0, 0, 1, 1, 3],
  LP_FAM14_OFF_BY_ONE_DIAGNOSIS: [0, 0, 0, 1, 4],
  LP_FAM15_LOOP_EDGE_TRACE: [0, 0, 0, 1, 3],

  /* ── FUNCTIONS_BASICS ── */
  FN_FAM01_FUNCTION_PURPOSE: [4, 1, 0, 0, 0],
  FN_FAM02_DEFINITION_VS_CALL: [3, 1, 0, 0, 0],
  FN_FAM03_PARAMETER_VS_ARGUMENT: [3, 1, 0, 0, 0],
  FN_FAM04_CALL_ORDER_TRACE: [0, 2, 1, 0, 0],
  FN_FAM05_ARGUMENT_BINDING: [0, 2, 1, 0, 0],
  FN_FAM06_RETURN_VALUE_USE: [0, 1, 1, 1, 0],
  FN_FAM07_MISSING_RETURN: [0, 1, 1, 1, 0],
  FN_FAM08_CALL_INDEPENDENCE: [0, 1, 1, 1, 0],
  FN_FAM09_LOCAL_SCOPE: [0, 0, 2, 1, 0],
  FN_FAM10_SHADOWING: [0, 0, 1, 1, 0],
  FN_FAM11_RETURN_VS_PRINT: [0, 0, 1, 2, 0],
  FN_FAM12_DECOMPOSITION_CHOICE: [0, 0, 1, 1, 3],
  FN_FAM13_FUNCTION_BUG_DIAGNOSIS: [0, 0, 0, 1, 4],
  FN_FAM14_FUNCTION_EDGE_BEHAVIOUR: [0, 0, 0, 1, 3],
};

/**
 * Batches 3 to 5 are allocated by the shared template.
 *
 * Their families were authored in the order the template expects — three recognition, then
 * application, then diagnosis, then transfer — so the numbers follow from the design rather than
 * being chosen for each family separately. The merge still checks every allocated level against
 * the family's own declared range, so a design that drifted from the template order fails
 * validation instead of being quietly mis-planned.
 */
export function templatedAllocation(
  rows: Array<{ skillKey: string; familyId: string }>,
  skills: string[],
): Record<string, Allocation> {
  const out: Record<string, Allocation> = {};
  for (const skill of skills) {
    const ids = rows.filter(r => r.skillKey === skill).map(r => r.familyId);
    Object.assign(out, allocateByTemplate(ids));
  }
  return out;
}

/** Every skill's fifty questions, ten at each difficulty. Asserted, not assumed. */
export const PER_SKILL_TOTAL = 50;
export const PER_LEVEL_TOTAL = 10;
