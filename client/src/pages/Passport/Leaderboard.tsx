import React, { useEffect, useState } from 'react';
import passportApi, { LeaderboardResponse } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * The full XP leaderboard.
 *
 * This replaces a nav link that pointed at `/careerpilot#leaderboard` — an anchor with no
 * matching element anywhere on the dashboard, so clicking it just reloaded home. It looked
 * like a broken redirect; there was simply nothing to scroll to.
 *
 * The member's own row is pinned at the top when they are outside the visible window, so
 * the page always answers "where am I?" without scrolling.
 */
const Leaderboard: React.FC = () => {
  const [d, setD] = useState<LeaderboardResponse | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getLeaderboard()
      .then(setD)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the leaderboard'));
  }, []);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!d) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  const meVisible = d.rows.some(r => r.me);
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '');

  return (
    <PassportShell>
      <div className="pm-head">
        <h1>Leaderboard</h1>
        <p>Ranked by XP across every CareerPilot member.</p>
      </div>

      {d.me && (
        <div className="lb-me">
          <div><b>#{d.me.rank}</b><span>Your rank</span></div>
          <div><b>{d.me.xp.toLocaleString('en-IN')}</b><span>XP</span></div>
          <div><b>{d.me.streak}</b><span>Streak</span></div>
          {/* A percentile stays meaningful at any cohort size; a raw position stops
              motivating the moment it runs to four figures. */}
          {d.percentile !== null && <div><b>Top {d.percentile}%</b><span>of {d.total}</span></div>}
        </div>
      )}

      <div className="pm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="lb-table">
            <thead>
              <tr><th>#</th><th>Member</th><th>City</th><th>Streak</th><th>XP</th></tr>
            </thead>
            <tbody>
              {/* Pin the member's row above the list when they sit outside the window,
                  so the page answers "where am I?" without scrolling. */}
              {!meVisible && d.me && (
                <tr className="me pinned">
                  <td>{d.me.rank}</td><td>{d.me.name} <em>(you)</em></td>
                  <td>{d.me.city || '—'}</td><td>{d.me.streak}</td><td>{d.me.xp.toLocaleString('en-IN')}</td>
                </tr>
              )}
              {d.rows.map(r => (
                <tr key={r.rank} className={r.me ? 'me' : ''}>
                  <td>{medal(r.rank) || r.rank}</td>
                  <td>{r.name}{r.me && <em> (you)</em>}</td>
                  <td>{r.city || '—'}</td>
                  <td>{r.streak}</td>
                  <td>{r.xp.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PassportShell>
  );
};

export default Leaderboard;
