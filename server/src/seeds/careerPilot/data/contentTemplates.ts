/**
 * Worked examples of what content for one topic looks like.
 *
 * WHY THIS FILE EXISTS. seedFoundationContent writes placeholders and says so in their body: they
 * exist so the flow can be walked end to end, and a student opening one sees scaffolding rather
 * than being served an empty page. What nobody has had until now is a reference showing an author
 * what a finished topic actually contains — which fields carry the adaptive behaviour, how two
 * versions of the same lesson differ, and what makes one row win a slot over another.
 *
 * THIS IS NOT TEACHING MATERIAL AND DOES NOT PRETEND TO BE. Every row below is a shape with a
 * sentence of real content in it. Writing the lessons is human authoring work measured in weeks,
 * and no seed file substitutes for it. What these rows do is make the decisions visible: an author
 * copying one of them will be asked every question the planner needs answered.
 *
 * ── WHAT THE PLANNER ACTUALLY USES, IN THE ORDER IT USES IT ───────────────────────────────────
 *
 *   skillKeys       Without these a row is findable by keyword and by nothing else. The adaptive
 *                   plan resolves material by canonical skill, so an unmapped row is invisible to
 *                   it however good the content is. This is the single field that decides whether
 *                   content participates at all.
 *
 *   topicCode       Optional, and the tie-break that outranks everything else. Where several
 *                   topics legitimately teach one skill, a row carrying the topic code wins that
 *                   topic. A row without one still serves every topic teaching its skills, which
 *                   is what keeps one good video usable across a whole spiral.
 *
 *   learningDepth   WHO the version is pitched at, which is not how hard it is. FOUNDATION is a
 *                   slow build for somebody meeting the idea; REVISION is a recap for somebody
 *                   who has met it and forgotten. The planner picks a depth from what it measured,
 *                   so a topic with only one depth gives it nothing to choose between.
 *
 *   difficultyLevel Practice difficulty on the 1-4 scale the planner assigns against. Teaching
 *                   rows do not need it; practice rows without it are usable and never targeted.
 *
 *   canonical       Prefer-me-among-equals. It breaks ties between rows that are otherwise equally
 *                   good, and it is outranked by a topic match. Marking everything canonical is
 *                   the same as marking nothing.
 *
 *   careerContexts  Lets an AI student get the dataset example and a web student the shopping-cart
 *                   one, for the identical skill. Absent means it serves every direction.
 *
 * ── THE THREE THINGS AUTHORS GET WRONG ────────────────────────────────────────────────────────
 *
 *   1. One row per topic. A single STANDARD-depth video means the planner has nothing to offer a
 *      student who has just failed the diagnostic on that skill. Two depths is the minimum that
 *      makes the depth axis mean anything.
 *   2. Practice with no difficultyLevel. It will be served to everyone at every level, including
 *      the student who needed the easy version.
 *   3. Everything marked canonical. The flag then carries no information and the tie-break falls
 *      back to insertion order, which is how "oldest match wins" quietly returns.
 */

import type { ILearningContentLibrary } from '../../../models/LearningContentLibrary';

/** The fields an author fills in. Everything else on the model has a sensible default. */
export type ContentTemplate = Pick<ILearningContentLibrary,
  'title' | 'description' | 'type' | 'topicTags' | 'estimatedDuration'> &
  Partial<Pick<ILearningContentLibrary,
    'skillKeys' | 'topicCode' | 'learningDepth' | 'difficultyLevel' | 'canonical' |
    'careerContexts' | 'applicableDirections' | 'videoSource' | 'videoUrl' | 'videoDuration' |
    'completionThreshold' | 'notesSource' | 'difficulty'>> & {
    /** Plain-text stand-in for the body an author would write. */
    bodyOutline?: string[];
  };

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   A COMPLETE TOPIC: T_PROCESSES, teaching OS_PROCESSES

   Five rows. Two teaching depths so the planner has a choice, one worked example, and two
   practice rows at different difficulties so it can pitch practice at what it measured.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

