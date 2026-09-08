/**
 * The Year-1 foundation, mapped to canonical skills.
 *
 * DATA, NOT CODE. The brief is explicit that hundreds of skills must not live inside
 * controllers, and the reason is that a taxonomy edited by whoever is authoring content should
 * not require a developer, a build and a deploy. This is the seed a human maintains.
 *
 * IT DOES NOT INVENT SKILLS. Every key here must already exist in the CareerSkill taxonomy;
 * seeding refuses on an unknown key rather than creating one, because a skill that appears
 * because somebody mistyped it in a curriculum map is a skill with no blueprint, no questions
 * and no meaning — and it would silently join a student's readiness calculation.
 *
 * THE FIVE CATEGORIES from §33 are what stop this becoming "teach everything to everyone":
 *   UNIVERSAL   — every student, every direction. Never filtered away.
 *   DIRECTION   — only when it serves where they are heading.
 *   ACADEMIC    — supports their degree, not their career. Optional unless a gap shows.
 *   EXPLORATION — a short look, for somebody still deciding.
 *   ENRICHMENT  — beyond the requirement, for somebody already there.
 */

import { DirectionKey } from '../../data/careerDirectionPolicy';
import type { LearningDepth } from '../../data/adaptiveCurriculumPolicy';

export type FoundationCategory = 'UNIVERSAL' | 'DIRECTION' | 'ACADEMIC' | 'EXPLORATION' | 'ENRICHMENT';

export interface FoundationTopicSeed {
  topicCode: string;
  title: string;
  /** Canonical CareerSkill keys. Must already exist. */
  skillKeys: string[];
  category: FoundationCategory;
  /** Empty means every direction. */
  applicableDirections: DirectionKey[];
  defaultDepth: LearningDepth;
  learningOutcomes: string[];
  /** Skills needed first, when the graph does not already say so. */
  prerequisiteSkillKeys?: string[];
}

export interface FoundationModuleSeed {
  moduleCode: string;
  moduleName: string;
  displayOrder: number;
  blurb: string;
  topics: FoundationTopicSeed[];
}

/**
 * UNIVERSAL is not the same as "everything".
 *
 * Only eight of the fourteen areas are universal. Web fundamentals are direction work for a web
 * student and a short look for everyone else; C is academic support that a student takes only
 * because their university requires it. Marking all fourteen mandatory would rebuild exactly the
 * one-size curriculum this replaces, while looking personalised.
 */
