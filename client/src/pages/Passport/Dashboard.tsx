import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, Badge, TodayMissions, FoundationJourney, FoundationJourneyDay } from '../../api/passportApi';
import './dashboard.css';
import './dashboard-redesign.css';
import './memberDashboard.css';

const Bi: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <i className={`bi bi-${name}${className ? ` ${className}` : ''}`} aria-hidden="true" />
);

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
    <svg className="gd-chart md-chart" viewBox={`0 0 ${w} ${h}`}>
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

/* A journey task's type, in words and an icon a first-year recognises (same as the journey pages). */
const JOURNEY_TYPE: Record<string, string> = {
  video: 'Watch', notes: 'Read', worked_example: 'Worked example', interactive_lesson: 'Interactive', interactive_activity: 'Activity',
  tech_qa: 'Q&A', behavioral_qa: 'Q&A', practice_theory: 'Practice', practice_coding: 'Code practice', aptitude: 'Aptitude',
  quiz: 'Checkpoint', assignment: 'Project',
};
const JOURNEY_ICON: Record<string, string> = {
  video: 'play-circle', notes: 'file-text', worked_example: 'lightbulb', practice_theory: 'pencil-square',
  practice_coding: 'code-slash', quiz: 'patch-question', assignment: 'upload',
};

interface Props {
  data: DashboardData;
  reload: () => void;
}

/**
 * A mission's link may be an ABSOLUTE URL — the server returns a material's own external link
 * when it has one. Handing that to react-router built an in-app path out of a URL, so pressing
 * Open on any externally hosted material landed the student on a blank screen. Somebody else's
 * site opens in a tab; ours goes through the router.
 */
