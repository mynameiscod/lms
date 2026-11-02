import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import passportApi, { DashboardData, Badge, FoundationJourney, FoundationJourneyDay, OrientationDay, GamificationSummary, ScopedLeaderboardResponse } from '../../api/passportApi';
import { thinkingLabApi, TLStats } from '../../api/thinkingLabApi';
import { communicationApi, CommProgress } from '../../api/communicationApi';
import './dashboard.css';
import './dashboard-redesign.css';
import './dashboardHome.css';
import { barWidth } from '../../utils/barWidth';

const Bi: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <i className={`bi bi-${name}${className ? ` ${className}` : ''}`} aria-hidden="true" />
);

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
/* A welcome-day task (0.1–0.5), in the same words the welcome pages use. */
const WELCOME_TYPE: Record<string, string> = { video: 'Video', notes: 'Notes', image: 'Image', checklist: 'Checklist', recording: 'Recording' };
const WELCOME_ICON: Record<string, string> = { video: 'play-circle', notes: 'journal-text', image: 'image', checklist: 'check2-square', recording: 'mic' };

/* Each badge as an icon of its own (the server's are emoji, which render differently on every device). */
const BADGE_ICON: Record<string, string> = {
  problem_solver: 'check2-circle', dsa_explorer: 'diagram-3-fill', algo_wizard: 'magic', speed_demon: 'lightning-charge-fill',
  consistency: 'calendar2-check-fill', interview_ready: 'mic-fill', ats_ready: 'file-earmark-check-fill', code_master: 'trophy-fill',
};
/* Skill rows take their icon from the skill's name; anything unrecognised gets a neutral mark. */
const skillIcon = (label: string) => {
  const l = label.toLowerCase();
  if (/data struct|algorithm|dsa/.test(l)) return 'diagram-3';
  if (/program|coding|code|java|python|javascript/.test(l)) return 'code-slash';
  if (/web|html|css|front/.test(l)) return 'window';
  if (/data ?base|sql/.test(l)) return 'database';
  if (/communicat|english|speak/.test(l)) return 'chat-dots';
  if (/aptitude|quant|math/.test(l)) return 'calculator';
  if (/reason|logic/.test(l)) return 'puzzle';
  if (/system|design|architect/.test(l)) return 'boxes';
  if (/cloud|devops/.test(l)) return 'cloud';
  if (/security|cyber/.test(l)) return 'shield-lock';
  if (/ai|machine|ml|data sci|analytic/.test(l)) return 'cpu';
  return 'stars';
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

/** "Top 12%" from a rank among N — at least 1%, so the leader does not read "Top 0%". */
const topPct = (rank: number | null | undefined, of: number | null | undefined) =>
  rank && of ? Math.max(1, Math.ceil((rank / of) * 100)) : null;

/** The hero's mountain: a winding path to a flag, in the brand teal and navy. Decorative. */
const Summit: React.FC = () => (
  <svg className="dbx-summit" viewBox="0 0 360 200" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="dbxPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3FB3C4" /><stop offset="1" stopColor="#167E91" /></linearGradient>
      <linearGradient id="dbxPeak2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FD3E0" /><stop offset="1" stopColor="#3FA4B6" /></linearGradient>
      <linearGradient id="dbxBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9EAF0" /><stop offset="1" stopColor="#E6F6F9" /></linearGradient>
    </defs>
    <ellipse cx="70" cy="58" rx="34" ry="11" fill="#fff" opacity=".9" />
    <ellipse cx="300" cy="44" rx="28" ry="9" fill="#fff" opacity=".85" />
    <path d="M0 200 L70 120 L120 160 L170 100 L215 150 L262 112 L360 200 Z" fill="url(#dbxBack)" />
    <path d="M40 200 L188 34 L336 200 Z" fill="url(#dbxPeak)" />
    <path d="M188 34 L336 200 L250 200 Z" fill="#0E6577" opacity=".35" />
    <path d="M188 34 L166 72 L178 66 L188 80 L198 64 L212 72 Z" fill="#F3FBFD" />
    <path d="M96 200 L150 150 L186 178 L222 140 L290 200 Z" fill="url(#dbxPeak2)" opacity=".9" />
    <path d="M200 200 C 168 182, 236 168, 200 150 S 170 120, 196 104 S 214 86, 190 76" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity=".9" />
    <path d="M200 200 C 168 182, 236 168, 200 150 S 170 120, 196 104 S 214 86, 190 76" fill="none" stroke="#F5B83D" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
    <line x1="188" y1="36" x2="188" y2="6" stroke="#051D64" strokeWidth="3" strokeLinecap="round" />
    <path d="M189 7 L214 13 L189 20 Z" fill="#F5B83D" />
  </svg>
);

/**
 * The gold wreath around the global rank: a branch of paired leaves up each side of an arc that
 * opens at the top, computed rather than hand-placed so the leaves sit evenly. Decorative.
 */
const LEAF_ANGLES = [116, 134, 152, 170, 188, 206, 224, 240]; // degrees round the centre, bottom-left to top-left
const Laurel: React.FC = () => {
  // Wide enough between the branches for the rank and its caption.
  const cx = 66, cy = 54, r = 48;
  const at = (deg: number, dist: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)];
  };
  const [sx, sy] = at(100, r);
  const [ex, ey] = at(246, r);
  return (
    <svg className="dbx-laurel" viewBox="0 0 132 112" aria-hidden="true" focusable="false">
      {[0, 1].map(side => (
        <g key={side} transform={side ? 'translate(132 0) scale(-1 1)' : undefined}>
          <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke="#D9A21B" strokeWidth="2.2" strokeLinecap="round" />
          {LEAF_ANGLES.map((deg, i) => {
            // Each pair leans up the branch: one leaf outside the arc, one inside.
            const [ox, oy] = at(deg, r + 6);
            const [ix, iy] = at(deg, r - 6);
            const along = deg + 90 - 180; // the branch's direction at this point, pointing upward
            return (
              <g key={deg}>
                <ellipse cx={ox} cy={oy} rx="3.4" ry="8" transform={`rotate(${along + 35} ${ox} ${oy})`} fill={i % 2 ? '#F5B83D' : '#E8A317'} />
                <ellipse cx={ix} cy={iy} rx="3" ry="7" transform={`rotate(${along - 35} ${ix} ${iy})`} fill={i % 2 ? '#FFCF5C' : '#F5B83D'} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
};

const Dashboard: React.FC<Props> = ({ data, reload }) => {
  const nav = useNavigate();
  const [d, setD] = useState<DashboardData>(data);
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerMsg, setAnswerMsg] = useState('');
  const [justCoached, setJustCoached] = useState<{ key: string; feedback: string } | null>(null);
  const [missionMsg, setMissionMsg] = useState('');
  /** Today's plan shows three tasks; "View more" opens the rest in place. */
  const [allTasks, setAllTasks] = useState(false);

  const hidden = new Set<string>(((d as any).hidden || []) as string[]);
  const lockedSections = new Set<string>((d.locked || []).map(l => l.section));

  /**
   * MY DASHBOARD IS HOME AND MY PROGRESS IN ONE.
   *
   * Level, coins, ranks and badges come from the same server summaries My Progress read, loaded
   * beside the member payload; a failure leaves those cards out rather than the dashboard.
   */
  const [prog, setProg] = useState<GamificationSummary | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [board, setBoard] = useState<ScopedLeaderboardResponse | null>(null);
  const [boardBusy, setBoardBusy] = useState(false);
  // Global is every member's board; College joins it only for a college tenant (set once ranks load).
  const [scope, setScope] = useState('GLOBAL');
  const [period, setPeriod] = useState('ALL_TIME');
  useEffect(() => {
    Promise.allSettled([passportApi.getMyGamification(), passportApi.getRewards()]).then(([g, r]) => {
      if (g.status === 'fulfilled') setProg(g.value);
      if (r.status === 'fulfilled') setCoins(Number(r.value?.student?.coins ?? r.value?.student?.coinBalance ?? 0));
    });
  }, [data]);
  useEffect(() => {
    let live = true;
    setBoardBusy(true);
    passportApi.getMyLeaderboard(scope, period)
      .then(b => { if (live) setBoard(b); })
      .catch(() => { if (live) setBoard(null); })
      .finally(() => { if (live) setBoardBusy(false); });
    return () => { live = false; };
  }, [scope, period]);

  /* The labs' own figures, only for labs this member can open: a hidden or locked lab is not asked. */
  const thinkingOpen = !hidden.has('thinkingLab') && !lockedSections.has('thinkingLab');
  const commOpen = !hidden.has('communication') && !lockedSections.has('communication');
  const [tl, setTl] = useState<TLStats | null>(null);
  const [comm, setComm] = useState<CommProgress | null>(null);
  useEffect(() => {
    if (thinkingOpen) thinkingLabApi.stats().then(setTl).catch(() => setTl(null));
    if (commOpen) communicationApi.progress().then(setComm).catch(() => setComm(null));
  }, [thinkingOpen, commOpen, data]);

  useEffect(() => { setD(data); }, [data]);
  /**
   * The Foundation journey, when the unit engine plans this student: its current day IS today's plan.
   * Re-read whenever the member payload reloads (a return to the tab, a finished task), so the ticks and
   * XP follow work done in the day player.
   */
  const [journey, setJourney] = useState<FoundationJourney | null>(null);
  const [jDay, setJDay] = useState<FoundationJourneyDay | null>(null);
  /**
   * TODAY IS A WELCOME DAY WHILE THE WELCOME IS OWED.
   *
   * Day 1 stays shut until 0.1–0.5 are done, so the welcome day the member is on is today's plan instead.
   */
  const [welcomeDay, setWelcomeDay] = useState<OrientationDay | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const j = await passportApi.myFoundationJourney();
        if (!live) return;
        setJourney(j);
        if (j.engine === 'UNIT' && j.available && j.access !== 'PREVIEW' && j.orientation?.blocking && !j.orientation.complete) {
          const v = await passportApi.getMyOrientation();
          if (!live) return;
          // The day they can open now; for a paced member who did today's, the next one (it says when it opens).
          setWelcomeDay(v.days.find(x => x.dayNumber === v.nextDay) || v.days.find(x => !x.done) || null);
          setJDay(null);
          return;
        }
        setWelcomeDay(null);
        if (j.engine === 'UNIT' && j.available && j.access !== 'PREVIEW' && j.currentDay) {
          const day = await passportApi.myFoundationJourneyDay(j.currentDay);
          if (!live) return;
          setJDay(day);
          // Reading the day just paid XP for work finished elsewhere: reload the member payload once (the next read pays nothing).
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

  const toggleMission = async (key: string) => {
    setMissionMsg('');
    setD(p => ({ ...p, missions: p.missions?.map(m => m.key === key ? { ...m, done: true } : m) }));
    try {
      await passportApi.completeMission(key);
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

  const st = d.stats!;
  const lv = d.level!;
  const missions = d.missions || [];
  const nextMission = missions.find(m => !m.done) || null;
  const progressOn = !hidden.has('progress');

  const journeyMode = journey?.engine === 'UNIT';
  /* "Day N of M" is the member's own programme (130 for a Specialize journey), not the old 90-day default. */
  const planTotal = (journey?.available && journey.totalDays) || d.programDays || st.totalDays;
  const planDay = journey?.available ? (journey.currentDay ?? 1) : st.day;
  const welcomeHref = welcomeDay ? `/careerpilot/journey/welcome/${welcomeDay.dayNumber}` : '';
  const wItems = welcomeDay?.items || [];
  const jActs = jDay?.activities || [];
  const dayHref = `/careerpilot/journey/day/${journey?.currentDay ?? 1}`;
  const score = d.coderScore?.score ?? 0;
  const weekly = d.weekly;

  /**
   * TODAY'S PLAN, AS ONE LIST WHATEVER PLANS THE MEMBER.
   *
   * A welcome day, a journey day and the topic planner's missions each become the same rows. A journey
   * or welcome row opens its day; a topic mission keeps its own Open / Write answer / tick, as before.
   */
  type Row = { key: string; icon: string; tone: string; title: string; sub: string; xp: number; done: boolean; open?: () => void; mission?: typeof missions[number] };
  let rows: Row[] = [];
  let planEarned = 0; let planXp = 0;
  let planLabel = `Day ${planDay} of ${planTotal}`;
  let continueTo: (() => void) | null = null;
  let planEmpty: React.ReactNode = null;
  if (journeyMode && welcomeDay) {
    planLabel = `Day ${welcomeDay.day} · before Day 1`;
    rows = wItems.map(it => ({
      key: it.key, icon: WELCOME_ICON[it.kind] || 'journal-text', tone: it.kind, title: it.title,
      sub: `${WELCOME_TYPE[it.kind] || it.kind}${it.estimatedMinutes ? ` · ${it.estimatedMinutes} min` : ''}${it.required ? '' : ' · optional'}`,
      xp: 0, done: !!it.done, open: welcomeDay.locked ? undefined : () => nav(welcomeHref),
    }));
    if (!welcomeDay.locked) continueTo = () => nav(welcomeHref);
    else planEmpty = <>Today’s welcome is done. Day {welcomeDay.day} opens tomorrow.</>;
  } else if (journeyMode) {
    if (!journey?.available) {
      planEmpty = <>
        {journey?.message || 'Your plan appears here once your skill check is complete.'}
        {journey?.reason === 'NO_JOURNEY' && <button className="dbx-btn primary sm" onClick={() => nav('/careerpilot/skill-assessment')}>Take your skill check</button>}
      </>;
    } else if (jDay) {
      planLabel = `Day ${jDay.day} of ${jDay.totalDays}`;
      rows = jActs.map(a => ({
        key: String(a.id || a.order), icon: JOURNEY_ICON[a.type] || 'journal-text', tone: a.type, title: a.title,
        sub: `${JOURNEY_TYPE[a.type] || a.type}${a.minutes ? ` · ${a.minutes} min` : ''}`,
        xp: a.xp || 0, done: !!a.done, open: () => nav(dayHref),
      }));
      planXp = rows.reduce((t, r) => t + r.xp, 0) + (jDay.dayBonusXp || 0);
      planEarned = rows.reduce((t, r) => t + (r.done ? r.xp : 0), 0) + (jDay.status === 'COMPLETED' ? jDay.dayBonusXp || 0 : 0);
      if (journey.enrollmentId) continueTo = () => nav(dayHref);
    }
  } else {
    rows = missions.map(m => ({
      key: m.key, icon: MISSION_ICON[m.category] || 'circle', tone: m.category, title: m.title, sub: m.detail,
      xp: m.xp, done: m.done, mission: m,
    }));
    planXp = rows.reduce((t, r) => t + r.xp, 0);
    planEarned = rows.reduce((t, r) => t + (r.done ? r.xp : 0), 0);
    if (nextMission) continueTo = () => (nextMission.link ? openMissionLink(nextMission.link, nav) : setAnswerFor(nextMission.key));
    if (!rows.length) {
      planEmpty = d.dailyPlan && !d.dailyPlan.available ? <>
        {d.dailyPlan.message}
        {d.dailyPlan.reason === 'ROADMAP_REQUIRED' && <button className="dbx-btn primary sm" onClick={() => nav('/careerpilot/roadmap')}>{d.programDays ? `Build my ${d.programDays}-day plan` : 'Build my plan'}</button>}
      </> : 'No tasks planned for today.';
    }
  }
  if (!planXp && d.dailyGoal) { planXp = d.dailyGoal.target; planEarned = d.dailyGoal.earned; }
  const rowsDone = rows.filter(r => r.done).length;
  const shownRows = allTasks ? rows : rows.slice(0, 3);
  const moreRows = rows.length - shownRows.length;
  const heroGo = continueTo || (() => nav('/careerpilot/roadmap'));
  const heroLabel = rows.length && rowsDone === rows.length ? 'See your roadmap' : rowsDone ? 'Continue Today’s Plan' : 'Start Today’s Plan';

  /* XP this week against last week, as the Total XP card's trend. */
  const xpTrend = !weekly || !weekly.xpThisWeek ? null
    : weekly.xpLastWeek > 0 ? `${weekly.xpDelta >= 0 ? '+' : ''}${Math.round((weekly.xpDelta / weekly.xpLastWeek) * 100)}%`
    : `+${weekly.xpThisWeek}`;
  const xpTrendUp = !weekly || weekly.xpDelta >= 0;

  const streakTarget = st.streak < 7 ? 7 : st.streak < 21 ? 21 : st.streak < 30 ? 30 : 100;
  /* Badges: earned first, then the nearest to earning. */
  const badges = [...(d.badges || [])].sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress);
  const earnedBadges = badges.filter(b => b.earned).length;
  const skills = [...(d.skills || [])].sort((a, b) => b.score - a.score).slice(0, 5);

  const ranks = prog?.ranks || {};
  const collegeOn = !!ranks.college?.available;
  const boardOk = !!board && board.available;
  const myRank = boardOk ? board.myRank : null;
  const of = boardOk ? board.participantCount : 0;
  const mainTop = topPct(myRank, of);
  /* The second figure is the OTHER board: the college for a college member, else how many are ranked. */
  const other = scope === 'GLOBAL' ? ranks.college : ranks.global;
  const otherTop = other?.available ? topPct(other.rank, other.participants) : null;

  const labs = [
    {
      key: 'thinkingLab', section: 'thinkingLab', icon: 'lightbulb', tone: 'blue', title: 'Thinking Lab', sub: 'Learning & problem solving',
      to: '/careerpilot/thinking-lab',
      pct: null as number | null,
      note: !tl ? 'Solve today’s challenge' : tl.solvedTotal ? `${tl.solvedTotal} solved${tl.streak ? ` · ${tl.streak}-day streak` : ''}` : 'Solve your first challenge',
    },
    {
      key: 'communication', section: 'communication', icon: 'chat-square-text', tone: 'violet', title: 'Communication Lab', sub: 'Speak · Present · Interview',
      to: '/careerpilot/communication',
      pct: comm && comm.timeline?.length ? Math.round(comm.latest) : null,
      note: comm && comm.timeline?.length ? 'Latest score' : 'Record your first answer',
    },
    { key: 'aptitude', section: '', icon: 'calculator', tone: 'teal', title: 'Aptitude', sub: 'Quant · DI · Arithmetic', to: '/careerpilot/aptitude', pct: null, note: 'Coming soon', soon: true },
    { key: 'reasoning', section: '', icon: 'puzzle', tone: 'amber', title: 'Reasoning', sub: 'Logical · Analytical · Verbal', to: '/careerpilot/reasoning', pct: null, note: 'Coming soon', soon: true },
  ].filter(l => !hidden.has(l.key));

  const contest = d.contests?.[0];

  return (
    <div className="dbx">
      <div className="dbx-grid">
        <div className="dbx-main">
          {/* ── Hero ── */}
          <section className="dbx-hero">
            <div className="dbx-hero-copy">
              <h2 className="dbx-hero-h">Your Placement Journey <span>Starts Here <span className="rocket" aria-hidden="true">🚀</span></span></h2>
              <div className="dbx-hero-sub">Practice <i>•</i> Build <i>•</i> Interview <i>•</i> Get Placed</div>
              <button className="dbx-btn primary lg" onClick={heroGo}>{heroLabel} <Bi name="arrow-right" /></button>
            </div>
            <Summit />
            <ul className="dbx-hero-list">
              {['Build strong skills', 'Improve communication', 'Practise real interviews', 'Track your placement readiness'].map(t => (
                <li key={t}><Bi name="check-circle-fill" /> {t}</li>
              ))}
            </ul>
          </section>

          {/* ── Figures ── */}
          <section className="dbx-stats" aria-label="Your figures">
            <div className="dbx-stat">
              <span className="ic teal"><Bi name="lightning-charge-fill" /></span>
              <div className="tx">
                <span className="n">{lv.xp.toLocaleString('en-IN')}</span>
                <span className="l">Total XP</span>
                {xpTrend && <span className={`trend${xpTrendUp ? '' : ' down'}`} title="This week against last week"><Bi name={xpTrendUp ? 'arrow-up' : 'arrow-down'} /> {xpTrend} this week</span>}
              </div>
            </div>
            {progressOn && (
              <div className="dbx-stat">
                <span className="ic gold"><Bi name="coin" /></span>
                <div className="tx">
                  <span className="n">{coins === null ? '—' : coins.toLocaleString('en-IN')}</span>
                  <span className="l">Coins</span>
                  {prog?.conversion && prog.conversion.coinsAvailable > 0
                    ? <button className="lnk" onClick={() => nav('/careerpilot/coins')}>Convert XP <Bi name="arrow-right" /></button>
                    : <button className="lnk" onClick={() => nav('/careerpilot/rewards')}>Rewards Store <Bi name="arrow-right" /></button>}
                </div>
              </div>
            )}
            <div className="dbx-stat">
              <span className="ic blue"><Bi name="code-slash" /></span>
              <div className="tx">
                <span className="n">{st.solved}<em> / {st.totalProblems}</em></span>
                <span className="l">Problems Solved</span>
                {st.solvedToday > 0 ? <span className="trend"><Bi name="arrow-up" /> +{st.solvedToday} today</span>
                  : st.accuracy ? <span className="meta">{st.accuracy.pct}% accuracy</span> : null}
              </div>
            </div>
            <div className="dbx-stat">
              <span className="ic violet"><Bi name="mic-fill" /></span>
              <div className="tx">
                <span className="n">{st.interviews}</span>
                <span className="l">Mock Interviews</span>
                {st.bestInterview !== null && <span className="meta">Best {st.bestInterview}%</span>}
              </div>
            </div>
            <button className="dbx-stat as-btn" onClick={() => nav('/careerpilot/readiness')} title="A 0–1000 score from your assessment, practice, missions, interviews and resume">
              <span className="ic navy"><Bi name="bar-chart-fill" /></span>
              <div className="tx">
                <span className="n">{score}<em> / 1000</em></span>
                <span className="l">Coder Score <Bi name="info-circle" /></span>
                <span className="bar"><i style={{ width: `${barWidth(score / 10)}%` }} /></span>
              </div>
            </button>
          </section>

          {/* ── Today's plan + skill progress ── */}
          <section className="dbx-pair">
            <article className="dbx-card dbx-plan">
              <header className="dbx-head">
                <div>
                  <h2><Bi name="calendar-check" className="hd-ic" /> Today’s Plan <span className="dbx-day">({planLabel})</span></h2>
                  <span className="dbx-sub">Complete these tasks to stay on track.</span>
                </div>
                {planXp > 0 && <span className="dbx-xp-pill">{planEarned} / {planXp} XP</span>}
              </header>
              {planEmpty && !rows.length ? <div className="dbx-empty">{planEmpty}</div> : (
                <>
                  <ul className="dbx-tasks">
                    {shownRows.map(r => {
                      const m = r.mission;
                      return (
                        <li key={r.key} className={r.done ? 'done' : ''}>
                          <div className="dbx-task" role={r.open ? 'button' : undefined} tabIndex={r.open ? 0 : undefined}
                            onClick={r.open} onKeyDown={e => { if (r.open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.open(); } }}>
                            <span className={`dbx-task-ic t-${r.tone}`}><Bi name={r.icon} /></span>
                            <span className="dbx-task-tx"><b>{r.title}</b><span>{r.sub}</span></span>
                            {m && m.link && !m.done && <button className="lnk" onClick={e => { e.stopPropagation(); openMissionLink(m.link!, nav); }}>Open</button>}
                            {m && m.needsAnswer && !m.done && <button className="lnk" onClick={e => { e.stopPropagation(); setAnswerFor(answerFor === m.key ? null : m.key); setAnswerText(''); setAnswerMsg(''); }}>{answerFor === m.key ? 'Close' : 'Answer'}</button>}
                            {r.xp > 0 && <span className="xp">+{r.xp} XP</span>}
                            {m ? (
                              <button className={`dbx-check${m.done ? ' on' : ''}`} aria-label={m.done ? 'Done' : 'Mark done'}
                                disabled={m.done || m.verify === 'interview' || !!m.needsAnswer}
                                onClick={e => { e.stopPropagation(); toggleMission(m.key); }}>{m.done && <Bi name="check-lg" />}</button>
                            ) : (
                              <span className={`dbx-check${r.done ? ' on' : ''}`} aria-label={r.done ? 'Done' : 'Not done yet'}>{r.done && <Bi name="check-lg" />}</span>
                            )}
                          </div>
                          {m && m.needsAnswer && !m.done && answerFor === m.key && (
                            <div className="dbx-answer">
                              <textarea value={answerText} autoFocus rows={3} placeholder="Type your answer here…" onChange={e => setAnswerText(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} />
                              <span className="hint"><Bi name="pencil-square" /> Write it in your own words. Pasting is turned off for this one.</span>
                              <div className="row">
                                <button className="dbx-btn primary sm" onClick={() => saveAnswer(m.key)} disabled={answerBusy}>{answerBusy ? 'Saving…' : `Save & complete +${m.xp} XP`}</button>
                                <button className="dbx-btn sm" onClick={() => { setAnswerFor(null); setAnswerMsg(''); }}>Cancel</button>
                                {answerMsg && <span className="msg">{answerMsg}</span>}
                              </div>
                            </div>
                          )}
                          {m && (m.feedback || (justCoached?.key === m.key && justCoached.feedback)) && (
                            <div className="dbx-coach"><b><Bi name="chat-dots" /> Coach</b> {m.feedback || justCoached?.feedback}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {missionMsg && <div className="dbx-error">{missionMsg}</div>}
                  <footer className="dbx-plan-foot">
                    <span>{moreRows > 0 ? `+${moreRows} more ${moreRows === 1 ? 'task' : 'tasks'} for today` : `${rowsDone} of ${rows.length} done`}</span>
                    {rows.length > 3
                      ? <button className="dbx-btn soft sm" onClick={() => setAllTasks(v => !v)}>{allTasks ? 'Show fewer' : 'View More'} <Bi name={allTasks ? 'chevron-up' : 'arrow-right'} /></button>
                      : continueTo && rowsDone < rows.length ? <button className="dbx-btn soft sm" onClick={continueTo}>Open today <Bi name="arrow-right" /></button> : null}
                  </footer>
                </>
              )}
            </article>

            <article className="dbx-card">
              <header className="dbx-head">
                <div>
                  <h2><Bi name="stars" className="hd-ic" /> Your Skill Progress</h2>
                  <span className="dbx-sub">Track your readiness across key areas.</span>
                </div>
                <button className="dbx-link" onClick={() => nav('/careerpilot/skills')}>Full Report <Bi name="arrow-right" /></button>
              </header>
              {!skills.length ? <div className="dbx-empty">Your skills appear here after your skill check.</div> : (
                <ul className="dbx-skills">
                  {skills.map(s => (
                    <li key={s.key}>
                      <span className="ic"><Bi name={skillIcon(s.label)} /></span>
                      <span className="nm" title={s.label}>{s.label}{s.early && <em title="Based on little evidence so far"> · early</em>}</span>
                      <span className="bar"><i style={{ width: `${barWidth(s.score)}%` }} /></span>
                      <span className="pc">{Math.round(s.score)}%</span>
                    </li>
                  ))}
                </ul>
              )}
              {skills.length > 0 && skills.length < 3 && (
                <div className="dbx-skills-note"><Bi name="info-circle" /> More skill areas appear here as your skill checks, practice and interviews measure them.</div>
              )}
            </article>
          </section>

          {/* ── Labs ── */}
          {!!labs.length && (
            <section className="dbx-labs">
              {labs.map(l => {
                const locked = !!l.section && lockedSections.has(l.section);
                return (
                  <button key={l.key} className={`dbx-lab tone-${l.tone}`} onClick={() => nav(l.to)}>
                    <span className="top">
                      <span className="ic"><Bi name={l.icon} /></span>
                      <span className="tx"><b>{l.title}</b><span>{l.sub}</span></span>
                    </span>
                    <span className="bottom">
                      {l.pct !== null && !locked
                        ? <><span className="bar"><i style={{ width: `${barWidth(l.pct)}%` }} /></span><span className="pc">{l.pct}%</span></>
                        : <span className={`note${(l as any).soon ? ' soon' : ''}`}>{locked ? <><Bi name="lock-fill" /> Part of membership</> : l.note}</span>}
                      <span className="go"><Bi name="arrow-right" /></span>
                    </span>
                  </button>
                );
              })}
            </section>
          )}
        </div>

        <aside className="dbx-side">
          {/* ── Streak ── */}
          <article className="dbx-card dbx-streak">
            <div className="dbx-streak-top">
              <span className="flame"><Bi name="fire" /></span>
              <div className="tx">
                <b>{st.streak} Day Streak <Bi name="info-circle" className="info" /></b>
                <span>{st.streak ? 'Keep the momentum!' : 'Learn today to start one.'}</span>
              </div>
              <span className="gift" title={`${streakTarget}-day streak: ${streakTarget - st.streak} ${streakTarget - st.streak === 1 ? 'day' : 'days'} to go`}><Bi name="gift-fill" /></span>
            </div>
            <div className="dbx-week">
              {(d.streakWeek || []).map(w => (
                <div key={w.date} className={`${w.active ? 'on' : ''}${w.isToday ? ' today' : ''}`}>
                  <span className="dot">{w.active && <Bi name="check-lg" />}</span>
                  <span className="l">{w.letter}</span>
                </div>
              ))}
            </div>
          </article>

          {/* ── Level ── */}
          <article className="dbx-card dbx-level">
            <div className="dbx-level-top">
              <span className="medal"><Bi name="award-fill" /></span>
              <div className="tx"><b>Level {lv.level}</b><span>{lv.title}</span></div>
              <span className="xp"><b>{lv.xpIntoLevel.toLocaleString('en-IN')}</b> / {lv.xpForThisLevel.toLocaleString('en-IN')} XP</span>
            </div>
            <div className="dbx-level-bar" role="progressbar" aria-valuenow={lv.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Level ${lv.level} progress`}><i style={{ width: `${barWidth(lv.progressPct)}%` }} /></div>
            <span className="dbx-sub">{lv.xpToNextLevel.toLocaleString('en-IN')} XP to reach Level {lv.nextLevel}</span>
          </article>

          {/* ── Achievements ── */}
          {progressOn && (
            <article className="dbx-card">
              <header className="dbx-head">
                <div><h2><Bi name="trophy-fill" className="hd-ic gold" /> Achievements</h2><span className="dbx-sub">{earnedBadges} of {badges.length} earned</span></div>
                <button className="dbx-link" onClick={() => nav('/careerpilot/achievements')}>View All <Bi name="arrow-right" /></button>
              </header>
              <div className="dbx-badges">
                {badges.slice(0, 5).map((b: Badge) => (
                  <div key={b.key} className={`dbx-badge${b.earned ? ' earned' : ''}`} title={b.earned ? `${b.label}: earned` : `${b.label}: ${b.hint} (${Math.round(b.progress * 100)}%)`}>
                    <span className="hex" style={b.earned ? { ['--bc' as any]: b.color } : undefined}><Bi name={b.earned ? BADGE_ICON[b.key] || 'star-fill' : 'lock-fill'} /></span>
                    <b>{b.label}</b>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* ── Global rank ── */}
          {progressOn && (
            <article className="dbx-card dbx-rank" id="leaderboard">
              <header className="dbx-head">
                <div><h2><Bi name="bar-chart-fill" className="hd-ic" /> {scope === 'COLLEGE' ? 'College Rank' : 'Global Rank'}</h2></div>
                <div className="dbx-seg" role="tablist" aria-label="Period">
                  {[{ k: 'ALL_TIME', l: 'All Time' }, { k: 'MONTHLY', l: 'Month' }, { k: 'WEEKLY', l: 'Week' }].map(t => (
                    <button key={t.k} role="tab" aria-selected={period === t.k} className={period === t.k ? 'on' : ''} onClick={() => setPeriod(t.k)}>{t.l}</button>
                  ))}
                </div>
              </header>
              {collegeOn && (
                <div className="dbx-seg scope" role="tablist" aria-label="Who to rank against">
                  {[{ k: 'GLOBAL', l: 'Global' }, { k: 'COLLEGE', l: 'College' }].map(t => (
                    <button key={t.k} role="tab" aria-selected={scope === t.k} className={scope === t.k ? 'on' : ''} onClick={() => setScope(t.k)}>{t.l}</button>
                  ))}
                </div>
              )}
              {boardBusy && !board ? <div className="dbx-empty">Loading your rank…</div>
                : !board ? <div className="dbx-empty">Your rank could not be loaded.</div>
                : !board.available ? <div className="dbx-empty">{(board as any).reason || 'Ranks are not available for you yet.'}</div>
                : (
                  <div className="dbx-rank-body">
                    <button className="dbx-wreath" onClick={() => nav('/careerpilot/leaderboard')} title="See the full board">
                      <Laurel />
                      <span className="num">{myRank ? `#${myRank.toLocaleString('en-IN')}` : '—'}</span>
                      <span className="cap">rank</span>
                    </button>
                    <div className="dbx-rank-fig">
                      <span className="ic"><Bi name="trophy-fill" /></span>
                      <b>{mainTop ? `Top ${mainTop}%` : 'Not ranked yet'}</b>
                      <span>of {of.toLocaleString('en-IN')} {scope === 'COLLEGE' ? 'in your college' : 'learners'}</span>
                    </div>
                    <div className="dbx-rank-fig">
                      <span className="ic"><Bi name={scope === 'GLOBAL' && collegeOn ? 'building' : 'people-fill'} /></span>
                      {otherTop
                        ? <><b>Top {otherTop}%</b><span>{scope === 'GLOBAL' ? 'in your college' : 'of all learners'}</span></>
                        : <><b>{board.myXp.toLocaleString('en-IN')} XP</b><span>{period === 'ALL_TIME' ? 'all time' : period === 'MONTHLY' ? 'this month' : 'this week'}</span></>}
                    </div>
                  </div>
                )}
            </article>
          )}

          {/* ── Upcoming event ── */}
          <article className="dbx-card dbx-event">
            <header className="dbx-head">
              <div><h2><Bi name="calendar-event" className="hd-ic" /> Upcoming Event</h2></div>
              <button className="dbx-link" onClick={() => nav('/battles')}>View All <Bi name="arrow-right" /></button>
            </header>
            {!contest ? (
              <div className="dbx-empty sm">No events scheduled right now. New contests appear here.</div>
            ) : (
              <div className="dbx-event-row">
                <span className="ic"><Bi name="trophy-fill" /></span>
                <div className="tx">
                  <b>{contest.title}</b>
                  <span><Bi name="calendar3" /> {new Date(contest.startAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{contest.prize ? ` · Prize ${contest.prize}` : ''}</span>
                </div>
                <button className="dbx-btn primary sm" onClick={() => nav(contest.slug ? `/battles/${contest.slug}` : '/battles')}>Register</button>
              </div>
            )}
          </article>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
