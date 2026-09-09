/**
 * Which canonical skill each question in the 40,800 foundation bank measures.
 *
 * WHY THIS FILE EXISTS. The bank is authored against its own skill codes — CP-PY-LOOP-01,
 * CP-WEB-HTTP-01 — a third vocabulary alongside the spreadsheet's Skill_Measured names and the
 * canonical CareerSkill keys the curriculum teaches and the planner acts on. The bank carries its
 * code in tags, and a tag is not a mapping: without the rows this map produces, all 40,800
 * questions are invisible to the generator, which is exactly the state the bank arrived in.
 *
 * PRIMARY AND SECONDARY. A question is PRIMARY evidence for the one skill it is really asking
 * about, and SECONDARY (quarter weight) for skills it also demonstrates in passing. "Python
 * Loops" is a loops question that happens to be written in Python — it should move LOOPS_BASICS
 * decisively and PYTHON_BASICS only a little, because a student who fails it has a loops problem,
 * not a Python problem. Getting this backwards is what makes a diagnostic blame the language.
 *
 * THE PROMOTIONS BELOW ARE A COMPROMISE, AND A VISIBLE ONE. Five canonical skills — DOM, Git
 * branching, browser internals, database design and career awareness — have no bank skill of
 * their own; each lives inside a broader one. Rather than leave them measurable only at quarter
 * weight (which no realistic paper length lifts to MEDIUM confidence), a question whose text
 * actually names the narrower subject becomes PRIMARY evidence for it as well. This is a keyword
 * rule and therefore approximate, so the importer prints how many questions each promotion
 * caught: a count far from what you would expect means the rule, not the bank, needs fixing.
 */

export interface BankSkillMapping {
  /** The one skill this question is really asking about. Full evidence weight. */
  primary: string;
  /** Skills it also demonstrates. Quarter weight — real evidence, not decisive alone. */
  secondary?: string[];
  /**
   * Narrower skills hiding inside this one. A question whose prompt matches becomes PRIMARY
   * evidence for that skill too, because it is genuinely asking about it.
   */
  promote?: Array<{ skillKey: string; match: RegExp }>;
}

