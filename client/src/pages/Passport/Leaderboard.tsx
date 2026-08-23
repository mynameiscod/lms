import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { LeaderboardResponse } from '../../api/passportApi';
import PassportShell from './PassportShell';
import './leaderboardRedesign.css';

const Leaderboard: React.FC = () => {
  const nav = useNavigate();
  const [d, setD] = useState<LeaderboardResponse | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    passportApi.getLeaderboard()
      .then(setD)
      .catch(e => setErr(e?.response?.data?.message || 'Could not load the leaderboard'));
  }, []);

  const topThree = useMemo(() => d?.rows.filter(r => r.rank <= 3).slice(0, 3) || [], [d]);

  if (err) return <PassportShell><div className="pm-msg err">{err}</div></PassportShell>;
  if (!d) return <PassportShell><div className="pm-card">Loading leaderboard…</div></PassportShell>;

  const meVisible = d.rows.some(r => r.me);
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'CP';

  return (
    <PassportShell>
      <div className="cplb-page">
        <header className="cplb-head">
          <div className="cplb-title-wrap">
            <div className="cplb-title-icon"><i className="bi bi-trophy-fill" /></div>
            <div>
              <h1>CareerPilot <span>Leaderboard</span></h1>
              <p>Climb the ranks by completing missions, practicing consistently and earning XP.</p>
            </div>
          </div>
          {d.me && (
            <div className="cplb-head-stats">
              <div><span className="ic teal"><i className="bi bi-people-fill" /></span><b>{d.total.toLocaleString('en-IN')}</b><small>Ranked pilots</small></div>
              <div><span className="ic purple"><i className="bi bi-lightning-charge-fill" /></span><b>{d.me.xp.toLocaleString('en-IN')}</b><small>Your XP</small></div>
              <div><span className="ic blue"><i className="bi bi-fire" /></span><b>{d.me.streak}</b><small>Day streak</small></div>
            </div>
          )}
        </header>

        <div className="cplb-note"><i className="bi bi-info-circle" />Leaderboard rank is based on CareerPilot engagement and XP — not your skill, readiness score, or employability.</div>

        <div className="cplb-grid">
          <main className="cplb-main">
            {topThree.length > 0 && (
              <section className="cplb-podium">
                <div className="cplb-confetti" aria-hidden="true">✦ · ✧ · ✦ · ✧ · ✦</div>
                <div className="cplb-podium-row">
                  {[2, 1, 3].map(rank => {
                    const r = topThree.find(x => x.rank === rank);
                    if (!r) return <div className="cplb-podium-slot empty" key={rank} />;
                    return (
                      <div className={`cplb-podium-slot rank-${rank}${r.me ? ' me' : ''}`} key={rank}>
                        <div className="cplb-medal">{medal(rank)}</div>
                        <div className="cplb-avatar">{initials(r.name)}</div>
                        <b>{r.name}{r.me ? ' (you)' : ''}</b>
                        <span>{r.city || 'CareerPilot member'}</span>
                        <strong>{r.xp.toLocaleString('en-IN')} XP</strong>
                        <div className="cplb-podium-base">{rank}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="cplb-board">
              <div className="cplb-board-toolbar">
                <div>
                  <h2>Leaderboard</h2>
                  <p>Current all-time CareerPilot XP ranking</p>
                </div>
                <span className="cplb-scope"><i className="bi bi-globe2" /> All members</span>
              </div>

              {!meVisible && d.me && (
                <div className="cplb-row cplb-me pinned">
                  <div className="rank">#{d.me.rank}</div>
                  <div className="pilot"><span className="avatar">{initials(d.me.name)}</span><div><b>{d.me.name} <em>You</em></b><small>{d.me.city || 'CareerPilot member'}</small></div></div>
                  <div className="streak"><i className="bi bi-fire" /> {d.me.streak} days</div>
                  <div className="xp">{d.me.xp.toLocaleString('en-IN')} XP</div>
                </div>
              )}

              <div className="cplb-table-head"><span>Rank</span><span>Pilot</span><span>Streak</span><span>XP earned</span></div>
              {d.rows.map(r => (
                <div className={`cplb-row${r.me ? ' cplb-me' : ''}`} key={`${r.rank}-${r.name}`}>
                  <div className="rank">{medal(r.rank)}</div>
                  <div className="pilot"><span className="avatar">{initials(r.name)}</span><div><b>{r.name}{r.me && <em>You</em>}</b><small>{r.city || 'CareerPilot member'}</small></div></div>
                  <div className="streak"><i className="bi bi-fire" /> {r.streak} days</div>
                  <div className="xp">{r.xp.toLocaleString('en-IN')} XP</div>
                </div>
              ))}
            </section>

            <div className="cplb-refresh-note"><i className="bi bi-arrow-repeat" />Your position changes as members earn XP. Keep building consistent progress.</div>
          </main>

          <aside className="cplb-side">
            {d.me && (
              <section className="cplb-card snapshot">
                <div className="cplb-card-title"><i className="bi bi-graph-up-arrow" /> Your Snapshot</div>
                <div className="snapshot-grid">
                  <div><small>Your rank</small><b>#{d.me.rank}</b><span>of {d.total.toLocaleString('en-IN')}</span></div>
                  <div><small>Your XP</small><b>{d.me.xp.toLocaleString('en-IN')}</b><span>Total earned</span></div>
                </div>
                <div className="snapshot-bottom">
                  <div><strong>{d.percentile !== null ? `Top ${d.percentile}%` : 'Keep climbing'}</strong><span>{d.percentile !== null ? 'Across CareerPilot members' : 'Earn XP to improve your rank'}</span></div>
                  <div className="mini-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
                </div>
              </section>
            )}

            <section className="cplb-card tips">
              <div className="cplb-card-title"><i className="bi bi-lightbulb-fill" /> Leaderboard Tips</div>
              <Tip icon="bi-bullseye" title="Complete daily missions" sub="Earn XP from meaningful career actions" />
              <Tip icon="bi-code-slash" title="Practice consistently" sub="Build evidence while moving up the ranks" />
              <Tip icon="bi-calendar-check" title="Stay active every week" sub="Consistency compounds over time" />
              <Tip icon="bi-fire" title="Protect your streak" sub="Show up regularly and keep momentum" />
            </section>

            <section className="cplb-reward-card">
              <div><span className="label">KEEP BUILDING</span><h3>Turn progress into achievements.</h3><p>XP shows engagement. Badges and rewards celebrate consistent action.</p><button onClick={() => nav('/careerpilot/rewards')}>View Rewards <i className="bi bi-arrow-right" /></button></div>
              <div className="trophy"><i className="bi bi-trophy-fill" /></div>
            </section>
          </aside>
        </div>
      </div>
    </PassportShell>
  );
};

const Tip: React.FC<{ icon: string; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div className="cplb-tip"><span><i className={`bi ${icon}`} /></span><div><b>{title}</b><small>{sub}</small></div></div>
);

export default Leaderboard;
