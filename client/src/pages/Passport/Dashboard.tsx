import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, Badge } from '../../api/passportApi';
import { useAuth } from '../../contexts/AuthContext';
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

// ── Sidebar nav (only routes that exist) ────────────────────────────────────
const PRACTICE_SUB: { label: string; to: string }[] = [
  { label: 'All Problems', to: '/passport/practice' },
  { label: 'Coding', to: '/passport/practice?kind=coding' },
  { label: 'SQL', to: '/passport/practice?kind=sql' },
  { label: 'Aptitude & MCQ', to: '/passport/practice?kind=mcq' },
];

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
  const { user, logout } = useAuth();
  const [d, setD] = useState<DashboardData>(data);
  const [practiceOpen, setPracticeOpen] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const share = async () => {
    if (!d.shareSlug) return;
    const url = `${window.location.origin}/passport/card/${d.shareSlug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy your Career Passport link:', url); }
  };

  const firstName = d.firstName || user?.firstName || 'there';
  const initial = (firstName[0] || 'C').toUpperCase();
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

  const navBtn = (label: string, icon: string, to: string, on = false) => (
    <button className={`gd-nav-btn${on ? ' on' : ''}`} onClick={() => nav(to)} key={label}>
      <span className="ic">{icon}</span>{label}
    </button>
  );

  return (
    <div className="gd">
      {/* ── Sidebar ── */}
      <aside className="gd-side">
        <div className="gd-logo">
          <span className="mk">{'</>'}</span>
          <div><b>Career<span className="p">Pilot</span></b><small>Powered by CodeBegun</small></div>
        </div>

        <nav className="gd-nav">
          {navBtn('Coding Home', '🏠', '/passport', true)}

          <button className="gd-nav-btn" onClick={() => setPracticeOpen(o => !o)}>
            <span className="ic">🧪</span>Practice<span className="cr">{practiceOpen ? '▲' : '▼'}</span>
          </button>
          {practiceOpen && (
            <div className="gd-sub">
              {PRACTICE_SUB.map(s => <button key={s.to} onClick={() => nav(s.to)}>{s.label}</button>)}
            </div>
          )}

          {navBtn('90-Day Roadmap', '🗺️', '/passport/roadmap')}
          {navBtn('Mock Interview', '🎙️', '/passport/interview')}
          {navBtn('Resume Center', '📄', '/passport/resume')}
          {navBtn('My Assessment', '📊', '/passport/assessment')}
          {!!d.contests?.length && navBtn('Contests', '🏆', '/battles')}
          <button className="gd-nav-btn" onClick={share}>
            <span className="ic">🎫</span>{copied ? 'Link copied!' : 'My Passport Card'}
          </button>
          <button className="gd-nav-btn" onClick={() => logout()}>
            <span className="ic">↩</span>Log out
          </button>
        </nav>

        <div className="gd-goal">
          <div className="hd">🎯 Daily Goal</div>
          <div className="big">{goal.earned} <small>/ {goal.target} XP</small></div>
          <div className="bar"><i style={{ width: `${goal.pct}%` }} /></div>
          <div className="note">
            {goal.met
              ? 'Goal smashed for today — anything else is bonus.'
              : `${totalMissions - doneCount} more mission${totalMissions - doneCount === 1 ? '' : 's'} to hit today's goal.`}
          </div>
          {!goal.met && <button className="cta" onClick={() => nav('/passport/practice')}>Earn XP now</button>}
        </div>

        <div className="gd-me">
          <div className="gd-me-card">
            <div className="gd-me-top">
              <span className="av">{initial}</span>
              <div>
                <b>{d.name || firstName}</b>
                <span>Level {lv.level}</span>
                <div className="gd-me-tag">{lv.title}</div>
              </div>
            </div>
            <div className="gd-me-stats">
              <div><b>{st.xp.toLocaleString()}</b><span>XP</span></div>
              <div><b>{st.streak}</b><span>Day Streak</span></div>
              <div><b>{d.leaderboard?.find(r => r.me)?.rank ? `#${d.leaderboard.find(r => r.me)!.rank}` : '—'}</b><span>Rank</span></div>
            </div>
            <button className="gd-me-btn" onClick={() => nav('/passport/roadmap')}>View My Journey</button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="gd-main">
        <div className="gd-top">
          <div className="gd-hello">
            <h1>Hey {firstName}! 👋</h1>
            <p>{st.day <= st.totalDays ? `Day ${st.day} of your ${st.totalDays}-day journey. Keep going.` : 'Journey complete — keep the streak alive.'}</p>
          </div>
          <div className="gd-top-pills">
            <div className="gd-pill">
              <span className="em">🔥</span>
              <div><b>{st.streak}</b><span>Day Streak</span></div>
            </div>
            <div className="gd-pill level">
              <span className="hex">🎖️</span>
              <div>
                <b>Level {lv.level}</b><span>{lv.title}</span>
                <div className="lbar"><i style={{ width: `${lv.progressPct}%` }} /></div>
              </div>
            </div>
            <div className="gd-pill">
              <span className="em">⚡</span>
              <div><b>{lv.xpToNextLevel.toLocaleString()} XP</b><span>to level {lv.nextLevel}</span></div>
            </div>
          </div>
        </div>

        {/* Coder score + skill radar */}
        <div className="gd-grid gd-2">
          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Coder Score <span className="gd-help" title="A 0–1000 composite of your assessment, practice, missions, interviews and resume. The breakdown below shows exactly where it comes from.">?</span></h2>
            </div>
            <div className="gd-score">
              <Ring value={d.coderScore!.score} max={1000} />
              <div className="gd-score-side">
                <span className="gd-tag">{d.coderScore!.score >= 750 ? 'Excellent ⭐' : d.coderScore!.score >= 500 ? 'On track 👍' : 'Just getting started 🌱'}</span>
                <p>
                  {d.percentileAhead !== null && d.percentileAhead !== undefined
                    ? <>You are ahead of <b>{d.percentileAhead}%</b> of CareerPilot members.</>
                    : <>Rankings appear once more members join your cohort.</>}
                </p>
                <div className="gd-parts">
                  {d.coderScore!.parts.map(p => (
                    <div className="gd-part" key={p.label}>
                      <span className="t">{p.label}</span>
                      <span className="b"><i style={{ width: `${Math.round((p.earned / p.max) * 100)}%` }} /></span>
                      <span className="v">{p.earned}/{p.max}</span>
                    </div>
                  ))}
                </div>
                {!!d.leaderboard?.find(r => r.me) && (
                  <div className="gd-rank">🏆 Rank #{d.leaderboard.find(r => r.me)!.rank} in your cohort</div>
                )}
              </div>
            </div>
          </div>

          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Skill Meter <span className="gd-help" title="Your six Career Readiness Assessment categories. Retake the assessment to move these.">?</span></h2>
              <button className="lnk" onClick={() => nav('/passport/roadmap')}>Improve Skills →</button>
            </div>
            <div className="gd-radar-wrap"><Radar skills={d.skills || []} /></div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="gd-tiles" style={{ marginTop: 16 }}>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#f1eeff' }}>{'</>'}</span>
            <div>
              <div className="lbl">Problems Solved</div>
              <div className="val">{st.solved}<span style={{ fontSize: 13, color: '#a3aab8', fontWeight: 700 }}> / {st.totalProblems}</span></div>
              <div className="sub" style={{ color: st.solvedToday ? '#16a34a' : '#a3aab8' }}>
                {st.solvedToday ? `▲ ${st.solvedToday} today` : 'None yet today'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#fff3e0' }}>🎙️</span>
            <div>
              <div className="lbl">Mock Interviews</div>
              <div className="val">{st.interviews}</div>
              <div className="sub" style={{ color: '#6d4bd8' }}>
                {st.bestInterview !== null ? `Best ${st.bestInterview}%` : 'Not attempted'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#e6f2ff' }}>🎯</span>
            <div>
              <div className="lbl">Practice Accuracy</div>
              <div className="val">{st.accuracy ? `${st.accuracy.pct}%` : '—'}</div>
              <div className="sub" style={{ color: '#a3aab8' }}>
                {st.accuracy ? `over ${st.accuracy.attempts} attempts` : 'Solve one to see this'}
              </div>
            </div>
          </div>
          <div className="gd-tile">
            <span className="ic" style={{ background: '#fef3c7' }}>🏆</span>
            <div>
              <div className="lbl">Best Streak</div>
              <div className="val">{st.longestStreak} Days</div>
              <div className="sub" style={{ color: '#f59e0b' }}>
                {st.streak >= st.longestStreak && st.streak > 0 ? 'Personal best — keep it!' : 'Beat your record'}
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
                <button className="gd-mission-cta" onClick={() => nav(d.missions?.find(m => !m.done)?.link || '/passport/practice')}>
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
                    <div className={`d${w.active ? ' on' : ''}`}>🔥</div>
                    <div className={`l${w.isToday ? ' today' : ''}`}>{w.letter}</div>
                  </div>
                ))}
              </div>
              <div className="gd-milestone">
                <div className="t">
                  <small>NEXT MILESTONE</small>
                  <b>{st.streak < 7 ? '7' : st.streak < 21 ? '21' : st.streak < 30 ? '30' : '100'}-day streak</b>
                  <span>{(st.streak < 7 ? 7 : st.streak < 21 ? 21 : st.streak < 30 ? 30 : 100) - st.streak} days to go</span>
                </div>
                <span style={{ fontSize: 26 }}>🎖️</span>
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
          <div className="gd-card">
            <div className="gd-card-hd"><h2>Recent Activity</h2><span className="gd-timer">Last 7 days</span></div>
            {hasActivity
              ? <AreaChart points={d.activity || []} />
              : <div className="gd-chart-empty">No XP earned in the last 7 days yet.<br />Complete a mission or solve a problem and this fills in.</div>}
          </div>

          <div className="gd-card">
            <div className="gd-card-hd">
              <h2>Badge Collection</h2>
              <span className="gd-timer">{(d.badges || []).filter(b => b.earned).length} / {(d.badges || []).length}</span>
            </div>
            <div className="gd-badges">
              {(d.badges || []).slice(0, 10).map((b: Badge) => (
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
              <div className="gd-chart-empty">No contests scheduled right now.<br />Tech Battles are announced here when they open.</div>
            ) : d.contests.map(c => (
              <div className="gd-contest" key={c.id}>
                <span className="tr">🏆</span>
                <div className="info">
                  <b>{c.title}</b>
                  <span>📅 {new Date(c.startAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                  {c.prize && <span>Prize: {c.prize}</span>}
                </div>
                <button className="go" onClick={() => nav(c.slug ? `/battles/${c.slug}` : '/battles')}>Register</button>
              </div>
            ))}
          </div>

          <div className="gd-card">
            <div className="gd-card-hd"><h2>Leaderboard</h2></div>
            {!d.leaderboard?.length ? (
              <div className="gd-chart-empty">You're the first member here — the board fills as others join.</div>
            ) : d.leaderboard.map(r => (
              <div className={`gd-lb${r.me ? ' me' : ''}`} key={`${r.rank}-${r.name}`}>
                <span className={`rk${r.rank <= 3 ? ` g${r.rank}` : ''}`}>{r.rank}</span>
                <span className="av">{(r.name[0] || '?').toUpperCase()}</span>
                <span className="nm">{r.name}{r.me ? ' (You)' : ''}</span>
                <span className="xp">{r.xp.toLocaleString()} XP</span>
              </div>
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
              <div className={`gd-step${p.done ? ' done' : p.current ? ' current' : ''}`} key={p.key}>
                <div className="dot">{p.done ? '✓' : i + 1}</div>
                <div className="cap">{p.label.replace(/^Phase \d+ · /, '')}<br /><span style={{ fontSize: 10.5, color: '#a3aab8' }}>Day {p.fromDay}–{p.toDay}</span></div>
              </div>
            ))}
          </div>
          <div className="gd-path-end">
            <div className="em">{st.completedDays >= st.totalDays ? '🎉' : '🎁'}</div>
            <small>Placement<br />Ready!</small>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
