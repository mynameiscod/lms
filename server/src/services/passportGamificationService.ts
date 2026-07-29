// Gamification layer for the Passport member dashboard — levels, badges, streak
// calendar, activity series, accuracy and percentile.
//
// HARD RULE: every number here is derived from data we actually store (PassportProgress,
// PassportAttempt, PassportInterview, PassportResume). Nothing is invented to fill a
// tile — where we have no data, the caller gets null/0 and the UI says so.

import { IPassportProgress } from '../models/PassportProgress';

// ── Levels ───────────────────────────────────────────────────────────────────
// Cumulative XP to REACH level n = 50 * n * (n-1).
//   L2 = 100 · L3 = 300 · L5 = 1,000 · L10 = 4,500 · L12 = 6,600 · L20 = 19,000
// Quadratic so early levels come fast (a new member levels up on day one) while the
// top of the ladder stays meaningful.
export const xpToReachLevel = (level: number): number => 50 * level * (level - 1);

const TITLES: { min: number; title: string }[] = [
  { min: 1,  title: 'Career Explorer' },
  { min: 3,  title: 'Rookie Coder' },
  { min: 5,  title: 'Skill Builder' },
  { min: 8,  title: 'Skill Coder' },
  { min: 12, title: 'Code Athlete' },
  { min: 16, title: 'Code Master' },
  { min: 20, title: 'Placement Legend' },
];

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  xpIntoLevel: number;
  xpForThisLevel: number;
  xpToNextLevel: number;
  nextLevel: number;
  nextTitle: string;
  progressPct: number;
}

export function levelFromXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, xp || 0);
  let level = 1;
  while (xpToReachLevel(level + 1) <= safeXp && level < 100) level++;

  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const span = Math.max(1, ceil - floor);
  const into = safeXp - floor;

  const titleFor = (l: number) => [...TITLES].reverse().find(t => l >= t.min)?.title || TITLES[0].title;

  return {
    level,
    title: titleFor(level),
    xp: safeXp,
    xpIntoLevel: into,
    xpForThisLevel: span,
    xpToNextLevel: Math.max(0, ceil - safeXp),
    nextLevel: level + 1,
    nextTitle: titleFor(level + 1),
    progressPct: Math.min(100, Math.round((into / span) * 100)),
  };
}

// ── Dates ────────────────────────────────────────────────────────────────────
const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** XP earned per day for the last `days` days (oldest → newest), from the XP event log. */
export function activitySeries(progress: IPassportProgress, days = 7, now = new Date()) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayKey(new Date(now.getTime() - i * 86400000)), 0);
  }
  for (const e of progress.xpLog || []) {
    const k = dayKey(e.at);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + (e.amount || 0));
  }
  return Array.from(buckets.entries()).map(([date, xp]) => ({
    date,
    xp,
    label: new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  }));
}

/** The last 7 calendar days marked active/inactive — the M T W T F S S streak strip. */
export function streakWeek(progress: IPassportProgress, now = new Date()) {
  const active = new Set<string>();
  for (const e of progress.xpLog || []) active.add(dayKey(e.at));
  // Pre-xpLog members still have mission completions with timestamps; count those too
  // so an existing member's strip isn't blank on the day this ships.
  for (const c of progress.completed || []) if (c.at) active.add(dayKey(c.at));
  for (const p of progress.practice || []) if (p.at) active.add(dayKey(p.at));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000);
    const k = dayKey(d);
    return {
      date: k,
      letter: new Date(k + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }),
      active: active.has(k),
      isToday: k === dayKey(now),
    };
  });
}

/** XP earned today + the day's target (the sum of today's mission XP). */
export function dailyGoal(progress: IPassportProgress, targetXp: number, now = new Date()) {
  const today = dayKey(now);
  const earned = (progress.xpLog || [])
    .filter(e => dayKey(e.at) === today)
    .reduce((s, e) => s + (e.amount || 0), 0);
  const target = Math.max(1, targetXp || 0);
  return { earned, target, pct: Math.min(100, Math.round((earned / target) * 100)), met: earned >= target };
}

// ── Practice accuracy ────────────────────────────────────────────────────────
/** Share of practice attempts that passed. Null when they haven't attempted anything. */
export function accuracy(progress: IPassportProgress): { pct: number; attempts: number } | null {
  const attempts = (progress.practice || []).length;
  if (!attempts) return null;
  const passed = progress.practice.filter(p => p.passed).length;
  return { pct: Math.round((passed / attempts) * 1000) / 10, attempts };
}

/** Problems solved today (first-solve events only). */
export function solvedToday(progress: IPassportProgress, now = new Date()): number {
  const today = dayKey(now);
  return (progress.practice || []).filter(p => p.xp > 0 && dayKey(p.at) === today).length;
}

// ── Coder Score ──────────────────────────────────────────────────────────────
export interface CoderScore {
  score: number;                 // 0–1000
  parts: { label: string; earned: number; max: number }[];
}

/**
 * A 0–1000 composite of everything the member has actually done. Deliberately
 * transparent — the client shows the breakdown, so the number is never a black box.
 *   Assessment 400 · Practice 250 · Missions 200 · Interviews 100 · Resume 50
 */
