import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, Badge } from '../../api/passportApi';
import './dashboard.css';

/**
 * The gamified Passport member home — a game board, not a task list.
 *
 * Every figure on this screen is derived from data we actually store (assessment
 * attempt, PassportProgress, interviews, resume, tech battles). Where a member has
 * no data yet the tile shows an empty state instead of a placeholder number.
 * Charts are hand-rolled SVG so this adds no dependency and no bundle weight.
 */

// ── SVG bits ────────────────────────────────────────────────────────────────
const Ring: React.FC<{ value: number; max: number; size?: number }> = ({ value, max, size = 190 }) => {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="gd-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f7" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c6cf0" /><stop offset="100%" stopColor="#6d4bd8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="mid"><div><b>{value}</b><span>/{max}</span></div></div>
    </div>
  );
};

const Radar: React.FC<{ skills: { label: string; score: number }[] }> = ({ skills }) => {
  const size = 290, cx = size / 2, cy = size / 2 + 6, R = 92;
  const n = skills.length;
  if (n < 3) return <div className="gd-chart-empty">Not enough category data to draw your skill meter.</div>;

  const pt = (i: number, dist: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * dist, cy + Math.sin(a) * dist];
  };
  const poly = (dist: (i: number) => number) =>
    skills.map((_, i) => pt(i, dist(i)).join(',')).join(' ');

  return (
    <svg className="gd-radar" width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={poly(() => R * f)} fill="none" stroke="#eef0f7" strokeWidth={1} />
      ))}
      {skills.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#eef0f7" strokeWidth={1} />;
      })}
      <polygon points={poly(i => R * Math.max(0.02, (skills[i].score || 0) / 100))} fill="rgba(124,108,240,.42)" stroke="#6d4bd8" strokeWidth={2} />
      {skills.map((s, i) => {
        const [x, y] = pt(i, R * Math.max(0.02, (s.score || 0) / 100));
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#6d4bd8" />;
      })}
      {skills.map((s, i) => {
        const [x, y] = pt(i, R + 30);
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <g key={s.label}>
            <text x={x} y={y - 5} textAnchor={anchor}>{s.label}</text>
            <text x={x} y={y + 8} textAnchor={anchor} className="v">{s.score}</text>
          </g>
        );
      })}
    </svg>
  );
};

const AreaChart: React.FC<{ points: { label: string; xp: number }[] }> = ({ points }) => {
  const w = 560, h = 190, padL = 32, padB = 26, padT = 12;
  const max = Math.max(50, ...points.map(p => p.xp));
  const stepX = (w - padL - 10) / Math.max(1, points.length - 1);
  const y = (v: number) => padT + (1 - v / max) * (h - padT - padB);
  const xs = points.map((_, i) => padL + i * stepX);
  const line = points.map((p, i) => `${xs[i]},${y(p.xp)}`).join(' ');

  return (
    <svg className="gd-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" height={h}>
      {[0, 0.5, 1].map(f => (
        <g key={f}>
          <line x1={padL} x2={w - 6} y1={y(max * f)} y2={y(max * f)} stroke="#f1f2f8" strokeWidth={1} />
          <text x={4} y={y(max * f) + 4}>{Math.round(max * f)}</text>
        </g>
      ))}
      <polygon points={`${padL},${h - padB} ${line} ${xs[xs.length - 1]},${h - padB}`} fill="rgba(124,108,240,.14)" />
      <polyline points={line} fill="none" stroke="#6d4bd8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={xs[i]} cy={y(p.xp)} r={4} fill="#6d4bd8" />)}
      {points.map((p, i) => <text key={p.label + i} x={xs[i]} y={h - 7} textAnchor="middle">{p.label}</text>)}
    </svg>
  );
};

const CAT_ICON: Record<string, string> = {
  career_clarity: '🎯', aptitude: '🔢', logical_reasoning: '🧩',
  technical: '💻', communication: '🗣️', employability: '💼',
};

interface Props {
  /** Loaded by PassportHome, which also decides whether the member sees this at all. */
  data: DashboardData;
  reload: () => void;
}

