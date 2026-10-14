import { TopicSeed, UnitSeed } from './year1MegaCurriculum';
import { u } from './year4UnitKit';

/**
 * Career-track content, batch 1: Bootstrap, JavaScript the language, modern JavaScript and React.
 * Written for Java Full Stack + AI and reused as it stands by every track that teaches a React
 * frontend (Python Full Stack, .NET Full Stack, Frontend Engineer).
 *
 * ── EVERY TOPIC ENDS THE SAME WAY ─────────────────────────────────────────────────────────
 *
 * Find the fault, drill it, be asked about it in an interview, and — where the topic builds
 * something — build it; then a checkpoint that measures. The interview question is in every topic
 * because a track's promise is placement: a student who can do a thing and cannot say it to an
 * interviewer has half of it. One unit is one sitting, and nothing is called "basics".
 */

const ending = (what: string, after: string, opts: { project?: [string, string, string]; minutes?: [number, number, number, number] } = {}): UnitSeed[] => {
  const [debugMin, practiceMin, interviewMin, checkMin] = opts.minutes || [45, 60, 40, 40];
  const units: UnitSeed[] = [
    u('DEBUGGING', `Debugging ${what}`,
      `Reading what goes wrong with ${what.toLowerCase()}, and finding the cause rather than changing things at random.`,
      [`Find the cause of a broken ${what.toLowerCase()} example and fix only that`], debugMin, { unitType: 'DEBUG', after: [after] }),
    u('PRACTICE', `${what} Practice`,
      `Enough repetition that ${what.toLowerCase()} stops needing thought.`,
      [`Work ${what.toLowerCase()} problems without looking things up`], practiceMin, { unitType: 'PRACTICE', after: ['DEBUGGING'] }),
    u('INTERVIEW_QUESTION', `${what} — The Interview Question`,
      `What an interviewer actually asks about ${what.toLowerCase()}, and the follow-up when you answer well.`,
      [`Answer a realistic interview question on ${what.toLowerCase()} aloud, including the follow-up`], interviewMin,
      { unitType: 'PRACTICE', after: ['PRACTICE'] }),
  ];
  let last = 'INTERVIEW_QUESTION';
  if (opts.project) {
    const [slug, title, description] = opts.project;
    units.push(u(slug, title, description, [`Build it end to end and explain every decision in it`], 150, { unitType: 'PROJECT', after: [last] }));
    last = slug;
  }
  units.push(u('CHECKPOINT', `${what} — Checkpoint`, 'Where you actually are on this, measured rather than felt.',
    [`Show ${what.toLowerCase()} at the standard a full-stack interview expects`], checkMin, { unitType: 'CHECKPOINT', after: [last] }));
  return units;
};

