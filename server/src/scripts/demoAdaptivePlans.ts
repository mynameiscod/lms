/**
 * See the adaptive planner decide, without a database.
 *
 * WHY THIS RUNS OFFLINE. curriculumPersonalizationService is pure — no Mongo, no clock, no
 * randomness, no AI — so the interesting question ("do different students actually get
 * different plans?") can be answered in a second, with no seeded tenant, no question bank and
 * no deployed branch. Everything below is real production code; only the inputs are invented.
 *
 * Run:  npx ts-node src/scripts/demoAdaptivePlans.ts
 *       npx ts-node src/scripts/demoAdaptivePlans.ts --full     (every topic, not just changes)
 */

import {
  personalizeCurriculum, PlannableTopic, SkillBelief,
} from '../services/curriculumPersonalizationService';
import { FOUNDATION_MODULES, isMandatoryCategory } from '../seeds/careerPilot/foundationSkillMap';
import type { SkillConfidence } from '../models/StudentSkillProfile';

/** The Year-1 curriculum, straight from the seed map — the same one the real seed writes. */
const TOPICS: PlannableTopic[] = FOUNDATION_MODULES.flatMap((m, mi) =>
  m.topics.map((t, ti) => ({
    topicCode: t.topicCode,
    title: t.title,
    moduleCode: m.moduleCode,
    moduleName: m.moduleName,
    moduleOrder: mi,
    order: ti,
    skillKeys: t.skillKeys,
    prerequisiteSkillKeys: t.prerequisiteSkillKeys || [],
    applicableDirections: t.applicableDirections,
    mandatory: isMandatoryCategory(t.category),
    defaultDepth: t.defaultDepth,
    estimatedMinutes: 120,
  })),
);

/** Prerequisites, as the real skill graph expresses them. */
const GRAPH = new Map<string, string[]>([
  ['CONDITIONALS_BASICS', ['PROGRAMMING_FUNDAMENTALS']],
  ['LOOPS_BASICS',        ['PROGRAMMING_FUNDAMENTALS', 'CONDITIONALS_BASICS']],
  ['FUNCTIONS_BASICS',    ['PROGRAMMING_FUNDAMENTALS']],
  ['JS_DOM',              ['JS_BASICS']],
  ['JS_BASICS',           ['PROGRAMMING_FUNDAMENTALS']],
  ['DSA_ARRAYS',          ['LOOPS_BASICS']],
  ['PATTERN_RECOGNITION', ['PROGRAMMING_FUNDAMENTALS']],
]);

const NAMES = new Map<string, string>([
  ['PROGRAMMING_FUNDAMENTALS', 'Programming Fundamentals'],
  ['CONDITIONALS_BASICS', 'Conditions'], ['LOOPS_BASICS', 'Loops'],
  ['JS_BASICS', 'JavaScript Basics'], ['FUNCTIONS_BASICS', 'Functions'],
]);

const b = (score: number | null, confidence: SkillConfidence = 'MEDIUM'): SkillBelief =>
  ({ skillKey: '', score, confidence });

/* ------------------------------------------------------------------ *
 * Five students. Same curriculum, deliberately different situations.
 * ------------------------------------------------------------------ */

interface Persona {
  who: string;
  note: string;
  direction: string | null;
  status: 'SELECTED' | 'EXPLORING' | 'UNDECIDED';
  hoursPerDay: number;
  daysPerWeek: number;
  beliefs: [string, SkillBelief][];
}

