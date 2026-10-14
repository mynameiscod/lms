import { FoundationModuleSeed, FoundationTopicSeed } from './foundationSkillMap';

/**
 * Career-track content — the pool new track lessons are written into (stage key `track`).
 *
 * ── WHY ONE POOL AND NOT ONE CURRICULUM PER TRACK ─────────────────────────────────────────
 *
 * A career track (see data/careerTrackPolicy.ts) is an ordered list of skill packs, and a pack
 * names topics from ANY year's content. So a lesson is written once, wherever it first belongs,
 * and every track that needs it reuses it: React is written here for Java Full Stack + AI and
 * Python Full Stack reuses it as it stands. Years 1–4 keep their own topics (HTML, CSS, SQL, Git);
 * this pool holds only what no year teaches — a framework, a language a year does not use, AI.
 *
 * The modules below are therefore grouped by SUBJECT, not by track: a track does not own a
 * module, its packs pick topics from them.
 *
 * Nothing here is published by importing it, and nothing here reaches a student until a pack
 * names its topics and a track that uses the pack goes live.
 */

export const TRACK_STAGE_KEY = 'track';
export const TRACK_TITLE = 'CareerPilot Career-Track Content';

const t = (
  topicCode: string, title: string, skillKeys: string[],
  learningOutcomes: string[], extra: Partial<FoundationTopicSeed> = {},
): FoundationTopicSeed => ({
  topicCode, title, skillKeys,
  category: 'UNIVERSAL', applicableDirections: [], defaultDepth: 'STANDARD',
  learningOutcomes, ...extra,
});

export const TRACK_MODULES: FoundationModuleSeed[] = [
  /* ══════════════ WEB — what Year 1 does not already teach ══════════════ */
  {
    moduleCode: 'JT_WEB',
    moduleName: 'Web Frameworks for the Full Stack',
    displayOrder: 10,
    blurb: 'Year 1 teaches HTML, CSS and the DOM; this adds the CSS framework every full-stack job expects.',
    topics: [
      t('JT_BOOTSTRAP', 'Bootstrap 5', ['BOOTSTRAP', 'RESPONSIVE_DESIGN'],
        ['Build a responsive page with the Bootstrap grid, components and utilities, and know where it stops helping.']),
    ],
  },

  /* ══════════════ JAVASCRIPT — the language, then the modern language ══════════════ */
  {
    moduleCode: 'JT_JS',
    moduleName: 'JavaScript, the Language',
    displayOrder: 20,
    blurb: 'Year 1 uses JavaScript to change a page; a full-stack developer writes it as a language.',
    topics: [
      t('JT_JS_CORE', 'JavaScript Fundamentals', ['JS_BASICS', 'JS_FUNCTIONS', 'JS_ARRAYS_OBJECTS'],
        ['Write JavaScript with variables, conditions, loops, functions, arrays and objects, and predict what it prints.']),
      t('JT_JS_ES6', 'Modern JavaScript (ES6+)', ['JS_ES6'],
        ['Read and write the modern JavaScript every framework is written in: arrow functions, destructuring, spread, modules and classes.']),
    ],
  },

  /* ══════════════ REACT ══════════════ */
  {
    moduleCode: 'JT_REACT',
    moduleName: 'React',
    displayOrder: 30,
    blurb: 'Building interfaces out of components, from the first JSX to a deployed multi-page app.',
    topics: [
      t('JT_REACT_BASICS', 'React Fundamentals', ['REACT_COMPONENTS'],
        ['Build a screen from components with props, state, events, forms and lists.']),
      t('JT_REACT_HOOKS', 'React Hooks', ['REACT_HOOKS'],
        ['Use effects, context, refs and custom hooks, and keep to the rules that make them correct.']),
      t('JT_REACT_ROUTING', 'Routing and Talking to an API', ['REACT_ROUTING', 'JS_ASYNC'],
        ['Build a multi-page React app that calls an API and shows loading, error and empty states.']),
      t('JT_REACT_STATE', 'State Management with Redux Toolkit', ['STATE_MANAGEMENT', 'REACT_HOOKS'],
        ['Decide when state needs a store, and build one with Redux Toolkit slices and async thunks.']),
      t('JT_REACT_BUILD', 'Building and Shipping a React App', ['REACT_COMPONENTS', 'BOOTSTRAP'],
        ['Create, style, configure and deploy a React app with Vite, and ship the React project.']),
    ],
  },
];

/** Every skill the track content names — the seeder refuses to import if one is not in the taxonomy. */
export const trackReferencedSkillKeys = (): string[] =>
  [...new Set(TRACK_MODULES.flatMap(m => m.topics.flatMap(tp => tp.skillKeys || [])))];
