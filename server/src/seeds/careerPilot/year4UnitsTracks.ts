import { TopicSeed, UnitSeed } from './year1MegaCurriculum';
import { u, interviewUnit } from './year4UnitKit';

/**
 * Year 4, stage 4 — the nine specialization tracks. Modules P05 to P13.
 *
 * ── WHAT A STUDENT ACTUALLY MEETS HERE ────────────────────────────────────────────────────
 *
 * One ninth of it. There are 144 units below and a student takes sixteen, because
 * `applicableDirections` on each topic keeps the other eight tracks out of their plan. That
 * filtering is the whole reason the specialization is personalised rather than a menu, and it is
 * also the thing that was silently broken in Year 3 until the seeder was fixed — units were
 * written with an empty direction list, an empty list means everyone, and so every student was
 * offered every track. Nothing errored. If this module ever starts composing sixteen units of
 * Cybersecurity into a Data student's plan, that defect is the first place to look.
 *
 * ── THE SHAPE IS SHARED; THE SUBSTANCE IS NOT ─────────────────────────────────────────────
 *
 * The spec gives the specialization nine days with a fixed sequence — fundamentals, architecture,
 * tools, implementation, debugging, testing, security & quality, advanced challenge,
 * verification. Those nine questions are the same nine for every direction. What differs is the
 * answer, and the answers are authored per direction in TRACKS below.
 *
 * So the sequencing lives in `trackUnits` and is stated once, and what a Cloud student's
 * debugging exercise is actually about lives in the Cloud row. Writing nine copies of the shape
 * by hand would have been nine chances to leave one direction without an interview question.
 *
 * ── SIXTEEN UNITS, AND WHY NOT MORE ───────────────────────────────────────────────────────
 *
 * Nine days at the spec's three-to-four units. Year 3 settled on eighteen per track for the same
 * reason: it is what one month of a personalised plan holds once the placement practice running
 * alongside it has taken its share.
 */

interface Lesson {
  slug: string;
  title: string;
  description: string;
  outcome: string;
  minutes?: number;
}

interface TrackContent {
  /** Matches the topic-code fragment in year4StageMap: T4_<code>_DEPTH and so on. */
  code: string;
  /** The direction in a sentence, capitalised. Used in generated titles. */
  label: string;
  /** What this direction builds, lower case. Used mid-sentence. */
  thing: string;
  /** Two lessons: the direction's core concepts, then how its systems are designed. */
  depth: [Lesson, Lesson];
  /** Two lessons: the industry tooling, then the implementation approach. */
  build: [Lesson, Lesson];
  /** The implementation project. */
  buildProject: { title: string; description: string; outcome: string; minutes?: number };
  /** What goes wrong in this direction specifically. */
  fault: { title: string; description: string; outcome: string };
  /** The quality and security lesson for this direction. */
  quality: Lesson;
  /** The non-trivial problem the track is judged by. */
  advanced: { title: string; description: string; outcome: string; minutes?: number };
}

