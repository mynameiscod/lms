/**
 * Does the P8A expansion actually produce a better journey?
 *
 * PURE AND IN-MEMORY. It reads the 310-unit metadata snapshot, adds the proposed units to a copy
 * of it, composes both, and prints the difference. No database, no writes, no insertion — the
 * whole point is to find out whether the proposal is worth inserting before anybody does.
 *
 *   npx ts-node src/scripts/simulateCurriculumExpansion.ts
 *   npx ts-node src/scripts/simulateCurriculumExpansion.ts --verbose
 *
 * ── WHAT IT IS MEASURING ──────────────────────────────────────────────────────────────────
 *
 * Not length. Every realistic profile already reaches ninety days. The question is the SHAPE of
 * those ninety: a beginner currently receives 74 instruction units, and the audit showed that is
 * an inventory accident rather than a decision — the application and integration buckets run out
 * of units to fill themselves with.
 *
 * So the comparison is role share, per profile, before and after. The objective is NOT to
 * minimise CONCEPT — a beginner who has measured nothing should mostly be taught. The objective
 * is a journey that goes learn -> practise -> apply -> verify instead of stopping at the second.
 */

import {
  composeUnits, ComposableUnit, StudentProfile, SkillBelief, ComposerResult, CompositionPolicy,
} from '../services/curriculumComposerService';
import {
  CompositionRole, COMPOSITION_ROLES, compositionRoleOf, allocationFrom,
} from '../data/compositionShapePolicy';
import { PROPOSED_UNITS, PROPOSED_TOPICS, PROPOSED_ALLOCATIONS } from '../seeds/careerPilot/year1ExpansionSpec';

/* eslint-disable @typescript-eslint/no-var-requires */
const EXISTING = require('../tests/fixtures/year1UnitMetadata.json') as ComposableUnit[];

const DAYS = 90;
const verbose = process.argv.includes('--verbose');

/** The proposed units, in the shape the composer consumes. */
const PROPOSED: ComposableUnit[] = PROPOSED_UNITS.map(u => ({
  unitCode: u.unitCode,
  title: u.title,
  moduleCode: u.moduleCode,
  topicCode: u.topicCode,
  displayOrder: u.displayOrder,
  skillKeys: u.skillKeys,
  prerequisiteSkillKeys: u.prerequisiteSkillKeys,
  prerequisiteUnitCodes: u.prerequisiteUnitCodes,
  category: u.category,
  applicableDirections: u.applicableDirections,
  unitType: u.unitType,
  defaultDepth: u.defaultDepth,
  mandatory: u.mandatory,
  estimatedMinutes: u.estimatedMinutes,
  ...(u.suitableStates?.length ? { suitableStates: u.suitableStates as any } : {}),
}));

const EXPANDED: ComposableUnit[] = [...EXISTING, ...PROPOSED];

/* ---- profiles, matching the capacity audit ------------------------ */

const ALL_SKILLS = [...new Set(EXISTING.flatMap(u => u.skillKeys))].sort();
const UNIVERSAL_SKILLS = [...new Set(
  EXISTING.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys),
)].sort();

const belief = (score: number): SkillBelief => ({ score, confidence: 'HIGH' });
const scored = (keys: string[], score: number) => new Map(keys.map(k => [k, belief(score)]));

const profile = (over: Partial<StudentProfile>): StudentProfile => ({
  skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED', ...over,
});

