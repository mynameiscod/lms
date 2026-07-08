// Gamification for the Logical Thinking Lab: XP→level, coins, streaks and badges.

export const levelForXp = (xp: number) => Math.floor((xp || 0) / 500) + 1;

// Badge catalog. `check` runs against a StudentGameStats-shaped object.
export interface BadgeDef { key: string; name: string; icon: string; desc: string; check: (s: any) => boolean; }
export const BADGES: BadgeDef[] = [
  { key: 'first_challenge', name: 'First Challenge', icon: '🌱', desc: 'Solve your first challenge', check: s => s.solvedTotal >= 1 },
  { key: 'streak_10',       name: '10-Day Streak',   icon: '🔥', desc: 'Keep a 10-day streak',      check: s => (s.longestStreak || 0) >= 10 },
  { key: 'solve_50',        name: '50 Problems',     icon: '⭐', desc: 'Solve 50 problems',          check: s => s.solvedTotal >= 50 },
  { key: 'solve_100',       name: '100 Problems',    icon: '💯', desc: 'Solve 100 problems',         check: s => s.solvedTotal >= 100 },
  { key: 'pattern_master',  name: 'Pattern Master',  icon: '🧩', desc: 'Solve 15 pattern problems',  check: s => cat(s, ['Patterns', 'Sequences', 'Visual Logic']) >= 15 },
  { key: 'math_genius',     name: 'Math Genius',     icon: '➗', desc: 'Solve 15 math problems',     check: s => cat(s, ['Arithmetic', 'Number Logic', 'Probability']) >= 15 },
  { key: 'array_ninja',     name: 'Array Ninja',     icon: '🥷', desc: 'Solve 15 array problems',    check: s => cat(s, ['Arrays', 'Strings', 'Hashing']) >= 15 },
  { key: 'recursion_hero',  name: 'Recursion Hero',  icon: '🌀', desc: 'Solve 10 recursion problems',check: s => cat(s, ['Recursion', 'Trees', 'Graphs', 'DP']) >= 10 },
  { key: 'interview_ready', name: 'Interview Ready', icon: '🎯', desc: 'Solve 10 interview problems',check: s => (s.interviewSolves || 0) >= 10 },
  { key: 'logic_champion',  name: 'Logic Champion',  icon: '🏆', desc: 'Reach level 10',             check: s => (s.level || 1) >= 10 },
  { key: 'grand_master',    name: 'Grand Master',    icon: '👑', desc: 'Earn 10,000 XP',             check: s => (s.xpTotal || 0) >= 10000 },
];
const cat = (s: any, keys: string[]) => keys.reduce((n, k) => n + ((s.byCategory && s.byCategory[k]) || 0), 0);

export const coinsForSolve = (xpEarned: number) => Math.max(2, Math.round((xpEarned || 0) / 5));

const ymdMinus1 = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, day); dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// Mutate a StudentGameStats mongoose doc for one solve. Returns newly-earned badges + coins.
export function applySolve(gs: any, opts: {
  xpEarned: number; category: string; difficulty: string; hintsUsed: number; perfect: boolean; dateStr: string;
}): { newBadges: { key: string; name: string; icon: string }[]; coinsEarned: number } {
  const coinsEarned = coinsForSolve(opts.xpEarned);
  gs.xpTotal = (gs.xpTotal || 0) + (opts.xpEarned || 0);
  gs.coins = (gs.coins || 0) + coinsEarned;
  gs.solvedTotal = (gs.solvedTotal || 0) + 1;
  gs.level = levelForXp(gs.xpTotal);
  if (opts.perfect) gs.perfectSolves = (gs.perfectSolves || 0) + 1;
  if (opts.hintsUsed === 0) gs.noHintSolves = (gs.noHintSolves || 0) + 1;
  if (opts.difficulty === 'interview') gs.interviewSolves = (gs.interviewSolves || 0) + 1;

  const bc = { ...(gs.byCategory || {}) };
  bc[opts.category] = (bc[opts.category] || 0) + 1;
  gs.byCategory = bc;
  if (typeof gs.markModified === 'function') gs.markModified('byCategory');

  // Streak (one advance per calendar day)
  if (gs.lastSolvedDate !== opts.dateStr) {
    gs.currentStreak = gs.lastSolvedDate === ymdMinus1(opts.dateStr) ? (gs.currentStreak || 0) + 1 : 1;
    gs.lastSolvedDate = opts.dateStr;
    gs.longestStreak = Math.max(gs.longestStreak || 0, gs.currentStreak);
  }

  return { newBadges: awardBadges(gs), coinsEarned };
}

// Award any badges the student now qualifies for. Mutates gs.badges; returns new ones.
export function awardBadges(gs: any): { key: string; name: string; icon: string }[] {
  const have = new Set((gs.badges || []).map((b: any) => b.key));
  const newBadges: { key: string; name: string; icon: string }[] = [];
  for (const b of BADGES) {
    if (!have.has(b.key) && b.check(gs)) {
      gs.badges = [...(gs.badges || []), { key: b.key, earnedAt: new Date() }];
      newBadges.push({ key: b.key, name: b.name, icon: b.icon });
    }
  }
  return newBadges;
}

// Credit bonus XP (voice explanation, journal, etc.) + coins, re-checking badges.
export function addBonusXp(gs: any, amount: number): { coinsEarned: number; newBadges: { key: string; name: string; icon: string }[] } {
  const coinsEarned = Math.max(1, Math.round(amount / 10));
  gs.xpTotal = (gs.xpTotal || 0) + amount;
  gs.coins = (gs.coins || 0) + coinsEarned;
  gs.level = levelForXp(gs.xpTotal);
  return { coinsEarned, newBadges: awardBadges(gs) };
}

// Badge catalog + which the student has (for the Progress view).
export function badgeStatus(gs: any) {
  const earned = new Map((gs?.badges || []).map((b: any) => [b.key, b.earnedAt]));
  return BADGES.map(b => ({ key: b.key, name: b.name, icon: b.icon, desc: b.desc, earned: earned.has(b.key), earnedAt: earned.get(b.key) || null }));
}
