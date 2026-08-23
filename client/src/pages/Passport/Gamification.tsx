import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, {
  GamificationSummary, ScopedLeaderboardResponse, ScopedLeaderboardRow,
} from '../../api/passportApi';
import './gamification.css';

const PERIODS = [
  { key: 'ALL_TIME', label: 'All time' },
  { key: 'MONTHLY', label: 'This month' },
  { key: 'WEEKLY', label: 'This week' },
];

const SCOPES = [
  { key: 'COLLEGE', label: 'My college' },
  { key: 'GLOBAL', label: 'Global' },
];

const RANK_LABEL: Record<string, string> = {
  college: 'College', global: 'Global', district: 'District', state: 'State',
};

const Gamification: React.FC = () => {
  const nav = useNavigate();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [board, setBoard] = useState<ScopedLeaderboardResponse | null>(null);
  const [scope, setScope] = useState('COLLEGE');
  const [period, setPeriod] = useState('ALL_TIME');
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    passportApi.getMyGamification()
      .then(setSummary)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const loadBoard = useCallback(async () => {
    setBoardLoading(true);
    try { setBoard(await passportApi.getMyLeaderboard(scope, period)); }
    catch { setBoard(null); }
    setBoardLoading(false);
  }, [scope, period]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const earned = summary?.badges.filter(b => b.earned) || [];
  const locked = summary?.badges.filter(b => !b.earned) || [];
  const shownBadges = showAllBadges ? [...earned, ...locked] : [...earned, ...locked].slice(0, 6);
  const nextMilestone = summary && [7, 21, 30, 100].find(d => d > summary.streak);
  const levelProgress = Math.max(0, Math.min(100, summary?.level?.pct ?? 0));
  const collegeRank = summary?.ranks?.college;
  const globalRank = summary?.ranks?.global;

  const milestonePct = useMemo(() => {
    if (!summary || !nextMilestone) return 100;
    const previous = [0, 7, 21, 30].reverse().find(d => d <= summary.streak) || 0;
    return Math.max(0, Math.min(100, Math.round(((summary.streak - previous) / (nextMilestone - previous)) * 100)));
  }, [summary, nextMilestone]);

  if (loading) return <div className="gam"><div className="gam-load">Loading your progress…</div></div>;

  return (
    <div className="gam">
      <div className="gam-hd">
        <div>
          <span className="gam-eyebrow"><i /> Career gamification</span>
          <h1>Your Progress & Rewards</h1>
          <p>Track consistency, XP, streaks, badges and your place in the CareerPilot community. These signals show engagement — your actual ability is measured separately through Skill DNA and readiness.</p>
        </div>
        <div className="gam-info"><i className="bi bi-info-circle" /> XP measures activity and consistency. It is not a skill score or monetary value.</div>
      </div>

      {summary && (
        <>
          <div className="gam-hero-grid">
            <section className="gam-level-card">
              <div className="gam-level-copy">
                <span className="gam-level-chip"><i className="bi bi-stars" /> LEVEL {summary.level?.level ?? 1} · {summary.level?.title || 'Career Builder'}</span>
                <h2>Keep building momentum.</h2>
                <p>You are making steady progress through your CareerPilot journey. Complete meaningful actions to move toward your next level.</p>
                <div className="gam-xp">{summary.xp.toLocaleString()} <small>XP</small></div>
                <div className="gam-level-progress"><span style={{ width: `${levelProgress}%` }} /></div>
                <div className="gam-level-meta">
                  <span>{levelProgress}% through this level</span>
                  <span>Next: Level {summary.level?.nextLevel ?? ((summary.level?.level ?? 1) + 1)} · {summary.level?.nextTitle || 'Next level'}</span>
                </div>
              </div>
              <div className="gam-level-orb"><i className="bi bi-award-fill" /><span>{summary.level?.title || 'Career Builder'}</span></div>
            </section>

            <div className="gam-summary-grid">
              <div className="gam-metric"><span className="gam-mi orange"><i className="bi bi-fire" /></span><small>Current streak</small><b>{summary.streak} days</b><em>Longest: {summary.longestStreak}</em></div>
              <div className="gam-metric"><span className="gam-mi teal"><i className="bi bi-patch-check" /></span><small>Badges earned</small><b>{earned.length} / {summary.badges.length}</b><em>{locked.length} more to unlock</em></div>
              <div className="gam-metric"><span className="gam-mi blue"><i className="bi bi-trophy" /></span><small>College rank</small><b>{collegeRank?.available && collegeRank.rank ? `#${collegeRank.rank.toLocaleString()}` : '—'}</b><em>{collegeRank?.available && collegeRank.participants ? `of ${collegeRank.participants.toLocaleString()}` : 'Not available'}</em></div>
              <div className="gam-metric"><span className="gam-mi purple"><i className="bi bi-globe2" /></span><small>Global rank</small><b>{globalRank?.available && globalRank.rank ? `#${globalRank.rank.toLocaleString()}` : '—'}</b><em>{globalRank?.available && globalRank.participants ? `${globalRank.participants.toLocaleString()} participants` : 'Not available'}</em></div>
            </div>
          </div>

          {nextMilestone && (
            <section className="gam-milestone">
              <div><h3><i className="bi bi-fire" /> {nextMilestone - summary.streak} more day{nextMilestone - summary.streak === 1 ? '' : 's'} to your {nextMilestone}-day consistency milestone</h3><p>Milestones celebrate showing up consistently — not being “better” than someone else.</p></div>
              <div className="gam-mile-wrap"><div className="gam-mile-bar"><span style={{ width: `${milestonePct}%` }} /></div><small>{summary.streak} / {nextMilestone} days</small></div>
            </section>
          )}

          <div className="gam-main-grid">
            <section className="gam-card">
              <div className="gam-card-hd"><div><h3>Your Ranking</h3><span>Only verified scopes are shown</span></div></div>
              <div className="gam-ranks">
                {Object.entries(summary.ranks || {}).map(([key, r]) => (
                  <div className={`gam-rank${r.available ? '' : ' off'}`} key={key}>
                    <span>{RANK_LABEL[key] || key}</span>
                    <b>{r.available && r.rank ? `#${r.rank.toLocaleString()}` : '—'}</b>
                    <em>{r.available && r.participants ? `of ${r.participants.toLocaleString()}` : 'Not available'}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="gam-card">
              <div className="gam-card-hd"><div><h3>Achievements</h3><span>{earned.length} of {summary.badges.length} badges earned</span></div>{summary.badges.length > 6 && <button onClick={() => setShowAllBadges(v => !v)}>{showAllBadges ? 'Show fewer' : 'View all'} <i className="bi bi-arrow-right" /></button>}</div>
              {shownBadges.length ? <div className="gam-badges">{shownBadges.map(b => <div className={`gam-badge${b.earned ? ' on' : ' locked'}`} key={b.key} title={b.description}><span><i className={`bi ${b.earned ? b.iconKey : 'bi-lock-fill'}`} /></span><b>{b.name}</b><em>{b.earned ? 'Earned' : 'Locked'}</em></div>)}</div> : <div className="gam-empty">Complete your first mission to earn your first badge.</div>}
            </section>

            <section className="gam-card gam-board">
              <div className="gam-board-top">
                <div><h3>Leaderboard</h3><span>Rank is based only on CareerPilot XP activity</span></div>
                <div className="gam-tabs">{SCOPES.map(s => <button key={s.key} className={scope === s.key ? 'on' : ''} onClick={() => setScope(s.key)}>{s.label}</button>)}</div>
              </div>
              <div className="gam-tabs gam-periods">{PERIODS.map(p => <button key={p.key} className={period === p.key ? 'on' : ''} onClick={() => setPeriod(p.key)}>{p.label}</button>)}</div>

              {boardLoading ? <div className="gam-load">Loading leaderboard…</div> : !board ? <div className="gam-empty">Could not load the leaderboard.</div> : !board.available ? <div className="gam-note warn">{(board as { reason: string }).reason}</div> : (
                <>
                  <div className="gam-mine"><span>{board.myRank ? <>You are currently <b>#{board.myRank.toLocaleString()}</b> of {board.participantCount.toLocaleString()}</> : <>Earn some XP to join this leaderboard</>}</span><b>{board.myXp.toLocaleString()} XP</b></div>
                  <div className="gam-rows">
                    {board.entries.map((r: ScopedLeaderboardRow) => (
                      <div className={`gam-row${r.me ? ' me' : ''}`} key={r.studentId}>
                        <span className="gam-rn">#{r.rank}</span>
                        <span className="gam-avatar">{(r.name?.[0] || '?').toUpperCase()}</span>
                        <div className="gam-who"><b>{r.name}{r.me ? ' (you)' : ''}</b>{r.college && <em>{r.college}</em>}</div>
                        <span className="gam-row-xp">{r.xp.toLocaleString()} XP</span>
                      </div>
                    ))}
                    {!board.entries.length && <div className="gam-empty">Nobody has earned XP here yet.</div>}
                  </div>
                </>
              )}
              <div className="gam-footnote">Leaderboard position reflects CareerPilot engagement. It does not represent your skill level, interview readiness, placement probability, or employability.</div>
            </section>
          </div>

          <div className="gam-actions">
            <button onClick={() => nav('/careerpilot/missions')}><span><i className="bi bi-bullseye" /></span><div><b>Complete today's missions</b><em>Earn XP through meaningful career actions</em></div><i className="bi bi-arrow-right" /></button>
            <button onClick={() => nav('/careerpilot/practice')}><span><i className="bi bi-code-square" /></span><div><b>Practice & improve</b><em>Build skill evidence through focused practice</em></div><i className="bi bi-arrow-right" /></button>
            <button onClick={() => nav('/careerpilot/achievements')}><span><i className="bi bi-award" /></span><div><b>Unlock your next badge</b><em>See the milestones you are closest to reaching</em></div><i className="bi bi-arrow-right" /></button>
          </div>
        </>
      )}
    </div>
  );
};

export default Gamification;
