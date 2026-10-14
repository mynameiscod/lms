import { TrackPriority, PackKind } from '../../data/careerTrackPolicy';

/**
 * The career tracks and skill packs CareerPilot ships, as authored — the starting point an admin
 * then edits on the Career Tracks screen. Imported with seedCareerTracks.ts.
 *
 * A pack names topics from ANY year: Year 1's HTML, CSS, DOM and Git; Year 3's async JavaScript
 * and component design; and the `track` pool's Bootstrap, JavaScript, ES6+ and React. Nothing is
 * copied — the lessons are where they were written.
 */

export interface PackDefinition { key: string; title: string; kind: PackKind; description: string; topics: [string, TrackPriority][] }
export interface TrackDefinition {
  key: string; name: string; language: string; description: string; order: number;
  specializePacks: string[]; placementPacks: string[];
}

export const PACKS: PackDefinition[] = [
  /* ── Java Full Stack + AI, batch 1: the frontend half ── */
  { key: 'WEB_HTML', title: 'HTML', kind: 'SKILL',
    description: 'Structure, semantics, forms and accessibility — the page every framework renders.',
    topics: [['T_HTML', 'MUST'], ['T_FORMS', 'MUST'], ['T_ACCESSIBILITY', 'SHOULD']] },
  { key: 'CSS_BOOTSTRAP', title: 'CSS and Bootstrap', kind: 'SKILL',
    description: 'Layout, the box model, Flexbox and Grid, responsive design, then Bootstrap 5.',
    topics: [['T_CSS', 'MUST'], ['JT_BOOTSTRAP', 'MUST']] },
  { key: 'JAVASCRIPT', title: 'JavaScript', kind: 'SKILL',
    description: 'The language, the DOM, modern ES6+, the web\'s requests and responses, and async code.',
    topics: [['JT_JS_CORE', 'MUST'], ['T_JS_DOM', 'MUST'], ['JT_JS_ES6', 'MUST'], ['T_HTTP', 'SHOULD'], ['T3_FRONTEND_ADV_JS', 'MUST']] },
  { key: 'REACT', title: 'React', kind: 'SKILL',
    description: 'Components to a deployed multi-page app: hooks, routing, APIs, Redux Toolkit and Vite.',
    topics: [['JT_REACT_BASICS', 'MUST'], ['JT_REACT_HOOKS', 'MUST'], ['T3_FRONTEND_COMPONENTS', 'SHOULD'], ['JT_REACT_ROUTING', 'MUST'],
      ['JT_REACT_STATE', 'SHOULD'], ['T3_FRONTEND_STATE', 'OPTIONAL'], ['JT_REACT_BUILD', 'MUST']] },
  { key: 'GIT_TOOLS', title: 'Git and Developer Tools', kind: 'SKILL',
    description: 'Version control with Git and GitHub, and an editor set up to work in.',
    topics: [['T_GIT', 'MUST'], ['T_EDITOR', 'SHOULD']] },

  /* ── Java Full Stack + AI, batch 2: Java and DSA in Java ── */
  { key: 'CORE_JAVA', title: 'Core Java', kind: 'SKILL',
    description: 'Java from the first program: fundamentals, OOP, exceptions, collections, lambdas and streams, concurrency and the JVM.',
    topics: [['JT_JAVA_START', 'MUST'], ['JT_JAVA_BASICS', 'MUST'], ['JT_JAVA_OOP', 'MUST'], ['JT_JAVA_EXCEPTIONS', 'MUST'],
      ['JT_JAVA_COLLECTIONS', 'MUST'], ['JT_JAVA_MODERN', 'MUST'], ['JT_JAVA_CONCURRENCY', 'SHOULD']] },
  { key: 'DSA_JAVA', title: 'DSA in Java', kind: 'SKILL',
    description: 'The data structures and algorithms interviews ask, solved in Java.',
    topics: [['JT_JAVA_DSA_LINEAR', 'MUST'], ['JT_JAVA_DSA_NONLINEAR', 'MUST']] },

  /* ── Java Full Stack + AI, batch 3: MySQL, persistence and Spring core ── */
  { key: 'MYSQL', title: 'MySQL', kind: 'SKILL',
    description: 'SQL from the first SELECT to joins, design, transactions and indexes — and MySQL itself.',
    topics: [['T_SQL', 'MUST'], ['T2_DB_QUERY', 'MUST'], ['T2_DB_DESIGN', 'MUST'], ['JT_MYSQL', 'MUST'],
      ['T3_TRANSACTIONS_INTEGRITY', 'SHOULD'], ['T3_QUERY_PERF', 'SHOULD']] },
  { key: 'JAVA_PERSISTENCE', title: 'JDBC and Hibernate/JPA', kind: 'SKILL',
    description: 'Java talking to MySQL: JDBC first, then Hibernate and JPA.',
    topics: [['JT_JDBC', 'MUST'], ['JT_JPA', 'MUST']] },
  { key: 'SPRING_CORE', title: 'Spring Core', kind: 'SKILL',
    description: 'Inversion of control, dependency injection, beans, configuration and AOP — what Spring Boot is built on.',
    topics: [['JT_SPRING_CORE', 'MUST']] },

  /* ── Java Full Stack + AI, batch 4: Spring Boot and the full stack ── */
  { key: 'SPRING_BOOT', title: 'Spring Boot', kind: 'SKILL',
    description: 'A REST API on Spring Boot: controllers, validation, errors, Spring Data JPA, security with JWT, and tests.',
    topics: [['JT_BOOT_REST', 'MUST'], ['JT_BOOT_DATA', 'MUST'], ['JT_BOOT_SECURITY', 'MUST'], ['JT_BOOT_TESTING', 'MUST']] },
  { key: 'FULLSTACK_DEPLOY', title: 'Full-Stack Integration and Deployment', kind: 'SKILL',
    description: 'React talking to Spring Boot — CORS, a JWT login flow, uploads and errors — then Docker and a deployed stack.',
    topics: [['JT_FULLSTACK', 'MUST']] },
];

export const TRACKS: TrackDefinition[] = [
  { key: 'JAVA_FULLSTACK_AI', name: 'Java Full Stack + AI', language: 'Java', order: 10,
    description: 'HTML, CSS, Bootstrap, JavaScript and React; Core Java, MySQL, Spring Boot; then generative and agentic AI built into your own app.',
    /* Batches: 1 frontend, 2 Java and DSA, 3 MySQL/persistence/Spring core, 4 Spring Boot and the full stack; Spring Boot and AI packs are appended as they land. */
    specializePacks: ['WEB_HTML', 'CSS_BOOTSTRAP', 'JAVASCRIPT', 'REACT', 'GIT_TOOLS', 'CORE_JAVA', 'DSA_JAVA', 'MYSQL', 'JAVA_PERSISTENCE', 'SPRING_CORE', 'SPRING_BOOT', 'FULLSTACK_DEPLOY'],
    placementPacks: [] },
];
