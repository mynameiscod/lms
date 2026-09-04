import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, Badge, TodayMissions } from '../../api/passportApi';
import './dashboard.css';
import './dashboard-redesign.css';

const Bi: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <i className={`bi bi-${name}${className ? ` ${className}` : ''}`} aria-hidden="true" />
);

const Ring: React.FC<{ value: number; max: number; size?: number }> = ({ value, max, size = 190 }) => {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="gd-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7eef5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#359AAD" />
            <stop offset="100%" stopColor="#051D64" />
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
  const poly = (dist: (i: number) => number) => skills.map((_, i) => pt(i, dist(i)).join(',')).join(' ');

  return (
    <svg className="gd-radar" width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={poly(() => R * f)} fill="none" stroke="#e4edf4" strokeWidth={1} />
      ))}
      {skills.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e4edf4" strokeWidth={1} />;
      })}
      <polygon points={poly(i => R * Math.max(0.02, (skills[i].score || 0) / 100))} fill="rgba(53,154,173,.25)" stroke="#359AAD" strokeWidth={2} />
      {skills.map((s, i) => {
        const [x, y] = pt(i, R * Math.max(0.02, (s.score || 0) / 100));
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#087f91" />;
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
          <line x1={padL} x2={w - 6} y1={y(max * f)} y2={y(max * f)} stroke="#edf2f6" strokeWidth={1} />
          <text x={4} y={y(max * f) + 4}>{Math.round(max * f)}</text>
        </g>
      ))}
      <polygon points={`${padL},${h - padB} ${line} ${xs[xs.length - 1]},${h - padB}`} fill="rgba(53,154,173,.12)" />
      <polyline points={line} fill="none" stroke="#359AAD" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={xs[i]} cy={y(p.xp)} r={4} fill="#359AAD" />)}
      {points.map((p, i) => <text key={p.label + i} x={xs[i]} y={h - 7} textAnchor="middle">{p.label}</text>)}
    </svg>
  );
};

const MISSION_ICON: Record<string, string> = {
  career_clarity: 'bullseye',
  aptitude: 'calculator',
  logical_reasoning: 'diagram-3',
  technical: 'code-slash',
  communication: 'chat-dots',
  employability: 'briefcase',
};

interface Props {
  data: DashboardData;
  reload: () => void;
}

