/**
 * Skill DNA and direction, on their way into a ninety-day plan.
 *
 * ── THE FOUR CLAIMS THIS FILE DEFENDS ─────────────────────────────────────────────────────
 *
 * 1. NOT ASSESSED IS NOT WEAK. The easiest way to break Foundation is to be helpful: fill in a
 *    zero for every skill with no evidence, and every student becomes a beginner at everything
 *    they were never asked about. Absence must survive the whole path.
 * 2. VERIFIED IS NOT REMOVED. A mastered skill stays; what changes is what the student is
 *    given for it.
 * 3. A DIRECTION CANNOT OVERRIDE A PREREQUISITE. Choosing backend does not make somebody ready
 *    for material they have not been taught.
 * 4. A SCHEDULING PROJECTION IS NOT EVIDENCE. What the plan taught is not what the student has
 *    proved.
 */

import { AUTHORABLE_SUITABLE_STATES } from '../data/adaptiveCurriculumPolicy';
import { DIRECTION_CORE_MODULES, isCoreModuleFor } from '../data/careerDirectionPolicy';

let dnaRows: any[] = [];
jest.mock('../services/skillDnaService', () => ({
  __esModule: true,
  getSkillDna: async () => dnaRows,
}));

import {
  buildFoundationProfile, resolveStance, applySelfReport,
} from '../services/foundationProfileService';
import { composeUnits, ComposableUnit, StudentProfile } from '../services/curriculumComposerService';

const TENANT = 't1';
const STUDENT = 's1';

/**
 * HIGH confidence by default.
 *
 * A thinly-evidenced score is deliberately capped at STANDARD by policy — a 90 from one
 * question is a real observation but not grounds for skipping. Tests that mean "this student
 * has demonstrated it" therefore have to say so with confidence, not with a big number.
 */
const row = (skillKey: string, score: number, over: any = {}) => ({
  skillKey, skillName: skillKey, score, confidence: 'HIGH',
  evidenceCount: 3, distinctItems: 3, lastEvidenceAt: new Date(), skillActive: true, ...over,
});

beforeEach(() => { dnaRows = []; });

// ─────────────────────────────────────────────────────────────────────────────
describe('a skill nobody asked about stays unmeasured', () => {
  it('puts only measured skills in the profile', async () => {
    dnaRows = [row('PYTHON_BASICS', 72), row('HTML', 40)];
    const { profile } = await buildFoundationProfile(TENANT, STUDENT);

    expect(profile.skills.size).toBe(2);
    expect(profile.skills.has('PYTHON_BASICS')).toBe(true);
  });

  it('does NOT invent a zero for a skill with no evidence', async () => {
    dnaRows = [row('PYTHON_BASICS', 72)];
    const { profile } = await buildFoundationProfile(TENANT, STUDENT);

    /**
     * The single most damaging "helpful" change anybody could make here. A zero-filled map
     * turns every unasked skill into FOUNDATION_REQUIRED, and a student is told they are weak
     * at things nobody has ever tested them on.
     */
    expect(profile.skills.has('SQL_BASICS')).toBe(false);
    expect(profile.skills.get('SQL_BASICS')).toBeUndefined();
  });

  it('reports how many skills were actually measured, not the size of the registry', async () => {
    dnaRows = [row('PYTHON_BASICS', 72), row('HTML', 40), row('CSS', 55)];
    const { summary } = await buildFoundationProfile(TENANT, STUDENT);
    expect(summary.measured).toBe(3);
  });

  it('leaves a retired skill out of planning without deleting its history', async () => {
    dnaRows = [row('PYTHON_BASICS', 72), row('FLASH', 90, { skillActive: false })];
    const { profile } = await buildFoundationProfile(TENANT, STUDENT);

    // The evidence still exists in Skill DNA; it just stops steering a ninety-day programme.
    expect(profile.skills.has('FLASH')).toBe(false);
    expect(profile.skills.has('PYTHON_BASICS')).toBe(true);
  });
});

describe('a verified skill is kept, not dropped', () => {
  it('stays in the profile with its score', async () => {
    dnaRows = [row('PYTHON_BASICS', 92)];
    const { profile, summary } = await buildFoundationProfile(TENANT, STUDENT);

    /**
     * Dropping it would make mastery indistinguishable from never having been measured, and
     * the student would be re-taught exactly what they proved.
     */
    expect(profile.skills.get('PYTHON_BASICS')!.score).toBe(92);
    expect(summary.verified).toBe(1);
  });
});