const PROFILES: [string, StudentProfile][] = [
  ['beginner', profile({})],
  ['mixed', profile({
    skills: new Map(ALL_SKILLS.slice(0, Math.ceil(ALL_SKILLS.length / 3))
      .map((k, i) => [k, belief([18, 34, 52, 68, 44, 76, 28, 58][i % 8])])),
  })],
  ['strong-undecided', profile({ skills: scored(UNIVERSAL_SKILLS, 91) })],
  ['web', profile({
    skills: scored(ALL_SKILLS.filter(k => /HTML|CSS|JS|WEB|HTTP/.test(k)), 32),
    primaryDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
  })],
  ['software', profile({
    skills: scored(ALL_SKILLS.filter(k => /PROGRAMMING|PYTHON|LOOPS|FUNCTIONS|CONDITIONALS|DSA|C_/.test(k)), 66),
    primaryDirection: 'SOFTWARE_BACKEND', directionStatus: 'SELECTED',
  })],
  ['ai-data', profile({
    skills: new Map([
      ...ALL_SKILLS.filter(k => /MATRIC|PROBABILITY|STATISTIC|SET_THEORY|LOGIC|RELATIONS/.test(k))
        .map(k => [k, belief(88)] as [string, SkillBelief]),
      ...ALL_SKILLS.filter(k => /PROGRAMMING|PYTHON/.test(k))
        .map(k => [k, belief(24)] as [string, SkillBelief]),
    ]),
    primaryDirection: 'AI_ML', directionStatus: 'SELECTED',
  })],
  ['cloud-cyber', profile({
    skills: scored(ALL_SKILLS.filter(k => /OPERATING|OS_|SHELL|NETWORK|FILE_SYSTEM/.test(k)), 74),
    primaryDirection: 'CLOUD_DEVOPS', directionStatus: 'SELECTED',
  })],
  ['undecided', profile({
    skills: scored(ALL_SKILLS.slice(0, 4), 55),
    directionStatus: 'EXPLORING',
    explorationDirections: ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'],
  })],
  /**
   * The stress diagnostic. Reported, never optimised for.
   *
   * Every assessed skill VERIFIED is not a student; it is the boundary condition that tells us
   * how much post-mastery inventory exists. Building curriculum to force it to ninety would mean
   * ~58 units serving nobody real.
   */
  ['all-verified-stress', profile({
    skills: scored(ALL_SKILLS, 95),
    primaryDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED',
  })],
];

/* ---- helpers ------------------------------------------------------ */

const pad = (s: any, n: number) => String(s).padEnd(n);
const num = (s: any, n: number) => String(s).padStart(n);
const line = (n = 100) => console.log('-'.repeat(n));

const roleMix = (r: ComposerResult): Record<CompositionRole, number> => r.composition;

const typeMix = (r: ComposerResult, pool: ComposableUnit[]) => {
  const out: Record<string, number> = {};
  for (const u of r.units) {
    const full = pool.find(x => x.unitCode === u.unitCode)!;
    out[full.unitType] = (out[full.unitType] || 0) + 1;
  }
  return out;
};

/**
 * The proposed shape, resolved through the SAME derivation the shipped policy uses.
 *
 * Only the base table differs. Reimplementing the stance adjustment and normalisation here — as
 * an earlier draft did — meant the comparison was partly measuring my arithmetic against the
 * policy rather than the two curricula against each other.
 */
const proposedPolicy: CompositionPolicy = (shape, stance, programDays) => {
  const table = PROPOSED_ALLOCATIONS[shape].map(r => ({
    role: r.role as CompositionRole, min: r.min, target: r.target,
  }));
  return allocationFrom(table, stance as any, programDays);
};

/* ---- run ---------------------------------------------------------- */

console.log('\nYEAR-1 CURRICULUM EXPANSION — THEORETICAL CAPACITY SIMULATION');
console.log('Nothing is written. No units inserted, no content generated, no DayPlans.');
line();

console.log('  INVENTORY');
console.log(`    existing units                    ${EXISTING.length}`);
console.log(`    proposed new units                ${PROPOSED.length}`);
console.log(`    proposed new topics               ${PROPOSED_TOPICS.length}`);
console.log(`    expanded total                    ${EXPANDED.length}`);

const byModule = new Map<string, number>();
for (const u of PROPOSED_UNITS) byModule.set(u.moduleCode, (byModule.get(u.moduleCode) || 0) + 1);
console.log('\n  PROPOSED UNITS BY MODULE');
for (const [m, n] of [...byModule].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  console.log(`    ${pad(m, 32)}${num(n, 3)}`);
}

line();
console.log('  UNIT TYPE — INVENTORY BEFORE / AFTER');
const TYPES = ['CONCEPT', 'PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW'];
for (const t of TYPES) {
  const before = EXISTING.filter(u => u.unitType === t).length;
  const after = EXPANDED.filter(u => u.unitType === t).length;
  console.log(`    ${pad(t, 14)}${num(before, 5)} -> ${num(after, 4)}${before !== after ? `   +${after - before}` : ''}`);
}