export const FOUNDATION_MODULES: FoundationModuleSeed[] = [
  {
    moduleCode: 'M01_CS_FUNDAMENTALS',
    moduleName: 'Computer Science Fundamentals',
    displayOrder: 10,
    blurb: 'How a computer actually works, underneath everything else.',
    topics: [
      {
        topicCode: 'T_HARDWARE', title: 'Hardware and How a Computer Runs',
        skillKeys: ['HOW_COMPUTERS_WORK', 'COMPUTER_ARCHITECTURE'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Describe what happens between pressing run and seeing output.'],
      },
      {
        topicCode: 'T_FILES', title: 'Files, Folders and the Command Line',
        skillKeys: ['OPERATING_SYSTEMS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Navigate a filesystem and run a program from a terminal.'],
      },
    ],
  },
  {
    moduleCode: 'M02_COMPUTATIONAL_THINKING',
    moduleName: 'Computational Thinking',
    displayOrder: 20,
    blurb: 'Breaking a problem down before writing any code.',
    topics: [
      {
        topicCode: 'T_DECOMPOSITION', title: 'Breaking Problems Down',
        skillKeys: ['PROBLEM_SOLVING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Split a problem into steps small enough to solve one at a time.'],
      },
      {
        topicCode: 'T_PSEUDOCODE', title: 'Pseudocode and Dry Running',
        skillKeys: ['PSEUDOCODE_FLOWCHARTS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Trace a piece of logic by hand and predict its output.'],
      },
    ],
  },
  {
    moduleCode: 'M03_PROGRAMMING',
    moduleName: 'Programming Fundamentals',
    displayOrder: 30,
    blurb: 'The building blocks every language shares.',
    topics: [
      {
        topicCode: 'T_VARIABLES', title: 'Variables and Types',
        skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Store, read and change values of different types.'],
      },
      {
        topicCode: 'T_CONDITIONS', title: 'Conditions and Branching',
        skillKeys: ['CONDITIONALS_BASICS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Make a program take different paths based on data.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
      {
        topicCode: 'T_LOOPS', title: 'Loops and Iteration',
        skillKeys: ['LOOPS_BASICS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Repeat work over a collection and stop at the right moment.'],
      },
      {
        topicCode: 'T_FUNCTIONS', title: 'Functions',
        skillKeys: ['FUNCTIONS_BASICS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Name a piece of logic and reuse it.'],
      },
    ],
  },
  {
    moduleCode: 'M04_DEVELOPER_TOOLS',
    moduleName: 'Developer Tools',
    displayOrder: 40,
    blurb: 'Version control and the tools every developer uses daily.',
    topics: [
      {
        topicCode: 'T_GIT', title: 'Git and GitHub',
        // Universal on purpose: Git does not stop mattering because a student chose AI.
        skillKeys: ['GIT_FUNDAMENTALS', 'GIT_BRANCHING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Track changes, undo mistakes and publish work.'],
      },
    ],
  },
  {
    moduleCode: 'M05_WEB_FUNDAMENTALS',
    moduleName: 'Web Fundamentals',
    displayOrder: 50,
    blurb: 'How the web is built — in depth for web students, briefly for everyone else.',
    topics: [
      {
        topicCode: 'T_HTML', title: 'HTML',
        skillKeys: ['HTML'], category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Structure a page with meaningful markup.'],
      },
      {
        topicCode: 'T_CSS', title: 'CSS and Responsive Layout',
        skillKeys: ['CSS'], category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Lay out a page that works on a phone and a laptop.'],
      },
      {
        topicCode: 'T_JS_DOM', title: 'JavaScript and the DOM',
        skillKeys: ['JS_BASICS', 'JS_DOM'], category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Make a page respond to what someone does on it.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
      {
        topicCode: 'T_HTTP', title: 'How the Web Talks',
        skillKeys: ['HTTP', 'BROWSER_FUNDAMENTALS'], category: 'EXPLORATION', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Explain what happens between a click and a page appearing.'],
      },
    ],
  },
  {
    moduleCode: 'M06_C_PROGRAMMING',
    moduleName: 'C Programming (Academic Support)',
    displayOrder: 60,
    blurb: 'For students whose university teaches C. Not a career requirement.',
    topics: [
      {
        topicCode: 'T_C_BASICS', title: 'C Fundamentals',
        // ACADEMIC, and therefore never mandatory: it serves a syllabus, not a job.
        skillKeys: ['C_BASICS', 'C_CONTROL_FLOW'], category: 'ACADEMIC', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Read and write the C your course expects.'],
      },
    ],
  },
  {
    moduleCode: 'M07_DSA',
    moduleName: 'DSA Foundation',
    displayOrder: 70,
    blurb: 'Arrays, strings and the thinking behind them.',
    topics: [
      {
        topicCode: 'T_ARRAYS', title: 'Arrays and Strings',
        skillKeys: ['DSA_ARRAYS', 'DSA_STRINGS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Work through a collection and reason about what it costs.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
    ],
  },
  {
    moduleCode: 'M08_DATABASES',
    moduleName: 'Database Foundations',
    displayOrder: 80,
    blurb: 'Storing and asking questions of data.',
    topics: [
      {
        topicCode: 'T_SQL', title: 'SQL Basics',
        skillKeys: ['DB_FUNDAMENTALS', 'SQL_BASICS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Ask a database a question and understand the answer.'],
      },
    ],
  },
  {
    moduleCode: 'M09_LINUX',
    moduleName: 'Linux and Operating Systems',
    displayOrder: 90,
    blurb: 'The system your code runs on.',
    topics: [
      {
        topicCode: 'T_LINUX', title: 'Linux Basics',
        skillKeys: ['OPERATING_SYSTEMS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Work confidently at a Linux command line.'],
      },
      {
        topicCode: 'T_NETWORKING', title: 'Networking Basics',
        skillKeys: ['COMPUTER_NETWORKS'], category: 'DIRECTION',
        applicableDirections: ['CLOUD_DEVOPS', 'CYBERSECURITY'],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Explain how two machines find and talk to each other.'],
      },
    ],
  },
  {
    moduleCode: 'M10_MATHS',
    moduleName: 'Mathematics for Computer Science',
    displayOrder: 100,
    blurb: 'The maths that actually shows up in the work.',
    topics: [
      {
        topicCode: 'T_LOGIC_MATH', title: 'Logic and Discrete Maths',
        skillKeys: ['APTITUDE_REASONING_LOGIC', 'APTITUDE_REASONING_SERIES'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Reason precisely about conditions and sets.'],
      },
      {
        topicCode: 'T_STATS', title: 'Statistics Foundations',
        skillKeys: ['APTITUDE_DATA_INTERPRETATION'], category: 'DIRECTION', applicableDirections: ['AI_ML', 'DATA'],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Describe a dataset and say what it does not tell you.'],
      },
    ],
  },
  {
    moduleCode: 'M11_AI_LITERACY',
    moduleName: 'AI Literacy',
    displayOrder: 110,
    blurb: 'What these tools do, and where they are wrong.',
    topics: [
      {
        topicCode: 'T_AI_LITERACY', title: 'Working With AI Tools',
        skillKeys: ['SELF_LEARNING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Use AI tools without depending on them being right.'],
      },
      {
        topicCode: 'T_ML_INTRO', title: 'How Machines Learn',
        skillKeys: ['PATTERN_RECOGNITION'], category: 'DIRECTION', applicableDirections: ['AI_ML', 'DATA'],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Explain what training a model means.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
    ],
  },
  {
    moduleCode: 'M12_COMMUNICATION',
    moduleName: 'Communication Foundation',
    displayOrder: 120,
    blurb: 'Being understood — the skill that decides interviews.',
    topics: [
      {
        topicCode: 'T_TECH_COMM', title: 'Explaining Technical Work',
        skillKeys: ['TECHNICAL_COMMUNICATION', 'TECHNICAL_EXPLANATION'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Explain what you built and why, to someone who was not there.'],
      },
    ],
  },
  {
    moduleCode: 'M13_CAREER',
    moduleName: 'Career Awareness',
    displayOrder: 130,
    blurb: 'What the roles actually are, before choosing one.',
    topics: [
      {
        topicCode: 'T_CAREER_MAP', title: 'What the Roles Really Are',
        skillKeys: ['TECH_CAREER_AWARENESS'], category: 'EXPLORATION', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Describe what four different roles do all day.'],
      },
    ],
  },
  {
    moduleCode: 'M14_CAPSTONE',
    moduleName: 'Foundation Capstone',
    displayOrder: 140,
    blurb: 'Put it together and build something.',
    topics: [
      {
        topicCode: 'T_CAPSTONE', title: 'Foundation Project',
        skillKeys: ['PROBLEM_SOLVING', 'DEBUGGING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Build and explain something small, end to end.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
    ],
  },
];

/** Every skill key this seed references, for validation before anything is written. */
export const referencedSkillKeys = (): string[] => Array.from(new Set(
  FOUNDATION_MODULES.flatMap(m => m.topics.flatMap(t => [
    ...t.skillKeys, ...(t.prerequisiteSkillKeys || []),
  ])),
));

/**
 * Whether a category is required of every student.
 *
 * Only UNIVERSAL. Everything else is either conditional on direction, on the university, or on
 * the student having room for it.
 */
export const isMandatoryCategory = (c: FoundationCategory): boolean => c === 'UNIVERSAL';
