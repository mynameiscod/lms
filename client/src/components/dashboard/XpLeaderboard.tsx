import React, { useEffect, useState } from 'react';
import './XpLeaderboard.css';

/**
 * Top XP earners, on every dashboard.
 *
 * Shown to students as a motivator and to staff as a prize shortlist. Only active
 * students in active batches are eligible — the check happens server-side on every
 * request rather than being trusted from a cached stats row, because a leaver sitting at
 * the top of a board that decides prizes is worse than no board at all.
 *
 * The viewer's own rank is shown underneath. A top-three list alone tells everyone
 * outside it nothing, which is exactly the group a motivator needs to reach.
 */

const MEDALS = ['🥇', '🥈', '🥉'];

const XpLeaderboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = process.env.REACT_APP_API_URL || '/api/v1';
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const t = localStorage.getItem('token'); if (t) h.Authorization = `Bearer ${t}`;
    const x = localStorage.getItem('tenantId'); if (x) h['X-Tenant-Id'] = x;

    fetch(`${base}/lab-tracks/leaderboard?limit=3`, { headers: h })
      .then(async r => {
        const b = await r.json();
        if (!r.ok || b?.success === false) throw new Error(b?.message || `HTTP ${r.status}`);
        return b;
      })
      .then(b => setData(b?.data || null))
      // Still no error card — a motivational widget must never break the dashboard — but
      // the failure is logged. Swallowing it silently is what hid a 404 from a route
      // ordering bug and made this look like "no data" instead of "broken".
      .catch(e => { console.warn('[XpLeaderboard]', e.message); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;
  if (!data.top?.length) return null;   // nobody has earned XP yet — show nothing

  return (
    <div className="xplb">
      <div className="xplb-head">
        <span className="xplb-title">🏆 Top Performers</span>
        <span className="xplb-sub">by XP earned</span>
      </div>

      <ol className="xplb-list">
        {data.top.map((r: any, i: number) => (
          <li key={r.rank} className={`xplb-row r${r.rank}`}>
            <span className="xplb-medal">{MEDALS[i] || r.rank}</span>
            <span className="xplb-name">{r.name}</span>
            <span className="xplb-meta">
              {r.streak > 0 && <em>{r.streak}d streak</em>}
              <b>{r.xp.toLocaleString()} XP</b>
            </span>
          </li>
        ))}
      </ol>

      {data.me && (
        <div className="xplb-me">
          You are <b>#{data.me.rank}</b> of {data.me.of} · {data.me.xp.toLocaleString()} XP
        </div>
      )}
    </div>
  );
};

export default XpLeaderboard;
