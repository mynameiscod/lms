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
        // The first look. Operating-system concepts proper live in M09, and the shell is met
        // again there for composition; this is where a student learns that a path and a
        // permission exist at all.
        skillKeys: ['FILE_SYSTEMS_PERMISSIONS', 'SHELL_COMMANDS'], category: 'UNIVERSAL', applicableDirections: [],
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
        skillKeys: ['PROGRAMMING_FUNDAMENTALS', 'PYTHON_BASICS', 'PYTHON_STRINGS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Store, read and change values of different types.',
          'Write text down correctly, including quotes, escapes and formatting.'],
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
      {
        topicCode: 'T_EDITOR', title: 'Editor and Development Environment',
        skillKeys: ['IDE_PROFICIENCY'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Find your way around a codebase using the editor rather than by eye.',
          'Say what a tool has actually checked, and what its silence does not prove.'],
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
        topicCode: 'T_FORMS', title: 'Forms and Collecting Input',
        skillKeys: ['HTML_FORMS'], category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Collect an answer of the right shape, and know what actually arrives.'],
        prerequisiteSkillKeys: ['HTML'],
      },
      {
        topicCode: 'T_ACCESSIBILITY', title: 'Building for Everyone',
        skillKeys: ['WEB_ACCESSIBILITY'], category: 'DIRECTION', applicableDirections: ['WEB_DEVELOPMENT'],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Name who a page shuts out, and what would let them in.'],
        prerequisiteSkillKeys: ['HTML'],
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
        topicCode: 'T_LINUX', title: 'What an Operating System Does',
        // The concepts only. Files and the shell were met in M01; processes, memory and
        // composing commands each have their own topic below, because a student taught all
        // five under one heading cannot be told which of them they are missing.
        skillKeys: ['OPERATING_SYSTEMS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Say what the system is doing for you that your program is not.'],
      },
      {
        topicCode: 'T_PROCESSES', title: 'Programs, Processes and Jobs',
        skillKeys: ['OS_PROCESSES'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Find what is running, and stop it without losing its work.'],
      },
      {
        topicCode: 'T_OS_MEMORY', title: 'Memory and Why It Runs Out',
        skillKeys: ['OS_MEMORY'], category: 'EXPLORATION', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Explain why a machine gets slow before it runs out of memory.'],
      },
      {
        topicCode: 'T_SHELL_PIPELINES', title: 'Joining Commands Together',
        skillKeys: ['SHELL_PIPELINES'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Build a small pipeline, and know where its errors went.'],
        prerequisiteSkillKeys: ['SHELL_COMMANDS'],
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
        topicCode: 'T_NUMBER_SYSTEMS', title: 'Number Systems and Binary',
        skillKeys: ['NUMBER_SYSTEMS_BINARY'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'FOUNDATION',
        learningOutcomes: ['Move between bases, and say what a fixed width can and cannot hold.'],
      },
      {
        topicCode: 'T_LOGIC_MATH', title: 'Logic and Sets',
        // Was mapped to the two aptitude nodes, which are a placement round rather than a
        // degree mathematical foundation. Those now have M15 to themselves.
        skillKeys: ['PROPOSITIONAL_LOGIC', 'SET_THEORY'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Work out what a compound condition comes to, and what its denial admits.'],
      },
      {
        topicCode: 'T_RELATIONS', title: 'Relations and Functions',
        skillKeys: ['RELATIONS_FUNCTIONS'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Say when a mapping can be reversed, and when it cannot.'],
        prerequisiteSkillKeys: ['SET_THEORY'],
      },
      {
        topicCode: 'T_BOOLEAN', title: 'Boolean Algebra and Gates',
        skillKeys: ['BOOLEAN_ALGEBRA'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Simplify a condition without changing which cases it admits.'],
        prerequisiteSkillKeys: ['PROPOSITIONAL_LOGIC'],
      },
      {
        topicCode: 'T_MATRICES', title: 'Matrices and Grids',
        skillKeys: ['MATRICES'], category: 'DIRECTION', applicableDirections: ['AI_ML', 'DATA'],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Read a grid by row and column, and say when a product exists.'],
      },
      {
        topicCode: 'T_STATS', title: 'Probability and Statistics',
        // Was mapped to the chart-reading aptitude node. This is sample spaces, the rules that
        // combine events, and what a summary hides, which is a different skill.
        skillKeys: ['PROBABILITY_STATISTICS'], category: 'DIRECTION', applicableDirections: ['AI_ML', 'DATA'],
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
        topicCode: 'T_ML_INTRO', title: 'AI, Machine Learning and Deep Learning',
        // Was mapped to PATTERN_RECOGNITION, which is an aptitude node and now sits in M15.
        skillKeys: ['AI_ML_CONCEPTS'], category: 'DIRECTION', applicableDirections: ['AI_ML', 'DATA'],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Say where a system got its behaviour, and what its examples could not teach it.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
      {
        topicCode: 'T_GENAI', title: 'Generative AI and How It Works',
        skillKeys: ['GENERATIVE_AI_LLM'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Explain why the same question gives two answers, and what the model cannot know.'],
      },
      {
        topicCode: 'T_AI_LITERACY', title: 'Prompting and Using AI Responsibly',
        // Was mapped to SELF_LEARNING, which is a habit rather than something a paper can ask
        // about. It now sits on the capstone, where independent learning is what is happening.
        skillKeys: ['PROMPT_ENGINEERING', 'AI_RESPONSIBLE_USE'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Write a request that can only be answered one way.',
          'Say which claims must be checked before anyone acts on them.'],
      },
      {
        topicCode: 'T_AI_CODING', title: 'Working With Generated Code',
        skillKeys: ['AI_ASSISTED_CODING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'GUIDED',
        learningOutcomes: ['Verify a suggestion you did not write before accepting it.'],
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
        skillKeys: ['PROBLEM_SOLVING', 'DEBUGGING', 'SELF_LEARNING'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Build and explain something small, end to end.',
          'Find out what you need to know without being taught it first.'],
        prerequisiteSkillKeys: ['PROGRAMMING_FUNDAMENTALS'],
      },
    ],
  },
  {
    moduleCode: 'M15_APTITUDE',
    moduleName: 'Aptitude and Placement Rounds',
    displayOrder: 150,
    /**
     * Separate from Mathematics on purpose.
     *
     * A campus drive opens with an aptitude round, and preparing for it is different work from
     * the mathematics a degree assumes. Mapping both onto one set of skills, which is what this
     * file did until now, meant a student weak at discrete maths and strong at series puzzles
     * scored as one thing and neither could be taught separately.
     */
    blurb: 'The round that decides whether anyone reads your CV.',
    topics: [
      {
        topicCode: 'T_APTITUDE_REASONING', title: 'Logical Reasoning and Series',
        skillKeys: ['APTITUDE_REASONING_LOGIC', 'APTITUDE_REASONING_SERIES'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Decide whether a conclusion follows from what was actually stated.'],
      },
      {
        topicCode: 'T_APTITUDE_DATA', title: 'Data Interpretation and Patterns',
        skillKeys: ['APTITUDE_DATA_INTERPRETATION', 'PATTERN_RECOGNITION'], category: 'UNIVERSAL', applicableDirections: [],
        defaultDepth: 'STANDARD',
        learningOutcomes: ['Read a figure out of a table or chart under time pressure.'],
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
