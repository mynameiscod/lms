/**
 * P8A — the Year-1 curriculum expansion, as a SPECIFICATION.
 *
 * NOTHING HERE IS IMPORTED. It is data describing units that do not exist yet, so the capacity
 * audit can be re-run against the proposal before anybody writes a word of content or a single
 * database row. Inserting it is a separate, later, deliberate act.
 *
 * ── WHAT THE CAPACITY AUDIT ACTUALLY FOUND ────────────────────────────────────────────────
 *
 * Every realistic profile reaches ninety days, so this is not about length. It is about shape.
 * Across all fifteen modules:
 *
 *   VERIFICATION   0 units     no milestone reassessment exists anywhere
 *   INTEGRATION    9 units     eleven of fifteen modules contain nothing to build
 *   APPLICATION   18 units     five modules teach without any authentic debugging
 *
 * The consequence is legible in a beginner's plan: 74 of 90 units are instruction, not because
 * the allocation wants it that way but because application inventory runs out. M10_MATHS is forty
 * units with zero application and zero integration. M12_COMMUNICATION is seven units of
 * instruction and one practice. M15_APTITUDE is fifteen units with no application at all.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────────────────────
 *
 * NOT ONE CHECKPOINT PER TOPIC. Thirty-nine checkpoints would be thirty-nine wasted days. There
 * are eight verification units for thirty-nine topics, and every one validates several topics at
 * once — a day is only justified when there is genuinely a body of capability to re-measure.
 *
 * NOT AN ATTEMPT ON THE STRESS PROFILE. The all-skills-VERIFIED diagnostic reaches 32 of 90 and
 * would need roughly fifty-eight more post-mastery units to pass. It is a stress test, not a
 * student, and manufacturing fifty-eight units to satisfy it would corrupt the curriculum for
 * everybody who is real. The proposal below improves it as a side effect and does not target it.
 *
 * NOT A SUBSTITUTE FOR UNIT-LEVEL QUIZZES. A quiz bound inside an ordinary Learning Unit stays a
 * content asset inside that unit. None of the eight CHECKPOINT units below exists because a topic
 * wanted a quiz; each exists because a learner has accumulated capability across several topics
 * that nothing currently re-measures.
 */

import { LearningUnitType, LearningUnitCategory } from '../../models/CurriculumLearningUnit';

/* ------------------------------------------------------------------ *
 * New topics
 * ------------------------------------------------------------------ */

/**
 * Milestone topics, which have to exist before their units can be imported.
 *
 * Topics live in a flat `LearningCurriculum.topics[]` array — currently 39 entries — and the
 * importer SKIPS any unit whose topic is not in the curriculum, silently. A cross-topic checkpoint
 * genuinely belongs to no single existing topic, so it gets its own; placing a
 * variables-through-functions checkpoint inside T_FUNCTIONS would have worked mechanically and
 * described the curriculum falsely.
 *
 * Each is placed in the MODULE whose material it validates, so it ranks and sequences alongside
 * that material rather than drifting to the end of the programme.
 */
export interface ProposedTopic {
  topicCode: string;
  moduleCode: string;
  title: string;
  description: string;
  defaultDepth: 'FOUNDATION' | 'GUIDED' | 'STANDARD';
  mandatory: boolean;
  applicableDirections: string[];
  /** Spans the topics it re-measures. Inherited by its units unless a unit narrows it. */
  skillKeys: string[];
  prerequisiteSkillKeys: string[];
}

export const PROPOSED_TOPICS: ProposedTopic[] = [
  {
    topicCode: 'T_MILESTONE_EARLY',
    moduleCode: 'M02_COMPUTATIONAL_THINKING',
    title: 'Checkpoint — From Problem to Plan',
    description: 'Re-measuring the first weeks: what a computer does, and how a problem becomes a plan.',
    defaultDepth: 'FOUNDATION',
    mandatory: true,
    applicableDirections: [],
    skillKeys: ['HOW_COMPUTERS_WORK', 'COMPUTER_ARCHITECTURE', 'FILE_SYSTEMS_PERMISSIONS',
      'PROBLEM_SOLVING', 'PSEUDOCODE_FLOWCHARTS'],
    prerequisiteSkillKeys: [],
  },
  {
    topicCode: 'T_MILESTONE_PROGRAMMING',
    moduleCode: 'M03_PROGRAMMING',
    title: 'Checkpoint — Programming',
    description: 'Re-measuring the whole of programming: variables, conditions, loops and functions together.',
    defaultDepth: 'STANDARD',
    mandatory: true,
    applicableDirections: [],
    skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'CONDITIONALS_BASICS',
      'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
  },
  {
    topicCode: 'T_MILESTONE_WEB',
    moduleCode: 'M05_WEB_FUNDAMENTALS',
    title: 'Checkpoint — the Web',
    description: 'Re-measuring web work: structure, style, behaviour and the page somebody else has to use.',
    defaultDepth: 'STANDARD',
    mandatory: false,
    applicableDirections: ['WEB_DEVELOPMENT'],
    skillKeys: ['HTML', 'CSS', 'JS_BASICS', 'JS_DOM', 'HTML_FORMS', 'WEB_ACCESSIBILITY'],
    prerequisiteSkillKeys: ['HTML'],
  },
  {
    topicCode: 'T_MILESTONE_SYSTEMS',
    moduleCode: 'M09_LINUX',
    title: 'Checkpoint — Working on a Real Machine',
    description: 'Re-measuring the system layer: the shell, processes, memory and what the OS is doing.',
    defaultDepth: 'STANDARD',
    mandatory: true,
    applicableDirections: [],
    skillKeys: ['OPERATING_SYSTEMS', 'OS_PROCESSES', 'OS_MEMORY', 'SHELL_PIPELINES', 'SHELL_COMMANDS'],
    prerequisiteSkillKeys: ['SHELL_COMMANDS'],
  },
  {
    topicCode: 'T_MILESTONE_QUANT',
    moduleCode: 'M10_MATHS',
    title: 'Checkpoint — Reasoning You Can Show',
    description: 'Re-measuring the quantitative foundation: logic, sets, boolean algebra, number systems.',
    defaultDepth: 'STANDARD',
    mandatory: true,
    applicableDirections: [],
    skillKeys: ['NUMBER_SYSTEMS_BINARY', 'PROPOSITIONAL_LOGIC', 'SET_THEORY', 'BOOLEAN_ALGEBRA',
      'RELATIONS_FUNCTIONS', 'APTITUDE_REASONING_LOGIC'],
    prerequisiteSkillKeys: [],
  },
  {
    topicCode: 'T_MILESTONE_FOUNDATION',
    moduleCode: 'M14_CAPSTONE',
    title: 'Foundation Milestones',
    description: 'The two programme-level reassessments: halfway, and at the end.',
    defaultDepth: 'STANDARD',
    mandatory: true,
    applicableDirections: [],
    skillKeys: ['PROBLEM_SOLVING', 'DEBUGGING', 'SELF_LEARNING', 'PROGRAMMING_FUNDAMENTALS',
      'TECHNICAL_COMMUNICATION'],
    prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
  },
];

/* ------------------------------------------------------------------ *
 * New units
 * ------------------------------------------------------------------ */