describe('self-reported experience is not mastery', () => {
  it('never writes a score for a claimed skill', async () => {
    dnaRows = [];
    const { profile } = await buildFoundationProfile(TENANT, STUDENT);
    const { profile: after, diagnosticSuggested } = applySelfReport(profile, ['PYTHON_BASICS']);

    // A claim changes how to VERIFY somebody; it is never a claim the platform makes for them.
    expect(after.skills.has('PYTHON_BASICS')).toBe(false);
    expect(diagnosticSuggested).toContain('PYTHON_BASICS');
  });

  it('does not overwrite real evidence with a claim', async () => {
    dnaRows = [row('PYTHON_BASICS', 35)];
    const { profile } = await buildFoundationProfile(TENANT, STUDENT);
    const { diagnosticSuggested } = applySelfReport(profile, ['PYTHON_BASICS']);

    expect(profile.skills.get('PYTHON_BASICS')!.score).toBe(35);
    expect(diagnosticSuggested).not.toContain('PYTHON_BASICS');
  });
});

describe('direction is chosen, never inferred', () => {
  it('treats no choice as UNDECIDED with exploration breadth', () => {
    const s = resolveStance({});
    expect(s.directionStatus).toBe('UNDECIDED');
    expect(s.primaryDirection).toBeNull();
    // Breadth is the point of the state — an undecided student must still meet several areas.
    expect(s.exploring.length).toBeGreaterThan(1);
  });

  it('honours an explicit selection', () => {
    const s = resolveStance({ primaryDirection: 'SOFTWARE_BACKEND', status: 'SELECTED' });
    expect(s.primaryDirection).toBe('SOFTWARE_BACKEND');
    expect(s.exploring).toEqual([]);
  });

  it('ignores a direction that does not exist rather than trusting it', () => {
    const s = resolveStance({ primaryDirection: 'SOFTWARE_DEVELOPMENT', status: 'SELECTED' });
    expect(s.primaryDirection).toBeNull();
  });

  it('never derives a direction from scores', async () => {
    dnaRows = [row('HTML', 95), row('CSS', 92)];
    const { summary } = await buildFoundationProfile(TENANT, STUDENT);

    // Scoring well at web is not choosing web. That decision stays with the student.
    expect(summary.primaryDirection).toBeNull();
    expect(summary.directionStatus).toBe('UNDECIDED');
  });

  it('keeps a named exploration set for a student still sampling', () => {
    const s = resolveStance({ status: 'EXPLORING', exploring: ['AI_ML', 'DATA'] });
    expect(s.exploring).toEqual(['AI_ML', 'DATA']);
  });
});

/* ------------------------------------------------------------------ *
 * Shared-core affinity, against a controlled inventory
 * ------------------------------------------------------------------ */

const unit = (over: Partial<ComposableUnit>): ComposableUnit => ({
  unitCode: 'U', title: 'U', moduleCode: 'M03_PROGRAMMING', topicCode: 'T', displayOrder: 10,
  skillKeys: [], prerequisiteSkillKeys: [], prerequisiteUnitCodes: [],
  category: 'UNIVERSAL', applicableDirections: [], unitType: 'CONCEPT',
  defaultDepth: 'STANDARD', mandatory: true, estimatedMinutes: 45, ...over,
});

const backend: StudentProfile = {
  skills: new Map([['PYTHON_BASICS', { score: 88, confidence: 'HIGH' as any }]]),
  primaryDirection: 'SOFTWARE_BACKEND',
  directionStatus: 'SELECTED',
};

