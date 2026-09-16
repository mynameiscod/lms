/**
 * Phase 21 — the proposed production publish set, held in place without a database.
 *
 * auditProductionComposerReadiness.ts reads the real database, recomputes readiness and derives
 * two sets from the READY units. It writes the READY inventory's metadata and both sets to
 * fixtures/phase21. These tests hold the claims those sets were proposed on, so a composer or
 * policy change that would quietly make the recommended set unsafe fails here before anybody
 * publishes it.
 *
 * NOTHING HERE PUBLISHES ANYTHING. A set is composed as an isolated candidate pool, which is
 * exactly the pool PRODUCTION would return if those codes were PUBLISHED.
 *
 * Every certification rule is held strictly. The Phase 21 remediation closed the findings this
 * file once listed as open — the opening-block starvation and the ungated milestones — so there is
 * no longer anything filtered out of the assertions below.
 *
 * Regenerate the fixtures by re-running the audit with --write-artifacts after any curriculum
 * change; a drifted fixture certifies an inventory that no longer exists.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import { ComposableUnit, StudentProfile } from '../services/curriculumComposerService';
import {
  REALISTIC_PROFILES, EVOLUTIONS, PROGRAM_DAYS, compose, validatePlan, isDeterministic,
  skillUniverse, simulateRecomposition, directionFamilyMix, withoutCoreAffinity, coreModuleUse,
  stateBoundaryProfiles, isRelevant, unusableFor, diagnosticSkills,
} from '../services/composerCertificationService';

const READY = READY_JSON as unknown as ComposableUnit[];
const byCode = new Map(READY.map(u => [u.unitCode, u]));
const poolOf = (codes: string[]) => READY.filter(u => codes.includes(u.unitCode));

const { allSkills, universalSkills } = skillUniverse(READY);
/** Built against READY, never against the subset, so every pool is judged on the same learners. */
const STUDENTS: [string, StudentProfile][] = REALISTIC_PROFILES.map(p => [p.key, p.build(allSkills, universalSkills)]);
/**
 * Boundary learners are measured on the Foundation stage skill set — what a diagnostic measures —
 * never on whatever skills the inventory happens to contain, so authoring cannot move the learner.
 */
const DIAGNOSTIC = diagnosticSkills();
const BOUNDARIES: [string, StudentProfile][] = stateBoundaryProfiles(DIAGNOSTIC, DIAGNOSTIC).map(b => [b.key, b.student]);

const RECOMMENDED = poolOf(SETS.recommended);
const MINIMUM = poolOf(SETS.absoluteMinimum);

const unclosed = (codes: string[]) => {
  const set = new Set(codes);
  return codes.flatMap(c => byCode.get(c)!.prerequisiteUnitCodes
    .filter(p => byCode.has(p) && !set.has(p)).map(p => `${c} -> ${p}`));
};

describe('the proposed sets are drawn honestly from READY', () => {
  it('certifies against the READY inventory the audit recomputed', () => {
    expect(READY.length).toBe(SETS.readyCount);
    expect(new Set(READY.map(u => u.unitCode)).size).toBe(READY.length);
  });

  it('proposes only READY units, and nothing twice', () => {
    for (const set of [SETS.recommended, SETS.absoluteMinimum]) {
      expect(set.filter(c => !byCode.has(c))).toEqual([]);
      expect(new Set(set).size).toBe(set.length);
    }
  });

  /**
   * A published unit whose prerequisite is not published is reachable only by a student who has
   * already mastered that prerequisite — so a set that is not closed is not a set to publish.
   */
  it('is closed under prerequisites', () => {
    expect(unclosed(SETS.recommended)).toEqual([]);
    expect(unclosed(SETS.absoluteMinimum)).toEqual([]);
  });

  it('never proposes fewer units than a single plan needs', () => {
    expect(SETS.absoluteMinimum.length).toBeGreaterThanOrEqual(PROGRAM_DAYS);
    expect(SETS.recommended.length).toBeGreaterThanOrEqual(SETS.absoluteMinimum.length);
  });

  it('keeps every checkpoint, review and project, because verification has no slack', () => {
    const measuring = READY.filter(u => ['CHECKPOINT', 'REVIEW', 'PROJECT'].includes(u.unitType)).map(u => u.unitCode);
    expect(measuring.filter(c => !SETS.recommended.includes(c))).toEqual([]);
  });
});

describe.each([
  ['READY', READY],
  ['recommended set', RECOMMENDED],
])('%s — nine realistic profiles', (_label, pool) => {
  it.each(STUDENTS)('%s receives a certified ninety days', (_key, student) => {
    const r = compose(pool, student);
    const rep = validatePlan({ result: r, universe: READY, student });
    expect(rep.issues).toEqual([]);
    expect(r.units).toHaveLength(PROGRAM_DAYS);
    expect(new Set(r.units.map(u => u.unitCode)).size).toBe(PROGRAM_DAYS);
    expect(r.blocked).toEqual([]);
  });

  it.each(STUDENTS)('%s is deterministic', (_key, student) => {
    expect(isDeterministic(pool, student)).toBe(true);
  });
});

/**
 * STATE-BOUNDARY LEARNERS NOBODY MAY BE SHORT FOR. THE PHASE-21 CAPACITY FINDING, CLOSED.
 *
 * Universal skills at 75 or above with a direction chosen, and programming at 75 or above for
 * software/backend, were short: concept units are rightly unsuitable for them, the direction filter
 * removes other directions' material, and READY held fewer than ninety units they could take.
 * Phase 21 closed it by authoring the designed PARTIAL units they needed and the practical units in
 * CAPACITY_UNITS — SOFTWARE_BACKEND by frozen decision has no direction-scoped units, so a learner
 * who has demonstrated the shared software core needs practical work inside it.
 *
 * Kept as a named, empty list rather than deleted, so a later change that makes anybody short again
 * fails here with their key.
 */
