// Shared scheduling helpers for the Learning Plan / Batch Offering layer.
// A "working day" is a weekday that is not a configured holiday.

export const ymd = (d: Date): string => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const isWeekend = (d: Date): boolean => {
  const x = d.getDay();
  return x === 0 || x === 6; // Sun / Sat
};

// "Today" as an India (Asia/Kolkata) calendar date, returned as a local-midnight Date
// so it compares consistently with the stored batch/enrollment dates. Batches run on
// IST dates, but the server clock is UTC — using new Date() directly makes the current
// plan day lag by one between IST-midnight and 05:30 IST (UTC still on the previous day),
// which left "today's" day locked until mid-morning. This anchors the day math to IST.
export function istToday(): Date {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()); // e.g. "2026-07-08"
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function asLocalDate(input: string | Date): Date {
  if (input instanceof Date) {
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (typeof input === 'string') {
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const d = new Date(input as any);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calendar date for plan `dayNumber` (1-based) starting from `startDate`,
 * skipping weekends and holidays. If startDate itself is a non-working day,
 * day 1 rolls forward to the next working day.
 */
export function workingDateForDay(startDate: Date | string, dayNumber: number, holidays: Set<string> = new Set()): Date {
  const d = asLocalDate(startDate instanceof Date ? startDate : new Date(startDate));
  const isOff = (x: Date) => isWeekend(x) || holidays.has(ymd(x));
  while (isOff(d)) d.setDate(d.getDate() + 1);
  let remaining = dayNumber - 1;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (!isOff(d)) remaining--;
  }
  return d;
}

/** Which plan day number is "today" for a cohort, or null if before start / past end. */
export function planDayForDate(startDate: Date | string, totalDays: number, holidays: Set<string> = new Set(), today = istToday()): number | null {
  const t = asLocalDate(today);
  for (let day = 1; day <= totalDays; day++) {
    const dd = workingDateForDay(startDate, day, holidays);
    if (ymd(dd) === ymd(t)) return day;
    if (dd > t) return null; // hasn't reached a planned day yet
  }
  return null;
}

/**
 * How many working days (weekdays minus holidays) have elapsed from startDate up to
 * and including today — i.e. the current curriculum day. Unlike planDayForDate this
 * still returns the last working-day number on a weekend/holiday (not null), so it's
 * the right value for a "Today's Day N" indicator. Null only if today is before start.
 */
export function workingDayCount(startDate: Date | string, totalDays: number, holidays: Set<string> = new Set(), today = istToday()): number | null {
  const t = asLocalDate(today);
  const start = asLocalDate(startDate);
  if (t < start) return null;
  const isOff = (x: Date) => isWeekend(x) || holidays.has(ymd(x));
  let count = 0;
  const cur = new Date(start);
  while (cur <= t) {
    if (!isOff(cur)) count++;
    if (ymd(cur) === ymd(t)) break;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.min(count, totalDays);
}