/** The bank's own skill code → what it measures in the taxonomy the curriculum teaches. */
export const BANK_SKILL_MAP: Record<string, BankSkillMapping> = {
  // ── Computer systems ──
  'CP-CS-COMP-01': { primary: 'HOW_COMPUTERS_WORK' },
  'CP-CS-HW-01': { primary: 'COMPUTER_ARCHITECTURE', secondary: ['HOW_COMPUTERS_WORK'] },
  'CP-CS-SW-01': { primary: 'OPERATING_SYSTEMS', secondary: ['HOW_COMPUTERS_WORK'] },
  'CP-CS-NET-01': {
    primary: 'COMPUTER_NETWORKS',
    secondary: ['BROWSER_FUNDAMENTALS'],
    promote: [{
      skillKey: 'BROWSER_FUNDAMENTALS',
      match: /\b(browser|cookie|cache|incognito|rendering|url bar)\b/i,
    }],
  },

  // ── Computational thinking ──
  'CP-CT-DECOMP-01': { primary: 'PROBLEM_SOLVING' },
  'CP-CT-PATTERN-01': { primary: 'PATTERN_RECOGNITION', secondary: ['APTITUDE_REASONING_SERIES'] },
  'CP-CT-ALGO-01': { primary: 'PSEUDOCODE_FLOWCHARTS', secondary: ['PROBLEM_SOLVING'] },
  'CP-CT-LOGIC-01': { primary: 'CONDITIONALS_BASICS', secondary: ['APTITUDE_REASONING_LOGIC'] },

  /**
   * ── Python ──
   * The language is the vehicle, not the subject. Each of these is PRIMARY for the concept and
   * SECONDARY for Python, so a weak loops score sends a student to loops rather than to Python.
   */
  'CP-PY-BASIC-01': { primary: 'PYTHON_BASICS', secondary: ['PROGRAMMING_FUNDAMENTALS'] },
  'CP-PY-COND-01': { primary: 'CONDITIONALS_BASICS', secondary: ['PYTHON_BASICS'] },
  'CP-PY-LOOP-01': { primary: 'LOOPS_BASICS', secondary: ['PYTHON_BASICS'] },
  'CP-PY-FUNC-01': { primary: 'FUNCTIONS_BASICS', secondary: ['PYTHON_BASICS'] },
  'CP-PY-COLL-01': { primary: 'DSA_STRINGS', secondary: ['PYTHON_BASICS'] },
  'CP-PY-DEBUG-01': { primary: 'DEBUGGING', secondary: ['PYTHON_BASICS'] },

  // ── Problem solving ──
  'CP-PS-INTERPRET-01': { primary: 'PROBLEM_SOLVING', secondary: ['TECHNICAL_COMMUNICATION'] },
  'CP-PS-TRACE-01': { primary: 'PSEUDOCODE_FLOWCHARTS', secondary: ['DEBUGGING'] },
  'CP-PS-SOLVE-01': { primary: 'PROBLEM_SOLVING', secondary: ['PROGRAMMING_FUNDAMENTALS'] },
  'CP-PS-TEST-01': { primary: 'DEBUGGING', secondary: ['PROBLEM_SOLVING'] },

  // ── Developer tooling ──
  'CP-DEV-CLI-01': { primary: 'OPERATING_SYSTEMS', secondary: ['PROGRAMMING_FUNDAMENTALS'] },
  'CP-DEV-GIT-01': {
    primary: 'GIT_FUNDAMENTALS',
    secondary: ['GIT_BRANCHING'],
    promote: [{
      skillKey: 'GIT_BRANCHING',
      match: /\b(branch|branches|branching|merge|merging|rebase|checkout|conflict|pull request)\b/i,
    }],
  },

  // ── Web ──
  'CP-WEB-HTML-01': { primary: 'HTML' },
  'CP-WEB-CSS-01': { primary: 'CSS', secondary: ['HTML'] },
  'CP-WEB-JS-01': {
    primary: 'JS_BASICS',
    secondary: ['JS_DOM'],
    promote: [{
      skillKey: 'JS_DOM',
      match: /(\bdom\b|document\.|queryselector|getelementby|addeventlistener|innerhtml|event listener)/i,
    }],
  },
  'CP-WEB-HTTP-01': {
    primary: 'HTTP',
    secondary: ['BROWSER_FUNDAMENTALS'],
    promote: [{
      skillKey: 'BROWSER_FUNDAMENTALS',
      match: /\b(browser|cookie|cache|cors|same-origin|devtools|rendering)\b/i,
    }],
  },

  // ── C ──
  'CP-C-BASIC-01': { primary: 'C_BASICS', secondary: ['PROGRAMMING_FUNDAMENTALS'] },
  'CP-C-CONTROL-01': { primary: 'C_CONTROL_FLOW', secondary: ['FUNCTIONS_BASICS'] },
  'CP-C-MEM-01': { primary: 'DSA_ARRAYS', secondary: ['C_BASICS', 'DSA_STRINGS'] },

  // ── Data structures ──
  'CP-DSA-CORE-01': { primary: 'DSA_ARRAYS', secondary: ['PROBLEM_SOLVING'] },
  'CP-DSA-SEARCH-01': { primary: 'DSA_ARRAYS', secondary: ['PROBLEM_SOLVING'] },

  // ── Data ──
  'CP-DB-SQL-01': {
    primary: 'SQL_BASICS',
    secondary: ['DB_FUNDAMENTALS'],
    promote: [{
      skillKey: 'DB_FUNDAMENTALS',
      match: /\b(normali[sz]\w*|primary key|foreign key|schema|entity|relationship|redundan\w*|integrity)\b/i,
    }],
  },
  'CP-LINUX-OS-01': { primary: 'OPERATING_SYSTEMS' },

  // ── Reasoning ──
  'CP-MATH-CS-01': { primary: 'APTITUDE_DATA_INTERPRETATION', secondary: ['APTITUDE_REASONING_LOGIC'] },

  /**
   * ── Literacy and communication ──
   * AI literacy is filed under self-learning because that is the capability it evidences: knowing
   * when a tool is answering beyond what it knows is how a learner works independently.
   */
  'CP-AI-LIT-01': {
    primary: 'SELF_LEARNING',
    secondary: ['TECH_CAREER_AWARENESS'],
    promote: [{
      skillKey: 'TECH_CAREER_AWARENESS',
      match: /\b(career|job|industry|hiring|internship|workplace|employer)\b/i,
    }],
  },
  'CP-COMM-TECH-01': {
    primary: 'TECHNICAL_COMMUNICATION',
    secondary: ['TECHNICAL_EXPLANATION', 'TECH_CAREER_AWARENESS'],
    promote: [
      /**
       * Matched against the stems this skill actually uses, not against generic words. Its ten
       * questions split cleanly: seven are about communicating, three about career direction.
       * A README, a bug report and a presentation are all acts of explaining something technical
       * to somebody who does not yet understand it.
       */
      {
        skillKey: 'TECHNICAL_EXPLANATION',
        match: /\b(readme|bug report|presentation|explains?|explaining|explanation)\b/i,
      },
      {
        skillKey: 'TECH_CAREER_AWARENESS',
        match: /\b(career|resume|interview|internship|hiring|portfolio|target role)\b/i,
      },
    ],
  },
};
