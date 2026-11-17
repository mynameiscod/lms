import { WEEKDAYS, DayHours } from '../../models/Workflow';

/**
 * Office hours in the institute's timezone. Pure functions — no database — so they are easy to test.
 */
export interface OfficeHours {
  timezone: string;
  days: Record<string, DayHours>;
  holidays: { date: string; name?: string }[];
}

export const DEFAULT_OFFICE_HOURS: OfficeHours = {
  timezone: 'Asia/Kolkata',
  days: Object.fromEntries(WEEKDAYS.map((d) => [d, { open: d !== 'sun', start: '09:30', end: '18:30' }])),
  holidays: [],
};

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
    fmtCache.set(tz, f);
  }
  return f;
}

export function validTimezone(tz: string): boolean {
  try { fmt(tz); return true; } catch { return false; }
}

/** The wall-clock date and time at `d` in `tz`. */
export function localParts(d: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const x of fmt(tz).formatToParts(d)) p[x.type] = x.value;
  const y = +p.year, m = +p.month, day = +p.day, hh = +p.hour % 24, mm = +p.minute;
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return { y, m, d: day, hh, mm, wd, ymd: `${p.year}-${p.month}-${p.day}` };
}

/** UTC instant for a wall-clock time in `tz` (handles DST by re-checking the offset once). */
export function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (t: number) => {
    const p = localParts(new Date(t), tz);
    return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm) - Math.floor(t / 60000) * 60000;
  };
  let t = guess - offsetAt(guess);
  const o2 = offsetAt(t);
  if (guess - o2 !== t) t = guess - o2;
  return new Date(t);
}

const hm = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h < 24 && mi < 60 ? [h, mi] as const : null;
};

/** Opening and closing instants of the office on the local day y-m-d (null if closed that day). */
function dayWindow(oh: OfficeHours, y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  const ymd = date.toISOString().slice(0, 10);
  if ((oh.holidays || []).some((h) => h.date === ymd)) return null;
  const wd = WEEKDAYS[date.getUTCDay()];
  const hours = oh.days?.[wd];
  if (!hours?.open) return null;
  const a = hm(hours.start), b = hm(hours.end);
  if (!a || !b) return null;
  const start = zonedTimeToUtc(y, m, d, a[0], a[1], oh.timezone);
  const end = zonedTimeToUtc(y, m, d, b[0], b[1], oh.timezone);
  return end > start ? { start, end } : null;
}

export function isOpen(now: Date, oh: OfficeHours): boolean {
  const p = localParts(now, oh.timezone);
  const w = dayWindow(oh, p.y, p.m, p.d);
  return !!w && now >= w.start && now < w.end;
}

/** `now` if the office is open, else when it next opens (null if it never opens in the next 60 days). */
export function nextOpening(now: Date, oh: OfficeHours): Date | null {
  const p = localParts(now, oh.timezone);
  for (let i = 0; i < 60; i++) {
    const day = new Date(Date.UTC(p.y, p.m - 1, p.d + i));
    const w = dayWindow(oh, day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
    if (!w) continue;
    if (now < w.start) return w.start;
    if (now < w.end) return now;
  }
  return null;
}

/** "today at 9:30 AM", "tomorrow at 9:30 AM", "Mon, 18 Nov at 9:30 AM". */
export function describeOpening(at: Date | null, now: Date, tz: string): string {
  if (!at) return 'soon';
  const time = at.toLocaleTimeString('en-IN', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  const a = localParts(at, tz), n = localParts(now, tz);
  const days = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(n.y, n.m - 1, n.d)) / 86400000);
  if (days === 0) return `today at ${time}`;
  if (days === 1) return `tomorrow at ${time}`;
  return `${at.toLocaleDateString('en-IN', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' })} at ${time}`;
}
