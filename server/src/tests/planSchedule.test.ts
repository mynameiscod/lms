import { asLocalDate, workingDayCount, planDayForDate } from '../utils/planSchedule';

describe('planSchedule utils', () => {
  it('should normalize YYYY-MM-DD strings to local midnight without timezone drift', () => {
    const date = asLocalDate('2026-07-07');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(7);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('should count working days correctly when start date is a weekday', () => {
    const startDate = '2026-07-06'; // Monday
    const count = workingDayCount(startDate, 10, new Set(), new Date('2026-07-07'));
    expect(count).toBe(2);
  });

  it('should count working days correctly when start date is a weekend date string', () => {
    const startDate = '2026-07-04'; // Saturday
    const count = workingDayCount(startDate, 10, new Set(), new Date('2026-07-06')); // Monday
    expect(count).toBe(1);
  });

  it('should return the correct plan day for a cohort calendar date', () => {
    const startDate = '2026-07-06';
    const today = new Date('2026-07-08'); // Wednesday
    const day = planDayForDate(startDate, 145, new Set(), today);
    expect(day).toBe(3);
  });

  it('should return null for a plan day before cohort start', () => {
    const startDate = '2026-07-06';
    const day = planDayForDate(startDate, 145, new Set(), new Date('2026-07-05'));
    expect(day).toBeNull();
  });

  it('default off-days skip Saturday (Mon–Fri batch)', () => {
    // Mon Jul 6 → D1, Fri Jul 10 → D5, Sat Jul 11 stays D5 (no new day)
    expect(workingDayCount('2026-07-06', 145, new Set(), new Date('2026-07-11'))).toBe(5);
  });

  it('custom off-days [0] count Saturdays as content days (Mon–Sat batch)', () => {
    // Only Sunday off: Mon Jul 6 → D1 … Sat Jul 11 → D6
    const offDays = new Set([0]);
    expect(workingDayCount('2026-07-06', 145, new Set(), new Date('2026-07-11'), offDays)).toBe(6);
  });

  it('skip dates (holiday / mock-interview) do not consume a Day', () => {
    // Mon–Sat cadence, but Wed Jul 8 is a mock-interview day → skipped.
    // Mon6=D1,Tue7=D2,(Wed8 skip),Thu9=D3,Fri10=D4,Sat11=D5
    const offDays = new Set([0]);
    const skip = new Set(['2026-07-08']);
    expect(workingDayCount('2026-07-06', 145, skip, new Date('2026-07-11'), offDays)).toBe(5);
  });
});
