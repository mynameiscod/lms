/**
 * Which ONE skill a career-track checkpoint question measures, for topics that declare several.
 *
 * Same contract as the year attribution tables: a question in a multi-skill topic must name its
 * skill (authored on the question as `skillKey`, or here by unit or topic), or it produces no
 * Skill DNA evidence. Single-skill topics are not listed — their one skill is unambiguous.
 */
const TOPIC_DEFAULT: Record<string, string> = {
  JT_BOOTSTRAP: 'BOOTSTRAP',
  JT_JS_CORE: 'JS_BASICS',
  JT_REACT_ROUTING: 'REACT_ROUTING',
  JT_REACT_STATE: 'STATE_MANAGEMENT',
  JT_REACT_BUILD: 'REACT_COMPONENTS',
};

/** Units whose lesson is about one of the topic's other skills. */
const OVERRIDES: Record<string, string> = {
  JT_JS_CORE_FUNCTIONS_SCOPE: 'JS_FUNCTIONS',
  JT_JS_CORE_ARRAYS: 'JS_ARRAYS_OBJECTS',
  JT_JS_CORE_OBJECTS_JSON: 'JS_ARRAYS_OBJECTS',
  JT_REACT_BUILD_BOOTSTRAP_IN_REACT: 'BOOTSTRAP',
  JT_REACT_BUILD_REACT_PROJECT: 'REACT_COMPONENTS',
};

export function primarySkillFor(unitCode: string, topicCode: string): string {
  return OVERRIDES[unitCode] || TOPIC_DEFAULT[topicCode] || '';
}

/** Exposed for the test that checks every attribution names a skill its topic declares. */
export const ATTRIBUTION_TABLES = { TOPIC_DEFAULT, OVERRIDES };