const Dashboard: React.FC<Props> = ({ data, reload }) => {
  const nav = useNavigate();
  const [d, setD] = useState<DashboardData>(data);
  const [pastDay, setPastDay] = useState<TodayMissions | null>(null);
  const [dayBusy, setDayBusy] = useState(false);
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerMsg, setAnswerMsg] = useState('');
  const [justCoached, setJustCoached] = useState<{ key: string; feedback: string } | null>(null);
  const [missionMsg, setMissionMsg] = useState('');

  useEffect(() => { setD(data); }, [data]);
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const stepDay = async (delta: number) => {
    const current = pastDay?.day ?? d.day ?? 1;
    const want = current + delta;
    if (want < 1) return;
    setDayBusy(true);
    try {
      const r = await passportApi.getToday(want);
      setPastDay(r.isPast ? r : null);
    } catch { /* preserve current view */ }
    setDayBusy(false);
  };

  const toggleMission = async (key: string, answer?: string) => {
    setMissionMsg('');
    if (!answer) setD(p => ({ ...p, missions: p.missions?.map(m => m.key === key ? { ...m, done: true } : m) }));
    try {
      await passportApi.completeMission(key, answer);
    } catch (e: any) {
      setMissionMsg(e?.response?.data?.message || 'Could not complete that mission.');
    } finally { reload(); }
  };

  const saveAnswer = async (key: string) => {
    const text = answerText.trim();
    if (text.length < 10) { setAnswerMsg('Write a little more — at least 10 characters.'); return; }
    setAnswerBusy(true); setAnswerMsg('');
    try {
      const r = await passportApi.completeMission(key, text);
      setAnswerFor(null); setAnswerText('');
      if (r?.feedback) setJustCoached({ key, feedback: r.feedback });
      reload();
    } catch (e: any) {
      setAnswerMsg(e?.response?.data?.message || 'Could not save your answer.');
    }
    setAnswerBusy(false);
  };

  const hoursLeft = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const mins = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000));
    return `${Math.floor(mins / 60)}h : ${String(mins % 60).padStart(2, '0')}m left`;
  }, []);

  const st = d.stats!;
  const lv = d.level!;
  const goal = d.dailyGoal!;
  const shownMissions = pastDay ? (pastDay.missions || []) : (d.missions || []);
  const nextMission = shownMissions.find(m => !m.done) || null;
  const totalMissions = shownMissions.length;
  const hasActivity = (d.activity || []).some(a => a.xp > 0);

  const startNext = () => {
    if (!nextMission) { nav('/careerpilot/practice'); return; }
    if (nextMission.link) { nav(nextMission.link); return; }
    setAnswerFor(nextMission.key);
    setAnswerText('');
    setAnswerMsg('');
    requestAnimationFrame(() => document.getElementById(`mission-${nextMission.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  return (
    <>
      <div className="gd-grid gd-3">
        <div className="gd-card">
          <div className="gd-card-hd">
            <h2><Bi name="person-workspace" /> Coder Score <span className="gd-help" title="A 0–1000 composite of your assessment, practice, missions, interviews and resume.">?</span></h2>
          </div>
          <div className="gd-score">
            <Ring value={d.coderScore!.score} max={1000} size={168} />
            <div className="gd-score-side">
              <span className="gd-tag">
                {d.coderScore!.score >= 750 ? 'Excellent' : d.coderScore!.score >= 500 ? 'On track' : 'Just getting started'}
              </span>
              <p>{d.percentileAhead !== null && d.percentileAhead !== undefined
                ? <>You are ahead of <b>{d.percentileAhead}%</b> of CareerPilot members.</>
                : <>Rankings appear once more members join your cohort.</>}
              </p>
              <div className="gd-parts-hd">Where your score comes from</div>
              <div className="gd-parts">
                {d.coderScore!.parts.map(p => {
                  const pct = Math.round((p.earned / p.max) * 100);
                  return <div className="gd-part" key={p.label}>
                    <span className="t">{p.label}</span><span className="b"><i style={{ width: `${pct}%` }} /></span><span className="v">{pct}%</span>
                  </div>;
                })}
              </div>
              <div className="gd-rank"><Bi name="lightning-charge-fill" /> Earn {lv.xpToNextLevel.toLocaleString()} XP to reach Level {lv.nextLevel}</div>
            </div>
          </div>
        </div>

        <div className="gd-card">
          <div className="gd-card-hd">
            <h2><Bi name="stars" /> Skill Meter <span className="gd-help" title="Your six Career Readiness Assessment categories.">?</span></h2>
            <button className="lnk" onClick={() => nav('/careerpilot/assessment')}>View full report <Bi name="arrow-right" /></button>
          </div>
          <div className="gd-skill-wrap"><Radar skills={d.skills || []} /></div>
        </div>

        <div className="gd-card">
          <div className="gd-card-hd"><h2><Bi name="bar-chart-fill" /> Your Coding Stats</h2></div>
          <div className="gd-statlist">
            {[
              ['code-slash', 'cp-icon-blue', 'Problems Solved', <>{st.solved}<small> / {st.totalProblems}</small></>],
              ['arrow-repeat', 'cp-icon-blue', 'Total Attempts', d.weekly?.totalAttempts ?? 0],
              ['bullseye', 'cp-icon-soft', 'Accuracy', st.accuracy ? `${st.accuracy.pct}%` : '—'],
              ['check-circle-fill', 'cp-icon-soft', 'Missions Done', <>{st.completedDays}<small> / {st.totalDays}</small></>],
              ['people-fill', 'cp-icon-soft', 'Cohort Rank', <>{st.cohortRank ? `#${st.cohortRank}` : '—'}<small>{st.cohortSize > 1 ? ` of ${st.cohortSize}` : ''}</small></>],
              ['calendar3', 'cp-icon-blue', 'Journey Day', <>{st.day}<small> / {st.totalDays}</small></>],
            ].map(([icon, tone, label, value], idx) => (
              <div className="gd-statrow" key={idx}>
                <span className={`ic ${tone}`}><Bi name={icon as string} /></span>
                <span className="t">{label}</span><span className="v">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="gd-tiles" style={{ marginTop: 14 }}>
        <div className="gd-tile"><span className="ic cp-icon-rose"><Bi name="bullseye" /></span><div><div className="lbl">Today's Goal</div><div className="val">{goal.earned}<span> / {goal.target} XP</span></div><div className="gd-tile-bar"><span className="tr"><i style={{ width: `${Math.min(100, goal.target ? (goal.earned / goal.target) * 100 : 0)}%` }} /></span><em>{Math.min(100, Math.round(goal.target ? (goal.earned / goal.target) * 100 : 0))}%</em></div><div className="sub">{goal.met ? 'Goal reached!' : `${Math.max(0, goal.target - goal.earned)} XP to go`}</div></div></div>
        <div className="gd-tile"><span className="ic cp-icon-blue"><Bi name="bar-chart-fill" /></span><div><div className="lbl">Weekly Submissions</div><div className="val">{d.weekly?.submissions ?? 0}</div><div className="sub">{(d.weekly?.solved ?? 0) > 0 ? `${d.weekly!.solved} solved this week` : 'No submissions this week'}</div></div></div>
        <div className="gd-tile"><span className="ic cp-icon-violet"><Bi name="mic-fill" /></span><div><div className="lbl">Mock Interviews</div><div className="val">{st.interviews}</div><div className="sub">{st.bestInterview !== null ? `Best ${st.bestInterview}%` : 'Not attempted yet'}</div></div></div>
        <div className="gd-tile"><span className="ic cp-icon-amber"><Bi name="trophy-fill" /></span><div><div className="lbl">Best Streak</div><div className="val">{st.longestStreak} {st.longestStreak === 1 ? 'Day' : 'Days'}</div><div className="sub">{st.streak >= st.longestStreak && st.streak > 0 ? 'Personal best — keep it up!' : 'Beat your record'}</div></div></div>
      </div>

      <div className="gd-grid gd-2b" style={{ marginTop: 14 }}>
        <div className="gd-card">
          <div className="gd-card-hd">
            <h2><Bi name="list-task" /> {pastDay ? `Day ${pastDay.day}` : "Today's Mission"}</h2>
            <div className="gd-day-nav">
              <button onClick={() => stepDay(-1)} disabled={(pastDay?.day ?? d.day ?? 1) <= 1 || dayBusy} title="Previous day"><Bi name="chevron-left" /></button>
              {pastDay ? <button className="today" onClick={() => setPastDay(null)}>Back to today</button> : <span className="gd-timer"><Bi name="clock" /> {hoursLeft}</span>}
              <button onClick={() => stepDay(1)} disabled={!pastDay || dayBusy} title="Next day"><Bi name="chevron-right" /></button>
            </div>
          </div>
          <div className="gd-reward">Complete all missions to stay on track <span className="chip">+{shownMissions.reduce((s, m) => s + m.xp, 0)} XP</span></div>
          {!totalMissions ? (
            <div className="gd-chart-empty">
              {data.dailyPlan && !data.dailyPlan.available ? <>
                <p style={{ margin: '0 0 10px' }}>{data.dailyPlan.message}</p>
                {data.dailyPlan.reason === 'ROADMAP_REQUIRED' && <button className="gd-btn primary" onClick={() => nav('/careerpilot/roadmap')}>Build my 90-day plan</button>}
              </> : 'No missions generated for today.'}
            </div>
          ) : <>
            {shownMissions.map(m => (
              <React.Fragment key={m.key}>
                <div className={`gd-mission${m.done ? ' done' : ''}`} id={`mission-${m.key}`}>
                  <span className="badge"><Bi name={MISSION_ICON[m.category] || 'circle'} /></span>
                  <div className="txt"><b>{m.title}</b><span>{m.detail}</span></div>
                  {m.link && !m.done && <button className="lnk" onClick={() => nav(m.link!)}>Open <Bi name="arrow-right" /></button>}
                  {m.needsAnswer && !m.done && <button className="lnk" onClick={() => { setAnswerFor(answerFor === m.key ? null : m.key); setAnswerText(''); setAnswerMsg(''); }}>{answerFor === m.key ? 'Close' : 'Write answer'} <Bi name="arrow-right" /></button>}
                  <span className="cnt">+{m.xp} XP</span>
                  <button className={`gd-check${m.done ? ' on' : ''}`} disabled={m.done || (m.verify === 'interview' && !m.done) || (m.needsAnswer && !m.done)} onClick={() => toggleMission(m.key)}>{m.done && <Bi name="check-lg" />}</button>
                </div>
                {m.needsAnswer && !m.done && answerFor === m.key && <div className="gd-answer">
                  <textarea value={answerText} autoFocus rows={3} placeholder="Type your answer here…" onChange={e => setAnswerText(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} />
                  <div className="hint"><Bi name="pencil-square" /> Write it in your own words — pasting is turned off for this one.</div>
                  <div className="row"><button className="save" onClick={() => saveAnswer(m.key)} disabled={answerBusy}>{answerBusy ? 'Saving…' : `Save & complete +${m.xp} XP`}</button><button className="cancel" onClick={() => { setAnswerFor(null); setAnswerMsg(''); }}>Cancel</button>{answerMsg && <span className="msg">{answerMsg}</span>}</div>
                </div>}
                {m.done && m.answer && <div className="gd-answer saved"><b>Your answer</b><p>{m.answer}</p></div>}
                {(m.feedback || (justCoached?.key === m.key && justCoached.feedback)) && <div className="gd-coach"><b><Bi name="chat-dots" /> Coach</b><p>{m.feedback || justCoached?.feedback}</p></div>}
              </React.Fragment>
            ))}
            {missionMsg && <div className="gd-mission-error">{missionMsg}</div>}
            <button className="gd-mission-cta" onClick={startNext}>{nextMission ? (nextMission.link ? 'Start Now' : 'Write your answer') : 'All done today — practice anyway'} <Bi name="arrow-right" /></button>
          </>}
        </div>

        <div>
          <div className="gd-card">
            <div className="gd-card-hd"><h2><Bi name="fire" /> Streak</h2></div>
            <div className="gd-streak-num">{st.streak}<small>{st.streak === 1 ? 'day in a row' : 'days in a row'}</small></div>
            <div className="gd-week">{(d.streakWeek || []).map(w => <div key={w.date}><div className={`dot${w.active ? ' on' : ''}`}>{w.active && <Bi name="check-lg" />}</div><div className={`l${w.isToday ? ' today' : ''}`}>{w.letter}</div></div>)}</div>
            <div className="gd-milestone"><div className="t"><b>{st.streak < 7 ? '7' : st.streak < 21 ? '21' : st.streak < 30 ? '30' : '100'} day streak</b><span>{(() => { const target = st.streak < 7 ? 7 : st.streak < 21 ? 21 : st.streak < 30 ? 30 : 100; const togo = target - st.streak; return `Keep it up! ${togo} ${togo === 1 ? 'day' : 'days'} to go`; })()}</span></div><span className="cp-bi"><Bi name="gift-fill" /></span></div>
          </div>

          <div className="gd-card" style={{ marginTop: 14 }}>
            <div className="gd-card-hd"><h2><Bi name="gift" /> Next Level Reward</h2></div>
            <div className="gd-next"><div className="info"><div className="lv">Level {lv.nextLevel}<span>{lv.xpIntoLevel} / {lv.xpForThisLevel} XP</span></div><div className="bar"><i style={{ width: `${lv.progressPct}%` }} /></div><div className="unlock">You will unlock <b><Bi name="award-fill" /> {lv.nextTitle}</b></div></div><span className="medal cp-bi"><Bi name="award-fill" /></span></div>
          </div>
        </div>
      </div>

      <div className="gd-grid gd-2b" style={{ marginTop: 14 }}>
        <div className="gd-card">
          <div className="gd-card-hd"><h2><Bi name="clock-history" /> Recent Activity</h2><span className="gd-timer">{d.weekly && d.weekly.xpLastWeek > 0 && <b style={{ marginRight: 8 }}>{d.weekly.xpDelta >= 0 ? '+' : ''}{d.weekly.xpDelta} XP vs last week</b>}Last 7 days</span></div>
          {!d.recentActivity?.length ? <div className="gd-chart-empty">Nothing yet.<br />Complete a mission or solve a problem and it appears here.</div> : <><div className="gd-feed">{d.recentActivity.map((a, i) => <div className="gd-feed-row" key={i}><span className="ic cp-icon-soft"><Bi name="activity" /></span><span className="t">{a.label}</span><span className="xp">+{a.xp} XP</span><span className="ago">{a.ago}</span></div>)}</div>{hasActivity && <div className="gd-feed-chart"><AreaChart points={d.activity || []} /></div>}</>}
        </div>

        <div className="gd-card">
          <div className="gd-card-hd" id="badges"><h2><Bi name="award" /> Badge Collection</h2><button className="lnk" onClick={() => nav('/careerpilot/roadmap')}>View all <Bi name="arrow-right" /></button></div>
          <div className="gd-badges">{(d.badges || []).slice(0, 5).map((b: Badge) => <div className={`gd-badge${b.earned ? '' : ' locked'}`} key={b.key} title={b.hint}><div className="hex">{b.earned ? <Bi name="star-fill" /> : <Bi name="lock-fill" />}</div><b>{b.label}</b>{b.earned ? <span>Earned</span> : <><span>{Math.round(b.progress * 100)}%</span><div className="pbar"><i style={{ width: `${Math.round(b.progress * 100)}%` }} /></div></>}</div>)}</div>
        </div>
      </div>

      <div className="gd-grid gd-2b" style={{ marginTop: 14 }}>
        <div className="gd-card">
          <div className="gd-card-hd"><h2><Bi name="trophy" /> Upcoming Contests</h2>{!!d.contests?.length && <button className="lnk" onClick={() => nav('/battles')}>View All <Bi name="arrow-right" /></button>}</div>
          {!d.contests?.length ? <div className="gd-empty-state"><span className="em cp-bi"><Bi name="calendar-event" /></span><b>No contests scheduled right now.</b><span>You'll see upcoming contests here.</span><button onClick={() => nav('/battles')}>Explore Contests</button></div> : <div className="gd-contest-grid">{d.contests.slice(0, 2).map((c, i) => <div className="gd-contest" key={c.id}><span className="tr cp-bi"><Bi name="trophy-fill" /></span><div className="info"><b>{c.title}{i === 0 && <em className="feat">FEATURED</em>}</b><span><Bi name="calendar3" /> {new Date(c.startAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>{c.prize && <><span className="pp">Prize Pool</span><b className="prize">{c.prize}</b></>}</div><button className="go" onClick={() => nav(c.slug ? `/battles/${c.slug}` : '/battles')}>Register Now</button></div>)}</div>}
        </div>

        <div className="gd-card">
          <div className="gd-card-hd" id="leaderboard"><h2><Bi name="bar-chart-steps" /> Leaderboard</h2>{(d.leaderboard?.length ?? 0) > 0 && <span className="gd-timer">{st.cohortSize} members</span>}</div>
          {!d.leaderboard?.length ? <div className="gd-chart-empty">You're the first member here — the board fills as others join.</div> : d.leaderboard.map((r, i, arr) => <React.Fragment key={`${r.rank}-${r.name}`}>{i > 0 && r.rank > arr[i - 1].rank + 1 && <div className="gd-lb-gap" aria-hidden="true">⋯</div>}<div className={`gd-lb${r.me ? ' me' : ''}`}><span className={`rk${r.rank <= 3 ? ` g${r.rank}` : ''}`}>{r.rank}</span><span className="av">{(r.name[0] || '?').toUpperCase()}</span><span className="nm">{r.name}{r.me ? ' (You)' : ''}</span><span className="sc"><b className="xp">{r.xp.toLocaleString()} XP</b><small className="rnk">Rank {r.rank}{st.cohortSize ? ` of ${st.cohortSize}` : ''}</small></span></div></React.Fragment>)}
        </div>
      </div>

      <div className="gd-path">
        <div className="gd-path-lead"><span className="ic cp-bi"><Bi name="compass" /></span><div><small>Your Career Path</small><b>{d.pathwayLabel}</b></div></div>
        <div className="gd-steps">{(d.journey || []).map((p, i) => <div className={`gd-step${p.done ? ' done' : p.current ? ' current' : ' locked'}`} key={p.key}><div className="dot">{p.done ? <Bi name="check-lg" /> : p.current ? i + 1 : <Bi name="lock-fill" />}</div><div className="cap">{p.label.replace(/^Phase \d+ · /, '')}<span className="st">{p.done ? 'Completed' : p.current ? 'In Progress' : 'Locked'}</span></div></div>)}</div>
        <div className="gd-path-end"><div className="em cp-bi"><Bi name={st.completedDays >= st.totalDays ? 'check-circle-fill' : 'flag-fill'} /></div><small>Placement<br />Ready!</small></div>
      </div>
    </>
  );
};

export default Dashboard;
