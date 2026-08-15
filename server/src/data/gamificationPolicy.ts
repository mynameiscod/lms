/**
 * GAMIFICATION_V1 — what CareerPilot rewards, and how much.
 *
 * XP IS NOT MONEY, AND IS NOT A CAPABILITY SCORE. It measures engagement: showing up,
 * finishing what the roadmap asked, sitting the assessment. It drives levels, badges and
 * leaderboards, and it is deliberately non-redeemable. Coins are the redeemable currency
 * and already have their own proven engine; the two never convert into one another.
 *
 * NOTHING HERE CAN MOVE A SKILL. No value in this file feeds Skill DNA, readiness or the
 * roadmap planner. A student who farms XP all week is exactly as ready for their target
 * role as they were on Monday, and every screen says so.
 *
 * EVERY NUMBER IS A DEFAULT, NOT A LAW. Admins configure the real values per tenant; these
 * are what applies before anybody has configured anything, chosen to reproduce the behaviour
 * that already shipped rather than to change it.
 *
 * NO AI. Ranks, streaks, badges and budgets are arithmetic.
 */

export const GAMIFICATION_VERSION = 'GAMIFICATION_V1';

/**
 * The events that can earn XP.
 *
 * ONLY EVENTS WITH A TRUSTWORTHY COMPLETION SIGNAL. Each of these is raised by a server-side
 * flow that already proved the thing happened — a mission completion arbitrated by the
 * database, a graded assessment submission. Nothing here can be triggered by a button click
 * alone, which is why "shared to LinkedIn" is absent: there is no way to verify it today, so
 * awarding for it would be paying for a claim.
 */
export interface XpEventDefinition {
  key: string;
  name: string;
  description: string;
  /** What the shipped product already awards, so nothing changes until an admin decides. */
  defaultXp: number;
  /** Most XP this event may contribute in one day. 0 means no cap. */
  defaultDailyLimit: number;
  /** One award per distinct source — a mission, an assessment — however often it is sent. */
  uniqueSource: boolean;
  /** Whether doing this counts as showing up today. */
  streakQualifying: boolean;
}

export const XP_EVENTS: XpEventDefinition[] = [
  {
    key: 'CAREER_MISSION_COMPLETED',
    name: 'Daily roadmap mission completed',
    description: 'One slice of the 90-day roadmap, finished.',
    // The amount Module 10 already awards. Changing it here would silently re-price the
    // product for every existing member.
    defaultXp: 10,
    // Ten missions' worth. The orchestrator caps a day at three, so this only bites if an
    // admin raises that — a ceiling rather than a limit anybody meets.
    defaultDailyLimit: 100,
    uniqueSource: true,
    streakQualifying: true,
  },
  {
    key: 'PERSONALIZED_ASSESSMENT_COMPLETED',
    name: 'Skill assessment completed',
    description: 'A finalised personalised assessment. Awarded for completing it, not for scoring well.',
    defaultXp: 100,
    // One sitting is one award; the cap is belt and braces against a retake loop.
    defaultDailyLimit: 200,
    uniqueSource: true,
    streakQualifying: true,
  },
  {
    key: 'MOCK_INTERVIEW_COMPLETED',
    name: 'Mock interview completed',
    description: 'A finished mock interview, graded from the transcript. Awarded for sitting it, not for scoring well.',
    // Exactly what the interview controller already paid through the legacy XP helper.
    // Routing it through this engine is an idempotency fix, not a re-pricing — a member
    // who finishes an interview tomorrow must earn precisely what they earn today.
    defaultXp: 60,
    // Uncapped, because the shipped behaviour was uncapped. A cap here would quietly take
    // XP away from a member who sat two interviews in a day, which they can do today.
    defaultDailyLimit: 0,
    uniqueSource: true,
    // The legacy call passed bumpStreak = true. Sitting an interview has always counted as
    // showing up, and dropping that would break streaks for members who only interview.
    streakQualifying: true,
  },
];