const PERSONAS: Persona[] = [
  {
    who: 'Ananya — 1st year, wants web',
    note: 'Strong fundamentals, never written JavaScript.',
    direction: 'WEB_DEVELOPMENT', status: 'SELECTED',
    hoursPerDay: 2, daysPerWeek: 5,
    beliefs: [
      ['HOW_COMPUTERS_WORK', b(81)], ['COMPUTER_ARCHITECTURE', b(78)],
      ['PROBLEM_SOLVING', b(72)], ['PSEUDOCODE_FLOWCHARTS', b(58)],
      ['PROGRAMMING_FUNDAMENTALS', b(64)], ['PYTHON_BASICS', b(60)],
      ['CONDITIONALS_BASICS', b(66)], ['LOOPS_BASICS', b(45)], ['FUNCTIONS_BASICS', b(55)],
      ['GIT_FUNDAMENTALS', b(30)], ['GIT_BRANCHING', b(25)],
      ['APTITUDE_REASONING_LOGIC', b(76)],
    ],
  },
  {
    who: 'Rahul — 1st year, no idea yet',
    note: 'Has never programmed. Nothing measured for any coding skill.',
    direction: null, status: 'UNDECIDED',
    hoursPerDay: 1, daysPerWeek: 5,
    beliefs: [
      ['HOW_COMPUTERS_WORK', b(55)], ['APTITUDE_REASONING_LOGIC', b(62)],
      ['PROBLEM_SOLVING', b(48)],
      // Everything programming-shaped is deliberately ABSENT, not zero.
    ],
  },
  {
    who: 'Priya — 1st year, wants AI',
    note: 'Excellent maths, competent Python, weak problem solving.',
    direction: 'AI_ML', status: 'SELECTED',
    hoursPerDay: 2, daysPerWeek: 6,
    beliefs: [
      ['APTITUDE_REASONING_LOGIC', b(91, 'HIGH')], ['APTITUDE_DATA_INTERPRETATION', b(88, 'HIGH')],
      ['PYTHON_BASICS', b(84, 'HIGH')], ['PROGRAMMING_FUNDAMENTALS', b(80, 'HIGH')],
      ['CONDITIONALS_BASICS', b(82)], ['LOOPS_BASICS', b(79)], ['FUNCTIONS_BASICS', b(77)],
      ['PROBLEM_SOLVING', b(41)], ['PSEUDOCODE_FLOWCHARTS', b(44)],
      ['HOW_COMPUTERS_WORK', b(70)],
    ],
  },
  {
    who: 'Karthik — same gaps as Ananya, far less time',
    note: 'Identical skills to Ananya. 3 hours a week instead of 10.',
    direction: 'WEB_DEVELOPMENT', status: 'SELECTED',
    hoursPerDay: 1, daysPerWeek: 3,
    beliefs: [
      ['HOW_COMPUTERS_WORK', b(81)], ['COMPUTER_ARCHITECTURE', b(78)],
      ['PROBLEM_SOLVING', b(72)], ['PSEUDOCODE_FLOWCHARTS', b(58)],
      ['PROGRAMMING_FUNDAMENTALS', b(64)], ['PYTHON_BASICS', b(60)],
      ['CONDITIONALS_BASICS', b(66)], ['LOOPS_BASICS', b(45)], ['FUNCTIONS_BASICS', b(55)],
      ['GIT_FUNDAMENTALS', b(30)], ['GIT_BRANCHING', b(25)],
      ['APTITUDE_REASONING_LOGIC', b(76)],
    ],
  },
  {
    who: 'Meera — wants AI, cannot yet program',
    note: 'The ambition test. Target AI, programming never measured.',
    direction: 'AI_ML', status: 'SELECTED',
    hoursPerDay: 2, daysPerWeek: 5,
    beliefs: [
      ['APTITUDE_REASONING_LOGIC', b(85, 'HIGH')], ['APTITUDE_DATA_INTERPRETATION', b(80)],
      ['HOW_COMPUTERS_WORK', b(60)],
      // No programming evidence at all.
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Run and print
 * ------------------------------------------------------------------ */

const FULL = process.argv.includes('--full');

const PAD = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));

for (const p of PERSONAS) {
  const result = personalizeCurriculum({
    topics: TOPICS,
    beliefs: new Map(p.beliefs.map(([k, v]) => [k, { ...v, skillKey: k }])),
    graphPrerequisites: GRAPH,
    priorities: new Map(),
    skillNames: NAMES,
    selectedDirection: p.direction,
    directionStatus: p.status,
    explorationDirections: [],
    availability: { hoursPerDay: p.hoursPerDay, daysPerWeek: p.daysPerWeek },
  });

  console.log('\n' + '='.repeat(78));
  console.log(p.who);
  console.log(p.note);
  console.log(`${p.hoursPerDay}h × ${p.daysPerWeek} days = ${p.hoursPerDay * p.daysPerWeek}h/week`
    + `   ·   direction: ${p.direction || p.status.toLowerCase()}`);
  console.log('='.repeat(78));

  const counts = result.summary;
  console.log('plan   : ' + Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log(`effort : ${result.totalAssignedMinutes} required minutes → ~${result.estimatedWeeks} weeks`
    + `   (${result.pace.weeklyPlannableMinutes} min/week planned, `
    + `${result.pace.activeTopicsPerWeek} topics at a time)`);

  const shown = FULL ? result.decisions : result.decisions.filter(d =>
    d.state !== 'STANDARD' || d.locked);

  console.log('\n  ' + PAD('TOPIC', 34) + PAD('STATE', 20) + 'WHY');
  console.log('  ' + '-'.repeat(74));
  for (const d of shown.slice(0, FULL ? 99 : 12)) {
    console.log('  ' + PAD(d.title, 34) + PAD(d.state, 20) + d.reasonText.slice(0, 60));
  }
  if (!FULL && result.decisions.length > shown.length) {
    console.log(`  (${result.decisions.length - shown.length} more at STANDARD — run with --full)`);
  }
}

console.log('\n' + '='.repeat(78));
console.log('Same curriculum. Five students. Five different plans, all explainable.');
console.log('='.repeat(78) + '\n');