describe('SOFTWARE_BACKEND affinity reaches shared core without duplicating it', () => {
  it('names the five shared modules from the Year-1 decision', () => {
    expect(DIRECTION_CORE_MODULES.SOFTWARE_BACKEND).toEqual(
      expect.arrayContaining([
        'M03_PROGRAMMING', 'M06_C_PROGRAMMING', 'M07_DSA', 'M08_DATABASES', 'M04_DEVELOPER_TOOLS',
      ]),
    );
  });

  it('recognises a core module for the chosen direction', () => {
    expect(isCoreModuleFor('M07_DSA', 'SOFTWARE_BACKEND')).toBe(true);
    expect(isCoreModuleFor('M12_COMMUNICATION', 'SOFTWARE_BACKEND')).toBe(false);
  });

  it('also recognises core modules of directions being sampled', () => {
    // Breadth for an undecided student should be representative, not whatever sorts first.
    expect(isCoreModuleFor('M09_LINUX', null, ['CLOUD_DEVOPS'])).toBe(true);
  });

  it('prefers a core-module PROJECT over an equally ranked one elsewhere', () => {
    const candidates = [
      // M01 sorts BEFORE M07, so without affinity it would win. Affinity is the only thing
      // that can reverse this, which is what makes the assertion meaningful.
      unit({
        unitCode: 'T_CS_PROJECT', moduleCode: 'M01_CS_FUNDAMENTALS', topicCode: 'T_CS',
        unitType: 'PROJECT', skillKeys: ['PYTHON_BASICS'],
      }),
      unit({
        unitCode: 'T_DSA_PROJECT', moduleCode: 'M07_DSA', topicCode: 'T_DSA',
        unitType: 'PROJECT', skillKeys: ['PYTHON_BASICS'],
      }),
    ];

    const r = composeUnits({ candidates, targetUnits: 1, student: backend });
    // Both are suitable at VERIFIED and identically ranked on every other axis.
    expect(r.units[0].unitCode).toBe('T_DSA_PROJECT');
  });

  it('does NOT give instruction the same affinity', () => {
    /**
     * Measured, not assumed. Applying affinity to every type made the audited software profile
     * worse — concepts rose 67 to 70 while practice fell 10 to 8 and projects 4 to 3. A student
     * who has demonstrated programming does not need programming LESSONS ranked higher.
     */
    const candidates = [
      // M01 is NOT backend core and sorts before M07, which is. If affinity applied to
      // instruction it would override that ordering; it must not.
      unit({
        unitCode: 'T_CS_CONCEPT', moduleCode: 'M01_CS_FUNDAMENTALS', topicCode: 'T_CS',
        unitType: 'CONCEPT', skillKeys: ['UNSEEN_SKILL'],
      }),
      unit({
        unitCode: 'T_DSA_CONCEPT', moduleCode: 'M07_DSA', topicCode: 'T_DSA',
        unitType: 'CONCEPT', skillKeys: ['UNSEEN_SKILL'],
      }),
    ];

    const r = composeUnits({ candidates, targetUnits: 1, student: backend });
    // Ordered by module code, as before the change — affinity did not promote the core module.
    expect(r.units[0].unitCode).toBe('T_CS_CONCEPT');
  });

  it('cannot promote a unit past an unmet prerequisite', () => {
    const candidates = [
      unit({
        unitCode: 'T_DSA_PROJECT', moduleCode: 'M07_DSA', topicCode: 'T_DSA',
        unitType: 'PROJECT', skillKeys: ['PYTHON_BASICS'],
        prerequisiteUnitCodes: ['T_DSA_NEVER_WRITTEN'],
      }),
      unit({
        unitCode: 'T_COMMS_PROJECT', moduleCode: 'M12_COMMUNICATION', topicCode: 'T_COMMS',
        unitType: 'PROJECT', skillKeys: ['PYTHON_BASICS'],
      }),
    ];

    const r = composeUnits({ candidates, targetUnits: 2, student: backend });
    const chosen = r.units.map(u => u.unitCode);

    /**
     * Affinity sits below state and mandatory in the priority tuple and the prerequisite walk
     * runs downstream of ranking entirely. Choosing a direction cannot make somebody ready.
     */
    expect(chosen).not.toContain('T_DSA_PROJECT');
    expect(chosen).toContain('T_COMMS_PROJECT');
  });

  it('cannot re-teach a skill the student has demonstrated', () => {
    const candidates = [
      unit({
        unitCode: 'T_PY_CONCEPT', moduleCode: 'M03_PROGRAMMING', topicCode: 'T_PY',
        unitType: 'CONCEPT', skillKeys: ['PYTHON_BASICS'],
      }),
    ];

    const r = composeUnits({ candidates, targetUnits: 1, student: backend });
    /**
     * CONCEPT does not serve VERIFIED, and affinity ranks below state, so a core-module lesson
     * for a mastered skill is still filtered by suitability rather than promoted into the plan.
     */
    expect(r.units).toHaveLength(0);
  });
});

describe('the states a plan may reason about stay the frozen seven', () => {
  it('has not gained LOCKED or NOT_RELEVANT as authorable', () => {
    expect(AUTHORABLE_SUITABLE_STATES).toHaveLength(7);
    expect(AUTHORABLE_SUITABLE_STATES).toContain('NOT_EXPOSED');
    expect(AUTHORABLE_SUITABLE_STATES).not.toContain('LOCKED');
  });
});

