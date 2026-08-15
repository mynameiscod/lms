import { SkillImportance, SkillTargetLevel } from '../models/RoleSkillBlueprint';

/**
 * Default role blueprints — what a job-ready candidate for each role should know.
 *
 * Static data, deterministic, no AI. Every skillKey below exists in the Module 3 taxonomy;
 * nothing here creates a skill, and the seed reports anything unresolvable rather than
 * inventing it. Module 3 owns the skill universe and keeps owning it.
 *
 * LANGUAGE NEUTRALITY, AND ITS ONE HONEST EXCEPTION.
 *
 * A backend engineer needs a language, but not a PARTICULAR one — Java, Python and
 * JavaScript all get you hired for the same job. Making all three essential would demand
 * three languages of every student; making one essential would quietly turn "Backend
 * Engineer" into "Java Backend Engineer" and mislabel everyone else as unready. So the
 * backend, software, mobile, QA and DevOps blueprints require the language-agnostic
 * capabilities — PROGRAMMING_FUNDAMENTALS, OOP_CONCEPTS — and leave the choice of syntax
 * to the student's stated preference, which Module 1 already records.
 *
 * Frontend is the exception, and it is not a language choice: JavaScript, HTML and CSS are
 * the browser's only runtime. A frontend engineer who does not know JavaScript is not
 * using a different language, they are not doing the job. So those appear explicitly.
 *
 * Combining a role blueprint with a student's preferred language is a later module's work.
 * Nothing here needs to change for it to happen — a technology track would be an
 * additional layer keyed off the same role, not a rewrite of these.
 *
 * WEIGHTS ARE INDEPENDENT AND DO NOT SUM TO 100. A later readiness calculation can
 * normalise; forcing a total here would make every edit into arithmetic.
 */

export interface SeedRequirement {
  skillKey: string;
  importance: SkillImportance;
  weight: number;
  targetLevel: SkillTargetLevel;
  note?: string;
}

export interface SeedBlueprint {
  roleKey: string;
  /** Why this role's set looks the way it does — for whoever inherits the configuration. */
  rationale: string;
  requirements: SeedRequirement[];
}

const E = (skillKey: string, weight: number, targetLevel: SkillTargetLevel, note?: string): SeedRequirement =>
  ({ skillKey, importance: 'ESSENTIAL', weight, targetLevel, note });
const I = (skillKey: string, weight: number, targetLevel: SkillTargetLevel, note?: string): SeedRequirement =>
  ({ skillKey, importance: 'IMPORTANT', weight, targetLevel, note });
const S = (skillKey: string, weight: number, targetLevel: SkillTargetLevel, note?: string): SeedRequirement =>
  ({ skillKey, importance: 'SUPPORTING', weight, targetLevel, note });
const O = (skillKey: string, weight: number, targetLevel: SkillTargetLevel, note?: string): SeedRequirement =>
  ({ skillKey, importance: 'OPTIONAL', weight, targetLevel, note });

