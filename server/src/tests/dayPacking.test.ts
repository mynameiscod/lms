/**
 * Packing a composed sequence into the days the admin asked for.
 *
 * The three properties every plan depends on: the order is the composer's, nothing is lost, and a
 * day is doable. Everything else — which days grow, how they read — is judged against those.
 */

import {
  packIntoDays, targetUnitsFor, PackableUnit,
  DEFAULT_DAY_BUDGET_MINUTES, DEFAULT_MAX_UNITS_PER_DAY,
} from '../data/dayPackingPolicy';

const u = (code: string, minutes = 45, unitType = 'CONCEPT', topicCode = 'T_A'): PackableUnit =>
  ({ unitCode: code, unitType, estimatedMinutes: minutes, topicCode });

const seq = (n: number, topic = 'T_A', minutes = 45) =>
  Array.from({ length: n }, (_, i) => u(`${topic}_U${i + 1}`, minutes, 'CONCEPT', topic));

const flat = (days: PackableUnit[][]) => days.flat().map(x => x.unitCode);
const OPTS = { budgetMinutes: DEFAULT_DAY_BUDGET_MINUTES, maxUnitsPerDay: DEFAULT_MAX_UNITS_PER_DAY };

describe('one unit per day — what Foundation does, unchanged', () => {
  it('returns each unit on its own day when the counts already match', () => {
    const units = seq(90);
    const r = packIntoDays(units, { days: 90, ...OPTS });
    expect(r.ok).toBe(true);
    expect(r.days).toHaveLength(90);
    expect(r.days.every(d => d.length === 1)).toBe(true);
    expect(flat(r.days)).toEqual(units.map(x => x.unitCode));
  });

  it('refuses rather than padding when the curriculum cannot fill the days', () => {
    const r = packIntoDays(seq(80), { days: 90, ...OPTS });
    expect(r).toMatchObject({ ok: false, reason: 'TOO_FEW_UNITS', unitsShortBy: 10 });
    // Nothing is returned to write: a short plan must never reach a student.
    expect(r.days).toEqual([]);
  });
});

describe('packing a bank into the days an admin set', () => {
  it('produces exactly the number of days asked for', () => {
    /* 200 lessons of 45 minutes: two fit a 100-minute day, three do not — so 90 days is genuinely
       impossible and is covered by its own test below. */
    for (const days of [110, 120, 150]) {
      const r = packIntoDays(seq(200), { days, ...OPTS });
      expect(r.ok).toBe(true);
      expect(r.days).toHaveLength(days);
    }
  });

  it('never changes the order the composer chose', () => {
    const units = seq(160);
    const r = packIntoDays(units, { days: 100, ...OPTS });
    expect(flat(r.days)).toEqual(units.map(x => x.unitCode));
  });

  it('never loses or repeats a unit', () => {
    const units = seq(175);
    const r = packIntoDays(units, { days: 120, ...OPTS });
    const codes = flat(r.days);
    expect(codes).toHaveLength(175);
    expect(new Set(codes).size).toBe(175);
  });

  it('keeps every day inside its minutes budget', () => {
    const r = packIntoDays(seq(170, 'T_A', 45), { days: 90, budgetMinutes: 100, maxUnitsPerDay: 3 });
    expect(r.ok).toBe(true);
    for (const day of r.days) {
      expect(day.reduce((n, x) => n + x.estimatedMinutes, 0)).toBeLessThanOrEqual(100);
    }
  });

  it('never puts more units on a day than allowed', () => {
    const r = packIntoDays(seq(240, 'T_A', 20), { days: 90, budgetMinutes: 200, maxUnitsPerDay: 3 });
    expect(r.ok).toBe(true);
    expect(Math.max(...r.days.map(d => d.length))).toBeLessThanOrEqual(3);
  });

  it('leaves a project or a checkpoint alone on its day', () => {
    const units = [
      ...seq(8), u('T_A_PROJECT', 110, 'PROJECT'), ...seq(8).map(x => ({ ...x, unitCode: `${x.unitCode}b` })),
      u('T_A_CHECK', 60, 'CHECKPOINT'),
    ];
    const r = packIntoDays(units, { days: 12, ...OPTS });
    expect(r.ok).toBe(true);
    const solo = r.days.filter(d => d.some(x => ['PROJECT', 'CHECKPOINT'].includes(x.unitType)));
    expect(solo).toHaveLength(2);
    expect(solo.every(d => d.length === 1)).toBe(true);
  });

  it('prefers to join units of the same topic', () => {
    /* Two topics, interleaved in blocks; the joins available within a topic are taken first. */
    const units = [...seq(6, 'T_A'), ...seq(6, 'T_B')];
    const r = packIntoDays(units, { days: 9, ...OPTS });
    expect(r.ok).toBe(true);
    const mixed = r.days.filter(d => new Set(d.map(x => x.topicCode)).size > 1);
    expect(mixed).toHaveLength(0);
  });

  it('is deterministic', () => {
    const units = seq(183);
    const a = packIntoDays(units, { days: 110, ...OPTS });
    const b = packIntoDays(units, { days: 110, ...OPTS });
    expect(JSON.stringify(a.days)).toEqual(JSON.stringify(b.days));
  });

  it('refuses rather than overfill a day when the work cannot fit', () => {
    /* Two 45-minute lessons fill a 100-minute day; 200 of them need more than 90 days. */
    const r = packIntoDays(seq(200, 'T_A', 45), { days: 90, budgetMinutes: 100, maxUnitsPerDay: 3 });
    expect(r).toMatchObject({ ok: false, reason: 'CANNOT_PACK' });
  });

  it('refuses when work that cannot share a day is asked to', () => {
    /* Ninety projects cannot share days, so thirty days is impossible however they are arranged. */
    const units = Array.from({ length: 90 }, (_, i) => u(`P${i}`, 110, 'PROJECT'));
    const r = packIntoDays(units, { days: 30, ...OPTS });
    expect(r).toMatchObject({ ok: false, reason: 'CANNOT_PACK' });
  });

  it('a longer programme spreads the same curriculum over lighter days', () => {
    const units = seq(200);
    const short = packIntoDays(units, { days: 110, ...OPTS });
    const long = packIntoDays(units, { days: 150, ...OPTS });
    expect(short.ok && long.ok).toBe(true);
    const busiest = (r: ReturnType<typeof packIntoDays>) => Math.max(...r.days.map(d => d.length));
    const perDay = (r: ReturnType<typeof packIntoDays>) =>
      r.days.reduce((n, d) => n + d.reduce((m, x) => m + x.estimatedMinutes, 0), 0) / r.days.length;
    expect(busiest(long)).toBeLessThanOrEqual(busiest(short));
    expect(perDay(long)).toBeLessThan(perDay(short));
  });
});

describe('asking the composer for the right number of units', () => {
  it('asks for one unit per day when that is the shape wanted', () => {
    expect(targetUnitsFor(90, { budgetMinutes: 50, averageUnitMinutes: 50 })).toBe(90);
  });

  it('asks for more when a day is meant to hold more', () => {
    expect(targetUnitsFor(120, { budgetMinutes: 100, averageUnitMinutes: 50 })).toBe(240);
  });

  it('never asks for fewer units than there are days', () => {
    expect(targetUnitsFor(150, { budgetMinutes: 10, averageUnitMinutes: 90 })).toBe(150);
  });
});