const OPEN_CAPACITY_SHORTFALL: string[] = [];

describe('recommended set — state-boundary learners', () => {
  /**
   * 74|75 is where concept units stop being suitable, 84|85 is where mastery begins, and a high
   * score on thin evidence must behave as STANDARD. The 75–84 band is the one that used to reach
   * twelve units through a prerequisite deadlock.
   */
  it('is short for exactly the named capacity learners, and nobody else', () => {
    const short = BOUNDARIES.filter(([, s]) => compose(RECOMMENDED, s).units.length < PROGRAM_DAYS).map(([k]) => k);
    expect(short).toEqual(OPEN_CAPACITY_SHORTFALL);
  });

  it.each(BOUNDARIES)('%s is certified at ninety, or short only because every suitable unit is scheduled', (_key, student) => {
    const r = compose(RECOMMENDED, student);
    const rep = validatePlan({ result: r, universe: READY, student });
    if (r.units.length === PROGRAM_DAYS) {
      expect(rep.issues).toEqual([]);
      return;
    }
    // A ceiling, never a deadlock: nothing suitable is left behind, and nothing else is wrong.
    expect(rep.issues.map(i => i.code)).toEqual(['LENGTH']);
    const suitable = RECOMMENDED.filter(u => isRelevant(u, student) && !unusableFor(u, student)).length;
    expect(r.units.length).toBe(suitable);
  });

  it.each(BOUNDARIES.filter(([k]) => /@74\/|LOW/.test(k)))('%s is never resolved by evidence or mastery below REVISION', (_key, student) => {
    const r = compose(RECOMMENDED, student);
    expect(r.prerequisites.filter(o => o.resolution === 'SATISFIED_BY_EVIDENCE')).toEqual([]);
    expect(r.prerequisites.filter(o => o.resolution === 'SATISFIED_BY_MASTERY')).toEqual([]);
  });

  it.each(BOUNDARIES.filter(([k]) => /LOW/.test(k)))('%s is never resolved by STANDARD evidence on thin evidence', (_key, student) => {
    const r = compose(RECOMMENDED, student);
    expect(r.prerequisites.filter(o => o.resolution === 'SATISFIED_BY_STANDARD_EVIDENCE')).toEqual([]);
    expect(r.knownInstruction || []).toEqual([]);
  });
});

describe('absolute minimum — nine realistic profiles', () => {
  it.each(STUDENTS)('%s still gets exactly ninety days with no prerequisite blocked', (_key, student) => {
    const r = compose(MINIMUM, student);
    expect(r.units).toHaveLength(PROGRAM_DAYS);
    expect(r.blocked).toEqual([]);
  });
});

describe('the strong-profile ADVANCED_UNIVERSAL floor', () => {
  /**
   * Both strong learners finish ADVANCED_UNIVERSAL below its floor. That is certified as a
   * structural reallocation ONLY because every remaining unit in the role is unsuitable at a state
   * only evidence can set — a verified skill is not re-taught to reach a number.
   */
  it.each(STUDENTS.filter(([k]) => k.startsWith('strong')))('%s misses it only for suitability', (_key, student) => {
    const r = compose(RECOMMENDED, student);
    const rep = validatePlan({ result: r, universe: READY, student });
    expect(rep.issues.filter(i => i.code === 'SHAPE_UNEXPLAINED' || i.code === 'VERIFIED_REINSTRUCTED')).toEqual([]);
    for (const v of r.shapeViolations) expect(rep.explainedShape.map(e => e.role)).toContain(v.role);
  });
});

describe('direction on the recommended set', () => {
  it('SOFTWARE_BACKEND affinity never reduces shared-core practical work and breaks no rule', () => {
    const [, student] = STUDENTS.find(([k]) => k === 'software_backend')!;
    const withAffinity = compose(RECOMMENDED, student);
    const without = compose(withoutCoreAffinity(RECOMMENDED), student);
    expect(coreModuleUse(withAffinity, READY, student).practicalFromCore)
      .toBeGreaterThanOrEqual(coreModuleUse(without, READY, student).practicalFromCore);
    expect(validatePlan({ result: withAffinity, universe: READY, student }).issues).toEqual([]);
  });

  it.each(STUDENTS.filter(([k]) => ['undecided', 'strong-universal', 'mixed'].includes(k)))(
    '%s samples across areas deterministically', (_key, student) => {
      const a = directionFamilyMix(compose(RECOMMENDED, student), READY, student);
      const b = directionFamilyMix(compose([...RECOMMENDED].reverse(), student), READY, student);
      expect(a).toEqual(b);
      const values = Object.values(a);
      const total = values.reduce((x, y) => x + y, 0);
      if (values.length >= 2) expect(Math.max(...values) / total).toBeLessThanOrEqual(0.7);
    },
  );
});

describe('future recomposition on the recommended set', () => {
  /**
   * An inventory that builds one plan and then cannot absorb the next piece of evidence is not
   * production-safe: personalisation keeps running after day one. Frozen at day 30 and day 60,
   * for improvement, struggle, a newly verified skill and a refined direction.
   */
  const cases = STUDENTS.flatMap(([key, student]) => [30, 60].flatMap(freezeDay =>
    EVOLUTIONS.map(kind => [`${key} ${kind} @${freezeDay}`, student, kind, freezeDay] as const)));

  it.each(cases)('%s still holds ninety valid days', (_label, base, kind, freezeDay) => {
    const rep = simulateRecomposition({ pool: RECOMMENDED, universe: READY, base, kind, freezeDay });
    expect(rep.issues).toEqual([]);
    expect(rep.stitched).toHaveLength(PROGRAM_DAYS);
  });
});
