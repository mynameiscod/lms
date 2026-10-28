/**
 * Days for the team reports are Indian days (the team works in IST), whatever timezone the server runs in.
 * A day is "YYYY-MM-DD"; the minute of the day counts from midnight IST (0–1439).
 */
const IST_OFFSET_MIN = 330;

const shifted = (d: Date) => new Date(d.getTime() + IST_OFFSET_MIN * 60000);

export const istDay = (d: Date = new Date()): string => shifted(d).toISOString().slice(0, 10);

export const istMinuteOfDay = (d: Date = new Date()): number => {
  const s = shifted(d);
  return s.getUTCHours() * 60 + s.getUTCMinutes();
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The start of the first day to the end of the last day (inclusive), in IST. Bad or missing input means today. */
export const istRange = (from?: string, to?: string): { start: Date; end: Date; fromDay: string; toDay: string } => {
  const today = istDay();
  const f = from && DAY_RE.test(from) ? from : (to && DAY_RE.test(to) ? to : today);
  const t = to && DAY_RE.test(to) ? to : f;
  const [a, b] = f <= t ? [f, t] : [t, f];
  return {
    start: new Date(`${a}T00:00:00.000+05:30`),
    end: new Date(`${b}T23:59:59.999+05:30`),
    fromDay: a,
    toDay: b,
  };
};
