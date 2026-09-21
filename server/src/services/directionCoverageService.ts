/**
 * How much of a plan actually belongs to each direction — the honest answer to "is this
 * personalised?".
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * The composer can only give a student direction days that somebody authored. When a direction
 * has no units, a student who chooses it receives the universal curriculum and nothing else, and
 * their plan is identical to a student who chose a different empty direction. Nothing in the
 * product said so: the plan composed, the journey wrote ninety days, and the promise quietly
 * went unmet.
 *
 * This measures it against the tenant's real curriculum, by composing a plan for a beginner of
 * each direction and counting what came back. It composes rather than counting the library,
 * because inventory is not the same as reach: a unit that is never selected — unpublished, not
 * ready, out of band, beyond the budget — is not a day anybody receives.
 *
 * Nothing here writes. It is a report an admin reads before believing the word "personalised".
 */

import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import { CAREER_DIRECTIONS, DirectionKey } from '../data/careerDirectionPolicy';
import { composeUnits, ComposableUnit, StudentProfile } from './curriculumComposerService';
import { foundationProgramDaysFor } from './foundationProgramLengthService';

export interface DirectionCoverage {
  key: string;
  name: string;
  /** Units in the library carrying this direction. */
  authored: number;
  /** Of those, published — the only ones a student can be given. */
  published: number;
  /** Days of this direction a beginner who chose it actually receives. */
  daysInPlan: number;
  /** Whether a plan could be composed at all for such a student. */
  composed: boolean;
}

export interface CoverageReport {
  stageKey: string;
  programDays: number;
  directions: DirectionCoverage[];
  /** Directions a student can choose that give them no direction days at all. */
  empty: string[];
  /**
   * Pairs of directions whose plans come out identical, and why that is the same fault:
   * two names over one body of content.
   */
  identicalPairs: { a: string; b: string }[];
}

const beginnerOf = (direction: DirectionKey): StudentProfile => ({
  skills: new Map(),
  primaryDirection: direction,
  directionStatus: 'SELECTED',
  explorationDirections: [],
} as any);

export async function directionCoverage(tenantId: string, stageKey = 'foundation'): Promise<CoverageReport> {
  const programDays = await foundationProgramDaysFor(tenantId);
  const units = await CurriculumLearningUnit.find({ tenantId, stageKey }).lean() as any as ComposableUnit[];

  const plans = new Map<string, string[]>();
  const directions: DirectionCoverage[] = [];

  for (const d of CAREER_DIRECTIONS) {
    const scoped = (units as any[]).filter(u => (u.applicableDirections || []).includes(d.key));
    const result = composeUnits({ candidates: units, targetUnits: programDays, student: beginnerOf(d.key as DirectionKey) });
    const codes = result.units.map(u => u.unitCode);
    const chosen = new Set(codes);
    plans.set(d.key, codes);

    directions.push({
      key: d.key,
      name: d.name,
      authored: scoped.length,
      published: scoped.filter(u => u.status === 'PUBLISHED').length,
      daysInPlan: scoped.filter(u => chosen.has(u.unitCode)).length,
      composed: !!result.ok,
    });
  }

  const identicalPairs: { a: string; b: string }[] = [];
  const keys = [...plans.keys()];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = plans.get(keys[i]) || [], b = plans.get(keys[j]) || [];
      if (a.length && a.length === b.length && a.every((code, n) => code === b[n])) {
        identicalPairs.push({ a: keys[i], b: keys[j] });
      }
    }
  }

  return {
    stageKey,
    programDays,
    directions,
    empty: directions.filter(d => d.daysInPlan === 0).map(d => d.key),
    identicalPairs,
  };
}