export const TRACK_WEB: Record<string, TopicSeed> = {
  /* ── Bootstrap 5 ── */
  JT_BOOTSTRAP: { category: 'UNIVERSAL', units: [
    u('WHAT_IT_GIVES', 'What Bootstrap Gives You, and What It Costs', 'A CSS framework is a set of decisions somebody else made; knowing which ones you are accepting.',
      ['Say what Bootstrap provides, how it is added to a page, and when plain CSS is the better choice'], 35),
    u('GRID', 'The Grid: Containers, Rows and Columns', 'Twelve columns, breakpoints, and a layout that rearranges itself on a phone.',
      ['Lay out a page with containers, rows and responsive columns at sm/md/lg breakpoints'], 50, { after: ['WHAT_IT_GIVES'] }),
    u('COMPONENTS', 'Components: Navbar, Cards, Buttons and Modals', 'The ready-made pieces, the markup they expect, and the JavaScript some of them need.',
      ['Build a responsive navbar, a card grid and a modal from Bootstrap components'], 50, { after: ['GRID'] }),
    u('FORMS_UTILITIES', 'Forms and Utility Classes', 'Form controls, validation styles, and spacing, colour and display utilities instead of custom CSS.',
      ['Style a form with Bootstrap and lay out a section with utility classes alone'], 45, { after: ['COMPONENTS'] }),
    u('CUSTOMISING', 'Customising Bootstrap Without Fighting It', 'Overriding variables and adding your own styles in the right order, so the next upgrade does not undo you.',
      ['Change Bootstrap\'s colours and spacing the supported way and explain why !important is the wrong tool'], 35, { after: ['FORMS_UTILITIES'] }),
    ...ending('Bootstrap', 'CUSTOMISING', { project: ['MINI_PROJECT', 'Mini Project — A Responsive Landing Page', 'A product landing page built with Bootstrap: navbar, hero, feature cards, a sign-up form and a footer that work from a phone to a monitor.'] }),
  ] },

  /* ── JavaScript fundamentals ── */
  JT_JS_CORE: { category: 'UNIVERSAL', units: [
    u('VALUES_TYPES', 'Values, Types and Variables', 'Numbers, strings, booleans, null and undefined, and what typeof says about each.',
      ['Declare variables, name each value\'s type, and predict what typeof returns'], 40, { skillKeys: ['JS_BASICS'] }),
    u('OPERATORS', 'Operators, Comparison and Truthiness', 'Why == and === differ, which values are falsy, and how && and || return values rather than booleans.',
      ['Predict the result of comparisons and logical expressions, including the surprising ones'], 40, { after: ['VALUES_TYPES'], skillKeys: ['JS_BASICS'] }),
    u('CONTROL_FLOW', 'Conditions and Loops in JavaScript', 'if/else, switch, for, while and for...of, and choosing between them.',
      ['Write conditions and loops that handle the edge cases, and trace them by hand'], 45, { after: ['OPERATORS'], skillKeys: ['JS_BASICS'] }),
    u('FUNCTIONS_SCOPE', 'Functions and Scope', 'Declarations and expressions, parameters and defaults, return values, and where a variable can be seen.',
      ['Write functions with defaults and returns, and say which variables each one can see'], 45, { after: ['CONTROL_FLOW'], skillKeys: ['JS_FUNCTIONS'] }),
    u('ARRAYS', 'Arrays and Their Methods', 'push and pop, slice and splice, and the map, filter, reduce and find that most code is written with.',
      ['Transform and search arrays with map, filter, reduce and find instead of hand-written loops'], 50, { after: ['FUNCTIONS_SCOPE'], skillKeys: ['JS_ARRAYS_OBJECTS'] }),
    u('OBJECTS_JSON', 'Objects and JSON', 'Properties, nested objects, iterating keys, and turning objects into JSON text and back.',
      ['Build, read and change objects, and convert them to and from JSON'], 45, { after: ['ARRAYS'], skillKeys: ['JS_ARRAYS_OBJECTS'] }),
    ...ending('JavaScript Fundamentals', 'OBJECTS_JSON'),
  ] },

  /* ── Modern JavaScript ── */
  JT_JS_ES6: { category: 'UNIVERSAL', units: [
    u('LET_CONST_ARROW', 'let, const and Arrow Functions', 'Block scope, why var is avoided, and what arrow functions change about this.',
      ['Choose let or const correctly and rewrite functions as arrow functions where it is safe'], 40),
    u('DESTRUCTURING_SPREAD', 'Destructuring, Spread and Rest', 'Pulling values out of objects and arrays, copying without mutating, and collecting arguments.',
      ['Destructure props and responses, and copy or merge objects and arrays without changing the original'], 45, { after: ['LET_CONST_ARROW'] }),
    u('MODULES', 'Modules: import and export', 'Splitting code into files, named and default exports, and how a bundler joins them back.',
      ['Split a program into modules with named and default exports and import them correctly'], 40, { after: ['DESTRUCTURING_SPREAD'] }),
    u('CLASSES', 'Classes in JavaScript', 'constructor, methods, extends and super, and how they sit on top of prototypes.',
      ['Write a class with a constructor and methods, extend it, and say what a prototype is'], 40, { after: ['MODULES'] }),
    u('MODERN_SYNTAX', 'Template Literals, Optional Chaining and ??', 'The small syntax that removes most "Cannot read properties of undefined" errors.',
      ['Use template literals, ?. and ?? to handle missing data safely'], 35, { after: ['CLASSES'] }),
    ...ending('Modern JavaScript', 'MODERN_SYNTAX'),
  ] },

  /* ── React fundamentals ── */
  JT_REACT_BASICS: { category: 'UNIVERSAL', units: [
    u('WHY_REACT', 'Why React, and What a Component Is', 'Describing the screen as a function of data, instead of changing the DOM by hand.',
      ['Explain what React solves, and set up a first project with Vite'], 35),
    u('JSX', 'JSX', 'HTML-like syntax that is really JavaScript: expressions in braces, className, and one parent element.',
      ['Write JSX with expressions, attributes and fragments, and fix the usual JSX errors'], 40, { after: ['WHY_REACT'] }),
    u('PROPS', 'Components and Props', 'Splitting a screen into components and passing data down to them.',
      ['Build a screen from small components that receive data through props'], 45, { after: ['JSX'] }),
    u('STATE', 'State with useState', 'Data that changes over time, why the screen re-renders, and why state is never mutated.',
      ['Hold changing data in state and update it without mutating it'], 50, { after: ['PROPS'] }),
    u('EVENTS_FORMS', 'Events and Controlled Forms', 'onClick and onChange, and forms whose inputs are driven by state.',
      ['Handle events and build a controlled form that validates before submit'], 50, { after: ['STATE'] }),
    u('LISTS_CONDITIONS', 'Lists, Keys and Conditional Rendering', 'Rendering arrays with map, why keys matter, and showing or hiding parts of the screen.',
      ['Render a list with stable keys and show different UI for different states'], 45, { after: ['EVENTS_FORMS'] }),
    ...ending('React Fundamentals', 'LISTS_CONDITIONS', { project: ['MINI_PROJECT', 'Mini Project — A React Task List', 'A task list in React: add, complete, edit and delete tasks, filter by status, with components, props, state and a controlled form.'] }),
  ] },

  /* ── React hooks ── */
  JT_REACT_HOOKS: { category: 'UNIVERSAL', units: [
    u('USE_EFFECT', 'useEffect and When Code Runs', 'Side effects, the dependency array, and cleaning up after yourself.',
      ['Run code after render with the right dependencies and clean up subscriptions and timers'], 50),
    u('RULES_OF_HOOKS', 'The Rules of Hooks', 'Why hooks must be called in the same order every render, and what breaks when they are not.',
      ['Spot hook calls that break the rules and restructure them'], 30, { after: ['USE_EFFECT'] }),
    u('CONTEXT', 'Context: Sharing State Without Prop Drilling', 'createContext, a provider, and useContext — and when context is the wrong tool.',
      ['Share a logged-in user or theme across a tree with context'], 45, { after: ['RULES_OF_HOOKS'] }),
    u('USE_REF_MEMO', 'useRef, useMemo and useCallback', 'Holding a value without re-rendering, reaching a DOM node, and when memoising actually helps.',
      ['Use useRef for DOM access and stable values, and memoise only where it measurably helps'], 45, { after: ['CONTEXT'] }),
    u('CUSTOM_HOOKS', 'Writing Your Own Hooks', 'Pulling repeated stateful logic out of components into a hook of your own.',
      ['Extract shared logic into a custom hook such as useFetch or useLocalStorage'], 45, { after: ['USE_REF_MEMO'] }),
    ...ending('React Hooks', 'CUSTOM_HOOKS'),
  ] },

  /* ── Routing and APIs ── */
  JT_REACT_ROUTING: { category: 'UNIVERSAL', units: [
    u('ROUTER', 'React Router: Pages, Links and Parameters', 'Routes, Link and NavLink, URL parameters, and nested layouts.',
      ['Build a multi-page app with React Router, including a page that reads a URL parameter'], 50, { skillKeys: ['REACT_ROUTING'] }),
    u('CALLING_APIS', 'Calling an API with fetch and axios', 'Requests from a component, an API module of your own, and where the base URL lives.',
      ['Call a REST API from React through one api module, with axios'], 50, { after: ['ROUTER'], skillKeys: ['REACT_ROUTING', 'JS_ASYNC'] }),
    u('LOADING_ERROR', 'Loading, Error and Empty States', 'Every request has four outcomes, and a screen that shows only one of them is broken.',
      ['Show a spinner, an error with retry, an empty state and the data — for every request'], 40, { after: ['CALLING_APIS'], skillKeys: ['REACT_ROUTING', 'JS_ASYNC'] }),
    u('PROTECTED_ROUTES', 'Protected Routes and Redirects', 'Keeping pages behind a login, and sending the user where they meant to go afterwards.',
      ['Guard routes behind a logged-in check and redirect after login'], 40, { after: ['LOADING_ERROR'], skillKeys: ['REACT_ROUTING'] }),
    ...ending('React Routing and APIs', 'PROTECTED_ROUTES', { project: ['MINI_PROJECT', 'Mini Project — A Multi-Page App on a Public API', 'A three-page React app over a public API — list, search and detail pages — with routing, loading, error and empty states.'] }),
  ] },

  /* ── Redux Toolkit ── */
  JT_REACT_STATE: { category: 'UNIVERSAL', units: [
    u('WHEN_A_STORE', 'When Component State Is Not Enough', 'Lifting state up, context, and the point where a store earns its keep.',
      ['Decide where a piece of state belongs: a component, context, or a store'], 35, { skillKeys: ['STATE_MANAGEMENT'] }),
    u('REDUX_TOOLKIT', 'Redux Toolkit: Store, Slices and Actions', 'configureStore, createSlice, useSelector and useDispatch.',
      ['Build a store with a slice and read and change it from components'], 55, { after: ['WHEN_A_STORE'], skillKeys: ['STATE_MANAGEMENT', 'REACT_HOOKS'] }),
    u('ASYNC_THUNKS', 'Server Data with createAsyncThunk', 'Loading data into the store with pending, fulfilled and rejected states.',
      ['Fetch API data into Redux with createAsyncThunk and show each state'], 50, { after: ['REDUX_TOOLKIT'], skillKeys: ['STATE_MANAGEMENT'] }),
    ...ending('Redux Toolkit', 'ASYNC_THUNKS'),
  ] },

  /* ── Building and shipping ── */
  JT_REACT_BUILD: { category: 'UNIVERSAL', units: [
    u('VITE', 'Vite: Creating, Running and Building a Project', 'The dev server, the production build, and what is actually in the dist folder.',
      ['Create a React project with Vite, run it, and produce a production build'], 35, { skillKeys: ['REACT_COMPONENTS'] }),
    u('BOOTSTRAP_IN_REACT', 'Styling React with Bootstrap', 'Using Bootstrap classes in JSX, and React-Bootstrap components for the interactive pieces.',
      ['Style a React app with Bootstrap classes and React-Bootstrap components'], 40, { after: ['VITE'], skillKeys: ['BOOTSTRAP', 'REACT_COMPONENTS'] }),
    u('ENV_DEPLOY', 'Environment Variables and Deploying a React App', 'Keeping the API URL out of the code, and publishing a build on Netlify or Vercel.',
      ['Configure environments with Vite variables and deploy a build to a public URL'], 40, { after: ['BOOTSTRAP_IN_REACT'], skillKeys: ['REACT_COMPONENTS'] }),
    u('REACT_PROJECT', 'React Project — A Task Manager', 'A full task manager in React: routing, a store, an API, Bootstrap styling, deployed — the frontend the Spring Boot backend will later serve.',
      ['Build, deploy and explain a complete React frontend'], 240, { unitType: 'PROJECT', after: ['ENV_DEPLOY'], skillKeys: ['REACT_COMPONENTS', 'REACT_ROUTING'] }),
    u('CHECKPOINT', 'React — Checkpoint', 'Where you actually are on React as a whole, measured rather than felt.',
      ['Show React at the standard a full-stack interview expects'], 45, { unitType: 'CHECKPOINT', after: ['REACT_PROJECT'], skillKeys: ['REACT_COMPONENTS', 'REACT_HOOKS', 'REACT_ROUTING'] }),
  ] },
};