export const DEFAULT_ROLE_BLUEPRINTS: SeedBlueprint[] = [
  {
    roleKey: 'SOFTWARE_ENGINEER',
    rationale:
      'The broad one. Deliberately not the union of the specialist roles — it is what any ' +
      'software job assumes: you can program, you know how to choose a data structure, you ' +
      'understand the machine underneath, and you can work in a team.',
    requirements: [
      E('PROGRAMMING_FUNDAMENTALS', 10, 'PROFICIENT', 'Any language — the capability, not the syntax.'),
      E('OOP_CONCEPTS', 9, 'PROFICIENT'),
      E('DSA_COMPLEXITY', 9, 'WORKING', 'Knowing what your code costs.'),
      E('DSA_ARRAYS', 9, 'PROFICIENT'),
      E('DSA_STRINGS', 8, 'WORKING'),
      E('PROBLEM_SOLVING', 9, 'PROFICIENT'),
      I('DSA_RECURSION', 7, 'WORKING'),
      I('DSA_SORTING', 7, 'WORKING'),
      I('DSA_SEARCHING', 7, 'WORKING'),
      I('DSA_HASHING', 7, 'WORKING'),
      I('SQL_BASICS', 7, 'WORKING', 'Almost every application stores something.'),
      I('GIT_FUNDAMENTALS', 7, 'WORKING'),
      I('DEBUGGING', 7, 'WORKING'),
      I('DBMS_CONCEPTS', 6, 'FOUNDATION'),
      I('OPERATING_SYSTEMS', 6, 'FOUNDATION', 'Common interview ground.'),
      S('DSA_TREES', 5, 'FOUNDATION'),
      S('TESTING_FUNDAMENTALS', 5, 'FOUNDATION'),
      S('CLEAN_CODE', 5, 'FOUNDATION'),
      S('COMMUNICATION', 5, 'WORKING'),
      S('TECHNICAL_EXPLANATION', 5, 'WORKING', 'Walking through your own code in an interview.'),
      O('COMPUTER_NETWORKS', 3, 'FOUNDATION'),
    ],
  },

  {
    roleKey: 'BACKEND_ENGINEER',
    rationale:
      'Weighted towards data and interfaces: what a backend engineer actually spends the ' +
      'day on is modelling data, querying it correctly and exposing it over HTTP. Kept ' +
      'language-neutral — Java, Python and Node all get you the same job.',
    requirements: [
      E('PROGRAMMING_FUNDAMENTALS', 10, 'PROFICIENT'),
      E('OOP_CONCEPTS', 9, 'PROFICIENT'),
      E('DB_FUNDAMENTALS', 9, 'PROFICIENT'),
      E('SQL_BASICS', 10, 'PROFICIENT'),
      E('SQL_FILTERING', 9, 'PROFICIENT'),
      E('SQL_JOINS', 9, 'PROFICIENT', 'The query that separates a beginner from a hire.'),
      E('HTTP', 9, 'PROFICIENT'),
      E('REST_APIS', 10, 'PROFICIENT'),
      E('DSA_ARRAYS', 8, 'WORKING'),
      E('PROBLEM_SOLVING', 8, 'PROFICIENT'),
      I('DB_DESIGN', 8, 'WORKING', 'Getting the schema wrong is expensive later.'),
      I('API_FUNDAMENTALS', 8, 'WORKING'),
      I('DSA_HASHING', 7, 'WORKING'),
      I('DSA_STRINGS', 6, 'WORKING'),
      I('GIT_FUNDAMENTALS', 7, 'WORKING'),
      I('GIT_BRANCHING', 6, 'WORKING'),
      I('DEBUGGING', 7, 'WORKING'),
      I('DB_NORMALIZATION', 6, 'WORKING'),
      S('DB_INDEXING', 5, 'FOUNDATION'),
      S('DB_TRANSACTIONS', 5, 'FOUNDATION'),
      S('TESTING_FUNDAMENTALS', 5, 'FOUNDATION'),
      S('CLEAN_CODE', 4, 'FOUNDATION'),
      S('COMMUNICATION', 4, 'WORKING'),
      O('SYSTEM_DESIGN_BASICS', 3, 'FOUNDATION', 'Expected later in a career, not at entry.'),
    ],
  },

  {
    roleKey: 'FRONTEND_ENGINEER',
    rationale:
      'The one role where the language is not a choice: the browser runs JavaScript, so ' +
      'HTML, CSS and JS are the job rather than one option among several. Weighted towards ' +
      'the platform and away from heavy algorithms.',
    requirements: [
      E('PROGRAMMING_FUNDAMENTALS', 9, 'PROFICIENT'),
      E('HTML', 10, 'PROFICIENT', 'The browser has no alternative.'),
      E('CSS', 10, 'PROFICIENT'),
      E('JS_BASICS', 10, 'PROFICIENT'),
      E('JS_FUNCTIONS', 9, 'PROFICIENT'),
      E('JS_ARRAYS_OBJECTS', 9, 'PROFICIENT'),
      E('JS_DOM', 9, 'PROFICIENT'),
      E('HTTP', 8, 'WORKING'),
      I('JS_ASYNC', 8, 'PROFICIENT', 'Every real interface waits on something.'),
      I('REST_APIS', 8, 'WORKING', 'Consuming them, mostly.'),
      I('BROWSER_FUNDAMENTALS', 7, 'WORKING'),
      I('GIT_FUNDAMENTALS', 7, 'WORKING'),
      I('DEBUGGING', 7, 'WORKING', 'Developer tools are the frontend microscope.'),
      I('PROBLEM_SOLVING', 7, 'WORKING'),
      S('DSA_ARRAYS', 5, 'WORKING'),
      S('GIT_BRANCHING', 5, 'WORKING'),
      S('TESTING_FUNDAMENTALS', 5, 'FOUNDATION'),
      S('CLEAN_CODE', 5, 'FOUNDATION'),
      S('COMMUNICATION', 5, 'WORKING'),
      O('DSA_COMPLEXITY', 3, 'FOUNDATION'),
    ],
  },

  {
    roleKey: 'FULLSTACK_ENGINEER',
    rationale:
      'Deliberately NOT backend plus frontend concatenated — that would be a fifty-skill ' +
      'blueprint nobody could finish. The core of each side at working depth, with the ' +
      'specialist depth of neither, which is what full-stack actually means at entry.',
    requirements: [
      E('PROGRAMMING_FUNDAMENTALS', 10, 'PROFICIENT'),
      E('HTML', 8, 'WORKING'),
      E('CSS', 8, 'WORKING'),
      E('JS_BASICS', 9, 'PROFICIENT'),
      E('JS_ARRAYS_OBJECTS', 8, 'WORKING'),
      E('HTTP', 9, 'PROFICIENT'),
      E('REST_APIS', 10, 'PROFICIENT', 'The seam between the two halves.'),
      E('SQL_BASICS', 9, 'PROFICIENT'),
      E('DB_FUNDAMENTALS', 8, 'WORKING'),
      E('PROBLEM_SOLVING', 8, 'WORKING'),
      I('OOP_CONCEPTS', 8, 'WORKING'),
      I('SQL_JOINS', 8, 'WORKING'),
      I('JS_ASYNC', 7, 'WORKING'),
      I('JS_DOM', 7, 'WORKING'),
      I('DB_DESIGN', 7, 'WORKING'),
      I('GIT_FUNDAMENTALS', 7, 'WORKING'),
      I('GIT_BRANCHING', 6, 'WORKING'),
      I('DEBUGGING', 7, 'WORKING'),
      S('DSA_ARRAYS', 5, 'WORKING'),
      S('API_FUNDAMENTALS', 5, 'FOUNDATION'),
      S('TESTING_FUNDAMENTALS', 4, 'FOUNDATION'),
      S('COMMUNICATION', 4, 'WORKING'),
    ],
  },

  {
    roleKey: 'MOBILE_ENGINEER',
    rationale:
      'The taxonomy has no Android, iOS or Flutter skills, and Module 4 must not invent ' +
      'them. What is left is genuinely most of the job anyway: a strong language, OOP, and ' +
      'talking to a server over HTTP. Listed as a gap in the report rather than papered over.',
    requirements: [
      E('PROGRAMMING_FUNDAMENTALS', 10, 'PROFICIENT'),
      E('OOP_CONCEPTS', 10, 'PROFICIENT', 'Mobile UI frameworks are object-oriented throughout.'),
      E('HTTP', 9, 'PROFICIENT'),
      E('REST_APIS', 9, 'PROFICIENT', 'A mobile app is mostly a client for somebody else’s API.'),
      E('PROBLEM_SOLVING', 8, 'WORKING'),
      I('DSA_ARRAYS', 7, 'WORKING'),
      I('DSA_HASHING', 6, 'WORKING'),
      I('GIT_FUNDAMENTALS', 7, 'WORKING'),
      I('DEBUGGING', 8, 'WORKING', 'Hard to debug on a device; the skill matters more here.'),
      I('DB_FUNDAMENTALS', 6, 'FOUNDATION', 'On-device storage is still a database.'),
      I('API_FUNDAMENTALS', 7, 'WORKING'),
      S('TESTING_FUNDAMENTALS', 5, 'FOUNDATION'),
      S('CLEAN_CODE', 5, 'FOUNDATION'),
      S('GIT_BRANCHING', 5, 'WORKING'),
      S('COMMUNICATION', 4, 'WORKING'),
      O('COMPUTER_NETWORKS', 3, 'FOUNDATION', 'Mobile networks fail in ways desktop ones do not.'),
    ],
  },

  {
    roleKey: 'QA_SDET',
    rationale:
      'An SDET is an engineer who specialises in proving software wrong, so testing and ' +
      'debugging carry the highest weights of any blueprint here, and SQL and APIs appear ' +
      'because that is what gets verified. Less algorithmic depth than a developer role.',
    requirements: [
      E('PROGRAMMING_FUNDAMENTALS', 10, 'PROFICIENT', 'The "E" in SDET.'),
      E('TESTING_FUNDAMENTALS', 10, 'ADVANCED', 'The one blueprint where this is the point.'),
      E('DEBUGGING', 10, 'ADVANCED'),
      E('PROBLEM_SOLVING', 9, 'PROFICIENT'),
      E('API_FUNDAMENTALS', 9, 'PROFICIENT'),
      E('REST_APIS', 9, 'PROFICIENT'),
      I('HTTP', 8, 'PROFICIENT'),
      I('SQL_BASICS', 8, 'WORKING', 'Verifying what actually landed in the database.'),
      I('SQL_FILTERING', 7, 'WORKING'),
      I('OOP_CONCEPTS', 7, 'WORKING', 'Test frameworks are built from it.'),
      I('GIT_FUNDAMENTALS', 7, 'WORKING'),
      I('TECHNICAL_COMMUNICATION', 8, 'PROFICIENT', 'A bug report nobody can act on is not a bug report.'),
      I('CLEAN_CODE', 6, 'WORKING', 'Test code is code.'),
      S('DSA_ARRAYS', 5, 'FOUNDATION'),
      S('GIT_BRANCHING', 5, 'WORKING'),
      S('BROWSER_FUNDAMENTALS', 5, 'FOUNDATION'),
      S('COMMUNICATION', 6, 'PROFICIENT'),
      O('DB_FUNDAMENTALS', 3, 'FOUNDATION'),
    ],
  },

  {
    roleKey: 'CLOUD_DEVOPS',
    rationale:
      'No AWS, Docker or Kubernetes exist in the taxonomy, and inventing them here would ' +
      'take ownership away from Module 3. What remains is the layer those tools sit on — ' +
      'operating systems, networks, and the discipline of shipping — which is also what ' +
      'separates someone who can operate a system from someone who can only run commands.',
    requirements: [
      E('OPERATING_SYSTEMS', 10, 'PROFICIENT', 'Processes, memory and scheduling are the job.'),
      E('COMPUTER_NETWORKS', 10, 'PROFICIENT', 'Most outages are network problems.'),
      E('GIT_FUNDAMENTALS', 9, 'PROFICIENT'),
      E('GIT_BRANCHING', 9, 'PROFICIENT', 'Pipelines are built on branching.'),
      E('HTTP', 9, 'PROFICIENT'),
      E('DEBUGGING', 9, 'PROFICIENT', 'Usually on a system you did not write.'),
      E('PROGRAMMING_FUNDAMENTALS', 8, 'WORKING', 'Enough to automate; not full application development.'),
      I('SYSTEM_DESIGN_BASICS', 8, 'WORKING'),
      I('API_FUNDAMENTALS', 7, 'WORKING'),
      I('COMPUTER_ARCHITECTURE', 7, 'WORKING', 'What makes it slow, and where.'),
      I('TESTING_FUNDAMENTALS', 6, 'WORKING'),
      I('TECHNICAL_COMMUNICATION', 7, 'PROFICIENT', 'Incident write-ups are a deliverable.'),
      I('DB_FUNDAMENTALS', 6, 'FOUNDATION'),
      S('PROBLEM_SOLVING', 6, 'WORKING'),
      S('SQL_BASICS', 5, 'FOUNDATION'),
      S('CLEAN_CODE', 4, 'FOUNDATION'),
      S('COMMUNICATION', 5, 'WORKING'),
      O('DB_TRANSACTIONS', 3, 'FOUNDATION'),
    ],
  },
];

/**
 * Skills these blueprints wanted and the taxonomy does not have.
 *
 * Recorded rather than created: Module 3 owns the skill universe, and a module that
 * quietly adds to somebody else's catalogue is how two owners appear. Surfaced in the
 * report so the gap is a decision rather than a discovery.
 */
export const SUGGESTED_TAXONOMY_ADDITIONS = [
  'Android / iOS / cross-platform mobile — MOBILE_ENGINEER has no platform skill at all',
  'Containers and orchestration (Docker, Kubernetes) — CLOUD_DEVOPS is missing its core tooling',
  'Cloud platform fundamentals (AWS/Azure/GCP) — same gap',
  'CI/CD pipelines — currently only implied by GIT_BRANCHING',
  'A frontend framework (React or equivalent) — FRONTEND_ENGINEER stops at the platform',
  'Backend framework fundamentals (Spring Boot, Express, Django) — the same gap on the server',
];