export const XP_EVENT_KEYS = XP_EVENTS.map(e => e.key);
export const xpEvent = (key: string): XpEventDefinition | undefined =>
  XP_EVENTS.find(e => e.key === key);

/**
 * Why an award was refused. Returned rather than thrown — none of these is an error, and a
 * student completing something twice is a normal Tuesday.
 */
export type XpRefusal = 'disabled' | 'unknown_event' | 'duplicate' | 'daily_cap' | 'zero';

/**
 * Streak milestones, and what reaching one is worth.
 *
 * Central so that a controller never hardcodes "if streak === 7". The bonus is itself an XP
 * award and goes through the same ledger, so it is as auditable as everything else.
 */
export const STREAK_MILESTONES: { days: number; bonusXp: number; badgeKey?: string }[] = [
  { days: 7, bonusXp: 100, badgeKey: 'STREAK_7' },
  { days: 30, bonusXp: 500, badgeKey: 'STREAK_30' },
];

export const streakMilestoneFor = (streak: number) =>
  STREAK_MILESTONES.find(m => m.days === streak);

/**
 * How a badge decides whether it has been earned.
 *
 * Four condition types, each backed by a number this product actually measures. A badge
 * whose metric we cannot compute honestly is not seeded — an achievement that silently never
 * unlocks is worse than one that does not exist.
 */
export type BadgeConditionType =
  | 'XP_TOTAL'
  | 'STREAK'
  | 'EVENT_COUNT'
  | 'ROADMAP_PERCENT';

export interface BadgeSeed {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  conditionType: BadgeConditionType;
  /** Threshold, plus an event key for EVENT_COUNT. */
  conditionConfig: { threshold: number; eventKey?: string };
  displayOrder: number;
}

/**
 * The shipped badge set — small, and every one of them reachable.
 *
 * Bootstrap Icons, which the product already uses; no new icon dependency.
 */
export const BADGE_SEEDS: BadgeSeed[] = [
  {
    key: 'FIRST_MISSION', name: 'First step',
    description: 'Completed your first roadmap mission.',
    iconKey: 'bi-flag-fill', conditionType: 'EVENT_COUNT',
    conditionConfig: { threshold: 1, eventKey: 'CAREER_MISSION_COMPLETED' }, displayOrder: 10,
  },
  {
    key: 'FIRST_ASSESSMENT', name: 'Measured',
    description: 'Completed your first skill assessment.',
    iconKey: 'bi-clipboard-check-fill', conditionType: 'EVENT_COUNT',
    conditionConfig: { threshold: 1, eventKey: 'PERSONALIZED_ASSESSMENT_COMPLETED' }, displayOrder: 20,
  },
  {
    key: 'STREAK_7', name: 'One week strong',
    description: 'Seven days in a row.',
    iconKey: 'bi-fire', conditionType: 'STREAK',
    conditionConfig: { threshold: 7 }, displayOrder: 30,
  },
  {
    key: 'STREAK_30', name: 'Thirty days',
    description: 'A full month without missing.',
    iconKey: 'bi-fire', conditionType: 'STREAK',
    conditionConfig: { threshold: 30 }, displayOrder: 40,
  },
  {
    key: 'XP_1000', name: '1,000 XP',
    description: 'Earned your first thousand experience points.',
    iconKey: 'bi-star-fill', conditionType: 'XP_TOTAL',
    conditionConfig: { threshold: 1000 }, displayOrder: 50,
  },
  {
    key: 'XP_5000', name: '5,000 XP',
    description: 'Five thousand points of consistent work.',
    iconKey: 'bi-stars', conditionType: 'XP_TOTAL',
    conditionConfig: { threshold: 5000 }, displayOrder: 60,
  },
  {
    key: 'ROADMAP_25', name: 'Quarter way',
    description: 'A quarter of your roadmap’s planned time completed.',
    iconKey: 'bi-signpost-2-fill', conditionType: 'ROADMAP_PERCENT',
    conditionConfig: { threshold: 25 }, displayOrder: 70,
  },
  {
    key: 'ROADMAP_50', name: 'Halfway',
    description: 'Half of your roadmap’s planned time completed.',
    iconKey: 'bi-signpost-split-fill', conditionType: 'ROADMAP_PERCENT',
    conditionConfig: { threshold: 50 }, displayOrder: 80,
  },
  {
    key: 'ROADMAP_COMPLETE', name: 'Plan complete',
    description: 'Finished the work your 90-day roadmap planned.',
    iconKey: 'bi-trophy-fill', conditionType: 'ROADMAP_PERCENT',
    conditionConfig: { threshold: 100 }, displayOrder: 90,
  },
];