export function coderScore(input: {
  careerScore: number | null;        // 0–100 from the assessment
  solvedCount: number;
  totalProblems: number;
  completedDays: number;
  totalDays: number;
  interviewsCompleted: number;
  bestInterviewScore: number | null; // 0–100
  resumeScore: number | null;        // 0–100
}): CoderScore {
  const pct = (n: number, d: number) => (d > 0 ? Math.min(1, n / d) : 0);

  const parts = [
    { label: 'Career Readiness Assessment', earned: Math.round(((input.careerScore ?? 0) / 100) * 400), max: 400 },
    { label: 'Practice solved',             earned: Math.round(pct(input.solvedCount, input.totalProblems) * 250), max: 250 },
    { label: 'Daily missions',              earned: Math.round(pct(input.completedDays, input.totalDays) * 200), max: 200 },
    { label: 'Mock interviews',             earned: Math.round((Math.min(1, input.interviewsCompleted / 3) * 0.5 + ((input.bestInterviewScore ?? 0) / 100) * 0.5) * 100), max: 100 },
    { label: 'Resume readiness',            earned: Math.round(((input.resumeScore ?? 0) / 100) * 50), max: 50 },
  ];

  return { score: parts.reduce((s, p) => s + p.earned, 0), parts };
}

// ── Badges ───────────────────────────────────────────────────────────────────
export interface Badge {
  key: string;
  label: string;
  icon: string;
  color: string;
  hint: string;
  earned: boolean;
  progress: number;   // 0–1 toward earning it
}

export function badges(input: {
  solvedCount: number;
  codingSolved: number;
  totalCoding: number;
  streak: number;
  longestStreak: number;
  completedDays: number;
  interviewsCompleted: number;
  resumeScore: number | null;
  careerScore: number | null;
}): Badge[] {
  const mk = (
    key: string, label: string, icon: string, color: string, hint: string,
    have: number, need: number,
  ): Badge => ({
    key, label, icon, color, hint,
    earned: have >= need,
    progress: need > 0 ? Math.min(1, have / need) : 0,
  });

  return [
    mk('problem_solver', 'Problem Solver', '⭐', '#16a34a', 'Solve your first practice problem', input.solvedCount, 1),
    mk('dsa_explorer',   'DSA Explorer',   '🧊', '#2563eb', 'Solve 5 coding problems', input.codingSolved, 5),
    mk('algo_wizard',    'Algo Wizard',    '🪄', '#f59e0b', 'Solve every coding problem', input.codingSolved, Math.max(1, input.totalCoding)),
    mk('speed_demon',    'Speed Demon',    '⚡', '#ef4444', 'Hit a 7-day streak', input.longestStreak, 7),
    mk('consistency',    'Consistency King', '📅', '#8b5cf6', 'Complete 30 mission days', input.completedDays, 30),
    mk('interview_ready','Interview Ready', '🎙️', '#0891b2', 'Finish a mock interview', input.interviewsCompleted, 1),
    mk('ats_ready',      'ATS Ready',      '📄', '#0f766e', 'Score 75+ on your resume', input.resumeScore ?? 0, 75),
    mk('code_master',    'Code Master',    '👑', '#64748b', 'Reach a 30-day streak', input.longestStreak, 30),
  ];
}

// ── Recent activity feed ─────────────────────────────────────────────────────
const SOURCE_META: Record<string, { label: string; icon: string; color: string }> = {
  mission:   { label: 'Completed a daily mission', icon: '✓', color: '#16a34a' },
  practice:  { label: 'Solved a practice problem', icon: '</>', color: '#6d4bd8' },
  interview: { label: 'Finished a mock interview', icon: '🎙', color: '#0891b2' },
  resume:    { label: 'Scored your resume',        icon: '📄', color: '#0f766e' },
  other:     { label: 'Earned XP',                 icon: '★', color: '#f59e0b' },
};

/** Human "3 days ago" without pulling in a date library. */
function agoLabel(then: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(then).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

/** The newest XP events, newest first — drives the activity feed. */
export function recentActivity(progress: IPassportProgress, limit = 6, now = new Date()) {
  return [...(progress.xpLog || [])]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
    .map(e => {
      const meta = SOURCE_META[e.source] || SOURCE_META.other;
      return { label: meta.label, icon: meta.icon, color: meta.color, xp: e.amount, ago: agoLabel(e.at, now) };
    });
}

// ── This-week counters (for the "↑ N this week" deltas) ──────────────────────
export function weeklyStats(progress: IPassportProgress, now = new Date()) {
  const weekAgo = now.getTime() - 7 * 86400000;
  const twoWeeksAgo = now.getTime() - 14 * 86400000;
  const at = (p: any) => new Date(p.at).getTime();

  const all = progress.practice || [];
  const thisWeek = all.filter(p => at(p) >= weekAgo);
  const lastWeek = all.filter(p => at(p) >= twoWeeksAgo && at(p) < weekAgo);

  const pct = (rows: typeof all) =>
    rows.length ? Math.round((rows.filter(r => r.passed).length / rows.length) * 100) : null;

  const nowPct = pct(thisWeek);
  const prevPct = pct(lastWeek);

  return {
    submissions: thisWeek.length,
    solved: thisWeek.filter(p => p.xp > 0).length,
    totalAttempts: all.length,
    accuracyPct: nowPct,
    // Only a real delta when BOTH weeks have attempts — otherwise null, and the UI
    // says nothing rather than implying improvement we can't evidence.
    accuracyDelta: nowPct !== null && prevPct !== null ? nowPct - prevPct : null,
  };
}

/** Percentile among peers by XP: "you are ahead of N% of members". */
export function percentileAhead(myXp: number, allXp: number[]): number | null {
  const others = allXp.filter(x => typeof x === 'number');
  if (others.length < 2) return null;   // meaningless with nobody to compare against
  const below = others.filter(x => x < myXp).length;
  return Math.round((below / others.length) * 100);
}
