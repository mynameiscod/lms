import React, { useEffect, useState } from 'react';
import passportApi, { DashboardData } from '../../api/passportApi';
import PassportShell from './PassportShell';

/**
 * Every badge, earned and unearned.
 *
 * Reuses the dashboard payload rather than adding an endpoint: badges are computed from
 * eight different sources (problems solved, streak, roadmap days, interviews, resume
 * score, career score), and a second endpoint would be a second copy of that arithmetic
 * to keep in step. The dashboard already returns them.
 *
 * Unearned badges are shown WITH their progress rather than hidden. A locked badge you
 * can see yourself approaching is the thing that motivates; one you cannot see teaches
 * nothing.
 */
const Achievements: React.FC = () => {
  const [d, setD] = useState<DashboardData | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getDashboard()
      .then(setD)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load your achievements'));
  }, []);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!d) return <PassportShell><div className="pm-card">Loading…</div></PassportShell>;

  const badges = d.badges || [];
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  const card = (b: typeof badges[number]) => (
    <div className={`ac-badge${b.earned ? ' on' : ''}`} key={b.key}>
      <span className="ic" style={b.earned ? { background: b.color } : undefined}>{b.icon}</span>
      <div className="tx">
        <b>{b.label}</b>
        <span>{b.hint}</span>
        {!b.earned && (
          <div className="bar"><i style={{ width: `${Math.round((b.progress || 0) * 100)}%` }} /></div>
        )}
      </div>
      {b.earned && <span className="tick">✓</span>}
    </div>
  );

  return (
    <PassportShell>
      <div className="pm-head">
        <h1>Achievements</h1>
        <p>{earned.length} of {badges.length} unlocked.</p>
      </div>

      {!badges.length && <div className="pm-card">No achievements yet — finish today's missions to start.</div>}

      {!!earned.length && (
        <div className="pm-card">
          <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 12px' }}>Unlocked</h3>
          <div className="ac-grid">{earned.map(card)}</div>
        </div>
      )}

      {!!locked.length && (
        <div className="pm-card">
          <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>Still to earn</h3>
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>How close you are to each one.</p>
          <div className="ac-grid">{locked.map(card)}</div>
        </div>
      )}
    </PassportShell>
  );
};

export default Achievements;
