/**
 * Lab streaks (Thinking Lab, Communication Lab) and the freezes that protect them. Pure: no database.
 *
 * A streak day is a day the member completed at least one question or task in that lab. A FREEZE
 * covers one missed day: it is earned by keeping the streak going (one every `freezeEvery` days, by
 * default 7), at most `freezeMax` are held (default 2), and they are used on their own when the member
 * comes back after a gap they cover. A gap longer than the freezes held starts a new streak, and the
 * freezes are kept for next time.
 *
 * Each lab keeps its own streak. Completing a lab question also counts as showing up for the main
 * Day streak, which has no freezes (gamificationEngine.recordActiveDay).
 */

export interface LabStreakSettings {
  /** Earn one freeze each time the streak reaches a multiple of this. 0 = freezes off. */
  freezeEvery: number;
  /** The most freezes a member can hold. */
  freezeMax: number;
}

export const LAB_STREAK_DEFAULTS: LabStreakSettings = { freezeEvery: 7, freezeMax: 2 };
export const LAB_FREEZE_EVERY_MAX = 60;
export const LAB_FREEZE_HOLD_MAX = 10;

/** The admin's numbers, checked; anything missing or out of range falls back to the default. */
export function labStreakSettings(raw: any): LabStreakSettings {
  const every = Number(raw?.freezeEvery);
  const max = Number(raw?.freezeMax);
  return {
    freezeEvery: Number.isInteger(every) && every >= 0 && every <= LAB_FREEZE_EVERY_MAX ? every : LAB_STREAK_DEFAULTS.freezeEvery,
    freezeMax: Number.isInteger(max) && max >= 0 && max <= LAB_FREEZE_HOLD_MAX ? max : LAB_STREAK_DEFAULTS.freezeMax,
  };
}

export interface LabStreakState {
  current: number;
  longest: number;
  /** 'YYYY-MM-DD' of the last streak day, or empty. */
  lastDate?: string | null;
  freezes: number;
}

export interface LabStreakResult extends LabStreakState {
  /** True when this day moved the streak (first completion of the day). */
  advanced: boolean;
  /** The missed days a freeze covered, oldest first. */
  frozenDates: string[];
  /** True when this day earned a new freeze. */
  earnedFreeze: boolean;
}

const toUtc = (d: string) => { const [y, m, day] = d.split('-').map(Number); return Date.UTC(y, m - 1, day); };
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 86400000;

/** Days strictly between two dates ('2026-11-01' → '2026-11-04' is 2). */
export const missedBetween = (from: string, to: string) => Math.max(0, Math.round((toUtc(to) - toUtc(from)) / DAY) - 1);

/** The streak after the member completes something in the lab on `day`. */
export function advanceLabStreak(state: LabStreakState, day: string, settings: LabStreakSettings): LabStreakResult {
  const s = { current: Math.max(0, state.current || 0), longest: Math.max(0, state.longest || 0), lastDate: state.lastDate || null, freezes: Math.max(0, state.freezes || 0) };
  const same = { ...s, advanced: false, frozenDates: [] as string[], earnedFreeze: false };
  // Already counted, or a late write for an earlier day: nothing moves.
  if (s.lastDate && s.lastDate >= day) return same;

  let current = 1;
  let freezes = Math.min(s.freezes, settings.freezeMax);
  const frozenDates: string[] = [];
  if (s.lastDate && s.current > 0) {
    const gap = missedBetween(s.lastDate, day);
    if (gap === 0) current = s.current + 1;
    else if (gap <= freezes) {
      freezes -= gap;
      for (let i = 1; i <= gap; i++) frozenDates.push(fromUtc(toUtc(s.lastDate) + i * DAY));
      current = s.current + 1;
    }
  }

  let earnedFreeze = false;
  if (settings.freezeEvery > 0 && current % settings.freezeEvery === 0 && freezes < settings.freezeMax) {
    freezes += 1;
    earnedFreeze = true;
  }
  return { current, longest: Math.max(s.longest, current), lastDate: day, freezes, advanced: true, frozenDates, earnedFreeze };
}

/**
 * The streak as it stands today, for display: a streak whose gap is already longer than the freezes
 * held is broken even before the member comes back, so it shows 0 rather than a number that will reset.
 */
export function labStreakToday(state: LabStreakState, today: string): { current: number; atRisk: boolean } {
  if (!state.lastDate || !state.current) return { current: 0, atRisk: false };
  if (state.lastDate >= today) return { current: state.current, atRisk: false };
  const gap = missedBetween(state.lastDate, today);
  if (gap > (state.freezes || 0)) return { current: 0, atRisk: false };
  // Not done today yet: still alive, and lost (or a freeze spent) if today is missed too.
  return { current: state.current, atRisk: true };
}
