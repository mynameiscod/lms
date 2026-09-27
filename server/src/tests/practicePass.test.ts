/**
 * Daily Practice Pass — how rules combine. Institute default, then batch, then student: the most
 * specific level that sets a value wins, and task requirements are taken as a whole set.
 */
import { resolve } from '../services/practicePassService';

const p = (x: any) => x as any;

describe('practice rules', () => {
  it('is off until the institute switches it on, with sensible defaults', () => {
    const r = resolve(null);
    expect(r.enabled).toBe(false);
    expect(r.thresholdPct).toBe(80);
    expect(r.requirements).toEqual({ communication: 1, coding_problem: 1, assignment: 0, thinking_lab: 1 });
  });

  it('batch overrides the institute, student overrides both', () => {
    const tenant = p({ startDate: '2026-09-28', enforceFrom: '2026-10-05', thresholdPct: 80, requirements: { communication: 1, coding_problem: 1, assignment: 0, thinking_lab: 1 } });
    const batch = p({ thresholdPct: 70, requirements: { communication: 1, coding_problem: 2, assignment: 1, thinking_lab: 0 } });
    const student = p({ thresholdPct: 90 });
    const r = resolve(tenant, batch, student);
    expect(r.enabled).toBe(true);
    expect(r.thresholdPct).toBe(90);
    expect(r.requirements).toEqual({ communication: 1, coding_problem: 2, assignment: 1, thinking_lab: 0 });
    expect(r.enforceFrom).toBe('2026-10-05');
  });

  it('an exempt student is marked exempt; unset student fields inherit', () => {
    const r = resolve(p({ startDate: '2026-09-28', thresholdPct: 75 }), null, p({ exempt: true }));
    expect(r.exempt).toBe(true);
    expect(r.thresholdPct).toBe(75);
  });

  it('clamps negative or junk requirement counts to zero', () => {
    const r = resolve(p({ startDate: 'x', requirements: { communication: -2, coding_problem: 'a', assignment: 1, thinking_lab: 1 } }));
    expect(r.requirements).toEqual({ communication: 0, coding_problem: 0, assignment: 1, thinking_lab: 1 });
  });
});