export interface ProposedUnit {
  unitCode: string;
  moduleCode: string;
  topicCode: string;
  title: string;
  description: string;
  unitType: LearningUnitType;
  category: LearningUnitCategory;
  defaultDepth: string;
  applicableDirections: string[];
  skillKeys: string[];
  prerequisiteSkillKeys: string[];
  prerequisiteUnitCodes: string[];
  learningOutcomes: string[];
  estimatedMinutes: number;
  mandatory: boolean;
  displayOrder: number;
  /**
   * Set ONLY where the unitType default is insufficient.
   *
   * It is empty for all 27 proposals, which is the point: CHECKPOINT already serves all seven
   * states, REVIEW serves REVISION and VERIFIED, PROJECT serves STANDARD upward and DEBUG serves
   * GUIDED upward. Every unit below is the kind its type already describes, so the derivation
   * holds and there is nothing to override.
   */
  suitableStates?: string[];
  /** Why the existing 310 cannot serve this. Not optional — a proposal without one is padding. */
  whyNotExisting: string;
  /** Which capacity gap or profile this improves. */
  improves: string;
}

const UNIVERSAL: LearningUnitCategory = 'UNIVERSAL';
const DIRECTION: LearningUnitCategory = 'DIRECTION';
const EXPLORATION: LearningUnitCategory = 'EXPLORATION';
const ACADEMIC: LearningUnitCategory = 'ACADEMIC';

/* ---- verification: 8 units, 39 topics ----------------------------- */