console.log('\n  COMPOSITION ROLE — INVENTORY BEFORE / AFTER');
for (const r of COMPOSITION_ROLES) {
  const before = EXISTING.filter(u => compositionRoleOf(u as any) === r).length;
  const after = EXPANDED.filter(u => compositionRoleOf(u as any) === r).length;
  console.log(`    ${pad(r, 26)}${num(before, 5)} -> ${num(after, 4)}${before !== after ? `   +${after - before}` : ''}`);
}

/* ---- per profile -------------------------------------------------- */

line();
console.log('  PROFILE MIXES — BEFORE (310 units, current allocation)');
console.log('                vs AFTER  (337 units, proposed allocation)');
line();

const rows: { name: string; before: ComposerResult; after: ComposerResult }[] = [];

for (const [name, student] of PROFILES) {
  const before = composeUnits({ candidates: EXISTING, targetUnits: DAYS, student });
  const after = composeUnits({
    candidates: EXPANDED,
    targetUnits: DAYS,
    student,
    compositionPolicy: proposedPolicy,
  });
  rows.push({ name, before, after });

  const bt = typeMix(before, EXISTING);
  const at = typeMix(after, EXPANDED);
  const br = roleMix(before);
  const ar = roleMix(after);

  console.log(`\n  ${name}   ${before.shape}`);
  console.log(`    length      ${before.units.length} -> ${after.units.length}`
    + `   ${before.ok ? 'PASS' : 'FAIL'} -> ${after.ok ? 'PASS' : 'FAIL'}`);
  console.log('    type        ' + TYPES.map(t => `${t.slice(0, 5).toLowerCase()} ${bt[t] || 0}->${at[t] || 0}`).join('  '));
  console.log('    roles       '
    + ['FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL', 'DIRECTION_LEARNING']
      .map(r => `${r.slice(0, 5).toLowerCase()} ${br[r as CompositionRole] || 0}->${ar[r as CompositionRole] || 0}`).join('  '));
  console.log('                '
    + ['PRACTICE', 'APPLICATION', 'INTEGRATION', 'VERIFICATION', 'EXPLORATION']
      .map(r => `${r.slice(0, 5).toLowerCase()} ${br[r as CompositionRole] || 0}->${ar[r as CompositionRole] || 0}`).join('  '));

  const instrBefore = (['FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL',
    'DIRECTION_LEARNING', 'EXPLORATION'] as CompositionRole[])
    .reduce((n, r) => n + (br[r] || 0), 0);
  const instrAfter = (['FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL',
    'DIRECTION_LEARNING', 'EXPLORATION'] as CompositionRole[])
    .reduce((n, r) => n + (ar[r] || 0), 0);
  const doingBefore = before.units.length - instrBefore;
  const doingAfter = after.units.length - instrAfter;

  console.log(`    instruction ${instrBefore} -> ${instrAfter}`
    + `      doing (practise/apply/build/verify) ${doingBefore} -> ${doingAfter}`);

  if (after.shapeViolations.length) {
    console.log('    still below floor: '
      + after.shapeViolations.map(v => `${v.role} ${v.actual}/${v.min}`).join('  '));
  }
  if (verbose && after.reallocations.length) {
    console.log('    capacity moved: '
      + after.reallocations.map(m => `${m.from}->${m.to} x${m.units}`).join(', '));
  }
}

/* ---- summary ------------------------------------------------------ */

line();
console.log('  SUMMARY — share of the ninety days spent DOING rather than being taught');
console.log(`    ${pad('profile', 22)}${pad('before', 10)}${pad('after', 10)}change`);
for (const { name, before, after } of rows) {
  const doing = (r: ComposerResult) => {
    const instr = (['FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL',
      'DIRECTION_LEARNING', 'EXPLORATION'] as CompositionRole[])
      .reduce((n, x) => n + (r.composition[x] || 0), 0);
    return r.units.length - instr;
  };
  const b = doing(before);
  const a = doing(after);
  const pct = (n: number, total: number) => total ? `${Math.round(100 * n / total)}%` : '—';
  console.log(`    ${pad(name, 22)}${pad(`${b} (${pct(b, before.units.length)})`, 10)}`
    + `${pad(`${a} (${pct(a, after.units.length)})`, 10)}${a - b >= 0 ? '+' : ''}${a - b}`);
}

line();
console.log('  Nothing was written. No units inserted, no topics created, no content generated.\n');