describe('different learners get different plans, all of them ninety long', () => {
  /** A controlled inventory big enough to fill ninety days for any of these profiles. */
  const inventory: ComposableUnit[] = [];
  const MODULES = [
    'M03_PROGRAMMING', 'M07_DSA', 'M05_WEB_FUNDAMENTALS', 'M09_LINUX',
    'M10_MATHS', 'M11_AI_LITERACY', 'M08_DATABASES', 'M04_DEVELOPER_TOOLS',
  ];
  const TYPES: any[] = ['CONCEPT', 'CONCEPT', 'CONCEPT', 'PRACTICE', 'DEBUG', 'PROJECT'];

  for (let m = 0; m < MODULES.length; m++) {
    for (let i = 0; i < 30; i++) {
      inventory.push(unit({
        unitCode: `ZZ_${m}_${String(i).padStart(2, '0')}`,
        moduleCode: MODULES[m],
        topicCode: `T_${m}_${Math.floor(i / 6)}`,
        displayOrder: i,
        unitType: TYPES[i % TYPES.length],
        skillKeys: [`SK_${m}`],
        category: m >= 5 ? 'DIRECTION' : 'UNIVERSAL',
        applicableDirections: m === 5 ? ['AI_ML'] : m === 6 ? ['DATA'] : [],
        mandatory: m < 5,
      }));
    }
  }

  const profileFor = (over: Partial<StudentProfile>): StudentProfile => ({
    skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED', ...over,
  });

  /**
   * Strong across most of the curriculum, not all of it — which is what a real strong learner
   * looks like. The everything-verified case is a stress diagnostic and is asserted separately
   * below, because it fails for a reason that is about inventory rather than about the student.
   */
  const strongProfile = () => profileFor({
    skills: new Map(
      MODULES.slice(0, 5).map((_, m) => [`SK_${m}`, { score: 90, confidence: 'HIGH' as any }]),
    ),
  });

  it('fills exactly ninety for a beginner and for a strong learner alike', () => {
    const a = composeUnits({ candidates: inventory, targetUnits: 90, student: profileFor({}) });
    const b = composeUnits({ candidates: inventory, targetUnits: 90, student: strongProfile() });

    // The invariant that makes the programme a promise rather than a target. A strong learner
    // is not rewarded with a shorter course, and a beginner is not punished with a longer one.
    expect(a.units).toHaveLength(90);
    expect(b.units).toHaveLength(90);
  });

  it('leaves all-verified as a stress diagnostic, not a reason to invent curriculum', () => {
    const allVerified = profileFor({
      skills: new Map(MODULES.map((_, m) => [`SK_${m}`, { score: 90, confidence: 'HIGH' as any }])),
    });
    const r = composeUnits({ candidates: inventory, targetUnits: 90, student: allVerified });

    /**
     * A learner who has verified EVERYTHING can only be served post-mastery material, and this
     * controlled inventory holds eighty such units. Falling short is the honest outcome and the
     * frozen one: the fix is never to fabricate post-mastery units so a synthetic profile can
     * reach ninety. Persistence refuses a short plan, so nothing reaches a student either way.
     */
    expect(r.units.length).toBeLessThan(90);
    expect(r.units.every(u => ['DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW'].includes(u.unitType)))
      .toBe(true);
  });

  it('gives a beginner and a strong learner materially different journeys', () => {
    const a = composeUnits({ candidates: inventory, targetUnits: 90, student: profileFor({}) });
    const b = composeUnits({ candidates: inventory, targetUnits: 90, student: strongProfile() });

    const overlap = a.units
      .map(u => u.unitCode)
      .filter(code => b.units.some(u => u.unitCode === code)).length;
    const reasons = (r: any) => new Set(r.units.map((u: any) => u.reason));

    /**
     * Personalisation changes WHAT the ninety days contain, never how many there are.
     *
     * What this fixture can honestly prove is that the two journeys are substantially
     * different content, and that the strong learner's plan is justified by mastery where the
     * beginner's is not. It deliberately does NOT assert "the strong learner sees fewer
     * concepts": that is untrue in general — somebody strong in five areas and untested in
     * three legitimately needs instruction in the three — and the shape claim it stands in for
     * (ESTABLISHED gets APPLICATION 13 against EMERGING's 7) belongs to the allocation table
     * and is already held against the real 337-unit curriculum by the capacity suite. Pinning
     * it twice, once on a toy inventory, would only produce a fragile duplicate.
     */
    expect(overlap).toBeLessThan(70);
    expect(reasons(b).has('MASTERY_VERIFIED')).toBe(true);
    expect(reasons(a).has('MASTERY_VERIFIED')).toBe(false);
  });

  it('is deterministic — the same student twice gets the same ninety days', () => {
    const p = profileFor({ primaryDirection: 'AI_ML', directionStatus: 'SELECTED' });
    const a = composeUnits({ candidates: inventory, targetUnits: 90, student: p });
    const b = composeUnits({ candidates: inventory, targetUnits: 90, student: p });

    expect(a.units.map(u => u.unitCode)).toEqual(b.units.map(u => u.unitCode));
  });

  it('gives an undecided learner breadth across several areas', () => {
    const undecided = profileFor({
      directionStatus: 'UNDECIDED',
      explorationDirections: ['AI_ML', 'DATA'],
    });
    const r = composeUnits({ candidates: inventory, targetUnits: 90, student: undecided });

    const modules = new Set(r.units.map(u => u.moduleCode));
    expect(modules.size).toBeGreaterThan(3);
  });
});