export const TEMPLATE_TOPIC_PROCESSES: ContentTemplate[] = [
  {
    // ── Teaching, for somebody meeting this for the first time ──────────────────────────────
    title: 'Programs, Processes and Jobs — from the start',
    description:
      'What actually exists while something is running, and why the same program started twice '
      + 'is two separate things.',
    type: 'video',
    topicTags: ['operating systems', 'processes'],
    estimatedDuration: 22,

    skillKeys: ['OS_PROCESSES'],
    // Set because M09 has four topics and two of them could reasonably claim a process video.
    // Without it this row would also serve T_LINUX, which teaches something else.
    topicCode: 'T_PROCESSES',
    learningDepth: 'FOUNDATION',
    canonical: true,
    difficulty: 'beginner',

    videoSource: 'youtube',
    videoUrl: '<replace with the real video URL>',
    videoDuration: 22 * 60,
    // 80 means a student must watch most of it before it counts as done. Use 0 for a reference
    // page they may legitimately skim.
    completionThreshold: 80,

    bodyOutline: [
      'A program is a file. Starting it creates something new that the file is not.',
      'Each run gets its own number, and starting the same program twice gives two numbers.',
      'A running thing is not always running: it may be waiting for a turn, or waiting for input.',
      'Those two waits look identical and have completely different remedies.',
      'Closing the terminal does not stop what you started from it.',
    ],
  },
  {
    // ── Teaching, for somebody who met this and has forgotten ───────────────────────────────
    title: 'Programs, Processes and Jobs — recap',
    description: 'The same ground in six minutes, for somebody who needs reminding rather than teaching.',
    type: 'notes',
    topicTags: ['operating systems', 'processes'],
    estimatedDuration: 6,

    skillKeys: ['OS_PROCESSES'],
    topicCode: 'T_PROCESSES',
    // The whole reason this row exists. A student who scored well but is rusty gets this;
    // a student who has never met it gets the FOUNDATION video above.
    learningDepth: 'REVISION',
    canonical: false,
    difficulty: 'intermediate',

    notesSource: 'richtext',
    bodyOutline: [
      'Identifier = this run, not this program. A number recorded yesterday may name something else.',
      'Two kinds of waiting: for the processor, and for something outside.',
      'Asking to stop lets it tidy up. Forcing does not.',
      'A child outlives its parent unless something was arranged to stop it.',
    ],
  },
  {
    // ── A worked example, pitched at one direction ──────────────────────────────────────────
    title: 'Finding and stopping a stuck deployment',
    description: 'A worked example: a server process nobody can stop, and how to find it.',
    type: 'notes',
    topicTags: ['operating systems', 'processes', 'worked example'],
    estimatedDuration: 10,

    skillKeys: ['OS_PROCESSES'],
    topicCode: 'T_PROCESSES',
    learningDepth: 'STANDARD',
    // A cloud student gets this one; a web student would get a different worked example
    // carrying the same skill. Absent would mean it serves everybody.
    careerContexts: ['CLOUD_DEVOPS'],
    canonical: false,

    notesSource: 'richtext',
    bodyOutline: [
      'The situation: a deploy script exited and left a server running, with no record of its number.',
      'Finding it in a listing, and why the listing is a snapshot rather than a live view.',
      'Asking it to stop first, and what it does with the request.',
      'Why forcing it mid-write would have left a half-written file.',
    ],
  },
  {
    // ── Practice, easy ──────────────────────────────────────────────────────────────────────
    title: 'Processes — recognising what is running',
    description: 'Short practice on identifiers, states and what a listing shows.',
    type: 'practice_theory',
    topicTags: ['operating systems', 'processes'],
    estimatedDuration: 10,

    skillKeys: ['OS_PROCESSES'],
    topicCode: 'T_PROCESSES',
    learningDepth: 'FOUNDATION',
    // Without this the planner cannot tell this apart from the hard set below, and would
    // serve either to anybody.
    difficultyLevel: 1,
    difficulty: 'beginner',
  },
  {
    // ── Practice, harder ────────────────────────────────────────────────────────────────────
    title: 'Processes — diagnosing a stop that hit the wrong target',
    description: 'Practice on stale identifiers, unresponsive processes and what a forced stop leaves behind.',
    type: 'practice_theory',
    topicTags: ['operating systems', 'processes'],
    estimatedDuration: 15,

    skillKeys: ['OS_PROCESSES'],
    topicCode: 'T_PROCESSES',
    learningDepth: 'STANDARD',
    difficultyLevel: 3,
    difficulty: 'intermediate',
  },
];

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   A ROW THAT DELIBERATELY CARRIES NO TOPIC CODE

   PROPOSITIONAL_LOGIC is taught by T_LOGIC_MATH, and the same reasoning is needed by
   T_CONDITIONS in the programming module. One well-made explanation should serve both, and
   omitting topicCode is what lets it.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