const Dashboard: React.FC<Props> = ({ data, reload }) => {
  const nav = useNavigate();
  const [d, setD] = useState<DashboardData>(data);

  useEffect(() => { setD(data); }, [data]);

  // An action completed in another tab should be reflected on return.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const toggleMission = async (key: string) => {
    setD(p => ({ ...p, missions: p.missions?.map(m => m.key === key ? { ...m, done: true } : m) }));
    try { await passportApi.completeMission(key); } finally { reload(); }
  };

  // Share + profile now live in MemberShell, which every member page mounts.
  const firstName = d.firstName || 'there';
  const hoursLeft = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const mins = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
    return `${Math.floor(mins / 60)}h : ${String(mins % 60).padStart(2, '0')}m left`;
  }, []);

  const st = d.stats!;
  const lv = d.level!;
  const goal = d.dailyGoal!;
  const doneCount = (d.missions || []).filter(m => m.done).length;
  const totalMissions = (d.missions || []).length;
  const hasActivity = (d.activity || []).some(a => a.xp > 0);

  return (
    <>

        {/* Coder score · skill radar · coding stats */}
        <div className="gd-grid gd-3">
          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Coder Score <span className="gd-help" title="A 0–1000 composite of your assessment, practice, missions, interviews and resume. The breakdown below shows exactly where it comes from.">?</span></h2>
            </div>
            <div className="gd-score">
              <Ring value={d.coderScore!.score} max={1000} size={168} />
              <div className="gd-score-side">
                <span className="gd-tag">{d.coderScore!.score >= 750 ? 'Excellent ⭐' : d.coderScore!.score >= 500 ? 'On track 👍' : 'Just getting started 🌱'}</span>
                <p>
                  {d.percentileAhead !== null && d.percentileAhead !== undefined
                    ? <>You are ahead of <b>{d.percentileAhead}%</b> of CareerPilot members.</>
                    : <>Rankings appear once more members join your cohort.</>}
                </p>
                <div className="gd-parts-hd">Where your score comes from</div>
                <div className="gd-parts">
                  {d.coderScore!.parts.map(p => {
                    const pct = Math.round((p.earned / p.max) * 100);
                    return (
                      <div className="gd-part" key={p.label}>
                        <span className="t">{p.label}</span>
                        <span className="b"><i style={{ width: `${pct}%` }} /></span>
                        <span className="v">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="gd-rank">
                  ⭐ Earn {lv.xpToNextLevel.toLocaleString()} XP to reach Level {lv.nextLevel}
                </div>
              </div>
            </div>
          </div>

          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Skill Meter <span className="gd-help" title="Your six Career Readiness Assessment categories. Retake the assessment to move these.">?</span></h2>
              <button className="lnk" onClick={() => nav('/careerpilot/assessment')}>View full report →</button>
            </div>
            <div className="gd-skill-wrap"><Radar skills={d.skills || []} /></div>
          </div>

          {/* Your Coding Stats — every row from stored data; no rating/global rank,
              because Passport has neither and inventing them would be a lie. */}
          <div className="gd-card">
            <div className="gd-card-hd"><h2>Your Coding Stats</h2></div>
            <div className="gd-statlist">
              <div className="gd-statrow">
                <span className="ic" style={{ background: '#f1eeff', color: '#6d4bd8' }}>◎</span>
                <span className="t">Problems Solved</span>
                <span className="v">{st.solved}<small> / {st.totalProblems}</small></span>
              </div>
              <div className="gd-statrow">
                <span className="ic" style={{ background: '#e6f2ff', color: '#0369a1' }}>↻</span>
                <span className="t">Total Attempts</span>
                <span className="v">{d.weekly?.totalAttempts ?? 0}</span>
              </div>
              <div className="gd-statrow">
                <span className="ic" style={{ background: '#e7f8ef', color: '#16a34a' }}>◉</span>
                <span className="t">Accuracy</span>
                <span className="v">{st.accuracy ? `${st.accuracy.pct}%` : '—'}</span>
              </div>
              <div className="gd-statrow">
                <span className="ic" style={{ background: '#fff3e0', color: '#b45309' }}>✦</span>
                <span className="t">Missions Done</span>
                <span className="v">{st.completedDays}<small> / {st.totalDays}</small></span>
              </div>
              <div className="gd-statrow">
                <span className="ic" style={{ background: '#fdeaea', color: '#b91c1c' }}>▲</span>
                <span className="t">Cohort Rank</span>
                <span className="v">{st.cohortRank ? `#${st.cohortRank}` : '—'}<small>{st.cohortSize > 1 ? ` of ${st.cohortSize}` : ''}</small></span>
              </div>
              <div className="gd-statrow">
                <span className="ic" style={{ background: '#eef0f7', color: '#475569' }}>◷</span>
                <span className="t">Journey Day</span>
                <span className="v">{st.day}<small> / {st.totalDays}</small></span>
              </div>
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="gd-tiles" style={{ marginTop: 16 }}>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#f1eeff' }}>{'</>'}</span>
            <div>
              <div className="lbl">Problems Solved</div>
              <div className="val">{st.solved}<span style={{ fontSize: 13, color: '#a3aab8', fontWeight: 700 }}> / {st.totalProblems}</span></div>
              <div className="gd-tile-bar">
                <span className="tr"><i style={{ width: `${st.totalProblems ? Math.max((st.solved / st.totalProblems) * 100, 2) : 0}%` }} /></span>
                <em>{st.totalProblems ? Math.round((st.solved / st.totalProblems) * 1000) / 10 : 0}%</em>
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#fff3e0' }}>📤</span>
            <div>
              <div className="lbl">Weekly Submissions</div>
              <div className="val">{d.weekly?.submissions ?? 0}</div>
              <div className="sub" style={{ color: (d.weekly?.solved ?? 0) > 0 ? '#16a34a' : '#a3aab8' }}>
                {(d.weekly?.solved ?? 0) > 0 ? `▲ ${d.weekly!.solved} solved this week` : 'None this week'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#e6f2ff' }}>🎯</span>
            <div>
              <div className="lbl">Practice Accuracy</div>
              <div className="val">{st.accuracy ? `${st.accuracy.pct}%` : '—'}</div>
              {/* A delta needs BOTH weeks to have attempts, else we say nothing */}
              <div className="sub" style={{ color: (d.weekly?.accuracyDelta ?? 0) > 0 ? '#16a34a' : (d.weekly?.accuracyDelta ?? 0) < 0 ? '#b91c1c' : '#a3aab8' }}>
                {d.weekly?.accuracyDelta != null
                  ? `${d.weekly.accuracyDelta > 0 ? '▲' : d.weekly.accuracyDelta < 0 ? '▼' : '—'} ${Math.abs(d.weekly.accuracyDelta)}% vs last week`
                  : st.accuracy ? `over ${st.accuracy.attempts} attempts` : 'Solve one to see this'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#fef3c7' }}>🏆</span>
            <div>
              <div className="lbl">Best Streak</div>
              <div className="val">{st.longestStreak} {st.longestStreak === 1 ? 'Day' : 'Days'}</div>
              <div className="sub" style={{ color: '#f59e0b' }}>
                {st.streak >= st.longestStreak && st.streak > 0 ? 'Personal best — keep it!' : 'Beat your record'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#f3eaff' }}>🎙️</span>
            <div>
              <div className="lbl">Mock Interviews</div>
              <div className="val">{st.interviews}</div>
              <div className="sub" style={{ color: '#a3aab8' }}>
                {st.bestInterview !== null ? `Best ${st.bestInterview}%` : 'Not attempted yet'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#fff3e0' }}>⚡</span>
            <div>
              <div className="lbl">XP Earned Today</div>
              <div className="val">{goal.earned} XP</div>
              <div className="sub" style={{ color: goal.met ? '#16a34a' : '#a3aab8' }}>
                {goal.met ? 'Goal reached!' : `${Math.max(0, goal.target - goal.earned)} to your goal`}
              </div>
            </div>
          </div>
        </div>

        {/* Missions + streak */}
        <div className="gd-grid gd-2b" style={{ marginTop: 16 }}>
          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Today's Mission</h2>
              <span className="gd-timer">⏱ {hoursLeft}</span>
            </div>
            <div className="gd-reward" style={{ marginBottom: 6 }}>
              Complete all missions to earn
              <span className="chip">+{(d.missions || []).reduce((s, m) => s + m.xp, 0)} XP</span>
            </div>

            {!totalMissions ? (
              <div className="gd-chart-empty">No missions generated for today.</div>
            ) : (
              <>
                {(d.missions || []).map(m => (
                  <div className={`gd-mission${m.done ? ' done' : ''}`} key={m.key}>
                    <span className="badge" style={{ background: m.done ? '#dcfce7' : '#f1eeff' }}>{CAT_ICON[m.category] || '•'}</span>
                    <div className="txt">
                      <b>{m.title}</b>
                      <span>{m.detail}</span>
                    </div>
                    {m.link && !m.done && <button className="lnk" style={{ background: 'none', border: 'none', color: '#6d4bd8', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }} onClick={() => nav(m.link!)}>Open →</button>}
                    <span className="cnt">+{m.xp}</span>
                    <button className={`gd-check${m.done ? ' on' : ''}`} disabled={m.done} onClick={() => toggleMission(m.key)}>
                      {m.done ? '✓' : ''}
                    </button>
                  </div>
                ))}
                <button className="gd-mission-cta" onClick={() => nav(d.missions?.find(m => !m.done)?.link || '/careerpilot/practice')}>
                  {d.allDone ? 'All done today — practice anyway →' : 'Start Now →'}
                </button>
              </>
            )}
          </div>

          <div>
            <div className="gd-card">
              <div className="gd-card-hd"><h2>🔥 Streak</h2></div>
              <div className="gd-streak-num">{st.streak}<small>days in a row</small></div>
              <div className="gd-week">
                {(d.streakWeek || []).map(w => (
                  <div key={w.date}>
                    <div className={`dot${w.active ? ' on' : ''}`}>{w.active ? '🔥' : ''}</div>
                    <div className={`l${w.isToday ? ' today' : ''}`}>{w.letter}</div>
                  </div>
                ))}
              </div>
              <div className="gd-milestone">
                <div className="t">
                  <b>{st.streak < 7 ? '7' : st.streak < 21 ? '21' : st.streak < 30 ? '30' : '100'} day streak</b>
                  <span>
                    {(() => {
                      const togo = (st.streak < 7 ? 7 : st.streak < 21 ? 21 : st.streak < 30 ? 30 : 100) - st.streak;
                      return `Keep it up! ${togo} ${togo === 1 ? 'day' : 'days'} to go`;
                    })()}
                  </span>
                </div>
                <span style={{ fontSize: 26 }}>🎁</span>
              </div>
            </div>

            <div className="gd-card" style={{ marginTop: 16 }}>
              <div className="gd-card-hd"><h2>Next Level Reward</h2></div>
              <div className="gd-next">
                <div className="info">
                  <div className="lv">Level {lv.nextLevel}<span>{lv.xpIntoLevel} / {lv.xpForThisLevel} XP</span></div>
                  <div className="bar"><i style={{ width: `${lv.progressPct}%` }} /></div>
                  <div className="unlock">You will unlock<b>🏅 {lv.nextTitle}</b></div>
                </div>
                <span className="medal">🏅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity + badges */}
        <div className="gd-grid gd-2b" style={{ marginTop: 16 }}>
          {/* Activity feed from the XP event log, with the 7-day trend underneath */}
          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Recent Activity</h2>
              <span className="gd-timer">
                {d.weekly && d.weekly.xpLastWeek > 0 && (
                  <b style={{ color: d.weekly.xpDelta >= 0 ? '#16a34a' : '#b91c1c', marginRight: 8 }}>
                    {d.weekly.xpDelta >= 0 ? '+' : ''}{d.weekly.xpDelta} XP vs last week
                  </b>
                )}
                Last 7 days
              </span>
            </div>
            {!d.recentActivity?.length ? (
              <div className="gd-chart-empty">Nothing yet.<br />Complete a mission or solve a problem and it appears here.</div>
            ) : (
              <>
                <div className="gd-feed">
                  {d.recentActivity.map((a, i) => (
                    <div className="gd-feed-row" key={i}>
                      <span className="ic" style={{ background: `${a.color}1f`, color: a.color }}>{a.icon}</span>
                      <span className="t">{a.label}</span>
                      <span className="xp">+{a.xp} XP</span>
                      <span className="ago">{a.ago}</span>
                    </div>
                  ))}
                </div>
                {hasActivity && <div className="gd-feed-chart"><AreaChart points={d.activity || []} /></div>}
              </>
            )}
          </div>

          <div className="gd-card">
            <div className="gd-card-hd" id="badges">
              <h2>Badge Collection</h2>
              <button className="lnk" onClick={() => nav('/careerpilot/roadmap')}>View all →</button>
            </div>
            <div className="gd-badges">
              {(d.badges || []).slice(0, 5).map((b: Badge) => (
                <div className={`gd-badge${b.earned ? '' : ' locked'}`} key={b.key} title={b.hint}>
                  <div className="hex" style={{ background: `${b.color}1f` }}>{b.earned ? b.icon : '🔒'}</div>
                  <b>{b.label}</b>
                  {b.earned ? <span>Earned</span> : (
                    <>
                      <span>{Math.round(b.progress * 100)}%</span>
                      <div className="pbar"><i style={{ width: `${Math.round(b.progress * 100)}%` }} /></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contests + leaderboard */}
        <div className="gd-grid gd-2b" style={{ marginTop: 16 }}>
          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Upcoming Contests</h2>
              {!!d.contests?.length && <button className="lnk" onClick={() => nav('/battles')}>View All →</button>}
            </div>
            {!d.contests?.length ? (
              <div className="gd-empty-state">
                <span className="em">🗓️</span>
                <b>No contests scheduled right now.</b>
                <span>You'll see upcoming contests here.</span>
                <button onClick={() => nav('/battles')}>Explore Contests</button>
              </div>
            ) : (
              <div className="gd-contest-grid">
                {d.contests.slice(0, 2).map((c, i) => (
                  <div className="gd-contest" key={c.id}>
                    <span className="tr">🏆</span>
                    <div className="info">
                      <b>{c.title}{i === 0 && <em className="feat">FEATURED</em>}</b>
                      <span>📅 {new Date(c.startAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      {c.prize && <><span className="pp">Prize Pool</span><b className="prize">{c.prize}</b></>}
                    </div>
                    <button className="go" onClick={() => nav(c.slug ? `/battles/${c.slug}` : '/battles')}>Register Now</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="gd-card">
            <div className="gd-card-hd" id="leaderboard">
              <h2>Leaderboard</h2>
              {(d.leaderboard?.length ?? 0) > 0 && <span className="gd-timer">{st.cohortSize} members</span>}
            </div>
            {!d.leaderboard?.length ? (
              <div className="gd-chart-empty">You're the first member here — the board fills as others join.</div>
            ) : d.leaderboard.map((r, i, arr) => (
              <React.Fragment key={`${r.rank}-${r.name}`}>
                {/* The board is top 3 + you, so ranks jump (1,2,3 … 12). Mark the
                    break — without it the last row reads as fourth place. */}
                {i > 0 && r.rank > arr[i - 1].rank + 1 && (
                  <div className="gd-lb-gap" aria-hidden="true">⋯</div>
                )}
                <div className={`gd-lb${r.me ? ' me' : ''}`}>
                  <span className={`rk${r.rank <= 3 ? ` g${r.rank}` : ''}`}>{r.rank}</span>
                  <span className="av">{(r.name[0] || '?').toUpperCase()}</span>
                  <span className="nm">{r.name}{r.me ? ' (You)' : ''}</span>
                  <span className="sc">
                    <b className="xp">{r.xp.toLocaleString()} XP</b>
                    <small className="rnk">Rank {r.rank}{st.cohortSize ? ` of ${st.cohortSize}` : ''}</small>
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Journey path */}
        <div className="gd-path">
          <div className="gd-path-lead">
            <span className="ic">🧭</span>
            <div><small>Your Career Path</small><b>{d.pathwayLabel}</b></div>
          </div>
          <div className="gd-steps">
            {(d.journey || []).map((p, i) => (
              <div className={`gd-step${p.done ? ' done' : p.current ? ' current' : ' locked'}`} key={p.key}>
                <div className="dot">{p.done ? '✓' : p.current ? i + 1 : '🔒'}</div>
                <div className="cap">
                  {p.label.replace(/^Phase \d+ · /, '')}
                  <span className="st">{p.done ? 'Completed' : p.current ? 'In Progress' : 'Locked'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="gd-path-end">
            <div className="em">{st.completedDays >= st.totalDays ? '🎉' : '🎁'}</div>
            <small>Placement<br />Ready!</small>
          </div>
        </div>
    </>
  );
};

export default Dashboard;
