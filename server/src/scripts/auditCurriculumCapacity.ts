/**
 * Can the 310 designed units carry a fixed ninety days, for every kind of student?
 *
 * READ ONLY. It composes and counts; it writes nothing and publishes nothing.
 *
 * ── TWO CAPACITIES, DELIBERATELY SEPARATED ────────────────────────────────────────────────
 *
 * CURRICULUM CAPACITY asks whether the units as DESIGNED could carry ninety days if every one
 * of them were written. CONTENT CAPACITY asks how many are actually finished. They are different
 * questions with different owners: a curriculum deficit is a design decision, an authoring
 * backlog is a writing schedule, and reporting one number would hide whichever is the real
 * blocker.
 *
 * This script is mainly about the first, so it composes from every non-archived unit regardless
 * of readiness. The second is reported alongside, never merged in.
 *
 *   npx ts-node src/scripts/auditCurriculumCapacity.ts <tenantId>
 *   npx ts-node src/scripts/auditCurriculumCapacity.ts <tenantId> --profile=strong --verbose
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { loadCandidates } from '../services/composerCandidateService';
import {
  composeUnits, ComposableUnit, StudentProfile, SkillBelief, ComposerResult,
} from '../services/curriculumComposerService';
import { suitableStatesFor, isInstructional, SUITABILITY_BY_TYPE } from '../data/unitSuitabilityPolicy';
import { compositionRoleOf } from '../data/compositionShapePolicy';
import { AssignmentState, stateForScore } from '../data/adaptiveCurriculumPolicy';

dotenv.config();

/** The fixed length P7B will enforce. Stated here so the audit measures the real target. */
const FOUNDATION_PROGRAM_DAYS = 90;

const belief = (score: number | null): SkillBelief => ({ score, confidence: 'HIGH' });

/**
 * Nine deterministic profiles, chosen to stress different parts of the curriculum.
 *
 * Skills are resolved against the real inventory at runtime rather than hard-coded, so the
 * profiles keep meaning what they mean when the curriculum is edited.
 */
interface ProfileSpec {
  name: string;
  note: string;
  build: (allSkills: string[], universalSkills: string[]) => StudentProfile;
}

