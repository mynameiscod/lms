/**
 * Which canonical skill each spreadsheet skill name measures.
 *
 * WHY A TRANSLATION TABLE. The question bank is authored in the language of a diagnostic —
 * "Deductive Reasoning", "Iterative Thinking", "Data Numeracy" — and the system measures
 * canonical skills the curriculum also teaches. Those two vocabularies will never be the same
 * list, and they should not be: an author thinks in what a question probes, the planner thinks
 * in what a lesson can fix. This is the one place the two meet.
 *
 * EDIT THIS FILE, NOT THE SPREADSHEET. Re-tagging 400 rows to match internal keys would make
 * the bank unreadable to whoever writes questions, and every future bank would need the same
 * treatment. A name that appears here is understood; anything else is reported and skipped, so
 * a new category can never quietly land on the wrong skill.
 *
 * NULL MEANS "DO NOT MEASURE THIS". Some categories are not capabilities the plan can act on:
 * a self-reported learner profile is a claim, and admitting claims into Skill DNA is exactly
 * what the evidence model refuses. Those questions are still worth asking — they steer career
 * direction — they just must not move a score.
 */

/** A spreadsheet Skill_Measured value → a canonical CareerSkill key, or null to skip scoring. */
export const SKILL_NAME_TO_KEY: Record<string, string | null> = {
  // ── Digital and computer fundamentals ──
  'Digital Foundation': 'HOW_COMPUTERS_WORK',
  'Number Systems': 'COMPUTER_ARCHITECTURE',

  // ── Programming ──
  'Programming Aptitude': 'PROGRAMMING_FUNDAMENTALS',
  'Programming Knowledge': 'PROGRAMMING_FUNDAMENTALS',
  'Python Knowledge': 'PYTHON_BASICS',
  'C Knowledge': 'C_BASICS',
  'Iterative Thinking': 'LOOPS_BASICS',
  'Conditional Thinking': 'CONDITIONALS_BASICS',
  'Boolean Reasoning': 'CONDITIONALS_BASICS',
  'Pseudocode Tracing': 'PSEUDOCODE_FLOWCHARTS',

  // ── Problem solving ──
  'Algorithmic Thinking': 'PROBLEM_SOLVING',
  'Problem Formulation': 'PROBLEM_SOLVING',
  'Decomposition': 'PROBLEM_SOLVING',
  'Pattern Recognition': 'PATTERN_RECOGNITION',
  'Spatial Reasoning': 'PATTERN_RECOGNITION',

  // ── Debugging ──
  'Logical Debugging': 'DEBUGGING',
  'Debugging Ability': 'DEBUGGING',

  /**
   * ── Reasoning ──
   * The taxonomy has three aptitude skills where the bank has a dozen categories, so several
   * collapse. Series and analogy keeps its own key because sequence questions are a distinct
   * thing to be weak at; the rest divide by whether they reason over NUMBERS or over RULES.
   */
  'Sequential Reasoning': 'APTITUDE_REASONING_SERIES',
  'Deductive Reasoning': 'APTITUDE_REASONING_LOGIC',
  'Set Reasoning': 'APTITUDE_REASONING_LOGIC',
  'Relational Reasoning': 'APTITUDE_REASONING_LOGIC',
  'Classification Reasoning': 'APTITUDE_REASONING_LOGIC',
  'Constraint Reasoning': 'APTITUDE_REASONING_LOGIC',
  'Algebraic Thinking': 'APTITUDE_REASONING_LOGIC',

  // ── Numbers and data ──
  'Numerical Reasoning': 'APTITUDE_DATA_INTERPRETATION',
  'Data Reasoning': 'APTITUDE_DATA_INTERPRETATION',
  'Data Numeracy': 'APTITUDE_DATA_INTERPRETATION',
  'Data Quality Awareness': 'APTITUDE_DATA_INTERPRETATION',
  'Proportional Reasoning': 'APTITUDE_DATA_INTERPRETATION',
  'Probability & Statistics': 'APTITUDE_DATA_INTERPRETATION',
  'Trend Reasoning': 'APTITUDE_DATA_INTERPRETATION',

  // ── Communication ──
  'Reading Comprehension': 'TECHNICAL_COMMUNICATION',
  'Instruction Comprehension': 'TECHNICAL_COMMUNICATION',
  'Technical Vocabulary': 'TECHNICAL_COMMUNICATION',
  'Written Communication': 'TECHNICAL_COMMUNICATION',
  'Collaboration': 'TECHNICAL_COMMUNICATION',
  'Technical Explanation': 'TECHNICAL_EXPLANATION',

  /**
   * ── Asked, but never scored ──
   *
   * A learner profile is self-report: "how do you prefer to learn", "how many hours can you
   * give". Genuinely useful for steering a plan, and worth asking — but a claim is not a
   * demonstration, and letting one move a skill score would make Skill DNA a measure of what
   * students say about themselves.
   */
  'Learner Profile': null,

  /**
   * Coding Ability is rubric- and test-graded, not multiple choice — the rows carry no options
   * and their "correct answer" is a description of what a solution must do. Until there is
   * somewhere to run and mark them, importing them would create questions no screen can serve.
   */
  'Coding Ability': null,
};

/** Spreadsheet difficulty bands → the question model's own words. */
export const DIFFICULTY_MAP: Record<string, 'easy' | 'medium' | 'hard'> = {
  L1: 'easy',
  L2: 'medium',
  L3: 'hard',
};

/**
 * Question types that can be stored and auto-marked as written.
 *
 * Everything here has four options and one correct answer, whatever the sheet calls it — a
 * "Scenario" and a "Code Trace" are multiple choice in every respect that matters to grading.
 * Types absent from this list carry no options and cannot be marked, so they are reported and
 * skipped rather than stored as questions nothing can serve.
 */
export const GRADABLE_TYPES = new Set([
  'MCQ', 'Scenario', 'Language-Independent', 'Pseudocode',
  'Code Trace', 'Data Interpretation', 'Reading', 'Debugging',
]);
