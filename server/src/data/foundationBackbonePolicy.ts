/**
 * THE MANDATORY FOUNDATION BACKBONE.
 *
 * ── THE PRODUCT DECISION ─────────────────────────────────────────────────────────────────
 *
 * Every Foundation learner receives explicit coverage of the mandatory fundamentals. Skill DNA decides how deeply,
 * how much teaching and practice, at what difficulty and in how many days — never whether a mandatory fundamental is
 * there at all. A beginner is taught each topic up to its first practice; a learner whose evidence has carried them
 * past its lessons is given one compact practical treatment of it — practice, a debugging exercise, a project, a
 * review. Every journey is still exactly ninety days.
 *
 * ── A TOPIC CLASSIFICATION, NOT A LIST OF UNITS ──────────────────────────────────────────
 *
 * Mandatory concept is not mandatory unit. The backbone is a property of a TOPIC on the stage curriculum, set by an
 * admin (Stage Curriculum → topic → "Foundation backbone"), seeded by foundationSkillMap and carried onto the topic's
 * units when the composer's candidates are loaded. Which of a topic's units a learner meets is decided per learner by
 * the composer; that the topic is met is decided here.
 *
 * ── WHY THESE ELEVEN, FROM THE AUDIT OF THE AUTHORED CURRICULUM ──────────────────────────
 *
 *   COMPUTER FOUNDATIONS       T_HARDWARE        how a computer and its software run
 *   WORKING WITH A COMPUTER    T_FILES           files, folders, paths and the command line
 *   PROBLEM SOLVING            T_DECOMPOSITION   breaking a problem down
 *                              T_PSEUDOCODE      pseudocode and dry running
 *   PROGRAMMING FOUNDATIONS    T_VARIABLES       programming fundamentals, values and types
 *                              T_CONDITIONS      boolean logic and branching
 *                              T_LOOPS           iteration
 *                              T_FUNCTIONS       functions
 *                              T_ARRAYS          arrays and strings
 *   DEVELOPER WORKFLOW         T_GIT             version control
 *   DATA FOUNDATIONS           T_SQL             databases and SQL
 *
 * Each is UNIVERSAL, direction-independent, and has both a teaching path to a first practice for a beginner and at
 * least one practical unit a VERIFIED learner can legitimately be given — so compression never has to fall back on
 * elementary lessons. On the certified inventory the teaching paths to first practice sum to 75 units, which is what
 * a genuine beginner's fundamentals cost; the compressed backbone is 11 units.
 *
 * ── WHAT WAS NOT MADE MANDATORY, AND WHY ─────────────────────────────────────────────────
 *
 * See EXCLUDED_AREAS. In short: modern AI topics do not fit a beginner beside the eleven (75 + 20 units to first
 * practice) and AI literacy has no treatment a VERIFIED learner could be given; deeper systems topics build on T_FILES
 * rather than being first exposure; mathematics, aptitude and communication are ACADEMIC or supporting; the editor is
 * exercised by every coding unit; career exploration and application, integration and verification are guaranteed
 * by the composition floors every plan already holds (EXPLORATION, PRACTICE, APPLICATION, INTEGRATION,
 * VERIFICATION). They remain in the curriculum and are composed as before.
 */

export interface BackboneTopicShape {
  topicCode?: string | null;
  mandatory?: boolean | null;
  applicableDirections?: string[] | null;
}

/**
 * Why a topic may not be classified as backbone. Empty when it may.
 *
 * The backbone is what every learner is given whatever their direction, so it can only be drawn from topics that are
 * themselves required of every learner and scoped to no direction. A topic without a code cannot be referenced by the
 * units that inherit the classification.
 */
export function backboneClassificationProblems(topic: BackboneTopicShape): string[] {
  const problems: string[] = [];
  if (!String(topic.topicCode || '').trim()) problems.push('A backbone topic needs a topic code, which its units are linked by.');
  if (topic.mandatory === false) problems.push('Only a topic every student learns (mandatory) can be part of the Foundation backbone.');
  if ((topic.applicableDirections || []).length) {
    problems.push('A topic scoped to particular directions cannot be part of the Foundation backbone, which every student covers.');
  }
  return problems;
}

/** Expected Foundation areas that are deliberately not mandatory backbone topics, with the reason. */
export const EXCLUDED_AREAS: { area: string; topics: string[]; reason: string }[] = [
  {
    area: 'Modern technical foundations (AI literacy, GenAI, AI-assisted coding)',
    topics: ['T_AI_LITERACY', 'T_GENAI', 'T_AI_CODING'],
    reason: 'Their teaching paths to first practice cost 20 more units beside the backbone\'s 75, which no beginner '
      + 'can fit with the composition floors; and T_AI_LITERACY has no unit a VERIFIED learner can be given, so it could '
      + 'not be compressed. They stay mandatory curriculum and are composed as before.',
  },
  {
    area: 'Web and software concepts',
    topics: ['T_HTTP'],
    reason: 'UNIVERSAL but not a first-exposure fundamental in the authored Year-1 design (never marked mandatory); '
      + 'web direction learners meet it first.',
  },
  {
    area: 'Deeper systems (Linux, processes, memory, pipelines)',
    topics: ['T_LINUX', 'T_PROCESSES', 'T_OS_MEMORY', 'T_SHELL_PIPELINES'],
    reason: 'They build on T_FILES, which is the backbone\'s command-line fundamental; depth, not first exposure.',
  },
  {
    area: 'Developer-tool foundations (editor)',
    topics: ['T_EDITOR'],
    reason: 'Every coding unit is done in the editor; a separate mandatory treatment would add a day for strong '
      + 'learners and teach nothing the programming backbone does not exercise.',
  },
  {
    area: 'Mathematics, aptitude and communication',
    topics: ['T_NUMBER_SYSTEMS', 'T_BOOLEAN', 'T_LOGIC_MATH', 'T_RELATIONS', 'T_APTITUDE_DATA', 'T_APTITUDE_REASONING', 'T_TECH_COMM'],
    reason: 'Academic and supporting material; boolean logic as programming needs it is taught in T_CONDITIONS.',
  },
  {
    area: 'Career / direction',
    topics: ['T_CAREER_MAP'],
    reason: 'Guaranteed by the EXPLORATION floor every plan holds, and by direction learning where a direction is chosen.',
  },
  {
    area: 'Application / integration (projects, checkpoints, capstone)',
    topics: ['T_CAPSTONE', 'T_MILESTONE_*'],
    reason: 'Roles, not topics: guaranteed by the PRACTICE, APPLICATION, INTEGRATION and VERIFICATION floors.',
  },
];