const TRACKS: TrackContent[] = [
  {
    code: 'SE', label: 'Software Engineering', thing: 'a large codebase',
    depth: [
      {
        slug: 'READING_A_CODEBASE', title: 'Reading a Codebase You Did Not Write',
        description: 'Finding the entry point, the seams and the parts that are load-bearing, before changing anything.',
        outcome: 'Map an unfamiliar codebase well enough to say where a change would be safe',
      },
      {
        slug: 'ARCHITECTURE_DECISIONS', title: 'The Decisions That Are Expensive to Reverse',
        description: 'Layering, module boundaries and dependency direction — the handful of choices everything else inherits.',
        outcome: 'Identify the architectural decision a codebase is built on, and what reversing it would cost',
      },
    ],
    build: [
      {
        slug: 'REFACTORING_SAFELY', title: 'Changing Structure Without Changing Behaviour',
        description: 'Small, verifiable steps, each one leaving the tests green — the only way a large refactor ever finishes.',
        outcome: 'Refactor in steps where every intermediate state still works',
      },
      {
        slug: 'MANAGING_DEPENDENCIES', title: 'Dependencies, and the Ones That Own You',
        description: 'What a dependency costs over years, and how to keep one at arm\'s length when you must take it.',
        outcome: 'Wrap a third-party dependency so replacing it later is a day rather than a quarter',
      },
    ],
    buildProject: {
      title: 'Restructuring Something Real',
      description: 'Take a working but poorly structured codebase and improve it without changing what it does.',
      outcome: 'Deliver a structural improvement with the behaviour provably unchanged',
    },
    fault: {
      title: 'The Change That Spread',
      description: 'A one-line fix that broke three unrelated things. Finding the coupling that made it possible.',
      outcome: 'Trace an unexpected breakage back to the coupling that allowed it',
    },
    quality: {
      slug: 'TESTING_FOR_CHANGE', title: 'Tests That Make a Refactor Possible',
      description: 'Characterisation tests over untested legacy code — pinning current behaviour so you can move it.',
      outcome: 'Put untested code under enough test to change it safely',
    },
    advanced: {
      title: 'A Design Somebody Disagrees With',
      description: 'Two defensible structures for the same requirement. Choose, build and defend against the other.',
      outcome: 'Defend a structural decision against a reasonable alternative',
    },
  },
  {
    code: 'BACKEND', label: 'Backend Engineering', thing: 'a service',
    depth: [
      {
        slug: 'API_AND_SCHEMA_TOGETHER', title: 'Designing the API and the Schema Together',
        description: 'They constrain each other. Designing one and then the other is how services end up with awkward endpoints.',
        outcome: 'Design an API and a schema as one decision rather than two',
      },
      {
        slug: 'SERVICE_ARCHITECTURE', title: 'How a Service Is Actually Laid Out',
        description: 'Routing, handlers, services, data access — and what belongs in each so the next change is cheap.',
        outcome: 'Place a new piece of logic in the right layer and say why not the others',
      },
    ],
    build: [
      {
        slug: 'AUTH_IN_PRACTICE', title: 'Sessions, Tokens and Getting Auth Right',
        description: 'How a request proves who it is, where the check belongs, and the endpoint everybody forgets to protect.',
        outcome: 'Implement authentication and authorization that a hostile caller cannot step around',
      },
      {
        slug: 'TRANSACTIONS_AND_CONSISTENCY', title: 'When Two Writes Must Not Separate',
        description: 'Transactions, idempotency and the retry that charged somebody twice.',
        outcome: 'Make an operation safe to retry and impossible to half-complete',
      },
    ],
    buildProject: {
      title: 'A Service Worth Calling',
      description: 'Build an authenticated API over a real schema, with error handling a caller can act on.',
      outcome: 'Deliver a service that behaves correctly for a confused or hostile client',
    },
    fault: {
      title: 'The Request That Got Slower',
      description: 'A endpoint that was fine with a hundred rows and is not with a hundred thousand. Finding where the time went.',
      outcome: 'Find the query or the loop costing the request, and prove the fix worked',
    },
    quality: {
      slug: 'CACHING_AND_ITS_COSTS', title: 'Caching, and What It Costs You in Correctness',
      description: 'What to cache, for how long, and the stale answer that is worse than a slow one.',
      outcome: 'Add a cache and say exactly when it will be wrong',
    },
    advanced: {
      title: 'A Trade-off You Have to Choose',
      description: 'A requirement where consistency and speed genuinely conflict. Pick one, build it, justify it.',
      outcome: 'Choose and defend a consistency or performance trade-off on real requirements',
    },
  },
  {
    code: 'FRONTEND', label: 'Frontend Engineering', thing: 'an interface',
    depth: [
      {
        slug: 'WHERE_STATE_BELONGS', title: 'Where a Piece of State Belongs',
        description: 'Local, lifted, shared or on the server — and the bug that comes from each wrong answer.',
        outcome: 'Place a piece of state correctly and say what breaks if it lives elsewhere',
      },
      {
        slug: 'THE_BROWSER_UNDERNEATH', title: 'What the Browser Is Actually Doing',
        description: 'The event loop, rendering, reflow and the reason an interface feels slow when nothing is slow.',
        outcome: 'Explain why an interface stutters from what the browser is doing, not from the framework',
      },
    ],
    build: [
      {
        slug: 'ASYNC_IN_AN_INTERFACE', title: 'Loading, Failing and Racing',
        description: 'Three states per request, the one everybody forgets, and the response that arrives after the next one.',
        outcome: 'Handle a request\'s loading, error and out-of-order cases in an interface',
      },
      {
        slug: 'BUILDING_FOR_REAL_DEVICES', title: 'A Small Screen and a Slow Connection',
        description: 'Responsive layout and payload size, treated as requirements rather than as a final pass.',
        outcome: 'Build an interface that works on a phone on a bad network',
      },
    ],
    buildProject: {
      title: 'An Interface That Holds Up',
      description: 'Build a multi-screen interface over a real API, with its loading and failure states designed rather than added.',
      outcome: 'Deliver an interface whose failure states are as considered as its success state',
    },
    fault: {
      title: 'The Render That Should Not Have Happened',
      description: 'Stale state, an effect firing twice, a value one render behind. Finding which of the three it is.',
      outcome: 'Diagnose a state or rendering fault rather than working around it',
    },
    quality: {
      slug: 'ACCESSIBILITY_AND_SECURITY', title: 'The Keyboard User and the Injected Script',
      description: 'Two quality failures that are invisible in testing and obvious to the person they affect.',
      outcome: 'Find and fix an accessibility fault and an injection risk in the same interface',
    },
    advanced: {
      title: 'Making It Fast Enough',
      description: 'An interface that works and feels slow. Measure it, fix the actual cause, prove the improvement.',
      outcome: 'Improve a measured performance problem and show the measurement afterwards',
    },
  },
  {
    code: 'FULLSTACK', label: 'Full-Stack Engineering', thing: 'an application end to end',
    depth: [
      {
        slug: 'DRAWING_THE_LINE', title: 'What Belongs on the Server',
        description: 'Validation, authorisation, business rules and secrets — and the cost of getting the line wrong in either direction.',
        outcome: 'Decide what belongs on the server and defend the line you drew',
      },
      {
        slug: 'THE_SHAPE_OF_THE_WHOLE', title: 'One Request, All the Way Through',
        description: 'Following a single user action through the interface, the API, the database and back.',
        outcome: 'Account for every layer a single user action passes through',
      },
    ],
    build: [
      {
        slug: 'A_FEATURE_THROUGH_EVERY_LAYER', title: 'Shipping a Feature Through All of It',
        description: 'Schema, endpoint, client call, rendering, error handling — as one piece of work rather than four.',
        outcome: 'Deliver a feature through the database, the API and the interface in one go',
      },
      {
        slug: 'CONTRACTS_BETWEEN_HALVES', title: 'The Contract Between the Two Halves',
        description: 'Keeping the client and the server agreeing about shapes, and what happens the day they stop.',
        outcome: 'Change an API without silently breaking the client that calls it',
      },
    ],
    buildProject: {
      title: 'An Application, End to End',
      description: 'Build a working application with authentication, persistence and a real interface over it.',
      outcome: 'Deliver something a user could actually use, from schema to screen',
    },
    fault: {
      title: 'Which Side Is It On',
      description: 'A fault visible in the interface and caused somewhere else. Locating it without guessing.',
      outcome: 'Trace a fault across the seam instead of guessing which side it is on',
    },
    quality: {
      slug: 'TESTING_AND_SECURING_BOTH_HALVES', title: 'Testing and Securing Both Halves',
      description: 'Where to test each layer, and the authorisation check that exists on the client only.',
      outcome: 'Test both halves at the right level, and close a gap that only the server can close',
    },
    advanced: {
      title: 'The Walkthrough',
      description: 'Take somebody through a full request and back, out loud, from your own application.',
      outcome: 'Explain a whole request path from your own code, without notes',
    },
  },
  {
    code: 'DATA', label: 'Data & Analytics', thing: 'a dataset',
    depth: [
      {
        slug: 'WHAT_THE_DATA_CANNOT_ANSWER', title: 'What This Data Cannot Tell You',
        description: 'Coverage, selection and the question that is unanswerable before any analysis starts.',
        outcome: 'Say what a dataset cannot answer, before spending a week answering it',
      },
      {
        slug: 'SHAPE_BEFORE_ANALYSIS', title: 'Understanding the Shape First',
        description: 'Distributions, missingness, cardinality and the sanity checks that save the whole analysis.',
        outcome: 'Characterise a dataset before drawing anything from it',
      },
    ],
    build: [
      {
        slug: 'FROM_RAW_TO_USABLE', title: 'Getting Raw Data Into a Usable Shape',
        description: 'Joining, reshaping, cleaning — and recording what you changed so the result stays reproducible.',
        outcome: 'Take messy data to a clean table, reproducibly',
      },
      {
        slug: 'A_FIGURE_THAT_ARGUES', title: 'A Figure That Makes the Point',
        description: 'Choosing the chart the finding needs, and the axes that would have misled.',
        outcome: 'Produce a figure that supports the claim without overstating it',
      },
    ],
    buildProject: {
      title: 'A Question, Answered From Data',
      description: 'Take a real question through acquisition, cleaning, analysis and a presented answer.',
      outcome: 'Deliver an answer somebody could act on, with the working visible',
    },
    fault: {
      title: 'The Join That Changed the Answer',
      description: 'A duplicated row, a dropped null, a filter applied too early. Finding which one moved the number.',
      outcome: 'Find the transformation that quietly changed the result',
    },
    quality: {
      slug: 'QUERIES_AT_SIZE', title: 'When the Query Stops Returning',
      description: 'Why an analysis that ran on a sample does not run on the full table, and what to do about it.',
      outcome: 'Make an analysis run at full data size without changing what it computes',
    },
    advanced: {
      title: 'Presenting an Uncertain Finding',
      description: 'A result that is real but not certain. Present it honestly to somebody who wants a yes or a no.',
      outcome: 'Present a finding with its uncertainty attached rather than removed',
    },
  },
  {
    code: 'AIML', label: 'AI & Machine Learning', thing: 'a model',
    depth: [
      {
        slug: 'FRAMING_AND_BASELINE', title: 'The Framing, and the Baseline That Comes First',
        description: 'What is being predicted, from what, for whom — and the trivial baseline any model must beat.',
        outcome: 'Frame a problem and set a baseline before choosing any algorithm',
      },
      {
        slug: 'WHAT_THE_MODEL_LEARNS_FROM', title: 'What the Model Is Actually Learning From',
        description: 'Features, representation and the column that is a proxy for the answer.',
        outcome: 'Say what signal a model is using, and whether it should be allowed to',
      },
    ],
    build: [
      {
        slug: 'THE_WORKFLOW', title: 'Data, Split, Train, Evaluate',
        description: 'The loop, in order, and what goes wrong when it is run out of order.',
        outcome: 'Run a complete workflow whose evaluation means what it claims',
      },
      {
        slug: 'USING_A_MODEL_YOU_DID_NOT_TRAIN', title: 'Building On a Model Somebody Else Trained',
        description: 'Applied ML: prompting, fine-tuning or an API, and being honest about which you did.',
        outcome: 'Build something useful on an existing model and state its limits',
      },
    ],
    buildProject: {
      title: 'A Model That Does Something Useful',
      description: 'Take a real problem through data, features, training and a prediction somebody could use.',
      outcome: 'Deliver a working model with an evaluation that is not flattering itself',
    },
    fault: {
      title: 'The Score That Was Too Good',
      description: 'Leakage, an unfair split, a target hidden in a feature. Finding why the number is not real.',
      outcome: 'Detect leakage or an invalid split that made a score look good',
    },
    quality: {
      slug: 'EVALUATION_AND_HARM', title: 'What It Does Badly, and To Whom',
      description: 'Beyond accuracy: the errors that matter, who they fall on, and what you owe them.',
      outcome: 'Report a model\'s failure modes and who they affect, alongside its headline number',
    },
    advanced: {
      title: 'Defending the Number',
      description: 'Your own model, your own evaluation, and somebody asking whether it would work in production.',
      outcome: 'Defend an evaluation against the objection that it does not generalise',
    },
  },
  {
    code: 'CLOUD', label: 'Cloud & DevOps', thing: 'a deployment',
    depth: [
      {
        slug: 'COMMIT_TO_RUNNING', title: 'What Happens Between a Commit and a Running Process',
        description: 'Build, artefact, image, registry, deploy, process — the chain most people only know two links of.',
        outcome: 'Describe every step between a commit and a running process',
      },
      {
        slug: 'WHERE_IT_RUNS', title: 'What the Cloud Actually Gives You',
        description: 'Compute, storage, networking and identity — the four things every managed service is a wrapper over.',
        outcome: 'Say which primitive a managed service is really providing, and what it costs',
      },
    ],
    build: [
      {
        slug: 'CONTAINERISING_PROPERLY', title: 'An Image That Is Not Two Gigabytes',
        description: 'Layers, caching, what belongs in the image and what belongs in the environment.',
        outcome: 'Build a small, reproducible image and say what is in each layer',
      },
      {
        slug: 'A_PIPELINE_THAT_CAN_FAIL', title: 'A Pipeline That Fails Safely',
        description: 'Stages, gates and the deploy that must not happen when the tests did not pass.',
        outcome: 'Build a pipeline where a failure stops the deploy rather than delaying it',
      },
    ],
    buildProject: {
      title: 'From Repository to Running Service',
      description: 'Take an application through a container, a pipeline and a real deployment.',
      outcome: 'Deploy an application through automation rather than by hand',
    },
    fault: {
      title: 'It Is Down and Nobody Knows Why',
      description: 'No logs, no metrics, no idea. Instrumenting after the fact, and what should have been there.',
      outcome: 'Diagnose a failing deployment from the evidence available, then add the evidence that was missing',
    },
    quality: {
      slug: 'KNOWING_IT_IS_WORKING', title: 'Answering "Is It Working?" From Evidence',
      description: 'Health, metrics, logs and one alert worth waking somebody for.',
      outcome: 'Instrument a service well enough to answer whether it is healthy without guessing',
    },
    advanced: {
      title: 'The Rollback',
      description: 'A deploy that went wrong. Roll it back, keep the data, and account for the decision afterwards.',
      outcome: 'Explain a rollback or a scaling decision and what it cost',
    },
  },
  {
    code: 'SECURITY', label: 'Cybersecurity', thing: 'an application',
    depth: [
      {
        slug: 'WHAT_AN_ATTACKER_WANTS', title: 'Modelling What an Attacker Is After',
        description: 'Assets, entry points and trust boundaries — before any list of vulnerabilities is useful.',
        outcome: 'Model a system\'s assets and trust boundaries before enumerating its weaknesses',
      },
      {
        slug: 'CLASSES_NOT_CASES', title: 'Vulnerability Classes, Not Individual Bugs',
        description: 'Injection, broken access control, exposure — why fixing the reported instance fixes almost nothing.',
        outcome: 'Name the class a reported bug belongs to, and find its other instances',
      },
    ],
    build: [
      {
        slug: 'BUILDING_THE_CONTROL', title: 'Building the Control Properly',
        description: 'Parameterisation, server-side authorisation and output encoding, done once at the right layer.',
        outcome: 'Implement a control that closes a class rather than patching an instance',
      },
      {
        slug: 'IDENTITY_DONE_RIGHT', title: 'Identity, Sessions and What They Are Worth',
        description: 'Authentication, session handling and the token that was valid for rather too long.',
        outcome: 'Implement identity handling that survives a stolen token better than it would have',
      },
    ],
    buildProject: {
      title: 'Securing an Application That Is Not Secure',
      description: 'Take a deliberately weak application and close its real weaknesses, in order of impact.',
      outcome: 'Deliver a hardened application with the changes justified by impact',
    },
    fault: {
      title: 'The Bypass',
      description: 'A control that looks present and is not enforced. Finding the path around it.',
      outcome: 'Find the route that bypasses a control somebody believed was working',
    },
    quality: {
      slug: 'REVIEWING_FOR_A_CLASS', title: 'Reviewing Code for One Class at a Time',
      description: 'Sweeping a codebase for every instance of one weakness, rather than reading it for everything at once.',
      outcome: 'Review code for a vulnerability class and find every instance, not the first',
    },
    advanced: {
      title: 'A Finding Somebody Can Act On',
      description: 'Impact, reproduction, fix and severity — written for a developer who has to prioritise it.',
      outcome: 'Write a security finding a developer could act on without asking you anything',
    },
  },
  {
    code: 'MOBILE', label: 'Mobile Engineering', thing: 'a mobile app',
    depth: [
      {
        slug: 'THE_LIFECYCLE', title: 'An Operating System That Can Stop You',
        description: 'Backgrounding, termination and restoration — the lifecycle no web application has to think about.',
        outcome: 'Design for a lifecycle where the system can suspend or kill you at any moment',
      },
      {
        slug: 'STATE_ON_A_DEVICE', title: 'State That Has to Survive',
        description: 'What lives in memory, what is written down, and what must still be there tomorrow.',
        outcome: 'Decide what state must persist on the device and what may be lost',
      },
    ],
    build: [
      {
        slug: 'WORKING_OFFLINE', title: 'When There Is No Network',
        description: 'Queueing, local truth, and reconciling when the connection comes back disagreeing with you.',
        outcome: 'Build a screen that works offline and reconciles when the network returns',
      },
      {
        slug: 'PERMISSIONS_AND_THE_USER', title: 'Asking for a Permission Well',
        description: 'What you are allowed to ask for, when, and what the app must still do when the answer is no.',
        outcome: 'Handle a denied permission without the feature simply breaking',
      },
    ],
    buildProject: {
      title: 'An App That Survives Real Conditions',
      description: 'Build a mobile app that handles being backgrounded, losing its network and being denied a permission.',
      outcome: 'Deliver an app that behaves correctly under the conditions a real device imposes',
    },
    fault: {
      title: 'Only On a Real Device',
      description: 'It works in the simulator. Reproducing and fixing something that only happens on hardware.',
      outcome: 'Debug something that does not reproduce in the simulator',
    },
    quality: {
      slug: 'BATTERY_STORAGE_AND_TRUST', title: 'Battery, Storage and What You Keep',
      description: 'Background work, local storage and the personal data an app should not be holding at all.',
      outcome: 'Justify what an app stores and what work it does while nobody is looking',
    },
    advanced: {
      title: 'Defending a Device Decision',
      description: 'A storage, permission or background-work choice, explained to somebody sceptical about it.',
      outcome: 'Explain a storage, permission or battery decision to somebody sceptical',
    },
  },
];

