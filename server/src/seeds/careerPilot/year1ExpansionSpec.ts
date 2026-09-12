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
    description: 'A problem you have not seen, planned and traced on paper, plus an account of what '
      + 'the machine will do with it. Covers hardware, files, decomposition and pseudocode together.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'FOUNDATION',
    applicableDirections: [],
    skillKeys: ['HOW_COMPUTERS_WORK', 'COMPUTER_ARCHITECTURE', 'FILE_SYSTEMS_PERMISSIONS',
      'PROBLEM_SOLVING', 'PSEUDOCODE_FLOWCHARTS'],
    prerequisiteSkillKeys: [],
    prerequisiteUnitCodes: ['T_PSEUDOCODE_PRACTICE'],
    learningOutcomes: [
      'Plan and trace an unfamiliar problem without writing code',
      'Say what the machine does with the plan, in the right order',
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
    description: 'One program, from a plain-language brief, using variables, conditions, loops and '
      + 'functions, with no worked example in front of you.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'CONDITIONALS_BASICS',
      'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
    prerequisiteUnitCodes: ['T_FUNCTIONS_PRACTICE'],
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
    skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'],
    prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
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
    skillKeys: ['HTML', 'CSS', 'JS_BASICS', 'JS_DOM', 'HTML_FORMS', 'WEB_ACCESSIBILITY'],
    prerequisiteSkillKeys: ['HTML'],
    prerequisiteUnitCodes: ['T_CSS_PRACTICE'],
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
    description: 'A set of tasks on an unfamiliar machine: find something, fix a permission, watch '
      + 'a process, explain where the memory went.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    skillKeys: ['OPERATING_SYSTEMS', 'OS_PROCESSES', 'OS_MEMORY', 'SHELL_PIPELINES', 'SHELL_COMMANDS'],
    prerequisiteSkillKeys: ['SHELL_COMMANDS'],
    prerequisiteUnitCodes: ['T_SHELL_PIPELINES_PRACTICE'],
    learningOutcomes: [
      'Complete unfamiliar tasks on a real machine without step-by-step instructions',
      'Explain what the operating system was doing during each one',
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
    description: 'Problems that need logic, sets, boolean algebra and number systems together, with '
      + 'the working shown rather than the answer alone.',
    unitType: 'CHECKPOINT',
    category: ACADEMIC,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    skillKeys: ['NUMBER_SYSTEMS_BINARY', 'PROPOSITIONAL_LOGIC', 'SET_THEORY', 'BOOLEAN_ALGEBRA',
      'RELATIONS_FUNCTIONS', 'APTITUDE_REASONING_LOGIC'],
    prerequisiteSkillKeys: [],
    prerequisiteUnitCodes: ['T_BOOLEAN_PRACTICE'],
    learningOutcomes: [
      'Solve problems that need more than one branch of the quantitative foundation',
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
    description: 'Halfway through the programme: what has actually stuck, across every module met '
      + 'so far, so the rest of the plan can be built on evidence rather than on attendance.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    skillKeys: ['PROBLEM_SOLVING', 'DEBUGGING', 'SELF_LEARNING', 'PROGRAMMING_FUNDAMENTALS'],
    prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
    prerequisiteUnitCodes: [],
    learningOutcomes: [
      'Demonstrate current capability across the modules covered so far',
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
    description: 'The exit measurement: what the learner can do unaided, what they can explain, '
      + 'and what the next stage should assume.',
    unitType: 'CHECKPOINT',
    category: UNIVERSAL,
    defaultDepth: 'STANDARD',
    applicableDirections: [],
    skillKeys: ['PROBLEM_SOLVING', 'DEBUGGING', 'SELF_LEARNING', 'TECHNICAL_COMMUNICATION'],
    prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
    prerequisiteUnitCodes: ['T_MILESTONE_FOUNDATION_MIDPOINT'],
    learningOutcomes: [
      'Demonstrate Foundation-level capability unaided',
      'State what you can do, with evidence, in terms somebody hiring would recognise',
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
    { defaultDepth: 'FOUNDATION' },
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
    { defaultDepth: 'FOUNDATION' },
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

export const PROPOSED_UNITS: ProposedUnit[] = [
  ...VERIFICATION_UNITS,
  ...INTEGRATION_UNITS,
  ...APPLICATION_UNITS,
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
