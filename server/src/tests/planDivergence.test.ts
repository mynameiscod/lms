/**
 * Two students who chose different roles must not receive the same plan.
 *
 * "Personalised" is a claim the product makes on its own landing page, and until now nothing
 * checked it. Composing is not enough: a plan can compose perfectly and still be the plan
 * everybody else gets, which is what happened while the direction budget was worth about a sixth
 * of the programme and most of it was handed back for want of content.
 *
 * The check is deliberately about the DIRECTION BUDGET, not about the curriculum this repository
 * happens to ship: it composes against a synthetic pool with known inventory, so it fails when
 * the policy stops spending the budget — not when an author has yet to write a unit. The real
 * curriculum's gaps are a separate, reported thing (directionCoverageService).
 */
import { composeUnits, ComposableUnit, StudentProfile } from '../services/curriculumComposerService';

const DAYS = 90;

/** A universal unit: everybody's, whatever they chose. */
const universal = (n: number): ComposableUnit => ({
  unitCode: `U${String(n).padStart(3, '0')}`,
  title: `Universal ${n}`,
  topicCode: `T_UNI_${Math.ceil(n / 8)}`,
  moduleCode: 'M03_PROGRAMMING',
  skillKeys: [`skill.uni.${n}`],
  prerequisiteUnitCodes: [],
  category: 'UNIVERSAL',
  applicableDirections: [],
  unitType: n % 4 === 0 ? 'PRACTICE' : 'CONCEPT',
  mandatory: false,
  estimatedMinutes: 30,
  status: 'PUBLISHED',
  displayOrder: n,
} as any);

/** A unit only one direction's students should ever see. */
const directionUnit = (key: string, n: number): ComposableUnit => ({
  unitCode: `${key.slice(0, 3)}${String(n).padStart(3, '0')}`,
  title: `${key} ${n}`,
  topicCode: `T_${key}_${Math.ceil(n / 8)}`,
  moduleCode: 'M20_DIRECTION',
  skillKeys: [`skill.${key.toLowerCase()}.${n}`],
  prerequisiteUnitCodes: [],
  category: 'DIRECTION',
  applicableDirections: [key],
  unitType: n % 3 === 0 ? 'PRACTICE' : 'CONCEPT',
  mandatory: false,
  estimatedMinutes: 30,
  status: 'PUBLISHED',
  displayOrder: 500 + n,
} as any);

const POOL: ComposableUnit[] = [
  ...Array.from({ length: 140 }, (_, i) => universal(i + 1)),
  ...Array.from({ length: 40 }, (_, i) => directionUnit('WEB_DEVELOPMENT', i + 1)),
  ...Array.from({ length: 40 }, (_, i) => directionUnit('AI_ML', i + 1)),
];

const learner = (direction: string | null, status: string): StudentProfile => ({
  skills: new Map(),
  primaryDirection: direction,
  directionStatus: status,
  explorationDirections: [],
} as any);

const planFor = (direction: string | null, status = 'SELECTED') =>
  composeUnits({ candidates: POOL, targetUnits: DAYS, student: learner(direction, status) });

/** The composer returns a slimmer unit, so a direction is read back off the pool it was given. */
const BY_CODE = new Map(POOL.map(u => [u.unitCode, u]));
const directionsOf = (code: string): string[] => (BY_CODE.get(code)?.applicableDirections || []) as string[];
const countFor = (units: { unitCode: string }[], key: string) =>
  units.filter(u => directionsOf(u.unitCode).includes(key)).length;

describe('a chosen role changes the plan', () => {
  const web = planFor('WEB_DEVELOPMENT');
  const ai = planFor('AI_ML');

  it('composes a whole plan for each of them', () => {
    expect(web.ok).toBe(true);
    expect(ai.ok).toBe(true);
    expect(web.units).toHaveLength(DAYS);
    expect(ai.units).toHaveLength(DAYS);
  });

  it('spends a real part of the programme on the direction they chose', () => {
    const own = (r: typeof web, key: string) => countFor(r.units, key);
    // Worth a fifth of the year at least: the budget was a sixth and most of it went unspent.
    expect(own(web, 'WEB_DEVELOPMENT')).toBeGreaterThanOrEqual(18);
    expect(own(ai, 'AI_ML')).toBeGreaterThanOrEqual(18);
  });

  it('never gives a student another direction material', () => {
    expect(countFor(web.units, 'AI_ML')).toBe(0);
    expect(countFor(ai.units, 'WEB_DEVELOPMENT')).toBe(0);
  });

  it('leaves the two plans meaningfully different', () => {
    const a = web.units.map(u => u.unitCode);
    const b = new Set(ai.units.map(u => u.unitCode));
    const unique = a.filter(code => !b.has(code)).length;
    expect(unique).toBeGreaterThanOrEqual(18);
  });

  it('still shares the fundamentals, so a first year is a first year', () => {
    const a = new Set(web.units.map(u => u.unitCode));
    const shared = ai.units.filter(u => a.has(u.unitCode)).length;
    expect(shared).toBeGreaterThanOrEqual(DAYS / 2);
  });
});

describe('a student who has not chosen', () => {
  it('is given breadth rather than one direction', () => {
    const undecided = planFor(null, 'UNDECIDED');
    expect(undecided.ok).toBe(true);
    const web = countFor(undecided.units, 'WEB_DEVELOPMENT');
    const ai = countFor(undecided.units, 'AI_ML');
    // Neither direction may dominate the plan of somebody who never picked one.
    expect(Math.abs(web - ai)).toBeLessThanOrEqual(12);
  });
});