const VERIFICATION_UNITS: ProposedUnit[] = [
  {
    unitCode: 'T_MILESTONE_EARLY_CHECKPOINT',
    moduleCode: 'M02_COMPUTATIONAL_THINKING',
    topicCode: 'T_MILESTONE_EARLY',
    title: 'Checkpoint: From Problem to Plan',
    description: 'A problem you have not seen: understood, planned in pseudocode, drawn where it '
      + 'branches and traced on paper. The pseudocode topic\'s work, together.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'FOUNDATION',
    applicableDirections: [],
    // Phase 21: only what the READY inventory teaches before it. Hardware and files are taught by
    // no published unit, so a checkpoint question about them measured prior knowledge, not the plan.
    skillKeys: ['PSEUDOCODE_FLOWCHARTS'],
    prerequisiteSkillKeys: ['PSEUDOCODE_FLOWCHARTS'],
    prerequisiteUnitCodes: ['T_PSEUDOCODE_PRACTICE'],
    learningOutcomes: [
      'Plan and trace an unfamiliar problem without writing code',
      'Find the logic error in a plan by dry-running it',
    ],
    estimatedMinutes: 90,
    mandatory: true,
    displayOrder: 10,
    whyNotExisting: 'Four topics and 29 units teach this ground and nothing re-measures any of it. '
      + 'The practice units inside each topic exercise one topic each; no unit asks whether the '
      + 'four together produced somebody who can plan.',
    improves: 'VERIFICATION 0 -> non-zero for every profile; gives the early-programme bands a '
      + 'measurement point, which is what later adaptive planning has to read.',
  },
  {
    unitCode: 'T_MILESTONE_PROGRAMMING_CHECKPOINT',
    moduleCode: 'M03_PROGRAMMING',
    topicCode: 'T_MILESTONE_PROGRAMMING',
    title: 'Checkpoint: Write a Program Unaided',
    description: 'One program, from a plain-language brief, using conditions, loops and functions, '
      + 'with no worked example in front of you.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    // Phase 21: gated on all three topics it measures, not on functions alone.
    skillKeys: ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteSkillKeys: ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteUnitCodes: ['T_CONDITIONS_PRACTICE', 'T_LOOPS_PRACTICE', 'T_FUNCTIONS_PRACTICE'],
    learningOutcomes: [
      'Write a working program from a brief, unaided',
      'Explain why each construct was the right choice',
    ],
    estimatedMinutes: 90,
    mandatory: true,
    displayOrder: 10,
    whyNotExisting: 'M03 is the largest universal module — 40 units across four topics — and each '
      + 'topic verifies only itself. The four mini-projects are builds, not measurements: a '
      + 'student can finish one by following the shape of the worked example above it.',
    improves: 'beginner and mixed; the programming band is where a wrong state estimate is most '
      + 'expensive later, because everything downstream declares PROGRAMMING_FUNDAMENTALS.',
  },
  {
    unitCode: 'T_MILESTONE_PROGRAMMING_REVISION',
    moduleCode: 'M03_PROGRAMMING',
    topicCode: 'T_MILESTONE_PROGRAMMING',
    title: 'Revisiting What the Checkpoint Found',
    description: 'Targeted return to whichever construct the checkpoint showed was not secure — '
      + 'not a repeat of the module.',
    unitType: 'REVIEW',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    skillKeys: ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteSkillKeys: ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteUnitCodes: ['T_MILESTONE_PROGRAMMING_CHECKPOINT'],
    learningOutcomes: ['Close the specific gap the checkpoint identified'],
    estimatedMinutes: 60,
    mandatory: true,
    displayOrder: 20,
    whyNotExisting: 'The only existing answer to a failed checkpoint would be re-teaching the '
      + 'topic, which REVIEW exists precisely not to be. Nothing in the 310 serves REVISION '
      + 'without also serving first exposure.',
    improves: 'mixed and any learner with a measured gap; REVISION-suitable inventory is 72 of a '
      + 'needed 90 and almost all of it is practice.',
  },
  {
    unitCode: 'T_MILESTONE_WEB_CHECKPOINT',
    moduleCode: 'M05_WEB_FUNDAMENTALS',
    topicCode: 'T_MILESTONE_WEB',
    title: 'Checkpoint: Build and Explain a Page',
    description: 'A small page built to a brief — structure, style, one piece of behaviour, a form '
      + 'that reports its own errors — then explained decision by decision.',
    unitType: 'CHECKPOINT',
    category: DIRECTION,
    defaultDepth: 'STANDARD',
    applicableDirections: ['WEB_DEVELOPMENT'],
    // Phase 21: its questions measure structure, style, the DOM, forms and accessibility, so its
    // gate is the practice for each of those rather than CSS alone.
    skillKeys: ['HTML', 'CSS', 'JS_DOM', 'HTML_FORMS', 'WEB_ACCESSIBILITY'],
    prerequisiteSkillKeys: ['HTML', 'CSS'],
    prerequisiteUnitCodes: ['T_HTML_PRACTICE', 'T_CSS_PRACTICE', 'T_JS_DOM_PRACTICE',
      'T_FORMS_PRACTICE', 'T_ACCESSIBILITY_PRACTICE'],
    learningOutcomes: [
      'Build a page to a brief using structure, style and behaviour together',
      'Defend each choice, including the accessibility ones',
    ],
    estimatedMinutes: 90,
    mandatory: false,
    displayOrder: 10,
    whyNotExisting: 'M05 is 57 units across six topics with four mini-projects, and every one of '
      + 'those projects is scoped to a single topic — a CSS project, a forms project. None asks '
      + 'for the six together, which is what any real page requires.',
    improves: 'web-focused, and undecided learners sampling web; the largest module in the '
      + 'curriculum currently has no measurement point at all.',
  },
  {
    unitCode: 'T_MILESTONE_SYSTEMS_CHECKPOINT',
    moduleCode: 'M09_LINUX',
    topicCode: 'T_MILESTONE_SYSTEMS',
    title: 'Checkpoint: Working on a Real Machine',
    description: 'Real work at a shell without step-by-step instructions: selecting lines, counting '
      + 'and ranking them, redirecting output and errors, and a script that stops safely on failure.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    // Phase 21: processes, memory and permissions are taught by no READY unit. Networking is, but it
    // is scoped to a direction, and a universal checkpoint gated on it would be unreachable for
    // everybody else — so this measures the shell work every learner is taught.
    skillKeys: ['SHELL_PIPELINES'],
    prerequisiteSkillKeys: ['SHELL_PIPELINES'],
    prerequisiteUnitCodes: ['T_SHELL_PIPELINES_PRACTICE'],
    learningOutcomes: [
      'Compose pipes, redirection and text tools to answer an unfamiliar question',
      'Explain what each stage of a pipeline does to the stream passing through it',
    ],
    estimatedMinutes: 75,
    mandatory: true,
    displayOrder: 10,
    whyNotExisting: 'M09 is 34 units across five topics with no project and no cross-topic work of '
      + 'any kind. Its practice units each stay inside one topic, so nothing establishes whether a '
      + 'learner can actually operate a machine.',
    improves: 'cloud-cyber-focused directly, and every universal profile — M09 is mandatory and '
      + 'the second-largest module.',
  },
  {
    unitCode: 'T_MILESTONE_QUANT_CHECKPOINT',
    moduleCode: 'M10_MATHS',
    topicCode: 'T_MILESTONE_QUANT',
    title: 'Checkpoint: Reasoning You Can Show',
    description: 'Problems that need boolean algebra and propositional logic together — truth '
      + 'tables, gates, simplification and implication — with the working shown, not the answer alone.',
    unitType: 'CHECKPOINT',
    category: ACADEMIC,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    // Phase 21: sets, relations, number systems and aptitude are taught by no READY unit.
    skillKeys: ['BOOLEAN_ALGEBRA', 'PROPOSITIONAL_LOGIC'],
    prerequisiteSkillKeys: ['BOOLEAN_ALGEBRA'],
    prerequisiteUnitCodes: ['T_BOOLEAN_PRACTICE'],
    learningOutcomes: [
      'Translate a rule into boolean logic, simplify it and say what the result means',
      'Show working that somebody else can check',
    ],
    estimatedMinutes: 75,
    mandatory: true,
    displayOrder: 10,
    whyNotExisting: 'M10 and M15 are 55 units between them with zero application and zero '
      + 'integration — the largest instruction-only region in the curriculum. Six practice units '
      + 'exist, each inside one topic.',
    improves: 'ai-data-focused and every academic-heavy learner; also the only measurement of '
      + 'APTITUDE skills, which placement processes ask about directly.',
  },
  {
    unitCode: 'T_MILESTONE_FOUNDATION_MIDPOINT',
    moduleCode: 'M14_CAPSTONE',
    topicCode: 'T_MILESTONE_FOUNDATION',
    title: 'Midpoint Reassessment',
    description: 'Halfway: what has actually stuck from planning in pseudocode, conditions, loops and '
      + 'functions, so the second half of the plan is built on evidence rather than on attendance.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    // Phase 21: it declared no prerequisite and measured skills no READY unit teaches, so suitability
    // alone decided its placement and it could land on day 14. It now re-measures the first half,
    // and cannot be scheduled until that half has been practised or demonstrated.
    skillKeys: ['PSEUDOCODE_FLOWCHARTS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteSkillKeys: ['PSEUDOCODE_FLOWCHARTS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteUnitCodes: ['T_PSEUDOCODE_PRACTICE', 'T_CONDITIONS_PRACTICE', 'T_LOOPS_PRACTICE',
      'T_FUNCTIONS_PRACTICE'],
    learningOutcomes: [
      'Demonstrate current capability across planning and the core of programming',
      'Leave with a measured state rather than an assumed one',
    ],
    estimatedMinutes: 90,
    mandatory: true,
    displayOrder: 10,
    whyNotExisting: 'The composer projects a student forward through their own plan for scheduling '
      + 'purposes and deliberately refuses to treat that projection as evidence. Nothing in the '
      + '310 units converts it into evidence, so a ninety-day plan is built once, from a day-one '
      + 'diagnostic, and never learns whether it was right.',
    improves: 'every profile. It is the single highest-value addition in this specification, '
      + 'because it is what would let a plan adapt mid-flight instead of mid-programme guessing.',
  },
  {
    unitCode: 'T_MILESTONE_FOUNDATION_READINESS',
    moduleCode: 'M14_CAPSTONE',
    topicCode: 'T_MILESTONE_FOUNDATION',
    title: 'Foundation Readiness Review',
    description: 'The exit measurement: what the learner can do unaided with arrays, databases and '
      + 'version control, what they can explain, and what the next stage should assume.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    // Phase 21: it depended on the midpoint alone and measured skills no READY unit teaches. It now
    // measures the universal core that follows the midpoint, and waits for that core to be practised.
    skillKeys: ['DSA_ARRAYS', 'SQL_BASICS', 'DB_FUNDAMENTALS', 'GIT_FUNDAMENTALS', 'GIT_BRANCHING'],
    prerequisiteSkillKeys: ['DSA_ARRAYS', 'SQL_BASICS', 'GIT_FUNDAMENTALS'],
    prerequisiteUnitCodes: ['T_MILESTONE_FOUNDATION_MIDPOINT', 'T_ARRAYS_PRACTICE', 'T_SQL_PRACTICE',
      'T_GIT_PRACTICE'],
    learningOutcomes: [
      'Demonstrate Foundation-level capability with data and version control, unaided',
      'Explain each choice well enough to repeat it on a different problem',
    ],
    estimatedMinutes: 90,
    mandatory: true,
    displayOrder: 20,
    whyNotExisting: 'T_CAPSTONE_PRESENTING presents one project. Nothing measures readiness for '
      + 'the stage that follows, so promotion out of Foundation would currently rest on having '
      + 'attended ninety days.',
    improves: 'every profile, and it is the prerequisite for any later stage-progression decision '
      + 'being defensible.',
  },
];

/* ---- integration: 12 units, for the 11 modules with nothing to build ---- */

const project = (
  unitCode: string, moduleCode: string, topicCode: string, title: string, description: string,
  skillKeys: string[], prerequisiteUnitCodes: string[], learningOutcomes: string[],
  estimatedMinutes: number, extra: Partial<ProposedUnit>, whyNotExisting: string, improves: string,
): ProposedUnit => ({
  unitCode, moduleCode, topicCode, title, description,
  unitType: 'PROJECT',
  category: UNIVERSAL,
  defaultDepth: 'STANDARD',
  applicableDirections: [],
  skillKeys,
  prerequisiteSkillKeys: [],
  prerequisiteUnitCodes,
  learningOutcomes,
  estimatedMinutes,
  mandatory: true,
  displayOrder: 900,
  whyNotExisting,
  improves,
  ...extra,
});

const INTEGRATION_UNITS: ProposedUnit[] = [
  project('T_GIT_MINI_PROJECT', 'M04_DEVELOPER_TOOLS', 'T_GIT',
    'Mini Project — a repository somebody else can follow',
    'A real repository: branches used for real reasons, a history that reads, a README that works.',
    ['GIT_FUNDAMENTALS', 'GIT_BRANCHING'], ['T_GIT_PRACTICE'],
    ['Produce a repository a stranger could pick up and contribute to'], 120, {},
    'T_GIT has ten units with practice and debugging and nothing built. Git is only learned by '
    + 'living with a history, which no single-session practice unit can ask for.',
    'beginner and mixed; M04 is mandatory and universal, so this lands in every plan.'),

  project('T_C_BASICS_MINI_PROJECT', 'M06_C_PROGRAMMING', 'T_C_BASICS',
    'Mini Project — a C program end to end',
    'Something small written in C, compiled, made to work, and explained — including what the '
    + 'compiler complained about along the way.',
    ['C_BASICS', 'C_CONTROL_FLOW'], ['T_C_BASICS_PRACTICE'],
    ['Build and explain a working C program, compiler errors included'], 120,
    { mandatory: false },
    'M06 is ten units with no project. The M03 mini-projects are Python and cannot substitute: '
    + 'the point of C here is manual memory and compilation, which Python hides.',
    'software-focused; also the only integration work in the curriculum below the runtime.'),

  project('T_ARRAYS_MINI_PROJECT', 'M07_DSA', 'T_ARRAYS',
    'Mini Project — solve it, then justify the cost',
    'A problem set solved with chosen structures, then a written account of why those and what '
    + 'they cost.',
    ['DSA_ARRAYS', 'DSA_STRINGS'], ['T_ARRAYS_PRACTICE'],
    ['Choose structures for a problem and defend the choice on cost'], 120, {},
    'M07 has eleven units, practice and debugging, nothing integrative. The existing complexity '
    + 'unit teaches the reasoning; nothing makes a learner apply it to their own solution.',
    'software-focused and every interview-facing learner; extends the eight ENRICHMENT-capable '
    + 'units, which are the scarcest kind in the design.'),

  project('T_SQL_MINI_PROJECT', 'M08_DATABASES', 'T_SQL',
    'Mini Project — design a schema and answer real questions',
    'A small schema designed from a description, populated, then queried to answer questions '
    + 'somebody actually asked.',
    ['DB_FUNDAMENTALS', 'SQL_BASICS'], ['T_SQL_PRACTICE'],
    ['Design a workable schema and answer real questions with it'], 120, {},
    'M08 is twelve units with practice and debugging. Querying somebody else\'s schema is a '
    + 'different skill from designing one, and only the first is currently taught.',
    'software-focused, ai-data-focused; M08 is mandatory so it reaches every plan.'),

  project('T_SHELL_PIPELINES_MINI_PROJECT', 'M09_LINUX', 'T_SHELL_PIPELINES',
    'Mini Project — automate something you do by hand',
    'A script that removes a real repetitive task, with the failure cases handled rather than '
    + 'assumed away.',
    ['SHELL_PIPELINES', 'SHELL_COMMANDS'], ['T_SHELL_PIPELINES_PRACTICE'],
    ['Automate a real task, including what happens when it goes wrong'], 120, {},
    'T_SHELL_PIPELINES has seven units and only practice — no debugging and no project — in the '
    + 'module where automation is the entire point.',
    'cloud-cyber-focused; and it is the first project in M09, which has 34 units.'),

  project('T_LOGIC_MATH_MINI_PROJECT', 'M10_MATHS', 'T_LOGIC_MATH',
    'Mini Project — model a real problem in logic and sets',
    'Take an untidy real requirement, state it formally, and show the formal statement answers the '
    + 'question the requirement was asking.',
    ['PROPOSITIONAL_LOGIC', 'SET_THEORY'], ['T_LOGIC_MATH_PRACTICE'],
    ['Turn an informal requirement into a formal statement that survives checking'], 120,
    { category: ACADEMIC },
    'M10 is forty units with zero integration and zero application — the largest '
    + 'instruction-only region in the curriculum. Its practice units compute; none models.',
    'every universal profile; M10 is mandatory and second-largest, and currently contributes '
    + 'nothing but instruction to any plan.'),

  project('T_STATS_MINI_PROJECT', 'M10_MATHS', 'T_STATS',
    'Mini Project — a claim, a dataset, and an honest conclusion',
    'Take a claim, find or use data, and report what the data does and does not support.',
    ['PROBABILITY_STATISTICS'], ['T_STATS_PRACTICE'],
    ['Reach a conclusion a dataset actually supports, and say where it stops'], 120,
    { category: DIRECTION, applicableDirections: ['AI_ML', 'DATA'], mandatory: false },
    'The existing misleading-statistics unit teaches criticism of somebody else\'s chart. Nothing '
    + 'asks a learner to produce an honest analysis of their own and be criticised in turn.',
    'ai-data-focused, and undecided learners sampling AI/data — a direction family that currently '
    + 'has no project of any kind.'),

  project('T_ML_INTRO_MINI_PROJECT', 'M11_AI_LITERACY', 'T_ML_INTRO',
    'Mini Project — a model, its errors, and what you would tell somebody',
    'Build or run a simple model, examine where it is wrong, and write the honest summary a '
    + 'non-technical person would need.',
    ['AI_ML_CONCEPTS'], ['T_ML_INTRO_PRACTICE'],
    ['Evaluate a model\'s errors and report them in terms a non-specialist can act on'], 120,
    { category: DIRECTION, applicableDirections: ['AI_ML', 'DATA'], mandatory: false },
    'T_ML_INTRO is seven units of instruction and practice. The AI/DATA direction family has 21 '
    + 'units and not one thing to build, so a learner can sample it without ever making anything.',
    'ai-data-focused and undecided; closes one of the two direction families with zero projects.'),

  project('T_NETWORKING_MINI_PROJECT', 'M09_LINUX', 'T_NETWORKING',
    'Mini Project — map and diagnose a network',
    'Map what is actually talking to what, then find and explain a fault in it.',
    ['COMPUTER_NETWORKS'], ['T_NETWORKING_PRACTICE'],
    ['Produce an accurate map of a real network and locate a fault in it'], 120,
    { category: DIRECTION, applicableDirections: ['CLOUD_DEVOPS', 'CYBERSECURITY'], mandatory: false },
    'The CLOUD_DEVOPS/CYBERSECURITY family is eight units — the smallest in the design — with no '
    + 'project. An undecided learner sampling it reaches its ceiling in six units.',
    'cloud-cyber-focused and undecided breadth; the small family is the one that runs out first '
    + 'under the breadth rule, so adding depth there widens genuine exploration.'),

  project('T_AI_CODING_MINI_PROJECT', 'M11_AI_LITERACY', 'T_AI_CODING',
    'Mini Project — built with AI, explained without it',
    'Something built with assistance, then explained line by line with the assistant closed.',
    ['AI_ASSISTED_CODING'], ['T_AI_CODING_PRACTICE'],
    ['Ship assisted work you can fully explain unaided'], 120, {},
    'T_AI_CODING teaches reading, testing and owning generated code across six units. Nothing '
    + 'requires a learner to stand behind a finished artefact, which is the only test that '
    + 'distinguishes using these tools from being used by them.',
    'every profile; M11 is mandatory and this is the module\'s only integration work.'),

  project('T_TECH_COMM_MINI_PROJECT', 'M12_COMMUNICATION', 'T_TECH_COMM',
    'Mini Project — documentation somebody else can act on',
    'Document one of your own earlier projects well enough that another learner can run it '
    + 'without asking you anything.',
    ['TECHNICAL_COMMUNICATION', 'TECHNICAL_EXPLANATION'], ['T_TECH_COMM_PRACTICE'],
    ['Produce documentation that a stranger can follow unaided'], 90, {},
    'M12 is seven units: six instruction, one practice, nothing else in the whole module. It also '
    + 'consumes earlier project work, which nothing else in the curriculum does.',
    'every profile; M12 is mandatory and currently contributes almost pure instruction.'),

  project('T_CAREER_MAP_DIRECTION_PROJECT', 'M13_CAREER', 'T_CAREER_MAP',
    'Direction Project — Spend a Day Inside One',
    'Spend the day inside one direction you are considering, build the smallest real thing in it, '
    + 'and record what it was actually like.',
    ['TECH_CAREER_AWARENESS'], ['T_CAREER_MAP_PRACTICE'],
    ['Report first-hand what working in a direction is like, from having done some'], 120,
    { category: EXPLORATION, mandatory: false },
    'M13 is six units of reading about roles. An undecided learner can currently finish the whole '
    + 'career module without having tried anything, which is the one thing that would actually '
    + 'inform the choice.',
    'undecided and strong-undecided, who now sample three direction families but never build '
    + 'inside one. Lands in INTEGRATION because a project is a project, and serves exploration.'),
];

/* ---- application: 7 units, for the 5 modules that teach without debugging ---- */

const debug = (
  unitCode: string, moduleCode: string, topicCode: string, title: string, description: string,
  skillKeys: string[], learningOutcomes: string[], estimatedMinutes: number,
  extra: Partial<ProposedUnit>, whyNotExisting: string, improves: string,
): ProposedUnit => ({
  unitCode, moduleCode, topicCode, title, description,
  unitType: 'DEBUG',
  category: UNIVERSAL,
  defaultDepth: 'STANDARD',
  applicableDirections: [],
  skillKeys,
  prerequisiteSkillKeys: [],
  prerequisiteUnitCodes: [],
  learningOutcomes,
  estimatedMinutes,
  mandatory: true,
  displayOrder: 800,
  whyNotExisting,
  improves,
  ...extra,
});

const APPLICATION_UNITS: ProposedUnit[] = [
  debug('T_HARDWARE_DEBUGGING', 'M01_CS_FUNDAMENTALS', 'T_HARDWARE',
    'Why Is It Slow?',
    'A machine behaving badly, and the reasoning that finds the cause instead of reinstalling '
    + 'things at random.',
    ['HOW_COMPUTERS_WORK', 'COMPUTER_ARCHITECTURE'],
    ['Diagnose a slow or failing machine from what it is actually doing'], 45,
    // Diagnosing a slow machine uses every hardware layer, so it follows the topic's practice
    // rather than being schedulable straight after the first hardware lesson.
    { defaultDepth: 'FOUNDATION', prerequisiteUnitCodes: ['T_HARDWARE_PRACTICE'] },
    'M01 is sixteen units with no application at all — the first module a beginner meets teaches '
    + 'how a computer works and never asks them to use that to explain a real symptom.',
    'beginner and mixed; adds the earliest APPLICATION unit in the programme, which matters '
    + 'because a beginner\'s plan is otherwise instruction until the programming module.'),

  debug('T_FILES_DEBUGGING', 'M01_CS_FUNDAMENTALS', 'T_FILES',
    'When the Path Is Wrong',
    'Permission denied, no such file, and the other things that stop a beginner for an hour — '
    + 'read properly rather than worked around.',
    ['FILE_SYSTEMS_PERMISSIONS', 'SHELL_COMMANDS'],
    ['Read a path or permission error and fix the actual cause'], 45,
    // Path and permission errors need paths, navigation and permissions: it follows the deeper
    // Command Line Practice, not the first file lesson.
    { defaultDepth: 'FOUNDATION', prerequisiteUnitCodes: ['T_FILES_PRACTICE'] },
    'T_FILES has eight units and only practice. Path and permission faults are the single '
    + 'commonest early blocker and nothing in the curriculum treats them as a skill.',
    'beginner; also feeds the systems checkpoint and the shell project, both of which assume '
    + 'this reading ability.'),

  debug('T_BOOLEAN_DEBUGGING', 'M10_MATHS', 'T_BOOLEAN',
    'Finding the Flaw in an Argument',
    'An argument that looks sound and is not. Locate the step that fails and say why.',
    ['BOOLEAN_ALGEBRA', 'PROPOSITIONAL_LOGIC'],
    ['Locate the invalid step in a plausible-looking argument'], 45,
    { category: ACADEMIC },
    'M10 has zero application across forty units. The existing simplification unit transforms '
    + 'correct expressions; nothing asks a learner to find a fault in reasoning, which is what '
    + 'the skill is for.',
    'every universal profile, and it is the kind of work the quantitative checkpoint measures.'),

  debug('T_STATS_DEBUGGING', 'M10_MATHS', 'T_STATS',
    'Finding the Error in an Analysis',
    'A finished analysis with a real mistake in it — sampling, baseline, or a conclusion the '
    + 'numbers do not reach.',
    ['PROBABILITY_STATISTICS'],
    ['Find and explain the error in a complete-looking analysis'], 50,
    { category: DIRECTION, applicableDirections: ['AI_ML', 'DATA'], mandatory: false },
    'The misleading-charts unit covers presentation. This is about method, which is where the '
    + 'errors that matter actually live, and no unit currently covers it.',
    'ai-data-focused; the AI/DATA family has 21 units and one debugging unit between them.'),

  debug('T_TECH_COMM_DEBUGGING', 'M12_COMMUNICATION', 'T_TECH_COMM',
    'Fixing an Explanation That Failed',
    'An explanation somebody genuinely did not understand. Work out why, and rewrite it.',
    ['TECHNICAL_COMMUNICATION', 'TECHNICAL_EXPLANATION'],
    ['Diagnose why an explanation failed and repair it'], 45, {},
    'M12 has no application. Writing a fresh explanation and repairing a failed one are different '
    + 'skills, and only the first is taught.',
    'every profile; M12 is mandatory and contributes almost nothing but instruction today.'),

  debug('T_APTITUDE_REASONING_DEBUGGING', 'M15_APTITUDE', 'T_APTITUDE_REASONING',
    'Why the Obvious Answer Is Wrong',
    'The distractor that catches almost everybody, examined until it stops working.',
    ['APTITUDE_REASONING_LOGIC', 'APTITUDE_REASONING_SERIES'],
    ['Explain why a plausible wrong answer is wrong, before choosing'], 45,
    { category: ACADEMIC },
    'M15 is fifteen units with no application. Aptitude tests are won by recognising traps, and '
    + 'the two practice units drill correct method without ever examining a wrong one.',
    'every profile sitting placement processes; M15 is mandatory and purely instructional today.'),

  debug('T_CAPSTONE_READING_SOMEBODY_ELSES', 'M14_CAPSTONE', 'T_CAPSTONE',
    'A Stranger Bug, and Nobody to Ask',
    'A broken program written by somebody who is not available — the situation every first job '
    + 'starts in.',
    ['PROBLEM_SOLVING', 'DEBUGGING', 'SELF_LEARNING'],
    ['Diagnose a fault in unfamiliar code, with no author available'], 60, {},
    'Two existing units come close and neither covers it. T_CAPSTONE_DEBUGGING debugs the '
    + 'learners OWN project, where the intent is already known — and knowing the intent is the '
    + 'hard part of a stranger codebase. T_AI_CODING_READING_IT reads GENERATED code line by '
    + 'line, which is comprehension rather than diagnosis, and the model is still there to ask '
    + 'again. This is unfamiliar human code, broken, with nobody to ask.',
    'every profile, and it is genuine cross-topic problem solving rather than another topic\'s '
    + 'debugging unit.'),
];

/* ---- Phase 21 capacity: 10 practical units, for topics that teach and never apply ---- */

/**
 * WHY THESE EXIST. Phase 21 certified learners at the state boundaries on the Foundation stage
 * skill set. With every PARTIAL unit in the design authored, a learner at 85 across the universal
 * skills with a software/backend direction still received 85 days: every instruction unit they
 * had not outgrown was scheduled, and what ran out was something to DO with the universal skills
 * they were still revising.
 *
 * The allocation was not touched to hide that. Each unit below closes a gap that is real on its
 * own terms — a topic that teaches and practises but never asks for a debugging judgement or a
 * finished artefact — and each was measured to contribute before it was written. None duplicates
 * an existing unit; `whyNotExisting` names the nearest one and the difference.
 */
const CAPACITY_UNITS: ProposedUnit[] = [
  project('T_FUNCTIONS_REFACTORING', 'M03_PROGRAMMING', 'T_FUNCTIONS',
    'Project — Untangle a Working Script',
    'A long script that works and that nobody wants to change. Restructure it into functions '
    + 'without changing a single thing it prints.',
    ['FUNCTIONS_BASICS'], ['T_FUNCTIONS_PRACTICE'],
    ['Restructure working code into functions while proving its behaviour did not change'], 120, {},
    'T_FUNCTIONS_MINI_PROJECT builds a new program from functions. Restructuring code that already '
    + 'works — where the constraint is preserving behaviour, and the risk is breaking it — is the '
    + 'form functions are actually met in, and nothing asks for it.',
    'software-focused learners revising programming, who had no functions work left beyond the '
    + 'first project.'),

  debug('T_ARRAYS_STRING_DEBUGGING', 'M07_DSA', 'T_ARRAYS',
    'When the String Answer Is Almost Right',
    'String solutions that pass the example and fail the judge — off-by-one slices, case, '
    + 'whitespace, and the empty string.',
    ['DSA_STRINGS'],
    ['Find why a string solution fails on inputs the example did not show'], 50,
    { prerequisiteUnitCodes: ['T_ARRAYS_STRING_PROBLEMS'] },
    'T_ARRAYS_DEBUGGING is about index and bounds faults in array traversal. String problems fail '
    + 'differently — normalisation, slicing and empty input — and those are the faults interview '
    + 'judges are built to catch.',
    'software-focused and every interview-facing learner; M07 had one debugging unit for eleven.'),

  debug('T_GIT_HISTORY_DEBUGGING', 'M04_DEVELOPER_TOOLS', 'T_GIT',
    'Which Commit Broke It?',
    'It worked last week. Use the history — log, diff, show and bisect — to find the commit that '
    + 'broke it, instead of reading the whole codebase.',
    ['GIT_FUNDAMENTALS'],
    ['Locate the commit that introduced a fault using the repository history'], 50,
    { prerequisiteUnitCodes: ['T_GIT_UNDOING'] },
    'T_GIT_CONFLICTS debugs a merge. Nothing uses history as a diagnostic tool, which is the main '
    + 'reason to keep a clean history at all; git bisect is taught nowhere.',
    'every universal learner past the Git concepts; M04 is mandatory.'),

  project('T_SQL_REPORT_PROJECT', 'M08_DATABASES', 'T_SQL',
    'Project — The Report Somebody Asked For',
    'An existing database and a set of vague business questions. Turn each into a precise query, '
    + 'and report what the data says, including where it cannot answer.',
    ['SQL_BASICS'], ['T_SQL_PRACTICE'],
    ['Turn vague questions into precise queries and report the answers honestly'], 120,
    { displayOrder: 910 },
    'T_SQL_MINI_PROJECT is schema design: the learner owns the tables. Analysis against a schema '
    + 'somebody else designed, from questions that are not yet precise, is the everyday use of SQL '
    + 'and a different skill.',
    'software-focused and data-leaning learners revising SQL.'),

  debug('T_SHELL_PIPELINES_DEBUGGING', 'M09_LINUX', 'T_SHELL_PIPELINES',
    'Why Is the Pipeline Empty?',
    'A pipeline that prints nothing, or the wrong count. Take it apart stage by stage until the '
    + 'stage that lies is found.',
    ['SHELL_PIPELINES'],
    ['Isolate the failing stage of a pipeline or script'], 45,
    { prerequisiteUnitCodes: ['T_SHELL_PIPELINES_TRANSFORMING'] },
    'The T_SHELL_PIPELINES practice and project build pipelines. None teaches the method for one '
    + 'that silently produces nothing — quoting, a filter that matched no lines, stderr that went '
    + 'to the screen instead of the pipe.',
    'cloud-cyber and software-focused learners; M09 had no debugging for its pipelines topic.'),

  project('T_PROCESSES_MINI_PROJECT', 'M09_LINUX', 'T_PROCESSES',
    'Mini Project — A Process Report You Can Defend',
    'Investigate what a machine is actually running, find the process responsible for a problem, '
    + 'and deal with it without killing the wrong thing.',
    ['OS_PROCESSES'], ['T_PROCESSES_PRACTICE'],
    ['Investigate running processes and justify every action taken on them'], 90, {},
    'T_PROCESSES is six units of instruction and practice with nothing to investigate end to end. '
    + 'Knowing the signals is different from deciding which one to send to which process.',
    'cloud-cyber and software-focused learners revising operating systems.'),

  project('T_PSEUDOCODE_MINI_PROJECT', 'M02_COMPUTATIONAL_THINKING', 'T_PSEUDOCODE',
    'Mini Project — An Algorithm Somebody Else Can Follow',
    'Design an algorithm for a real process in pseudocode and a flowchart, then prove it with '
    + 'dry runs, including the case that breaks the first draft.',
    ['PSEUDOCODE_FLOWCHARTS'], ['T_PSEUDOCODE_PRACTICE'],
    ['Specify an algorithm precisely enough that another person can execute it'], 90, {},
    'T_PSEUDOCODE practises writing and dry-running short fragments and debugs logic errors. '
    + 'Nothing asks for a complete design handed to somebody else, which is what pseudocode is for.',
    'beginners and mixed learners, and every learner revising computational thinking.'),

  debug('T_NUMBER_SYSTEMS_DEBUGGING', 'M10_MATHS', 'T_NUMBER_SYSTEMS',
    'The Number That Came Out Wrong',
    'A counter that went negative, a colour that came out wrong, a total that is off by a tiny '
    + 'fraction — each traced to how the number was stored.',
    ['NUMBER_SYSTEMS_BINARY'],
    ['Explain a wrong numeric result from its binary representation'], 45,
    { prerequisiteUnitCodes: ['T_NUMBER_SYSTEMS_NEGATIVE_AND_OVERFLOW'] },
    'T_NUMBER_SYSTEMS converts and calculates. Nothing connects representation to the bugs it '
    + 'actually causes, which is the reason a programmer needs binary at all.',
    'every universal learner past number systems; M10 had almost no application.'),

  project('T_BOOLEAN_MINI_PROJECT', 'M10_MATHS', 'T_BOOLEAN',
    'Mini Project — From a Rule to a Circuit',
    'A real control rule in words becomes a truth table, a simplified expression, a gate diagram '
    + 'and a tested function — with each step checked against the last.',
    ['BOOLEAN_ALGEBRA'], ['T_BOOLEAN_PRACTICE'],
    ['Carry a rule from words to a verified simplified expression'], 90, {},
    'T_BOOLEAN teaches each representation and debugs arguments. Nothing carries one problem through '
    + 'every representation, which is where the equivalences stop being exercises.',
    'every universal learner revising Boolean algebra; M10 had no integration for it.'),

  project('T_DECOMPOSITION_MINI_PROJECT', 'M02_COMPUTATIONAL_THINKING', 'T_DECOMPOSITION',
    'Mini Project — Plan It Before You Build It',
    'A problem too big to start coding. Break it down, find the patterns, name the edge cases, '
    + 'and produce a plan another learner could build from.',
    ['PROBLEM_SOLVING'], ['T_DECOMPOSITION_PRACTICE'],
    ['Decompose a real problem into a plan that survives its edge cases'], 90, {},
    'T_DECOMPOSITION practises the steps on small problems. The capstone assumes decomposition '
    + 'rather than teaching it, so nothing between them applies it to a problem large enough to '
    + 'need it.',
    'beginners, mixed learners and every learner revising problem solving.'),

  /*
   * The software core, applied. SOFTWARE_BACKEND is served by the universal Programming, C, DSA,
   * Databases and Developer Tools modules by frozen decision (careerDirectionPolicy), so a
   * software learner who has demonstrated that core is left with its practical work and nothing
   * else. Measured on the stage skill set, that ran out seven days short. Each unit below is a
   * distinct fault class or artefact in one of those five modules — not a copy of a unit in them.
   */
  debug('T_LOOPS_ALMOST_RIGHT_DEBUGGING', 'M03_PROGRAMMING', 'T_LOOPS',
    'Loops That Are Almost Right',
    'The loop ends, and the answer is off by one, counted twice, or reset every time round. '
    + 'Find which, from what the loop actually did.',
    ['LOOPS_BASICS'],
    ['Diagnose a terminating loop that produces a wrong result'], 45,
    // A later return to loops: it follows the topic's practice, whose path already includes
    // accumulators, instead of interrupting the first pass.
    { prerequisiteUnitCodes: ['T_LOOPS_PRACTICE'] },
    'T_LOOPS_INFINITE_LOOPS debugs loops that never end. A loop that ends with the wrong answer — '
    + 'a range one short, an accumulator initialised inside the loop, a list changed while being '
    + 'iterated — fails silently, and is by far the commoner fault.',
    'software-focused learners revising programming; M03 had one debugging unit for loops.'),

  debug('T_SQL_JOIN_DEBUGGING', 'M08_DATABASES', 'T_SQL',
    'Why the Totals Are Too Big',
    'The query returns rows and the numbers are wrong: a join that multiplied rows, a COUNT that '
    + 'counted the NULLs, an average that silently skipped them.',
    ['SQL_BASICS'],
    ['Find why a join or aggregate returns plausible but wrong numbers'], 50,
    { prerequisiteUnitCodes: ['T_SQL_JOINS', 'T_SQL_GROUP_BY'] },
    'T_SQL_DEBUGGING is about a query that returns nothing. A query that returns confident, wrong '
    + 'totals is the more dangerous failure, has different causes, and is not covered anywhere.',
    'software-focused and data-leaning learners past joins and grouping.'),

  debug('T_ARRAYS_COMPLEXITY_DEBUGGING', 'M07_DSA', 'T_ARRAYS',
    'It Works, and It Times Out',
    'A correct solution that fails the time limit. Find the hidden quadratic — the lookup in a '
    + 'list, the copy in a loop — and remove it without breaking the answer.',
    ['DSA_ARRAYS'],
    ['Locate and remove the avoidable cost in a correct but slow solution'], 50,
    { displayOrder: 810, prerequisiteUnitCodes: ['T_ARRAYS_COMPLEXITY'] },
    'T_ARRAYS_COMPLEXITY teaches how to talk about cost and the mini project asks for a justification. '
    + 'Neither asks a learner to find the cost in code that is already correct, which is how a time '
    + 'limit is actually met.',
    'software-focused and every interview-facing learner.'),

  debug('T_GIT_REMOTE_DEBUGGING', 'M04_DEVELOPER_TOOLS', 'T_GIT',
    'Push Rejected, and Other Remote Trouble',
    'A rejected push, a branch that has diverged, a detached HEAD, a commit made on the wrong '
    + 'branch — each read from what Git says, and fixed without losing work.',
    ['GIT_BRANCHING'],
    ['Recover from a remote or branch mishap without losing anybody\'s work'], 45,
    { displayOrder: 810, prerequisiteUnitCodes: ['T_GIT_REMOTES'] },
    'T_GIT_CONFLICTS resolves a merge conflict and T_GIT_HISTORY_DEBUGGING searches history. '
    + 'Remote and branch-state mishaps are a separate family, and the one where a panicked fix '
    + 'most often destroys work.',
    'every universal learner past Git remotes; M04 is mandatory.'),

  project('T_FUNCTIONS_TESTING_PROJECT', 'M03_PROGRAMMING', 'T_FUNCTIONS',
    'Project — Prove Your Functions Work',
    'A set of functions with a specification and a bug or two. Write the tests that would have '
    + 'caught them, then make the tests pass.',
    ['FUNCTIONS_BASICS'], ['T_FUNCTIONS_PRACTICE'],
    ['Write tests that pin a function to its specification, edge cases included'], 90,
    { displayOrder: 910 },
    'T_FUNCTIONS_MINI_PROJECT builds and T_FUNCTIONS_REFACTORING restructures. Nothing in the '
    + 'programming module asks a learner to decide what "works" means and check it with tests; '
    + 'T_AI_CODING_TESTING_IT tests generated code and assumes this skill.',
    'software-focused learners revising programming.'),

  debug('T_C_BASICS_STRING_DEBUGGING', 'M06_C_PROGRAMMING', 'T_C_BASICS',
    'C Strings That Misbehave',
    'A missing terminator, a copy that overran, two strings compared with == — the faults that '
    + 'make C text handling notorious, each traced to its cause.',
    ['C_BASICS'],
    ['Diagnose string-handling faults in C from their symptoms'], 45,
    { category: ACADEMIC, mandatory: false, prerequisiteUnitCodes: ['T_C_BASICS_ARRAYS'] },
    'T_C_BASICS_DEBUGGING teaches the method — warnings, backtraces, sanitisers. Strings are the '
    + 'fault class where C differs most from Python, and they are only mentioned in passing.',
    'software-focused learners taking C.'),

  project('T_EDITOR_WORKSPACE_PROJECT', 'M04_DEVELOPER_TOOLS', 'T_EDITOR',
    'Project — A Workspace Anyone Can Open',
    'Set up a small project so that somebody else can clone it, open it, run it, debug it and '
    + 'format it the same way you do — and prove it on a clean machine.',
    ['IDE_PROFICIENCY'], ['T_EDITOR_RUNNING_AND_DEBUGGING'],
    ['Produce a reproducible project workspace another person can use unaided'], 90, {},
    'T_EDITOR teaches an editor in six instruction and debugging units. Nothing asks for a '
    + 'workspace that works for somebody other than its author, which is where environments '
    + 'actually break.',
    'every universal learner; M04 is mandatory.'),

  debug('T_SQL_SCHEMA_DEBUGGING', 'M08_DATABASES', 'T_SQL',
    'A Schema That Fights You',
    'Updates that leave data contradicting itself, deletes that lose facts nobody meant to lose. '
    + 'Trace each anomaly to the design decision behind it.',
    ['DB_FUNDAMENTALS'],
    ['Trace a data anomaly to the schema decision that allows it'], 50,
    { displayOrder: 810, prerequisiteUnitCodes: ['T_SQL_KEYS', 'T_SQL_INSERT_UPDATE_DELETE'] },
    'T_SQL_MINI_PROJECT designs a schema from scratch. Diagnosing an existing schema from the '
    + 'anomalies it produces — repeated data, update and delete anomalies — is the other half of '
    + 'design and is not taught.',
    'software-focused and data-leaning learners.'),
];

export const PROPOSED_UNITS: ProposedUnit[] = [
  ...VERIFICATION_UNITS,
  ...INTEGRATION_UNITS,
  ...APPLICATION_UNITS,
  ...CAPACITY_UNITS,
];

/* ------------------------------------------------------------------ *
 * The allocation revision this expansion requires
 * ------------------------------------------------------------------ */

/**
 * WITHOUT THIS, THE EIGHT CHECKPOINT UNITS WOULD NEVER BE SCHEDULED.
 *
 * All three learner shapes currently allocate VERIFICATION `min 0, target 0`, with a comment
 * saying the design contains none — which was true and is the reason. Adding verification units
 * while leaving the allocation at zero would produce eight units nobody is ever given, and the
 * before/after comparison would show no change at all.
 *
 * So the expansion is a curriculum change AND an allocation change, and the second is stated here
 * rather than applied, because it belongs with the units it depends on. The capacity simulator
 * passes this through `proposedAllocation` so the proposal can be measured before either half is
 * committed.
 *
 * Capacity moves out of instruction, which is where the audit found the surplus: a beginner
 * currently receives 74 instruction units of 90 because application inventory runs out, not
 * because anybody decided on 74.
 */
export interface ProposedAllocation {
  role: string;
  min: number;
  target: number;
}

export const PROPOSED_ALLOCATIONS: Record<string, ProposedAllocation[]> = {
  /**
   * THE CEILING HERE IS STRUCTURAL, NOT A PREFERENCE.
   *
   * The obvious instinct is to push a beginner's plan much harder towards doing, and it was tried:
   * allocations at 30 and 32 "doing" units were swept against the expanded inventory and both came
   * back WORSE than 27, starving direction learning and exploration to nothing and, for a
   * software-focused learner, dropping the doing share from 23% to 19% with two floors breached.
   *
   * The reason is prerequisite depth. Reaching one practice unit means teaching its topic first,
   * and each topic is five to eight concept units deep, so instruction arrives in the plan whether
   * or not the allocation asked for it. A ninety-day Foundation plan cannot spend less on
   * instruction than its own prerequisite chains cost — which means a beginner's ~74 instruction
   * units were never purely an inventory accident, and no expansion was going to halve them.
   *
   * What the expansion genuinely buys is reported honestly below: verification where there was
   * none, and something to apply and build in eleven modules that had nothing. The doing share
   * moves from 15-16 units to 22-23, which is the real headroom.
   */
  EMERGING: [
    { role: 'FOUNDATION_INSTRUCTION', min: 16, target: 24 },
    { role: 'GUIDED_INSTRUCTION', min: 9, target: 17 },
    { role: 'ADVANCED_UNIVERSAL', min: 2, target: 11 },
    { role: 'DIRECTION_LEARNING', min: 0, target: 9 },
    // A floor of one, because exploration units rank last and were starved to zero without it.
    { role: 'EXPLORATION', min: 1, target: 2 },
    { role: 'PRACTICE', min: 8, target: 14 },
    { role: 'APPLICATION', min: 4, target: 7 },
    { role: 'INTEGRATION', min: 2, target: 4 },
    // Two milestones in ninety days: the early checkpoint and the midpoint reassessment.
    { role: 'VERIFICATION', min: 1, target: 2 },
  ],
  DEVELOPING: [
    { role: 'FOUNDATION_INSTRUCTION', min: 6, target: 15 },
    { role: 'GUIDED_INSTRUCTION', min: 5, target: 12 },
    { role: 'ADVANCED_UNIVERSAL', min: 4, target: 12 },
    { role: 'DIRECTION_LEARNING', min: 4, target: 15 },
    { role: 'EXPLORATION', min: 1, target: 2 },
    { role: 'PRACTICE', min: 8, target: 14 },
    { role: 'APPLICATION', min: 5, target: 9 },
    { role: 'INTEGRATION', min: 3, target: 6 },
    /**
     * The most verification of the three shapes, on purpose.
     *
     * A learner with a mixed diagnostic is the one whose state estimate is least certain and most
     * worth re-measuring — a beginner has little to re-measure yet, and an established learner
     * has already proven most of it.
     */
    { role: 'VERIFICATION', min: 2, target: 5 },
  ],
  ESTABLISHED: [
    { role: 'FOUNDATION_INSTRUCTION', min: 0, target: 3 },
    { role: 'GUIDED_INSTRUCTION', min: 0, target: 5 },
    { role: 'ADVANCED_UNIVERSAL', min: 5, target: 15 },
    { role: 'DIRECTION_LEARNING', min: 8, target: 21 },
    { role: 'EXPLORATION', min: 1, target: 2 },
    { role: 'PRACTICE', min: 6, target: 12 },
    { role: 'APPLICATION', min: 7, target: 13 },
    { role: 'INTEGRATION', min: 5, target: 11 },
    { role: 'VERIFICATION', min: 3, target: 8 },
  ],
};