const openMissionLink = (link: string, nav: (to: string) => void) => {
  if (!link) return;
  if (/^https?:\/\//i.test(link)) window.open(link, '_blank', 'noopener');
  else nav(link);
};

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
  /**
   * The Foundation journey, when the unit engine plans this student: its current day IS today's missions.
   * Re-read whenever the member payload reloads (a return to the tab, a finished mission), so the ticks and
   * XP follow work done in the day player.
   */
  const [journey, setJourney] = useState<FoundationJourney | null>(null);
  const [jDay, setJDay] = useState<FoundationJourneyDay | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const j = await passportApi.myFoundationJourney();
        if (!live) return;
        setJourney(j);
        if (j.engine === 'UNIT' && j.available && j.access !== 'PREVIEW' && j.currentDay) {
          const day = await passportApi.myFoundationJourneyDay(j.currentDay);
          if (!live) return;
          setJDay(day);
          // Reading the day just paid XP for work finished elsewhere (a checkpoint, a lesson): the member payload —
          // the XP pill, today's goal bar, the rail's Daily Goal — was loaded before that, so reload it. The next read
          // pays nothing, so this cannot loop.
          if ((day.xpJustPaid || 0) > 0) reload();
        }
      } catch { /* Home still renders; the topic missions stand in */ }
    })();
    return () => { live = false; };
  }, [data, reload]);
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

  const journeyMode = journey?.engine === 'UNIT';
  const jActs = jDay?.activities || [];
  const jDone = jActs.filter(a => a.done).length;
  const jTotalXp = jActs.reduce((t, a) => t + (a.xp || 0), 0) + (jDay?.dayBonusXp || 0);
  const jEarned = jActs.reduce((t, a) => t + (a.done ? a.xp || 0 : 0), 0) + (jDay?.status === 'COMPLETED' ? jDay?.dayBonusXp || 0 : 0);
  const dayHref = `/careerpilot/journey/day/${journey?.currentDay ?? 1}`;
  const score = d.coderScore!.score;
  const scoreTag = score >= 750 ? 'Excellent' : score >= 500 ? 'On track' : 'Just getting started';
  const goalPct = Math.min(100, Math.round(goal.target ? (goal.earned / goal.target) * 100 : 0));
  const streakTarget = st.streak < 7 ? 7 : st.streak < 21 ? 21 : st.streak < 30 ? 30 : 100;
  const missionXp = shownMissions.reduce((s, m) => s + m.xp, 0);
  const missionsDone = shownMissions.filter(m => m.done).length;

  /**
   * THE MEMBER HOME, IN THE ORDER A STUDENT USES IT.
   *
   * What to do now leads (today's goal, the journey day, the missions); how they are doing follows (scores,
   * activity, the board); the long view closes (badges, contests, the career path). Every figure is the one
   * this screen always showed — the redesign moves and groups them, it does not invent any.
   */
  return (
    <div className="md">
      <section className="md-hero">
        <div className="md-hero-copy">
          <span className="md-eyebrow">Day {st.day} of {st.totalDays}{d.pathwayLabel ? ` · ${d.pathwayLabel}` : ''}</span>
          <h1>Today’s <span>focus</span></h1>
          <p>{goal.met
            ? 'Today’s goal is reached — anything else you do today is bonus.'
            : `${Math.max(0, goal.target - goal.earned)} XP to today’s goal. Finish your missions to get there.`}</p>
          <div className={`md-goal${goal.met ? ' met' : ''}`}>
            <div className="md-goal-top"><b>{goal.met ? <><i className="bi bi-check-circle-fill" /> Today’s goal reached</> : 'Today’s goal'}</b><span>{goal.earned} / {goal.target} XP · {goalPct}%</span></div>
            <div className="md-goal-bar" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} aria-label="Today's goal"><i style={{ width: `${Math.max(goal.earned > 0 ? 3 : 0, goalPct)}%` }} /></div>
          </div>
          <div className="md-hero-actions">
            {journeyMode && journey?.available && journey.enrollmentId
              ? <button className="md-btn light" onClick={() => nav(dayHref)}>{jDone ? 'Continue today’s work' : 'Start today’s work'} <Bi name="arrow-right" /></button>
              : <button className="md-btn light" onClick={startNext}>
                  {nextMission ? (nextMission.link ? 'Start next mission' : 'Write your answer') : 'Practice anyway'} <Bi name="arrow-right" />
                </button>}
            <button className="md-btn ghost" onClick={() => nav('/careerpilot/roadmap')}><Bi name="map" /> My roadmap</button>
          </div>
        </div>
        <div className="md-hero-score">
          <div className="md-score-ring" style={{ ['--md-deg' as any]: `${Math.min(1000, score) * 0.36}deg` }}>
            <div><strong>{score}</strong><span>/ 1000</span></div>
          </div>
          <div className="md-hero-score-copy">
            <small>Coder score <span className="md-help" title="A 0–1000 composite of your assessment, practice, missions, interviews and resume.">?</span></small>
            <b>{scoreTag}</b>
            <span>{d.percentileAhead !== null && d.percentileAhead !== undefined
              ? <>Ahead of <em>{d.percentileAhead}%</em> of CareerPilot members.</>
              : 'Rankings appear once more members join your cohort.'}</span>
          </div>
        </div>
      </section>

      <section className="md-kpis">
        <div><span className="ic amber"><Bi name="fire" /></span><div><small>Streak</small><b>{st.streak}<em> {st.streak === 1 ? 'day' : 'days'}</em></b><span>Best {st.longestStreak} {st.longestStreak === 1 ? 'day' : 'days'}</span></div></div>
        <div><span className="ic blue"><Bi name="award-fill" /></span><div><small>Level {lv.level}</small><b className="sm">{lv.title}</b><span className="md-mini-bar"><i style={{ width: `${lv.progressPct}%` }} /></span><span>{lv.xpToNextLevel.toLocaleString()} XP to level {lv.nextLevel}</span></div></div>
        <div><span className="ic teal"><Bi name="code-slash" /></span><div><small>Problems solved</small><b>{st.solved}<em> / {st.totalProblems}</em></b><span>{st.accuracy ? `${st.accuracy.pct}% accuracy` : 'No attempts yet'}</span></div></div>
        <div><span className="ic violet"><Bi name="mic-fill" /></span><div><small>Mock interviews</small><b>{st.interviews}</b><span>{st.bestInterview !== null ? `Best ${st.bestInterview}%` : 'Not attempted yet'}</span></div></div>
      </section>


      <section className="md-grid wide">
        {journeyMode ? (
          /**
           * TODAY'S MISSIONS ARE TODAY'S JOURNEY DAY.
           *
           * A student the unit engine plans has one plan, and the topic planner's daily missions are not part
           * of it — which is why this card used to offer a member "Build my 90-day plan". Their missions are
           * the tasks of the day their journey is on, each with the XP it pays (foundationJourneyXpService),
           * worked through in the day player.
           */
          <article className="md-card">
            <header className="md-card-head">
              <div>
                <h2><Bi name="list-task" /> Today’s missions</h2>
                <p>{jDay ? `Day ${jDay.day} of ${jDay.totalDays} · ${jDay.title}` : journey?.available ? `Day ${journey.currentDay ?? 1} of ${journey.totalDays ?? 90}` : 'Your Foundation journey'}</p>
              </div>
              {jDay && <span className="md-pill">{jDone} of {jActs.length} done · +{jEarned} / {jTotalXp} XP</span>}
            </header>
            {!journey?.available ? (
              <div className="md-empty">
                <p>{journey?.message || 'Your journey appears here once your skill check is complete.'}</p>
                {journey?.reason === 'NO_JOURNEY' && <button className="md-btn primary" onClick={() => nav('/careerpilot/skill-assessment')}>Take your skill check</button>}
              </div>
            ) : !jDay ? (
              <div className="md-empty">Loading today’s tasks…</div>
            ) : <>
              <div className="md-missions">
                {jActs.map(a => (
                  <button type="button" key={a.id || a.order} className={`md-mission md-jm${a.done ? ' done' : ''}`} onClick={() => nav(dayHref)}>
                    <span className={`md-mission-ic t-${a.type}`}><Bi name={JOURNEY_ICON[a.type] || 'journal-text'} /></span>
                    <span className="txt"><b>{a.title}</b><span>{JOURNEY_TYPE[a.type] || a.type}{a.minutes ? ` · ${a.minutes} min` : ''}{a.gating ? ' · must be completed' : ''}</span></span>
                    {(a.xp ?? 0) > 0 && <span className="xp">+{a.xp} XP</span>}
                    <span className={`md-check${a.done ? ' on' : ''}`} aria-label={a.done ? 'Done' : 'Not done yet'}>{a.done && <Bi name="check-lg" />}</span>
                  </button>
                ))}
                {(jDay.dayBonusXp ?? 0) > 0 && (
                  <div className={`md-mission md-jm bonus${jDay.status === 'COMPLETED' ? ' done' : ''}`}>
                    <span className="md-mission-ic"><Bi name="gift-fill" /></span>
                    <span className="txt"><b>Finish every task today</b><span>Day bonus, on top of each task’s XP</span></span>
                    <span className="xp">+{jDay.dayBonusXp} XP</span>
                    <span className={`md-check${jDay.status === 'COMPLETED' ? ' on' : ''}`} aria-hidden="true">{jDay.status === 'COMPLETED' && <Bi name="check-lg" />}</span>
                  </div>
                )}
              </div>
              <div className="md-jm-actions">
                {journey.enrollmentId && <button className="md-btn primary" onClick={() => nav(dayHref)}>{jDone ? 'Continue today’s work' : 'Start today’s work'} <Bi name="arrow-right" /></button>}
                <button className="md-btn" onClick={() => nav('/careerpilot/roadmap')}>See all {journey.totalDays ?? 90} days</button>
              </div>
            </>}
          </article>
        ) : (
        <article className="md-card">
          <header className="md-card-head">
            <div>
              <h2><Bi name="list-task" /> {pastDay ? `Day ${pastDay.day} missions` : 'Today’s missions'}</h2>
              <p>{totalMissions ? `${missionsDone} of ${totalMissions} done · +${missionXp} XP for all of them` : 'Your daily missions appear here.'}</p>
            </div>
            <div className="md-day-nav">
              <button onClick={() => stepDay(-1)} disabled={(pastDay?.day ?? d.day ?? 1) <= 1 || dayBusy} title="Previous day" aria-label="Previous day"><Bi name="chevron-left" /></button>
              {pastDay ? <button className="today" onClick={() => setPastDay(null)}>Back to today</button> : <span className="md-timer"><Bi name="clock" /> {hoursLeft}</span>}
              <button onClick={() => stepDay(1)} disabled={!pastDay || dayBusy} title="Next day" aria-label="Next day"><Bi name="chevron-right" /></button>
            </div>
          </header>
          {!totalMissions ? (
            <div className="md-empty">
              {data.dailyPlan && !data.dailyPlan.available ? <>
                <p>{data.dailyPlan.message}</p>
                {data.dailyPlan.reason === 'ROADMAP_REQUIRED' && <button className="md-btn primary" onClick={() => nav('/careerpilot/roadmap')}>Build my 90-day plan</button>}
              </> : 'No missions generated for today.'}
            </div>
          ) : <>
            <div className="md-missions">
              {shownMissions.map(m => (
                <React.Fragment key={m.key}>
                  <div className={`md-mission${m.done ? ' done' : ''}`} id={`mission-${m.key}`}>
                    <span className="md-mission-ic"><Bi name={MISSION_ICON[m.category] || 'circle'} /></span>
                    <div className="txt"><b>{m.title}</b><span>{m.detail}</span></div>
                    {m.link && !m.done && <button className="lnk" onClick={() => openMissionLink(m.link!, nav)}>Open <Bi name="arrow-right" /></button>}
                    {m.needsAnswer && !m.done && <button className="lnk" onClick={() => { setAnswerFor(answerFor === m.key ? null : m.key); setAnswerText(''); setAnswerMsg(''); }}>{answerFor === m.key ? 'Close' : 'Write answer'} <Bi name="arrow-right" /></button>}
                    <span className="xp">+{m.xp} XP</span>
                    <button className={`md-check${m.done ? ' on' : ''}`} aria-label={m.done ? 'Done' : 'Mark done'} disabled={m.done || (m.verify === 'interview' && !m.done) || (m.needsAnswer && !m.done)} onClick={() => toggleMission(m.key)}>{m.done && <Bi name="check-lg" />}</button>
                  </div>
                  {m.needsAnswer && !m.done && answerFor === m.key && <div className="md-answer">
                    <textarea value={answerText} autoFocus rows={3} placeholder="Type your answer here…" onChange={e => setAnswerText(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} />
                    <div className="hint"><Bi name="pencil-square" /> Write it in your own words — pasting is turned off for this one.</div>
                    <div className="md-answer-row"><button className="md-btn primary sm" onClick={() => saveAnswer(m.key)} disabled={answerBusy}>{answerBusy ? 'Saving…' : `Save & complete +${m.xp} XP`}</button><button className="md-btn sm" onClick={() => { setAnswerFor(null); setAnswerMsg(''); }}>Cancel</button>{answerMsg && <span className="msg">{answerMsg}</span>}</div>
                  </div>}
                  {m.done && m.answer && <div className="md-answer saved"><b>Your answer</b><p>{m.answer}</p></div>}
                  {(m.feedback || (justCoached?.key === m.key && justCoached.feedback)) && <div className="md-coach"><b><Bi name="chat-dots" /> Coach</b><p>{m.feedback || justCoached?.feedback}</p></div>}
                </React.Fragment>
              ))}
            </div>
            {missionMsg && <div className="md-error">{missionMsg}</div>}
            <button className="md-btn primary block" onClick={startNext}>{nextMission ? (nextMission.link ? 'Start now' : 'Write your answer') : 'All done today — practice anyway'} <Bi name="arrow-right" /></button>
          </>}
        </article>
        )}

        <div className="md-col">
          <article className="md-card">
            <header className="md-card-head"><div><h2><Bi name="fire" /> Streak</h2><p>{st.streak} {st.streak === 1 ? 'day' : 'days'} in a row</p></div></header>
            <div className="md-week">{(d.streakWeek || []).map(w => <div key={w.date}><div className={`dot${w.active ? ' on' : ''}${w.isToday ? ' today' : ''}`}>{w.active && <Bi name="check-lg" />}</div><div className="l">{w.letter}</div></div>)}</div>
            <div className="md-milestone"><span className="ic"><Bi name="gift-fill" /></span><div><b>{streakTarget}-day streak</b><span>{streakTarget - st.streak} {streakTarget - st.streak === 1 ? 'day' : 'days'} to go — keep it up</span></div></div>
          </article>

          <article className="md-card">
            <header className="md-card-head"><div><h2><Bi name="gift" /> Next level</h2><p>Level {lv.nextLevel} · {lv.xpIntoLevel} / {lv.xpForThisLevel} XP</p></div></header>
            <div className="md-level-bar"><i style={{ width: `${lv.progressPct}%` }} /></div>
            <div className="md-unlock"><span className="ic"><Bi name="award-fill" /></span><div><small>You will unlock</small><b>{lv.nextTitle}</b></div></div>
          </article>
        </div>
      </section>

      <section className="md-grid">
        <article className="md-card">
          <header className="md-card-head"><div><h2><Bi name="person-workspace" /> Where your score comes from</h2><p>Your coder score of {score}, part by part.</p></div></header>
          <div className="md-parts">
            {d.coderScore!.parts.map(p => {
              const pct = Math.round((p.earned / p.max) * 100);
              return <div className="md-part" key={p.label}>
                <div className="top"><span>{p.label}</span><b>{pct}%</b></div>
                <div className="bar"><i style={{ width: `${Math.max(2, pct)}%` }} /></div>
              </div>;
            })}
          </div>
          <div className="md-hint"><Bi name="lightning-charge-fill" /> Earn {lv.xpToNextLevel.toLocaleString()} XP to reach Level {lv.nextLevel}</div>
        </article>

        <article className="md-card">
          <header className="md-card-head">
            <div><h2><Bi name="stars" /> Skill meter</h2><p>Your six career readiness categories.</p></div>
            <button className="md-link" onClick={() => nav('/careerpilot/readiness')}>Full report <Bi name="arrow-right" /></button>
          </header>
          <div className="md-radar"><Radar skills={d.skills || []} /></div>
        </article>
      </section>

      <section className="md-grid wide">
        <article className="md-card">
          <header className="md-card-head">
            <div><h2><Bi name="clock-history" /> Recent activity</h2><p>Last 7 days{d.weekly && d.weekly.xpLastWeek > 0 ? ` · ${d.weekly.xpDelta >= 0 ? '+' : ''}${d.weekly.xpDelta} XP vs last week` : ''}</p></div>
            <div className="md-chips">
              <span><b>{d.weekly?.submissions ?? 0}</b> submissions</span>
              <span><b>{d.weekly?.totalAttempts ?? 0}</b> attempts</span>
            </div>
          </header>
          {!d.recentActivity?.length ? <div className="md-empty">Nothing yet. Complete a mission or solve a problem and it appears here.</div> : <>
            {hasActivity && <div className="md-chart-wrap"><AreaChart points={d.activity || []} /></div>}
            <div className="md-feed">{d.recentActivity.map((a, i) => <div className="md-feed-row" key={i}><span className="ic"><Bi name="activity" /></span><span className="t">{a.label}</span><span className="xp">+{a.xp} XP</span><span className="ago">{a.ago}</span></div>)}</div>
          </>}
        </article>

        <article className="md-card">
          <header className="md-card-head" id="leaderboard">
            <div><h2><Bi name="bar-chart-steps" /> Leaderboard</h2><p>{st.cohortRank ? `You are #${st.cohortRank}` : 'Your cohort'}{st.cohortSize > 1 ? ` of ${st.cohortSize} members` : ''}</p></div>
          </header>
          {!d.leaderboard?.length ? <div className="md-empty">You're the first member here — the board fills as others join.</div> : <div className="md-lb">{d.leaderboard.map((r, i, arr) => <React.Fragment key={`${r.rank}-${r.name}`}>{i > 0 && r.rank > arr[i - 1].rank + 1 && <div className="md-lb-gap" aria-hidden="true">⋯</div>}<div className={`md-lb-row${r.me ? ' me' : ''}`}><span className={`rk${r.rank <= 3 ? ` g${r.rank}` : ''}`}>{r.rank}</span><span className="av">{(r.name[0] || '?').toUpperCase()}</span><span className="nm">{r.name}{r.me ? ' (You)' : ''}</span><b className="xp">{r.xp.toLocaleString()} XP</b></div></React.Fragment>)}</div>}
        </article>
      </section>

      <section className="md-grid wide">
        <article className="md-card">
          <header className="md-card-head" id="badges"><div><h2><Bi name="award" /> Badge collection</h2><p>{(d.badges || []).filter(b => b.earned).length} earned</p></div><button className="md-link" onClick={() => nav('/careerpilot/achievements')}>View all <Bi name="arrow-right" /></button></header>
          <div className="md-badges">{(d.badges || []).slice(0, 5).map((b: Badge) => <div className={`md-badge${b.earned ? ' earned' : ''}`} key={b.key} title={b.hint}><div className="hex">{b.earned ? <Bi name="star-fill" /> : <Bi name="lock-fill" />}</div><b>{b.label}</b>{b.earned ? <span>Earned</span> : <><span>{Math.round(b.progress * 100)}%</span><div className="pbar"><i style={{ width: `${Math.round(b.progress * 100)}%` }} /></div></>}</div>)}</div>
        </article>

        <article className="md-card">
          <header className="md-card-head"><div><h2><Bi name="trophy" /> Upcoming contests</h2><p>Compete, learn and win.</p></div>{!!d.contests?.length && <button className="md-link" onClick={() => nav('/battles')}>View all <Bi name="arrow-right" /></button>}</header>
          {!d.contests?.length
            ? <div className="md-empty"><span className="big"><Bi name="calendar-event" /></span><b>No contests scheduled right now.</b><span>You'll see upcoming contests here.</span><button className="md-btn sm" onClick={() => nav('/battles')}>Explore contests</button></div>
            : <div className="md-contests">{d.contests.slice(0, 2).map((c, i) => <div className="md-contest" key={c.id}><span className="ic"><Bi name="trophy-fill" /></span><div className="info"><b>{c.title}{i === 0 && <em>Featured</em>}</b><span><Bi name="calendar3" /> {new Date(c.startAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{c.prize ? ` · Prize ${c.prize}` : ''}</span></div><button className="md-btn primary sm" onClick={() => nav(c.slug ? `/battles/${c.slug}` : '/battles')}>Register</button></div>)}</div>}
        </article>
      </section>

      <section className="md-path">
        <div className="md-path-lead"><span className="ic"><Bi name="compass" /></span><div><small>Your career path</small><b>{d.pathwayLabel}</b></div></div>
        <div className="md-steps">{(d.journey || []).map((p, i) => <div className={`md-step${p.done ? ' done' : p.current ? ' current' : ' locked'}`} key={p.key}><div className="dot">{p.done ? <Bi name="check-lg" /> : p.current ? i + 1 : <Bi name="lock-fill" />}</div><div className="cap">{p.label.replace(/^Phase \d+ · /, '')}<span>{p.done ? 'Completed' : p.current ? 'In progress' : 'Locked'}</span></div></div>)}</div>
        <div className="md-path-end"><span className="ic"><Bi name={st.completedDays >= st.totalDays ? 'check-circle-fill' : 'flag-fill'} /></span><small>Placement ready</small></div>
      </section>
    </div>
  );
};

export default Dashboard;