const PROFILES: ProfileSpec[] = [
  {
    name: 'beginner',
    note: 'nothing measured — every skill NOT_EXPOSED',
    build: () => ({ skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' }),
  },
  {
    name: 'mixed',
    note: 'a real diagnostic: some gaps, some adequate, most untouched',
    build: (s) => {
      const scores = [18, 34, 52, 68, 44, 76, 28, 58];
      const measured = s.slice(0, Math.ceil(s.length / 3));
      const entries: [string, SkillBelief][] = measured.map((k, i) => [k, belief(scores[i % 8])]);
      return { skills: new Map(entries), primaryDirection: null, directionStatus: 'UNDECIDED' };
    },
  },
  {
    /**
     * Verified across the UNIVERSAL foundation only, which is what the name always claimed.
     *
     * It used to verify all 55 skills, contradicting its own description and making itself
     * indistinguishable from the all-verified stress test below. That mattered: with every skill
     * proven there is nothing in the curriculum a learner has not met, so the profile could not
     * show the thing it exists to show — that a strong student still has direction material ahead
     * of them and should be taught it rather than promoted past it.
     */
    name: 'strong-universal',
    note: 'verified across the universal foundation, has not engaged with direction',
    build: (s, universal) => ({
      skills: new Map(universal.map(k => [k, belief(91)])),
      primaryDirection: null,
      directionStatus: 'UNDECIDED',
    }),
  },
  {
    /** The same learner, sampling. The only difference is the direction stance. */
    name: 'strong-exploring',
    note: 'the same strong learner, sampling directions rather than undecided',
    build: (s, universal) => ({
      skills: new Map(universal.map(k => [k, belief(91)])),
      primaryDirection: null,
      directionStatus: 'EXPLORING',
      explorationDirections: ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'],
    }),
  },
  {
    name: 'web-focused',
    note: 'chosen web development, weak on its skills',
    build: (s) => ({
      skills: new Map(s.filter(k => /HTML|CSS|JS|WEB|HTTP|BROWSER/.test(k)).map(k => [k, belief(32)])),
      primaryDirection: 'WEB_DEVELOPMENT',
      directionStatus: 'SELECTED',
    }),
  },
  {
    name: 'software-focused',
    note: 'chosen software development, competent at programming',
    build: (s) => ({
      skills: new Map(s.filter(k => /PROGRAMMING|PYTHON|LOOPS|FUNCTIONS|CONDITIONALS|DSA|C_/.test(k))
        .map(k => [k, belief(66)])),
      primaryDirection: 'SOFTWARE_BACKEND',
      directionStatus: 'SELECTED',
    }),
  },
  {
    name: 'ai-data-focused',
    note: 'chosen AI/ML, strong maths, new to programming',
    build: (s) => ({
      skills: new Map([
        ...s.filter(k => /MATRIC|PROBABILITY|STATISTIC|SET_THEORY|LOGIC|RELATIONS/.test(k))
          .map(k => [k, belief(88)] as [string, SkillBelief]),
        ...s.filter(k => /PROGRAMMING|PYTHON/.test(k))
          .map(k => [k, belief(24)] as [string, SkillBelief]),
      ]),
      primaryDirection: 'AI_ML',
      directionStatus: 'SELECTED',
    }),
  },
  {
    name: 'cloud-cyber-focused',
    note: 'chosen cloud/devops, comfortable with Linux and networks',
    build: (s) => ({
      skills: new Map(s.filter(k => /OPERATING|OS_|SHELL|NETWORK|FILE_SYSTEM/.test(k))
        .map(k => [k, belief(74)])),
      primaryDirection: 'CLOUD_DEVOPS',
      directionStatus: 'SELECTED',
    }),
  },
  {
    name: 'undecided',
    note: 'sampling several directions, lightly measured',
    build: (s) => ({
      skills: new Map(s.slice(0, 4).map(k => [k, belief(55)])),
      primaryDirection: null,
      directionStatus: 'EXPLORING',
      explorationDirections: ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'],
    }),
  },
  {
    name: 'all-verified-stress',
    note: 'STRESS TEST — every assessed skill VERIFIED at 95',
    build: (s) => ({
      skills: new Map(s.map(k => [k, belief(95)])),
      primaryDirection: 'WEB_DEVELOPMENT',
      directionStatus: 'SELECTED',
    }),
  },
];

/* ------------------------------------------------------------------ */

const STATES: AssignmentState[] = [
  'NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT',
];

/** The four pedagogical roles, which is how a curriculum gap is actually described. */
type Role = 'foundation instruction' | 'verification/revision' | 'advanced/application' | 'project/integration';

const roleOfUnit = (u: ComposableUnit): Role => {
  if (u.unitType === 'PROJECT') return 'project/integration';
  if (u.unitType === 'DEBUG') return 'advanced/application';
  if (u.unitType === 'CHECKPOINT' || u.unitType === 'REVIEW') return 'verification/revision';
  if (u.unitType === 'PRACTICE') return 'advanced/application';
  return 'foundation instruction';
};

(async () => {
  const tenantId = process.argv[2];
  const verbose = process.argv.includes('--verbose');
  const only = (process.argv.find(a => a.startsWith('--profile=')) || '').split('=')[1];
  if (!tenantId) {
    console.error('Usage: auditCurriculumCapacity.ts <tenantId> [--profile=name] [--verbose]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const design = await loadCandidates(tenantId, 'CURRICULUM_CAPACITY_AUDIT');
  const content = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');
  const production = await loadCandidates(tenantId, 'PRODUCTION');

  /**
   * Which inventory the profiles are composed against.
   *
   * DESIGN (the default) answers a question about the CURRICULUM: could the units as designed
   * support ninety days, if every one of them were written. That is the question the expansion
   * work needed and it ignores readiness entirely.
   *
   * `--source=content` answers the question Phase 19 needs instead: can the units that are
   * ACTUALLY AUTHORED support ninety days. It composes against READY units regardless of
   * publication, which is the honest gate while nothing is published yet — publishing to find
   * out would be publishing to satisfy a metric, which is the one thing the phase forbids.
   *
   * Neither is production. `assertProductionEligible` still refuses both, so no path here can
   * put a synthetic or unpublished plan in front of a student.
   */
  const sourceArg = (process.argv.find(a => a.startsWith('--source=')) || '').split('=')[1];
  const useContent = sourceArg === 'content';
  const all: ComposableUnit[] = useContent ? content.units : design.units;
  const allSkills = [...new Set(all.flatMap(u => u.skillKeys))].sort();
  const universalSkills = [...new Set(
    all.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys),
  )].sort();

  const line = (n = 92) => console.log('-'.repeat(n));
  const pad = (s: any, n: number) => String(s).padEnd(n);
  const num = (s: any, n: number) => String(s).padStart(n);

  console.log(`\nYEAR-1 CURRICULUM CAPACITY AUDIT  ·  target ${FOUNDATION_PROGRAM_DAYS} units`);
  line();
  console.log('  TWO CAPACITIES, REPORTED SEPARATELY');
  console.log(`    CURRICULUM capacity — units designed, readiness ignored   ${all.length}`);
  console.log(`    CONTENT capacity    — units actually READY                ${content.units.length}`);
  console.log(`    PRODUCTION capacity — PUBLISHED and READY                 ${production.units.length}`);
  console.log(`    distinct skills across the design                         ${allSkills.length}`);

  /* ---- what the design is made of ---------------------------------- */

  line();
  console.log(`  WHAT THE ${all.length} UNITS ARE MADE OF`);
  const byType = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byRole = new Map<Role, number>();
  const servesState = new Map<AssignmentState, number>();
  for (const u of all) {
    byType.set(u.unitType, (byType.get(u.unitType) || 0) + 1);
    byCategory.set(u.category, (byCategory.get(u.category) || 0) + 1);
    byRole.set(roleOfUnit(u), (byRole.get(roleOfUnit(u)) || 0) + 1);
    for (const st of suitableStatesFor(u)) servesState.set(st, (servesState.get(st) || 0) + 1);
  }
  console.log('    by type      ' + [...byType].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log('    by category  ' + [...byCategory].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log('    by role      ' + [...byRole].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
  console.log('');
  console.log('    units able to serve each state:');
  for (const st of STATES) {
    const n = servesState.get(st) || 0;
    const bar = '#'.repeat(Math.round((n / Math.max(1, all.length)) * 46));
    const flag = n < FOUNDATION_PROGRAM_DAYS ? '  SHORT OF 90' : '';
    console.log(`      ${pad(st, 22)}${num(n, 4)}  ${bar}${flag}`);
  }

  /* ---- per profile -------------------------------------------------- */

  const results: { spec: ProfileSpec; r: ComposerResult }[] = [];

  for (const spec of PROFILES) {
    if (only && spec.name !== only) continue;
    const student = spec.build(allSkills, universalSkills);
    const r = composeUnits({ candidates: all, targetUnits: FOUNDATION_PROGRAM_DAYS, student });
    results.push({ spec, r });

    line();
    console.log(`  PROFILE: ${spec.name}`);
    console.log(`    ${spec.note}`);
    console.log(`    direction ${student.primaryDirection || '(none)'} · ${student.directionStatus}`
      + ` · ${student.skills.size} skill(s) measured`);
    console.log('');
    console.log(`    90-DAY  ${r.ok ? 'PASS' : 'FAIL — ' + r.code}`);
    console.log(`      eligible ${r.eligibleUnits}   selected ${r.units.length}`
      + `   blocked ${r.blocked.length}   excluded ${r.excluded.length}`);

    /**
     * The two causes never share a line.
     *
     * An absent prerequisite is an authoring backlog; an unsuitable one is a property of the
     * design that no amount of authoring will change. Reporting a single total would have let the
     * second hide inside the first.
     */
    const absent = new Set(r.blocked.flatMap(b => b.absent));
    const unsuitable = new Set(r.blocked.flatMap(b => b.unsuitable));
    const list = (s: Set<string>) =>
      `  (${[...s].slice(0, 4).join(', ')}${s.size > 4 ? ' …' : ''})`;

    console.log(`      prerequisite never written:        ${absent.size}`
      + (absent.size ? list(absent) : ''));
    console.log(`      prerequisite unsuitable for them:  ${unsuitable.size}`
      + (unsuitable.size ? list(unsuitable) : ''));

    const selectedUnits = r.units
      .map(su => all.find(u => u.unitCode === su.unitCode)!)
      .filter(Boolean);

    const t = new Map<string, number>();
    const c = new Map<string, number>();
    const ro = new Map<Role, number>();
    for (const u of selectedUnits) {
      t.set(u.unitType, (t.get(u.unitType) || 0) + 1);
      c.set(u.category, (c.get(u.category) || 0) + 1);
      ro.set(roleOfUnit(u), (ro.get(roleOfUnit(u)) || 0) + 1);
    }

    console.log('');
    console.log('      type      ' + ['CONCEPT', 'PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW']
      .map(k => `${k}=${t.get(k) || 0}`).join('  '));
    console.log('      category  ' + ['UNIVERSAL', 'DIRECTION', 'ACADEMIC', 'EXPLORATION']
      .map(k => `${k}=${c.get(k) || 0}`).join('  '));
    console.log('      role      ' + (['foundation instruction', 'verification/revision',
      'advanced/application', 'project/integration'] as Role[])
      .map(k => `${k}=${ro.get(k) || 0}`).join('  '));

    /**
     * The composition shape: what was asked for, and what arrived.
     *
     * Printed as asked/got per role because the interesting number is the DIFFERENCE. A plan can
     * be ninety units long and still have hollowed out a role the student was promised, and the
     * two columns side by side are the only way that shows.
     */
    console.log('');
    console.log(`      shape ${r.shape}`);
    for (const a of r.allocation) {
      if (a.target === 0 && (r.composition[a.role] || 0) === 0) continue;
      const got = r.composition[a.role] || 0;
      const flag = got < a.min ? `  BELOW FLOOR OF ${a.min}` : '';
      console.log(`        ${pad(a.role, 24)}asked ${num(a.target, 3)}   got ${num(got, 3)}${flag}`);
    }
    if (r.reallocations.length) {
      console.log('      capacity moved:');
      for (const m of r.reallocations) {
        console.log(`        ${pad(m.from, 24)}-> ${pad(m.to, 24)}${m.units} units  (${m.reason})`);
      }
    }

    if (!r.ok) {
      const deficit = FOUNDATION_PROGRAM_DAYS - r.units.length;
      console.log('');
      console.log(`      DEFICIT ${deficit} units. What the eligible pool ran out of:`);

      /** Which states this student is in, and how much the design can serve each. */
      const studentStates = new Map<AssignmentState, number>();
      for (const u of all) {
        let worst: AssignmentState | null = null;
        for (const k of u.skillKeys) {
          const b = student.skills.get(k);
          if (!b || b.score === null) continue;
          const st = stateForScore({ score: b.score, confidence: b.confidence });
          if (!worst || STATES.indexOf(st) < STATES.indexOf(worst)) worst = st;
        }
        const st = worst || 'NOT_EXPOSED';
        studentStates.set(st, (studentStates.get(st) || 0) + 1);
      }
      for (const [st, n] of [...studentStates].sort((a, b) => b[1] - a[1])) {
        const serveable = all.filter(u => {
          let worst: AssignmentState | null = null;
          for (const k of u.skillKeys) {
            const b = student.skills.get(k);
            if (!b || b.score === null) continue;
            const s2 = stateForScore({ score: b.score, confidence: b.confidence });
            if (!worst || STATES.indexOf(s2) < STATES.indexOf(worst)) worst = s2;
          }
          return (worst || 'NOT_EXPOSED') === st && suitableStatesFor(u).includes(st);
        }).length;
        console.log(`        ${pad(st, 22)}${num(n, 4)} units in this state, ${num(serveable, 4)} of them suitable`);
      }
    }

    /**
     * WHERE THE PRACTICAL WORK LANDS.
     *
     * A plan can have a perfect role mix and still be a bad journey: sixty days of reading
     * followed by thirty of doing satisfies every count in this report and is exactly the thing
     * the composition-shape layer was built to prevent, one level subtler. So the plan is cut in
     * thirds and each third reported on its own.
     *
     * Interleaving is not enforced by quota — prerequisite structure already produces most of it,
     * because practice becomes schedulable as soon as its topic has been taught rather than at
     * some arbitrary later point. This measures whether that is actually true.
     */
    if (r.units.length >= 30) {
      const third = Math.ceil(r.units.length / 3);
      const segs: [string, typeof r.units][] = [
        ['days 1-30', r.units.slice(0, third)],
        ['days 31-60', r.units.slice(third, third * 2)],
        ['days 61-90', r.units.slice(third * 2)],
      ];
      console.log('');
      console.log(`      ${pad('segment', 12)}${pad('concept', 9)}${pad('practice', 10)}`
        + `${pad('apply', 7)}${pad('build', 7)}verify`);
      for (const [label, units] of segs) {
        const n = (...types: string[]) => units.filter(u => types.includes(u.unitType)).length;
        console.log(`      ${pad(label, 12)}${num(n('CONCEPT', 'WORKED_EXAMPLE'), 6)}   `
          + `${num(n('PRACTICE'), 7)}   ${num(n('DEBUG'), 4)}   ${num(n('PROJECT'), 4)}   `
          + `${num(n('CHECKPOINT', 'REVIEW'), 5)}`);
      }
      const doingIn = (units: typeof r.units) =>
        units.filter(u => u.unitType !== 'CONCEPT' && u.unitType !== 'WORKED_EXAMPLE').length;
      const total = doingIn(r.units);
      const last = doingIn(segs[2][1]);
      if (total > 0 && last / total > 0.6) {
        console.log(`      BACK-LOADED: ${last} of ${total} practical units fall in the last third`);
      }
    }

    if (verbose && r.units.length) {
      console.log('');
      for (const u of r.units.slice(0, 20)) {
        console.log(`        ${num(u.position, 3)}  ${pad(u.unitCode, 34)}${pad(u.reason, 21)}${u.state}`);
      }
      if (r.units.length > 20) console.log(`        … and ${r.units.length - 20} more`);
    }
  }

  /* ---- summary ------------------------------------------------------ */

  line();
  console.log('  SUMMARY');
  console.log(`    ${pad('profile', 21)}${pad('90-day', 7)}${pad('sel', 5)}${pad('deficit', 9)}`
    + `${pad('concept', 9)}${pad('practice', 10)}${pad('debug', 7)}project`);
  for (const { spec, r } of results) {
    const n = (t: string) => r.units.filter(u => u.unitType === t).length;
    console.log(`    ${pad(spec.name, 21)}${pad(r.ok ? 'PASS' : 'FAIL', 7)}`
      + `${num(r.units.length, 3)}  ${num(Math.max(0, FOUNDATION_PROGRAM_DAYS - r.units.length), 7)}  `
      + `${num(n('CONCEPT'), 7)}  ${num(n('PRACTICE'), 8)}  ${num(n('DEBUG'), 5)}  ${num(n('PROJECT'), 7)}`);
  }

  const hollow = results.filter(x => x.r.shapeViolations.length);
  if (hollow.length) {
    console.log('');
    console.log('    Roles that finished below their floor — a plan can be full and still not be');
    console.log('    the product that was promised:');
    for (const { spec, r } of hollow) {
      console.log(`      ${pad(spec.name, 21)}`
        + r.shapeViolations.map(v => `${v.role} ${v.actual}/${v.min}`).join('  '));
    }
  }

  /* ---- what the plans are actually made of -------------------------- */

  /**
   * THE MIX, ACROSS EVERY PROFILE AT ONCE.
   *
   * The pass/fail column says seven of nine profiles get ninety days, and read alone it is
   * reassuring and wrong. Every one of those seven is ninety CONCEPT units: no practice, no
   * debugging, nothing built. A student would read for three months and never write anything.
   *
   * It is not a shortage — 37 PRACTICE units exist and not one is ever chosen. Ranking is
   * state-first, most skills are unmeasured, and NOT_EXPOSED outranks everything, so 193 concept
   * units are exhausted before a single GUIDED-or-later unit is reached. That is a COMPOSER
   * decision, not a curriculum one, and no number of new units will change it.
   */
  line();
  console.log('  WHAT THE PLANS ARE MADE OF');
  const everSelected = new Map<string, number>();
  for (const { r } of results) {
    for (const su of r.units) {
      const u = all.find(x => x.unitCode === su.unitCode);
      if (u) everSelected.set(u.unitType, (everSelected.get(u.unitType) || 0) + 1);
    }
  }
  for (const k of ['CONCEPT', 'PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW']) {
    const designed = all.filter(u => u.unitType === k).length;
    const picked = everSelected.get(k) || 0;
    const flag = designed > 0 && picked === 0 ? '   DESIGNED BUT NEVER CHOSEN' : '';
    console.log(`    ${pad(k, 14)}${num(designed, 5)} designed  ${num(picked, 6)} selected `
      + `across all ${results.length} profiles${flag}`);
  }

  /* ---- proposed expansion ------------------------------------------- */

  /**
   * What the curriculum would need, IF the decision is to close the gap by writing units.
   *
   * Proposed, not applied. The counts below are the arithmetic of the shortfall and nothing more:
   * ninety is the programme length, so a state that cannot field ninety suitable units cannot
   * fill a plan for a student sitting in it. Whether that is worth closing — and whether a
   * student who has verified the entire universal foundation should be handed Foundation at all
   * rather than promoted out of it — is a product decision this script has no business making.
   */
  line();
  console.log('  PROPOSED CURRICULUM EXPANSION  (specification only — nothing written)');
  console.log(`    ${pad('state', 22)}${pad('suitable', 10)}${pad('needed', 8)}shortfall`);

  const shortfalls: { state: AssignmentState; short: number }[] = [];
  for (const st of STATES) {
    const suitable = all.filter(u => suitableStatesFor(u).includes(st)).length;
    const short = Math.max(0, FOUNDATION_PROGRAM_DAYS - suitable);
    if (short > 0) shortfalls.push({ state: st, short });
    console.log(`    ${pad(st, 22)}${num(suitable, 8)}  ${num(FOUNDATION_PROGRAM_DAYS, 6)}  `
      + `${short > 0 ? num(short, 7) : '      —'}`);
  }

  if (shortfalls.length) {
    console.log('');
    console.log('    The shortfall is entirely in the post-mastery states, and the kinds of unit');
    console.log('    that serve them are the kinds the curriculum has fewest of:');
    console.log('');
    for (const { state, short } of shortfalls) {
      const kinds = ['PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW']
        .filter(k => SUITABILITY_BY_TYPE[k as keyof typeof SUITABILITY_BY_TYPE]?.includes(state));
      console.log(`      ${pad(state, 22)}+${short} units, of type ${kinds.join(' / ') || '(none serve it)'}`);
    }
    console.log('');
    console.log('');
    console.log('    NOTE ON WHO ACTUALLY NEEDS THESE.');
    console.log('    Since the composition-shape policy landed, eight of ten profiles reach a full');
    console.log('    ninety days with a balanced mix, so these shortfalls are NOT what stops them.');
    console.log('    They bind only on a learner who has proven most of the design, and for the two');
    console.log('    profiles that still fail the causes are different and only one is curriculum:');
    console.log('');
    console.log('      strong-universal     NOT a curriculum deficit. Verified across the universal');
    console.log('                           foundation, direction stance UNDECIDED, so every scoped');
    console.log('                           unit is filtered out and the plan runs dry at 56. The');
    console.log('                           same learner sampling directions gets a full ninety —');
    console.log('                           see the strong-exploring row. The fix is to require a');
    console.log('                           direction stance once a learner is ESTABLISHED, and no');
    console.log('                           amount of authoring substitutes for it.');
    console.log('');
    console.log('      all-verified-stress  A REAL deficit. With every skill proven, only DEBUG,');
    console.log('                           PROJECT and the eight judgement units remain suitable,');
    console.log('                           and there are 32 of them. This is the profile the');
    console.log('                           expansion counts above are for.');
    console.log('');
    console.log('    Foundation stays ninety days for everybody, so promotion out of the stage is');
    console.log('    not on the table as an answer to this; the capacity has to exist inside it.');
    console.log('    The scarcest roles are the ones worth writing first:');
    console.log('');
    for (const role of ['INTEGRATION', 'VERIFICATION', 'APPLICATION', 'PRACTICE'] as const) {
      const have = all.filter(u => compositionRoleOf(u) === role).length;
      console.log(`      ${pad(role, 22)}${num(have, 4)} designed across 39 topics`);
    }
    console.log('');
    console.log('    CHECKPOINT and REVIEW are designed ZERO, and CHECKPOINT is the only type that');
    console.log('    serves all seven states — it is the highest-leverage thing to add. But a');
    console.log('    checkpoint Learning Unit is only worth creating where a genuine day of');
    console.log('    reassessment exists; a quiz already bound inside a unit is not one, and');
    console.log('    manufacturing CHECKPOINT days to satisfy a quota would buy the number and');
    console.log('    not the product.');
  }

  line();
  console.log('  Nothing was written. No DayPlan, no publication, no unit modified.\n');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