/** Which badge conditions are worth re-checking after a given kind of event (§130). */
export const BADGE_TRIGGERS: Record<string, BadgeConditionType[]> = {
  XP: ['XP_TOTAL', 'EVENT_COUNT'],
  STREAK: ['STREAK'],
  ROADMAP: ['ROADMAP_PERCENT'],
};

// ── leaderboards ────────────────────────────────────────────────────────────

export type LeaderboardScope = 'COLLEGE' | 'GLOBAL' | 'DISTRICT' | 'STATE';
export type LeaderboardPeriod = 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';

export const LEADERBOARD_SCOPES: LeaderboardScope[] = ['COLLEGE', 'GLOBAL', 'DISTRICT', 'STATE'];
export const LEADERBOARD_PERIODS: LeaderboardPeriod[] = ['WEEKLY', 'MONTHLY', 'ALL_TIME'];

/**
 * Scopes this build can answer truthfully.
 *
 * DISTRICT and STATE are absent from the data, not from the code. There is no district field
 * anywhere in the repository, and state exists only as free text a student typed. Ranking on
 * either would mean inventing a location or fragmenting one place into six spellings, so
 * both report `available: false` and no rank at all — never rank 0, which reads as "last".
 */
export const SUPPORTED_SCOPES: LeaderboardScope[] = ['COLLEGE', 'GLOBAL'];
export const isScopeSupported = (s: string): boolean =>
  SUPPORTED_SCOPES.includes(s as LeaderboardScope);

/** Why a scope cannot be shown, in words a student can act on. */
export const SCOPE_UNAVAILABLE_REASON: Record<string, string> = {
  DISTRICT: 'District ranking needs verified location, which we do not collect yet.',
  STATE: 'State ranking needs verified location, which we do not collect yet.',
  COLLEGE: 'College ranking is available once your account belongs to a college.',
};

export const DEFAULT_TOP_N = 50;
export const MAX_TOP_N = 100;

/** Roles that never appear on a student leaderboard. */
export const LEADERBOARD_EXCLUDED_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF', 'GUEST'];

// ── reward budget ───────────────────────────────────────────────────────────

export type RewardBudgetMode = 'MANUAL' | 'PERCENTAGE';
export const REWARD_BUDGET_MODES: RewardBudgetMode[] = ['MANUAL', 'PERCENTAGE'];

/**
 * Money is handled in PAISE, as integers, end to end.
 *
 * Payment.amount is already paise, and mixing units is how a ₹500 reward becomes ₹50,000.
 * Percentages are basis points for the same reason: 2% is 200, and there is no float in the
 * arithmetic that decides how much a business owes.
 */
export const BASIS_POINTS_DIVISOR = 10000;

/** Reward budget applies to PAID membership revenue only. */
export const REVENUE_PAYMENT_STATUS = 'paid';
export const REVENUE_PAYMENT_PURPOSE = 'passport_membership';

export const budgetFromRevenue = (revenuePaise: number, basisPoints: number): number =>
  Math.floor((Math.max(0, revenuePaise) * Math.max(0, basisPoints)) / BASIS_POINTS_DIVISOR);

/** Rupees for display only. Never used to compute anything. */
export const paiseToRupees = (paise: number): number => Math.round(paise) / 100;
