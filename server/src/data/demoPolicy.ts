/**
 * Demo accounts: who they are, and the four years a demo plan can show.
 *
 * A demo account is an ordinary CareerPilot account that a super admin has given a DEMO PLAN. While
 * it holds one, every gate that makes a student wait (the day ladder, the calendar, attempt limits,
 * cooldowns, interview quotas) is open, and Practice, Thinking Lab, Mock Interview and Question Books
 * show exactly what the plan chose for the year being shown. Nothing a demo does counts in
 * leaderboards, reports or problem statistics.
 *
 * The plan is LINKED, not copied (unlike a trial): editing it before a college visit changes every
 * demo account using it straight away.
 */

/** The years a plan covers, keyed by the stage each one is. */
export const DEMO_YEARS = [
  { key: 'foundation', year: 1, label: 'Year 1' },
  { key: 'build', year: 2, label: 'Year 2' },
  { key: 'specialize', year: 3, label: 'Year 3' },
  { key: 'placement', year: 4, label: 'Year 4' },
] as const;
export type DemoYearKey = typeof DEMO_YEARS[number]['key'];
export const DEMO_YEAR_KEYS: string[] = DEMO_YEARS.map((y) => y.key);

/** The interview rounds a plan may choose from. */
export const DEMO_ROUND_TYPES = ['technical', 'hr', 'communication'] as const;

/** Caps on a plan's lists, so one plan cannot carry a whole bank. */
export const DEMO_MAX_PER_LIST = 200;

/** What one year of a plan shows. Every list is in the order the admin set. */
export interface DemoYearConfig {
  enabled: boolean;
  /** The career track shown for Years 2–4 (careerTrackPolicy key). Empty for Year 1. */
  track: string;
  /** The roadmap day the demo opens on (1 = the first learning day). */
  landingDay: number;
  practiceIds: string[];
  thinkingIds: string[];
  interviewTypes: string[];
  bookIds: string[];
}

export const emptyYear = (): DemoYearConfig => ({
  enabled: false, track: '', landingDay: 1, practiceIds: [], thinkingIds: [], interviewTypes: [], bookIds: [],
});

/**
 * The demo block on a user, as stored on `passport.demo`.
 *
 * `previous` is the membership the account had before the demo, so Full reset can put it back
 * exactly — a fresh sign-up goes back to being a non-member, not a member with a stray flag.
 */
export interface DemoMarker {
  planId: string;
  planName?: string;
  /** The year being shown now: a stage key. */
  year: string;
  by?: string;
  byName?: string;
  at?: Date;
  note?: string;
  previous?: { active: boolean; expiresAt: Date | null; product: string | null; stage: string | null; track: string | null };
}

/** True while this passport holds a demo plan. The one test every demo branch in the server uses. */
export const isDemoPassport = (passport: any): boolean => !!(passport && passport.demo && passport.demo.planId);

/** The year config a demo account is on now, or null when it is not a demo or the year is off. */
export const demoYearOf = (plan: any, year: string): DemoYearConfig | null => {
  const y = plan?.years?.[year];
  return y && y.enabled ? y : null;
};
