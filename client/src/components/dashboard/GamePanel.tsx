import React, { useEffect, useState } from 'react';
import './GamePanel.css';

/**
 * Gamification header for the student dashboard: level, XP progress, streak, rank.
 *
 * Everything shown is real — XP, level, streak and badge count come from the student's
 * own StudentGameStats, and the rank comes from the same leaderboard the top-performers
 * board uses. Nothing is padded to make the panel look fuller: a student who has earned
 * nothing sees zeros, because a fake level is noticed the moment it fails to move.
 */

const base = () => process.env.REACT_APP_API_URL || '/api/v1';
const headers = () => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('token'); if (t) h.Authorization = `Bearer ${t}`;
  const x = localStorage.getItem('tenantId'); if (x) h['X-Tenant-Id'] = x;
  return h;
};

/** Level titles. Kept here so the label is reproducible rather than invented per render. */
const TITLES = ['Beginner', 'Explorer', 'Code Explorer', 'Problem Solver', 'Analyst', 'Strategist', 'Master'];
const titleFor = (lvl: number) => TITLES[Math.min(Math.max(lvl - 1, 0), TITLES.length - 1)];

/** XP needed to reach a level. Matches the server's own progression: 250 XP per level. */
const XP_PER_LEVEL = 250;
const levelFloor = (lvl: number) => (lvl - 1) * XP_PER_LEVEL;
const levelCeil = (lvl: number) => lvl * XP_PER_LEVEL;

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const GamePanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${base()}/thinking-lab/stats`, { headers: headers() })
        .then(r => r.ok ? r.json() : null).catch(e => { console.warn('[GamePanel] stats', e.message); return null; }),
      fetch(`${base()}/lab-tracks/leaderboard?limit=3`, { headers: headers() })
        .then(r => r.ok ? r.json() : null).catch(e => { console.warn('[GamePanel] board', e.message); return null; }),
    ]).then(([s, b]) => {
      setStats(s || null);
      setBoard(b?.data || null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const xp = stats?.xpTotal ?? 0;
  const level = stats?.level ?? 1;
  const streak = stats?.streak ?? 0;
  const longest = stats?.longestStreak ?? 0;
  const badges = stats?.badgeCount ?? 0;
  const rank = board?.me?.rank ?? null;
  const of = board?.me?.of ?? null;

  const floor = levelFloor(level);
  const ceil = levelCeil(level);
  const into = Math.max(0, xp - floor);
  const need = Math.max(1, ceil - floor);
  const pct = Math.min(100, Math.round((into / need) * 100));

  // The last 7 days, today last — the strip reads left-to-right towards now.
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { letter: DAY_LETTERS[d.getDay()], date: d.getDate(), isToday: i === 6 };
  });
  // Only the streak length is known, not which specific days — so mark the trailing
  // `streak` days rather than inventing a per-day history the server never stored.
  const litFrom = Math.max(0, 7 - streak);

  return (
    <div className="gp">
      <div className="gp-level">
        <div className="gp-mascot" aria-hidden>🤖</div>
        <div className="gp-level-body">
          <div className="gp-level-title">Level {level} · {titleFor(level)}</div>
          <div className="gp-level-bar"><div style={{ width: `${pct}%` }} /></div>
          <div className="gp-level-note">
            {xp.toLocaleString()} XP · {Math.max(0, ceil - xp).toLocaleString()} XP to Level {level + 1}
          </div>
        </div>
      </div>

      <div className="gp-stats">
        <div className="gp-stat"><span className="gp-ic">🔥</span><b>{streak}</b><small>Day Streak</small></div>
        <div className="gp-stat">
          <span className="gp-ic">🏆</span>
          <b>{rank ? `#${rank}` : '—'}</b>
          <small>{rank ? `Rank of ${of}` : 'Unranked'}</small>
        </div>
        <div className="gp-stat"><span className="gp-ic">⚡</span><b>{xp.toLocaleString()}</b><small>XP Earned</small></div>
        <div className="gp-stat"><span className="gp-ic">🎖️</span><b>{badges}</b><small>Badges</small></div>
      </div>

      <div className="gp-streak">
        <div className="gp-streak-head">
          <span>🔥 {streak} Day Streak</span>
          {longest > 0 && <small>Best: {longest} days</small>}
        </div>
        <div className="gp-week">
          {week.map((d, i) => (
            <div key={i} className={`gp-day ${i >= litFrom && streak > 0 ? 'on' : ''} ${d.isToday ? 'today' : ''}`}>
              <span className="gp-day-l">{d.letter}</span>
              <span className="gp-day-d">{i >= litFrom && streak > 0 ? '✓' : d.date}</span>
            </div>
          ))}
        </div>
        {streak === 0 && <p className="gp-streak-empty">No streak yet — solve today's challenge to start one.</p>}
      </div>
    </div>
  );
};

export default GamePanel;
