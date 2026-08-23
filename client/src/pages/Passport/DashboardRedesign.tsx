import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, TodayMissions } from '../../api/passportApi';
import './dashboardRedesign.css';

interface Props {
  data: DashboardData;
  reload: () => void;
}

const scoreTone = (value: number) => value >= 75 ? 'good' : value >= 50 ? 'mid' : 'low';

const MiniRing: React.FC<{ value: number; max: number; label?: string }> = ({ value, max, label }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className="cpd-ring" style={{ '--cpd-score': `${pct}%` } as React.CSSProperties}>
      <div><b>{value}</b><small>{max === 100 ? '/100' : `/${max}`}</small>{label && <span>{label}</span>}</div>
    </div>
  );
};

const Radar: React.FC<{ skills: { label: string; score: number }[] }> = ({ skills }) => {
  const size = 260, cx = 130, cy = 132, radius = 78;
  if (!skills || skills.length < 3) return <div className="cpd-empty">Complete more assessment categories to unlock your Skill DNA radar.</div>;
  const point = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / skills.length;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const poly = (fn: (i: number) => number) => skills.map((_, i) => point(i, fn(i)).join(',')).join(' ');
  return (
    <svg className="cpd-radar" viewBox={`0 0 ${size} ${size}`}>
      {[0.25, .5, .75, 1].map(r => <polygon key={r} points={poly(() => radius * r)} fill="none" stroke="#e7edf3" />)}
      {skills.map((_, i) => { const [x, y] = point(i, radius); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e7edf3" />; })}
      <polygon points={poly(i => radius * Math.max(.04, (skills[i].score || 0) / 100))} fill="rgba(53,154,173,.22)" stroke="#359aad" strokeWidth="2" />
      {skills.map((s, i) => { const [x, y] = point(i, radius * Math.max(.04, (s.score || 0) / 100)); return <circle key={s.label} cx={x} cy={y} r="3.4" fill="#051d64" />; })}
      {skills.map((s, i) => { const [x, y] = point(i, radius + 25); const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end'; return <g key={`${s.label}-label`}><text x={x} y={y - 3} textAnchor={anchor}>{s.label}</text><text x={x} y={y + 10} textAnchor={anchor} className="score">{s.score}</text></g>; })}
    </svg>
  );
};

const DashboardRedesign: React.FC<Props> = ({ data, reload }) => {
  const nav = useNavigate();
  const [d, setD] = useState<DashboardData>(data);
  const [pastDay, setPastDay] = useState<TodayMissions | null>(null);
  const [dayBusy, setDayBusy] = useState(false);
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerMsg, setAnswerMsg] = useState('');

  useEffect(() => setD(data), [data]);
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const st = d.stats!;
  const lv = d.level!;
  const goal = d.dailyGoal!;
  const missions = pastDay ? (pastDay.missions || []) : (d.missions || []);
  const nextMission = missions.find(m => !m.done) || null;
  const doneMissions = missions.filter(m => m.done).length;
  const missionPct = missions.length ? Math.round((doneMissions / missions.length) * 100) : 0;
  const roleLabel = d.pathwayLabel || 'Your target career';
  const coderPct = Math.round(((d.coderScore?.score || 0) / 1000) * 100);
  const topSkill = [...(d.skills || [])].sort((a, b) => b.score - a.score)[0];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  const stepDay = async (delta: number) => {
    const current = pastDay?.day ?? d.day ?? 1;
    const want = current + delta;
    if (want < 1) return;
    setDayBusy(true);
    try {
      const result = await passportApi.getToday(want);
      setPastDay(result.isPast ? result : null);
    } catch { /* keep current state */ }
    setDayBusy(false);
  };

  const completeMission = async (key: string) => {
    setD(p => ({ ...p, missions: p.missions?.map(m => m.key === key ? { ...m, done: true } : m) }));
    try { await passportApi.completeMission(key); } finally { reload(); }
  };

  const saveAnswer = async (key: string) => {
    const text = answerText.trim();
    if (text.length < 10) { setAnswerMsg('Write at least 10 characters in your own words.'); return; }
    setAnswerBusy(true); setAnswerMsg('');
    try {
      await passportApi.completeMission(key, text);
      setAnswerFor(null); setAnswerText(''); reload();
    } catch (e: any) {
      setAnswerMsg(e?.response?.data?.message || 'Could not save your answer.');
    }
    setAnswerBusy(false);
  };

  const startMission = () => {
    if (!nextMission) { nav('/careerpilot/practice'); return; }
    if (nextMission.link) { nav(nextMission.link); return; }
    setAnswerFor(nextMission.key);
    requestAnimationFrame(() => document.getElementById(`cpd-mission-${nextMission.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const progressRows = [
    { label: 'Skill DNA', value: Math.round((d.skills || []).reduce((s, x) => s + x.score, 0) / Math.max(1, (d.skills || []).length)), icon: 'bi-fingerprint', link: '/careerpilot/skill-dna' },
    { label: 'Coder Score', value: coderPct, icon: 'bi-code-slash', link: '/careerpilot/readiness' },
    { label: 'Missions', value: missionPct, icon: 'bi-bullseye', link: '/careerpilot/missions' },
    { label: 'Interview', value: st.bestInterview ?? 0, icon: 'bi-mic', link: '/careerpilot/interview' },
  ];

  return (
    <div className="cpd-page">
      <header className="cpd-welcome">
        <div><h1>{greeting}, {d.firstName || 'there'}! <span>👋</span></h1><p>Stay consistent today. Every action moves your career forward.</p></div>
        <button className="cpd-ghost" onClick={() => nav('/careerpilot/placement-readiness')}><i className="bi bi-shield-check" /> Placement readiness</button>
      </header>

      <div className="cpd-top-grid">
        <section className="cpd-hero">
          <div className="cpd-hero-copy">
            <span className="cpd-kicker"><i className="bi bi-bullseye" /> Career mission</span>
            <h2>Become stronger for {roleLabel}</h2>
            <p>{topSkill ? <>Your strongest measured area is <b>{topSkill.label}</b>. Keep building the gaps that matter for your target role.</> : 'Complete your next assessment and mission to keep building measurable career evidence.'}</p>
            <div className="cpd-hero-actions"><button className="cpd-primary" onClick={startMission}>{nextMission ? 'Continue Learning' : 'Practice Now'} <i className="bi bi-arrow-right" /></button><button className="cpd-link" onClick={() => nav('/careerpilot/roadmap')}>View My Roadmap <i className="bi bi-arrow-right" /></button></div>
          </div>
          <div className="cpd-hero-art" aria-hidden="true"><div className="cpd-orb one" /><div className="cpd-orb two" /><div className="cpd-avatar"><i className="bi bi-laptop" /></div></div>
          <div className="cpd-readiness">
            <span>Career progress signal</span>
            <MiniRing value={coderPct} max={100} />
            <b>{coderPct >= 75 ? 'Strong progress' : coderPct >= 50 ? 'Good progress' : 'Building momentum'}</b>
            <p>Based on your current CareerPilot Coder Score.</p>
          </div>
        </section>

        <aside className="cpd-side-stack">
          <section className="cpd-card cpd-streak-card"><div className="cpd-title-row"><h3><i className="bi bi-fire" /> Current Streak</h3></div><div className="cpd-big-number">{st.streak}<span>{st.streak === 1 ? 'Day' : 'Days'}</span></div><div className="cpd-week">{(d.streakWeek || []).map(w => <div key={w.date} className={w.active ? 'on' : ''}><span>{w.letter}</span></div>)}</div></section>
          <section className="cpd-card"><div className="cpd-title-row"><h3><i className="bi bi-calendar-event" /> Upcoming</h3></div>{d.contests?.length ? <div className="cpd-upcoming">{d.contests.slice(0, 3).map(c => <button key={c.id} onClick={() => nav(c.slug ? `/battles/${c.slug}` : '/battles')}><i className="bi bi-trophy" /><span><b>{c.title}</b><small>{new Date(c.startAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</small></span></button>)}</div> : <div className="cpd-empty compact">No scheduled contests right now.</div>}</section>
        </aside>
      </div>

      <div className="cpd-metrics">
        <div><span className="blue"><i className="bi bi-stars" /></span><p>XP Points<b>{(st.xp || 0).toLocaleString()}</b><small>Keep building evidence</small></p></div>
        <div><span className="purple"><i className="bi bi-rocket-takeoff" /></span><p>Level<b>Level {lv.level}</b><small>{lv.xpToNextLevel.toLocaleString()} XP to next</small></p></div>
        <div><span className="amber"><i className="bi bi-coin" /></span><p>Daily XP<b>{goal.earned}</b><small>{goal.met ? 'Goal reached' : `${Math.max(0, goal.target - goal.earned)} XP to goal`}</small></p></div>
        <div><span className="teal"><i className="bi bi-fire" /></span><p>Streak<b>{st.streak} days</b><small>Best: {st.longestStreak}</small></p></div>
        <div><span className="red"><i className="bi bi-award" /></span><p>Cohort Rank<b>{st.cohortRank ? `#${st.cohortRank}` : '—'}</b><small>{st.cohortSize > 1 ? `${st.cohortSize} members` : 'Ranking builds with cohort'}</small></p></div>
      </div>

      <div className="cpd-main-grid">
        <section className="cpd-card">
          <div className="cpd-title-row"><div><h3>Your Progress At a Glance</h3><small>Live signals from your CareerPilot journey</small></div></div>
          <div className="cpd-progress-list">{progressRows.map(r => <button key={r.label} onClick={() => nav(r.link)}><i className={`bi ${r.icon}`} /><span>{r.label}</span><div><em className={scoreTone(r.value)} style={{ width: `${Math.max(2, r.value)}%` }} /></div><b>{r.value}%</b></button>)}</div>
          <button className="cpd-outline-full" onClick={() => nav('/careerpilot/placement-readiness')}>View Detailed Readiness <i className="bi bi-arrow-right" /></button>
        </section>

        <section className="cpd-card cpd-plan">
          <div className="cpd-title-row"><div><h3>Today's Plan</h3><small>{pastDay ? `Reviewing Day ${pastDay.day}` : `${doneMissions}/${missions.length} missions complete`}</small></div><div className="cpd-day-nav"><button disabled={(pastDay?.day ?? d.day ?? 1) <= 1 || dayBusy} onClick={() => stepDay(-1)}>‹</button>{pastDay && <button className="today" onClick={() => setPastDay(null)}>Today</button>}<button disabled={!pastDay || dayBusy} onClick={() => stepDay(1)}>›</button></div></div>
          <div className="cpd-plan-list">{missions.slice(0, 5).map(m => <React.Fragment key={m.key}><div id={`cpd-mission-${m.key}`} className={`cpd-plan-row ${m.done ? 'done' : ''}`}><button className="cpd-check" disabled={m.done || (!!m.verify && !m.done) || (m.needsAnswer && !m.done)} onClick={() => completeMission(m.key)}>{m.done ? '✓' : ''}</button><div><b>{m.title}</b><small>{m.detail}</small></div><span>+{m.xp} XP</span>{!m.done && m.link && <button className="open" onClick={() => nav(m.link!)}>Open</button>}{!m.done && m.needsAnswer && <button className="open" onClick={() => { setAnswerFor(answerFor === m.key ? null : m.key); setAnswerMsg(''); }}>Write</button>}</div>{!m.done && m.needsAnswer && answerFor === m.key && <div className="cpd-answer"><textarea rows={3} value={answerText} onChange={e => setAnswerText(e.target.value)} onPaste={e => e.preventDefault()} placeholder="Write your answer in your own words…"/><div><button onClick={() => saveAnswer(m.key)} disabled={answerBusy}>{answerBusy ? 'Saving…' : `Save & complete +${m.xp} XP`}</button>{answerMsg && <span>{answerMsg}</span>}</div></div>}</React.Fragment>)}</div>
          <button className="cpd-outline-full" onClick={() => nav('/careerpilot/missions')}>View Full Mission Plan <i className="bi bi-arrow-right" /></button>
        </section>

        <section className="cpd-card cpd-roadmap-card">
          <div className="cpd-title-row"><div><h3>Roadmap Progress</h3><small>{roleLabel}</small></div></div>
          <div className="cpd-roadmap-body"><MiniRing value={st.completedDays} max={Math.max(1, st.totalDays)} label={`${st.completedDays}/${st.totalDays} days`} /><div><b>Day {st.day} of {st.totalDays}</b><p>{d.journey?.find(j => j.current)?.label || 'Keep moving through your personalized roadmap.'}</p></div></div>
          <div className="cpd-journey-mini">{(d.journey || []).map((j, i) => <div key={j.key} className={j.done ? 'done' : j.current ? 'current' : ''}><span>{j.done ? '✓' : i + 1}</span><small>{j.label.replace(/^Phase \d+ · /, '')}</small></div>)}</div>
          <button className="cpd-outline-full" onClick={() => nav('/careerpilot/roadmap')}>Continue Roadmap <i className="bi bi-arrow-right" /></button>
        </section>
      </div>

      <div className="cpd-lower-grid">
        <section className="cpd-card"><div className="cpd-title-row"><div><h3>Skill DNA Radar</h3><small>Your assessment-backed strengths</small></div><button className="cpd-link" onClick={() => nav('/careerpilot/skill-dna')}>View details <i className="bi bi-arrow-right" /></button></div><Radar skills={d.skills || []} /></section>
        <section className="cpd-card"><div className="cpd-title-row"><div><h3>Recent Activity</h3><small>Latest XP evidence</small></div></div>{d.recentActivity?.length ? <div className="cpd-activity">{d.recentActivity.slice(0, 5).map((a, i) => <div key={i}><span style={{ color: a.color, background: `${a.color}18` }}>{a.icon}</span><p><b>{a.label}</b><small>{a.ago}</small></p><em>+{a.xp} XP</em></div>)}</div> : <div className="cpd-empty">Your completed missions and practice will appear here.</div>}</section>
        <section className="cpd-card"><div className="cpd-title-row"><div><h3>Recommended for You</h3><small>Next useful actions from your current journey</small></div></div><div className="cpd-recommend"><button onClick={() => nav('/careerpilot/practice')}><i className="bi bi-code-square" /><span><b>Focused Practice</b><small>Strengthen your weakest measured areas.</small></span><em>Start</em></button><button onClick={() => nav('/careerpilot/interview')}><i className="bi bi-mic" /><span><b>Mock Interview</b><small>Validate readiness under interview conditions.</small></span><em>Start</em></button><button onClick={() => nav('/careerpilot/resume')}><i className="bi bi-file-earmark-person" /><span><b>Resume Center</b><small>Make your evidence visible to employers.</small></span><em>Open</em></button></div></section>
        <section className="cpd-card"><div className="cpd-title-row"><div><h3>Recent Achievements</h3><small>Badges earned from real progress</small></div></div><div className="cpd-achievements">{(d.badges || []).filter(b => b.earned).slice(0, 4).map(b => <div key={b.key}><span style={{ background: `${b.color}18` }}>{b.icon}</span><p><b>{b.label}</b><small>{b.hint}</small></p></div>)}{!(d.badges || []).some(b => b.earned) && <div className="cpd-empty compact">Complete milestones to unlock achievements.</div>}</div></section>
        <section className="cpd-opportunity"><div><span>Explore Top Opportunities</span><h3>Turn readiness into real applications.</h3><p>Browse live internships and placement drives already available in the platform.</p><button onClick={() => nav('/careerpilot/companies')}>View Opportunities <i className="bi bi-arrow-right" /></button></div><div className="cpd-briefcase"><i className="bi bi-briefcase-fill" /></div></section>
      </div>

      <footer className="cpd-motivation"><i className="bi bi-star-fill" /><div><b>Small steps today, big success tomorrow.</b><span>Keep learning, keep building, and let your evidence compound.</span></div></footer>
    </div>
  );
};

export default DashboardRedesign;