/** The four topics for one direction, in the spec's nine-day sequence. */
const trackTopics = (c: TrackContent): Record<string, TopicSeed> => {
  const lesson = (l: Lesson, after?: string[]): UnitSeed =>
    u(l.slug, l.title, l.description, [l.outcome], l.minutes ?? 65, after ? { after } : {});

  return {
    /* Days 22–23: fundamentals and architecture. */
    [`T4_${c.code}_DEPTH`]: {
      category: 'DIRECTION',
      units: [
        lesson(c.depth[0]),
        lesson(c.depth[1], [c.depth[0].slug]),
        u('PRACTICE', `${c.label} — Working It Through`,
          `Applying both ideas to ${c.thing} you did not design.`,
          [`Apply ${c.label.toLowerCase()} reasoning to a system somebody else built`],
          60, { unitType: 'PRACTICE', after: [c.depth[1].slug] }),
        interviewUnit(`${c.label} Depth`, 'PRACTICE'),
      ],
    },

    /* Days 24–25: tooling and implementation. */
    [`T4_${c.code}_BUILD`]: {
      category: 'DIRECTION',
      units: [
        lesson(c.build[0]),
        lesson(c.build[1], [c.build[0].slug]),
        u('MINI_PROJECT', c.buildProject.title, c.buildProject.description,
          [c.buildProject.outcome], c.buildProject.minutes ?? 140,
          { unitType: 'PROJECT', after: [c.build[1].slug] }),
        u('DEBUGGING', c.fault.title, c.fault.description, [c.fault.outcome],
          60, { unitType: 'DEBUG', after: ['MINI_PROJECT'] }),
        interviewUnit(`Building ${c.thing.charAt(0).toUpperCase()}${c.thing.slice(1)}`, 'DEBUGGING'),
      ],
    },

    /* Days 26–28: debugging, testing, security and quality. */
    [`T4_${c.code}_QUALITY`]: {
      category: 'DIRECTION',
      units: [
        lesson(c.quality),
        u('HARDER_FAULT', `${c.label} — The Fault That Looks Correct`,
          `A ${c.thing} that passes every test it has and is still wrong. Finding what nobody thought to check.`,
          [`Find a fault in ${c.thing} that the existing tests were never going to catch`],
          65, { unitType: 'DEBUG', after: [c.quality.slug] }),
        u('PRACTICE', `${c.label} — Quality Practice`,
          'Enough repetition on the quality work that it stops being the part that gets skipped.',
          [`Review, test and harden ${c.thing} without being told what to look for`],
          60, { unitType: 'PRACTICE', after: ['HARDER_FAULT'] }),
        interviewUnit(`${c.label} Quality`, 'PRACTICE'),
      ],
    },

    /* Days 29–30: the advanced challenge, and verification. */
    [`T4_${c.code}_PROOF`]: {
      category: 'DIRECTION',
      units: [
        u('ADVANCED_CHALLENGE', c.advanced.title, c.advanced.description,
          [c.advanced.outcome], c.advanced.minutes ?? 130,
          { unitType: 'PROJECT', after: [] }),
        u('SPECIALIZATION_INTERVIEW', `${c.label} — The Specialization Interview`,
          `A full interview on ${c.label.toLowerCase()} alone: depth, judgement and the follow-up that finds the edge of it.`,
          [`Be interviewed on ${c.label.toLowerCase()} at the depth somebody hiring for it would ask`],
          70, { unitType: 'PRACTICE', after: ['ADVANCED_CHALLENGE'] }),
        u('CHECKPOINT', `${c.label} — Verification`,
          'Whether the specialization is demonstrable, measured rather than felt.',
          [`Show ${c.label.toLowerCase()} capability at the standard the direction is hired at`],
          50, { unitType: 'CHECKPOINT', after: ['SPECIALIZATION_INTERVIEW'] }),
      ],
    },
  };
};

export const YEAR4_TRACKS: Record<string, TopicSeed> = TRACKS.reduce(
  (all, c) => ({ ...all, ...trackTopics(c) }), {} as Record<string, TopicSeed>,
);