export const TEMPLATE_SHARED_ACROSS_TOPICS: ContentTemplate[] = [
  {
    title: 'When is an if-then statement actually false?',
    description:
      'The one case that makes an if-then false, and why a false first part makes it true.',
    type: 'video',
    topicTags: ['logic', 'conditions'],
    estimatedDuration: 14,

    skillKeys: ['PROPOSITIONAL_LOGIC'],
    // NO topicCode, on purpose. Any topic teaching PROPOSITIONAL_LOGIC can serve this, so the
    // maths module and the programming module both reach it.
    learningDepth: 'STANDARD',
    canonical: true,
    difficulty: 'intermediate',

    videoSource: 'youtube',
    videoUrl: '<replace with the real video URL>',
    videoDuration: 14 * 60,
    completionThreshold: 80,

    bodyOutline: [
      'The only false case: first part true, second part false.',
      'The vacuous case, worked slowly, because almost everybody gets it wrong first.',
      'Why "if it rains the match is cancelled" is not broken by a dry day.',
      'The same shape in a program: which branch runs, and which does not.',
    ],
  },
];

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   A ROW SCOPED TO ONE DIRECTION

   MATRICES is DIRECTION content for AI and Data students. applicableDirections keeps it out of
   a web student's plan entirely, rather than merely ranking it lower.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

export const TEMPLATE_DIRECTION_SCOPED: ContentTemplate[] = [
  {
    title: 'Matrices as grids of data',
    description: 'Rows, columns, and why the product of two matrices depends on their order.',
    type: 'video',
    topicTags: ['mathematics', 'matrices'],
    estimatedDuration: 18,

    skillKeys: ['MATRICES'],
    topicCode: 'T_MATRICES',
    learningDepth: 'GUIDED',
    // Keeps it out of plans for students heading elsewhere. Different from careerContexts,
    // which ranks rather than excludes.
    applicableDirections: ['AI_ML', 'DATA'],
    canonical: true,
    difficulty: 'intermediate',

    videoSource: 'youtube',
    videoUrl: '<replace with the real video URL>',
    videoDuration: 18 * 60,
    completionThreshold: 80,

    bodyOutline: [
      'Dimensions are rows then columns, always, and a 2 by 3 is not a 3 by 2.',
      'An entry is found by row first. Two conventions exist and they disagree.',
      'A product exists only when the inner counts match, and its shape is the outer ones.',
      'Order changes the answer, which is where arithmetic intuition stops helping.',
    ],
  },
];

/**
 * Everything above, for a seed or an import to walk.
 *
 * Deliberately small. Three topics of five, one and one is enough to show every field doing its
 * job; a file with forty rows would be a curriculum written by a developer, which is what the
 * content library exists to avoid.
 */
export const CONTENT_TEMPLATES: ContentTemplate[] = [
  ...TEMPLATE_TOPIC_PROCESSES,
  ...TEMPLATE_SHARED_ACROSS_TOPICS,
  ...TEMPLATE_DIRECTION_SCOPED,
];
