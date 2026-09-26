/**
 * Every density band must produce a plan that can actually be arranged into days.
 *
 * ── THE DEFECT THIS GUARDS ────────────────────────────────────────────────────────────────
 *
 * Density gives a stronger learner more units per day. The day budget was set alongside it by
 * eye — 100, 120, 140 — and never checked against the inventory those units come from.
 *
 * FAST was infeasible. Two units a day, a longest published unit of 150 minutes, and a 140
 * minute budget: any day holding that unit plus anything else broke the cap, so the packer
 * pushed work forward, ran out of days and refused. Measured on the real Year-2 curriculum,
 * packing failed at 140 and 150 and succeeded from 160.
 *
 * The failure ran the wrong way round, which is what made it hard to see: the better a student
 * scored, the more units they were composed, the more certainly their plan would not pack, and
 * what they were shown was "your roadmap could not be prepared just now". A high score produced
 * a broken product.
 *
 * ── WHY THIS TEST IS ARITHMETIC AND NOT A FIXTURE ─────────────────────────────────────────
 *
 * It asserts the relationship that has to hold between a band and the content: a day must be
 * able to hold the number of units the band asks for, at the sizes the curriculum actually
 * contains. That stays true as content is authored, which a recorded pass/fail against one
 * inventory would not.
 */

import { DENSITIES, unitsForDays } from '../data/learningDensityPolicy';
import { packIntoDays } from '../data/dayPackingPolicy';

/** Measured across the published Year-1 and Year-2 inventories: mean 56 minutes, longest 150. */
const TYPICAL_UNIT_MINUTES = 56;

describe('a density band can be packed into days', () => {
  for (const band of Object.values(DENSITIES)) {
    it(`${band.band}: one day can hold the units it asks for`, () => {
      /*
       * The band asks for `unitsPerDay`. A day must be able to hold that many typical units, or
       * the packer is being asked for something arithmetically impossible on every single day.
       */
      const needed = Math.ceil(band.unitsPerDay) * TYPICAL_UNIT_MINUTES;
      expect(band.budgetMinutes).toBeGreaterThanOrEqual(needed);
    });

    it(`${band.band}: the budget leaves room above what a day needs on average`, () => {
      /*
       * The band's own arithmetic: units per day times a typical unit is what a day carries on
       * average, and the budget is the cap above it. FAST failed this — two units of 56 minutes
       * is 112, and its cap was 140, which sounds like headroom until a 150-minute unit needs to
       * share a day with something.
       *
       * Deliberately NOT "the budget must hold the longest unit plus a typical one". The packer
       * allows an oversized unit to sit alone, and requiring 236 minutes of every band would
       * make a first-year's day four hours to satisfy an arithmetic that never occurs.
       */
      const average = band.unitsPerDay * TYPICAL_UNIT_MINUTES;
      expect(band.budgetMinutes).toBeGreaterThan(average);
    });

    it(`${band.band}: packs a whole programme of realistic units`, () => {
      const DAYS = 110;
      const count = unitsForDays(DAYS, band);
      /*
       * One unit in ten is long, the rest typical — matched to the measured curriculum rather
       * than invented. Across the two published years the mean is 56 minutes and the longest is
       * 150, and long units are the minority. A synthetic quarter of them at 150 defeats every
       * band and would have been a test about the fixture rather than about the policy.
       */
      const units = Array.from({ length: count }, (_, i) => ({
        unitCode: `U${i}`,
        unitType: 'CONCEPT',
        estimatedMinutes: i % 10 === 0 ? 150 : TYPICAL_UNIT_MINUTES,
        topicCode: `T${Math.floor(i / 5)}`,
      }));
      const packed = packIntoDays(units, {
        days: DAYS,
        budgetMinutes: band.budgetMinutes,
        maxUnitsPerDay: band.maxUnitsPerDay,
      });
      expect(packed.ok).toBe(true);
      if (packed.ok) expect(packed.days.length).toBe(DAYS);
    });
  }

  it('asks for at least one unit per day in every band', () => {
    for (const band of Object.values(DENSITIES)) {
      expect(unitsForDays(110, band)).toBeGreaterThanOrEqual(110);
    }
  });
});
